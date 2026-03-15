const HIGH_CONF_FLOCK_OUIS = [
  "58:8e:81", "cc:cc:cc", "ec:1b:bd", "90:35:ea", "04:0d:84",
  "f0:82:c0", "1c:34:f1", "38:5b:44", "94:34:69", "b4:e3:f9",
  "70:c9:4e", "3c:91:80", "d8:f3:bc", "80:30:49", "14:5a:fc",
  "74:4c:a1", "08:3a:88", "9c:2f:9d", "94:08:53", "e4:aa:ea",
  "b4:1e:52"
];

const HIGH_CONF_BATTERY_OUIS = [
  "58:8e:81", "cc:cc:cc", "ec:1b:bd", "90:35:ea", "04:0d:84",
  "f0:82:c0", "1c:34:f1", "38:5b:44", "94:34:69", "b4:e3:f9"
];

const OBSERVED_BATTERY_DATASET_OUIS = [
  "1b:bd:af", "58:8e:87", "90:35:86", "cc:cc:ac", "cc:d4:cc",
  "e0:38:2e", "f7:0f:12", "fa:35:a2"
];

const CONTRACT_MFR_FLOCK_OUIS = [
  "f4:6a:dd", "f8:a2:d6", "e0:0a:f6", "00:f4:8d", "d0:39:57",
  "e8:d0:fc"
];

const SOUNDTHINKING_OUIS = [
  "d4:11:d6"
];

const DEVICE_NAME_PATTERNS = [
  "fs ext battery",
  "penguin",
  "flock",
  "pigvision"
];

const BATTERY_NAME_PATTERNS = [
  "fs ext battery",
  "ext battery"
];

const BLE_MANUFACTURER_IDS = [
  0x09c8
];

const RAVEN_DEVICE_INFO_SERVICE = "0000180a-0000-1000-8000-00805f9b34fb";
const RAVEN_GPS_SERVICE = "00003100-0000-1000-8000-00805f9b34fb";
const RAVEN_POWER_SERVICE = "00003200-0000-1000-8000-00805f9b34fb";
const RAVEN_NETWORK_SERVICE = "00003300-0000-1000-8000-00805f9b34fb";
const RAVEN_UPLOAD_SERVICE = "00003400-0000-1000-8000-00805f9b34fb";
const RAVEN_ERROR_SERVICE = "00003500-0000-1000-8000-00805f9b34fb";
const RAVEN_OLD_HEALTH_SERVICE = "00001809-0000-1000-8000-00805f9b34fb";
const RAVEN_OLD_LOCATION_SERVICE = "00001819-0000-1000-8000-00805f9b34fb";

const RAVEN_SERVICE_UUIDS = [
  RAVEN_DEVICE_INFO_SERVICE,
  RAVEN_GPS_SERVICE,
  RAVEN_POWER_SERVICE,
  RAVEN_NETWORK_SERVICE,
  RAVEN_UPLOAD_SERVICE,
  RAVEN_ERROR_SERVICE,
  RAVEN_OLD_HEALTH_SERVICE,
  RAVEN_OLD_LOCATION_SERVICE
];

function normalizeMacPrefix(address = "") {
  return String(address).toLowerCase().slice(0, 8);
}

function normalizeName(name = "") {
  return String(name).toLowerCase().trim();
}

function normalizeUuid(uuid = "") {
  return String(uuid).toLowerCase();
}

function proximityBucket(rssi) {
  if (typeof rssi !== "number") return "unknown";
  if (rssi >= -55) return "very_close";
  if (rssi >= -65) return "close";
  if (rssi >= -75) return "medium";
  return "far";
}

