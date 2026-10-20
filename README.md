# Tank Health Index

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32-red.svg)](https://www.espressif.com/en/products/socs/esp32)

End-to-end drinking-water storage tank monitor:
**ESP32 sensors → Node/Express scoring backend (BIS / WHO / EPA thresholds) → React live dashboard.**

---

## How it works

```
[ Turbidity · TDS · DS18B20 temperature · ultrasonic level ]
                         │
                ESP32 (firmware/)
   - median-filters the ADC, converts to units
   - TDS is temperature-compensated
   - a failed sensor is sent as null, never a made-up value
   - every reading carries a sequence number (seq)
                         │  USB serial "DATA {json}"  (default)
                         │  or Wi-Fi POST /api/readings
                         ▼
               Backend (backend/) — Express
   - validates type and plausible range, rejects bad readings
   - scores clarity + TDS (temperature and level are tracked, not scored)
   - hard flags, zone, causes, level status
   - keeps live and demo readings in separate streams (24 h in memory)
   - builds events (zone changes, unsafe readings, sensor dropouts, USB connect)
                         │  GET /api/dashboard every 2 s
                         ▼
          Frontend (frontend/) — React + Vite + Tailwind
   - status, score and how it is made up
   - tank level with fill / drain rate
   - clarity and TDS on their threshold scales, temperature for reference
   - score history (15 min / 1 h / 24 h) and recent events
   - shows Live / Demo / Sensor offline / Server unreachable explicitly
```

### Scoring

`score = clarity sub-score × 0.55 + TDS sub-score × 0.45`

| Parameter | Ideal | Acceptable | Poor | Unsafe (hard flag) |
|---|---|---|---|---|
| Clarity (% of clean-water reading) | ≥ 97 % | 95–96.9 % | 93–94.9 % | < 93 % |
| TDS | 50–300 ppm | 301–500 ppm | 501–999 ppm | ≥ 1000 ppm |

- Clarity has three slabs: **≥ 97 % safe**, **93–96.9 % needs attention**, **< 93 % unfit**. Any clarity below 97 % means
  turbidity was detected, so it can never average up to *Good*. Why the numbers sit so close to 100 %: [docs/thresholds.md](docs/thresholds.md).
- An unsafe reading caps the score at **39** (*Clean now*); a poor one caps it at **74** (*Needs attention*).
- Zones: **75–100 Good**, **45–74 Needs attention**, **0–44 Clean now**.
- Missing clarity or TDS → **Sensor fault**, no score.
- **Temperature is not scored** (field feedback showed it added no value); the ESP32 still uses it to correct TDS.
- **Level is not scored**; it has its own status (refill soon < 40 %, low < 25 %, critical < 15 %).

Details and sources: [docs/thresholds.md](docs/thresholds.md). Payload and API: [docs/data-contract.md](docs/data-contract.md).

---

## Repository layout

```
SWT_healthIndex/
├── firmware/tank_sensor/SWT_healthIndex.ino   # ESP32 sketch — pins, calibration, USB/Wi-Fi output
├── backend/
│   ├── src/
│   │   ├── server.js                         # Express entry; --demo and --usb flags
│   │   ├── config/thresholds.js              # all thresholds, weights, zones, valid ranges
│   │   ├── routes/readings.js, controllers/readingsController.js
│   │   └── services/
│   │       ├── ingest.js                     # validation shared by USB and Wi-Fi
│   │       ├── scoring.js                    # sub-scores, caps, zones, causes
│   │       ├── store.js                      # live/demo streams, history, events
│   │       ├── serialBridge.js               # USB "DATA" line reader
│   │       └── demo.js                       # clock-driven demo feed
│   ├── scripts/simulate.js                   # ESP32 simulator over HTTP
│   └── test/                                 # node:test suites (npm test)
├── frontend/src/
│   ├── pages/Dashboard.tsx
│   ├── components/                           # StatusPanel, TankPanel, MetricTile, HistoryChart, EventsPanel…
│   ├── hooks/useDashboard.ts                 # polls /api/dashboard
│   └── lib/status.ts                         # tones, labels, threshold scales
└── docs/                                     # thresholds, data contract, hardware test form
```

---

## Quick start

Requires Node.js 18+.

```bash
# Terminal 1 — backend
cd backend
npm install
npm start                 # http://localhost:3001 (add --demo / --usb, see below)

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env      # VITE_BACKEND_URL=http://localhost:3001
npm run dev               # http://localhost:5173
```

| Backend command | What it does |
|---|---|
| `npm start` | Live only. Dashboard waits for a device. |
| `npm run usb` | Live + reads the ESP32 over USB (auto-detects the port). `node src/server.js --usb=/dev/cu.usbserial-0001` or `--usb=COM5` picks one. |
| `npm run demo` | Demo feed (one reading per minute, last hour backfilled). `--demo=attention` / `--demo=critical` for other states. |
| `node src/server.js --usb --demo` | Demo while the board is unplugged; switches to live within one reading of it posting. **Recommended for presentations.** |
| `npm run usb:rehearse` | A fake ESP32 on a mock serial port, read by the real USB bridge — rehearse the USB demo with no hardware. |
| `npm run simulate` | (separate terminal) Fake ESP32 over HTTP — the Wi-Fi path. |
| `npm test` | Scoring and pipeline tests. |

Demo data is always labelled **Demo data** on the dashboard and is never mixed into live history.

---

## Testing the pipeline

Work through these in order; each step proves one more link of the chain.

### 1. Logic — no hardware

```bash
cd backend && npm test
```
22 tests should pass: sub-scores and band edges, caps, zones, temperature having no effect, sensor faults,
payload validation, the USB line parser on real firmware output, demo/live separation, events and history averaging.

### 2. Backend + dashboard — simulated device

1. `npm start` in `backend/`, `npm run dev` in `frontend/`, open http://localhost:5173.
   The header says **Waiting for the first reading**.
2. In a third terminal: `cd backend && npm run simulate`.
   Each line prints the reading, the score and zone the backend returned, and `ok` or `MISMATCH`:
   ```
   #5 Slight cloudiness      clarity=95.6 tds=243 level=62.1 → score 71 SCHEDULE_MAINTENANCE (ok)
   ```
3. On the dashboard check that:
   - the header shows **Live · WIFI** and **Reading #N** matching the simulator's latest `#N`;
   - the zone walks through Good → Needs attention → Clean now → Sensor fault → Good every ~84 s;
   - *Recent events* logs each zone change, unsafe reading and the TDS probe dropping out;
   - the TDS sparkline breaks while the probe is "out of water".
4. Stop the simulator. After ~20 s the header turns to **Sensor offline** and the panels dim.

You can also send single readings by hand:
```bash
curl -X POST localhost:3001/api/readings -H 'Content-Type: application/json' \
  -d '{"seq":1,"clarity":45,"tds":300,"temperature":28,"level":50}'      # → Clean now, score 39
curl -X POST localhost:3001/api/readings -H 'Content-Type: application/json' \
  -d '{"clarity":150,"tds":200}'                                         # → 400, out of range
curl localhost:3001/api/status                                            # source, age, USB state
```

### 3. USB rehearsal — no hardware

```bash
cd backend && npm run usb:rehearse
```
A fake ESP32 prints exactly what the firmware prints (boot messages, the reading block, the `DATA` line) into
the real USB bridge every 5 s. The dashboard shows **Live · USB**, a **USB /dev/fake-esp32** chip and the reading
number, and walks through every state, including the turbidity sensor and temperature sensor being unplugged.
This is the same path a real board takes from the bridge onwards.

### 4. Real ESP32 over USB

1. Flash the firmware (see below) with `USE_WIFI = false`.
2. Open the Arduino Serial Monitor at 115200 baud and check the output:
   ```
   ---- Reading #12 ----
   TDS: 412 mV -> 203.50 ppm
   Clarity: Raw=2181 -> 99.00 %
   Temperature: 27.12 C
   Water Level: 64.10 %
   DATA {"deviceId":"tank-1","seq":12,"clarity":99.00,"tds":203.50,"temperature":27.12,"level":64.10}
   ```
   A disconnected sensor prints `FAULT` and is sent as `null`.
3. **Close the Serial Monitor** (only one program can hold the port), then `cd backend && npm run usb`.
   Opening the port resets most ESP32 dev boards, so the reading number starts again at `#1` — that's expected.
   The backend logs `[usb] Connected to /dev/cu.usbserial-…` and one line per reading:
   ```
   [usb] #12 clarity=99% tds=203.5ppm temp=27.12°C level=64.1% → score 91 GOOD
   ```
4. On the dashboard: the header shows **Live · USB**, a **USB /dev/…** chip, and **Reading #N** equal to the
   backend log's `#N`. If they match, the dashboard is in sync with what the sensors are reading.
5. Sync checks with the hardware:
   - Dip the turbidity sensor in cloudy water → clarity drops, score falls, an event appears within ~5 s.
   - Unplug the turbidity sensor → **Sensor fault** (not *Clean now*), *Turbidity sensor stopped responding*.
   - Lift the TDS probe out of the water → **Sensor fault**, *TDS probe stopped responding*.
   - Unplug the DS18B20 → temperature shows **No reading**; the score does not change.
   - Unplug the USB cable → *USB disconnected* event, header turns **Sensor offline**; plug it back in and it reconnects by itself.

### Turbidity calibration (clean → cloudy)

Do this once per setup (and again if the sensor, power or probe position changes). Cover the glass and probe from
room light, and use milk drops for the cloudy sample — cornflour settles within minutes.

1. Put the probe in **clean drinking water** and press the **BOOT** button on the ESP32 (hold it for a second).
2. The board samples for 5 s, then counts down **30 s**: move the probe into **cloudy water** (e.g. 10 drops of milk in a glass) and hold it still.
3. It samples the cloudy water for 5 s and saves both readings to flash; they survive restarts.

Each step shows up under **Recent events** on the dashboard and in the backend log (`[calibration] …`), and readings keep
flowing meanwhile. Afterwards clean water reads 100 % and your cloudy sample reads 90 % (**unfit**), so anything as cloudy
as that sample triggers *Clean now*. If the cloudy sample isn't measurably cloudier than the clean one, the board says so
and keeps the previous setting. Without a calibration, clarity falls back to `raw / TURB_RAW_CLEAR`.
With the Serial Monitor open you can also type `CAL` to start, or `CALRESET` to clear the saved calibration.

### 5. Real ESP32 over Wi-Fi (optional)

USB is the default and recommended for demos: no network jitter, and the cable also powers the board.
For Wi-Fi, set `USE_WIFI = true`, your SSID/password and `serverUrl` (the backend prints `Wi-Fi devices can POST to http://<ip>:3001/api/readings`
on start), flash, and run `npm start`. The header shows **Live · WIFI**. Same checks as step 3.

### 6. Demo for presentations

With the board plugged in: `node src/server.js --usb --demo`. If the cable is knocked out mid-demo, the dashboard
falls back to clearly labelled **Demo data** after 2 minutes, and live readings take over again from the first one
after it is plugged back in. Without a board: `npm run demo` (or `--demo=attention` / `--demo=critical`).

---

## Hardware setup

### Parts

- ESP32 dev board (ESP32-WROOM-32 / NodeMCU-32S) and a **data** USB cable
- Analog TDS sensor (e.g. DFRobot Gravity TDS)
- Analog turbidity sensor
- DS18B20 waterproof temperature sensor + 4.7 kΩ pull-up
- JSN-SR04T (or HC-SR04) ultrasonic sensor + 1 kΩ / 2 kΩ divider on Echo
- USB-UART driver if needed: [CP210x](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) or [CH340](http://www.wch-ic.com/downloads/CH341SER_ZIP.html)

### Wiring

| Sensor | ESP32 pin | Notes |
|---|---|---|
| TDS | GPIO 35 (ADC1) | VCC 3.3 V, GND, signal → GPIO 35 |
| Turbidity | GPIO 34 (ADC1) | VCC 5 V, GND. Analog out → **1 kΩ → GPIO 34**, and **2 kΩ from GPIO 34 to GND**. The output reaches ~4.5 V; never wire it straight to the 3.3 V pin. |
| DS18B20 | GPIO 4 | 4.7 kΩ between data and 3.3 V |
| Ultrasonic | Trig GPIO 5, Echo GPIO 18 | Echo through 1 kΩ, 2 kΩ from GPIO 18 to GND (5 V → 3.3 V) |

All grounds common. Set `TANK_HEIGHT_CM` and `SENSOR_OFFSET_CM` in the sketch for your tank, and calibrate
`TURB_RAW_CLEAR` / `TURB_RAW_CLOUDY` and `TDS_K_FACTOR` against reference samples
(record them in [docs/hardware-test-form.md](docs/hardware-test-form.md)).

### Flashing

1. Arduino IDE 2.x → *Boards Manager* → install **esp32** by Espressif.
   (Board URL if needed: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`)
2. *Library Manager* → install **OneWire** (Paul Stoffregen) and **DallasTemperature** (Miles Burton).
3. Open `firmware/tank_sensor/SWT_healthIndex.ino`. For Wi-Fi, set `USE_WIFI`, `ssid`, `password` and `serverUrl` (lines 7–11).
4. *Tools → Board*: ESP32 Dev Module; *Port*: your board (`/dev/cu.usbserial-…`, `COMx`, `/dev/ttyUSB0`).
5. Upload. If it hangs at `Connecting…`, hold **BOOT** until the upload starts.

---

## Older demo media

`demo_pipeline.mp4`, `walkthrough_guide.mp4`, the two preview GIFs and the `record_*.js` scripts that produced them
show the dashboard **before** the current redesign and scoring change.
