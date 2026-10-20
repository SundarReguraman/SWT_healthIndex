const CONFIG = require('../config/thresholds');

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Piecewise 4-band sub-scores: ideal 80-100, acceptable 50-79, poor 20-49, unsafe 0-19.
function scoreClarity(clarity) {
  const c = clamp(clarity, 0, 100);
  const { idealMin, acceptableMin, unsafeMin } = CONFIG.clarity;
  if (c >= idealMin) return Math.round(lerp(c, idealMin, 100, 80, 100));
  if (c >= acceptableMin) return Math.round(lerp(c, acceptableMin, idealMin, 50, 80));
  if (c >= unsafeMin) return Math.round(lerp(c, unsafeMin, acceptableMin, 20, 50));
  return Math.round(clamp(lerp(c, 0, unsafeMin, 0, 20), 0, 19));
}

function scoreTds(tds) {
  const d = Math.max(0, tds);
  const { idealMin, idealMax, acceptableMax, unsafeMax } = CONFIG.tds;
  // Very low TDS (RO / rain water) is safe but flat-tasting, so it eases down rather than failing.
  if (d < idealMin) return Math.round(lerp(d, 0, idealMin, 70, 100));
  if (d <= idealMax) return Math.round(lerp(d, idealMin, idealMax, 100, 80));
  if (d <= acceptableMax) return Math.round(lerp(d, idealMax, acceptableMax, 80, 50));
  if (d < unsafeMax) return Math.round(lerp(d, acceptableMax, unsafeMax, 50, 20));
  return Math.round(clamp(20 - (d - unsafeMax) * 0.02, 0, 19));
}

function evaluateLevel(level) {
  if (!isNum(level)) {
    return { levelStatus: 'UNKNOWN', levelAlert: 'Level sensor is not responding — check the ultrasonic sensor wiring.' };
  }
  const lvl = clamp(level, 0, 100);
  const pct = lvl.toFixed(0);
  if (lvl < CONFIG.level.lowMin) {
    return { levelStatus: 'CRITICAL_LOW', levelAlert: `Critical low water level (${pct}%) — turn on the pump now to avoid drawing settled bottom silt.` };
  }
  if (lvl < CONFIG.level.refillMin) {
    return { levelStatus: 'LOW', levelAlert: `Low water level (${pct}%) — refill the tank soon.` };
  }
  if (lvl < CONFIG.level.normalMin) {
    return { levelStatus: 'REFILL_SOON', levelAlert: `Tank level is moderate (${pct}%) — schedule a refill.` };
  }
  return { levelStatus: 'NORMAL', levelAlert: null };
}

const ZONE_META = {
  GOOD: {
    zoneLabel: 'Good',
    banner: 'Water quality is healthy. Tank is clean and safe for regular household use.',
  },
  SCHEDULE_MAINTENANCE: {
    zoneLabel: 'Schedule Maintenance',
    banner: 'Water quality is declining. Schedule a tank inspection and maintenance flush within 1–2 weeks.',
  },
  IMMEDIATE_CLEANING: {
    zoneLabel: 'Needs Immediate Cleaning',
    banner: 'Action Required: Tank needs immediate cleaning or source check before drinking.',
  },
  SENSOR_FAULT: {
    zoneLabel: 'Sensor Fault',
    banner: 'Water quality cannot be scored until the faulty sensor reports again.',
  },
};

function sensorFaultResult(reading, levelInfo) {
  const causes = [];
  if (!isNum(reading.clarity)) causes.push('Turbidity sensor is not responding — check its wiring and power.');
  if (!isNum(reading.tds)) causes.push('TDS probe is not reading — make sure it is submerged and connected.');
  return {
    subScores: { clarity: null, tds: null },
    rawComposite: null,
    composite: null,
    zone: 'SENSOR_FAULT',
    zoneLabel: ZONE_META.SENSOR_FAULT.zoneLabel,
    flagged: false,
    flaggedParams: [],
    capReason: null,
    message: `${ZONE_META.SENSOR_FAULT.banner} ${causes[0]}`,
    causes,
    ...levelInfo,
  };
}

function computeScores(reading) {
  const levelInfo = evaluateLevel(reading.level);
  if (!isNum(reading.clarity) || !isNum(reading.tds)) return sensorFaultResult(reading, levelInfo);

  const clarityScore = scoreClarity(reading.clarity);
  const tdsScore = scoreTds(reading.tds);
  const { weights, zones } = CONFIG;
  const rawComposite = Math.round(clarityScore * weights.clarity + tdsScore * weights.tds);

  const flaggedParams = [];
  if (reading.clarity < CONFIG.clarity.unsafeMin) flaggedParams.push('clarity');
  if (reading.tds >= CONFIG.tds.unsafeMax) flaggedParams.push('tds');
  const hasHardFlag = flaggedParams.length > 0;
  const hasPoorSubScore = clarityScore < 50 || tdsScore < 50;

  let composite = rawComposite;
  let capReason = null;
  if (hasHardFlag && rawComposite > zones.hardFlagCap) {
    composite = zones.hardFlagCap;
    const names = flaggedParams.map((p) => (p === 'tds' ? 'TDS' : 'clarity'));
    capReason = `Unsafe ${names.join(' and ')} reading caps the score at ${zones.hardFlagCap}`;
  } else if (!hasHardFlag && hasPoorSubScore && rawComposite > zones.poorParamCap) {
    composite = zones.poorParamCap;
    capReason = `A poor ${clarityScore < 50 ? 'clarity' : 'TDS'} reading caps the score at ${zones.poorParamCap}`;
  }

  let zone = 'GOOD';
  if (hasHardFlag || composite < zones.maintenanceMin) zone = 'IMMEDIATE_CLEANING';
  else if (hasPoorSubScore || composite < zones.goodMin) zone = 'SCHEDULE_MAINTENANCE';

  // Hard-flag causes come first so the headline names the reading that set the zone.
  const causes = [];
  const c = reading.clarity.toFixed(0);
  const d = reading.tds.toFixed(0);
  if (flaggedParams.includes('clarity')) causes.push(`Water is visibly cloudy (${c}%) — drain and scrub the tank to remove settled bottom sludge.`);
  if (flaggedParams.includes('tds')) causes.push(`Very high dissolved solids (${d} ppm) — exceeds the 1000 ppm safe limit; check the supply or RO membrane.`);
  if (!flaggedParams.includes('clarity') && clarityScore < 50) causes.push(`Water is getting cloudy (${c}%) — fine silt or sediment is building up at the tank bottom.`);
  if (!flaggedParams.includes('tds') && tdsScore < 50) causes.push(`Dissolved minerals (${d} ppm) are above the 500 ppm BIS acceptable limit.`);
  if (causes.length === 0 && zone !== 'GOOD') causes.push('Clarity and TDS are both only fair — plan a routine clean.');
  if (causes.length === 0) causes.push('Clarity and TDS are within WHO and BIS drinking-water limits.');

  return {
    subScores: { clarity: clarityScore, tds: tdsScore },
    rawComposite,
    composite,
    zone,
    zoneLabel: ZONE_META[zone].zoneLabel,
    flagged: hasHardFlag,
    flaggedParams,
    capReason,
    message: `${ZONE_META[zone].banner} ${causes[0]}`,
    causes,
    ...levelInfo,
  };
}

module.exports = { computeScores, scoreClarity, scoreTds, evaluateLevel };
