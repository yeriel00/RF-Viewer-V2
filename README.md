# RF Viewer V2

Pi-based RF survey, tracking, listen, BLE, and Wi-Fi field viewer with:

- live `rtl_power` ingestion
- Node web UI
- survey mode
- track mode
- listen mode
- browser audio streaming during listen mode
- optional local Pi audio output during standalone tests
- pause/resume scanner control
- proximity mode with audio cues
- BLE scanner service and BLE match card
- Wi-Fi scanner service and Wi-Fi match card
- sticky local browser memory for BLE and Wi-Fi findings
- row lock / unlock for important BLE and Wi-Fi hits
- BLE ↔ Wi-Fi related-candidate hints in the UI
- Network Probe: Shodan-style host discovery, port scanning, banner grabbing, and TLS cert extraction
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
- BLE scanner card with match highlighting
- Wi-Fi scanner card with match highlighting
- Sticky BLE / Wi-Fi browser-side memory so findings stay visible after they go stale
- Clear-memory buttons for BLE / Wi-Fi cards
- Lock buttons on BLE / Wi-Fi rows so important findings stay pinned to the top
- BLE ↔ Wi-Fi related-candidate hinting so one side can help annotate the other
- Network Probe card — discover hosts via ARP, scan TCP ports, grab banners, extract TLS certs
- Probe results flow into device-intel and fusion clusters with exposure class auto-calculation
- Headless Pi-friendly deployment
- Optional Alfa hotspot for car or field use

---

## Project Structure

```text
rf-viewer-v2/
├── package.json
├── parser.js
├── server.js
├── ble-matcher.js
├── wifi-matcher.js
├── intel-fusion.js
├── network-discovery.js
├── port-scanner.js
├── probe-to-intel.js
├── settings.json
├── scanner.json
├── scanner.runtime.json
├── public/
│   ├── index.html
│   └── js/
│       └── app.js
├── scanner/
│   ├── rf-viewer-stream.sh
│   ├── rf-listen.sh
│   ├── ble-scanner.py
│   └── wifi-scanner.py
├── data/
│   ├── ble-live.jsonl
│   ├── ble-status.json
│   ├── ble-summary.json
│   ├── ble-control.json
│   ├── wifi-live.jsonl
│   ├── wifi-status.json
│   ├── wifi-summary.json
│   ├── wifi-control.json
│   ├── probe-results.json
│   └── host-discovery.json
└── scripts/
    └── start-alfa-hotspot.sh
```

---

## Prerequisites

Install the required packages on the Raspberry Pi:

```bash
sudo apt-get update
sudo apt-get install -y \
  nodejs npm jq netcat-openbsd network-manager \
  ffmpeg alsa-utils \
  python3-bleak \
  wireless-tools

node -v
npm -v
ffmpeg -version
aplay --version
python3 -c "import bleak; print('bleak import ok')"
```

You will also need:

- an RTL-SDR device
- `rtl_power` available on the system
- `rtl_fm` available on the system
- built-in Pi Bluetooth enabled for BLE scanning
- built-in or USB Wi-Fi interface for Wi-Fi scanning
- an optional Alfa USB Wi-Fi dongle if using hotspot mode

> `python3-bleak` is installed from `apt`, so you do **not** need a Python virtual environment for the BLE scanner.

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
chmod +x scanner/ble-scanner.py
chmod +x scanner/wifi-scanner.py
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

In another terminal, start the RF scanner feed:

```bash
cd ~/Desktop/rf-viewer-v2
./scanner/rf-viewer-stream.sh 127.0.0.1 9001
```

In another terminal, start BLE scanning:

```bash
cd ~/Desktop/rf-viewer-v2
python3 scanner/ble-scanner.py
```

In another terminal, start Wi-Fi scanning:

```bash
cd ~/Desktop/rf-viewer-v2
python3 scanner/wifi-scanner.py
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

## BLE Card

The BLE card reads from the BLE scanner service and shows:

- current BLE scanner state
- unique and active advertiser counts
- candidate match counts
- strongest active hit
- remembered device rows
- related Wi-Fi hinting
- lock / unlock controls
- clear-memory control

BLE rows remain in the browser even after they go out of range. They dim as they become stale and brighten again if reacquired.

BLE browser memory is:

- local to the viewing browser / phone
- capped to roughly 200 remembered rows
- safe to clear without affecting the Pi-side BLE service

### BLE API Endpoints

```text
/api/ble/status
/api/ble/summary
/api/ble/start
/api/ble/stop
```

Quick checks:

```bash
curl -s http://127.0.0.1:3000/api/ble/status | jq
curl -s http://127.0.0.1:3000/api/ble/summary | jq
curl -s -X POST http://127.0.0.1:3000/api/ble/start | jq
curl -s -X POST http://127.0.0.1:3000/api/ble/stop | jq
```

---

## Wi-Fi Card

The Wi-Fi card reads from the Wi-Fi scanner service and shows:

- current Wi-Fi scanner state
- unique and active network counts
- candidate match counts
- strongest active hit
- remembered network rows
- related BLE hinting
- lock / unlock controls
- clear-memory control

Wi-Fi rows remain in the browser even if the SSID disappears or the access point goes out of range. Hidden or stale rows stay visible until cleared.

Wi-Fi browser memory is:

- local to the viewing browser / phone
- capped to roughly 200 remembered rows
- safe to clear without affecting the Pi-side Wi-Fi service

### Wi-Fi API Endpoints

```text
/api/wifi/status
/api/wifi/summary
/api/wifi/start
/api/wifi/stop
```

Quick checks:

```bash
curl -s http://127.0.0.1:3000/api/wifi/status | jq
curl -s http://127.0.0.1:3000/api/wifi/summary | jq
curl -s -X POST http://127.0.0.1:3000/api/wifi/start | jq
curl -s -X POST http://127.0.0.1:3000/api/wifi/stop | jq
```

---

## BLE ↔ Wi-Fi Related-Candidate Linking

The frontend now maintains BLE and Wi-Fi memory together and computes light cross-reference hints.

This does **not** claim exact MAC equality across radios. Instead, it uses heuristics such as:

- same time window
- same active / stale timing
- similar proximity bucket
- similar candidate family / match context
- repeated co-appearance

This lets the UI show:

- related BLE hint on Wi-Fi rows
- related Wi-Fi hint on BLE rows

These are **annotations**, not hard identity merges.

---

## Network Probe

The Network Probe feature adds Shodan-style host discovery and port scanning to the RF viewer, enriching BLE and Wi-Fi observations with active network intelligence.

### Capabilities

- **Host Discovery** — scans the local ARP / neighbor table (`ip neigh` on Linux, `arp -a` on macOS) and correlates discovered MACs with Wi-Fi BSSIDs
- **TCP Port Scanning** — connect-scan with configurable port list, concurrency, and timeouts
- **Banner Grabbing** — reads service banners from open ports (SSH, FTP, SMTP, HTTP, Redis, MySQL, MongoDB, RTSP, etc.)
- **TLS Certificate Extraction** — grabs subject, issuer, SANs, and expiry from TLS-enabled ports
- **Service Identification** — pattern-matches banners to identify software versions
- **Exposure Classification** — auto-calculates E0–E4 exposure class based on open services:
  - **E4**: Unauthenticated database ports (MySQL, Postgres, MongoDB, Redis)
  - **E3**: Management services (SSH, Telnet, RTSP)
  - **E2**: Web services (HTTP)
  - **E1**: Encrypted-only services
  - **E0**: No open ports

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/probe/status` | Probe state, config, discovery data, result count |
| POST | `/api/probe/discover` | Trigger host discovery |
| POST | `/api/probe/scan` | Scan hosts — body: `{target: "all"\|"<ip>", ports?, timeout?}` |
| GET | `/api/probe/results` | All scan results keyed by IP |
| GET | `/api/probe/results/:ip` | Single host scan result |
| POST | `/api/probe/auto` | Toggle auto-probe settings |
| POST | `/api/probe/config` | Update port list, timeouts, concurrency, subnet lists |

### Configuration

Probe settings live in `scanner.json` under the `probe` key:

```json
{
  "probe": {
    "enabled": false,
    "autoDiscover": false,
    "discoverIntervalSec": 300,
    "autoScan": false,
    "scanIntervalSec": 600,
    "ports": [21,22,23,25,53,80,110,143,443,445,554,993,1883,3000,3306,5432,5672,6379,8080,8443,8554,8883,9090,27017],
    "timeoutMs": 2000,
    "concurrency": 10,
    "subnetAllowList": [],
    "subnetDenyList": []
  }
}
```

### Fusion Integration

Probe results automatically:

1. Get converted to device-intel items via `probe-to-intel.js` (keyed by MAC when available, IP otherwise)
2. Flow into the Union-Find fusion engine with a reachability bonus (+15 relation strength)
3. Appear in fusion cluster detail views with service versions, banners, and TLS cert info
4. Enrich Wi-Fi network rows with probe summaries (open port count, service list)

### Files

