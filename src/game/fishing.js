UIRPG.Fishing = (() => {
  const B = UIRPG.State.BALANCE;

  function fishingPower(s) {
    const stats = UIRPG.State.computeStats(s);
    return stats.fishingPower;
  }

  function catchSpeedMult(s) {
    const stats = UIRPG.State.computeStats(s);
    const fpBonus = (stats.fishingPower || 0) * 0.2;
    const gearBonus = (stats.catchSpeed || 0);
    return Math.max(0.15, 1 - (fpBonus + gearBonus) / 100);
  }

  function treasureChanceBonus(s) {
    const stats = UIRPG.State.computeStats(s);
    return stats.treasureChance || 0;
  }

  function spotCooldown(spot) {
    const ranks = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Unique: 5 };
    const maxRank = Math.max(...spot.fish.map(f => ranks[f.rarity] || 0));
    const min = 800 + maxRank * 400;
    const max = 1500 + maxRank * 800;
    return Math.floor(min + Math.random() * (max - min));
  }

  function startFishing(s, spotId) {
    const spot = UIRPG.Data.findFishingSpot(spotId);
    if (!spot) return false;
    const fp = fishingPower(s);
    if (fp < (spot.minFishingPower || 0)) {
      UIRPG.State.addGameLog(s, `Need ${spot.minFishingPower} fishing power for ${spot.name} (you have ${fp}).`, 'evasion');
      return false;
    }
    s.activity = 'fish';
    s.fishingSpot = spot.id;
    s.fishingTimer = 0;
    s.fishingCooldown = 0;
    UIRPG.State.addGameLog(s, `You start fishing at the ${spot.name}.`, 'subtle');
    UIRPG.Events.emit('activity:changed');
    return true;
  }

  function resolveTick(s, dt) {
    const spot = UIRPG.Data.findFishingSpot(s.fishingSpot);
    if (!spot) return;

    if (s.fishingCooldown > 0) {
      s.fishingCooldown = Math.max(0, s.fishingCooldown - dt);
      return;
    }

    const effectiveCatchTime = spot.catchTime * catchSpeedMult(s);

    s.fishingTimer += dt;

    if (s.fishingTimer >= effectiveCatchTime) {
      if (s.fishingTimer > effectiveCatchTime * 1.15) {
        UIRPG.State.addGameLog(s, `The fish escaped! You reeled too slowly.`, 'evasion');
      } else {
        catchFish(s, spot);
      }
      s.fishingTimer = 0;
      s.fishingCooldown = spotCooldown(spot);
      return;
    }

    const yankChance = 0.003 * (dt / 16);
    if (s.fishingTimer > effectiveCatchTime * 0.3 && Math.random() < yankChance) {
      const yankAmount = effectiveCatchTime * (0.05 + Math.random() * 0.1);
      s.fishingTimer = Math.max(0, s.fishingTimer - yankAmount);
      UIRPG.State.addGameLog(s, `Fish tugs the line...`, 'evasion');
    }
  }

  function fishDifficulty(rarity) {
    const d = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5, Unique: 6 };
    return d[rarity] || 1;
  }

  function spotRodTheme(spotId) {
    const themes = {
      village_pond: 'Simple',
      forest_river: 'Forest',
      cave_lake: 'Cave',
      mountain_stream: 'Mountain',
      swamp_waters: 'Swamp',
      desert_oasis: 'Desert',
    };
    return themes[spotId] || 'Basic';
  }

  function genFishingRod(tier, spotId) {
    const pre = spotRodTheme(spotId);
    const fp = Math.floor(tier * tier * 10 + tier * 5 + Math.random() * (tier * 10 + 5));
    return {
      id: `rod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'rod',
      baseName: `${pre} Rod`,
      fishingPower: fp,
      tier: tier,
      rarity: tier > 4 ? 'Rare' : tier > 2 ? 'Uncommon' : 'Common',
      enchants: 0,
    };
  }

  function catchFish(s, spot) {
    const p = s.player;
    const tcBonus = treasureChanceBonus(s);
    const baseTreasureChance = (spot.treasureChance || 0) + tcBonus / 100;

    const roll = Math.random();

    if (roll < 0.6) {
      const available = spot.fish;
      if (!available.length) return;
      const totalWeight = available.reduce((sum, f) => sum + rarityWeight(f.rarity), 0);
      let r = Math.random() * totalWeight;
      let picked = available[available.length - 1];
      for (const f of available) {
        r -= rarityWeight(f.rarity);
        if (r <= 0) { picked = f; break; }
      }
      const diff = fishDifficulty(picked.rarity);
      const fp = fishingPower(s);
      if (Math.random() > Math.min(1, fp / (diff * 35))) {
        UIRPG.State.addGameLog(s, `The ${picked.name} broke the line! Too strong!`, 'evasion');
        return;
      }

      const xp = picked.xpMin + Math.floor(Math.random() * (picked.xpMax - picked.xpMin + 1));
      const gold = picked.goldValue;
      p.xp += xp;
      p.gold += gold;
      s.fishCaught = (s.fishCaught || 0) + 1;

      const fishItem = {
        id: `fish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: 'fish',
        baseName: picked.name,
        rarity: picked.rarity,
        tier: picked.tier || 1,
        goldValue: picked.goldValue,
        xpValue: xp,
        healAmount: picked.healMin ? picked.healMin + Math.floor(Math.random() * (picked.healMax - picked.healMin + 1)) : 10,
        uses: picked.maxUses || 1,
        maxUses: picked.maxUses || 1,
        enchants: 0,
      };

      UIRPG.Actions.handleDrop(s, fishItem, spot.name, picked.name);
      UIRPG.Events.emit('inventory:changed');
    } else if (roll < 0.75) {
      const rodTier = Math.max(1, Math.floor((spot.fish[0]?.tier || 1) / 2) + 1);
      const rod = genFishingRod(rodTier, spot.id);
      const rodLabel = `${rod.rarity} ${rod.baseName} (FP ${rod.fishingPower})`;
      UIRPG.Actions.handleDrop(s, rod, spot.name, rodLabel);
      UIRPG.Events.emit('inventory:changed');
    } else if (roll < 0.75 + baseTreasureChance) {
      const treasures = spot.treasures || [];
      if (treasures.length) {
        let tr = Math.random();
        let pickedTreasure = treasures[treasures.length - 1];
        for (const t of treasures) {
          tr -= t.chance;
          if (tr <= 0) { pickedTreasure = t; break; }
        }
        if (pickedTreasure.currency) {
          s.currencies = s.currencies || {};
          s.currencies[pickedTreasure.id] = (s.currencies[pickedTreasure.id] || 0) + 1;
          UIRPG.State.addGameLog(s, `Found ${pickedTreasure.name}! (currency)`, 'reward');
        }
      }
      const tGold = spot.treasureGoldMin + Math.floor(Math.random() * (spot.treasureGoldMax - spot.treasureGoldMin + 1));
      p.gold += tGold;
      const tXp = 1 + Math.floor(Math.random() * 5);
      p.xp += tXp;
      UIRPG.State.addGameLog(s, `Treasure! +${tGold}g +${tXp}XP`, 'reward');
    } else {
      const nothingXp = Math.floor(Math.random() * 3) + 1;
      p.xp += nothingXp;
      UIRPG.State.addGameLog(s, `Nothing bites... +${nothingXp}XP`, 'info');
    }

    checkFishingLevelUp(s);
  }

  function rarityWeight(rarity) {
    const w = { Common: 50, Uncommon: 25, Rare: 15, Epic: 7, Legendary: 3, Unique: 0 };
    return w[rarity] || 1;
  }

  function checkFishingLevelUp(s) {
    const p = s.player;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.baseAtk += B.BASE_ATK_PER_LEVEL;
      p.statPoints += B.STAT_POINTS_PER_LEVEL;
      p.xpNext = B.XP_BASE + p.level * B.XP_PER_LEVEL;
      p.hp = UIRPG.State.computeStats(s).maxHp;
      UIRPG.State.addGameLog(s, `Level up! You are now level ${p.level}! (+${B.STAT_POINTS_PER_LEVEL} stat points)`, 'reward');
      UIRPG.Events.emit('player:levelUp', { level: p.level, statPoints: B.STAT_POINTS_PER_LEVEL });
    }
  }

  return { startFishing, resolveTick, fishingPower, catchSpeedMult, treasureChanceBonus };
})();
