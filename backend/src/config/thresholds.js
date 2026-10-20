// Central configuration for Tank Health Index benchmarks, weights, zones, and hard-flag rules.
// Grounded in BIS IS 10500:2012, WHO Drinking-Water Guidelines, and US EPA Secondary Standards.
// Temperature is recorded (the firmware uses it for TDS compensation) but is not part of the score.

module.exports = {
  clarity: {
    unit: '%',
    idealMin: 90,        // >= 90% (~ <= 1 NTU BIS acceptable) -> Sub-score 80-100
    acceptableMin: 75,   // 75-89% (~ 1-5 NTU BIS permissible) -> Sub-score 50-79
    unsafeMin: 60,       // 60-74% (~ 5-10 NTU) -> Sub-score 20-49; < 60% (visible sludge) -> Hard Flag
  },
  tds: {
    unit: 'ppm',
    idealMin: 50,        // 50-300 ppm (WHO Excellent palatability) -> Sub-score 80-100
    idealMax: 300,
    acceptableMax: 500,  // 301-500 ppm (BIS/EPA acceptable ceiling) -> Sub-score 50-79
    unsafeMax: 1000,     // 501-999 ppm -> Sub-score 20-49; >= 1000 ppm (WHO unacceptable) -> Hard Flag
  },
  level: {
    unit: '%',
    normalMin: 40,
    refillMin: 25,
    lowMin: 15,          // < 15% critical low (suction near bottom sediment layer)
  },
  zones: {
    goodMin: 75,         // 75-100: GOOD
    maintenanceMin: 45,  // 45-74:  SCHEDULE_MAINTENANCE (0-44: IMMEDIATE_CLEANING)
    hardFlagCap: 39,     // Maximum composite score when any critical hard-flag is active
    poorParamCap: 74,    // Maximum composite score when any quality parameter is in Poor band (<50)
  },
  weights: {
    clarity: 0.55,       // Primary physical hygiene indicator (sludge, silt, biofilm)
    tds: 0.45,           // Dissolved minerals / salinity intrusion
  },
  // Plausible sensor ranges; readings outside them are rejected as faulty rather than scored.
  validRange: {
    clarity: [0, 100],
    tds: [0, 5000],
    temperature: [-10, 80],
    level: [0, 100],
  },
};
