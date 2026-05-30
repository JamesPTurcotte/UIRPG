# ◆ UIRPG — Idle RPG

A browser-based idle RPG built with vanilla JavaScript using the **Module Pattern** — a class-free OOP approach that leverages closures, encapsulation, and dependency injection via a global namespace.

## Quick Start

Open `index.html` in any browser. No build step, no server required.

```bash
bash build.sh            # (optional) copy src/ → dist/ for sharing
```

## Architecture Overview

Three layers, all following the **Module Pattern (IIFE)**:

```
src/
├── game/          # LAYER 1: Core logic (no DOM access, pure computation)
│   ├── core.js        Namespace root + version constants
│   ├── utils.js       Utility functions (HTML escaping)
│   ├── data.js        Read-only game data (zones, enemies, fishing spots)
│   ├── events.js      Publisher/Subscriber event bus
│   ├── state.js       State factory + stateless formulas (balance, combat calcs)
│   ├── engine.js      Game tick resolution (combat, fishing, offline sim)
│   ├── actions.js     Player actions (equip, enchant, salvage, fish, etc.)
│   ├── drops.js       Item generation (weapons, armor, rods, bait, uniques)
│   ├── fishing.js     Fishing mechanics (cast timer, yank, catch logic)
│   └── characters.js  Multi-character management
├── save/
│   ├── migrator.js    Versioned save migration
│   └── storage.js     localStorage persistence + backup rotation
├── ui/
│   ├── modal.js       Modal dialog system
│   ├── render.js      Full DOM re-render every frame
│   ├── crafting.js    Item detail / enchant modal
│   ├── surface.js     Panel wrapping system (overflow containment, header controls)
│   └── layout.js      Resizable grid layout
├── main.js         # Entry point: game loop, event wiring, drag-and-drop
└── styles.css      # All CSS (design system via CSS custom properties)
```

## Module Reference

### `UIRPG.Core` (`core.js`)
```
Properties: VERSION, SAVE_VERSION (currently 14)
```

### `UIRPG.Utils` (`utils.js`)
```
Methods: esc(str) → sanitized HTML string
```

### `UIRPG.Data` (`data.js`)
```
Properties: ZONES (deep-frozen), FISHING_SPOTS (deep-frozen)
Methods: findZone(idOrName), findFishingSpot(idOrName), fishingSpotInfo(s)
```
- `ZONES` — combat zones, each with `enemies[]` (hp, atk, def, evasion, accuracy, xp, gold)
- `FISHING_SPOTS` — fishing locations with `fish[]` (species with healMin/healMax, maxUses), `treasures[]` (currency drops), `catchTime`

### `UIRPG.Events` (`events.js`)
```
Methods: on(event, fn), off(event, fn), emit(event, data), clear()
```

Key events used throughout the codebase: `inventory:changed`, `equipment:changed`, `enemy:slain`, `player:levelUp`, `activity:changed`, `stats:changed`, `player:hardcoreDeath`.

### `UIRPG.State` (`state.js`)
```
Properties: BALANCE, EQUIP_SLOTS, DEFENCE_SLOTS
Methods: create(), computeStats(s), zoneInfo(s), clone(s), addGameLog(s, msg, type),
         effectiveStr(s), effectiveDex(s), effectiveLuck(s), effectiveVit(s),
         calcDR(armor), calcDodge(evasion), invCap(s), bankCap(s), weaponDps(weapon)
```
All balance constants in `BALANCE`. State shape created by `create()` includes `player`, `equipment`, `inventory`, `bank`, `activity` ('fight'|'fish'), `fishingSpot`, `fishingTimer`, `fishCaught`, `currencies` (shared between fishing and combat drops), `fishConsumeUses`, `equipLocks`, `autoEquipEnabled`.

**Currency drops from combat zones:** Each zone has a `treasureChance` and `treasures[]` array (same structure as fishing spots). On enemy death, there's a chance to drop a currency item (Old Coin, Pearl, Ancient Relic). Higher-tier zones have better drop rates and higher-value currencies.

### `UIRPG.Engine` (`engine.js`)
```
Methods: resolveTick(s, dt), spawnEnemy(s), simulateOffline(s, elapsedMs)
```
The tick resolver branches on `s.activity`:
- `'fight'` → combat with search/downtime between enemies
- `'fish'` → delegates to `UIRPG.Fishing.resolveTick()`

HP regen was removed. Fish healing is the only passive recovery.

**Drop flow (unified `handleDrop`):**
The `UIRPG.Actions.handleDrop(s, item, sourceName, label?)` method replaces all duplicated drop logic. It handles every item type — combat drops, fishing rods, and fish — in a single 4-stage pipeline:

