function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function unique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((v) => String(v || "").trim()).filter(Boolean))];
}

function uniqueNorm(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).map(norm).filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function confidenceWeight(confidence) {
  switch (String(confidence || "none").toLowerCase()) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

function clusterConfidence(score) {
  if (score >= 145) return "high";
  if (score >= 90) return "medium";
  if (score >= 45) return "low";
  return "none";
}

function exposureWeight(exposure) {
  switch (String(exposure || "E0").toUpperCase()) {
    case "E4": return 20;
    case "E3": return 15;
    case "E2": return 10;
    case "E1": return 5;
    default: return 0;
  }
}

function confidenceScore(confidence) {
  switch (String(confidence || "none").toLowerCase()) {
    case "high": return 30;
    case "medium": return 18;
    case "low": return 8;
    default: return 0;
  }
}

function parseTimeMs(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function sameMinuteWindow(aTs, bTs, msWindow = 10 * 60 * 1000) {
  const a = parseTimeMs(aTs);
  const b = parseTimeMs(bTs);
  if (!a || !b) return false;
  return Math.abs(a - b) <= msWindow;
}

function getOui(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw || !raw.includes(":")) return "";
  return raw.split(":").slice(0, 3).join(":");
}

function shortUuid(value) {
  const text = String(value || "").toLowerCase();
  return text.startsWith("0000") ? text.slice(4, 8) : text.slice(0, 8);
}

function distinctiveTokens(...values) {
  const stop = new Set([
    "the", "and", "wifi", "ble", "network", "device", "camera", "cam", "sensor", "node", "field",
    "unit", "unknown", "hidden", "other", "nearby", "wireless", "candidate", "family", "infra", "iot"
  ]);

  const tokens = new Set();
  values.flat().forEach((value) => {
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3 && !stop.has(part))
      .forEach((part) => tokens.add(part));
  });
  return [...tokens];
}

function overlap(a = [], b = []) {
  const right = new Set(b);
  return a.filter((item) => right.has(item));
}

function familyLabel(family, fallback = "Candidate") {
  const value = String(family || "").toLowerCase();
  const labels = {
    flock_exact: "Flock exact",
    flock_family: "Flock-family",
    camera_family: "Camera-family",
    infra_iot: "Infrastructure IoT",
    penguin: "Penguin",
    fs_battery: "FS Battery",
    raven: "Raven",
    soundthinking: "SoundThinking",
    flock_like: "Flock-like",
    consumer_ignore: "Consumer ignore",
    generic: "Generic"
  };
  return labels[value] || fallback;
}

function buildWifiSignal(network) {
  const match = network.match || {};
  const passive = match.passive || {};
  const ssid = String(network.ssid || "").trim();
  const bssid = String(network.bssid || "").trim().toUpperCase();
  const oui = passive.oui || getOui(bssid);
  const signal = typeof network.last_signal === "number" ? network.last_signal : null;

  return {
    type: "wifi",
    id: `wifi:${bssid || norm(ssid) || Math.random().toString(36).slice(2)}`,
    label: ssid || bssid || "Hidden Wi-Fi",
    family: match.family || "unknown",
    confidence: match.confidence || "none",
    baseScore: Number(match.score || 0) + confidenceScore(match.confidence),
    timestamp: network.last_seen,
    proximity: match.proximityLabel || "Unknown",
    identifiers: uniqueNorm([bssid, ssid]),
    strongIdentifiers: uniqueNorm([bssid]),
    aliases: uniqueNorm([ssid, oui, match.vendorGuess]),
    names: uniqueNorm([ssid]),
    tokens: distinctiveTokens(ssid),
    ouis: uniqueNorm([oui]),
    metadata: {
      ssid,
      bssid,
      oui,
      channel: passive.channel || network.channel || null,
      band: passive.band || null,
      security: passive.security || network.security || null,
      vendorGuess: match.vendorGuess || null,
      signal,
      reasons: toArray(match.reasons),
      exclusions: toArray(match.exclusions),
      hidden: Boolean(passive.hiddenSsid)
    },
    raw: network
  };
}

