// USB bridge: reads `DATA {json}` lines that the ESP32 prints over serial and feeds them into the
// same scoring pipeline as Wi-Fi POSTs. Other serial output is echoed for debugging.
const { SerialPort, ReadlineParser } = require('serialport');
const { ingestReading } = require('./ingest');

const BAUD = 115200;
const RETRY_MS = 3000;
// USB-UART chips used on ESP32 dev boards: Silicon Labs CP210x, WCH CH340/CH9102, FTDI, Espressif native USB.
const KNOWN_VENDORS = ['10c4', '1a86', '0403', '303a'];

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
  try {
    ingestReading(JSON.parse(trimmed.slice(5)), 'usb');
  } catch {
    console.log('[usb] Could not parse line:', trimmed);
  }
}

function startSerialBridge(requestedPath) {
  let waitingLogged = false;

  async function connect() {
    const path = requestedPath || (await findPort());
    if (!path) {
      if (!waitingLogged) console.log('[usb] No ESP32 found — plug it in; retrying every few seconds...');
      waitingLogged = true;
      return setTimeout(connect, RETRY_MS);
    }

    const port = new SerialPort({ path, baudRate: BAUD, autoOpen: false });
    port.open((err) => {
      if (err) {
        if (!waitingLogged) console.log(`[usb] Could not open ${path}: ${err.message} — retrying every few seconds...`);
        waitingLogged = true;
        return setTimeout(connect, RETRY_MS);
      }
      waitingLogged = false;
      console.log(`[usb] Connected to ${path} at ${BAUD} baud`);
    });

    port.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', handleLine);
    port.on('close', () => {
      console.log('[usb] Disconnected — waiting for the board to come back...');
      setTimeout(connect, RETRY_MS);
    });
    port.on('error', (e) => console.log(`[usb] ${e.message}`));
  }

  connect();
}

module.exports = { startSerialBridge, handleLine };
