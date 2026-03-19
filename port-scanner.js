const net = require("net");
const tls = require("tls");

/* -------------------------------------------------------
   Default port list & service names
-------------------------------------------------------- */

const DEFAULT_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 143, 443, 445,
  554, 993, 1883, 3000, 3306, 5432, 5672, 6379,
  8080, 8443, 8554, 8883, 9090, 27017
];

const PORT_SERVICES = {
  21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp",
  53: "dns", 80: "http", 110: "pop3", 143: "imap",
  443: "https", 445: "smb", 554: "rtsp", 993: "imaps",
  995: "pop3s", 1883: "mqtt", 3000: "http-alt",
  3306: "mysql", 5432: "postgresql", 5672: "amqp",
  6379: "redis", 8080: "http-proxy", 8443: "https-alt",
  8554: "rtsp-alt", 8883: "mqtts", 9090: "prometheus",
  27017: "mongodb"
};

const TLS_PORTS = new Set([443, 993, 995, 8443, 8883]);

const HTTP_PORTS = new Set([80, 443, 3000, 8080, 8443, 9090]);

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
  { re: /^\{.*"ok"/i, service: "mongodb", extract: () => "MongoDB" }
];

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
        ...extra
      });
    };

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      // For HTTP ports, send a HEAD request to solicit a response
      if (HTTP_PORTS.has(port) && !TLS_PORTS.has(port)) {
        socket.write(`HEAD / HTTP/1.0\r\nHost: ${ip}\r\nConnection: close\r\nUser-Agent: rf-viewer-probe/1.0\r\n\r\n`);
      }
      // For other ports, wait passively for a banner
      setTimeout(() => {
        if (!resolved) finish("open", { banner: bannerData || null });
      }, 3000);
    });

    socket.on("data", (chunk) => {
      bannerData += chunk.toString("utf8", 0, Math.min(chunk.length, 2048));
      // If we got enough data, resolve
      if (bannerData.length >= 256 || /\r?\n\r?\n/.test(bannerData)) {
        finish("open", { banner: bannerData.slice(0, 2048) });
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
          socket.write(`HEAD / HTTP/1.0\r\nHost: ${ip}\r\nConnection: close\r\nUser-Agent: rf-viewer-probe/1.0\r\n\r\n`);
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
        portResult.banner = result.banner.slice(0, 512);
        const serviceId = identifyService(result.banner, result.port);

        if (typeof serviceId === "object" && serviceId) {
          portResult.service = serviceId.service;
          portResult.version = serviceId.version;
        } else if (typeof serviceId === "string") {
          portResult.service = serviceId;
        }

        // Parse HTTP headers if applicable
        if (HTTP_PORTS.has(result.port) && /^HTTP\//i.test(result.banner)) {
          const parsed = parseHttpHeaders(result.banner);
          portResult.headers = parsed.headers;
          if (parsed.headers.server && !portResult.version) {
            portResult.version = `HTTP (${parsed.headers.server})`;
          }
          portResult.service = portResult.service || (TLS_PORTS.has(result.port) ? "https" : "http");
        }
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

  return {
    ip,
    mac: mac || null,
    hostname: hostname || null,
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
  HTTP_PORTS
};
