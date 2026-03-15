#!/usr/bin/env python3
import asyncio
import json
import signal
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bleak import BleakScanner


APP_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = APP_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

EVENTS_FILE = DATA_DIR / "ble-live.jsonl"
SUMMARY_FILE = DATA_DIR / "ble-summary.json"
STATUS_FILE = DATA_DIR / "ble-status.json"
CONTROL_FILE = DATA_DIR / "ble-control.json"

SUMMARY_WRITE_INTERVAL = 2.0
CONTROL_CHECK_INTERVAL = 1.0
STALE_SECONDS = 90
SUMMARY_LIMIT = 250


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def bytes_to_hex(value: bytes | bytearray | None) -> str:
    if not value:
        return ""
    return bytes(value).hex()


def json_dumps(data: Any) -> str:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False)


def read_control() -> dict[str, Any]:
    if not CONTROL_FILE.exists():
        default = {
            "enabled": True,
            "updated_at": now_iso()
        }
        CONTROL_FILE.write_text(json.dumps(default, indent=2), encoding="utf-8")
        return default

    try:
        return json.loads(CONTROL_FILE.read_text(encoding="utf-8"))
    except Exception:
        fallback = {
            "enabled": True,
            "updated_at": now_iso()
        }
        CONTROL_FILE.write_text(json.dumps(fallback, indent=2), encoding="utf-8")
        return fallback


@dataclass
class SeenDevice:
    address: str
    first_seen: str
    last_seen: str
    seen_count: int = 0
    name: str = ""
    last_rssi: int | None = None
    max_rssi: int | None = None
    min_rssi: int | None = None
    tx_power: int | None = None
    manufacturer_data: dict[str, str] = field(default_factory=dict)
    manufacturer_ids: list[int] = field(default_factory=list)
    service_uuids: list[str] = field(default_factory=list)
    service_data: dict[str, str] = field(default_factory=dict)
    last_event_ts: str = ""

    def update(self, event: dict[str, Any]) -> None:
        self.last_seen = event["ts"]
        self.last_event_ts = event["ts"]
        self.seen_count += 1

        name = event.get("name") or ""
        if name:
            self.name = name

        rssi = event.get("rssi")
        if isinstance(rssi, int):
            self.last_rssi = rssi
            self.max_rssi = rssi if self.max_rssi is None else max(self.max_rssi, rssi)
            self.min_rssi = rssi if self.min_rssi is None else min(self.min_rssi, rssi)

        tx_power = event.get("tx_power")
        if isinstance(tx_power, int):
            self.tx_power = tx_power

        manufacturer_data = event.get("manufacturer_data") or {}
        if manufacturer_data:
            self.manufacturer_data = manufacturer_data
            self.manufacturer_ids = sorted(int(k) for k in manufacturer_data.keys())

        service_uuids = event.get("service_uuids") or []
        if service_uuids:
            self.service_uuids = sorted(service_uuids)

        service_data = event.get("service_data") or {}
        if service_data:
            self.service_data = service_data

    def to_dict(self) -> dict[str, Any]:
        return {
            "address": self.address,
            "name": self.name,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "last_event_ts": self.last_event_ts,
            "seen_count": self.seen_count,
            "last_rssi": self.last_rssi,
            "max_rssi": self.max_rssi,
            "min_rssi": self.min_rssi,
            "tx_power": self.tx_power,
            "manufacturer_ids": self.manufacturer_ids,
            "manufacturer_data": self.manufacturer_data,
            "service_uuids": self.service_uuids,
            "service_data": self.service_data,
        }


