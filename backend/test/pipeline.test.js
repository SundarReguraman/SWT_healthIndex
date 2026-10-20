// End-to-end checks of the intake → scoring → store path. Run with: npm test (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/services/store');
const { ingestReading, validateReading } = require('../src/services/ingest');
const { handleLine } = require('../src/services/serialBridge');
const { demoReading } = require('../src/services/demo');

const quiet = (fn) => {
  const log = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
  }
};
const reading = (extra = {}) => ({ deviceId: 'tank-1', clarity: 95, tds: 210, temperature: 28, level: 80, ...extra });

test.beforeEach(() => store.reset());

test('validation rejects bad payloads', () => {
  assert.match(validateReading(null).error, /JSON object/);
  assert.match(validateReading({}).error, /No sensor values/);
  assert.match(validateReading(reading({ clarity: '95' })).error, /clarity must be a number/);
  assert.match(validateReading(reading({ clarity: 140 })).error, /outside the plausible range/);
  assert.match(validateReading(reading({ tds: -3 })).error, /outside the plausible range/);
  assert.match(validateReading(reading({ seq: 1.5 })).error, /seq/);
  assert.match(validateReading(reading({ deviceId: '<script>' })).error, /deviceId/);
});

test('validation keeps nulls for faulty sensors', () => {
  const { reading: r } = validateReading(reading({ temperature: null, level: null, seq: 7 }));
  assert.strictEqual(r.temperature, null);
  assert.strictEqual(r.level, null);
  assert.strictEqual(r.seq, 7);
});

test('a rejected reading is not stored', () => {
  quiet(() => ingestReading(reading({ tds: 'high' }), 'wifi'));
  assert.strictEqual(store.getLatest(), null);
});

test('USB DATA lines go through the same pipeline as Wi-Fi', () => {
  quiet(() => handleLine('DATA {"deviceId":"tank-1","seq":42,"clarity":91.5,"tds":230,"temperature":null,"level":64}\r'));
  const latest = store.getLatest();
  assert.strictEqual(latest.via, 'usb');
  assert.strictEqual(latest.seq, 42);
  assert.strictEqual(latest.zone, 'GOOD');
  assert.strictEqual(latest.temperature, null);
});

test('non-DATA serial lines and broken JSON are ignored', () => {
  quiet(() => {
    handleLine('---- Sensor Readings ----');
    handleLine('DATA {"clarity":');
  });
  assert.strictEqual(store.getLatest(), null);
});

test('firmware-format serial output scores every scenario as expected, boot noise included', () => {
  const { SCENARIOS, scenarioReading, firmwareLines } = require('../src/services/fakeEsp32');
  quiet(() => {
    ['ets Jun  8 2016 00:22:57', 'rst:0x1 (POWERON_RESET),boot:0x13', 'DATA {"clar'].forEach(handleLine);
    for (let seq = 1; seq <= SCENARIOS.length * 4; seq++) {
      const { scenario } = scenarioReading(seq);
      firmwareLines(scenarioReading(seq).payload).forEach((line) => handleLine(line + '\r'));
      const latest = store.getLatest();
      assert.strictEqual(latest.seq, seq);
      assert.strictEqual(latest.zone, scenario.expect, `#${seq} ${scenario.name}`);
    }
  });
});

test('demo readings never mix into a live dashboard', () => {
  const now = Date.now();
  for (let i = 10; i >= 1; i--) store.saveReading(demoReading(now - i * 60_000, 'good'));
  assert.strictEqual(store.activeSource(), 'demo');

  quiet(() => ingestReading(reading({ seq: 1 }), 'usb'));
  assert.strictEqual(store.activeSource(), 'live');
  assert.strictEqual(store.getLatest().source, 'live');
  const history = store.getHistory(60);
  assert.strictEqual(history.length, 1);
  assert.ok(store.getEvents().every((e) => !/Demo/.test(e.text)));
});

test('a silent live device hands the dashboard back to demo, and to offline live data without demo', () => {
  const old = Date.now() - 10 * 60_000;
  store.saveReading({ ...reading(), source: 'live', via: 'usb', timestamp: old, zone: 'GOOD', flaggedParams: [], levelStatus: 'NORMAL' });
  assert.strictEqual(store.activeSource(), 'live'); // no demo: show last live data (dashboard marks it offline)
  store.saveReading(demoReading(Date.now(), 'good'));
  assert.strictEqual(store.activeSource(), 'demo');
});

test('events record zone changes, hard flags and sensor dropouts', () => {
  quiet(() => {
    ingestReading(reading(), 'wifi');
    ingestReading(reading({ clarity: 45 }), 'wifi');
    ingestReading(reading({ clarity: 45, level: null }), 'wifi');
    ingestReading(reading({ clarity: 95, level: 80 }), 'wifi');
  });
  const texts = store.getEvents().map((e) => e.text).reverse();
  assert.deepStrictEqual(texts, [
    'First reading received via wifi',
    'Water quality changed: Good → Clean now',
    'Unsafe clarity (45%) — below the 60% limit',
    'Level sensor stopped responding',
    'Water quality changed: Clean now → Good',
    'Clarity back within the safe limit',
    'Level sensor responding again',
  ]);
});

test('history is averaged into at most maxPoints buckets', () => {
  const now = Date.now();
  for (let i = 600; i >= 0; i--) store.saveReading(demoReading(now - i * 6_000, 'good'));
  const h = store.getHistory(60, 120);
  assert.ok(h.length <= 120 && h.length > 100);
  assert.ok(h.every((p) => typeof p.composite === 'number'));
});
