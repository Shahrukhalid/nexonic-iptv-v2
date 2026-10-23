import os
import mimetypes
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from ..database import get_db

from ..config import LOCAL_DATA_DIR

router = APIRouter(prefix="/api/offline-media", tags=["Offline Media"])

OFFLINE_MEDIA_DIR = os.path.abspath(
    os.path.join(str(LOCAL_DATA_DIR), "offline_media")
)

def get_file_path(filename: str) -> str:
    # Prevent directory traversal
    safe_name = os.path.basename(filename)
    path = os.path.join(OFFLINE_MEDIA_DIR, safe_name)
    if not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Offline media file not found")
    return path

@router.get("/files")
async def list_offline_files():
    """Lists all available offline media and test pattern videos in the local directory."""
    os.makedirs(OFFLINE_MEDIA_DIR, exist_ok=True)
    files = []
    for f in sorted(os.listdir(OFFLINE_MEDIA_DIR)):
        if f.startswith("."):
            continue
        p = os.path.join(OFFLINE_MEDIA_DIR, f)
        if os.path.isfile(p):
            stat = os.stat(p)
            files.append({
                "filename": f,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "stream_url": f"/api/offline-media/stream/{f}"
            })
    return {
        "directory": OFFLINE_MEDIA_DIR,
        "count": len(files),
        "files": files
    }

@router.api_route("/stream/{filename}", methods=["GET", "HEAD"])
async def stream_offline_file(filename: str, request: Request):
    """
    Streams a local video file with full HTTP 206 Partial Content (Range requests)
    for smooth playback, seeking, and Smart TV compatibility.
    """
    path = get_file_path(filename)
    file_size = os.path.getsize(path)
    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "video/mp4"

    range_header = request.headers.get("range")
    if not range_header:
        # Full file stream
        def iter_full():
            with open(path, "rb") as f:
                while chunk := f.read(1024 * 256):
                    yield chunk

        headers = {
            "Content-Type": mime_type,
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        }
        return StreamingResponse(iter_full(), headers=headers, media_type=mime_type)

    # Parse Range: bytes=start-end
    try:
        range_val = range_header.replace("bytes=", "").strip()
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        if end >= file_size:
            end = file_size - 1
        content_length = (end - start) + 1
    except Exception:
        raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")

    def iter_range(start_byte: int, end_byte: int):
        with open(path, "rb") as f:
            f.seek(start_byte)
            bytes_left = (end_byte - start_byte) + 1
            chunk_size = 1024 * 256
            while bytes_left > 0:
                read_size = min(chunk_size, bytes_left)
                data = f.read(read_size)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": mime_type,
    }
    return StreamingResponse(
        iter_range(start, end),
        status_code=206,
        headers=headers,
        media_type=mime_type
    )

@router.post("/scan")
async def scan_and_register_offline_files():
    """Scans local offline media directory and registers any new files as channels in SQLite."""
    os.makedirs(OFFLINE_MEDIA_DIR, exist_ok=True)
    now = datetime.utcnow().isoformat()
    registered = 0

    async with get_db() as db:
        for f in sorted(os.listdir(OFFLINE_MEDIA_DIR)):
            if f.startswith(".") or not (f.endswith(".mp4") or f.endswith(".mkv") or f.endswith(".ts") or f.endswith(".mov")):
                continue

            stream_url = f"/api/offline-media/stream/{f}"
            clean_name = os.path.splitext(f)[0].replace("_", " ").title()

            # Check if exists
            async with db.execute("SELECT id FROM channels WHERE stream_url = ?", (stream_url,)) as cur:
                if await cur.fetchone():
                    continue

            await db.execute("""
                INSERT INTO channels (
                    name, country, country_code, country_flag, category, subcategory,
                    stream_url, stream_protocol, is_live, is_vod, is_adult, is_series,
                    status, status_reason, source_name, resolution, created_at, updated_at
                ) VALUES (?, 'Local Machine', 'LOC', '💻', 'Local Offline Media', 'Local Recording',
                          ?, 'mp4', 0, 1, 0, 0, 'WORKING', 'Verified Local File', 'Offline Media Folder', '1080p', ?, ?)
            """, (f"{clean_name} (Local Offline)", stream_url, now, now))
            registered += 1

        await db.commit()

    return {"status": "SUCCESS", "new_files_registered": registered}
