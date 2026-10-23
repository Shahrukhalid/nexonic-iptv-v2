import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Query, Response, HTTPException
from pydantic import BaseModel
from ..database import get_db

router = APIRouter(prefix="/api/playlists", tags=["Playlists"])

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    channel_ids: List[int] = []

@router.get("")
async def list_playlists():
    async with get_db() as db:
        async with db.execute("SELECT * FROM playlists WHERE is_adult = 0 ORDER BY id DESC") as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

@router.post("")
async def create_playlist(playlist: PlaylistCreate):
    now = datetime.utcnow().isoformat()
    ids_json = json.dumps(playlist.channel_ids)
    async with get_db() as db:
        cur = await db.execute(
            """
            INSERT INTO playlists (name, description, channel_ids, is_adult, created_at)
            VALUES (?, ?, ?, 0, ?)
            """,
            (playlist.name, playlist.description, ids_json, now)
        )
        pid = cur.lastrowid
        await db.commit()
    return {"id": pid, "status": "CREATED"}

@router.get("/{playlist_id}/export.m3u")
async def export_custom_playlist_m3u(playlist_id: int):
    async with get_db() as db:
        async with db.execute("SELECT * FROM playlists WHERE id = ?", (playlist_id,)) as cur:
            pl = await cur.fetchone()
            if not pl:
                raise HTTPException(status_code=404, detail="Playlist not found")

        channel_ids = json.loads(pl["channel_ids"] or "[]")
        if not channel_ids:
            return Response(content="#EXTM3U\n", media_type="application/x-mpegurl")

        placeholders = ",".join("?" for _ in channel_ids)
        async with db.execute(f"SELECT * FROM channels WHERE id IN ({placeholders}) AND is_adult = 0", channel_ids) as cur:
            channels = await cur.fetchall()

    lines = ["#EXTM3U"]
    for ch in channels:
        tvg_id = ch["epg_id"] or ""
        group = ch["category"] or "General"
        logo = ch["logo"] or ""
        lines.append(f'#EXTINF:-1 tvg-id="{tvg_id}" tvg-name="{ch["name"]}" tvg-logo="{logo}" group-title="{group}",{ch["name"]}')
        lines.append(ch["stream_url"])

    m3u_text = "\n".join(lines)
    filename = f"{pl['name'].replace(' ', '_')}.m3u"
    return Response(
        content=m3u_text,
        media_type="application/x-mpegurl",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/export/filtered.m3u")
async def export_filtered_m3u(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    is_series: Optional[bool] = Query(None)
):
    """Export dynamically filtered M3U (e.g. only working channels, only sports, etc.)"""
    conditions = []
    params = []

    conditions.append("is_adult = 0")
    if status and status != "ALL":
        conditions.append("status = ?")
        params.append(status)
    if category and category != "ALL":
        conditions.append("category = ?")
        params.append(category)
    if country_code and country_code != "ALL":
        conditions.append("country_code = ?")
        params.append(country_code.upper())
    if is_series is not None:
        conditions.append("is_series = ?")
        params.append(1 if is_series else 0)

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    async with get_db() as db:
        async with db.execute(f"SELECT * FROM channels {where_sql} ORDER BY category ASC, name ASC", params) as cur:
            channels = await cur.fetchall()

    lines = ["#EXTM3U"]
    for ch in channels:
        tvg_id = ch["epg_id"] or ""
        group = ch["category"] or "General"
        logo = ch["logo"] or ""
        lines.append(f'#EXTINF:-1 tvg-id="{tvg_id}" tvg-name="{ch["name"]}" tvg-logo="{logo}" group-title="{group}",{ch["name"]}')
        lines.append(ch["stream_url"])

    m3u_text = "\n".join(lines)
    return Response(
        content=m3u_text,
        media_type="application/x-mpegurl",
        headers={"Content-Disposition": 'attachment; filename="nexonic_iptv_export.m3u"'}
    )
