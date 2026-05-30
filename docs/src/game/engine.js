UIRPG.Engine = (() => {
  const B = UIRPG.State.BALANCE;

  function spawnEnemy(s) {
    const zone = UIRPG.Data.findZone(s.zone);
    if (!zone) return;
    const enemies = zone.enemies;
    const e = enemies[Math.floor(Math.random() * enemies.length)];
    s.currentEnemy = { ...e, hp: e.hp, maxHp: e.hp };
    s.fishConsumeUses = 0;
    const fish = s.equipment.fish;
    if (fish && fish.kind === 'fish' && fish.maxUses) {
      s.fishConsumeUses = fish.maxUses;
      fish.uses = fish.maxUses;
    }
    UIRPG.State.addGameLog(s, `A wild ${e.name} appears!`, 'info');
  }

  function resolveTick(s, dt) {
    const p = s.player;
    let stats = UIRPG.State.computeStats(s);

    if (p.hp > stats.maxHp) p.hp = stats.maxHp;

    if (p.hp <= 0) {
      handleDeath(s);
      return;
    }

    if (s.activity === 'fish') {
      UIRPG.Fishing.resolveTick(s, dt);
      return;
    }

    if (s.searching) {
      s.downtime -= dt;
      if (s.downtime <= 0) {
        s.searching = false;
        spawnEnemy(s);
      }
    }

    if (!s.searching && s.currentEnemy && s.currentEnemy.hp > 0 && p.hp > 0) {
      s.combatTimer = (s.combatTimer || 0) + dt;
      while (s.combatTimer >= stats.attackSpeed) {
        s.combatTimer -= stats.attackSpeed;
        processRound(s, stats);
        if (s.searching || p.hp <= 0 || !s.currentEnemy || s.currentEnemy.hp <= 0) break;
        stats = UIRPG.State.computeStats(s);
      }
    }
  }

  function handleEnemyDeath(s, stats, source) {
    const p = s.player;
    const e = s.currentEnemy;
    const xpGained = Math.floor(e.xp * stats.xpMult);
    const goldGained = Math.floor(e.gold * stats.goldMult);
    const msg = source === 'thorns'
      ? `${e.name} slain by thorns! +${xpGained} XP, +${goldGained} gold`
      : `${e.name} slain! +${xpGained} XP, +${goldGained} gold`;
    UIRPG.State.addGameLog(s, msg, 'reward');
    p.xp += xpGained;
    p.gold += goldGained;
    UIRPG.Events.emit('enemy:slain', { enemy: e.name, xp: xpGained, gold: goldGained });

    UIRPG.Actions.handleDrop(s, UIRPG.Drops.generateDrop(s), e.name);

    const zone = UIRPG.Data.findZone(s.zone);
    if (zone && zone.treasures && zone.treasures.length && Math.random() < (zone.treasureChance || 0)) {
      let tr = Math.random();
      let picked = zone.treasures[zone.treasures.length - 1];
      for (const t of zone.treasures) {
        tr -= t.chance;
        if (tr <= 0) { picked = t; break; }
      }
      if (picked && picked.currency) {
        s.currencies = s.currencies || {};
        s.currencies[picked.id] = (s.currencies[picked.id] || 0) + 1;
        UIRPG.State.addGameLog(s, `Found ${picked.name} from ${e.name}!`, 'reward');
      }
    }

    const fish = s.equipment.fish;
    if (fish && fish.kind === 'fish' && s.fishConsumeUses > 0) {
      const totalHeal = s.fishConsumeUses * (fish.healAmount || 10);
      const maxHp = UIRPG.State.computeStats(s).maxHp;
      p.hp = Math.min(maxHp, p.hp + totalHeal);
      UIRPG.State.addGameLog(s, `Ate remaining ${UIRPG.Drops.displayName(fish)} uses: +${totalHeal} HP`, 'reward');
      s.fishConsumeUses = 0;
      fish.uses = 0;
    }

    checkLevelUp(s);
    UIRPG.Events.emit('inventory:changed');
    s.combatTimer = 0;
    s.searching = true;
    s.downtime = B.BASE_SEARCH_MS / stats.monsterFindSpeed;
  }

  function rollCrit(critChance, critDmgBonus) {
    let critLevel = 0;
    let remaining = critChance;
    while (remaining > 0) {
      if (Math.random() * 100 < Math.min(remaining, 100)) critLevel++;
      remaining -= 100;
    }
    if (critLevel === 0) return { level: 0, mult: 1 };
    return { level: critLevel, mult: Math.pow(B.BASE_CRIT_MULT + critDmgBonus, critLevel) };
  }

  function critLabel(level) {
    if (level <= 1) return 'crit';
    if (level === 2) return 'double crit!';
    if (level === 3) return 'triple crit!!';
    return `${level}x crit${'!'.repeat(level)}`;
  }

  function rollWeaponDamage(weapon) {
    if (!weapon) return 0;
    const minAtk = weapon.minAtk || weapon.atk || 0;
    const maxAtk = weapon.maxAtk || weapon.atk || 0;
    return minAtk + Math.random() * (maxAtk - minAtk);
  }

  function processRound(s, stats) {
    const p = s.player;
    const e = s.currentEnemy;
    const eStr = UIRPG.State.effectiveStr(s);
    if (!e || e.hp <= 0) return;

    const hitChance = Math.max(B.HIT_MIN, Math.min(B.HIT_MAX,
      stats.accuracyRating / (stats.accuracyRating + (e.evasion || 0) * B.ENEMY_EVA_MULT) * 100));
    const hitRoll = Math.random() * 100;
    if (hitRoll < hitChance) {
      const weaponHit = rollWeaponDamage(s.equipment.main_hand);
      const rawHit = Math.floor((p.baseAtk + weaponHit) * (1 + eStr * B.STR_DMG_SCALE));
      let dmg = Math.max(1, rawHit - Math.floor(e.def / 2));

      const crit = rollCrit(stats.critChance, stats.critDmgBonus);
      if (crit.level > 0) {
        dmg = Math.floor(dmg * crit.mult);
      }

      e.hp -= dmg;
      if (crit.level > 0) {
        UIRPG.State.addGameLog(s, `You ${critLabel(crit.level)} ${e.name} for ${dmg} damage!`, 'reward');
      } else {
        UIRPG.State.addGameLog(s, `You hit ${e.name} for ${dmg} damage`, 'info');
      }

      if (stats.lifeOnHit && p.hp > 0) {
        p.hp = Math.min(stats.maxHp, p.hp + stats.lifeOnHit);
      }

      const stunned = stats.stunChance > 0 && Math.random() * 100 < stats.stunChance;
      if (stunned) {
        UIRPG.State.addGameLog(s, `${e.name} is stunned!`, 'info');
      }

      if (e.hp <= 0) {
        handleEnemyDeath(s, stats, 'attack');
        return;
      }

      if (stunned) return;
    } else {
      UIRPG.State.addGameLog(s, `You missed ${e.name}!`, 'evasion');
    }

    const enemyAcc = e.accuracy || B.DEFAULT_ENEMY_ACC;
    const enemyHitChance = Math.max(B.HIT_MIN, Math.min(B.HIT_MAX,
      enemyAcc / (enemyAcc + stats.evasionRating) * 100));
    const eHitRoll = Math.random() * 100;
    if (eHitRoll < enemyHitChance) {
      // Check for dodge chance (from items like Ghostly Cloak)
      if (stats.dodgeChance > 0 && Math.random() * 100 < stats.dodgeChance) {
        UIRPG.State.addGameLog(s, `You dodged ${e.name}'s attack!`, 'evasion');
      } else {
        const dr = UIRPG.State.calcDR(stats.armorRating) / 100;
        const rawDmg = e.atk;
        const blocked = Math.min(rawDmg, stats.flatBlock);
        const finalDmg = Math.max(1, Math.floor(rawDmg * (1 - dr)) - blocked);
        p.hp = Math.max(0, p.hp - finalDmg);
        UIRPG.State.addGameLog(s, `${e.name} hit you for ${finalDmg} damage`, 'damage');

        if (p.hp > 0 && p.hp < stats.maxHp) {
          const fish = s.equipment.fish;
          if (fish && fish.kind === 'fish' && s.fishConsumeUses > 0) {
            const heal = fish.healAmount || 10;
            if (p.hp + heal <= stats.maxHp) {
              s.fishConsumeUses--;
              fish.uses = s.fishConsumeUses;
              p.hp = Math.min(stats.maxHp, p.hp + heal);
              UIRPG.State.addGameLog(s, `${UIRPG.Drops.displayName(fish)} heals ${heal} HP (${s.fishConsumeUses} uses left)`, 'reward');
            }
          }
        }

        if (stats.thorns > 0) {
          e.hp -= stats.thorns;
          if (e.hp <= 0) {
            handleEnemyDeath(s, stats, 'thorns');
            return;
          }
        }
      }
    } else {
      UIRPG.State.addGameLog(s, `${e.name} missed you!`, 'evasion');
    }

    if (p.hp <= 0) {
      p.hp = 0;
    }
  }

  function checkLevelUp(s) {
    const p = s.player;
    let leveled = false;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.baseAtk += B.BASE_ATK_PER_LEVEL;
      p.statPoints += B.STAT_POINTS_PER_LEVEL;
      p.xpNext = B.XP_BASE + p.level * B.XP_PER_LEVEL;
      p.hp = UIRPG.State.computeStats(s).maxHp;
      leveled = true;
      UIRPG.State.addGameLog(s, `Level up! You are now level ${p.level}! (+${B.STAT_POINTS_PER_LEVEL} stat points)`, 'reward');
      UIRPG.Events.emit('player:levelUp', { level: p.level, statPoints: B.STAT_POINTS_PER_LEVEL });
      UIRPG.Actions.autoSpendStats(s);
    }
    if (leveled && p.statPoints > 0) {
      UIRPG.Events.emit('player:unspentStats', { points: p.statPoints });
    }
  }

  function handleDeath(s) {
    const p = s.player;
    
    // Hardcore mode: delete character on death
    if (s.characterMode === 'hardcore') {
      UIRPG.State.addGameLog(s, `You died in Hardcore mode! Character deleted.`, 'damage');
      UIRPG.Characters.deleteCharacter(s.characterId);
      UIRPG.Events.emit('player:hardcoreDeath', { characterId: s.characterId });
      return;
    }
    
    const loss = Math.max(1, Math.floor(p.gold / B.DEATH_GOLD_FRACTION) + B.DEATH_GOLD_FLAT);
    p.gold = Math.max(0, p.gold - loss);
    const stats = UIRPG.State.computeStats(s);
    p.hp = Math.floor(stats.maxHp * B.DEATH_HP_FRACTION);

    if (s.currentEnemy) {
      s.currentEnemy.hp = s.currentEnemy.maxHp;
    }
    s.combatTimer = 0;
    UIRPG.State.addGameLog(s, `You died! Lost ${loss} gold.`, 'damage');
    UIRPG.Events.emit('player:died', { goldLoss: loss });
  }

  function simulateOffline(s, elapsedMs) {
    const simMs = elapsedMs * 0.5;
    const steps = Math.min(Math.floor(simMs / 50), 500000);
    const dt = simMs / steps;

    const snapshot = UIRPG.State.clone(s);

    for (let i = 0; i < steps; i++) {
      resolveTick(s, dt);
    }

    const xpGained = s.player.xp - snapshot.player.xp;
    const goldGained = s.player.gold - snapshot.player.gold;
    const levelsGained = s.player.level - snapshot.player.level;
    const itemsGained = s.inventory.length - snapshot.inventory.length;

    if (s.player.hp <= 0) {
      s.player.hp = Math.floor(UIRPG.State.computeStats(s).maxHp * B.DEATH_HP_FRACTION);
    }

    return {
      elapsed: Math.round(simMs / 1000),
      xpGained,
      goldGained,
      levelsGained,
      itemsGained,
    };
  }

  return { resolveTick, spawnEnemy, simulateOffline };
})();
