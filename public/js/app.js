const fileSelect = document.getElementById("fileSelect");
const liveMode = document.getElementById("liveMode");
const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const trackBtn = document.getElementById("trackBtn");
const surveyBtn = document.getElementById("surveyBtn");
const pauseBtn = document.getElementById("pauseBtn");
const recordStatus = document.getElementById("recordStatus");
const summary = document.getElementById("summary");
const eventsBody = document.getElementById("eventsBody");
const statusEl = document.getElementById("status");
const clickedFreq = document.getElementById("clickedFreq");
const scannerStatus = document.getElementById("scannerStatus");
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

const relativeSquelch = document.getElementById("relativeSquelch");
const absoluteFloor = document.getElementById("absoluteFloor");
const minRepeats = document.getElementById("minRepeats");
const clusterWidthHz = document.getElementById("clusterWidthHz");
const applySettingsBtn = document.getElementById("applySettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const settingsStatus = document.getElementById("settingsStatus");
const viewerOrigin = document.getElementById("viewerOrigin");

const surveyStartMHz = document.getElementById("surveyStartMHz");
const surveyStopMHz = document.getElementById("surveyStopMHz");
const surveyBinKhz = document.getElementById("surveyBinKhz");
const surveyInterval = document.getElementById("surveyInterval");
const surveyWindow = document.getElementById("surveyWindow");

const trackSpanKhz = document.getElementById("trackSpanKhz");
const trackBinKhz = document.getElementById("trackBinKhz");
const trackInterval = document.getElementById("trackInterval");
const trackWindow = document.getElementById("trackWindow");
const runScannerBtn = document.getElementById("runScannerBtn");
const saveScannerBtn = document.getElementById("saveScannerBtn");

const proximityEnabled = document.getElementById("proximityEnabled");
const audioEnabled = document.getElementById("audioEnabled");
const smoothingCount = document.getElementById("smoothingCount");
const historyCount = document.getElementById("historyCount");
const proximityTarget = document.getElementById("proximityTarget");
const proximityTrend = document.getElementById("proximityTrend");
const proximityStrength = document.getElementById("proximityStrength");
const proximityMeterFill = document.getElementById("proximityMeterFill");
const proximityCurrentDb = document.getElementById("proximityCurrentDb");
const proximityPeakDb = document.getElementById("proximityPeakDb");
const proximityModeState = document.getElementById("proximityModeState");

const modeBadge = document.getElementById("modeBadge");
const lockedFreqBadge = document.getElementById("lockedFreqBadge");
const uiMessage = document.getElementById("uiMessage");

const busyOverlay = document.getElementById("busyOverlay");
const busyTitle = document.getElementById("busyTitle");
const busySubtitle = document.getElementById("busySubtitle");

let refreshTimer = null;
let currentTrace = [];
let currentSettings = null;
let currentScanner = null;
let selectedHz = null;
let waitingForFreshScan = false;

let trackedStrengthHistory = [];
let smoothedStrengthHistory = [];
let sessionPeakDb = null;
let audioCtx = null;
let nextBeepAt = 0;

let hadTrackedHit = false;
let staleCounter = 0;
let lastAlertPeakDb = null;
let lastLockTargetHz = null;
let lastHitTimestampMs = 0;

function fmtHz(hz) {
  return (hz / 1e6).toFixed(3) + " MHz";
}

function summaryItem(label, value) {
  return `<div><div class="muted">${label}</div><div>${value}</div></div>`;
}

function showBusy(title, subtitle = "Applying changes") {
  busyTitle.textContent = title;
  busySubtitle.textContent = subtitle;
  busyOverlay.classList.add("active");
  busyOverlay.setAttribute("aria-hidden", "false");
}

function hideBusy() {
  busyOverlay.classList.remove("active");
  busyOverlay.setAttribute("aria-hidden", "true");
}

function setUiMessage(message, level = "good") {
  uiMessage.textContent = message;
  uiMessage.className = "";
  if (level === "good") uiMessage.classList.add("status-good");
  if (level === "warn") uiMessage.classList.add("status-warn");
  if (level === "bad") uiMessage.classList.add("status-bad");
}

function updatePauseButton() {
  if (currentScanner && currentScanner.mode === "paused") {
    pauseBtn.textContent = "Resume scanner";
  } else {
    pauseBtn.textContent = "Pause scanner";
  }
}

function updateModeUi() {
  const cards = document.querySelectorAll("[data-card]");

  if (currentScanner && currentScanner.mode === "track") {
    modeBadge.textContent = "TRACK MODE ACTIVE";
    modeBadge.classList.remove("survey", "paused");
    modeBadge.classList.add("track");

    const centerHz = Number(currentScanner.track?.centerHz);
    lockedFreqBadge.textContent = Number.isFinite(centerHz)
      ? `Locked: ${fmtHz(centerHz)}`
      : "Locked: unknown";

    cards.forEach(card => {
      card.classList.remove("mode-survey", "mode-paused");
      card.classList.add("mode-track");
    });
  } else if (currentScanner && currentScanner.mode === "paused") {
    modeBadge.textContent = "SCANNER PAUSED";
    modeBadge.classList.remove("survey", "track");
    modeBadge.classList.add("paused");

    if (currentScanner.lastActiveMode === "track" && currentScanner.track?.centerHz) {
      lockedFreqBadge.textContent = `Last lock: ${fmtHz(Number(currentScanner.track.centerHz))}`;
    } else {
      lockedFreqBadge.textContent = "Paused";
    }

    cards.forEach(card => {
      card.classList.remove("mode-survey", "mode-track");
      card.classList.add("mode-paused");
    });
  } else {
    modeBadge.textContent = "SURVEY MODE";
    modeBadge.classList.remove("track", "paused");
    modeBadge.classList.add("survey");

    lockedFreqBadge.textContent = "No lock";

    cards.forEach(card => {
      card.classList.remove("mode-track", "mode-paused");
      card.classList.add("mode-survey");
    });
  }

  updatePauseButton();
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }
    throw new Error(`HTTP ${res.status}${detail ? ` - ${detail}` : ""}`);
  }
  return res.json();
}