function buildBleSignal(device) {
  const match = device.match || {};
  const address = String(device.address || "").trim().toUpperCase();
  const name = String(device.name || "").trim();
  const oui = getOui(address);
  const rssi = typeof device.last_rssi === "number" ? device.last_rssi : null;
  const uuids = Array.isArray(device.service_uuids) ? device.service_uuids : [];
  const manufacturerIds = Array.isArray(device.manufacturer_ids) ? device.manufacturer_ids : [];

  return {
    type: "ble",
    id: `ble:${address || norm(name) || Math.random().toString(36).slice(2)}`,
    label: name || address || "BLE device",
    family: match.family || "unknown",
    confidence: match.confidence || "none",
    baseScore: Number(match.score || 0) + confidenceScore(match.confidence),
    timestamp: device.last_seen,
    proximity: match.proximityLabel || "Unknown",
    identifiers: uniqueNorm([address, name]),
    strongIdentifiers: uniqueNorm([address]),
    aliases: uniqueNorm([name, oui, ...uuids.map(shortUuid), ...manufacturerIds.map(String)]),
    names: uniqueNorm([name]),
    tokens: distinctiveTokens(name),
    ouis: uniqueNorm([oui]),
    metadata: {
      address,
      oui,
      name,
      rssi,
      reasons: toArray(match.reasons),
      ravenFirmwareGuess: match.ravenFirmwareGuess || null,
      manufacturerIds,
      serviceUuids: uuids
    },
    raw: device
  };
}

function buildIntelSignal(item) {
  const aliases = Array.isArray(item.aliases) ? item.aliases : [];
  const ip = String(item.ip || "").trim();
  const hostname = String(item.hostname || "").trim();
  const servicePorts = Array.isArray(item.servicePorts) ? item.servicePorts : [];
  const protocols = Array.isArray(item.protocolsSeen) ? item.protocolsSeen : [];
  const ports = Array.isArray(item.ports) ? item.ports : [];
  const exposure = String(item.exposureClass || "E0").toUpperCase();

  // Extract banner/version snippets and cert info for richer matching
  const bannerTokens = [];
  const portVersions = [];
  for (const port of ports) {
    if (port.fingerprintSummary) {
      bannerTokens.push(...distinctiveTokens(port.fingerprintSummary));
      portVersions.push({ port: port.port, version: port.fingerprintSummary });
    }
    if (port.summary) {
      bannerTokens.push(...distinctiveTokens(port.summary));
    }
  }

  return {
    type: "intel",
    id: `intel:${norm(item.key)}`,
    label: item.label || item.summary || item.key,
    family: item.scope || "generic",
    confidence: item.confidence || "medium",
    baseScore: 25 + confidenceScore(item.confidence) + exposureWeight(exposure) + (item.reachable ? 12 : 0),
    timestamp: item.updatedAt,
    proximity: item.reachable ? "Reachable" : "Metadata only",
    identifiers: uniqueNorm([item.key, ...aliases, ip, hostname]),
    strongIdentifiers: uniqueNorm([item.key, ip, hostname]),
    aliases: uniqueNorm([...aliases, ...protocols, ...servicePorts.map(String), ...ports.map((port) => String(port.port || port.service || ""))]),
    names: uniqueNorm([item.label, hostname]),
    tokens: distinctiveTokens(item.key, item.label, item.summary, hostname, ...bannerTokens),
    ouis: uniqueNorm([getOui(item.key), ...aliases.map(getOui)]),
    metadata: {
      key: item.key,
      ip: ip || null,
      hostname: hostname || null,
      exposureClass: exposure,
      reachable: typeof item.reachable === "boolean" ? item.reachable : null,
      latencyMs: item.latencyMs ?? null,
      summary: item.summary || null,
      evidenceMode: item.evidenceMode || "metadata-only",
      source: item.source || "manual",
      servicePorts,
      protocolsSeen: protocols,
      ports,
      portVersions
    },
    raw: item
  };
}

