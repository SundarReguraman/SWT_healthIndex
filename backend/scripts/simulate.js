// ESP32 simulator: posts readings shaped exactly like the firmware's over HTTP (the Wi-Fi path),
// cycling through scenarios that exercise every dashboard state. Run with: npm run simulate
// Env: BACKEND_URL (default http://localhost:3001/api/readings), INTERVAL_MS (default 3000), DEVICE_ID.

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api/readings';
const DEVICE_ID = process.env.DEVICE_ID || 'tank-1';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '3000', 10);
const CYCLES_PER_SCENARIO = 4;

// Expected outcome is what the backend should return; the simulator checks it and reports mismatches.
const SCENARIOS = [
  { name: 'Clean water', expect: 'GOOD', clarity: 95, tds: 185, temperature: 24, level: 88 },
  { name: 'Early silt build-up', expect: 'SCHEDULE_MAINTENANCE', clarity: 70, tds: 240, temperature: 27, level: 62 },
  { name: 'Hard borewell water', expect: 'SCHEDULE_MAINTENANCE', clarity: 93, tds: 760, temperature: 27, level: 45 },
  { name: 'Unsafe TDS intrusion', expect: 'IMMEDIATE_CLEANING', clarity: 90, tds: 1150, temperature: 28, level: 30 },
  { name: 'Sludge stirred up (unsafe clarity)', expect: 'IMMEDIATE_CLEANING', clarity: 45, tds: 300, temperature: 28, level: 18 },
  { name: 'TDS probe out of water', expect: 'SENSOR_FAULT', clarity: 92, tds: null, temperature: 26, level: 12 },
  { name: 'Cleaned and refilled', expect: 'GOOD', clarity: 97, tds: 165, temperature: 23, level: 95 },
];

let seq = 0;
let step = 0;

const jitter = (v, range, digits = 1) => {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round((v + (Math.random() - 0.5) * range) * f) / f;
};

async function tick() {
  const scenario = SCENARIOS[Math.floor(step / CYCLES_PER_SCENARIO) % SCENARIOS.length];
  step++;
  seq++;
  const payload = {
    deviceId: DEVICE_ID,
    seq,
    clarity: scenario.clarity === null ? null : Math.min(100, Math.max(0, jitter(scenario.clarity, 1.5))),
    tds: jitter(scenario.tds, 6, 0),
    temperature: jitter(scenario.temperature, 0.4),
    level: scenario.level === null ? null : Math.min(100, Math.max(0, jitter(scenario.level, 1))),
  };

  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`#${seq} ${scenario.name}: backend rejected the reading (${res.status}): ${data.error}`);
      return;
    }
    const { composite, zone } = data.latest;
    const ok = zone === scenario.expect ? 'ok' : `MISMATCH, expected ${scenario.expect}`;
    console.log(
      `#${seq} ${scenario.name.padEnd(36)} clarity=${payload.clarity ?? '—'} tds=${payload.tds ?? '—'} ` +
        `level=${payload.level ?? '—'} → score ${composite ?? '—'} ${zone} (${ok})`
    );
  } catch (err) {
    console.log(`#${seq} POST failed: ${err.message} — is the backend running at ${BACKEND_URL}?`);
  }
}

console.log(`Simulating ESP32 "${DEVICE_ID}" → ${BACKEND_URL} every ${INTERVAL_MS} ms (Ctrl+C to stop)`);
tick();
setInterval(tick, INTERVAL_MS);
