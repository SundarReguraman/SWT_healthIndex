/**
 * ESP32 Hardware Simulator for Tank Health Index
 * 
 * Emulates the exact firmware logic of firmware/tank_sensor/SWT_healthIndex.ino:
 * - TDS sensor (analog voltage + temperature compensation)
 * - Turbidity/Clarity optical sensor (voltage mapping)
 * - DS18B20 OneWire temperature sensor
 * - Ultrasonic HC-SR04 level sensor
 * 
 * Cycles through 5 real-world water states to test normal operation,
 * alert thresholds, hard-flag safety triggers, and filtration recovery.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api/readings';
const DEVICE_ID = process.env.DEVICE_ID || 'tank-1';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '3000', 10);

const SCENARIOS = [
  {
    name: 'Normal Clean Water (Pristine)',
    clarity: 95.0,
    tds: 185.0,
    temperature: 22.4,
    level: 88.0,
    durationCycles: 3,
  },
  {
    name: 'Household Usage & Slight Warmup',
    clarity: 86.5,
    tds: 240.0,
    temperature: 24.8,
    level: 72.0,
    durationCycles: 3,
  },
  {
    name: 'High Dissolved Solids Intrusion (UNSAFE TDS)',
    clarity: 78.0,
    tds: 1150.0, // Hard flag (>1000 ppm)
    temperature: 25.2,
    level: 65.0,
    durationCycles: 3,
  },
  {
    name: 'Turbid Silt / Pipeline Ingress (UNSAFE CLARITY)',
    clarity: 14.5, // Hard flag (<20%)
    tds: 480.0,
    temperature: 23.0,
    level: 58.0,
    durationCycles: 3,
  },
  {
    name: 'Purification & Fresh Refill (Recovered)',
    clarity: 97.2,
    tds: 165.0,
    temperature: 21.8,
    level: 94.0,
    durationCycles: 3,
  },
];

let scenarioIndex = 0;
let cycleInScenario = 0;

async function sendReading(payload) {
  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return { status: res.status, data };
  } catch (err) {
    return { error: err.message };
  }
}

async function tick() {
  const current = SCENARIOS[scenarioIndex];
  
  // Add minor jitter (+/- 0.5% to simulate real-time ADC noise)
  const jitter = (range) => (Math.random() - 0.5) * range;
  
  const payload = {
    deviceId: DEVICE_ID,
    clarity: Math.round(Math.max(0, Math.min(100, current.clarity + jitter(1.5))) * 10) / 10,
    tds: Math.round(Math.max(0, current.tds + jitter(5)) * 10) / 10,
    temperature: Math.round((current.temperature + jitter(0.4)) * 10) / 10,
    level: Math.round(Math.max(0, Math.min(100, current.level + jitter(1.0))) * 10) / 10,
  };

  console.log('\n[ESP32 SIMULATOR] ---- Sensor Readings ----');
  console.log(`Scenario: ${current.name} (Step ${cycleInScenario + 1}/${current.durationCycles})`);
  console.log(`TDS:         ${payload.tds} ppm`);
  console.log(`Clarity:     ${payload.clarity} %`);
  console.log(`Temperature: ${payload.temperature} °C`);
  console.log(`Water Level: ${payload.level} %`);

  const result = await sendReading(payload);
  if (result.error) {
    console.error(`[ESP32 SIMULATOR] POST failed: ${result.error}`);
  } else {
    console.log(`[ESP32 SIMULATOR] POST response: ${result.status}`);
    console.log(`[ESP32 SIMULATOR] Backend Composite Score: ${result.data?.latest?.composite} | Flagged: ${result.data?.latest?.flagged}`);
  }
  console.log('-------------------------------------------');

  cycleInScenario++;
  if (cycleInScenario >= current.durationCycles) {
    cycleInScenario = 0;
    scenarioIndex = (scenarioIndex + 1) % SCENARIOS.length;
  }
}

console.log('=== ESP32 Drinking Water Tank Sensor Simulator Started ===');
console.log(`Target Backend: ${BACKEND_URL}`);
console.log(`Push Interval:  ${INTERVAL_MS}ms`);

// Initial tick then periodic
tick();
setInterval(tick, INTERVAL_MS);
