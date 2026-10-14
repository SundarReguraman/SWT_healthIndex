let latest = null;
let lastLiveAt = null;
const history = [];
const MAX_HISTORY = 500;

function saveReading(reading) {
  latest = reading;
  if (reading.source !== 'demo') lastLiveAt = reading.timestamp;
  history.push(reading);
  if (history.length > MAX_HISTORY) history.shift();
}

function getLatest() {
  return latest;
}

function getHistory() {
  return history;
}

function getLastLiveAt() {
  return lastLiveAt;
}

module.exports = { saveReading, getLatest, getHistory, getLastLiveAt };
