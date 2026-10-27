import asyncio
import time
import json
import shutil
import urllib.parse
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx

from ..utils.security import safe_async_client

from ..database import get_db
from ..config import FFPROBE_TIMEOUT_SECONDS, DEFAULT_VERIFICATION_CONCURRENCY

FFPROBE_BIN = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"

class VerificationEngine:
    def __init__(self):
        self.is_running: bool = False
        self.is_paused: bool = False
        self.is_cancelled: bool = False
        self.total_queued: int = 0
        self.completed_count: int = 0
        self.working_count: int = 0
        self.failed_count: int = 0
        self.current_channel_name: str = ""
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    def get_progress(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "total_queued": self.total_queued,
            "completed": self.completed_count,
            "working": self.working_count,
            "failed": self.failed_count,
            "current_channel": self.current_channel_name
        }

    async def verify_single_stream(self, stream_url: str, check_ffprobe: bool = False, timeout_sec: float = 5.0) -> Dict[str, Any]:
        """
        Runs Level 1, Level 2, and optional Level 3 verification on a stream URL.
        Returns detailed dict with status, reason, response_time_ms, resolution, codecs.
        """
        start_time = time.time()
        result = {
            "status": "UNVERIFIED",
            "reason": None,
            "response_time_ms": 0,
            "resolution": None,
            "video_codec": None,
            "audio_codec": None
        }

        # Level 1: HTTP inspection
        try:
            headers = {"User-Agent": "NexonicIPTV/2.0", "Accept": "*/*"}
            timeout_cfg = httpx.Timeout(timeout_sec, connect=min(3.5, timeout_sec), read=timeout_sec)
            async with safe_async_client(timeout=timeout_cfg, follow_redirects=True) as client:
                resp = await client.get(stream_url, headers=headers)
                latency = int((time.time() - start_time) * 1000)
                result["response_time_ms"] = latency

                if resp.status_code == 401 or resp.status_code == 407:
                    result["status"] = "AUTHENTICATION REQUIRED"
                    result["reason"] = f"HTTP {resp.status_code} Unauthorized"
                    return result

                if resp.status_code == 402:
                    result["status"] = "SUBSCRIPTION REQUIRED"
                    result["reason"] = f"HTTP {resp.status_code} Payment / Subscription Required"
                    return result

                if resp.status_code == 403:
                    # Check if region restricted
                    body_lower = resp.text.lower() if resp.text else ""
                    if any(w in body_lower for w in ["geo", "region", "country", "not available in your location"]):
                        result["status"] = "REGION RESTRICTED"
                        result["reason"] = "Geo-blocked / Region restricted"
                    else:
                        result["status"] = "REGION RESTRICTED"
                        result["reason"] = "HTTP 403 Forbidden (Possible Geo-restriction)"
                    return result

                if resp.status_code in (404, 410, 500, 502, 503, 504):
                    result["status"] = "OFFLINE"
                    result["reason"] = f"HTTP {resp.status_code}"
                    return result

                if resp.status_code not in (200, 206):
                    result["status"] = "OFFLINE"
                    result["reason"] = f"Unexpected status HTTP {resp.status_code}"
                    return result

                # Level 2: Manifest & Content-Type Inspection
                content_type = resp.headers.get("content-type", "").lower()
                body = resp.text or ""
                body_lower = body.lower()
                body_stripped = body.strip()

                # Check if returning HTML error page disguised as 200 or ISP block page
                if ("<html" in body_lower or "<!doctype" in body_lower or "text/html" in content_type) and not body_stripped.startswith("#EXTM3U"):
                    result["status"] = "OFFLINE"
                    result["reason"] = "Returned HTML page instead of video stream"
                    return result

                # If URL is an m3u8 playlist, verify that it actually contains EXTM3U
                url_clean = stream_url.lower().split("?")[0]
                if (url_clean.endswith(".m3u8") or "mpegurl" in content_type) and not (body_stripped.startswith("#EXTM3U") or body_stripped.startswith("#EXTINF")):
                    result["status"] = "OFFLINE"
                    result["reason"] = "Invalid HLS manifest response (missing #EXTM3U)"
                    return result

                # Check HLS manifest
                if body.startswith("#EXTM3U"):
                    # Check for DRM encryption
                    if "#EXT-X-KEY" in body and any(m in body for m in ["com.widevine", "fairplay", "playready"]):
                        result["status"] = "DRM PROTECTED"
                        result["reason"] = "Stream is encrypted with DRM"
                        return result

                    # Verify media segments accessibility if child playlist or segment listed
                    segment_urls = []
                    lines = body.splitlines()
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            resolved_url = urllib.parse.urljoin(str(resp.url), line)
                            segment_urls.append(resolved_url)
                            if len(segment_urls) >= 1:
                                break

                    if segment_urls:
                        first_sub = segment_urls[0]
                        # If child playlist, fetch child
                        try:
                            sub_resp = await client.get(first_sub, headers=headers)
                            if sub_resp.status_code not in (200, 206):
                                result["status"] = "UNSTABLE"
                                result["reason"] = f"Child segment/playlist returned HTTP {sub_resp.status_code}"
                                return result
                        except Exception:
                            result["status"] = "UNSTABLE"
                            result["reason"] = "Failed to fetch first segment / sub-manifest"
                            return result

        except httpx.ConnectTimeout:
            result["status"] = "TIMEOUT"
            result["reason"] = "Connection timed out"
            return result
        except httpx.ReadTimeout:
            result["status"] = "TIMEOUT"
            result["reason"] = "Read timed out"
            return result
        except httpx.ConnectError as ce:
            result["status"] = "OFFLINE"
            result["reason"] = f"Connection refused or DNS resolution failed: {str(ce)[:50]}"
            return result
        except Exception as e:
            result["status"] = "UNKNOWN ERROR"
            result["reason"] = str(e)[:60]
            return result

        # Level 3: FFprobe verification (if ffprobe exists)
        if check_ffprobe and FFPROBE_BIN:
            try:
                cmd = [
                    FFPROBE_BIN,
                    "-v", "error",
                    "-select_streams", "v:0",
                    "-show_entries", "stream=width,height,codec_name",
                    "-of", "json",
                    "-headers", "User-Agent: NexonicIPTV/2.0\r\n",
                    stream_url
                ]
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                try:
                    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=FFPROBE_TIMEOUT_SECONDS)
                    if stdout:
                        probe_data = json.loads(stdout.decode("utf-8", errors="ignore"))
                        streams = probe_data.get("streams", [])
                        if streams:
                            v = streams[0]
                            w = v.get("width")
                            h = v.get("height")
                            codec = v.get("codec_name")
                            if w and h:
                                result["resolution"] = f"{w}x{h}"
                            if codec:
                                result["video_codec"] = codec
                except asyncio.TimeoutError:
                    try:
                        proc.kill()
                    except Exception:
                        pass
            except Exception:
                pass

        # Determine Final Status
        latency = result["response_time_ms"]
        if latency > 3500:
            result["status"] = "UNSTABLE"
            result["reason"] = f"High latency ({latency}ms)"
        else:
            result["status"] = "WORKING"
            result["reason"] = "Verified working live stream"

        return result

    async def verify_channel_and_update_db(self, channel_id: int, check_ffprobe: bool = False, timeout_sec: float = 5.0) -> Dict[str, Any]:
        """Test a channel and persist the result into the database."""
        async with get_db() as db:
            async with db.execute("SELECT id, name, stream_url, fallback_urls FROM channels WHERE id = ?", (channel_id,)) as cur:
                row = await cur.fetchone()
                
        if not row:
            return {"status": "NOT_FOUND"}

        stream_url = row["stream_url"]
        res = await self.verify_single_stream(stream_url, check_ffprobe=check_ffprobe, timeout_sec=timeout_sec)
        now = datetime.utcnow().isoformat()

        new_stream_url = stream_url
        new_fallback_urls = row["fallback_urls"] or "[]"

        # If primary stream fails, check fallback URLs if available and promote working ones
        if res["status"] not in ("WORKING", "UNSTABLE"):
            try:
                fallback_list = json.loads(row["fallback_urls"] or "[]")
            except Exception:
                fallback_list = []

            for fb_url in list(fallback_list):
                fb_res = await self.verify_single_stream(fb_url, check_ffprobe=check_ffprobe, timeout_sec=timeout_sec)
                if fb_res["status"] in ("WORKING", "UNSTABLE"):
                    res = fb_res
                    res["reason"] = f"Promoted active fallback stream ({fb_res['status']})"
                    # Move old dead primary into fallbacks and promote fallback to primary
                    fallback_list.remove(fb_url)
                    if stream_url and stream_url not in fallback_list:
                        fallback_list.append(stream_url)
                    new_stream_url = fb_url
                    new_fallback_urls = json.dumps(fallback_list)
                    break

        async with get_db() as db:
            await db.execute(
                """
                UPDATE channels SET
                    stream_url = ?,
                    fallback_urls = ?,
                    status = ?,
                    status_reason = ?,
                    response_time_ms = ?,
                    resolution = COALESCE(?, resolution),
                    video_codec = COALESCE(?, video_codec),
                    audio_codec = COALESCE(?, audio_codec),
                    last_checked_at = ?,
                    last_success_at = CASE WHEN ? = 'WORKING' THEN ? ELSE last_success_at END,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    new_stream_url,
                    new_fallback_urls,
                    res["status"],
                    res["reason"],
                    res["response_time_ms"],
                    res["resolution"],
                    res["video_codec"],
                    res["audio_codec"],
                    now,
                    res["status"],
                    now,
                    now,
                    channel_id
                )
            )
            await db.commit()

        return res

    async def start_batch_verification(self, channel_ids: List[int], concurrency: int = DEFAULT_VERIFICATION_CONCURRENCY):
        """Starts batch verification in the background with concurrency control."""
        async with self._lock:
            if self.is_running:
                return {"status": "ALREADY_RUNNING"}
            self.is_running = True
            self.is_paused = False
            self.is_cancelled = False
            self.total_queued = len(channel_ids)
            self.completed_count = 0
            self.working_count = 0
            self.failed_count = 0

        self._task = asyncio.create_task(self._run_batch(channel_ids, concurrency))
        return {"status": "STARTED", "total": len(channel_ids)}

    async def _run_batch(self, channel_ids: List[int], concurrency: int):
        semaphore = asyncio.Semaphore(concurrency)

        async def worker(ch_id: int):
            async with semaphore:
                while self.is_paused and not self.is_cancelled:
                    await asyncio.sleep(0.5)

                if self.is_cancelled:
                    return

                res = await self.verify_channel_and_update_db(ch_id)
                self.completed_count += 1
                if res.get("status") == "WORKING":
                    self.working_count += 1
                else:
                    self.failed_count += 1

        tasks = [worker(cid) for cid in channel_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

        self.is_running = False
        self.is_paused = False

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def cancel(self):
        self.is_cancelled = True
        self.is_running = False
        self.is_paused = False

# Global verification engine instance
verification_engine = VerificationEngine()
