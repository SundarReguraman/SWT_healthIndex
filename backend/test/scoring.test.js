// Run with: npm test (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const { computeScores, scoreClarity, scoreTds } = require('../src/services/scoring');

const score = (clarity, tds, extra = {}) => computeScores({ clarity, tds, temperature: 28, level: 80, ...extra });

test('clean water scores GOOD', () => {
  const r = score(95, 210);
  assert.deepStrictEqual(r.subScores, { clarity: 90, tds: 87 });
  assert.strictEqual(r.composite, 89); // 90 × 0.55 + 87 × 0.45
  assert.strictEqual(r.zone, 'GOOD');
  assert.strictEqual(r.flagged, false);
});

test('mildly cloudy water needs maintenance', () => {
  const r = score(68, 260);
  assert.strictEqual(r.subScores.clarity, 36);
  assert.strictEqual(r.composite, 57);
  assert.strictEqual(r.zone, 'SCHEDULE_MAINTENANCE');
  assert.match(r.causes[0], /getting cloudy/);
});

test('clear but hard borewell water needs maintenance', () => {
  const r = score(94, 750);
  assert.strictEqual(r.subScores.tds, 35);
  assert.strictEqual(r.zone, 'SCHEDULE_MAINTENANCE');
  assert.match(r.causes[0], /500 ppm/);
});

test('one poor parameter caps an otherwise good score at 74', () => {
  const r = score(100, 510);
  assert.strictEqual(r.rawComposite, 77);
  assert.strictEqual(r.composite, 74);
  assert.strictEqual(r.zone, 'SCHEDULE_MAINTENANCE');
  assert.match(r.capReason, /TDS/);
});

test('unsafe clarity caps the score at 39', () => {
  const r = score(42, 185);
  assert.strictEqual(r.rawComposite, 48);
  assert.strictEqual(r.composite, 39);
  assert.strictEqual(r.zone, 'IMMEDIATE_CLEANING');
  assert.deepStrictEqual(r.flaggedParams, ['clarity']);
  assert.match(r.causes[0], /visibly cloudy/);
});

test('unsafe TDS caps the score at 39', () => {
  const r = score(95, 1150);
  assert.strictEqual(r.composite, 39);
  assert.deepStrictEqual(r.flaggedParams, ['tds']);
});

test('a score already below the cap is not raised and has no cap reason', () => {
  const r = score(10, 1500);
  assert.strictEqual(r.composite, r.rawComposite);
  assert.ok(r.composite < 39);
  assert.strictEqual(r.capReason, null);
  assert.deepStrictEqual(r.flaggedParams, ['clarity', 'tds']);
});

test('temperature has no effect on the score', () => {
  const cold = score(80, 400, { temperature: 5 });
  const hot = score(80, 400, { temperature: 45 });
  const missing = score(80, 400, { temperature: null });
  for (const r of [hot, missing]) {
    assert.strictEqual(r.composite, cold.composite);
    assert.strictEqual(r.zone, cold.zone);
    assert.deepStrictEqual(r.flaggedParams, cold.flaggedParams);
  }
});

test('band edges are continuous', () => {
  assert.strictEqual(scoreClarity(90), 80);
  assert.strictEqual(scoreClarity(75), 50);
  assert.strictEqual(scoreClarity(60), 20);
  assert.strictEqual(scoreClarity(59.9), 19);
  assert.strictEqual(scoreTds(0), 70);
  assert.strictEqual(scoreTds(50), 100);
  assert.strictEqual(scoreTds(300), 80);
  assert.strictEqual(scoreTds(500), 50);
  assert.strictEqual(scoreTds(999), 20);
  assert.strictEqual(scoreTds(1000), 19);
});

test('missing clarity or TDS is a sensor fault, not a score', () => {
  const r = score(null, 200);
  assert.strictEqual(r.zone, 'SENSOR_FAULT');
  assert.strictEqual(r.composite, null);
  assert.match(r.causes[0], /Turbidity sensor/);
  assert.strictEqual(score(90, null).zone, 'SENSOR_FAULT');
});

test('level status is reported separately and never changes the score', () => {
  assert.strictEqual(score(96, 195, { level: 12 }).levelStatus, 'CRITICAL_LOW');
  assert.strictEqual(score(96, 195, { level: 20 }).levelStatus, 'LOW');
  assert.strictEqual(score(96, 195, { level: 30 }).levelStatus, 'REFILL_SOON');
  assert.strictEqual(score(96, 195, { level: null }).levelStatus, 'UNKNOWN');
  assert.strictEqual(score(96, 195, { level: 12 }).composite, score(96, 195, { level: 90 }).composite);
});
