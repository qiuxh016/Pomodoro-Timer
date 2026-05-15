class CatPet {
  constructor() {
    this.container = document.getElementById('cat-container');
    this.svg = document.getElementById('cat-svg');
    this.bubble = document.getElementById('speech-bubble');
    this.bubbleText = document.getElementById('bubble-text');
    this.catBlink = document.getElementById('cat-blink');
    this.catFocused = document.getElementById('cat-focused');
    this.catHappyMouth = document.getElementById('cat-happy-mouth');
    this.catTail = document.getElementById('cat-tail');
    this.catSleeping = document.getElementById('cat-sleeping');

    this.state = 'idle';
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.hasMoved = false;
    this.blinkTimer = null;
    this.bubbleTimer = null;
    this.sleepTimer = null;
    this.motivationTimer = null;

    this.motivationMessages = [
      '加油！', '专注的你最棒！', '再坚持一下~', '你可以的！',
      '棒棒哒！', '继续努力！', '保持专注！', '做得好~',
      '冲冲冲！', '今天也要元气满满！'
    ];

    this.clickReactions = [
      '喵~', '呜喵？', '呼噜呼噜~', '喵呜！', '喵喵！', '咪~'
    ];

    this.init();
  }

  init() {
    this.svg.classList.add('cat-idle');
    this.setupDrag();
    this.startBlink();
    this.startSleepTimer();
  }

  setupDrag() {
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.hasMoved = false;
      this.dragStart = { x: e.screenX, y: e.screenY };
      this.cancelSleep();

      const onMove = (ev) => {
        if (!this.isDragging) return;
        const dx = ev.screenX - this.dragStart.x;
        const dy = ev.screenY - this.dragStart.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.hasMoved = true;
        this.dragStart = { x: ev.screenX, y: ev.screenY };
        window.electronAPI.setWindowPosition({
          x: window.screenX + dx,
          y: window.screenY + dy
        });
      };

      const onUp = () => {
        this.isDragging = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (!this.hasMoved && window.app) {
          window.app.togglePanel();
          // Random click reaction when cat is idle
          if (this.state === 'idle') {
            this.spawnHearts();
            if (Math.random() < 0.3) {
              this.showClickReaction();
            }
          }
        }
        if (!this.hasMoved && this.state === 'idle') {
          this.startSleepTimer();
        }
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    this.container.addEventListener('dblclick', (e) => {
      this.cancelSleep();
      if (window.app && window.app.timer) {
        const wasRunning = window.app.timer.isRunning;
        window.app.timer.toggle();
        if (!wasRunning) {
          this.showBubble('开始专注吧！喵~');
        }
      }
    });

    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  startBlink() {
    const blink = this.catBlink;
    if (!blink) return;
    const schedule = () => {
      this.blinkTimer = setTimeout(() => {
        blink.setAttribute('opacity', '1');
        setTimeout(() => {
          blink.setAttribute('opacity', '0');
          schedule();
        }, 150);
      }, 2500 + Math.random() * 5000);
    };
    schedule();
  }

  startSleepTimer() {
    this.cancelSleep();
    if (this.state !== 'idle') return;
    this.sleepTimer = setTimeout(() => {
      this.setState('sleeping');
    }, 60000);
  }

  cancelSleep() {
    clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    if (this.state === 'sleeping') {
      this.setState('idle');
    }
  }

  startMotivationBubbles() {
    this.stopMotivationBubbles();
    const schedule = () => {
      if (this.state !== 'working') return;
      this.motivationTimer = setTimeout(() => {
        if (this.state !== 'working') return;
        const msg = this.motivationMessages[Math.floor(Math.random() * this.motivationMessages.length)];
        this.showBubble(msg);
        schedule();
      }, 180000 + Math.random() * 120000); // every 3-5 minutes
    };
    schedule();
  }

  stopMotivationBubbles() {
    clearTimeout(this.motivationTimer);
    this.motivationTimer = null;
  }

  showClickReaction() {
    const msg = this.clickReactions[Math.floor(Math.random() * this.clickReactions.length)];
    this.showBubble(msg, 1500);
  }

  setState(state) {
    if (!this.svg) return;
    this.state = state;
    this.svg.classList.remove('cat-idle', 'cat-working', 'cat-happy', 'cat-sleeping');

    // Reset face overlays
    if (this.catBlink) this.catBlink.setAttribute('opacity', '0');
    if (this.catFocused) this.catFocused.setAttribute('opacity', '0');
    if (this.catHappyMouth) this.catHappyMouth.setAttribute('opacity', '0');
    if (this.catSleeping) this.catSleeping.setAttribute('opacity', '0');

    // Stop timers
    this.stopMotivationBubbles();

    switch (state) {
      case 'idle':
        this.svg.classList.add('cat-idle');
        this.startSleepTimer();
        break;
      case 'working':
        this.svg.classList.add('cat-working');
        if (this.catFocused) this.catFocused.setAttribute('opacity', '1');
        this.startMotivationBubbles();
        this.cancelSleep();
        break;
      case 'resting':
        this.svg.classList.add('cat-idle');
        if (this.catHappyMouth) this.catHappyMouth.setAttribute('opacity', '1');
        this.cancelSleep();
        break;
      case 'happy':
        this.svg.classList.add('cat-happy');
        if (this.catHappyMouth) this.catHappyMouth.setAttribute('opacity', '1');
        this.cancelSleep();
        setTimeout(() => {
          if (this.state === 'happy') this.setState('idle');
        }, 700);
        break;
      case 'sleeping':
        this.svg.classList.add('cat-sleeping');
        if (this.catSleeping) this.catSleeping.setAttribute('opacity', '1');
        if (this.catBlink) this.catBlink.setAttribute('opacity', '0');
        this.cancelSleep();
        break;
    }
  }

  spawnHearts() {
    if (!this.container) return;
    const hearts = ['❤️', '💕', '✨', '💖', '🐾'];
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 hearts
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('span');
      heart.className = 'cat-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      heart.style.left = (30 + Math.random() * 60) + 'px';
      heart.style.top = (20 + Math.random() * 40) + 'px';
      heart.style.animationDelay = (i * 0.1) + 's';
      heart.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
      this.container.appendChild(heart);
      setTimeout(() => heart.remove(), 1200);
    }
  }

  showBubble(text, duration = 3000) {
    if (!this.bubble) return;
    this.bubbleText.textContent = text;
    this.bubble.classList.remove('hidden');
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => {
      this.bubble.classList.add('hidden');
    }, duration);
  }
}

window.cat = new CatPet();
