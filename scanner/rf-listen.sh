#!/usr/bin/env bash
set -euo pipefail

FREQ="${1:-99.5M}"
MOD="${2:-fm}"
GAIN="${3:-30}"
SQUELCH="${4:-0}"

OUTPUT_MODE="${OUTPUT_MODE:-local}"   # local | stdout
APLAY_DEVICE="${APLAY_DEVICE:-default}"

STATUS_FILE="/tmp/rf-listen-status.json"
LOG_FILE="/tmp/rf-listen.log"

mkdir -p /tmp
: > "$LOG_FILE"

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

write_status() {
  local state="$1"
  local message="$2"
  local freq="${3:-$FREQ}"
  local mod="${4:-$MOD}"
  local gain="${5:-$GAIN}"
  local squelch="${6:-$SQUELCH}"
  local output_mode="${7:-$OUTPUT_MODE}"
  local sample_rate="${8:-0}"

  local msg_json
  msg_json="$(printf '%s' "$message" | json_escape)"

  cat > "$STATUS_FILE" <<EOF
{
  "state": "$state",
  "message": $msg_json,
  "frequency": "$freq",
  "modulation": "$mod",
  "gain": $gain,
  "squelch": $squelch,
  "outputMode": "$output_mode",
  "audioDevice": "$(printf '%s' "$APLAY_DEVICE")",
  "sampleRate": $sample_rate,
  "updatedAt": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF
}

fail_with_status() {
  local message="$1"
  echo "[rf-listen] ERROR: $message" | tee -a "$LOG_FILE" >&2
  write_status "error" "$message"
  exit 1
}

cleanup() {
  pkill -TERM -P $$ 2>/dev/null || true
  sleep 0.1
  pkill -KILL -P $$ 2>/dev/null || true
}

trap cleanup EXIT INT TERM

write_status "starting" "Starting listen pipeline"

command -v rtl_fm >/dev/null 2>&1 || fail_with_status "rtl_fm not found"

if [[ "$OUTPUT_MODE" == "local" ]]; then
  command -v aplay >/dev/null 2>&1 || fail_with_status "aplay not found"
fi

if [[ "$OUTPUT_MODE" != "local" && "$OUTPUT_MODE" != "stdout" ]]; then
  fail_with_status "Unsupported OUTPUT_MODE: $OUTPUT_MODE (use local or stdout)"
fi

echo "[rf-listen] freq=$FREQ mod=$MOD gain=$GAIN squelch=$SQUELCH output=$OUTPUT_MODE device=$APLAY_DEVICE" | tee -a "$LOG_FILE"

run_fm_local() {
  write_status "running" "Listen pipeline running (local audio)" "$FREQ" "$MOD" "$GAIN" "$SQUELCH" "$OUTPUT_MODE" 24000
  rtl_fm \
    -f "$FREQ" \
    -M fm \
    -g "$GAIN" \
    -l "$SQUELCH" \
    -s 24000 \
    -r 24000 \
    - \
    2> >(tee -a "$LOG_FILE" >&2) \
  | aplay -D "$APLAY_DEVICE" -r 24000 -f S16_LE -t raw -c 1 \
    2> >(tee -a "$LOG_FILE" >&2)
}

run_wbfm_local() {
  write_status "running" "Listen pipeline running (local audio)" "$FREQ" "$MOD" "$GAIN" "$SQUELCH" "$OUTPUT_MODE" 32000
  rtl_fm \
    -f "$FREQ" \
    -M wbfm \
    -g "$GAIN" \
    -E deemp \
    - \
    2> >(tee -a "$LOG_FILE" >&2) \
  | aplay -D "$APLAY_DEVICE" -r 32000 -f S16_LE -t raw -c 1 \
    2> >(tee -a "$LOG_FILE" >&2)
}

run_am_local() {
  write_status "running" "Listen pipeline running (local audio)" "$FREQ" "$MOD" "$GAIN" "$SQUELCH" "$OUTPUT_MODE" 24000
  rtl_fm \
    -f "$FREQ" \
    -M am \
    -g "$GAIN" \
    -l "$SQUELCH" \
    -s 24000 \
    -r 24000 \
    - \
    2> >(tee -a "$LOG_FILE" >&2) \
  | aplay -D "$APLAY_DEVICE" -r 24000 -f S16_LE -t raw -c 1 \
    2> >(tee -a "$LOG_FILE" >&2)
}

run_fm_stdout() {
  write_status "running" "Listen pipeline running (stdout audio)" "$FREQ" "$MOD" "$GAIN" "$SQUELCH" "$OUTPUT_MODE" 24000
  exec rtl_fm \
    -f "$FREQ" \
    -M fm \
    -g "$GAIN" \
    -l "$SQUELCH" \
    -s 24000 \
    -r 24000 \
    - \
    2> >(tee -a "$LOG_FILE" >&2)
}

run_wbfm_stdout() {
  write_status "running" "Listen pipeline running (stdout audio)" "$FREQ" "$MOD" "$GAIN" "$SQUELCH" "$OUTPUT_MODE" 32000
  exec rtl_fm \
    -f "$FREQ" \
    -M wbfm \
    -g "$GAIN" \
    -E deemp \
    - \
    2> >(tee -a "$LOG_FILE" >&2)
}

run_am_stdout() {
  write_status "running" "Listen pipeline running (stdout audio)" "$FREQ" "$MOD" "$GAIN" "$SQUELCH" "$OUTPUT_MODE" 24000
  exec rtl_fm \
    -f "$FREQ" \
    -M am \
    -g "$GAIN" \
    -l "$SQUELCH" \
    -s 24000 \
    -r 24000 \
    - \
    2> >(tee -a "$LOG_FILE" >&2)
}

set +e

case "$MOD" in
  fm)
    if [[ "$OUTPUT_MODE" == "local" ]]; then
      run_fm_local
    else
      run_fm_stdout
    fi
    EXIT_CODE=$?
    ;;
  wbfm)
    if [[ "$OUTPUT_MODE" == "local" ]]; then
      run_wbfm_local
    else
      run_wbfm_stdout
    fi
    EXIT_CODE=$?
    ;;
  am)
    if [[ "$OUTPUT_MODE" == "local" ]]; then
      run_am_local
    else
      run_am_stdout
    fi
    EXIT_CODE=$?
    ;;
  *)
    fail_with_status "Unsupported modulation: $MOD"
    ;;
esac

set -e

if [[ "$EXIT_CODE" -eq 0 ]]; then
  write_status "stopped" "Listen pipeline exited cleanly"
else
  LAST_ERROR="$(tail -n 20 "$LOG_FILE" | sed '/^\s*$/d' | tail -n 1)"
  if [[ -z "$LAST_ERROR" ]]; then
    LAST_ERROR="Listen pipeline exited with code $EXIT_CODE"
  fi
  write_status "error" "$LAST_ERROR"
fi

exit "$EXIT_CODE"