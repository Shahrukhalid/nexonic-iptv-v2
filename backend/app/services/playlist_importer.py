import re
import json
import httpx
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple
from ..database import get_db
from ..utils.countries import normalize_country
from ..config import PLAYLISTS_DIR
from ..utils.security import is_safe_remote_url

EXTINF_REGEX = re.compile(
    r'#EXTINF:(?P<duration>[-0-9]+)\s*(?P<attributes>[^\n\r]*)[,](?P<name>[^\n\r]+)'
)
ATTR_REGEX = re.compile(r'([a-zA-Z0-9_-]+)="([^"]*)"')

SERIES_KEYWORDS = [
    "series", "tv series", "sitcom", "drama series", "comedy series", "anime", "cartoon series",
    "24/7", "marathon", "episodes", "season", "classic tv"
]

# Adult-oriented entries are never imported: Nexonic IPTV v2 is family-friendly by design.
ADULT_PATTERN = re.compile(
    r"(\bxxx\b|\badult(?! swim)\b|18\+|\berotic|\bnsfw\b|\bporn|\bplayboy\b|\bpenthouse\b|\bbrazzers\b|"
    r"\bhustler\b|\bsex\b|\bsexy\b|\bhentai\b|\bonlyfans\b|\bcamgirls?\b|\bnaked\b|\bnude)",
    re.IGNORECASE,
)


def detect_is_adult(name: str, group: str) -> bool:
    return bool(ADULT_PATTERN.search(f"{name} {group}"))

def detect_is_series(name: str, group: str) -> bool:
    combined = f"{name} {group}".lower()
    return any(k in combined for k in SERIES_KEYWORDS)

def normalize_category(group: str, name: str, is_series: bool) -> str:
    if is_series:
        return "TV Series"
    
    g = group.lower() if group else ""
    n = name.lower()
    combined = f"{g} {n}"

    if any(w in combined for w in ["news", "noticias", "nouvelles", "nachrichten"]):
        return "News"
    if any(w in combined for w in ["sport", "deporte", "futbol", "football", "cricket", "espn", "racing"]):
        return "Sports"
    if any(w in combined for w in ["movie", "cinema", "film", "pelicula", "hollywood"]):
        return "Movies"
    if any(w in combined for w in ["music", "musica", "radio", "mtv", "hits"]):
        return "Music"
    if any(w in combined for w in ["doc", "documentary", "history", "discovery", "nat geo", "geography"]):
        return "Documentary"
    if any(w in combined for w in ["kids", "children", "disney", "cartoon", "nickelodeon", "junior"]):
        return "Kids"
    if any(w in combined for w in ["education", "science", "learn", "university"]):
        return "Education"
    if any(w in combined for w in ["religion", "faith", "islam", "church", "quran", "bible", "gospel"]):
        return "Religious"
    if any(w in combined for w in ["entertainment", "variety", "show", "general"]):
        return "Entertainment"
        
    return group.strip() if group and len(group.strip()) > 2 else "General"

def parse_m3u_content(content: str, default_source_name: str = "Imported", default_source_url: str = "") -> List[Dict[str, Any]]:
    """Parse an extended M3U playlist. Adult-oriented entries are skipped."""
    lines = content.splitlines()
    channels = []
    
    current_meta: Dict[str, Any] = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith("#EXTINF:"):
            match = EXTINF_REGEX.match(line)
            if match:
                duration = match.group("duration")
                attrs_str = match.group("attributes")
                raw_name = match.group("name").strip()
                
                attrs = dict(ATTR_REGEX.findall(attrs_str))
                
                tvg_name = attrs.get("tvg-name", raw_name)
                channel_name = raw_name if raw_name else tvg_name
                group_title = attrs.get("group-title", "")
                tvg_logo = attrs.get("tvg-logo", "")
                tvg_id = attrs.get("tvg-id", "")
                tvg_country = attrs.get("tvg-country", attrs.get("country", ""))
                tvg_language = attrs.get("tvg-language", attrs.get("language", "English"))
                if not tvg_country and group_title:
                    test_code, test_name, test_flag = normalize_country(group_title)
                    if test_code != "INT":
                        tvg_country = test_code
                
                if not tvg_country and tvg_id and "." in tvg_id:
                    suffix = tvg_id.split("@")[0].split(".")[-1]
                    if len(suffix) == 2 and suffix.isalpha():
                        test_code, test_name, test_flag = normalize_country(suffix)
                        if test_code != "INT":
                            tvg_country = test_code
                
                if detect_is_adult(channel_name, group_title):
                    current_meta = {}  # skip this entry and its URL line
                    continue
                is_series = detect_is_series(channel_name, group_title)
                category = normalize_category(group_title, channel_name, is_series)
                
                country_code, country_name, country_flag = normalize_country(tvg_country)
                
                current_meta = {
                    "name": channel_name,
                    "alt_names": tvg_name if tvg_name != channel_name else None,
                    "country": country_name,
                    "country_code": country_code,
                    "country_flag": country_flag,
                    "language": tvg_language or "English",
                    "category": category,
                    "subcategory": group_title if group_title and group_title != category else None,
                    "logo": tvg_logo,
                    "stream_url": "",
                    "fallback_urls": "[]",
                    "stream_protocol": "hls",
                    "source_name": default_source_name,
                    "source_url": default_source_url,
                    "epg_id": tvg_id,
                    "status": "UNVERIFIED",
                    "is_adult": 0,
                    "is_series": 1 if is_series else 0,
                    "is_favorite": 0
                }
        elif line.startswith("#"):
            # Other metadata tags
            continue
        else:
            # Stream URL line
            if current_meta and (line.startswith("http://") or line.startswith("https://") or line.startswith("rtmp://") or line.startswith("/")):
                current_meta["stream_url"] = line
                if ".m3u8" in line.lower():
                    current_meta["stream_protocol"] = "hls"
                elif ".ts" in line.lower():
                    current_meta["stream_protocol"] = "ts"
                elif ".mpd" in line.lower():
                    current_meta["stream_protocol"] = "dash"
                channels.append(current_meta)
                current_meta = {}
                
    return channels

