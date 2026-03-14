const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { listFiles, parseFile, parseLine, buildDataset } = require("./parser");

const PORT = 3000;
const TCP_PORT = 9001;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const SETTINGS_FILE = path.join(__dirname, "settings.json");
const SCANNER_FILE = path.join(__dirname, "scanner.json");
const SCANNER_RUNTIME_FILE = path.join(__dirname, "scanner.runtime.json");

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

function saveJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let currentSettings = loadJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
let currentScanner = loadJsonFile(SCANNER_FILE, DEFAULT_SCANNER);

function hzToM(hz) {
  return `${(hz / 1e6).toFixed(6)}M`;
}

function buildTrackFreqRange(centerHz, spanHz, binHz) {
  const start = centerHz - spanHz / 2;
  const stop = centerHz + spanHz / 2;
  return `${hzToM(start)}:${hzToM(stop)}:${Math.round(binHz)}`;
}

function normalizeScanner(scanner) {
  const out = JSON.parse(JSON.stringify({ ...DEFAULT_SCANNER, ...scanner }));

  if (!out.survey) out.survey = { ...DEFAULT_SCANNER.survey };
  if (!out.track) out.track = { ...DEFAULT_SCANNER.track };

  if (out.mode !== "paused" && out.mode !== "track") {
    out.mode = "survey";
  }

  if (out.mode === "track") {
    out.lastActiveMode = "track";
    out.freqRange = buildTrackFreqRange(
      Number(out.track.centerHz),
      Number(out.track.spanHz),
      Number(out.track.binHz)
    );
    out.interval = out.track.interval;
    out.window = out.track.window;
  } else if (out.mode === "paused") {
    if (out.lastActiveMode !== "track" && out.lastActiveMode !== "survey") {
      out.lastActiveMode = "survey";
    }
    out.freqRange = "";
    out.interval = "";
    out.window = "";
  } else {
    out.mode = "survey";
    out.lastActiveMode = "survey";
    out.freqRange = out.survey.freqRange;
    out.interval = out.survey.interval;
    out.window = out.survey.window;
  }

  return out;
}

function writeRuntimeScanner(scanner) {
  saveJsonFile(SCANNER_RUNTIME_FILE, scanner);
}

function clearLiveRows() {
  liveRows.length = 0;
}

function clearRecordedRows() {
  recordedRows = [];
}

currentScanner = normalizeScanner(currentScanner);
saveJsonFile(SCANNER_FILE, currentScanner);
writeRuntimeScanner(currentScanner);

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
    track: { ...current.track, ...(incoming.track || {}) }
  });
}

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
      currentScanner = mergeScanner(currentScanner, incoming);
      saveJsonFile(SCANNER_FILE, currentScanner);
      writeRuntimeScanner(currentScanner);
      clearLiveRows();
      return sendJson(res, { ok: true, scanner: currentScanner });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/save") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      currentScanner = mergeScanner(currentScanner, incoming);
      saveJsonFile(SCANNER_FILE, currentScanner);
      writeRuntimeScanner(currentScanner);
      clearLiveRows();
      return sendJson(res, { ok: true, scanner: currentScanner });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/survey") {
    currentScanner = normalizeScanner({
      ...currentScanner,
      mode: "survey",
      lastActiveMode: "survey"
    });
    saveJsonFile(SCANNER_FILE, currentScanner);
    writeRuntimeScanner(currentScanner);
    clearLiveRows();
    return sendJson(res, { ok: true, scanner: currentScanner });
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/track") {
    try {
      const incoming = JSON.parse((await collectRequestBody(req)) || "{}");
      currentScanner = normalizeScanner({
        ...currentScanner,
        mode: "track",
        lastActiveMode: "track",
        track: {
          ...currentScanner.track,
          ...incoming
        }
      });
      saveJsonFile(SCANNER_FILE, currentScanner);
      writeRuntimeScanner(currentScanner);
      clearLiveRows();
      return sendJson(res, { ok: true, scanner: currentScanner });
    } catch (e) {
      return sendJson(res, { ok: false, error: e.message }, 400);
    }
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/pause") {
    currentScanner = normalizeScanner({
      ...currentScanner,
      mode: "paused"
    });
    saveJsonFile(SCANNER_FILE, currentScanner);
    writeRuntimeScanner(currentScanner);
    clearLiveRows();
    return sendJson(res, { ok: true, scanner: currentScanner });
  }

  if (req.method === "POST" && parsed.pathname === "/api/scanner/resume") {
    const resumeMode = currentScanner.lastActiveMode === "track" ? "track" : "survey";
    currentScanner = normalizeScanner({
      ...currentScanner,
      mode: resumeMode
    });
    saveJsonFile(SCANNER_FILE, currentScanner);
    writeRuntimeScanner(currentScanner);
    clearLiveRows();
    return sendJson(res, { ok: true, scanner: currentScanner });
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