function parseLooseFrequencyToMHz(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  const cleaned = raw.replace(/[^0-9.a-z]/g, "");
  const numMatch = cleaned.match(/[0-9]*\.?[0-9]+/);
  if (!numMatch) return null;

  const value = Number(numMatch[0]);
  if (!Number.isFinite(value)) return null;

  if (cleaned.includes("ghz") || cleaned.endsWith("g")) return value * 1000;
  if (cleaned.includes("mhz") || cleaned.endsWith("m")) return value;
  if (cleaned.includes("khz") || cleaned.endsWith("k")) return value / 1000;
  if (cleaned.includes("hz")) return value / 1e6;

  if (value >= 1e8) return value / 1e6;
  if (value >= 1e5) return value / 1000;
  return value;
}

function formatSurveyRange(startMHz, stopMHz, binKhz) {
  return `${Number(startMHz).toFixed(3)}M:${Number(stopMHz).toFixed(3)}M:${Math.round(Number(binKhz))}k`;
}

function parseSurveyRangeString(range) {
  const parts = String(range || "").split(":");
  if (parts.length !== 3) {
    return { startMHz: "", stopMHz: "", binKhz: "" };
  }

  const startMHz = parseLooseFrequencyToMHz(parts[0]);
  const stopMHz = parseLooseFrequencyToMHz(parts[1]);
  const binRaw = parts[2].toLowerCase().replace(/[^0-9.]/g, "");
  const binKhz = binRaw ? Number(binRaw) : "";

  return {
    startMHz: startMHz != null ? startMHz.toFixed(3) : "",
    stopMHz: stopMHz != null ? stopMHz.toFixed(3) : "",
    binKhz: binKhz
  };
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetProximitySession() {
  trackedStrengthHistory = [];
  smoothedStrengthHistory = [];
  sessionPeakDb = null;
  nextBeepAt = 0;

  hadTrackedHit = false;
  staleCounter = 0;
  lastAlertPeakDb = null;
  lastLockTargetHz = currentScanner && currentScanner.track
    ? Number(currentScanner.track.centerHz)
    : null;
  lastHitTimestampMs = 0;

  updateProximityUI(null);
}

function clearRenderedData(message = "Waiting for fresh scan data...") {
  currentTrace = [];
  summary.innerHTML = `<div>${message}</div>`;
  eventsBody.innerHTML = "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  statusEl.textContent = message;
}

function beginScannerTransition(message = "Waiting for fresh scan data...") {
  waitingForFreshScan = true;
  resetProximitySession();
  clearRenderedData(message);
}

function ensureAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function beepOnce(freq = 660, duration = 0.06, gainAmount = 0.03) {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playTone(freq = 660, duration = 0.08, gainAmount = 0.035, whenOffset = 0) {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + whenOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function alertLockAcquired() {
  playTone(520, 0.06, 0.03, 0);
  playTone(760, 0.08, 0.035, 0.09);
}

function alertNewTrackedHit() {
  playTone(680, 0.06, 0.03, 0);
}

function alertPeakReached() {
  playTone(700, 0.05, 0.03, 0);
  playTone(920, 0.06, 0.035, 0.07);
  playTone(1120, 0.07, 0.04, 0.15);
}

function alertStaleWarning() {
  playTone(300, 0.08, 0.03, 0);
  playTone(220, 0.10, 0.025, 0.11);
}

function findTrackedEvent(events, scanner) {
  if (!scanner || scanner.mode !== "track") return null;
  if (!events || !events.length) return null;

  const centerHz = Number(scanner.track.centerHz);
  const spanHz = Number(scanner.track.spanHz);
  if (!Number.isFinite(centerHz) || !Number.isFinite(spanHz) || spanHz <= 0) return null;

  const maxOffset = spanHz / 2;

  const candidates = events
    .map(e => ({
      ...e,
      offsetHz: Math.abs(Number(e.peakHz) - centerHz)
    }))
    .filter(e => e.offsetHz <= maxOffset);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.peakDb !== a.peakDb) return b.peakDb - a.peakDb;
    return a.offsetHz - b.offsetHz;
  });

  return candidates[0];
}

