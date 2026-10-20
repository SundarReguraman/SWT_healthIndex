# Drinking water thresholds used for scoring

Sourced from WHO guidelines, US EPA standards, and BIS IS 10500 (India). The live values are in
`backend/src/config/thresholds.js`; the dashboard reads them from the backend, so change them there only.

## Scored parameters

| Parameter | Ideal (sub-score 80–100) | Acceptable (50–79) | Poor (20–49) | Unsafe — hard flag (0–19) | Weight |
|---|---|---|---|---|---|
| Clarity (%) | ≥ 90 (≈ ≤ 1 NTU, BIS acceptable) | 75–89 (≈ 1–5 NTU, BIS permissible) | 60–74 (≈ 5–10 NTU) | < 60 (visible sludge) | 55% |
| TDS (ppm) | 50–300 (WHO excellent) | 301–500 (BIS/EPA acceptable) | 501–999 | ≥ 1000 (WHO unacceptable) | 45% |

TDS below 50 ppm (RO or rain water) is safe but flat-tasting; it scores 70–100 rather than failing.

## Composite score and zones

`score = clarity sub-score × 0.55 + TDS sub-score × 0.45`, then:

- **Hard flag**: any unsafe parameter caps the score at **39** and sets the zone to *Immediate cleaning*.
- **Poor cap**: any parameter in the Poor band caps the score at **74**, so one poor reading can't be averaged into *Good*.
- **Zones**: 75–100 *Good* · 45–74 *Schedule maintenance* · 0–44 *Immediate cleaning*.
- **Sensor fault**: if clarity or TDS is missing (the device sent `null`), no score is computed and the zone is *Sensor fault*.

## Tracked but not scored

| Parameter | Why it is not scored | What it is used for |
|---|---|---|
| Temperature (°C) | Field feedback showed it added no useful signal about tank hygiene. | The ESP32 uses it to temperature-compensate the TDS reading. |
| Level (%) | Tank capacity, not water quality. | Status only: < 40% refill soon, < 25% low, < 15% critical low. |
