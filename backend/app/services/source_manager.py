import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..database import get_db
from .playlist_importer import fetch_and_import_m3u

# Public iptv-org playlists (https://github.com/iptv-org/iptv). Their contents are user-submitted links; review
# what you import and only watch channels you are entitled to.
DEFAULT_PUBLIC_SOURCES = [
    {
        "name": "Nexonic IPTV verified channels",
        "url": "https://raw.githubusercontent.com/Shahrukhalid/nexonic-iptv/main/playlists/verified.m3u",
        "attribution": "Nexonic IPTV (official free broadcaster streams, checked daily)"
    },
    {
        "name": "IPTV-Org Worldwide General",
        "url": "https://iptv-org.github.io/iptv/index.m3u",
        "attribution": "iptv-org public directory"
    },
    {
        "name": "IPTV-Org News Channels",
        "url": "https://iptv-org.github.io/iptv/categories/news.m3u",
        "attribution": "iptv-org public news streams"
    },
    {
        "name": "IPTV-Org TV Series & Drama",
        "url": "https://iptv-org.github.io/iptv/categories/series.m3u",
        "attribution": "iptv-org series streams"
    },
    {
        "name": "IPTV-Org Movies & Cinema",
        "url": "https://iptv-org.github.io/iptv/categories/movies.m3u",
        "attribution": "iptv-org movies streams"
    },
    {
        "name": "IPTV-Org Sports",
        "url": "https://iptv-org.github.io/iptv/categories/sports.m3u",
        "attribution": "iptv-org sports streams"
    },
    {
        "name": "IPTV-Org Kids & Animation",
        "url": "https://iptv-org.github.io/iptv/categories/kids.m3u",
        "attribution": "iptv-org kids streams"
    },
    {
        "name": "IPTV-Org Documentary",
        "url": "https://iptv-org.github.io/iptv/categories/documentary.m3u",
        "attribution": "iptv-org documentary streams"
    },
    {
        "name": "IPTV-Org Music",
        "url": "https://iptv-org.github.io/iptv/categories/music.m3u",
        "attribution": "iptv-org music streams"
    }
]

async def seed_default_sources():
    """Populate default sources if none exist."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()
        for src in DEFAULT_PUBLIC_SOURCES:
            await db.execute(
                """
                INSERT OR IGNORE INTO sources (name, url, type, attribution, is_adult, created_at)
                VALUES (?, ?, 'm3u', ?, 0, ?)
                """,
                (src["name"], src["url"], src["attribution"], now)
            )
        await db.commit()

async def get_all_sources() -> List[Dict[str, Any]]:
    async with get_db() as db:
        async with db.execute("SELECT * FROM sources WHERE is_adult = 0 ORDER BY id ASC") as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def refresh_source(source_id: int) -> Dict[str, Any]:
    async with get_db() as db:
        async with db.execute("SELECT * FROM sources WHERE id = ?", (source_id,)) as cur:
            src = await cur.fetchone()
    if not src:
        raise ValueError("Source not found")

    if src["is_adult"]:
        raise ValueError("Adult sources are not supported")
    url = src["url"]
    name = src["name"]

    try:
        inserted, updated = await fetch_and_import_m3u(url, name, source_id=source_id)
        return {"status": "SUCCESS", "inserted": inserted, "updated": updated}
    except Exception as e:
        now = datetime.utcnow().isoformat()
        async with get_db() as db:
            await db.execute("UPDATE sources SET last_status = ?, last_refreshed_at = ? WHERE id = ?", (f"ERROR: {str(e)[:100]}", now, source_id))
            await db.commit()
        raise e

async def auto_discover_channels() -> Dict[str, Any]:
    """
    Automated Discovery Engine:
    Scans all enabled public directories, satellite feeds, regional playlists,
    deduplicates and inserts newly discovered channels into the local catalog.
    """
    sources = await get_all_sources()
    total_inserted = 0
    total_updated = 0
    scanned_count = 0
    errors = []

    for src in sources:
        if not src.get("enabled", 1):
            continue
        try:
            res = await refresh_source(src["id"])
            total_inserted += res.get("inserted", 0)
            total_updated += res.get("updated", 0)
            scanned_count += 1
        except Exception as e:
            errors.append(f"{src['name']}: {str(e)[:60]}")

    # Immediately launch background continuous auto-audit for all newly discovered streams
    try:
        from .scheduler_service import scheduler
        await scheduler.start_auto_audit()
    except Exception:
        pass

    async with get_db() as db:
        async with db.execute("SELECT COUNT(*), SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) FROM channels WHERE is_adult = 0") as cur:
            row = await cur.fetchone()
            tot, wrk = row[0], row[1] or 0

    return {
        "status": "COMPLETED",
        "scanned_sources": scanned_count,
        "new_channels_added": total_inserted,
        "channels_updated": total_updated,
        "total_channels": tot,
        "working_channels": wrk,
        "errors": errors[:3]
    }

