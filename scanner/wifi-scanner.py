#!/usr/bin/env python3
import json
import signal
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = APP_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

LIVE_FILE = DATA_DIR / "wifi-live.jsonl"
SUMMARY_FILE = DATA_DIR / "wifi-summary.json"
STATUS_FILE = DATA_DIR / "wifi-status.json"
CONTROL_FILE = DATA_DIR / "wifi-control.json"

SUMMARY_LIMIT = 100
ACTIVE_TTL_SECONDS = 60


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_json(path, fallback):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return fallback


def save_json(path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def ensure_control():
    if not CONTROL_FILE.exists():
        save_json(CONTROL_FILE, {
            "enabled": True,
            "interface": "wlan0",
            "interval_seconds": 7,
            "updated_at": now_iso()
        })


def read_control():
    ensure_control()
    data = load_json(CONTROL_FILE, {})
    return {
        "enabled": bool(data.get("enabled", True)),
        "interface": str(data.get("interface", "wlan0")),
        "interval_seconds": max(3, int(data.get("interval_seconds", 7))),
        "updated_at": data.get("updated_at", now_iso())
    }


def parse_nmcli_multiline(text):
    rows = []
    block = {}

    def flush():
        nonlocal block
        if not block:
            return
        ssid = str(block.get("SSID", "")).strip()
        bssid = str(block.get("BSSID", "")).strip().upper()
        chan = str(block.get("CHAN", "")).strip()
        security = str(block.get("SECURITY", "")).strip()

        signal_raw = str(block.get("SIGNAL", "")).strip()
        try:
            signal_val = int(signal_raw)
        except Exception:
            signal_val = None

        if not ssid and not bssid:
            block = {}
            return

        rows.append({
            "ssid": ssid,
            "bssid": bssid,
            "channel": chan,
            "signal": signal_val,
            "security": security
        })
        block = {}

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line:
            flush()
            continue

        if ":" not in line:
            continue

        key, value = line.split(":", 1)
        block[key.strip()] = value.strip()

    flush()
    return rows


def scan_wifi(interface):
    result = subprocess.run(
        [
            "nmcli",
            "-f", "SSID,BSSID,CHAN,SIGNAL,SECURITY",
            "-m", "multiline",
            "device", "wifi", "list",
            "ifname", interface,
            "--rescan", "yes"
        ],
        capture_output=True,
        text=True,
        timeout=25,
        check=False
    )

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or f"nmcli exited with code {result.returncode}")

    return parse_nmcli_multiline(result.stdout or "")


class WifiCollector:
    def __init__(self):
        self.started_at = now_iso()
        self.stop_requested = False
        self.networks = {}
        self.total_events = 0
        self.last_error = None
        self.live_fp = LIVE_FILE.open("a", encoding="utf-8", buffering=1)

    def request_stop(self, *_args):
        self.stop_requested = True

    def close(self):
        try:
            self.live_fp.close()
        except Exception:
            pass

    def update_network(self, row):
        ts = now_iso()
        key = row["bssid"] or f"ssid::{row['ssid']}"
        existing = self.networks.get(key)

        event = {
            "ts": ts,
            "ssid": row["ssid"],
            "bssid": row["bssid"],
            "channel": row["channel"],
            "signal": row["signal"],
            "security": row["security"]
        }
        self.live_fp.write(json.dumps(event, separators=(",", ":")) + "\n")
        self.total_events += 1

        if existing is None:
            existing = {
                "ssid": row["ssid"],
                "bssid": row["bssid"],
                "channel": row["channel"],
                "security": row["security"],
                "first_seen": ts,
                "last_seen": ts,
                "seen_count": 1,
                "last_signal": row["signal"],
                "max_signal": row["signal"],
                "min_signal": row["signal"]
            }
            self.networks[key] = existing
            return

        existing["ssid"] = row["ssid"]
        existing["bssid"] = row["bssid"]
        existing["channel"] = row["channel"]
        existing["security"] = row["security"]
        existing["last_seen"] = ts
        existing["seen_count"] += 1
        existing["last_signal"] = row["signal"]

        sig = row["signal"]
        if isinstance(sig, int):
            if existing["max_signal"] is None or sig > existing["max_signal"]:
                existing["max_signal"] = sig
            if existing["min_signal"] is None or sig < existing["min_signal"]:
                existing["min_signal"] = sig

    def build_summary(self, control_enabled=True, state="running"):
        now = datetime.now(timezone.utc)
        active = []

        for row in self.networks.values():
            try:
                last_dt = datetime.fromisoformat(row["last_seen"])
                age = max(0.0, (now - last_dt).total_seconds())
            except Exception:
                age = None

            item = dict(row)
            item["age_seconds"] = age
            if age is None or age <= ACTIVE_TTL_SECONDS:
                active.append(item)

        active.sort(
            key=lambda r: (
                r["last_seen"],
                r["last_signal"] if isinstance(r["last_signal"], int) else -9999
            ),
            reverse=True
        )

        strongest = None
        signal_rows = [r for r in active if isinstance(r.get("last_signal"), int)]
        if signal_rows:
            strongest = max(signal_rows, key=lambda r: r["last_signal"])

        return {
            "started_at": self.started_at,
            "updated_at": now_iso(),
            "status": state,
            "enabled": control_enabled,
            "total_unique_seen": len(self.networks),
            "active_unique_seen": len(active),
            "total_events": self.total_events,
            "strongest_active": strongest,
            "networks": active[:SUMMARY_LIMIT]
        }

    def write_status(self, control, state):
        summary = self.build_summary(control_enabled=control["enabled"], state=state)
        save_json(SUMMARY_FILE, summary)
        save_json(STATUS_FILE, {
            "status": state,
            "enabled": control["enabled"],
            "interface": control["interface"],
            "interval_seconds": control["interval_seconds"],
            "started_at": self.started_at,
            "updated_at": now_iso(),
            "total_unique_seen": summary["total_unique_seen"],
            "active_unique_seen": summary["active_unique_seen"],
            "total_events": summary["total_events"],
            "summary_file": str(SUMMARY_FILE),
            "control_file": str(CONTROL_FILE),
            "last_error": self.last_error
        })

    def run(self):
        print(f"[wifi-scanner] started at {self.started_at}")
        print(f"[wifi-scanner] writing live events to {LIVE_FILE}")
        print(f"[wifi-scanner] writing summary to {SUMMARY_FILE}")

        while not self.stop_requested:
            control = read_control()

            if not control["enabled"]:
                self.write_status(control, "paused")
                time.sleep(1.0)
                continue

            try:
                rows = scan_wifi(control["interface"])
                self.last_error = None
                for row in rows:
                    self.update_network(row)
                self.write_status(control, "running")
            except Exception as err:
                self.last_error = str(err)
                self.write_status(control, "error")

            slept = 0.0
            while slept < control["interval_seconds"] and not self.stop_requested:
                time.sleep(0.5)
                slept += 0.5

        final_control = read_control()
        self.write_status(final_control, "stopped")
        self.close()
        print("[wifi-scanner] stopped cleanly")


def main():
    ensure_control()
    collector = WifiCollector()
    signal.signal(signal.SIGINT, collector.request_stop)
    signal.signal(signal.SIGTERM, collector.request_stop)
    collector.run()


if __name__ == "__main__":
    main()