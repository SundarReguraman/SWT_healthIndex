# Drinking water thresholds used for scoring

Sourced from WHO guidelines, US EPA standards, and BIS IS 10500 (India).

| Parameter   | WHO                        | US EPA                          | BIS (IS 10500)                  | Used in backend/src/config/thresholds.js |
|-------------|-----------------------------|----------------------------------|----------------------------------|--------------------------------------------|
| Turbidity   | <1 NTU ideal, <5 NTU max    | 1 NTU max (0.3 NTU for 95%)      | 1 NTU acceptable, 5 permissible  | idealMax: 1, unsafeMax: 5 (hard flag)      |
| TDS         | <300 ppm excellent          | 500 ppm secondary standard       | 500 mg/L acceptable, 2000 max    | idealMin: 150, idealMax: 250, unsafeMax: 1000 (hard flag) |
| Temperature | No numeric health limit     | No numeric limit                 | No numeric limit                 | idealMin: 15, idealMax: 25 (soft, no hard flag) |

Turbidity and TDS are hard-flag parameters — crossing unsafeMax sets `flagged: true` in the
API response regardless of the composite score. Temperature has no regulatory ceiling
anywhere, so it only contributes to the weighted composite score. Level is tank capacity,
not water quality, and is scored directly as a percentage.
