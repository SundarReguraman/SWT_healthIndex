const CONFIG = require('../config/thresholds');

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

function scoreClarity(reading) {
  let c = reading.clarity;
  if (c === null || c === undefined) {
    const ntu = Number(reading.turbidity ?? 0);
    if (ntu <= 1) c = lerp(ntu, 0, 1, 100, 90);
    else if (ntu <= 5) c = lerp(ntu, 1, 5, 90, 75);
    else if (ntu <= 10) c = lerp(ntu, 5, 10, 75, 60);
    else c = Math.max(0, 60 - (ntu - 10) * 3);
  }
  c = clamp(Number(c), 0, 100);
  if (c >= CONFIG.clarity.idealMin) return Math.round(lerp(c, 90, 100, 80, 100));
  if (c >= CONFIG.clarity.acceptableMin) return Math.round(lerp(c, 75, 90, 50, 80));
  if (c >= CONFIG.clarity.poorMin) return Math.round(lerp(c, 60, 75, 20, 50));
  return Math.round(clamp(lerp(c, 0, 60, 0, 20), 0, 19));
}

function scoreTds(tdsValue) {
  const d = Math.max(0, Number(tdsValue ?? 0));
  if (d >= CONFIG.tds.idealMin && d <= CONFIG.tds.idealMax) {
    return Math.round(lerp(d, 50, 300, 100, 80));
  }
  if (d < CONFIG.tds.idealMin) {
    return d < 5 ? 60 : Math.round(lerp(d, 5, 50, 85, 99));
  }
  if (d <= CONFIG.tds.acceptableMax) {
    return Math.round(lerp(d, 300, 500, 80, 50));
  }
  if (d <= CONFIG.tds.poorMax) {
    return Math.round(lerp(d, 500, 1000, 50, 20));
  }
  return Math.round(clamp(20 - (d - 1000) * 0.02, 0, 19));
}

function scoreTemperature(tempValue) {
  const t = Number(tempValue ?? 25);
  if (t >= CONFIG.temperature.idealMin && t <= CONFIG.temperature.idealMax) {
    return Math.round(100 - 1.5 * Math.abs(t - 20));
  }
  if (t < CONFIG.temperature.idealMin) {
    return Math.round(clamp(lerp(t, 5, 15, 40, 92), 20, 92));
  }
  if (t <= CONFIG.temperature.acceptableMax) {
    return Math.round(lerp(t, 25, 33, 85, 50));
  }
  if (t <= CONFIG.temperature.poorMax) {
    return Math.round(lerp(t, 33, 38, 50, 20));
  }
  return Math.round(clamp(20 - (t - 38) * 4, 0, 19));
}

function evaluateLevel(levelValue) {
  const lvl = clamp(Number(levelValue ?? 0), 0, 100);
  const subScore = Math.round(lvl);
  if (lvl < CONFIG.level.lowMin) {
    return {
      subScore,
      levelStatus: 'CRITICAL_LOW',
      levelAlert: `Critical low water level (${lvl.toFixed(0)}%) — turn on pump now to avoid drawing settled bottom silt.`,
    };
  }
  if (lvl < CONFIG.level.refillMin) {
    return {
      subScore,
      levelStatus: 'LOW',
      levelAlert: `Low water level (${lvl.toFixed(0)}%) — refill tank soon.`,
    };
  }
  if (lvl < CONFIG.level.normalMin) {
    return {
      subScore,
      levelStatus: 'REFILL_SOON',
      levelAlert: `Tank level is moderate (${lvl.toFixed(0)}%) — schedule refill.`,
    };
  }
  return { subScore, levelStatus: 'NORMAL', levelAlert: null };
}

function checkHardFlags(reading) {
  const flags = [];
  const clarity = reading.clarity !== null && reading.clarity !== undefined ? Number(reading.clarity) : null;
  const turbidity = reading.turbidity !== null && reading.turbidity !== undefined ? Number(reading.turbidity) : null;
  const tds = Number(reading.tds ?? 0);
  const temp = Number(reading.temperature ?? 25);

  if (clarity !== null && clarity < CONFIG.clarity.unsafeMin) flags.push('clarity');
  if (clarity === null && turbidity !== null && turbidity >= CONFIG.turbidity.unsafeMax) flags.push('turbidity');
  if (tds >= CONFIG.tds.unsafeMax) flags.push('tds');
  if (temp > CONFIG.temperature.unsafeMax) flags.push('temperature');
  if (
    clarity !== null &&
    clarity < CONFIG.compoundRisk.clarityMax &&
    temp > CONFIG.compoundRisk.temperatureMin &&
    !flags.includes('clarity') &&
    !flags.includes('temperature')
  ) {
    flags.push('compound_warm_cloudy');
  }
  return flags;
}

