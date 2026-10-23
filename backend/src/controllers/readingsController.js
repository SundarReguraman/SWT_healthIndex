const CONFIG = require('../config/thresholds');
const { ingestReading } = require('../services/ingest');
const { getLatest, getHistory, getEvents, getStreamStatus } = require('../services/store');
const { getSerialStatus } = require('../services/serialBridge');
const { isDemoEnabled } = require('../services/demo');

const MAX_MINUTES = 24 * 60;

function parseMinutes(q) {
  const m = Number(q);
  return Number.isFinite(m) && m > 0 ? Math.min(m, MAX_MINUTES) : 60;
}

function postReading(req, res) {
  const { reading, error } = ingestReading(req.body, 'wifi');
  if (error) return res.status(400).json({ error });
  res.json({ ok: true, latest: reading });
}

function getLatestReading(req, res) {
  const latest = getLatest();
  if (!latest) return res.status(404).json({ error: 'No readings yet' });
  res.json(latest);
}

function getReadingHistory(req, res) {
  res.json(getHistory(parseMinutes(req.query.minutes)));
}

function getStatus(req, res) {
  res.json({ ...getStreamStatus(), demoEnabled: isDemoEnabled(), usb: getSerialStatus() });
}

// One consistent snapshot for the dashboard, so the headline, chart and events never disagree.
function getDashboard(req, res) {
  res.json({
    status: { ...getStreamStatus(), demoEnabled: isDemoEnabled(), usb: getSerialStatus() },
    latest: getLatest(),
    history: getHistory(parseMinutes(req.query.minutes)),
    events: getEvents(20),
    config: { clarity: CONFIG.clarity, tds: CONFIG.tds, level: CONFIG.level, zones: CONFIG.zones, weights: CONFIG.weights },
  });
}

module.exports = { postReading, getLatestReading, getReadingHistory, getStatus, getDashboard };
