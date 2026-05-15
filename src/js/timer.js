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
  }

  init() {
    this.updateDisplay();
    this.updateRing();
    this.updateModeButtons();
    this.updateDailyStats();
    this.updateStreakDisplay();

    if (this.btnStart) this.btnStart.addEventListener('click', () => this.start());
    if (this.btnPause) this.btnPause.addEventListener('click', () => this.pause());
    if (this.btnReset) this.btnReset.addEventListener('click', () => this.reset());

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.isRunning) this.switchMode(btn.dataset.mode);
      });
    });
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

    if (window.cat) window.cat.setState('idle');
    this.hideCatTimer();
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.intervalId);

    this.timeLeft = this.getDuration(this.currentMode) * 60;

    if (this.btnPause) this.btnPause.classList.add('hidden');
    if (this.btnStart) this.btnStart.classList.remove('hidden');

    this.updateDisplay();
    this.updateRing();

    if (window.cat) window.cat.setState('idle');
    this.hideCatTimer();
  }

  toggle() {
    this.isRunning ? this.pause() : this.start();
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
      updateFocusStreak();
      this.updateDailyStats();
      this.updateStreakDisplay();
      const tip = breakTips[Math.floor(Math.random() * breakTips.length)];
      if (this.cycles % this.settings.longBreakInterval === 0) {
        this.switchToMode('longBreak');
        if (window.cat) window.cat.showBubble(`太棒了！${tip}`);
      } else {
        this.switchToMode('shortBreak');
        if (window.cat) window.cat.showBubble(tip);
      }
      if (window.cat) window.cat.setState('happy');
    } else {
      this.switchToMode('work');
      if (window.cat) window.cat.showBubble('准备好专注了吗？');
      if (window.cat) window.cat.setState('happy');
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

    if (this.display) this.display.textContent = timeStr;

    const modeNames = { work: '专注', shortBreak: '短休', longBreak: '长休' };
    const modeStr = modeNames[this.currentMode] || '专注';
    if (this.modeLabel) this.modeLabel.textContent = modeStr;

    if (this.catTimerTime) this.catTimerTime.textContent = timeStr;
    if (this.catTimerMode) this.catTimerMode.textContent = modeStr;
  }

  updateRing() {
    if (!this.ringProgress) return;
    if (!this.isRunning && this.timeLeft === this.getDuration(this.currentMode) * 60) {
      this.ringProgress.style.strokeDashoffset = '0';
      return;
    }
    const progress = this.timeLeft / this.totalSeconds;
    const offset = this.ringCircumference * (1 - progress);
    this.ringProgress.style.strokeDashoffset = String(offset);
  }

  updateModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.currentMode);
    });
  }

  updateCycleCount() {
    if (this.cycleCount) this.cycleCount.textContent = `完成: ${this.cycles} 轮`;
  }

  showCatTimer() {
    if (!this.catTimerEl) return;
    this.updateDisplay();
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
      this.ringProgress.style.stroke = '#52C9A6';
      setTimeout(() => { if (this.ringProgress) this.ringProgress.style.stroke = '#48C9B0'; }, 1500);
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
    saveTimerState({ mode: this.currentMode, cycles: this.cycles });
  }
}
