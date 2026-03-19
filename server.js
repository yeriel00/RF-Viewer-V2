const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");
const { PassThrough } = require("stream");
const { listFiles, parseFile, parseLine, buildDataset } = require("./parser");
const { enrichWifiSummary } = require("./wifi-matcher");
const { enrichBleSummary } = require("./ble-matcher");
const { buildIntelFusion } = require("./intel-fusion");
const { discoverHosts, correlateWifiHosts } = require("./network-discovery");
const { scanHost, scanHosts, DEFAULT_PORTS } = require("./port-scanner");
const { probeResultsToIntelItems } = require("./probe-to-intel");

const PORT = 3000;
const TCP_PORT = 9001;
const HOST = "0.0.0.0";

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

const SETTINGS_FILE = path.join(__dirname, "settings.json");
const SCANNER_FILE = path.join(__dirname, "scanner.json");
const SCANNER_RUNTIME_FILE = path.join(__dirname, "scanner.runtime.json");

const BLE_STATUS_FILE = path.join(DATA_DIR, "ble-status.json");
const BLE_SUMMARY_FILE = path.join(DATA_DIR, "ble-summary.json");
const BLE_CONTROL_FILE = path.join(DATA_DIR, "ble-control.json");

const WIFI_STATUS_FILE = path.join(DATA_DIR, "wifi-status.json");
const WIFI_SUMMARY_FILE = path.join(DATA_DIR, "wifi-summary.json");
const WIFI_CONTROL_FILE = path.join(DATA_DIR, "wifi-control.json");
const DEVICE_INTEL_FILE = path.join(DATA_DIR, "device-intel.json");
const PROBE_RESULTS_FILE = path.join(DATA_DIR, "probe-results.json");
const HOST_DISCOVERY_FILE = path.join(DATA_DIR, "host-discovery.json");

const liveRows = [];
const MAX_LIVE_ROWS = 100;

let isRecording = false;
let recordedRows = [];

const DEFAULT_SETTINGS = {
  relativeSquelchDb: 8,
  absoluteFloorDb: -28,
  minRepeats: 2,
  clusterWidthHz: 50000
};

const DEFAULT_SCANNER = {
  mode: "survey",
  lastActiveMode: "survey",
  targetFrequency: null,
  freqRange: "902M:928M:50k",
  interval: "2s",
  window: "10s",
  survey: {
    freqRange: "902M:928M:50k",
    interval: "2s",
    window: "10s"
  },
  track: {
    centerHz: 907000000,
    spanHz: 200000,
    binHz: 10000,
    interval: "1s",
    window: "4s"
  },
  listen: {
    enabled: false,
    frequency: null,
    modulation: "fm",
    gain: 30,
    squelch: 0
  },
  probe: {
    enabled: false,
    autoDiscover: false,
    discoverIntervalSec: 300,
    autoScan: false,
    scanIntervalSec: 600,
    ports: [21, 22, 23, 80, 443, 554, 1883, 3000, 3306, 5432, 6379, 8080, 8443, 8554, 8883, 9090, 27017],
    timeoutMs: 2000,
    concurrency: 10,
    subnetAllowList: [],
    subnetDenyList: []
  }
};

function loadJsonFile(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return { ...fallback, ...JSON.parse(fs.readFileSync(file, "utf8")) };
    }
  } catch (err) {
    console.error(`Failed to load ${file}:`, err.message);
  }
  return { ...fallback };
}

function loadJsonDiskFile(file, fallback = {}) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (err) {
    console.error(`Failed to load ${file}:`, err.message);
  }
  return fallback;
}

function saveJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("Failed to ensure data dir:", err.message);
  }
}

