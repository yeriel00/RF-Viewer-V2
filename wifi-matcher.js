function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function isHiddenSsid(ssid) {
  const raw = normalizeText(ssid);
  return !raw || raw === "(hidden)";
}

function getOui(bssid) {
  const raw = normalizeText(bssid).toUpperCase();
  if (!raw) return "";
  const parts = raw.split(":");
  if (parts.length < 3) return "";
  return parts.slice(0, 3).join(":");
}

function guessVendorFromOui(bssid) {
  const oui = getOui(bssid);

  const known = {
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
    "DC:A6:32": "Espressif"
  };

  return known[oui] || (oui ? `OUI ${oui}` : "Unknown");
}

function channelToBand(channel) {
  const ch = Number(channel);
  if (!Number.isFinite(ch) || ch <= 0) return "Unknown";
  if (ch >= 1 && ch <= 14) return "2.4 GHz";
  if (ch >= 36 && ch <= 177) return "5 GHz";
  if (ch >= 191) return "6 GHz";
  return "Unknown";
}

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
  if (score >= 55) return "medium";
  if (score >= 35) return "low";
  return "none";
}

function looksLikeStationaryInfra(network) {
  const seen = Number(network.seen_count || 0);
  const lastSignal = Number(network.last_signal);
  const maxSignal = Number(network.max_signal);
  const minSignal = Number(network.min_signal);

  if (!Number.isFinite(lastSignal) || !Number.isFinite(maxSignal) || !Number.isFinite(minSignal)) {
    return false;
  }

  const spread = Math.abs(maxSignal - minSignal);
  return seen >= 5 && spread <= 18;
}

function hasInfraKeyword(ssidLower) {
  return /(cam|camera|relay|node|edge|sensor|gateway|monitor|telemetry|solar|battery|iot|pole|unit|field)/i.test(ssidLower);
}

function hasFlockKeyword(ssidLower) {
  return /flock/i.test(ssidLower);
}

function hasCameraKeyword(ssidLower) {
  return /(camera|cam|lpr|plate|vision|watch|monitor)/i.test(ssidLower);
}

function isExactFlockPattern(ssid) {
  return /^flock-[a-f0-9]{6}$/i.test(normalizeText(ssid));
}

function isFlockPrefixPattern(ssid) {
  return /^flock-/i.test(normalizeText(ssid));
}

function getConsumerNegativeHit(ssidLower) {
  const patterns = [
    { re: /xfinity mobile|xfinitywifi|xfinity/i, label: "Xfinity consumer/mobile" },
    { re: /\bverizon\b|verizon[-_ ]?internet|vzw/i, label: "Verizon consumer/mobile" },
    { re: /\bt-?mobile\b|tmobile/i, label: "T-Mobile consumer/mobile" },
    { re: /\bat&t\b|\batt\b|attwifi/i, label: "AT&T consumer/mobile" },
    { re: /spectrum|cox|centurylink|comcast/i, label: "ISP / residential network" },
    { re: /iphone|ios|galaxy|pixel|androidap|hotspot/i, label: "Phone hotspot / personal device" },
    { re: /airpods|bose|roku|chromecast|firetv|kindle|apple ?tv/i, label: "Consumer media/audio device" },
    { re: /tesla|subaru|ford|toyota|honda|mazda|carplay|android auto/i, label: "Vehicle / infotainment device" },
    { re: /netgear|tp-?link|linksys|arris|asus|belkin|eero|orbi/i, label: "Consumer router brand" },
    { re: /printer|hp-?print|epson|brother|canon/i, label: "Printer / office consumer device" },
    { re: /guest|home|family/i, label: "Home / guest network naming" },
    { re: /^direct-|^roku-|^epson/i, label: "Consumer direct-connect device" }
  ];

  return patterns.find((item) => item.re.test(ssidLower)) || null;
}

