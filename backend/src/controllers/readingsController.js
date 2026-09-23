const { computeScores } = require('../services/scoring');
const { saveReading, getLatest, getHistory } = require('../services/store');

function isValidReading(body) {
  const { clarity, turbidity, tds, temperature, level } = body;
  const clarityOrLegacyTurbidity = clarity ?? turbidity;
  return [clarityOrLegacyTurbidity, tds, temperature, level].every(
    (v) => typeof v === 'number' && Number.isFinite(v)
  );
}

function postReading(req, res) {
  if (!isValidReading(req.body)) {
    console.log('Rejected invalid payload:', req.body);
    return res.status(400).json({ error: 'Missing or invalid sensor values' });
  }
  const { clarity, turbidity, tds, temperature, level, deviceId } = req.body;
  const reading = {
    deviceId: deviceId || 'tank-1',
    clarity: clarity ?? null,
    turbidity: turbidity ?? null,
    tds,
    temperature,
    level,
    timestamp: Date.now(),
  };
  console.log(`[${new Date(reading.timestamp).toLocaleTimeString()}] Reading from ${reading.deviceId}:`, reading);
  const scores = computeScores(reading);
  const full = { ...reading, ...scores };
  saveReading(full);
  res.json({ ok: true, latest: full });
}

function getLatestReading(req, res) {
  const latest = getLatest();
  if (!latest) return res.status(404).json({ error: 'No readings yet' });
  res.json(latest);
}

function getReadingHistory(req, res) {
  res.json(getHistory());
}

module.exports = { postReading, getLatestReading, getReadingHistory };
