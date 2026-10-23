import io
import csv
import json
from typing import List, Literal, Optional
from fastapi import APIRouter, Query, Response, HTTPException
from ..database import get_db
from ..services.verification_engine import verification_engine
from ..services.scheduler_service import scheduler

router = APIRouter(prefix="/api/verification", tags=["Verification"])

@router.get("/stats")
async def get_verification_stats():
    async with get_db() as db:
        adult_filter = "WHERE is_adult = 0"
        query = f"""
            SELECT 
                COUNT(*) as total_channels,
                SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) as working,
                SUM(CASE WHEN status = 'UNSTABLE' THEN 1 ELSE 0 END) as unstable,
                SUM(CASE WHEN status = 'OFFLINE' THEN 1 ELSE 0 END) as offline,
                SUM(CASE WHEN status = 'REGION RESTRICTED' THEN 1 ELSE 0 END) as restricted,
                SUM(CASE WHEN status = 'UNVERIFIED' THEN 1 ELSE 0 END) as unverified
            FROM channels
            {adult_filter}
        """
        async with db.execute(query) as cur:
            row = await cur.fetchone()
            stats = dict(row) if row else {}

    progress = verification_engine.get_progress()
    return {
        **progress,
        **stats,
        "batch_working": progress.get("working", 0)
    }

@router.get("/progress")
async def get_verification_progress():
    return verification_engine.get_progress()

@router.post("/test-channel/{channel_id}")
async def test_single_channel(channel_id: int):
    res = await verification_engine.verify_channel_and_update_db(channel_id)
    if res.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Channel not found")
    return res

@router.post("/batch")
async def start_batch_test(
    scope: Literal["all", "unverified", "failed", "favorites"] = Query("unverified"),
    limit: Optional[int] = Query(100, ge=1, le=2000)
):
    """Start batch verification across channels."""
    conditions = ["is_adult = 0"]

    if scope == "unverified":
        conditions.append("status = 'UNVERIFIED'")
    elif scope == "failed":
        conditions.append("status IN ('OFFLINE', 'TIMEOUT', 'INVALID STREAM', 'UNKNOWN ERROR')")
    elif scope == "favorites":
        conditions.append("is_favorite = 1")

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    async with get_db() as db:
        async with db.execute(f"SELECT id FROM channels {where_sql} LIMIT ?", (limit,)) as cur:
            rows = await cur.fetchall()
            channel_ids = [r["id"] for r in rows]

    if not channel_ids:
        return {"status": "EMPTY", "message": "No channels match the requested batch scope"}

    return await verification_engine.start_batch_verification(channel_ids)

@router.post("/pause")
async def pause_verification():
    verification_engine.pause()
    return {"status": "PAUSED"}

@router.post("/resume")
async def resume_verification():
    verification_engine.resume()
    return {"status": "RESUMED"}

@router.post("/cancel")
async def cancel_verification():
    verification_engine.cancel()
    return {"status": "CANCELLED"}

@router.get("/auto-audit/status")
async def get_auto_audit_status():
    """Get live status of continuous background auto-audit worker."""
    return scheduler.get_auto_audit_status()

@router.post("/auto-audit/start")
async def start_auto_audit():
    """Start continuous background auto-audit worker."""
    return await scheduler.start_auto_audit()

@router.post("/auto-audit/stop")
async def stop_auto_audit():
    """Stop continuous background auto-audit worker."""
    return await scheduler.stop_auto_audit()

@router.get("/auto-check")
async def get_auto_check():
    """Get active auto-check configuration and heartbeat status."""
    return {
        "interval_seconds": scheduler.auto_check_interval,
        "is_enabled": scheduler.auto_check_interval > 0,
        "is_running": scheduler.auto_check_running,
        "last_auto_check": scheduler.last_auto_check
    }

@router.post("/auto-check")
async def set_auto_check(interval_seconds: int = Query(30, ge=0, le=3600)):
    """Set periodic auto-check interval in seconds (0 = disabled, 30 = every 30s)."""
    await scheduler.set_auto_check_interval(interval_seconds)
    return {
        "status": "UPDATED",
        "interval_seconds": scheduler.auto_check_interval,
        "is_enabled": scheduler.auto_check_interval > 0
    }

@router.get("/export/json")
async def export_health_json():
    """Export channel health report in JSON format."""
    async with get_db() as db:
        adult_filter = "WHERE is_adult = 0"
        async with db.execute(f"SELECT id, name, country, category, status, status_reason, response_time_ms, resolution, video_codec, last_checked_at FROM channels {adult_filter} ORDER BY name ASC") as cur:
            rows = await cur.fetchall()
            data = [dict(r) for r in rows]

    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="nexonic_iptv_health_report.json"'}
    )

@router.get("/export/csv")
async def export_health_csv():
    """Export channel health report in CSV format."""
    async with get_db() as db:
        adult_filter = "WHERE is_adult = 0"
        async with db.execute(f"SELECT id, name, country, category, status, status_reason, response_time_ms, resolution, video_codec, last_checked_at FROM channels {adult_filter} ORDER BY name ASC") as cur:
            rows = await cur.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Country", "Category", "Status", "Reason", "Response Time (ms)", "Resolution", "Codec", "Last Checked"])

    for r in rows:
        writer.writerow([r["id"], r["name"], r["country"], r["category"], r["status"], r["status_reason"], r["response_time_ms"], r["resolution"], r["video_codec"], r["last_checked_at"]])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="nexonic_iptv_health_report.csv"'}
    )
