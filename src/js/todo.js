class TodoList {
  constructor() {
    this.todos = [];
    this.expandedIds = new Set();
    this.dailyMode = false;
    this.currentPriority = 'medium';
    this.filterText = '';
    this.filterPri = 'all';

    try { this.todos = loadTodos(); } catch (e) { console.error(e); }
    try { this.initDom(); } catch (e) { console.error(e); }
    try { this.init(); } catch (e) { console.error(e); }
  }

  initDom() {
    this.input = document.getElementById('todo-input');
    this.ddlInput = document.getElementById('todo-ddl');
    this.listEl = document.getElementById('todo-list');
    this.emptyHint = document.getElementById('todo-empty');
    this.addBtn = document.getElementById('btn-add-todo');
    this.dailyBtn = document.getElementById('btn-daily');
    this.progressEl = document.getElementById('todo-progress');
    this.progressText = document.getElementById('todo-progress-text');
    this.progressFill = document.getElementById('todo-progress-fill');
    this.priorityBtn = document.getElementById('btn-priority');
    this.filterSearch = document.getElementById('filter-search');
    this.filterPriority = document.getElementById('filter-priority');
    this.clearBtn = document.getElementById('btn-clear-completed');
  }

  init() {
    this.render();

    if (this.addBtn) this.addBtn.addEventListener('click', () => this.addTodo());
    if (this.input) this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTodo();
    });
    if (this.dailyBtn) {
      this.dailyBtn.addEventListener('click', () => {
        this.dailyMode = !this.dailyMode;
        if (this.dailyMode) {
          this.dailyBtn.classList.add('active');
          this.dailyBtn.textContent = '✓';
          if (this.ddlInput) this.ddlInput.disabled = true;
        } else {
          this.dailyBtn.classList.remove('active');
          this.dailyBtn.textContent = '🔄';
          if (this.ddlInput) this.ddlInput.disabled = false;
        }
      });
    }

    // Priority toggle
    if (this.priorityBtn) {
      const labels = { high: '🔴', medium: '🟡', low: '🟢' };
      const cycle = ['high', 'medium', 'low'];
      this.priorityBtn.addEventListener('click', () => {
        const idx = cycle.indexOf(this.currentPriority);
        this.currentPriority = cycle[(idx + 1) % 3];
        this.priorityBtn.setAttribute('data-priority', this.currentPriority);
        this.priorityBtn.textContent = labels[this.currentPriority];
        const titles = { high: '优先级：高', medium: '优先级：中', low: '优先级：低' };
        this.priorityBtn.title = titles[this.currentPriority];
      });
    }

    // Filter
    if (this.filterSearch) {
      this.filterSearch.addEventListener('input', () => {
        this.filterText = this.filterSearch.value.trim().toLowerCase();
        this.render();
      });
    }
    if (this.filterPriority) {
      this.filterPriority.addEventListener('change', () => {
        this.filterPri = this.filterPriority.value;
        this.render();
      });
    }

    // Clear completed
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        const completed = this.todos.filter(t => t.completed);
        if (completed.length === 0) return;
        if (confirm(`确定清除 ${completed.length} 条已完成任务？`)) {
          this.todos = clearCompletedTodos();
          this.render();
        }
      });
    }

    // Delegate clicks for subtask toggle/delete and task select-in-timer
    if (this.listEl) this.listEl.addEventListener('click', (e) => {
      const subtaskCb = e.target.closest('.todo-subtask-checkbox');
      const subtaskDel = e.target.closest('.todo-subtask-delete');
      const pomodoroBadge = e.target.closest('.todo-pomodoro');

      if (subtaskCb) {
        e.stopPropagation();
        const taskId = parseInt(subtaskCb.dataset.taskId);
        const subIdx = parseInt(subtaskCb.dataset.subIdx);
        this.todos = toggleSubtask(taskId, subIdx);
        this.render();
      } else if (subtaskDel) {
        e.stopPropagation();
        const taskId = parseInt(subtaskDel.dataset.taskId);
        const subIdx = parseInt(subtaskDel.dataset.subIdx);
        this.todos = deleteSubtask(taskId, subIdx);
        this.render();
      } else if (pomodoroBadge) {
        e.stopPropagation();
        const taskId = parseInt(pomodoroBadge.dataset.taskId);
        if (window.app && window.app.timer) {
          window.app.timer.activeTaskId = taskId;
          window.app.timer.refreshTaskSelector();
          window.app.timer.saveState();
          if (window.app.timer.isRunning) window.app.timer.showCatTimer();
        }
      }
    });

    // Delegate keypress for subtask input
    if (this.listEl) this.listEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('subtask-input-field')) {
        e.preventDefault();
        const taskId = parseInt(e.target.dataset.taskId);
        const text = e.target.value.trim();
        if (text) {
          this.todos = addSubtask(taskId, text);
          this.render();
        }
      }
    });
  }

  addTodo() {
    if (!this.input) return;
    const text = this.input.value.trim();
    if (!text) return;

    const ddl = this.dailyMode ? null : (this.ddlInput.value || null);
    const order = this.getInsertOrder(ddl, this.dailyMode);
    this.todos = createTodo(text, ddl, '', this.dailyMode, order, this.currentPriority);
    this.input.value = '';
    this.ddlInput.value = '';
    // Reset daily mode
    if (this.dailyMode) {
      this.dailyMode = false;
      if (this.dailyBtn) {
        this.dailyBtn.classList.remove('active');
        this.dailyBtn.textContent = '🔄';
      }
      if (this.ddlInput) this.ddlInput.disabled = false;
    }
    this.render();
  }

  toggle(id) {
    this.todos = toggleTodo(id);
    // Check if all tasks are completed
    if (this.todos.length > 0 && this.todos.every(t => t.completed)) {
      if (window.cat) {
        window.cat.setState('happy');
        window.cat.showBubble('全部完成！太厉害了！');
      }
    }
    this.render();
  }

  remove(id) {
    this.todos = deleteTodo(id);
    this.expandedIds.delete(id);
    this.render();
  }

  toggleExpand(id) {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
    this.render();
  }

  saveNotes(id, notes) {
    this.todos = updateTodoNotes(id, notes);
  }

  // ---- Sorting ----
  // All groups sort by order only. DDL determines initial order on add,
  // then manual drag takes over. DDL is still shown as a visual badge.
  getSortedTodos() {
    const incomplete = this.todos.filter(t => !t.completed);
    const completed = this.todos.filter(t => t.completed);

    const dailyIncomplete = incomplete.filter(t => t.daily);
    const regularIncomplete = incomplete.filter(t => !t.daily);
    const dailyCompleted = completed.filter(t => t.daily);
    const regularCompleted = completed.filter(t => !t.daily);

    const priorityRank = { high: 0, medium: 1, low: 2 };
    const sortByOrder = (list) => [...list].sort((a, b) => {
      const pa = priorityRank[a.priority] ?? 1;
      const pb = priorityRank[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return a.order - b.order;
    });

    return [
      ...sortByOrder(dailyIncomplete),
      ...sortByOrder(regularIncomplete),
      ...sortByOrder(dailyCompleted),
      ...sortByOrder(regularCompleted)
    ];
  }

  // Calculate insertion order for a new task based on DDL position
  getInsertOrder(ddl, daily) {
    const incomplete = this.todos.filter(t => !t.completed);
    const group = daily ? incomplete.filter(t => t.daily) : incomplete.filter(t => !t.daily);

    if (group.length === 0) return 0;

    if (daily || !ddl) {
      // Daily tasks or no-DDL tasks go to the end of their group
      return Math.max(...group.map(t => t.order)) + 1;
    }

    // Find the first task with DDL > new DDL
    const sortedByDdl = [...group].sort((a, b) => {
      if (!a.ddl) return 1;
      if (!b.ddl) return -1;
      return a.ddl.localeCompare(b.ddl);
    });

    const insertAfter = sortedByDdl.filter(t => t.ddl && t.ddl <= ddl);
    if (insertAfter.length === 0) {
      // New task has earliest DDL — insert at top of group
      const minOrder = Math.min(...group.map(t => t.order));
      return minOrder - 1;
    }

    const prev = insertAfter[insertAfter.length - 1];
    const next = sortedByDdl.find(t => t.ddl && t.ddl > ddl);
    if (!next) {
      // New task has latest DDL — insert at end of group
      return prev.order + 1;
    }

    // Insert between prev and next
    return prev.order + (next.order - prev.order) / 2;
  }

  // ---- DDL Helpers ----
  getDdlInfo(ddl) {
    if (!ddl) return null;
    const today = getLocalDate();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = getLocalDate(d);

    if (ddl < today) return { cls: 'overdue', label: '已逾期' };
    if (ddl === today) return { cls: 'today', label: '今天' };
    if (ddl === tomorrow) return { cls: 'tomorrow', label: '明天' };
    return { cls: 'future', label: ddl.slice(5) }; // MM-DD
  }

  // ---- Drag & Drop ----
  dragStart(e, id) {
    this.dragId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
    setTimeout(() => {
      const li = this.listEl.querySelector(`[data-id="${id}"]`);
      if (li) li.classList.add('dragging');
    }, 0);
  }

  dragEnd(e) {
    const li = this.listEl.querySelector(`[data-id="${this.dragId}"]`);
    if (li) li.classList.remove('dragging');
    this.dragId = null;
    this.listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  dragOver(e, id) {
    e.preventDefault();
    if (id === this.dragId) return;
    e.dataTransfer.dropEffect = 'move';
    this.listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const li = this.listEl.querySelector(`[data-id="${id}"]`);
    if (li) li.classList.add('drag-over');
  }

  dragLeave(e, id) {
    const li = this.listEl.querySelector(`[data-id="${id}"]`);
    if (li) li.classList.remove('drag-over');
  }

  drop(e, targetId) {
    e.preventDefault();
    this.listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (targetId === this.dragId || this.dragId === null) return;

    const sorted = this.getSortedTodos();
    const dragIdx = sorted.findIndex(t => t.id === this.dragId);
    const targetIdx = sorted.findIndex(t => t.id === targetId);
    if (dragIdx === -1 || targetIdx === -1) return;

    // Reorder: build new id order
    const ids = sorted.map(t => t.id);
    ids.splice(dragIdx, 1);
    ids.splice(targetIdx, 0, this.dragId);
    this.todos = reorderTodos(ids);
    this.render();
  }

  // ---- Render ----
  render() {
    try {
      this._renderImpl();
    } catch (e) {
      console.error('Render error:', e);
    }
  }

  _renderImpl() {
    if (!this.listEl || !this.emptyHint || !this.progressEl) return;
    this.listEl.innerHTML = '';

    if (window.app && window.app.timer) {
      window.app.timer.refreshTaskSelector();
    }

    if (this.todos.length === 0) {
      this.emptyHint.classList.remove('hidden');
      this.listEl.classList.add('hidden');
      this.progressEl.classList.add('hidden');
      return;
    }

    this.emptyHint.classList.add('hidden');
    this.listEl.classList.remove('hidden');

    const sorted = this.getSortedTodos();
    const total = sorted.length;
    const done = sorted.filter(t => t.completed).length;

    if (this.progressText) this.progressText.textContent = `待完成: ${total - done}  已完成: ${done}`;
    if (this.progressFill) this.progressFill.style.width = `${Math.round((done / total) * 100)}%`;
    this.progressEl.classList.remove('hidden');

    // Use filtered list for display
    let displayList = sorted;
    if (this.filterText) {
      displayList = displayList.filter(t => t.text.toLowerCase().includes(this.filterText));
    }
    if (this.filterPri !== 'all') {
      displayList = displayList.filter(t => (t.priority || 'medium') === this.filterPri);
    }

    displayList.forEach(todo => {
      const li = document.createElement('li');
      li.setAttribute('data-id', todo.id);
      li.addEventListener('dragover', (e) => this.dragOver(e, todo.id));
      li.addEventListener('dragleave', (e) => this.dragLeave(e, todo.id));
      li.addEventListener('drop', (e) => this.drop(e, todo.id));

      // Drag handle — only the handle initiates drag
      const handle = document.createElement('span');
      handle.className = 'todo-drag';
      handle.textContent = '⋮⋮';
      handle.draggable = true;
      handle.addEventListener('dragstart', (e) => this.dragStart(e, todo.id));
      handle.addEventListener('dragend', (e) => this.dragEnd(e));

      // Checkbox
      const checkbox = document.createElement('div');
      checkbox.className = `todo-checkbox${todo.completed ? ' checked' : ''}`;
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle(todo.id);
      });

      // Text (double-click to edit)
      const text = document.createElement('span');
      text.className = `todo-text${todo.completed ? ' completed' : ''}`;
      text.textContent = todo.text;
      text.title = '双击编辑任务名称';
      text.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (todo.completed) return;
        text.contentEditable = 'true';
        text.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(text);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      text.addEventListener('blur', () => {
        text.contentEditable = 'false';
        const newText = text.textContent.trim();
        if (newText && newText !== todo.text) {
          this.todos = updateTodoText(todo.id, newText);
        } else {
          text.textContent = todo.text;
        }
      });
      text.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          text.blur();
        }
        if (e.key === 'Escape') {
          text.textContent = todo.text;
          text.blur();
        }
      });

      // Priority badge
      const priorityLabels = { high: '高', medium: '中', low: '低' };
      const prio = todo.priority || 'medium';
      const priorityBadge = document.createElement('span');
      priorityBadge.className = `todo-priority ${prio}`;
      priorityBadge.textContent = priorityLabels[prio];
      priorityBadge.title = '点击切换优先级';
      priorityBadge.style.cursor = 'pointer';
      priorityBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const cycle = ['high', 'medium', 'low'];
        const idx = cycle.indexOf(todo.priority || 'medium');
        const next = cycle[(idx + 1) % 3];
        this.todos = updateTodoPriority(todo.id, next);
        todo.priority = next;
        this.render();
      });

      // DDL badge and daily badge
      const ddlInfo = this.getDdlInfo(todo.ddl);

      // ---- Build layout ----

      const subtasks = todo.subtasks || [];

      // Row 1: main row — all info in one line
      const mainRow = document.createElement('div');
      mainRow.className = 'todo-main-row';

      mainRow.appendChild(handle);
      mainRow.appendChild(checkbox);
      mainRow.appendChild(text);

      // Priority badge (inline)
      mainRow.appendChild(priorityBadge);
      if (todo.daily) {
        const dailyBadge = document.createElement('span');
        dailyBadge.className = 'todo-daily';
        dailyBadge.textContent = '日常';
        mainRow.appendChild(dailyBadge);
      }
      if (ddlInfo) {
        const badge = document.createElement('span');
        badge.className = `todo-ddl ${ddlInfo.cls}`;
        badge.textContent = ddlInfo.label;
        mainRow.appendChild(badge);
      }

      // Subtask progress bar (inline, compact)
      if (subtasks.length > 0) {
        const subDone = subtasks.filter(s => s.completed).length;
        const subPill = document.createElement('span');
        subPill.className = 'todo-subtask-pill';
        subPill.textContent = `${subDone}/${subtasks.length}`;
        mainRow.appendChild(subPill);
      }

      // Pomodoro badge (inline)
      if (todo.pomodoroCount > 0) {
        const pomoBadge = document.createElement('span');
        pomoBadge.className = 'todo-pomodoro';
        pomoBadge.textContent = `🍅×${todo.pomodoroCount}`;
        pomoBadge.dataset.taskId = todo.id;
        pomoBadge.title = '点击关联此任务到计时器';
        pomoBadge.style.cursor = 'pointer';
        mainRow.appendChild(pomoBadge);
      }

      // Expand toggle
      const isExpanded = this.expandedIds.has(todo.id);
      const expandBtn = document.createElement('button');
      expandBtn.className = 'todo-expand';
      expandBtn.textContent = isExpanded ? '▲' : '▼';
      expandBtn.title = isExpanded ? '收起详情' : '展开详情';
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(todo.id);
      });
      mainRow.appendChild(expandBtn);

      // Delete
      const delBtn = document.createElement('button');
      delBtn.className = 'todo-delete';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(todo.id);
      });
      mainRow.appendChild(delBtn);

      li.appendChild(mainRow);

      // Expanded: subtasks + notes (compact)
      if (isExpanded) {
        const expandedWrap = document.createElement('div');
        expandedWrap.className = 'todo-expanded-content';

        if (subtasks.length > 0) {
          const subtaskContainer = document.createElement('div');
          subtaskContainer.className = 'todo-subtasks';

          subtasks.forEach((sub, idx) => {
            const item = document.createElement('div');
            item.className = 'todo-subtask-item';

            const cb = document.createElement('div');
            cb.className = `todo-subtask-checkbox${sub.completed ? ' checked' : ''}`;
            cb.dataset.taskId = todo.id;
            cb.dataset.subIdx = String(idx);

            const subText = document.createElement('span');
            subText.className = `todo-subtask-text${sub.completed ? ' done' : ''}`;
            subText.textContent = sub.text;

            const del = document.createElement('button');
            del.className = 'todo-subtask-delete';
            del.textContent = '×';
            del.dataset.taskId = todo.id;
            del.dataset.subIdx = String(idx);

            item.appendChild(cb);
            item.appendChild(subText);
            item.appendChild(del);
            subtaskContainer.appendChild(item);
          });

          expandedWrap.appendChild(subtaskContainer);
        }

        // Add subtask input
        const subInput = document.createElement('div');
        subInput.className = 'todo-subtask-input';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '添加子任务...';
        input.className = 'subtask-input-field';
        input.dataset.taskId = todo.id;
        input.maxLength = 60;
        const addBtn = document.createElement('button');
        addBtn.textContent = '+';
        addBtn.addEventListener('click', () => {
          const text = input.value.trim();
          if (text) {
            this.todos = addSubtask(todo.id, text);
            this.render();
          }
        });
        subInput.appendChild(input);
        subInput.appendChild(addBtn);
        expandedWrap.appendChild(subInput);

        // Notes
        const notesEl = document.createElement('div');
        notesEl.className = 'todo-notes';
        notesEl.contentEditable = 'true';
        notesEl.textContent = todo.notes || '';
        notesEl.addEventListener('blur', () => {
          this.saveNotes(todo.id, notesEl.textContent || '');
        });
        notesEl.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        });
        notesEl.addEventListener('keydown', (e) => {
          e.stopPropagation();
        });
        expandedWrap.appendChild(notesEl);

        li.appendChild(expandedWrap);
      }

      this.listEl.appendChild(li);
    });
  }
}
