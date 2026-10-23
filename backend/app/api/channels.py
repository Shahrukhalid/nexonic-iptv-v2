import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from ..database import get_db
from ..models.schema import Channel, ChannelCreate, ChannelUpdate

router = APIRouter(prefix="/api/channels", tags=["Channels"])

@router.get("")
async def list_channels(
    country: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_series: Optional[bool] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_live: Optional[bool] = Query(None),
    is_vod: Optional[bool] = Query(None),
    is_satellite: Optional[bool] = Query(None),
    satellite_network: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("default"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500)
):
    offset = (page - 1) * page_size
    conditions = []
    params = []

    conditions.append("is_adult = 0")  # adult-flagged rows (from older databases) are never served

    if country and country != "ALL":
        conditions.append("(country_code = ? OR country = ?)")
        params.extend([country.upper(), country])

    if category and category != "ALL":
        conditions.append("category = ?")
        params.append(category)

    if status and status != "ALL":
        conditions.append("status = ?")
        params.append(status)

    if is_series is not None:
        conditions.append("is_series = ?")
        params.append(1 if is_series else 0)

    if is_favorite is not None:
        conditions.append("is_favorite = ?")
        params.append(1 if is_favorite else 0)

    if is_live is not None:
        conditions.append("is_live = ?")
        params.append(1 if is_live else 0)

    if is_vod is not None:
        conditions.append("is_vod = ?")
        params.append(1 if is_vod else 0)

    if is_satellite is not None:
        conditions.append("is_satellite = ?")
        params.append(1 if is_satellite else 0)

    if satellite_network and satellite_network != "ALL":
        conditions.append("subcategory = ?")
        params.append(satellite_network)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append("(name LIKE ? OR alt_names LIKE ? OR category LIKE ? OR subcategory LIKE ? OR country LIKE ? OR user_tags LIKE ?)")
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    order_clause = "is_favorite DESC, status = 'WORKING' DESC, status != 'OFFLINE' DESC, name ASC"
    if sort_by == "name_asc":
        order_clause = "name COLLATE NOCASE ASC"
    elif sort_by == "name_desc":
        order_clause = "name COLLATE NOCASE DESC"
    elif sort_by == "country_asc":
        order_clause = "country ASC, name ASC"
    elif sort_by == "working_first":
        order_clause = "status = 'WORKING' DESC, status = 'UNSTABLE' DESC, status != 'OFFLINE' DESC, name ASC"
    elif sort_by == "fastest":
        order_clause = "CASE WHEN response_time_ms > 0 THEN 0 ELSE 1 END, response_time_ms ASC, name ASC"

    async with get_db() as db:
        # Total count
        async with db.execute(f"SELECT COUNT(*) as count FROM channels {where_sql}", params) as cur:
            count_row = await cur.fetchone()
            total_items = count_row["count"] if count_row else 0

        # Items page
        query = f"""
            SELECT * FROM channels {where_sql}
            ORDER BY {order_clause}
            LIMIT ? OFFSET ?
        """
        async with db.execute(query, (*params, page_size, offset)) as cur:
            rows = await cur.fetchall()
            items = [dict(r) for r in rows]

    return {
        "items": items,
        "total": total_items,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_items + page_size - 1) // page_size
    }

@router.get("/stats/summary")
async def get_stats_summary():
    """
    Returns live, real-time aggregated system statistics directly from SQLite:
    total channels, working channels, offline channels, unverified channels,
    restricted channels, unstable channels, online rate percentage,
    total countries, total TV series channels, satellite channels, offline/VOD channels,
    and current verification / auto-audit status.
    """
    async with get_db() as db:
        adult_clause = "WHERE is_adult = 0"
        async with db.execute(f"""
            SELECT 
                COUNT(*) as total_channels,
                SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) as working_channels,
                SUM(CASE WHEN status = 'OFFLINE' THEN 1 ELSE 0 END) as offline_channels,
                SUM(CASE WHEN status = 'UNVERIFIED' THEN 1 ELSE 0 END) as unverified_channels,
                SUM(CASE WHEN status = 'REGION RESTRICTED' THEN 1 ELSE 0 END) as restricted_channels,
                SUM(CASE WHEN status = 'UNSTABLE' THEN 1 ELSE 0 END) as unstable_channels,
                COUNT(DISTINCT country_code) as total_countries,
                SUM(CASE WHEN is_series = 1 OR category = 'TV Series' THEN 1 ELSE 0 END) as total_series,
                SUM(CASE WHEN is_satellite = 1 THEN 1 ELSE 0 END) as total_satellite,
                SUM(CASE WHEN is_vod = 1 THEN 1 ELSE 0 END) as total_vod
            FROM channels
            {adult_clause}
        """) as cur:
            row = await cur.fetchone()

        tot = row[0] or 0
        wrk = row[1] or 0
        off = row[2] or 0
        unv = row[3] or 0
        res = row[4] or 0
        uns = row[5] or 0
        countries = row[6] or 0
        series = row[7] or 0
        sat = row[8] or 0
        vod = row[9] or 0

        tested_total = wrk + off + uns + res
        online_rate = round((wrk / tested_total * 100), 1) if tested_total > 0 else 0.0

        from ..services.scheduler_service import scheduler
        from ..services.verification_engine import verification_engine

        audit_status = scheduler.get_auto_audit_status()
        v_progress = verification_engine.get_progress()

        return {
            "total_channels": tot,
            "working_channels": wrk,
            "offline_channels": off,
            "unverified_channels": unv,
            "restricted_channels": res,
            "unstable_channels": uns,
            "online_rate_percent": online_rate,
            "total_countries": countries,
            "total_series": series,
            "total_satellite": sat,
            "total_vod": vod,
            "is_auto_audit_active": audit_status.get("is_active", False),
            "auto_audit_status": audit_status,
            "verification_progress": v_progress
        }

