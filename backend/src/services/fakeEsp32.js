// A stand-in ESP32 for rehearsing without hardware. It prints exactly what the firmware prints over
// serial (boot noise, the human-readable block and the DATA line), cycling through scenarios that
// exercise every dashboard state. Used by `npm run usb:rehearse` and by the HTTP simulator.

// `expect` is the zone the backend should return for the scenario.
const SCENARIOS = [
  { name: 'Clean water', expect: 'GOOD', clarity: 95, tds: 185, temperature: 24, level: 88 },
  { name: 'Early silt build-up', expect: 'SCHEDULE_MAINTENANCE', clarity: 70, tds: 240, temperature: 27, level: 62 },
  { name: 'Hard borewell water', expect: 'SCHEDULE_MAINTENANCE', clarity: 93, tds: 760, temperature: 27, level: 45 },
  { name: 'Unsafe TDS intrusion', expect: 'IMMEDIATE_CLEANING', clarity: 90, tds: 1150, temperature: 28, level: 30 },
  { name: 'Sludge stirred up (unsafe clarity)', expect: 'IMMEDIATE_CLEANING', clarity: 45, tds: 300, temperature: 28, level: 18 },
  { name: 'TDS probe out of water', expect: 'SENSOR_FAULT', clarity: 92, tds: null, temperature: 26, level: 12 },
  { name: 'Turbidity sensor unplugged', expect: 'SENSOR_FAULT', clarity: null, tds: 210, temperature: 26, level: 40 },
  { name: 'Temperature sensor unplugged', expect: 'GOOD', clarity: 94, tds: 200, temperature: null, level: 70 },
  { name: 'Cleaned and refilled', expect: 'GOOD', clarity: 97, tds: 165, temperature: 23, level: 95 },
];
const READINGS_PER_SCENARIO = 4;

const jitter = (v, range, digits) => {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round((v + (Math.random() - 0.5) * range) * f) / f;
};
const clamp = (v, min, max) => (v === null ? null : Math.min(max, Math.max(min, v)));

// The n-th reading (1-based) of the scenario cycle, shaped like the firmware's payload.
function scenarioReading(seq) {
  const scenario = SCENARIOS[Math.floor((seq - 1) / READINGS_PER_SCENARIO) % SCENARIOS.length];
  return {
    scenario,
    payload: {
      deviceId: 'tank-1',
      seq,
      clarity: clamp(jitter(scenario.clarity, 1.5, 2), 0, 100),
      tds: jitter(scenario.tds, 6, 2),
      temperature: jitter(scenario.temperature, 0.4, 2),
      level: clamp(jitter(scenario.level, 1, 2), 0, 100),
    },
  };
}

// Same text the firmware's loop() prints; failed sensors print FAULT and go out as null.
function firmwareLines(payload) {
  const show = (v, unit) => (v === null ? 'FAULT' : `${v.toFixed(2)}${unit}`);
  const json = JSON.stringify(payload, (k, v) => (typeof v === 'number' && k !== 'seq' ? Number(v.toFixed(2)) : v));
  return [
    `---- Reading #${payload.seq} (3.3V calibrated) ----`,
    `TDS: ${payload.tds === null ? 4 : Math.round(payload.tds * 1.9)} mV -> ${show(payload.tds, ' ppm')}`,
    `Clarity: Raw=${payload.clarity === null ? 0 : Math.round(95 + (payload.clarity / 100) * 705)} -> ${show(payload.clarity, ' %')}`,
    `Temperature: ${show(payload.temperature, ' C')}`,
    `Water Level: ${show(payload.level, ' %')}`,
    `DATA ${json}`,
    '-------------------------------------------',
  ];
}

// Starts printing through `write` (text with \r\n line endings, like Serial.println). Returns a stop function.
function startFakeEsp32(write, intervalMs = 5000) {
  // What an ESP32 prints right after the USB reset, including a partial line, which the bridge must ignore.
  write('ets Jun  8 2016 00:22:57\r\n\r\nrst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\r\nentry 0x400805e4\r\nDATA {"clar');
  write('\r\n');
  let seq = 0;
  const tick = () => {
    seq++;
    write(firmwareLines(scenarioReading(seq).payload).join('\r\n') + '\r\n');
  };
  const first = setTimeout(tick, 1000);
  const timer = setInterval(tick, intervalMs);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}

module.exports = { SCENARIOS, scenarioReading, firmwareLines, startFakeEsp32 };
