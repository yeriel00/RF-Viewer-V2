const net = require("net");
const tls = require("tls");
const crypto = require("crypto");

/* -------------------------------------------------------
   Default port list & service names
-------------------------------------------------------- */

const DEFAULT_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 143, 443, 445,
  554, 993, 1883, 3000, 3306, 5432, 5672, 6379,
  8080, 8443, 8554, 8883, 9090, 27017,
  // IoT / camera / smart-device ports
  81, 88, 548, 1080, 1900, 4443, 5000, 5555, 7443, 7547, 8000, 8008, 8081, 8088, 8181, 8291, 8888, 9100, 10000, 37777, 49152
];

const PORT_SERVICES = {
  21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp",
  53: "dns", 80: "http", 110: "pop3", 143: "imap",
  443: "https", 445: "smb", 554: "rtsp", 993: "imaps",
  995: "pop3s", 1883: "mqtt", 3000: "http-alt",
  3306: "mysql", 5432: "postgresql", 5672: "amqp",
  6379: "redis", 8080: "http-proxy", 8443: "https-alt",
  8554: "rtsp-alt", 8883: "mqtts", 9090: "prometheus",
  27017: "mongodb",
  // IoT / camera / smart-device services
  81: "http-cam", 88: "http-cam-alt", 548: "afp",
  1080: "socks", 1900: "upnp", 4443: "https-iot",
  5000: "upnp-api", 5555: "adb", 7443: "https-nvr",
  7547: "cwmp", 8000: "http-iot", 8008: "http-iot-alt",
  8081: "http-cam-mgmt", 8088: "http-cam-stream",
  8181: "http-iot-cfg", 8291: "mikrotik",
  8888: "http-alt-cam", 9100: "printer",
  10000: "webmin", 37777: "dahua-dvr", 49152: "upnp-event"
};

const TLS_PORTS = new Set([443, 993, 995, 8443, 8883]);

const HTTP_PORTS = new Set([80, 443, 3000, 8080, 8443, 9090, 81, 88, 8000, 8008, 8081, 8088, 8181, 8888, 10000]);

const RTSP_PORTS = new Set([554, 8554]);
const MQTT_PORTS = new Set([1883, 8883]);
const FTP_PORTS = new Set([21]);

/* -------------------------------------------------------
   Protocol-specific probe payloads
-------------------------------------------------------- */

const PROTOCOL_PROBES = {
  rtsp: "OPTIONS rtsp://{{IP}}:{{PORT}}/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: rf-viewer-probe/1.0\r\n\r\n",
  mqtt: null,  // binary payload built in code
  ftp: null    // passive read then USER anonymous
};

function buildMqttConnectPacket() {
  // Minimal MQTT CONNECT packet — client id "rv-probe"
  const clientId = Buffer.from("rv-probe");
  const varHeader = Buffer.from([0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x3C]);
  const payload = Buffer.concat([Buffer.from([0x00, clientId.length]), clientId]);
  const remainLen = varHeader.length + payload.length;
  return Buffer.concat([Buffer.from([0x10, remainLen]), varHeader, payload]);
}

function guessOsFromTtl(ttl) {
  if (!ttl || ttl <= 0) return null;
  if (ttl <= 64) return "Linux/Unix";
  if (ttl <= 128) return "Windows";
  if (ttl <= 255) return "Network device";
  return null;
}