@router.get("/stats/countries")
async def get_country_stats(sort_alpha: bool = False):
    """Returns aggregated channel statistics for each country."""
    async with get_db() as db:
        adult_filter = "WHERE is_adult = 0"
        order_by = "country COLLATE NOCASE ASC" if sort_alpha else "total DESC, country ASC"
        query = f"""
            SELECT 
                country_code,
                country,
                country_flag,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) as working,
                SUM(CASE WHEN status = 'UNSTABLE' THEN 1 ELSE 0 END) as unstable,
                SUM(CASE WHEN status = 'OFFLINE' THEN 1 ELSE 0 END) as offline,
                SUM(CASE WHEN status = 'REGION RESTRICTED' THEN 1 ELSE 0 END) as restricted,
                SUM(CASE WHEN status = 'UNVERIFIED' THEN 1 ELSE 0 END) as unverified
            FROM channels
            {adult_filter}
            GROUP BY country_code, country, country_flag
            ORDER BY {order_by}
        """
        async with db.execute(query) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

@router.get("/stats/categories")
async def get_category_stats(
    is_vod: Optional[bool] = None,
    is_live: Optional[bool] = None
):
    """Returns aggregated channel counts by category in alphabetical order."""
    async with get_db() as db:
        conditions = ["is_adult = 0"]
        params = []

        if is_vod is not None:
            conditions.append("is_vod = ?")
            params.append(1 if is_vod else 0)

        if is_live is not None:
            conditions.append("is_live = ?")
            params.append(1 if is_live else 0)

        where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = f"""
            SELECT category, COUNT(*) as count,
                   SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) as working
            FROM channels
            {where_sql}
            GROUP BY category
            ORDER BY category COLLATE NOCASE ASC
        """
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

@router.get("/stats/satellites")
async def get_satellite_stats():
    """Returns aggregated channel counts by satellite constellation and network."""
    async with get_db() as db:
        conditions = ["is_satellite = 1", "is_adult = 0"]
        params = []
        where_sql = "WHERE " + " AND ".join(conditions)
        query = f"""
            SELECT subcategory as network, COUNT(*) as count,
                   SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) as working
            FROM channels
            {where_sql}
            GROUP BY subcategory
            ORDER BY count DESC, subcategory ASC
        """
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

@router.get("/history")
async def get_watch_history(limit: int = Query(20, ge=1, le=100)):
    """Get recently watched channels."""
    async with get_db() as db:
        query = """
            SELECT c.*, h.watched_at 
            FROM history h
            JOIN channels c ON h.channel_id = c.id
            WHERE c.is_adult = 0
            ORDER BY h.watched_at DESC
            LIMIT ?
        """
        async with db.execute(query, (limit,)) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

@router.post("/history/{channel_id}")
async def record_watch_history(channel_id: int):
    now = datetime.utcnow().isoformat()
    async with get_db() as db:
        await db.execute("INSERT INTO history (channel_id, watched_at) VALUES (?, ?)", (channel_id, now))
        await db.commit()
    return {"status": "SUCCESS"}

@router.delete("/history")
async def clear_watch_history():
    async with get_db() as db:
        await db.execute("DELETE FROM history")
        await db.commit()
    return {"status": "CLEARED"}

@router.get("/{channel_id}")
async def get_channel(channel_id: int):
    async with get_db() as db:
        async with db.execute("SELECT * FROM channels WHERE id = ? AND is_adult = 0", (channel_id,)) as cur:
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Channel not found")
            return dict(row)

@router.post("/{channel_id}/favorite")
async def toggle_favorite(channel_id: int):
    async with get_db() as db:
        async with db.execute("SELECT is_favorite FROM channels WHERE id = ?", (channel_id,)) as cur:
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Channel not found")
            new_fav = 0 if row["is_favorite"] else 1
            await db.execute("UPDATE channels SET is_favorite = ? WHERE id = ?", (new_fav, channel_id))
            await db.commit()
            return {"channel_id": channel_id, "is_favorite": bool(new_fav)}

@router.delete("/{channel_id}")
async def delete_channel(channel_id: int):
    async with get_db() as db:
        await db.execute("DELETE FROM channels WHERE id = ?", (channel_id,))
        await db.commit()
    return {"status": "DELETED", "channel_id": channel_id}
