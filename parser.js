const fs = require("fs");
const path = require("path");

const SCANS_DIR = path.join(__dirname, "scans");

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function parseLine(line) {
  const parts = line.split(",").map((s) => s.trim());
  if (parts.length < 7) return null;

  const date = parts[0];
  const time = parts[1];
  const startHz = Number(parts[2]);
  const stopHz = Number(parts[3]);
  const binHz = Number(parts[4]);
  const samples = Number(parts[5]);
  const bins = parts.slice(6).map(Number).filter((v) => !Number.isNaN(v));

  if (!bins.length) return null;

  const med = median(bins);
  let peakDb = -Infinity;
  let peakIndex = 0;

  bins.forEach((v, i) => {
    if (v > peakDb) {
      peakDb = v;
      peakIndex = i;
    }
  });

  const peakHz = startHz + peakIndex * binHz;

  return {
    timestamp: `${date} ${time}`,
    startHz,
    stopHz,
    binHz,
    samples,
    bins,
    medianDb: med,
    peakDb,
    peakHz,
    relativePeakDb: peakDb - med
  };
}

function clusterKey(hz, clusterWidthHz) {
  return Math.round(hz / clusterWidthHz) * clusterWidthHz;
}

function filterEvents(rows, settings) {
  const {
    relativeSquelchDb,
    absoluteFloorDb,
    minRepeats,
    clusterWidthHz
  } = settings;

  const candidates = rows
    .map((r) => ({
      timestamp: r.timestamp,
      peakHz: r.peakHz,
      peakDb: r.peakDb,
      medianDb: r.medianDb,
      startHz: r.startHz,
      stopHz: r.stopHz,
      relativePeakDb: r.relativePeakDb,
      cluster: clusterKey(r.peakHz, clusterWidthHz)
    }))
    .filter((r) =>
      r.relativePeakDb >= relativeSquelchDb &&
      r.peakDb >= absoluteFloorDb
    );

  const counts = new Map();
  for (const row of candidates) {
    counts.set(row.cluster, (counts.get(row.cluster) || 0) + 1);
  }

  return candidates.filter((r) => (counts.get(r.cluster) || 0) >= minRepeats);
}

function buildPeakTrace(rows, settings) {
  const traceMap = new Map();
  for (const row of rows) {
    row.bins.forEach((db, i) => {
      const hz = row.startHz + i * row.binHz;
      const key = Math.round(hz);
      if (!traceMap.has(key) || db > traceMap.get(key)) {
        traceMap.set(key, db);
      }
    });
  }

  return [...traceMap.entries()]
    .map(([hz, db]) => ({ hz: Number(hz), db }))
    .sort((a, b) => a.hz - b.hz);
}

function buildDataset(fileLabel, rows, settings) {
  if (!rows.length) {
    return {
      file: fileLabel,
      summary: null,
      rows: [],
      events: [],
      peakTrace: []
    };
  }

  const allStart = Math.min(...rows.map((r) => r.startHz));
  const allStop = Math.max(...rows.map((r) => r.stopHz));
  const strongest = rows.reduce((best, row) =>
    row.peakDb > best.peakDb ? row : best
  );

  return {
    file: fileLabel,
    summary: {
      rows: rows.length,
      startHz: allStart,
      stopHz: allStop,
      strongestHz: strongest.peakHz,
      strongestDb: strongest.peakDb,
      firstSeen: rows[0].timestamp,
      lastSeen: rows[rows.length - 1].timestamp
    },
    rows,
    events: filterEvents(rows, settings),
    peakTrace: buildPeakTrace(rows, settings)
  };
}

function parseFile(filename, settings) {
  const fullPath = path.join(SCANS_DIR, filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const rows = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseLine)
    .filter(Boolean);

  return buildDataset(filename, rows, settings);
}

function listFiles() {
  if (!fs.existsSync(SCANS_DIR)) return [];
  return fs.readdirSync(SCANS_DIR).filter((f) => f.endsWith(".csv")).sort();
}

module.exports = {
  listFiles,
  parseFile,
  parseLine,
  buildDataset
};