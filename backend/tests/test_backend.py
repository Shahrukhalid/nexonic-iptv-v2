import pytest
import asyncio
from backend.app.database import init_db, get_db, get_setting, set_setting
from backend.app.utils.countries import normalize_country, code_to_flag
from backend.app.utils.security import is_safe_remote_url
from backend.app.services.playlist_importer import parse_m3u_content, save_channels_to_db
from backend.app.services.xtream_service import authenticate_xtream, get_user_info, get_server_info
from backend.app.services.verification_engine import verification_engine

@pytest.mark.asyncio
async def test_database_init():
    await init_db()
    async with get_db() as db:
        async with db.execute("SELECT COUNT(*) as count FROM settings") as cur:
            row = await cur.fetchone()
            assert row["count"] > 0

@pytest.mark.asyncio
async def test_country_normalization():
    code, name, flag = normalize_country("US")
    assert code == "US"
    assert name == "United States"
    assert flag == "🇺🇸"

    code_uk, name_uk, flag_uk = normalize_country("United Kingdom")
    assert code_uk == "GB"
    assert flag_uk == "🇬🇧"

    code_in, name_in, flag_in = normalize_country("IN")
    assert code_in == "IN"
    assert flag_in == "🇮🇳"

@pytest.mark.asyncio
async def test_ssrf_protection():
    # SSRF protection
    assert is_safe_remote_url("https://example.com/playlist.m3u8") is True
    assert is_safe_remote_url("http://169.254.169.254/latest/meta-data") is False
    assert is_safe_remote_url("ftp://example.com/stream") is False
    assert is_safe_remote_url("http://127.0.0.1:8000/") is False
    assert is_safe_remote_url("http://192.168.1.10/list.m3u") is False

@pytest.mark.asyncio
async def test_m3u_parsing_and_deduplication():
    import uuid
    uid = str(uuid.uuid4())[:8]
    sample_m3u = f"""#EXTM3U
#EXTINF:-1 tvg-id="bbc.one.{uid}" tvg-name="BBC Test {uid}" tvg-logo="https://example.com/bbc.png" group-title="News" tvg-country="GB",BBC Test {uid}
https://example.com/stream1_{uid}.m3u8
#EXTINF:-1 tvg-id="cnn.{uid}" tvg-name="CNN Test {uid}" tvg-logo="https://example.com/cnn.png" group-title="News" tvg-country="US",CNN Test {uid}
https://example.com/cnn_{uid}.m3u8
#EXTINF:-1 tvg-id="series.friends.{uid}" tvg-name="Friends 24/7 {uid}" group-title="TV Series" tvg-country="US",Friends 24/7 Comedy {uid}
https://example.com/friends_{uid}.m3u8
#EXTINF:-1 tvg-id="adult.test.{uid}" tvg-name="Adult Test {uid}" group-title="XXX Adult" tvg-country="US",Adult Erotic TV {uid}
https://example.com/adult_{uid}.m3u8
"""
    channels = parse_m3u_content(sample_m3u, default_source_name="Test Source")
    # Adult-oriented entries are skipped at import time
    assert len(channels) == 3
    assert not any("Adult" in c["name"] for c in channels)
    assert all(c["is_adult"] == 0 for c in channels)

    # Verify classification
    bbc = next(c for c in channels if "BBC" in c["name"])
    assert bbc["country_code"] == "GB"
    assert bbc["country_flag"] == "🇬🇧"
    assert bbc["category"] == "News"

    friends = next(c for c in channels if "Friends" in c["name"])
    assert friends["is_series"] == 1
    assert friends["category"] == "TV Series"

    # Test saving into DB
    inserted, updated = await save_channels_to_db(channels)
    assert inserted == 3

    # Test deduplication - re-inserting with new stream adds fallback URL
    dup_m3u = f"""#EXTM3U
#EXTINF:-1 tvg-id="bbc.one.{uid}" tvg-country="GB",BBC Test {uid}
https://example.com/stream_backup_{uid}.m3u8
"""
    dup_channels = parse_m3u_content(dup_m3u, default_source_name="Backup Source")
    dup_inserted, dup_updated = await save_channels_to_db(dup_channels)
    assert dup_inserted == 0
    assert dup_updated == 1

@pytest.mark.asyncio
async def test_xtream_authentication_and_info():
    await set_setting("xtream_user", "testuser")
    await set_setting("xtream_pass", "test-password-123")

    assert await authenticate_xtream("testuser", "test-password-123") is True
    assert await authenticate_xtream("testuser", "wrong-password") is False
    assert await authenticate_xtream("wrong", "password") is False

    user_info = await get_user_info("testuser")
    assert user_info["auth"] == 1
    assert user_info["status"] == "Active"

    server_info = await get_server_info()
    assert server_info["port"] == "8000"
    assert "url" in server_info


def test_category_from_playlist_url_and_country_groups():
    from backend.app.services.playlist_importer import category_hint_from_url

    assert category_hint_from_url("https://example.com/playlists/categories/news.m3u") == "News"
    assert category_hint_from_url("https://example.com/playlists/categories/series.m3u") == "TV Series"
    assert category_hint_from_url("https://example.com/playlists/all.m3u") is None

    m3u = """#EXTM3U
#EXTINF:-1 tvg-id="ZDFneo.de@SD" tvg-name="ZDFneo" tvg-country="DE" group-title="Germany",ZDFneo
https://example.com/zdfneo.m3u8
"""
    # A country used as group-title must not become the category
    plain = parse_m3u_content(m3u, default_source_name="Test")
    assert plain[0]["country_code"] == "DE"
    assert plain[0]["category"] == "General"

    # A per-category playlist decides the category
    hinted = parse_m3u_content(m3u, default_source_name="Test", category_hint="TV Series")
    assert hinted[0]["category"] == "TV Series"
    assert hinted[0]["is_series"] == 1

    # Multi-category groups keep their first category; "Undefined" becomes General
    from backend.app.services.playlist_importer import normalize_category
    assert normalize_category("Animation;Comedy", "Toon TV", False) == "Animation"
    assert normalize_category("Auto;Travel", "Drive", False) == "Auto"
    assert normalize_category("Undefined", "Channel 5", False) == "General"
