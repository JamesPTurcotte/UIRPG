UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Modal = (() => {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');

  function show(html) {
    content.innerHTML = html;
    modal.classList.remove('hidden');
  }

  function close() {
    modal.classList.add('hidden');
    content.innerHTML = '';
  }

  modal.addEventListener('click', function(e) {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  function openName(current, onConfirm) {
    let confirmed = false;
    function confirm() {
      if (confirmed) return;
      confirmed = true;
      close();
      onConfirm(input.value.trim() || current);
    }
    const html = `
      <div class="modal-title">◆ Choose Your Name</div>
      <div style="margin-bottom:12px;color:var(--text-dim);font-size:11px;">What shall your adventurer be called?</div>
      <input id="name-input" type="text" value="${esc(current)}" maxlength="20" style="width:100%;padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:13px;margin-bottom:14px;">
      <div class="modal-item" data-action="confirm-name" style="text-align:center;justify-content:center;color:var(--accent);font-weight:bold;">◆ Confirm</div>
    `;
    show(html);
    const input = document.getElementById('name-input');
    input.focus();
    input.select();
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirm();
    });
    content.querySelector('[data-action="confirm-name"]').addEventListener('click', confirm);
  }

  function openResetConfirm(s) {
    const html = `
      <div class="modal-title">◆ Reset Character</div>
      <div style="margin-bottom:10px;color:var(--text-dim);font-size:11px;">
        This will reset your character to level 1 and delete:
        <ul style="margin:8px 0;padding-left:20px;color:var(--danger);">
          <li>All inventory items</li>
          <li>All equipped items</li>
          <li>All gold and progress</li>
          <li>All stats and levels</li>
        </ul>
        <b style="color:var(--accent);">Bank items will NOT be deleted.</b>
      </div>
      <div style="display:flex;gap:8px;">
        <div class="modal-item" data-action="reset-character-yes" style="flex:1;justify-content:center;color:var(--danger);font-weight:bold;">◆ Yes, Reset</div>
        <div class="modal-item" data-action="close-modal" style="flex:1;justify-content:center;">Cancel</div>
      </div>
    `;
    show(html);
    content.querySelector('[data-action="reset-character-yes"]').addEventListener('click', () => {
      close();
      UIRPG.Actions.resetCharacter(s);
      UIRPG.Save.save(s);
      UIRPG.UI.Render.all();
    });
  }

  function openSalvage(s, onYes) {
    let total = 0;
    for (const item of s.inventory) {
      if (item.locked) continue;
      const r = UIRPG.Drops.RARITIES.find(r => r.name === item.rarity);
      total += r ? r.salvageGold : 2;
    }
    const unlocked = s.inventory.filter(i => !i.locked);
    if (!unlocked.length) {
      show('<div class="modal-title">◆ Salvage</div><div style="margin-bottom:12px;color:var(--text-dim);font-size:11px;">Nothing to salvage.</div><div class="close-hint" data-action="close-modal">close</div>');
      return;
    }
    const html = `
      <div class="modal-title">◆ Salvage All Items?</div>
      <div style="margin-bottom:10px;color:var(--text-dim);font-size:11px;">Turn <b style="color:var(--text);">${unlocked.length}</b> items into <b style="color:var(--accent);">${total} gold</b>?</div>
      <div style="display:flex;gap:8px;">
        <div class="modal-item" data-action="salvage-yes" style="flex:1;justify-content:center;color:var(--accent);font-weight:bold;">◆ Yes</div>
        <div class="modal-item" data-action="close-modal" style="flex:1;justify-content:center;">No</div>
      </div>
    `;
    show(html);
    content.querySelector('[data-action="salvage-yes"]').addEventListener('click', () => {
      close();
      onYes();
    });
  }

  function openStats(s) {
    const p = s.player;
    const B = UIRPG.State.BALANCE;
    const eStr = UIRPG.State.effectiveStr(s);
    const eDex = UIRPG.State.effectiveDex(s);
    const eLuck = UIRPG.State.effectiveLuck(s);
    const eVit = UIRPG.State.effectiveVit(s);
    const strDmgPct = Math.round(eStr * B.STR_DMG_SCALE * 100);
    const strArmPct = Math.round(eStr * B.STR_ARMOR_SCALE * 100);
    const dexEvaPct = Math.round(eDex * B.DEX_EVA_SCALE * 100);

    let html = '<div class="modal-title">◆ Stat Allocation</div>';
    html += `<div class="stat-points-label">You have <span class="highlight">${p.statPoints}</span> unspent point${p.statPoints !== 1 ? 's' : ''}</div>`;

    // Spread Evenly button at the top
    if (p.statPoints > 0) {
      html += `<div class="stat-row" style="margin-bottom:6px;">
        <div class="stat-info">
          <span class="stat-name">Spread Evenly</span>
          <div class="stat-effects">• Distribute ${p.statPoints} points across all stats</div>
        </div>
        <button class="stat-btn" data-action="spread-stats" style="font-size:12px;width:auto;padding:0 10px;">⟳</button>
      </div>`;
    }

    const stats = [
      { id: 'str', label: 'STR', val: p.str, eff: eStr,
        effects: [
          `+2% Armour per point (current: +${strArmPct}%)`,
          `+1% Damage per 5 STR (current: +${strDmgPct}%)`,
        ],
      },
      { id: 'dex', label: 'DEX', val: p.dex, eff: eDex,
        effects: [
          `+${dexEvaPct}% Evasion Effect each`,
          `+${B.ACC_PER_DEX} Accuracy Rating each`,
        ],
      },
      { id: 'luck', label: 'LCK', val: p.luck, eff: eLuck,
        effects: [
          `+${B.CRIT_PER_LUCK}% Crit Chance each (uncapped)`,
          `(current: ${eLuck * B.CRIT_PER_LUCK}% crit)`,
        ],
      },
      { id: 'vit', label: 'VIT', val: p.vit, eff: eVit,
        effects: [
          `+${B.HP_PER_VIT} Max HP each`,
        ],
      },
    ];

    stats.forEach(st => {
      const canAlloc = p.statPoints > 0;
      html += `<div class="stat-row">
        <div class="stat-info">
          <span class="stat-name">${st.label}</span>
          <span class="stat-value">${st.val}</span>
          <span class="stat-eff">(effective: ${st.eff})</span>
          <div class="stat-effects">${st.effects.map(e => `<div>• ${e}</div>`).join('')}</div>
        </div>
        <button class="stat-btn" data-action="allocate" data-stat="${st.id}" ${canAlloc ? '' : 'disabled'}>+</button>
      </div>`;
    });

    const totalSpent = (p.str - 5) + (p.dex - 5) + (p.luck - 5) + (p.vit - 5);
    const resetCost = p.level * B.RESET_COST_PER_LEVEL;
    if (totalSpent > 0) {
      const canReset = p.gold >= resetCost;
      html += `<div class="stat-row" style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px;">
        <div class="stat-info">
          <span class="stat-name">Reset All</span>
          <span class="stat-eff">Refund ${totalSpent} points</span>
          <div class="stat-effects">• Cost: ${resetCost}g (level ${p.level} × ${B.RESET_COST_PER_LEVEL})</div>
          <div class="stat-effects">• You have: ${p.gold}g</div>
        </div>
        <button class="stat-btn" data-action="reset-stats" ${canReset ? '' : 'disabled'} style="font-size:12px;width:auto;padding:0 10px;">Reset</button>
      </div>`;
    }

    html += '<div class="close-hint" data-action="close-modal">done</div>';
    show(html);
  }

  function openZone(s) {
    const zi = UIRPG.State.zoneInfo(s);
    let html = '<div class="modal-title">◆ Select Zone</div>';
    UIRPG.Data.ZONES.forEach(z => {
      const info = zi.find(i => i.name === z.name);
      if (info.unlocked) {
        const marker = info.active ? ' <span class="active-marker">◀</span>' : '';
        const enemiesList = z.enemies.map(e => `${e.name} (HP:${e.hp} ATK:${e.atk} DEF:${e.def} XP:${e.xp} G:${e.gold})`).join(', ');
        html += `<div class="modal-item" data-action="change-zone" data-zone="${z.name}">
          <span>${z.name}${marker} <span class="locked" style="font-size:9px;">lvl ${z.minLevel}+</span></span>
          <span class="locked" style="font-size:9px;max-width:180px;text-align:right;">${enemiesList}</span>
        </div>`;
      } else {
        html += `<div class="modal-item disabled">${z.name} <span class="locked">(level ${z.minLevel}+)</span></div>`;
      }
    });
    html += '<div class="close-hint" data-action="close-modal">close</div>';
    show(html);
  }

  function openOfflineSummary(summary) {
    const s = summary;
    const itemsLabel = s.itemsGained > 0 ? `+${s.itemsGained}` : '0';
    const xpLabel = s.xpGained > 0 ? `+${s.xpGained.toLocaleString()}` : '0';
    const goldLabel = s.goldGained > 0 ? `+${s.goldGained.toLocaleString()}` : '0';
    const levelsLabel = s.levelsGained > 0 ? `+${s.levelsGained}` : '0';
    const timeLabel = formatDuration(s.elapsed);

    const html = `
      <div class="modal-title">◆ Offline Progress</div>
      <div style="margin-bottom:10px;color:var(--text-dim);font-size:11px;">You were away for <b style="color:var(--text);">${esc(timeLabel)}</b></div>
      <div style="display:flex;flex-direction:column;gap:4px;padding:8px 0;">
        <div class="craft-stat"><span>XP Earned</span><span style="color:var(--accent);">${esc(xpLabel)}</span></div>
        <div class="craft-stat"><span>Gold Earned</span><span style="color:var(--accent);">${esc(goldLabel)}</span></div>
        <div class="craft-stat"><span>Levels Gained</span><span style="color:var(--accent);">${esc(levelsLabel)}</span></div>
        <div class="craft-stat"><span>Items Found</span><span style="color:var(--accent);">${esc(itemsLabel)}</span></div>
      </div>
      <div class="close-hint" data-action="close-modal">close</div>
    `;
    show(html);
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function openCharacterSelect(onSelect) {
    const characters = UIRPG.Characters.getCharacterList();
    
    let html = '<div class="modal-title">◆ Select Character</div>';
    
    if (characters.length === 0) {
      html += '<div style="margin-bottom:10px;color:var(--text-dim);font-size:11px;">No characters found. Create one to begin!</div>';
    } else {
      characters.forEach(char => {
        const modeLabel = char.mode === 'ironman' ? ' [Ironman]' : char.mode === 'hardcore' ? ' [Hardcore]' : '';
        const lastPlayed = new Date(char.lastPlayed).toLocaleDateString();
        html += `
          <div class="modal-item" data-action="select-character" data-id="${char.id}" style="position:relative;">
            <span>${esc(char.name)}${modeLabel} <span class="locked" style="font-size:9px;">Lvl ${char.level}</span></span>
            <span class="locked" style="font-size:9px;">Last: ${lastPlayed}</span>
            <span class="delete-character-btn" data-action="delete-character" data-id="${char.id}" data-name="${esc(char.name)}" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--danger);cursor:pointer;font-size:16px;padding:4px 8px;">✕</span>
          </div>
        `;
      });
    }

    html += `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
        <div class="modal-item" data-action="create-character" style="color:var(--accent);font-weight:bold;">
          ◆ Create New Character
        </div>
      </div>
      <div style="margin-top:12px;text-align:center;">
        <a href="privacy.html" target="_blank" style="color:var(--text-dim);font-size:9px;text-decoration:none;">Privacy</a>
      </div>
    `;

    show(html);

    // Bind select handlers
    content.querySelectorAll('[data-action="select-character"]').forEach(el => {
      el.addEventListener('click', (e) => {
        // Don't select if clicking delete button
        if (e.target.closest('[data-action="delete-character"]')) return;
        const id = el.dataset.id;
        close();
        onSelect(id);
      });
    });

    // Bind delete handlers
    content.querySelectorAll('[data-action="delete-character"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.id;
        const name = el.dataset.name;
        openDeleteConfirm(id, name, onSelect);
      });
    });

    // Bind create handler
    content.querySelector('[data-action="create-character"]').addEventListener('click', () => {
      openCreateCharacter(onSelect);
    });
  }

  function openDeleteConfirm(charId, charName, onSelect) {
    const html = `
      <div class="modal-title">◆ Delete Character</div>
      <div style="margin-bottom:10px;color:var(--text-dim);font-size:11px;">
        Are you sure you want to delete <b style="color:var(--danger);">${esc(charName)}</b>?
        <br><br>
        <b style="color:var(--danger);">This cannot be undone!</b> All progress, inventory, and equipment will be permanently lost.
      </div>
      <div style="display:flex;gap:8px;">
        <div class="modal-item" data-action="confirm-delete" style="flex:1;justify-content:center;color:var(--danger);font-weight:bold;">◆ Delete</div>
        <div class="modal-item" data-action="cancel-delete" style="flex:1;justify-content:center;">Cancel</div>
      </div>
    `;
    show(html);

    content.querySelector('[data-action="confirm-delete"]').addEventListener('click', () => {
      UIRPG.Characters.deleteCharacter(charId);
      // Refresh character list
      openCharacterSelect(onSelect);
    });

    content.querySelector('[data-action="cancel-delete"]').addEventListener('click', () => {
      openCharacterSelect(onSelect);
    });
  }

  function openCreateCharacter(onSelect) {
    const html = `
      <div class="modal-title">◆ Create Character</div>
      <div style="margin-bottom:12px;color:var(--text-dim);font-size:11px;">Choose a name and mode for your character.</div>
      <input id="char-name-input" type="text" placeholder="Character Name" maxlength="20" style="width:100%;padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:13px;margin-bottom:14px;">
      
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:8px;">
          <input type="radio" name="char-mode" value="normal" checked style="margin-right:6px;">
          <span style="color:var(--text);">Normal</span>
          <span style="color:var(--text-dim);font-size:10px;margin-left:6px;">Shared bank with other characters</span>
        </label>
        <label style="display:block;margin-bottom:8px;">
          <input type="radio" name="char-mode" value="ironman" style="margin-right:6px;">
          <span style="color:var(--text);">Ironman</span>
          <span style="color:var(--text-dim);font-size:10px;margin-left:6px;">No shared bank, solo play only</span>
        </label>
        <label style="display:block;margin-bottom:8px;">
          <input type="radio" name="char-mode" value="hardcore" style="margin-right:6px;">
          <span style="color:var(--danger);">Hardcore</span>
          <span style="color:var(--text-dim);font-size:10px;margin-left:6px;">Death deletes character!</span>
        </label>
      </div>

      <div style="display:flex;gap:8px;">
        <div class="modal-item" data-action="confirm-create" style="flex:1;justify-content:center;color:var(--accent);font-weight:bold;">◆ Create</div>
        <div class="modal-item" data-action="cancel-create" style="flex:1;justify-content:center;">Cancel</div>
      </div>
    `;
    show(html);

    const nameInput = document.getElementById('char-name-input');
    nameInput.focus();

    content.querySelector('[data-action="confirm-create"]').addEventListener('click', () => {
      const name = nameInput.value.trim();
      const mode = content.querySelector('input[name="char-mode"]:checked').value;
      
      if (!name) {
        nameInput.style.borderColor = 'var(--danger)';
        return;
      }

      const char = UIRPG.Characters.createCharacter(name, mode);
      close();
      onSelect(char.id);
    });

    content.querySelector('[data-action="cancel-create"]').addEventListener('click', () => {
      openCharacterSelect(onSelect);
    });

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        content.querySelector('[data-action="confirm-create"]').click();
      }
    });
  }

  const esc = UIRPG.Utils.esc;

  return { show, close, openStats, openZone, openName, openSalvage, openOfflineSummary, openResetConfirm, openCharacterSelect };
})();