function buildDiagnostics(reading, subScores, flaggedParams, zone) {
  const causes = [];
  const c = Number(reading.clarity ?? 100);
  const d = Number(reading.tds ?? 0);
  const t = Number(reading.temperature ?? 25);

  if (flaggedParams.includes('clarity') || flaggedParams.includes('turbidity')) {
    causes.push(`Water is visibly cloudy (${c.toFixed(0)}%) — drain and scrub the tank to remove settled bottom sludge.`);
  } else if (subScores.clarity < 50) {
    causes.push(`Slight cloudiness detected (${c.toFixed(0)}%) — fine silt or sediment is building up at the tank bottom.`);
  }

  if (flaggedParams.includes('tds')) {
    causes.push(`Very high dissolved solids (${d.toFixed(0)} ppm) — exceeds safe drinking limit (1000 ppm); check supply or RO membrane.`);
  } else if (subScores.tds < 50) {
    causes.push(`Dissolved mineral levels (${d.toFixed(0)} ppm) exceed the 500 ppm BIS ideal drinking limit.`);
  }

  if (flaggedParams.includes('temperature')) {
    causes.push(`Water is dangerously warm (${t.toFixed(1)}°C) — high risk of bacterial growth; flush tank and shade roof cover.`);
  } else if (flaggedParams.includes('compound_warm_cloudy')) {
    causes.push(`Warm (${t.toFixed(1)}°C) and cloudy (${c.toFixed(0)}%) water accelerates bacterial and biofilm growth — clean tank immediately.`);
  } else if (subScores.temperature < 50) {
    causes.push(`Tank water is warm (${t.toFixed(1)}°C) — shade or insulate the tank lid to slow chlorine decay and microbial growth.`);
  }

  if (causes.length === 0) {
    causes.push('All water quality parameters are within safe WHO and BIS drinking limits.');
  }

  const zoneMeta = {
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
  }[zone];

  return {
    zoneLabel: zoneMeta.zoneLabel,
    message: `${zoneMeta.banner} ${causes[0]}`,
    causes,
  };
}

function computeScores(reading) {
  const clarityScore = scoreClarity(reading);
  const tdsScore = scoreTds(reading.tds);
  const temperatureScore = scoreTemperature(reading.temperature);
  const { subScore: levelScore, levelStatus, levelAlert } = evaluateLevel(reading.level);

  const { weights } = CONFIG;
  const rawComposite = Math.round(
    clarityScore * weights.clarity + tdsScore * weights.tds + temperatureScore * weights.temperature
  );

  const flaggedParams = checkHardFlags(reading);
  const hasHardFlag = flaggedParams.length > 0;
  const hasPoorSubScore = clarityScore < 50 || tdsScore < 50 || temperatureScore < 50;

  let composite = rawComposite;
  let capReason = null;

  if (hasHardFlag) {
    composite = Math.min(rawComposite, CONFIG.zones.hardFlagCap);
    capReason = `Hard-flag override (${flaggedParams.join(', ')}) capped score at ${CONFIG.zones.hardFlagCap}`;
  } else if (hasPoorSubScore && rawComposite >= CONFIG.zones.goodMin) {
    composite = CONFIG.zones.poorParamCap;
    capReason = `Single-parameter poor cap clamped score from ${rawComposite} to ${CONFIG.zones.poorParamCap}`;
  }

  let zone = 'GOOD';
  if (hasHardFlag || composite < CONFIG.zones.maintenanceMin) {
    zone = 'IMMEDIATE_CLEANING';
  } else if (hasPoorSubScore || composite < CONFIG.zones.goodMin) {
    zone = 'SCHEDULE_MAINTENANCE';
  }

  const subScores = { clarity: clarityScore, tds: tdsScore, temperature: temperatureScore, level: levelScore };
  const { zoneLabel, message, causes } = buildDiagnostics(reading, subScores, flaggedParams, zone);

  return {
    subScores,
    rawComposite,
    composite,
    zone,
    zoneLabel,
    flagged: hasHardFlag,
    flaggedParams,
    capReason,
    message,
    causes,
    levelStatus,
    levelAlert,
  };
}

module.exports = { computeScores };
