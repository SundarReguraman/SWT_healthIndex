// Shared intake for device readings, whether they arrive over HTTP (Wi-Fi) or USB serial.
const CONFIG = require('../config/thresholds');
const { computeScores } = require('./scoring');
const { saveReading } = require('./store');

const SENSOR_FIELDS = ['clarity', 'tds', 'temperature', 'level'];

// Each sensor value must be a finite number inside its plausible range, or null when the device
// reports that sensor as faulty. Returns { reading } or { error }.
function validateReading(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be a JSON object' };

  const values = {};
  for (const field of SENSOR_FIELDS) {
    const v = body[field];
    if (v === null || v === undefined) {
      values[field] = null;
      continue;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) return { error: `${field} must be a number or null` };
    const [min, max] = CONFIG.validRange[field];
    if (v < min || v > max) return { error: `${field} ${v} is outside the plausible range ${min}–${max}` };
    values[field] = v;
  }
  if (SENSOR_FIELDS.every((f) => values[f] === null)) return { error: 'No sensor values in payload' };

  const { deviceId, seq } = body;
  if (deviceId !== undefined && (typeof deviceId !== 'string' || !/^[\w.-]{1,64}$/.test(deviceId))) {
    return { error: 'deviceId must be 1–64 letters, digits, ".", "-" or "_"' };
  }
  if (seq !== undefined && !(Number.isInteger(seq) && seq >= 0)) return { error: 'seq must be a non-negative integer' };

  return { reading: { deviceId: deviceId || 'tank-1', seq: seq ?? null, ...values } };
}

// Returns { reading } with the scored reading, or { error } if the payload is invalid.
function ingestReading(body, via) {
  const { reading, error } = validateReading(body);
  if (error) {
    console.log(`[${via}] Rejected reading: ${error}`, JSON.stringify(body));
    return { error };
  }
  const full = { ...reading, source: 'live', via, timestamp: Date.now() };
  Object.assign(full, computeScores(full));
  saveReading(full);
  const show = (v, unit) => (v === null ? '—' : `${v}${unit}`);
  console.log(
    `[${via}] #${full.seq ?? '-'} clarity=${show(full.clarity, '%')} tds=${show(full.tds, 'ppm')} ` +
      `temp=${show(full.temperature, '°C')} level=${show(full.level, '%')} → score ${full.composite ?? '—'} ${full.zone}`
  );
  return { reading: full };
}

module.exports = { ingestReading, validateReading };
