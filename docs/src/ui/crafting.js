UIRPG.UI = UIRPG.UI || {};
UIRPG.UI.Crafting = (() => {
  function open(s, idx, source) {
    render(s, idx, source || 'inv');
  }

  function getItem(s, idx, source) {
    if (source === 'equip') return s.equipment[idx];
    if (source === 'bank') return s.bank[idx];
    return s.inventory[idx];
  }

  function render(s, idx, source) {
    const item = getItem(s, idx, source);
    if (!item) return;

    const cost = UIRPG.Actions.enchantCost(item);
    const canEnchant = s.player.gold >= cost;
    const isEquip = source === 'equip';
    const isBank = source === 'bank';

    const rarityColors = {
      Common: '#c0c0c0', Uncommon: '#44cc44', Rare: '#4488ff',
      Epic: '#aa44ff', Legendary: '#ffaa00', Unique: '#ffd700',
    };
    const color = rarityColors[item.rarity] || '#c0c0c0';

    let html = `<div class="modal-title" style="color:${color}">◆ ${esc(UIRPG.UI.Render.displayName(item))}</div>`;

    html += '<div class="craft-stats">';
    if (item.kind === 'main_hand') {
      const wLines = UIRPG.UI.Render.weaponStats(item);
      for (const line of wLines) {
        html += `<div class="craft-stat"><span>${esc(line)}</span></div>`;
      }
    }
    const lines = UIRPG.Drops.itemStats(item);
    for (const line of lines) {
      html += `<div class="craft-stat"><span>${esc(line)}</span></div>`;
    }
    html += '</div>';

    const ench = item.enchants || 0;
    html += `<div class="craft-enchant">Enchant +${ench}${canEnchant ? ` — next: ${cost}g` : ' (cannot afford)'}</div>`;

    const disabledCls = canEnchant ? '' : ' disabled';
    const srcAttr = `data-source="${source}"`;
    html += `<div class="craft-btn${disabledCls}" data-action="enchant-item" data-idx="${idx}" ${srcAttr}>◆ Enchant (${cost}g)</div>`;

    if (isEquip) {
      html += `<div class="craft-btn" data-action="unequip-item" data-idx="${idx}" ${srcAttr}>Unequip</div>`;
    } else {
      html += `<div class="craft-btn" data-action="equip-item" data-idx="${idx}" ${srcAttr}>Equip</div>`;
      const lockLabel = item.locked ? 'Unlock' : 'Lock';
      html += `<div class="craft-btn" data-action="toggle-lock" data-idx="${idx}" ${srcAttr}>${lockLabel}</div>`;
      if (!isBank && !item.locked) {
        html += `<div class="craft-btn" data-action="salvage-item" data-idx="${idx}">Salvage</div>`;
      }
    }
    html += `<div class="close-hint" data-action="close-modal">close</div>`;

    UIRPG.UI.Modal.show(html);
  }

  const esc = UIRPG.Utils.esc;

  return { open };
})();