function relationStrength(a, b) {
  const reasons = [];
  let score = 0;

  const exactStrong = overlap(a.strongIdentifiers, b.identifiers);
  if (exactStrong.length) {
    score += 120;
    reasons.push(`Exact identifier match: ${exactStrong[0]}`);
  }

  const exact = overlap(a.identifiers, b.identifiers).filter((value) => !exactStrong.includes(value));
  if (exact.length) {
    score += 85;
    reasons.push(`Shared identifier: ${exact[0]}`);
  }

  const alias = overlap(a.identifiers, b.aliases).concat(overlap(a.aliases, b.identifiers));
  if (alias.length) {
    score += 70;
    reasons.push(`Alias correlation: ${alias[0]}`);
  }

  const sharedOui = overlap(a.ouis, b.ouis);
  if (sharedOui.length && sharedOui[0]) {
    score += 18;
    reasons.push(`Shared OUI ${sharedOui[0].toUpperCase()}`);
  }

  const sameFamily = a.family && b.family && a.family === b.family && !["unknown", "generic", "wifi", "ble"].includes(a.family);
  if (sameFamily) {
    score += 24;
    reasons.push(`Family match ${familyLabel(a.family, a.family)}`);
  }

  const tokenOverlap = overlap(a.tokens, b.tokens);
  if (tokenOverlap.length) {
    score += 22;
    reasons.push(`Name token overlap: ${tokenOverlap[0]}`);
  }

  if (sameMinuteWindow(a.timestamp, b.timestamp)) {
    score += 10;
    reasons.push("Seen in same time window");
  }

  if (a.type === "intel" || b.type === "intel") {
    score += 6;
    reasons.push("Authorized intel present");
  }

  // IP confirmation bonus: Intel with active-probe source that matches a WiFi/BLE signal
  const probeConfirmed = [a, b].some((s) => s.type === "intel" && s.metadata?.source === "scan" && s.metadata?.reachable === true);
  if (probeConfirmed && score >= 30) {
    score += 15;
    reasons.push("Active probe confirmed reachability");
  }

  return { score, reasons: unique(reasons) };
}

function shouldMerge(a, b, relation) {
  const score = relation.score;
  const hasIntel = a.type === "intel" || b.type === "intel";
  if (score >= 110) return true;
  if (hasIntel && score >= 75) return true;
  if (score >= 82) return true;
  return false;
}

function makeUnionFind(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  const rank = Array.from({ length: size }, () => 0);

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a, b) {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) return;
    if (rank[pa] < rank[pb]) parent[pa] = pb;
    else if (rank[pa] > rank[pb]) parent[pb] = pa;
    else {
      parent[pb] = pa;
      rank[pa] += 1;
    }
  }

  return { find, union };
}

function choosePrimarySignal(signals) {
  return signals.slice().sort((a, b) => {
    if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
    if (confidenceWeight(b.confidence) !== confidenceWeight(a.confidence)) {
      return confidenceWeight(b.confidence) - confidenceWeight(a.confidence);
    }
    return parseTimeMs(b.timestamp) - parseTimeMs(a.timestamp);
  })[0] || null;
}

function pickBestFamily(signals) {
  const buckets = new Map();
  signals.forEach((signal) => {
    const family = signal.family || "unknown";
    const weight = signal.baseScore + confidenceWeight(signal.confidence) * 10;
    buckets.set(family, (buckets.get(family) || 0) + weight);
  });

  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const [family] = sorted.find(([value]) => value !== "unknown") || sorted[0] || ["unknown"];
  return family || "unknown";
}

function summarizeSurfaces(intelSignals, family) {
  const ports = intelSignals.flatMap((signal) => toArray(signal.metadata?.ports));
  const versions = intelSignals.flatMap((signal) => toArray(signal.metadata?.portVersions));

  // Build version map: port number → version string
  const versionMap = new Map();
  for (const v of versions) {
    if (v.port && v.version) versionMap.set(v.port, v.version);
  }

  const serviceText = unique(
    ports.map((port) => {
      const parts = [];
      if (port.port) parts.push(String(port.port));
      if (port.service) parts.push(String(port.service).toUpperCase());
      // Append version info from banners if available
      const ver = versionMap.get(port.port);
      if (ver) parts.push(`(${ver})`);
      return parts.join("/");
    }).filter(Boolean)
  ).slice(0, 4);

  if (serviceText.length) return serviceText.join(" • ");

  if (["camera_family", "flock_exact", "flock_family", "penguin", "raven"].includes(family)) {
    return "Likely management / telemetry surfaces";
  }

  if (family === "infra_iot") {
    return "Likely infrastructure telemetry";
  }

  return "No surface intel yet";
}

