# RF Viewer V2

Pi-based RF survey and tracking viewer with:

- live `rtl_power` ingestion
- Node web UI
- survey mode
- track mode
- pause/resume scanner control
- proximity mode with audio cues
- optional Alfa hotspot access for field use

This README assumes you are starting from a cloned repo.

---

## Features

- Browser-based spectrum viewer
- Live peak/event table
- Survey and track scanner modes
- Pause/resume scanner from the UI
- Proximity mode with hot/cold feedback
- Record controls
- Headless Pi-friendly deployment
- Optional Alfa hotspot for car or field use

---

## Project Structure

```text
rf-viewer-v2/
├── package.json
├── parser.js
├── server.js
├── settings.json
├── scanner.json
├── scanner.runtime.json
├── public/
│   ├── index.html
│   └── js/
│       └── app.js
├── scanner/
│   └── rf-viewer-stream.sh
└── scripts/
    └── start-alfa-hotspot.sh
```

---

## Prerequisites

Install the required packages on the Raspberry Pi:

```bash
sudo apt-get update
sudo apt-get install -y nodejs npm jq netcat-openbsd network-manager

node -v
npm -v
```

You will also need:

- an RTL-SDR device
- `rtl_power` available on the system
- an optional Alfa USB Wi-Fi dongle if using hotspot mode

---

## Install

Clone the repo:

```bash
cd ~/Desktop
git clone <your-repo-url> rf-viewer-v2
cd ~/Desktop/rf-viewer-v2
```

If the repo already exists:

```bash
cd ~/Desktop/rf-viewer-v2
git pull
```

Make sure the scanner script is executable:

```bash
chmod +x scanner/rf-viewer-stream.sh
```

Make sure the hotspot helper script in the repo is executable too:

```bash
chmod +x scripts/start-alfa-hotspot.sh
```

---

## Included Hotspot Script

The repo now includes the hotspot startup script here:

```text
scripts/start-alfa-hotspot.sh
```

After pulling the repo, copy it into place on the Pi:

```bash
sudo cp ~/Desktop/rf-viewer-v2/scripts/start-alfa-hotspot.sh /usr/local/bin/start-alfa-hotspot.sh
sudo chmod +x /usr/local/bin/start-alfa-hotspot.sh
```

This keeps the script version-controlled inside the repo while still installing it to the system path used by `systemd`.

---

## `scripts/start-alfa-hotspot.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

LOGFILE="/var/log/alfa-hotspot.log"
IFACE="wlan1"
CON_NAME="rf-viewer-hotspot"
SSID="RFV"
PASSWORD="password"

mkdir -p "$(dirname "$LOGFILE")"
touch "$LOGFILE"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"
}

log "Starting Alfa hotspot helper"

if ! command -v nmcli >/dev/null 2>&1; then
  log "ERROR: nmcli not found. Install NetworkManager first."
  exit 1
fi

if ! ip link show "$IFACE" >/dev/null 2>&1; then
  log "ERROR: Interface $IFACE not found. Is the Alfa dongle connected?"
  exit 1
fi

log "Found interface $IFACE"

nmcli radio wifi on || true
nmcli device set "$IFACE" managed yes || true

if nmcli -t -f NAME connection show | grep -Fxq "$CON_NAME"; then
  log "Connection $CON_NAME already exists"
else
  log "Creating hotspot connection $CON_NAME on $IFACE"
  nmcli connection add type wifi ifname "$IFACE" con-name "$CON_NAME" autoconnect yes ssid "$SSID"
  nmcli connection modify "$CON_NAME" \
    802-11-wireless.mode ap \
    802-11-wireless.band bg \
    ipv4.method shared \
    ipv6.method ignore \
    wifi-sec.key-mgmt wpa-psk \
    wifi-sec.psk "$PASSWORD"
fi

log "Bringing up hotspot connection $CON_NAME"
nmcli connection up "$CON_NAME"