function classifyWifiNetwork(network) {
  const ssid = normalizeText(network.ssid);
  const ssidLower = normalizeLower(ssid);
  const hidden = isHiddenSsid(ssid);
  const bssid = normalizeText(network.bssid).toUpperCase();
  const security = normalizeText(network.security);
  const channel = normalizeText(network.channel);
  const seenCount = Number(network.seen_count || 0);
  const vendorGuess = guessVendorFromOui(bssid);
  const band = channelToBand(channel);

  const reasons = [];
  const exclusions = [];
  let score = 0;
  let family = "unknown";
  let label = "Other nearby wireless";

  const consumerHit = getConsumerNegativeHit(ssidLower);
  const infraKeyword = hasInfraKeyword(ssidLower);
  const flockKeyword = hasFlockKeyword(ssidLower);
  const cameraKeyword = hasCameraKeyword(ssidLower);
  const stationaryHint = looksLikeStationaryInfra(network);

  if (consumerHit) {
    score -= 95;
    exclusions.push(consumerHit.label);
  }

  if (isExactFlockPattern(ssid)) {
    score += 120;
    family = "flock_exact";
    reasons.push("Exact Flock-style SSID");
  } else if (isFlockPrefixPattern(ssid)) {
    score += 85;
    family = "flock_family";
    reasons.push("Flock SSID prefix");
  } else if (flockKeyword) {
    score += 35;
    reasons.push('SSID contains "Flock"');
  }

  if (cameraKeyword) {
    score += 28;
    if (family === "unknown") family = "camera_family";
    reasons.push("Camera-style SSID keyword");
  }

  if (infraKeyword) {
    score += 20;
    if (family === "unknown") family = "infra_iot";
    reasons.push("Infrastructure / IoT style SSID keyword");
  }

  if (hidden) {
    score += 18;
    reasons.push("Hidden SSID");
  }

  if (security && !/open|none/i.test(security)) {
    score += 6;
    reasons.push(`Secured network (${security})`);
  }

  if (seenCount >= 10) {
    score += 14;
    reasons.push(`Repeated sightings (${seenCount})`);
  } else if (seenCount >= 3) {
    score += 8;
    reasons.push(`Seen multiple times (${seenCount})`);
  }

  if (stationaryHint) {
    score += 14;
    reasons.push("Looks stationary across sightings");
  }

  if (band !== "Unknown") {
    reasons.push(`Band ${band}`);
  }

  if (vendorGuess && vendorGuess !== "Unknown") {
    reasons.push(vendorGuess);
  }

  if (score <= -60) {
    return {
      matched: false,
      family: "consumer_ignore",
      label: "Consumer / ignore",
      score,
      confidence: "none",
      proximity: signalBucket(network.last_signal),
      proximityLabel: signalBucketLabel(signalBucket(network.last_signal)),
      reasons,
      exclusions,
      vendorGuess,
      passive: {
        hiddenSsid: hidden,
        stationaryHint,
        repeatedHint: seenCount >= 3,
        consumerHint: true,
        infraHint: false,
        exactSsid: false,
        ssid,
        bssid,
        oui: getOui(bssid),
        band,
        channel,
        security
      },
      probe: {
        mode: "passive_only",
        reachable: null,
        summary: "Passive only. No active probe attempted."
      }
    };
  }

  if (family === "flock_exact" && score >= 100) {
    label = "Flock exact";
  } else if ((family === "flock_family" || flockKeyword) && score >= 70) {
    family = "flock_family";
    label = "Flock-family";
  } else if ((cameraKeyword || family === "camera_family") && score >= 55) {
    family = "camera_family";
    label = "Camera-family candidate";
  } else if (score >= 35 && (hidden || infraKeyword || stationaryHint)) {
    family = "infra_iot";
    label = "Infrastructure IoT candidate";
  } else {
    family = "unknown";
    label = "Other nearby wireless";
  }

  const matched = family !== "unknown";
  const confidence = matched ? confidenceLabel(score) : "none";

  return {
    matched,
    family,
    label,
    score,
    confidence,
    proximity: signalBucket(network.last_signal),
    proximityLabel: signalBucketLabel(signalBucket(network.last_signal)),
    reasons,
    exclusions,
    vendorGuess,
    passive: {
      hiddenSsid: hidden,
      stationaryHint,
      repeatedHint: seenCount >= 3,
      consumerHint: false,
      infraHint: hidden || infraKeyword || stationaryHint,
      exactSsid: isExactFlockPattern(ssid),
      ssid,
      bssid,
      oui: getOui(bssid),
      band,
      channel,
      security
    },
    probe: {
      mode: "passive_only",
      reachable: null,
      summary: "Passive only. No active probe attempted."
    }
  };
}

function sortMatchedNetworks(networks) {
  return networks.slice().sort((a, b) => {
    const aLocked = a.locked ? 1 : 0;
    const bLocked = b.locked ? 1 : 0;
    if (bLocked !== aLocked) return bLocked - aLocked;

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
  const matched = sorted.filter((n) => n.match?.matched);
  const high = matched.filter((n) => n.match?.confidence === "high");
  const medium = matched.filter((n) => n.match?.confidence === "medium");
  const low = matched.filter((n) => n.match?.confidence === "low");

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