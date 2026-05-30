UIRPG.LocalFile = (() => {
  function exportSave(s) {
    const json = JSON.stringify(s, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `UIRPG_save_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importSave(onLoad) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed || !parsed.player) {
            UIRPG.State.addGameLog(window.__state, 'Invalid save file — missing player data.', 'damage');
            UIRPG.UI.Render.all();
            return;
          }
          onLoad(parsed);
        } catch (err) {
          UIRPG.State.addGameLog(window.__state, 'Failed to read save file: ' + err.message, 'damage');
          UIRPG.UI.Render.all();
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  return { exportSave, importSave };
})();
