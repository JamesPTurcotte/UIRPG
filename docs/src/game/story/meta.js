// Permanent unlocks. They are recorded during a run and change the next run, not this floor.
UIRPG.Meta = (() => {
  const KINDS = ['themes', 'classes', 'scenarios', 'moves', 'pets'];

  function fresh() {
    return {
      unlocks: [],
      deepest: 0,
      runs: 0,
      grants: { themes: [], classes: [], scenarios: [], moves: [], pets: [] },
      notices: [],
    };
  }

  function recompute(meta, content) {
    const grants = { themes: [], classes: [], scenarios: [], moves: [], pets: [] };
    (content.unlocks || []).forEach(u => {
      if (meta.unlocks.indexOf(u.id) === -1) return;
      const g = u.grants || {};
      KINDS.forEach(kind => {
        (g[kind] || []).forEach(id => {
          if (grants[kind].indexOf(id) === -1) grants[kind].push(id);
        });
      });
    });
    meta.grants = grants;
    return meta;
  }

  function consider(meta, content, event) {
    const earned = [];
    (content.unlocks || []).forEach(u => {
      if (meta.unlocks.indexOf(u.id) !== -1) return;
      const when = u.when || {};
      let ok = false;
      if (when.floorReached != null && event.floor >= when.floorReached) ok = true;
      if (when.flag && event.flags && event.flags[when.flag]) ok = true;
      if (when.hasUnlock && meta.unlocks.indexOf(when.hasUnlock) !== -1) ok = true;
      if (!ok) return;
      meta.unlocks.push(u.id);
      earned.push(u);
      meta.notices.push(`${u.name} will be there next time.`);
    });
    recompute(meta, content);
    return earned;
  }

  function themeOpen(theme, meta) {
    if (!theme) return false;
    if (theme.startsUnlocked !== false) return true;
    return meta.grants.themes.indexOf(theme.id) !== -1;
  }

  function classOpen(classDef, meta) {
    if (!classDef) return false;
    if (classDef.startsUnlocked !== false) return true;
    return meta.grants.classes.indexOf(classDef.id) !== -1;
  }

  return { fresh, recompute, consider, themeOpen, classOpen, KINDS };
})();
