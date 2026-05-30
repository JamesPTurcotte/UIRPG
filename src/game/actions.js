UIRPG.Actions = (() => {
  function enchantCost(item) {
    return Math.floor(50 * Math.pow(1.5, item.enchants || 0));
  }

  function findRingSlot(s) {
    if (!s.equipment.ring1) return 'ring1';
    if (!s.equipment.ring2) return 'ring2';
    return 'ring1';
  }

  function changeZone(s, name) {
    const zone = UIRPG.Data.findZone(name);
    if (zone && s.player.level >= zone.minLevel) {
      s.zone = zone.name;
      UIRPG.Engine.spawnEnemy(s);
      UIRPG.State.addGameLog(s, `Moved to ${zone.name}`, 'subtle');
      const stats = UIRPG.State.computeStats(s);
      s.player.hp = stats.maxHp;
      UIRPG.Events.emit('zone:changed', { zone: zone.name });
      return true;
    }
    return false;
  }

  function equipItem(s, idx, arr) {
    arr = arr || s.inventory;
    if (idx < 0 || idx >= arr.length) return false;
    const item = arr[idx];
    if (!item.kind) return false;

    const kind = item.kind;
    let slot = kind;

    if (kind === 'ring') {
      slot = findRingSlot(s);
    }

    const old = s.equipment[slot];
    s.equipment[slot] = item;
    arr.splice(idx, 1);
    if (old) {
      if (arr === s.bank) s.bank.push(old);
      else s.inventory.push(old);
    }

    UIRPG.State.addGameLog(s, `Equipped ${UIRPG.Drops.displayName(item)}`, 'subtle');
    const stats = UIRPG.State.computeStats(s);
    if (s.player.hp > stats.maxHp) s.player.hp = stats.maxHp;
    UIRPG.Events.emit('inventory:changed');
    UIRPG.Events.emit('equipment:changed');
    return true;
  }

  function allocateStat(s, stat) {
    const p = s.player;
    if (p.statPoints <= 0) return false;
    if (stat !== 'str' && stat !== 'dex' && stat !== 'luck' && stat !== 'vit') return false;
    p[stat] += 1;
    p.statPoints -= 1;
    UIRPG.State.addGameLog(s, `+1 ${stat.toUpperCase()} (${p[stat]})`, 'info');
    const stats = UIRPG.State.computeStats(s);
    if (p.hp > stats.maxHp) p.hp = stats.maxHp;
    UIRPG.Events.emit('stats:changed', { stat, value: p[stat], remaining: p.statPoints });
    return true;
  }

  function spreadStats(s) {
    const p = s.player;
    const stats = ['str', 'dex', 'luck', 'vit'];
    const totalPoints = p.statPoints;
    if (totalPoints <= 0) return false;

    let remaining = totalPoints;
    while (remaining > 0) {
      for (const stat of stats) {
        if (remaining <= 0) break;
        p[stat] += 1;
        p.statPoints--;
        remaining--;
      }
    }

    UIRPG.State.addGameLog(s, `Spread ${totalPoints} points evenly across all stats`, 'info');
    const compStats = UIRPG.State.computeStats(s);
    if (p.hp > compStats.maxHp) p.hp = compStats.maxHp;
    UIRPG.Events.emit('stats:changed', { remaining: p.statPoints });
    return true;
  }

  const AUTO_MODE_NAMES = { round_robin: 'Cycle', str: 'STR', dex: 'DEX', luck: 'LCK', vit: 'VIT' };

  function autoSpendStats(s) {
    const mode = s.autoStatMode || 'off';
    if (mode === 'off') return false;
    const p = s.player;
    if (p.statPoints <= 0) return false;
    const cycle = mode === 'round_robin' ? ['str', 'dex', 'luck', 'vit'] : [mode];
    let spent = 0;
    while (p.statPoints > 0) {
      for (const stat of cycle) {
        if (p.statPoints <= 0) break;
        p[stat] += 1;
        p.statPoints -= 1;
        spent++;
      }
    }
    if (spent > 0) {
      const modeName = AUTO_MODE_NAMES[s.autoStatMode] || s.autoStatMode;
      UIRPG.State.addGameLog(s, `Auto-spent ${spent} stat point${spent > 1 ? 's' : ''} (${modeName}).`, 'info');
      const stats = UIRPG.State.computeStats(s);
      if (p.hp > stats.maxHp) p.hp = stats.maxHp;
      UIRPG.Events.emit('stats:changed', { remaining: p.statPoints });
    }
    return true;
  }

  function resetStats(s) {
    const p = s.player;
    const totalSpent = (p.str - 5) + (p.dex - 5) + (p.luck - 5) + (p.vit - 5);
    if (totalSpent <= 0) return false;
    const cost = p.level * UIRPG.State.BALANCE.RESET_COST_PER_LEVEL;
    if (p.gold < cost) return false;
    p.gold -= cost;
    p.str = 5;
    p.dex = 5;
    p.luck = 5;
    p.vit = 5;
    p.statPoints += totalSpent;
    UIRPG.State.addGameLog(s, `Reset stats for ${cost}g (refunded ${totalSpent} points)`, 'reward');
    const stats = UIRPG.State.computeStats(s);
    if (p.hp > stats.maxHp) p.hp = stats.maxHp;
    UIRPG.Events.emit('stats:changed', { remaining: p.statPoints });
    return true;
  }

  function salvageAll(s) {
    let total = 0;
    const kept = [];
    for (const item of s.inventory) {
      if (item.locked) { kept.push(item); continue; }
      const r = UIRPG.Drops.RARITIES.find(r => r.name === item.rarity);
      total += r ? r.salvageGold : 2;
    }
    s.inventory.length = 0;
    s.inventory.push(...kept);
    s.player.gold += total;
    if (total > 0) UIRPG.State.addGameLog(s, `Salvaged items for ${total} gold`, 'reward');
    if (kept.length) UIRPG.State.addGameLog(s, `Kept ${kept.length} locked item${kept.length > 1 ? 's' : ''}`, 'subtle');
    UIRPG.Events.emit('inventory:changed');
  }

  function salvageItem(s, idx, arr) {
    arr = arr || s.inventory;
    if (idx < 0 || idx >= arr.length) return false;
    const item = arr[idx];
    if (item.locked) return false;
    const r = UIRPG.Drops.RARITIES.find(r => r.name === item.rarity);
    const gold = r ? r.salvageGold : 2;
    arr.splice(idx, 1);
    s.player.gold += gold;
    UIRPG.State.addGameLog(s, `Salvaged ${UIRPG.Drops.displayName(item)} for ${gold} gold`, 'reward');
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  function toggleLock(s, idx, arr) {
    arr = arr || s.inventory;
    if (idx < 0 || idx >= arr.length) return false;
    arr[idx].locked = !arr[idx].locked;
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  const UNIQUE_ENCHANT_KEYS = [
    { key: 'flatBlock', pct: 0.10 },
    { key: 'lifeOnHit', pct: 0.10 },
    { key: 'thorns', pct: 0.10 },
    { key: 'dodgeChance', pct: 0.10 },
    { key: 'stunChance', pct: 0.10 },
    { key: 'armorRating', pct: 0.10 },
    { key: 'evasionRating', pct: 0.10 },
    { key: 'atk', pct: 0.10 },
    { key: 'maxHpBonus', pct: 0.10 },
    { key: 'moveSpeed', pct: 0.10 },
    { key: 'searchSpeed', pct: 0.10 },
    { key: 'goldMult', pct: 0.05, minStep: 0.05 },
    { key: 'xpMult', pct: 0.05, minStep: 0.05 },
    { key: 'critDmg', pct: 0.05, minStep: 0.05 },
  ];

  function applyEnchant(item) {
    item.enchants = (item.enchants || 0) + 1;

    if (item.rarity === 'Unique') {
      const existing = UNIQUE_ENCHANT_KEYS.filter(k => item[k.key]);
      if (existing.length) {
        const pick = existing[Math.floor(Math.random() * existing.length)];
        const currentVal = item[pick.key] || 0;
        const minStep = pick.minStep || 1;
        const increase = Math.max(minStep, Math.floor(currentVal * pick.pct));
        item[pick.key] = currentVal + increase;
        return;
      }
    }

    const kind = item.kind;
    if (kind === 'main_hand') {
      // Enchant increases min/max attack, boosting DPS naturally
      const minAtk = item.minAtk || 0;
      const maxAtk = item.maxAtk || 0;
      const avgAtk = (minAtk + maxAtk) / 2 || 1;
      const increase = Math.max(1, Math.floor(avgAtk * 0.10));
      item.minAtk = (item.minAtk || 0) + Math.max(1, Math.floor(increase * 0.8));
      item.maxAtk = (item.maxAtk || 0) + Math.max(1, Math.floor(increase * 1.2));
    } else if (kind === 'ring') {
      const bonusKeys = ['bonusStr', 'bonusDex', 'bonusLuck', 'bonusVit', 'atk', 'moveSpeed'];
      const existing = bonusKeys.filter(k => item[k]);
      if (existing.length) {
        const pick = existing[Math.floor(Math.random() * existing.length)];
        const currentVal = item[pick] || 0;
        const increase = Math.max(1, Math.floor(currentVal * 0.10));
        item[pick] = currentVal + increase;
      } else {
        item.bonusStr = 1;
      }
    } else if (kind === 'amulet') {
      const bonusKeys = ['maxHpBonus', 'moveSpeed', 'searchSpeed', 'flatBlock', 'lifeOnHit', 'thorns'];
      const existing = bonusKeys.filter(k => item[k]);
      if (existing.length) {
        const pick = existing[Math.floor(Math.random() * existing.length)];
        const currentVal = item[pick] || 0;
        const increase = Math.max(1, Math.floor(currentVal * 0.10));
        item[pick] = currentVal + increase;
      } else {
        item.maxHpBonus = 5;
      }
    } else if (kind === 'rod') {
      const currentVal = item.fishingPower || 1;
      const increase = Math.max(1, Math.floor(currentVal * 0.10));
      item.fishingPower = currentVal + increase;
    } else if (kind === 'bait') {
      const bonusKeys = ['fishingPower', 'catchSpeed', 'treasureChance'];
      const existing = bonusKeys.filter(k => item[k]);
      if (existing.length) {
        const pick = existing[Math.floor(Math.random() * existing.length)];
        const currentVal = item[pick] || 0;
        const increase = Math.max(1, Math.floor(currentVal * 0.10));
        item[pick] = currentVal + increase;
      } else {
        item.fishingPower = 1;
      }
    } else if (kind === 'fish') {
      const currentVal = item.healAmount || 10;
      const increase = Math.max(1, Math.floor(currentVal * 0.10));
      item.healAmount = currentVal + increase;
    } else if (item.armorRating) {
      const currentVal = item.armorRating;
      const increase = Math.max(1, Math.floor(currentVal * 0.10));
      item.armorRating = currentVal + increase;
    } else if (item.evasionRating) {
      const currentVal = item.evasionRating;
      const increase = Math.max(1, Math.floor(currentVal * 0.10));
      item.evasionRating = currentVal + increase;
    }
  }

  function enchantItem(s, idx, arr) {
    arr = arr || s.inventory;
    if (idx < 0 || idx >= arr.length) return false;
    const item = arr[idx];
    const cost = enchantCost(item);
    if (s.player.gold < cost) return false;
    s.player.gold -= cost;
    applyEnchant(item);
    UIRPG.State.addGameLog(s, `Enchanted ${UIRPG.Drops.displayName(item)} (+${item.enchants})`, 'reward');
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  function enchantEquipped(s, slot) {
    const item = s.equipment[slot];
    if (!item) return false;
    const cost = enchantCost(item);
    if (s.player.gold < cost) return false;
    s.player.gold -= cost;
    applyEnchant(item);
    UIRPG.State.addGameLog(s, `Enchanted ${UIRPG.Drops.displayName(item)} (+${item.enchants})`, 'reward');
    UIRPG.Events.emit('equipment:changed');
    return true;
  }

  function unequipItem(s, slot) {
    const item = s.equipment[slot];
    if (!item) return false;
    s.equipment[slot] = null;
    if (item.kind === 'fish' && item.maxUses) {
      item.uses = item.maxUses;
    }
    s.inventory.push(item);
    UIRPG.State.addGameLog(s, `Unequipped ${UIRPG.Drops.displayName(item)}`, 'subtle');
    const stats = UIRPG.State.computeStats(s);
    if (s.player.hp > stats.maxHp) s.player.hp = stats.maxHp;
    UIRPG.Events.emit('inventory:changed');
    UIRPG.Events.emit('equipment:changed');
    return true;
  }

  function switchTab(s, tab) {
    if (tab === 'inv' || tab === 'bank') {
      s.activeTab = tab;
      if (tab === 'bank') s.bankTab = 'items';
    } else if (tab === 'items' || tab === 'currencies') {
      if (s.activeTab === 'bank') s.bankTab = tab;
    } else {
      return;
    }
    UIRPG.Events.emit('inventory:changed');
  }

  function upgradeInventory(s) {
    const cost = UIRPG.State.invUpgradeCost(s);
    if (s.player.gold < cost) return false;
    s.player.gold -= cost;
    s.invUpgradeLevel = (s.invUpgradeLevel || 0) + 1;
    const newCap = UIRPG.State.invCap(s);
    UIRPG.State.addGameLog(s, `Inventory upgraded to ${newCap} slots (${cost}g)`, 'reward');
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  function upgradeBank(s) {
    const cost = UIRPG.State.bankUpgradeCost(s);
    if (s.player.gold < cost) return false;
    s.player.gold -= cost;
    s.bankUpgradeLevel = (s.bankUpgradeLevel || 0) + 1;
    const newCap = UIRPG.State.bankCap(s);
    UIRPG.State.addGameLog(s, `Bank upgraded to ${newCap} slots (${cost}g)`, 'reward');
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  function resetCharacter(s) {
    const fresh = UIRPG.State.create();
    const name = s.player.name || 'Adventurer';
    s.player.level = 1;
    s.player.xp = 0;
    s.player.xpNext = fresh.player.xpNext;
    s.player.hp = fresh.player.hp;
    s.player.baseAtk = 1;
    s.player.str = 5;
    s.player.dex = 5;
    s.player.luck = 5;
    s.player.vit = 5;
    s.player.statPoints = 4;
    s.player.gold = 0;
    s.player.name = name;
    s.equipment = fresh.equipment;
    s.inventory = [];
    // Bank is NOT cleared - it's shared across characters
    s.invUpgradeLevel = 0;
    s.activeTab = 'inv';
    s.inventoryFilter = 'all';
    s.autoSalvage = 'off';
    s.currentEnemy = fresh.currentEnemy;
    s.zone = fresh.zone;
    s.downtime = 0;
    s.searching = false;
    s.combatTimer = 0;
    s.gameLog = fresh.gameLog;
    s.equipLocks = {};
    s.autoEquipEnabled = false;
    s.autoStatMode = 'off';
    s.activity = 'fight';
    s.fishingSpot = null;
    s.fishingTimer = 0;
    s.fishingCooldown = 0;
    s.fishCaught = 0;
    s.currencies = {};
    s.fishConsumeUses = 0;
    UIRPG.State.addGameLog(s, 'Character has been reset!', 'reward');
    UIRPG.Events.emit('inventory:changed');
    UIRPG.Events.emit('equipment:changed');
    UIRPG.Save.save(s);
    return true;
  }

  function moveToBank(s, invIdx) {
    if (invIdx < 0 || invIdx >= s.inventory.length) return false;
    const cap = UIRPG.State.bankCap(s);
    if (s.bank.length >= cap) return false;
    const item = s.inventory.splice(invIdx, 1)[0];
    s.bank.push(item);
    UIRPG.State.addGameLog(s, `Moved ${UIRPG.Drops.displayName(item)} to bank`, 'subtle');
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  function moveToInventory(s, bankIdx) {
    if (bankIdx < 0 || bankIdx >= s.bank.length) return false;
    const cap = UIRPG.State.invCap(s);
    if (s.inventory.length >= cap) return false;
    const item = s.bank.splice(bankIdx, 1)[0];
    s.inventory.push(item);
    UIRPG.State.addGameLog(s, `Moved ${UIRPG.Drops.displayName(item)} from bank`, 'subtle');
    UIRPG.Events.emit('inventory:changed');
    return true;
  }

  const VALID_FILTERS = ['all', 'main_hand', 'off_hand', 'helmet', 'chest', 'leggings', 'boots', 'gloves', 'ring', 'belt', 'amulet'];
  const VALID_AUTO = ['off', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unique'];

  function setFilter(s, filter) {
    if (!VALID_FILTERS.includes(filter)) return;
    s.inventoryFilter = filter;
    UIRPG.Events.emit('inventory:changed');
  }

  function setAutoSalvage(s, rarity) {
    if (!VALID_AUTO.includes(rarity)) return;
    s.autoSalvage = rarity;
    UIRPG.Events.emit('inventory:changed');
  }

  function setAutoEquip(s) {
    s.autoEquipEnabled = !s.autoEquipEnabled;
    UIRPG.Events.emit('equipment:changed');
  }

  function autoSalvageValue(s, item) {
    const r = UIRPG.Drops.RARITIES.find(r => r.name === item.rarity);
    return r ? r.salvageGold : 2;
  }

  function shouldAutoSalvage(s, item) {
    if (s.autoSalvage === 'off') return false;
    const threshold = UIRPG.Drops.RARITIES.findIndex(r => r.name === s.autoSalvage);
    if (threshold < 0) return false;
    const itemRarity = UIRPG.Drops.RARITIES.findIndex(r => r.name === item.rarity);
    return itemRarity >= 0 && itemRarity <= threshold;
  }

  function setActivity(s, activity) {
    if (activity !== 'fight' && activity !== 'fish') return;
    if (s.activity === activity) return;
    s.activity = activity;
    if (activity === 'fish') {
      const spots = UIRPG.Data.FISHING_SPOTS;
      const fp = UIRPG.Fishing.fishingPower(s);
      const unlocked = spots.filter(sp => s.player.level >= sp.minLevel && fp >= (sp.minFishingPower || 0));
      if (unlocked.length) {
        s.fishingSpot = unlocked[0].id;
        s.fishingTimer = 0;
        UIRPG.Fishing.startFishing(s, unlocked[0].id);
      }
    } else {
      s.fishingSpot = null;
      s.fishingTimer = 0;
      s.fishingCooldown = 0;
      UIRPG.Events.emit('activity:changed');
    }
  }

  function changeFishingSpot(s, spotId) {
    UIRPG.Fishing.startFishing(s, spotId);
  }

  function tryEquipDrop(s, item) {
    let slot = item.kind;
    if (slot === 'ring') {
      if (!s.equipment.ring1) slot = 'ring1';
      else if (!s.equipment.ring2) slot = 'ring2';
      else {
        const v1 = itemPrimaryValue(s.equipment.ring1);
        const v2 = itemPrimaryValue(s.equipment.ring2);
        slot = v1 <= v2 ? 'ring1' : 'ring2';
      }
    }
    if (s.equipLocks && s.equipLocks[slot]) return false;
    const current = s.equipment[slot];
    if (!current) {
      s.equipment[slot] = item;
      return true;
    }
    if (itemPrimaryValue(item) > itemPrimaryValue(current)) {
      s.equipment[slot] = item;
      if (current.kind === 'fish' && current.maxUses) current.uses = current.maxUses;
      s.inventory.push(current);
      const stats = UIRPG.State.computeStats(s);
      if (s.player.hp > stats.maxHp) s.player.hp = stats.maxHp;
      return true;
    }
    return false;
  }

  function dropValue(item) {
    const RARITY_RANK = { Unique: 100, Legendary: 80, Epic: 60, Rare: 40, Uncommon: 20, Common: 0 };
    return (item.tier || 0) * 100 + (RARITY_RANK[item.rarity] || 0);
  }

  function replaceLowestItem(s, item) {
    const newVal = dropValue(item);
    let worstIdx = -1;
    let worstVal = Infinity;
    for (let i = 0; i < s.inventory.length; i++) {
      const cur = s.inventory[i];
      if (cur.locked) continue;
      if (item.kind === 'fish' && cur.kind !== 'fish') continue;
      const val = dropValue(cur);
      if (val < newVal && val < worstVal) {
        worstVal = val;
        worstIdx = i;
      }
    }
    if (worstIdx >= 0) {
      s.inventory[worstIdx] = item;
      return true;
    }
    return false;
  }

  function handleDrop(s, item, sourceName, label) {
    const p = s.player;
    const name = label || UIRPG.Drops.displayName(item);

    if (tryEquipDrop(s, item)) {
      UIRPG.State.addGameLog(s, `${sourceName} dropped ${name}! Auto-equipped.`, 'reward');
      return;
    }

    if (shouldAutoSalvage(s, item)) {
      const g = autoSalvageValue(s, item);
      p.gold += g;
      UIRPG.State.addGameLog(s, `Checked ${name} from ${sourceName} — not better, auto-salvaged for ${g}g`, 'info');
      return;
    }

    if (s.inventory.length >= UIRPG.State.invCap(s)) {
      if (replaceLowestItem(s, item)) {
        UIRPG.State.addGameLog(s, `${sourceName} dropped ${name}! (replaced lower item)`, 'reward');
      } else {
        const g = autoSalvageValue(s, item);
        p.gold += g;
        UIRPG.State.addGameLog(s, `${sourceName} dropped ${name} — inv full, auto-salvaged for ${g}g`, 'reward');
      }
      return;
    }

    s.inventory.push(item);
    UIRPG.State.addGameLog(s, `${sourceName} dropped ${name}!`, 'reward');
  }

  function toggleEquipLock(s, slot) {
    const locks = s.equipLocks || {};
    locks[slot] = !locks[slot];
    s.equipLocks = locks;
    UIRPG.Events.emit('equipment:changed');
    return true;
  }

  function itemPrimaryValue(item) {
    if (!item) return 0;
    if (item.kind === 'main_hand') return UIRPG.State.weaponDps(item);
    if (UIRPG.State.DEFENCE_SLOTS.includes(item.kind)) return Math.max(item.armorRating || 0, item.evasionRating || 0);
    if (item.kind === 'ring') return (item.bonusStr || 0) + (item.bonusDex || 0) + (item.bonusLuck || 0) + (item.bonusVit || 0) + (item.atk || 0) + (item.moveSpeed || 0);
    if (item.kind === 'amulet') return (item.maxHpBonus || 0) + (item.moveSpeed || 0) + (item.searchSpeed || 0) + (item.flatBlock || 0) + (item.lifeOnHit || 0) + (item.thorns || 0);
    if (item.kind === 'rod') return item.fishingPower || 0;
    if (item.kind === 'bait') return (item.fishingPower || 0) + (item.catchSpeed || 0) + (item.treasureChance || 0);
    if (item.kind === 'fish') return (item.healAmount || 0) * (item.maxUses || 1);
    return 0;
  }

  function autoEquip(s) {
    const locks = s.equipLocks || {};
    const RARITY_RANK = { Unique: 6, Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
    let changed = false;

    for (const slot of UIRPG.State.EQUIP_SLOTS) {
      if (locks[slot]) continue;

      const kind = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
      const inv = s.inventory;

      let bestIdx = -1;
      let bestVal = -1;
      for (let i = 0; i < inv.length; i++) {
        const item = inv[i];
        if (item.kind !== kind) continue;
        const val = itemPrimaryValue(item);
        if (val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }

      if (bestIdx < 0) continue;

      const newItem = inv[bestIdx];
      const current = s.equipment[slot];

      if (!current) {
        s.equipment[slot] = newItem;
        inv.splice(bestIdx, 1);
        changed = true;
        UIRPG.State.addGameLog(s, `Auto-equipped ${UIRPG.Drops.displayName(newItem)} to ${slot}`, 'subtle');
        continue;
      }

      const curVal = itemPrimaryValue(current);
      if (bestVal > curVal) {
        s.equipment[slot] = newItem;
        inv.splice(bestIdx, 1);
        inv.push(current);
        changed = true;
        UIRPG.State.addGameLog(s, `Auto-equipped ${UIRPG.Drops.displayName(newItem)} over ${UIRPG.Drops.displayName(current)}`, 'subtle');
      } else if (bestVal === curVal) {
        const newRank = RARITY_RANK[newItem.rarity] || 0;
        const curRank = RARITY_RANK[current.rarity] || 0;
        if (newRank > curRank) {
          s.equipment[slot] = newItem;
          inv.splice(bestIdx, 1);
          inv.push(current);
          changed = true;
          UIRPG.State.addGameLog(s, `Auto-equipped ${UIRPG.Drops.displayName(newItem)} (better rarity)`, 'subtle');
        }
      }
    }

    if (changed) {
      const stats = UIRPG.State.computeStats(s);
      if (s.player.hp > stats.maxHp) s.player.hp = stats.maxHp;
      UIRPG.Events.emit('inventory:changed');
      UIRPG.Events.emit('equipment:changed');
    }
  }

  return { changeZone, equipItem, allocateStat, spreadStats, resetStats, salvageAll, salvageItem, enchantItem,
    enchantEquipped, unequipItem, upgradeInventory, upgradeBank, resetCharacter,
    switchTab, moveToBank, moveToInventory, toggleLock,
    setFilter, setAutoSalvage, setAutoEquip, autoSalvageValue, shouldAutoSalvage, enchantCost,
    toggleEquipLock, autoEquip, setActivity, changeFishingSpot, tryEquipDrop, handleDrop,
    autoSpendStats, applyEnchant };
})();
