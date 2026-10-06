// The run. This is the only place that mutates a delve.
UIRPG.Run = (() => {
  function session(meta) {
    return {
      phase: 'table',
      meta: meta || UIRPG.Meta.fresh(),
      run: null,
      creation: null,
      reveal: null,
      recap: null,
      petOffer: null,
      notice: '',
    };
  }

  function classDef(content, id) {
    return UIRPG.Content.byId(content.classes, id);
  }

  function log(run, text) {
    run.chronicle.push(text);
    if (run.chronicle.length > 40) run.chronicle.shift();
  }

  function noteUnlocks(state, content, event) {
    const earned = UIRPG.Meta.consider(state.meta, content, event);
    if (earned.length) state.notice = earned.map(u => `${u.name} will be there next time.`).join(' ');
    return earned;
  }

  function adjacent(node, dest) {
    return node && (node.next === dest || node.left === dest || node.right === dest);
  }

  function room(run) {
    return run.map.nodes[run.roomId];
  }

  function enterFloor(state, content) {
    const run = state.run;
    const rng = UIRPG.Dice.makeRng((Number(run.seed) || 1) + run.floor * 1000);
    const gen = UIRPG.Floors.generate(content, {
      floor: run.floor,
      prevTheme: run.prevTheme,
      rng,
      meta: state.meta,
      flags: run.flags,
      usedOnce: run.usedOnce,
    });
    run.map = { themeId: gen.themeId, themeName: gen.themeName, nodes: gen.nodes, warnings: gen.warnings };
    run.themeId = gen.themeId;
    run.prevTheme = gen.themeId;
    run.roomId = gen.start;
    run.mode = 'room';
    run.nodeId = null;
    run.battle = null;
    const here = room(run);
    here.visited = true;
    if (here.once) run.usedOnce.push(here.scenarioId);
    log(run, `Floor ${run.floor}: ${gen.themeName}.`);
    if (run.floor > state.meta.deepest) state.meta.deepest = run.floor;
    noteUnlocks(state, content, { floor: run.floor, flags: run.flags });
    return gen;
  }

  function beginCreation(state, content, classId, seed) {
    const chosen = classDef(content, classId);
    if (!chosen || !UIRPG.Meta.classOpen(chosen, state.meta)) return { ok: false, error: 'That class is locked.' };
    state.phase = 'rolling';
    state.creation = { classId, seed: seed || (Date.now() % 100000), rolls: [], assignments: {} };
    state.recap = null;
    return { ok: true };
  }

  function rollAbility(state, rng) {
    if (!state.creation || state.creation.rolls.length >= 6) return null;
    const rolled = UIRPG.Dice.roll('4d6', rng, { dropLowest: true });
    state.creation.rolls.push(rolled.total);
    state.reveal = { kind: 'create', rolls: [rolled], label: 'Ability roll' };
    if (state.creation.rolls.length === 6) state.phase = 'assign';
    return rolled;
  }

  function assign(state, rollIndex, ability) {
    const creation = state.creation;
    if (!creation || UIRPG.Sheet.ABILITIES.indexOf(ability) === -1) return;
    Object.keys(creation.assignments).forEach(key => {
      if (creation.assignments[key] === rollIndex) delete creation.assignments[key];
    });
    creation.assignments[ability] = rollIndex;
  }

  function confirmAssign(state, content, rng) {
    const creation = state.creation;
    const abilities = {};
    UIRPG.Sheet.ABILITIES.forEach(key => {
      const index = creation.assignments[key];
      if (index == null) abilities[key] = null;
      else abilities[key] = creation.rolls[index];
    });
    if (UIRPG.Sheet.ABILITIES.some(key => abilities[key] == null)) return { ok: false, error: 'Assign all six rolls.' };
    const used = {};
    UIRPG.Sheet.ABILITIES.forEach(key => { used[creation.assignments[key]] = true; });
    if (Object.keys(used).length !== 6) return { ok: false, error: 'Each roll is used once.' };
    const chosen = classDef(content, creation.classId);
    const maxHp = UIRPG.Sheet.maxHp(chosen, abilities, 1);
    let pet = null;
    if (chosen.startingPet) pet = Object.assign({}, UIRPG.Content.byId(content.pets, chosen.startingPet));
    else if (state.meta.grants.pets && state.meta.grants.pets[0]) {
      pet = Object.assign({}, UIRPG.Content.byId(content.pets, state.meta.grants.pets[0]));
    }
    state.meta.runs += 1;
    state.run = {
      seed: creation.seed,
      floor: 1,
      level: 1,
      classId: chosen.id,
      abilities,
      hp: maxHp,
      maxHp,
      magic: 0,
      pet,
      flags: {},
      inventory: [],
      usedOnce: [],
      spent: {},
      hitDiceLeft: 1,
      chronicle: [],
      roomId: null,
      map: null,
      mode: 'room',
      nodeId: null,
      battle: null,
      prevTheme: null,
    };
    state.phase = 'play';
    state.creation = null;
    enterFloor(state, content);
    return { ok: true };
  }

  function battleMoves(run) {
    if (!run || !run.battle) return [];
    const moves = ['attack'];
    if (run.pet && run.pet.trick) moves.push('pet');
    if (run.battle.healLeft) moves.push('heal');
    moves.push('item');
    moves.push('flee');
    return moves;
  }

  function currentOptions(state, content) {
    const run = state.run;
    if (!run || run.battle) return [];
    const here = room(run);
    let options = [];
    if (run.mode === 'node' && run.nodeId) {
      const node = content.nodes[run.nodeId];
      options = (node && node.options) || [];
    } else if (here) {
      options = here.options || [];
    }
    const ctx = { abilities: run.abilities, flags: run.flags, pet: run.pet };
    const spent = run.spent[spendKey(run)] || [];
    return options.filter(opt => {
      if (spent.indexOf(opt.id) !== -1) return false;
      return UIRPG.Content.optionVisible(opt, ctx);
    });
  }

  function spendKey(run) {
    return run.mode === 'node' ? 'node:' + run.nodeId : 'room:' + run.roomId;
  }

  function exits(run) {
    if (!run || run.battle) return [];
    const here = room(run);
    if (!here) return [];
    const out = [];
    if (here.left) out.push({ id: here.left, dir: 'left', label: 'Take the left passage' });
    if (here.right) out.push({ id: here.right, dir: 'right', label: 'Take the right passage' });
    if (here.next) {
      const dest = run.map.nodes[here.next];
      out.push({
        id: here.next,
        dir: 'next',
        label: dest && dest.slot === 'stairs' ? 'Take the stairs' : 'Continue',
      });
    }
    return out;
  }

  function move(state, content, destId, rng) {
    const run = state.run;
    if (!run || run.battle) return { ok: false };
    const here = room(run);
    if (!adjacent(here, destId)) return { ok: false, error: 'That room does not connect.' };
    run.roomId = destId;
    run.mode = 'room';
    run.nodeId = null;
    const dest = room(run);
    dest.visited = true;
    if (dest.once && run.usedOnce.indexOf(dest.scenarioId) === -1) run.usedOnce.push(dest.scenarioId);
    if (dest.slot === 'stairs') {
      state.phase = 'rest';
      log(run, 'You reach the stairs.');
      return { ok: true, rest: true };
    }
    state.phase = 'play';
    log(run, dest.title + '.');
    return { ok: true };
  }

  function openNode(state, content, nodeId, win) {
    const run = state.run;
    const node = content.nodes[nodeId];
    if (!node) return;
    run.mode = 'node';
    run.nodeId = nodeId;
    run.battle = null;
    log(run, node.body);
    if (node.startBattle) {
      beginBattle(state, content, node.startBattle, win || node.win || null, null);
    }
  }

  function beginBattle(state, content, foeId, win, fleeNode) {
    const run = state.run;
    const foe = UIRPG.Content.byId(content.foes, foeId);
    const chosen = classDef(content, run.classId);
    const rng = UIRPG.Dice.makeRng(run.seed + run.floor * 100 + (run.chronicle.length + 1));
    const battle = UIRPG.Battle.start(run, chosen, foe, rng);
    battle.win = win || null;
    battle.fleeNode = fleeNode || null;
    battle.foeDef = foeId;
    run.battle = battle;
    run.mode = 'battle';
    const prior = state.reveal && state.reveal.rolls ? state.reveal.rolls.slice() : [];
    state.reveal = { kind: 'init', rolls: prior.concat([battle.init.player, battle.init.foe]), label: 'Initiative' };
    log(run, `${foe.name} steps in.`);
    if (battle.turn === 'foe') foeTurn(state, content, UIRPG.Dice.makeRng(run.seed + 17 + run.chronicle.length));
  }

  function choose(state, content, optionId) {
    const run = state.run;
    const options = currentOptions(state, content);
    const opt = options.find(o => o.id === optionId);
    if (!opt) return { ok: false, error: 'That option is not on the table.' };
    const key = spendKey(run);
    run.spent[key] = run.spent[key] || [];
    if (run.spent[key].indexOf(opt.id) === -1) run.spent[key].push(opt.id);
    if (opt.setFlags) opt.setFlags.forEach(flag => { run.flags[flag] = true; });
    if (opt.clearFlags) opt.clearFlags.forEach(flag => { delete run.flags[flag]; });
    noteUnlocks(state, content, { floor: run.floor, flags: run.flags });
    if (opt.grant && opt.grant.item) {
      const item = UIRPG.Content.byId(content.items, opt.grant.item);
      if (item) {
        run.inventory.push(Object.assign({}, item));
        log(run, `You take ${item.name}.`);
      }
    }
    if (opt.grant && opt.grant.pet) {
      const pet = UIRPG.Content.byId(content.pets, opt.grant.pet);
      if (pet && run.pet) {
        state.petOffer = Object.assign({}, pet);
        state.phase = 'swap-pet';
        return { ok: true, swap: true };
      }
      if (pet) {
        run.pet = Object.assign({}, pet);
        log(run, `${pet.name} stays with you.`);
      }
    }
    if (opt.rest === 'long') longRest(state);
    if (opt.check) {
      const chosen = classDef(content, run.classId);
      const bonus = UIRPG.Sheet.checkBonus(chosen, run.abilities, run.level, opt.check);
      const aid = run.pet && run.pet.aid && opt.check.skill && run.pet.aid.skill === opt.check.skill;
      const rng = UIRPG.Dice.makeRng(run.seed + 3 + run.chronicle.length);
      const rolled = UIRPG.Dice.roll('1d20', rng, {
        mod: bonus.total,
        advantage: !!(opt.check.advantage || aid),
        parts: [
          { label: UIRPG.Sheet.LABELS[bonus.ability], value: bonus.mod },
        ].concat(bonus.prof ? [{ label: 'prof', value: bonus.prof }] : []),
      });
      const success = rolled.total >= opt.check.dc;
      rolled.note = `${success ? 'Success' : 'Fail'} vs DC ${opt.check.dc}`;
      state.reveal = {
        kind: 'check',
        rolls: [rolled],
        label: `${opt.label} vs DC ${opt.check.dc}`,
        text: rolled.note,
      };
      log(run, `${opt.label}: ${rolled.total} vs DC ${opt.check.dc}. ${success ? 'Success.' : 'Fail.'}`);
      const next = success ? opt.check.success : opt.check.fail;
      if (next) openNode(state, content, next, null);
      return { ok: true, success };
    }
    if (opt.battle) {
      beginBattle(state, content, opt.battle, opt.win || null, opt.flee || null);
      return { ok: true, battle: true };
    }
    if (opt.goto) openNode(state, content, opt.goto, null);
    if (opt.descend) return descend(state, content, UIRPG.Dice.makeRng(run.seed + run.floor + 9));
    return { ok: true };
  }

  function keepPet(state, takeNew) {
    const run = state.run;
    if (takeNew && state.petOffer) {
      log(run, `${state.petOffer.name} stays with you.`);
      run.pet = state.petOffer;
    } else if (run.pet) {
      log(run, `You keep ${run.pet.name}.`);
    }
    state.petOffer = null;
    state.phase = run.battle ? 'play' : (room(run) && room(run).slot === 'stairs' ? 'rest' : 'play');
  }

  function actBattle(state, content, action, rng) {
    const run = state.run;
    const battle = run.battle;
    if (!battle || battle.turn !== 'player') return { ok: false };
    const chosen = classDef(content, run.classId);
    const before = { hp: run.hp, foe: battle.foe.hp };
    if (action === 'attack' || action === 'pet') {
      if (action === 'pet' && !run.pet) return { ok: false, error: 'No pet.' };
      const swung = UIRPG.Battle.playerAttack(run, chosen, battle, rng, action);
      state.reveal = { kind: 'attack', rolls: [swung.attack].concat(swung.damageRoll ? [swung.damageRoll] : []), label: swung.name, hpBefore: before };
      if (battle.foe.hp <= 0) return winBattle(state, content);
      return foeTurn(state, content, rng);
    }
    if (action === 'heal') {
      if (!battle.healLeft) return { ok: false, error: 'No healing left this rest.' };
      battle.healLeft = false;
      const die = `1d${chosen.hitDie}`;
      const mod = UIRPG.Sheet.modifier(run.abilities.wis || 10);
      const rolled = UIRPG.Dice.roll(die, rng, { mod });
      run.hp = Math.min(run.maxHp, run.hp + rolled.total);
      battle.hp = run.hp;
      battle.turn = 'foe';
      state.reveal = { kind: 'heal', rolls: [rolled], label: 'Heal', hpBefore: before };
      log(run, `You heal ${rolled.total}.`);
      return foeTurn(state, content, rng);
    }
    if (action === 'item') {
      const index = run.inventory.findIndex(it => it.heal);
      if (index === -1) return { ok: false, error: 'Nothing to use.' };
      const item = run.inventory.splice(index, 1)[0];
      const rolled = UIRPG.Dice.roll(item.heal, rng);
      run.hp = Math.min(run.maxHp, run.hp + rolled.total);
      battle.hp = run.hp;
      battle.turn = 'foe';
      state.reveal = { kind: 'item', rolls: [rolled], label: item.name, hpBefore: before };
      log(run, `${item.name} heals ${rolled.total}.`);
      return foeTurn(state, content, rng);
    }
    if (action === 'flee') {
      const bonus = UIRPG.Sheet.checkBonus(chosen, run.abilities, run.level, { ability: 'dex', save: true });
      const dc = UIRPG.Sheet.foeSaveDc(run.level);
      const rolled = UIRPG.Dice.roll('1d20', rng, {
        mod: bonus.total,
        parts: [{ label: 'DEX', value: bonus.mod }].concat(bonus.prof ? [{ label: 'prof', value: bonus.prof }] : []),
      });
      const success = rolled.total >= dc && !rolled.fumble;
      state.reveal = { kind: 'flee', rolls: [rolled], label: `Flee vs DC ${dc}` };
      log(run, `Flee: ${rolled.total} vs DC ${dc}. ${success ? 'You slip away.' : 'You stay.'}`);
      if (!success) {
        battle.turn = 'foe';
        return foeTurn(state, content, rng);
      }
      const fleeNode = battle.fleeNode;
      run.battle = null;
      run.mode = 'room';
      if (fleeNode) openNode(state, content, fleeNode, null);
      return { ok: true, fled: true };
    }
    return { ok: false, error: 'Unknown action.' };
  }

  function foeTurn(state, content, rng) {
    const run = state.run;
    const battle = run.battle;
    if (!battle || battle.foe.hp <= 0) return { ok: true };
    const before = run.hp;
    const blows = UIRPG.Battle.foeAttack(run, battle, rng);
    const rolls = [];
    blows.forEach(blow => {
      rolls.push(blow.attack);
      if (blow.damageRoll) rolls.push(blow.damageRoll);
    });
    if (state.reveal && state.reveal.rolls) state.reveal.rolls = state.reveal.rolls.concat(rolls);
    else state.reveal = { kind: 'foe', rolls, label: battle.foe.name, hpBefore: { hp: before, foe: battle.foe.hp } };
    if (run.hp <= 0) return die(state, content, battle.foe.name);
    return { ok: true };
  }

  function winBattle(state, content) {
    const run = state.run;
    const win = run.battle.win;
    log(run, `${run.battle.foe.name} falls.`);
    run.battle = null;
    run.mode = 'room';
    if (win) openNode(state, content, win, null);
    return { ok: true, win: true };
  }

  function die(state, content, blow) {
    const run = state.run;
    if (run.floor > state.meta.deepest) state.meta.deepest = run.floor;
    noteUnlocks(state, content, { floor: state.meta.deepest, flags: run.flags });
    state.recap = {
      floor: run.floor,
      theme: run.map && run.map.themeName,
      seed: run.seed,
      blow: blow || 'the dark',
      unlocks: state.meta.notices.slice(),
    };
    state.run = null;
    state.phase = 'recap';
    state.reveal = state.reveal || null;
    return { ok: true, dead: true };
  }

  function spendHitDie(state, rng) {
    const run = state.run;
    if (!run || run.hitDiceLeft <= 0) return { ok: false };
    const chosen = classDef({ classes: [{ id: run.classId }] }, run.classId);
    // classDef needs content. Caller passes via state._content set by the page, or we read hit die from a stored value.
    return { ok: false, error: 'Use restSpend.' };
  }

  function restSpend(state, content, rng) {
    const run = state.run;
    if (!run || state.phase !== 'rest' || run.hitDiceLeft <= 0) return { ok: false };
    const chosen = classDef(content, run.classId);
    const mod = UIRPG.Sheet.modifier(run.abilities.con || 10);
    const rolled = UIRPG.Dice.roll(`1d${chosen.hitDie}`, rng, { mod });
    run.hitDiceLeft -= 1;
    const healed = Math.max(0, rolled.total);
    run.hp = Math.min(run.maxHp, run.hp + healed);
    state.reveal = { kind: 'rest', rolls: [rolled], label: 'Hit die' };
    log(run, `Hit die heals ${healed}.`);
    return { ok: true, healed };
  }

  function descend(state, content, rng) {
    const run = state.run;
    if (!run) return { ok: false };
    const chosen = classDef(content, run.classId);
    const next = run.floor + 1;
    const before = run.maxHp;
    run.floor = next;
    run.level = next;
    run.magic = UIRPG.Sheet.magicBonus(next, 99);
    run.maxHp = UIRPG.Sheet.maxHp(chosen, run.abilities, next);
    run.hp += run.maxHp - before;
    run.hitDiceLeft += 1;
    state.phase = 'play';
    log(run, `You descend. Level ${next}.`);
    enterFloor(state, content);
    return { ok: true };
  }

  function longRest(state) {
    const run = state.run;
    if (!run) return;
    run.hp = run.maxHp;
    const regain = Math.max(1, Math.floor(run.level / 2));
    run.hitDiceLeft = Math.min(run.level, run.hitDiceLeft + regain);
    log(run, 'You rest until the ache leaves.');
  }

  function abandon(state) {
    state.run = null;
    state.phase = 'table';
    state.reveal = null;
    state.petOffer = null;
  }

  function clearReveal(state) {
    state.reveal = null;
  }

  function toSave(state) {
    return {
      phase: state.phase,
      run: state.run,
      meta: state.meta,
      creation: state.creation,
      recap: state.recap,
    };
  }

  function fromSave(data, content) {
    const state = session(data && data.meta ? data.meta : UIRPG.Meta.fresh());
    UIRPG.Meta.recompute(state.meta, content);
    if (!data || !data.run) {
      state.phase = data && data.phase === 'recap' ? 'recap' : 'table';
      state.recap = data && data.recap;
      return { state, ok: true };
    }
    const missing = missingIds(data.run, content);
    if (missing) {
      state.phase = 'table';
      state.run = null;
      state.notice = 'A saved room is gone. You return to the table.';
      return { state, ok: false, toTable: true, missing };
    }
    state.run = data.run;
    state.phase = data.phase || 'play';
    state.creation = data.creation || null;
    state.reveal = null;
    return { state, ok: true };
  }

  function missingIds(run, content) {
    if (!run.map || !run.map.nodes) return 'map';
    const ids = Object.keys(run.map.nodes);
    for (let i = 0; i < ids.length; i++) {
      const node = run.map.nodes[ids[i]];
      if (!node.scenarioId) continue;
      if (String(node.scenarioId).indexOf('fallback') === 0) continue;
      if (node.slot === 'stairs') continue;
      if (!UIRPG.Content.byId(content.scenarios, node.scenarioId)) return node.scenarioId;
    }
    if (run.nodeId && !content.nodes[run.nodeId]) return run.nodeId;
    if (run.battle && !UIRPG.Content.byId(content.foes, run.battle.foeId)) return run.battle.foeId;
    return null;
  }

  function checkPreview(state, content, opt) {
    if (!opt.check || !state.run) return null;
    const chosen = classDef(content, state.run.classId);
    const bonus = UIRPG.Sheet.checkBonus(chosen, state.run.abilities, state.run.level, opt.check);
    const aid = state.run.pet && state.run.pet.aid && opt.check.skill && state.run.pet.aid.skill === opt.check.skill;
    return { bonus: bonus.total + (aid ? ' adv' : ''), dc: opt.check.dc, ability: bonus.ability, total: bonus.total, aid: !!aid };
  }

  return {
    session, beginCreation, rollAbility, assign, confirmAssign, currentOptions, exits, battleMoves,
    move, choose, keepPet, actBattle, restSpend, descend, abandon, clearReveal,
    toSave, fromSave, checkPreview, enterFloor, longRest,
  };
})();
