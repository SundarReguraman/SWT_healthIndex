// Shared intake for device readings, whether they arrive over HTTP (Wi-Fi) or USB serial.
const { computeScores } = require('./scoring');
const { saveReading } = require('./store');

function isValidReading(body) {
  const { clarity, turbidity, tds, temperature, level } = body;
  const clarityOrLegacyTurbidity = clarity ?? turbidity;
  return [clarityOrLegacyTurbidity, tds, temperature, level].every(
    (v) => typeof v === 'number' && Number.isFinite(v)
  );
}

// Returns the scored reading, or null if the payload is invalid.
function ingestReading(body, via) {
  if (!body || !isValidReading(body)) {
    console.log(`Rejected invalid payload (${via}):`, body);
    return null;
  }
  const { clarity, turbidity, tds, temperature, level, deviceId } = body;
  const reading = {
    deviceId: deviceId || 'tank-1',
    source: 'live',
    clarity: clarity ?? null,
    turbidity: turbidity ?? null,
    tds,
    temperature,
    level,
    timestamp: Date.now(),
  };
  console.log(`[${new Date(reading.timestamp).toLocaleTimeString()}] Reading from ${reading.deviceId} via ${via}:`, reading);
  const full = { ...reading, ...computeScores(reading) };
  saveReading(full);
  return full;
}

module.exports = { ingestReading };
