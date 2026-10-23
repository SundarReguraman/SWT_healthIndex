# Drinking water thresholds used for scoring

The live values are in `backend/src/config/thresholds.js`; the dashboard reads them from the backend, so change them there only.

## Turbidity (clarity)

### What the guidelines say

| Body | Turbidity guidance |
|---|---|
| BIS IS 10500:2012 (India) | **1 NTU** acceptable limit; **5 NTU** permissible only when no other source exists. Above 5 NTU the source should be rejected. |
| US EPA (Surface Water Treatment Rules) | Filtered water **≤ 0.3 NTU** in 95 % of monthly samples and **never above 1 NTU**. |
| EU Drinking Water Directive (2020/2184) | Treated water about **0.3 NTU** in 95 % of samples, none above **1 NTU**; at the tap, "acceptable to consumers and no abnormal change". |
| WHO | No health-based limit (turbidity is an indicator, not a toxin). Below **1 NTU**, ideally 0.1 NTU, for effective disinfection; around **5 NTU** turbidity becomes visible. |

So every agency agrees: **≤ 1 NTU is safe, 1–5 NTU is tolerable only as an exception, above 5 NTU is unfit.**

### What our sensor can measure

The module is a low-cost optical sensor (SEN0189 type). It reports how much light gets through the water, not NTU.
On the manufacturer's own calibration curve, the whole 0–5 NTU range is a change of about **1–2 mV**, smaller than the
ESP32's analog noise, while a drop of just **a few percent** in light already means **hundreds of NTU**.
It cannot tell 1 NTU from 5 NTU; nothing in this price range can. What it can do reliably is tell
"as clear as clean drinking water" from "measurably cloudier".

### Our three slabs

Clarity is the sensor reading as a % of the same sensor in clean drinking water (firmware `TURB_RAW_CLEAR`, one
reading in clean water; 2203 on the current board). No cloudy-water calibration is needed.

| Slab | Clarity | Meaning | Dashboard |
|---|---|---|---|
| **Safe** | ≥ 97 % | No turbidity detectable — consistent with ≤ 1 NTU | *Good* |
| **Needs attention** | 93 – 96.9 % | A small drop, close to sensor noise and drift. Recheck; plan a clean if it persists. | *Needs attention*, score ≤ 74 |
| **Unfit** | < 93 % | A clear drop: far above the 5 NTU limit | *Clean now*, score ≤ 39 |

The 3 % margin below 100 % is several times the ESP32's median-filtered noise (about ±0.5 % at this signal level),
so clean water doesn't trip false warnings. Because any reliable drop is already well over 5 NTU, the unfit line
is kept close (7 %) rather than waiting for water that is obviously dirty. For a certified ≤ 1 NTU result, use a
laboratory turbidimeter; this system is an early-warning monitor.

## TDS

| Ideal (sub-score 80–100) | Acceptable (50–79) | Poor (20–49) | Unsafe — hard flag (0–19) |
|---|---|---|---|
| 50–300 ppm (WHO excellent) | 301–500 ppm (BIS/EPA acceptable) | 501–999 ppm | ≥ 1000 ppm (WHO unacceptable) |

TDS below 50 ppm (RO or rain water) is safe but flat-tasting; it scores 70–100 rather than failing.

## Composite score and zones

`score = clarity sub-score × 0.55 + TDS sub-score × 0.45`, then:

- **Hard flag**: unfit clarity or unsafe TDS caps the score at **39** and sets the zone to *Clean now*.
- **Attention cap**: clarity below the safe slab, or TDS in its Poor band, caps the score at **74**, so it can't be averaged into *Good*.
- **Zones**: 75–100 *Good* · 45–74 *Needs attention* · 0–44 *Clean now*.
- **Sensor fault**: if clarity or TDS is missing (the device sent `null`), no score is computed and the zone is *Sensor fault*.

## Tracked but not scored

| Parameter | Why it is not scored | What it is used for |
|---|---|---|
| Temperature (°C) | Field feedback showed it added no useful signal about tank hygiene. | The ESP32 uses it to temperature-compensate the TDS reading. |
| Level (%) | Tank capacity, not water quality. | Status only: < 40% refill soon, < 25% low, < 15% critical low. |

## Sources

- [BIS IS 10500:2012](https://consumerhelpline.gov.in/public/assets/docs/bis/IS10500-2012.pdf)
- [WHO — Water quality and health: Review of turbidity (2017)](https://covid.comesa.int/publications/i/item/WHO-FWC-WSH-17.01)
- [US EPA turbidity requirements (as summarised by KDHE)](https://www.kdhe.ks.gov/FAQ.aspx?QID=219)
- [EU Directive 2020/2184 treatment-plant turbidity (Hach application note)](https://cdn.hach.com/7FYZVWYB/at/86xmhzxc9vgbvfphc7hkmqmj/DOC0435230835.pdf)
- [DFRobot SEN0189 voltage–turbidity curve](https://dfrobot.com/forum/topic/320759)
