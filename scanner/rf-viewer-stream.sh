#!/usr/bin/env bash
set -euo pipefail

CLIENT_IP="${1:-127.0.0.1}"
CLIENT_PORT="${2:-9001}"

APP_DIR="/home/misterm/Desktop/rf-viewer-v2"
SCANNER_CONFIG="${APP_DIR}/scanner.runtime.json"
TMPFILE="/tmp/rtl_chunk.csv"
LISTEN_SCRIPT="${APP_DIR}/scanner/rf-listen.sh"

DEFAULT_FREQ_RANGE="902M:928M:50k"
DEFAULT_INTERVAL="2s"
DEFAULT_WINDOW="10s"

CHILD_PID=""

jq_read() {
  local expr="$1"
  if command -v jq >/dev/null 2>&1 && [ -f "$SCANNER_CONFIG" ]; then
    jq -r "$expr" "$SCANNER_CONFIG" 2>/dev/null || true
  else
    echo ""
  fi
}

get_mode() {
  local value
  value="$(jq_read '.mode // "survey"')"
  [ -n "$value" ] && echo "$value" || echo "survey"
}

get_freq_range() {
  local value
  value="$(jq_read '.freqRange // empty')"
  [ -n "$value" ] && echo "$value" || echo "$DEFAULT_FREQ_RANGE"
}

get_interval() {
  local value
  value="$(jq_read '.interval // empty')"
  [ -n "$value" ] && echo "$value" || echo "$DEFAULT_INTERVAL"
}

get_window() {
  local value
  value="$(jq_read '.window // empty')"
  [ -n "$value" ] && echo "$value" || echo "$DEFAULT_WINDOW"
}

get_listen_frequency() {
  jq_read '.listen.frequency // .targetFrequency // empty'
}

get_listen_modulation() {
  local value
  value="$(jq_read '.listen.modulation // "fm"')"
  [ -n "$value" ] && echo "$value" || echo "fm"
}

get_listen_gain() {
  local value
  value="$(jq_read '.listen.gain // 30')"
  [ -n "$value" ] && echo "$value" || echo "30"
}

get_listen_squelch() {
  local value
  value="$(jq_read '.listen.squelch // 0')"
  [ -n "$value" ] && echo "$value" || echo "0"
}

cleanup_child() {
  if [ -n "${CHILD_PID:-}" ] && kill -0 "$CHILD_PID" 2>/dev/null; then
    kill -TERM -- "-$CHILD_PID" 2>/dev/null || kill "$CHILD_PID" 2>/dev/null || true
    sleep 0.25
    kill -KILL -- "-$CHILD_PID" 2>/dev/null || true
    wait "$CHILD_PID" 2>/dev/null || true
  fi
  CHILD_PID=""
}

cleanup() {
  cleanup_child
  rm -f "$TMPFILE"
}

trap cleanup EXIT INT TERM

run_scan_mode() {
  local mode_at_start="$1"
  local freq_range interval window current_mode

  freq_range="$(get_freq_range)"
  interval="$(get_interval)"
  window="$(get_window)"

  echo "[scanner] mode=${mode_at_start} freqRange=${freq_range} interval=${interval} window=${window}"

  rm -f "$TMPFILE"

  setsid rtl_power -f "$freq_range" -i "$interval" -e "$window" "$TMPFILE" &
  CHILD_PID=$!

  while kill -0 "$CHILD_PID" 2>/dev/null; do
    sleep 0.5
    current_mode="$(get_mode)"

    if [ "$current_mode" != "$mode_at_start" ]; then
      echo "[scanner] mode changed from ${mode_at_start} to ${current_mode}, stopping rtl_power"
      cleanup_child
      rm -f "$TMPFILE"
      return 0
    fi
  done

  wait "$CHILD_PID" 2>/dev/null || true
  CHILD_PID=""

  if [ -s "$TMPFILE" ]; then
    nc -q 1 "$CLIENT_IP" "$CLIENT_PORT" < "$TMPFILE" 2>/dev/null || true
  fi

  rm -f "$TMPFILE"
  sleep 1
}

run_listen_mode() {
  local freq mod gain squelch
  local current_mode current_freq current_mod current_gain current_squelch

  freq="$(get_listen_frequency)"
  mod="$(get_listen_modulation)"
  gain="$(get_listen_gain)"
  squelch="$(get_listen_squelch)"

  if [ -z "$freq" ] || [ "$freq" = "null" ]; then
    echo "[listen] mode is listen but no frequency is set"
    sleep 1
    return 0
  fi

  if [ ! -x "$LISTEN_SCRIPT" ]; then
    echo "[listen] missing or non-executable: $LISTEN_SCRIPT"
    sleep 1
    return 1
  fi

  echo "[listen] starting freq=${freq} mod=${mod} gain=${gain} squelch=${squelch}"

  setsid "$LISTEN_SCRIPT" "$freq" "$mod" "$gain" "$squelch" &
  CHILD_PID=$!

  while kill -0 "$CHILD_PID" 2>/dev/null; do
    sleep 0.5

    current_mode="$(get_mode)"
    current_freq="$(get_listen_frequency)"
    current_mod="$(get_listen_modulation)"
    current_gain="$(get_listen_gain)"
    current_squelch="$(get_listen_squelch)"

    if [ "$current_mode" != "listen" ] || \
       [ "$current_freq" != "$freq" ] || \
       [ "$current_mod" != "$mod" ] || \
       [ "$current_gain" != "$gain" ] || \
       [ "$current_squelch" != "$squelch" ]; then
      echo "[listen] runtime changed, stopping listen process"
      cleanup_child
      break
    fi
  done

  CHILD_PID=""
  sleep 0.2
}

echo "Streaming rtl_power batches to ${CLIENT_IP}:${CLIENT_PORT}"

while true; do
  MODE="$(get_mode)"

  case "$MODE" in
    paused)
      cleanup_child
      echo "[scanner] paused"
      sleep 1
      ;;
    listen)
      run_listen_mode
      ;;
    survey|track)
      run_scan_mode "$MODE"
      ;;
    *)
      echo "[scanner] unknown mode: ${MODE}, defaulting to survey behavior"
      run_scan_mode "$MODE"
      ;;
  esac
done