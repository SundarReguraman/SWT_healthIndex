// In-memory store. Live (device) and demo readings are kept in separate streams so demo data can never
// leak into a live dashboard: the "active" stream is live whenever a device has posted recently.
const MINUTE = 60_000;
const RETENTION_MS = 24 * 60 * MINUTE;
const MAX_READINGS = 20_000; // ~24 h at one reading every 5 s
const MAX_EVENTS = 100;
const LIVE_GRACE_MS = 2 * MINUTE; // a live device silent for longer than this counts as offline
const EXPECTED_INTERVAL_MS = { live: 5_000, demo: MINUTE };

const streams = {
  live: { readings: [], events: [] },
  demo: { readings: [], events: [] },
};
let lastVia = null;
let nextEventId = 1;

const ZONE_NAMES = {
  GOOD: 'Good',
  SCHEDULE_MAINTENANCE: 'Needs attention',
  IMMEDIATE_CLEANING: 'Clean now',
  SENSOR_FAULT: 'Sensor fault',
};
const ZONE_TONES = { GOOD: 'good', SCHEDULE_MAINTENANCE: 'warn', IMMEDIATE_CLEANING: 'bad', SENSOR_FAULT: 'neutral' };
const LEVEL_NAMES = { NORMAL: 'Normal', REFILL_SOON: 'Refill soon', LOW: 'Low', CRITICAL_LOW: 'Critical low', UNKNOWN: 'Unknown' };
const LEVEL_TONES = { NORMAL: 'good', REFILL_SOON: 'warn', LOW: 'warn', CRITICAL_LOW: 'bad', UNKNOWN: 'neutral' };
const SENSOR_NAMES = { clarity: 'Turbidity sensor', tds: 'TDS probe', temperature: 'Temperature sensor', level: 'Level sensor' };

function addEvent(source, tone, text, timestamp = Date.now()) {
  const events = streams[source].events;
  events.push({ id: nextEventId++, timestamp, tone, text });
  if (events.length > MAX_EVENTS) events.shift();
}

