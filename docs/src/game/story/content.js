// Seed story. Admins publish the same shape of objects from the site.
// Field guide:
// themes: id, name, blurb, weight, minFloor, startsUnlocked
// layouts: minFloor, maxFloor, nodes[{ id, slot, next | left+right }]
// scenarios: id, themes, slot, weight, minFloor, maxFloor, requiresFlags, blocksFlags,
//   once, body, mapHint, options, startsUnlocked
// options: id, label, check{ skill|ability, dc, success, fail, advantage, unfair },
//   battle, win, lose, flee, goto, setFlags, clearFlags, grant{ item, pet },
//   rest: 'long', descend, showIf{ ability, min, flags, pet }
// nodes: id -> { body, options, startBattle }
// classes: id, name, primary, hitDie, armor{ kind, base }, saves, skills, weapon, feature, startingPet, startsUnlocked
// pets: id, name, trick{ id, name, ability, damageDie }, aid{ skill }
// foes: id, name, themes, difficulty, damageDie, moves, acTweak, hpTweak
// items: id, name, heal
// unlocks: id, name, hint, when{ floorReached | flag | hasUnlock }, grants{ themes, classes, scenarios, moves, pets }
UIRPG.Content = (() => {
  const SEED = {
    themes: [
      { id: 'crypt', name: 'The Crypt', blurb: 'Cold stone and quieter dead.', weight: 1, minFloor: 1, startsUnlocked: true },
      { id: 'wilds', name: 'The Wilds', blurb: 'Wet leaves and things that watch.', weight: 1, minFloor: 1, startsUnlocked: false },
    ],
    layouts: [
      {
        minFloor: 1, maxFloor: 1,
        nodes: [
          { id: 'entrance', slot: 'entrance', next: 'middle' },
          { id: 'middle', slot: 'path', next: 'stairs' },
          { id: 'stairs', slot: 'stairs' },
        ],
      },
      {
        minFloor: 2, maxFloor: 4,
        nodes: [
          { id: 'entrance', slot: 'entrance', next: 'fork' },
          { id: 'fork', slot: 'path', left: 'left', right: 'right' },
          { id: 'left', slot: 'left', next: 'stairs' },
          { id: 'right', slot: 'right', next: 'stairs' },
          { id: 'stairs', slot: 'stairs' },
        ],
      },
      {
        minFloor: 5,
        nodes: [
          { id: 'entrance', slot: 'entrance', next: 'hall' },
          { id: 'hall', slot: 'path', next: 'fork' },
          { id: 'fork', slot: 'path', left: 'left', right: 'right' },
          { id: 'left', slot: 'left', next: 'stairs' },
          { id: 'right', slot: 'right', next: 'stairs' },
          { id: 'stairs', slot: 'stairs' },
        ],
      },
    ],
    scenarios: [
      {
        id: 'crypt_gate', themes: ['crypt'], slot: 'entrance', weight: 1,
        body: 'The crypt gate stands open. Cold air moves past your boots, and nothing in the dark is in a hurry.',
        mapHint: 'An open gate.',
        options: [],
      },
      {
        id: 'crypt_split', themes: ['crypt'], slot: 'path', weight: 1,
        body: 'The passage splits. A draft comes from the left. On the right, light sits on steel.',
        mapHint: 'A split in the stone.',
        options: [],
      },
      {
        id: 'crypt_hall', themes: ['crypt'], slot: 'path', weight: 1, minFloor: 5,
        body: 'A long hall of sealed niches. Your footsteps come back to you a moment late.',
        mapHint: 'A long hall.',
        options: [],
      },
      {
        id: 'crypt_alcove', themes: ['crypt'], slot: 'left', weight: 1,
        body: 'A side chapel. Dust on the altar, and a vial that still holds something red.',
        mapHint: 'A quiet chapel.',
        options: [
          { id: 'take_vial', label: 'Take the vial', grant: { item: 'potion' }, goto: 'alcove_taken' },
          { id: 'leave_vial', label: 'Leave it', goto: 'alcove_left' },
        ],
      },
      {
        id: 'crypt_sentry', themes: ['crypt'], slot: 'path', weight: 1, maxFloor: 1,
        body: 'A sentry waits in the first hall, shield up, as if the gate were still shut.',
        mapHint: 'Steel ahead.',
        options: [
          { id: 'fight', label: 'Draw your weapon', battle: 'crypt_sentry', win: 'sentry_down' },
        ],
      },
      {
        id: 'guard_at_the_gate', themes: ['crypt'], slot: 'right', weight: 1,
        body: 'A guard blocks the gate, halberd lowered.',
        mapHint: 'A guard on watch.',
        options: [
          {
            id: 'charm',
            label: 'Charm them into letting you pass',
            check: { skill: 'persuasion', dc: 15, success: 'guard_stands_aside', fail: 'guard_attacks' },
            showIf: { ability: 'cha', min: 12 },
          },
          { id: 'fight', label: 'Draw your weapon', battle: 'crypt_guard', win: 'guard_down' },
        ],
      },
      {
        id: 'wilds_gate', themes: ['wilds'], slot: 'entrance', weight: 1,
        body: 'Trees close over the path. The crypt smell is gone. Something small moves in the brush and decides you are not worth it yet.',
        mapHint: 'Trees close in.',
        options: [],
      },
      {
        id: 'wilds_split', themes: ['wilds'], slot: 'path', weight: 1,
        body: 'The trail forks. Left, the ground is soft. Right, a branch has been snapped at shoulder height.',
        mapHint: 'A forked trail.',
        options: [],
      },
      {
        id: 'wilds_glen', themes: ['wilds'], slot: 'left', weight: 1,
        body: 'A glen with a standing stone. Moss on the north face. A good place to listen.',
        mapHint: 'A quiet glen.',
        options: [
          { id: 'listen', label: 'Listen', check: { skill: 'perception', dc: 10, success: 'glen_heard', fail: 'glen_quiet' } },
        ],
      },
      {
        id: 'wilds_trail', themes: ['wilds'], slot: 'right', weight: 1,
        body: 'The snapped branch was a marker. A wolf, collared in old rope, steps onto the trail.',
        mapHint: 'A marked trail.',
        options: [
          { id: 'fight', label: 'Stand your ground', battle: 'trail_wolf', win: 'wolf_fled' },
        ],
      },
    ],
    nodes: {
      guard_stands_aside: {
        body: 'The halberd lifts. The guard steps aside as if the idea had been theirs all along.',
        options: [],
      },
      guard_attacks: {
        body: 'The charm slides off. The guard lowers the halberd and comes on.',
        startBattle: 'crypt_guard',
        win: 'guard_down',
      },
      guard_down: {
        body: 'The guard is down. The right-hand passage is yours.',
        options: [],
      },
      sentry_down: {
        body: 'The sentry falls against the wall. The hall beyond is empty.',
        options: [],
      },
      alcove_taken: {
        body: 'The vial is warm in your hand. The chapel goes back to being dust.',
        options: [],
      },
      alcove_left: {
        body: 'You leave the vial. The chapel keeps its own counsel.',
        options: [],
      },
      glen_heard: {
        body: 'Wings, once, high up. Whatever hunts here already knows the right-hand trail.',
        options: [],
      },
      glen_quiet: {
        body: 'Only leaves. If something is watching, it is better at this than you are.',
        options: [],
      },
      wolf_fled: {
        body: 'The wolf breaks for the trees. The rope collar snags, snaps, and is left behind.',
        options: [],
      },
    },
    classes: [
      {
        id: 'fighter', name: 'Fighter', primary: 'str', hitDie: 10,
        armor: { kind: 'heavy', base: 16 }, saves: ['str', 'con'], skills: ['athletics'],
        weapon: { id: 'longsword', name: 'Longsword', ability: 'str', damageDie: '1d8' },
        feature: null, startsUnlocked: true,
      },
      {
        id: 'rogue', name: 'Rogue', primary: 'dex', hitDie: 8,
        armor: { kind: 'light', base: 12 }, saves: ['dex', 'int'], skills: ['stealth', 'acrobatics'],
        weapon: { id: 'dagger', name: 'Dagger', ability: 'dex', damageDie: '1d6' },
        feature: 'advantage-first', startsUnlocked: true,
      },
      {
        id: 'cleric', name: 'Cleric', primary: 'wis', hitDie: 8,
        armor: { kind: 'medium', base: 14 }, saves: ['wis', 'cha'], skills: ['insight'],
        weapon: { id: 'mace', name: 'Mace', ability: 'str', damageDie: '1d6' },
        feature: 'heal-rest', startsUnlocked: true,
      },
      {
        id: 'wizard', name: 'Wizard', primary: 'int', hitDie: 6,
        armor: { kind: 'none', base: 10 }, saves: ['int', 'wis'], skills: ['arcana'],
        weapon: { id: 'firebolt', name: 'Fire Bolt', ability: 'int', damageDie: '1d10' },
        feature: null, startsUnlocked: true,
      },
      {
        id: 'ranger', name: 'Ranger', primary: 'dex', hitDie: 10,
        armor: { kind: 'light', base: 11 }, saves: ['str', 'dex'], skills: ['survival', 'perception'],
        weapon: { id: 'shortsword', name: 'Shortsword', ability: 'dex', damageDie: '1d6' },
        feature: null, startingPet: 'wolf', startsUnlocked: true,
      },
    ],
    pets: [
      {
        id: 'wolf', name: 'Wolf',
        trick: { id: 'bite', name: 'Bite', ability: 'str', damageDie: '1d6' },
        aid: { skill: 'survival' },
      },
      {
        id: 'raven', name: 'Raven',
        trick: { id: 'peck', name: 'Peck', ability: 'dex', damageDie: '1d4' },
        aid: { skill: 'perception' },
      },
    ],
    foes: [
      { id: 'crypt_sentry', name: 'Crypt Sentry', themes: ['crypt'], difficulty: 'medium', damageDie: '1d8', moves: ['shield_bash'] },
      { id: 'crypt_guard', name: 'Crypt Guard', themes: ['crypt'], difficulty: 'hard', damageDie: '1d8', moves: ['halberd'] },
      { id: 'trail_wolf', name: 'Collared Wolf', themes: ['wilds'], difficulty: 'medium', damageDie: '1d6', moves: ['bite'] },
    ],
    items: [
      { id: 'potion', name: 'Healing Potion', heal: '2d4+2' },
    ],
    unlocks: [
      {
        id: 'open_the_wilds',
        name: 'The Wilds',
        hint: 'Leave the crypt alive.',
        when: { floorReached: 2 },
        grants: { themes: ['wilds'] },
      },
    ],
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || SEED));
  }

  function apply(content, list, item) {
    if (!item || typeof item !== 'object') throw new Error('Missing item');
    if (list === 'nodes') {
      if (!item.id) throw new Error('Node needs an id');
      const node = Object.assign({}, item);
      delete node.id;
      content.nodes[item.id] = node;
      return content;
    }
    if (!content[list] || !Array.isArray(content[list])) throw new Error('Unknown list');
    if (list === 'layouts') {
      content.layouts.push(item);
      return content;
    }
    if (!item.id) throw new Error('Needs an id');
    const index = content[list].findIndex(row => row.id === item.id);
    if (index >= 0) content[list][index] = item;
    else content[list].push(item);
    return content;
  }

  function byId(list, id) {
    return (list || []).find(x => x.id === id) || null;
  }

  function layoutFor(content, floor) {
    const rows = content.layouts || [];
    let found = null;
    rows.forEach(row => {
      if (floor < row.minFloor) return;
      if (row.maxFloor != null && floor > row.maxFloor) return;
      found = row;
    });
    return found;
  }

  function reaches(nodes, start, target, seen) {
    if (start === target) return true;
    if (!start || seen[start]) return false;
    seen[start] = true;
    const node = nodes[start];
    if (!node) return false;
    if (node.next) return reaches(nodes, node.next, target, seen);
    return reaches(nodes, node.left, target, seen) || reaches(nodes, node.right, target, seen);
  }

  function optionVisible(opt, ctx) {
    const gate = opt.showIf;
    if (!gate) return true;
    if (gate.ability && (ctx.abilities[gate.ability] || 0) < (gate.min || 0)) return false;
    if (gate.flags) {
      for (let i = 0; i < gate.flags.length; i++) {
        if (!ctx.flags || !ctx.flags[gate.flags[i]]) return false;
      }
    }
    if (gate.pet && (!ctx.pet || ctx.pet.id !== gate.pet)) return false;
    return true;
  }

  function isCombat(scenario) {
    return (scenario.options || []).some(o => o.battle);
  }

  function themeAllowed(theme, meta) {
    if (!theme) return false;
    if (theme.startsUnlocked !== false) return true;
    return meta && meta.unlocks && meta.unlocks.indexOf('open_the_wilds') !== -1
      ? theme.id === 'wilds' || (meta.grants && meta.grants.themes && meta.grants.themes.indexOf(theme.id) !== -1)
      : !!(meta && meta.grants && meta.grants.themes && meta.grants.themes.indexOf(theme.id) !== -1);
  }

  function validate(content) {
    const errors = [];
    const warnings = [];
    const themes = {};
    (content.themes || []).forEach(t => { themes[t.id] = t; });
    const nodes = content.nodes || {};
    const foes = {};
    (content.foes || []).forEach(f => { foes[f.id] = f; });
    const items = {};
    (content.items || []).forEach(it => { items[it.id] = it; });
    const pets = {};
    (content.pets || []).forEach(p => { pets[p.id] = p; });
    const scenarios = {};
    (content.scenarios || []).forEach(s => { scenarios[s.id] = s; });

    (content.layouts || []).forEach((row, index) => {
      const map = {};
      let forks = 0;
      (row.nodes || []).forEach(n => {
        map[n.id] = n;
        const hasNext = !!n.next;
        const hasFork = !!(n.left || n.right);
        if (hasNext && hasFork) errors.push(`Layout ${index} node ${n.id} has next and a fork`);
        if ((n.left && !n.right) || (!n.left && n.right)) errors.push(`Layout ${index} node ${n.id} fork needs left and right`);
        if (n.left && n.right) forks += 1;
      });
      if (forks > 1) errors.push(`Layout ${index} has more than one fork`);
      if (!map.stairs) errors.push(`Layout ${index} has no stairs`);
      Object.keys(map).forEach(id => {
        if (id === 'stairs') return;
        if (!reaches(map, id, 'stairs', {})) errors.push(`Layout ${index} node ${id} does not reach the stairs`);
      });
    });

    (content.scenarios || []).forEach(s => {
      (s.themes || []).forEach(id => {
        if (id !== '*' && !themes[id]) errors.push(`Scenario ${s.id} names unknown theme ${id}`);
      });
      (s.options || []).forEach(o => {
        ['success', 'fail'].forEach(key => {
          if (o.check && o.check[key] && !nodes[o.check[key]]) errors.push(`Option ${o.id} points at missing node ${o.check[key]}`);
        });
        if (o.battle && !foes[o.battle]) errors.push(`Option ${o.id} names no foe ${o.battle}`);
        if (o.goto && !nodes[o.goto]) errors.push(`Option ${o.id} points at missing node ${o.goto}`);
        if (o.grant && o.grant.item && !items[o.grant.item]) errors.push(`Option ${o.id} grants missing item ${o.grant.item}`);
        if (o.grant && o.grant.pet && !pets[o.grant.pet]) errors.push(`Option ${o.id} grants missing pet ${o.grant.pet}`);
        if (o.check && o.check.dc != null && !o.check.unfair) {
          const dc = o.check.dc;
          const bonus = 3 + (o.check.skill === 'athletics' ? 2 : 0);
          const chance = Math.min(0.95, Math.max(0.05, (21 - (dc - bonus)) / 20));
          if (chance < 0.35 || chance > 0.8) warnings.push(`Check ${o.id} succeeds about ${Math.round(chance * 100)}% at a +3`);
        }
      });
    });

    Object.keys(nodes).forEach(id => {
      if (nodes[id].startBattle && !foes[nodes[id].startBattle]) errors.push(`Node ${id} names no foe ${nodes[id].startBattle}`);
    });

    (content.classes || []).forEach(c => {
      if (c.startingPet && !pets[c.startingPet]) errors.push(`Class ${c.id} names missing pet ${c.startingPet}`);
    });

    (content.foes || []).forEach(f => {
      if (f.acTweak != null && Math.abs(f.acTweak) > 1) errors.push(`Foe ${f.id} ac tweak is past ±1`);
      if (f.hpTweak != null && Math.abs(f.hpTweak) > 0.15) errors.push(`Foe ${f.id} hp tweak is past ±15%`);
      if (f.damageDie && UIRPG.Dice.dieAverage(f.damageDie) > 12) errors.push(`Foe ${f.id} damage die exceeds the round budget`);
    });

    const dieCap = Math.max.apply(null, (content.classes || [{ weapon: { damageDie: '1d8' } }]).map(c => UIRPG.Dice.dieAverage(c.weapon.damageDie)));
    (content.pets || []).forEach(p => {
      if (p.trick && UIRPG.Dice.dieAverage(p.trick.damageDie) > dieCap + 0.01) {
        errors.push(`Pet ${p.id} trick exceeds the round budget`);
      }
    });

    (content.unlocks || []).forEach(u => {
      const g = u.grants || {};
      (g.themes || []).forEach(id => { if (!themes[id]) errors.push(`Unlock ${u.id} grants missing theme ${id}`); });
      (g.scenarios || []).forEach(id => { if (!scenarios[id]) errors.push(`Unlock ${u.id} grants missing scenario ${id}`); });
      (g.pets || []).forEach(id => { if (!pets[id]) errors.push(`Unlock ${u.id} grants missing pet ${id}`); });
    });

    return { errors, warnings, ok: errors.length === 0 };
  }

  return { SEED, clone, apply, byId, layoutFor, reaches, optionVisible, isCombat, themeAllowed, validate };
})();
