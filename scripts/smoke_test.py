#!/usr/bin/env python3
"""End-to-end check against a running Nexonic IPTV v2 server (standard library only).

Usage:  python3 scripts/smoke_test.py [http://127.0.0.1:8000]

It waits for the first playlist import, checks a sample of streams on the live internet, then exercises the
Xtream Codes login, playlist, stream redirect and the in-browser stream relay. Exit code 0 means everything passed.
"""

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
SAMPLE = 60
MIN_WORKING = 10


def get(path, raw=False, follow=True):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "nexonic-smoke-test"})
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(_NoRedirect())
    with opener.open(req, timeout=60) as resp:
        body = resp.read()
        return resp.status, (body if raw else json.loads(body or b"null")), resp.headers


def post(path):
    req = urllib.request.Request(BASE + path, data=b"", method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read() or b"null")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def check(name, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name}{' - ' + detail if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    status, health, _ = get("/api/health")
    check("server is healthy", status == 200 and health.get("status") == "HEALTHY")

    status, page, _ = get("/", raw=True)
    check("web app is served", status == 200 and b"<div id=\"root\">" in page)

    # 1. Wait for the first-run import of the default playlists (every source refreshed, or 10 minutes)
    for _ in range(120):
        sources = get("/api/sources")[1]
        if sources and all(s.get("last_refreshed_at") for s in sources):
            break
        time.sleep(5)
    failed = [s["name"] for s in sources if not str(s.get("last_status") or "").startswith("SUCCESS")]
    total = get("/api/channels/stats/summary")[1]["total_channels"]
    check("default playlists imported", total > 0, f"{total} channels from {len(sources) - len(failed)}/{len(sources)} sources")
    if failed:
        print("       (sources that could not be fetched: " + ", ".join(failed) + ")")
    cats = [c["category"] for c in get("/api/channels/stats/categories")[1]]
    check("channels have real categories", "News" in cats and "TV Series" in cats, ", ".join(cats[:8]))

    # 2. Check a sample of news channels on the live internet
    post("/api/verification/auto-audit/stop")
    for _ in range(30):
        if not get("/api/verification/progress")[1]["is_running"]:
            break
        time.sleep(2)
    ids = [c["id"] for c in get(f"/api/channels?category=News&status=ALL&page_size={SAMPLE}")[1]["items"]]
    working = []
    for cid in ids:
        res = post(f"/api/verification/test-channel/{cid}")
        if res.get("status") == "WORKING":
            working.append(cid)
    check("streams verified on the live internet", len(working) >= MIN_WORKING, f"{len(working)}/{len(ids)} working")

    # 3. Smart TV (Xtream Codes) flow
    info = get("/api/settings/connect-info")[1]
    user, pw = info["xtream_username"], info["xtream_password"]
    q = urllib.parse.urlencode({"username": user, "password": pw})
    login = get(f"/player_api.php?{q}")[1]
    check("Xtream login", login["user_info"]["auth"] == 1)
    bad = get("/player_api.php?" + urllib.parse.urlencode({"username": user, "password": "wrong-password"}))[1]
    check("wrong password rejected", bad["user_info"]["auth"] == 0)
    streams = get(f"/player_api.php?{q}&action=get_live_streams")[1]
    check("Xtream channel list", len(streams) == total, f"{len(streams)} streams")
    status, m3u, _ = get(f"/get.php?{q}&type=m3u_plus", raw=True)
    check("M3U playlist for TV apps", m3u.startswith(b"#EXTM3U") and m3u.count(b"#EXTINF") == total)
    try:
        get(f"/live/{user}/{pw}/{working[0]}.m3u8", raw=True, follow=False)
        redirected = False
    except urllib.error.HTTPError as e:
        redirected = e.code == 302 and bool(e.headers.get("Location"))
    check("TV stream link redirects to the channel", redirected)

    # 4. In-browser relay for a working stream
    ch = get(f"/api/channels/{working[0]}")[1]
    status, manifest, _ = get("/api/proxy/stream?" + urllib.parse.urlencode({"url": ch["stream_url"]}), raw=True)
    check("stream relay returns a playable manifest", status == 200 and manifest.lstrip().startswith(b"#EXTM3U"), ch["name"])

    print(f"\nAll checks passed: {total} channels, {len(working)}/{len(ids)} sampled news streams working.")


if __name__ == "__main__":
    main()
