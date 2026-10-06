const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
  'src/game/core.js',
  'src/game/utils.js',
  'src/game/events.js',
  'src/game/story/dice.js',
  'src/game/story/sheet.js',
  'src/game/story/balance.js',
  'src/game/story/content.js',
  'src/game/story/meta.js',
  'src/game/story/floors.js',
  'src/game/story/battle.js',
  'src/game/story/run.js',
];

const context = { console, Math, Date, JSON, Object, Array, Number, String, Error };
vm.createContext(context);
files.forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});
const UIRPG = vm.runInContext('UIRPG', context);

let failed = 0;
function assert(name, cond) {
  if (cond) {
    console.log('ok  ' + name);
    return;
  }
  failed += 1;
  console.error('FAIL ' + name);
}

const content = UIRPG.Content.clone();
const checked = UIRPG.Content.validate(content);
assert('seed content validates', checked.ok);
if (!checked.ok) console.error(checked.errors.join('\n'));

const two = UIRPG.Dice.roll('2d6+1', UIRPG.Dice.scripted([0, 0.5]));
assert('2d6+1 known total', two.faces[0] === 1 && two.faces[1] === 4 && two.total === 6);

const drop = UIRPG.Dice.roll('4d6', UIRPG.Dice.scripted([0, 0.5, 0.99, 0.2]), { dropLowest: true });
assert('4d6 drop lowest', drop.faces.join(',') === '1,4,6,2' && drop.dropped[0] === 1 && drop.total === 12);

const adv = UIRPG.Dice.roll('1d20', UIRPG.Dice.scripted([0, 0.99]), { advantage: true });
assert('advantage keeps the higher die', adv.faces[0] === 1 && adv.faces[1] === 20 && adv.kept === 20);

const seedA = [UIRPG.Dice.makeRng(7)(), UIRPG.Dice.makeRng(7)()];
assert('same seed same roll', seedA[0] === seedA[1]);

const fighter = UIRPG.Content.byId(content.classes, 'fighter');
const skilled = Object.assign({}, fighter, { skills: ['persuasion'] });
const cha = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 };
const bare = UIRPG.Sheet.checkBonus(fighter, cha, 1, { skill: 'persuasion' });
const prof = UIRPG.Sheet.checkBonus(skilled, cha, 1, { skill: 'persuasion' });
assert('charisma 16 adds +3', bare.mod === 3 && bare.prof === 0 && bare.total === 3);
assert('persuasion proficiency adds the bonus', prof.prof === 2 && prof.total === 5);

const charm = content.scenarios.find(s => s.id === 'guard_at_the_gate').options[0];
assert('charm hidden below 12 charisma', !UIRPG.Content.optionVisible(charm, { abilities: { cha: 11 }, flags: {}, pet: null }));
assert('charm shown at 12 charisma', UIRPG.Content.optionVisible(charm, { abilities: { cha: 12 }, flags: {}, pet: null }));

const report = UIRPG.Balance.report(content);
report.lines.forEach(line => console.log('    ' + line));
assert('balance report inside the bands', report.ok);

const meta = UIRPG.Meta.fresh();
const cryptOnly = UIRPG.Floors.generate(content, {
  floor: 2, prevTheme: null, rng: UIRPG.Dice.makeRng(1), meta, flags: {}, usedOnce: [],
});
const ids = Object.keys(cryptOnly.nodes).map(id => cryptOnly.nodes[id].scenarioId).filter(Boolean);
assert('floor 2 has a left and a right door', cryptOnly.nodes.fork.left === 'left' && cryptOnly.nodes.fork.right === 'right');
assert('both branches reach the stairs', UIRPG.Content.reaches(cryptOnly.nodes, 'left', 'stairs', {}) && UIRPG.Content.reaches(cryptOnly.nodes, 'right', 'stairs', {}));
const swords = Object.keys(cryptOnly.nodes).filter(id => cryptOnly.nodes[id].mark === 'sword');
assert('one fight on the floor', swords.length === 1 && swords[0] === 'right');
assert('crypt room is not a wilds room', ids.every(id => !String(id).startsWith('wilds')));

