import ipaddress
import urllib.parse

from fastapi import HTTPException, Request

LOCAL_CLIENTS = {"127.0.0.1", "::1", "localhost", "testclient"}


def require_local_client(request: Request) -> None:
    """Allow an endpoint only from this computer (not from other devices on the network)."""
    host = request.client.host if request.client else ""
    if host not in LOCAL_CLIENTS:
        raise HTTPException(status_code=403, detail="Only available on the computer running Nexonic IPTV")


def is_safe_remote_url(url: str) -> bool:
    """
    Validate that a URL is safe to fetch: http(s) only, a hostname present, and not a loopback, private,
    link-local or cloud-metadata address (SSRF protection).
    """
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname or hostname in ("localhost", "metadata.google.internal"):
            return False
        try:
            ip = ipaddress.ip_address(hostname)
        except ValueError:
            return True  # domain name
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast)
    except Exception:
        return False
