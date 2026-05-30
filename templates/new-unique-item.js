// ============================================================
// TEMPLATE: Adding a Unique Boss Drop
// ============================================================
// Unique items are dropped by specific enemies (matched by enemy `id`)
// at a configured chance. They can have ANY combination of stats.
// ============================================================

// ─── FILE TO EDIT: src/game/drops.js ───
// Find the UNIQUE_DROPS object (after ZONE_NAMES, before DEFENCE_SLOTS).
// Add a new entry using the enemy's `id` as the key.
//
// ▼ Insert this into UNIQUE_DROPS:
//
//   TODO_enemy_id: {
//     id: 'TODO_item_id',         // unique lowercase_id for the item
//     baseName: 'TODO Item Name', // display name
//     kind: 'TODO_slot',          // one of: main_hand, off_hand, helmet, chest,
//                                 //   leggings, boots, gloves, ring, belt, amulet
//     rarity: 'Unique',
//     dropChance: 0.05,           // 0.05 = 5% drop chance (follow existing pattern)
//
//     // ─── WEAPON STATS (if kind === 'main_hand') ───
//     minAtk: TODO,               // minimum attack damage per hit
//     maxAtk: TODO,               // maximum attack damage per hit
//     attackSpeed: TODO,          // milliseconds between attacks (1000-3000)
//     critChance: TODO,           // base crit chance (e.g. 10 = 10%)
//     critDmg: TODO,              // bonus crit multiplier (e.g. 0.5 = +50%)
//     accuracyBonus: TODO,        // bonus accuracy rating
//
//     // ─── DEFENSIVE STATS (armor/evasion items) ───
//     armorRating: TODO,          // flat armor rating
//     evasionRating: TODO,        // flat evasion rating
//     flatBlock: TODO,            // flat damage reduction per hit
//     dodgeChance: TODO,          // % chance to completely dodge an attack
//     thorns: TODO,               // damage reflected back to attacker
//
//     // ─── ATTRIBUTE BONUSES (any slot) ───
//     bonusStr: TODO,             // +STR
//     bonusDex: TODO,             // +DEX
//     bonusLuck: TODO,            // +LCK
//     bonusVit: TODO,             // +VIT
//
//     // ─── UTILITY STATS (any slot) ───
//     maxHpBonus: TODO,           // flat max HP increase
//     bonusRegen: TODO,           // additional HP regenerated per second
//     moveSpeed: TODO,            // % faster monster searching
//     searchSpeed: TODO,          // % faster search time (additive with moveSpeed)
//     lifeOnHit: TODO,            // HP healed per successful hit
//     stunChance: TODO,           // % chance to stun enemy (skip their attack)
//
//     // ─── LOOT MULTIPLIERS ───
//     goldMult: TODO,             // e.g. 0.5 = +50% gold
//     xpMult: TODO,               // e.g. 0.25 = +25% XP
//
//     desc: 'Item description text shown in tooltips',
//   },


// ─── DISPLAY NAME ───
// Unique items are displayed with a "◆" prefix and their baseName.
// Enchant levels are appended: "◆ Sticky Shield +3"
// No adjective prefix is added (unlike other rarities).


// ─── STAT DISPLAY ───
// All unique item stats are displayed via the UNIQUE_DISPLAY_KEYS array
// in drops.js. If you add a new stat type, add its display config there:
//
// { key: 'yourNewKey', label: 'Label', suffix: '%' }  // for percentage
// { key: 'yourNewKey', label: 'Label' }                 // for flat values


// ─── VERIFICATION ───
// 1. Kill the enemy that drops this item (it may take many kills due to 5% rate)
// 2. Verify the item appears in inventory with correct display name
// 3. Verify all stats show in the item tooltip/crafting modal
// 4. Equip the item and verify stats are applied in the battle panel
// 5. Enchant the item and verify the stat increases correctly
