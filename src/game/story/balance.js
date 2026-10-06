// Duel math. Hit chance stays in a narrow band. Difficulty changes how long each side lasts.
UIRPG.Balance = (() => {
  const ROUNDS = {
    easy: { killFoe: 2, killPc: 5 },
    medium: { killFoe: 3, killPc: 3 },
    hard: { killFoe: 4, killPc: 2 },
    deadly: { killFoe: 5, killPc: 2 },
  };

  function targetNumber(difficulty) {
    const raw = (difficulty === 'hard' || difficulty === 'deadly') ? 10 : 8;
    return Math.max(6, Math.min(12, raw));
  }

  function hitChance(target) {
    return (21 - target) / 20;
  }

  function expectedDpr(die, flatMod, chance) {
    const avgDie = UIRPG.Dice.dieAverage(die);
    const spec = UIRPG.Dice.parse(die);
    return chance * (avgDie + flatMod + spec.mod) + 0.05 * avgDie;
  }

  function standardAbilities(primary) {
    const abilities = { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 };
    abilities[primary || 'str'] = 16;
    return abilities;
  }

  function sampleSheet(classDef, level) {
    const abilities = standardAbilities(classDef.primary);
    const max = UIRPG.Sheet.maxHp(classDef, abilities, level);
    return {
      abilities,
      level,
      maxHp: max,
      hp: max,
      magic: UIRPG.Sheet.magicCap(level),
      classId: classDef.id,
    };
  }

  function buildFoe(sheet, classDef, foe) {
    const difficulty = (foe && foe.difficulty) || 'medium';
    const plan = ROUNDS[difficulty] || ROUNDS.medium;
    const target = targetNumber(difficulty);
    const tweak = foe && foe.acTweak ? foe.acTweak : 0;
    const playerTarget = Math.max(6, Math.min(12, target + tweak));
    const chance = hitChance(playerTarget);
    const foeChance = hitChance(target);
    const attack = UIRPG.Sheet.attackBonus(classDef, sheet.abilities, sheet.level, sheet.magic);
    const ac = UIRPG.Sheet.armorClass(classDef, sheet.abilities);
    const dmgMod = UIRPG.Sheet.damageMod(classDef, sheet.abilities, sheet.level, sheet.magic);
    const pcDpr = expectedDpr(classDef.weapon.damageDie, dmgMod, chance);
    let hp = Math.max(1, Math.round(plan.killFoe * pcDpr));
    if (foe && foe.hpTweak) hp = Math.max(1, Math.round(hp * (1 + foe.hpTweak)));
    const foeDpr = Math.max(1, sheet.maxHp / plan.killPc);
    const die = (foe && foe.damageDie) || '1d6';
    const avgDie = UIRPG.Dice.dieAverage(die);
    let attacks = 1;
    while (attacks < 3 && expectedDpr(die, 5, foeChance) * attacks < foeDpr) attacks += 1;
    const per = foeDpr / attacks;
    let damageMod = Math.round((per - 0.05 * avgDie) / foeChance - avgDie);
    if (damageMod < 0) damageMod = 0;
    const actualFoeDpr = expectedDpr(die, damageMod, foeChance) * attacks;
    return {
      id: foe && foe.id,
      name: (foe && foe.name) || 'Foe',
      difficulty,
      ac: attack + playerTarget,
      attack: ac - target,
      hp,
      maxHp: hp,
      damageDie: die,
      damageMod,
      attacks,
      target,
      playerChance: chance,
      foeChance,
      pcDpr,
      foeDpr: actualFoeDpr,
      roundsToKillFoe: hp / pcDpr,
      roundsToKillPc: sheet.maxHp / actualFoeDpr,
      moves: (foe && foe.moves) || [],
    };
  }

  function trickReplacesSwing(classDef, sheet, trick) {
    const target = targetNumber('medium');
    const chance = hitChance(target);
    const weaponMod = UIRPG.Sheet.damageMod(classDef, sheet.abilities, sheet.level, sheet.magic);
    const weapon = expectedDpr(classDef.weapon.damageDie, weaponMod, chance);
    const ability = trick.ability || classDef.primary;
    const trickMod = UIRPG.Sheet.modifier(sheet.abilities[ability] || 10);
    const pet = expectedDpr(trick.damageDie, trickMod, chance);
    return { weapon, pet, both: weapon + pet, replaces: pet <= weapon + 0.001 };
  }

  function report(content) {
    const levels = [1, 5, 11];
    const ids = ['fighter', 'ranger'];
    const lines = [];
    const rows = [];
    ids.forEach(id => {
      const classDef = content.classes.find(c => c.id === id);
      levels.forEach(level => {
        const sheet = sampleSheet(classDef, level);
        const row = buildFoe(sheet, classDef, { id: 'report', name: 'Medium', difficulty: 'medium', damageDie: '1d8' });
        row.classId = id;
        row.level = level;
        row.okChance = row.playerChance >= 0.45 && row.playerChance <= 0.75 && row.foeChance >= 0.45 && row.foeChance <= 0.75;
        row.okRounds = row.roundsToKillFoe >= 2 && row.roundsToKillFoe <= 4;
        if (id === 'ranger') {
          const wolf = content.pets.find(p => p.id === 'wolf');
          const trick = trickReplacesSwing(classDef, sheet, wolf.trick);
          row.pet = trick;
          row.okPet = trick.replaces && trick.both > trick.weapon;
        } else {
          row.okPet = true;
        }
        rows.push(row);
        lines.push(
          `${id} L${level}: AC foe ${row.ac}, atk ${row.attack}, hit ${(row.playerChance * 100).toFixed(0)}% / ${(row.foeChance * 100).toFixed(0)}%, rounds ${row.roundsToKillFoe.toFixed(2)}`
        );
      });
    });
    return { rows, lines, ok: rows.every(r => r.okChance && r.okRounds && r.okPet) };
  }

  return { ROUNDS, targetNumber, hitChance, expectedDpr, standardAbilities, sampleSheet, buildFoe, trickReplacesSwing, report };
})();
