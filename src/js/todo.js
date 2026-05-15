class TodoList {
  constructor() {
    this.todos = loadTodos();
    this.input = document.getElementById('todo-input');
    this.ddlInput = document.getElementById('todo-ddl');
    this.listEl = document.getElementById('todo-list');
    this.emptyHint = document.getElementById('todo-empty');
    this.addBtn = document.getElementById('btn-add-todo');
    this.dailyBtn = document.getElementById('btn-daily');
    this.progressEl = document.getElementById('todo-progress');
    this.progressText = document.getElementById('todo-progress-text');
    this.progressFill = document.getElementById('todo-progress-fill');
    this.expandedIds = new Set();
    this.dailyMode = false;

    this.init();
  }

  init() {
    this.render();

    this.addBtn.addEventListener('click', () => this.addTodo());
    this.input.addEventListener('keydown', (e) => {
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
  }

  addTodo() {
    const text = this.input.value.trim();
    if (!text) return;

    const ddl = this.dailyMode ? null : (this.ddlInput.value || null);
    const order = this.getInsertOrder(ddl, this.dailyMode);
    this.todos = addTodo(text, ddl, '', this.dailyMode, order);
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

    const sortByOrder = (list) => [...list].sort((a, b) => a.order - b.order);

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
    const today = new Date().toISOString().slice(0, 10);

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
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

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
    this.listEl.innerHTML = '';

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

    if (this.progressText) this.progressText.textContent = `已完成 ${done}/${total}`;
    if (this.progressFill) this.progressFill.style.width = `${Math.round((done / total) * 100)}%`;
    this.progressEl.classList.remove('hidden');

    sorted.forEach(todo => {
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

      // Text
      const text = document.createElement('span');
      text.className = `todo-text${todo.completed ? ' completed' : ''}`;
      text.textContent = todo.text;

      // DDL badge and daily badge
      const ddlInfo = this.getDdlInfo(todo.ddl);
      li.appendChild(handle);
      li.appendChild(checkbox);
      li.appendChild(text);
      if (todo.daily) {
        const dailyBadge = document.createElement('span');
        dailyBadge.className = 'todo-daily';
        dailyBadge.textContent = '日常';
        li.appendChild(dailyBadge);
      }
      if (ddlInfo) {
        const badge = document.createElement('span');
        badge.className = `todo-ddl ${ddlInfo.cls}`;
        badge.textContent = ddlInfo.label;
        li.appendChild(badge);
      }

      // Expand toggle
      const expandBtn = document.createElement('button');
      const isExpanded = this.expandedIds.has(todo.id);
      expandBtn.className = 'todo-expand';
      expandBtn.textContent = isExpanded ? '▲' : '▼';
      expandBtn.title = isExpanded ? '收起备注' : '展开备注';
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(todo.id);
      });
      li.appendChild(expandBtn);

      // Delete
      const delBtn = document.createElement('button');
      delBtn.className = 'todo-delete';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(todo.id);
      });
      li.appendChild(delBtn);

      // Notes panel (expanded) — inside li as full-width row
      if (isExpanded) {
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
        li.appendChild(notesEl);
      }

      this.listEl.appendChild(li);
    });
  }
}
