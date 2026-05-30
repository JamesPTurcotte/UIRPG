UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Render = (() => {
  function $(id) { return document.getElementById(id); }

  const esc = UIRPG.Utils.esc;

  const FILTER_MAP = {
    main_hand: 'Wep', off_hand: 'Off', helmet: 'Helm', chest: 'Chest',
    leggings: 'Legs', boots: 'Boots', gloves: 'Gloves',
    ring: 'Ring', belt: 'Belt', amulet: 'Amulet',
  };

  const DEFENCE_SLOTS = ['off_hand', 'helmet', 'chest', 'leggings', 'boots', 'gloves', 'belt'];

  function statRow(label, value, valueCls) {
    const vc = valueCls ? ` ${valueCls}` : '';
    return `<div class="dot-row"><span class="dot-label">${esc(label)}</span><span class="dot-filler"></span><span class="dot-value${vc}">${esc(value)}</span></div>`;
  }

  function rarityClass(r) { return r || 'Common'; }

  function displayName(item) {
    return UIRPG.Drops.displayName(item);
  }

  function itemStats(item) {
    return UIRPG.Drops.itemStats(item);
  }

  function weaponStats(item) {
    if (item.kind !== 'main_hand') return [];
    const lines = [];
    if (item.minAtk !== undefined) {
      const bonusAtk = item.atk || 0;
      const avg = ((item.minAtk + bonusAtk) + (item.maxAtk || item.minAtk) + bonusAtk) / 2;
      const dps = Math.round(avg / ((item.attackSpeed || 2000) / 1000) * 10) / 10;
      lines.push(`${dps} DPS`);
    }
    if (item.attackSpeed) lines.push(`${item.attackSpeed}ms`);
    if (item.critChance) lines.push(`+${item.critChance}% Crit`);
    if (item.critDmg) lines.push(`+${Math.round(item.critDmg * 100)}% CDmg`);
    return lines;
  }

  function primaryValue(item) {
    if (!item) return 0;
    if (item.kind === 'main_hand') return UIRPG.State.weaponDps(item);
    if (DEFENCE_SLOTS.includes(item.kind)) return Math.max(item.armorRating || 0, item.evasionRating || 0);
    if (item.kind === 'ring') return (item.bonusStr || 0) + (item.bonusDex || 0) + (item.bonusLuck || 0) + (item.bonusVit || 0) + (item.atk || 0) + (item.moveSpeed || 0);
    if (item.kind === 'amulet') return (item.maxHpBonus || 0) + (item.moveSpeed || 0) + (item.searchSpeed || 0) + (item.flatBlock || 0) + (item.lifeOnHit || 0) + (item.thorns || 0);
    if (item.kind === 'rod') return item.fishingPower || 0;
    if (item.kind === 'bait') return (item.fishingPower || 0) + (item.catchSpeed || 0) + (item.treasureChance || 0);
    if (item.kind === 'fish') return (item.healAmount || 0) * (item.maxUses || 1);
    return 0;
  }

  const WEAPON_STAT_SKIP = ['ATK', 'Crit', 'CDmg'];

  let logEntryCount = 0;

  function renderLog(el, logArray) {
    if (!logArray) { el.innerHTML = ''; return; }
    const hadNewEntries = logArray.length !== logEntryCount;
    logEntryCount = logArray.length;
    el.innerHTML = logArray.slice(-30).reverse().map(entry => {
      const text = entry.count > 1 ? `${entry.msg} *${entry.count}` : entry.msg;
      const cls = entry.type || 'info';
      return `<div class="log-entry ${cls}">${esc(text)}</div>`;
    }).join('');
    if (hadNewEntries) el.scrollTop = 0;
  }

  function showCompare(state, item, cx, cy) {
    const el = $('#compare-tooltip');
    if (!el) return;
    let equipSlot = item.kind;
    if (item.kind === 'ring') {
      equipSlot = state.equipment.ring1 ? 'ring1' : 'ring2';
    }
    const equipped = state.equipment[equipSlot];
    if (!equipped) { hideCompare(); return; }

    const iStats = itemStats(item);
    const eStats = itemStats(equipped);
    const iWeapon = weaponStats(item);
    const eWeapon = weaponStats(equipped);

    el.innerHTML = `
      <div class="compare-col">
        <div class="compare-label">Inventory</div>
        <div class="compare-name ${rarityClass(item.rarity)}">${esc(displayName(item))}</div>
        ${iWeapon.map(s => `<div class="compare-stat">${esc(s)}</div>`).join('')}
        ${iStats.map(s => `<div class="compare-stat">${esc(s)}</div>`).join('')}
      </div>
      <div class="compare-vs">vs</div>
      <div class="compare-col">
        <div class="compare-label">Equipped</div>
        <div class="compare-name ${rarityClass(equipped.rarity)}">${esc(displayName(equipped))}</div>
        ${eWeapon.map(s => `<div class="compare-stat">${esc(s)}</div>`).join('')}
        ${eStats.map(s => `<div class="compare-stat">${esc(s)}</div>`).join('')}
      </div>
    `;
    el.style.position = 'fixed';
    el.style.left = Math.min(cx + 12, window.innerWidth - 330) + 'px';
    el.style.top = Math.min(cy - 10, window.innerHeight - el.offsetHeight - 12) + 'px';
    el.classList.remove('hidden');
  }

  function hideCompare() {
    const el = $('#compare-tooltip');
    if (el) el.classList.add('hidden');
  }

  function renderActionBar(s) {
    const btnFight = document.getElementById('btn-fight');
    const btnFish = document.getElementById('btn-fish');
    if (btnFight) btnFight.className = s.activity === 'fight' ? 'active' : '';
    if (btnFish) btnFish.className = s.activity === 'fish' ? 'active' : '';
  }

  function renderCombatUI(s) {
    const e = s.currentEnemy;
    const stats = UIRPG.State.computeStats(s);

    const drPct = Math.round(UIRPG.State.calcDR(stats.armorRating));
    const dodgePct = Math.round(UIRPG.State.calcDodge(stats.evasionRating));
    const hitPct = e && e.hp > 0 && !s.searching
      ? Math.round(Math.max(5, Math.min(95, stats.accuracyRating / (stats.accuracyRating + (e.evasion || 0) * 3) * 100)))
      : null;

    const armDisplay = `${stats.armorRating} (${drPct}%)`;
    const evaDisplay = `${stats.evasionRating} (${dodgePct}%)`;
    const accDisplay = hitPct !== null ? `${stats.accuracyRating} (${hitPct}%)` : `${stats.accuracyRating}`;

    const playerRows = [
      ['HEAL', s.fishConsumeUses > 0 && s.equipment.fish ? `${Math.max(0, s.fishConsumeUses * (s.equipment.fish.healAmount || 10))} HP in ${s.fishConsumeUses} bites` : '--'],
      ['ATK', `${stats.atkDmg}`],
      ['AS', `${stats.attackSpeed}ms`],
      ['ARM', armDisplay],
      ['EVA', evaDisplay],
      ['DODGE', `${stats.dodgeChance > 0 ? stats.dodgeChance + '%' : '0%'}`],
      ['BLOCK', `${stats.flatBlock > 0 ? stats.flatBlock : '0'}`],
      ['ACC', accDisplay],
      ['CRIT', `${Math.round(stats.critChance)}% / +${Math.round((UIRPG.State.BALANCE.BASE_CRIT_MULT - 1 + (stats.critDmgBonus || 0)) * 100)}% CDmg`],
      ['XP', `+${Math.round((stats.xpMult - 1) * 100)}%`],
      ['GF', `+${Math.round((stats.goldMult - 1) * 100)}%`],
      ['SPD', `${Math.round(stats.monsterFindSpeed * 100)}%`],
      ['STR', `${UIRPG.State.effectiveStr(s)}`],
      ['DEX', `${UIRPG.State.effectiveDex(s)}`],
      ['LCK', `${UIRPG.State.effectiveLuck(s)}`],
      ['VIT', `${UIRPG.State.effectiveVit(s)}`],
    ];
    $('player-stats').innerHTML = playerRows.map(([l, v]) => statRow(l, v)).join('');

    const enemyNameEl = $('enemy-name');
    const enemyHpBar = $('enemy-hp-bar');
    const enemyHpText = $('enemy-hp-text');
    const enemyHpBarContainer = $('enemy-hp-bar-container');
    const enemyStats = $('enemy-stats');

    const enemyHpTextContainer = document.getElementById('enemy-hp-text-container');
    if (enemyHpTextContainer) enemyHpTextContainer.classList.remove('hidden');

    if (s.searching || !e || e.hp <= 0) {
      enemyNameEl.textContent = 'Searching...';
      enemyHpBar.style.width = '0%';
      enemyHpText.textContent = '--/--';
      enemyHpBarContainer.classList.add('hidden');
      enemyStats.innerHTML = [
        ['ATK', '--', 'dim'], ['DEF', '--', 'dim'], ['EVA', '--', 'dim'],
        ['ACC', '--', 'dim'], ['REGEN', '--', 'dim'], ['XP', '--', 'dim'],
        ['GOLD', '--', 'dim'], ['SEARCH', `${Math.max(0, Math.ceil(s.downtime))}ms`],
      ].map(([l, v, c]) => statRow(l, v, c)).join('');
    } else {
      enemyNameEl.textContent = e.name;
      const ePct = e.maxHp > 0 ? (Math.max(0, e.hp) / e.maxHp * 100) : 0;
      enemyHpBar.style.width = `${ePct}%`;
      enemyHpText.textContent = `${Math.max(0, e.hp)}/${e.maxHp}`;
      enemyHpBarContainer.classList.remove('hidden');
      enemyStats.innerHTML = [
        ['ATK', `${e.atk}`], ['DEF', `${e.def}`], ['EVA', `${e.evasion}`],
        ['ACC', `${e.accuracy}`], ['XP', `${e.xp}`], ['GOLD', `${e.gold}`],
      ].map(([l, v]) => statRow(l, v)).join('');
    }

    $('fishing-spot-info').classList.add('hidden');
    $('fishing-cast-bar-container').classList.add('hidden');
    $('fishing-last-catch').classList.add('hidden');
  }

  function renderFishingUI(s) {
    const stats = UIRPG.State.computeStats(s);
    const spot = UIRPG.Data.findFishingSpot(s.fishingSpot);
    const fp = UIRPG.Fishing.fishingPower(s);

    const playerRows = [
      ['FISH PW', `${fp}`],
      ['CAST', `${stats.catchSpeed || 0}%`],
      ['TRSR', `${stats.treasureChance || 0}%`],
      ['CAUGHT', `${s.fishCaught || 0}`],
      ['LCK', `${UIRPG.State.effectiveLuck(s)}`],
      ['STR', `${UIRPG.State.effectiveStr(s)}`],
      ['DEX', `${UIRPG.State.effectiveDex(s)}`],
      ['VIT', `${UIRPG.State.effectiveVit(s)}`],
      ['XP', `+${Math.round((stats.xpMult - 1) * 100)}%`],
      ['GF', `+${Math.round((stats.goldMult - 1) * 100)}%`],
    ];
    $('player-stats').innerHTML = playerRows.map(([l, v]) => statRow(l, v)).join('');

    const enemyNameEl = $('enemy-name');
    const enemyHpBar = $('enemy-hp-bar');
    const enemyHpText = $('enemy-hp-text');
    const enemyHpBarContainer = $('enemy-hp-bar-container');
    const enemyStats = $('enemy-stats');
    const spotInfo = $('fishing-spot-info');
    const castBarContainer = $('fishing-cast-bar-container');
    const castBar = $('fishing-cast-bar');
    const lastCatch = $('fishing-last-catch');

    enemyHpBarContainer.classList.add('hidden');
    const enemyHpTextContainer = document.getElementById('enemy-hp-text-container');
    if (enemyHpTextContainer) enemyHpTextContainer.classList.add('hidden');
    enemyStats.innerHTML = '';

    if (spot) {
      enemyNameEl.textContent = spot.name;
      enemyHpText.textContent = '';

      const catchAt = spot.catchTime;
      const pct = Math.min(100, Math.max(0, (s.fishingTimer || 0) / catchAt * 100));
      castBarContainer.classList.remove('hidden');
      castBar.style.width = `${pct}%`;

      const fishList = spot.fish.map(f => `${f.name}`).join(', ');
      let castLine = `Cast: ${Math.round(s.fishingTimer || 0)}/${catchAt}ms`;
      if (s.fishingCooldown > 0) castLine = `Anticipating: ${Math.ceil(s.fishingCooldown)}ms`;
      spotInfo.innerHTML = `<div class="bl">Fish: ${fishList}</div><div class="bl">${castLine}</div>`;
      spotInfo.classList.remove('hidden');
    } else {
      enemyNameEl.textContent = 'No spot selected';
      enemyHpText.textContent = '';
      castBarContainer.classList.add('hidden');
      spotInfo.classList.add('hidden');
    }

    lastCatch.classList.add('hidden');
  }

  function renderEquipment(s) {
    const eq = s.equipment;
    const SLOT_IDS = ['main_hand', 'off_hand', 'helmet', 'chest', 'leggings', 'boots', 'gloves', 'ring1', 'ring2', 'belt', 'amulet', 'rod', 'bait', 'fish'];
    const locks = s.equipLocks || {};
    SLOT_IDS.forEach(slot => {
      const lockEl = document.querySelector(`[data-action="toggle-equip-lock"][data-slot="${slot}"]`);
      if (lockEl) {
        const locked = locks[slot];
        lockEl.textContent = locked ? '◆' : '◇';
        lockEl.className = `equip-lock ${locked ? 'locked' : 'unlocked'}`;
      }
      const id = `${slot}-slot`;
      const el = $(id);
      if (!el) return;
      const item = eq[slot];
      el.dataset.kind = slot;
      if (item) {
        let t = displayName(item);
        const b = itemStats(item);
        const w = weaponStats(item);
        const extra = w.concat(item.kind === 'main_hand' ? b.filter(s => !WEAPON_STAT_SKIP.some(k => s.includes(k))) : b);
        if (extra.length) t += ` (${extra.join(', ')})`;
        el.textContent = t;
        el.className = `slot-item ${rarityClass(item.rarity)}`;
        el.draggable = true;
      } else {
        el.textContent = 'empty';
        el.className = 'slot-empty';
        el.draggable = false;
      }
    });
  }

  function renderInventory(s) {
    const isInv = s.activeTab !== 'bank';
    const invCap = UIRPG.State.invCap(s);
    const bankCap = UIRPG.State.bankCap(s);
    const titleEl = document.getElementById('panel-title');
    if (titleEl) {
      titleEl.textContent = isInv
        ? `Inventory (${s.inventory.length}/${invCap})`
        : `Bank (${s.bank.length}/${bankCap})`;
    }

    const tabCls = (t) => 'inv-tab' + (s.activeTab === t ? ' active' : '');

    // Update tab classes and visibility (elements persist in HTML, not rebuilt)
    document.querySelector('[data-tab="inv"] > .inv-tab').className = tabCls('inv');
    document.querySelector('[data-tab="bank"] > .inv-tab').className = tabCls('bank');
    const itemsWrap = document.querySelector('[data-tab="items"]');
    const currenciesWrap = document.querySelector('[data-tab="currencies"]');
    if (itemsWrap) {
      itemsWrap.style.display = s.activeTab === 'bank' ? '' : 'none';
      if (s.activeTab === 'bank') itemsWrap.querySelector('.inv-tab').className = tabCls('items');
    }
    if (currenciesWrap) {
      currenciesWrap.style.display = s.activeTab === 'bank' ? '' : 'none';
      if (s.activeTab === 'bank') currenciesWrap.querySelector('.inv-tab').className = tabCls('currencies');
    }

    // Only rebuild the filters container
    const activeFilter = s.inventoryFilter || 'all';
    const filters = ['all', 'main_hand', 'off_hand', 'helmet', 'chest', 'leggings', 'boots', 'gloves', 'ring', 'belt', 'amulet', 'rod', 'bait', 'fish'];
    let fHtml = '';
    for (const f of filters) {
      const label = FILTER_MAP[f] || f.charAt(0).toUpperCase() + f.slice(1);
      const cls = f === activeFilter ? 'inv-filter active' : 'inv-filter';
      fHtml += `<button type="button" class="${cls}" data-filter="${f}">${label}</button>`;
    }
    const fc = document.getElementById('inv-filters-container');
    if (fc) fc.innerHTML = fHtml;

    const autoEl = document.getElementById('inv-auto');
    if (autoEl) {
      if (isInv) {
        const autoLabel = s.autoSalvage === 'off' ? 'Off' : s.autoSalvage;
        autoEl.textContent = `[Auto: ${autoLabel}]`;
        autoEl.classList.remove('hidden');
      } else {
        autoEl.classList.add('hidden');
      }
    }

    const salvageBtn = document.querySelector('.salvage-btn');
    if (salvageBtn) {
      salvageBtn.classList.toggle('hidden', !isInv);
    }

    const currencyListEl = document.getElementById('currency-list');
    const invListEl = $('inventory-list');

    if (s.activeTab === 'bank' && s.bankTab === 'currencies') {
      invListEl.classList.add('hidden');
      currencyListEl.classList.remove('hidden');
      const currencies = s.currencies || {};
      const entries = Object.entries(currencies);
      if (!entries.length) {
        currencyListEl.innerHTML = '<div class="empty-text">no currencies</div>';
      } else {
        currencyListEl.innerHTML = entries.map(([id, count]) => {
          const found = UIRPG.Data.FISHING_SPOTS.flatMap(sp => sp.treasures || []).find(t => t.id === id);
          const name = found ? found.name : id;
          return `<div class="currency-entry">◆ ${esc(name)} <span class="currency-count">×${count}</span></div>`;
        }).join('');
      }
    } else {
      invListEl.classList.remove('hidden');
      currencyListEl.classList.add('hidden');

      const items = isInv ? s.inventory : s.bank;
      let filtered = items;
      if (activeFilter !== 'all') {
        filtered = items.filter(item => item.kind === activeFilter);
      }
      if (!filtered.length) {
        invListEl.innerHTML = '<div class="empty-text">empty</div>';
      } else {
        const idxMap = new Map();
        items.forEach((item, i) => idxMap.set(item, i));
        const sorted = [...filtered].sort((a, b) => primaryValue(b) - primaryValue(a) || 0);
        invListEl.innerHTML = sorted.map((item) => {
          const origIdx = idxMap.get(item);
          let d = displayName(item);
          const b = itemStats(item);
          const w = weaponStats(item);
          const extras = w.concat(item.kind === 'main_hand' ? b.filter(s => !WEAPON_STAT_SKIP.some(k => s.includes(k))) : b);
          if (extras.length) d += ` (${extras.join(', ')})`;
          const lockIcon = item.locked ? ' ◆' : '';
          const kindLabel = (item.kind || '?').charAt(0).toUpperCase() + (item.kind || '?').slice(1);
          return `<div class="inv-item ${rarityClass(item.rarity)}" data-idx="${origIdx}" draggable="true">${esc(d)}${lockIcon}<span class="item-action">[${kindLabel}]</span></div>`;
        }).join('');
      }
    }
  }

  function all() {
    const s = window.__state;
    if (!s) return;
    if (!Array.isArray(s.gameLog)) s.gameLog = [];
    const p = s.player;

    $('player-name').textContent = p.name || 'Adventurer';
    $('level').textContent = p.level;
    $('gold').textContent = p.gold;

    const ue = $('unspent-stats');
    const sp = p.statPoints;
    const auto = s.autoStatMode && s.autoStatMode !== 'off';
    if (auto && sp === 0) ue.textContent = 'Auto: ON';
    else ue.textContent = sp > 0 ? `${sp} unspent!` : `0 pts`;
    ue.className = 'unspent visible';

    $('hp-text').textContent = `${Math.max(0, p.hp)}/${UIRPG.State.computeStats(s).maxHp}`;

    const hpPct = UIRPG.State.computeStats(s).maxHp > 0 ? (Math.max(0, p.hp) / UIRPG.State.computeStats(s).maxHp * 100) : 0;
    const xpPct = p.xpNext > 0 ? (p.xp / p.xpNext * 100) : 0;
    $('player-hp-bar').style.width = `${hpPct}%`;
    $('xp-bar').style.width = `${Math.min(100, xpPct)}%`;

    if (s.activity === 'fish') {
      renderFishingUI(s);
    } else {
      renderCombatUI(s);
    }

    renderLog($('game-log'), s.gameLog);
    renderEquipment(s);
    renderInventory(s);
    renderActionBar(s);

    const autoEquipToggle = document.querySelector('.auto-equip-toggle');
    if (autoEquipToggle) {
      autoEquipToggle.textContent = s.autoEquipEnabled ? '[Auto: On]' : '[Auto: Off]';
    }
  }

  return { all, displayName, weaponStats, showCompare, hideCompare };
})();