const wildMeta = UIRPG.Meta.fresh();
wildMeta.unlocks.push('open_the_wilds');
UIRPG.Meta.recompute(wildMeta, content);
const wildContent = UIRPG.Content.clone();
wildContent.themes = wildContent.themes.filter(t => t.id === 'wilds');
wildContent.themes[0].startsUnlocked = true;
const wild = UIRPG.Floors.generate(wildContent, {
  floor: 2, prevTheme: null, rng: UIRPG.Dice.makeRng(2), meta: wildMeta, flags: {}, usedOnce: [],
});
const wildIds = Object.keys(wild.nodes).map(id => wild.nodes[id].scenarioId).filter(id => id && String(id).indexOf('fallback') !== 0);
assert('wilds floor has no crypt scenario', wildIds.every(id => String(id).startsWith('wilds')));

const thin = UIRPG.Content.clone();
thin.scenarios = thin.scenarios.filter(s => s.slot !== 'left');
const thinFloor = UIRPG.Floors.generate(thin, {
  floor: 2, prevTheme: null, rng: UIRPG.Dice.makeRng(3), meta, flags: {}, usedOnce: [],
});
assert('empty slot warns and fills a quiet room', thinFloor.warnings.length > 0 && thinFloor.nodes.left.fallback);

const again = UIRPG.Floors.generate(content, {
  floor: 2, prevTheme: null, rng: UIRPG.Dice.makeRng(1), meta, flags: {}, usedOnce: [],
});
assert('same seed rebuilds the same floor', JSON.stringify(again.nodes) === JSON.stringify(cryptOnly.nodes));

const marshy = UIRPG.Content.clone();
marshy.themes.push({ id: 'marsh', name: 'The Marsh', weight: 100, minFloor: 1, startsUnlocked: true });
const marshPicks = [];
for (let n = 0; n < 6; n++) {
  marshPicks.push(UIRPG.Floors.generate(marshy, {
    floor: 1, prevTheme: null, rng: UIRPG.Dice.makeRng(30 + n), meta, flags: {}, usedOnce: [],
  }).themeId);
}
assert('a theme with no rooms is skipped', marshPicks.every(id => id === 'crypt'));
const repeat = UIRPG.Floors.generate(marshy, {
  floor: 2, prevTheme: 'crypt', rng: UIRPG.Dice.makeRng(9), meta, flags: {}, usedOnce: [],
});
assert('an empty theme does not replace a real one', repeat.themeId === 'crypt' && !repeat.nodes.right.fallback);

function startedMap(seed) {
  const made = UIRPG.Run.session(UIRPG.Meta.fresh());
  UIRPG.Run.beginCreation(made, content, 'fighter', seed);
  while (made.phase === 'rolling') UIRPG.Run.rollAbility(made, () => 0.4);
  UIRPG.Sheet.ABILITIES.forEach((ability, index) => UIRPG.Run.assign(made, index, ability));
  UIRPG.Run.confirmAssign(made, content, () => 0.01);
  return made.run.map;
}
assert('the run seed, not the page roller, rebuilds the floor', JSON.stringify(startedMap(42)) === JSON.stringify(startedMap(42)));

const nat = UIRPG.Battle.attackResult({ d20: 20, bonus: 3, ac: 30, damageFaces: [2, 3], damageMod: 1 });
assert('natural 20 doubles dice not the modifier', nat.hit && nat.crit && nat.damage === 11);
const miss = UIRPG.Battle.attackResult({ d20: 1, bonus: 100, ac: 5, damageFaces: [6], damageMod: 4 });
assert('natural 1 misses', miss.hit === false && miss.fumble && miss.damage === 0);

