// USB bridge: reads `DATA {json}` lines that the ESP32 prints over serial and feeds them into the
// same scoring pipeline as Wi-Fi POSTs. Other serial output is echoed for debugging.
const { SerialPort, ReadlineParser } = require('serialport');
const { ingestReading } = require('./ingest');
const { addEvent } = require('./store');

const BAUD = 115200;
const RETRY_MS = 3000;
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

function handleLine(line) {
  const trimmed = line.trim();
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
  let waitingLogged = false;

  const retry = (message) => {
    if (!waitingLogged) console.log(message);
    waitingLogged = true;
    setTimeout(connect, RETRY_MS);
  };

  async function connect() {
    const path = requestedPath || (await findPort().catch(() => null));
    if (!path) return retry('[usb] No ESP32 found — plug it in; retrying every few seconds...');

    const port = new SerialPort({ path, baudRate: BAUD, autoOpen: false });
    port.open((err) => {
      if (err) return retry(`[usb] Could not open ${path}: ${err.message} — retrying every few seconds...`);
      waitingLogged = false;
      Object.assign(status, { connected: true, path });
      console.log(`[usb] Connected to ${path} at ${BAUD} baud`);
      addEvent('live', 'neutral', `USB connected (${path})`);

      port.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', handleLine);
      port.on('error', (e) => console.log(`[usb] ${e.message}`));
      port.on('close', () => {
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
