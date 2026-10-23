"""Local stream relay for in-browser playback.

Browsers block many HLS streams that lack CORS headers. The relay fetches a channel's stream for the web player on
this computer and rewrites HLS manifests so segments load through it too. It is deliberately limited:

* only hosts of channels in your local catalogue (and hosts referenced by manifests it has already relayed) are
  allowed, so it cannot be used as an open proxy;
* private, loopback, link-local and metadata addresses are refused, including after redirects (SSRF protection);
* TLS certificates are verified and requests use an honest user agent — no header spoofing, no region workarounds.
"""

import re
import time
import urllib.parse

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse, StreamingResponse

from ..config import APP_NAME, APP_VERSION
from ..database import get_db
from ..utils.security import is_safe_remote_url

router = APIRouter(prefix="/api/proxy", tags=["Stream relay"])

USER_AGENT = f"{APP_NAME.replace(' ', '')}/{APP_VERSION}"
MAX_MANIFEST_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5
SEGMENT_SUFFIXES = (".ts", ".m4s", ".mp4", ".aac", ".m4a", ".vtt", ".webvtt")
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS"}

# host -> expiry timestamp; filled from the catalogue and from manifests this relay rewrote
_allowed_hosts: dict[str, float] = {}
_HOST_TTL = 6 * 3600


def _host(url: str) -> str:
    return (urllib.parse.urlparse(url).hostname or "").lower()


def _remember(url: str) -> None:
    host = _host(url)
    if host:
        _allowed_hosts[host] = time.time() + _HOST_TTL


async def _host_allowed(url: str) -> bool:
    host = _host(url)
    if not host:
        return False
    if _allowed_hosts.get(host, 0) > time.time():
        return True
    pattern = f"%://{host}%"
    async with get_db() as db:
        async with db.execute(
            "SELECT 1 FROM channels WHERE is_adult = 0 AND (stream_url LIKE ? OR fallback_urls LIKE ?) LIMIT 1",
            (pattern, pattern),
        ) as cur:
            found = await cur.fetchone() is not None
    if found:
        _remember(url)
    return found


async def _fetch(client: httpx.AsyncClient, url: str, headers: dict, stream: bool) -> httpx.Response:
    """GET with manual redirects so every hop is checked against private and internal addresses."""
    for _ in range(MAX_REDIRECTS + 1):
        if not is_safe_remote_url(url):
            raise HTTPException(status_code=400, detail="Refused: unsafe redirect target")
        resp = await client.send(client.build_request("GET", url, headers=headers), stream=stream)
        if resp.is_redirect and "location" in resp.headers:
            await resp.aclose()
            url = urllib.parse.urljoin(url, resp.headers["location"])
            _remember(url)
            continue
        return resp
    raise HTTPException(status_code=502, detail="Too many redirects")


def _proxied(url: str) -> str:
    _remember(url)
    return f"/api/proxy/stream?url={urllib.parse.quote(url, safe='')}"


def _rewrite_manifest(text: str, base_url: str) -> str:
    out = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("#"):
            if 'URI="' in s:
                s = re.sub(r'URI="([^"]+)"', lambda m: f'URI="{_proxied(urllib.parse.urljoin(base_url, m.group(1)))}"', s)
            out.append(s)
        else:
            out.append(_proxied(urllib.parse.urljoin(base_url, s)))
    return "\n".join(out) + "\n"


@router.api_route("/stream", methods=["GET", "HEAD", "OPTIONS"])
async def proxy_stream(request: Request, url: str = Query(..., description="Channel stream URL to relay")):
    if request.method == "OPTIONS":
        return Response(status_code=200, headers={**CORS, "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400"})

    # Local offline media is served directly by this app.
    if url.startswith("/api/offline-media/"):
        return RedirectResponse(url=url)

    if not is_safe_remote_url(url):
        raise HTTPException(status_code=400, detail="Invalid or unsafe stream URL")
    if not await _host_allowed(url):
        raise HTTPException(status_code=403, detail="Only streams of channels in your catalogue can be relayed")

    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if "range" in request.headers:
        headers["Range"] = request.headers["range"]

    client = httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=12.0), follow_redirects=False)
    try:
        if request.method == "HEAD":
            resp = await _fetch(client, url, headers, stream=True)
            await resp.aclose()
            await client.aclose()
            return Response(
                status_code=resp.status_code,
                headers={**CORS, "Content-Type": resp.headers.get("content-type", "application/octet-stream")},
            )

        path = urllib.parse.urlparse(url).path.lower()
        if path.endswith(SEGMENT_SUFFIXES):
            upstream = await _fetch(client, url, headers, stream=True)
            out_headers = {**CORS, "Cache-Control": "public, max-age=3600", "Accept-Ranges": "bytes"}
            for h in ("content-range", "content-length"):
                if h in upstream.headers:
                    out_headers[h.title()] = upstream.headers[h]

            async def body():
                try:
                    async for chunk in upstream.aiter_bytes(chunk_size=65536):
                        yield chunk
                finally:
                    await upstream.aclose()
                    await client.aclose()

            return StreamingResponse(
                body(),
                status_code=upstream.status_code,
                media_type=upstream.headers.get("content-type", "video/mp2t"),
                headers=out_headers,
            )

        resp = await _fetch(client, url, headers, stream=True)
        chunks, size = [], 0
        async for chunk in resp.aiter_bytes():
            size += len(chunk)
            if size > MAX_MANIFEST_BYTES:
                await resp.aclose()
                raise HTTPException(status_code=413, detail="Response too large")
            chunks.append(chunk)
        await resp.aclose()
        await client.aclose()
        content = b"".join(chunks)
        ctype = resp.headers.get("content-type", "").lower()

        if content.startswith(b"#EXTM3U") or "mpegurl" in ctype or path.endswith(".m3u8"):
            text = content.decode("utf-8", errors="replace")
            return Response(
                content=_rewrite_manifest(text, str(resp.url)),
                media_type="application/vnd.apple.mpegurl",
                headers={**CORS, "Cache-Control": "no-cache, no-store, must-revalidate"},
            )
        return Response(content=content, status_code=resp.status_code, media_type=ctype or "application/octet-stream", headers=CORS)
    except HTTPException:
        await client.aclose()
        raise
    except httpx.TimeoutException:
        await client.aclose()
        raise HTTPException(status_code=504, detail="Upstream timeout")
    except httpx.HTTPError as e:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Upstream error: {type(e).__name__}")
