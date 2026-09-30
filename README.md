# Tank Health Index

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32-red.svg)](https://www.espressif.com/en/products/socs/esp32)

An intelligent, end-to-end drinking water storage tank monitoring and safety system:
**ESP32 multi-sensor telemetry → Node/Express scoring backend (WHO/EPA/BIS thresholds) → React real-time reactive dashboard.**

---

## 📺 Demonstration & Walkthrough Videos

### Live Telemetry Dashboard Preview
![Tank Health Index Live Dashboard Preview](demo_preview.gif)

### Video Guides
- 🎥 **[Watch Full System Walkthrough Video (`walkthrough_guide.mp4`)](walkthrough_guide.mp4)**: Complete step-by-step tour covering the project architecture, sensor wiring pinouts, environment setup, and dashboard interaction.
- 🚀 **[Watch End-to-End Pipeline Demo Video (`demo_pipeline.mp4`)](demo_pipeline.mp4)**: High-resolution live capture demonstrating real-time sensor ingestion, water drawdown, critical TDS surge (**RED ALERT**), turbidity silt ingress, and filtration recovery.

---

## ⚡ Recent Enhancements & What's New

1. **ESP32 Hardware Simulator (`simulate_esp32.js`)**:
   - Zero-hardware mode: simulates realistic sensor telemetry with calibrated ADC curves, temperature compensation, jitter noise, and 5 distinct water quality scenarios (Pristine baseline → Drawdown → Unsafe TDS mineral surge → Turbidity drop → Clean refill).
2. **Automated E2E Testing & Video Capture Suite (`record_pipeline_demo.js`, `record_walkthrough.js`)**:
   - Headless browser automation powered by Playwright and FFmpeg transcoding, providing reproducible test validation and crisp demo recordings.
3. **Interactive PDF Report Action**:
   - Enhanced `Dashboard.tsx` with user feedback and status notification toast when triggering the water quality audit report.
4. **Beginner-Friendly Hardware & Connection Guide**:
   - Added complete step-by-step guide for wiring sensors, discovering serial ports, and flashing firmware.

---

## 🏗 Architecture

```
[ Clarity, TDS, Temperature, Level sensors ]
                  │
            ESP32 (firmware/)
   - reads raw signals, averages/smooths
   - converts to real units (calibration)
   - POSTs JSON over WiFi every 5s
                  │
                  ▼
        Backend (backend/) — Express
   - validates payload
   - scores each parameter against
     WHO/EPA/BIS thresholds (docs/thresholds.md)
   - hard-flags clarity/TDS if unsafe
   - computes weighted composite score
   - stores latest + history in memory
                  │
                  ▼
        Frontend (frontend/) — React + Vite + Tailwind
   - polls backend every 2s
   - shows 4 sensor cards, terminal-style
     compute visualization, score circle
   - "Generate PDF report" action
```

---

## 📁 Repository Layout

```
SWT_healthIndex/
├── firmware/
│   └── tank_sensor/
│       └── SWT_healthIndex.ino      # ESP32 sketch — WiFi credentials, pinout, calibration
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js                # Express server entry point
│       ├── config/thresholds.js     # WHO/EPA/BIS-based scoring thresholds
│       ├── routes/readings.js       # Ingestion & score routes
│       ├── controllers/readingsController.js
│       └── services/
│           ├── scoring.js           # Normalization, composite scoring & hard flags
│           └── store.js             # In-memory history ring buffer
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/tankApi.ts           # Fetch API client
│       ├── hooks/useLiveScore.ts    # Polling hook
│       ├── components/
│       │   ├── SensorCard.tsx       # Dynamic badge card (green / red alert)
│       │   ├── TerminalBlock.tsx    # Animated computation terminal
│       │   └── ScoreCircle.tsx      # SVG radial gauge
│       └── pages/Dashboard.tsx
├── docs/
│   ├── data-contract.md             # Ingestion schema & hardware notes
│   ├── thresholds.md                # Water quality threshold standards
│   └── hardware-test-form.md        # Hardware team validation protocol
├── simulate_esp32.js                # Built-in ESP32 hardware simulator
├── record_pipeline_demo.js          # Playwright pipeline tester & demo recorder
├── record_walkthrough.js            # Walkthrough recorder
├── demo_pipeline.mp4                # Captured demo video (MP4)
├── walkthrough_guide.mp4            # Captured walkthrough video (MP4)
└── demo_preview.gif                 # Animated dashboard preview GIF
```

---

## 🚀 Quick Start (Running Backend & Frontend)

### 1. Backend Service
```bash
cd backend
npm install
cp .env.example .env
npm run start        # Runs on http://localhost:3001
```

### 2. Frontend Dashboard
```bash
cd frontend
npm install
cp .env.example .env
npm run dev          # Runs on http://localhost:5173
```

### 3. Test Immediately (Without Physical Hardware)
If you do not have physical sensors or an ESP32 connected yet, run the built-in simulator from the root directory:
```bash
node simulate_esp32.js
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser to see the live dashboard updating in real time!

---

## 🔌 Beginner's Step-by-Step Guide: Connecting Your ESP32

This walkthrough guides you from a fresh clone to flashing your ESP32 board and viewing live data from your water tank.

### Prerequisites

1. **Hardware Requirements**:
   - 1× ESP32 Development Board (NodeMCU ESP32, ESP32-WROOM-32, etc.)
   - 1× Micro-USB or USB-C cable (**Must support data transfer**, not just charging)
   - 1× Analog TDS Sensor (e.g. DFRobot Gravity TDS)
   - 1× Optical Turbidity Sensor
   - 1× DS18B20 Waterproof Temperature Sensor + 4.7kΩ resistor
   - 1× HC-SR04 Ultrasonic Distance Sensor + 1kΩ & 2kΩ resistors (for 3.3V logic level shifting)
   - Jumper wires & breadboard
2. **Software Requirements**:
   - [Arduino IDE 2.x](https://www.arduino.cc/en/software)
   - [Node.js v18+](https://nodejs.org/) and `git`
   - USB-to-UART driver for your ESP32 board:
     * [Silicon Labs CP210x Driver](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) OR
     * [WCH CH340 Driver](http://www.wch-ic.com/downloads/CH341SER_ZIP.html)

---

### Step 1: Clone the Repository
Open your terminal (macOS/Linux) or Command Prompt / PowerShell (Windows):
```bash
git clone https://github.com/SundarReguraman/SWT_healthIndex.git
cd SWT_healthIndex
```

---

### Step 2: Sensor Wiring to the ESP32

Connect your sensors to the ESP32 following this pin configuration:

| Sensor | ESP32 Pin | Wiring Details |
| :--- | :--- | :--- |
| **TDS Sensor** | **GPIO 35** (ADC1) | `VCC` → 3.3V or 5V, `GND` → GND, `Signal` → GPIO 35 |
| **Turbidity Sensor** | **GPIO 34** (ADC1) | `VCC` → 5V, `GND` → GND, `Analog Out` → GPIO 34 |
| **DS18B20 Temp** | **GPIO 4** (OneWire) | `VCC` → 3.3V, `GND` → GND, `Data` → GPIO 4<br>*(Place 4.7kΩ resistor between Data and 3.3V)* |
| **HC-SR04 Ultrasonic** | **Trig: GPIO 5**<br>**Echo: GPIO 18** | `VCC` → 5V, `GND` → GND, `Trig` → GPIO 5<br>`Echo` → Voltage divider (1kΩ/2kΩ) → GPIO 18 |

> ⚠️ **Important Safety Note**: The ESP32 GPIO pins operate at **3.3V logic**. The HC-SR04 `Echo` pin outputs 5V. Use a simple voltage divider (1kΩ in series from Echo to GPIO 18, and 2kΩ from GPIO 18 to GND) to protect your ESP32. Ensure all components share a **common ground (GND)**.

---

### Step 3: Connect ESP32 to Your Laptop

1. Plug your ESP32 into your laptop using the data USB cable.
2. Verify the serial port is detected:
   - **Windows**: Open *Device Manager* → *Ports (COM & LPT)*. You should see `Silicon Labs CP210x (COMx)` or `USB-SERIAL CH340 (COMx)`.
   - **macOS**: Run in Terminal: `ls /dev/cu.usb*` or `ls /dev/cu.wch*`. You will see e.g. `/dev/cu.usbserial-0001`.
   - **Linux**: Run `ls /dev/ttyUSB*` or `dmesg | grep tty`.

---

### Step 4: Configure the Arduino IDE

1. Open **Arduino IDE**.
2. Go to **Settings / Preferences** and paste this into *Additional Boards Manager URLs*:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
4. Install required libraries via **Sketch → Include Library → Manage Libraries**:
   - `DallasTemperature` by Miles Burton
   - `OneWire` by Paul Stoffregen

---

### Step 5: Configure and Flash the Firmware

1. In Arduino IDE, open:
   `firmware/tank_sensor/SWT_healthIndex.ino`
2. Find your laptop's local LAN IP address:
   - **Windows**: run `ipconfig` (look for *IPv4 Address*, e.g., `192.168.1.45`)
   - **macOS**: run `ipconfig getifaddr en0` or check *System Settings → Wi-Fi → Details*
   - **Linux**: run `hostname -I`
3. Update lines 6–8 in `SWT_healthIndex.ino`:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";             // Replace with your 2.4 GHz Wi-Fi network name
   const char* password = "YOUR_WIFI_PASSWORD";     // Replace with your Wi-Fi password
   const char* serverUrl = "http://192.168.1.45:3001/api/readings"; // Use your laptop's LAN IP
   ```
4. Under **Tools**:
   - **Board**: Select *ESP32 Dev Module*
   - **Port**: Select your discovered COM / USB serial port
   - **Upload Speed**: `921600` or `115200`
5. Click the **Upload (→)** button.
   *(Note: If the upload says "Connecting........_____", press and hold the **BOOT** button on the ESP32 until the flashing progress bar begins).*

---

### Step 6: Verify Communications

1. In Arduino IDE, open **Tools → Serial Monitor** and set the baud rate to **115200**.
2. You will see:
   ```
   .....
   WiFi connected
   ---- Sensor Readings ----
   TDS: 185.40 ppm
   Clarity: 94.20 %
   Temperature: 22.80 °C
   Water Level: 84.50 %
   POST response: 200
   {"deviceId":"tank-1","clarity":94.20,"tds":185.40,"temperature":22.80,"level":84.50}
   --------------------------
   ```
3. Now look at your browser tab at **http://localhost:5173**:
   - The sensor cards will update in real time.
   - The animated terminal block will show the calculation trace.
   - The radial gauge will reflect the live Tank Health Index score!

---

## 📊 Water Quality Scoring Standards

Scores are normalized against drinking water standards from **WHO**, **US EPA**, and **BIS IS 10500**:

| Parameter | Unit | Ideal Range | Acceptable Limit | Unsafe Threshold (Hard Flag) | Weight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Clarity** | `%` | 70% – 100% | 20% – 69% | `< 20%` (**CRITICAL**) | **35%** |
| **TDS** | `ppm` | 150 – 250 ppm | Up to 500 ppm | `≥ 1000 ppm` (**CRITICAL**) | **35%** |
| **Temperature** | `°C` | 15.0°C – 25.0°C | Up to 45.0°C | Soft contributor (no hard flag) | **15%** |
| **Level** | `%` | Tank capacity | 0% – 100% | Operational capacity metric | **15%** |

### Hard-Flag Rule
If dissolved solids exceed **1000 ppm TDS** or optical clarity falls below **20%**, the backend sets `flagged: true`. The frontend immediately displays an **Unsafe** badge on the affected sensor card and switches the central gauge to **Crimson Red**, advising against water consumption regardless of other metrics.

---

## 🧪 Automated Testing & Recording

To re-run the automated Playwright simulation and regenerate the demo video:
```bash
node record_pipeline_demo.js     # Generates demo_pipeline.mp4
node record_walkthrough.js       # Generates walkthrough_guide.mp4 and demo_preview.gif
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
