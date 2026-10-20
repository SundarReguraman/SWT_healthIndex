const express = require('express');
const cors = require('cors');
const os = require('os');
const readingsRouter = require('./routes/readings');
const { startDemo } = require('./services/demo');
const { startSerialBridge } = require('./services/serialBridge');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use('/api', readingsRouter);
// Malformed JSON bodies get a clear 400 instead of Express's HTML error page.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON' });
  next(err);
});

// LAN IPv4 addresses, for pointing the ESP32's serverUrl at this machine over Wi-Fi.
function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Tank health backend running on port ${PORT}`);
  for (const ip of lanAddresses()) console.log(`  Wi-Fi devices can POST to http://${ip}:${PORT}/api/readings`);
  // `--demo` or `--demo=attention|critical` streams demo readings while no device is posting.
  const demoArg = process.argv.find((a) => a.startsWith('--demo'));
  if (demoArg) startDemo(demoArg.split('=')[1] || 'good');
  // `--usb` auto-detects the ESP32's serial port; `--usb=/dev/cu.usbserial-0001` or `--usb=COM5` picks one.
  const usbArg = process.argv.find((a) => a.startsWith('--usb'));
  if (usbArg) startSerialBridge(usbArg.split('=')[1]);
});