const fmtGap = (ms) => (ms < 2 * MINUTE ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / MINUTE)} min`);

// Compares a reading with the previous one in the same stream and records what changed.
function recordEvents(source, prev, r) {
  const t = r.timestamp;
  if (!prev) {
    addEvent(source, 'neutral', source === 'demo' ? 'Demo feed started' : `First reading received via ${r.via}`, t);
  } else if (t - prev.timestamp > LIVE_GRACE_MS) {
    addEvent(source, 'neutral', `Readings resumed after ${fmtGap(t - prev.timestamp)} without data`, t);
  }

  if (prev && prev.zone !== r.zone) {
    addEvent(source, ZONE_TONES[r.zone], `Water quality changed: ${ZONE_NAMES[prev.zone]} → ${ZONE_NAMES[r.zone]}`, t);
  }

  const prevFlags = prev ? prev.flaggedParams : [];
  if (r.flaggedParams.includes('clarity') && !prevFlags.includes('clarity')) {
    addEvent(source, 'bad', `Unsafe clarity (${r.clarity.toFixed(0)}%) — below the 60% limit`, t);
  }
  if (r.flaggedParams.includes('tds') && !prevFlags.includes('tds')) {
    addEvent(source, 'bad', `Unsafe TDS (${r.tds.toFixed(0)} ppm) — at or above the 1000 ppm limit`, t);
  }
  for (const p of prevFlags) {
    if (!r.flaggedParams.includes(p)) addEvent(source, 'good', `${p === 'tds' ? 'TDS' : 'Clarity'} back within the safe limit`, t);
  }

  // A level sensor dropping out is reported by the sensor check below, not as a level change.
  if (prev && prev.levelStatus !== r.levelStatus && prev.level !== null && r.level !== null) {
    addEvent(source, LEVEL_TONES[r.levelStatus], `Water level ${LEVEL_NAMES[prev.levelStatus]} → ${LEVEL_NAMES[r.levelStatus]} (${r.level.toFixed(0)}%)`, t);
  }

  for (const key of Object.keys(SENSOR_NAMES)) {
    const was = prev ? prev[key] !== null : true;
    const is = r[key] !== null;
    if (was && !is) addEvent(source, 'warn', `${SENSOR_NAMES[key]} stopped responding`, t);
    if (!was && is) addEvent(source, 'good', `${SENSOR_NAMES[key]} responding again`, t);
  }
}

function saveReading(reading) {
  const source = reading.source === 'demo' ? 'demo' : 'live';
  const { readings } = streams[source];
  recordEvents(source, readings[readings.length - 1], reading);
  readings.push(reading);
  if (source === 'live') lastVia = reading.via;
  const cutoff = reading.timestamp - RETENTION_MS;
  while (readings.length > MAX_READINGS || (readings.length && readings[0].timestamp < cutoff)) readings.shift();
}

function lastOf(source) {
  const r = streams[source].readings;
  return r.length ? r[r.length - 1] : null;
}

// Live wins while a device is posting; otherwise demo (if running); otherwise the last live data, shown as offline.
function activeSource(now = Date.now()) {
  const live = lastOf('live');
  if (live && now - live.timestamp < LIVE_GRACE_MS) return 'live';
  if (lastOf('demo')) return 'demo';
  if (live) return 'live';
  return null;
}

function getLatest() {
  const source = activeSource();
  return source ? lastOf(source) : null;
}

const HISTORY_FIELDS = ['composite', 'clarity', 'tds', 'temperature', 'level'];

// Averages readings into at most `maxPoints` time buckets so long ranges stay light to send and draw.
function getHistory(minutes = 60, maxPoints = 120) {
  const source = activeSource();
  if (!source) return [];
  const readings = streams[source].readings;
  const end = readings[readings.length - 1].timestamp;
  const start = end - minutes * MINUTE;
  const inRange = readings.filter((r) => r.timestamp > start);
  if (inRange.length <= maxPoints) {
    return inRange.map((r) => pickHistory(r, r.timestamp));
  }
  const bucketMs = (minutes * MINUTE) / maxPoints;
  const buckets = new Map();
  for (const r of inRange) {
    const b = Math.min(maxPoints - 1, Math.floor((r.timestamp - start) / bucketMs));
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(r);
  }
  return [...buckets.values()].map((group) => {
    const point = { timestamp: group[group.length - 1].timestamp, zone: group[group.length - 1].zone };
    for (const f of HISTORY_FIELDS) {
      const vals = group.map((g) => g[f]).filter((v) => typeof v === 'number');
      point[f] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    }
    return point;
  });
}

function pickHistory(r, timestamp) {
  const point = { timestamp, zone: r.zone };
  for (const f of HISTORY_FIELDS) point[f] = r[f];
  return point;
}

function getEvents(limit = 20) {
  const source = activeSource();
  return source ? streams[source].events.slice(-limit).reverse() : [];
}

function getStreamStatus(now = Date.now()) {
  const source = activeSource(now);
  const latest = source ? lastOf(source) : null;
  const live = lastOf('live');
  return {
    source,
    ageMs: latest ? now - latest.timestamp : null,
    expectedIntervalMs: source ? EXPECTED_INTERVAL_MS[source] : null,
    live: {
      lastAt: live ? live.timestamp : null,
      via: lastVia,
      count: streams.live.readings.length,
    },
  };
}

function getLastLiveAt() {
  const live = lastOf('live');
  return live ? live.timestamp : null;
}

function reset() {
  streams.live = { readings: [], events: [] };
  streams.demo = { readings: [], events: [] };
  lastVia = null;
}

module.exports = {
  saveReading,
  addEvent,
  getLatest,
  getHistory,
  getEvents,
  getStreamStatus,
  getLastLiveAt,
  activeSource,
  reset,
  LIVE_GRACE_MS,
};
