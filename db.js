const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_HABITS = [
  { id: 'wake', name: 'Up by 6:00 AM', emoji: '\u{1F305}', frequency: 'daily' },
  { id: 'calisthenics', name: 'Calisthenics', emoji: '\u{1F4AA}', frequency: 'daily' },
  { id: 'meditation', name: 'Meditation', emoji: '\u{1F9D8}', frequency: 'daily' },
  { id: 'yoga', name: 'Yoga', emoji: '\u{1F938}', frequency: 'daily' },
  { id: 'reading', name: 'Reading', emoji: '\u{1F4D6}', frequency: 'daily' },
  { id: 'sleep', name: 'Asleep by 11:00 PM', emoji: '\u{1F319}', frequency: 'daily' },
  { id: 'live_session', name: 'Weekend Live Session', emoji: '\u{1F3A5}', frequency: 'weekend' },
  { id: 'run', name: 'Weekend Run', emoji: '\u{1F3C3}', frequency: 'weekend' }
];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { habits: DEFAULT_HABITS, logs: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
}

function read() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function write(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

module.exports = { read, write, genId };