function clusterChecks(cluster) {
  const steps = [];
  if (cluster.modalityCounts.intel) {
    steps.push("Validate the authorized intel record against the observed radio identifiers.");
  }
  if (cluster.modalityCounts.wifi) {
    steps.push("Cross-check DHCP, ARP, and switch/AP inventory for matching BSSID, SSID, or OUI.");
  }
  if (cluster.modalityCounts.ble) {
    steps.push("Compare BLE company IDs and service UUIDs against your owned-device inventory.");
  }
  if (cluster.family === "raven") {
    steps.push("Review Raven-family firmware expectations against the observed BLE service mix.");
  }
  if (!steps.length) {
    steps.push("Hold as a passive candidate until you can map it to an approved asset record.");
  }
  return steps.slice(0, 3);
}

function clusterSummary(cluster) {
  const parts = [];
  const modes = [];
  if (cluster.modalityCounts.wifi) modes.push(`Wi-Fi ${cluster.modalityCounts.wifi}`);
  if (cluster.modalityCounts.ble) modes.push(`BLE ${cluster.modalityCounts.ble}`);
  if (cluster.modalityCounts.intel) modes.push(`intel ${cluster.modalityCounts.intel}`);
  parts.push(modes.join(" + "));

  if (cluster.primaryProximity) parts.push(cluster.primaryProximity);
  if (cluster.maxExposure && cluster.maxExposure !== "E0") parts.push(cluster.maxExposure);
  if (cluster.reachable === true) parts.push("reachable metadata");
  if (cluster.surfaceSummary && cluster.surfaceSummary !== "No surface intel yet") parts.push(cluster.surfaceSummary);

  const firstEvidence = cluster.evidence[0];
  if (firstEvidence) parts.push(firstEvidence);

  return `${cluster.label}: ${parts.filter(Boolean).join(" • ")}`;
}

function buildCluster(signals, relations, index) {
  const primary = choosePrimarySignal(signals);
  const family = pickBestFamily(signals);
  const wifiSignals = signals.filter((signal) => signal.type === "wifi");
  const bleSignals = signals.filter((signal) => signal.type === "ble");
  const intelSignals = signals.filter((signal) => signal.type === "intel");

  const maxExposure = intelSignals
    .map((signal) => String(signal.metadata?.exposureClass || "E0").toUpperCase())
    .sort((a, b) => exposureWeight(b) - exposureWeight(a))[0] || "E0";

  let score = primary ? primary.baseScore : 0;
  score += signals.length >= 3 ? 10 : 0;
  score += wifiSignals.length && bleSignals.length ? 24 : 0;
  score += intelSignals.length ? 28 : 0;
  score += intelSignals.some((signal) => signal.metadata?.reachable === true) ? 12 : 0;
  score += exposureWeight(maxExposure);
  score += relations.length >= 2 ? 10 : 0;
  score = Math.min(180, score);

  const evidence = unique([
    ...signals.flatMap((signal) => toArray(signal.metadata?.reasons || [])).slice(0, 10),
    ...relations.flatMap((relation) => relation.reasons || []).slice(0, 10)
  ]).slice(0, 6);

  const label = intelSignals[0]?.label
    || primary?.label
    || familyLabel(family, "Correlated candidate");

  const primaryProximity = primary?.proximity || null;
  const surfaceSummary = summarizeSurfaces(intelSignals, family);
  const reachable = intelSignals.some((signal) => signal.metadata?.reachable === true)
    ? true
    : intelSignals.some((signal) => signal.metadata?.reachable === false)
      ? false
      : null;

  // Collect probe data (banner highlights, cert info) from active-probe intel
  const probeData = {
    hasProbeData: false,
    services: [],
    tlsCerts: [],
    bannerSnippets: []
  };

  for (const signal of intelSignals) {
    if (signal.metadata?.source !== "scan") continue;
    probeData.hasProbeData = true;

    for (const pv of toArray(signal.metadata?.portVersions)) {
      if (pv.version) probeData.services.push({ port: pv.port, version: pv.version });
    }

    for (const port of toArray(signal.metadata?.ports)) {
      if (port.summary && !port.summary.startsWith("Probe:")) {
        probeData.bannerSnippets.push({ port: port.port, snippet: String(port.summary).slice(0, 120) });
      }
    }
  }
  probeData.services = probeData.services.slice(0, 6);
  probeData.bannerSnippets = probeData.bannerSnippets.slice(0, 4);

  const cluster = {
    clusterId: `cluster-${index + 1}`,
    label,
    family,
    confidence: clusterConfidence(score),
    score,
    modalityCounts: {
      wifi: wifiSignals.length,
      ble: bleSignals.length,
      intel: intelSignals.length
    },
    primaryProximity,
    maxExposure,
    reachable,
    surfaceSummary,
    probeData,
    evidence,
    authorizedChecks: [],
    identifiers: {
      wifi: unique(wifiSignals.flatMap((signal) => [signal.metadata?.ssid, signal.metadata?.bssid]).filter(Boolean)).slice(0, 5),
      ble: unique(bleSignals.flatMap((signal) => [signal.metadata?.name, signal.metadata?.address]).filter(Boolean)).slice(0, 5),
      intel: unique(intelSignals.flatMap((signal) => [signal.metadata?.key, signal.metadata?.ip, signal.metadata?.hostname]).filter(Boolean)).slice(0, 5)
    },
    signals: {
      wifi: wifiSignals.map((signal) => signal.raw),
      ble: bleSignals.map((signal) => signal.raw),
      intel: intelSignals.map((signal) => signal.raw)
    },
    relations,
    summary: ""
  };

  cluster.authorizedChecks = clusterChecks(cluster);
  cluster.summary = clusterSummary(cluster);
  return cluster;
}