function hashString(data) {
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

/* -------------------------------------------------------
   Banner pattern matchers for service identification
-------------------------------------------------------- */

const BANNER_PATTERNS = [
  { re: /^SSH-[\d.]+-([\S]+)/i, service: "ssh", extract: (m) => `SSH ${m[1]}` },
  { re: /^220[- ].*\b(ftp|vsftpd|proftpd|pure-?ftpd)\b/i, service: "ftp", extract: (m) => m[0].slice(0, 80) },
  { re: /^220[- ].*\b(smtp|postfix|sendmail|exim|esmtp)\b/i, service: "smtp", extract: (m) => m[0].slice(0, 80) },
  { re: /^\+OK.*\b(pop3|dovecot|courier)\b/i, service: "pop3", extract: (m) => m[0].slice(0, 60) },
  { re: /^\* OK.*\b(imap|dovecot|courier)\b/i, service: "imap", extract: (m) => m[0].slice(0, 60) },
  { re: /^RTSP\/\d/i, service: "rtsp", extract: (m) => m[0].slice(0, 60) },
  { re: /^-ERR|^\+PONG|\$\d+\r\nredis/i, service: "redis", extract: () => "Redis" },
  { re: /mysql|MariaDB/i, service: "mysql", extract: (m) => m[0].slice(0, 60) },
  { re: /^HTTP\/[\d.]+\s+\d+/i, service: "http", extract: null },
  { re: /^\{.*"ok"/i, service: "mongodb", extract: () => "MongoDB" },
  // IoT / camera / NVR banner patterns
  { re: /hikvision|hikcgi/i, service: "hikvision", extract: () => "Hikvision camera" },
  { re: /dahua|DH-?[A-Z]{2,}/i, service: "dahua", extract: () => "Dahua camera/DVR" },
  { re: /amcrest/i, service: "amcrest", extract: () => "Amcrest camera" },
  { re: /axis[- ]?(comm|video)/i, service: "axis", extract: () => "Axis network camera" },
  { re: /reolink/i, service: "reolink", extract: () => "Reolink camera" },
  { re: /ubiquiti|UniFi|ubnt/i, service: "ubiquiti", extract: () => "Ubiquiti device" },
  { re: /mikrotik|routeros/i, service: "mikrotik", extract: () => "MikroTik router" },
  { re: /foscam/i, service: "foscam", extract: () => "Foscam camera" },
  { re: /vivotek/i, service: "vivotek", extract: () => "Vivotek camera" },
  { re: /tp-?link/i, service: "tp-link", extract: () => "TP-Link device" },
  { re: /nest|google.home/i, service: "nest", extract: () => "Google Nest device" },
  { re: /ring.com|ring doorbell/i, service: "ring", extract: () => "Ring device" },
  { re: /upnp|ssdp.*rootdevice/i, service: "upnp", extract: (m) => m[0].slice(0, 60) },
  { re: /onvif|gSOAP/i, service: "onvif", extract: () => "ONVIF camera" },
  { re: /wyze/i, service: "wyze", extract: () => "Wyze device" },
  { re: /tapo|kasa/i, service: "tapo", extract: () => "TP-Link smart device" },
  { re: /tuya|smartlife/i, service: "tuya", extract: () => "Tuya IoT device" },
  { re: /CWMP|TR-069/i, service: "cwmp", extract: () => "CWMP/TR-069 managed" },
  { re: /printer|LaserJet|Brother|Epson|Canon.*(MG|MX|TS)/i, service: "printer", extract: (m) => m[0].slice(0, 60) }
];

/* -------------------------------------------------------
   IoT / camera device class detection from scan results
-------------------------------------------------------- */

const IOT_CAMERA_PORTS = new Set([554, 8554, 81, 88, 37777, 8081, 8088, 8888]);
const IOT_PROTOCOL_PORTS = new Set([1883, 8883, 5683, 1900, 7547, 5555]);
const SMART_HOME_PORTS = new Set([8008, 8443, 4443, 5000, 8181, 49152]);
const ROUTER_PORTS = new Set([8291, 10000]);

function classifyDeviceFromScan(scanResult) {
  const ports = scanResult.openPorts || [];
  if (!ports.length) return null;

  const portNums = new Set(ports.map((p) => p.port));
  const banners = ports.map((p) => (p.banner || "") + " " + (p.version || "")).join(" ").toLowerCase();
  const headers = ports.map((p) => JSON.stringify(p.headers || {})).join(" ").toLowerCase();
  const allText = banners + " " + headers;

  // Check banner signatures first (most reliable)
  if (/hikvision|hikcgi/.test(allText)) return { deviceClass: "ip-camera", vendor: "Hikvision" };
  if (/dahua|dh-[a-z]{2,}/.test(allText)) return { deviceClass: "ip-camera", vendor: "Dahua" };
  if (/amcrest/.test(allText)) return { deviceClass: "ip-camera", vendor: "Amcrest" };
  if (/axis[- ]?(comm|video)/.test(allText)) return { deviceClass: "ip-camera", vendor: "Axis" };
  if (/reolink/.test(allText)) return { deviceClass: "ip-camera", vendor: "Reolink" };
  if (/foscam/.test(allText)) return { deviceClass: "ip-camera", vendor: "Foscam" };
  if (/vivotek/.test(allText)) return { deviceClass: "ip-camera", vendor: "Vivotek" };
  if (/onvif|gsoap/.test(allText)) return { deviceClass: "ip-camera", vendor: "ONVIF-compatible" };
  if (/ubiquiti|unifi|ubnt/.test(allText)) return { deviceClass: "network-infra", vendor: "Ubiquiti" };
  if (/mikrotik|routeros/.test(allText)) return { deviceClass: "router", vendor: "MikroTik" };
  if (/tp-?link/.test(allText)) return { deviceClass: "iot-device", vendor: "TP-Link" };
  if (/nest|google.home/.test(allText)) return { deviceClass: "smart-home", vendor: "Google" };
  if (/ring\.com|ring doorbell/.test(allText)) return { deviceClass: "ip-camera", vendor: "Ring" };
  if (/wyze/.test(allText)) return { deviceClass: "ip-camera", vendor: "Wyze" };
  if (/tuya|smartlife/.test(allText)) return { deviceClass: "iot-device", vendor: "Tuya" };
  if (/printer|laserjet|brother|epson/.test(allText)) return { deviceClass: "printer", vendor: null };
  if (/cwmp|tr-069/.test(allText)) return { deviceClass: "managed-cpe", vendor: null };

  // Heuristic: RTSP + HTTP = likely camera
  const hasRtsp = portNums.has(554) || portNums.has(8554);
  const hasHttp = portNums.has(80) || portNums.has(8080) || portNums.has(443);
  if (hasRtsp && hasHttp) return { deviceClass: "ip-camera", vendor: null };
  if (hasRtsp) return { deviceClass: "ip-camera", vendor: null };

  // Heuristic: camera-specific ports
  const cameraPortHit = ports.some((p) => IOT_CAMERA_PORTS.has(p.port));
  if (cameraPortHit && hasHttp) return { deviceClass: "ip-camera", vendor: null };

  // IoT protocol ports (MQTT, CoAP, UPnP, CWMP, ADB)
  const iotProtoHit = ports.some((p) => IOT_PROTOCOL_PORTS.has(p.port));
  if (iotProtoHit) return { deviceClass: "iot-device", vendor: null };

  // Smart home ports
  const smartHit = ports.some((p) => SMART_HOME_PORTS.has(p.port));
  if (smartHit) return { deviceClass: "smart-home", vendor: null };

  // Router management ports
  const routerHit = ports.some((p) => ROUTER_PORTS.has(p.port));
  if (routerHit) return { deviceClass: "router", vendor: null };

  return null;
}

function identifyService(banner, port) {
  if (!banner) return PORT_SERVICES[port] || null;

  for (const pattern of BANNER_PATTERNS) {
    const match = banner.match(pattern.re);
    if (match) {
      return {
        service: pattern.service,
        version: pattern.extract ? pattern.extract(match) : null
      };
    }
  }

  return PORT_SERVICES[port] || null;
}

function parseHttpHeaders(raw) {
  const headers = {};
  const lines = raw.split(/\r?\n/);
  let statusLine = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /^HTTP\/[\d.]+\s+\d+/.test(line)) {
      statusLine = line.trim();
      continue;
    }
    const sep = line.indexOf(":");
    if (sep > 0) {
      const key = line.slice(0, sep).trim().toLowerCase();
      const value = line.slice(sep + 1).trim();
      headers[key] = value;
    }
  }

  return { statusLine, headers };
}

