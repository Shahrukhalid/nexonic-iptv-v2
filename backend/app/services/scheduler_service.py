import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from ..database import get_db, get_setting, set_setting
from .source_manager import get_all_sources, refresh_source
from .verification_engine import verification_engine

class SchedulerService:
    def __init__(self):
        self.is_running: bool = False
        self._refresh_task: asyncio.Task | None = None
        self._auto_check_task: asyncio.Task | None = None
        self._auto_audit_task: asyncio.Task | None = None
        self.auto_check_interval: int = 30  # Periodic heartbeat (30s)
        self.last_auto_check: str | None = None
        self.auto_check_running: bool = False

        # Continuous High-Speed Auto-Audit Engine
        self.is_auto_audit_active: bool = True  # Automatically active to continuously audit unverified streams
        self.auto_audit_stats: Dict[str, Any] = {
            "is_active": True,
            "total_audited_session": 0,
            "working_found_session": 0,
            "offline_found_session": 0,
            "restricted_found_session": 0,
            "current_batch_size": 0,
            "last_audit_time": None,
            "concurrency": 25
        }

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._refresh_task = asyncio.create_task(self._refresh_loop())
            self._auto_check_task = asyncio.create_task(self._auto_check_loop())
            if self.is_auto_audit_active:
                self._auto_audit_task = asyncio.create_task(self._auto_audit_loop())

    def stop(self):
        self.is_running = False
        if self._refresh_task:
            self._refresh_task.cancel()
        if self._auto_check_task:
            self._auto_check_task.cancel()
        if self._auto_audit_task:
            self._auto_audit_task.cancel()

    async def start_auto_audit(self):
        self.is_auto_audit_active = True
        self.auto_audit_stats["is_active"] = True
        if not self._auto_audit_task or self._auto_audit_task.done():
            self._auto_audit_task = asyncio.create_task(self._auto_audit_loop())
        return self.get_auto_audit_status()

    async def stop_auto_audit(self):
        self.is_auto_audit_active = False
        self.auto_audit_stats["is_active"] = False
        if self._auto_audit_task and not self._auto_audit_task.done():
            self._auto_audit_task.cancel()
        return self.get_auto_audit_status()

    def get_auto_audit_status(self) -> Dict[str, Any]:
        task_alive = self._auto_audit_task is not None and not self._auto_audit_task.done()
        return {
            "is_active": self.is_auto_audit_active and (task_alive or self.is_running),
            **self.auto_audit_stats
        }

    async def set_auto_check_interval(self, seconds: int):
        self.auto_check_interval = max(0, seconds)
        await set_setting("auto_check_interval", str(self.auto_check_interval))

    async def _auto_audit_loop(self):
        """
        Continuous high-throughput background stream auditor.
        Automatically checks batches of UNVERIFIED channels concurrently,
        updating the database, promoting fallbacks, and keeping live Online/Offline stats fresh.
        """
        while self.is_running and self.is_auto_audit_active:
            try:
                # 1. Fetch batch of UNVERIFIED channels
                async with get_db() as db:
                    async with db.execute("""
                        SELECT id FROM channels 
                        WHERE status = 'UNVERIFIED'
                        ORDER BY is_favorite DESC, id ASC
                        LIMIT 50
                    """) as cur:
                        rows = await cur.fetchall()

                # 2. If no UNVERIFIED channels remain, cycle through oldest checked OFFLINE / UNSTABLE channels to test recovery
                if not rows:
                    async with get_db() as db:
                        async with db.execute("""
                            SELECT id FROM channels 
                            WHERE status IN ('OFFLINE', 'TIMEOUT', 'UNKNOWN ERROR')
                            ORDER BY last_checked_at ASC NULLS FIRST
                            LIMIT 30
                        """) as cur:
                            rows = await cur.fetchall()

                if not rows:
                    # Nothing to audit right now, sleep briefly
                    await asyncio.sleep(10)
                    continue

                ch_ids = [r["id"] for r in rows]
                self.auto_audit_stats["current_batch_size"] = len(ch_ids)

                semaphore = asyncio.Semaphore(25)

                async def audit_channel(cid: int):
                    async with semaphore:
                        if not self.is_auto_audit_active or not self.is_running:
                            return
                        try:
                            res = await verification_engine.verify_channel_and_update_db(cid, check_ffprobe=False, timeout_sec=4.5)
                            self.auto_audit_stats["total_audited_session"] += 1
                            st = res.get("status")
                            if st == "WORKING":
                                self.auto_audit_stats["working_found_session"] += 1
                            elif st == "REGION RESTRICTED":
                                self.auto_audit_stats["restricted_found_session"] += 1
                            else:
                                self.auto_audit_stats["offline_found_session"] += 1
                        except Exception:
                            pass

                tasks = [audit_channel(cid) for cid in ch_ids]
                await asyncio.gather(*tasks, return_exceptions=True)

                self.auto_audit_stats["last_audit_time"] = datetime.utcnow().isoformat()
                # Yield smoothly to keep system responsive
                await asyncio.sleep(0.4)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[AutoAudit] Notice in background loop: {e}")
                await asyncio.sleep(4)

    async def _refresh_loop(self):
        """Periodic full source refresh loop."""
        while self.is_running:
            try:
                hours_str = await get_setting("auto_refresh_hours", "0")
                hours = int(hours_str)
                if hours > 0:
                    await asyncio.sleep(hours * 3600)
                    if not self.is_running:
                        break
                    sources = await get_all_sources()
                    for src in sources:
                        if src.get("enabled"):
                            try:
                                await refresh_source(src["id"])
                            except Exception:
                                pass
                else:
                    await asyncio.sleep(60)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(60)

    async def _auto_check_loop(self):
        """Continuous auto-check heartbeat loop (default every 30 seconds)."""
        try:
            val = await get_setting("auto_check_interval", str(self.auto_check_interval))
            self.auto_check_interval = int(val)
        except Exception:
            self.auto_check_interval = 30

        while self.is_running:
            try:
                if self.auto_check_interval > 0:
                    await asyncio.sleep(self.auto_check_interval)
                    if not self.is_running or self.auto_check_interval <= 0:
                        continue

                    # Trigger a pulse across active visible channels if auto-audit isn't running
                    if not self.is_auto_audit_active and not verification_engine.is_running:
                        async with get_db() as db:
                            async with db.execute("""
                                SELECT id FROM channels 
                                WHERE status = 'UNVERIFIED'
                                ORDER BY is_favorite DESC, id ASC
                                LIMIT 20
                            """) as cur:
                                rows = await cur.fetchall()

                        if rows:
                            ch_ids = [r["id"] for r in rows]
                            self.last_auto_check = datetime.utcnow().isoformat()
                            self.auto_check_running = True
                            try:
                                await verification_engine.start_batch_verification(ch_ids, concurrency=10)
                            finally:
                                self.auto_check_running = False
                else:
                    await asyncio.sleep(5)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(10)

scheduler = SchedulerService()
