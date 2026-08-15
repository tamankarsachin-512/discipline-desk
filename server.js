const express = require('express');
const path = require('path');
const { read, write, genId } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function isWeekend(dateStr) {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

function applicableHabits(habits, dateStr) {
  const weekend = isWeekend(dateStr);
  return habits.filter(h => h.frequency === 'daily' || (h.frequency === 'weekend' && weekend));
}

// ---- Habits ----
app.get('/api/habits', (req, res) => {
  const data = read();
  res.json(data.habits);
});

app.post('/api/habits', (req, res) => {
  const { name, emoji, frequency } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const data = read();
  const habit = {
    id: genId(),
    name: name.trim(),
    emoji: emoji && emoji.trim() ? emoji.trim() : '\u2022',
    frequency: frequency === 'weekend' ? 'weekend' : 'daily'
  };
  data.habits.push(habit);
  write(data);
  res.json(habit);
});

app.patch('/api/habits/:id', (req, res) => {
  const data = read();
  const habit = data.habits.find(h => h.id === req.params.id);
  if (!habit) return res.status(404).json({ error: 'not found' });
  const { name, emoji, frequency } = req.body;
  if (name !== undefined) habit.name = name;
  if (emoji !== undefined) habit.emoji = emoji;
  if (frequency !== undefined) habit.frequency = frequency === 'weekend' ? 'weekend' : 'daily';
  write(data);
  res.json(habit);
});

app.delete('/api/habits/:id', (req, res) => {
  const data = read();
  data.habits = data.habits.filter(h => h.id !== req.params.id);
  write(data);
  res.json({ ok: true });
});

// ---- Logs ----
app.get('/api/logs/:date', (req, res) => {
  const data = read();
  const log = data.logs[req.params.date] || { entries: {}, note: '' };
  res.json(log);
});

app.put('/api/logs/:date', (req, res) => {
  const { entries, note } = req.body;
  const data = read();
  data.logs[req.params.date] = {
    entries: entries || {},
    note: note || ''
  };
  write(data);
  res.json(data.logs[req.params.date]);
});

// range of logs, e.g. for a calendar month: /api/logs?from=2026-08-01&to=2026-08-31
app.get('/api/logs', (req, res) => {
  const { from, to } = req.query;
  const data = read();
  const result = {};
  Object.keys(data.logs).forEach(date => {
    if ((!from || date >= from) && (!to || date <= to)) {
      result[date] = data.logs[date];
    }
  });
  res.json(result);
});

// ---- Summary: streaks + completion per habit ----
app.get('/api/summary', (req, res) => {
  const data = read();
  const today = new Date();
  const summary = {};

  data.habits.forEach(habit => {
    let streak = 0;
    let cursor = new Date(today);
    // walk backwards from today until an applicable day is missed
    while (true) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const applies = habit.frequency === 'daily' || (habit.frequency === 'weekend' && isWeekend(dateStr));
      if (applies) {
        const done = data.logs[dateStr] && data.logs[dateStr].entries && data.logs[dateStr].entries[habit.id];
        if (done) {
          streak++;
        } else if (dateStr === today.toISOString().slice(0, 10)) {
          // today not logged yet doesn't break the streak, just isn't counted
        } else {
          break;
        }
      }
      cursor.setDate(cursor.getDate() - 1);
      if (streak > 3650) break; // safety cap
      // stop scanning after ~2 years of no data to avoid infinite loop on empty store
      if (today - cursor > 1000 * 60 * 60 * 24 * 730) break;
    }
    summary[habit.id] = { streak };
  });

  res.json(summary);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Habit tracker running on port ${PORT}`);
});