| File | Purpose |
|------|---------|
| `network-discovery.js` | ARP/neighbor table parsing, reverse DNS, OUI vendor lookup, Wi-Fi BSSID correlation |
| `port-scanner.js` | TCP connect scanning, banner grabbing, TLS cert extraction, service identification |
| `probe-to-intel.js` | Converts scan results to device-intel format with exposure class auto-calculation |
| `data/host-discovery.json` | Persisted host discovery results |
| `data/probe-results.json` | Persisted port scan results |

---

## Sticky Local Browser Memory

BLE and Wi-Fi cards now keep remembered rows in browser-side local storage.

This means:

- stop scanning and rows stay visible
- stale hits dim over time
- lock rows stay pinned to the top
- clear buttons wipe browser memory only
- no constant extra write load is added to the Pi for remembered rows

The remembered memory lives on the client device using the viewer, not in a constantly growing Pi-side database.

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

Live RF data:

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

BLE state:

```bash
curl -s http://127.0.0.1:3000/api/ble/status | jq
curl -s http://127.0.0.1:3000/api/ble/summary | jq
```

Wi-Fi state:

```bash
curl -s http://127.0.0.1:3000/api/wifi/status | jq
curl -s http://127.0.0.1:3000/api/wifi/summary | jq
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

Runs the RF scanner script and sends live lines into `127.0.0.1:9001`.

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

### `rf-viewer-ble.service`

Runs the BLE scanner continuously and writes BLE summary data for the web UI.

Create:

```bash
sudo nano /etc/systemd/system/rf-viewer-ble.service
```

Example:

```ini
[Unit]
Description=RF Viewer BLE Scanner
After=bluetooth.service network-online.target
Wants=bluetooth.service network-online.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/Desktop/rf-viewer-v2
ExecStart=/usr/bin/python3 /home/user/Desktop/rf-viewer-v2/scanner/ble-scanner.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rf-viewer-ble.service
sudo systemctl start rf-viewer-ble.service
```

### `rf-viewer-wifi.service`

Runs the Wi-Fi scanner continuously and writes Wi-Fi summary data for the web UI.

Create:

```bash
sudo nano /etc/systemd/system/rf-viewer-wifi.service
```

Example:

```ini
[Unit]
Description=RF Viewer Wi-Fi Scanner
After=network-online.target NetworkManager.service
Wants=network-online.target NetworkManager.service

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/Desktop/rf-viewer-v2
ExecStart=/usr/bin/python3 /home/user/Desktop/rf-viewer-v2/scanner/wifi-scanner.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rf-viewer-wifi.service
sudo systemctl start rf-viewer-wifi.service
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
sudo systemctl restart rf-viewer-ble.service
sudo systemctl restart rf-viewer-wifi.service
```

Restart only the web app:

```bash
sudo systemctl restart rf-viewer.service
```

Restart only the RF scanner:

```bash
sudo systemctl restart rf-viewer-scanner.service
```

Restart only BLE:

```bash
sudo systemctl restart rf-viewer-ble.service
```

Restart only Wi-Fi:

```bash
sudo systemctl restart rf-viewer-wifi.service
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
sudo systemctl status rf-viewer-ble.service --no-pager
sudo systemctl status rf-viewer-wifi.service --no-pager
```

---

## Configuration Files

### `settings.json`

Viewer-side thresholds and filtering defaults.

### `scanner.json`

Saved scanner configuration.

### `scanner.runtime.json`

Live scanner runtime state used by the scanner script and the web server.

### `data/ble-control.json`

Controls whether the BLE scanner is actively scanning.

### `data/wifi-control.json`

Controls whether the Wi-Fi scanner is actively scanning.

---

## Useful File Locations

Project files:

```text
~/Desktop/rf-viewer-v2/package.json
~/Desktop/rf-viewer-v2/parser.js
~/Desktop/rf-viewer-v2/server.js
~/Desktop/rf-viewer-v2/ble-matcher.js
~/Desktop/rf-viewer-v2/wifi-matcher.js
~/Desktop/rf-viewer-v2/public/index.html
~/Desktop/rf-viewer-v2/public/js/app.js
~/Desktop/rf-viewer-v2/scanner/rf-viewer-stream.sh
~/Desktop/rf-viewer-v2/scanner/rf-listen.sh
~/Desktop/rf-viewer-v2/scanner/ble-scanner.py
~/Desktop/rf-viewer-v2/scanner/wifi-scanner.py
~/Desktop/rf-viewer-v2/scripts/start-alfa-hotspot.sh
~/Desktop/rf-viewer-v2/settings.json
~/Desktop/rf-viewer-v2/scanner.json
~/Desktop/rf-viewer-v2/scanner.runtime.json
~/Desktop/rf-viewer-v2/data/ble-live.jsonl
~/Desktop/rf-viewer-v2/data/ble-status.json
~/Desktop/rf-viewer-v2/data/ble-summary.json
~/Desktop/rf-viewer-v2/data/ble-control.json
~/Desktop/rf-viewer-v2/data/wifi-live.jsonl
~/Desktop/rf-viewer-v2/data/wifi-status.json
~/Desktop/rf-viewer-v2/data/wifi-summary.json
~/Desktop/rf-viewer-v2/data/wifi-control.json
```

Installed system files:

```text
/usr/local/bin/start-alfa-hotspot.sh
/etc/systemd/system/alfa-hotspot.service
/etc/systemd/system/rf-viewer.service
/etc/systemd/system/rf-viewer-scanner.service
/etc/systemd/system/rf-viewer-ble.service
/etc/systemd/system/rf-viewer-wifi.service
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

