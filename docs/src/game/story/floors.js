// Builds one floor map: a path, and from floor 2 a single left/right fork.
UIRPG.Floors = (() => {
  function weighted(items, rng) {
    const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let roll = rng() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= items[i].weight || 1;
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function eligible(scenario, ctx) {
    if (!scenario) return false;
    if (ctx.usedOnce && ctx.usedOnce.indexOf(scenario.id) !== -1) return false;
    if (scenario.minFloor != null && ctx.floor < scenario.minFloor) return false;
    if (scenario.maxFloor != null && ctx.floor > scenario.maxFloor) return false;
    const themes = scenario.themes || ['*'];
    if (themes.indexOf('*') === -1 && themes.indexOf(ctx.themeId) === -1) return false;
    if (scenario.requiresFlags) {
      for (let i = 0; i < scenario.requiresFlags.length; i++) {
        if (!ctx.flags || !ctx.flags[scenario.requiresFlags[i]]) return false;
      }
    }
    if (scenario.blocksFlags) {
      for (let i = 0; i < scenario.blocksFlags.length; i++) {
        if (ctx.flags && ctx.flags[scenario.blocksFlags[i]]) return false;
      }
    }
    if (scenario.startsUnlocked === false) {
      const granted = (ctx.grants && ctx.grants.scenarios) || [];
      if (granted.indexOf(scenario.id) === -1) return false;
    }
    return true;
  }

  function slotOk(scenario, slot) {
    if (!scenario.slot || scenario.slot === 'any') return true;
    if (slot === 'path') return scenario.slot === 'path';
    return scenario.slot === slot;
  }

  function markOf(scenario) {
    if (!scenario) return null;
    if (UIRPG.Content.isCombat(scenario)) return 'sword';
    if ((scenario.options || []).some(o => o.check)) return 'die';
    return null;
  }

  function fallback(slot) {
    return {
      id: 'fallback-' + slot,
      slot,
      title: 'Quiet',
      body: 'The way is empty. Dust, and the sound of your own breath.',
      mapHint: 'Nothing stirs.',
      options: [],
      fallback: true,
      mark: null,
    };
  }

  function pick(pool, rng, used) {
    const open = pool.filter(s => used.indexOf(s.id) === -1);
    if (!open.length) return null;
    const choice = weighted(open, rng);
    used.push(choice.id);
    return choice;
  }

  function generate(content, ctx) {
    const warnings = [];
    const layout = UIRPG.Content.layoutFor(content, ctx.floor);
    if (!layout) throw new Error('No layout for floor ' + ctx.floor);
    const themes = (content.themes || []).filter(t => {
      return UIRPG.Meta.themeOpen(t, ctx.meta) && (t.minFloor || 1) <= ctx.floor;
    });
    const hasRooms = theme => (content.scenarios || []).some(s => {
      const tags = s.themes || ['*'];
      return tags.indexOf('*') !== -1 || tags.indexOf(theme.id) !== -1;
    });
    let pool = themes.filter(t => t.id !== ctx.prevTheme);
    if (!pool.length) pool = themes.slice();
    const withRooms = pool.filter(hasRooms);
    if (withRooms.length) pool = withRooms;
    else {
      const anyRooms = themes.filter(hasRooms);
      if (anyRooms.length) pool = anyRooms;
    }
    if (!pool.length) throw new Error('No theme is unlocked');
    const theme = weighted(pool, ctx.rng);
    const used = [];
    const scenarios = (content.scenarios || []).filter(s => eligible(s, {
      floor: ctx.floor,
      themeId: theme.id,
      flags: ctx.flags,
      usedOnce: ctx.usedOnce,
      grants: ctx.meta.grants,
    }));
    const fightNode = layout.nodes.find(n => n.slot === 'right')
      || layout.nodes.find(n => n.slot === 'path');
    const nodes = {};
    layout.nodes.forEach(n => {
      nodes[n.id] = {
        id: n.id,
        slot: n.slot,
        next: n.next || null,
        left: n.left || null,
        right: n.right || null,
        scenarioId: null,
        title: n.slot === 'stairs' ? 'Stairs' : 'Room',
        body: '',
        mapHint: '',
        options: [],
        mark: null,
        fallback: false,
        visited: false,
      };
    });

    if (fightNode && fightNode.slot !== 'stairs') {
      const fights = scenarios.filter(s => UIRPG.Content.isCombat(s) && slotOk(s, fightNode.slot));
      const fight = pick(fights, ctx.rng, used);
      if (fight) fill(nodes[fightNode.id], fight);
    }

    layout.nodes.forEach(n => {
      if (n.slot === 'stairs') {
        nodes[n.id].title = 'Stairs';
        nodes[n.id].body = 'Stone steps lead down. You can spend a hit die here, then descend.';
        nodes[n.id].mapHint = 'Down.';
        return;
      }
      if (nodes[n.id].scenarioId) return;
      const stories = scenarios.filter(s => !UIRPG.Content.isCombat(s) && slotOk(s, n.slot));
      const story = pick(stories, ctx.rng, used);
      if (story) fill(nodes[n.id], story);
      else {
        const quiet = fallback(n.slot);
        fill(nodes[n.id], quiet);
        nodes[n.id].fallback = true;
        warnings.push(`Empty ${n.slot} on ${theme.id} filled with a quiet room`);
      }
    });

    return { themeId: theme.id, themeName: theme.name, nodes, warnings, start: 'entrance' };
  }

  function fill(node, scenario) {
    node.scenarioId = scenario.id;
    node.title = scenario.title || titleFrom(scenario);
    node.body = scenario.body || '';
    node.mapHint = scenario.mapHint || node.title;
    node.options = (scenario.options || []).map(o => Object.assign({}, o));
    node.mark = scenario.mark || markOf(scenario);
    node.once = !!scenario.once;
  }

  function titleFrom(scenario) {
    if (scenario.title) return scenario.title;
    if (scenario.id === 'fallback' || scenario.fallback) return 'Quiet';
    return (scenario.mapHint || 'Room').replace(/\.$/, '');
  }

  return { generate, eligible, fallback };
})();
