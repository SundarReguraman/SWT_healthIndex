// Central configuration for Tank Health Index benchmarks, weights, zones, and hard-flag rules.
// Grounded in BIS IS 10500:2012, WHO Drinking-Water Guidelines, and US EPA Secondary Standards.
// Temperature is recorded (the firmware uses it for TDS compensation) but is not part of the score.

module.exports = {
  // Clarity = light received by the turbidity sensor as a % of the same sensor in clean drinking water
  // (firmware TURB_RAW_CLEAR). Guideline limits: BIS IS 10500 1 NTU acceptable / 5 NTU permissible;
  // US EPA and EU treated water <= 0.3 NTU (95% of samples), never > 1 NTU; WHO: < 1 NTU for effective
  // disinfection, ~5 NTU visible. A low-cost optical sensor cannot resolve 1-5 NTU: on the manufacturer's
  // SEN0189 curve a drop of a few % below clean water is already hundreds of NTU. So the safe slab is "no
  // turbidity detectable", unfit is any clear drop, and the narrow band between absorbs sensor noise and
  // drift so it asks for a recheck instead of raising a false "unfit".
  clarity: {
    unit: '%',
    idealMin: 97,        // >= 97%: SAFE — indistinguishable from clean water        -> Sub-score 80-100
    acceptableMin: 95,   // 95-96.9%: NEEDS ATTENTION (slight drop)                 -> Sub-score 50-79
    unsafeMin: 93,       // 93-94.9%: NEEDS ATTENTION (drop beyond noise)           -> Sub-score 20-49
                         // < 93%: UNFIT — clearly turbid, far above 5 NTU          -> Hard Flag
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