/* -------------------------------------------------------
   TCP connect probe
-------------------------------------------------------- */

function tcpConnect(ip, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let bannerData = "";
    let resolved = false;
    let ttl = null;

    const finish = (state, extra = {}) => {
      if (resolved) return;
      resolved = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve({
        port,
        transport: "tcp",
        state,
        responseTimeMs: Date.now() - startTime,
        ttl,
        ...extra
      });
    };

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      // Try to read TTL for OS fingerprinting (Node internal, best-effort)
      try {
        const raw = socket._handle;
        if (raw && typeof raw.getpeername === "function") {
          // TTL isn't directly accessible from net.Socket — captured from first data packet
        }
      } catch (_) {}

      // Protocol-specific probes
      if (RTSP_PORTS.has(port)) {
        const probe = PROTOCOL_PROBES.rtsp.replace("{{IP}}", ip).replace("{{PORT}}", String(port));
        socket.write(probe);
      } else if (MQTT_PORTS.has(port) && !TLS_PORTS.has(port)) {
        socket.write(buildMqttConnectPacket());
      } else if (HTTP_PORTS.has(port) && !TLS_PORTS.has(port)) {
        // Full GET instead of HEAD — captures body for hashing
        socket.write(`GET / HTTP/1.0\r\nHost: ${ip}\r\nConnection: close\r\nUser-Agent: rf-viewer-probe/1.0\r\nAccept: */*\r\n\r\n`);
      } else if (FTP_PORTS.has(port)) {
        // Wait for FTP banner, then send USER
        setTimeout(() => {
          if (!resolved && bannerData.length > 0) {
            socket.write("USER anonymous\r\n");
          }
        }, 1500);
      }
      // For other ports, wait passively for a banner
      setTimeout(() => {
        if (!resolved) finish("open", { banner: bannerData || null });
      }, 3000);
    });

    socket.on("data", (chunk) => {
      bannerData += chunk.toString("utf8", 0, Math.min(chunk.length, 4096));
      // If we got enough data, resolve
      if (bannerData.length >= 512 || (bannerData.length >= 256 && /\r?\n\r?\n/.test(bannerData))) {
        finish("open", { banner: bannerData.slice(0, 4096) });
      }
    });

    socket.on("close", () => {
      if (!resolved) finish("open", { banner: bannerData || null });
    });

    socket.on("timeout", () => finish("filtered"));
    socket.on("error", (err) => {
      if (err.code === "ECONNREFUSED") finish("closed");
      else finish("filtered");
    });

    socket.connect(port, ip);
  });
}

