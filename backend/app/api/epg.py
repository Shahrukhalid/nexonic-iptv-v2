from typing import List, Optional
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
import httpx
from ..services.epg_service import get_now_and_next_program, get_timeline_for_channels, parse_and_import_xmltv
from ..utils.security import is_safe_remote_url

router = APIRouter(prefix="/api/epg", tags=["EPG Guide"])

@router.get("/now-next/{epg_id}")
async def get_channel_now_next(epg_id: str):
    return await get_now_and_next_program(epg_id)

@router.get("/timeline")
async def get_epg_timeline(channels: str = Query(..., description="Comma-separated epg_ids")):
    epg_ids = [c.strip() for c in channels.split(",") if c.strip()]
    return await get_timeline_for_channels(epg_ids)

@router.post("/import-url")
async def import_epg_from_url(url: str = Query(...)):
    if not is_safe_remote_url(url):
        raise HTTPException(status_code=400, detail="Invalid or unsafe EPG URL")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "NexonicIPTV/2.0"})
            resp.raise_for_status()
            count = await parse_and_import_xmltv(resp.content)
            return {"status": "SUCCESS", "programs_imported": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import EPG: {str(e)}")

@router.post("/upload")
async def upload_epg_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        count = await parse_and_import_xmltv(content)
        return {"status": "SUCCESS", "filename": file.filename, "programs_imported": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse XMLTV file: {str(e)}")
