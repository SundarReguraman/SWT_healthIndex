// USB bridge: reads `DATA {json}` lines that the ESP32 prints over serial and feeds them into the
// same scoring pipeline as Wi-Fi POSTs. Other serial output is echoed for debugging.
// `--usb=mock` attaches a fake ESP32 to a mock serial port for rehearsing without hardware.
const { SerialPort, SerialPortMock, ReadlineParser } = require('serialport');
const { ingestReading } = require('./ingest');
const { addEvent } = require('./store');
const { startFakeEsp32 } = require('./fakeEsp32');

const BAUD = 115200;
const RETRY_MS = 3000;
const MOCK_PATH = '/dev/fake-esp32';
// USB-UART chips used on ESP32 dev boards: Silicon Labs CP210x, WCH CH340/CH9102, FTDI, Espressif native USB.
const KNOWN_VENDORS = ['10c4', '1a86', '0403', '303a'];

const status = { enabled: false, connected: false, path: null };

async function findPort() {
  const ports = await SerialPort.list();
  const byVendor = ports.find((p) => KNOWN_VENDORS.includes((p.vendorId || '').toLowerCase()));
  if (byVendor) return byVendor.path;
  const byName = ports.find((p) => /usbserial|usbmodem|wchusbserial|SLAB_USBtoUART|ttyUSB|ttyACM/i.test(p.path));
  return byName ? byName.path : null;
}

const CAL_TONES = { info: 'neutral', done: 'good', fail: 'warn' };

function handleLine(line) {
  const trimmed = line.trim();
  // Turbidity calibration progress: "CAL <info|done|fail> <text>", shown as dashboard events.
  const cal = trimmed.match(/^CAL (info|done|fail) (.+)$/);
  if (cal) {
    console.log(`[calibration] ${cal[2]}`);
    addEvent('live', CAL_TONES[cal[1]], cal[2]);
    return;
  }
  if (!trimmed.startsWith('DATA ')) {
    if (trimmed) console.log(`[esp32] ${trimmed}`);
    return;
  }
  let payload;
  try {
    payload = JSON.parse(trimmed.slice(5));
  } catch {
    console.log('[usb] Could not parse line:', trimmed);
    return;
  }
  ingestReading(payload, 'usb');
}

function startSerialBridge(requestedPath) {
  status.enabled = true;
  const mock = requestedPath === 'mock';
  if (mock) {
    SerialPortMock.binding.createPort(MOCK_PATH, { echo: false, record: false });
    console.log('[usb] Rehearsal mode: a fake ESP32 is attached to the USB bridge (no hardware needed)');
  }
  let waitingLogged = false;

  const retry = (message) => {
    if (!waitingLogged) console.log(message);
    waitingLogged = true;
    setTimeout(connect, RETRY_MS);
  };

  async function connect() {
    const path = mock ? MOCK_PATH : requestedPath || (await findPort().catch(() => null));
    if (!path) return retry('[usb] No ESP32 found — plug it in; retrying every few seconds...');

    const Port = mock ? SerialPortMock : SerialPort;
    const port = new Port({ path, baudRate: BAUD, autoOpen: false });
    port.open((err) => {
      if (err) return retry(`[usb] Could not open ${path}: ${err.message} — retrying every few seconds...`);
      waitingLogged = false;
      Object.assign(status, { connected: true, path });
      console.log(`[usb] Connected to ${path} at ${BAUD} baud`);
      addEvent('live', 'neutral', `USB connected (${path})`);

      port.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', handleLine);
      const stopFake = mock ? startFakeEsp32((text) => port.port.emitData(text)) : null;
      port.on('error', (e) => console.log(`[usb] ${e.message}`));
      port.on('close', () => {
        if (stopFake) stopFake();
        status.connected = false;
        console.log('[usb] Disconnected — waiting for the board to come back...');
        addEvent('live', 'warn', `USB disconnected (${path})`);
        setTimeout(connect, RETRY_MS);
      });
    });
  }

  connect();
}

function getSerialStatus() {
  return { ...status };
}

module.exports = { startSerialBridge, handleLine, getSerialStatus };
