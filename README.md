# RF Viewer V2

Pi-based RF survey, tracking, and listen viewer with:

- live `rtl_power` ingestion
- Node web UI
- survey mode
- track mode
- listen mode
- browser audio streaming during listen mode
- optional local Pi audio output during standalone tests
- pause/resume scanner control
- proximity mode with audio cues
- optional Alfa hotspot access for field use

This README assumes you are starting from a cloned repo.

---

## Features

- Browser-based spectrum viewer
- Live peak/event table
- Survey and track scanner modes
- Listen mode for locking to a single frequency
- Browser audio stream for clients connected to the viewer
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
│   ├── rf-viewer-stream.sh
│   └── rf-listen.sh
└── scripts/
    └── start-alfa-hotspot.sh
```

---

## Prerequisites

Install the required packages on the Raspberry Pi:

```bash
sudo apt-get update
sudo apt-get install -y nodejs npm jq netcat-openbsd network-manager ffmpeg alsa-utils

node -v
npm -v
ffmpeg -version
aplay --version
```

You will also need:

- an RTL-SDR device
- `rtl_power` available on the system
- `rtl_fm` available on the system
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

Make the scripts executable:

```bash
chmod +x scanner/rf-viewer-stream.sh
chmod +x scanner/rf-listen.sh
chmod +x scripts/start-alfa-hotspot.sh
```

---

## Included Hotspot Script

The repo includes the hotspot startup script here:

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

### Listen Mode

Locks onto one selected frequency and exposes a shared browser audio stream at the viewer. The scanner sweep is paused while listen mode is active.

### Paused Mode

Stops active scan execution while keeping the UI available.

### Proximity Mode

Track-mode helper that gives hot/cold style strength feedback and optional audio alerts.

---

## Browser Audio in Listen Mode

When listen mode is active:

- the SDR is locked to one frequency
- the Node server spawns the audio pipeline
- the frontend can play the shared stream through the browser
- multiple hotspot clients can listen to the same tuned frequency

The browser audio stream is served from:

```text
/api/listen/audio
```

Listen pipeline status and log endpoints:

```text
/api/listen/status
/api/listen/log
```

> Browser playback normally requires a user click on the page before audio can start.

---

## Standalone Local Listen Test

The included `scanner/rf-listen.sh` script is still useful for local Pi audio testing.

Example for FM broadcast:

```bash
./scanner/rf-listen.sh 93.3M wbfm 35 0
```

Example for narrow FM:

```bash
./scanner/rf-listen.sh 162.55M fm 35 0
```

If you want to force a specific ALSA device:

```bash
APLAY_DEVICE=hw:0,0 ./scanner/rf-listen.sh 93.3M wbfm 35 0
```

If you want raw audio on stdout for piping into another tool:

```bash
OUTPUT_MODE=stdout ./scanner/rf-listen.sh 93.3M wbfm 35 0
```

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

Listen state:

```bash
curl -s http://127.0.0.1:3000/api/listen | jq
curl -s http://127.0.0.1:3000/api/listen/status | jq
curl -s http://127.0.0.1:3000/api/listen/log | jq
```

Start listen mode from terminal:

```bash
curl -s -X POST http://127.0.0.1:3000/api/listen/start \
  -H 'Content-Type: application/json' \
  -d '{"frequency":"93.3M","modulation":"wbfm","gain":35,"squelch":0}' | jq
```

Stop listen mode:

```bash
curl -s -X POST http://127.0.0.1:3000/api/listen/stop \
  -H 'Content-Type: application/json' | jq
```

Ports listening:

```bash
ss -ltnp | grep 3000
ss -ltnp | grep 9001
```

---

## Systemd Services

### `rf-viewer.service`

Runs the Node web app and listen audio pipeline on port `3000`.

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
Environment=APLAY_DEVICE=default

[Install]
WantedBy=multi-user.target
```

> If your Pi needs a specific ALSA device, replace `default` with something like `hw:0,0`.

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

Live scanner runtime state used by the scanner script and the web server.

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
~/Desktop/rf-viewer-v2/scanner/rf-listen.sh
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

Runtime audio diagnostics:

```text
/tmp/rf-listen-status.json
/tmp/rf-listen.log
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

### Listen mode works on the Pi but not in the browser

Check listen diagnostics:

```bash
curl -s http://127.0.0.1:3000/api/listen/status | jq
curl -s http://127.0.0.1:3000/api/listen/log | jq
```

Confirm `ffmpeg` exists:

```bash
which ffmpeg
ffmpeg -version
```

If missing, install it:

```bash
sudo apt-get install -y ffmpeg
```

Then restart the web service:

```bash
sudo systemctl restart rf-viewer.service
```

### Pi can tune but you hear no local audio during standalone tests

Check ALSA devices:

```bash
aplay -l
aplay -L
speaker-test -D default -t sine -f 1000 -c 1
```

If needed, force a device:

```bash
APLAY_DEVICE=hw:0,0 ./scanner/rf-listen.sh 93.3M wbfm 35 0
```

If that works, set `Environment=APLAY_DEVICE=hw:0,0` in `rf-viewer.service`.

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
- listen mode starts
- browser audio plays
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
- listen mode uses the same SDR, so scanning and listening do not happen at the same time
- browser audio depends on `ffmpeg`
- browser playback usually requires a user click

---

## Sanity Checklist

If everything is working, this should all be true:

- hotspot is visible from another device
- another device can join the hotspot
- `ssh user@<hotspot-ip>` works
- `http://<hotspot-ip>:3000` loads the viewer
- `/api/live` shows rows
- `/api/scanner` shows the correct mode
- listen mode starts from the UI
- `Play in browser` works for connected clients
- `rf-viewer.service` is active
- `rf-viewer-scanner.service` is active
- `alfa-hotspot.service` is active
```