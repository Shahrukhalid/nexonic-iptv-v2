import aiosqlite
import json
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator, Optional, Dict, Any, List
import secrets

from .config import DATABASE_PATH, DEFAULT_XTREAM_USER, XTREAM_PASS_ENV, XTREAM_USER_ENV

SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    alt_names TEXT,
    country TEXT DEFAULT 'International',
    country_code TEXT DEFAULT 'INT',
    country_flag TEXT DEFAULT '🌐',
    region TEXT,
    language TEXT DEFAULT 'English',
    category TEXT DEFAULT 'General',
    subcategory TEXT,
    logo TEXT,
    stream_url TEXT NOT NULL,
    fallback_urls TEXT DEFAULT '[]',
    stream_protocol TEXT DEFAULT 'hls',
    source_name TEXT,
    source_url TEXT,
    epg_id TEXT,
    epg_url TEXT,
    description TEXT,
    resolution TEXT,
    video_codec TEXT,
    audio_codec TEXT,
    status TEXT DEFAULT 'UNVERIFIED',
    status_reason TEXT,
    last_checked_at TEXT,
    last_success_at TEXT,
    response_time_ms INTEGER,
    access_restriction TEXT DEFAULT 'PUBLIC',
    is_adult INTEGER DEFAULT 0,
    is_series INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    is_live INTEGER DEFAULT 1,
    is_vod INTEGER DEFAULT 0,
    is_satellite INTEGER DEFAULT 0,
    user_tags TEXT,
    custom_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_channels_country ON channels(country_code);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_is_adult ON channels(is_adult);
CREATE INDEX IF NOT EXISTS idx_channels_is_series ON channels(is_series);
CREATE INDEX IF NOT EXISTS idx_channels_is_fav ON channels(is_favorite);
CREATE INDEX IF NOT EXISTS idx_channels_is_live ON channels(is_live);
CREATE INDEX IF NOT EXISTS idx_channels_is_vod ON channels(is_vod);
CREATE INDEX IF NOT EXISTS idx_channels_is_satellite ON channels(is_satellite);

CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'm3u',
    enabled INTEGER DEFAULT 1,
    channel_count INTEGER DEFAULT 0,
    working_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    last_refreshed_at TEXT,
    last_status TEXT,
    attribution TEXT,
    is_adult INTEGER DEFAULT 0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS epg_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_epg_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    description TEXT,
    category TEXT
);

CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON epg_programs(channel_epg_id, start_time);

CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    watched_at TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    channel_ids TEXT DEFAULT '[]',
    is_adult INTEGER DEFAULT 0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get database connection context with row factory and robust busy timeout."""
    conn = await aiosqlite.connect(DATABASE_PATH, timeout=60.0)
    await conn.execute("PRAGMA busy_timeout = 60000")
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()

async def init_db():
    """Initialize SQLite tables and default settings."""
    async with aiosqlite.connect(DATABASE_PATH, timeout=60.0) as db:
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA busy_timeout = 60000")
        await db.executescript(SCHEMA_SQL)
        await db.commit()

        # Seed initial settings if absent. The Smart TV password is random unless set in the environment.
        defaults = {
            "xtream_user": DEFAULT_XTREAM_USER,
            "xtream_pass": XTREAM_PASS_ENV or secrets.token_urlsafe(12),
            "verification_concurrency": "6",
            "auto_refresh_hours": "0",  # 0 = manual only
        }
        for k, v in defaults.items():
            await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
        # Environment values always win, so credentials can be rotated without touching the database.
        if XTREAM_USER_ENV:
            await db.execute("UPDATE settings SET value = ? WHERE key = 'xtream_user'", (XTREAM_USER_ENV,))
        if XTREAM_PASS_ENV:
            await db.execute("UPDATE settings SET value = ? WHERE key = 'xtream_pass'", (XTREAM_PASS_ENV,))
        # Remove settings of features that no longer exist.
        await db.execute("DELETE FROM settings WHERE key IN ('adult_enabled', 'adult_pin_hash')")
        await db.commit()

async def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    async with get_db() as db:
        async with db.execute("SELECT value FROM settings WHERE key = ?", (key,)) as cur:
            row = await cur.fetchone()
            return row["value"] if row else default

async def set_setting(key: str, value: str):
    async with get_db() as db:
        await db.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, value))
        await db.commit()
