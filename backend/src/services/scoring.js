const CONFIG = require('../config/thresholds');

function scoreLowerIsBetter(value, idealMax, failMax) {
  if (value <= idealMax) return 100;
  if (value >= failMax) return 0;
  return Math.round((100 * (failMax - value)) / (failMax - idealMax));
}

function scoreBand(value, idealMin, idealMax, failMin, failMax) {
  if (value >= idealMin && value <= idealMax) return 100;
  if (value < idealMin) {
    if (value <= failMin) return 0;
    return Math.round((100 * (value - failMin)) / (idealMin - failMin));
  }
  if (value <= failMax) return Math.round((100 * (failMax - value)) / (failMax - idealMax));
  return 0;
}

function checkHardFlags(reading) {
  const flags = [];
  if (reading.clarity !== null && reading.clarity < CONFIG.clarity.unsafeMin) flags.push('clarity');
  if (reading.clarity === null && reading.turbidity >= CONFIG.turbidity.unsafeMax) flags.push('turbidity');
  if (reading.tds >= CONFIG.tds.unsafeMax) flags.push('tds');
  return flags;
}

function scoreClarity(reading) {
  if (reading.clarity !== null) return Math.max(0, Math.min(100, Math.round(reading.clarity)));
  return scoreLowerIsBetter(reading.turbidity, CONFIG.turbidity.idealMax, CONFIG.turbidity.acceptableMax);
}

function computeScores(reading) {
  const clarityScore = scoreClarity(reading);
  const tdsScore = scoreBand(reading.tds, CONFIG.tds.idealMin, CONFIG.tds.idealMax, 0, CONFIG.tds.acceptableMax);
  const temperatureScore = scoreBand(
    reading.temperature,
    CONFIG.temperature.idealMin,
    CONFIG.temperature.idealMax,
    0,
    CONFIG.temperature.acceptableMax
  );
  const levelScore = Math.max(0, Math.min(100, Math.round(reading.level)));

  const { weights } = CONFIG;
  const composite = Math.round(
    clarityScore * weights.clarity +
      tdsScore * weights.tds +
      temperatureScore * weights.temperature +
      levelScore * weights.level
  );

  const flaggedParams = checkHardFlags(reading);

  return {
    subScores: { clarity: clarityScore, tds: tdsScore, temperature: temperatureScore, level: levelScore },
    composite,
    flagged: flaggedParams.length > 0,
    flaggedParams,
  };
}

module.exports = { computeScores };
