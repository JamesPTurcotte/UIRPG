UIRPG.Save = (() => {
  const KEY = 'uirpg_save';
  const B1 = 'uirpg_save.backup1';
  const B2 = 'uirpg_save.backup2';

  function load() {
    rotateBackups();
    for (const key of [KEY, B1, B2]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const migrated = UIRPG.Migrator.migrate(parsed);
        if (migrated && migrated.player) return migrated;
      } catch (e) {
        console.warn(`Failed to load save from ${key}:`, e);
      }
    }
    return null;
  }

  function save(state) {
    try {
      state.saveTime = Date.now();
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  function rotateBackups() {
    try {
      const current = localStorage.getItem(KEY);
      const backup1 = localStorage.getItem(B1);
      if (current) localStorage.setItem(B1, current);
      if (backup1) localStorage.setItem(B2, backup1);
    } catch {}
  }

  function nuke() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(B1);
    localStorage.removeItem(B2);
  }

  function loadCharacter(saveKey) {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const migrated = UIRPG.Migrator.migrate(parsed);
      if (migrated && migrated.player) return migrated;
    } catch (e) {
      console.warn(`Failed to load character from ${saveKey}:`, e);
    }
    return null;
  }

  function saveCharacter(state, saveKey) {
    try {
      state.saveTime = Date.now();
      localStorage.setItem(saveKey, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to save character to ${saveKey}:`, e);
    }
  }

  return { load, save, nuke, loadCharacter, saveCharacter };
})();
