const { execFile } = require("child_process");
const os = require("os");
const dns = require("dns");

/* -------------------------------------------------------
   OUI vendor lookups (shared with wifi-matcher.js)
-------------------------------------------------------- */

const OUI_VENDORS = {
  "F4:F5:E8": "Aruba/HPE",
  "24:A4:3C": "Ubiquiti",
  "80:2A:A8": "Ubiquiti",
  "9C:05:D6": "Cisco/Meraki",
  "E0:55:3D": "Cisco/Meraki",
  "F8:0B:CB": "Ruckus",
  "FC:EC:DA": "Ubiquiti",
  "18:E8:29": "Espressif",
  "84:F3:EB": "Espressif",
  "DC:A6:32": "Espressif",
  "B4:E6:2D": "Espressif",
  "3C:84:6A": "Samsung",
  "F0:18:98": "Apple",
  "D8:96:95": "Apple",
  "AC:BC:32": "Apple",
  "B8:27:EB": "Raspberry Pi",
  "D8:3A:DD": "Raspberry Pi",
  "28:CD:C1": "Raspberry Pi",
  "E4:5F:01": "Raspberry Pi",
  "00:1A:2B": "Axis Communications",
  "00:40:8C": "Axis Communications",
  "AC:CC:8E": "Axis Communications",
  "00:0C:29": "VMware",
  "00:50:56": "VMware",
  "08:00:27": "VirtualBox"
};

function getOui(mac) {
  const raw = String(mac || "").trim().toUpperCase();
  if (!raw || !raw.includes(":")) return "";
  return raw.split(":").slice(0, 3).join(":");
}

function vendorFromOui(mac) {
  const oui = getOui(mac);
  return OUI_VENDORS[oui] || (oui ? `OUI ${oui}` : "Unknown");
}

/* -------------------------------------------------------
   Subnet helpers
-------------------------------------------------------- */

function getLocalSubnets() {
  const subnets = [];
  const ifaces = os.networkInterfaces();

  for (const [name, addrs] of Object.entries(ifaces)) {
    // Skip loopback, containers, and common AP / hotspot virtual interfaces
    if (/^(lo|docker|br-|veth|virbr|uap|ap\d)/.test(name)) continue;
    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      const cidr = addr.cidr || `${addr.address}/24`;
      subnets.push({
        iface: name,
        ip: addr.address,
        cidr,
        prefix: ipToSubnet(addr.address, addr.netmask)
      });
    }
  }
  return subnets;
}

function ipToSubnet(ip, mask) {
  const ipParts = ip.split(".").map(Number);
  const maskParts = mask.split(".").map(Number);
  return ipParts.map((p, i) => p & maskParts[i]).join(".");
}

function isSubnetAllowed(ip, allowList, denyList) {
  if (denyList && denyList.length) {
    if (denyList.some((prefix) => ip.startsWith(prefix))) return false;
  }
  if (allowList && allowList.length) {
    return allowList.some((prefix) => ip.startsWith(prefix));
  }
  return true;
}

/* -------------------------------------------------------
   ARP / neighbor table parsing
-------------------------------------------------------- */

function execCommand(cmd, args, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
      if (err && err.killed) return reject(new Error(`${cmd} timed out`));
      if (err && !stdout) return reject(err);
      resolve({ stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

/**
 * Parse `ip neigh` output (Linux):
 *   192.168.1.1 dev eth0 lladdr aa:bb:cc:dd:ee:ff REACHABLE
 */
function parseIpNeigh(stdout) {
  const hosts = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const ip = parts[0];
    const llIdx = parts.indexOf("lladdr");
    const mac = llIdx >= 0 ? (parts[llIdx + 1] || "").toUpperCase() : "";
    const state = parts[parts.length - 1] || "";
    if (!ip || !ip.includes(".")) continue;
    if (/FAILED|INCOMPLETE/.test(state)) continue;

    hosts.push({
      ip,
      mac: mac || null,
      state: state.toLowerCase(),
      source: "ip-neigh"
    });
  }
  return hosts;
}

/**
 * Parse `arp -a` output (macOS / fallback):
 *   ? (192.168.1.1) at aa:bb:cc:dd:ee:ff on en0 ifscope [ethernet]
 */
function parseArpA(stdout) {
  const hosts = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const ipMatch = trimmed.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
    const macMatch = trimmed.match(/at\s+([0-9a-f:]{11,17})/i);
    if (!ipMatch) continue;
    const mac = macMatch ? macMatch[1].toUpperCase() : null;
    if (mac === "(INCOMPLETE)" || mac === "FF:FF:FF:FF:FF:FF") continue;

    hosts.push({
      ip: ipMatch[1],
      mac: mac || null,
      state: "reachable",
      source: "arp-a"
    });
  }
  return hosts;
}

/**
 * Try reverse DNS lookup for a host.
 * Uses a short timeout so offline / no-DNS environments don't stall discovery.
 */
function reverseDns(ip, timeoutMs) {
  if (timeoutMs === 0) return Promise.resolve(null);
  const limit = typeof timeoutMs === "number" ? timeoutMs : 1500;
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve(null); }
    }, limit);
    dns.reverse(ip, (err, hostnames) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(err ? null : (hostnames && hostnames[0]) || null);
      }
    });
  });
}

