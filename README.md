RF Viewer .MD

# RF Viewer V2 Setup Guide

A quick reference for getting the Pi-based RF Viewer V2 running again in the future.

This guide is focused on:
- installing the basics
- creating the files we need
- starting the hotspot
- starting the Node viewer
- starting the scanner feed
- checking that everything is alive

---

## Table of Contents

1. [Install Node](#1-install-node)
2. [Create the project folders](#2-create-the-project-folders)
3. [Create the app files](#3-create-the-app-files)
4. [Test the app manually](#4-test-the-app-manually)
5. [Create the Alfa hotspot startup script](#5-create-the-alfa-hotspot-startup-script)
6. [Create the hotspot service](#6-create-the-hotspot-service)
7. [Create the Node viewer service](#7-create-the-node-viewer-service)
8. [Create the scanner service](#8-create-the-scanner-service)
9. [Check service status](#9-check-service-status)
10. [Check local app status on the Pi](#10-check-local-app-status-on-the-pi)
11. [Find the hotspot IP](#11-find-the-hotspot-ip)
12. [Connect from another device](#12-connect-from-another-device)
13. [Restart everything after edits](#13-restart-everything-after-edits)
14. [View logs if something breaks](#14-view-logs-if-something-breaks)
15. [Reboot test](#15-reboot-test)
16. [Useful file locations](#16-useful-file-locations)

---

## 1. Install Node

Install Node and npm on the Pi:

```bash
sudo apt-get update
sudo apt-get install -y nodejs npm
node -v
npm -v
```

---

## 2. Create the project folders

Create the project directory structure:

```bash
mkdir -p ~/Desktop/projects/rf-viewer-v2/public
mkdir -p ~/Desktop/projects/rf-viewer-v2/scanner
mkdir -p ~/Desktop/projects/rf-viewer-v2/scans
cd ~/Desktop/projects/rf-viewer-v2
```

---

## 3. Create the app files

Create the main files:

```bash
nano package.json
nano parser.js
nano server.js
nano public/index.html
nano scanner/rf-viewer-stream.sh
chmod +x scanner/rf-viewer-stream.sh
```

---

## 4. Test the app manually

Start the Node viewer:

```bash
cd ~/Desktop/projects/rf-viewer-v2
node server.js
```

In another terminal, start the scanner feed locally into the viewer listener:

```bash
cd ~/Desktop/projects/rf-viewer-v2
./scanner/rf-viewer-stream.sh 127.0.0.1 9001
```

---

## 5. Create the Alfa hotspot startup script

Create the hotspot startup script:

```bash
sudo nano /usr/local/bin/start-alfa-hotspot.sh
sudo chmod +x /usr/local/bin/start-alfa-hotspot.sh
```

This script is responsible for:

- checking if the Alfa dongle exists on `wlan1`
- bringing up the hotspot
- leaving Ethernet and built-in Wi-Fi alone

---

## 6. Create the hotspot service

Create the hotspot systemd service:

```bash
sudo nano /etc/systemd/system/alfa-hotspot.service
sudo systemctl daemon-reload
sudo systemctl enable alfa-hotspot.service
sudo systemctl start alfa-hotspot.service
```

---

## 7. Create the Node viewer service

Create the Node service:

```bash
sudo nano /etc/systemd/system/rf-viewer.service
sudo systemctl daemon-reload
sudo systemctl enable rf-viewer.service
sudo systemctl start rf-viewer.service
```

This service runs the web app on port **3000**.

---

## 8. Create the scanner service

Create the scanner service:

```bash
sudo nano /etc/systemd/system/rf-viewer-scanner.service
sudo systemctl daemon-reload
sudo systemctl enable rf-viewer-scanner.service
sudo systemctl start rf-viewer-scanner.service
```

This service runs the scanner script and feeds live lines into **127.0.0.1:9001**.

---

## 9. Check service status

Check all three services:

```bash
sudo systemctl status alfa-hotspot.service --no-pager
sudo systemctl status rf-viewer.service --no-pager
sudo systemctl status rf-viewer-scanner.service --no-pager
```

---

## 10. Check local app status on the Pi

Check that the viewer and listener are alive:

```bash
ss -ltnp | grep 3000
ss -ltnp | grep 9001
curl -s http://127.0.0.1:3000/api/live
```

Expected:

- **3000** should be listening for the webpage  
- **9001** should be listening for live scanner rows  
- `/api/live` should eventually show JSON with rows, not empty data

---

## 11. Find the hotspot IP

Check the Alfa hotspot interface IP:

```bash
ip addr show wlan1
```

Usually this ends up being something like:

```
10.42.0.1
```

---

## 12. Connect from another device

Once another laptop or phone joins the hotspot, use the hotspot IP to access the Pi.

Open the viewer in a browser:

```
http://10.42.0.1:3000
```

SSH into the Pi:

```bash
ssh misterm@10.42.0.1
```

Use the actual `wlan1` IP if it differs.

---

## 13. Restart everything after edits

If you edit scripts or service files:

```bash
sudo systemctl daemon-reload
sudo systemctl restart alfa-hotspot.service
sudo systemctl restart rf-viewer.service
sudo systemctl restart rf-viewer-scanner.service
```

---

## 14. View logs if something breaks

Check logs for each piece:

```bash
journalctl -u alfa-hotspot.service -n 50 --no-pager
journalctl -u rf-viewer.service -n 50 --no-pager
journalctl -u rf-viewer-scanner.service -n 50 --no-pager
```

Hotspot-specific logfile:

```bash
cat /var/log/alfa-hotspot.log
```

---

## 15. Reboot test

Do a full reboot test after everything is configured:

```bash
sudo reboot
```

After reboot, verify:

- hotspot comes up  
- viewer service is running  
- scanner service is running  
- another device can join the hotspot and open the webpage  

---

## 16. Useful file locations

Project files:

```
~/Desktop/projects/rf-viewer-v2/package.json
~/Desktop/projects/rf-viewer-v2/parser.js
~/Desktop/projects/rf-viewer-v2/server.js
~/Desktop/projects/rf-viewer-v2/public/index.html
~/Desktop/projects/rf-viewer-v2/scanner/rf-viewer-stream.sh
```

Hotspot script:

```
/usr/local/bin/start-alfa-hotspot.sh
```

Systemd services:

```
/etc/systemd/system/alfa-hotspot.service
/etc/systemd/system/rf-viewer.service
/etc/systemd/system/rf-viewer-scanner.service
```

---

## Notes

- `wlan0` is the Pi’s built-in Wi-Fi  
- `wlan1` is the Alfa dongle  
- hotspot should only use **wlan1**  
- Ethernet can stay connected without affecting the hotspot  
- the viewer runs on the Pi, so client devices only need the URL  
- the scanner feeds the Node app locally through port **9001**

---

## Sanity checklist

If everything is working, this should all be true:

- hotspot is visible from another device  
- another device can join the hotspot  
- `ssh user@<hotspot-ip>` works  
- `http://<hotspot-ip>:3000` loads the viewer  
- `/api/live` shows rows  
- `rf-viewer.service` is active  
- `rf-viewer-scanner.service` is active  
- `alfa-hotspot.service` is active  
