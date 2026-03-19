const { PORT_SERVICES, TLS_PORTS } = require("./port-scanner");

/* -------------------------------------------------------
   Exposure class auto-calculation
   E4: Unauthed DB ports open
   E3: Management ports (SSH, Telnet, RTSP) open
   E2: Web services (HTTP/HTTPS) open
   E1: Only encrypted services
   E0: Nothing interesting
-------------------------------------------------------- */

const E4_PORTS = new Set([3306, 5432, 27017, 6379, 5672]);
const E3_PORTS = new Set([22, 23, 554, 8554, 1883, 445, 25]);
const E2_PORTS = new Set([80, 8080, 3000, 9090]);
const E1_PORTS = new Set([443, 8443, 993, 995, 8883]);

function computeExposureClass(openPorts) {
  if (!openPorts || !openPorts.length) return "E0";

  const portNumbers = openPorts.map((p) => p.port);

  // Check for unauthed database / data store ports
  const hasE4 = portNumbers.some((p) => E4_PORTS.has(p));
  if (hasE4) {
    const dbPorts = openPorts.filter((p) => E4_PORTS.has(p.port));
    const allAuthed = dbPorts.every((p) => p.authObserved === true);
    if (!allAuthed) return "E4";
  }

  if (portNumbers.some((p) => E3_PORTS.has(p))) return "E3";
  if (portNumbers.some((p) => E2_PORTS.has(p))) return "E2";
  if (portNumbers.some((p) => E1_PORTS.has(p))) return "E1";

  return openPorts.length > 0 ? "E1" : "E0";
}

/* -------------------------------------------------------
   Surface type classification
-------------------------------------------------------- */

function classifySurfaceType(port) {
  const num = port.port;
  const svc = String(port.service || "").toLowerCase();

  if (/http|https/.test(svc) || [80, 443, 8080, 8443, 3000, 9090].includes(num)) return "web";
  if (/ssh|telnet/.test(svc) || [22, 23].includes(num)) return "management";
  if (/ftp/.test(svc) || num === 21) return "file-transfer";
  if (/mysql|postgres|mongo|redis/.test(svc) || E4_PORTS.has(num)) return "datastore";
  if (/smtp|pop3|imap/.test(svc) || [25, 110, 143, 993, 995].includes(num)) return "mail";
  if (/rtsp/.test(svc) || [554, 8554].includes(num)) return "media";
  if (/mqtt/.test(svc) || [1883, 8883].includes(num)) return "iot-protocol";
  if (/amqp/.test(svc) || num === 5672) return "message-queue";
  if (/dns/.test(svc) || num === 53) return "infrastructure";
  if (/smb/.test(svc) || num === 445) return "file-sharing";
  return "identity";
}

/* -------------------------------------------------------
   Confidence from scan quality
-------------------------------------------------------- */

function computeConfidence(scanResult) {
  const openPorts = scanResult.openPorts || [];
  if (!openPorts.length) return "low";

  let score = 0;
  score += Math.min(openPorts.length * 5, 20);
  score += openPorts.filter((p) => p.banner).length * 8;
  score += openPorts.filter((p) => p.version).length * 5;
  score += openPorts.filter((p) => p.tlsCert).length * 10;
  score += openPorts.filter((p) => p.headers).length * 5;

  if (score >= 30) return "high";
  if (score >= 15) return "medium";
  return "low";
}

/* -------------------------------------------------------
   Convert scan result to intel item(s)
   Compatible with server.js normalizeIntelItem + upsertDeviceIntelItems
-------------------------------------------------------- */

/**
 * Convert a single probe scan result into a device-intel item
 * that can be passed to upsertDeviceIntelItems().
 */