const state = UIRPG.Run.session(UIRPG.Meta.fresh());
UIRPG.Run.beginCreation(state, content, 'ranger', 11);
while (state.phase === 'rolling') UIRPG.Run.rollAbility(state, UIRPG.Dice.makeRng(4));
UIRPG.Sheet.ABILITIES.forEach((ability, index) => UIRPG.Run.assign(state, index, ability));
const started = UIRPG.Run.confirmAssign(state, content, UIRPG.Dice.makeRng(11));
assert('ranger starts with the wolf', started.ok && state.run.pet && state.run.pet.id === 'wolf');

const steady = () => 0.5;
const before = state.run.battle;
UIRPG.Run.move(state, content, 'middle');
const sentry = UIRPG.Run.currentOptions(state, content).find(o => o.battle);
if (sentry) UIRPG.Run.choose(state, content, sentry.id);
if (state.run && state.run.battle) {
  state.run.hp = 100;
  state.run.maxHp = 100;
  state.run.battle.hp = 100;
  state.run.battle.playerAc = 40;
  state.run.battle.turn = 'player';
  state.run.battle.foe.hp = 30;
  const hp = state.run.battle.foe.hp;
  UIRPG.Run.actBattle(state, content, 'pet', steady);
  const foeHp = state.run.battle ? state.run.battle.foe.hp : 0;
  const dropped = hp - foeHp;
  const logText = state.run.battle ? state.run.battle.log.join(' ') : '';
  assert('wolf bite replaces the swing', logText.indexOf('Bite') !== -1 && logText.indexOf('Shortsword') === -1 && dropped > 0 && dropped <= 6);
  state.run.battle = null;
  state.run.mode = 'node';
  state.run.nodeId = 'sentry_down';
  assert('a finished scene still offers the passage', UIRPG.Run.exits(state.run).some(ex => ex.id === 'stairs'));
} else {
  assert('wolf bite replaces the swing', false);
}

const saved = UIRPG.Run.toSave(state);
const loaded = UIRPG.Run.fromSave(JSON.parse(JSON.stringify(saved)), content);
assert('save reloads the same room and hit points', loaded.ok && loaded.state.run.roomId === state.run.roomId && loaded.state.run.hp === state.run.hp);

const broken = UIRPG.Content.clone();
broken.scenarios = broken.scenarios.filter(s => s.id !== state.run.map.nodes[state.run.roomId].scenarioId);
const bounced = UIRPG.Run.fromSave(JSON.parse(JSON.stringify(saved)), broken);
assert('missing scenario returns to the table', bounced.toTable && bounced.state.phase === 'table' && !bounced.state.run);

const low = UIRPG.Run.session(UIRPG.Meta.fresh());
UIRPG.Run.beginCreation(low, content, 'fighter', 3);
while (low.phase === 'rolling') UIRPG.Run.rollAbility(low, () => 0.99);
UIRPG.Sheet.ABILITIES.forEach((ability, index) => UIRPG.Run.assign(low, index, ability));
UIRPG.Run.confirmAssign(low, content, UIRPG.Dice.makeRng(3));
low.run.hp = 1;
low.run.battle = {
  foe: { name: 'Crypt Sentry', hp: 5, maxHp: 5, ac: 10, attack: 8, damageDie: '1d8', damageMod: 3, attacks: 1, moves: ['strike'] },
  foeId: 'crypt_sentry',
  hp: 1,
  turn: 'player',
  playerAc: 10,
  log: [],
  fleeNode: null,
  win: null,
};
UIRPG.Run.actBattle(low, content, 'flee', UIRPG.Dice.scripted([0, 0.99, 0, 0.99]));
assert('zero hit points clears the run and keeps unlocks', low.phase === 'recap' && low.run === null && low.meta.deepest >= 1);

UIRPG.Meta.consider(low.meta, content, { floor: 2, flags: {} });
assert('floor 2 unlocks the wilds for the next run', low.meta.grants.themes.indexOf('wilds') !== -1);

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('all engine tests passed');
