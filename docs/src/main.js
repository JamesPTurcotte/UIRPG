(function () {
  const AUTO_CYCLE = ['off', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unique'];

  const SAVE_INTERVAL = 5000;

  let state = null;
  let frameId = null;
  let lastTime = 0;
  let unsubHardcore = null;
  let unsubAutoEquip = null;
  let lastSave = 0;
  let dragIdx = -1;
  let dragHappened = false;
  let clickCandidate = null;
  let dragEquipSlot = null;

  let listenersRegistered = false;

  function init() {
    if (!listenersRegistered) {
      listenersRegistered = true;
      document.addEventListener('click', onClick);
      document.addEventListener('dragstart', onDragStart);
      document.addEventListener('dragover', onDragOver);
      document.addEventListener('drop', onDrop);
      document.addEventListener('dragend', onDragEnd);
      document.addEventListener('click', function(e) {
        if (!document.body.contains(e.target)) return;
        if (!e.target.closest('.dropdown')) closeMenus();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (state) state.saveTime = Date.now();
        } else {
          const now = Date.now();
          const elapsed = now - (state?.saveTime || now);
          if (elapsed > SAVE_INTERVAL) {
            const OFFLINE_MODAL_MIN = 60000;
            const summary = UIRPG.Engine.simulateOffline(state, elapsed);
            state.saveTime = now;
            UIRPG.Characters.saveCharacterState(state);
            render();
            if (summary && summary.elapsed > 0 && elapsed > OFFLINE_MODAL_MIN) {
              UIRPG.UI.Modal.openOfflineSummary(summary);
            }
          }
        }
      });
    }

    // Show character selection
    const characters = UIRPG.Characters.getCharacterList();
    UIRPG.UI.Modal.openCharacterSelect(loadAndStartCharacter);
  }

  let uiReady = false;

  function loadAndStartCharacter(characterId) {
    state = UIRPG.Characters.loadCharacter(characterId);
    if (!state) {
      state = UIRPG.State.create();
    }

    window.__state = state;

    const now = Date.now();
    const elapsed = state.saveTime ? now - state.saveTime : 0;
    const OFFLINE_MODAL_MIN = 60000;
    if (elapsed > SAVE_INTERVAL) {
      const summary = UIRPG.Engine.simulateOffline(state, elapsed);
      if (summary && summary.elapsed > 0 && elapsed > OFFLINE_MODAL_MIN) {
        UIRPG.UI.Modal.openOfflineSummary(summary);
      }
    }
    state.saveTime = now;

    UIRPG.Characters.saveCharacterState(state);

    if (!uiReady) {
      uiReady = true;
      UIRPG.UI.Layout.init();
      document.getElementById('inv-toolbar').addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('inv-filter')) {
          const filter = e.target.dataset.filter;
          if (filter) { UIRPG.Actions.setFilter(state, filter); UIRPG.Characters.saveCharacterState(state); UIRPG.UI.Render.all(); }
          return;
        }
        const tab = e.target.closest('[data-tab]');
        if (tab) {
          const t = tab.dataset.tab;
          if (t && t !== state.activeTab) { UIRPG.Actions.switchTab(state, t); UIRPG.Characters.saveCharacterState(state); UIRPG.UI.Render.all(); }
        }
      });
      document.getElementById('inventory-list').addEventListener('mousedown', function(e) {
        const itemEl = e.target.closest('.inv-item');
        if (!itemEl) return;
        clickCandidate = { idx: parseInt(itemEl.dataset.idx), source: state.activeTab === 'bank' ? 'bank' : 'inv', didDrag: false };
      });
      document.getElementById('equip-panel').addEventListener('mousedown', function(e) {
        if (e.target.closest('[data-action="toggle-equip-lock"]')) return;
        const slot = e.target.closest('.equip-slot');
        if (!slot) return;
        const kind = slot.dataset.kind;
        if (!state.equipment[kind]) return;
        clickCandidate = { idx: kind, source: 'equip', didDrag: false };
      });
      document.getElementById('equip-panel').addEventListener('dragstart', function(e) {
        const slot = e.target.closest('.equip-slot');
        if (!slot) return;
        const kind = slot.dataset.kind;
        if (!state.equipment[kind]) return;
        dragEquipSlot = kind;
        if (clickCandidate) clickCandidate.didDrag = true;
        dragHappened = true;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', kind);
      });
      document.addEventListener('mouseup', function(e) {
        if (clickCandidate && !clickCandidate.didDrag) {
          const c = clickCandidate;
          clickCandidate = null;
          if (c.source === 'equip') { UIRPG.UI.Crafting.open(state, c.idx, 'equip'); }
          else { const arr = c.source === 'bank' ? state.bank : state.inventory; if (arr[c.idx]) UIRPG.UI.Crafting.open(state, c.idx, c.source); }
        } else { clickCandidate = null; }
      });
      document.getElementById('inventory-list').addEventListener('mouseover', function(e) {
        const itemEl = e.target.closest('.inv-item');
        if (!itemEl) { UIRPG.UI.Render.hideCompare(); return; }
        const idx = parseInt(itemEl.dataset.idx);
        const source = state.activeTab === 'bank' ? 'bank' : 'inv';
        const arr = source === 'bank' ? state.bank : state.inventory;
        if (!arr[idx]) { UIRPG.UI.Render.hideCompare(); return; }
        UIRPG.UI.Render.showCompare(state, arr[idx], e.clientX, e.clientY);
      });
      document.getElementById('inventory-list').addEventListener('mouseleave', function() { UIRPG.UI.Render.hideCompare(); });

      UIRPG.UI.Surface.wrapAll({
        'action-square': { title: '' },
        'equip-panel': { title: '' },
        'logs-area': { title: '' },
        'inventory-panel': { title: '' },
      });
    }

    if (!state.player.name || state.player.name === 'Adventurer') {
      UIRPG.UI.Modal.openName(state.player.name || 'Adventurer', name => {
        state.player.name = name;
        UIRPG.Save.save(state);
        UIRPG.UI.Render.all();
      });
    }

    if (frameId) cancelAnimationFrame(frameId);
    lastTime = performance.now();
    frameId = requestAnimationFrame(loop);

    if (unsubHardcore) unsubHardcore();
    if (unsubAutoEquip) unsubAutoEquip();

    unsubHardcore = UIRPG.Events.on('player:hardcoreDeath', () => {
      UIRPG.UI.Modal.openCharacterSelect(loadAndStartCharacter);
    });

    let autoEquipGuard = false;
    unsubAutoEquip = UIRPG.Events.on('inventory:changed', () => {
      if (state && state.autoEquipEnabled && !autoEquipGuard) {
        autoEquipGuard = true;
        UIRPG.Actions.autoEquip(state);
        autoEquipGuard = false;
      }
    });
  }

  function closeMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(m => {
      m.classList.remove('open', 'flip-up');
    });
  }

  function loop(now) {
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;

    UIRPG.Engine.resolveTick(state, dt);
    render();
    if (now - lastSave >= SAVE_INTERVAL) {
      lastSave = now;
      state.saveTime = Date.now();
      UIRPG.Save.save(state);
    }

    frameId = requestAnimationFrame(loop);
  }

  function render() {
    UIRPG.UI.Render.all();
  }

  function onClick(e) {
    const target = e.target;

    if (target === document.getElementById('player-name') || target.closest('#player-name')) {
      UIRPG.UI.Modal.openResetConfirm(state);
      return;
    }

    if (target.classList.contains('title') || target.closest('.title')) {
      UIRPG.UI.Modal.openCharacterSelect(loadAndStartCharacter);
      return;
    }

    if (target.classList.contains('inv-auto')) {
      const cur = state.autoSalvage || 'off';
      const idx = AUTO_CYCLE.indexOf(cur);
      const next = AUTO_CYCLE[(idx + 1) % AUTO_CYCLE.length];
      UIRPG.Actions.setAutoSalvage(state, next);
      saveAndRender();
      return;
    }

    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    function showMenu(menu) {
      document.querySelectorAll('.dropdown-menu.open').forEach(m => {
        if (m !== menu) { m.classList.remove('open', 'flip-up'); }
      });
      menu.classList.remove('flip-up');
      menu.classList.add('open');
      void menu.offsetHeight;
      if (menu.getBoundingClientRect().bottom > window.innerHeight - 4) {
        menu.classList.add('flip-up');
      }
    }

    if (action === 'switch-fight') {
      const menu = document.getElementById('zone-dropdown-menu');
      if (menu) {
        menu.innerHTML =
          `<div class="dropdown-item" data-action="fight-select-zones">Zones <span class="locked" style="font-size:9px;">[${UIRPG.Utils.esc(state.zone)}]</span></div>` +
          `<div class="dropdown-item">Dungeon</div>`;
        showMenu(menu);
      }
      UIRPG.Actions.setActivity(state, 'fight');
      saveAndRender();
    } else if (action === 'fight-select-zones') {
      const menu = document.getElementById('zone-dropdown-menu');
      if (menu) {
        menu.innerHTML =
          `<div class="dropdown-item" data-action="fight-back-to-main">◀ Back</div>` +
          UIRPG.Data.ZONES.map(z =>
            `<div class="dropdown-item ${z.name === state.zone ? 'active' : ''}" data-action="select-zone" data-value="${UIRPG.Utils.esc(z.name)}">${UIRPG.Utils.esc(z.name)}</div>`
          ).join('');
        showMenu(menu);
      }
      saveAndRender();
    } else if (action === 'fight-back-to-main') {
      const menu = document.getElementById('zone-dropdown-menu');
      if (menu) {
        menu.innerHTML =
          `<div class="dropdown-item" data-action="fight-select-zones">Zones <span class="locked" style="font-size:9px;">[${UIRPG.Utils.esc(state.zone)}]</span></div>` +
          `<div class="dropdown-item">Dungeon</div>`;
        showMenu(menu);
      }
      saveAndRender();
    } else if (action === 'switch-fish') {
      UIRPG.Actions.setActivity(state, 'fish');
      const menu = document.getElementById('fish-dropdown-menu');
      if (menu) {
        const fp = UIRPG.Fishing.fishingPower(state);
        menu.innerHTML = UIRPG.Data.FISHING_SPOTS.map(sp => {
          const locked = fp < (sp.minFishingPower || 0);
          const req = sp.minFishingPower ? ` [FP ${sp.minFishingPower}]` : '';
          return `<div class="dropdown-item ${sp.id === state.fishingSpot ? 'active' : ''}" data-action="select-fish-spot" data-value="${UIRPG.Utils.esc(sp.id)}"${locked ? ' data-locked=""' : ''}>${UIRPG.Utils.esc(sp.name)}${req}</div>`;
        }).join('');
        showMenu(menu);
      }
      saveAndRender();
    } else if (action === 'select-zone') {
      const name = el.dataset.value;
      if (name && !el.hasAttribute('data-locked')) {
        UIRPG.Actions.changeZone(state, name);
        closeMenus();
        saveAndRender();
      }
    } else if (action === 'select-fish-spot') {
      const id = el.dataset.value;
      if (id && !el.hasAttribute('data-locked')) {
        UIRPG.Actions.changeFishingSpot(state, id);
        closeMenus();
        saveAndRender();
      }
    } else if (action === 'stats') {
      UIRPG.UI.Modal.openStats(state);
    } else if (action === 'change-zone') {
      UIRPG.Actions.changeZone(state, el.dataset.zone);
      saveAndRender();
      UIRPG.UI.Modal.close();
    } else if (action === 'allocate') {
      UIRPG.Actions.allocateStat(state, el.dataset.stat);
      saveAndRender();
      UIRPG.UI.Modal.openStats(state);
    } else if (action === 'reset-stats') {
      UIRPG.Actions.resetStats(state);
      saveAndRender();
      UIRPG.UI.Modal.openStats(state);
    } else if (action === 'spread-stats') {
      UIRPG.Actions.spreadStats(state);
      saveAndRender();
      UIRPG.UI.Modal.openStats(state);
    } else if (action === 'close-modal') {
      UIRPG.UI.Modal.close();
    } else if (action === 'salvage') {
      UIRPG.UI.Modal.openSalvage(state, () => {
        UIRPG.Actions.salvageAll(state);
        saveAndRender();
      });
    } else if (action === 'enchant-item') {
      if (el.classList.contains('disabled')) return;
      const idx = el.dataset.idx;
      const source = el.dataset.source || 'inv';
      if (source === 'equip') {
        UIRPG.Actions.enchantEquipped(state, idx);
      } else {
        const arr = source === 'bank' ? state.bank : state.inventory;
        UIRPG.Actions.enchantItem(state, parseInt(idx), arr);
      }
      saveAndRender();
      UIRPG.UI.Crafting.open(state, source === 'equip' ? idx : parseInt(idx), source);
    } else if (action === 'equip-item') {
      const idx = parseInt(el.dataset.idx);
      const source = el.dataset.source || 'inv';
      const arr = source === 'bank' ? state.bank : state.inventory;
      UIRPG.Actions.equipItem(state, idx, arr);
      saveAndRender();
      UIRPG.UI.Modal.close();
    } else if (action === 'unequip-item') {
      const slot = el.dataset.idx;
      UIRPG.Actions.unequipItem(state, slot);
      saveAndRender();
      UIRPG.UI.Modal.close();
    } else if (action === 'salvage-item') {
      const idx = parseInt(el.dataset.idx);
      UIRPG.Actions.salvageItem(state, idx);
      saveAndRender();
      UIRPG.UI.Modal.close();
    } else if (action === 'toggle-lock') {
      const idx = parseInt(el.dataset.idx);
      const source = el.dataset.source || 'inv';
      const arr = source === 'bank' ? state.bank : state.inventory;
      UIRPG.Actions.toggleLock(state, idx, arr);
      saveAndRender();
      UIRPG.UI.Crafting.open(state, idx, source);
    } else if (action === 'auto-equip') {
      UIRPG.Actions.autoEquip(state);
      saveAndRender();
    } else if (action === 'toggle-auto-equip') {
      UIRPG.Actions.setAutoEquip(state);
      saveAndRender();
    } else if (action === 'toggle-equip-lock') {
      const slot = el.dataset.slot;
      if (slot) {
        UIRPG.Actions.toggleEquipLock(state, slot);
        saveAndRender();
      }
    }
  }

  function onDragStart(e) {
    const el = e.target.closest('.inv-item');
    if (!el) return;
    if (clickCandidate) clickCandidate.didDrag = true;
    dragIdx = parseInt(el.dataset.idx);
    dragHappened = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragIdx));
  }

  function onDragOver(e) {
    document.querySelectorAll('.drag-over, .drag-over-tab').forEach(el => el.classList.remove('drag-over', 'drag-over-tab'));
    const slot = e.target.closest('.equip-slot, #inventory-list, [data-tab]');
    if (slot) {
      e.preventDefault();
      slot.classList.add('drag-over');
      if (slot.dataset && slot.dataset.tab) {
        slot.classList.add('drag-over-tab');
      }
    }
  }

  function onDrop(e) {
    document.querySelectorAll('.drag-over, .drag-over-bank, .drag-over-tab').forEach(el => el.classList.remove('drag-over', 'drag-over-bank', 'drag-over-tab'));

    // Handle equipment slot drag to inventory or bank
    if (dragEquipSlot) {
      const slot = dragEquipSlot;
      dragEquipSlot = null;

      // Drop on inventory list
      const invList = e.target.closest('#inventory-list');
      if (invList) {
        const item = state.equipment[slot];
        if (item) {
          const cap = state.activeTab === 'bank' ? UIRPG.State.bankCap(state) : UIRPG.State.invCap(state);
          const arr = state.activeTab === 'bank' ? state.bank : state.inventory;
          if (arr.length < cap) {
            if (item.kind === 'fish' && item.maxUses) item.uses = item.maxUses;
            state.equipment[slot] = null;
            arr.push(item);
            UIRPG.State.addGameLog(state, `Unequipped ${UIRPG.Drops.displayName(item)}`, 'subtle');
            const stats = UIRPG.State.computeStats(state);
            if (state.player.hp > stats.maxHp) state.player.hp = stats.maxHp;
            UIRPG.Events.emit('inventory:changed');
            UIRPG.Events.emit('equipment:changed');
            saveAndRender();
          }
        }
        return;
      }

      // Drop on bank tab
      const tab = e.target.closest('[data-tab]');
      if (tab && tab.dataset.tab === 'bank') {
        const item = state.equipment[slot];
        if (item) {
          const cap = UIRPG.State.bankCap(state);
          if (state.bank.length < cap) {
            if (item.kind === 'fish' && item.maxUses) item.uses = item.maxUses;
            state.equipment[slot] = null;
            state.bank.push(item);
            UIRPG.State.addGameLog(state, `Moved ${UIRPG.Drops.displayName(item)} to bank`, 'subtle');
            const stats = UIRPG.State.computeStats(state);
            if (state.player.hp > stats.maxHp) state.player.hp = stats.maxHp;
            UIRPG.Events.emit('inventory:changed');
            UIRPG.Events.emit('equipment:changed');
            saveAndRender();
          }
        }
        return;
      }

      // Drop on inv tab
      if (tab && tab.dataset.tab === 'inv') {
        const item = state.equipment[slot];
        if (item) {
          const cap = UIRPG.State.invCap(state);
          if (state.inventory.length < cap) {
            if (item.kind === 'fish' && item.maxUses) item.uses = item.maxUses;
            state.equipment[slot] = null;
            state.inventory.push(item);
            UIRPG.State.addGameLog(state, `Moved ${UIRPG.Drops.displayName(item)} to inventory`, 'subtle');
            const stats = UIRPG.State.computeStats(state);
            if (state.player.hp > stats.maxHp) state.player.hp = stats.maxHp;
            UIRPG.Events.emit('inventory:changed');
            UIRPG.Events.emit('equipment:changed');
            saveAndRender();
          }
        }
        return;
      }
      return;
    }

    if (dragIdx < 0) return;

    const tab = e.target.closest('[data-tab]');
    if (tab) {
      const fromBank = state.activeTab === 'bank';
      const targetTab = tab.dataset.tab;
      if (fromBank && targetTab === 'inv') {
        UIRPG.Actions.moveToInventory(state, dragIdx);
      } else if (!fromBank && targetTab === 'bank') {
        UIRPG.Actions.moveToBank(state, dragIdx);
      }
      saveAndRender();
      dragIdx = -1;
      return;
    }

    const slot = e.target.closest('.equip-slot');
    if (!slot) return;
    const slotKind = slot.dataset.kind;
    if (!slotKind) return;

    const fromBank = state.activeTab === 'bank';
    const arr = fromBank ? state.bank : state.inventory;
    const item = arr[dragIdx];
    if (!item) return;

    let equipSlot = slotKind;
    if (item.kind === 'ring' && (slotKind === 'ring1' || slotKind === 'ring2')) {
      equipSlot = slotKind;
    } else if (item.kind !== slotKind) {
      return;
    }

    const old = state.equipment[equipSlot];
    state.equipment[equipSlot] = item;
    arr.splice(dragIdx, 1);
    if (old) {
      if (arr === state.bank) state.bank.push(old);
      else state.inventory.push(old);
    }

    UIRPG.State.addGameLog(state, `Equipped ${UIRPG.Drops.displayName(item)}`, 'subtle');
    const stats = UIRPG.State.computeStats(state);
    if (state.player.hp > stats.maxHp) state.player.hp = stats.maxHp;
    UIRPG.Events.emit('inventory:changed');
    UIRPG.Events.emit('equipment:changed');

    saveAndRender();
    dragIdx = -1;
  }

  function onDragEnd() {
    document.querySelectorAll('.drag-over, .drag-over-bank, .drag-over-tab').forEach(el => el.classList.remove('drag-over', 'drag-over-bank', 'drag-over-tab'));
    dragIdx = -1;
    dragEquipSlot = null;
    setTimeout(() => { dragHappened = false; }, 0);
  }

  function saveAndRender() {
    UIRPG.Save.save(state);
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
