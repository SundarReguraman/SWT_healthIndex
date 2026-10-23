const { ingestReading } = require('../services/ingest');
const { getLatest, getHistory } = require('../services/store');

function postReading(req, res) {
  const full = ingestReading(req.body, 'wifi');
  if (!full) return res.status(400).json({ error: 'Missing or invalid sensor values' });
  res.json({ ok: true, latest: full });
}

function getLatestReading(req, res) {
  const latest = getLatest();
  if (!latest) return res.status(404).json({ error: 'No readings yet' });
  res.json(latest);
}

function getReadingHistory(req, res) {
  res.json(getHistory());
}

module.exports = { postReading, getLatestReading, getReadingHistory };
