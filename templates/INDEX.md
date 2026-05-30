# ◆ Template Index

These templates are ready-to-use boilerplates for extending the game. Each file is a complete guide with TODO markers and insertion points.

| Template | File | Purpose |
|---|---|---|
| New Zone | `new-zone.js` | Add a playable zone with themed enemies |
| New Unique Item | `new-unique-item.js` | Add a boss-specific unique drop |
| New Equipment Slot | `new-equipment-slot.js` | Add a new gear slot (shoulders, wrists, etc.) |
| New Game Mode | `new-game-mode.js` | Add a character mode (normal/ironman/hardcore/etc.) |
| New Stat | `new-stat.js` | Add a player attribute (WIS, END, CHA, etc.) |
| New Module | `new-module.js` | Create a new game system module |
| New Dropdown | `new-dropdown.js` | Add a viewport-clamped dropdown menu with nested sub-menu support |

## Usage

1. Copy the relevant template file to a work area
2. Follow each numbered step in order
3. Search for `TODO` to find exact modification points
4. Delete the template file when done

## Workflow Example

**Adding a new zone:**

```
1. cp templates/new-zone.js ~/Desktop/
2. Open new-zone.js and follow STEP 1 → edit data.js
3. Follow STEP 2 → edit drops.js
4. Follow STEP 3 → edit drops.js (uniques, optional)
5. Start game and verify
6. rm ~/Desktop/new-zone.js
```

## Template Conventions

- `TODO` = you must fill this in
- `▼` = insertion point in existing files
- `//` comments = guidance, delete after following
- Steps are numbered and must be done in order
