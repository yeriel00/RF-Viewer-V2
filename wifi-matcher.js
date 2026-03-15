function signalBucket(signal) {
  if (typeof signal !== "number") return "unknown";
  if (signal >= 80) return "very_close";
  if (signal >= 60) return "close";
  if (signal >= 40) return "medium";
  return "far";
}

function signalBucketLabel(bucket) {
  switch (bucket) {
    case "very_close": return "Very close";
    case "close": return "Close";
    case "medium": return "Medium";
    case "far": return "Far";
    default: return "Unknown";
  }
}

function confidenceLabel(score) {
  if (score >= 90) return "high";
  if (score >= 50) return "medium";
  if (score > 0) return "low";
  return "none";
}

function classifyWifiNetwork(network) {
  const ssid = String(network.ssid || "").trim();
  const security = String(network.security || "").trim();
  const reasons = [];
  let score = 0;
  let family = "unknown";

  if (/^Flock-[A-F0-9]{6}$/i.test(ssid)) {
    score += 95;
    family = "flock_wifi";
    reasons.push("Exact Flock-style SSID");
  } else if (/^Flock-/i.test(ssid)) {
    score += 70;
    family = "flock_wifi";
    reasons.push("Flock SSID prefix");
  } else if (/flock/i.test(ssid)) {
    score += 30;
    family = "flock_wifi";
    reasons.push('SSID contains "Flock"');
  }

  if (family === "flock_wifi" && security) {
    score += 5;
    reasons.push(`Security: ${security}`);
  }

  if (typeof network.seen_count === "number" && network.seen_count >= 3) {
    score += 3;
    reasons.push(`Repeated sightings (${network.seen_count})`);
  }

  const matched = score > 0;
  const confidence = confidenceLabel(score);
  const proximity = signalBucket(network.last_signal);

  return {
    matched,
    family,
    score,
    confidence,
    proximity,
    proximityLabel: signalBucketLabel(proximity),
    reasons
  };
}

function sortMatchedNetworks(networks) {
  return networks.slice().sort((a, b) => {
    const aScore = a.match?.score || 0;
    const bScore = b.match?.score || 0;
    if (bScore !== aScore) return bScore - aScore;

    const aSignal = typeof a.last_signal === "number" ? a.last_signal : -9999;
    const bSignal = typeof b.last_signal === "number" ? b.last_signal : -9999;
    if (bSignal !== aSignal) return bSignal - aSignal;

    return String(b.last_seen || "").localeCompare(String(a.last_seen || ""));
  });
}

function enrichWifiSummary(summary = {}) {
  const networks = Array.isArray(summary.networks) ? summary.networks : [];
  const enriched = networks.map((network) => ({
    ...network,
    match: classifyWifiNetwork(network)
  }));

  const sorted = sortMatchedNetworks(enriched);
  const matched = sorted.filter(n => n.match?.matched);
  const high = matched.filter(n => n.match?.confidence === "high");
  const medium = matched.filter(n => n.match?.confidence === "medium");
  const low = matched.filter(n => n.match?.confidence === "low");

  return {
    ...summary,
    networks: sorted,
    matches: {
      total: matched.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
      strongest: matched[0] || null
    }
  };
}

module.exports = {
  enrichWifiSummary
};