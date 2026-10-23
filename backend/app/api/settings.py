from fastapi import APIRouter, Body, Depends, HTTPException

from ..config import APP_NAME, DEFAULT_XTREAM_USER, LOCAL_IP, PORT
from ..database import get_setting, set_setting
from ..utils.security import require_local_client

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("")
async def get_all_settings():
    auto_refresh_hours = await get_setting("auto_refresh_hours", "0")
    verification_concurrency = await get_setting("verification_concurrency", "6")
    return {
        "auto_refresh_hours": int(auto_refresh_hours),
        "verification_concurrency": int(verification_concurrency),
        "local_ip": LOCAL_IP,
        "port": PORT,
        "shared_on_network": LOCAL_IP != "127.0.0.1",
    }


@router.get("/connect-info", dependencies=[Depends(require_local_client)])
async def get_connect_info():
    """Connection details for Smart TV apps. Only shown on the computer running the server."""
    xtream_user = await get_setting("xtream_user", DEFAULT_XTREAM_USER)
    xtream_pass = await get_setting("xtream_pass", "")
    base_url = f"http://{LOCAL_IP}:{PORT}"
    shared = LOCAL_IP != "127.0.0.1"
    return {
        "app_name": APP_NAME,
        "server_url": base_url,
        "local_ip": LOCAL_IP,
        "port": PORT,
        "shared_on_network": shared,
        "xtream_username": xtream_user,
        "xtream_password": xtream_pass,
        "m3u_url": f"{base_url}/get.php?username={xtream_user}&password={xtream_pass}",
        "xmltv_url": f"{base_url}/xmltv.php?username={xtream_user}&password={xtream_pass}",
        "instructions": (
            ("" if shared else "The server only accepts connections from this computer. Start it with "
             "NEXONIC_HOST=0.0.0.0 to let a Smart TV on your home network connect.\n")
            + "On your Smart TV:\n"
            "1. Open an IPTV player app (for example IPTV Smarters, TiviMate or OTT Navigator).\n"
            "2. Choose 'Login with Xtream Codes API' (or add the M3U URL).\n"
            f"3. Name: {APP_NAME}\n"
            f"4. Server URL: {base_url}\n"
            f"5. Username: {xtream_user}\n"
            "6. Password: the password shown in Settings on this computer\n"
            "7. Connect."
        ),
    }


@router.post("/xtream-credentials", dependencies=[Depends(require_local_client)])
async def update_xtream_credentials(username: str = Body(..., embed=True), password: str = Body(..., embed=True)):
    username, password = username.strip(), password.strip()
    if not username or len(password) < 8:
        raise HTTPException(status_code=400, detail="Username is required and the password needs 8+ characters")
    await set_setting("xtream_user", username)
    await set_setting("xtream_pass", password)
    return {"status": "SUCCESS", "xtream_user": username}