async def save_channels_to_db(parsed_channels: List[Dict[str, Any]], source_id: int | None = None) -> Tuple[int, int]:
    """
    Saves parsed channels into database.
    If a channel with the same name and country already exists:
    appends the stream_url to fallback_urls instead of creating duplicate!
    Returns (inserted_count, updated_count).
    """
    if not parsed_channels:
        return 0, 0
        
    inserted = 0
    updated = 0
    now = datetime.utcnow().isoformat()
    
    async with get_db() as db:
        for ch in parsed_channels:
            if not ch["stream_url"]:
                continue
                
            # Check for existing duplicate by name and country_code
            async with db.execute(
                "SELECT id, stream_url, fallback_urls FROM channels WHERE LOWER(name) = LOWER(?) AND country_code = ?",
                (ch["name"], ch["country_code"])
            ) as cur:
                existing = await cur.fetchone()
                
            if existing:
                # Add to fallback URLs if not already present
                existing_stream = existing["stream_url"]
                fallback_list = json.loads(existing["fallback_urls"] or "[]")
                if ch["stream_url"] != existing_stream and ch["stream_url"] not in fallback_list:
                    fallback_list.append(ch["stream_url"])
                    await db.execute(
                        "UPDATE channels SET fallback_urls = ?, updated_at = ? WHERE id = ?",
                        (json.dumps(fallback_list), now, existing["id"])
                    )
                    updated += 1
            else:
                await db.execute(
                    """
                    INSERT INTO channels (
                        name, alt_names, country, country_code, country_flag, region,
                        language, category, subcategory, logo, stream_url, fallback_urls,
                        stream_protocol, source_name, source_url, epg_id, status,
                        is_adult, is_series, is_favorite, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ch["name"], ch.get("alt_names"), ch["country"], ch["country_code"], ch["country_flag"],
                        ch.get("region"), ch.get("language"), ch["category"], ch.get("subcategory"),
                        ch.get("logo"), ch["stream_url"], ch.get("fallback_urls", "[]"),
                        ch.get("stream_protocol", "hls"), ch.get("source_name"), ch.get("source_url"),
                        ch.get("epg_id"), ch.get("status", "UNVERIFIED"),
                        0, ch.get("is_series", 0), ch.get("is_favorite", 0),
                        now, now
                    )
                )
                inserted += 1
                
        # If source_id provided, update source channel_count
        if source_id:
            total_for_source = len(parsed_channels)
            await db.execute(
                "UPDATE sources SET channel_count = ?, last_refreshed_at = ?, last_status = 'SUCCESS' WHERE id = ?",
                (total_for_source, now, source_id)
            )
            
        await db.commit()
        
    return inserted, updated

def _local_playlist_path(url: str):
    """Resolve a file:// source; only files inside the app's own playlists folder may be read."""
    raw = url.replace("file://", "")
    path = (Path(raw) if raw.startswith("/") else PLAYLISTS_DIR / raw).resolve()
    base = PLAYLISTS_DIR.resolve()
    if base != path and base not in path.parents:
        raise ValueError("Local playlists must be inside the local-data/playlists folder")
    return path


async def fetch_and_import_m3u(url: str, source_name: str, source_id: int | None = None) -> Tuple[int, int]:
    """Fetch an M3U playlist from a public URL (or an uploaded file in local-data/playlists) and import it."""
    if url.startswith("file://") or url.startswith("/"):
        content = _local_playlist_path(url).read_text(encoding="utf-8", errors="ignore")
    else:
        if not is_safe_remote_url(url):
            raise ValueError(f"URL is invalid or unsafe: {url}")
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "NexonicIPTV/2.0"})
            resp.raise_for_status()
            content = resp.text

    parsed = parse_m3u_content(content, default_source_name=source_name, default_source_url=url)
    return await save_channels_to_db(parsed, source_id=source_id)
