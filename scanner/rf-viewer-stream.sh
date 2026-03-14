#!/usr/bin/env bash

CLIENT_IP="${1:-127.0.0.1}"
CLIENT_PORT="${2:-9001}"

APP_DIR="/home/misterm/Desktop/rf-viewer-v2"
SCANNER_CONFIG="${APP_DIR}/scanner.runtime.json"
TMPFILE="/tmp/rtl_chunk.csv"

DEFAULT_FREQ_RANGE="902M:928M:50k"
DEFAULT_INTERVAL="2s"
DEFAULT_WINDOW="10s"

get_json_value() {
  local key="$1"
  if command -v jq >/dev/null 2>&1 && [ -f "$SCANNER_CONFIG" ]; then
    jq -r --arg k "$key" '.[$k] // empty' "$SCANNER_CONFIG" 2>/dev/null || true
  else
    echo ""
  fi
}

echo "Streaming rtl_power batches to ${CLIENT_IP}:${CLIENT_PORT}"

while true; do
  MODE="$(get_json_value mode)"
  FREQ_RANGE="$(get_json_value freqRange)"
  INTERVAL="$(get_json_value interval)"
  WINDOW="$(get_json_value window)"

  [ -n "$FREQ_RANGE" ] || FREQ_RANGE="$DEFAULT_FREQ_RANGE"
  [ -n "$INTERVAL" ] || INTERVAL="$DEFAULT_INTERVAL"
  [ -n "$WINDOW" ] || WINDOW="$DEFAULT_WINDOW"

  if [[ "$MODE" == "paused" ]]; then
    echo "Scanner paused"
    sleep 1
    continue
  fi

  rm -f "$TMPFILE"

  rtl_power -f "$FREQ_RANGE" -i "$INTERVAL" -e "$WINDOW" "$TMPFILE"

  if [[ -s "$TMPFILE" ]]; then
    nc -q 1 "$CLIENT_IP" "$CLIENT_PORT" < "$TMPFILE" 2>/dev/null || true
  fi

  rm -f "$TMPFILE"
  sleep 1
done