// ============================================================
// TEMPLATE: Adding a New Player Stat
// ============================================================
// Stats are the core attributes: STR, DEX, LUCK, VIT.
// To add a new one (e.g. "WISDOM" or "ENDURANCE"), follow
// the steps below.
// ============================================================


// ─── STEP 1: src/game/state.js — create() ───
// Add initial value and reset logic in the create() function:
//
//   wisdom: 5,  // or BALANCE.INITIAL_STAT_VALUE


// ─── STEP 2: src/game/state.js — BALANCE ───
// Add any balance constants related to the new stat:
//
//   HP_PER_WIS: 0,      // typically 0 unless you want HP from this
//   WIS_MANA_SCALE: 0,  // example: mana scaling
//   // etc.


// ─── STEP 3: src/game/state.js — effective* function ───
// Add the effective stat function following the existing pattern:
//
// function effectiveWis(s) {
//   let v = s.player.wisdom;
//   for (const slot of EQUIP_SLOTS) {
//     v += (s.equipment[slot]?.bonusWis || 0);
//   }
//   return v;
// }


// ─── STEP 4: src/game/state.js — computeStats() ───
// Incorporate the new stat into stat calculations:
//
//   const eWis = effectiveWis(s);
//   // Apply the stat's effects, e.g.:
//   // const manaBonus = eWis * B.WIS_MANA_SCALE;


// ─── STEP 5: src/game/actions.js — allocateStat() ───
// Add the new stat to the valid stats check:
//
//   if (stat !== 'str' && stat !== 'dex' && stat !== 'luck'
//       && stat !== 'vit' && stat !== 'wisdom') return false;


// ─── STEP 6: src/game/actions.js — spreadStats() ───
// Add to the stats array:
//
//   const stats = ['str', 'dex', 'luck', 'vit', 'wisdom'];


// ─── STEP 7: src/game/actions.js — resetStats() ───
// Add to the total spent calculation and reset:
//
//   const totalSpent = (p.str - 5) + (p.dex - 5) + (p.luck - 5)
//     + (p.vit - 5) + (p.wisdom - 5);
//   // ...
//   p.wisdom = 5;


// ─── STEP 8: src/ui/modal.js — openStats() ───
// Add the stat display config:
//
//   { id: 'wisdom', label: 'WIS', val: p.wisdom, eff: eWis,
//     effects: [
//       'TODO effect description line 1',
//       'TODO effect description line 2',
//     ],
//   },


// ─── STEP 9: src/ui/render.js ───
// Add the effective stat to the player stats display in all():
//
//   ['WIS', `${eWis}`],


// ─── STEP 10: src/game/drops.js ───
// Add bonus stat to BONUS_POOL:
//   { key: 'bonusWis', label: 'WIS', gen: _ => 1 + Math.floor(Math.random() * 3) },

// Add display entry in UNIQUE_DISPLAY_KEYS:
//   { key: 'bonusWis', label: 'WIS' },

// Add adjective in STAT_ADJECTIVES:
//   bonusWis: 'Wise',


// ─── STEP 11: src/save/migrator.js ───
// Add a migration step to initialize the new stat for existing saves:
//
//   // vN → vN+1 (add wisdom stat)
//   (raw) => {
//     const p = raw.player || {};
//     return {
//       ...raw,
//       version: N+1,
//       player: {
//         ...p,
//         wisdom: typeof p.wisdom === 'number' ? p.wisdom : 5,
//       },
//     };
//   },


// ─── VERIFICATION ───
// 1. Create a new character — verify stat starts at 5
// 2. Allocate points — verify stat increases and points decrease
// 3. Spread evenly — verify the new stat gets points
// 4. Reset stats — verify stat returns to 5 and points are refunded
// 5. Equip an item with the new bonus stat — verify effective value changes
// 6. Load an old save — verify migration adds the new stat