1. `tryEquipDrop(s, item)` — checks if the item beats the currently equipped item in its slot (by `itemPrimaryValue`). If equipped, the old item goes to inventory (fish uses are reset to max). Log: `"X dropped Y! Auto-equipped."`
2. `shouldAutoSalvage(s, item)` — checks the auto-salvage rarity threshold. If the item's rarity is at or below the threshold, it's salvaged for gold. Log: `"Checked Y from X — not better, auto-salvaged for Zg"`
3. **Inventory full** — `replaceLowestItem(s, item)` finds the worst item in inventory (skipping locked items; for fish, only compares fish). If the new item is better, it replaces the worst. Otherwise, auto-salvages. Log: `"X dropped Y! (replaced lower item)"` or `"X dropped Y — inv full, auto-salvaged for Zg"`
4. **Fallthrough** — pushed to inventory. Log: `"X dropped Y!"`

### `UIRPG.Actions` (`actions.js`)
```
Methods: changeZone, equipItem, allocateStat, spreadStats, resetStats, salvageAll,
         salvageItem, enchantItem, enchantEquipped, unequipItem, upgradeInventory,
         upgradeBank, resetCharacter, switchTab, moveToBank, moveToInventory,
         toggleLock, toggleEquipLock, autoEquip, setFilter, setAutoSalvage,
         setAutoEquip, setActivity, changeFishingSpot, autoSalvageValue,
         shouldAutoSalvage, enchantCost, tryEquipDrop, handleDrop
```
- `setActivity(s, 'fight'|'fish')` — switches between activities
- `autoEquip(s)` — compares `itemPrimaryValue()` per slot: DPS for weapons, max(armor, evasion) for defence slots, sum of stats for rings/amulets, `healAmount × maxUses` for fish, `fishingPower` for rod, sum for bait
- `toggleEquipLock(s, slot)` — locks a slot so auto-equip and tryEquipDrop skip it
- `setAutoSalvage(s, rarity)` — cycles through: off → Common → Uncommon → Rare → Epic → Legendary → Unique. Items at or below the selected rarity are auto-salvaged on drop.
- `tryEquipDrop(s, item)` — for a single dropped item: determines its equipment slot, checks if it beats the currently equipped item (using `itemPrimaryValue`), and equips it if better (pushing old to inventory). Resets fish uses on swap. Respects `equipLocks`.
- `handleDrop(s, item, sourceName, label?)` — unified drop lifecycle for all item types (combat drops, rods, fish). Runs the full pipeline: `tryEquipDrop` → `shouldAutoSalvage` → `replaceLowestItem` (fish-aware) → inventory push. Logs every step with `sourceName` (enemy or spot name). Optional `label` overrides the display name (used for rods to show FP).

### `UIRPG.Fishing` (`fishing.js`)
```
Methods: startFishing(s, spotId), resolveTick(s, dt), fishingPower(s),
         catchSpeedMult(s), treasureChanceBonus(s)
```
**Catch speed:** `catchTime × (1 - (fishingPower × 0.2 + catchSpeed) / 100)` — higher fishing power now directly speeds up fishing. With FP 200 and no gear, time is reduced by 40%.

