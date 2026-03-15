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

let currentSettings = loadJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
let currentScanner = loadJsonFile(SCANNER_FILE, DEFAULT_SCANNER);

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

function stopListenAudioPipeline(reason = "Listen pipeline stopped") {
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

  setListenStatus({
    active: false,
    state: "stopped",
    message: reason,
    startedAt: null
  });
}

function startListenAudioPipeline(scanner) {
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

  stopListenAudioPipeline("Restarting listen pipeline");

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
    `Starting listen pipeline freq=${frequency} mod=${modulation} gain=${gain} squelch=${squelch} sampleRate=${sampleRate} device=${aplayDevice}`
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
      if (text) appendListenLog(`rtl_fm: ${text}`);
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
    appendListenLog(`rtl_fm exited with code ${code}`);
    if (currentScanner.mode === "listen") {
      setListenStatus({
        active: false,
        state: code === 0 ? "stopped" : "error",
        message: code === 0 ? "rtl_fm exited" : `rtl_fm exited with code ${code}`
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
      setListenStatus({
        active: false,
        state: code === 0 ? "stopped" : "error",
        message: code === 0 ? "ffmpeg exited" : `ffmpeg exited with code ${code}`
      });
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
    active: true,
    state: "running",
    message: "Listen audio pipeline running",
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
  saveJsonFile(SCANNER_RUNTIME_FILE, currentScanner);
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
saveJsonFile(SCANNER_RUNTIME_FILE, currentScanner);
ensureBleControlFile();
ensureWifiControlFile();
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
    listen: { ...current.listen, ...(incoming.listen || {}) }
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