UIRPG.State = (() => {
  const BALANCE = {
    BASE_HP: 60, HP_PER_LEVEL: 10, HP_PER_VIT: 10,
    STR_ARMOR_SCALE: 0.02, STR_DMG_SCALE: 0.002,
    DEX_EVA_SCALE: 0.001,
    BASE_ACCURACY: 50, ACC_PER_DEX: 8,
    CRIT_PER_LUCK: 2, BASE_CRIT_MULT: 1.5,
    ATTACK_SPEED_MS: 2000,
    LOG_CAP: 50, INVENTORY_CAP: 100, BANK_CAP: 200,
    UPGRADE_SLOTS_PER: 50, UPGRADE_BASE_COST: 500, UPGRADE_COST_MULT: 1.5,
    DR_CURVE: 180, DR_CAP: 90,
    DODGE_CURVE: 180, DODGE_CAP: 90,
    HIT_MIN: 5, HIT_MAX: 95,
    ENEMY_EVA_MULT: 3,
    DEFAULT_ENEMY_ACC: 35,
    BASE_SEARCH_MS: 3000,
    XP_BASE: 25, XP_PER_LEVEL: 50,
    STAT_POINTS_PER_LEVEL: 3, BASE_ATK_PER_LEVEL: 0,
    INITIAL_STAT_POINTS: 4, INITIAL_BASE_ATK: 1, INITIAL_STAT_VALUE: 5,
    DEATH_GOLD_FRACTION: 10, DEATH_GOLD_FLAT: 5, DEATH_HP_FRACTION: 0.5,
    DEFAULT_SALVAGE_GOLD: 2,
    ENCHANT_BASE_COST: 50, ENCHANT_SCALE: 1.5,
    RESET_COST_PER_LEVEL: 20,
  };

  const EQUIP_SLOTS = [
    'main_hand', 'off_hand', 'helmet', 'chest', 'leggings',
    'boots', 'gloves', 'ring1', 'ring2', 'belt', 'amulet',
    'rod', 'bait', 'fish'
  ];

  const DEFENCE_SLOTS = ['off_hand', 'helmet', 'chest', 'leggings', 'boots', 'gloves', 'belt'];
  const RING_SLOTS = ['ring1', 'ring2'];

  function invCap(s) {
    return BALANCE.INVENTORY_CAP + (s.invUpgradeLevel || 0) * BALANCE.UPGRADE_SLOTS_PER;
  }

  function bankCap(s) {
    return BALANCE.BANK_CAP + (s.bankUpgradeLevel || 0) * BALANCE.UPGRADE_SLOTS_PER;
  }

  function invUpgradeCost(s) {
    return Math.floor(BALANCE.UPGRADE_BASE_COST * Math.pow(BALANCE.UPGRADE_COST_MULT, s.invUpgradeLevel || 0));
  }

  function bankUpgradeCost(s) {
    return Math.floor(BALANCE.UPGRADE_BASE_COST * Math.pow(BALANCE.UPGRADE_COST_MULT, s.bankUpgradeLevel || 0));
  }

  function calcDR(armorRating) {
    if (armorRating <= 0) return 0;
    return Math.min(BALANCE.DR_CAP, armorRating / (armorRating + BALANCE.DR_CURVE) * 100);
  }

  function calcDodge(evasionRating) {
    if (evasionRating <= 0) return 0;
    return Math.min(BALANCE.DODGE_CAP, evasionRating / (evasionRating + BALANCE.DODGE_CURVE) * 100);
  }

  function create() {
    const zone = UIRPG.Data.ZONES[0];
    const enemies = zone.enemies;
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    const B = BALANCE;
    const initHp = B.BASE_HP + 0 * B.HP_PER_LEVEL + B.INITIAL_STAT_VALUE * B.HP_PER_VIT;
    const eq = {};
    EQUIP_SLOTS.forEach(s => eq[s] = null);
    return {
      version: UIRPG.SAVE_VERSION,
      player: {
        level: 1, xp: 0, xpNext: B.XP_BASE + 1 * B.XP_PER_LEVEL,
        hp: initHp,
        baseAtk: B.INITIAL_BASE_ATK,
        str: B.INITIAL_STAT_VALUE, dex: B.INITIAL_STAT_VALUE,
        luck: B.INITIAL_STAT_VALUE, vit: B.INITIAL_STAT_VALUE,
        statPoints: B.INITIAL_STAT_POINTS,
        gold: 0,
      },
      equipment: eq,
      inventory: [],
      bank: [],
      invUpgradeLevel: 0,
      bankUpgradeLevel: 0,
      activeTab: 'inv',
      inventoryFilter: 'all',
      autoSalvage: 'off',
      currentEnemy: { ...enemy, hp: enemy.hp, maxHp: enemy.hp },
      zone: zone.name,
      downtime: 0,
      searching: false,
      combatTimer: 0,

      gameLog: [
        { msg: `You arrive at the ${zone.name}.`, count: 1 },
        { msg: `A wild ${enemy.name} appears!`, count: 1 },
      ],
      saveTime: Date.now(),
      totalPlayTime: 0,
      equipLocks: {},
      autoEquipEnabled: false,
      activity: 'fight',
      fishingSpot: null,
      fishingTimer: 0,
      fishingCooldown: 0,
      fishCaught: 0,
      currencies: {},
      fishConsumeUses: 0,
    };
  }

  function readItemStat(item, key) {
    return item ? (item[key] || 0) : 0;
  }

  function readItemStats(eq, key) {
    let sum = 0;
    for (const slot of EQUIP_SLOTS) {
      sum += readItemStat(eq[slot], key);
    }
    return sum;
  }

  function effectiveStr(s) {
    let v = s.player.str;
    for (const slot of EQUIP_SLOTS) {
      v += (s.equipment[slot]?.bonusStr || 0);
    }
    return v;
  }

  function effectiveDex(s) {
    let v = s.player.dex;
    for (const slot of EQUIP_SLOTS) {
      v += (s.equipment[slot]?.bonusDex || 0);
    }
    return v;
  }

  function effectiveLuck(s) {
    let v = s.player.luck;
    for (const slot of EQUIP_SLOTS) {
      v += (s.equipment[slot]?.bonusLuck || 0);
    }
    return v;
  }

  function effectiveVit(s) {
    let v = s.player.vit;
    for (const slot of EQUIP_SLOTS) {
      v += (s.equipment[slot]?.bonusVit || 0);
    }
    return v;
  }

  function weaponDps(weapon) {
    if (!weapon) return 0;
    const minAtk = weapon.minAtk || weapon.atk || 0;
    const maxAtk = weapon.maxAtk || weapon.atk || 0;
    const speed = weapon.attackSpeed || BALANCE.ATTACK_SPEED_MS;
    return ((minAtk + maxAtk) / 2) / (speed / 1000);
  }

  function computeStats(s) {
    const p = s.player;
    const eq = s.equipment;
    const eStr = effectiveStr(s);
    const eDex = effectiveDex(s);
    const eLuck = effectiveLuck(s);
    const eVit = effectiveVit(s);

    const B = BALANCE;
    const maxHpBonus = readItemStats(eq, 'maxHpBonus');
    const maxHp = B.BASE_HP + (p.level - 1) * B.HP_PER_LEVEL + eVit * B.HP_PER_VIT + maxHpBonus;

    const weapon = eq.main_hand;
    const weaponAtk = weapon
      ? ((weapon.minAtk || weapon.atk || 0) + (weapon.maxAtk || weapon.atk || 0)) / 2
      : 0;
    const rawAtk = p.baseAtk + weaponAtk + readItemStats(eq, 'atk');
    const atkDmg = Math.floor(rawAtk * (1 + eStr * B.STR_DMG_SCALE));

    let armorRating = 0;
    let evasionRating = 0;
    for (const slot of DEFENCE_SLOTS) {
      armorRating += (eq[slot]?.armorRating || 0);
      evasionRating += (eq[slot]?.evasionRating || 0);
    }
    armorRating += Math.floor(armorRating * eStr * B.STR_ARMOR_SCALE);
    evasionRating += Math.floor(evasionRating * eDex * B.DEX_EVA_SCALE);

    const accuracyRating = B.BASE_ACCURACY + eDex * B.ACC_PER_DEX
      + (weapon?.accuracyBonus || 0);

    const baseCrit = eLuck * B.CRIT_PER_LUCK + (weapon?.critChance || 0);
    const critChance = Math.max(0, baseCrit);
    const critDmgBonus = readItemStats(eq, 'critDmg') + (weapon?.critDmg || 0);

    const xpMult = 1 + readItemStats(eq, 'xpMult');
    const goldMult = 1 + readItemStats(eq, 'goldMult');

    const attackSpeed = weapon?.attackSpeed || B.ATTACK_SPEED_MS;

    const msFromGear = readItemStats(eq, 'moveSpeed');
    const searchReduction = readItemStats(eq, 'searchSpeed');
    const monsterFindSpeed = (1 + msFromGear / 100) * (1 + searchReduction / 100);

    const flatBlock = readItemStats(eq, 'flatBlock');
    const thorns = readItemStats(eq, 'thorns');
    const lifeOnHit = readItemStats(eq, 'lifeOnHit');
    const dodgeChance = Math.min(60, readItemStats(eq, 'dodgeChance'));
    const stunChance = readItemStats(eq, 'stunChance');

    const rodPower = eq.rod?.fishingPower || 0;
    const baitPower = eq.bait?.fishingPower || 0;
    const fishingPower = 1 + (p.level - 1) * 3 + rodPower + baitPower + readItemStats(eq, 'fishingPower');

    const catchSpeed = readItemStats(eq, 'catchSpeed');
    const treasureChance = readItemStats(eq, 'treasureChance');

    return { maxHp, atkDmg, armorRating, evasionRating, accuracyRating,
      xpMult, goldMult, attackSpeed, monsterFindSpeed,
      critChance, critDmgBonus, flatBlock, thorns, lifeOnHit, dodgeChance, stunChance,
      weaponDps: weaponDps(weapon), fishingPower, catchSpeed, treasureChance };
  }

  function zoneInfo(s) {
    return UIRPG.Data.ZONES.map(z => ({
      name: z.name,
      unlocked: s.player.level >= z.minLevel,
      active: z.name === s.zone,
      minLevel: z.minLevel,
      enemies: z.enemies,
    }));
  }

  function clone(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function addGameLog(s, msg, type) {
    const log = s.gameLog;
    if (log.length > 0 && log[log.length - 1].msg === msg) {
      log[log.length - 1].count++;
    } else {
      log.push({ msg, count: 1, type: type || 'info' });
    }
    if (log.length > BALANCE.LOG_CAP) log.shift();
  }

  return { create, computeStats, zoneInfo, clone, addGameLog,
    effectiveStr, effectiveDex, effectiveLuck, effectiveVit,
    calcDR, calcDodge, BALANCE, EQUIP_SLOTS, DEFENCE_SLOTS, RING_SLOTS,
    invCap, bankCap, invUpgradeCost, bankUpgradeCost, weaponDps };
})();
