class App {
  constructor() {
    this.isExpanded = false;
    this.panel = document.getElementById('main-panel');

    // Set global reference right away so onclick handlers work
    window.app = this;

    // Create timer and todo (wrapped so panel toggle works even on error)
    try {
      this.timer = new PomodoroTimer();
    } catch (e) {
      console.error('Timer init failed:', e);
    }
    try {
      this.todo = new TodoList();
    } catch (e) {
      console.error('Todo init failed:', e);
    }

    // Keyboard shortcuts
    this._setupKeyboard();

    // Click outside panel to collapse
    this._setupOutsideClick();

    // Async init for IPC (non-blocking)
    this._asyncInit();
  }

  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.timer) this.timer.toggle();
      } else if (e.code === 'KeyR') {
        if (this.timer) this.timer.reset();
      }
    });
  }

  _setupOutsideClick() {
    document.addEventListener('click', (e) => {
      if (!this.isExpanded) return;
      const catEl = document.getElementById('cat-container');
      // Ignore clicks inside panel or on the cat
      if (this.panel && this.panel.contains(e.target)) return;
      if (catEl && catEl.contains(e.target)) return;
      this.togglePanel();
    });
  }

  async _asyncInit() {
    this.isExpanded = await window.electronAPI.getIsExpanded();
    if (this.isExpanded) {
      this.panel.classList.remove('hidden');
    }
    this.timer.updateCycleCount();
    this.initSettings();
  }

  initSettings() {
    const toggleBtn = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const inputs = {
      work: document.getElementById('setting-work'),
      short: document.getElementById('setting-short'),
      long: document.getElementById('setting-long'),
      interval: document.getElementById('setting-interval')
    };

    const autoBreakCheck = document.getElementById('setting-autoBreak');

    const settings = loadSettings();
    if (inputs.work) inputs.work.value = settings.workDuration;
    if (inputs.short) inputs.short.value = settings.shortBreakDuration;
    if (inputs.long) inputs.long.value = settings.longBreakDuration;
    if (inputs.interval) inputs.interval.value = settings.longBreakInterval;
    if (autoBreakCheck) autoBreakCheck.checked = settings.autoBreak;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (!settingsPanel) return;
        const isHidden = settingsPanel.classList.toggle('hidden');
        toggleBtn.textContent = isHidden ? '设置' : '收起设置';
      });
    }

    const applySettings = () => {
      const newSettings = {
        workDuration: Math.max(1, Math.min(120, parseInt(inputs.work.value) || 25)),
        shortBreakDuration: Math.max(1, Math.min(60, parseInt(inputs.short.value) || 5)),
        longBreakDuration: Math.max(1, Math.min(120, parseInt(inputs.long.value) || 15)),
        longBreakInterval: Math.max(1, Math.min(10, parseInt(inputs.interval.value) || 4)),
        autoBreak: autoBreakCheck ? autoBreakCheck.checked : true
      };
      saveSettings(newSettings);
      this.timer.settings = newSettings;
      if (!this.timer.isRunning) {
        this.timer.timeLeft = this.timer.getDuration(this.timer.currentMode) * 60;
        this.timer.updateDisplay();
        this.timer.updateRing();
      }
      inputs.work.value = newSettings.workDuration;
      inputs.short.value = newSettings.shortBreakDuration;
      inputs.long.value = newSettings.longBreakDuration;
      inputs.interval.value = newSettings.longBreakInterval;
    };

    ['change', 'blur'].forEach(eventName => {
      if (inputs.work) inputs.work.addEventListener(eventName, applySettings);
      if (inputs.short) inputs.short.addEventListener(eventName, applySettings);
      if (inputs.long) inputs.long.addEventListener(eventName, applySettings);
      if (inputs.interval) inputs.interval.addEventListener(eventName, applySettings);
    });
    if (autoBreakCheck) autoBreakCheck.addEventListener('change', applySettings);
  }

  async togglePanel() {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.panel.classList.remove('hidden');
      await window.electronAPI.setSkipTaskbar(false);
      await window.electronAPI.resizeWindow({ width: 1020, height: 700 });
    } else {
      this.panel.classList.add('hidden');
      const sp = document.getElementById('settings-panel');
      const st = document.getElementById('settings-toggle');
      if (sp) sp.classList.add('hidden');
      if (st) st.textContent = '设置';
      await window.electronAPI.setSkipTaskbar(true);
      await window.electronAPI.resizeWindow({ width: 140, height: 180 });
    }

    if (this.timer) {
      this.timer.refreshCatTimerVisibility();
    }
  }
}

// Wait for DOM then boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