class BLECollector:
    def __init__(self) -> None:
        self.started_at = now_iso()
        self.devices: dict[str, SeenDevice] = {}
        self.total_events = 0
        self.dropped_events = 0
        self.scanner: BleakScanner | None = None
        self.scanning = False
        self.enabled = bool(read_control().get("enabled", True))
        self._stop_event = asyncio.Event()
        self._events_fp = EVENTS_FILE.open("a", encoding="utf-8", buffering=1)

    def close(self) -> None:
        try:
            self._events_fp.close()
        except Exception:
            pass

    def request_stop(self) -> None:
        self._stop_event.set()

    async def start_scanner(self) -> None:
        if self.scanning:
            return
        self.scanner = BleakScanner(detection_callback=self.detection_callback)
        await self.scanner.start()
        self.scanning = True
        print("[ble-scanner] scanner started")

    async def stop_scanner(self) -> None:
        if not self.scanning or not self.scanner:
            return
        try:
            await self.scanner.stop()
        except Exception:
            pass
        self.scanner = None
        self.scanning = False
        print("[ble-scanner] scanner stopped")

    def detection_callback(self, device, advertisement_data) -> None:
        try:
            ts = now_iso()
            address = getattr(device, "address", None) or "unknown"
            name = getattr(device, "name", None) or advertisement_data.local_name or ""

            manufacturer_data = {
                str(company_id): bytes_to_hex(payload)
                for company_id, payload in (advertisement_data.manufacturer_data or {}).items()
            }

            service_data = {
                str(uuid): bytes_to_hex(payload)
                for uuid, payload in (advertisement_data.service_data or {}).items()
            }

            service_uuids = sorted(advertisement_data.service_uuids or [])
            rssi = advertisement_data.rssi
            tx_power = advertisement_data.tx_power

            event = {
                "ts": ts,
                "address": address,
                "name": name,
                "rssi": rssi,
                "tx_power": tx_power,
                "service_uuids": service_uuids,
                "service_data": service_data,
                "manufacturer_data": manufacturer_data,
            }

            self._events_fp.write(json_dumps(event) + "\n")
            self.total_events += 1

            if address not in self.devices:
                self.devices[address] = SeenDevice(
                    address=address,
                    first_seen=ts,
                    last_seen=ts,
                )

            self.devices[address].update(event)

        except Exception:
            self.dropped_events += 1

    def build_summary(self) -> dict[str, Any]:
        now_dt = datetime.now(timezone.utc)
        active_devices: list[dict[str, Any]] = []

        for seen in self.devices.values():
            try:
                last_seen_dt = datetime.fromisoformat(seen.last_seen)
                age_seconds = max(0.0, (now_dt - last_seen_dt).total_seconds())
            except Exception:
                age_seconds = None

            record = seen.to_dict()
            record["age_seconds"] = age_seconds
            if age_seconds is None or age_seconds <= STALE_SECONDS:
                active_devices.append(record)

        active_devices.sort(
            key=lambda row: (
                row["last_seen"],
                row["last_rssi"] if row["last_rssi"] is not None else -9999,
            ),
            reverse=True,
        )

        top_devices = active_devices[:SUMMARY_LIMIT]

        strongest = None
        rssi_candidates = [row for row in top_devices if isinstance(row.get("last_rssi"), int)]
        if rssi_candidates:
            strongest = max(rssi_candidates, key=lambda row: row["last_rssi"])

        return {
            "started_at": self.started_at,
            "updated_at": now_iso(),
            "status": "running" if self.scanning else "paused",
            "enabled": self.enabled,
            "total_unique_seen": len(self.devices),
            "active_unique_seen": len(active_devices),
            "total_events": self.total_events,
            "dropped_events": self.dropped_events,
            "strongest_active": strongest,
            "devices": top_devices,
        }

    async def write_summary_loop(self) -> None:
        while not self._stop_event.is_set():
            summary = self.build_summary()
            SUMMARY_FILE.write_text(json.dumps(summary, indent=2), encoding="utf-8")

            STATUS_FILE.write_text(
                json.dumps(
                    {
                        "status": "running" if self.scanning else "paused",
                        "enabled": self.enabled,
                        "started_at": self.started_at,
                        "updated_at": now_iso(),
                        "total_unique_seen": summary["total_unique_seen"],
                        "active_unique_seen": summary["active_unique_seen"],
                        "total_events": summary["total_events"],
                        "events_file": str(EVENTS_FILE),
                        "summary_file": str(SUMMARY_FILE),
                        "control_file": str(CONTROL_FILE),
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=SUMMARY_WRITE_INTERVAL)
            except asyncio.TimeoutError:
                pass

        final_summary = self.build_summary()
        final_summary["status"] = "stopped"
        SUMMARY_FILE.write_text(json.dumps(final_summary, indent=2), encoding="utf-8")

        STATUS_FILE.write_text(
            json.dumps(
                {
                    "status": "stopped",
                    "enabled": self.enabled,
                    "started_at": self.started_at,
                    "updated_at": now_iso(),
                    "total_unique_seen": final_summary["total_unique_seen"],
                    "active_unique_seen": final_summary["active_unique_seen"],
                    "total_events": final_summary["total_events"],
                    "events_file": str(EVENTS_FILE),
                    "summary_file": str(SUMMARY_FILE),
                    "control_file": str(CONTROL_FILE),
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    async def control_loop(self) -> None:
        while not self._stop_event.is_set():
            control = read_control()
            desired_enabled = bool(control.get("enabled", True))

            if desired_enabled != self.enabled:
                self.enabled = desired_enabled
                if self.enabled:
                    await self.start_scanner()
                else:
                    await self.stop_scanner()

            if self.enabled and not self.scanning:
                await self.start_scanner()

            if not self.enabled and self.scanning:
                await self.stop_scanner()

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=CONTROL_CHECK_INTERVAL)
            except asyncio.TimeoutError:
                pass

    async def run(self) -> None:
        summary_task = asyncio.create_task(self.write_summary_loop())
        control_task = asyncio.create_task(self.control_loop())

        print(f"[ble-scanner] started at {self.started_at}")
        print(f"[ble-scanner] writing events to {EVENTS_FILE}")
        print(f"[ble-scanner] writing summary to {SUMMARY_FILE}")
        print(f"[ble-scanner] using control file {CONTROL_FILE}")

        try:
            await self._stop_event.wait()
        finally:
            control_task.cancel()
            try:
                await control_task
            except Exception:
                pass

            try:
                await self.stop_scanner()
            except Exception:
                pass

            await summary_task
            self.close()
            print("[ble-scanner] stopped cleanly")


async def main() -> None:
    collector = BLECollector()
    loop = asyncio.get_running_loop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, collector.request_stop)
        except NotImplementedError:
            signal.signal(sig, lambda *_: collector.request_stop())

    await collector.run()


if __name__ == "__main__":
    asyncio.run(main())