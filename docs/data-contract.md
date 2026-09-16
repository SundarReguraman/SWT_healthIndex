# Data contract — ESP32 to backend

## Payload shape (POST /api/readings)

```json
{
  "deviceId": "tank-1",
  "turbidity": 12.4,
  "tds": 340,
  "temperature": 24.6,
  "level": 78
}
```

## Fields to confirm with the hardware team, per parameter

For turbidity, TDS, temperature, and level:
- Sensor model and raw output type (analog voltage / I2C / UART)
- Calibration formula: raw ADC or pulse timing -> real-world unit
- Valid operating range (sensor's min/max)
- Fault behavior: what value is sent if the sensor disconnects or reads out of range

## System-level

- Transport: HTTP POST (current), MQTT is a future option if push frequency increases
- Push frequency: every 5s (adjust in tank_sensor.ino delay())
- Auth: none yet — add an API key header before deploying beyond a local demo
- Multi-tank: deviceId field reserved for this; backend currently treats all readings as one tank
