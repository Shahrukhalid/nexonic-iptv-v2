import gzip
import asyncio

import httpx
import pytest

from backend.app.services import epg_service
from backend.app.utils.security import safe_async_client


def test_xmltv_rejects_entity_expansion():
    bomb = b'<?xml version="1.0"?><!DOCTYPE t [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]><tv>&b;</tv>'
    with pytest.raises(Exception):
        asyncio.run(epg_service.parse_and_import_xmltv(bomb))


def test_xmltv_caps_decompressed_size(monkeypatch):
    monkeypatch.setattr(epg_service, "MAX_XMLTV_BYTES", 1000)
    blob = gzip.compress(b"<tv>" + b" " * 5000 + b"</tv>")
    with pytest.raises(ValueError, match="larger than"):
        asyncio.run(epg_service.parse_and_import_xmltv(blob))


def test_safe_client_refuses_redirect_to_private_address():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "example.com":
            return httpx.Response(302, headers={"Location": "http://169.254.169.254/latest/meta-data/"})
        return httpx.Response(200, text="secret")

    async def run():
        async with safe_async_client(transport=httpx.MockTransport(handler), follow_redirects=True) as client:
            await client.get("http://example.com/playlist.m3u")

    with pytest.raises(httpx.RequestError, match="unsafe"):
        asyncio.run(run())
