// ESP32 simulator over HTTP (the Wi-Fi path): posts readings shaped exactly like the firmware's,
// cycling through the same scenarios as the USB rehearsal (`npm run usb:rehearse`). Run with: npm run simulate
// Env: BACKEND_URL (default http://localhost:3001/api/readings), INTERVAL_MS (default 3000).
const { scenarioReading } = require('../src/services/fakeEsp32');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api/readings';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '3000', 10);

let seq = 0;

async function tick() {
  seq++;
  const { scenario, payload } = scenarioReading(seq);
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

console.log(`Simulating ESP32 → ${BACKEND_URL} every ${INTERVAL_MS} ms (Ctrl+C to stop)`);
tick();
setInterval(tick, INTERVAL_MS);
