// Admin form. Players never receive this markup.
UIRPG.UI = UIRPG.UI || {};
UIRPG.UI.Content = (() => {
  const SAMPLES = {
    themes: `{
  "id": "chapel",
  "name": "Chapel",
  "blurb": "Candles and cold stone.",
  "weight": 1,
  "minFloor": 1,
  "startsUnlocked": true
}`,
    layouts: `{
  "minFloor": 6,
  "nodes": [
    { "id": "entrance", "slot": "entrance", "next": "stairs" },
    { "id": "stairs", "slot": "stairs" }
  ]
}`,
    scenarios: `{
  "id": "chapel_door",
  "themes": ["crypt"],
  "slot": "path",
  "weight": 1,
  "body": "A chapel door stands ajar. Candle smoke, and someone breathing on the other side.",
  "mapHint": "A chapel door.",
  "options": [
    {
      "id": "listen",
      "label": "Listen at the door",
      "check": { "skill": "perception", "dc": 12, "success": "glen_heard", "fail": "glen_quiet" }
    }
  ]
}`,
    nodes: `{
  "id": "chapel_quiet",
  "body": "The chapel keeps its own counsel.",
  "options": []
}`,
    classes: `{
  "id": "bard",
  "name": "Bard",
  "primary": "cha",
  "hitDie": 8,
  "armor": { "kind": "light", "base": 11 },
  "saves": ["dex", "cha"],
  "skills": ["persuasion"],
  "weapon": { "id": "rapier", "name": "Rapier", "ability": "dex", "damageDie": "1d8" },
  "startsUnlocked": false
}`,
    pets: `{
  "id": "owl",
  "name": "Owl",
  "trick": { "id": "peck", "name": "Peck", "ability": "dex", "damageDie": "1d4" },
  "aid": { "skill": "perception" }
}`,
    foes: `{
  "id": "chapel_acolyte",
  "name": "Chapel Acolyte",
  "themes": ["crypt"],
  "difficulty": "easy",
  "damageDie": "1d6",
  "moves": ["strike"]
}`,
    items: `{
  "id": "salve",
  "name": "Salve",
  "heal": "2d4+2"
}`,
    unlocks: `{
  "id": "open_the_chapel",
  "name": "The Chapel",
  "hint": "Listen at a door and live.",
  "when": { "floorReached": 3 },
  "grants": { "themes": ["chapel"] }
}`,
  };

  function sample(kind) {
    return SAMPLES[kind] || SAMPLES.scenarios;
  }

  function form() {
    return `
      <div id="admin" class="card">
        <h2>Add content</h2>
        <p>A valid save is published for the next floor. The run already in progress keeps its map.</p>
        <label for="kind">Kind</label>
        <select id="kind" name="kind">
          <option value="scenarios" selected>Scenario</option>
          <option value="themes">Theme</option>
          <option value="layouts">Floor layout</option>
          <option value="nodes">Node</option>
          <option value="classes">Class</option>
          <option value="pets">Pet</option>
          <option value="foes">Foe</option>
          <option value="items">Item</option>
          <option value="unlocks">Unlock</option>
        </select>
        <label for="entry">Object</label>
        <textarea id="entry" name="entry" spellcheck="false">${sample('scenarios')}</textarea>
        <p id="content-error" class="scene-fail"></p>
        <button type="button" data-act="publish">Publish</button>
        <button type="button" data-act="close-admin">Close</button>
      </div>`;
  }

  return { form, sample };
})();
