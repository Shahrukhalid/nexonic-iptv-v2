import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from ..database import get_db
from ..models.schema import SourceCreate, Source
from ..services.source_manager import get_all_sources, refresh_source, auto_discover_channels
from ..services.playlist_importer import parse_m3u_content, save_channels_to_db
from ..config import PLAYLISTS_DIR
from ..utils.security import is_safe_remote_url

router = APIRouter(prefix="/api/sources", tags=["Sources"])

@router.get("", response_model=List[Source])
async def list_sources():
    return await get_all_sources()

@router.post("/auto-discover")
async def trigger_auto_discover():
    """Refresh every enabled source and import new channels."""
    try:
        return await auto_discover_channels()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def add_source(source: SourceCreate):
    if not is_safe_remote_url(source.url):
        raise HTTPException(status_code=400, detail="Source must be a public http(s) URL")
    now = datetime.utcnow().isoformat()
    async with get_db() as db:
        try:
            cur = await db.execute(
                """
                INSERT INTO sources (name, url, type, attribution, is_adult, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (source.name, source.url, source.type, source.attribution, now)
            )
            source_id = cur.lastrowid
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Source URL already exists or invalid: {str(e)}")

    # Automatically trigger initial import for the new source in background
    try:
        res = await refresh_source(source_id)
        return {"id": source_id, "message": "Source added and imported", "import_result": res}
    except Exception as e:
        return {"id": source_id, "message": f"Source added but initial import failed: {str(e)}"}

@router.post("/{source_id}/refresh")
async def trigger_refresh(source_id: int):
    try:
        return await refresh_source(source_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{source_id}")
async def delete_source(source_id: int, delete_channels: bool = Query(True)):
    async with get_db() as db:
        async with db.execute("SELECT url FROM sources WHERE id = ?", (source_id,)) as cur:
            src = await cur.fetchone()
            if not src:
                raise HTTPException(status_code=404, detail="Source not found")
            url = src["url"]

        if delete_channels:
            await db.execute("DELETE FROM channels WHERE source_url = ?", (url,))
        await db.execute("DELETE FROM sources WHERE id = ?", (source_id,))
        await db.commit()
    return {"status": "DELETED", "source_id": source_id}

@router.post("/upload")
async def upload_playlist_file(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
):
    """Upload a local .m3u or .m3u8 playlist file to import."""
    file_bytes = await file.read()
    content = file_bytes.decode("utf-8", errors="ignore")
    source_name = name or file.filename or "Uploaded Playlist"
    
    # Save a backup copy locally
    safe_name = Path(file.filename or "playlist.m3u").name
    save_filename = f"local_{int(datetime.utcnow().timestamp())}_{safe_name}"
    save_path = PLAYLISTS_DIR / save_filename
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # Register as source
    now = datetime.utcnow().isoformat()
    async with get_db() as db:
        cur = await db.execute(
            """
            INSERT INTO sources (name, url, type, attribution, is_adult, created_at)
            VALUES (?, ?, 'local_file', 'User Upload', 0, ?)
            """,
            (source_name, f"file://{save_path}", now)
        )
        source_id = cur.lastrowid
        await db.commit()

    parsed = parse_m3u_content(content, default_source_name=source_name, default_source_url=f"file://{save_path}")
    inserted, updated = await save_channels_to_db(parsed, source_id=source_id)

    return {
        "status": "SUCCESS",
        "source_id": source_id,
        "filename": file.filename,
        "inserted": inserted,
        "updated": updated
    }