function updateProximityUI(state) {
  if (!state) {
    proximityTarget.textContent = selectedHz ? fmtHz(selectedHz) : "No target selected";
    proximityTrend.textContent = "STEADY";
    proximityTrend.className = "big-readout trend-steady";
    proximityStrength.textContent = "0%";
    proximityMeterFill.style.width = "0%";
    proximityCurrentDb.textContent = "Current: -- dB";
    proximityPeakDb.textContent = "Peak: -- dB";

    if (!proximityEnabled.checked) {
      proximityModeState.textContent = "Idle";
    } else if (hadTrackedHit && staleCounter >= 3) {
      proximityModeState.textContent = "No valid hit - signal stale";
    } else {
      proximityModeState.textContent = "Waiting for valid tracked hit";
    }
    return;
  }

  proximityTarget.textContent = fmtHz(state.targetHz);
  proximityStrength.textContent = `${Math.round(state.normalized * 100)}%`;
  proximityMeterFill.style.width = `${Math.round(state.normalized * 100)}%`;

  proximityCurrentDb.textContent = `Current: ${state.currentDb.toFixed(2)} dB`;
  proximityPeakDb.textContent = `Peak: ${state.peakDb.toFixed(2)} dB`;

  if (state.trend === "hotter") {
    proximityTrend.textContent = "HOTTER";
    proximityTrend.className = "big-readout trend-hotter";
  } else if (state.trend === "colder") {
    proximityTrend.textContent = "COLDER";
    proximityTrend.className = "big-readout trend-colder";
  } else {
    proximityTrend.textContent = "STEADY";
    proximityTrend.className = "big-readout trend-steady";
  }

  proximityModeState.textContent = state.modeText;
}

