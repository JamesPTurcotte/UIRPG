(() => {
  const view = {
    user: null,
    state: UIRPG.Run.session(),
    content: UIRPG.Content.clone(),
    adminOpen: false,
    picking: false,
    hotExit: null,
    hotIndex: 0,
    held: null,
    sheetOpen: false,
  };
  let revealTimer = null;

  function paint() {
    UIRPG.UI.Render.paint(view);
    armReveal();
  }

  function armReveal() {
    clearTimeout(revealTimer);
    if (!view.state || !view.state.reveal) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    revealTimer = setTimeout(() => {
      view.state.reveal = null;
      UIRPG.UI.Render.paint(view);
    }, reduced ? 500 : 1700);
  }

  function dismissReveal() {
    if (!view.state || !view.state.reveal) return;
    clearTimeout(revealTimer);
    view.state.reveal = null;
    UIRPG.UI.Render.paint(view);
  }

  async function api(url, options) {
    const opts = options || {};
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'Request failed');
      error.data = data;
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function adopt(me) {
    view.user = me.user;
    view.content = me.content;
    view.adminOpen = false;
    view.picking = false;
    const loaded = UIRPG.Run.fromSave({
      run: me.run,
      meta: me.meta,
      phase: me.phase,
      recap: me.recap,
    }, me.content);
    view.state = loaded.state;
    if (!loaded.ok && loaded.state.notice) view.state.notice = loaded.state.notice;
  }

  async function save() {
    if (!view.user) return;
    const body = UIRPG.Run.toSave(view.state);
    await api('/api/save', { method: 'PUT', body });
  }

  async function boot() {
    try {
      const me = await api('/api/me');
      if (!me.user) {
        view.user = null;
        paint();
        return;
      }
      adopt(me);
      paint();
    } catch (err) {
      view.user = null;
      paint();
    }
  }

  function exits() {
    if (!view.state.run || view.state.run.battle) return [];
    return UIRPG.Run.exits(view.state.run);
  }

  async function after(fn) {
    let result = null;
    try {
      result = await fn();
    } catch (err) {
      view.state.notice = err.message;
    }
    paint();
    try { await save(); } catch (err) { view.state.notice = err.message; paint(); }
    return result;
  }

  document.body.addEventListener('click', (event) => {
    if (view.state && view.state.reveal) {
      const settling = event.target.closest('[data-act]');
      const settlingAct = settling && settling.dataset.act;
      if (settlingAct !== 'modal-yes' && settlingAct !== 'modal-no') {
        dismissReveal();
        return;
      }
    }
    const target = event.target.closest('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'login') return;
    if (act === 'modal-no') {
      UIRPG.UI.Modal.close();
      return;
    }
    if (act === 'modal-yes') {
      UIRPG.UI.Modal.close();
      UIRPG.Run.abandon(view.state);
      view.picking = false;
      after(() => {});
      return;
    }
    if (view.state && view.state.reveal && act !== 'roll-ability') dismissReveal();
    handle(act, target, event);
  });

  document.body.addEventListener('change', (event) => {
    if (event.target.id !== 'kind') return;
    const area = document.getElementById('entry');
    if (area && UIRPG.UI.Content.sample) area.value = UIRPG.UI.Content.sample(event.target.value);
  });

  document.body.addEventListener('mouseover', (event) => {
    const ability = event.target.closest('[data-ability]');
    document.querySelectorAll('.ability').forEach(el => {
      el.classList.toggle('lit', !!(ability && el.dataset.ability === ability.dataset.ability));
    });
    const door = event.target.closest('[data-dir]');
    document.querySelectorAll('.room-node').forEach(el => {
      el.classList.toggle('hot', !!(door && el.dataset.id === door.dataset.id));
    });
  });

  document.body.addEventListener('submit', (event) => {
    if (event.target.id !== 'login-form') return;
    event.preventDefault();
    handle('login', event.target, event);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === ' ' && view.state && view.state.reveal) {
      event.preventDefault();
      dismissReveal();
      return;
    }
    if (!view.state || !view.state.run) return;
    if (view.state.reveal) return;
    if (view.state.run.battle && view.state.run.battle.turn === 'player' && event.key >= '1' && event.key <= '9') {
      const moves = UIRPG.Run.battleMoves(view.state.run);
      const action = moves[Number(event.key) - 1];
      if (action) handle('battle', { dataset: { id: action } }, event);
      return;
    }
    const list = exits();
    if (!list.length) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const dir = event.key === 'ArrowLeft' ? 'left' : 'right';
      const found = list.find(ex => ex.dir === dir) || list[0];
      view.hotExit = found.id;
      view.hotIndex = list.indexOf(found);
      paint();
    }
    if (event.key === 'Enter' && view.hotExit) {
      event.preventDefault();
      handle('move', { dataset: { id: view.hotExit } }, event);
    }
  });

  async function handle(act, target) {
    if (act === 'login' || act === 'register') {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const name = document.getElementById('name').value.trim();
      try {
        const me = await api(act === 'register' ? '/api/register' : '/api/login', {
          method: 'POST',
          body: { email, password, name },
        });
        adopt(me);
        paint();
      } catch (err) {
        const slot = document.getElementById('auth-error');
        if (slot) slot.textContent = (err.data && err.data.error) || err.message;
      }
      return;
    }
    if (act === 'logout') {
      await api('/api/logout', { method: 'POST', body: {} });
      view.user = null;
      view.state = UIRPG.Run.session();
      paint();
      return;
    }
    if (act === 'open-admin') {
      view.adminOpen = true;
      paint();
      return;
    }
    if (act === 'close-admin') {
      view.adminOpen = false;
      paint();
      return;
    }
    if (act === 'publish') {
      const list = document.getElementById('kind').value;
      let item;
      try {
        item = JSON.parse(document.getElementById('entry').value);
      } catch (err) {
        document.getElementById('content-error').textContent = 'That is not valid JSON.';
        return;
      }
      try {
        const result = await api('/api/content', { method: 'POST', body: { list, item } });
        view.content = result.content;
        view.adminOpen = false;
        view.state.notice = 'Published.';
        paint();
      } catch (err) {
        const slot = document.getElementById('content-error');
        const errors = err.data && err.data.errors;
        if (slot) slot.textContent = errors ? errors.join(' ') : err.message;
      }
      return;
    }
    if (act === 'test-run') {
      if (!view.user || !view.user.admin) return;
      view.adminOpen = false;
      view.picking = false;
      view.held = null;
      const result = UIRPG.Run.quickTest(view.state, view.content, Math.floor(Math.random() * 1e9) + 1);
      if (result && !result.ok) view.state.notice = result.error;
      await after(() => {});
      return;
    }
    if (act === 'new-run') {
      view.picking = true;
      paint();
      return;
    }
    if (act === 'pick-class') {
      UIRPG.Run.beginCreation(view.state, view.content, target.dataset.id, Math.floor(Math.random() * 1e9) + 1);
      view.picking = false;
      view.held = null;
      await after(() => {});
      return;
    }
    if (act === 'roll-ability') {
      UIRPG.Run.rollAbility(view.state, Math.random);
      await after(() => {});
      return;
    }
    if (act === 'hold-roll') {
      const index = Number(target.dataset.index);
      const creation = view.state.creation;
      if (creation) {
        Object.keys(creation.assignments).forEach(key => {
          if (creation.assignments[key] === index) delete creation.assignments[key];
        });
      }
      view.held = view.held === index ? null : index;
      paint();
      return;
    }
    if (act === 'place') {
      const creation = view.state.creation;
      const ability = target.dataset.ability;
      if (!creation) return;
      if (view.held == null) {
        const index = creation.assignments[ability];
        if (index == null) return;
        delete creation.assignments[ability];
        view.held = index;
        paint();
        return;
      }
      UIRPG.Run.assign(view.state, view.held, ability);
      view.held = null;
      paint();
      return;
    }
    if (act === 'toggle-sheet') {
      view.sheetOpen = !view.sheetOpen;
      paint();
      return;
    }
    if (act === 'confirm-assign') {
      const result = UIRPG.Run.confirmAssign(view.state, view.content, Math.random);
      if (!result.ok) view.state.notice = result.error;
      await after(() => {});
      return;
    }
    if (act === 'continue') {
      view.state.phase = 'play';
      await after(() => {});
      return;
    }
    if (act === 'to-table') {
      view.state.phase = 'table';
      view.state.recap = null;
      await after(() => {});
      return;
    }
    if (act === 'option') {
      const result = UIRPG.Run.choose(view.state, view.content, target.dataset.id);
      if (result && !result.ok) view.state.notice = result.error;
      await after(() => {});
      return;
    }
    if (act === 'move') {
      const result = UIRPG.Run.move(view.state, view.content, target.dataset.id);
      if (result && !result.ok && result.error) view.state.notice = result.error;
      view.hotExit = null;
      await after(() => {});
      return;
    }
    if (act === 'battle') {
      const result = UIRPG.Run.actBattle(view.state, view.content, target.dataset.id, Math.random);
      if (result && !result.ok && result.error) view.state.notice = result.error;
      await after(() => {});
      return;
    }
    if (act === 'spend-die') {
      UIRPG.Run.restSpend(view.state, view.content, Math.random);
      await after(() => {});
      return;
    }
    if (act === 'descend') {
      UIRPG.Run.descend(view.state, view.content, Math.random);
      await after(() => {});
      return;
    }
    if (act === 'take-pet') {
      UIRPG.Run.keepPet(view.state, true);
      await after(() => {});
      return;
    }
    if (act === 'keep-pet') {
      UIRPG.Run.keepPet(view.state, false);
      await after(() => {});
      return;
    }
    if (act === 'ask-abandon') {
      UIRPG.UI.Modal.confirm('Abandon this run? The table keeps your unlocks.', () => {});
    }
  }

  boot();
})();