function probeResultToIntelItem(scanResult, options = {}) {
  const { scope = "generic", wifiCorrelation = null } = options;

  // Prefer MAC as key (for fusion matching via WiFi BSSID), fall back to IP
  const key = scanResult.mac
    ? scanResult.mac.toLowerCase()
    : scanResult.ip;

  const aliases = [];
  if (scanResult.ip) aliases.push(scanResult.ip);
  if (scanResult.mac) aliases.push(scanResult.mac.toLowerCase());
  if (scanResult.hostname) aliases.push(scanResult.hostname.toLowerCase());
  if (wifiCorrelation) {
    if (wifiCorrelation.bssid) aliases.push(wifiCorrelation.bssid.toLowerCase());
    if (wifiCorrelation.ssid) aliases.push(wifiCorrelation.ssid.toLowerCase());
  }

  const openPorts = scanResult.openPorts || [];
  const exposureClass = computeExposureClass(openPorts);
  const confidence = computeConfidence(scanResult);

  // Build ports array matching server.js normalizeIntelPort schema
  const ports = openPorts.map((p) => ({
    port: p.port,
    service: p.service || PORT_SERVICES[p.port] || null,
    transport: p.transport || "tcp",
    surfaceType: classifySurfaceType(p),
    authObserved: null,
    status: "present",
    summary: p.version || (p.banner ? p.banner.slice(0, 80).replace(/[\r\n]+/g, " ") : null),
    fingerprintSummary: p.version || null,
    exposureClass: TLS_PORTS.has(p.port) ? "E1" : (E4_PORTS.has(p.port) ? "E4" : (E3_PORTS.has(p.port) ? "E3" : "E2")),
    method: p.headers ? "HEAD" : null
  }));

  const servicePorts = openPorts.map((p) => p.port);
  const protocolsSeen = [...new Set(openPorts.map((p) => (p.service || PORT_SERVICES[p.port] || "").toUpperCase()).filter(Boolean))];

  // Build summary from discovered services
  const serviceNames = openPorts
    .map((p) => p.version || `${p.port}/${(p.service || "unknown").toUpperCase()}`)
    .slice(0, 4);
  const summaryText = serviceNames.length
    ? `Probe: ${serviceNames.join(", ")}`
    : "Probe: no open ports";

  // Fastest response time as latency indicator
  const latencyMs = openPorts.length
    ? Math.min(...openPorts.map((p) => p.responseTimeMs || 9999))
    : null;

  return {
    key,
    aliases,
    scope: wifiCorrelation ? "wifi" : scope,
    label: null, // Don't overwrite manual labels
    summary: summaryText,
    reachable: openPorts.length > 0,
    latencyMs,
    ip: scanResult.ip || null,
    hostname: scanResult.hostname || null,
    confidence,
    exposureClass,
    evidenceMode: "active-probe",
    source: "scan",
    servicePorts,
    protocolsSeen,
    ports,
    notes: null, // Don't overwrite manual notes
    updatedAt: new Date().toISOString()
  };
}

/**
 * Convert an array of scan results to intel items.
 * wifiCorrelations: Map<BSSID, {ip, hostname, bssid, ssid}> from network-discovery
 */
function probeResultsToIntelItems(scanResults, wifiCorrelations = new Map()) {
  const items = [];

  for (const result of scanResults) {
    // Check if this scan result maps to a WiFi correlation
    let wifiCorrelation = null;
    if (result.mac) {
      const macUpper = result.mac.toUpperCase();
      if (wifiCorrelations.has(macUpper)) {
        wifiCorrelation = wifiCorrelations.get(macUpper);
      }
    }

    // Also check by IP in case correlation is by IP
    if (!wifiCorrelation && result.ip) {
      for (const [, corr] of wifiCorrelations) {
        if (corr.ip === result.ip) {
          wifiCorrelation = corr;
          break;
        }
      }
    }

    items.push(probeResultToIntelItem(result, { wifiCorrelation }));
  }

  return items;
}

module.exports = {
  probeResultToIntelItem,
  probeResultsToIntelItems,
  computeExposureClass,
  computeConfidence
};
