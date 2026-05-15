class PomodoroTimer {
  constructor() {
    this.settings = loadSettings();
    this.state = loadTimerState();

    this.currentMode = this.state.mode;
    this.cycles = this.state.cycles;
    this.timeLeft = this.getDuration(this.currentMode) * 60;
    this.isRunning = false;
    this.intervalId = null;

    this.totalSeconds = this.timeLeft;
    this.ringCircumference = 2 * Math.PI * 52;

    this.initDom();
    this.init();
  }

  initDom() {
    this.display = document.getElementById('timer-display');
    this.modeLabel = document.getElementById('timer-mode');
    this.ringProgress = document.getElementById('ring-progress');
    this.btnStart = document.getElementById('btn-start');
    this.btnPause = document.getElementById('btn-pause');
    this.btnReset = document.getElementById('btn-reset');
    this.cycleCount = document.getElementById('cycle-count');
    this.catTimerEl = document.getElementById('cat-timer-display');
    this.catTimerTime = document.getElementById('cat-timer-time');
    this.catTimerMode = document.getElementById('cat-timer-mode');
    this.dailyStats = document.getElementById('daily-stats');
    this.streakEl = document.getElementById('focus-streak');
    this.skipBtn = document.getElementById('btn-skip');
    this.extendBtn = document.getElementById('btn-extend');
    this.taskSelect = document.getElementById('task-select');
    this.activeTaskId = this.state.activeTaskId || null;
  }

  init() {
    this.updateDisplay();
    this.updateRing();
    this.updateModeButtons();
    this.updateDailyStats();
    this.updateStreakDisplay();
    this.refreshTaskSelector();

    if (this.btnStart) this.btnStart.addEventListener('click', () => this.start());
    if (this.btnPause) this.btnPause.addEventListener('click', () => this.pause());
    if (this.btnReset) this.btnReset.addEventListener('click', () => this.reset());

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.isRunning) this.switchMode(btn.dataset.mode);
      });
    });

    if (this.taskSelect) {
      this.taskSelect.addEventListener('change', () => {
        this.activeTaskId = this.taskSelect.value ? parseInt(this.taskSelect.value) : null;
        this.saveState();
        if (this.isRunning) this.showCatTimer();
      });
    }
  }

  getModeColors() {
    switch (this.currentMode) {
      case 'work':       return { main: '#48C9B0', light: '#A3E4D7', flash: '#52C9A6' };
      case 'shortBreak': return { main: '#F0A060', light: '#FAD4B0', flash: '#F5B870' };
      case 'longBreak':  return { main: '#9B7EC4', light: '#D0C4E8', flash: '#AE93D4' };
      default:           return { main: '#48C9B0', light: '#A3E4D7', flash: '#52C9A6' };
    }
  }

  getDuration(mode) {
    switch (mode) {
      case 'work': return this.settings.workDuration;
      case 'shortBreak': return this.settings.shortBreakDuration;
      case 'longBreak': return this.settings.longBreakDuration;
      default: return 25;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.totalSeconds = this.timeLeft;
    this.halfwayFired = false;

    if (this.btnStart) this.btnStart.classList.add('hidden');
    if (this.btnPause) this.btnPause.classList.remove('hidden');
    // Show skip button for breaks, extend button for work
    if (this.skipBtn) this.skipBtn.classList.toggle('hidden', this.currentMode === 'work');
    if (this.extendBtn) this.extendBtn.classList.toggle('hidden', this.currentMode !== 'work');

    if (window.cat) window.cat.setState('working');
    this.showCatTimer();

    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);

    if (this.btnPause) this.btnPause.classList.add('hidden');
    if (this.btnStart) this.btnStart.classList.remove('hidden');
    if (this.skipBtn) this.skipBtn.classList.add('hidden');
    if (this.extendBtn) this.extendBtn.classList.add('hidden');

    if (window.cat) window.cat.setState('idle');
    this.hideCatTimer();
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.intervalId);

    this.timeLeft = this.getDuration(this.currentMode) * 60;

    if (this.btnPause) this.btnPause.classList.add('hidden');
    if (this.btnStart) this.btnStart.classList.remove('hidden');
    if (this.skipBtn) this.skipBtn.classList.add('hidden');
    if (this.extendBtn) this.extendBtn.classList.add('hidden');

    this.updateDisplay();
    this.updateRing();

    if (window.cat) window.cat.setState('idle');
    this.hideCatTimer();
  }

  toggle() {
    this.isRunning ? this.pause() : this.start();
  }

  skipBreak() {
    if (this.currentMode === 'work') return;
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.switchToMode('work');
    this.timeLeft = this.getDuration('work') * 60;
    this.updateDisplay();
    this.updateRing();
    this.updateModeButtons();
    if (this.skipBtn) this.skipBtn.classList.add('hidden');
    if (this.extendBtn) this.extendBtn.classList.add('hidden');
    if (this.btnPause) this.btnPause.classList.add('hidden');
    if (this.btnStart) this.btnStart.classList.remove('hidden');
    if (window.cat) {
      window.cat.setState('idle');
      window.cat.showBubble('好！继续加油~');
    }
    this.hideCatTimer();
    this.saveState();
  }

  extendWork() {
    if (this.currentMode !== 'work' || !this.isRunning) return;
    this.timeLeft += 300; // +5 minutes
    this.totalSeconds += 300;
    this.updateDisplay();
    this.updateRing();
    if (window.cat) window.cat.showBubble('再加5分钟！加油~');
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.updateDisplay();
      this.updateRing();
      // Halfway milestone (only for work sessions)
      if (this.currentMode === 'work' && !this.halfwayFired &&
          this.timeLeft === Math.floor(this.totalSeconds / 2)) {
        this.halfwayFired = true;
        if (window.cat) window.cat.showBubble('已经完成一半了！坚持住~');
      }
    } else {
      this.complete();
    }
  }

  complete() {
    clearInterval(this.intervalId);
    this.isRunning = false;

    if (this.btnPause) this.btnPause.classList.add('hidden');
    if (this.btnStart) this.btnStart.classList.remove('hidden');

    const wasWork = this.currentMode === 'work';

    const breakTips = [
      '站起来活动一下', '看看窗外放松眼睛', '喝杯水补充水分',
      '伸个懒腰吧', '做几个深呼吸', '闭眼休息一分钟'
    ];

    if (wasWork) {
      this.cycles++;
      this.state.cycles = this.cycles;
      incrementDailyCount();

      if (this.activeTaskId) {
        updatePomodoroCount(this.activeTaskId);
        if (window.app && window.app.todo) {
          window.app.todo.render();
        }
      }

      const streakData = updateFocusStreak();
      this.updateDailyStats();
      this.updateStreakDisplay();

      // Check outfit unlocks
      const { newlyUnlocked } = checkAndUnlockOutfits(streakData.streak);
      if (newlyUnlocked.length > 0 && window.cat) {
        const names = newlyUnlocked.map(o => o.label).join('、');
        window.cat.showBubble(`解锁新装扮：${names}！`, 4000);
        window.cat.refreshOutfits();
      }

      const tip = breakTips[Math.floor(Math.random() * breakTips.length)];
      if (this.cycles % this.settings.longBreakInterval === 0) {
        this.switchToMode('longBreak');
        if (window.cat) window.cat.showBubble(`太棒了！${tip}`);
      } else {
        this.switchToMode('shortBreak');
        if (window.cat) window.cat.showBubble(tip);
      }
      if (window.cat) window.cat.setState('happy');

      // Desktop notification
      this._notify('专注完成！', '休息一下吧，站起来活动活动~');
    } else {
      this.switchToMode('work');
      if (window.cat) window.cat.showBubble('准备好专注了吗？');
      if (window.cat) window.cat.setState('happy');

      // Desktop notification
      this._notify('休息结束', '准备开始新的专注吧！');
    }

    this.timeLeft = this.getDuration(this.currentMode) * 60;
    this.updateDisplay();
    this.updateRing();
    this.updateModeButtons();
    this.updateCycleCount();
    this.saveState();

    this.hideCatTimer();
    this.flashComplete();
    this.playChime(wasWork);

    // Auto-start break
    if (wasWork && this.settings.autoBreak) {
      setTimeout(() => {
        if (!this.isRunning && this.currentMode !== 'work') {
          this.start();
        }
      }, 1500);
    }
  }

  switchMode(mode) {
    this.switchToMode(mode);
    this.timeLeft = this.getDuration(mode) * 60;
    this.updateDisplay();
    this.updateRing();
    this.updateModeButtons();
  }

  switchToMode(mode) {
    this.currentMode = mode;
    this.state.mode = mode;
    this.saveState();
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const colors = this.getModeColors();
    const modeNames = { work: '专注', shortBreak: '短休', longBreak: '长休' };
    const modeStr = modeNames[this.currentMode] || '专注';

    if (this.display) this.display.textContent = timeStr;
    if (this.modeLabel) {
      this.modeLabel.textContent = modeStr;
      this.modeLabel.style.color = colors.main;
    }
    if (this.catTimerTime) this.catTimerTime.textContent = timeStr;
    if (this.catTimerMode) {
      this.catTimerMode.textContent = modeStr;
      this.catTimerMode.style.color = colors.main;
    }
  }

  updateRing() {
    if (!this.ringProgress) return;
    const colors = this.getModeColors();
    this.ringProgress.style.stroke = colors.main;
    if (!this.isRunning && this.timeLeft === this.getDuration(this.currentMode) * 60) {
      this.ringProgress.style.strokeDashoffset = '0';
      return;
    }
    const progress = this.timeLeft / this.totalSeconds;
    const offset = this.ringCircumference * (1 - progress);
    this.ringProgress.style.strokeDashoffset = String(offset);
  }

  updateModeButtons() {
    const colors = this.getModeColors();
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const isActive = btn.dataset.mode === this.currentMode;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.style.color = colors.main;
    });
  }

  updateCycleCount() {
    if (this.cycleCount) this.cycleCount.textContent = `完成: ${this.cycles} 轮`;
  }

  refreshTaskSelector() {
    if (!this.taskSelect) return;
    const todos = loadTodos();
    const incomplete = todos.filter(t => !t.completed);
    const currentVal = this.taskSelect.value;
    this.taskSelect.innerHTML = '<option value="">-- 关联任务 --</option>';
    incomplete.forEach(t => {
      const opt = document.createElement('option');
      opt.value = String(t.id);
      opt.textContent = t.text.length > 15 ? t.text.slice(0, 15) + '...' : t.text;
      this.taskSelect.appendChild(opt);
    });
    if (this.activeTaskId && incomplete.some(t => t.id === this.activeTaskId)) {
      this.taskSelect.value = String(this.activeTaskId);
    } else if (this.activeTaskId && !incomplete.some(t => t.id === this.activeTaskId)) {
      this.activeTaskId = null;
      this.saveState();
    } else {
      this.taskSelect.value = currentVal;
    }
  }

  showCatTimer() {
    if (!this.catTimerEl) return;
    this.updateDisplay();
    if (this.activeTaskId) {
      const todos = loadTodos();
      const task = todos.find(t => t.id === this.activeTaskId);
      if (task && this.catTimerMode) {
        this.catTimerMode.textContent = '正在做: ' + (task.text.length > 8 ? task.text.slice(0, 8) + '...' : task.text);
      }
    }
    this.catTimerEl.style.setProperty('display', 'flex', 'important');
  }

  hideCatTimer() {
    if (this.catTimerEl) this.catTimerEl.style.setProperty('display', 'none', 'important');
  }

  refreshCatTimerVisibility() {
    const collapsed = window.app && !window.app.isExpanded;
    if (this.isRunning && collapsed) {
      this.showCatTimer();
    } else {
      this.hideCatTimer();
    }
  }

  flashComplete() {
    if (this.ringProgress) {
      const colors = this.getModeColors();
      this.ringProgress.style.stroke = colors.flash;
      setTimeout(() => {
        if (this.ringProgress) this.ringProgress.style.stroke = colors.main;
      }, 1500);
    }
  }

  updateDailyStats() {
    const stats = loadDailyStats();
    if (this.dailyStats) {
      this.dailyStats.textContent = `今日专注: ${stats.count} 次`;
    }
  }

  updateStreakDisplay() {
    const streak = loadFocusStreak();
    if (this.streakEl) {
      const fire = streak.streak >= 7 ? ' 🔥' : '';
      this.streakEl.textContent = `连续专注: ${streak.streak} 天${fire}`;
    }
  }

  _notify(title, body) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, silent: true });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification(title, { body, silent: true });
        });
      }
    } catch {
      // Notifications not supported
    }
  }

  playChime(ascending) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = ascending ? [523, 659] : [659, 523]; // C5→E5 or E5→C5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {
      // Audio not supported
    }
  }

  saveState() {
    saveTimerState({ mode: this.currentMode, cycles: this.cycles, activeTaskId: this.activeTaskId });
  }
}
