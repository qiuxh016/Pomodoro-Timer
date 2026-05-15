class StorageManager {
  constructor() {
    this.prefix = 'catpomodoro_';
  }

  get(key) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // localStorage full or unavailable
    }
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }
}

const storage = new StorageManager();

// Todo CRUD
function loadTodos() {
  const todos = storage.get('todos') || [];
  const today = new Date().toISOString().slice(0, 10);
  let maxOrder = 0;

  // Migrate old tasks without new fields
  todos.forEach(t => {
    if (t.ddl === undefined) t.ddl = null;
    if (t.notes === undefined) t.notes = '';
    if (t.order === undefined) t.order = 0;
    if (t.daily === undefined) t.daily = false;
    if (t.lastCompletedDate === undefined) t.lastCompletedDate = null;
    if (t.order > maxOrder) maxOrder = t.order;
  });

  // Auto-reset daily tasks from previous day
  let changed = false;
  todos.forEach(t => {
    if (t.daily && t.completed && t.lastCompletedDate !== today) {
      t.completed = false;
      t.lastCompletedDate = null;
      changed = true;
    }
  });
  if (changed) saveTodos(todos);

  // Fix tasks with order=0 (migrated) — assign based on id
  const zeroOrder = todos.filter(t => t.order === 0);
  if (zeroOrder.length > 1) {
    zeroOrder.sort((a, b) => b.id - a.id);
    zeroOrder.forEach((t, i) => { t.order = i; });
  }
  return todos;
}

function saveTodos(todos) {
  storage.set('todos', todos);
}

function addTodo(text, ddl = null, notes = '', daily = false, order = null) {
  const todos = loadTodos();
  if (order === null) {
    const maxOrder = todos.reduce((max, t) => Math.max(max, t.order || 0), -1);
    order = maxOrder + 1;
  }
  todos.push({
    id: Date.now(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    ddl: daily ? null : ddl,
    notes,
    order,
    daily,
    lastCompletedDate: null
  });
  saveTodos(todos);
  return todos;
}

function toggleTodo(id) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    if (todo.daily) {
      const today = new Date().toISOString().slice(0, 10);
      todo.lastCompletedDate = todo.completed ? today : null;
    }
    saveTodos(todos);
  }
  return todos;
}

function deleteTodo(id) {
  const todos = loadTodos();
  saveTodos(todos.filter(t => t.id !== id));
  return todos;
}

function updateTodoNotes(id, notes) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.notes = notes;
    saveTodos(todos);
  }
  return todos;
}

function reorderTodos(orderedIds) {
  const todos = loadTodos();
  orderedIds.forEach((id, i) => {
    const todo = todos.find(t => t.id === id);
    if (todo) todo.order = i;
  });
  saveTodos(todos);
  return todos;
}

// Timer state
function loadTimerState() {
  return storage.get('timerState') || { mode: 'work', cycles: 0 };
}

function saveTimerState(state) {
  storage.set('timerState', state);
}

// Cat position
function loadCatPosition() {
  return storage.get('catPosition') || null;
}

function saveCatPosition(pos) {
  storage.set('catPosition', pos);
}

// Settings
const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoBreak: true
};

function loadSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, storage.get('settings') || {});
}

function saveSettings(settings) {
  storage.set('settings', settings);
}

// Daily stats
function loadDailyStats() {
  const today = new Date().toISOString().slice(0, 10);
  const stats = storage.get('dailyStats') || { date: today, count: 0 };
  if (stats.date !== today) {
    return { date: today, count: 0 };
  }
  return stats;
}

function incrementDailyCount() {
  const stats = loadDailyStats();
  stats.count++;
  storage.set('dailyStats', stats);
  return stats;
}

// Focus streak
function loadFocusStreak() {
  return storage.get('focusStreak') || { lastDate: null, streak: 0 };
}

function updateFocusStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streakData = loadFocusStreak();

  if (streakData.lastDate === today) {
    // Already counted today
    return streakData;
  } else if (streakData.lastDate === yesterday) {
    streakData.streak += 1;
  } else {
    streakData.streak = 1;
  }
  streakData.lastDate = today;
  storage.set('focusStreak', streakData);
  return streakData;
}
