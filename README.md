# Tank Health Index

Smart drinking-water tank monitoring system: ESP32 sensors -> Node/Express backend ->
React dashboard, producing a 0-100 health score and a Smart Health Index PDF report.

## Architecture

```
[ Turbidity, TDS, Temperature, Level sensors ]
                  |
            ESP32 (firmware/)
   - reads raw signals, averages/smooths
   - converts to real units (calibration)
   - POSTs JSON over WiFi every 5s
                  |
                  v
        Backend (backend/) — Express
   - validates payload
   - scores each parameter against
     WHO/EPA/BIS thresholds (docs/thresholds.md)
   - hard-flags turbidity/TDS if unsafe
   - computes weighted composite score
   - stores latest + history in memory
                  |
                  v
        Frontend (frontend/) — React + Vite + Tailwind
   - polls backend every 2s
   - shows 4 sensor cards, terminal-style
     compute visualization, score circle
   - "Generate PDF report" action
```

## Repo layout

```
tank-health-index/
├── firmware/
│   └── tank_sensor/
│       └── tank_sensor.ino      # ESP32 sketch — fill in WiFi creds, pins, calibration
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js            # Express app entry
│       ├── config/thresholds.js # WHO/EPA/BIS-based scoring thresholds
│       ├── routes/readings.js
│       ├── controllers/readingsController.js
│       └── services/
│           ├── scoring.js       # normalization + composite score + hard-flag logic
│           └── store.js         # in-memory latest/history (swap for a DB later)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/tankApi.ts       # fetch wrapper for backend
│       ├── hooks/useLiveScore.ts
│       ├── components/
│       │   ├── SensorCard.tsx
│       │   ├── TerminalBlock.tsx
│       │   └── ScoreCircle.tsx
│       └── pages/Dashboard.tsx
└── docs/
    ├── data-contract.md         # payload shape + what to confirm with hardware team
    └── thresholds.md            # WHO/EPA/BIS reference table
```

## Running it

```bash
# backend
cd backend
npm install
cp .env.example .env
npm run start        # -> http://localhost:3001

# frontend
cd frontend
npm install
cp .env.example .env
npm run dev           # -> http://localhost:5173
```

Flash `firmware/tank_sensor/tank_sensor.ino` to the ESP32 after setting WiFi credentials,
your backend machine's LAN IP, real sensor pins, and calibration formulas.

## Hardware team test procedure

The hardware team should complete the test form at
[`docs/hardware-test-form.md`](docs/hardware-test-form.md) for each hardware revision or
test run. No separate form existed before this file was added; this is now the shared
record for wiring, calibration, communication, and end-to-end results.

### 1. Bench-test the sensors

- Confirm the ESP32 supply voltage, sensor supply voltages, common ground, and logic-level
  compatibility before powering the setup.
- Confirm the wiring matches the pins in `firmware/tank_sensor/tank_sensor.ino`.
- Test turbidity with clean and cloudy water.
- Test TDS with low-mineral and mineralized water.
- Compare temperature with a reference thermometer.
- Check level at an empty, half-full, and full tank. Record the tank height in centimeters.

### 2. Calibrate and test faults

- Replace the placeholder sensor conversion formulas with formulas for the actual sensor
  models.
- Verify the readings are stable after averaging.
- Disconnect each sensor in turn and confirm the resulting value is detectable as a fault.
- Test out-of-range values and confirm they are not treated as trustworthy measurements.

### 3. Test Wi-Fi and the API

- Put the ESP32 and the computer running the backend on the same Wi-Fi network.
- Set `serverUrl` to the computer's LAN IP, not `localhost`:
  `http://<backend-computer-LAN-IP>:3001/api/readings`.
- Open the ESP32 serial monitor at `115200` baud.
- Confirm it prints `WiFi connected`, then `POST response: 200` about every five seconds.
- Confirm the JSON contains numeric `turbidity`, `tds`, `temperature`, and `level` fields and
  a `deviceId`, as specified in [`docs/data-contract.md`](docs/data-contract.md).

### 4. Run the end-to-end check

- Change a known input, such as the tank level or water sample, and confirm the ESP32 value
  changes.
- Confirm the backend receives the reading at `GET /api/score/latest` and stores it in
  `GET /api/readings/history`.
- Confirm the dashboard displays the updated values and score.
- Test unsafe turbidity and TDS conditions and confirm the dashboard/API reports the hard
  flag.

### Firmware contribution and repository location

The firmware source is locked into this repository at
[`firmware/tank_sensor/tank_sensor.ino`](firmware/tank_sensor/tank_sensor.ino). Hardware
team members should make firmware and calibration changes there, commit them to a branch,
and push that branch for review. Every firmware change should include an updated
[`docs/hardware-test-form.md`](docs/hardware-test-form.md), serial-log or photo evidence
where useful, and the hardware revision it was tested against. Do not commit Wi-Fi
passwords or other secrets; keep local credentials in the sketch while testing.

## Not yet built

- PDF report generation endpoint (mentioned in Dashboard.tsx button, not wired up)
- Persistent storage (currently in-memory, resets on backend restart)
- Auth on the ingestion endpoint
- Multi-tank support beyond the reserved `deviceId` field
