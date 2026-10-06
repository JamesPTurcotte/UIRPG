// Admin form. Players never receive this markup.
UIRPG.UI = UIRPG.UI || {};
UIRPG.UI.Content = (() => {
  const esc = UIRPG.Utils.esc;

  function form() {
    return `
      <div id="admin" class="card">
        <h2>Add content</h2>
        <p>A valid save is published for the next floor. The run already in progress keeps its map.</p>
        <label for="kind">Kind</label>
        <select id="kind" name="kind">
          <option value="themes">Theme</option>
          <option value="layouts">Floor layout</option>
          <option value="scenarios">Scenario</option>
          <option value="nodes">Node</option>
          <option value="classes">Class</option>
          <option value="pets">Pet</option>
          <option value="foes">Foe</option>
          <option value="items">Item</option>
          <option value="unlocks">Unlock</option>
        </select>
        <label for="entry">Object</label>
        <textarea id="entry" name="entry" spellcheck="false">{
  "id": "chapel",
  "name": "Chapel",
  "blurb": "Candles and cold stone.",
  "weight": 1,
  "minFloor": 1,
  "startsUnlocked": true
}</textarea>
        <p id="content-error" class="scene-fail"></p>
        <button type="button" data-act="publish">Publish</button>
        <button type="button" data-act="close-admin">Close</button>
      </div>`;
  }

  return { form };
})();
