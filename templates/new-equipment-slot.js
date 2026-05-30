// ============================================================
// TEMPLATE: Adding a New Equipment Slot
// ============================================================
// Adding a new slot (e.g. "shoulders", "wrists", "tabard")
// requires edits in 6 files. Follow each step carefully.
// ============================================================


// ─── STEP 1: src/game/state.js ───
// Add the slot name to the EQUIP_SLOTS array:
//
// const EQUIP_SLOTS = [
//   'main_hand', 'off_hand', 'helmet', 'chest', 'leggings',
//   'boots', 'gloves', 'ring1', 'ring2', 'belt', 'amulet',
//   'TODO_shoulders',  // <-- add new slot here
// ];
//
// If the new slot provides defense (armor/evasion), also add it to DEFENCE_SLOTS:
//
// const DEFENCE_SLOTS = ['off_hand', 'helmet', 'chest', 'leggings',
//   'boots', 'gloves', 'belt', 'TODO_shoulders'];

// Update the `create()` function to initialize the new slot to null:
//   shoulders: null,


// ─── STEP 2: src/game/drops.js ───
// Add a theme key for the new slot in ZONE_NAMES.
// Each zone entry needs: shoulders: 'TODO_ShouldersName'
//
// Add a display name in SLOT_NAMES:
//   shoulders: 'Shoulders',
//
// Add a generation case in generateDrop() — choose a probability slice.
// Example (insert into the roll-based if/else chain):
//   else if (rolls < 0.25) item = genDefensiveItem('TODO_shoulders', tier, th);
//
// Add the generation function (or reuse genDefensiveItem if it's armor/evasion):


// ─── STEP 3: src/index.html ───
// Add the DOM element for displaying the slot:
//
// <div class="equip-slot" data-kind="TODO_shoulders">
//   <span class="slot-label">TODO Shoulders</span>
//   <span id="TODO_shoulders-slot" class="slot-empty">empty</span>
// </div>


// ─── STEP 4: src/ui/render.js ───
// Add the slot label to SLOT_LABELS:
//   TODO_shoulders: 'TODO Shoulders',
//
// Add the slot ID to the SLOT_IDS array inside the all() function:
//   'TODO_shoulders',


// ─── STEP 5: src/ui/crafting.js ───
// No changes needed — it handles any slot generically via data attributes.


// ─── STEP 6: src/game/actions.js ───
// No changes needed — equipItem/unequipItem handle all slots generically.
// The ring findRingSlot logic already checks all EQUIP_SLOTS.
//
// Verify that equipItem can handle the new slot kind:
//   - The item's `kind` must exactly match the slot name for auto-equip
//   - If item.kind !== slot, equip will fail (which is correct)


// ─── VERIFICATION ───
// 1. Load a saved character and verify they have the new slot
// 2. Check the empty slot renders as "empty" with italic style
// 3. Drag an item of the new kind to the slot
// 4. Verify stats from the item apply correctly
// 5. Unequip the item and verify it returns to inventory
// 6. Load a pre-migration save and verify the migration adds null for new slot