function handleProximity(data) {
  if (!currentScanner || currentScanner.mode !== "track") {
    updateProximityUI(null);
    return;
  }

  const targetHz = Number(currentScanner.track.centerHz || selectedHz);
  if (!Number.isFinite(targetHz)) {
    updateProximityUI(null);
    return;
  }

  if (lastLockTargetHz == null || lastLockTargetHz !== targetHz) {
    resetProximitySession();
    lastLockTargetHz = targetHz;
  }

  if (!proximityEnabled.checked) {
    updateProximityUI({
      targetHz,
      normalized: 0,
      currentDb: NaN,
      peakDb: NaN,
      trend: "steady",
      modeText: "Track mode active, proximity off"
    });
    proximityCurrentDb.textContent = "Current: -- dB";
    proximityPeakDb.textContent = sessionPeakDb == null
      ? "Peak: -- dB"
      : `Peak: ${sessionPeakDb.toFixed(2)} dB`;
    return;
  }

  const trackedEvent = findTrackedEvent(data.events || [], currentScanner);

  if (!trackedEvent) {
    staleCounter += 1;

    if (hadTrackedHit && staleCounter === 3 && audioEnabled.checked) {
      alertStaleWarning();
    }

    updateProximityUI(null);
    proximityModeState.textContent = hadTrackedHit
      ? "No valid hit - signal stale"
      : "Waiting for valid tracked hit";
    return;
  }

  const nowMs = Date.now();
  const smoothingN = Number(smoothingCount.value) || 5;
  const historyN = Number(historyCount.value) || 20;

  const wasStale = staleCounter >= 3;
  staleCounter = 0;

  trackedStrengthHistory.push(Number(trackedEvent.peakDb));
  if (trackedStrengthHistory.length > historyN) trackedStrengthHistory.shift();

  const recentForSmooth = trackedStrengthHistory.slice(-smoothingN);
  const smoothed = mean(recentForSmooth);

  smoothedStrengthHistory.push(smoothed);
  if (smoothedStrengthHistory.length > historyN) smoothedStrengthHistory.shift();

  let isNewPeak = false;
  if (sessionPeakDb == null || trackedEvent.peakDb > sessionPeakDb) {
    sessionPeakDb = trackedEvent.peakDb;
    isNewPeak = true;
  }

  const minHist = Math.min(...trackedStrengthHistory);
  const maxHist = Math.max(...trackedStrengthHistory);
  const range = Math.max(0.001, maxHist - minHist);
  const normalized = clamp((smoothed - minHist) / range, 0, 1);

  let trend = "steady";
  if (smoothedStrengthHistory.length >= 2) {
    const prev = smoothedStrengthHistory[smoothedStrengthHistory.length - 2];
    const delta = smoothed - prev;
    if (delta > 0.25) trend = "hotter";
    else if (delta < -0.25) trend = "colder";
  }

  updateProximityUI({
    targetHz,
    normalized,
    currentDb: trackedEvent.peakDb,
    peakDb: sessionPeakDb,
    trend,
    modeText: "Proximity tracking active"
  });

  if (audioEnabled.checked) {
    if (!hadTrackedHit) {
      alertLockAcquired();
    } else if (wasStale) {
      alertNewTrackedHit();
    }

    if (isNewPeak && (lastAlertPeakDb == null || trackedEvent.peakDb > lastAlertPeakDb + 0.2)) {
      alertPeakReached();
      lastAlertPeakDb = trackedEvent.peakDb;
    }

    const intervalMs = 900 - (normalized * 750);
    const pitch = 420 + (normalized * 580);

    if (performance.now() >= nextBeepAt) {
      beepOnce(pitch, 0.05 + normalized * 0.03, 0.02 + normalized * 0.03);
      nextBeepAt = performance.now() + intervalMs;
    }
  }

  hadTrackedHit = true;
  lastHitTimestampMs = nowMs;
}

