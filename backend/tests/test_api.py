from fastapi.testclient import TestClient

from backend.app.main import app


def test_api_smoke_and_safety():
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200

        settings = client.get("/api/settings").json()
        assert "xtream_pass" not in settings
        assert "xtream_password" not in settings

        # Credentials are available to the local computer only
        info = client.get("/api/settings/connect-info")
        assert info.status_code == 200
        assert len(info.json()["xtream_password"]) >= 8

        remote = TestClient(app, client=("203.0.113.5", 50000))
        assert remote.get("/api/settings/connect-info").status_code == 403

        # Short passwords are rejected
        r = client.post("/api/settings/xtream-credentials", json={"username": "u", "password": "short"})
        assert r.status_code in (400, 422)

        # The relay is not an open proxy
        r = client.get("/api/proxy/stream", params={"url": "http://169.254.169.254/latest/meta-data"})
        assert r.status_code in (400, 403)
        r = client.get("/api/proxy/stream", params={"url": "https://not-a-known-channel-host.example/x.m3u8"})
        assert r.status_code in (400, 403)

        # Removed adult endpoints stay removed
        assert client.get("/api/channels", params={"include_adult": "true"}).status_code == 200
        assert client.post("/api/settings/verify-pin", json={"pin": "0000"}).status_code in (404, 405)