/* -------------------------------------------------------
   Main discovery pipeline
-------------------------------------------------------- */

async function getArpHosts() {
  const platform = os.platform();

  // Try ip neigh first (Linux), then arp -a (macOS and fallback)
  if (platform === "linux") {
    try {
      const { stdout } = await execCommand("ip", ["neigh"]);
      const hosts = parseIpNeigh(stdout);
      if (hosts.length) return hosts;
    } catch (_) { /* fall through */ }
  }

  try {
    const { stdout } = await execCommand("arp", ["-a"]);
    return parseArpA(stdout);
  } catch (_) {
    return [];
  }
}

/**
 * Discover all live hosts on connected subnets.
 * Returns: { subnets, hosts: [{ip, mac, hostname, vendor, firstSeen, lastSeen, source}] }
 */
async function discoverHosts(options = {}) {
  const { allowList = [], denyList = [], dnsTimeoutMs = 1500, skipDns = false } = options;
  const subnets = getLocalSubnets();
  const arpHosts = await getArpHosts();

  // Deduplicate by IP, prefer entries with MAC
  const byIp = new Map();
  for (const host of arpHosts) {
    if (!isSubnetAllowed(host.ip, allowList, denyList)) continue;
    const existing = byIp.get(host.ip);
    if (!existing || (!existing.mac && host.mac)) {
      byIp.set(host.ip, host);
    }
  }

  // Enrich: vendor lookup + reverse DNS (parallel, limited batch)
  const hosts = [...byIp.values()];
  const batchSize = 20;
  for (let i = 0; i < hosts.length; i += batchSize) {
    const batch = hosts.slice(i, i + batchSize);
    const lookups = batch.map(async (host) => {
      host.vendor = host.mac ? vendorFromOui(host.mac) : "Unknown";
      host.hostname = skipDns ? null : await reverseDns(host.ip, dnsTimeoutMs);
      host.firstSeen = new Date().toISOString();
      host.lastSeen = new Date().toISOString();
    });
    await Promise.all(lookups);
  }

  return {
    discoveredAt: new Date().toISOString(),
    subnets: subnets.map((s) => ({ iface: s.iface, cidr: s.cidr, ip: s.ip })),
    hostCount: hosts.length,
    hosts
  };
}

/**
 * Cross-reference WiFi BSSIDs with discovered MAC addresses.
 * Returns a map of BSSID → {ip, hostname, matchType} for matches.
 */
function correlateWifiHosts(wifiNetworks = [], discoveredHosts = []) {
  const macToHost = new Map();
  for (const host of discoveredHosts) {
    if (host.mac) macToHost.set(host.mac.toUpperCase(), host);
  }

  const correlations = new Map();

  for (const network of wifiNetworks) {
    const bssid = String(network.bssid || "").trim().toUpperCase();
    if (!bssid) continue;

    // Exact MAC match
    if (macToHost.has(bssid)) {
      const host = macToHost.get(bssid);
      correlations.set(bssid, {
        ip: host.ip,
        hostname: host.hostname,
        mac: host.mac,
        vendor: host.vendor,
        matchType: "exact"
      });
      continue;
    }

    // Near-MAC match: same OUI, differ only in last 1-2 octets
    // (AP BSSID vs client interface on same device)
    const bssidOui = getOui(bssid);
    if (!bssidOui) continue;

    const bssidParts = bssid.split(":");
    for (const [mac, host] of macToHost) {
      if (correlations.has(bssid)) break;
      const macParts = mac.split(":");
      if (macParts.length !== 6 || bssidParts.length !== 6) continue;

      // Same first 4 octets → likely same physical device
      if (bssidParts.slice(0, 4).join(":") === macParts.slice(0, 4).join(":")) {
        correlations.set(bssid, {
          ip: host.ip,
          hostname: host.hostname,
          mac: host.mac,
          vendor: host.vendor,
          matchType: "near-mac"
        });
        break;
      }
    }

    // OUI-only match (weakest)
    if (!correlations.has(bssid) && bssidOui) {
      for (const [mac, host] of macToHost) {
        if (getOui(mac) === bssidOui) {
          correlations.set(bssid, {
            ip: host.ip,
            hostname: host.hostname,
            mac: host.mac,
            vendor: host.vendor,
            matchType: "oui"
          });
          break;
        }
      }
    }
  }

  return correlations;
}

module.exports = {
  discoverHosts,
  correlateWifiHosts,
  getLocalSubnets,
  vendorFromOui,
  getOui
};
