let latest = null;
const history = [];
const MAX_HISTORY = 500;

function saveReading(reading) {
  latest = reading;
  history.push(reading);
  if (history.length > MAX_HISTORY) history.shift();
}

function getLatest() {
  return latest;
}

function getHistory() {
  return history;
}

module.exports = { saveReading, getLatest, getHistory };