/* -------------------------------------------------------
   TLS certificate grabber
-------------------------------------------------------- */

function grabTlsCert(ip, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let resolved = false;
    let bannerData = "";

    const finish = (cert, extra = {}) => {
      if (resolved) return;
      resolved = true;
      resolve({ cert: cert || null, ...extra });
    };

    const socket = tls.connect(
      {
        host: ip,
        port,
        timeout: timeoutMs,
        rejectUnauthorized: false,
        servername: ip
      },
      () => {
        const cert = socket.getPeerCertificate();
        const certInfo = cert && cert.subject
          ? {
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            sans: cert.subjectaltname || null,
            serialNumber: cert.serialNumber || null,
            fingerprint: cert.fingerprint256 || cert.fingerprint || null
          }
          : null;

        // For HTTPS ports, try to grab headers too
        if (HTTP_PORTS.has(port)) {
          socket.write(`GET / HTTP/1.0\r\nHost: ${ip}\r\nConnection: close\r\nUser-Agent: rf-viewer-probe/1.0\r\nAccept: */*\r\n\r\n`);
          setTimeout(() => {
            if (!resolved) finish(certInfo, { banner: bannerData || null });
            socket.destroy();
          }, 2000);
        } else {
          setTimeout(() => {
            if (!resolved) finish(certInfo, { banner: bannerData || null });
            socket.destroy();
          }, 2000);
        }
      }
    );

    socket.on("data", (chunk) => {
      bannerData += chunk.toString("utf8", 0, Math.min(chunk.length, 2048));
      if (bannerData.length >= 256 || /\r?\n\r?\n/.test(bannerData)) {
        if (!resolved) finish(null, { banner: bannerData.slice(0, 2048) });
        socket.destroy();
      }
    });

    socket.on("timeout", () => {
      finish(null);
      socket.destroy();
    });

    socket.on("error", () => {
      finish(null);
      socket.destroy();
    });
  });
}

/* -------------------------------------------------------
   Full host scan
-------------------------------------------------------- */

/**
 * Scan a single host on specified ports.
 * Options:
 *   ports: number[] — defaults to DEFAULT_PORTS
 *   timeoutMs: number — per-port timeout (default 2000)
 *   concurrency: number — max simultaneous port probes (default 10)
 */
