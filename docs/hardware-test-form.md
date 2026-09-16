# Hardware Test Form

Complete this form for each hardware revision or test run. Commit the completed form with the firmware change so the wiring, calibration, and test evidence stay together.

## Test identification

- Test date:
- Team/member:
- Hardware revision:
- ESP32 board and revision:
- Firmware commit or branch:
- Sensor models:
  - Turbidity:
  - TDS:
  - Temperature:
  - Level:

## Wiring and power

- ESP32 supply voltage:
- Sensor supply voltages:
- Common ground confirmed: [ ] Yes [ ] No
- Pin assignments match `firmware/tank_sensor/tank_sensor.ino`: [ ] Yes [ ] No
- Logic-level compatibility confirmed: [ ] Yes [ ] No
- Wiring photo or link:
- Notes:

## Sensor bench tests

Record the reference condition, sensor output, expected result, and pass/fail result.

| Sensor | Reference condition | Measured value | Expected value/range | Pass/fail | Notes |
|---|---|---:|---:|---|---|
| Turbidity | Clean water | | | | |
| Turbidity | Cloudy sample | | | | |
| TDS | Low-mineral sample | | | | |
| TDS | Mineralized sample | | | | |
| Temperature | Reference thermometer | | | | |
| Level | Empty tank | | 0% | | |
| Level | Half-full tank | | About 50% | | |
| Level | Full tank | | About 100% | | |

## Calibration and fault tests

- Calibration formulas updated for the actual sensor models: [ ] Yes [ ] No
- Tank height configured in centimeters:
- Turbidity calibration reference/evidence:
- TDS calibration reference/evidence:
- Temperature calibration reference/evidence:
- Level distance and percentage verified: [ ] Yes [ ] No
- Disconnected sensor produces a detectable fault: [ ] Yes [ ] No
- Out-of-range value is handled safely: [ ] Yes [ ] No
- Readings remain stable after averaging: [ ] Yes [ ] No
- Calibration notes or files:

## Wi-Fi and API test

- ESP32 and backend computer used the same Wi-Fi network: [ ] Yes [ ] No
- Backend URL configured with the computer LAN IP, not `localhost`: [ ] Yes [ ] No
- ESP32 serial output showed `WiFi connected`: [ ] Yes [ ] No
- ESP32 received HTTP status `200`: [ ] Yes [ ] No
- POST interval observed (expected about 5 seconds):
- Example payload or serial-log link:

Expected endpoint:

```text
POST http://<backend-computer-LAN-IP>:3001/api/readings
```

Required JSON fields:

```json
{
  "deviceId": "tank-1",
  "turbidity": 12.4,
  "tds": 340,
  "temperature": 24.6,
  "level": 78
}
```

## End-to-end test

- Backend accepted the reading: [ ] Yes [ ] No
- `GET /api/score/latest` returned the latest reading: [ ] Yes [ ] No
- Dashboard displayed updated sensor values: [ ] Yes [ ] No
- Dashboard score changed when a test input changed: [ ] Yes [ ] No
- Unsafe turbidity/TDS test produced the expected flag: [ ] Yes [ ] No
- Test log or screenshot link:

## Result and sign-off

- Overall result: [ ] Pass [ ] Pass with follow-up [ ] Fail
- Problems found:
- Follow-up owner:
- Follow-up due date:
- Hardware team sign-off:
- Software team sign-off:
