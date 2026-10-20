# Data contract — ESP32 to backend

## Reading payload

The same JSON object is sent two ways:

- **USB serial** (default, `USE_WIFI = false`): one line `DATA {json}` at 115200 baud, read by the backend's USB bridge (`npm run usb`).
- **Wi-Fi**: `POST /api/readings` with `Content-Type: application/json`.

```json
{
  "deviceId": "tank-1",
  "seq": 128,
  "clarity": 92.0,
  "tds": 340,
  "temperature": 24.6,
  "level": 78
}
```

| Field | Type | Range | Notes |
|---|---|---|---|
| `deviceId` | string | 1–64 of `A–Z a–z 0–9 . - _` | Optional, defaults to `tank-1`. All readings are treated as one tank. |
| `seq` | integer ≥ 0 | | Optional. Counts up from 1 on every boot; shown on the dashboard so serial output can be matched to it. |
| `clarity` | number or `null` | 0–100 % | Scored. `null` → sensor fault, no score. |
| `tds` | number or `null` | 0–5000 ppm | Scored. The firmware sends `null` when the probe reads below the air deadband (out of water). |
| `temperature` | number or `null` | −10–80 °C | Not scored. `null` when the DS18B20 is disconnected or returns its 85 °C power-on value. |
| `level` | number or `null` | 0–100 % | Not scored. `null` when the ultrasonic sensor gets no valid echo. |

A failed sensor is always sent as `null`, never as a cached or default value, so the dashboard never shows made-up numbers.
Readings with a wrong type, a value outside its range, or no sensor values at all are rejected with HTTP 400 and `{ "error": "..." }`, and are not stored.

## Backend API

| Endpoint | Returns |
|---|---|
| `POST /api/readings` | `{ ok, latest }` with the scored reading, or 400. |
| `GET /api/dashboard?minutes=15` | One snapshot: `status`, `latest`, `history` (≤ 120 averaged points), `events`, scoring `config`. Used by the dashboard. |
| `GET /api/status` | Active source (`live` / `demo` / `null`), age of the latest reading, USB bridge state. |
| `GET /api/score/latest` | Latest scored reading of the active source, or 404. |
| `GET /api/readings/history?minutes=60` | History points only. |

Live and demo readings are stored separately. The dashboard shows live data whenever a device has posted in the last
2 minutes, demo data (if `--demo` is on) otherwise. Data is kept in memory for 24 hours and is lost on restart.

## Still to confirm with the hardware team

For each sensor: model, calibration formula (raw ADC → unit), valid operating range, and fault behaviour.
Before deploying beyond a local demo, add an API key header to `POST /api/readings`.
