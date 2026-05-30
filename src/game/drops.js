UIRPG.Drops = (() => {
  const ZONE_NAMES = {
    forest:    { pre: 'Wooden',   suf: 'Club',   arm: 'Hide',   helm: 'Cap',   leg: 'Trousers',  boot: 'Sandals',  glove: 'Wraps',  belt: 'Strap',   amulet: 'Pendant', rod: 'Twig',   bait: 'Worms' },
    caves:     { pre: 'Bone',     suf: 'Blade',  arm: 'Boneplate', helm: 'Skullcap', leg: 'Greaves',  boot: 'Treads',   glove: 'Bracers', belt: 'Buckle',  amulet: 'Charm', rod: 'Bone',   bait: 'Leeches' },
    dungeon:   { pre: 'Dark',     suf: 'Sword',  arm: 'Mail',  helm: 'Coif',  leg: 'Leggings',  boot: 'Sabatons',  glove: 'Gauntlets', belt: 'Chain',  amulet: 'Sigil', rod: 'Iron',   bait: 'Glow Grubs' },
    mountains: { pre: 'Dragon',   suf: 'Axe',    arm: 'Scale', helm: 'Crown', leg: 'Plate',    boot: 'Greaves',   glove: 'Claws',     belt: 'Girdle', amulet: 'Talisman', rod: 'Steel',  bait: 'Dragonfly' },
    swamp:     { pre: 'Viper',    suf: 'Fang',   arm: 'Hide',  helm: 'Hood',  leg: 'Wraps',    boot: 'Moccasins', glove: 'Bindings',  belt: 'Vine',   amulet: 'Totem', rod: 'Moss',   bait: 'Maggots' },
    desert:    { pre: 'Scorched', suf: 'Sabre',  arm: 'Shell', helm: 'Crest', leg: 'Shinguards', boot: 'Slippers',  glove: 'Grips',     belt: 'Cord',   amulet: 'Eye', rod: 'Bamboo', bait: 'Scarabs' },
    tundra:    { pre: 'Frozen',   suf: 'Shard',  arm: 'Fur',   helm: 'Hood',  leg: 'Breeches',  boot: 'Snowshoes', glove: 'Mittens',    belt: 'Sash',   amulet: 'Pendant', rod: 'Ice',    bait: 'Krill' },
    volcano:   { pre: 'Magma',    suf: 'Cleaver',arm: 'Scale', helm: 'Mask',  leg: 'Cuisses',   boot: 'Stompers',  glove: 'Fists',     belt: 'Plating',amulet: 'Core', rod: 'Obsidian',bait: 'Ember Mites' },
    sky_temple:{ pre: 'Celestial',suf: 'Blade',  arm: 'Plate', helm: 'Diadem',leg: 'Chausses',  boot: 'Winged',    glove: 'Hands',     belt: 'Cord',   amulet: 'Halo', rod: 'Storm',  bait: 'Cloud Minnows' },
    abyss:     { pre: 'Void',     suf: 'Scythe', arm: 'Carapace', helm: 'Crown', leg: 'Faulds',   boot: 'Striders',  glove: 'Talons',    belt: 'Chain',  amulet: 'Orb', rod: 'Abyssal',bait: 'Shadow Lures' },
  };

    const FALLBACK = { pre: 'Old', suf: 'Weapon', arm: 'Armor', helm: 'Cap', leg: 'Pants', boot: 'Shoes', glove: 'Gloves', belt: 'Belt', amulet: 'Amulet', rod: 'Rod', bait: 'Bait' };

  const RARITIES = [
    { name: 'Common',    weight: 50, prefix: '',        bonusRolls: 0, salvageGold: 2 },
    { name: 'Uncommon',  weight: 30, prefix: 'Fine',    bonusRolls: 1, salvageGold: 8 },
    { name: 'Rare',      weight: 15, prefix: 'Superior',bonusRolls: 2, salvageGold: 20 },
    { name: 'Epic',      weight: 4,  prefix: 'Mythic',  bonusRolls: 3, salvageGold: 60 },
    { name: 'Legendary', weight: 1,  prefix: 'Legendary',bonusRolls: 4, salvageGold: 200 },
    { name: 'Unique',    weight: 0,  prefix: '',         bonusRolls: 0, salvageGold: 500 },
  ];

  const BONUS_POOL = [
    { key: 'atk',         label: 'ATK',  gen: t => 1 + Math.floor(Math.random() * (1 + t)) },
    { key: 'armorRating', label: 'ARM',  gen: t => 2 + Math.floor(Math.random() * (2 + t)) },
    { key: 'evasionRating',label: 'EVA', gen: t => 2 + Math.floor(Math.random() * (2 + t)) },
    { key: 'bonusStr',    label: 'STR',  gen: _ => 1 + Math.floor(Math.random() * 3) },
    { key: 'bonusDex',    label: 'DEX',  gen: _ => 1 + Math.floor(Math.random() * 3) },
    { key: 'bonusLuck',   label: 'LCK',  gen: _ => 1 + Math.floor(Math.random() * 3) },
    { key: 'bonusVit',    label: 'VIT',  gen: _ => 1 + Math.floor(Math.random() * 3) },
    { key: 'moveSpeed',   label: 'MS',   gen: _ => Math.floor(Math.random() * 4) + 2 },
    { key: 'critChance',  label: 'CRIT', gen: _ => 1 + Math.floor(Math.random() * 3) },
    { key: 'critDmg',     label: 'CDMG', gen: _ => Math.round((0.05 + Math.random() * 0.1) * 100) / 100 },
    { key: 'fishingPower', label: 'FP',  gen: t => 2 + Math.floor(Math.random() * (2 + t)) },
    { key: 'catchSpeed',  label: 'CAST', gen: _ => Math.floor(Math.random() * 4) + 1 },
    { key: 'treasureChance',label: 'TRSR', gen: _ => Math.floor(Math.random() * 3) + 1 },
  ];

  const UNIQUE_DROPS = {
    slime: {
      id: 'sticky_shield', baseName: 'Sticky Shield', kind: 'off_hand',
      rarity: 'Unique', flatBlock: 2, dropChance: 0.05,
      desc: 'Blocks 2 flat damage',
    },
    goblin: {
      id: 'goblins_pouch', baseName: "Goblin's Pouch", kind: 'belt',
      rarity: 'Unique', goldMult: 1.0, dropChance: 0.05,
      desc: 'Double gold from kills',
    },
    wolf: {
      id: 'wolfs_fang', baseName: "Wolf's Fang", kind: 'main_hand',
      rarity: 'Unique', lifeOnHit: 3, attackSpeed: 1200, minAtk: 4, maxAtk: 8,
      dropChance: 0.05, desc: 'Heal 3 HP per hit',
    },
    bat: {
      id: 'echo_locator', baseName: 'Echo Locator', kind: 'amulet',
      rarity: 'Unique', searchSpeed: 50, dropChance: 0.05,
      desc: 'Find enemies 50% faster',
    },
    skeleton: {
      id: 'boneplate', baseName: 'Boneplate', kind: 'chest',
      rarity: 'Unique', thorns: 3, dropChance: 0.05,
      desc: 'Reflect 3 damage to attackers',
    },
    cave_troll: {
      id: 'troll_blood', baseName: "Troll's Blood", kind: 'ring',
      rarity: 'Unique', lifeOnHit: 3, dropChance: 0.05,
      desc: 'Heal 3 HP per hit',
    },
    ghost: {
      id: 'ghostly_cloak', baseName: 'Ghostly Cloak', kind: 'chest',
      rarity: 'Unique', dodgeChance: 15, dropChance: 0.05,
      desc: '15% chance to dodge attacks',
    },
    dark_knight: {
      id: 'cursed_blade', baseName: 'Cursed Blade', kind: 'main_hand',
      rarity: 'Unique', critDmg: 0.5, critChance: 10,
      attackSpeed: 2400, minAtk: 6, maxAtk: 14,
      dropChance: 0.05, desc: 'Critical hits deal 50% more damage',
    },
    lich: {
      id: 'soul_gem', baseName: 'Soul Gem', kind: 'ring',
      rarity: 'Unique', xpMult: 0.25, dropChance: 0.05,
      desc: '+25% XP from kills',
    },
    dragon_hatchling: {
      id: 'dragon_scale', baseName: 'Dragon Scale', kind: 'chest',
      rarity: 'Unique', flatBlock: 5, dropChance: 0.05,
      desc: 'Blocks 5 flat damage',
    },
    giant: {
      id: 'giants_club', baseName: "Giant's Club", kind: 'main_hand',
      rarity: 'Unique', stunChance: 20, attackSpeed: 3000, minAtk: 8, maxAtk: 20,
      dropChance: 0.05, desc: '20% chance to stun (skip enemy turn)',
    },
    ancient_dragon: {
      id: 'dragon_heart', baseName: "Dragon's Heart", kind: 'amulet',
      rarity: 'Unique', maxHpBonus: 50, flatBlock: 3, dropChance: 0.05,
      desc: '+50 max HP, blocks 3 flat damage',
    },
    marsh_viper: {
      id: 'viper_sting', baseName: "Viper's Sting", kind: 'main_hand',
      rarity: 'Unique', lifeOnHit: 5, attackSpeed: 1000, minAtk: 3, maxAtk: 7,
      dropChance: 0.05, desc: 'Heal 5 HP per hit',
    },
    bog_witch: {
      id: 'witches_brew', baseName: "Witch's Brew", kind: 'amulet',
      rarity: 'Unique', bonusLuck: 5, xpMult: 0.1, dropChance: 0.05,
      desc: '+5 Luck, +10% XP',
    },
    sand_worm: {
      id: 'sand_carapace', baseName: 'Sand Carapace', kind: 'chest',
      rarity: 'Unique', armorRating: 25, dropChance: 0.05,
      desc: '+25 base armor rating',
    },
    mummy: {
      id: 'mummy_wraps', baseName: 'Mummy Wraps', kind: 'belt',
      rarity: 'Unique', flatBlock: 3, armorRating: 8, dropChance: 0.05,
      desc: 'Blocks 3 flat damage, +8 armor',
    },
    yeti: {
      id: 'yeti_fur', baseName: 'Yeti Fur', kind: 'chest',
      rarity: 'Unique', maxHpBonus: 80, dropChance: 0.05,
      desc: '+80 max HP',
    },
    fire_elemental: {
      id: 'ember_core', baseName: 'Ember Core', kind: 'ring',
      rarity: 'Unique', thorns: 8, dropChance: 0.05,
      desc: 'Reflect 8 damage',
    },
    storm_eagle: {
      id: 'storm_feather', baseName: 'Storm Feather', kind: 'boots',
      rarity: 'Unique', evasionRating: 20, moveSpeed: 15, dropChance: 0.05,
      desc: '+20 evasion, +15% move speed',
    },
    shadow_demon: {
      id: 'shadow_cloak', baseName: 'Shadow Cloak', kind: 'gloves',
      rarity: 'Unique', dodgeChance: 20, dropChance: 0.05,
      desc: '20% chance to dodge',
    },
  };

  const DEFENCE_SLOTS = ['off_hand', 'helmet', 'chest', 'leggings', 'boots', 'gloves', 'belt'];
  const SLOT_NAMES = {
    off_hand: 'Shield', helmet: 'Helmet', chest: 'Armor',
    leggings: 'Leggings', boots: 'Boots', gloves: 'Gloves', belt: 'Belt',
    rod: 'Rod', bait: 'Bait',
  };

  function theme(zoneId) {
    return ZONE_NAMES[zoneId] || FALLBACK;
  }

  let idCounter = 0;
  function genId() {
    return `item_${++idCounter}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function pickRarity() {
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    for (const r of RARITIES) {
      roll -= r.weight;
      if (roll <= 0) return r;
    }
    return RARITIES[RARITIES.length - 1];
  }

  function bonusRoll(item, tier) {
    const pool = BONUS_POOL.filter(b => {
      if (b.key === 'atk' && item.kind === 'main_hand') return true;
      if (b.key === 'critChance' && item.kind === 'main_hand') return true;
      if (b.key === 'critDmg' && item.kind === 'main_hand') return true;
      if (b.key === 'armorRating' && item.armorRating) return true;
      if (b.key === 'evasionRating' && item.evasionRating) return true;
      if (b.key === 'fishingPower' && (item.kind === 'rod' || item.kind === 'bait')) return true;
      if (b.key === 'catchSpeed' && item.kind === 'bait') return true;
      if (b.key === 'treasureChance' && item.kind === 'bait') return true;
      // Attributes (STR/DEX/LCK/VIT) cannot roll on weapons
      if (item.kind === 'main_hand' && ['bonusStr','bonusDex','bonusLuck','bonusVit','moveSpeed'].includes(b.key)) return false;
      if (b.key !== 'atk' && b.key !== 'armorRating' && b.key !== 'evasionRating'
        && b.key !== 'critChance' && b.key !== 'critDmg'
        && b.key !== 'fishingPower' && b.key !== 'catchSpeed' && b.key !== 'treasureChance') return true;
      return false;
    });
    const b = pool[Math.floor(Math.random() * pool.length)];
    const val = b.gen(tier);
    item[b.key] = (item[b.key] || 0) + val;
    return `${b.label}+${val}`;
  }

  function generateDrop(s) {
    const zone = UIRPG.Data.findZone(s.zone);
    const minLvl = zone ? zone.minLevel : 1;
    const tier = Math.max(1, Math.floor(minLvl / 5) + 1);

    if (s.currentEnemy) {
      const uid = s.currentEnemy.id;
      const template = UNIQUE_DROPS[uid];
      if (template && Math.random() < template.dropChance) {
        return { ...template, id: genId(), enchants: 0, tier };
      }
    }
    const th = theme(zone ? zone.id : 'forest');
    const rarity = pickRarity();
    const rolls = Math.random();

    let item;
    if (rolls < 0.11)        item = genMainHand(tier, th);
    else if (rolls < 0.22)   item = genDefensiveItem('off_hand', tier, th);
    else if (rolls < 0.33)   item = genDefensiveItem('helmet', tier, th);
    else if (rolls < 0.46)   item = genDefensiveItem('chest', tier, th);
    else if (rolls < 0.55)   item = genDefensiveItem('leggings', tier, th);
    else if (rolls < 0.64)   item = genDefensiveItem('boots', tier, th);
    else if (rolls < 0.71)   item = genDefensiveItem('gloves', tier, th);
    else if (rolls < 0.78)   item = genRing(tier);
    else if (rolls < 0.84)   item = genDefensiveItem('belt', tier, th);
    else if (rolls < 0.92)   item = genRod(tier, th);
    else                     item = genBait(tier, th);

    item.rarity = rarity.name;
    item.tier = tier;

    for (let i = 0; i < rarity.bonusRolls; i++) {
      bonusRoll(item, tier);
    }

    return item;
  }

  // Weapon damage scaling to achieve ~10 second kill times
  // Based on average monster HP per zone, accounting for baseAtk=1 and STR=5 (10% bonus)
  const WEAPON_DAMAGE_BY_TIER = [
    0,      // tier 0 (unused)
    13.5,   // tier 1 (Forest) - avg 80 HP
    47.5,   // tier 2 (Caves) - avg 267 HP
    115.9,  // tier 3 (Dungeon) - avg 643 HP
    253.5,  // tier 4 (Mountains) - avg 1400 HP
    277.7,  // tier 5 (Swamp) - avg 1533 HP
    435.4,  // tier 6 (Desert) - avg 2400 HP
    623.2,  // tier 7 (Tundra) - avg 3433 HP
    877.7,  // tier 8 (Volcano) - avg 4833 HP
    1120.2, // tier 9 (Sky Temple) - avg 6167 HP
    1544.4, // tier 10 (Abyss) - avg 8500 HP
  ];

  function genMainHand(tier, th) {
    const archetype = Math.random();
    const targetAvg = WEAPON_DAMAGE_BY_TIER[tier] || WEAPON_DAMAGE_BY_TIER[1];

    if (archetype < 0.4) {
      // Quick Blade — fast (1200ms), accurate, 70% damage
      const weaponAvg = targetAvg * 0.7;
      const minAtk = Math.max(1, Math.floor(weaponAvg * 0.9));
      const maxAtk = Math.max(minAtk + 1, Math.ceil(weaponAvg * 1.1));
      const attackSpeed = 1200;
      const accuracyBonus = 15 + tier * 3;
      const baseName = `${th.pre} Stiletto`;
      return { id: genId(), kind: 'main_hand', baseName, minAtk, maxAtk, attackSpeed, accuracyBonus, enchants: 0 };
    } else if (archetype < 0.75) {
      // Balanced Sword — 2000ms, 100% damage
      const weaponAvg = targetAvg;
      const minAtk = Math.max(1, Math.floor(weaponAvg * 0.8));
      const maxAtk = Math.max(minAtk + 1, Math.ceil(weaponAvg * 1.2));
      const attackSpeed = 2000;
      const accuracyBonus = 5 + tier * 1;
      const critChance = 2 + tier * 1;
      const critDmg = 0.05 + tier * 0.02;
      const baseName = `${th.pre} ${th.suf}`;
      return { id: genId(), kind: 'main_hand', baseName, minAtk, maxAtk, attackSpeed, accuracyBonus, critChance, critDmg, enchants: 0 };
    } else {
      // Heavy Maul — slow (2800ms), hard-hitting, 130% damage, crit-focused
      const weaponAvg = targetAvg * 1.3;
      const minAtk = Math.max(1, Math.floor(weaponAvg * 0.7));
      const maxAtk = Math.max(minAtk + 1, Math.ceil(weaponAvg * 1.3));
      const attackSpeed = 2800;
      const critChance = 5 + tier * 2;
      const critDmg = 0.12 + tier * 0.05;
      const baseName = `${th.pre} Maul`;
      return { id: genId(), kind: 'main_hand', baseName, minAtk, maxAtk, attackSpeed, critChance, critDmg, enchants: 0 };
    }
  }

  function genStarterSword() {
    // Starter sword: 3 DPS at 2000ms speed
    // damage per attack = 3 * 2 = 6
    // With baseAtk=1 and STR=5: (1 + weaponAvg) * 1.1 = 6
    // weaponAvg = 4.45, so minAtk=3, maxAtk=6
    return {
      id: genId(),
      kind: 'main_hand',
      baseName: 'Rusty Sword',
      minAtk: 3,
      maxAtk: 6,
      attackSpeed: 2000,
      accuracyBonus: 5,
      critChance: 2,
      critDmg: 0.05,
      enchants: 0,
      rarity: 'Common',
      tier: 1,
    };
  }

  function getSlotName(kind, th) {
    const map = {
      off_hand: th.suf ? `${th.pre} Shield` : 'Shield',
      helmet: `${th.pre} ${th.helm}`,
      chest: `${th.pre} ${th.arm}`,
      leggings: `${th.pre} ${th.leg}`,
      boots: `${th.pre} ${th.boot}`,
      gloves: `${th.pre} ${th.glove}`,
      belt: `${th.pre} ${th.belt}`,
    };
    return map[kind] || (th.pre + ' ' + (SLOT_NAMES[kind] || 'Item'));
  }

  function genDefensiveItem(kind, tier, th) {
    const totalVal = Math.max(1, 1 + tier * 2 + Math.floor(Math.random() * (tier * 2 + 1)));

    const isArmour = Math.random() < 0.5;

    const item = {
      id: genId(), kind,
      baseName: getSlotName(kind, th),
      enchants: 0,
    };

    if (isArmour) {
      item.armorRating = Math.max(1, totalVal);
    } else {
      item.evasionRating = Math.max(1, totalVal);
    }

    return item;
  }

  function genRing(tier) {
    const types = [
      { key: 'bonusStr', label: 'Strength' },
      { key: 'bonusDex', label: 'Dexterity' },
      { key: 'bonusLuck', label: 'Luck' },
      { key: 'bonusVit', label: 'Vitality' },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    const val = 1 + Math.floor(Math.random() * (1 + tier));
    return {
      id: genId(), kind: 'ring',
      baseName: `Ring of ${t.label}`,
      [t.key]: val, enchants: 0,
    };
  }

  function genAmulet(tier, th) {
    const types = [
      { key: 'maxHpBonus', label: 'Vitality', gen: () => 5 + Math.floor(Math.random() * (tier * 5 + 1)) },
      { key: 'moveSpeed', label: 'Swiftness', gen: () => 2 + Math.floor(Math.random() * (tier + 2)) },
      { key: 'flatBlock', label: 'Warding', gen: () => 1 + Math.floor(Math.random() * (tier + 1)) },
      { key: 'lifeOnHit', label: 'Leech', gen: () => 1 + Math.floor(Math.random() * (tier + 1)) },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    const val = t.gen();
    return {
      id: genId(), kind: 'amulet',
      baseName: `${th.pre} ${th.amulet}`,
      [t.key]: val, enchants: 0,
    };
  }

  function genRod(tier, th) {
    const fp = Math.floor(tier * tier * 10 + tier * 5 + Math.random() * (tier * 10 + 5));
    return {
      id: genId(), kind: 'rod',
      baseName: `${th.pre} ${th.rod}`,
      fishingPower: fp, enchants: 0,
    };
  }

  function genBait(tier, th) {
    const archetype = Math.random();
    const fp = 1 + tier + Math.floor(Math.random() * (tier + 1));
    const item = {
      id: genId(), kind: 'bait',
      baseName: `${th.pre} ${th.bait}`,
      fishingPower: fp, enchants: 0,
    };

    if (archetype < 0.3) {
      // Swift Bait — focuses on catch speed
      item.catchSpeed = 3 + tier * 2 + Math.floor(Math.random() * (tier + 2));
      item.baseName = `Swift ${th.bait}`;
    } else if (archetype < 0.5) {
      // Lucky Bait — focuses on treasure chance
      item.treasureChance = 2 + tier * 2 + Math.floor(Math.random() * (tier + 2));
      item.baseName = `Lucky ${th.bait}`;
    } else if (archetype < 0.7) {
      // Heavy Bait — high fishing power, no other bonuses
      item.fishingPower = fp + 3 + tier * 2 + Math.floor(Math.random() * (tier + 2));
      item.baseName = `Heavy ${th.bait}`;
    } else if (archetype < 0.85) {
      // Balanced Bait — moderate all stats
      item.catchSpeed = 1 + Math.floor(Math.random() * (2 + tier));
      item.treasureChance = 1 + Math.floor(Math.random() * (2 + tier));
      item.baseName = `Balanced ${th.bait}`;
    } else {
      // Expert Bait — high fishing power and catch speed
      item.fishingPower = fp + 2 + tier + Math.floor(Math.random() * (tier + 1));
      item.catchSpeed = 2 + tier * 2 + Math.floor(Math.random() * (tier + 1));
      item.baseName = `Expert ${th.bait}`;
    }

    return item;
  }

  const UNIQUE_DISPLAY_KEYS = [
    { key: 'atk', label: 'ATK' },
    { key: 'armorRating', label: 'ARM' },
    { key: 'evasionRating', label: 'EVA' },
    { key: 'bonusStr', label: 'STR' },
    { key: 'bonusDex', label: 'DEX' },
    { key: 'bonusLuck', label: 'LCK' },
    { key: 'bonusVit', label: 'VIT' },
    { key: 'moveSpeed', label: 'MS', suffix: '%' },
    { key: 'critChance', label: 'Crit', suffix: '%' },
    { key: 'lifeOnHit', label: 'Life on Hit' },
    { key: 'thorns', label: 'Thorns' },
    { key: 'flatBlock', label: 'Block' },
    { key: 'bonusRegen', label: 'HP/s' },
    { key: 'searchSpeed', label: 'Search Spd', suffix: '%' },
    { key: 'dodgeChance', label: 'Dodge', suffix: '%' },
    { key: 'stunChance', label: 'Stun', suffix: '%' },
    { key: 'goldMult', label: 'Gold', suffix: '%' },
    { key: 'xpMult', label: 'XP', suffix: '%' },
    { key: 'maxHpBonus', label: 'Max HP' },
    { key: 'fishingPower', label: 'FP' },
    { key: 'catchSpeed', label: 'Cast Spd', suffix: '%' },
    { key: 'treasureChance', label: 'Treasure', suffix: '%' },
  ];

  function itemStats(item) {
    const b = [];
    if (item.kind === 'fish') {
      if (item.healAmount) b.push(`Heal ${item.healAmount} HP`);
      if (item.uses !== undefined) b.push(`${item.uses}/${item.maxUses || item.uses} uses`);
      return b;
    }
    for (const dk of UNIQUE_DISPLAY_KEYS) {
      if (item.kind === 'main_hand' && (dk.key === 'atk' || dk.key === 'critChance')) continue;
      const val = item[dk.key];
      if (val) {
        if (dk.rawPct) {
          b.push(`+${Math.round(val * 100)}% ${dk.label}`);
        } else if (dk.key === 'goldMult' || dk.key === 'xpMult') {
          b.push(`+${Math.round(val * 100)}% ${dk.label}`);
        } else if (dk.suffix) {
          b.push(`+${val}${dk.suffix} ${dk.label}`);
        } else {
          b.push(`+${val} ${dk.label}`);
        }
      }
    }
    return b;
  }

  const STAT_ADJECTIVES = {
    bonusStr: 'Strong',
    bonusDex: 'Nimble',
    bonusLuck: 'Lucky',
    bonusVit: 'Sturdy',
    atk: 'Powerful',
    armorRating: 'Hardened',
    evasionRating: 'Shadowy',
    moveSpeed: 'Swift',
    lifeOnHit: 'Vampiric',
    thorns: 'Barbed',
    flatBlock: 'Warded',
    bonusRegen: 'Regenerating',
    dodgeChance: 'Elusive',
    stunChance: 'Stunning',
    critDmg: 'Deadly',
    critChance: 'Precise',
    goldMult: 'Greedy',
    xpMult: 'Wise',
    maxHpBonus: 'Vital',
    fishingPower: 'Angler\'s',
    catchSpeed: 'Swift',
    treasureChance: 'Lucky',
    searchSpeed: 'Keen',
  };

  const BONUS_STAT_KEYS = Object.keys(STAT_ADJECTIVES);

  function isBonusStat(item, key) {
    if (key === 'atk' && item.kind !== 'main_hand') return true;
    if ((key === 'critChance' || key === 'critDmg') && item.kind !== 'main_hand') return true;
    return BONUS_STAT_KEYS.includes(key);
  }

  function displayName(item) {
    const ench = item.enchants ? ` +${item.enchants}` : '';
    if (item.rarity === 'Unique') {
      return `◆ ${item.baseName}${ench}`;
    }
    let bestKey = null;
    let bestVal = 0;
    for (const key of Object.keys(STAT_ADJECTIVES)) {
      const val = item[key];
      if (val && isBonusStat(item, key) && val > bestVal) {
        bestVal = val;
        bestKey = key;
      }
    }
    const base = item.baseName || (SLOT_NAMES[item.kind] || 'Item');
    if (bestKey) {
      return `${STAT_ADJECTIVES[bestKey]} ${base}${ench}`;
    }
    return `${base}${ench}`;
  }

  function deepFreeze(obj) {
    Object.freeze(obj);
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object' && !Object.isFrozen(val)) deepFreeze(val);
    }
    return obj;
  }

  deepFreeze(RARITIES);
  deepFreeze(UNIQUE_DROPS);
  deepFreeze(BONUS_POOL);

  return { generateDrop, RARITIES, displayName, itemStats, genStarterSword };
})();
