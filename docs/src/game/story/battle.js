// One action each turn. Attack rolls, damage dice, and the natural 1 / natural 20 rules.
UIRPG.Battle = (() => {
  function attackResult(input) {
    const d20 = input.d20;
    const bonus = input.bonus || 0;
    const total = d20 + bonus;
    const fumble = d20 === 1;
    const crit = d20 === 20;
    const hit = !fumble && (crit || total >= input.ac);
    if (!hit) return { hit: false, crit: false, fumble, total, damage: 0 };
    const faces = input.damageFaces || [];
    const dice = crit ? faces.concat(faces) : faces.slice();
    const damage = dice.reduce((sum, face) => sum + face, 0) + (input.damageMod || 0);
    return { hit: true, crit, fumble: false, total, damage, dice };
  }

  function start(run, classDef, foeDef, rng) {
    const built = UIRPG.Balance.buildFoe({
      abilities: run.abilities,
      level: run.level,
      maxHp: run.maxHp,
      hp: run.hp,
      magic: run.magic,
    }, classDef, foeDef);
    const pInit = UIRPG.Dice.roll('1d20', rng, {
      mod: UIRPG.Sheet.modifier(run.abilities.dex || 10),
      parts: [{ label: 'DEX', value: UIRPG.Sheet.modifier(run.abilities.dex || 10) }],
    });
    const fInit = UIRPG.Dice.roll('1d20', rng);
    const playerFirst = pInit.total >= fInit.total;
    return {
      foe: built,
      foeId: foeDef.id,
      hp: run.hp,
      turn: playerFirst ? 'player' : 'foe',
      playerFirst,
      init: { player: pInit, foe: fInit },
      swing: 0,
      reacted: false,
      playerAc: UIRPG.Sheet.armorClass(classDef, run.abilities),
      advantageLeft: classDef.feature === 'advantage-first',
      healLeft: classDef.feature === 'heal-rest',
      win: null,
      flee: null,
      log: [`Initiative ${pInit.total} to ${fInit.total}. ${playerFirst ? 'You' : built.name} act first.`],
    };
  }

  function playerAttack(run, classDef, battle, rng, which) {
    const trick = which === 'pet' && run.pet ? run.pet.trick : null;
    const weapon = classDef.weapon;
    const die = trick ? trick.damageDie : weapon.damageDie;
    const ability = trick ? (trick.ability || weapon.ability) : weapon.ability;
    const mod = UIRPG.Sheet.modifier(run.abilities[ability] || 10);
    const prof = UIRPG.Sheet.proficiency(run.level);
    const magic = trick ? 0 : UIRPG.Sheet.magicBonus(run.level, run.magic);
    const bonus = mod + prof + magic;
    const advantage = !trick && battle.advantageLeft;
    if (advantage) battle.advantageLeft = false;
    const attack = UIRPG.Dice.roll('1d20', rng, {
      mod: bonus,
      advantage,
      parts: [
        { label: (UIRPG.Sheet.LABELS[ability] || ability), value: mod },
        { label: 'prof', value: prof },
      ].concat(magic ? [{ label: 'magic', value: magic }] : []),
    });
    const result = attackResult({
      d20: attack.kept,
      bonus,
      ac: battle.foe.ac,
    });
    let damageRoll = null;
    if (result.hit) {
      damageRoll = UIRPG.Dice.roll(die, rng, { mod: mod + magic });
      if (result.crit) {
        const extra = UIRPG.Dice.roll(die, rng);
        damageRoll.faces = damageRoll.faces.concat(extra.faces);
        damageRoll.dieSum += extra.dieSum;
        damageRoll.total = damageRoll.dieSum + damageRoll.mod;
        damageRoll.crit = true;
      }
      result.damage = damageRoll.total;
      battle.foe.hp -= result.damage;
    }
    const name = trick ? trick.name : weapon.name;
    battle.log.push(result.hit
      ? `${name}: ${attack.total} vs AC ${battle.foe.ac}. Hit for ${result.damage}.`
      : `${name}: ${attack.total} vs AC ${battle.foe.ac}. Miss.`);
    battle.turn = 'foe';
    return { attack, damageRoll, result, name };
  }

  function foeAttack(run, battle, rng) {
    const blows = [];
    const count = battle.foe.attacks || 1;
    for (let i = 0; i < count; i++) {
      const bonus = battle.foe.attack;
      const attack = UIRPG.Dice.roll('1d20', rng, { mod: bonus, parts: [{ label: 'atk', value: bonus }] });
      const ac = battle.playerAc;
      const result = attackResult({ d20: attack.kept, bonus, ac });
      let damageRoll = null;
      if (result.hit) {
        damageRoll = UIRPG.Dice.roll(battle.foe.damageDie, rng, { mod: battle.foe.damageMod });
        if (result.crit) {
          const extra = UIRPG.Dice.roll(battle.foe.damageDie, rng);
          damageRoll.faces = damageRoll.faces.concat(extra.faces);
          damageRoll.dieSum += extra.dieSum;
          damageRoll.total = damageRoll.dieSum + damageRoll.mod;
          damageRoll.crit = true;
        }
        result.damage = damageRoll.total;
        battle.hp -= result.damage;
        run.hp = battle.hp;
      }
      const move = battle.foe.moves[i] || battle.foe.moves[0] || 'strike';
      battle.log.push(result.hit
        ? `${battle.foe.name} ${move}: ${attack.total} vs AC ${ac}. ${result.damage} damage.`
        : `${battle.foe.name} ${move}: ${attack.total} vs AC ${ac}. Miss.`);
      blows.push({ attack, damageRoll, result, move });
      if (battle.hp <= 0) break;
    }
    battle.turn = 'player';
    return blows;
  }

  function fleeRoll(run, rng) {
    const bonus = UIRPG.Sheet.checkBonus(
      { skills: [], saves: [] },
      run.abilities,
      run.level,
      { ability: 'dex' }
    );
    // Dexterity check: ability mod only, plus proficiency if the class save includes dex.
    return bonus;
  }

  return { attackResult, start, playerAttack, foeAttack, fleeRoll };
})();
