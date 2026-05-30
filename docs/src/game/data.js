UIRPG.Data = (() => {
  const ZONES = [
    { id: 'forest', name: 'Forest', minLevel: 1, treasureChance: 0.1, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 1.0, currency: true }], enemies: [
      { id: 'slime', name: 'Slime', hp: 40, atk: 1, def: 0, evasion: 0, accuracy: 35, xp: 8, gold: 3 },
      { id: 'goblin', name: 'Goblin', hp: 55, atk: 3, def: 1, evasion: 8, accuracy: 40, xp: 16, gold: 7 },
      { id: 'wolf', name: 'Wolf', hp: 70, atk: 4, def: 1, evasion: 5, accuracy: 45, xp: 24, gold: 12 },
    ]},
    { id: 'caves', name: 'Caves', minLevel: 1, treasureChance: 0.15, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.7, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.3, currency: true }], enemies: [
      { id: 'bat', name: 'Bat', hp: 120, atk: 7, def: 3, evasion: 22, accuracy: 45, xp: 32, gold: 14 },
      { id: 'skeleton', name: 'Skeleton', hp: 280, atk: 12, def: 5, evasion: 5, accuracy: 55, xp: 50, gold: 22 },
      { id: 'cave_troll', name: 'Cave Troll', hp: 400, atk: 16, def: 8, evasion: 0, accuracy: 50, xp: 75, gold: 35 },
    ]},
    { id: 'dungeon', name: 'Dungeon', minLevel: 1, treasureChance: 0.2, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.4, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.4, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.2, currency: true }], enemies: [
      { id: 'ghost', name: 'Ghost', hp: 280, atk: 26, def: 5, evasion: 28, accuracy: 45, xp: 70, gold: 28 },
      { id: 'dark_knight', name: 'Dark Knight', hp: 650, atk: 33, def: 13, evasion: 8, accuracy: 62, xp: 110, gold: 50 },
      { id: 'lich', name: 'Lich', hp: 1000, atk: 42, def: 16, evasion: 5, accuracy: 58, xp: 170, gold: 70 },
    ]},
    { id: 'mountains', name: 'Mountains', minLevel: 1, treasureChance: 0.25, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.3, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.4, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.3, currency: true }], enemies: [
      { id: 'dragon_hatchling', name: 'Dragon Hatchling', hp: 800, atk: 38, def: 15, evasion: 6, accuracy: 58, xp: 140, gold: 60 },
      { id: 'giant', name: 'Giant', hp: 1400, atk: 52, def: 22, evasion: 0, accuracy: 55, xp: 220, gold: 90 },
      { id: 'ancient_dragon', name: 'Ancient Dragon', hp: 2000, atk: 75, def: 28, evasion: 8, accuracy: 72, xp: 360, gold: 150 },
    ]},
    { id: 'swamp', name: 'Swamp', minLevel: 1, treasureChance: 0.3, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.2, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.45, currency: true }], enemies: [
      { id: 'marsh_viper', name: 'Marsh Viper', hp: 900, atk: 48, def: 12, evasion: 25, accuracy: 55, xp: 190, gold: 80 },
      { id: 'bog_witch', name: 'Bog Witch', hp: 1500, atk: 60, def: 15, evasion: 12, accuracy: 62, xp: 260, gold: 110 },
      { id: 'swamp_croc', name: 'Swamp Croc', hp: 2200, atk: 72, def: 25, evasion: 3, accuracy: 60, xp: 370, gold: 160 },
    ]},
    { id: 'desert', name: 'Desert', minLevel: 1, treasureChance: 0.35, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.15, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.5, currency: true }], enemies: [
      { id: 'sand_worm', name: 'Sand Worm', hp: 1800, atk: 58, def: 18, evasion: 5, accuracy: 58, xp: 280, gold: 120 },
      { id: 'mummy', name: 'Mummy', hp: 2400, atk: 70, def: 22, evasion: 2, accuracy: 62, xp: 380, gold: 160 },
      { id: 'scorpion_king', name: 'Scorpion King', hp: 3000, atk: 90, def: 28, evasion: 12, accuracy: 68, xp: 520, gold: 220 },
    ]},
    { id: 'tundra', name: 'Tundra', minLevel: 1, treasureChance: 0.4, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.1, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.3, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.6, currency: true }], enemies: [
      { id: 'frost_wolf', name: 'Frost Wolf', hp: 2000, atk: 68, def: 16, evasion: 20, accuracy: 60, xp: 350, gold: 150 },
      { id: 'yeti', name: 'Yeti', hp: 3500, atk: 88, def: 30, evasion: 3, accuracy: 62, xp: 500, gold: 210 },
      { id: 'ice_golem', name: 'Ice Golem', hp: 4800, atk: 105, def: 38, evasion: 0, accuracy: 64, xp: 680, gold: 280 },
    ]},
    { id: 'volcano', name: 'Volcano', minLevel: 1, treasureChance: 0.45, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.05, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.25, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.7, currency: true }], enemies: [
      { id: 'fire_elemental', name: 'Fire Elemental', hp: 2800, atk: 95, def: 12, evasion: 28, accuracy: 62, xp: 480, gold: 200 },
      { id: 'lava_golem', name: 'Lava Golem', hp: 5200, atk: 115, def: 40, evasion: 0, accuracy: 64, xp: 750, gold: 320 },
      { id: 'magma_wyrm', name: 'Magma Wyrm', hp: 6500, atk: 140, def: 35, evasion: 8, accuracy: 70, xp: 1000, gold: 420 },
    ]},
    { id: 'sky_temple', name: 'Sky Temple', minLevel: 1, treasureChance: 0.5, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.05, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.2, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.75, currency: true }], enemies: [
      { id: 'storm_eagle', name: 'Storm Eagle', hp: 3500, atk: 110, def: 20, evasion: 32, accuracy: 68, xp: 620, gold: 260 },
      { id: 'guardian_golem', name: 'Guardian Golem', hp: 6500, atk: 130, def: 45, evasion: 2, accuracy: 68, xp: 920, gold: 380 },
      { id: 'sky_seraph', name: 'Sky Seraph', hp: 8500, atk: 160, def: 38, evasion: 18, accuracy: 75, xp: 1350, gold: 550 },
    ]},
    { id: 'abyss', name: 'Abyss', minLevel: 1, treasureChance: 0.55, treasures: [{ id: 'old_coin', name: 'Old Coin', chance: 0.02, currency: true }, { id: 'pearl', name: 'Pearl', chance: 0.15, currency: true }, { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.83, currency: true }], enemies: [
      { id: 'shadow_demon', name: 'Shadow Demon', hp: 5000, atk: 130, def: 25, evasion: 38, accuracy: 68, xp: 850, gold: 360 },
      { id: 'void_beast', name: 'Void Beast', hp: 8500, atk: 155, def: 42, evasion: 5, accuracy: 72, xp: 1250, gold: 520 },
      { id: 'abyssal_dragon', name: 'Abyssal Dragon', hp: 12000, atk: 190, def: 50, evasion: 10, accuracy: 78, xp: 1850, gold: 750 },
    ]},
  ];

  function findZone(idOrName) {
    return ZONES.find(z => z.id === idOrName || z.name === idOrName);
  }

  function deepFreeze(obj) {
    Object.freeze(obj);
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object' && !Object.isFrozen(val)) deepFreeze(val);
    }
    return obj;
  }

  function validate() {
    const requiredZone = ['id', 'name', 'minLevel', 'enemies'];
    const requiredEnemy = ['id', 'name', 'hp', 'atk', 'def', 'evasion', 'accuracy', 'xp', 'gold'];
    for (const z of ZONES) {
      for (const key of requiredZone) {
        if (z[key] === undefined) console.warn(`Zone "${z.id || '?'}" missing field: ${key}`);
      }
      if (Array.isArray(z.enemies)) {
        for (const e of z.enemies) {
          for (const key of requiredEnemy) {
            if (e[key] === undefined) console.warn(`Enemy "${e.id || '?'}" in zone "${z.id}" missing field: ${key}`);
          }
        }
      }
    }
  }

  const FISHING_SPOTS = [
    { id: 'village_pond', name: 'Village Pond', minLevel: 1, minFishingPower: 0, catchTime: 10000, fish: [
      { id: 'trout', name: 'Trout', rarity: 'Common', xpMin: 3, xpMax: 6, goldValue: 2, tier: 1, healMin: 8, healMax: 14, maxUses: 1 },
      { id: 'perch', name: 'Perch', rarity: 'Common', xpMin: 5, xpMax: 9, goldValue: 4, tier: 1, healMin: 12, healMax: 20, maxUses: 1 },
      { id: 'golden_carp', name: 'Golden Carp', rarity: 'Uncommon', xpMin: 10, xpMax: 15, goldValue: 12, tier: 1, healMin: 20, healMax: 32, maxUses: 2 },
    ], treasureChance: 0.15, treasures: [
      { id: 'old_coin', name: 'Old Coin', chance: 0.6, currency: true },
      { id: 'pearl', name: 'Pearl', chance: 0.3, currency: true },
      { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.1, currency: true },
    ], treasureGoldMin: 5, treasureGoldMax: 20 },
    { id: 'forest_river', name: 'Forest River', minLevel: 5, minFishingPower: 10, catchTime: 11000, fish: [
      { id: 'salmon', name: 'Salmon', rarity: 'Common', xpMin: 8, xpMax: 14, goldValue: 6, tier: 2, healMin: 20, healMax: 32, maxUses: 1 },
      { id: 'rainbow_trout', name: 'Rainbow Trout', rarity: 'Uncommon', xpMin: 14, xpMax: 22, goldValue: 10, tier: 2, healMin: 32, healMax: 50, maxUses: 2 },
      { id: 'river_eel', name: 'River Eel', rarity: 'Rare', xpMin: 20, xpMax: 30, goldValue: 18, tier: 2, healMin: 45, healMax: 70, maxUses: 2 },
    ], treasureChance: 0.18, treasures: [
      { id: 'old_coin', name: 'Old Coin', chance: 0.5, currency: true },
      { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true },
      { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.15, currency: true },
    ], treasureGoldMin: 8, treasureGoldMax: 35 },
    { id: 'cave_lake', name: 'Cave Lake', minLevel: 10, minFishingPower: 25, catchTime: 12000, fish: [
      { id: 'cave_catfish', name: 'Cave Catfish', rarity: 'Common', xpMin: 15, xpMax: 25, goldValue: 10, tier: 3, healMin: 35, healMax: 55, maxUses: 1 },
      { id: 'glowing_guppy', name: 'Glowing Guppy', rarity: 'Uncommon', xpMin: 25, xpMax: 40, goldValue: 18, tier: 3, healMin: 50, healMax: 80, maxUses: 2 },
      { id: 'blind_sole', name: 'Blind Sole', rarity: 'Rare', xpMin: 35, xpMax: 55, goldValue: 30, tier: 3, healMin: 75, healMax: 110, maxUses: 3 },
    ], treasureChance: 0.2, treasures: [
      { id: 'old_coin', name: 'Old Coin', chance: 0.4, currency: true },
      { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true },
      { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.25, currency: true },
    ], treasureGoldMin: 12, treasureGoldMax: 50 },
    { id: 'mountain_stream', name: 'Mountain Stream', minLevel: 18, minFishingPower: 50, catchTime: 13000, fish: [
      { id: 'mountain_trout', name: 'Mountain Trout', rarity: 'Common', xpMin: 25, xpMax: 40, goldValue: 16, tier: 4, healMin: 55, healMax: 85, maxUses: 1 },
      { id: 'crystal_koi', name: 'Crystal Koi', rarity: 'Uncommon', xpMin: 40, xpMax: 60, goldValue: 28, tier: 4, healMin: 80, healMax: 120, maxUses: 2 },
      { id: 'golden_sturgeon', name: 'Golden Sturgeon', rarity: 'Epic', xpMin: 60, xpMax: 90, goldValue: 50, tier: 4, healMin: 120, healMax: 180, maxUses: 3 },
    ], treasureChance: 0.22, treasures: [
      { id: 'old_coin', name: 'Old Coin', chance: 0.3, currency: true },
      { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true },
      { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.3, currency: true },
    ], treasureGoldMin: 20, treasureGoldMax: 80 },
    { id: 'swamp_waters', name: 'Swamp Waters', minLevel: 25, minFishingPower: 100, catchTime: 14000, fish: [
      { id: 'swamp_bass', name: 'Swamp Bass', rarity: 'Common', xpMin: 35, xpMax: 55, goldValue: 22, tier: 5, healMin: 80, healMax: 130, maxUses: 2 },
      { id: 'murkfish', name: 'Murkfish', rarity: 'Rare', xpMin: 55, xpMax: 85, goldValue: 40, tier: 5, healMin: 130, healMax: 200, maxUses: 3 },
      { id: 'venom_ray', name: 'Venom Ray', rarity: 'Epic', xpMin: 80, xpMax: 120, goldValue: 65, tier: 5, healMin: 180, healMax: 280, maxUses: 4 },
    ], treasureChance: 0.25, treasures: [
      { id: 'old_coin', name: 'Old Coin', chance: 0.25, currency: true },
      { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true },
      { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.4, currency: true },
    ], treasureGoldMin: 30, treasureGoldMax: 120 },
    { id: 'desert_oasis', name: 'Desert Oasis', minLevel: 32, minFishingPower: 200, catchTime: 15000, fish: [
      { id: 'oasis_carp', name: 'Oasis Carp', rarity: 'Common', xpMin: 50, xpMax: 75, goldValue: 30, tier: 6, healMin: 120, healMax: 190, maxUses: 2 },
      { id: 'sand_ray', name: 'Sand Ray', rarity: 'Rare', xpMin: 75, xpMax: 110, goldValue: 55, tier: 6, healMin: 200, healMax: 300, maxUses: 3 },
      { id: 'mirage_angler', name: 'Mirage Angler', rarity: 'Legendary', xpMin: 110, xpMax: 160, goldValue: 90, tier: 6, healMin: 320, healMax: 480, maxUses: 5 },
    ], treasureChance: 0.28, treasures: [
      { id: 'old_coin', name: 'Old Coin', chance: 0.2, currency: true },
      { id: 'pearl', name: 'Pearl', chance: 0.35, currency: true },
      { id: 'ancient_relic', name: 'Ancient Relic', chance: 0.45, currency: true },
    ], treasureGoldMin: 45, treasureGoldMax: 180 },
  ];

  function findFishingSpot(idOrName) {
    return FISHING_SPOTS.find(s => s.id === idOrName || s.name === idOrName);
  }

  function fishingSpotInfo(s) {
    const fp = UIRPG.Fishing.fishingPower(s);
    return FISHING_SPOTS.map(spot => ({
      name: spot.name,
      unlocked: s.player.level >= spot.minLevel && fp >= (spot.minFishingPower || 0),
      active: spot.id === s.fishingSpot,
      minLevel: spot.minLevel,
      minFishingPower: spot.minFishingPower || 0,
      fish: spot.fish,
    }));
  }

  deepFreeze(ZONES);
  deepFreeze(FISHING_SPOTS);
  validate();

  return { ZONES, findZone, FISHING_SPOTS, findFishingSpot, fishingSpotInfo };
})();