async function scanHost(ip, options = {}) {
  const {
    ports = DEFAULT_PORTS,
    timeoutMs = 2000,
    concurrency = 10,
    mac = null,
    hostname = null
  } = options;

  const scanStarted = new Date().toISOString();
  const openPorts = [];

  // Scan ports with concurrency limit
  for (let i = 0; i < ports.length; i += concurrency) {
    const batch = ports.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((port) => tcpConnect(ip, port, timeoutMs))
    );

    for (const result of results) {
      if (result.state !== "open") continue;

      const portResult = {
        port: result.port,
        transport: result.transport,
        state: result.state,
        service: null,
        version: null,
        banner: null,
        headers: null,
        tlsCert: null,
        responseTimeMs: result.responseTimeMs
      };

      // Parse banner and identify service
      if (result.banner) {
        portResult.banner = result.banner.slice(0, 1024);
        const serviceId = identifyService(result.banner, result.port);

        if (typeof serviceId === "object" && serviceId) {
          portResult.service = serviceId.service;
          portResult.version = serviceId.version;
        } else if (typeof serviceId === "string") {
          portResult.service = serviceId;
        }

        // Parse HTTP headers and body hash if applicable
        if (HTTP_PORTS.has(result.port) && /^HTTP\//i.test(result.banner)) {
          const parsed = parseHttpHeaders(result.banner);
          portResult.headers = parsed.headers;
          if (parsed.headers.server && !portResult.version) {
            portResult.version = `HTTP (${parsed.headers.server})`;
          }
          portResult.service = portResult.service || (TLS_PORTS.has(result.port) ? "https" : "http");

          // Extract HTTP body hash (Shodan-style)
          const bodyStart = result.banner.indexOf("\r\n\r\n");
          if (bodyStart > 0) {
            const body = result.banner.slice(bodyStart + 4);
            if (body.length > 10) {
              portResult.httpBodyHash = hashString(body);

              // Extract page title
              const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
              if (titleMatch) portResult.httpTitle = titleMatch[1].trim().slice(0, 120);
            }
          }
        }

        // Parse RTSP response for camera details
        if (RTSP_PORTS.has(result.port) && /^RTSP\//.test(result.banner)) {
          const publicMatch = result.banner.match(/Public:\s*([^\r\n]+)/i);
          if (publicMatch) portResult.rtspMethods = publicMatch[1].trim();
        }

        // Parse MQTT CONNACK
        if (MQTT_PORTS.has(result.port) && result.banner.length >= 4) {
          const byte0 = result.banner.charCodeAt(0);
          if (byte0 === 0x20) {
            const rc = result.banner.charCodeAt(3);
            portResult.mqttConnack = rc === 0 ? "accepted" : `rejected(${rc})`;
            if (!portResult.version) portResult.version = `MQTT (CONNACK ${rc === 0 ? "OK" : "RC=" + rc})`;
          }
        }
      }

      // TTL-based OS guess
      if (result.ttl) {
        portResult.ttl = result.ttl;
      }

      if (!portResult.service) {
        portResult.service = PORT_SERVICES[result.port] || null;
      }

      // Grab TLS certificate for TLS ports
      if (TLS_PORTS.has(result.port)) {
        try {
          const tlsResult = await grabTlsCert(ip, result.port, timeoutMs + 1000);
          portResult.tlsCert = tlsResult.cert;
          if (tlsResult.banner && !portResult.banner) {
            portResult.banner = tlsResult.banner.slice(0, 512);
          }
          if (tlsResult.banner && HTTP_PORTS.has(result.port) && !portResult.headers) {
            const parsed = parseHttpHeaders(tlsResult.banner);
            portResult.headers = parsed.headers;
            if (parsed.headers.server && !portResult.version) {
              portResult.version = `HTTPS (${parsed.headers.server})`;
            }
          }
        } catch (_) { /* TLS cert grab is best-effort */ }
      }

      openPorts.push(portResult);
    }
  }

  // OS fingerprint: derive from the most common TTL across open ports
  const ttls = openPorts.map((p) => p.ttl).filter(Boolean);
  const osGuess = ttls.length ? guessOsFromTtl(ttls[0]) : null;

  return {
    ip,
    mac: mac || null,
    hostname: hostname || null,
    osGuess: osGuess || null,
    scanStarted,
    scanCompleted: new Date().toISOString(),
    scanDurationMs: Date.now() - new Date(scanStarted).getTime(),
    openPorts: openPorts.sort((a, b) => a.port - b.port)
  };
}

/**
 * Scan multiple hosts with a global concurrency limit.
 */
async function scanHosts(hosts, options = {}) {
  const { hostConcurrency = 3, ...scanOptions } = options;
  const results = [];

  for (let i = 0; i < hosts.length; i += hostConcurrency) {
    const batch = hosts.slice(i, i + hostConcurrency);
    const batchResults = await Promise.all(
      batch.map((host) =>
        scanHost(host.ip, {
          ...scanOptions,
          mac: host.mac,
          hostname: host.hostname
        })
      )
    );
    results.push(...batchResults);
  }

  return results;
}

module.exports = {
  scanHost,
  scanHosts,
  DEFAULT_PORTS,
  PORT_SERVICES,
  TLS_PORTS,
  HTTP_PORTS,
  classifyDeviceFromScan,
  guessOsFromTtl,
  hashString
};
