// Six abilities, modifiers, armor class, hit points, and check bonuses.
UIRPG.Sheet = (() => {
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const NAMES = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
  };
  const SKILLS = {
    athletics: 'str',
    stealth: 'dex',
    acrobatics: 'dex',
    perception: 'wis',
    insight: 'wis',
    persuasion: 'cha',
    intimidation: 'cha',
    arcana: 'int',
    investigation: 'int',
    survival: 'wis',
  };

  function modifier(score) {
    return Math.floor((Number(score) - 10) / 2);
  }

  function proficiency(level) {
    const lv = Math.max(1, level | 0);
    return 2 + Math.floor((lv - 1) / 4);
  }

  function armorClass(classDef, abilities) {
    const armor = classDef.armor || { kind: 'none', base: 10 };
    const dex = modifier(abilities.dex || 10);
    if (armor.kind === 'heavy') return armor.base;
    if (armor.kind === 'medium') return armor.base + Math.min(2, dex);
    return armor.base + dex;
  }

  function averageHitDie(hitDie) {
    return Math.floor(hitDie / 2) + 1;
  }

  function maxHp(classDef, abilities, level) {
    const con = modifier(abilities.con || 10);
    const lv = Math.max(1, level | 0);
    let hp = Math.max(1, classDef.hitDie + con);
    const step = averageHitDie(classDef.hitDie) + con;
    for (let i = 2; i <= lv; i++) hp += Math.max(1, step);
    return hp;
  }

  function checkBonus(classDef, abilities, level, check) {
    const spec = check || {};
    let ability;
    let proficient = false;
    if (spec.skill) {
      ability = SKILLS[spec.skill];
      proficient = (classDef.skills || []).indexOf(spec.skill) !== -1;
    } else {
      ability = spec.ability;
      proficient = !!spec.save && (classDef.saves || []).indexOf(ability) !== -1;
    }
    const mod = modifier(abilities[ability] || 10);
    const prof = proficient ? proficiency(level) : 0;
    return { ability, mod, prof, total: mod + prof, proficient };
  }

  function magicCap(level) {
    if (level >= 17) return 3;
    if (level >= 11) return 2;
    if (level >= 5) return 1;
    return 0;
  }

  function magicBonus(level, requested) {
    return Math.max(0, Math.min(magicCap(level), requested || 0));
  }

  function attackAbility(classDef) {
    return (classDef.weapon && classDef.weapon.ability) || classDef.primary || 'str';
  }

  function attackBonus(classDef, abilities, level, magic) {
    const ability = attackAbility(classDef);
    return modifier(abilities[ability] || 10) + proficiency(level) + magicBonus(level, magic);
  }

  function damageMod(classDef, abilities, level, magic) {
    const ability = attackAbility(classDef);
    return modifier(abilities[ability] || 10) + magicBonus(level, magic);
  }

  function saveDc(abilities, level, ability) {
    return 8 + proficiency(level) + modifier(abilities[ability] || 10);
  }

  function foeSaveDc(level) {
    return 8 + proficiency(level) + 3;
  }

  return {
    ABILITIES, LABELS, NAMES, SKILLS,
    modifier, proficiency, armorClass, averageHitDie, maxHp, checkBonus,
    magicCap, magicBonus, attackAbility, attackBonus, damageMod, saveDc, foeSaveDc,
  };
})();
