// ---- Date helpers (local calendar dates, no UTC shifting) ----
function pad(n) { return String(n).padStart(2, '0'); }
function toKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ---- State ----
let habits = [];
let summary = {};
let currentDate = new Date();
let currentLog = { entries: {}, note: '' };
let calMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
let dirty = false;

// ---- Elements ----
const dateLabel = document.getElementById('dateLabel');
const dateWeekday = document.getElementById('dateWeekday');
const habitList = document.getElementById('habitList');
const dayNote = document.getElementById('dayNote');
const saveStatus = document.getElementById('saveStatus');
const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const ticker = document.getElementById('ticker');

// ---- API ----
async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}
const getHabits = () => api('/api/habits');
const addHabitApi = (h) => api('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(h) });
const deleteHabitApi = (id) => api(`/api/habits/${id}`, { method: 'DELETE' });
const getLog = (dateKey) => api(`/api/logs/${dateKey}`);
const putLog = (dateKey, body) => api(`/api/logs/${dateKey}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const getLogsRange = (from, to) => api(`/api/logs?from=${from}&to=${to}`);
const getSummary = () => api('/api/summary');

// ---- Rendering: header ----
function renderHeader() {
  const today = new Date();
  dateLabel.textContent = toKey(currentDate) === toKey(today) ? `Today · ${toKey(currentDate)}` : toKey(currentDate);
  dateWeekday.textContent = WEEKDAY_LABELS[currentDate.getDay()];
}

// ---- Rendering: habit list ----
function applicableHabits(dateObj) {
  const weekend = isWeekend(dateObj);
  return habits.filter(h => h.frequency === 'daily' || (h.frequency === 'weekend' && weekend));
}

function renderHabitList() {
  const list = applicableHabits(currentDate);
  habitList.innerHTML = '';
  if (list.length === 0) {
    habitList.innerHTML = '<li class="habit-row"><span class="habit-name">No habits yet — add one below.</span></li>';
    return;
  }
  list.forEach(h => {
    const on = !!currentLog.entries[h.id];
    const streakInfo = summary[h.id];
    const streak = streakInfo ? streakInfo.streak : 0;
    const li = document.createElement('li');
    li.className = 'habit-row';
    li.innerHTML = `
      <div class="habit-left">
        <span class="habit-emoji">${h.emoji || '•'}</span>
        <span class="habit-name">${h.name}</span>
        ${h.frequency === 'weekend' ? '<span class="habit-freq-tag">Weekend</span>' : ''}
      </div>
      <div class="habit-left">
        <span class="habit-streak ${streak > 0 ? 'hot' : ''}">${streak > 0 ? streak + 'D' : '—'}</span>
        <div class="toggle ${on ? 'on' : ''}" data-id="${h.id}" role="button" aria-label="Toggle ${h.name}"><div class="knob"></div></div>
        <button class="remove-habit" data-remove="${h.id}" title="Remove habit">✕</button>
      </div>
    `;
    habitList.appendChild(li);
  });

  habitList.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => {
      const id = t.dataset.id;
      currentLog.entries[id] = !currentLog.entries[id];
      dirty = true;
      renderHabitList();
    });
  });
  habitList.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.remove;
      await deleteHabitApi(id);
      habits = await getHabits();
      summary = await getSummary();
      renderHabitList();
      renderCalendar();
    });
  });
}

// ---- Load a day ----
async function loadDay(dateObj) {
  currentDate = dateObj;
  renderHeader();
  currentLog = await getLog(toKey(currentDate));
  if (!currentLog.entries) currentLog.entries = {};
  dayNote.value = currentLog.note || '';
  dirty = false;
  saveStatus.textContent = '';
  renderHabitList();
}

// ---- Save ----
async function saveEntry() {
  const body = { entries: currentLog.entries, note: dayNote.value };
  await putLog(toKey(currentDate), body);
  summary = await getSummary();
  dirty = false;
  saveStatus.textContent = 'Saved ✓';
  renderHabitList();
  renderCalendar();
  setTimeout(() => { if (saveStatus.textContent === 'Saved ✓') saveStatus.textContent = ''; }, 2500);
}

// ---- Calendar ----
async function renderCalendar() {
  monthLabel.textContent = `${MONTH_LABELS[calMonth.getMonth()]} ${calMonth.getFullYear()}`;
  const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const lastDay = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
  const from = toKey(firstDay);
  const to = toKey(lastDay);
  const logs = await getLogsRange(from, to);
  const today = toKey(new Date());

  calendarGrid.innerHTML = '';
  for (let i = 0; i < firstDay.getDay(); i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    calendarGrid.appendChild(empty);
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    const key = toKey(d);
    const applicable = applicableHabits(d);
    const log = logs[key];
    let pctClass = 'pct-0';
    if (applicable.length > 0 && log && log.entries) {
      const done = applicable.filter(h => log.entries[h.id]).length;
      const ratio = done / applicable.length;
      if (ratio >= 1) pctClass = 'pct-3';
      else if (ratio >= 0.66) pctClass = 'pct-2';
      else if (ratio > 0) pctClass = 'pct-1';
    }
    const cell = document.createElement('div');
    cell.className = `cal-cell ${pctClass}${key === today ? ' today' : ''}`;
    cell.textContent = day;
    cell.addEventListener('click', () => loadDay(d));
    calendarGrid.appendChild(cell);
  }
}

// ---- Ticker ----
function renderTicker() {
  if (!habits.length) { ticker.innerHTML = ''; return; }
  const parts = habits.map(h => {
    const streak = summary[h.id] ? summary[h.id].streak : 0;
    const cls = streak > 0 ? 'up' : 'flat';
    const arrow = streak > 0 ? '▲' : '·';
    return `<span class="${cls}">${(h.name || '').toUpperCase()} ${arrow} ${streak}D</span>`;
  });
  // duplicate the sequence so the scroll loop feels continuous
  ticker.innerHTML = parts.concat(parts).join('');
}

// ---- Wire up static controls ----
document.getElementById('prevDay').addEventListener('click', () => {
  const d = new Date(currentDate); d.setDate(d.getDate() - 1); loadDay(d);
});
document.getElementById('nextDay').addEventListener('click', () => {
  const d = new Date(currentDate); d.setDate(d.getDate() + 1); loadDay(d);
});
document.getElementById('todayBtn').addEventListener('click', () => {
  loadDay(new Date());
  calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderCalendar();
});
document.getElementById('prevMonth').addEventListener('click', () => {
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
  renderCalendar();
});
document.getElementById('saveBtn').addEventListener('click', saveEntry);
dayNote.addEventListener('input', () => { dirty = true; });

document.getElementById('addHabitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const emoji = document.getElementById('newHabitEmoji').value;
  const name = document.getElementById('newHabitName').value;
  const frequency = document.getElementById('newHabitFreq').value;
  if (!name.trim()) return;
  await addHabitApi({ name, emoji, frequency });
  document.getElementById('newHabitName').value = '';
  document.getElementById('newHabitEmoji').value = '';
  habits = await getHabits();
  summary = await getSummary();
  renderHabitList();
  renderTicker();
  renderCalendar();
});

window.addEventListener('beforeunload', (e) => {
  if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

// ---- Init ----
(async function init() {
  habits = await getHabits();
  summary = await getSummary();
  renderTicker();
  await loadDay(new Date());
  await renderCalendar();
})();