function buildIntelFusion({ wifiSummary = {}, bleSummary = {}, intelStore = {} } = {}) {
  const wifiSignals = (Array.isArray(wifiSummary.networks) ? wifiSummary.networks : []).map(buildWifiSignal);
  const bleSignals = (Array.isArray(bleSummary.devices) ? bleSummary.devices : []).map(buildBleSignal);
  const intelSignals = (Array.isArray(intelStore.items) ? intelStore.items : []).map(buildIntelSignal);
  const signals = [...wifiSignals, ...bleSignals, ...intelSignals];
  const uf = makeUnionFind(signals.length);
  const relationsByPair = [];

  for (let i = 0; i < signals.length; i += 1) {
    for (let j = i + 1; j < signals.length; j += 1) {
      const relation = relationStrength(signals[i], signals[j]);
      if (!shouldMerge(signals[i], signals[j], relation)) continue;
      uf.union(i, j);
      relationsByPair.push({ i, j, ...relation });
    }
  }

  const grouped = new Map();
  signals.forEach((signal, index) => {
    const root = uf.find(index);
    if (!grouped.has(root)) grouped.set(root, { indices: [], signals: [] });
    grouped.get(root).indices.push(index);
    grouped.get(root).signals.push(signal);
  });

  const clusters = [...grouped.values()].map((group, index) => {
    const relationSubset = relationsByPair
      .filter((relation) => group.indices.includes(relation.i) && group.indices.includes(relation.j))
      .map((relation) => ({
        score: relation.score,
        reasons: relation.reasons,
        left: signals[relation.i].label,
        right: signals[relation.j].label
      }));

    return buildCluster(group.signals, relationSubset, index);
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.modalityCounts.intel - a.modalityCounts.intel;
  });

  const byFamily = {};
  const byConfidence = { high: 0, medium: 0, low: 0, none: 0 };
  let multiSignal = 0;
  let withIntel = 0;

  clusters.forEach((cluster) => {
    byFamily[cluster.family] = (byFamily[cluster.family] || 0) + 1;
    byConfidence[cluster.confidence] = (byConfidence[cluster.confidence] || 0) + 1;
    const modalityKinds = [cluster.modalityCounts.wifi, cluster.modalityCounts.ble, cluster.modalityCounts.intel].filter(Boolean).length;
    if (modalityKinds >= 2) multiSignal += 1;
    if (cluster.modalityCounts.intel) withIntel += 1;
  });

  return {
    updatedAt: new Date().toISOString(),
    sourceSummary: {
      wifiSignals: wifiSignals.length,
      bleSignals: bleSignals.length,
      intelSignals: intelSignals.length
    },
    summary: {
      totalClusters: clusters.length,
      multiSignal,
      withIntel,
      highConfidence: byConfidence.high || 0,
      mediumConfidence: byConfidence.medium || 0,
      lowConfidence: byConfidence.low || 0,
      byFamily
    },
    clusters
  };
}

module.exports = {
  buildIntelFusion
};
