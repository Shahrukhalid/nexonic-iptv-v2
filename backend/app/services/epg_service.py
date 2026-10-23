import re
import gzip
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
from ..database import get_db

def parse_xmltv_time(time_str: str) -> str:
    """
    Parses XMLTV time format (e.g., '20261019080000 +0000' or '20261019080000')
    into standard ISO string.
    """
    if not time_str:
        return ""
    clean = time_str.split()[0]
    try:
        dt = datetime.strptime(clean[:14], "%Y%m%d%H%M%S")
        return dt.isoformat()
    except Exception:
        return time_str

async def parse_and_import_xmltv(content_bytes: bytes) -> int:
    """
    Parse XMLTV byte data (supports raw XML or gzip-compressed XML).
    Inserts or updates programs in epg_programs table.
    """
    if content_bytes.startswith(b"\x1f\x8b"):
        xml_data = gzip.decompress(content_bytes)
    else:
        xml_data = content_bytes

    root = ET.fromstring(xml_data)
    programs = []

    for prog in root.findall("programme"):
        ch_id = prog.get("channel", "")
        start = parse_xmltv_time(prog.get("start", ""))
        stop = parse_xmltv_time(prog.get("stop", ""))

        title_elem = prog.find("title")
        title = title_elem.text if title_elem is not None and title_elem.text else "Untitled Program"

        desc_elem = prog.find("desc")
        desc = desc_elem.text if desc_elem is not None else ""

        cat_elem = prog.find("category")
        cat = cat_elem.text if cat_elem is not None else "General"

        if ch_id and start and stop:
            programs.append((ch_id, title, start, stop, desc, cat))

    async with get_db() as db:
        await db.executemany(
            """
            INSERT INTO epg_programs (channel_epg_id, title, start_time, end_time, description, category)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            programs
        )
        await db.commit()

    return len(programs)

async def get_now_and_next_program(epg_id: str) -> Dict[str, Any]:
    """Get currently playing and upcoming program for a channel."""
    if not epg_id:
        return {"current": None, "next": None}

    now_iso = datetime.utcnow().isoformat()

    async with get_db() as db:
        # Current program: start_time <= now <= end_time
        async with db.execute(
            """
            SELECT * FROM epg_programs 
            WHERE channel_epg_id = ? AND start_time <= ? AND end_time >= ?
            ORDER BY start_time DESC LIMIT 1
            """,
            (epg_id, now_iso, now_iso)
        ) as cur:
            curr_row = await cur.fetchone()

        # Next program: start_time > now
        async with db.execute(
            """
            SELECT * FROM epg_programs 
            WHERE channel_epg_id = ? AND start_time > ?
            ORDER BY start_time ASC LIMIT 1
            """,
            (epg_id, now_iso)
        ) as cur:
            next_row = await cur.fetchone()

        return {
            "current": dict(curr_row) if curr_row else None,
            "next": dict(next_row) if next_row else None
        }

async def get_timeline_for_channels(channel_epg_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """Fetch 24-hour schedule timeline for multiple channels."""
    if not channel_epg_ids:
        return {}

    now_iso = datetime.utcnow().isoformat()
    placeholders = ",".join("?" for _ in channel_epg_ids)

    async with get_db() as db:
        async with db.execute(
            f"""
            SELECT * FROM epg_programs 
            WHERE channel_epg_id IN ({placeholders}) AND end_time >= ?
            ORDER BY start_time ASC LIMIT 500
            """,
            (*channel_epg_ids, now_iso)
        ) as cur:
            rows = await cur.fetchall()

    timeline: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        ch = r["channel_epg_id"]
        if ch not in timeline:
            timeline[ch] = []
        timeline[ch].append(dict(r))

    return timeline