function drawTrace(points) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!points.length) return;

  const minX = points[0].hz;
  const maxX = points[points.length - 1].hz;
  const minY = Math.min(...points.map(p => p.db));
  const maxY = Math.max(...points.map(p => p.db));

  const pad = 30;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  ctx.strokeStyle = "#333";
  ctx.strokeRect(pad, pad, w, h);

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = pad + ((p.hz - minX) / (maxX - minX || 1)) * w;
    const y = pad + h - ((p.db - minY) / (maxY - minY || 1)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#7fd";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#aaa";
  ctx.fillText(fmtHz(minX), pad, canvas.height - 8);
  ctx.fillText(fmtHz(maxX), canvas.width - 100, canvas.height - 8);
  ctx.fillText(maxY.toFixed(1) + " dB", 4, pad + 8);
  ctx.fillText(minY.toFixed(1) + " dB", 4, canvas.height - pad);
}

function renderData(data) {
  const hasRows = data && data.summary && Array.isArray(data.rows) && data.rows.length > 0;

  if (waitingForFreshScan && !hasRows) {
    clearRenderedData("Waiting for fresh scan data...");
    return;
  }

  if (waitingForFreshScan && hasRows) {
    waitingForFreshScan = false;
  }

  const s = data.summary;
  summary.innerHTML = s ? [
    summaryItem("Rows", s.rows),
    summaryItem("Range", `${fmtHz(s.startHz)} → ${fmtHz(s.stopHz)}`),
    summaryItem("Strongest", `${fmtHz(s.strongestHz)} @ ${s.strongestDb.toFixed(2)} dB`),
    summaryItem("First Seen", s.firstSeen),
    summaryItem("Last Seen", s.lastSeen)
  ].join("") : "<div>No data</div>";

  currentTrace = data.peakTrace || [];
  drawTrace(currentTrace);

  eventsBody.innerHTML = (data.events || [])
    .slice()
    .reverse()
    .slice(0, 200)
    .map(e => `
      <tr>
        <td>${e.timestamp}</td>
        <td>${fmtHz(e.peakHz)}</td>
        <td>${e.peakDb.toFixed(2)}</td>
        <td>${e.medianDb.toFixed(2)}</td>
        <td>${fmtHz(e.startHz)} → ${fmtHz(e.stopHz)}</td>
      </tr>
    `).join("");

  statusEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  handleProximity(data);
}

function settingsPayload() {
  return {
    relativeSquelchDb: Number(relativeSquelch.value),
    absoluteFloorDb: Number(absoluteFloor.value),
    minRepeats: Number(minRepeats.value),
    clusterWidthHz: Number(clusterWidthHz.value)
  };
}

function scannerPayload() {
  const startMHz = parseLooseFrequencyToMHz(surveyStartMHz.value);
  const stopMHz = parseLooseFrequencyToMHz(surveyStopMHz.value);
  const binKhz = Number(surveyBinKhz.value);

  if (
    startMHz == null ||
    stopMHz == null ||
    !Number.isFinite(binKhz) ||
    binKhz <= 0
  ) {
    throw new Error("Invalid survey range");
  }

  let fixedStartMHz = startMHz;
  let fixedStopMHz = stopMHz;

  if (fixedStartMHz > fixedStopMHz) {
    [fixedStartMHz, fixedStopMHz] = [fixedStopMHz, fixedStartMHz];
  }

  surveyStartMHz.value = fixedStartMHz.toFixed(3);
  surveyStopMHz.value = fixedStopMHz.toFixed(3);

  return {
    survey: {
      freqRange: formatSurveyRange(fixedStartMHz, fixedStopMHz, binKhz),
      interval: surveyInterval.value.trim(),
      window: surveyWindow.value.trim()
    },
    track: {
      spanHz: Number(trackSpanKhz.value) * 1000,
      binHz: Number(trackBinKhz.value) * 1000,
      interval: trackInterval.value.trim(),
      window: trackWindow.value.trim()
    }
  };
}

