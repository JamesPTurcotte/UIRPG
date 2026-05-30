// ============================================================
// TEMPLATE: Adding a New Character Mode
// ============================================================
// The current modes are: 'normal', 'ironman', 'hardcore'.
// To add a new mode, follow the steps below.
// Search for "TODO" markers.
// ============================================================


// ─── STEP 1: src/game/characters.js ───
// The mode is stored as a string. No structural change needed.
// Update createCharacter() to handle the new mode:
//
// function createCharacter(name, mode = 'normal') {
//   // ...existing code...
//   character.mode = mode;
//
//   if (mode === 'TODO_new_mode') {
//     // Apply mode-specific setup
//     // e.g. extra restrictions, bonus items, special flags
//   }
// }


// ─── STEP 2: src/game/engine.js ───
// Add mode-specific death handling in handleDeath():
//
//   if (s.characterMode === 'TODO_new_mode') {
//     // Custom death behavior
//     IdleRPG.State.addGameLog(s, `You died in TODO mode! ...`, 'damage');
//     // e.g. delete character, reset progress, etc.
//     return;
//   }

// Add mode-specific restrictions in resolveTick():
//
//   if (s.characterMode === 'TODO_new_mode') {
//     // e.g. halved regen, no auto-salvage, capped stats
//   }


// ─── STEP 3: src/game/actions.js ───
// Add mode-specific action restrictions:
//
//   if (s.characterMode === 'TODO_new_mode' && action === 'restricted') {
//     IdleRPG.State.addGameLog(s, 'Not available in TODO mode', 'subtle');
//     return false;
//   }


// ─── STEP 4: src/ui/modal.js ───
// Add the mode option to openCreateCharacter():
//
//   <label style="display:block;margin-bottom:8px;">
//     <input type="radio" name="char-mode" value="TODO_new_mode" style="margin-right:6px;">
//     <span style="color:var(--warn);">TODO Mode Name</span>
//     <span style="color:var(--text-dim);font-size:10px;margin-left:6px;">TODO description of what this mode does</span>
//   </label>

// Update the mode label in openCharacterSelect() to show the new mode:
//
//   const modeLabel = char.mode === 'TODO_new_mode'
//     ? ' [TODO Mode Tag]'
//     : (char.mode === 'ironman' ? ' [Ironman]'
//       : char.mode === 'hardcore' ? ' [Hardcore]'
//       : '');


// ─── STEP 5: src/save/migrator.js ───
// Add a migration step if the new mode requires state changes:
//
//   // vN → vN+1 (TODO mode support)
//   (raw) => {
//     return { ...raw, version: N+1 };
//   },


// ─── VERIFICATION ───
// 1. Create a character in the new mode
// 2. Verify mode tag displays in character selection
// 3. Test mode-specific death behavior
// 4. Test mode-specific restrictions
// 5. Save and reload — verify mode persists