function ensureBleControlFile() {
  try {
    ensureDataDir();
    if (!fs.existsSync(BLE_CONTROL_FILE)) {
      saveJsonFile(BLE_CONTROL_FILE, {
        enabled: true,
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Failed to ensure BLE control file:", err.message);
  }
}

function readBleControl() {
  ensureBleControlFile();
  return loadJsonDiskFile(BLE_CONTROL_FILE, {
    enabled: true,
    updated_at: new Date().toISOString()
  });
}

function writeBleControl(enabled) {
  ensureBleControlFile();
  const next = {
    enabled: !!enabled,
    updated_at: new Date().toISOString()
  };
  saveJsonFile(BLE_CONTROL_FILE, next);
  return next;
}

function ensureWifiControlFile() {
  try {
    ensureDataDir();
    if (!fs.existsSync(WIFI_CONTROL_FILE)) {
      saveJsonFile(WIFI_CONTROL_FILE, {
        enabled: true,
        interface: "wlan0",
        interval_seconds: 7,
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Failed to ensure Wi-Fi control file:", err.message);
  }
}

function readWifiControl() {
  ensureWifiControlFile();
  return loadJsonDiskFile(WIFI_CONTROL_FILE, {
    enabled: true,
    interface: "wlan0",
    interval_seconds: 7,
    updated_at: new Date().toISOString()
  });
}

function writeWifiControl(enabled) {
  ensureWifiControlFile();
  const current = readWifiControl();
  const next = {
    ...current,
    enabled: !!enabled,
    updated_at: new Date().toISOString()
  };
  saveJsonFile(WIFI_CONTROL_FILE, next);
  return next;
}

function normalizeIntelKey(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueTextList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => normalizeIntelKey(value))
      .filter(Boolean)
  )];
}

function ensureDeviceIntelFile() {
  try {
    ensureDataDir();
    if (!fs.existsSync(DEVICE_INTEL_FILE)) {
      saveJsonFile(DEVICE_INTEL_FILE, {
        updatedAt: new Date().toISOString(),
        items: []
      });
    }
  } catch (err) {
    console.error("Failed to ensure device intel file:", err.message);
  }
}

function normalizeIntelPort(port = {}) {
  const portNum = Number(port.port);
  return {
    port: Number.isFinite(portNum) && portNum > 0 ? portNum : null,
    service: String(port.service || "").trim().toLowerCase() || null,
    transport: String(port.transport || "tcp").trim().toLowerCase() || "tcp",
    surfaceType: String(port.surfaceType || port.surface || "identity").trim().toLowerCase() || "identity",
    authObserved: typeof port.authObserved === "boolean" ? port.authObserved : null,
    status: String(port.status || "present").trim().toLowerCase() || "present",
    summary: String(port.summary || "").trim() || null,
    fingerprintSummary: String(port.fingerprintSummary || "").trim() || null,
    exposureClass: String(port.exposureClass || "").trim().toUpperCase() || null,
    method: String(port.method || "").trim().toUpperCase() || null
  };
}

function normalizeIntelItem(item = {}) {
  const key = normalizeIntelKey(item.key || item.id || item.address || item.bssid || item.mac);
  if (!key) return null;

  const ports = Array.isArray(item.ports)
    ? item.ports.map(normalizeIntelPort).filter((entry) => entry.port || entry.service || entry.surfaceType)
    : [];

  const aliases = uniqueTextList(item.aliases || []).filter((alias) => alias !== key);
  const exposureClass = String(item.exposureClass || item.exposure || "E0").trim().toUpperCase() || "E0";
  const scope = String(item.scope || item.type || "generic").trim().toLowerCase() || "generic";
  const confidence = String(item.confidence || "medium").trim().toLowerCase() || "medium";
  const latencyMs = Number(item.latencyMs);

  return {
    key,
    aliases,
    scope,
    label: String(item.label || "").trim() || null,
    summary: String(item.summary || "").trim() || null,
    reachable: typeof item.reachable === "boolean" ? item.reachable : null,
    latencyMs: Number.isFinite(latencyMs) && latencyMs >= 0 ? Math.round(latencyMs) : null,
    ip: String(item.ip || "").trim() || null,
    hostname: String(item.hostname || "").trim() || null,
    confidence,
    exposureClass,
    authObserved: typeof item.authObserved === "boolean" ? item.authObserved : null,
    evidenceMode: String(item.evidenceMode || "metadata-only").trim().toLowerCase() || "metadata-only",
    surfaceSummary: uniqueTextList(item.surfaceSummary || []),
    protocolsSeen: uniqueTextList(item.protocolsSeen || []),
    servicePorts: Array.isArray(item.servicePorts)
      ? [...new Set(item.servicePorts.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [],
    ports,
    notes: String(item.notes || "").trim() || null,
    source: String(item.source || "manual").trim().toLowerCase() || "manual",
    pathFingerprint: String(item.pathFingerprint || "").trim() || null,
    updatedAt: new Date().toISOString()
  };
}

function readDeviceIntelStore() {
  ensureDeviceIntelFile();
  const raw = loadJsonDiskFile(DEVICE_INTEL_FILE, { updatedAt: null, items: [] });
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeIntelItem).filter(Boolean)
    : [];

  return {
    updatedAt: raw.updatedAt || null,
    items
  };
}

function summarizeDeviceIntelStore(store) {
  const items = Array.isArray(store?.items) ? store.items : [];
  const summary = {
    total: items.length,
    reachable: 0,
    ble: 0,
    wifi: 0,
    generic: 0,
    exposed: 0,
    byExposure: { E0: 0, E1: 0, E2: 0, E3: 0, E4: 0 }
  };

  for (const item of items) {
    if (item.reachable) summary.reachable += 1;
    if (item.scope === "ble") summary.ble += 1;
    else if (item.scope === "wifi") summary.wifi += 1;
    else summary.generic += 1;

    const exposure = item.exposureClass || "E0";
    if (!summary.byExposure[exposure]) summary.byExposure[exposure] = 0;
    summary.byExposure[exposure] += 1;
    if (exposure !== "E0") summary.exposed += 1;
  }

  return summary;
}

function writeDeviceIntelStore(store = {}) {
  const normalizedStore = {
    updatedAt: new Date().toISOString(),
    items: Array.isArray(store.items) ? store.items.map(normalizeIntelItem).filter(Boolean) : []
  };
  saveJsonFile(DEVICE_INTEL_FILE, normalizedStore);
  return normalizedStore;
}

function upsertDeviceIntelItems(items = []) {
  const store = readDeviceIntelStore();
  const byKey = new Map(store.items.map((item) => [item.key, item]));

  for (const incoming of items) {
    const normalized = normalizeIntelItem(incoming);
    if (!normalized) continue;

    const previous = byKey.get(normalized.key) || {};
    byKey.set(normalized.key, {
      ...previous,
      ...normalized,
      aliases: uniqueTextList([...(previous.aliases || []), ...(normalized.aliases || [])])
    });
  }

  return writeDeviceIntelStore({ items: [...byKey.values()] });
}

function deleteDeviceIntelItem(key) {
  const normalizedKey = normalizeIntelKey(key);
  const store = readDeviceIntelStore();
  return writeDeviceIntelStore({
    items: store.items.filter((item) => item.key !== normalizedKey)
  });
}

let currentSettings = loadJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
let currentScanner = loadJsonFile(SCANNER_FILE, DEFAULT_SCANNER);

/* -----------------------------
   Probe state
----------------------------- */

let probeState = {
  status: "idle",
  message: "No probe activity",
  lastDiscovery: null,
  lastScan: null,
  hostsDiscovered: 0,
  hostsScanned: 0,
  scanInProgress: false,
  discoveryInProgress: false,
  updatedAt: new Date().toISOString()
};

let autoProbeDiscoverTimer = null;
let autoProbeScanTimer = null;

function setProbeState(patch) {
  probeState = { ...probeState, ...patch, updatedAt: new Date().toISOString() };
}

function readProbeResults() {
  return loadJsonDiskFile(PROBE_RESULTS_FILE, { updatedAt: null, hosts: {} });
}

function writeProbeResults(results) {
  const out = { updatedAt: new Date().toISOString(), hosts: results.hosts || {} };
  saveJsonFile(PROBE_RESULTS_FILE, out);
  return out;
}

function readHostDiscovery() {
  return loadJsonDiskFile(HOST_DISCOVERY_FILE, { discoveredAt: null, subnets: [], hostCount: 0, hosts: [] });
}

function writeHostDiscovery(discovery) {
  saveJsonFile(HOST_DISCOVERY_FILE, discovery);
  return discovery;
}

function getProbeConfig() {
  return currentScanner.probe || {
    enabled: false,
    autoDiscover: false,
    discoverIntervalSec: 300,
    autoScan: false,
    scanIntervalSec: 600,
    ports: DEFAULT_PORTS,
    timeoutMs: 2000,
    concurrency: 10,
    subnetAllowList: [],
    subnetDenyList: []
  };
}

async function runDiscovery() {
  if (probeState.discoveryInProgress) {
    return readHostDiscovery();
  }
  setProbeState({ discoveryInProgress: true, status: "discovering", message: "Running host discovery..." });
  try {
    const config = getProbeConfig();
    const result = await discoverHosts({
      allowList: config.subnetAllowList || [],
      denyList: config.subnetDenyList || []
    });
    writeHostDiscovery(result);
    setProbeState({
      discoveryInProgress: false,
      status: "idle",
      message: `Discovered ${result.hostCount} hosts`,
      lastDiscovery: new Date().toISOString(),
      hostsDiscovered: result.hostCount
    });
    return result;
  } catch (err) {
    setProbeState({ discoveryInProgress: false, status: "error", message: `Discovery failed: ${err.message}` });
    throw err;
  }
}

async function runScan(targets, options = {}) {
  if (probeState.scanInProgress) {
    return { results: [], message: "Scan already in progress" };
  }
  setProbeState({ scanInProgress: true, status: "scanning", message: `Scanning ${targets.length} host(s)...` });
  try {
    const config = getProbeConfig();
    const portList = options.ports || config.ports || DEFAULT_PORTS;
    const timeoutMs = options.timeout || config.timeoutMs || 2000;
    const concurrency = config.concurrency || 10;

    const results = await scanHosts(targets, {
      ports: portList,
      timeoutMs,
      concurrency,
      hostConcurrency: 3
    });

    // Persist results keyed by IP
    const stored = readProbeResults();
    for (const result of results) {
      stored.hosts[result.ip] = result;
    }
    writeProbeResults(stored);

    // Auto-upsert into device intel
    const wifiControl = readWifiControl();
    const wifiSummary = loadJsonDiskFile(WIFI_SUMMARY_FILE, { networks: [] });
    const enrichedWifi = enrichWifiSummary({ ...wifiSummary, enabled: wifiControl.enabled });
    const discovery = readHostDiscovery();
    const wifiCorrelations = correlateWifiHosts(enrichedWifi.networks || [], discovery.hosts || []);
    const intelItems = probeResultsToIntelItems(results, wifiCorrelations);
    if (intelItems.length) {
      upsertDeviceIntelItems(intelItems);
    }

    setProbeState({
      scanInProgress: false,
      status: "idle",
      message: `Scanned ${results.length} host(s), ${results.reduce((sum, r) => sum + r.openPorts.length, 0)} open ports found`,
      lastScan: new Date().toISOString(),
      hostsScanned: results.length
    });

    return { results, intelItemsCreated: intelItems.length };
  } catch (err) {
    setProbeState({ scanInProgress: false, status: "error", message: `Scan failed: ${err.message}` });
    throw err;
  }
}

function syncAutoProbeTimers() {
  if (autoProbeDiscoverTimer) { clearInterval(autoProbeDiscoverTimer); autoProbeDiscoverTimer = null; }
  if (autoProbeScanTimer) { clearInterval(autoProbeScanTimer); autoProbeScanTimer = null; }

  const config = getProbeConfig();
  if (!config.enabled) return;

  if (config.autoDiscover && config.discoverIntervalSec > 0) {
    const ms = config.discoverIntervalSec * 1000;
    autoProbeDiscoverTimer = setInterval(() => {
      runDiscovery().catch((err) => console.error("Auto-discover error:", err.message));
    }, ms);
  }

  if (config.autoScan && config.scanIntervalSec > 0) {
    const ms = config.scanIntervalSec * 1000;
    autoProbeScanTimer = setInterval(async () => {
      try {
        const discovery = readHostDiscovery();
        if (discovery.hosts && discovery.hosts.length) {
          await runScan(discovery.hosts);
        }
      } catch (err) {
        console.error("Auto-scan error:", err.message);
      }
    }, ms);
  }
}

/* -----------------------------
   Shared browser/local listen pipeline
----------------------------- */

let listenRtlProc = null;
let listenAplayProc = null;
let listenFfmpegProc = null;
let listenRawBus = null;
let listenPipelineKey = null;
const listenAudioClients = new Set();
const listenLog = [];
const LISTEN_MODE_RELEASE_DELAY_MS = Math.max(0, Number(process.env.LISTEN_MODE_RELEASE_DELAY_MS || 700));
const LISTEN_START_MAX_RETRIES = Math.max(1, Number(process.env.LISTEN_START_MAX_RETRIES || 4));
const LISTEN_START_RETRY_DELAY_MS = Math.max(100, Number(process.env.LISTEN_START_RETRY_DELAY_MS || 700));

let listenRetryTimer = null;
let listenStartAttempts = 0;
let listenExpectedPipelineKey = null;
let listenLastError = "";

let listenStatus = {
  active: false,
  state: "idle",
  message: "Not listening",
  frequency: null,
  modulation: null,
  gain: null,
  squelch: null,
  sampleRate: null,
  audioDevice: process.env.APLAY_DEVICE || "default",
  clients: 0,
  startedAt: null,
  updatedAt: new Date().toISOString()
};

function appendListenLog(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  listenLog.push(line);
  while (listenLog.length > 200) listenLog.shift();
  console.log(line);
}

function setListenStatus(patch) {
  listenStatus = {
    ...listenStatus,
    ...patch,
    clients: listenAudioClients.size,
    updatedAt: new Date().toISOString()
  };
}

function getListenSampleRate(modulation) {
  return modulation === "wbfm" ? 32000 : 24000;
}

function getListenPipelineKey(listen) {
  return JSON.stringify({
    frequency: listen.frequency,
    modulation: listen.modulation,
    gain: Number(listen.gain),
    squelch: Number(listen.squelch)
  });
}

function isChildAlive(child) {
  return !!(child && !child.killed && child.exitCode == null);
}

function clearListenRetryTimer() {
  if (listenRetryTimer) {
    clearTimeout(listenRetryTimer);
    listenRetryTimer = null;
  }
}

function isRetryableListenError(message) {
  const text = String(message || "").toLowerCase();
  return [
    "usb_claim_interface error",
    "failed to open rtlsdr device",
    "resource busy",
    "device or resource busy",
    "no supported devices found"
  ].some(pattern => text.includes(pattern));
}

function buildRuntimeScanner(scanner) {
  const runtime = JSON.parse(JSON.stringify(scanner));

  if (runtime.mode === "listen" && runtime.listen?.enabled) {
    runtime.mode = "paused";
    runtime.freqRange = "";
    runtime.interval = "";
    runtime.window = "";
  }

  return runtime;
}

function scheduleListenRetry(scanner, reason) {
  if (currentScanner.mode !== "listen" || !currentScanner.listen?.enabled) {
    return false;
  }

  if (listenStartAttempts >= LISTEN_START_MAX_RETRIES) {
    return false;
  }

  clearListenRetryTimer();
  listenStartAttempts += 1;

  const delayMs = listenStartAttempts === 1
    ? LISTEN_MODE_RELEASE_DELAY_MS
    : LISTEN_START_RETRY_DELAY_MS;

  setListenStatus({
    active: false,
    state: "starting",
    message: `${reason} — retry ${listenStartAttempts}/${LISTEN_START_MAX_RETRIES} in ${delayMs}ms`,
    startedAt: null
  });

  appendListenLog(
    `Scheduling listen retry ${listenStartAttempts}/${LISTEN_START_MAX_RETRIES} in ${delayMs}ms: ${reason}`
  );

  listenRetryTimer = setTimeout(() => {
    listenRetryTimer = null;
    if (currentScanner.mode === "listen" && currentScanner.listen?.enabled) {
      startListenAudioPipeline(scanner, { isRetry: true });
    }
  }, delayMs);

  return true;
}

function endListenAudioClients() {
  for (const res of listenAudioClients) {
    try {
      if (!res.writableEnded) res.end();
    } catch (_) {}
  }
  listenAudioClients.clear();
  setListenStatus({});
}

function killChild(child, name) {
  if (!child) return;

  try {
    child.kill("SIGTERM");
  } catch (_) {}

  setTimeout(() => {
    try {
      if (child.exitCode == null) child.kill("SIGKILL");
    } catch (_) {}
  }, 250);

  if (name) {
    appendListenLog(`Stopping ${name}`);
  }
}

function stopListenAudioPipeline(reason = "Listen pipeline stopped", options = {}) {
  const { resetRetries = true } = options;

  if (resetRetries) {
    clearListenRetryTimer();
    listenStartAttempts = 0;
    listenExpectedPipelineKey = null;
  }

  if (listenRawBus) {
    try {
      listenRawBus.destroy();
    } catch (_) {}
    listenRawBus = null;
  }

  if (listenAplayProc && listenAplayProc.stdin) {
    try {
      listenAplayProc.stdin.destroy();
    } catch (_) {}
  }

  if (listenFfmpegProc && listenFfmpegProc.stdin) {
    try {
      listenFfmpegProc.stdin.destroy();
    } catch (_) {}
  }

  killChild(listenRtlProc, "rtl_fm");
  killChild(listenAplayProc, "aplay");
  killChild(listenFfmpegProc, "ffmpeg");

  listenRtlProc = null;
  listenAplayProc = null;
  listenFfmpegProc = null;
  listenPipelineKey = null;

  endListenAudioClients();
  listenLastError = "";

  setListenStatus({
    active: false,
    state: "stopped",
    message: reason,
    startedAt: null
  });
}

function startListenAudioPipeline(scanner, options = {}) {
  const { isRetry = false } = options;
  const listen = scanner.listen || {};
  const frequency = listen.frequency || scanner.targetFrequency;
  const modulation = String(listen.modulation || "fm").toLowerCase();
  const gain = Number(listen.gain ?? 30);
  const squelch = Number(listen.squelch ?? 0);

  if (!frequency) {
    setListenStatus({
      active: false,
      state: "error",
      message: "No listen frequency set"
    });
    return false;
  }

  if (!["fm", "wbfm", "am"].includes(modulation)) {
    setListenStatus({
      active: false,
      state: "error",
      message: `Unsupported modulation: ${modulation}`
    });
    return false;
  }

  const nextKey = getListenPipelineKey({
    frequency,
    modulation,
    gain,
    squelch
  });

  if (
    listenPipelineKey === nextKey &&
    isChildAlive(listenRtlProc) &&
    isChildAlive(listenAplayProc) &&
    isChildAlive(listenFfmpegProc)
  ) {
    return true;
  }

  if (listenExpectedPipelineKey !== nextKey) {
    clearListenRetryTimer();
    listenStartAttempts = 0;
    listenExpectedPipelineKey = nextKey;
    listenLastError = "";
  }

  if (listenExpectedPipelineKey === nextKey && listenRetryTimer && !isRetry) {
    return true;
  }

  stopListenAudioPipeline("Restarting listen pipeline", { resetRetries: false });

  const sampleRate = getListenSampleRate(modulation);
  const aplayDevice = process.env.APLAY_DEVICE || "default";
  const ffmpegPath = fs.existsSync("/usr/bin/ffmpeg") ? "/usr/bin/ffmpeg" : "ffmpeg";

  const rtlArgs = [
    "-f", frequency,
    "-M", modulation,
    "-g", String(gain)
  ];

  if (modulation === "wbfm") {
    rtlArgs.push("-E", "deemp");
  } else {
    rtlArgs.push(
      "-l", String(squelch),
      "-s", String(sampleRate),
      "-r", String(sampleRate)
    );
  }

  rtlArgs.push("-");

  const ffmpegArgs = [
    "-hide_banner",
    "-loglevel", "warning",
    "-f", "s16le",
    "-ar", String(sampleRate),
    "-ac", "1",
    "-i", "pipe:0",
    "-f", "mp3",
    "-b:a", "128k",
    "pipe:1"
  ];

  appendListenLog(
    `Starting listen pipeline freq=${frequency} mod=${modulation} gain=${gain} squelch=${squelch} sampleRate=${sampleRate} device=${aplayDevice}${isRetry ? ` retry=${listenStartAttempts}/${LISTEN_START_MAX_RETRIES}` : ""}`
  );

  listenRtlProc = spawn("rtl_fm", rtlArgs, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  listenAplayProc = spawn("aplay", [
    "-D", aplayDevice,
    "-r", String(sampleRate),
    "-f", "S16_LE",
    "-t", "raw",
    "-c", "1"
  ], {
    stdio: ["pipe", "ignore", "pipe"]
  });

  listenFfmpegProc = spawn(ffmpegPath, ffmpegArgs, {
    stdio: ["pipe", "pipe", "pipe"]
  });

  listenPipelineKey = nextKey;
  listenRawBus = new PassThrough();

  if (listenRtlProc.stdout) {
    listenRtlProc.stdout.once("data", () => {
      if (currentScanner.mode === "listen" && currentScanner.listen?.enabled) {
        clearListenRetryTimer();
        listenStartAttempts = 0;
        listenLastError = "";
        setListenStatus({
          active: true,
          state: "running",
          message: "Listen audio pipeline running",
          frequency,
          modulation,
          gain,
          squelch,
          sampleRate,
          audioDevice: aplayDevice,
          startedAt: listenStatus.startedAt || new Date().toISOString()
        });
      }
    });

    listenRtlProc.stdout.pipe(listenRawBus);
  }

  if (listenAplayProc.stdin) {
    listenAplayProc.stdin.on("error", () => {});
    listenRawBus.pipe(listenAplayProc.stdin);
  }

  if (listenFfmpegProc.stdin) {
    listenFfmpegProc.stdin.on("error", () => {});
    listenRawBus.pipe(listenFfmpegProc.stdin);
  }

  if (listenRtlProc.stderr) {
    listenRtlProc.stderr.on("data", chunk => {
      const text = chunk.toString().trim();
      if (text) {
        listenLastError = text;
        appendListenLog(`rtl_fm: ${text}`);
      }
    });
  }

  if (listenAplayProc.stderr) {
    listenAplayProc.stderr.on("data", chunk => {
      const text = chunk.toString().trim();
      if (text) appendListenLog(`aplay: ${text}`);
    });
  }

  if (listenFfmpegProc.stderr) {
    listenFfmpegProc.stderr.on("data", chunk => {
      const text = chunk.toString().trim();
      if (text) appendListenLog(`ffmpeg: ${text}`);
    });
  }

  if (listenFfmpegProc.stdout) {
    listenFfmpegProc.stdout.on("data", chunk => {
      if (!listenAudioClients.size) return;

      for (const res of [...listenAudioClients]) {
        try {
          if (res.writableEnded) {
            listenAudioClients.delete(res);
            continue;
          }
          res.write(chunk);
        } catch (_) {
          listenAudioClients.delete(res);
          try {
            res.end();
          } catch (_) {}
        }
      }

      setListenStatus({});
    });
  }

  listenRtlProc.on("close", code => {
    const closeMessage = code === 0
      ? "rtl_fm exited"
      : (listenLastError || `rtl_fm exited with code ${code}`);

    appendListenLog(`rtl_fm exited with code ${code}`);

    if (
      code !== 0 &&
      currentScanner.mode === "listen" &&
      currentScanner.listen?.enabled &&
      isRetryableListenError(closeMessage) &&
      scheduleListenRetry(currentScanner, closeMessage)
    ) {
      return;
    }

    if (currentScanner.mode === "listen") {
      setListenStatus({
        active: false,
        state: code === 0 ? "stopped" : "error",
        message: closeMessage
      });
    }
  });

  listenAplayProc.on("close", code => {
    appendListenLog(`aplay exited with code ${code}`);
  });

  listenFfmpegProc.on("close", code => {
    appendListenLog(`ffmpeg exited with code ${code}`);
    if (currentScanner.mode === "listen") {
      endListenAudioClients();
      if (!listenRetryTimer) {
        setListenStatus({
          active: false,
          state: code === 0 ? "stopped" : "error",
          message: code === 0 ? "ffmpeg exited" : `ffmpeg exited with code ${code}`
        });
      }
    }
  });

  listenRtlProc.on("error", err => {
    appendListenLog(`rtl_fm spawn error: ${err.code || ""} ${err.message}`);
    setListenStatus({
      active: false,
      state: "error",
      message: `rtl_fm spawn error: ${err.code || ""} ${err.message}`.trim()
    });
  });

  listenAplayProc.on("error", err => {
    appendListenLog(`aplay spawn error: ${err.code || ""} ${err.message}`);
    setListenStatus({
      active: false,
      state: "error",
      message: `aplay spawn error: ${err.code || ""} ${err.message}`.trim()
    });
  });

  listenFfmpegProc.on("error", err => {
    appendListenLog(`ffmpeg spawn error: ${err.code || ""} ${err.message}`);
    setListenStatus({
      active: false,
      state: "error",
      message: `ffmpeg spawn error: ${err.code || ""} ${err.message}`.trim()
    });
  });

  setListenStatus({
    active: false,
    state: "starting",
    message: isRetry
      ? `Retrying listen pipeline (${Math.min(listenStartAttempts, LISTEN_START_MAX_RETRIES)}/${LISTEN_START_MAX_RETRIES})`
      : "Listen audio pipeline starting",
    frequency,
    modulation,
    gain,
    squelch,
    sampleRate,
    audioDevice: aplayDevice,
    startedAt: new Date().toISOString()
  });

  return true;
}

function syncListenPipeline() {
  if (currentScanner.mode === "listen" && currentScanner.listen?.enabled) {
    startListenAudioPipeline(currentScanner);
  } else {
    stopListenAudioPipeline("Listen mode inactive");
  }
}

/* -----------------------------
   Core helpers
----------------------------- */

function hzToM(hz) {
  return `${(hz / 1e6).toFixed(6)}M`;
}

function buildTrackFreqRange(centerHz, spanHz, binHz) {
  const start = centerHz - spanHz / 2;
  const stop = centerHz + spanHz / 2;
  return `${hzToM(start)}:${hzToM(stop)}:${Math.round(binHz)}`;
}

function normalizeFrequencyInput(value) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;

  if (/^\d+(\.\d+)?[KMG]$/.test(raw)) return raw;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return null;

    if (num < 1000000) return `${raw}M`;
    return raw;
  }

  return null;
}

function normalizeScanner(scanner) {
  const out = JSON.parse(JSON.stringify({ ...DEFAULT_SCANNER, ...scanner }));

  if (!out.survey) out.survey = { ...DEFAULT_SCANNER.survey };
  if (!out.track) out.track = { ...DEFAULT_SCANNER.track };
  if (!out.listen) out.listen = { ...DEFAULT_SCANNER.listen };

  out.listen = {
    ...DEFAULT_SCANNER.listen,
    ...out.listen
  };

  if (!["survey", "track", "paused", "listen"].includes(out.mode)) {
    out.mode = "survey";
  }

  if (!["survey", "track"].includes(out.lastActiveMode)) {
    out.lastActiveMode = "survey";
  }

  if (out.mode === "track") {
    out.lastActiveMode = "track";
    out.listen.enabled = false;
    out.freqRange = buildTrackFreqRange(
      Number(out.track.centerHz),
      Number(out.track.spanHz),
      Number(out.track.binHz)
    );
    out.interval = out.track.interval;
    out.window = out.track.window;
  } else if (out.mode === "paused") {
    out.listen.enabled = false;
    out.freqRange = "";
    out.interval = "";
    out.window = "";
  } else if (out.mode === "listen") {
    out.listen.enabled = true;
    out.freqRange = "";
    out.interval = "";
    out.window = "";
  } else {
    out.mode = "survey";
    out.lastActiveMode = "survey";
    out.listen.enabled = false;
    out.freqRange = out.survey.freqRange;
    out.interval = out.survey.interval;
    out.window = out.survey.window;
  }

  return out;
}

function persistScanner(scanner, { clearRows = true } = {}) {
  currentScanner = normalizeScanner(scanner);
  saveJsonFile(SCANNER_FILE, currentScanner);
  saveJsonFile(SCANNER_RUNTIME_FILE, buildRuntimeScanner(currentScanner));
  if (clearRows) clearLiveRows();
  syncListenPipeline();
  return currentScanner;
}

function clearLiveRows() {
  liveRows.length = 0;
}

function clearRecordedRows() {
  recordedRows = [];
}

currentScanner = normalizeScanner(currentScanner);
saveJsonFile(SCANNER_FILE, currentScanner);
saveJsonFile(SCANNER_RUNTIME_FILE, buildRuntimeScanner(currentScanner));
ensureBleControlFile();
ensureWifiControlFile();
ensureDeviceIntelFile();
syncListenPipeline();

function addLiveLine(line) {
  const parsed = parseLine(line);
  if (!parsed) return;

  liveRows.push(parsed);
  while (liveRows.length > MAX_LIVE_ROWS) {
    liveRows.shift();
  }

  if (isRecording) {
    recordedRows.push(parsed);
  }
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType = "text/html") {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html";
    case ".js": return "application/javascript";
    case ".css": return "text/css";
    case ".json": return "application/json";
    default: return "application/octet-stream";
  }
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk.toString()));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function mergeScanner(current, incoming) {
  return normalizeScanner({
    ...current,
    ...incoming,
    survey: { ...current.survey, ...(incoming.survey || {}) },
    track: { ...current.track, ...(incoming.track || {}) },
    listen: { ...current.listen, ...(incoming.listen || {}) },
    probe: { ...(current.probe || {}), ...(incoming.probe || {}) }
  });
}

/* -----------------------------
   HTTP API
----------------------------- */

const webServer = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === "GET" && parsed.pathname === "/api/files") {
    return sendJson(res, { files: ["live", ...listFiles()] });
  }

  if (req.method === "GET" && parsed.pathname === "/api/settings") {
    return sendJson(res, currentSettings);
  }

  if (req.method === "POST" && parsed.pathname === "/api/settings") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      currentSettings = { ...currentSettings, ...incoming };
      return sendJson(res, { ok: true, settings: currentSettings });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/settings/save") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      currentSettings = { ...currentSettings, ...incoming };
      saveJsonFile(SETTINGS_FILE, currentSettings);
      return sendJson(res, { ok: true, settings: currentSettings });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "GET" && parsed.pathname === "/api/scanner") {
    return sendJson(res, currentScanner);
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/run") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      persistScanner(mergeScanner(currentScanner, incoming));
      return sendJson(res, { ok: true, scanner: currentScanner });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/save") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      persistScanner(mergeScanner(currentScanner, incoming));
      return sendJson(res, { ok: true, scanner: currentScanner });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/survey") {
    persistScanner({
      ...currentScanner,
      mode: "survey",
      lastActiveMode: "survey",
      listen: {
        ...currentScanner.listen,
        enabled: false
      }
    });
    return sendJson(res, { ok: true, scanner: currentScanner });
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/track") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      persistScanner({
        ...currentScanner,
        mode: "track",
        lastActiveMode: "track",
        listen: {
          ...currentScanner.listen,
          enabled: false
        },
        track: {
          ...currentScanner.track,
          ...incoming
        }
      });
      return sendJson(res, { ok: true, scanner: currentScanner });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/pause") {
    persistScanner({
      ...currentScanner,
      mode: "paused"
    });
    return sendJson(res, { ok: true, scanner: currentScanner });
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/resume") {
    const resumeMode = currentScanner.lastActiveMode === "track" ? "track" : "survey";
    persistScanner({
      ...currentScanner,
      mode: resumeMode,
      listen: {
        ...currentScanner.listen,
        enabled: false
      }
    });
    return sendJson(res, { ok: true, scanner: currentScanner });
  }

  if (req.method === "GET" && parsed.pathname === "/api/listen") {
    return sendJson(res, {
      ok: true,
      mode: currentScanner.mode,
      lastActiveMode: currentScanner.lastActiveMode,
      listen: currentScanner.listen
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/listen/status") {
    return sendJson(res, {
      ok: true,
      scannerMode: currentScanner.mode,
      status: {
        ...listenStatus,
        clients: listenAudioClients.size
      }
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/listen/log") {
    return sendJson(res, {
      ok: true,
      lines: listenLog.slice(-100)
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/listen/audio") {
    if (currentScanner.mode !== "listen" || !currentScanner.listen?.enabled) {
      res.writeHead(409, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Listen mode is not active");
    }

    const started = startListenAudioPipeline(currentScanner);
    if (!started) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Listen pipeline failed to start");
    }

    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Connection": "keep-alive",
      "Transfer-Encoding": "chunked"
    });

    listenAudioClients.add(res);
    setListenStatus({});

    req.on("close", () => {
      listenAudioClients.delete(res);
      try {
        if (!res.writableEnded) res.end();
      } catch (_) {}
      setListenStatus({});
    });

    return;
  }

  if (req.method === "POST" && parsed.pathname === "/api/listen/start") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");

      const frequency = normalizeFrequencyInput(
        incoming.frequency ?? incoming.freq ?? currentScanner.listen?.frequency
      );
      const modulation = String(
        incoming.modulation ?? currentScanner.listen?.modulation ?? "fm"
      ).toLowerCase();
      const gain = Number(incoming.gain ?? currentScanner.listen?.gain ?? 30);
      const squelch = Number(incoming.squelch ?? currentScanner.listen?.squelch ?? 0);

      if (!frequency) {
        return sendJson(res, {
          ok: false,
          error: "A valid frequency is required, for example 162.55M or 99.5M"
        }, 400);
      }

      if (!["fm", "wbfm", "am"].includes(modulation)) {
        return sendJson(res, {
          ok: false,
          error: "Unsupported modulation. Use fm, wbfm, or am."
        }, 400);
      }

      const previousMode =
        currentScanner.mode === "track" || currentScanner.mode === "survey"
          ? currentScanner.mode
          : currentScanner.lastActiveMode === "track"
            ? "track"
            : "survey";

      persistScanner({
        ...currentScanner,
        mode: "listen",
        lastActiveMode: previousMode,
        targetFrequency: frequency,
        listen: {
          ...currentScanner.listen,
          enabled: true,
          frequency,
          modulation,
          gain,
          squelch
        }
      });

      return sendJson(res, {
        ok: true,
        scanner: currentScanner
      });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/listen/stop") {
    const resumeMode = currentScanner.lastActiveMode === "track" ? "track" : "survey";

    persistScanner({
      ...currentScanner,
      mode: resumeMode,
      listen: {
        ...currentScanner.listen,
        enabled: false
      }
    });

    return sendJson(res, {
      ok: true,
      scanner: currentScanner
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/ble/status") {
    const control = readBleControl();
    const status = loadJsonDiskFile(BLE_STATUS_FILE, {
      status: "unknown",
      enabled: control.enabled,
      total_unique_seen: 0,
      active_unique_seen: 0,
      total_events: 0
    });

    return sendJson(res, {
      ok: true,
      control,
      status: {
        ...status,
        enabled: control.enabled
      }
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/ble/summary") {
    const control = readBleControl();
    const summary = loadJsonDiskFile(BLE_SUMMARY_FILE, {
      status: control.enabled ? "running" : "paused",
      enabled: control.enabled,
      total_unique_seen: 0,
      active_unique_seen: 0,
      total_events: 0,
      strongest_active: null,
      devices: []
    });

    const enriched = enrichBleSummary({
      ...summary,
      enabled: control.enabled
    });

    return sendJson(res, {
      ok: true,
      control,
      summary: enriched
    });
  }

  if (req.method === "POST" && parsed.pathname === "/api/ble/start") {
    const control = writeBleControl(true);
    return sendJson(res, {
      ok: true,
      control
    });
  }

  if (req.method === "POST" && parsed.pathname === "/api/ble/stop") {
    const control = writeBleControl(false);
    return sendJson(res, {
      ok: true,
      control
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/wifi/status") {
    const control = readWifiControl();
    const status = loadJsonDiskFile(WIFI_STATUS_FILE, {
      status: "unknown",
      enabled: control.enabled,
      interface: control.interface,
      total_unique_seen: 0,
      active_unique_seen: 0,
      total_events: 0
    });

    return sendJson(res, {
      ok: true,
      control,
      status: {
        ...status,
        enabled: control.enabled
      }
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/wifi/summary") {
    const control = readWifiControl();
    const summary = loadJsonDiskFile(WIFI_SUMMARY_FILE, {
      status: control.enabled ? "running" : "paused",
      enabled: control.enabled,
      total_unique_seen: 0,
      active_unique_seen: 0,
      total_events: 0,
      strongest_active: null,
      networks: []
    });

    const enriched = enrichWifiSummary({
      ...summary,
      enabled: control.enabled
    });

    return sendJson(res, {
      ok: true,
      control,
      summary: enriched
    });
  }

  if (req.method === "POST" && parsed.pathname === "/api/wifi/start") {
    const control = writeWifiControl(true);
    return sendJson(res, { ok: true, control });
  }

  if (req.method === "POST" && parsed.pathname === "/api/wifi/stop") {
    const control = writeWifiControl(false);
    return sendJson(res, { ok: true, control });
  }

  /* --- Network Probe APIs --- */

  if (req.method === "GET" && parsed.pathname === "/api/probe/status") {
    return sendJson(res, {
      ok: true,
      probe: probeState,
      config: getProbeConfig(),
      discovery: readHostDiscovery(),
      resultCount: Object.keys(readProbeResults().hosts || {}).length
    });
  }

  if (req.method === "POST" && parsed.pathname === "/api/probe/discover") {
    try {
      const result = await runDiscovery();
      return sendJson(res, { ok: true, discovery: result });
    } catch (err) {
      return sendJson(res, { ok: false, error: err.message }, 500);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/probe/scan") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      const target = incoming.target;
      const ports = Array.isArray(incoming.ports) ? incoming.ports : null;
      const timeout = incoming.timeout || null;

      let targets;
      if (target === "all" || !target) {
        const discovery = readHostDiscovery();
        targets = discovery.hosts || [];
        if (!targets.length) {
          return sendJson(res, { ok: false, error: "No discovered hosts. Run discovery first." }, 400);
        }
      } else {
        // Validate target looks like an IP
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
          return sendJson(res, { ok: false, error: "Invalid IP address format" }, 400);
        }
        const discovery = readHostDiscovery();
        const known = (discovery.hosts || []).find((h) => h.ip === target);
        targets = [{ ip: target, mac: known?.mac || null, hostname: known?.hostname || null }];
      }

      const result = await runScan(targets, { ports, timeout });
      return sendJson(res, { ok: true, ...result });
    } catch (err) {
      return sendJson(res, { ok: false, error: err.message }, 500);
    }
  }

  if (req.method === "GET" && parsed.pathname === "/api/probe/results") {
    const stored = readProbeResults();
    const hosts = stored.hosts || {};
    return sendJson(res, {
      ok: true,
      updatedAt: stored.updatedAt,
      count: Object.keys(hosts).length,
      hosts
    });
  }

  if (req.method === "GET" && parsed.pathname.startsWith("/api/probe/results/")) {
    const ip = parsed.pathname.replace("/api/probe/results/", "").trim();
    if (!ip) return sendJson(res, { ok: false, error: "Missing IP" }, 400);
    const stored = readProbeResults();
    const result = (stored.hosts || {})[ip];
    if (!result) return sendJson(res, { ok: false, error: "No results for that IP" }, 404);
    return sendJson(res, { ok: true, result });
  }

  if (req.method === "POST" && parsed.pathname === "/api/probe/auto") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      const probeConfig = getProbeConfig();

      if (typeof incoming.enabled === "boolean") probeConfig.enabled = incoming.enabled;
      if (typeof incoming.autoDiscover === "boolean") probeConfig.autoDiscover = incoming.autoDiscover;
      if (typeof incoming.autoScan === "boolean") probeConfig.autoScan = incoming.autoScan;
      if (Number.isFinite(incoming.discoverIntervalSec)) probeConfig.discoverIntervalSec = incoming.discoverIntervalSec;
      if (Number.isFinite(incoming.scanIntervalSec)) probeConfig.scanIntervalSec = incoming.scanIntervalSec;

      currentScanner = { ...currentScanner, probe: probeConfig };
      saveJsonFile(SCANNER_FILE, currentScanner);
      syncAutoProbeTimers();

      return sendJson(res, { ok: true, config: probeConfig });
    } catch (err) {
      return sendJson(res, { ok: false, error: err.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/probe/config") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      const probeConfig = getProbeConfig();

      if (Array.isArray(incoming.ports)) probeConfig.ports = incoming.ports.filter((p) => Number.isFinite(p) && p > 0 && p <= 65535);
      if (Number.isFinite(incoming.timeoutMs)) probeConfig.timeoutMs = Math.max(500, Math.min(incoming.timeoutMs, 30000));
      if (Number.isFinite(incoming.concurrency)) probeConfig.concurrency = Math.max(1, Math.min(incoming.concurrency, 50));
      if (Array.isArray(incoming.subnetAllowList)) probeConfig.subnetAllowList = incoming.subnetAllowList;
      if (Array.isArray(incoming.subnetDenyList)) probeConfig.subnetDenyList = incoming.subnetDenyList;

      currentScanner = { ...currentScanner, probe: probeConfig };
      saveJsonFile(SCANNER_FILE, currentScanner);

      return sendJson(res, { ok: true, config: probeConfig });
    } catch (err) {
      return sendJson(res, { ok: false, error: err.message }, 400);
    }
  }

  if (req.method === "GET" && parsed.pathname === "/api/intel") {
    const store = readDeviceIntelStore();
    return sendJson(res, {
      ok: true,
      updatedAt: store.updatedAt,
      items: store.items,
      store,
      summary: summarizeDeviceIntelStore(store)
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/fusion") {
    const bleControl = readBleControl();
    const wifiControl = readWifiControl();

    const bleSummary = enrichBleSummary({
      ...loadJsonDiskFile(BLE_SUMMARY_FILE, {
        status: bleControl.enabled ? "running" : "paused",
        enabled: bleControl.enabled,
        total_unique_seen: 0,
        active_unique_seen: 0,
        total_events: 0,
        strongest_active: null,
        devices: []
      }),
      enabled: bleControl.enabled
    });

    const wifiSummary = enrichWifiSummary({
      ...loadJsonDiskFile(WIFI_SUMMARY_FILE, {
        status: wifiControl.enabled ? "running" : "paused",
        enabled: wifiControl.enabled,
        total_unique_seen: 0,
        active_unique_seen: 0,
        total_events: 0,
        strongest_active: null,
        networks: []
      }),
      enabled: wifiControl.enabled
    });

    const intelStore = readDeviceIntelStore();
    const fusion = buildIntelFusion({
      wifiSummary,
      bleSummary,
      intelStore
    });

    return sendJson(res, {
      ok: true,
      fusion
    });
  }

  if (req.method === "POST" && parsed.pathname === "/api/intel/upsert") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      const items = Array.isArray(incoming)
        ? incoming
        : Array.isArray(incoming.items)
          ? incoming.items
          : [incoming];

      const store = upsertDeviceIntelItems(items);

      return sendJson(res, {
        ok: true,
        updatedAt: store.updatedAt,
        items: store.items,
        summary: summarizeDeviceIntelStore(store)
      });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/intel/delete") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      if (!incoming.key) {
        return sendJson(res, { ok: false, error: "Missing key" }, 400);
      }

      const store = deleteDeviceIntelItem(incoming.key);

      return sendJson(res, {
        ok: true,
        updatedAt: store.updatedAt,
        items: store.items,
        summary: summarizeDeviceIntelStore(store)
      });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/intel/clear") {
    const store = writeDeviceIntelStore({ items: [] });
    return sendJson(res, {
      ok: true,
      updatedAt: store.updatedAt,
      items: store.items,
      summary: summarizeDeviceIntelStore(store)
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/live") {
    return sendJson(res, buildDataset("live", liveRows, currentSettings));
  }

  if (req.method === "GET" && parsed.pathname === "/api/data") {
    const file = parsed.query.file;
    if (!file) return sendJson(res, { error: "Missing file" }, 400);

    if (file === "live") {
      return sendJson(res, buildDataset("live", liveRows, currentSettings));
    }

    try {
      return sendJson(res, parseFile(file, currentSettings));
    } catch (e) {
      return sendJson(res, { error: e.message }, 500);
    }
  }

  if (req.method === "GET" && parsed.pathname === "/api/record/status") {
    return sendJson(res, { recording: isRecording, rows: recordedRows.length });
  }

  if (req.method === "GET" && parsed.pathname === "/api/record/start") {
    isRecording = true;
    clearRecordedRows();
    return sendJson(res, { ok: true, recording: true, rows: 0 });
  }

  if (req.method === "GET" && parsed.pathname === "/api/record/stop") {
    isRecording = false;
    return sendJson(res, {
      ok: true,
      recording: false,
      rows: recordedRows.length
    });
  }

  if (req.method === "GET" && parsed.pathname.startsWith("/js/")) {
    const relativePath = parsed.pathname.replace(/^\/+/, "");
    const filePath = path.join(PUBLIC_DIR, relativePath);
    return sendFile(res, filePath, getContentType(filePath));
  }

  if (parsed.pathname === "/") {
    return sendFile(res, path.join(PUBLIC_DIR, "index.html"), "text/html");
  }

  res.writeHead(404);
  res.end("Not found");
});

webServer.listen(PORT, HOST, () => {
  console.log(`RF viewer v2 running on http://${HOST}:${PORT}`);
  syncAutoProbeTimers();
});

const tcpServer = net.createServer((socket) => {
  let buffer = "";

  socket.on("data", chunk => {
    buffer += chunk.toString();
    let idx;

    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) addLiveLine(line);
    }
  });

  socket.on("error", () => {});
});

tcpServer.listen(TCP_PORT, HOST, () => {
  console.log(`Live line listener on ${HOST}:${TCP_PORT}`);
});