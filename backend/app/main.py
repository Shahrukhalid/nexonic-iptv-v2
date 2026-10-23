import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import APP_NAME, APP_VERSION, HOST, LOCAL_IP, PORT
from .database import init_db, get_db
from .services.source_manager import seed_default_sources, get_all_sources, refresh_source
from .services.scheduler_service import scheduler

from .api import channels, sources, verification, epg, playlists, proxy, settings, xtream, offline_media

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_default_sources()
    scheduler.start()
    first_import = None
    if os.environ.get("NEXONIC_SKIP_INITIAL_IMPORT") != "1":
        first_import = asyncio.create_task(_initial_import())
    yield
    # Shutdown
    if first_import and not first_import.done():
        first_import.cancel()
    scheduler.stop()


async def _initial_import():
    """On a fresh install, import the default playlists in the background."""
    async with get_db() as db:
        async with db.execute("SELECT COUNT(*) AS n FROM channels") as cur:
            if (await cur.fetchone())["n"] > 0:
                return
    for src in await get_all_sources():
        if src.get("enabled"):
            try:
                await refresh_source(src["id"])
            except Exception:
                pass

app = FastAPI(
    title=APP_NAME,
    description="Nexonic IPTV v2: a self-hosted player and Xtream Codes server for free, legal IPTV channels",
    version=APP_VERSION,
    lifespan=lifespan
)

# The web app is served from the same origin, so CORS is only needed for the
# Vite dev server. Other websites open in your browser cannot call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(channels.router)
app.include_router(sources.router)
app.include_router(verification.router)
app.include_router(epg.router)
app.include_router(playlists.router)
app.include_router(proxy.router)
app.include_router(settings.router)
app.include_router(xtream.router)
app.include_router(offline_media.router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "app": APP_NAME,
        "version": APP_VERSION,
        "local_ip": LOCAL_IP,
        "port": PORT
    }

@app.get("/api/info")
async def app_info():
    return {
        "app_name": APP_NAME,
        "version": APP_VERSION,
        "mode": "100% Local-First",
        "local_ip": LOCAL_IP,
        "port": PORT,
        "lg_tv_support": "Xtream Codes & M3U Plus Compatible",
        "documentation": "Fully offline and locally hosted"
    }

# Mount Frontend Static Build
from fastapi.staticfiles import StaticFiles
from .config import PROJECT_ROOT

dist_dir = PROJECT_ROOT / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=HOST, port=PORT, reload=False)
