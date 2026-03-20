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
const ctx = canvas ? canvas.getContext("2d") : null;

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

const listenFrequency = document.getElementById("listenFrequency");
const listenModulation = document.getElementById("listenModulation");
const listenGain = document.getElementById("listenGain");
const listenSquelch = document.getElementById("listenSquelch");
const listenStartBtn = document.getElementById("listenStartBtn");
const listenStopBtn = document.getElementById("listenStopBtn");
const listenStatus = document.getElementById("listenStatus");

const listenBrowserAudio = document.getElementById("listenBrowserAudio");
const playBrowserAudioBtn = document.getElementById("playBrowserAudioBtn");
const stopBrowserAudioBtn = document.getElementById("stopBrowserAudioBtn");
const listenPipelineStatus = document.getElementById("listenPipelineStatus");
const listenPipelineStateBadge = document.getElementById("listenPipelineStateBadge");
const listenClientCountBadge = document.getElementById("listenClientCountBadge");
const listenAudioMetaBadge = document.getElementById("listenAudioMetaBadge");
const listenPipelineMeta = document.getElementById("listenPipelineMeta");
const listenLog = document.getElementById("listenLog");

const bleStartBtn = document.getElementById("bleStartBtn");
const bleStopBtn = document.getElementById("bleStopBtn");
const bleClearMemoryBtn = document.getElementById("bleClearMemoryBtn");
const bleStatusText = document.getElementById("bleStatusText");
const bleStateBadge = document.getElementById("bleStateBadge");
const bleUniqueBadge = document.getElementById("bleUniqueBadge");
const bleActiveBadge = document.getElementById("bleActiveBadge");
const bleEventsBadge = document.getElementById("bleEventsBadge");
const bleMatchBadge = document.getElementById("bleMatchBadge");
const bleMatchBreakdownBadge = document.getElementById("bleMatchBreakdownBadge");
const bleStrongestBadge = document.getElementById("bleStrongestBadge");
const bleRememberedBadge = document.getElementById("bleRememberedBadge");
const bleMemoryInfo = document.getElementById("bleMemoryInfo");
const bleDevicesBody = document.getElementById("bleDevicesBody");

const wifiStartBtn = document.getElementById("wifiStartBtn");
const wifiStopBtn = document.getElementById("wifiStopBtn");
const wifiClearMemoryBtn = document.getElementById("wifiClearMemoryBtn");
const wifiStatusText = document.getElementById("wifiStatusText");
const wifiStateBadge = document.getElementById("wifiStateBadge");
const wifiUniqueBadge = document.getElementById("wifiUniqueBadge");
const wifiActiveBadge = document.getElementById("wifiActiveBadge");
const wifiEventsBadge = document.getElementById("wifiEventsBadge");
const wifiMatchBadge = document.getElementById("wifiMatchBadge");
const wifiMatchBreakdownBadge = document.getElementById("wifiMatchBreakdownBadge");
const wifiStrongestBadge = document.getElementById("wifiStrongestBadge");
const wifiRememberedBadge = document.getElementById("wifiRememberedBadge");
const wifiMemoryInfo = document.getElementById("wifiMemoryInfo");
const wifiNetworksBody = document.getElementById("wifiNetworksBody");
const bleIntelBadge = document.getElementById("bleIntelBadge");
const bleExposureBadge = document.getElementById("bleExposureBadge");
const wifiIntelBadge = document.getElementById("wifiIntelBadge");
const wifiExposureBadge = document.getElementById("wifiExposureBadge");
const intelStateBadge = document.getElementById("intelStateBadge");
const intelEntriesBadge = document.getElementById("intelEntriesBadge");
const intelReachableBadge = document.getElementById("intelReachableBadge");
const intelExposureBadge = document.getElementById("intelExposureBadge");
const intelStatusText = document.getElementById("intelStatusText");
const intelUpdatedText = document.getElementById("intelUpdatedText");
const fusionStateBadge = document.getElementById("fusionStateBadge");
const fusionClustersBadge = document.getElementById("fusionClustersBadge");
const fusionMultiSignalBadge = document.getElementById("fusionMultiSignalBadge");
const fusionIntelCoverageBadge = document.getElementById("fusionIntelCoverageBadge");
const fusionConfidenceBadge = document.getElementById("fusionConfidenceBadge");
const fusionStatusText = document.getElementById("fusionStatusText");
const fusionClustersBody = document.getElementById("fusionClustersBody");
const fusionProbeAllBtn = document.getElementById("fusionProbeAllBtn");
const fusionProbeBadge = document.getElementById("fusionProbeBadge");
const fusionSearchInput = document.getElementById("fusionSearchInput");
const fusionSearchBtn = document.getElementById("fusionSearchBtn");
const fusionSearchClearBtn = document.getElementById("fusionSearchClearBtn");
const fusionSearchStatus = document.getElementById("fusionSearchStatus");
const fusionPagination = document.getElementById("fusionPagination");
const fusionPagePrev = document.getElementById("fusionPagePrev");
const fusionPageNext = document.getElementById("fusionPageNext");
const fusionPageInfo = document.getElementById("fusionPageInfo");

const probeDiscoverBtn = document.getElementById("probeDiscoverBtn");
const probeScanAllBtn = document.getElementById("probeScanAllBtn");
const probeStateBadge = document.getElementById("probeStateBadge");
const probeHostsBadge = document.getElementById("probeHostsBadge");
const probePortsBadge = document.getElementById("probePortsBadge");
const probeLastDiscoveryBadge = document.getElementById("probeLastDiscoveryBadge");
const probeLastScanBadge = document.getElementById("probeLastScanBadge");
const probeAutoToggle = document.getElementById("probeAutoToggle");
const probeAutoDiscoverToggle = document.getElementById("probeAutoDiscoverToggle");
const probeAutoScanToggle = document.getElementById("probeAutoScanToggle");
const probeStatusText = document.getElementById("probeStatusText");
const probeHostsBody = document.getElementById("probeHostsBody");

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

const sessionName = document.getElementById("sessionName");
const exportSessionBtn = document.getElementById("exportSessionBtn");

const detailDrawer = document.getElementById("detailDrawer");
const detailDrawerTitle = document.getElementById("detailDrawerTitle");
const detailDrawerMeta = document.getElementById("detailDrawerMeta");
const detailDrawerBody = document.getElementById("detailDrawerBody");
const detailDrawerCloseBtn = document.getElementById("detailDrawerCloseBtn");

const BLE_MEMORY_KEY = "rfv2_ble_memory_v1";
const WIFI_MEMORY_KEY = "rfv2_wifi_memory_v1";
const MEMORY_LIMIT = 200;
const ACTIVE_AGE_MS = 15000;
const STALE_AGE_MS = 60000;
const VERY_STALE_AGE_MS = 5 * 60 * 1000;

let refreshTimer = null;
let diagnosticsTimer = null;
let bleTimer = null;
let wifiTimer = null;
let intelTimer = null;

/* Scroll guards — suppress table rebuilds while user is scrolling */
let bleScrolling = false;
let bleScrollTimeout = null;
let wifiScrolling = false;
let wifiScrollTimeout = null;
let pendingBleRender = null;
let pendingWifiRender = null;
/* Content-hash cache — skip innerHTML when nothing changed */
let lastBleTableHtml = "";
let lastWifiTableHtml = "";
/* Atomic tbody swap — avoids the blank flash of innerHTML = "" */
function swapTbody(tbody, html) {
  const tmp = document.createElement("tbody");
  tmp.innerHTML = html;
  tbody.replaceChildren(...tmp.childNodes);
}
/* rAF render coalescing — collapse back-to-back renders into a single paint */
let bleRafId = null;
let bleRafArgs = null;
let wifiRafId = null;
let wifiRafArgs = null;
let fusionTimer = null;

let currentTrace = [];
let currentSettings = null;
let currentScanner = null;
let selectedHz = null;
let waitingForFreshScan = false;
let currentListenPipeline = null;
let browserAudioActive = false;

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

let lastBleStatus = null;
let lastBleSummary = null;
let lastWifiStatus = null;
let lastWifiSummary = null;
let currentIntel = { items: [], summary: null, byKey: {} };
let currentFusion = { clusters: [], summary: null, updatedAt: null };
let currentProbe = { status: null, discovery: null, results: null };
let probeTimer = null;
let selectedDetail = null;

let bleMemory = loadMemoryStore(BLE_MEMORY_KEY);
let wifiMemory = loadMemoryStore(WIFI_MEMORY_KEY);

function fmtHz(hz) {
  return (hz / 1e6).toFixed(3) + " MHz";
}

function hzToMString(hz) {
  return `${(Number(hz) / 1e6).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}M`;
}

function guessListenModulationFromHz(hz) {
  const mhz = Number(hz) / 1e6;
  if (Number.isFinite(mhz) && mhz >= 88 && mhz <= 108) return "wbfm";
  return "fm";
}