If `/api/live` is empty, the RF scanner feed is not reaching the Node app.

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

Then inspect the RF scanner logs:

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

### BLE card is empty

Check Bluetooth state:

```bash
sudo systemctl status bluetooth --no-pager
bluetoothctl list
rfkill list
```

Check BLE service:

```bash
sudo systemctl status rf-viewer-ble.service --no-pager
journalctl -u rf-viewer-ble.service -n 80 --no-pager
cat ~/Desktop/rf-viewer-v2/data/ble-status.json
cat ~/Desktop/rf-viewer-v2/data/ble-summary.json | jq
```

If needed, manually test the scanner:

```bash
cd ~/Desktop/rf-viewer-v2
python3 scanner/ble-scanner.py
```

### Wi-Fi card is empty

Check Wi-Fi interface state:

```bash
nmcli device status
iw dev
```

Check Wi-Fi service:

```bash
sudo systemctl status rf-viewer-wifi.service --no-pager
journalctl -u rf-viewer-wifi.service -n 80 --no-pager
cat ~/Desktop/rf-viewer-v2/data/wifi-status.json
cat ~/Desktop/rf-viewer-v2/data/wifi-summary.json | jq
```

If needed, manually test the scanner:

```bash
cd ~/Desktop/rf-viewer-v2
python3 scanner/wifi-scanner.py
```

### BLE or Wi-Fi card rows disappear after refresh

Remembered BLE and Wi-Fi rows now live in browser local storage. If they disappear:

- make sure you are on the same browser/device
- make sure local storage is not blocked
- avoid private/incognito mode if you want memory to persist
- do not click the clear-memory button unless you want to wipe remembered rows

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

### RF / BLE / Wi-Fi service changed but behavior did not

Restart the related service:

```bash
sudo systemctl restart rf-viewer.service
sudo systemctl restart rf-viewer-scanner.service
sudo systemctl restart rf-viewer-ble.service
sudo systemctl restart rf-viewer-wifi.service
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
- RF scanner service is running
- BLE scanner service is running
- Wi-Fi scanner service is running
- another device can join the hotspot
- the web UI opens
- `/api/live` returns RF data
- `/api/ble/summary` returns BLE data
- `/api/wifi/summary` returns Wi-Fi data
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
- the RF scanner feeds the Node app locally through port `9001`
- the hotspot helper script lives in the repo under `scripts/` and gets copied into `/usr/local/bin/` for `systemd`
- listen mode uses the same SDR, so scanning and listening do not happen at the same time
- browser audio depends on `ffmpeg`
- browser playback usually requires a user click
- BLE and Wi-Fi remembered rows are stored in client-side local storage
- clear-memory buttons only clear the browser-side remembered memory
- BLE ↔ Wi-Fi related-candidate hints are heuristic annotations, not guaranteed same-device identity

---

## Sanity Checklist

If everything is working, this should all be true:

- hotspot is visible from another device
- another device can join the hotspot
- `ssh user@<hotspot-ip>` works
- `http://<hotspot-ip>:3000` loads the viewer
- `/api/live` shows RF rows
- `/api/scanner` shows the correct RF mode
- `/api/ble/summary` shows BLE devices
- `/api/wifi/summary` shows Wi-Fi networks
- BLE and Wi-Fi rows stay remembered in the browser
- lock buttons keep important BLE / Wi-Fi rows pinned
- listen mode starts from the UI
- `Play in browser` works for connected clients
- `rf-viewer.service` is active
- `rf-viewer-scanner.service` is active
- `rf-viewer-ble.service` is active
- `rf-viewer-wifi.service` is active
- `alfa-hotspot.service` is active
```