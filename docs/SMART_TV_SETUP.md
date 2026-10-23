# Watching Nexonic IPTV v2 on a Smart TV

Nexonic IPTV v2 includes an Xtream Codes compatible server, so most IPTV player apps on LG, Samsung, Android TV, Fire TV and Apple TV can use it.

## 1. Share the server on your home network

By default only the computer running Nexonic IPTV v2 can reach it. In the project folder:

```bash
cp .env.example .env      # if you haven't already
# edit .env and set:
NEXONIC_HOST=0.0.0.0
bash scripts/stop.sh && bash scripts/start.sh
```

Keep the TV and the computer on the same Wi-Fi or wired network. Don't forward the port on your router or expose it to the internet.

## 2. Find your login details

On the computer running the server, open **http://localhost:8000**, then **Connect Smart TV**. You'll see:

- **Server URL**, for example `http://<computer-ip>:8000`
- **Username** and **password** (random on first run; change them in Settings or with `NEXONIC_XTREAM_USER` and `NEXONIC_XTREAM_PASS` in `.env`)
- An **M3U URL** and an **EPG (XMLTV) URL** for apps that don't support Xtream Codes

These details are only shown on that computer, not to other devices.

## 3. Add it to your TV app

In IPTV Smarters Pro, TiviMate, or a similar player:

1. Choose **Add user** or **Add playlist**, then **Xtream Codes API**.
2. Enter any name, plus the server URL, username and password from step 2.
3. Save. Live channels, categories, TV series channels and the guide will load.

If your app only accepts an M3U link, paste the M3U URL instead, and the EPG URL if it asks for a guide.

## Troubleshooting

- **The TV can't connect**: check that `NEXONIC_HOST=0.0.0.0` is set, that both devices are on the same network, and that your computer's firewall allows incoming connections on the port.
- **A channel doesn't play**: open **Channel Health** and run a check. Free streams change often, and some only work in their home country.
- **The computer's IP changed**: reopen **Connect Smart TV** for the new server URL. A DHCP reservation on your router keeps it fixed.
