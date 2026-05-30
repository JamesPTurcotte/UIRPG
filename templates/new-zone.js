// ============================================================
// TEMPLATE: Adding a New Zone
// ============================================================
// This template covers all 3 files you need to edit.
// Search for "TODO" markers and "▼" to find insertion points.
// ============================================================

// ─── STEP 1: src/game/data.js ───
// Find the ZONES array and add a new entry BEFORE the `deepFreeze(ZONES)` call.
//
// ▼ Insert this object into the ZONES array:
//
// {
//   id: 'TODO_zone_id',          // unique lowercase_id (used in code references)
//   name: 'TODO Zone Name',      // display name (shown to player)
//   minLevel: TODO,              // minimum player level to access
//   enemies: [
//     {
//       id: 'TODO_enemy_1',      // unique enemy id (used for unique drops)
//       name: 'TODO Enemy 1',    // display name
//       hp: TODO,                // hit points
//       atk: TODO,               // base attack damage
//       def: TODO,               // base defense (reduces damage by def/2)
//       evasion: TODO,           // dodge chance (0-100, but uses formula)
//       accuracy: TODO,          // hit chance (0-100, but uses formula)
//       xp: TODO,                // base XP reward
//       gold: TODO,              // base gold reward
//     },
//     {
//       id: 'TODO_enemy_2',
//       name: 'TODO Enemy 2',
//       hp: TODO,
//       atk: TODO,
//       def: TODO,
//       evasion: TODO,
//       accuracy: TODO,
//       xp: TODO,
//       gold: TODO,
//     },
//     // Add 3 enemies per zone (matching existing zones)
//   ],
// },


// ─── STEP 2: src/game/drops.js ───
// Add a themed naming table to the ZONE_NAMES constant.
//
// ▼ Insert this into the ZONE_NAMES object:
//
//   TODO_zone_id: {
//     pre: 'TODO_Prefix',    // e.g. "Wooden", "Bone", "Dark"
//     suf: 'TODO_Suffix',    // e.g. "Club", "Blade", "Sword"
//     arm: 'TODO_Armor',     // chest armor name fragment
//     helm: 'TODO_Helm',     // helmet name fragment
//     leg: 'TODO_Leggings',  // leg slot name fragment
//     boot: 'TODO_Boots',    // boot name fragment
//     glove: 'TODO_Gloves',  // glove name fragment
//     belt: 'TODO_Belt',     // belt name fragment
//     amulet: 'TODO_Amulet', // amulet name fragment
//   },


// ─── STEP 3 (optional): src/game/drops.js — Unique Drops ───
// If you want boss-specific unique items, add entries to UNIQUE_DROPS.
// Use the enemy ID from STEP 1 as the key.
// See templates/new-unique-item.js for the full template.
//
//   TODO_enemy_1: {
//     id: 'TODO_item_id',
//     baseName: 'TODO Item Name',
//     kind: 'TODO_slot',
//     rarity: 'Unique',
//     ... (stats follow the patterns in the existing UNIQUE_DROPS entries)
//     dropChance: 0.05,  // 5% chance when this enemy is killed
//     desc: 'TODO description',
//   },


// ─── STEP 4: Verify ───
// 1. Start the game
// 2. Reach the required level
// 3. Open the zone selection dialog
// 4. Confirm the new zone appears and is clickable
// 5. Kill enemies and verify drops have correct naming theme
