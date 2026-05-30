// ============================================================
// TEMPLATE: Creating a New Game Module
// ============================================================
// This is a blank Module Pattern skeleton.
// Copy this file to src/game/TODO_modulename.js
// (or src/save/ or src/ui/ depending on the layer).
// ============================================================

IdleRPG.TODO_ModuleName = (() => {
  // ─── Private Constants ───
  // const B = IdleRPG.State.BALANCE;
  // const MY_CONST = 42;

  // ─── Private State ───
  // let internalVar = null;

  // ─── Private Helper Functions ───
  // function helper(arg) {
  //   // internal logic here
  //   return result;
  // }

  // ─── Public API ───
  // function doSomething(s, arg) {
  //   // `s` = state object (first param by convention)
  //   // Read state via s.player, s.equipment, etc.
  //   // Call IdleRPG.State.computeStats(s) for derived values
  //   // Emit events via IdleRPG.Events.emit('eventName', data)
  //   // Add log entries via IdleRPG.State.addGameLog(s, 'message', 'type')
  // }

  // function getSomething() {
  //   // Read-only accessor
  // }

  return {
    // doSomething,
    // getSomething,
  };
})();


// ─── REGISTRATION ───
// 1. Add the script tag to index.html (alphabetically in its layer):
//    <script src="src/game/TODO_modulename.js"></script>
//
// 2. If the module needs initialization, call it from main.js init():
//    IdleRPG.TODO_ModuleName.init();
//
// 3. If the module needs events, subscribe in main.js:
//    IdleRPG.Events.on('someEvent', data => {
//      IdleRPG.TODO_ModuleName.handle(data);
//    });


// ─── LAYER RULES ───
// game/    = pure logic, no DOM access. Stateful (mutates s).
// save/    = persistence only. No game logic.
// ui/      = DOM access only. Read-only for game state.
// main.js  = glue code: wires events, initializes, runs loop.
//            No game logic, no UI templates (delegates to modules).


// ─── PUBLIC API CONVENTIONS ───
// - Functions that mutate state take `s` (state) as first param
// - Returns: boolean for success/failure, or the result
// - On failure: return false (don't throw unless truly exceptional)
// - On success: emit relevant events via Events.emit()
// - Side effects (logging, gold deduction) happen in the function
// - DOM updates happen via Events subscribers, not here