IP_ADDR="$(ip -4 addr show "$IFACE" | awk '/inet / {print $2}' | head -n1 || true)"
log "Hotspot active on $IFACE with IP ${IP_ADDR:-unknown}"
```

> Change `SSID` and `PASSWORD` in the script if you want a custom hotspot name or password.

---

## Run Manually

Start the web server:

```bash
cd ~/Desktop/rf-viewer-v2
node server.js
```

In another terminal, start the scanner feed:

```bash
cd ~/Desktop/rf-viewer-v2
./scanner/rf-viewer-stream.sh 127.0.0.1 9001
```

Open the UI locally:

```text
http://127.0.0.1:3000
```

---

## Runtime Modes

### Survey Mode

Wide scanning across a configured frequency range.

### Track Mode

Narrow scanning around a selected frequency.

### Paused Mode

Stops active scan execution while keeping the UI available.

### Proximity Mode

Track-mode helper that gives hot/cold style strength feedback and optional audio alerts.

---

## API Quick Checks

Viewer alive:

```bash
curl -I http://127.0.0.1:3000
```

Frontend JS loading:

```bash
curl -I http://127.0.0.1:3000/js/app.js
```

Live data:

```bash
curl -s http://127.0.0.1:3000/api/live | jq
```

Scanner state:

```bash
curl -s http://127.0.0.1:3000/api/scanner | jq
```

Ports listening:

```bash
ss -ltnp | grep 3000
ss -ltnp | grep 9001
```

---

## Systemd Services

### `rf-viewer.service`

Runs the Node web app on port `3000`.

Create:

```bash
sudo nano /etc/systemd/system/rf-viewer.service
```

Example:

```ini
[Unit]
Description=RF Viewer Node Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/Desktop/rf-viewer-v2
ExecStart=/usr/bin/node /home/user/Desktop/rf-viewer-v2/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rf-viewer.service
sudo systemctl start rf-viewer.service
```

### `rf-viewer-scanner.service`

Runs the scanner script and sends live lines into `127.0.0.1:9001`.

Create:

```bash
sudo nano /etc/systemd/system/rf-viewer-scanner.service
```

Example:

```ini
[Unit]
Description=RF Viewer Scanner Stream
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/Desktop/rf-viewer-v2
ExecStart=/home/user/Desktop/rf-viewer-v2/scanner/rf-viewer-stream.sh 127.0.0.1 9001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rf-viewer-scanner.service
sudo systemctl start rf-viewer-scanner.service
```

### `alfa-hotspot.service`

Optional hotspot service for the Alfa dongle.

---

## Alfa Hotspot Setup

### Copy the Repo Script Into Place

After cloning or pulling the repo:

```bash
sudo cp ~/Desktop/rf-viewer-v2/scripts/start-alfa-hotspot.sh /usr/local/bin/start-alfa-hotspot.sh
sudo chmod +x /usr/local/bin/start-alfa-hotspot.sh
```

### Hotspot Service

Create:

```bash
sudo nano /etc/systemd/system/alfa-hotspot.service
```

Example:

```ini
[Unit]
Description=RF Viewer Alfa Hotspot
After=network-online.target NetworkManager.service
Wants=network-online.target
Requires=NetworkManager.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/start-alfa-hotspot.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable alfa-hotspot.service
sudo systemctl start alfa-hotspot.service
```

This service should:

- check for the Alfa dongle on `wlan1`
- bring up the hotspot if present
- leave Ethernet and built-in Wi-Fi alone

---

## Connect Over Hotspot

Check the hotspot IP:

```bash
ip addr show wlan1
```

Typical result:

```text
10.42.0.1
```

From another device on the hotspot, open the UI:

```text
http://10.42.0.1:3000
```

SSH into the Pi:

```bash
ssh user@10.42.0.1
```

Use the actual `wlan1` IP if different.

---

## Daily Commands

Restart everything:

```bash
sudo systemctl daemon-reload
sudo systemctl restart alfa-hotspot.service
sudo systemctl restart rf-viewer.service
sudo systemctl restart rf-viewer-scanner.service
```

Restart only the web app:

```bash
sudo systemctl restart rf-viewer.service
```

Restart only the scanner:

```bash
sudo systemctl restart rf-viewer-scanner.service
```

If you update the repo version of the hotspot script, copy it over again before restarting the hotspot service:

```bash
sudo cp ~/Desktop/rf-viewer-v2/scripts/start-alfa-hotspot.sh /usr/local/bin/start-alfa-hotspot.sh
sudo chmod +x /usr/local/bin/start-alfa-hotspot.sh
sudo systemctl restart alfa-hotspot.service
```

Check service status:

```bash
sudo systemctl status alfa-hotspot.service --no-pager
sudo systemctl status rf-viewer.service --no-pager
sudo systemctl status rf-viewer-scanner.service --no-pager
```

---

## Configuration Files

### `settings.json`

Viewer-side thresholds and filtering defaults.

### `scanner.json`

Saved scanner configuration.

### `scanner.runtime.json`

Live scanner runtime state used by the scanner script.

---

## Useful File Locations

Project files:

```text
~/Desktop/rf-viewer-v2/package.json
~/Desktop/rf-viewer-v2/parser.js
~/Desktop/rf-viewer-v2/server.js
~/Desktop/rf-viewer-v2/public/index.html
~/Desktop/rf-viewer-v2/public/js/app.js
~/Desktop/rf-viewer-v2/scanner/rf-viewer-stream.sh
~/Desktop/rf-viewer-v2/scripts/start-alfa-hotspot.sh
~/Desktop/rf-viewer-v2/settings.json
~/Desktop/rf-viewer-v2/scanner.json
~/Desktop/rf-viewer-v2/scanner.runtime.json
```

Installed system files:

```text
/usr/local/bin/start-alfa-hotspot.sh
/etc/systemd/system/alfa-hotspot.service
/etc/systemd/system/rf-viewer.service
/etc/systemd/system/rf-viewer-scanner.service
```

---

## Troubleshooting

### UI loads but spectrum is blank

Check:

```bash
ss -ltnp | grep 9001
curl -s http://127.0.0.1:3000/api/live | jq
```

If `/api/live` is empty, the scanner feed is not reaching the Node app.

### Frontend JS is not loading

Check:

```bash
curl -I http://127.0.0.1:3000/js/app.js
```

If this returns `404`, make sure:

- `public/js/app.js` exists
- `index.html` points to `/js/app.js`
- `server.js` is serving static JS files correctly

### Track mode looks active but data is stale

Check the scanner state:

```bash
curl -s http://127.0.0.1:3000/api/scanner | jq
```

Then inspect the scanner logs:

```bash
journalctl -u rf-viewer-scanner.service -n 50 --no-pager
```

### Scanner is paused and not resuming

Check current mode and last active mode:

```bash
curl -s http://127.0.0.1:3000/api/scanner | jq
```

You should see:

- `mode`
- `lastActiveMode`

### Web app changed but nothing updates

Restart the viewer service:

```bash
sudo systemctl restart rf-viewer.service
```

Then hard refresh the browser.

### Scanner shell script changed but behavior did not

Restart the scanner service:

```bash
sudo systemctl restart rf-viewer-scanner.service
```

### Hotspot is not showing up

Check the hotspot service:

```bash
sudo systemctl status alfa-hotspot.service --no-pager
cat /var/log/alfa-hotspot.log
```

Check interfaces:

```bash
nmcli device status
iw dev
```

Try manually bringing the hotspot up:

```bash
sudo /usr/local/bin/start-alfa-hotspot.sh
```

If you changed the repo version of the script but forgot to reinstall it, run:

```bash
sudo cp ~/Desktop/rf-viewer-v2/scripts/start-alfa-hotspot.sh /usr/local/bin/start-alfa-hotspot.sh
sudo chmod +x /usr/local/bin/start-alfa-hotspot.sh
sudo systemctl restart alfa-hotspot.service
```

---

## Reboot Test

After setup is complete:

```bash
sudo reboot
```

After reboot, verify:

- hotspot comes up
- viewer service is running
- scanner service is running
- another device can join the hotspot
- the web UI opens
- `/api/live` returns data
- pause/resume still works

---

## Notes

- `wlan0` is the Pi’s built-in Wi-Fi
- `wlan1` is the Alfa dongle
- hotspot should only use `wlan1`
- Ethernet can stay connected without affecting the hotspot
- the viewer runs on the Pi, so client devices only need the URL
- the scanner feeds the Node app locally through port `9001`
- the hotspot helper script lives in the repo under `scripts/` and gets copied into `/usr/local/bin/` for `systemd`

---

## Sanity Checklist

If everything is working, this should all be true:

- hotspot is visible from another device
- another device can join the hotspot
- `ssh user@<hotspot-ip>` works
- `http://<hotspot-ip>:3000` loads the viewer
- `/api/live` shows rows
- `/api/scanner` shows the correct mode
- `rf-viewer.service` is active
- `rf-viewer-scanner.service` is active
- `alfa-hotspot.service` is active
