// Central configuration for Tank Health Index benchmarks, weights, zones, and hard-flag rules.
// Grounded in BIS IS 10500:2012, WHO Drinking-Water Guidelines, and US EPA Secondary Standards.

module.exports = {
  clarity: {
    unit: '%',
    idealMin: 90,        // >= 90% (~ <= 1 NTU BIS acceptable) -> Sub-score 80-100
    acceptableMin: 75,   // 75-89% (~ 1-5 NTU BIS permissible) -> Sub-score 50-79
    poorMin: 60,         // 60-74% (~ 5-10 NTU)                -> Sub-score 20-49
    unsafeMin: 60,       // < 60% (> 10 NTU visible sludge)    -> Hard Flag (IMMEDIATE_CLEANING)
  },
  turbidity: {
    unit: 'NTU',
    idealMax: 1,
    acceptableMax: 5,
    poorMax: 10,
    unsafeMax: 10,
  },
  tds: {
    unit: 'ppm',
    idealMin: 50,        // 50-300 ppm (WHO Excellent palatability) -> Sub-score 80-100
    idealMax: 300,
    acceptableMax: 500,  // 301-500 ppm (BIS/EPA acceptable ceiling) -> Sub-score 50-79
    poorMax: 1000,       // 501-1000 ppm (elevated hardness/salts)   -> Sub-score 20-49
    unsafeMax: 1000,     // >= 1000 ppm (WHO unacceptable)           -> Hard Flag (IMMEDIATE_CLEANING)
  },
  temperature: {
    unit: 'C',
    idealMin: 15,
    idealMax: 25,
    acceptableMax: 33,   // Up to 33.0 C allowed for warm Indian ambient tanks -> Sub-score 50-84
    poorMax: 38,         // 33.1-38.0 C thermal stagnation                     -> Sub-score 20-49
    unsafeMax: 38,       // > 38.0 C acute microbial/biofilm risk              -> Hard Flag
  },
  compoundRisk: {
    clarityMax: 70,      // Warm + compound biofilm trigger: clarity < 70% AND temp > 33.5 C
    temperatureMin: 33.5,
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
    clarity: 0.45,       // Primary physical hygiene indicator (sludge, silt, biofilm)
    tds: 0.35,           // Dissolved minerals / salinity intrusion
    temperature: 0.20,   // Biological catalyst & chlorine decay factor
    level: 0.0,          // Operational metric — tracked separately via levelStatus/levelAlert
  },
};
