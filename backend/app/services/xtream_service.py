from datetime import datetime
from typing import Dict, Any, List
from ..database import get_db, get_setting
import secrets

from ..config import APP_NAME, DEFAULT_XTREAM_USER, LOCAL_IP, PORT


async def authenticate_xtream(username: str, password: str) -> bool:
    """Validate Smart TV credentials against the local settings (constant-time comparison)."""
    stored_user = await get_setting("xtream_user", DEFAULT_XTREAM_USER) or ""
    stored_pass = await get_setting("xtream_pass", "") or ""
    if not stored_pass:
        return False
    return secrets.compare_digest(username, stored_user) and secrets.compare_digest(password, stored_pass)

async def get_server_info() -> Dict[str, Any]:
    return {
        "url": f"http://{LOCAL_IP}:{PORT}",
        "port": str(PORT),
        "https_port": "",
        "server_protocol": "http",
        "rtmp_port": "",
        "timezone": "UTC",
        "time_now": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "timestamp_now": int(datetime.utcnow().timestamp()),
        "process": True
    }

async def get_user_info(username: str) -> Dict[str, Any]:
    return {
        "username": username,
        "password": "valid",
        "message": f"Welcome to {APP_NAME}",
        "auth": 1,
        "status": "Active",
        "exp_date": "1999999999", # Never expires
        "is_trial": "0",
        "active_cons": "1",
        "created_at": "1700000000",
        "max_connections": "50",
        "allowed_output_formats": ["m3u8", "ts", "rtmp"]
    }

async def get_live_categories() -> List[Dict[str, Any]]:
    """Return distinct categories formatted for Xtream Codes."""
    async with get_db() as db:
        query = "SELECT DISTINCT category FROM channels WHERE is_adult = 0 AND category IS NOT NULL ORDER BY category ASC"
        async with db.execute(query) as cur:
            rows = await cur.fetchall()

    categories = []
    for idx, r in enumerate(rows, start=1):
        cat_name = r["category"]
        categories.append({
            "category_id": str(idx),
            "category_name": cat_name,
            "parent_id": 0
        })
    return categories

async def get_live_streams(category_id: str | None = None) -> List[Dict[str, Any]]:
    """Return stream channels formatted for Xtream Codes."""
    cats = await get_live_categories()
    cat_map = {c["category_id"]: c["category_name"] for c in cats}
    name_to_id = {c["category_name"]: c["category_id"] for c in cats}

    filter_cat_name = cat_map.get(category_id) if category_id else None

    async with get_db() as db:
        where_clauses = ["is_adult = 0"]
        params = []
        if filter_cat_name:
            where_clauses.append("category = ?")
            params.append(filter_cat_name)

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        query = f"SELECT * FROM channels {where_sql} ORDER BY custom_order ASC, name ASC"

        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()

    streams = []
    for r in rows:
        cid = r["id"]
        cat_id = name_to_id.get(r["category"], "1")
        streams.append({
            "num": cid,
            "name": r["name"],
            "stream_type": "live",
            "stream_id": cid,
            "stream_icon": r["logo"] or "",
            "epg_channel_id": r["epg_id"] or "",
            "added": "1700000000",
            "category_id": cat_id,
            "custom_sid": "",
            "tv_archive": 0,
            "direct_source": r["stream_url"]
        })
    return streams

async def get_series_categories() -> List[Dict[str, Any]]:
    return [
        {"category_id": "1", "category_name": "TV Series 24/7", "parent_id": 0},
        {"category_id": "2", "category_name": "Sitcoms & Comedy", "parent_id": 0},
        {"category_id": "3", "category_name": "Drama & Sci-Fi", "parent_id": 0},
    ]

async def get_series_streams() -> List[Dict[str, Any]]:
    """Return series channels."""
    async with get_db() as db:
        query = "SELECT * FROM channels WHERE is_series = 1 AND is_adult = 0 ORDER BY name ASC"
        async with db.execute(query) as cur:
            rows = await cur.fetchall()

    series_list = []
    for r in rows:
        series_list.append({
            "num": r["id"],
            "name": r["name"],
            "series_id": r["id"],
            "cover": r["logo"] or "",
            "plot": r["description"] or f"24/7 TV Series Channel: {r['name']}",
            "genre": r["category"],
            "category_id": "1",
            "rating": "5.0"
        })
    return series_list

async def get_vod_categories() -> List[Dict[str, Any]]:
    cats = [
        {"category_id": "1", "category_name": "Offline Broadcast & Slates", "parent_id": 0},
        {"category_id": "2", "category_name": "Offline Cinema & Movies VOD", "parent_id": 0},
        {"category_id": "3", "category_name": "Offline Space & Nature Archives", "parent_id": 0},
        {"category_id": "5", "category_name": "Local Offline Media", "parent_id": 0}
    ]
    return cats

async def get_vod_streams() -> List[Dict[str, Any]]:
    async with get_db() as db:
        query = "SELECT * FROM channels WHERE (is_vod = 1 OR is_live = 0) AND is_adult = 0 ORDER BY name ASC"
        async with db.execute(query) as cur:
            rows = await cur.fetchall()

    vod_list = []
    for r in rows:
        vod_list.append({
            "num": r["id"],
            "name": r["name"],
            "stream_type": "movie",
            "stream_id": r["id"],
            "stream_icon": r["logo"] or "",
            "rating": "5.0",
            "rating_5based": 5,
            "added": "1700000000",
            "category_id": "2",
            "container_extension": "mp4",
            "direct_source": r["stream_url"]
        })
    return vod_list