function populateSettings(settings) {
  currentSettings = settings;
  relativeSquelch.value = settings.relativeSquelchDb;
  absoluteFloor.value = settings.absoluteFloorDb;
  minRepeats.value = String(settings.minRepeats);
  clusterWidthHz.value = String(settings.clusterWidthHz);
  viewerOrigin.textContent = `Viewer: ${window.location.origin}`;
}

function populateScanner(scanner) {
  currentScanner = scanner;

  const parsedSurvey = parseSurveyRangeString(scanner.survey?.freqRange || "");
  surveyStartMHz.value = parsedSurvey.startMHz;
  surveyStopMHz.value = parsedSurvey.stopMHz;
  surveyBinKhz.value = parsedSurvey.binKhz;

  surveyInterval.value = scanner.survey?.interval || "";
  surveyWindow.value = scanner.survey?.window || "";

  trackSpanKhz.value = Math.round(Number(scanner.track?.spanHz || 0) / 1000) || "";
  trackBinKhz.value = Math.round(Number(scanner.track?.binHz || 0) / 1000) || "";
  trackInterval.value = scanner.track?.interval || "";
  trackWindow.value = scanner.track?.window || "";

  scannerStatus.textContent = scanner.mode === "paused"
    ? `Mode: paused | resume: ${scanner.lastActiveMode || "survey"}`
    : `Mode: ${scanner.mode} | ${scanner.freqRange}`;

  if (scanner.mode === "track" && scanner.track && Number.isFinite(Number(scanner.track.centerHz))) {
    selectedHz = Number(scanner.track.centerHz);
  }

  updateModeUi();
}

async function loadSettings() {
  try {
    const data = await fetchJson("/api/settings");
    populateSettings(data);
  } catch (err) {
    setUiMessage(`Settings load failed: ${err.message}`, "bad");
  }
}

async function loadScanner() {
  try {
    const data = await fetchJson("/api/scanner");
    populateScanner(data);
  } catch (err) {
    setUiMessage(`Scanner load failed: ${err.message}`, "bad");
  }
}

