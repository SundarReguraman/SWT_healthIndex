// Demo data source: one reading per minute, for presentations without an ESP32.
// Every value is a pure function of the clock, so restarts resume the same series and the history
// can be backfilled with real timestamps. Demo readings go to their own stream in the store and are
// only shown while no live device is posting.
const { computeScores } = require('./scoring');
const { saveReading } = require('./store');

const MINUTE = 60_000;
const BACKFILL_MINUTES = 60;

// Shift the water-quality baseline to show other dashboard states on demand.
const PROFILES = {
  good: { clarity: 0, tds: 0 },
  attention: { clarity: -26, tds: 0 },
  critical: { clarity: -45, tds: 0 },
};

let enabled = false;

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
  const temperature = 29 + 3 * Math.sin((2 * Math.PI * (hourOfDay(t) - 9)) / 24) + 0.2 * smoothNoise(t, 10, 3);
  const level = tankLevel(t) + 0.5 * smoothNoise(t, 10, 4);

  const round1 = (v) => Math.round(v * 10) / 10;
  const reading = {
    deviceId: 'tank-1',
    seq: null,
    source: 'demo',
    via: 'demo',
    clarity: round1(Math.min(100, Math.max(0, clarity))),
    tds: Math.round(tds),
    temperature: round1(temperature),
    level: round1(Math.min(100, Math.max(0, level))),
    timestamp: t,
  };
  return { ...reading, ...computeScores(reading) };
}

function startDemo(profile = 'good') {
  if (!PROFILES[profile]) {
    console.log(`Unknown demo profile "${profile}" — use good, attention or critical. Falling back to good.`);
    profile = 'good';
  }
  enabled = true;
  const now = Date.now();
  const thisMinute = now - (now % MINUTE);
  for (let i = BACKFILL_MINUTES; i >= 0; i--) saveReading(demoReading(thisMinute - i * MINUTE, profile));

  const tick = () => saveReading(demoReading(Date.now() - (Date.now() % MINUTE), profile));
  // Align ticks to wall-clock minute boundaries.
  setTimeout(() => {
    tick();
    setInterval(tick, MINUTE);
  }, MINUTE - (now % MINUTE));

  console.log(`Demo data enabled (profile: ${profile}) — one reading per minute, hidden while a live device is posting`);
}

function isDemoEnabled() {
  return enabled;
}

module.exports = { startDemo, demoReading, isDemoEnabled };
