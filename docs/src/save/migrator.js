UIRPG.Migrator = (() => {
  function defToArmor(def) {
    if (!def || def <= 0) return 0;
    const map = { 1: 8, 3: 25, 6: 60, 10: 120, 18: 250 };
    return map[def] || Math.round(def * 13 + 5);
  }

  const migrations = [
    // v0 (unversioned) → v1
    (raw) => {
      const zone = UIRPG.Data.findZone(raw.zone) || UIRPG.Data.ZONES[0];
      return {
        version: 1,
        player: {
          level: raw.player?.level || 1,
          xp: raw.player?.xp || 0,
          xpNext: raw.player?.xpNext || 75,
          hp: raw.player?.hp ?? 100,
          maxHp: raw.player?.maxHp || 100,
          baseAtk: raw.player?.baseAtk || 5,
          baseDef: raw.player?.baseDef || 2,
          gold: raw.player?.gold || 0,
        },
        equipment: {
          weapon: raw.equipment?.weapon || null,
          armor: raw.equipment?.armor || null,
          accessory: raw.equipment?.accessory || null,
        },
        inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
        currentEnemy: (() => {
          const e = raw.currentEnemy || {};
          const match = zone.enemies.find(en => en.id === e.id || en.name === e.name);
          const base = match || zone.enemies[0];
          return {
            ...base,
            hp: typeof e.hp === 'number' ? e.hp : base.hp,
            maxHp: typeof e.maxHp === 'number' ? e.maxHp : (typeof e.hp === 'number' ? e.hp : base.hp),
          };
        })(),
        zone: zone.name,
        log: Array.isArray(raw.log) ? raw.log.slice(-50) : ['Welcome back to UIRPG!'],
        saveTime: raw.saveTime || Date.now(),
        totalPlayTime: (raw.totalPlayTime || 0) + (raw.saveTime ? Date.now() - raw.saveTime : 0),
      };
    },
    // v1 → v2 (PoE-style stats)
    (raw) => {
      const p = raw.player || {};
      const eq = raw.equipment || {};

      // Convert armor def → armorRating
      const migrateArmor = (armor) => {
        if (!armor) return null;
        const a = { ...armor };
        if (a.def !== undefined) {
          a.armorRating = defToArmor(a.def);
          delete a.def;
        }
        return a;
      };

      // Remove heal, convert def→armorRating on items
      const migrateItem = (item) => {
        if (!item) return null;
        const i = { ...item };
        delete i.heal;
        if (i.def !== undefined) {
          i.armorRating = defToArmor(i.def);
          delete i.def;
        }
        return i;
      };

      // Strip potions and migrate items
      const migrateInventory = (inv) => {
        if (!Array.isArray(inv)) return [];
        return inv
          .filter(i => i && i.name !== 'Health Potion')
          .map(migrateItem);
      };

      return {
        ...raw,
        version: 2,
        player: {
          level: p.level || 1,
          xp: p.xp || 0,
          xpNext: p.xpNext || 75,
          hp: typeof p.hp === 'number' ? p.hp : 100,
          baseAtk: p.baseAtk || 5,
          str: typeof p.str === 'number' ? p.str : 5,
          dex: typeof p.dex === 'number' ? p.dex : 5,
          int: typeof p.int === 'number' ? p.int : 5,
          statPoints: p.statPoints || 0,
          gold: p.gold || 0,
        },
        equipment: {
          weapon: migrateItem(eq.weapon),
          armor: migrateArmor(eq.armor),
          accessory: migrateItem(eq.accessory),
        },
        inventory: migrateInventory(raw.inventory),
        currentEnemy: (() => {
          const e = raw.currentEnemy;
          if (!e) {
            const zone = UIRPG.Data.findZone(raw.zone) || UIRPG.Data.ZONES[0];
            const base = zone.enemies[0];
            return { ...base, hp: base.hp, maxHp: base.hp };
          }
          return { evasion: 0, ...e };
        })(),
        downtime: 0,
        searching: false,
        entropy: 0,
        zone: raw.zone || 'Forest',
        combatLog: [],
        gameLog: (Array.isArray(raw.log) ? raw.log : ['Welcome back to UIRPG!']).slice(-50).map(msg => ({ msg, count: 1 })),
        saveTime: raw.saveTime || Date.now(),
        totalPlayTime: raw.totalPlayTime || 0,
      };
    },
    // v2 → v3 (add VIT, remove combatLog)
    (raw) => {
      const p = raw.player || {};
      const result = {
        ...raw,
        version: 3,
        player: {
          ...p,
          vit: typeof p.vit === 'number' ? p.vit : 5,
          statPoints: p.statPoints || 0,
        },
      };
      delete result.combatLog;
      return result;
    },
    // v3 → v4 (crafting, filter, auto-salvage)
    (raw) => {
      const migrateItem = (item) => {
        if (!item) return null;
        if (typeof item.enchants !== 'number') return { ...item, enchants: 0 };
        return item;
      };
      return {
        ...raw,
        version: 4,
        inventoryFilter: raw.inventoryFilter || 'all',
        autoSalvage: raw.autoSalvage || 'off',
        inventory: Array.isArray(raw.inventory) ? raw.inventory.map(migrateItem) : [],
        equipment: {
          weapon: migrateItem(raw.equipment?.weapon),
          armor: migrateItem(raw.equipment?.armor),
          accessory: migrateItem(raw.equipment?.accessory),
        },
      };
    },
    // v4 → v5 (int → luck, remove DEX→AS/SPD effects)
    (raw) => {
      const p = raw.player || {};
      const player = {
        ...p,
        luck: typeof p.luck === 'number' ? p.luck : (typeof p.int === 'number' ? p.int : 5),
      };
      delete player.int;
      delete player.maxHp;
      delete player.baseDef;
      return { ...raw, version: 5, player };
    },
    // v5 → v6 (bank, activeTab)
    (raw) => {
      return {
        ...raw,
        version: 6,
        bank: Array.isArray(raw.bank) ? raw.bank : [],
        activeTab: raw.activeTab === 'bank' ? 'bank' : 'inv',
      };
    },
    // v6 → v7 (timers on state)
    (raw) => {
      return {
        ...raw,
        version: 7,
        combatTimer: raw.combatTimer || 0,
        regenTimer: raw.regenTimer || 0,
      };
    },
    // v7 → v8 (item lock)
    (raw) => {
      const addLock = (item) => {
        if (!item) return null;
        if (typeof item.locked !== 'boolean') return { ...item, locked: false };
        return item;
      };
      return {
        ...raw,
        version: 8,
        inventory: Array.isArray(raw.inventory) ? raw.inventory.map(addLock) : [],
        bank: Array.isArray(raw.bank) ? raw.bank.map(addLock) : [],
        equipment: {
          weapon: addLock(raw.equipment?.weapon),
          armor: addLock(raw.equipment?.armor),
          accessory: addLock(raw.equipment?.accessory),
        },
      };
    },
    // v8 → v9 (remove entropy)
    (raw) => {
      const result = { ...raw, version: 9 };
      delete result.entropy;
      return result;
    },
    // v9 → v10 (expand to 11 equipment slots)
    (raw) => {
      const oldEq = raw.equipment || {};
      const newEq = {
        main_hand: oldEq.weapon || null,
        off_hand: null,
        helmet: null,
        chest: oldEq.armor || null,
        leggings: null,
        boots: null,
        gloves: null,
        ring1: oldEq.accessory || null,
        ring2: null,
        belt: null,
        amulet: null,
      };
      return { ...raw, version: 10, equipment: newEq };
    },
    // v10 → v11 (reset baseAtk to 1, add weapon stats to unique weapons)
    (raw) => {
      const p = raw.player || {};
      const result = { ...raw, version: 11 };
      result.player = { ...p, baseAtk: 1 };

      const addWeaponStats = (item) => {
        if (!item || item.kind !== 'main_hand') return item;
        if (item.attackSpeed) return item;
        const tier = Math.max(1, Math.floor((p.level || 1) / 5) + 1);
        return {
          ...item,
          attackSpeed: 2000,
          minAtk: item.atk ? Math.floor(item.atk * 0.6) : (2 + tier),
          maxAtk: item.atk ? Math.ceil(item.atk * 1.4) : (5 + tier * 2),
        };
      };

      result.inventory = (raw.inventory || []).map(addWeaponStats);
      result.bank = (raw.bank || []).map(addWeaponStats);
      if (result.equipment) {
        const newEq = {};
        for (const slot of Object.keys(result.equipment)) {
          newEq[slot] = addWeaponStats(result.equipment[slot]);
        }
        result.equipment = newEq;
      }
      return result;
    },
    // v11 → v12 (add equipLocks, autoEquipEnabled)
    (raw) => {
      return { ...raw, version: 12, equipLocks: {}, autoEquipEnabled: false };
    },
    // v12 → v13 (add fishing state, rod/bait slots, currencies)
    (raw) => {
      const eq = raw.equipment || {};
      return {
        ...raw, version: 13,
        activity: raw.activity || 'fight',
        fishingSpot: raw.fishingSpot || null,
        fishingTimer: raw.fishingTimer || 0,
        fishCaught: raw.fishCaught || 0,
        currencies: raw.currencies || {},
        equipment: { ...eq, rod: eq.rod || null, bait: eq.bait || null },
      };
    },
    // v13 → v14 (add fish slot, fishConsumeUses)
    (raw) => {
      const eq = raw.equipment || {};
      return {
        ...raw, version: 14,
        fishConsumeUses: 0,
        equipment: { ...eq, fish: eq.consumable || eq.fish || null },
      };
    },
  ];

  function migrate(raw) {
    const startVer = raw.version || 0;
    if (startVer > migrations.length) {
      console.warn(`Save version ${startVer} is newer than supported (${migrations.length}). Data may be incompatible.`);
      return raw;
    }
    let data = raw;
    for (let v = startVer; v < migrations.length; v++) {
      data = migrations[v](data);
    }
    return data;
  }

  return { migrate };
})();