**Catch flow:**
1. **Cooldown** after each catch/escape: `fishingTimer` is frozen and `fishingCooldown` counts down (800-2300ms based on spot's highest fish rarity). UI shows `"Waiting: Xms"`.
2. Timer accumulates toward `catchTime × catchSpeedMult`
3. Random yank chance (0.3%/tick, starts at 30% progress): timer jumps backward 5-15%
4. If timer exceeds catch time by >15%: fish escapes
4. Otherwise: roll 60% fish, 15% rod (tiered by spot), 15% treasure, 10% nothing
5. When a fish is hooked, a secondary check runs: your `fishingPower` vs the fish's **difficulty**. If the check fails, the line breaks — no XP or gold is awarded, and `checkFishingLevelUp` is NOT called (the player can't level up from a fish they didn't land).
6. Rod drops from fishing now pass through `tryEquipDrop` (auto-equip if better than current rod) and `shouldAutoSalvage` (auto-salvage by rarity threshold) — same drop logic as combat kills.
7. **Fish drops** now also go through `tryEquipDrop` (auto-equips a better healing fish, pushing old to inventory with uses reset to max) and `shouldAutoSalvage` (auto-salvages by rarity threshold). Only if neither applies do they fall back to inventory push or the special `replaceLowestFish` full-inventory logic.
   - Each fish has a difficulty based on rarity (Common=1 → Legendary=5)
   - Catch success = `min(1, fishingPower / (difficulty × 35))`
    - At starter FP (~40): Common 100%, Rare 38%, Epic 28%, Legendary 22%
    - At FP 200: Legendary 100%
   - If the check fails: `"The [fish] broke the line! Too strong!"`

**Catch times doubled** across all spots — higher-tier spots scale harder.

**Rod drops from fishing:** Fishing can now yield rods matching the spot's tier. Each spot has a rod theme name (Simple, Forest, Cave, Mountain, Swamp, Desert). Rod FP scales quadratically: `tier² × 10 + tier × 5 + random`, reaching ~400 FP at tier 6.

**Fishing power zones:** Each fishing spot requires a minimum `fishingPower`:
- Village Pond: FP 0
- Forest River: FP 10
- Cave Lake: FP 25
- Mountain Stream: FP 50
- Swamp Waters: FP 100
- Desert Oasis: FP 200

Spot unlocks require both `player.level >= minLevel` AND `fishingPower >= minFishingPower`. Spots you can't access are greyed out with `[FP X]` shown in the dropdown.

**Fishing power formula:** `1 + (level-1) × 3 + rodFP + baitFP + bonusFP`. Luck no longer contributes to fishing power (pure gear and level progression).

**Fish as consumable:** Equipped in `fish` slot. Uses reset per combat. Auto-eats when `HP + healAmount ≤ maxHp` (no waste). End of fight consumes remaining uses for full heal. Unequipping resets to max uses.

### `UIRPG.Drops` (`drops.js`)
```
Properties: RARITIES (deep-frozen)
Methods: generateDrop(s), displayName(item), itemStats(item), genStarterSword()
```
Generates: weapons (Quick/Bladed/Balanced/Heavy), defensive items (armor/evasion), rings (stat bonuses), amulets (HP/speed/block/life-on-hit), rods (`fishingPower`), bait with archetypes, all with tier scaling and zone-themed names.

**Equipment panel separator:** The equipment tab has a horizontal divider (`<div class="equip-sep">`) between combat gear (main_hand through amulet) and fishing gear (rod, bait, fish).

**Bait archetypes** (chosen randomly each drop):
- **Swift Bait** — focuses on catch speed (30% chance)
- **Lucky Bait** — focuses on treasure chance (20% chance)
- **Heavy Bait** — high fishing power only (20% chance)
- **Balanced Bait** — moderate all stats (15% chance)
- **Expert Bait** — high fishing power + high catch speed (15% chance)

Rod `fishingPower` scales quadratically with tier: `tier² × 10 + tier × 5 + random(0, tier × 10 + 5)`. Same formula used both in combat drops (`genRod`) and fishing rod drops (`genFishingRod`). Tier 1 rods are ~15-30 FP; tier 6 rods reach ~390-450 FP.

**Note:** HP regeneration (`bonusRegen`) was removed from all items — fish healing is the only passive recovery. Amulets now roll `flatBlock` instead. Unique items that had regen now have replacement stats (life-on-hit, flat block, armor, luck).

### `UIRPG.Characters` (`characters.js`)
```
Methods: createCharacter(name, mode), deleteCharacter(id),
         loadCharacter(id), saveCharacterState(state),
         getCharacterList(), simulateOfflineForCharacter(id),
         loadSharedBank(), saveSharedBank(bank)
```
Modes: `normal` (shared bank), `ironman` (no shared bank), `hardcore` (death deletes character).

### `UIRPG.Migrator` (`migrator.js`)
```
Methods: migrate(raw) → migrated state
```
Currently at v14 migration. Each migration is a pure function in the `migrations[]` array. The pipeline runs automatically on every load.

### `UIRPG.Save` (`storage.js`)
```
Methods: load(), save(state), nuke(), loadCharacter(saveKey), saveCharacter(state, saveKey)
```

### `UIRPG.UI.Modal` (`modal.js`)
```
Methods: show(html), close(), openStats(s), openName(current, onConfirm),
         openSalvage(s, onYes), openOfflineSummary(summary), openResetConfirm(s),
         openCharacterSelect(onSelect)
```

### `UIRPG.UI.Render` (`render.js`)
```
Methods: all(), displayName(item), weaponStats(item), showCompare(...), hideCompare()
```
`all()` branches on `s.activity`:
- `'fight'` → `renderCombatUI(s)` (player stats + enemy stats with HP bars)
- `'fish'` → `renderFishingUI(s)` (fishing power, cast bar, spot info)

**Activity log behavior:** The log panel header says "Activity Log" (not "Combat Log"). Logs are rendered newest-first (reversed). The view starts at the top (newest entries) when new entries arrive, but the user can scroll down freely — `scrollTop` is only reset to 0 when new log entries are added, not on every render frame.

### `UIRPG.UI.Crafting` (`crafting.js`)
```
Methods: open(s, idx, source)
```

### `UIRPG.UI.Layout` (`layout.js`)
```
Methods: init(), apply()
```

---

## Game Loop

```
requestAnimationFrame(loop)
  → Engine.resolveTick(state, dt)
      ├── s.activity === 'fight' → combat ticks
      └── s.activity === 'fish'  → fishing ticks
  → UI.Render.all()
      ├── s.activity === 'fight' → renderCombatUI()
      └── s.activity === 'fish'  → renderFishingUI()
  → auto-save every 5s
```

---

## Dropdown System (How To)

### Architecture

Every dropdown uses the same pattern:
- **HTML**: a `.dropdown` wrapper containing the trigger button and a `.dropdown-menu` container
- **CSS**: `.dropdown { position: relative }` + `.dropdown-menu { position: absolute; top: 100% }`. A `.flip-up` class flips it above when there's no room below.
- **JS**: `showMenu(menu)` to open, `closeMenus()` to close all, document close handler for outside clicks.

**HTML:**
```html
<div class="dropdown">
  <button data-action="my-toggle">My Button</button>
  <div class="dropdown-menu" id="my-menu"></div>
</div>
```

**CSS** (already in `styles.css`):
```css
.dropdown { position: relative; display: inline-block; }
.dropdown-menu {
  display: none; position: absolute; top: 100%; left: 0;
  z-index: var(--z-modal); min-width: 160px; max-height: min(300px, 60vh);
  overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border);
}
.dropdown-menu.open { display: block; }
.dropdown-menu.flip-up { top: auto; bottom: 100%; }
.dropdown-item { padding: 3px 8px; cursor: pointer; color: var(--text); border-bottom: 1px solid var(--border-dark); }
.dropdown-item:hover { background: var(--bg-tertiary); color: var(--accent); }
.dropdown-item.active { color: var(--accent); background: var(--accent-bg); }
```

### Core JS helpers (defined in `main.js`)

```js
// Open a menu: close others, measure viewport, flip if needed
function showMenu(menu) {
  document.querySelectorAll('.dropdown-menu.open').forEach(m => {
    if (m !== menu) m.classList.remove('open', 'flip-up');
  });
  menu.classList.remove('flip-up');
  menu.classList.add('open');
  void menu.offsetHeight;                               // force layout reflow
  if (menu.getBoundingClientRect().bottom > window.innerHeight - 4) {
    menu.classList.add('flip-up');                      // flip above if off-screen
  }
}

// Close all dropdowns (used by close handler and select actions)
function closeMenus() {
  document.querySelectorAll('.dropdown-menu').forEach(m => {
    m.classList.remove('open', 'flip-up');
  });
}
```

### Close on outside click (registered once in `init()`)

```js
document.addEventListener('click', function(e) {
  if (!document.body.contains(e.target)) return;        // <-- CRITICAL: element was destroyed
  if (!e.target.closest('.dropdown')) closeMenus();
});
```

**⚠️ Critical gotcha:** When a menu item's `onClick` handler replaces `menu.innerHTML` (e.g. clicking "Zones" → replaces content with zone list), the clicked element is **destroyed** (removed from the DOM). The close handler fires AFTER `onClick` and tries `e.target.closest('.dropdown')` — but because the element is no longer in the DOM, `closest()` returns `null` and the handler **closes the menu it just opened**. The `document.body.contains(e.target)` guard prevents this: if the target was destroyed, skip close entirely.

### Standard action pattern

```js
} else if (action === 'my-toggle') {
  const menu = document.getElementById('my-menu');
  menu.innerHTML = `<div class="dropdown-item" data-action="my-action" data-value="...">Option</div>`;
  showMenu(menu);
  saveAndRender();
}

} else if (action === 'my-action') {
  // ... handle selection ...
  closeMenus();
  saveAndRender();
}
```

### Nested / multi-level menus (replace-content pattern)

Use the **same menu element** — swap its `innerHTML` instead of creating a second menu. No nested positioning needed.

```js
// Level 1 — main menu
} else if (action === 'my-toggle') {
  menu.innerHTML = `<div class="dropdown-item" data-action="show-sub">Submenu ▸</div>`;
  showMenu(menu);
  saveAndRender();
}

// Level 2 — replaces content when "Submenu" is clicked
} else if (action === 'show-sub') {
  menu.innerHTML =
    '<div class="dropdown-item" data-action="back-to-main">◀ Back</div>' +
    '<div class="dropdown-item" data-action="my-action" data-value="...">Option</div>';
  showMenu(menu);                                        // re-opens (content changed)
  saveAndRender();
}

// Back button restores level 1
} else if (action === 'back-to-main') {
  menu.innerHTML = `<div class="dropdown-item" data-action="show-sub">Submenu ▸</div>`;
  showMenu(menu);
  saveAndRender();
}
```

The menu stays in the same position — only its content changes. No new HTML elements needed. Always call `showMenu(menu)` after changing innerHTML so the viewport flip is re-evaluated.

### Example: Fight → Zones → Zone list

```js
// Main menu
} else if (action === 'switch-fight') {
  menu.innerHTML =
    `<div class="dropdown-item" data-action="fight-select-zones">Zones [${state.zone}]</div>` +
    `<div class="dropdown-item">Dungeon</div>`;
  showMenu(menu);
  saveAndRender();

// Sub-menu: zone list with back button
} else if (action === 'fight-select-zones') {
  menu.innerHTML =
    `<div class="dropdown-item" data-action="fight-back-to-main">◀ Back</div>` +
    zones.map(z => `<div class="dropdown-item" data-action="select-zone" data-value="${z.name}">${z.name}</div>`).join('');
  showMenu(menu);
  saveAndRender();

// Back to main
} else if (action === 'fight-back-to-main') {
  menu.innerHTML = `<div class="dropdown-item" data-action="fight-select-zones">Zones [Forest]</div> ...`;
}
// Zone selected → close menu
else if (action === 'select-zone') {
  changeZone(el.dataset.value);
  document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
}
```

### Dropdown item styling

```css
.dropdown-item { padding: 3px 8px; cursor: pointer; color: var(--text); border-bottom: 1px solid var(--border-dark); }
.dropdown-item:hover { background: var(--bg-tertiary); color: var(--accent); }
.dropdown-item.active { color: var(--accent); background: var(--accent-bg); }
.dropdown-item[data-locked] { color: var(--text-dim); opacity: 0.5; cursor: default; }
```

---

## Adding Content Guides

### Adding a New Zone
1. Add to `ZONES` array in `data.js` (before `deepFreeze`)
2. Add naming table to `ZONE_NAMES` in `drops.js`
3. See: `templates/new-zone.js`

### Adding a New Fishing Spot
1. Add to `FISHING_SPOTS` in `data.js` with `catchTime`, `fish[]` (each with `healMin`/`healMax`/`maxUses`/`rarity`), `treasures[]`, `treasureChance`
2. Fish species auto-generate from the spot's `fish[]` array — no code changes needed

### Adding a New Equipment Slot
1. Edit `state.js`: add to `EQUIP_SLOTS`, add to `create()` initialization
2. Edit `index.html`: add `.equip-slot` DOM element
3. Edit `render.js`: add to `SLOT_IDS`
4. Edit `drops.js`: add generation function, slot names, bonus pool entries
5. Add migration in `migrator.js`
6. See: `templates/new-equipment-slot.js`

### Adding a New Dropdown
1. Add `.dropdown` wrapper + `.dropdown-menu` to HTML
2. Add action handler in `main.js` `onClick`
3. Populate `innerHTML` with `.dropdown-item` elements
4. Use `document.querySelectorAll('.dropdown-menu.open')` for mutual exclusion
5. Check viewport with `getBoundingClientRect()` for flip-up
6. See: `templates/new-dropdown.js`

---

## Templates

All in `templates/`:

| Template | File | Use When... |
|---|---|---|
| **New Zone** | `new-zone.js` | Adding a zone with enemies |
| **New Unique Item** | `new-unique-item.js` | Adding a unique boss drop |
| **New Equipment Slot** | `new-equipment-slot.js` | Adding a new gear slot |
| **New Game Mode** | `new-game-mode.js` | Adding a character mode |
| **New Stat** | `new-stat.js` | Adding a player attribute |
| **New Module** | `new-module.js` | Creating a new game system module |
| **New Dropdown** | `new-dropdown.js` | Adding a viewport-clamped dropdown with nested sub-menu support |

---

## Save System

```
localStorage keys:
  uirpg_save                 Primary save
  uirpg_save.backup1/2       Backup rotation
  uirpg_characters           Character list
  uirpg_char_{id}            Per-character save
  uirpg_layout               UI panel ratios

State shape highlights:
  s.activity           'fight' | 'fish'
  s.fishingSpot        Current fishing spot id
  s.fishConsumeUses    Remaining fish heals this combat
  s.currencies         { old_coin: 12, pearl: 3, ... }
  s.equipLocks         { main_hand: true, ... }
  s.equipment          { main_hand, off_hand, ..., rod, bait, fish }
```

SAVE_VERSION in `core.js` must be bumped when state shape changes. Each bump needs a migration function in `migrator.js`. Current: v14.

---

## Layout Architecture

The game uses a **three-layer containment** approach to guarantee nothing renders outside the viewport:

```
body
  └── #game-container          (100vw x 100vh, overflow: clip)
        └── #app               (CSS Grid, 100% x 100%)
              ├── #action-square        row 1 / col 1   .surface
              │     └── .surface-body
              ├── #equip-panel          row 1 / col 2   .surface
              │     └── .surface-body
              ├── #logs-area            row 2 / col 1   .surface
              │     └── .surface-body
              ├── #inventory-panel      row 2 / col 2   .surface
              │     └── .surface-body
              └── #action-bar           row 3 / span 2 cols
  └── #modal                   (overlays game, not clipped)
  └── #compare-tooltip         (overlays game, not clipped)
  └── .splitter                (overlays game, not clipped)
```

- **`#game-container`** — the master box. `overflow: clip` prevents ANY content from rendering outside the viewport. No scrollbars, no overflow.
- **`#app`** — the CSS Grid that arranges all game panels. Each grid section is wrapped as a **Surface** (`.surface` + `.surface-body`) that clips its content, preventing toolbars and filters from bleeding outside. All grid sections have `min-width: 0` so they can shrink below their content when the container is narrow, which is required for scrollable toolbars like the inventory filter bar.
- **Modals and tooltips** live OUTSIDE the container so they can overlay the game without being clipped.

All interactive elements use `data-action` attributes. No native OS widgets. Custom dropdowns use `.dropdown` + `.dropdown-menu` + `.dropdown-item`.

---

## Surface System

The **Surface** system (`src/ui/surface.js`) is a lightweight wrapper that transforms each grid panel into a self-contained container. Every Surface guarantees its content lives within its bounds — no overflow outside, no scrollbars at the panel level. This is the foundation for future "float any panel" features like drag-move, pop-out windows, dock/undock, and collapse.

### Architecture

```
Before Surface:
  #inventory-panel              ← raw grid item, no overflow guarantee
    ├── .panel-header
    ├── #inv-toolbar
    │   └── .inv-filters        ← could overflow outside the panel
    └── #inventory-list

After Surface.wrap():
  #inventory-panel.surface      ← grid item, overflow: hidden
    └── .surface-body           ← flex:1, overflow: hidden
        ├── .panel-header
        ├── #inv-toolbar
        │   └── .inv-filters    ← now properly constrained
        └── #inventory-list
```

### The three layers of containment

```
body                               ← no overflow rules
  └── #game-container              ← overflow: clip (master box)
        └── #app                   ← CSS grid
              ├── #action-square    .surface   ← overflow: hidden
              │     └── .surface-body         ← flex:1, overflow: hidden
              ├── #equip-panel      .surface   ← overflow: hidden
              │     └── .surface-body         ← overflow-y: auto (scrolls slots)
              ├── #logs-area        .surface   ← overflow: hidden
              │     └── .surface-body         ← overflow: hidden
              └── #inventory-panel  .surface   ← overflow: hidden
                    └── .surface-body         ← overflow: hidden
```

1. **`#game-container`** — clips everything outside the viewport
2. **`.surface`** — each panel clips its own content so toolbars/filters never bleed out
3. **`.surface-body`** — inner scrollable areas (inventory list, stats, etc.) scroll inside the body, not the panel

### How it works

Containment is enforced at two levels — CSS-first and JS-backed:

**CSS-first (always active, before any JS):**
Each grid panel has `overflow: hidden` set directly in its CSS rule. This is the "window frame" wall. Nothing can render outside the panel, even if the Surface JS fails to load or runs late.

**JS-backed (adds structure + extensibility):**
`UIRPG.UI.Surface.wrap(el, options)` takes an element and:
1. Adds the `.surface` class (belt-and-suspenders: also sets `overflow: hidden`)
2. Moves all existing children into a new `.surface-body` wrapper div (flex container with `display: flex; flex-direction: column`)
3. Optionally prepends a `.surface-header` with a title and configurable control buttons
4. Returns an API object for runtime updates

The Surface **does not change the element's grid position**. Each `.surface` is still a direct child of `#app` and retains its `grid-area` rules. Only the internal layout changes.

### CSS

Each grid panel has `overflow: hidden` set **directly in its CSS rule** (not only via the JS `.surface` class). This means the "walls" exist from the very first paint, before any JavaScript runs. The `.surface` class is a belt-and-suspenders safety net.

```css
/* Direct CSS on each panel — these work before JS runs */
#inventory-panel { overflow: hidden; }
#equip-panel { overflow: hidden; }
#action-square { overflow: hidden; }
#logs-area { overflow: hidden; }

/* Surface class — safety net added by JS wrapper */
.surface {
  display: flex;
  flex-direction: column;
  overflow: hidden;              /* ← critical: contain everything */
  min-width: 0;
  min-height: 0;
}
.surface-body {
  display: flex;                 /* ← flex container so children with flex:1 work */
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;              /* ← inner areas scroll, not the panel */
}
.surface-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.surface-control-btn {
  /* future: popout, close, pin, collapse */
}
```

### API

```js
const surface = UIRPG.UI.Surface.wrap(element, {
  title: 'Inventory',            // optional, shows in .surface-header
  controls: [                    // optional buttons
    { label: '⤢', action: 'popout', title: 'Pop out',
      onClick: () => { /* future */ } },
  ],
});

surface.setTitle('New Title');   // update header text
surface.showControl('popout');   // show a control button
surface.hideControl('popout');   // hide a control button
```

To wrap all panels at once:

```js
UIRPG.UI.Surface.wrapAll({
  'action-square': { title: '' },
  'equip-panel':   { title: '' },
  'logs-area':     { title: '' },
  'inventory-panel': { title: '' },
});
```

### Adding a New Surface Control

1. Add the button config to the `controls[]` array in the `wrapAll` call in `main.js`
2. Add the corresponding label/action in the `onClick` handler
3. Style via `.surface-control-btn` in `styles.css`

Example — adding a collapse button:

```js
UIRPG.UI.Surface.wrap(el, {
  controls: [
    { label: '–', action: 'collapse', title: 'Collapse',
      onClick: () => {
        el.querySelector('.surface-body').classList.toggle('hidden');
      } },
  ],
});
```

### Why Surfaces solve the filter overflow problem

Before Surfaces, `#inv-toolbar` and `.inv-filters` were unrestrained flex children — they could grow beyond their parent's width because no ancestor had `overflow: hidden`. The fix adds `overflow: hidden` at every level of the containment chain:

```
#inventory-panel          overflow: hidden   (CSS, always active)
  └── .surface-body       display: flex; flex-direction: column; overflow: hidden
      └── #inv-toolbar    display: flex; overflow-x: auto; min-width: 0
          ├── .inv-tab
          ├── .tb-sep
          └── .inv-filters   display: flex; flex-wrap: nowrap
```

Each level is a "wall" that constrains the next. The toolbar (`#inv-toolbar`) is `display: flex; overflow-x: auto` — when its flex items (tabs + filters) exceed the available width, the toolbar itself scrolls horizontally. This is simpler and more robust than trying to scroll a nested flex child.

Two critical details:
1. `overflow: hidden` is set directly in each panel's CSS rule, not just via the JS-driven `.surface` class — this ensures the walls exist before any JavaScript executes
2. `.surface-body` is `display: flex; flex-direction: column` so children like `#inventory-list` (with `flex: 1`) can properly expand within the body

### Containment Chain Rules (for future content)

When adding new toolbars, menus, or content inside any panel, follow these rules to ensure it never overflows:

1. **Put scrollbars on the TOOLBAR, not on a child filter area** — the simplest, most robust approach is `overflow-x: auto` on the toolbar container itself (`#inv-toolbar`) so the entire row scrolls as one unit. Avoid nesting `overflow-x: auto` inside a flex child.
2. **Every parent that contains scrollable children needs `overflow: hidden`** — otherwise the children can grow past the parent's boundary
3. **The panel (.surface) should never scroll horizontally** — horizontal scrollbars go on a child container (like `#inv-toolbar`), not on the panel itself
4. **Every flex item that should be width-constrained needs `min-width: 0`** — without this, flex items refuse to shrink below their content width
5. **Never set `overflow` on a panel via JS alone** — always set it in CSS so it works before the first frame paints
6. **Toolbars inside a flex column need `flex-shrink: 0`** — so they take their natural height and don't get compressed by other flex items

These rules apply universally: inventory filters, equipment slots, combat logs, action buttons, or any future panel content.

---

## CSS Design System

All tokens in `:root`:

| Variable | Usage |
|---|---|
| `--bg-primary` | `#0d0d0d` — page background |
| `--bg-secondary` | `#131313` — panel backgrounds |
| `--border` | `#2a2a2a` — borders |
| `--text` | `#c0c0c0` — body text |
| `--accent` | `#00aa77` — interactive highlights (buttons, active items) |
| `--danger` | `#cc4444` — damage, death, deletion |
| `--warn` | `#ccaa33` — warnings, gold icon |
| `--evasion` | `#6699cc` — dodge/miss messages |

**Dodge cap:** `dodgeChance` from items is capped at 60% in `computeStats`.
| `--rarity-*` | Color per rarity tier |
| `--z-modal` | `100` — modal/dropdown z-index |
| `--z-splitter` | `50` — layout splitters |

---

## Conventions

### Code Style
- No comments in production code
- `camelCase` for functions and variables
- `UPPER_SNAKE_CASE` for BALANCE constants
- Two-space indentation
- Private functions = function declarations (not var/let assignments)
- Public API = returned object literal

### Naming
- `s` = state object (first param to all game functions)
- `p` = `s.player`
- `B` = `BALANCE` (aliased at top of modules)

### State Mutation Rules
1. `game/` layer mutates state
2. `ui/` layer only reads state (never mutates directly)
3. `save/` layer serializes/deserializes state
4. Pure computation functions (`computeStats`, `calcDR`) never mutate
5. Always `clone(s)` before offline simulation
6. Always `emit()` events after state changes

### Adding a New Action
1. Add the function in `actions.js`
2. Add it to the return object
3. Add a `data-action="your-action"` attribute in the HTML
4. Add a `} else if (action === 'your-action') {` block in `onClick` in `main.js`
5. Call `saveAndRender()` after mutation

### Adding a New Event
1. `idleRPG.Events.emit('your:event', data)` where the event occurs
2. `idleRPG.Events.on('your:event', handler)` in `main.js` or UI modules
3. Return the unsubscribe function from `on()` if cleanup is needed

---

## Common Pitfalls

| Pitfall | Solution |
|---|---|
| Dropdown menu opens then immediately closes | The trigger button must be inside a `.dropdown` wrapper so the close handler skips it. If using `position: fixed` instead of `.dropdown` wrapper, the close handler's `!e.target.closest('.dropdown')` check won't find it. |
| Dropdown menu appears far from the button | Must use `position: absolute` inside a `position: relative` wrapper (`.dropdown`). `position: fixed` with manual coordinates is fragile and should not be used. |
| Forgetting to `deepFreeze` data | Always freeze static data arrays after definition. |
| Mutating state during `computeStats` | `computeStats` must be a pure function — no side effects. |
| Adding events without emission | Every event needs a matching `emit()` call somewhere. |
| Forgetting save version bump | Bump `SAVE_VERSION` when state shape changes. |
| Fish items don't show enchant level | Fish have `enchants: 0` by default. Enchant upgrades `healAmount` by 10%. Display is automatic via `displayName()` — `0` is falsy so nothing shows until first enchant. |
| Loading corrupted save | Backup rotation tries 3 copies. Clear localStorage as last resort. |
| Horizontal scrollbar on a flex child doesn't appear | The scrollbar MUST go on the flex CONTAINER, not on a flex child. `overflow-x: auto` on a flex child is unreliable — the flex algorithm resists shrinking the item. Instead, put `overflow-x: auto` on the parent flex container (e.g., `#inv-toolbar`), and let the ENTIRE row scroll as one unit. |
| `overflow-x: auto` is set correctly but the scrollbar is invisible | Always give the scrollbar an explicit visible color. Using `var(--border)` (#2a2a2a) on a `var(--bg-primary)` (#0d0d0d) background is nearly invisible. Use `var(--accent-dim)` or `var(--text-dim)` instead. Set `min-width` on the thumb so it doesn't shrink to nothing. |
| `renderLog` forces `scrollTop = 0` every frame, preventing manual scrolling | Track `logEntryCount` and only auto-scroll when new entries arrive. Let the user manually scroll freely between renders. |
| Auto-salvage salvages items that would be an equipment upgrade | The drop flow in `handleEnemyDeath` now calls `tryEquipDrop` first — the item is compared with the currently equipped item. If better, it's equipped and the old item goes to inventory. Only if it's not an upgrade does it reach the auto-salvage check. |
| Fish breaks the line but the player still gains XP or levels up | `checkFishingLevelUp` was incorrectly called in the line-break failure path inside `catchFish`. Removed — the player cannot gain XP or level up from a fish they didn't land. |
| Rod drops from fishing bypass auto-salvage/auto-equip | Rod drops in `catchFish` now pass through `tryEquipDrop` and `shouldAutoSalvage` before falling back to inventory push — same logic as combat kill drops. |