async function applySettings(save = false) {
  showBusy(
    save ? "Saving viewer settings" : "Applying viewer settings",
    save ? "Updating defaults" : "Refreshing filters"
  );
  setUiMessage(save ? "Saving viewer settings..." : "Applying viewer settings...", "warn");

  try {
    const data = await fetchJson(save ? "/api/settings/save" : "/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsPayload())
    });

    populateSettings(data.settings);
    settingsStatus.textContent = save ? "Defaults saved" : "Settings applied";
    setUiMessage(save ? "Viewer defaults saved" : "Viewer settings applied", "good");
    await loadCurrent();
  } catch (err) {
    setUiMessage(`Viewer settings failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function runScannerConfig() {
  let payload;

  try {
    payload = {
      mode: "survey",
      ...scannerPayload()
    };
  } catch (err) {
    scannerStatus.textContent = err.message;
    setUiMessage(err.message, "bad");
    return;
  }

  beginScannerTransition("Applying scanner config...");
  showBusy("Running scanner config", "Applying live scanner range");
  setUiMessage("Applying scanner config...", "warn");

  try {
    const data = await fetchJson("/api/scanner/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    populateScanner(data.scanner);
    setUiMessage(`Scanner running: ${data.scanner.freqRange}`, "good");
    setTimeout(loadCurrent, 2500);
  } catch (err) {
    setUiMessage(`Run scanner failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function saveScannerConfig() {
  let payload;

  try {
    payload = {
      mode: "survey",
      ...scannerPayload()
    };
  } catch (err) {
    scannerStatus.textContent = err.message;
    setUiMessage(err.message, "bad");
    return;
  }

  beginScannerTransition("Saving scanner config...");
  showBusy("Saving scanner config", "Updating saved scanner defaults");
  setUiMessage("Saving scanner config...", "warn");

  try {
    const data = await fetchJson("/api/scanner/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    populateScanner(data.scanner);
    setUiMessage(`Scanner config saved: ${data.scanner.freqRange}`, "good");
    setTimeout(loadCurrent, 2500);
  } catch (err) {
    setUiMessage(`Save scanner failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function setSurveyMode() {
  beginScannerTransition("Switching to survey...");
  showBusy("Switching to survey", "Returning to wide scan");
  setUiMessage("Returning to survey mode...", "warn");

  try {
    const data = await fetchJson("/api/scanner/survey", { method: "POST" });
    populateScanner(data.scanner);
    setUiMessage("Survey mode active", "good");
    setTimeout(loadCurrent, 2500);
  } catch (err) {
    setUiMessage(`Survey mode failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function setTrackMode() {
  if (!selectedHz) {
    scannerStatus.textContent = "Select a frequency first";
    setUiMessage("Select a frequency before entering track mode", "warn");
    return;
  }

  beginScannerTransition(`Switching to track near ${fmtHz(selectedHz)}...`);
  showBusy("Switching to track", `Locking near ${fmtHz(selectedHz)}`);
  setUiMessage(`Applying track mode at ${fmtHz(selectedHz)}...`, "warn");

  try {
    const payload = {
      centerHz: selectedHz,
      spanHz: Number(trackSpanKhz.value) * 1000,
      binHz: Number(trackBinKhz.value) * 1000,
      interval: trackInterval.value.trim(),
      window: trackWindow.value.trim()
    };

    const data = await fetchJson("/api/scanner/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    populateScanner(data.scanner);

    hadTrackedHit = false;
    staleCounter = 0;
    lastAlertPeakDb = null;
    lastLockTargetHz = Number(data.scanner.track.centerHz);

    setUiMessage(`Track mode active at ${fmtHz(lastLockTargetHz)}`, "good");
    setTimeout(loadCurrent, 2500);
  } catch (err) {
    setUiMessage(`Track mode failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function togglePauseScanner() {
  if (currentScanner && currentScanner.mode === "paused") {
    beginScannerTransition("Resuming scanner...");
    showBusy("Resuming scanner", "Restoring previous mode");
    setUiMessage(`Resuming ${currentScanner.lastActiveMode || "survey"} mode...`, "warn");

    try {
      const data = await fetchJson("/api/scanner/resume", { method: "POST" });
      populateScanner(data.scanner);
      setUiMessage(`Scanner resumed in ${data.scanner.mode} mode`, "good");
      setTimeout(loadCurrent, 2500);
    } catch (err) {
      setUiMessage(`Resume failed: ${err.message}`, "bad");
    } finally {
      hideBusy();
    }
    return;
  }

  beginScannerTransition("Pausing scanner...");
  showBusy("Pausing scanner", "Stopping active scan loop");
  setUiMessage("Pausing scanner...", "warn");

  try {
    const data = await fetchJson("/api/scanner/pause", { method: "POST" });
    populateScanner(data.scanner);
    setUiMessage("Scanner paused", "good");
  } catch (err) {
    setUiMessage(`Pause failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function loadFiles() {
  try {
    const data = await fetchJson("/api/files");
    fileSelect.innerHTML = data.files.map(f => `<option value="${f}">${f}</option>`).join("");
    if (data.files.length) {
      fileSelect.value = "live";
      await loadCurrent();
    }
  } catch (err) {
    setUiMessage(`File list failed: ${err.message}`, "bad");
  }
}

async function loadCurrent() {
  const selected = fileSelect.value;
  const endpoint = selected === "live"
    ? "/api/live"
    : `/api/data?file=${encodeURIComponent(selected)}`;

  try {
    const data = await fetchJson(endpoint);
    renderData(data);
  } catch (err) {
    setUiMessage(`Live load failed: ${err.message}`, "bad");
  }
}

function updateTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;

  if (liveMode.checked && fileSelect.value === "live") {
    refreshTimer = setInterval(loadCurrent, 2000);
  }
}

async function refreshRecordStatus() {
  try {
    const data = await fetchJson("/api/record/status");
    recordStatus.textContent = data.recording
      ? `Recording (${data.rows} rows)`
      : `Not recording`;
  } catch (err) {
    setUiMessage(`Record status failed: ${err.message}`, "bad");
  }
}

fileSelect.addEventListener("change", async () => {
  await loadCurrent();
  updateTimer();
});

liveMode.addEventListener("change", updateTimer);

recordBtn.addEventListener("click", async () => {
  try {
    await fetchJson("/api/record/start");
    refreshRecordStatus();
    setUiMessage("Recording started", "good");
  } catch (err) {
    setUiMessage(`Record start failed: ${err.message}`, "bad");
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    await fetchJson("/api/record/stop");
    refreshRecordStatus();
    setUiMessage("Recording stopped", "good");
  } catch (err) {
    setUiMessage(`Record stop failed: ${err.message}`, "bad");
  }
});

applySettingsBtn.addEventListener("click", async () => {
  await applySettings(false);
});

saveSettingsBtn.addEventListener("click", async () => {
  await applySettings(true);
});

runScannerBtn.addEventListener("click", runScannerConfig);
saveScannerBtn.addEventListener("click", saveScannerConfig);
trackBtn.addEventListener("click", setTrackMode);
surveyBtn.addEventListener("click", setSurveyMode);
pauseBtn.addEventListener("click", togglePauseScanner);

proximityEnabled.addEventListener("change", () => {
  resetProximitySession();
});

audioEnabled.addEventListener("change", () => {
  if (audioEnabled.checked) {
    ensureAudioContext();
  }
});

canvas.addEventListener("click", (e) => {
  if (!currentTrace.length) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;

  const pad = 30;
  const w = canvas.width - pad * 2;

  const minX = currentTrace[0].hz;
  const maxX = currentTrace[currentTrace.length - 1].hz;

  const canvasX = (clickX / rect.width) * canvas.width;
  const clamped = Math.max(pad, Math.min(canvasX, canvas.width - pad));
  const ratio = (clamped - pad) / w;
  const hz = minX + ratio * (maxX - minX);

  selectedHz = Math.round(hz);
  clickedFreq.textContent = `Selected: ${fmtHz(selectedHz)} (${selectedHz} Hz)`;
  proximityTarget.textContent = fmtHz(selectedHz);

  if (currentScanner && currentScanner.mode === "track") {
    lockedFreqBadge.textContent = `Locked: ${fmtHz(selectedHz)}`;
  }
});

document.querySelectorAll("[data-collapse-toggle]").forEach((header) => {
  header.addEventListener("click", (e) => {
    if (e.target.closest("button") && !e.target.classList.contains("collapse-btn")) {
      return;
    }

    const card = header.closest("[data-card]");
    const btn = header.querySelector(".collapse-btn");
    card.classList.toggle("collapsed");
    btn.textContent = card.classList.contains("collapsed") ? "+" : "−";
  });
});

window.addEventListener("error", (event) => {
  const msg = event?.message || "Unknown script error";
  setUiMessage(`Script error: ${msg}`, "bad");
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = event?.reason?.message || String(event.reason || "Unknown async error");
  setUiMessage(`Async error: ${msg}`, "bad");
});

Promise.all([loadSettings(), loadScanner(), loadFiles()]).then(() => {
  updateTimer();
  refreshRecordStatus();
  updateProximityUI(null);
  updateModeUi();
  setUiMessage("Ready", "good");
  setInterval(refreshRecordStatus, 2000);
});