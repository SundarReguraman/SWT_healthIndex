// verify_scoring.js — Run with: node verify_scoring.js
const assert = require('assert');
const { computeScores } = require('./backend/src/services/scoring');

const TEST_CASES = [
  {
    name: '1. Clean Water (32.5 C Hardware Room Temp Baseline)',
    input: { clarity: 95.0, tds: 210, temperature: 32.5, level: 82.0 },
    expectZone: 'GOOD',
    expectFlagged: false,
    minScore: 75,
    maxScore: 100,
    expectLevelStatus: 'NORMAL',
  },
  {
    name: '2. Mildly Cloudy (Early Silt Buildup)',
    input: { clarity: 68.0, tds: 260, temperature: 31.0, level: 65.0 },
    expectZone: 'SCHEDULE_MAINTENANCE',
    expectFlagged: false,
    minScore: 45,
    maxScore: 74,
    expectLevelStatus: 'NORMAL',
  },
  {
    name: '3. High TDS (Hard Borewell Water, Clear)',
    input: { clarity: 94.0, tds: 750, temperature: 29.0, level: 88.0 },
    expectZone: 'SCHEDULE_MAINTENANCE',
    expectFlagged: false,
    minScore: 45,
    maxScore: 74,
    expectLevelStatus: 'NORMAL',
  },
  {
    name: '4. Warm & Cloudy (Compound Biofilm Hard Flag)',
    input: { clarity: 66.0, tds: 290, temperature: 35.0, level: 60.0 },
    expectZone: 'IMMEDIATE_CLEANING',
    expectFlagged: true,
    minScore: 0,
    maxScore: 39,
    expectLevelStatus: 'NORMAL',
  },
  {
    name: '5. Single Hard-Flag Override (Sludge Stir-Up <60% Clarity)',
    input: { clarity: 42.0, tds: 185, temperature: 26.0, level: 75.0 },
    expectZone: 'IMMEDIATE_CLEANING',
    expectFlagged: true,
    minScore: 0,
    maxScore: 39,
    expectLevelStatus: 'NORMAL',
  },
  {
    name: '6. Low-Level-Only Case (Clean Water @ 12% Level)',
    input: { clarity: 96.0, tds: 195, temperature: 30.5, level: 12.0 },
    expectZone: 'GOOD',
    expectFlagged: false,
    minScore: 75,
    maxScore: 100,
    expectLevelStatus: 'CRITICAL_LOW',
  },
];

console.log('=== Running SWT_healthIndex Scoring Verification Suite ===\n');
for (const tc of TEST_CASES) {
  const res = computeScores(tc.input);
  console.log(`[PASS CHECK] ${tc.name}`);
  console.log(`  Inputs     : Clarity=${tc.input.clarity}%, TDS=${tc.input.tds}ppm, Temp=${tc.input.temperature}C, Level=${tc.input.level}%`);
  console.log(`  Sub-Scores : Clarity=${res.subScores.clarity}, TDS=${res.subScores.tds}, Temp=${res.subScores.temperature}, Level=${res.subScores.level}`);
  console.log(`  Composite  : Raw=${res.rawComposite} -> Final=${res.composite} | Zone=${res.zone} (${res.zoneLabel})`);
  console.log(`  Flags      : flagged=${res.flagged} [${res.flaggedParams.join(', ')}] | LevelStatus=${res.levelStatus}`);
  console.log(`  Message    : "${res.message}"\n`);

  assert.strictEqual(res.zone, tc.expectZone, `Expected zone ${tc.expectZone} but got ${res.zone}`);
  assert.strictEqual(res.flagged, tc.expectFlagged, `Expected flagged=${tc.expectFlagged} but got ${res.flagged}`);
  assert.ok(res.composite >= tc.minScore && res.composite <= tc.maxScore, `Score ${res.composite} out of [${tc.minScore}, ${tc.maxScore}]`);
  assert.strictEqual(res.levelStatus, tc.expectLevelStatus, `Expected levelStatus ${tc.expectLevelStatus} but got ${res.levelStatus}`);
}
console.log('✅ ALL 6 WORKED SCENARIOS & HARD-FLAG OVERRIDES PASSED!');
