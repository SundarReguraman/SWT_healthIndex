// Demo data source: one reading per minute, used when no ESP32 is posting.
// Every value is a pure function of the clock, so restarts resume the same series
// (no state file needed) and the history can be backfilled with real timestamps.
const { computeScores } = require('./scoring');
const { saveReading, getHistory, getLastLiveAt } = require('./store');

const MINUTE = 60_000;
const BACKFILL_MINUTES = 60;
const LIVE_GRACE_MS = 2 * MINUTE; // pause the demo while a real device is posting

// Shift the water-quality baseline to show other dashboard states on demand.
const PROFILES = {
  good: { clarity: 0, tds: 0, temperature: 0 },
  attention: { clarity: -26, tds: 0, temperature: 0 },
  critical: { clarity: -45, tds: 0, temperature: 0 },
};

// Deterministic pseudo-random in [-1, 1] for an integer knot and channel.
function hash(n, channel) {
  const x = Math.sin(n * 127.1 + channel * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

// Smooth noise: cosine-interpolated between knots spaced `periodMin` minutes apart.
function smoothNoise(t, periodMin, channel) {
  const pos = t / (periodMin * MINUTE);
  const i = Math.floor(pos);
  const f = (1 - Math.cos((pos - i) * Math.PI)) / 2;
  return hash(i, channel) * (1 - f) + hash(i + 1, channel) * f;
}

function hourOfDay(t) {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60;
}

// Pump runs at 06:00 and 18:00, refills to 95% over 30 min, then drains ~4%/h with use.
function tankLevel(t) {
  const sincePump = (hourOfDay(t) + 6) % 12; // hours since the last 06:00 / 18:00 pump run
  const full = 95;
  const beforePump = full - 4 * 11.5;
  if (sincePump < 0.5) return beforePump + (full - beforePump) * (sincePump / 0.5);
  return full - 4 * (sincePump - 0.5);
}

function demoReading(t, profile) {
  const p = PROFILES[profile] || PROFILES.good;
  const day = t / (24 * 60 * MINUTE);
  const weekPhase = (day % 7) / 7; // tank cleaned weekly; clarity eases down in between

  const clarity = 97 - 6 * weekPhase + 0.4 * smoothNoise(t, 15, 1) + p.clarity;
  const tds = 212 + 18 * Math.sin((2 * Math.PI * day) / 3) + 3 * smoothNoise(t, 20, 2) + p.tds;
  const temperature = 29 + 3 * Math.sin((2 * Math.PI * (hourOfDay(t) - 9)) / 24) + 0.2 * smoothNoise(t, 10, 3) + p.temperature;
  const level = tankLevel(t) + 0.5 * smoothNoise(t, 10, 4);

  const round1 = (v) => Math.round(v * 10) / 10;
  const reading = {
    deviceId: 'tank-1',
    source: 'demo',
    clarity: round1(Math.min(100, Math.max(0, clarity))),
    turbidity: null,
    tds: Math.round(tds),
    temperature: round1(temperature),
    level: round1(Math.min(100, Math.max(0, level))),
    timestamp: t,
  };
  return { ...reading, ...computeScores(reading) };
}

function startDemo(profile = 'good') {
  const now = Date.now();
  const thisMinute = now - (now % MINUTE);

  if (getHistory().length === 0) {
    for (let i = BACKFILL_MINUTES; i >= 0; i--) saveReading(demoReading(thisMinute - i * MINUTE, profile));
  }

  const tick = () => {
    const t = Date.now() - (Date.now() % MINUTE);
    const lastLive = getLastLiveAt();
    if (lastLive && Date.now() - lastLive < LIVE_GRACE_MS) return;
    saveReading(demoReading(t, profile));
  };

  // Align ticks to wall-clock minute boundaries.
  setTimeout(() => {
    tick();
    setInterval(tick, MINUTE);
  }, MINUTE - (now % MINUTE));

  console.log(`Demo data enabled (profile: ${profile}) — one reading per minute, paused while a live device is posting`);
}

module.exports = { startDemo, demoReading };
