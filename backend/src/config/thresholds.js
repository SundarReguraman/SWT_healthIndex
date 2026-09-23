// Central config for scoring thresholds.
// Turbidity + TDS carry hard safety ceilings from WHO/EPA/BIS guidance.
// Temperature has no universal safety limit, so it stays a soft/weighted contributor.
// Level is operational (tank capacity), not a water-quality parameter.

module.exports = {
  clarity: {
    unsafeMin: 20,
  },
  turbidity: {
    unit: 'NTU',
    idealMax: 1,
    acceptableMax: 5,
    unsafeMax: 5,
  },
  tds: {
    unit: 'ppm',
    idealMin: 150,
    idealMax: 250,
    acceptableMax: 500,
    unsafeMax: 1000,
  },
  temperature: {
    unit: 'C',
    idealMin: 15,
    idealMax: 25,
    acceptableMax: 45,
  },
  weights: {
    clarity: 0.35,
    tds: 0.35,
    temperature: 0.15,
    level: 0.15,
  },
};