function proximityLabel(bucket) {
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

function familyPriority(family) {
  switch (family) {
    case "penguin": return 6;
    case "fs_battery": return 5;
    case "raven": return 4;
    case "soundthinking": return 3;
    case "flock_like": return 2;
    default: return 1;
  }
}

function isPenguinName(name) {
  return /^penguin-\d+$/i.test(String(name || "").trim());
}

function estimateRavenFirmware(serviceUuids = []) {
  const normalized = new Set((serviceUuids || []).map(normalizeUuid));
  const hasNewGps = normalized.has(RAVEN_GPS_SERVICE);
  const hasOldLoc = normalized.has(RAVEN_OLD_LOCATION_SERVICE);
  const hasPower = normalized.has(RAVEN_POWER_SERVICE);

  if (hasOldLoc && !hasNewGps) return "1.1.x";
  if (hasNewGps && !hasPower) return "1.2.x";
  if (hasNewGps && hasPower) return "1.3.x";
  return "?";
}

function classifyDevice(device) {
  const reasons = [];
  const categories = [];
  let score = 0;

  const address = String(device.address || "");
  const name = normalizeName(device.name || "");
  const prefix = normalizeMacPrefix(address);

  const manufacturerIds = Array.isArray(device.manufacturer_ids)
    ? device.manufacturer_ids.map(Number).filter(Number.isFinite)
    : [];

  const serviceUuids = Array.isArray(device.service_uuids)
    ? device.service_uuids.map(normalizeUuid)
    : [];

  let batteryMatched = false;
  let penguinMatched = false;
  let ravenMatched = false;

  if (HIGH_CONF_BATTERY_OUIS.includes(prefix)) {
    score += 85;
    batteryMatched = true;
    categories.push("fs_battery");
    reasons.push(`FS Ext Battery OUI ${prefix}`);
  } else if (OBSERVED_BATTERY_DATASET_OUIS.includes(prefix)) {
    score += 25;
    categories.push("battery_dataset_observed");
    reasons.push(`Observed in FS Ext Battery dataset (${prefix})`);
  }

  if (HIGH_CONF_FLOCK_OUIS.includes(prefix)) {
    score += 70;
    categories.push("flock");
    reasons.push(`High-confidence Flock OUI ${prefix}`);
  }

  if (CONTRACT_MFR_FLOCK_OUIS.includes(prefix)) {
    score += 25;
    categories.push("flock_like");
    reasons.push(`Contract manufacturer OUI ${prefix}`);
  }

  if (SOUNDTHINKING_OUIS.includes(prefix)) {
    score += 70;
    categories.push("soundthinking");
    reasons.push(`SoundThinking OUI ${prefix}`);
  }

  for (const pattern of BATTERY_NAME_PATTERNS) {
    if (name.includes(pattern)) {
      score += 90;
      batteryMatched = true;
      categories.push("fs_battery");
      reasons.push(`Battery name matched "${pattern}"`);
      break;
    }
  }

  if (isPenguinName(name)) {
    score += 95;
    penguinMatched = true;
    categories.push("penguin");
    reasons.push("Exact Penguin name pattern");
  } else if (name.includes("penguin")) {
    score += 70;
    penguinMatched = true;
    categories.push("penguin");
    reasons.push('Name matched "penguin"');
  }

  for (const pattern of DEVICE_NAME_PATTERNS) {
    if (name.includes(pattern)) {
      score += 40;
      categories.push("named_match");
      reasons.push(`Name matched "${pattern}"`);
      break;
    }
  }

  for (const id of manufacturerIds) {
    if (BLE_MANUFACTURER_IDS.includes(id)) {
      score += 75;
      categories.push("manufacturer");
      reasons.push(`Manufacturer ID matched 0x${id.toString(16).toUpperCase()}`);

      if (penguinMatched) {
        score += 25;
        reasons.push("Penguin + manufacturer ID combination");
      }
    }
  }

  const ravenMatches = serviceUuids.filter(uuid => RAVEN_SERVICE_UUIDS.includes(uuid));
  let ravenFirmwareGuess = null;
  if (ravenMatches.length) {
    score += 85;
    ravenMatched = true;
    categories.push("raven");
    ravenFirmwareGuess = estimateRavenFirmware(serviceUuids);
    reasons.push(`Raven service UUID match (${ravenMatches.length})`);
    if (ravenFirmwareGuess && ravenFirmwareGuess !== "?") {
      reasons.push(`Raven firmware guess ${ravenFirmwareGuess}`);
    }
  }

  if (typeof device.seen_count === "number" && device.seen_count >= 20) {
    score += 5;
    reasons.push(`Repeated sightings (${device.seen_count})`);
  }

  if (typeof device.last_rssi === "number" && device.last_rssi >= -60) {
    score += 5;
    reasons.push(`Strong nearby RSSI (${device.last_rssi} dBm)`);
  }

  let family = "unknown";
  if (penguinMatched) {
    family = "penguin";
  } else if (batteryMatched || categories.includes("fs_battery")) {
    family = "fs_battery";
  } else if (ravenMatched) {
    family = "raven";
  } else if (categories.includes("soundthinking")) {
    family = "soundthinking";
  } else if (
    categories.includes("flock") ||
    categories.includes("flock_like") ||
    categories.includes("manufacturer") ||
    categories.includes("named_match")
  ) {
    family = "flock_like";
  }

  const matched = score > 0;
  const confidence = confidenceLabel(score);
  const proximity = proximityBucket(device.last_rssi);

  return {
    matched,
    family,
    score,
    confidence,
    proximity,
    proximityLabel: proximityLabel(proximity),
    batteryLeakCandidate: family === "fs_battery",
    ravenFirmwareGuess,
    reasons
  };
}

function sortMatchedDevices(devices) {
  return devices.slice().sort((a, b) => {
    const aScore = a.match?.score || 0;
    const bScore = b.match?.score || 0;
    if (bScore !== aScore) return bScore - aScore;

    const aFamilyPriority = familyPriority(a.match?.family);
    const bFamilyPriority = familyPriority(b.match?.family);
    if (bFamilyPriority !== aFamilyPriority) return bFamilyPriority - aFamilyPriority;

    const aRssi = typeof a.last_rssi === "number" ? a.last_rssi : -9999;
    const bRssi = typeof b.last_rssi === "number" ? b.last_rssi : -9999;
    if (bRssi !== aRssi) return bRssi - aRssi;

    return String(b.last_seen || "").localeCompare(String(a.last_seen || ""));
  });
}

function enrichBleSummary(summary = {}) {
  const devices = Array.isArray(summary.devices) ? summary.devices : [];
  const enrichedDevices = devices.map(device => ({
    ...device,
    match: classifyDevice(device)
  }));

  const sortedDevices = sortMatchedDevices(enrichedDevices);

  const matchedDevices = sortedDevices.filter(d => d.match?.matched);
  const highConfidence = matchedDevices.filter(d => d.match?.confidence === "high");
  const mediumConfidence = matchedDevices.filter(d => d.match?.confidence === "medium");
  const lowConfidence = matchedDevices.filter(d => d.match?.confidence === "low");
  const batteryMatches = matchedDevices.filter(d => d.match?.family === "fs_battery");
  const penguinMatches = matchedDevices.filter(d => d.match?.family === "penguin");
  const ravenMatches = matchedDevices.filter(d => d.match?.family === "raven");

  return {
    ...summary,
    devices: sortedDevices,
    matches: {
      total: matchedDevices.length,
      high: highConfidence.length,
      medium: mediumConfidence.length,
      low: lowConfidence.length,
      battery: batteryMatches.length,
      penguin: penguinMatches.length,
      raven: ravenMatches.length,
      strongest: matchedDevices[0] || null
    }
  };
}

module.exports = {
  enrichBleSummary
};