function summaryItem(label, value) {
  return `<div><div class="muted">${label}</div><div>${value}</div></div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return map[char] || char;
  });
}

function fmtShortTime(ts) {
  if (!ts) return "--";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return String(ts);
  }
}

function isoNow() {
  return new Date().toISOString();
}

function parseTimeMs(value) {
  if (!value) return 0;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}

function normalizeIntelKey(value) {
  return String(value || "").trim().toLowerCase();
}

function buildIntelIndex(items = []) {
  const byKey = {};
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item || !item.key) return;
    const primary = normalizeIntelKey(item.key);
    if (!primary) return;
    byKey[primary] = item;
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    aliases.forEach((alias) => {
      const normalized = normalizeIntelKey(alias);
      if (normalized && !byKey[normalized]) byKey[normalized] = item;
    });
  });
  return byKey;
}

function getIntelForEntry(entry) {
  const candidates = [
    entry?.address,
    entry?.bssid,
    entry?.ssid,
    entry?.match?.passive?.bssid,
    entry?.match?.passive?.ssid
  ].map(normalizeIntelKey).filter(Boolean);

  for (const key of candidates) {
    if (currentIntel.byKey[key]) return currentIntel.byKey[key];
  }
  return null;
}

function intelPortSummary(intel) {
  const ports = Array.isArray(intel?.ports) ? intel.ports : [];
  if (ports.length) {
    return ports.slice(0, 3).map((port) => {
      const bits = [];
      if (port.port) bits.push(port.port);
      if (port.service) bits.push(String(port.service).toUpperCase());
      if (port.surfaceType) bits.push(port.surfaceType);
      return bits.join("/");
    }).join(" • ");
  }

  const servicePorts = Array.isArray(intel?.servicePorts) ? intel.servicePorts : [];
  return servicePorts.length ? servicePorts.join(", ") : "--";
}

function fmtLatency(latencyMs) {
  return typeof latencyMs === "number" && Number.isFinite(latencyMs)
    ? `${latencyMs} ms`
    : "--";
}

function renderIntelInlineHtml(intel) {
  if (!intel) {
    return `<div class="wifi-sub">Intel: none</div>`;
  }

  const reachability = intel.reachable === true
    ? `Reachable • ${escapeHtml(fmtLatency(intel.latencyMs))}`
    : intel.reachable === false
      ? "Not reachable"
      : "Reachability unknown";

  const exposure = escapeHtml(intel.exposureClass || "E0");
  const summary = escapeHtml(intel.summary || "Metadata-only intel present");
  const portText = escapeHtml(intelPortSummary(intel));

  return `
    <div class="wifi-related" style="margin-top:4px;">
      <div>Intel: ${reachability}</div>
      <div class="wifi-sub">Exposure: ${exposure} • Ports: ${portText}</div>
      <div class="wifi-sub">${summary}</div>
    </div>
  `;
}

function buildIntelDetailHtml(intel) {
  if (!intel) {
    return `<div class="detail-block"><h4>Exposure intel</h4><div>No authorized metadata-only intel mapped to this entry.</div></div>`;
  }

  const ports = Array.isArray(intel.ports) ? intel.ports : [];
  const portLines = ports.length
    ? ports.map((port) => {
        const pieces = [];
        if (port.port) pieces.push(`Port ${port.port}`);
        if (port.service) pieces.push(String(port.service).toUpperCase());
        if (port.transport) pieces.push(String(port.transport).toUpperCase());
        if (port.surfaceType) pieces.push(port.surfaceType);
        if (port.authObserved === false) pieces.push("no auth observed");
        if (port.exposureClass) pieces.push(port.exposureClass);
        return `<div>${escapeHtml(pieces.join(" • "))}${port.summary ? ` — ${escapeHtml(port.summary)}` : ""}</div>`;
      }).join("")
    : `<div>${escapeHtml(intelPortSummary(intel))}</div>`;

  return `
    <div class="detail-block">
      <h4>Exposure intel</h4>
      <div><strong>Label:</strong> ${escapeHtml(intel.label || "--")}</div>
      <div><strong>Summary:</strong> ${escapeHtml(intel.summary || "--")}</div>
      <div><strong>Reachable:</strong> ${escapeHtml(intel.reachable === null ? "unknown" : String(intel.reachable))}</div>
      <div><strong>Latency:</strong> ${escapeHtml(fmtLatency(intel.latencyMs))}</div>
      <div><strong>IP:</strong> ${escapeHtml(intel.ip || "--")}</div>
      <div><strong>Exposure:</strong> ${escapeHtml(intel.exposureClass || "E0")}</div>
      <div><strong>Confidence:</strong> ${escapeHtml(intel.confidence || "--")}</div>
      <div><strong>Evidence mode:</strong> ${escapeHtml(intel.evidenceMode || "metadata-only")}</div>
      <div><strong>Source:</strong> ${escapeHtml(intel.source || "manual")}</div>
      <div style="margin-top:8px;"><strong>Surfaces:</strong> ${escapeHtml((intel.surfaceSummary || []).join(", ") || "--")}</div>
      <div style="margin-top:8px;"><strong>Ports / services:</strong></div>
      ${portLines}
    </div>
  `;
}

function showBusy(title, subtitle = "Applying changes") {
  if (!busyOverlay || !busyTitle || !busySubtitle) return;
  busyTitle.textContent = title;
  busySubtitle.textContent = subtitle;
  busyOverlay.classList.add("active");
  busyOverlay.setAttribute("aria-hidden", "false");
}

function hideBusy() {
  if (!busyOverlay) return;
  busyOverlay.classList.remove("active");
  busyOverlay.setAttribute("aria-hidden", "true");
}

function setUiMessage(message, level = "good") {
  if (!uiMessage) return;
  uiMessage.textContent = message;
  uiMessage.className = "";
  if (level === "good") uiMessage.classList.add("status-good");
  if (level === "warn") uiMessage.classList.add("status-warn");
  if (level === "bad") uiMessage.classList.add("status-bad");
}

function setListenStatus(message, level = "good") {
  if (!listenStatus) return;
  listenStatus.textContent = message;
  listenStatus.className = "muted";
  if (level === "good") listenStatus.classList.add("status-good");
  if (level === "warn") listenStatus.classList.add("status-warn");
  if (level === "bad") listenStatus.classList.add("status-bad");
}

function setListenPipelineStatus(message, level = "good") {
  if (!listenPipelineStatus) return;
  listenPipelineStatus.textContent = message;
  listenPipelineStatus.className = "muted";
  if (level === "good") listenPipelineStatus.classList.add("status-good");
  if (level === "warn") listenPipelineStatus.classList.add("status-warn");
  if (level === "bad") listenPipelineStatus.classList.add("status-bad");
}

function setBleStatus(message, level = "good") {
  if (!bleStatusText) return;
  bleStatusText.textContent = message;
  bleStatusText.className = "muted";
  if (level === "good") bleStatusText.classList.add("status-good");
  if (level === "warn") bleStatusText.classList.add("status-warn");
  if (level === "bad") bleStatusText.classList.add("status-bad");
}

function setWifiStatus(message, level = "good") {
  if (!wifiStatusText) return;
  wifiStatusText.textContent = message;
  wifiStatusText.className = "muted";
  if (level === "good") wifiStatusText.classList.add("status-good");
  if (level === "warn") wifiStatusText.classList.add("status-warn");
  if (level === "bad") wifiStatusText.classList.add("status-bad");
}

function updatePauseButton() {
  if (!pauseBtn) return;
  pauseBtn.textContent = currentScanner && currentScanner.mode === "paused"
    ? "Resume scanner"
    : "Pause scanner";
}

function updateModeUi() {
  const cards = document.querySelectorAll("[data-card]");

  if (currentScanner && currentScanner.mode === "track") {
    if (modeBadge) {
      modeBadge.textContent = "TRACK MODE ACTIVE";
      modeBadge.classList.remove("survey", "paused", "listen");
      modeBadge.classList.add("track");
    }

    const centerHz = Number(currentScanner.track?.centerHz);
    if (lockedFreqBadge) {
      lockedFreqBadge.textContent = Number.isFinite(centerHz)
        ? `Locked: ${fmtHz(centerHz)}`
        : "Locked: unknown";
    }

    cards.forEach((card) => {
      card.classList.remove("mode-survey", "mode-paused", "mode-listen");
      card.classList.add("mode-track");
    });
  } else if (currentScanner && currentScanner.mode === "paused") {
    if (modeBadge) {
      modeBadge.textContent = "SCANNER PAUSED";
      modeBadge.classList.remove("survey", "track", "listen");
      modeBadge.classList.add("paused");
    }

    if (lockedFreqBadge) {
      if (currentScanner.lastActiveMode === "track" && currentScanner.track?.centerHz) {
        lockedFreqBadge.textContent = `Last lock: ${fmtHz(Number(currentScanner.track.centerHz))}`;
      } else {
        lockedFreqBadge.textContent = "Paused";
      }
    }

    cards.forEach((card) => {
      card.classList.remove("mode-survey", "mode-track", "mode-listen");
      card.classList.add("mode-paused");
    });
  } else if (currentScanner && currentScanner.mode === "listen") {
    if (modeBadge) {
      modeBadge.textContent = "LISTEN MODE";
      modeBadge.classList.remove("survey", "track", "paused");
      modeBadge.classList.add("listen");
    }

    const freq = currentScanner.listen?.frequency || currentScanner.targetFrequency;
    if (lockedFreqBadge) {
      lockedFreqBadge.textContent = freq ? `Listening: ${freq}` : "Listening";
    }

    cards.forEach((card) => {
      card.classList.remove("mode-survey", "mode-track", "mode-paused");
      card.classList.add("mode-listen");
    });
  } else {
    if (modeBadge) {
      modeBadge.textContent = "SURVEY MODE";
      modeBadge.classList.remove("track", "paused", "listen");
      modeBadge.classList.add("survey");
    }

    if (lockedFreqBadge) {
      lockedFreqBadge.textContent = "No lock";
    }

    cards.forEach((card) => {
      card.classList.remove("mode-track", "mode-paused", "mode-listen");
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

function normalizeFrequencyInput(input) {
  const mhz = parseLooseFrequencyToMHz(input);
  if (mhz == null || !Number.isFinite(mhz) || mhz <= 0) return null;
  return `${mhz.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}M`;
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
    binKhz
  };
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function proximityRank(bucket) {
  switch (bucket) {
    case "very_close": return 4;
    case "close": return 3;
    case "medium": return 2;
    case "far": return 1;
    default: return 0;
  }
}

function confidenceRank(confidence) {
  switch (confidence) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

function isMeaningfulBleName(name, address) {
  const raw = String(name || "").trim();
  if (!raw) return false;

  const lower = raw.toLowerCase();
  const addr = String(address || "").trim().toLowerCase();
  const addrDashed = addr.replace(/:/g, "-");

  if (lower === addr || lower === addrDashed) return false;
  if (/^[0-9a-f]{2}([-:][0-9a-f]{2}){5}$/i.test(raw)) return false;
  return true;
}

function isHiddenWifiSsid(ssid) {
  const value = String(ssid || "").trim();
  return !value || value === "(hidden)";
}

function getBleDisplayLabel(entry) {
  return isMeaningfulBleName(entry.name, entry.address)
    ? entry.name
    : (entry.address || "Unknown BLE");
}

function getWifiDisplayLabel(entry) {
  return isHiddenWifiSsid(entry.ssid)
    ? (entry.bssid || "(hidden)")
    : entry.ssid;
}

function shortUuid(uuid) {
  const value = String(uuid || "");
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function loadMemoryStore(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMemoryStore(key, store) {
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {}
}

function saveAllMemory() {
  saveMemoryStore(BLE_MEMORY_KEY, bleMemory);
  saveMemoryStore(WIFI_MEMORY_KEY, wifiMemory);
}

function getBleMemoryKey(device) {
  return String(device.address || "").trim().toUpperCase();
}

function getWifiMemoryKey(network) {
  const bssid = String(network.bssid || "").trim().toUpperCase();
  if (bssid) return `BSSID:${bssid}`;
  const ssid = String(network.ssid || "").trim();
  if (ssid) return `SSID:${ssid}`;
  return "";
}

function getBleSignal(entry) {
  if (typeof entry.last_rssi === "number") return entry.last_rssi;
  if (typeof entry.max_rssi === "number") return entry.max_rssi;
  if (typeof entry.min_rssi === "number") return entry.min_rssi;
  return -9999;
}

function getWifiSignal(entry) {
  if (typeof entry.last_signal === "number") return entry.last_signal;
  if (typeof entry.max_signal === "number") return entry.max_signal;
  if (typeof entry.min_signal === "number") return entry.min_signal;
  return -9999;
}

function getEntryAgeMs(entry) {
  return Math.max(0, Date.now() - parseTimeMs(entry.last_seen));
}

function getStaleClass(entry) {
  const age = getEntryAgeMs(entry);
  if (entry.activeNow && age <= ACTIVE_AGE_MS) return "";
  if (age <= STALE_AGE_MS) return "";
  if (age <= VERY_STALE_AGE_MS) return "memory-row-stale";
  return "memory-row-very-stale";
}

function getSeenLabel(entry) {
  const state = entry.activeNow && getEntryAgeMs(entry) <= ACTIVE_AGE_MS ? "Live now" : "Seen";
  return `${state} • ${fmtShortTime(entry.last_seen)}`;
}

function trimMemoryStore(store, type) {
  const entries = Object.values(store);
  if (entries.length <= MEMORY_LIMIT) return store;

  entries.sort((a, b) => {
    const aLocked = a.locked ? 1 : 0;
    const bLocked = b.locked ? 1 : 0;
    if (bLocked !== aLocked) return bLocked - aLocked;

    const aActive = a.activeNow ? 1 : 0;
    const bActive = b.activeNow ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    const aConf = confidenceRank(a.match?.confidence);
    const bConf = confidenceRank(b.match?.confidence);
    if (bConf !== aConf) return bConf - aConf;

    const aSignal = type === "ble" ? getBleSignal(a) : getWifiSignal(a);
    const bSignal = type === "ble" ? getBleSignal(b) : getWifiSignal(b);
    if (bSignal !== aSignal) return bSignal - aSignal;

    return parseTimeMs(b.last_seen) - parseTimeMs(a.last_seen);
  });

  const trimmed = {};
  entries.slice(0, MEMORY_LIMIT).forEach((entry) => {
    trimmed[entry.key] = entry;
  });
  return trimmed;
}

function mergeBleMemory(summaryData) {
  const devices = Array.isArray(summaryData?.devices) ? summaryData.devices : [];
  const now = isoNow();

  Object.values(bleMemory).forEach((entry) => {
    entry.activeNow = false;
  });

  devices.forEach((device) => {
    const key = getBleMemoryKey(device);
    if (!key) return;

    const existing = bleMemory[key] || {};
    const maxRssi = [existing.max_rssi, device.max_rssi, device.last_rssi]
      .filter((v) => typeof v === "number")
      .reduce((acc, v) => Math.max(acc, v), -Infinity);

    const minRssi = [existing.min_rssi, device.min_rssi, device.last_rssi]
      .filter((v) => typeof v === "number")
      .reduce((acc, v) => Math.min(acc, v), Infinity);

    bleMemory[key] = {
      ...existing,
      key,
      type: "ble",
      address: device.address || existing.address || "",
      name: device.name || existing.name || "",
      first_seen: existing.first_seen || device.first_seen || device.last_seen || now,
      last_seen: device.last_seen || now,
      seen_count: Number(existing.seen_count || 0) + 1,
      last_rssi: typeof device.last_rssi === "number" ? device.last_rssi : existing.last_rssi,
      max_rssi: Number.isFinite(maxRssi) ? maxRssi : existing.max_rssi,
      min_rssi: Number.isFinite(minRssi) ? minRssi : existing.min_rssi,
      tx_power: device.tx_power ?? existing.tx_power ?? null,
      manufacturer_ids: Array.isArray(device.manufacturer_ids) ? device.manufacturer_ids : (existing.manufacturer_ids || []),
      manufacturer_data: device.manufacturer_data || existing.manufacturer_data || {},
      service_uuids: Array.isArray(device.service_uuids) ? device.service_uuids : (existing.service_uuids || []),
      service_data: device.service_data || existing.service_data || {},
      match: device.match || existing.match || {},
      activeNow: true,
      locked: !!existing.locked,
      related: existing.related || null
    };
  });

  bleMemory = trimMemoryStore(bleMemory, "ble");
}

function mergeWifiMemory(summaryData) {
  const networks = Array.isArray(summaryData?.networks) ? summaryData.networks : [];
  const now = isoNow();

  Object.values(wifiMemory).forEach((entry) => {
    entry.activeNow = false;
  });

  networks.forEach((network) => {
    const key = getWifiMemoryKey(network);
    if (!key) return;

    const existing = wifiMemory[key] || {};
    const maxSignal = [existing.max_signal, network.max_signal, network.last_signal]
      .filter((v) => typeof v === "number")
      .reduce((acc, v) => Math.max(acc, v), -Infinity);

    const minSignal = [existing.min_signal, network.min_signal, network.last_signal]
      .filter((v) => typeof v === "number")
      .reduce((acc, v) => Math.min(acc, v), Infinity);

    wifiMemory[key] = {
      ...existing,
      key,
      type: "wifi",
      ssid: network.ssid || existing.ssid || "",
      bssid: network.bssid || existing.bssid || "",
      channel: network.channel || existing.channel || "",
      security: network.security || existing.security || "",
      first_seen: existing.first_seen || network.first_seen || network.last_seen || now,
      last_seen: network.last_seen || now,
      seen_count: Number(existing.seen_count || 0) + 1,
      last_signal: typeof network.last_signal === "number" ? network.last_signal : existing.last_signal,
      max_signal: Number.isFinite(maxSignal) ? maxSignal : existing.max_signal,
      min_signal: Number.isFinite(minSignal) ? minSignal : existing.min_signal,
      match: network.match || existing.match || {},
      activeNow: true,
      locked: !!existing.locked,
      related: existing.related || null
    };
  });

  wifiMemory = trimMemoryStore(wifiMemory, "wifi");
}

function buildBleWifiLink(bleEntry, wifiEntry) {
  let score = 0;
  const reasons = [];

  const bleMatch = bleEntry.match || {};
  const wifiMatch = wifiEntry.match || {};

  if (bleMatch.matched && wifiMatch.matched) {
    score += 28;
    reasons.push("both matched");
  }

  if (wifiMatch.family === "flock_exact" || wifiMatch.family === "flock_family") {
    score += 18;
    reasons.push("wifi flock pattern");
  }

  if (["fs_battery", "penguin", "raven", "flock_like", "soundthinking"].includes(bleMatch.family)) {
    score += 18;
    reasons.push(`ble ${bleMatch.family}`);
  }

  if (bleEntry.activeNow && wifiEntry.activeNow) {
    score += 22;
    reasons.push("co-seen live");
  }

  const ageDiffMs = Math.abs(parseTimeMs(bleEntry.last_seen) - parseTimeMs(wifiEntry.last_seen));
  if (ageDiffMs <= 15000) {
    score += 20;
    reasons.push("same time window");
  } else if (ageDiffMs <= 60000) {
    score += 12;
    reasons.push("close time window");
  } else if (ageDiffMs <= 5 * 60000) {
    score += 5;
    reasons.push("recently co-seen");
  }

  const bleProx = bleMatch.proximity || "unknown";
  const wifiProx = wifiMatch.proximity || "unknown";
  const proxDiff = Math.abs(proximityRank(bleProx) - proximityRank(wifiProx));

  if (proxDiff === 0 && proximityRank(bleProx) >= 2) {
    score += 12;
    reasons.push("similar distance");
  } else if (proxDiff === 1) {
    score += 6;
    reasons.push("nearby distance class");
  }

  const bleNameHelpful = isMeaningfulBleName(bleEntry.name, bleEntry.address);
  const wifiNameHelpful = !isHiddenWifiSsid(wifiEntry.ssid);

  if (bleNameHelpful && !wifiNameHelpful) {
    score += 5;
    reasons.push("ble label helps");
  }

  if (!bleNameHelpful && wifiNameHelpful) {
    score += 5;
    reasons.push("wifi label helps");
  }

  let confidence = "none";
  if (score >= 70) confidence = "high";
  else if (score >= 45) confidence = "medium";
  else if (score >= 30) confidence = "low";

  return {
    score,
    confidence,
    reasons
  };
}

function recomputeRelatedLinks() {
  const bleEntries = Object.values(bleMemory);
  const wifiEntries = Object.values(wifiMemory);

  bleEntries.forEach((entry) => {
    entry.related = null;
  });
  wifiEntries.forEach((entry) => {
    entry.related = null;
  });

  bleEntries.forEach((bleEntry) => {
    let best = null;

    wifiEntries.forEach((wifiEntry) => {
      const link = buildBleWifiLink(bleEntry, wifiEntry);
      if (link.confidence === "none") return;

      if (!best || link.score > best.score) {
        best = {
          score: link.score,
          confidence: link.confidence,
          reasons: link.reasons,
          wifiKey: wifiEntry.key,
          label: getWifiDisplayLabel(wifiEntry),
          bssid: wifiEntry.bssid || "",
          hidden: isHiddenWifiSsid(wifiEntry.ssid)
        };
      }
    });

    if (best) {
      bleEntry.related = {
        type: "wifi",
        key: best.wifiKey,
        confidence: best.confidence,
        label: best.label,
        sublabel: best.hidden ? (best.bssid || "Hidden SSID") : (best.bssid || ""),
        reason: best.reasons[0] || "related candidate"
      };
    }
  });

  wifiEntries.forEach((wifiEntry) => {
    let best = null;

    bleEntries.forEach((bleEntry) => {
      const link = buildBleWifiLink(bleEntry, wifiEntry);
      if (link.confidence === "none") return;

      if (!best || link.score > best.score) {
        best = {
          score: link.score,
          confidence: link.confidence,
          reasons: link.reasons,
          bleKey: bleEntry.key,
          label: getBleDisplayLabel(bleEntry),
          address: bleEntry.address || ""
        };
      }
    });

    if (best) {
      wifiEntry.related = {
        type: "ble",
        key: best.bleKey,
        confidence: best.confidence,
        label: best.label,
        sublabel: best.address,
        reason: best.reasons[0] || "related candidate"
      };
    }
  });

  saveAllMemory();
}

function getBleMemoryEntriesSorted() {
  const entries = Object.values(bleMemory);

  entries.sort((a, b) => {
    const aLocked = a.locked ? 1 : 0;
    const bLocked = b.locked ? 1 : 0;
    if (bLocked !== aLocked) return bLocked - aLocked;

    const aActive = a.activeNow ? 1 : 0;
    const bActive = b.activeNow ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    const aConf = confidenceRank(a.match?.confidence);
    const bConf = confidenceRank(b.match?.confidence);
    if (bConf !== aConf) return bConf - aConf;

    const aSig = getBleSignal(a);
    const bSig = getBleSignal(b);
    if (bSig !== aSig) return bSig - aSig;

    return parseTimeMs(b.last_seen) - parseTimeMs(a.last_seen);
  });

  return entries;
}

function getWifiMemoryEntriesSorted() {
  const entries = Object.values(wifiMemory);

  entries.sort((a, b) => {
    const aLocked = a.locked ? 1 : 0;
    const bLocked = b.locked ? 1 : 0;
    if (bLocked !== aLocked) return bLocked - aLocked;

    const aActive = a.activeNow ? 1 : 0;
    const bActive = b.activeNow ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    const aConf = confidenceRank(a.match?.confidence);
    const bConf = confidenceRank(b.match?.confidence);
    if (bConf !== aConf) return bConf - aConf;

    const aSig = getWifiSignal(a);
    const bSig = getWifiSignal(b);
    if (bSig !== aSig) return bSig - aSig;

    return parseTimeMs(b.last_seen) - parseTimeMs(a.last_seen);
  });

  return entries;
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
  if (summary) summary.innerHTML = `<div>${message}</div>`;
  if (eventsBody) eventsBody.innerHTML = "";
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (statusEl) statusEl.textContent = message;
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
  const ctxLocal = ensureAudioContext();
  if (!ctxLocal) return;

  const now = ctxLocal.currentTime;
  const osc = ctxLocal.createOscillator();
  const gain = ctxLocal.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctxLocal.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playTone(freq = 660, duration = 0.08, gainAmount = 0.035, whenOffset = 0) {
  const ctxLocal = ensureAudioContext();
  if (!ctxLocal) return;

  const now = ctxLocal.currentTime + whenOffset;
  const osc = ctxLocal.createOscillator();
  const gain = ctxLocal.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctxLocal.destination);

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
    .map((e) => ({
      ...e,
      offsetHz: Math.abs(Number(e.peakHz) - centerHz)
    }))
    .filter((e) => e.offsetHz <= maxOffset);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.peakDb !== a.peakDb) return b.peakDb - a.peakDb;
    return a.offsetHz - b.offsetHz;
  });

  return candidates[0];
}

function updateProximityUI(state) {
  if (!proximityTarget || !proximityTrend || !proximityStrength || !proximityMeterFill || !proximityCurrentDb || !proximityPeakDb || !proximityModeState) {
    return;
  }

  if (!state) {
    proximityTarget.textContent = selectedHz ? fmtHz(selectedHz) : "No target selected";
    proximityTrend.textContent = "STEADY";
    proximityTrend.className = "big-readout trend-steady";
    proximityStrength.textContent = "0%";
    proximityMeterFill.style.width = "0%";
    proximityCurrentDb.textContent = "Current: -- dB";
    proximityPeakDb.textContent = "Peak: -- dB";

    if (!proximityEnabled?.checked) {
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

  if (!proximityEnabled?.checked) {
    updateProximityUI({
      targetHz,
      normalized: 0,
      currentDb: NaN,
      peakDb: NaN,
      trend: "steady",
      modeText: "Track mode active, proximity off"
    });
    if (proximityCurrentDb) proximityCurrentDb.textContent = "Current: -- dB";
    if (proximityPeakDb) {
      proximityPeakDb.textContent = sessionPeakDb == null
        ? "Peak: -- dB"
        : `Peak: ${sessionPeakDb.toFixed(2)} dB`;
    }
    return;
  }

  const trackedEvent = findTrackedEvent(data.events || [], currentScanner);

  if (!trackedEvent) {
    staleCounter += 1;

    if (hadTrackedHit && staleCounter === 3 && audioEnabled?.checked) {
      alertStaleWarning();
    }

    updateProximityUI(null);
    if (proximityModeState) {
      proximityModeState.textContent = hadTrackedHit
        ? "No valid hit - signal stale"
        : "Waiting for valid tracked hit";
    }
    return;
  }

  const nowMs = Date.now();
  const smoothingN = Number(smoothingCount?.value) || 5;
  const historyN = Number(historyCount?.value) || 20;

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

  if (audioEnabled?.checked) {
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
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!points.length) return;

  const minX = points[0].hz;
  const maxX = points[points.length - 1].hz;
  const minY = Math.min(...points.map((p) => p.db));
  const maxY = Math.max(...points.map((p) => p.db));

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
  if (summary) {
    summary.innerHTML = s ? [
      summaryItem("Rows", s.rows),
      summaryItem("Range", `${fmtHz(s.startHz)} → ${fmtHz(s.stopHz)}`),
      summaryItem("Strongest", `${fmtHz(s.strongestHz)} @ ${s.strongestDb.toFixed(2)} dB`),
      summaryItem("First Seen", s.firstSeen),
      summaryItem("Last Seen", s.lastSeen)
    ].join("") : "<div>No data</div>";
  }

  currentTrace = data.peakTrace || [];
  drawTrace(currentTrace);

  if (eventsBody) {
    eventsBody.innerHTML = (data.events || [])
      .slice()
      .reverse()
      .slice(0, 200)
      .map((e) => `
        <tr>
          <td>${e.timestamp}</td>
          <td>${fmtHz(e.peakHz)}</td>
          <td>${e.peakDb.toFixed(2)}</td>
          <td>${e.medianDb.toFixed(2)}</td>
          <td>${fmtHz(e.startHz)} → ${fmtHz(e.stopHz)}</td>
        </tr>
      `).join("");
  }

  if (statusEl) statusEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  handleProximity(data);
}

function settingsPayload() {
  return {
    relativeSquelchDb: Number(relativeSquelch?.value),
    absoluteFloorDb: Number(absoluteFloor?.value),
    minRepeats: Number(minRepeats?.value),
    clusterWidthHz: Number(clusterWidthHz?.value)
  };
}

function scannerPayload() {
  const startMHz = parseLooseFrequencyToMHz(surveyStartMHz?.value);
  const stopMHz = parseLooseFrequencyToMHz(surveyStopMHz?.value);
  const binKhz = Number(surveyBinKhz?.value);

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

  if (surveyStartMHz) surveyStartMHz.value = fixedStartMHz.toFixed(3);
  if (surveyStopMHz) surveyStopMHz.value = fixedStopMHz.toFixed(3);

  return {
    survey: {
      freqRange: formatSurveyRange(fixedStartMHz, fixedStopMHz, binKhz),
      interval: surveyInterval?.value.trim(),
      window: surveyWindow?.value.trim()
    },
    track: {
      spanHz: Number(trackSpanKhz?.value) * 1000,
      binHz: Number(trackBinKhz?.value) * 1000,
      interval: trackInterval?.value.trim(),
      window: trackWindow?.value.trim()
    }
  };
}

function renderBleEnrichmentHtml(entry) {
  const intel = getIntelForEntry(entry);
  const manufacturerIds = Array.isArray(entry.manufacturer_ids) ? entry.manufacturer_ids : [];
  const serviceUuids = Array.isArray(entry.service_uuids) ? entry.service_uuids : [];
  const txPower = typeof entry.tx_power === "number" ? `${entry.tx_power} dBm` : "--";
  const lastRssi = typeof entry.last_rssi === "number" ? entry.last_rssi : null;
  const pathLoss = (typeof entry.tx_power === "number" && typeof lastRssi === "number")
    ? `${Math.round(entry.tx_power - lastRssi)} dB`
    : "--";

  const manufacturerLabel = manufacturerIds.length
    ? manufacturerIds.slice(0, 3).join(", ")
    : "--";

  const serviceLabel = serviceUuids.length
    ? serviceUuids.slice(0, 2).map(shortUuid).join(", ")
    : "--";

  return `
    <div class="ble-related">
      <div>Co IDs: ${escapeHtml(manufacturerLabel)}</div>
      <div class="ble-sub">UUIDs: ${escapeHtml(String(serviceUuids.length))}${serviceUuids.length ? ` • ${escapeHtml(serviceLabel)}` : ""}</div>
      <div class="ble-sub">Tx: ${escapeHtml(txPower)} • Path loss: ${escapeHtml(pathLoss)}</div>
      <div class="ble-sub">Probe: passive only</div>
      ${renderIntelInlineHtml(intel)}
    </div>
  `;
}

function renderWifiEnrichmentHtml(entry) {
  const intel = getIntelForEntry(entry);
  const match = entry.match || {};
  const passive = match.passive || {};

  const vendor = match.vendorGuess || "--";
  const oui = passive.oui || "--";
  const band = passive.band || "--";
  const channel = passive.channel || entry.channel || "--";
  const security = passive.security || entry.security || "--";
  const hiddenState = passive.hiddenSsid ? "Hidden SSID" : "Visible SSID";

  return `
    <div class="wifi-related">
      <div>Vendor: ${escapeHtml(vendor)}</div>
      <div class="wifi-sub">OUI: ${escapeHtml(oui)} • Band: ${escapeHtml(band)}</div>
      <div class="wifi-sub">Ch: ${escapeHtml(String(channel))} • Sec: ${escapeHtml(String(security))}</div>
      <div class="wifi-sub">${escapeHtml(hiddenState)} • Probe: passive only</div>
      ${renderIntelInlineHtml(intel)}
    </div>
  `;
}

function jsonBlock(value) {
  try {
    return escapeHtml(JSON.stringify(value ?? {}, null, 2));
  } catch {
    return escapeHtml(String(value ?? ""));
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds())
  ].join("");
}

function openDetailDrawer(title, meta, html, detailState = null) {
  selectedDetail = detailState;
  if (!detailDrawer || !detailDrawerTitle || !detailDrawerMeta || !detailDrawerBody) return;

  detailDrawerTitle.textContent = title || "Detail";
  detailDrawerMeta.textContent = meta || "";
  detailDrawerBody.innerHTML = html || "";
  detailDrawer.classList.remove("hidden");
  detailDrawer.setAttribute("aria-hidden", "false");
}

function closeDetailDrawer() {
  selectedDetail = null;
  if (!detailDrawer) return;
  detailDrawer.classList.add("hidden");
  detailDrawer.setAttribute("aria-hidden", "true");
}

function buildBleDetailHtml(entry) {
  const match = entry.match || {};
  const manufacturerIds = Array.isArray(entry.manufacturer_ids) ? entry.manufacturer_ids : [];
  const serviceUuids = Array.isArray(entry.service_uuids) ? entry.service_uuids : [];
  const related = entry.related || null;
  const intel = getIntelForEntry(entry);

  return `
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Identity</h4>
        <div><strong>Name:</strong> ${escapeHtml(getBleDisplayLabel(entry))}</div>
        <div><strong>Address:</strong> ${escapeHtml(entry.address || "--")}</div>
        <div><strong>First seen:</strong> ${escapeHtml(String(entry.first_seen || "--"))}</div>
        <div><strong>Last seen:</strong> ${escapeHtml(String(entry.last_seen || "--"))}</div>
        <div><strong>Seen count:</strong> ${escapeHtml(String(entry.seen_count ?? 0))}</div>
      </div>

      <div class="detail-block">
        <h4>Signal</h4>
        <div><strong>Last RSSI:</strong> ${escapeHtml(typeof entry.last_rssi === "number" ? `${entry.last_rssi} dBm` : "--")}</div>
        <div><strong>Max RSSI:</strong> ${escapeHtml(typeof entry.max_rssi === "number" ? `${entry.max_rssi} dBm` : "--")}</div>
        <div><strong>Min RSSI:</strong> ${escapeHtml(typeof entry.min_rssi === "number" ? `${entry.min_rssi} dBm` : "--")}</div>
        <div><strong>TX power:</strong> ${escapeHtml(typeof entry.tx_power === "number" ? `${entry.tx_power} dBm` : "--")}</div>
        <div><strong>Distance bucket:</strong> ${escapeHtml(match.proximityLabel || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Classification</h4>
        <div><strong>Family:</strong> ${escapeHtml(match.family || "--")}</div>
        <div><strong>Confidence:</strong> ${escapeHtml(match.confidence || "--")}</div>
        <div><strong>Matched:</strong> ${escapeHtml(String(Boolean(match.matched)))}</div>
        <div><strong>Reasons:</strong> ${escapeHtml(Array.isArray(match.reasons) ? match.reasons.join(" • ") : "--")}</div>
        <div><strong>Firmware guess:</strong> ${escapeHtml(match.ravenFirmwareGuess || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Enrichment</h4>
        <div><strong>Company IDs:</strong> ${escapeHtml(manufacturerIds.length ? manufacturerIds.join(", ") : "--")}</div>
        <div><strong>UUID count:</strong> ${escapeHtml(String(serviceUuids.length))}</div>
        <div><strong>UUIDs:</strong> ${escapeHtml(serviceUuids.length ? serviceUuids.join(", ") : "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Related</h4>
        <div><strong>Type:</strong> ${escapeHtml(related?.type || "--")}</div>
        <div><strong>Label:</strong> ${escapeHtml(related?.label || "--")}</div>
        <div><strong>Confidence:</strong> ${escapeHtml(related?.confidence || "--")}</div>
        <div><strong>Reason:</strong> ${escapeHtml(related?.reason || "--")}</div>
        <div><strong>Sublabel:</strong> ${escapeHtml(related?.sublabel || "--")}</div>
      </div>

      ${buildIntelDetailHtml(intel)}

      <div class="detail-block">
        <h4>Raw match</h4>
        <pre>${jsonBlock(match)}</pre>
      </div>

      <div class="detail-block">
        <h4>Raw entry</h4>
        <pre>${jsonBlock(entry)}</pre>
      </div>
    </div>
  `;
}

function buildWifiDetailHtml(entry) {
  const match = entry.match || {};
  const passive = match.passive || {};
  const related = entry.related || null;
  const intel = getIntelForEntry(entry);

  return `
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Identity</h4>
        <div><strong>SSID:</strong> ${escapeHtml(entry.ssid || "(hidden)")}</div>
        <div><strong>BSSID:</strong> ${escapeHtml(entry.bssid || "--")}</div>
        <div><strong>First seen:</strong> ${escapeHtml(String(entry.first_seen || "--"))}</div>
        <div><strong>Last seen:</strong> ${escapeHtml(String(entry.last_seen || "--"))}</div>
        <div><strong>Seen count:</strong> ${escapeHtml(String(entry.seen_count ?? 0))}</div>
      </div>

      <div class="detail-block">
        <h4>Signal</h4>
        <div><strong>Last signal:</strong> ${escapeHtml(typeof entry.last_signal === "number" ? `${entry.last_signal}%` : "--")}</div>
        <div><strong>Max signal:</strong> ${escapeHtml(typeof entry.max_signal === "number" ? `${entry.max_signal}%` : "--")}</div>
        <div><strong>Min signal:</strong> ${escapeHtml(typeof entry.min_signal === "number" ? `${entry.min_signal}%` : "--")}</div>
        <div><strong>Distance bucket:</strong> ${escapeHtml(match.proximityLabel || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Classification</h4>
        <div><strong>Label:</strong> ${escapeHtml(match.label || "--")}</div>
        <div><strong>Family:</strong> ${escapeHtml(match.family || "--")}</div>
        <div><strong>Confidence:</strong> ${escapeHtml(match.confidence || "--")}</div>
        <div><strong>Matched:</strong> ${escapeHtml(String(Boolean(match.matched)))}</div>
        <div><strong>Reasons:</strong> ${escapeHtml(Array.isArray(match.reasons) ? match.reasons.join(" • ") : "--")}</div>
        <div><strong>Exclusions:</strong> ${escapeHtml(Array.isArray(match.exclusions) ? match.exclusions.join(" • ") : "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Enrichment</h4>
        <div><strong>Vendor:</strong> ${escapeHtml(match.vendorGuess || "--")}</div>
        <div><strong>OUI:</strong> ${escapeHtml(passive.oui || "--")}</div>
        <div><strong>Band:</strong> ${escapeHtml(passive.band || "--")}</div>
        <div><strong>Channel:</strong> ${escapeHtml(String(passive.channel || entry.channel || "--"))}</div>
        <div><strong>Security:</strong> ${escapeHtml(String(passive.security || entry.security || "--"))}</div>
        <div><strong>Hidden:</strong> ${escapeHtml(String(Boolean(passive.hiddenSsid)))}</div>
      </div>

      <div class="detail-block">
        <h4>Related</h4>
        <div><strong>Type:</strong> ${escapeHtml(related?.type || "--")}</div>
        <div><strong>Label:</strong> ${escapeHtml(related?.label || "--")}</div>
        <div><strong>Confidence:</strong> ${escapeHtml(related?.confidence || "--")}</div>
        <div><strong>Reason:</strong> ${escapeHtml(related?.reason || "--")}</div>
        <div><strong>Sublabel:</strong> ${escapeHtml(related?.sublabel || "--")}</div>
      </div>

      ${buildIntelDetailHtml(intel)}

      <div class="detail-block">
        <h4>Probe</h4>
        <pre>${jsonBlock(match.probe || {})}</pre>
      </div>

      <div class="detail-block">
        <h4>Raw match</h4>
        <pre>${jsonBlock(match)}</pre>
      </div>

      <div class="detail-block">
        <h4>Raw entry</h4>
        <pre>${jsonBlock(entry)}</pre>
      </div>
    </div>
  `;
}

function openBleDetail(key) {
  const entry = bleMemory[key];
  if (!entry) return;

  const meta = `${entry.address || "--"} • ${entry.match?.family || "unknown"} • ${entry.match?.confidence || "none"}`;
  openDetailDrawer(
    getBleDisplayLabel(entry),
    meta,
    buildBleDetailHtml(entry),
    { type: "ble", key }
  );
}

function openWifiDetail(key) {
  const entry = wifiMemory[key];
  if (!entry) return;

  const meta = `${entry.bssid || "--"} • ${entry.match?.label || "unknown"} • ${entry.match?.confidence || "none"}`;
  openDetailDrawer(
    getWifiDisplayLabel(entry),
    meta,
    buildWifiDetailHtml(entry),
    { type: "wifi", key }
  );
}

function exportSessionBundle() {
  const name = String(sessionName?.value || "").trim();
  const ts = fileTimestamp();
  const safeName = name ? `${name.replace(/[^a-z0-9-_]+/gi, "-")}-` : "";
  const filename = `rfv2-session-${safeName}${ts}.json`;

  const bundle = {
    exportedAt: new Date().toISOString(),
    sessionName: name || null,
    currentScanner,
    currentSettings,
    currentListenPipeline,
    ble: {
      status: lastBleStatus,
      summary: lastBleSummary,
      memory: bleMemory
    },
    wifi: {
      status: lastWifiStatus,
      summary: lastWifiSummary,
      memory: wifiMemory
    },
    intel: currentIntel,
    fusion: currentFusion,
    selectedDetail
  };

  downloadJson(filename, bundle);
}

function populateSettings(settings) {
  currentSettings = settings;
  if (relativeSquelch) relativeSquelch.value = settings.relativeSquelchDb;
  if (absoluteFloor) absoluteFloor.value = settings.absoluteFloorDb;
  if (minRepeats) minRepeats.value = String(settings.minRepeats);
  if (clusterWidthHz) clusterWidthHz.value = String(settings.clusterWidthHz);
  if (viewerOrigin) viewerOrigin.textContent = `Viewer: ${window.location.origin}`;
}

function stopBrowserAudio(resetStatus = true) {
  if (!listenBrowserAudio) return;

  try {
    listenBrowserAudio.pause();
  } catch {}

  browserAudioActive = false;

  try {
    listenBrowserAudio.removeAttribute("src");
    listenBrowserAudio.load();
  } catch {}

  if (resetStatus) {
    setListenPipelineStatus("Browser audio stopped", "good");
  }
}

function ensureBrowserAudioSrc(forceRefresh = false) {
  if (!listenBrowserAudio) return false;

  const shouldHaveStream =
    currentScanner &&
    currentScanner.mode === "listen" &&
    currentScanner.listen &&
    currentScanner.listen.enabled;

  if (!shouldHaveStream) return false;

  const nextSrc = `/api/listen/audio?t=${Date.now()}`;
  if (forceRefresh || !listenBrowserAudio.getAttribute("src")) {
    listenBrowserAudio.src = nextSrc;
  }
  return true;
}

async function playBrowserAudio() {
  if (!listenBrowserAudio) return;

  if (!currentScanner || currentScanner.mode !== "listen") {
    setListenPipelineStatus("Start listen mode first", "warn");
    return;
  }

  ensureBrowserAudioSrc(true);

  try {
    await listenBrowserAudio.play();
    browserAudioActive = true;
    setListenPipelineStatus("Browser audio playing", "good");
  } catch (err) {
    browserAudioActive = false;
    setListenPipelineStatus(`Browser audio failed: ${err.message}`, "bad");
  }
}

function renderListenLog(lines) {
  if (!listenLog) return;
  if (!Array.isArray(lines) || !lines.length) {
    listenLog.textContent = "No log entries yet.";
    return;
  }
  listenLog.textContent = lines.join("\n");
  listenLog.scrollTop = listenLog.scrollHeight;
}

function renderListenPipeline(status) {
  currentListenPipeline = status || null;

  if (!status) {
    if (listenPipelineStateBadge) listenPipelineStateBadge.textContent = "State: idle";
    if (listenClientCountBadge) listenClientCountBadge.textContent = "Clients: 0";
    if (listenAudioMetaBadge) listenAudioMetaBadge.textContent = "Audio: --";
    if (listenPipelineMeta) listenPipelineMeta.textContent = "No pipeline info yet";
    setListenPipelineStatus("Pipeline idle", "good");
    return;
  }

  const state = status.state || "unknown";
  const clientCount = Number(status.clients || 0);
  const freq = status.frequency || "--";
  const mod = status.modulation || "--";
  const sampleRate = status.sampleRate ? `${status.sampleRate} Hz` : "--";
  const device = status.audioDevice || "--";

  if (listenPipelineStateBadge) listenPipelineStateBadge.textContent = `State: ${state}`;
  if (listenClientCountBadge) listenClientCountBadge.textContent = `Clients: ${clientCount}`;
  if (listenAudioMetaBadge) listenAudioMetaBadge.textContent = `Audio: ${mod} / ${sampleRate}`;
  if (listenPipelineMeta) {
    listenPipelineMeta.textContent = `Freq: ${freq} | Device: ${device} | Updated: ${status.updatedAt || "--"}`;
  }

  if (state === "running") {
    setListenPipelineStatus(status.message || "Pipeline running", "good");
  } else if (state === "starting") {
    setListenPipelineStatus(status.message || "Pipeline starting", "warn");
  } else if (state === "error") {
    setListenPipelineStatus(status.message || "Pipeline error", "bad");
  } else {
    setListenPipelineStatus(status.message || "Pipeline idle", "good");
  }
}

async function loadListenDiagnostics() {
  if (!listenPipelineStatus) return;

  try {
    const [statusData, logData] = await Promise.all([
      fetchJson("/api/listen/status"),
      fetchJson("/api/listen/log")
    ]);

    renderListenPipeline(statusData.status);
    renderListenLog(logData.lines);

    if ((!currentScanner || currentScanner.mode !== "listen") && browserAudioActive) {
      stopBrowserAudio(false);
    }
  } catch (err) {
    setListenPipelineStatus(`Diagnostics failed: ${err.message}`, "bad");
  }
}


async function loadIntelData() {
  try {
    const data = await fetchJson("/api/intel");
    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.store?.items)
        ? data.store.items
        : [];
    currentIntel = {
      items,
      summary: data.summary || null,
      byKey: buildIntelIndex(items)
    };
    updateIntelUi();
    // Invalidate caches so the next timer-driven render picks up intel changes.
    // Avoids triggering extra full renders that cause visible flicker.
    lastBleTableHtml = "";
    lastWifiTableHtml = "";
  } catch (err) {
    if (intelStateBadge) intelStateBadge.textContent = "Intel: error";
    if (intelStatusText) intelStatusText.textContent = `Intel load failed: ${err.message}`;
  }
}

function updateIntelUi() {
  const summary = currentIntel.summary || { total: 0, reachable: 0, exposed: 0, byExposure: { E0: 0, E1: 0, E2: 0, E3: 0, E4: 0 } };
  if (intelStateBadge) intelStateBadge.textContent = currentIntel.items.length ? "Intel: loaded" : "Intel: none";
  if (intelEntriesBadge) intelEntriesBadge.textContent = `Entries: ${summary.total || 0}`;
  if (intelReachableBadge) intelReachableBadge.textContent = `Reachable: ${summary.reachable || 0}`;
  if (intelExposureBadge) intelExposureBadge.textContent = `E1-E4: ${summary.exposed || 0}`;
  if (intelStatusText) intelStatusText.textContent = currentIntel.items.length
    ? "Authorized metadata-only intel is being merged into nearby BLE/Wi-Fi hits."
    : "No authorized metadata-only intel loaded yet.";
  if (intelUpdatedText) {
    intelUpdatedText.textContent = currentIntel.items.length
      ? `Last intel refresh: ${fmtShortTime(new Date().toISOString())}`
      : 'Add metadata-only intel into data/device-intel.json or POST it to /api/intel/upsert.';
  }
}

function updateIntelTimer() {
  if (intelTimer) clearInterval(intelTimer);
  intelTimer = null;
  intelTimer = setInterval(loadIntelData, 5000);
}

function buildFusionDetailHtml(cluster) {
  if (!cluster) {
    return `<div class="detail-block"><h4>Fusion cluster</h4><div>No cluster data available.</div></div>`;
  }

  const modalities = [];
  if (cluster.modalityCounts?.wifi) modalities.push(`Wi-Fi ${cluster.modalityCounts.wifi}`);
  if (cluster.modalityCounts?.ble) modalities.push(`BLE ${cluster.modalityCounts.ble}`);
  if (cluster.modalityCounts?.intel) modalities.push(`Intel ${cluster.modalityCounts.intel}`);

  const relations = Array.isArray(cluster.relations) ? cluster.relations : [];
  const relationLines = relations.length
    ? relations.map((relation) => `<div><strong>${escapeHtml(relation.left || "left")}</strong> ↔ <strong>${escapeHtml(relation.right || "right")}</strong> — ${escapeHtml((relation.reasons || []).join(" • ") || "linked")}</div>`).join("")
    : `<div>No explicit pairwise relations were retained.</div>`;

  return `
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Overview</h4>
        <div><strong>Label:</strong> ${escapeHtml(cluster.label || "--")}</div>
        <div><strong>Family:</strong> ${escapeHtml(cluster.family || "--")}</div>
        <div><strong>Confidence:</strong> ${escapeHtml(cluster.confidence || "none")}</div>
        <div><strong>Score:</strong> ${escapeHtml(String(cluster.score ?? 0))}</div>
        <div><strong>Modalities:</strong> ${escapeHtml(modalities.join(" + ") || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Summary</h4>
        <div>${escapeHtml(cluster.summary || "--")}</div>
        <div style="margin-top:8px;"><strong>Primary proximity:</strong> ${escapeHtml(cluster.primaryProximity || "--")}</div>
        <div><strong>Exposure:</strong> ${escapeHtml(cluster.maxExposure || "E0")}</div>
        <div><strong>Reachable:</strong> ${escapeHtml(cluster.reachable == null ? "unknown" : String(cluster.reachable))}</div>
        <div><strong>Surfaces:</strong> ${escapeHtml(cluster.surfaceSummary || "--")}</div>
        ${cluster.probeData?.deviceClass ? `<div><strong>Device class:</strong> ${escapeHtml(cluster.probeData.deviceClass)}${cluster.probeData.deviceVendor ? " (" + escapeHtml(cluster.probeData.deviceVendor) + ")" : ""}</div>` : ""}
      </div>

      <div class="detail-block">
        <h4>Identifiers</h4>
        <div><strong>Wi-Fi:</strong> ${escapeHtml((cluster.identifiers?.wifi || []).join(" • ") || "--")}</div>
        <div><strong>BLE:</strong> ${escapeHtml((cluster.identifiers?.ble || []).join(" • ") || "--")}</div>
        <div><strong>Intel:</strong> ${escapeHtml((cluster.identifiers?.intel || []).join(" • ") || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Evidence</h4>
        <div>${escapeHtml((cluster.evidence || []).join(" • ") || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Authorized checks</h4>
        <div>${escapeHtml((cluster.authorizedChecks || []).join(" • ") || "--")}</div>
      </div>

      <div class="detail-block">
        <h4>Relations</h4>
        ${relationLines}
      </div>

      ${cluster.probeData?.hasProbeData ? `
      <div class="detail-block">
        <h4>Probe Data</h4>
        ${cluster.probeData.osGuess ? `<div><strong>OS Guess:</strong> ${escapeHtml(cluster.probeData.osGuess)}</div>` : ""}
        ${cluster.probeData.deviceClass ? `<div><strong>Device Class:</strong> ${escapeHtml(cluster.probeData.deviceClass)}${cluster.probeData.deviceVendor ? " (" + escapeHtml(cluster.probeData.deviceVendor) + ")" : ""}</div>` : ""}
        ${(cluster.probeData.httpTitles || []).length ? `<div><strong>HTTP Titles:</strong> ${escapeHtml(cluster.probeData.httpTitles.join(" | "))}</div>` : ""}
        ${cluster.probeData.rtspMethods ? `<div><strong>RTSP Methods:</strong> ${escapeHtml(cluster.probeData.rtspMethods)}</div>` : ""}
        ${cluster.probeData.mqttStatus ? `<div><strong>MQTT Status:</strong> ${escapeHtml(cluster.probeData.mqttStatus)}</div>` : ""}
        ${(cluster.probeData.services || []).length ? `<div><strong>Services:</strong> ${escapeHtml(cluster.probeData.services.map((s) => `${s.port}/${s.version || "open"}`).join(", "))}</div>` : ""}
        ${(cluster.probeData.bannerSnippets || []).length ? `<div style="margin-top:4px;"><strong>Banners:</strong></div>${cluster.probeData.bannerSnippets.map((b) => `<div class="wifi-sub">${escapeHtml(b.port + ": " + b.snippet)}</div>`).join("")}` : ""}
        ${(cluster.probeData.tlsCerts || []).length ? `<div style="margin-top:4px;"><strong>TLS Certificates:</strong></div>${cluster.probeData.tlsCerts.map((c) => `<div class="wifi-sub">${escapeHtml(c)}</div>`).join("")}` : ""}
        ${cluster.probeData.portDiff?.previousScan ? `
        <div style="margin-top:4px;"><strong>Port Changes</strong> (since ${escapeHtml(cluster.probeData.portDiff.previousScan.slice(0, 16))})</div>
        ${(cluster.probeData.portDiff.newPorts || []).length ? `<div style="color:var(--bad);">New ports: ${escapeHtml(cluster.probeData.portDiff.newPorts.join(", "))}</div>` : ""}
        ${(cluster.probeData.portDiff.closedPorts || []).length ? `<div style="color:var(--good);">Closed ports: ${escapeHtml(cluster.probeData.portDiff.closedPorts.join(", "))}</div>` : ""}
        ${(cluster.probeData.portDiff.changedVersions || []).length ? `<div>Version changes: ${cluster.probeData.portDiff.changedVersions.map((v) => escapeHtml(`${v.port}: ${v.was} → ${v.now}`)).join(", ")}</div>` : ""}
        ` : ""}
      </div>
      ` : ""}

      <div class="detail-block">
        <h4>Raw cluster</h4>
        <pre>${jsonBlock(cluster)}</pre>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   Network Probe — Discovery, Scanning, Rendering
-------------------------------------------------------- */

function renderProbeStatus(data) {
  if (!data) return;

  const probe = data.probe || {};
  const discovery = data.discovery || {};
  const config = data.config || {};
  const hosts = discovery.hosts || [];
  const resultCount = data.resultCount || 0;

  currentProbe.status = probe;
  currentProbe.discovery = discovery;

  if (probeStateBadge) probeStateBadge.textContent = `Probe: ${probe.status || "idle"}`;
  if (probeHostsBadge) probeHostsBadge.textContent = `Hosts: ${hosts.length}`;
  if (probeLastDiscoveryBadge) probeLastDiscoveryBadge.textContent = `Last discovery: ${probe.lastDiscovery ? fmtShortTime(probe.lastDiscovery) : "--"}`;
  if (probeLastScanBadge) probeLastScanBadge.textContent = `Last scan: ${probe.lastScan ? fmtShortTime(probe.lastScan) : "--"}`;
  if (probeStatusText) probeStatusText.textContent = probe.message || "No probe activity yet.";

  if (probeAutoToggle) probeAutoToggle.checked = !!config.enabled;
  if (probeAutoDiscoverToggle) probeAutoDiscoverToggle.checked = !!config.autoDiscover;
  if (probeAutoScanToggle) probeAutoScanToggle.checked = !!config.autoScan;
}

function renderProbeResults(probeResults) {
  if (!probeHostsBody) return;

  currentProbe.results = probeResults;
  const discovery = currentProbe.discovery || {};
  const discoveredHosts = discovery.hosts || [];
  const scannedHosts = (probeResults && probeResults.hosts) ? probeResults.hosts : {};

  // Merge discovered hosts with scan results
  const allIps = new Set([
    ...discoveredHosts.map((h) => h.ip),
    ...Object.keys(scannedHosts)
  ]);

  if (!allIps.size) {
    probeHostsBody.innerHTML = `<tr><td colspan="9" class="muted">No hosts discovered yet.</td></tr>`;
    return;
  }

  let totalOpenPorts = 0;
  const rows = [];

  for (const ip of allIps) {
    const discovered = discoveredHosts.find((h) => h.ip === ip) || {};
    const scanned = scannedHosts[ip] || null;
    const openPorts = scanned ? scanned.openPorts || [] : [];
    totalOpenPorts += openPorts.length;

    const mac = discovered.mac || (scanned && scanned.mac) || "--";
    const hostname = discovered.hostname || (scanned && scanned.hostname) || "--";
    const vendor = discovered.vendor || "--";

    const portList = openPorts.map((p) => String(p.port)).join(", ") || "--";
    const serviceList = openPorts
      .map((p) => p.service ? p.service.toUpperCase() : `${p.port}`)
      .slice(0, 4)
      .join(", ") || "--";

    const bannerSnippets = openPorts
      .filter((p) => p.version || p.banner)
      .map((p) => p.version || (p.banner ? p.banner.slice(0, 40).replace(/[\r\n]+/g, " ") : ""))
      .filter(Boolean)
      .slice(0, 2)
      .join("; ") || "--";

    const lastScanned = scanned ? fmtShortTime(scanned.scanCompleted || scanned.scanStarted) : "--";

    rows.push(`
      <tr data-probe-ip="${escapeHtml(ip)}">
        <td>${escapeHtml(ip)}</td>
        <td><span class="wifi-sub">${escapeHtml(mac)}</span></td>
        <td>${escapeHtml(hostname)}</td>
        <td><span class="wifi-sub">${escapeHtml(vendor)}</span></td>
        <td>${escapeHtml(portList)}</td>
        <td>${escapeHtml(serviceList)}</td>
        <td><span class="wifi-sub">${escapeHtml(bannerSnippets)}</span></td>
        <td><span class="wifi-sub">${escapeHtml(lastScanned)}</span></td>
        <td><button class="probe-scan-btn" data-scan-ip="${escapeHtml(ip)}" type="button" style="font-size:11px; padding:2px 8px;">Scan</button></td>
      </tr>
    `);
  }

  if (probePortsBadge) probePortsBadge.textContent = `Open ports: ${totalOpenPorts}`;
  probeHostsBody.innerHTML = rows.join("");
}

function buildProbeDetailHtml(ip) {
  const scanned = currentProbe.results && currentProbe.results.hosts ? currentProbe.results.hosts[ip] : null;
  const discovered = (currentProbe.discovery?.hosts || []).find((h) => h.ip === ip);

  if (!scanned && !discovered) {
    return `<div class="detail-block"><h4>Host ${escapeHtml(ip)}</h4><div>No data available.</div></div>`;
  }

  const openPorts = scanned ? scanned.openPorts || [] : [];

  const portRows = openPorts.map((p) => {
    const svc = p.service ? p.service.toUpperCase() : "?";
    const ver = p.version || "--";
    const banner = p.banner ? escapeHtml(p.banner.slice(0, 200).replace(/[\r\n]+/g, " ")) : "--";
    const cert = p.tlsCert
      ? `<div style="margin-top:4px;font-size:11px;"><strong>TLS:</strong> ${escapeHtml(p.tlsCert.subject?.CN || "?")} (issuer: ${escapeHtml(p.tlsCert.issuer?.O || p.tlsCert.issuer?.CN || "?")}, expires: ${escapeHtml(p.tlsCert.validTo || "?")}${p.tlsCert.sans ? `, SANs: ${escapeHtml(p.tlsCert.sans.slice(0, 80))}` : ""})</div>`
      : "";
    const headers = p.headers
      ? `<div style="margin-top:4px;font-size:11px;"><strong>Headers:</strong> ${escapeHtml(Object.entries(p.headers).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(" | ").slice(0, 200))}</div>`
      : "";

    return `
      <div style="padding:6px 0; border-bottom:1px solid var(--line);">
        <strong>${escapeHtml(String(p.port))}/${svc}</strong> — ${escapeHtml(ver)} <span class="wifi-sub">(${p.responseTimeMs || 0}ms)</span>
        ${banner !== "--" ? `<div style="margin-top:4px;font-size:11px;color:var(--muted);"><strong>Banner:</strong> ${banner}</div>` : ""}
        ${cert}
        ${headers}
      </div>
    `;
  }).join("");

  return `
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Host Info</h4>
        <div><strong>IP:</strong> ${escapeHtml(ip)}</div>
        <div><strong>MAC:</strong> ${escapeHtml(discovered?.mac || scanned?.mac || "--")}</div>
        <div><strong>Hostname:</strong> ${escapeHtml(discovered?.hostname || scanned?.hostname || "--")}</div>
        <div><strong>Vendor:</strong> ${escapeHtml(discovered?.vendor || "--")}</div>
        ${scanned ? `<div><strong>Scan duration:</strong> ${scanned.scanDurationMs || 0}ms</div>` : ""}
        ${scanned ? `<div><strong>Scanned:</strong> ${escapeHtml(scanned.scanCompleted || "--")}</div>` : ""}
      </div>

      <div class="detail-block">
        <h4>Open Ports (${openPorts.length})</h4>
        ${portRows || "<div>No open ports found.</div>"}
      </div>

      ${scanned ? `<div class="detail-block"><h4>Raw scan result</h4><pre>${jsonBlock(scanned)}</pre></div>` : ""}
    </div>
  `;
}

function openProbeDetail(ip) {
  if (!ip) return;
  const discovered = (currentProbe.discovery?.hosts || []).find((h) => h.ip === ip);
  const meta = discovered ? `${discovered.vendor || "Unknown"} • ${discovered.mac || ""}` : ip;
  openDetailDrawer(
    `Host: ${ip}`,
    meta,
    buildProbeDetailHtml(ip),
    { type: "probe", key: ip }
  );
}

async function loadProbeStatus() {
  if (!probeHostsBody && !probeStateBadge) return;
  try {
    const data = await fetchJson("/api/probe/status");
    renderProbeStatus(data);
  } catch (err) {
    if (probeStateBadge) probeStateBadge.textContent = "Probe: error";
    if (probeStatusText) probeStatusText.textContent = `Probe status error: ${err.message}`;
  }
}

async function loadProbeResults() {
  if (!probeHostsBody) return;
  try {
    const data = await fetchJson("/api/probe/results");
    renderProbeResults(data);
  } catch (_) { /* best effort */ }
}

async function triggerDiscovery() {
  if (probeStatusText) probeStatusText.textContent = "Discovering hosts on local network...";
  if (probeStateBadge) probeStateBadge.textContent = "Probe: discovering";
  try {
    const data = await fetchJson("/api/probe/discover", { method: "POST" });
    if (data.ok) {
      if (probeStatusText) probeStatusText.textContent = `Discovered ${data.discovery?.hostCount || 0} hosts.`;
      await loadProbeStatus();
      await loadProbeResults();
    } else {
      if (probeStatusText) probeStatusText.textContent = `Discovery failed: ${data.error || "unknown"}`;
    }
  } catch (err) {
    if (probeStatusText) probeStatusText.textContent = `Discovery error: ${err.message}`;
  }
}

async function triggerScan(target) {
  const label = target === "all" ? "all hosts" : target;
  if (probeStatusText) probeStatusText.textContent = `Scanning ${label}...`;
  if (probeStateBadge) probeStateBadge.textContent = "Probe: scanning";
  try {
    const body = target === "all" ? { target: "all" } : { target };
    const data = await fetchJson("/api/probe/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (data.ok) {
      const portCount = (data.results || []).reduce((sum, r) => sum + (r.openPorts || []).length, 0);
      if (probeStatusText) probeStatusText.textContent = `Scan complete: ${data.results?.length || 0} host(s), ${portCount} open port(s). ${data.intelItemsCreated || 0} intel items created.`;
      await loadProbeStatus();
      await loadProbeResults();
      // Refresh fusion to pick up new intel
      if (typeof loadFusionData === "function") loadFusionData();
      if (typeof loadIntelData === "function") loadIntelData();
    } else {
      if (probeStatusText) probeStatusText.textContent = `Scan failed: ${data.error || "unknown"}`;
    }
  } catch (err) {
    if (probeStatusText) probeStatusText.textContent = `Scan error: ${err.message}`;
  }
}

async function triggerClusterProbe(clusterIdOrAll) {
  const label = clusterIdOrAll === "all" ? "all clusters" : clusterIdOrAll;
  if (fusionProbeBadge) { fusionProbeBadge.style.display = ""; fusionProbeBadge.textContent = `Probe: scanning ${label}...`; }
  if (fusionProbeAllBtn) fusionProbeAllBtn.disabled = true;
  try {
    const body = clusterIdOrAll === "all"
      ? { clusterIds: "all" }
      : { clusterIds: [clusterIdOrAll] };
    const data = await fetchJson("/api/probe/cluster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (data.ok) {
      const portCount = (data.results || []).reduce((sum, r) => sum + (r.openPorts || []).length, 0);
      if (fusionProbeBadge) fusionProbeBadge.textContent = `Probe: ${data.targetsScanned || 0} scanned, ${portCount} ports`;
      loadFusionData();
      loadIntelData();
    } else {
      if (fusionProbeBadge) fusionProbeBadge.textContent = `Probe: ${data.message || data.error || "no targets"}`;
    }
  } catch (err) {
    if (fusionProbeBadge) fusionProbeBadge.textContent = `Probe error: ${err.message}`;
  } finally {
    if (fusionProbeAllBtn) fusionProbeAllBtn.disabled = false;
  }
}

async function toggleAutoProbe(field, value) {
  try {
    const body = {};
    body[field] = value;
    if (field === "enabled" && value) {
      body.autoDiscover = true;
      body.autoScan = true;
    }
    await fetchJson("/api/probe/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await loadProbeStatus();
  } catch (err) {
    if (probeStatusText) probeStatusText.textContent = `Auto-probe toggle error: ${err.message}`;
  }
}

function updateProbeTimer() {
  if (probeTimer) clearInterval(probeTimer);
  probeTimer = null;
  if (probeHostsBody || probeStateBadge) {
    probeTimer = setInterval(async () => {
      await loadProbeStatus();
      await loadProbeResults();
    }, 8000);
  }
}

function openFusionDetail(clusterId) {
  const cluster = (currentFusion.clusters || []).find((item) => item.clusterId === clusterId);
  if (!cluster) return;

  const meta = `${cluster.family || "unknown"} • ${cluster.confidence || "none"} • score ${cluster.score ?? 0}`;
  openDetailDrawer(
    cluster.label || clusterId,
    meta,
    buildFusionDetailHtml(cluster),
    { type: "fusion", key: clusterId }
  );
}

let fusionSearchQuery = "";
let fusionSortKey = "score";
let fusionSortDir = "desc";
let fusionPage = 0;
const FUSION_PAGE_SIZE = 20;
const fusionLockedRows = new Set();

function matchesFusionSearch(cluster, query) {
  if (!query) return true;
  const tokens = query.toLowerCase().split(/\s+/);
  const filters = {};
  const freeText = [];

  for (const tok of tokens) {
    const sep = tok.indexOf(":");
    if (sep > 0) {
      const key = tok.slice(0, sep);
      const val = tok.slice(sep + 1);
      if (["port", "service", "product", "os", "title", "deviceclass", "family", "exposure", "confidence"].includes(key)) {
        filters[key] = val;
        continue;
      }
    }
    freeText.push(tok);
  }

  const pd = cluster.probeData || {};
  const allPorts = (cluster.signals?.intel || []).flatMap((i) => (i.servicePorts || []).map(String));
  const allBanners = (cluster.signals?.intel || []).flatMap((i) => (i.ports || []).map((p) => [p.banner, p.version, p.httpTitle].filter(Boolean).join(" "))).join(" ").toLowerCase();
  const allServices = (cluster.signals?.intel || []).flatMap((i) => (i.ports || []).map((p) => p.service || "")).join(" ").toLowerCase();

  if (filters.port && !allPorts.includes(filters.port)) return false;
  if (filters.service && !allServices.includes(filters.service)) return false;
  if (filters.product && !allBanners.includes(filters.product)) return false;
  if (filters.os && !(pd.osGuess || "").toLowerCase().includes(filters.os)) return false;
  if (filters.title && !(pd.httpTitles || []).some((t) => t.toLowerCase().includes(filters.title))) return false;
  if (filters.deviceclass && !(pd.deviceClass || "").toLowerCase().includes(filters.deviceclass)) return false;
  if (filters.family && !(cluster.family || "").toLowerCase().includes(filters.family)) return false;
  if (filters.exposure && !(cluster.maxExposure || "").toLowerCase().includes(filters.exposure)) return false;
  if (filters.confidence && !(cluster.confidence || "").toLowerCase().includes(filters.confidence)) return false;

  if (freeText.length) {
    const haystack = [
      cluster.label, cluster.family, cluster.summary,
      pd.deviceClass, pd.deviceVendor, pd.osGuess,
      ...(pd.httpTitles || []),
      ...(cluster.identifiers?.wifi || []),
      ...(cluster.identifiers?.ble || []),
      ...(cluster.identifiers?.intel || []),
      allBanners
    ].filter(Boolean).join(" ").toLowerCase();
    const free = freeText.join(" ");
    if (!haystack.includes(free)) return false;
  }

  return true;
}

function renderFusionData(fusion) {
  currentFusion = {
    clusters: Array.isArray(fusion?.clusters) ? fusion.clusters : [],
    summary: fusion?.summary || null,
    updatedAt: fusion?.updatedAt || null
  };

  const summary = currentFusion.summary || {
    totalClusters: 0,
    multiSignal: 0,
    withIntel: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0
  };

  if (fusionStateBadge) fusionStateBadge.textContent = currentFusion.clusters.length ? "Fusion: ready" : "Fusion: idle";
  if (fusionClustersBadge) fusionClustersBadge.textContent = `Clusters: ${summary.totalClusters || 0}`;
  if (fusionMultiSignalBadge) fusionMultiSignalBadge.textContent = `Multi-signal: ${summary.multiSignal || 0}`;
  if (fusionIntelCoverageBadge) fusionIntelCoverageBadge.textContent = `With intel: ${summary.withIntel || 0}`;
  if (fusionConfidenceBadge) {
    fusionConfidenceBadge.textContent = `H/M/L: ${summary.highConfidence || 0}/${summary.mediumConfidence || 0}/${summary.lowConfidence || 0}`;
  }

  if (fusionStatusText) {
    fusionStatusText.textContent = currentFusion.clusters.length
      ? `Correlated summaries refreshed ${fmtShortTime(currentFusion.updatedAt || isoNow())}.`
      : "No correlated clusters yet. Let the Wi-Fi/BLE collectors gather more signals or add authorized intel.";
  }

  if (!fusionClustersBody) return;

  // Apply search filter
  let filtered = fusionSearchQuery
    ? currentFusion.clusters.filter((c) => matchesFusionSearch(c, fusionSearchQuery))
    : [...currentFusion.clusters];

  if (fusionSearchStatus) {
    if (fusionSearchQuery) {
      fusionSearchStatus.style.display = "";
      fusionSearchStatus.textContent = `Showing ${filtered.length} of ${currentFusion.clusters.length} clusters matching "${fusionSearchQuery}"`;
    } else {
      fusionSearchStatus.style.display = "none";
    }
  }

  // Sort
  filtered.sort((a, b) => {
    // Locked rows always float to the top
    const aLocked = fusionLockedRows.has(a.clusterId) ? 1 : 0;
    const bLocked = fusionLockedRows.has(b.clusterId) ? 1 : 0;
    if (aLocked !== bLocked) return bLocked - aLocked;
    let cmp = 0;
    if (fusionSortKey === "score") {
      cmp = (a.score ?? 0) - (b.score ?? 0);
    } else if (fusionSortKey === "cluster") {
      cmp = (a.label || a.clusterId || "").localeCompare(b.label || b.clusterId || "");
    } else if (fusionSortKey === "seen") {
      cmp = (a.lastSeen || a.updatedAt || "").localeCompare(b.lastSeen || b.updatedAt || "");
    }
    return fusionSortDir === "desc" ? -cmp : cmp;
  });

  // Update sort arrows
  document.querySelectorAll(".fusion-sortable .sort-arrow").forEach((el) => {
    el.className = "sort-arrow";
  });
  const activeHeader = document.querySelector(`.fusion-sortable[data-sort="${fusionSortKey}"] .sort-arrow`);
  if (activeHeader) activeHeader.classList.add(fusionSortDir);

  if (!filtered.length) {
    fusionClustersBody.innerHTML = `<tr><td colspan="8" class="muted">${fusionSearchQuery ? "No clusters match your search." : "No correlated device clusters yet."}</td></tr>`;
    if (fusionPagination) fusionPagination.style.display = "none";
    return;
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / FUSION_PAGE_SIZE);
  if (fusionPage >= totalPages) fusionPage = totalPages - 1;
  if (fusionPage < 0) fusionPage = 0;
  const pageStart = fusionPage * FUSION_PAGE_SIZE;
  const pageSlice = filtered.slice(pageStart, pageStart + FUSION_PAGE_SIZE);

  if (fusionPagination) {
    if (totalPages > 1) {
      fusionPagination.style.display = "flex";
      if (fusionPageInfo) fusionPageInfo.textContent = `Page ${fusionPage + 1} of ${totalPages} (${filtered.length} clusters)`;
      if (fusionPagePrev) fusionPagePrev.disabled = fusionPage === 0;
      if (fusionPageNext) fusionPageNext.disabled = fusionPage >= totalPages - 1;
    } else {
      fusionPagination.style.display = "none";
    }
  }

  fusionClustersBody.innerHTML = pageSlice.map((cluster) => {
    const isLocked = fusionLockedRows.has(cluster.clusterId);
    const modalities = [];
    if (cluster.modalityCounts?.wifi) modalities.push(`Wi-Fi ${cluster.modalityCounts.wifi}`);
    if (cluster.modalityCounts?.ble) modalities.push(`BLE ${cluster.modalityCounts.ble}`);
    if (cluster.modalityCounts?.intel) modalities.push(`Intel ${cluster.modalityCounts.intel}`);

    // Exposure class color coding
    const expClass = cluster.maxExposure || "E0";
    const expColor = expClass === "E4" ? "var(--bad)" : expClass === "E3" ? "#fb923c" : expClass === "E2" ? "var(--warn)" : expClass === "E1" ? "var(--good)" : "var(--muted)";

    // Device class badge
    let deviceBadge = "";
    if (cluster.probeData?.deviceClass) {
      const dc = cluster.probeData.deviceClass;
      const vendor = cluster.probeData.deviceVendor;
      const badgeColor = dc === "ip-camera" ? "var(--bad)" : dc === "iot-device" ? "#fb923c" : dc === "smart-home" ? "var(--warn)" : "var(--muted)";
      deviceBadge = `<span class="chip" style="background:${badgeColor};color:#fff;font-size:10px;padding:1px 6px;">${escapeHtml(dc)}${vendor ? " \u00b7 " + escapeHtml(vendor) : ""}</span>`;
    }

    // OS badge
    let osBadge = "";
    if (cluster.probeData?.osGuess) {
      osBadge = `<span class="chip" style="font-size:10px;padding:1px 6px;">${escapeHtml(cluster.probeData.osGuess)}</span>`;
    }

    // Probe data hints: services, titles, protocol details
    let probeHint = "";
    if (cluster.probeData?.hasProbeData) {
      const parts = [];
      const svcList = (cluster.probeData.services || []).slice(0, 3).map((s) => s.version || `${s.port}`).join(", ");
      if (svcList) parts.push(`\uD83D\uDD0D ${escapeHtml(svcList)}`);
      const titles = (cluster.probeData.httpTitles || []).slice(0, 2);
      if (titles.length) parts.push(`\uD83C\uDFE0 ${escapeHtml(titles.join(", "))}`);
      if (cluster.probeData.rtspMethods) parts.push(`\uD83C\uDFA5 RTSP`);
      if (cluster.probeData.mqttStatus) parts.push(`\uD83D\uDCE1 MQTT:${escapeHtml(cluster.probeData.mqttStatus)}`);

      // Port diff
      const diff = cluster.probeData.portDiff;
      if (diff) {
        if (diff.newPorts?.length && diff.previousScan) parts.push(`<span style="color:var(--bad);">+${diff.newPorts.join(",")}</span>`);
        if (diff.closedPorts?.length) parts.push(`<span style="color:var(--good);">-${diff.closedPorts.join(",")}</span>`);
        if (diff.changedVersions?.length) parts.push(`\u0394${diff.changedVersions.length}ver`);
      }

      if (parts.length) probeHint = `<div class="wifi-sub" style="margin-top:2px;">${parts.join(" \u00b7 ")}</div>`;
    }

    return `
      <tr data-fusion-detail="${escapeHtml(cluster.clusterId)}"${isLocked ? ' class="fusion-row-locked"' : ''}>
        <td class="fusion-lock-cell"><button class="fusion-lock-btn${isLocked ? ' locked' : ''}" data-lock-id="${escapeHtml(cluster.clusterId)}" title="${isLocked ? 'Unpin row' : 'Pin to top'}">${isLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</button></td>
        <td>
          <div>${escapeHtml(cluster.label || cluster.clusterId)} ${deviceBadge} ${osBadge}</div>
          <div class="wifi-sub">${escapeHtml(cluster.family || "unknown")} \u2022 ${escapeHtml((cluster.confidence || "none").toUpperCase())} \u2022 <span style="color:${expColor}">${escapeHtml(expClass)}</span></div>
          ${probeHint}
        </td>
        <td>${escapeHtml(String(cluster.score ?? 0))}</td>
        <td>${escapeHtml(modalities.join(" + ") || "--")}</td>
        <td>${escapeHtml(cluster.summary || "--")}</td>
        <td>${escapeHtml((cluster.evidence || []).slice(0, 3).join(" \u2022 ") || "--")}</td>
        <td>${escapeHtml(cluster.lastSeen ? fmtShortTime(cluster.lastSeen) : (cluster.updatedAt ? fmtShortTime(cluster.updatedAt) : "--"))}</td>
        <td><button class="fusion-probe-btn" data-cluster-id="${escapeHtml(cluster.clusterId)}" style="font-size:11px;padding:2px 8px;">Probe</button></td>
      </tr>
    `;
  }).join("");
}

async function loadFusionData() {
  if (!fusionStatusText && !fusionClustersBody) return;

  try {
    const data = await fetchJson("/api/fusion");
    renderFusionData(data.fusion || {});
  } catch (err) {
    currentFusion = { clusters: [], summary: null, updatedAt: null };
    if (fusionStateBadge) fusionStateBadge.textContent = "Fusion: error";
    if (fusionStatusText) fusionStatusText.textContent = `Fusion load failed: ${err.message}`;
    if (fusionClustersBody) {
      fusionClustersBody.innerHTML = `<tr><td colspan="7" class="muted">Fusion load failed: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function updateFusionTimer() {
  if (fusionTimer) clearInterval(fusionTimer);
  fusionTimer = null;
  if (fusionClustersBody || fusionStatusText) {
    fusionTimer = setInterval(loadFusionData, 5000);
  }
}

function countIntelCoverage(entries = []) {
  let total = 0;
  let exposed = 0;
  entries.forEach((entry) => {
    const intel = getIntelForEntry(entry);
    if (!intel) return;
    total += 1;
    if ((intel.exposureClass || "E0") !== "E0") exposed += 1;
  });
  return { total, exposed };
}

function renderBleData(status, summaryData) {
  bleRafArgs = [status, summaryData];
  if (!bleRafId) {
    bleRafId = requestAnimationFrame(() => {
      bleRafId = null;
      const args = bleRafArgs;
      bleRafArgs = null;
      _renderBleDataImpl(args[0], args[1]);
    });
  }
}

function _renderBleDataImpl(status, summaryData) {
  if (!bleStatusText) return;

  lastBleStatus = status || null;
  lastBleSummary = summaryData || null;

  // Defer entire render (badges + table) while user is scrolling
  if (bleScrolling) {
    pendingBleRender = () => renderBleData(status, summaryData);
    return;
  }

  mergeBleMemory(summaryData);
  recomputeRelatedLinks();

  const enabled = Boolean(status?.enabled);
  const state = status?.status || summaryData?.status || (enabled ? "running" : "paused");

  if (bleStateBadge) bleStateBadge.textContent = `BLE: ${String(state).toUpperCase()}`;
  if (bleUniqueBadge) bleUniqueBadge.textContent = `Unique: ${summaryData?.total_unique_seen ?? 0}`;
  if (bleActiveBadge) bleActiveBadge.textContent = `Active: ${summaryData?.active_unique_seen ?? 0}`;
  if (bleEventsBadge) bleEventsBadge.textContent = `Events: ${summaryData?.total_events ?? 0}`;

  const matchSummary = summaryData?.matches || {};
  if (bleMatchBadge) bleMatchBadge.textContent = `Matches: ${matchSummary.total ?? 0}`;
  if (bleMatchBreakdownBadge) {
    bleMatchBreakdownBadge.textContent = `H/M/L/B/P/R: ${matchSummary.high ?? 0}/${matchSummary.medium ?? 0}/${matchSummary.low ?? 0}/${matchSummary.battery ?? 0}/${matchSummary.penguin ?? 0}/${matchSummary.raven ?? 0}`;
  }
  const bleIntelCoverage = countIntelCoverage(getBleMemoryEntriesSorted());
  if (bleIntelBadge) bleIntelBadge.textContent = `Intel: ${bleIntelCoverage.total}`;
  if (bleExposureBadge) bleExposureBadge.textContent = `Exposure: ${bleIntelCoverage.exposed}`;

  if (bleStartBtn) bleStartBtn.disabled = enabled;
  if (bleStopBtn) bleStopBtn.disabled = !enabled;

  const strongest = matchSummary.strongest || summaryData?.strongest_active;
  if (bleStrongestBadge) {
    if (strongest && typeof strongest.last_rssi === "number") {
      const strongestName = strongest.name || strongest.address || "unknown";
      const matchLabel = strongest.match?.matched ? ` | ${strongest.match.family} ${strongest.match.confidence}` : "";
      bleStrongestBadge.textContent = `Strongest: ${strongestName} (${strongest.last_rssi} dBm${matchLabel})`;
    } else {
      bleStrongestBadge.textContent = "Strongest: --";
    }
  }

  const rememberedEntries = getBleMemoryEntriesSorted();
  const lockedCount = rememberedEntries.filter((entry) => entry.locked).length;
  const activeCount = rememberedEntries.filter((entry) => entry.activeNow && getEntryAgeMs(entry) <= ACTIVE_AGE_MS).length;

  if (bleRememberedBadge) bleRememberedBadge.textContent = `Remembered: ${rememberedEntries.length}`;
  if (bleMemoryInfo) bleMemoryInfo.textContent = `BLE memory stored locally in this browser • ${activeCount} active • ${lockedCount} locked • max ${MEMORY_LIMIT}`;

  if (state === "error") {
    setBleStatus("BLE scanner error", "bad");
  } else if (!enabled) {
    setBleStatus("BLE scanner paused", "warn");
  } else if ((matchSummary.total || 0) > 0) {
    setBleStatus(`BLE scanner running - ${matchSummary.total} candidate matches`, "good");
  } else {
    setBleStatus("BLE scanner running", "good");
  }

  if (!bleDevicesBody) return;

  if (!rememberedEntries.length) {
    const emptyHtml = '<tr><td colspan="9" class="muted">No BLE devices captured yet.</td></tr>';
    if (lastBleTableHtml !== emptyHtml) {
      swapTbody(bleDevicesBody, emptyHtml);
      lastBleTableHtml = emptyHtml;
    }
    return;
  }

  const newHtml = rememberedEntries.map((entry) => {
    const match = entry.match || {};
    const confidence = match.confidence || "none";
    const matched = Boolean(match.matched);

    const familyLabelMap = {
      penguin: "Penguin",
      fs_battery: "FS Battery",
      raven: "Raven",
      soundthinking: "SoundThinking",
      flock_like: "Flock-like",
      unknown: "Unknown"
    };

    const familyLabel = familyLabelMap[match.family] || (match.family || "candidate");
    const matchText = matched
      ? `${familyLabel} • ${confidence.toUpperCase()}`
      : "No match";

    const distanceClass = match.proximity || "unknown";
    const distanceText = match.proximityLabel || "Unknown";

    const whyParts = Array.isArray(match.reasons) ? match.reasons.slice(0, 3) : [];
    if (match.ravenFirmwareGuess && match.ravenFirmwareGuess !== "?") {
      whyParts.push(`FW ${match.ravenFirmwareGuess}`);
    }
    const why = whyParts.length ? whyParts.join(" • ") : "--";

    const rowClasses = [];
    if (matched) rowClasses.push(`ble-row-${confidence}`);
    const staleClass = getStaleClass(entry);
    if (staleClass) rowClasses.push(staleClass);
    if (entry.locked) rowClasses.push("memory-row-locked");

    const matchPillClass = matched ? `ble-match-pill ble-match-${confidence}` : "ble-match-pill";
    const distancePillClass = `ble-distance-pill ble-distance-${distanceClass}`;

    const relatedHtml = entry.related
      ? `
        <div class="ble-related">
          <div>${escapeHtml(entry.related.label)}</div>
          <div class="ble-sub">${escapeHtml(entry.related.confidence.toUpperCase())} • ${escapeHtml(entry.related.reason)}</div>
          ${entry.related.sublabel ? `<div class="ble-sub">${escapeHtml(entry.related.sublabel)}</div>` : ""}
        </div>
      `
      : `<span class="muted">—</span>`;

    return `
      <tr class="${rowClasses.join(" ")}" data-ble-detail="${escapeHtml(entry.key)}">
        <td>
          <span class="ble-name">${escapeHtml(getBleDisplayLabel(entry))}</span>
          <span class="ble-sub">${escapeHtml(entry.address || "--")}</span>
        </td>
        <td><span class="${matchPillClass}">${escapeHtml(matchText)}</span></td>
        <td>${escapeHtml(typeof entry.last_rssi === "number" ? `${entry.last_rssi} dBm` : "--")}</td>
        <td><span class="${distancePillClass}">${escapeHtml(distanceText)}</span></td>
        <td>
          <div>${escapeHtml(`${entry.seen_count ?? 0}x`)}</div>
          <div class="ble-sub">${escapeHtml(getSeenLabel(entry))}</div>
        </td>
        <td>${renderBleEnrichmentHtml(entry)}</td>
        <td>${relatedHtml}</td>
        <td class="ble-why">${escapeHtml(why)}</td>
        <td>
          <button
            class="tiny-btn ${entry.locked ? "locked" : ""}"
            data-ble-lock="${escapeHtml(entry.key)}"
            type="button"
          >${entry.locked ? "Unlock" : "Lock"}</button>
        </td>
      </tr>
    `;
  }).join("");
  if (newHtml !== lastBleTableHtml) {
    swapTbody(bleDevicesBody, newHtml);
    lastBleTableHtml = newHtml;
  }
}

async function loadBleData() {
  if (!bleStatusText) return;

  try {
    const [statusData, summaryData] = await Promise.all([
      fetchJson("/api/ble/status"),
      fetchJson("/api/ble/summary")
    ]);

    renderBleData(statusData.status, summaryData.summary);
  } catch (err) {
    setBleStatus(`BLE load failed: ${err.message}`, "bad");
  }
}

async function startBleScanner() {
  try {
    setBleStatus("Starting BLE scanner...", "warn");
    await fetchJson("/api/ble/start", { method: "POST" });
    setTimeout(loadBleData, 500);
  } catch (err) {
    setBleStatus(`BLE start failed: ${err.message}`, "bad");
  }
}

async function stopBleScanner() {
  try {
    setBleStatus("Stopping BLE scanner...", "warn");
    await fetchJson("/api/ble/stop", { method: "POST" });
    setTimeout(loadBleData, 500);
  } catch (err) {
    setBleStatus(`BLE stop failed: ${err.message}`, "bad");
  }
}

function renderWifiData(status, summaryData) {
  wifiRafArgs = [status, summaryData];
  if (!wifiRafId) {
    wifiRafId = requestAnimationFrame(() => {
      wifiRafId = null;
      const args = wifiRafArgs;
      wifiRafArgs = null;
      _renderWifiDataImpl(args[0], args[1]);
    });
  }
}

function _renderWifiDataImpl(status, summaryData) {
  if (!wifiStatusText) return;

  lastWifiStatus = status || null;
  lastWifiSummary = summaryData || null;

  // Defer entire render (badges + table) while user is scrolling
  if (wifiScrolling) {
    pendingWifiRender = () => renderWifiData(status, summaryData);
    return;
  }

  mergeWifiMemory(summaryData);
  recomputeRelatedLinks();

  const enabled = Boolean(status?.enabled);
  const state = status?.status || summaryData?.status || (enabled ? "running" : "paused");

  if (wifiStateBadge) wifiStateBadge.textContent = `Wi-Fi: ${String(state).toUpperCase()}`;
  if (wifiUniqueBadge) wifiUniqueBadge.textContent = `Unique: ${summaryData?.total_unique_seen ?? 0}`;
  if (wifiActiveBadge) wifiActiveBadge.textContent = `Active: ${summaryData?.active_unique_seen ?? 0}`;
  if (wifiEventsBadge) wifiEventsBadge.textContent = `Events: ${summaryData?.total_events ?? 0}`;

  const matchSummary = summaryData?.matches || {};
  if (wifiMatchBadge) wifiMatchBadge.textContent = `Matches: ${matchSummary.total ?? 0}`;
  if (wifiMatchBreakdownBadge) {
    wifiMatchBreakdownBadge.textContent = `H/M/L: ${matchSummary.high ?? 0}/${matchSummary.medium ?? 0}/${matchSummary.low ?? 0}`;
  }
  const wifiIntelCoverage = countIntelCoverage(getWifiMemoryEntriesSorted());
  if (wifiIntelBadge) wifiIntelBadge.textContent = `Intel: ${wifiIntelCoverage.total}`;
  if (wifiExposureBadge) wifiExposureBadge.textContent = `Exposure: ${wifiIntelCoverage.exposed}`;

  if (wifiStartBtn) wifiStartBtn.disabled = enabled;
  if (wifiStopBtn) wifiStopBtn.disabled = !enabled;

  const strongest = matchSummary.strongest || summaryData?.strongest_active;
  if (wifiStrongestBadge) {
    if (strongest && typeof strongest.last_signal === "number") {
      const name = strongest.ssid || strongest.bssid || "unknown";
      wifiStrongestBadge.textContent = `Strongest: ${name} (${strongest.last_signal}%)`;
    } else {
      wifiStrongestBadge.textContent = "Strongest: --";
    }
  }

  const rememberedEntries = getWifiMemoryEntriesSorted();
  const lockedCount = rememberedEntries.filter((entry) => entry.locked).length;
  const activeCount = rememberedEntries.filter((entry) => entry.activeNow && getEntryAgeMs(entry) <= ACTIVE_AGE_MS).length;

  if (wifiRememberedBadge) wifiRememberedBadge.textContent = `Remembered: ${rememberedEntries.length}`;
  if (wifiMemoryInfo) wifiMemoryInfo.textContent = `Wi-Fi memory stored locally in this browser • ${activeCount} active • ${lockedCount} locked • max ${MEMORY_LIMIT}`;

  if (state === "error") {
    setWifiStatus("Wi-Fi scanner error", "bad");
  } else if (!enabled) {
    setWifiStatus("Wi-Fi scanner paused", "warn");
  } else if ((matchSummary.total || 0) > 0) {
    setWifiStatus(`Wi-Fi scanner running - ${matchSummary.total} candidate matches`, "good");
  } else {
    setWifiStatus("Wi-Fi scanner running", "good");
  }

  if (!wifiNetworksBody) return;

  if (!rememberedEntries.length) {
    const emptyHtml = '<tr><td colspan="9" class="muted">No Wi-Fi networks captured yet.</td></tr>';
    if (lastWifiTableHtml !== emptyHtml) {
      swapTbody(wifiNetworksBody, emptyHtml);
      lastWifiTableHtml = emptyHtml;
    }
    return;
  }

  const newHtml = rememberedEntries.map((entry) => {
    const match = entry.match || {};
    const confidence = match.confidence || "none";
    const matched = Boolean(match.matched);
    const label = match.label || "Candidate";

    const matchText = matched
      ? `${label} • ${confidence.toUpperCase()}`
      : "No match";

    const distanceClass = match.proximity || "unknown";
    const distanceText = match.proximityLabel || "Unknown";

    const whyParts = Array.isArray(match.reasons) ? match.reasons.slice(0, 3) : [];
    if (Array.isArray(match.exclusions) && match.exclusions.length) {
      whyParts.push(`Excluded: ${match.exclusions[0]}`);
    }
    const why = whyParts.length ? whyParts.join(" • ") : "--";

    const rowClasses = [];
    const staleClass = getStaleClass(entry);
    if (staleClass) rowClasses.push(staleClass);
    if (entry.locked) rowClasses.push("memory-row-locked");

    const matchPillClass = matched ? `wifi-match-pill wifi-match-${confidence}` : "wifi-match-pill";
    const distancePillClass = `wifi-distance-pill wifi-distance-${distanceClass}`;

    const relatedHtml = entry.related
      ? `
        <div class="wifi-related">
          <div>${escapeHtml(entry.related.label)}</div>
          <div class="wifi-sub">${escapeHtml(entry.related.confidence.toUpperCase())} • ${escapeHtml(entry.related.reason)}</div>
          ${entry.related.sublabel ? `<div class="wifi-sub">${escapeHtml(entry.related.sublabel)}</div>` : ""}
        </div>
      `
      : `<span class="muted">—</span>`;

    return `
      <tr class="${rowClasses.join(" ")}" data-wifi-detail="${escapeHtml(entry.key)}">
        <td>
          <span class="wifi-name">${escapeHtml(getWifiDisplayLabel(entry))}</span>
          <span class="wifi-sub">${escapeHtml(entry.bssid || "--")}</span>
        </td>
        <td><span class="${matchPillClass}">${escapeHtml(matchText)}</span></td>
        <td>${escapeHtml(typeof entry.last_signal === "number" ? `${entry.last_signal}%` : "--")}</td>
        <td><span class="${distancePillClass}">${escapeHtml(distanceText)}</span></td>
        <td>
          <div>${escapeHtml(`${entry.seen_count ?? 0}x`)}</div>
          <div class="wifi-sub">${escapeHtml(getSeenLabel(entry))}</div>
        </td>
        <td>${renderWifiEnrichmentHtml(entry)}</td>
        <td>${relatedHtml}</td>
        <td class="wifi-why">${escapeHtml(why)}</td>
        <td>
          <button
            class="tiny-btn ${entry.locked ? "locked" : ""}"
            data-wifi-lock="${escapeHtml(entry.key)}"
            type="button"
          >${entry.locked ? "Unlock" : "Lock"}</button>
        </td>
      </tr>
    `;
  }).join("");
  if (newHtml !== lastWifiTableHtml) {
    swapTbody(wifiNetworksBody, newHtml);
    lastWifiTableHtml = newHtml;
  }
}

async function loadWifiData() {
  if (!wifiStatusText) return;

  try {
    const [statusData, summaryData] = await Promise.all([
      fetchJson("/api/wifi/status"),
      fetchJson("/api/wifi/summary")
    ]);

    renderWifiData(statusData.status, summaryData.summary);
  } catch (err) {
    setWifiStatus(`Wi-Fi load failed: ${err.message}`, "bad");
  }
}

async function startWifiScanner() {
  try {
    setWifiStatus("Starting Wi-Fi scanner...", "warn");
    await fetchJson("/api/wifi/start", { method: "POST" });
    setTimeout(loadWifiData, 500);
  } catch (err) {
    setWifiStatus(`Wi-Fi start failed: ${err.message}`, "bad");
  }
}

async function stopWifiScanner() {
  try {
    setWifiStatus("Stopping Wi-Fi scanner...", "warn");
    await fetchJson("/api/wifi/stop", { method: "POST" });
    setTimeout(loadWifiData, 500);
  } catch (err) {
    setWifiStatus(`Wi-Fi stop failed: ${err.message}`, "bad");
  }
}

function clearBleMemory() {
  bleMemory = {};
  saveMemoryStore(BLE_MEMORY_KEY, bleMemory);
  recomputeRelatedLinks();
  if (lastBleStatus || lastBleSummary) {
    renderBleData(lastBleStatus || {}, lastBleSummary || { devices: [] });
  } else if (bleDevicesBody) {
    lastBleTableHtml = "";
    swapTbody(bleDevicesBody, `<tr><td colspan="9" class="muted">No BLE devices captured yet.</td></tr>`);
  }
}

function clearWifiMemory() {
  wifiMemory = {};
  saveMemoryStore(WIFI_MEMORY_KEY, wifiMemory);
  recomputeRelatedLinks();
  if (lastWifiStatus || lastWifiSummary) {
    renderWifiData(lastWifiStatus || {}, lastWifiSummary || { networks: [] });
  } else if (wifiNetworksBody) {
    lastWifiTableHtml = "";
    swapTbody(wifiNetworksBody, `<tr><td colspan="9" class="muted">No Wi-Fi networks captured yet.</td></tr>`);
  }
}

function toggleBleLock(key) {
  if (!bleMemory[key]) return;
  bleMemory[key].locked = !bleMemory[key].locked;
  saveAllMemory();
  if (lastBleStatus || lastBleSummary) renderBleData(lastBleStatus || {}, lastBleSummary || {});
}

function toggleWifiLock(key) {
  if (!wifiMemory[key]) return;
  wifiMemory[key].locked = !wifiMemory[key].locked;
  saveAllMemory();
  if (lastWifiStatus || lastWifiSummary) renderWifiData(lastWifiStatus || {}, lastWifiSummary || {});
}

function populateScanner(scanner) {
  currentScanner = scanner;

  const parsedSurvey = parseSurveyRangeString(scanner.survey?.freqRange || "");
  if (surveyStartMHz) surveyStartMHz.value = parsedSurvey.startMHz;
  if (surveyStopMHz) surveyStopMHz.value = parsedSurvey.stopMHz;
  if (surveyBinKhz) surveyBinKhz.value = parsedSurvey.binKhz;

  if (surveyInterval) surveyInterval.value = scanner.survey?.interval || "";
  if (surveyWindow) surveyWindow.value = scanner.survey?.window || "";

  if (trackSpanKhz) trackSpanKhz.value = Math.round(Number(scanner.track?.spanHz || 0) / 1000) || "";
  if (trackBinKhz) trackBinKhz.value = Math.round(Number(scanner.track?.binHz || 0) / 1000) || "";
  if (trackInterval) trackInterval.value = scanner.track?.interval || "";
  if (trackWindow) trackWindow.value = scanner.track?.window || "";

  if (listenFrequency) listenFrequency.value = scanner.listen?.frequency || scanner.targetFrequency || "";
  if (listenModulation) listenModulation.value = scanner.listen?.modulation || "fm";
  if (listenGain) listenGain.value = Number(scanner.listen?.gain ?? 30);
  if (listenSquelch) listenSquelch.value = Number(scanner.listen?.squelch ?? 0);

  if (scannerStatus) {
    if (scanner.mode === "paused") {
      scannerStatus.textContent = `Mode: paused | resume: ${scanner.lastActiveMode || "survey"}`;
    } else if (scanner.mode === "listen") {
      scannerStatus.textContent = `Mode: listen | ${scanner.listen?.frequency || scanner.targetFrequency || "no frequency"}`;
    } else {
      scannerStatus.textContent = `Mode: ${scanner.mode} | ${scanner.freqRange}`;
    }
  }

  if (scanner.mode === "track" && scanner.track && Number.isFinite(Number(scanner.track.centerHz))) {
    selectedHz = Number(scanner.track.centerHz);
  }

  if (scanner.mode === "listen") {
    const freq = scanner.listen?.frequency || scanner.targetFrequency;
    setListenStatus(
      freq
        ? `Listening on ${freq} (${scanner.listen?.modulation || "fm"}) - browser stream available`
        : "Listen mode active",
      "good"
    );
  } else {
    setListenStatus("Not listening", "good");
    if (browserAudioActive) stopBrowserAudio(false);
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
    if (settingsStatus) settingsStatus.textContent = save ? "Defaults saved" : "Settings applied";
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
    if (scannerStatus) scannerStatus.textContent = err.message;
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
    setTimeout(loadListenDiagnostics, 500);
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
    if (scannerStatus) scannerStatus.textContent = err.message;
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
    setTimeout(loadListenDiagnostics, 500);
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
    stopBrowserAudio(false);
    setUiMessage("Survey mode active", "good");
    setTimeout(loadCurrent, 2500);
    setTimeout(loadListenDiagnostics, 500);
  } catch (err) {
    setUiMessage(`Survey mode failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function setTrackMode() {
  if (!selectedHz) {
    if (scannerStatus) scannerStatus.textContent = "Select a frequency first";
    setUiMessage("Select a frequency before entering track mode", "warn");
    return;
  }

  beginScannerTransition(`Switching to track near ${fmtHz(selectedHz)}...`);
  showBusy("Switching to track", `Locking near ${fmtHz(selectedHz)}`);
  setUiMessage(`Applying track mode at ${fmtHz(selectedHz)}...`, "warn");

  try {
    const payload = {
      centerHz: selectedHz,
      spanHz: Number(trackSpanKhz?.value) * 1000,
      binHz: Number(trackBinKhz?.value) * 1000,
      interval: trackInterval?.value.trim(),
      window: trackWindow?.value.trim()
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

    stopBrowserAudio(false);
    setUiMessage(`Track mode active at ${fmtHz(lastLockTargetHz)}`, "good");
    setTimeout(loadCurrent, 2500);
    setTimeout(loadListenDiagnostics, 500);
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
      setTimeout(loadListenDiagnostics, 500);
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
    stopBrowserAudio(false);
    setUiMessage("Scanner paused", "good");
    setTimeout(loadListenDiagnostics, 500);
  } catch (err) {
    setUiMessage(`Pause failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function startListenMode() {
  const normalizedFreq = normalizeFrequencyInput(listenFrequency?.value);
  const modulation = String(listenModulation?.value || "fm").toLowerCase();
  const gain = Number(listenGain?.value);
  const squelch = Number(listenSquelch?.value);

  if (!normalizedFreq) {
    setListenStatus("Enter a valid frequency like 162.55M or 99.5M", "bad");
    setUiMessage("Invalid listen frequency", "bad");
    return;
  }

  if (listenFrequency) listenFrequency.value = normalizedFreq;

  beginScannerTransition(`Switching to listen on ${normalizedFreq}...`);
  showBusy("Starting listen mode", `Tuning ${normalizedFreq}`);
  setUiMessage(`Starting listen mode on ${normalizedFreq}...`, "warn");
  setListenStatus(`Starting listen mode on ${normalizedFreq}...`, "warn");

  try {
    const data = await fetchJson("/api/listen/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frequency: normalizedFreq,
        modulation,
        gain,
        squelch
      })
    });

    populateScanner(data.scanner);
    setUiMessage(`Listen mode active on ${data.scanner.listen.frequency}`, "good");
    setTimeout(loadListenDiagnostics, 500);
  } catch (err) {
    setUiMessage(`Listen mode failed: ${err.message}`, "bad");
    setListenStatus(`Listen start failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function stopListenMode() {
  showBusy("Stopping listen mode", "Returning to scanner");
  setUiMessage("Stopping listen mode...", "warn");
  setListenStatus("Stopping listen mode...", "warn");
  beginScannerTransition("Returning to scan...");

  try {
    const data = await fetchJson("/api/listen/stop", { method: "POST" });
    populateScanner(data.scanner);
    stopBrowserAudio(false);
    setUiMessage(`Returned to ${data.scanner.mode} mode`, "good");
    setTimeout(loadCurrent, 2500);
    setTimeout(loadListenDiagnostics, 500);
  } catch (err) {
    setUiMessage(`Stop listen failed: ${err.message}`, "bad");
    setListenStatus(`Stop listen failed: ${err.message}`, "bad");
  } finally {
    hideBusy();
  }
}

async function loadFiles() {
  try {
    const data = await fetchJson("/api/files");
    if (fileSelect) {
      fileSelect.innerHTML = data.files.map((f) => `<option value="${f}">${f}</option>`).join("");
      if (data.files.length) {
        fileSelect.value = "live";
        await loadCurrent();
      }
    }
  } catch (err) {
    setUiMessage(`File list failed: ${err.message}`, "bad");
  }
}

async function loadCurrent() {
  const selected = fileSelect?.value;
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

  if (liveMode?.checked && fileSelect?.value === "live") {
    refreshTimer = setInterval(loadCurrent, 2000);
  }
}

function updateDiagnosticsTimer() {
  if (diagnosticsTimer) clearInterval(diagnosticsTimer);
  diagnosticsTimer = null;
  if (listenPipelineStatus) {
    diagnosticsTimer = setInterval(loadListenDiagnostics, 2000);
  }
}

function updateBleTimer() {
  if (bleTimer) clearInterval(bleTimer);
  bleTimer = null;
  if (bleStatusText) {
    bleTimer = setInterval(loadBleData, 2000);
  }
}

function updateWifiTimer() {
  if (wifiTimer) clearInterval(wifiTimer);
  wifiTimer = null;
  if (wifiStatusText) {
    wifiTimer = setInterval(loadWifiData, 3000);
  }
}

async function refreshRecordStatus() {
  try {
    const data = await fetchJson("/api/record/status");
    if (recordStatus) {
      recordStatus.textContent = data.recording
        ? `Recording (${data.rows} rows)`
        : "Not recording";
    }
  } catch (err) {
    setUiMessage(`Record status failed: ${err.message}`, "bad");
  }
}

if (fileSelect) {
  fileSelect.addEventListener("change", async () => {
    await loadCurrent();
    updateTimer();
  });
}

if (liveMode) {
  liveMode.addEventListener("change", updateTimer);
}

if (recordBtn) {
  recordBtn.addEventListener("click", async () => {
    try {
      await fetchJson("/api/record/start");
      refreshRecordStatus();
      setUiMessage("Recording started", "good");
    } catch (err) {
      setUiMessage(`Record start failed: ${err.message}`, "bad");
    }
  });
}

if (stopBtn) {
  stopBtn.addEventListener("click", async () => {
    try {
      await fetchJson("/api/record/stop");
      refreshRecordStatus();
      setUiMessage("Recording stopped", "good");
    } catch (err) {
      setUiMessage(`Record stop failed: ${err.message}`, "bad");
    }
  });
}

if (applySettingsBtn) applySettingsBtn.addEventListener("click", async () => applySettings(false));
if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", async () => applySettings(true));
if (runScannerBtn) runScannerBtn.addEventListener("click", runScannerConfig);
if (saveScannerBtn) saveScannerBtn.addEventListener("click", saveScannerConfig);
if (trackBtn) trackBtn.addEventListener("click", setTrackMode);
if (surveyBtn) surveyBtn.addEventListener("click", setSurveyMode);
if (pauseBtn) pauseBtn.addEventListener("click", togglePauseScanner);
if (listenStartBtn) listenStartBtn.addEventListener("click", startListenMode);
if (listenStopBtn) listenStopBtn.addEventListener("click", stopListenMode);
if (playBrowserAudioBtn) playBrowserAudioBtn.addEventListener("click", playBrowserAudio);
if (stopBrowserAudioBtn) stopBrowserAudioBtn.addEventListener("click", () => stopBrowserAudio());
if (bleStartBtn) bleStartBtn.addEventListener("click", startBleScanner);
if (bleStopBtn) bleStopBtn.addEventListener("click", stopBleScanner);
if (bleClearMemoryBtn) bleClearMemoryBtn.addEventListener("click", clearBleMemory);
if (wifiStartBtn) wifiStartBtn.addEventListener("click", startWifiScanner);
if (wifiStopBtn) wifiStopBtn.addEventListener("click", stopWifiScanner);
if (wifiClearMemoryBtn) wifiClearMemoryBtn.addEventListener("click", clearWifiMemory);
if (exportSessionBtn) exportSessionBtn.addEventListener("click", exportSessionBundle);
if (probeDiscoverBtn) probeDiscoverBtn.addEventListener("click", () => triggerDiscovery());
if (probeScanAllBtn) probeScanAllBtn.addEventListener("click", () => triggerScan("all"));
if (fusionProbeAllBtn) fusionProbeAllBtn.addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "fusion-confirm-overlay";
  overlay.innerHTML = `
    <div class="fusion-confirm-box">
      <p>Probe all reachable clusters?<br><span class="muted" style="font-size:12px;">This will actively scan all cluster IPs for open ports.</span></p>
      <div class="btn-row">
        <button class="fusion-confirm-yes" type="button">Yes</button>
        <button class="fusion-confirm-no" type="button">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector(".fusion-confirm-yes").addEventListener("click", () => { overlay.remove(); triggerClusterProbe("all"); });
  overlay.querySelector(".fusion-confirm-no").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
});

if (fusionSearchBtn) fusionSearchBtn.addEventListener("click", () => {
  fusionSearchQuery = (fusionSearchInput ? fusionSearchInput.value : "").trim();
  fusionPage = 0;
  renderFusionData(currentFusion);
});
if (fusionSearchClearBtn) fusionSearchClearBtn.addEventListener("click", () => {
  fusionSearchQuery = "";
  fusionPage = 0;
  if (fusionSearchInput) fusionSearchInput.value = "";
  renderFusionData(currentFusion);
});
if (fusionSearchInput) fusionSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fusionSearchQuery = fusionSearchInput.value.trim();
    fusionPage = 0;
    renderFusionData(currentFusion);
  }
});

/* Fusion table sort + pagination handlers */
document.querySelectorAll(".fusion-sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (fusionSortKey === key) {
      fusionSortDir = fusionSortDir === "desc" ? "asc" : "desc";
    } else {
      fusionSortKey = key;
      fusionSortDir = key === "cluster" ? "asc" : "desc";
    }
    fusionPage = 0;
    renderFusionData(currentFusion);
  });
});
if (fusionPagePrev) fusionPagePrev.addEventListener("click", () => {
  if (fusionPage > 0) { fusionPage--; renderFusionData(currentFusion); }
});
if (fusionPageNext) fusionPageNext.addEventListener("click", () => {
  fusionPage++; renderFusionData(currentFusion);
});
if (probeAutoToggle) probeAutoToggle.addEventListener("change", () => toggleAutoProbe("enabled", probeAutoToggle.checked));
if (probeAutoDiscoverToggle) probeAutoDiscoverToggle.addEventListener("change", () => toggleAutoProbe("autoDiscover", probeAutoDiscoverToggle.checked));
if (probeAutoScanToggle) probeAutoScanToggle.addEventListener("change", () => toggleAutoProbe("autoScan", probeAutoScanToggle.checked));

if (fusionClustersBody) {
  fusionClustersBody.addEventListener("click", (event) => {
    const probeBtn = event.target.closest(".fusion-probe-btn");
    if (probeBtn) {
      event.stopPropagation();
      triggerClusterProbe(probeBtn.getAttribute("data-cluster-id"));
      return;
    }
  });
}

if (probeHostsBody) {
  probeHostsBody.addEventListener("click", (event) => {
    const scanBtn = event.target.closest("[data-scan-ip]");
    if (scanBtn) {
      triggerScan(scanBtn.getAttribute("data-scan-ip"));
      return;
    }
    const row = event.target.closest("[data-probe-ip]");
    if (row) {
      openProbeDetail(row.getAttribute("data-probe-ip"));
    }
  });
}

if (bleDevicesBody) {
  bleDevicesBody.addEventListener("click", (event) => {
    const lockBtn = event.target.closest("[data-ble-lock]");
    if (lockBtn) {
      toggleBleLock(lockBtn.getAttribute("data-ble-lock"));
      return;
    }

    const row = event.target.closest("[data-ble-detail]");
    if (row) {
      openBleDetail(row.getAttribute("data-ble-detail"));
    }
  });
}

if (wifiNetworksBody) {
  wifiNetworksBody.addEventListener("click", (event) => {
    const lockBtn = event.target.closest("[data-wifi-lock]");
    if (lockBtn) {
      toggleWifiLock(lockBtn.getAttribute("data-wifi-lock"));
      return;
    }

    const row = event.target.closest("[data-wifi-detail]");
    if (row) {
      openWifiDetail(row.getAttribute("data-wifi-detail"));
    }
  });
}

if (fusionClustersBody) {
  fusionClustersBody.addEventListener("click", (event) => {
    const lockBtn = event.target.closest(".fusion-lock-btn");
    if (lockBtn) {
      event.stopPropagation();
      const cid = lockBtn.dataset.lockId;
      if (fusionLockedRows.has(cid)) fusionLockedRows.delete(cid);
      else fusionLockedRows.add(cid);
      renderFusionData(currentFusion);
      return;
    }
    const row = event.target.closest("[data-fusion-detail]");
    if (row) {
      openFusionDetail(row.getAttribute("data-fusion-detail"));
    }
  });
}

if (detailDrawerCloseBtn) {
  detailDrawerCloseBtn.addEventListener("click", closeDetailDrawer);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDetailDrawer();
  }
});

if (proximityEnabled) {
  proximityEnabled.addEventListener("change", () => {
    resetProximitySession();
  });
}

if (audioEnabled) {
  audioEnabled.addEventListener("change", () => {
    if (audioEnabled.checked) {
      ensureAudioContext();
    }
  });
}

if (listenBrowserAudio) {
  listenBrowserAudio.addEventListener("playing", () => {
    browserAudioActive = true;
    setListenPipelineStatus("Browser audio playing", "good");
  });

  listenBrowserAudio.addEventListener("pause", () => {
    if (!listenBrowserAudio.ended && browserAudioActive) {
      setListenPipelineStatus("Browser audio paused", "warn");
    }
  });

  listenBrowserAudio.addEventListener("ended", () => {
    browserAudioActive = false;
    setListenPipelineStatus("Browser audio ended", "warn");
  });

  listenBrowserAudio.addEventListener("error", () => {
    browserAudioActive = false;
    const mediaError = listenBrowserAudio.error;
    const message = mediaError ? `Browser audio error code ${mediaError.code}` : "Browser audio error";
    setListenPipelineStatus(message, "bad");
  });
}

if (canvas) {
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
    if (clickedFreq) clickedFreq.textContent = `Selected: ${fmtHz(selectedHz)} (${selectedHz} Hz)`;
    if (proximityTarget) proximityTarget.textContent = fmtHz(selectedHz);

    if (listenFrequency) listenFrequency.value = hzToMString(selectedHz);
    if (listenModulation) listenModulation.value = guessListenModulationFromHz(selectedHz);

    if (currentScanner && currentScanner.mode === "track" && lockedFreqBadge) {
      lockedFreqBadge.textContent = `Locked: ${fmtHz(selectedHz)}`;
    }
  });
}

document.querySelectorAll("[data-collapse-toggle]").forEach((header) => {
  header.addEventListener("click", (e) => {
    if (e.target.closest("button") && !e.target.classList.contains("collapse-btn")) {
      return;
    }

    const card = header.closest("[data-card]");
    const btn = header.querySelector(".collapse-btn");
    card.classList.toggle("collapsed");
    if (btn) btn.textContent = card.classList.contains("collapsed") ? "+" : "−";
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

/* Attach scroll guards to BLE and WiFi table wrappers */
(function initScrollGuards() {
  const bleWrap = bleDevicesBody ? bleDevicesBody.closest(".table-wrap") : null;
  const wifiWrap = wifiNetworksBody ? wifiNetworksBody.closest(".table-wrap") : null;

  function deferBle() {
    bleScrolling = true;
    clearTimeout(bleScrollTimeout);
    bleScrollTimeout = setTimeout(() => {
      bleScrolling = false;
      if (pendingBleRender) {
        const fn = pendingBleRender;
        pendingBleRender = null;
        fn();
      }
    }, 300);
  }

  function deferWifi() {
    wifiScrolling = true;
    clearTimeout(wifiScrollTimeout);
    wifiScrollTimeout = setTimeout(() => {
      wifiScrolling = false;
      if (pendingWifiRender) {
        const fn = pendingWifiRender;
        pendingWifiRender = null;
        fn();
      }
    }, 300);
  }

  if (bleWrap) bleWrap.addEventListener("scroll", deferBle, { passive: true });
  if (wifiWrap) wifiWrap.addEventListener("scroll", deferWifi, { passive: true });

  // Also suppress renders during page-level scroll (window / body)
  window.addEventListener("scroll", () => {
    deferBle();
    deferWifi();
  }, { passive: true });
})();

Promise.all([loadSettings(), loadScanner(), loadFiles(), loadIntelData(), loadFusionData()]).then(async () => {
  updateTimer();
  updateDiagnosticsTimer();
  updateBleTimer();
  updateWifiTimer();
  updateIntelTimer();
  updateFusionTimer();
  updateProbeTimer();
  await refreshRecordStatus();
  await loadListenDiagnostics();
  await loadBleData();
  await loadWifiData();
  await loadProbeStatus();
  await loadProbeResults();
  await loadFusionData();
  updateProximityUI(null);
  updateModeUi();
  setListenStatus("Not listening", "good");
  setUiMessage("Ready", "good");
  setInterval(refreshRecordStatus, 2000);
});