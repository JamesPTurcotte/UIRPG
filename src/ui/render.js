UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Render = (() => {
  const esc = UIRPG.Utils.esc;
  const $ = (id) => document.getElementById(id);

  function signed(n) {
    return n >= 0 ? '+' + n : String(n);
  }

  function hpBar(current, max) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return `<div class="hp-bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;
  }

  function sheet(state, content, sheetOpen) {
    const run = state.run;
    if (!run) return '';
    const classDef = UIRPG.Content.byId(content.classes, run.classId);
    const ac = UIRPG.Sheet.armorClass(classDef, run.abilities);
    const prof = UIRPG.Sheet.proficiency(run.level);
    const hp = state.reveal && state.reveal.hpBefore ? state.reveal.hpBefore.hp : run.hp;
    const lit = state.litAbility || '';
    const pet = run.pet ? `<div class="pet-line">Pet ${esc(run.pet.name)}${run.pet.trick ? ` · ${esc(run.pet.trick.name)}` : ''}</div>` : '';
    const items = run.inventory.length
      ? `<div class="inv-line">${run.inventory.map(it => esc(it.name)).join(', ')}</div>`
      : '';
    const focus = focusAbilities(state, content);
    const abilityHtml = UIRPG.Sheet.ABILITIES.map(key => {
      const score = run.abilities[key];
      const mod = UIRPG.Sheet.modifier(score);
      const cls = [
        'ability',
        lit === key ? 'lit' : '',
        focus[key] ? 'focus' : '',
      ].filter(Boolean).join(' ');
      return `<div class="${cls}" data-ability="${key}"><span>${UIRPG.Sheet.LABELS[key]} ${score}</span><span class="mod">${signed(mod)}</span></div>`;
    }).join('');
    const skills = (classDef.skills || []).map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));
    const skillLine = skills.length ? `<div class="skill-line">${esc(skills.join(', '))}</div>` : '';
    const feature = featureLine(classDef.feature);
    const featureHtml = feature ? `<div class="feature-line">${esc(feature)}</div>` : '';
    return `
      <div class="ability-grid">${abilityHtml}</div>
      <div class="stat-line">HP ${Math.max(0, hp)}/${run.maxHp}</div>
      ${hpBar(hp, run.maxHp)}
      <div class="stat-line">AC ${ac} · Prof ${signed(prof)} · Floor ${run.floor}</div>
      <button type="button" class="sheet-toggle" data-act="toggle-sheet">${sheetOpen ? 'Fewer scores' : 'Scores'}</button>
      <div class="stat-line">${esc(classDef.name)} · hit dice ${run.hitDiceLeft}</div>
      ${skillLine}
      ${featureHtml}
      ${pet}
      ${items}
      <div class="sheet-foot"><button type="button" data-act="ask-abandon">Abandon</button></div>`;
  }

  function focusAbilities(state, content) {
    const found = {};
    const run = state.run;
    if (!run) return found;
    if (run.battle) {
      const classDef = UIRPG.Content.byId(content.classes, run.classId);
      const ability = classDef && UIRPG.Sheet.attackAbility(classDef);
      if (ability) found[ability] = true;
      return found;
    }
    UIRPG.Run.currentOptions(state, content).forEach(opt => {
      const preview = UIRPG.Run.checkPreview(state, content, opt);
      if (preview && preview.ability) found[preview.ability] = true;
    });
    return found;
  }

  function featureLine(feature) {
    if (feature === 'advantage-first') return 'Advantage on your first attack';
    if (feature === 'heal-rest') return 'Heal once between rests';
    return '';
  }

  function map(run, hot) {
    if (!run || !run.map) return '';
    const nodes = run.map.nodes;
    const order = [];
    const seen = {};
    function walk(id) {
      if (!id || seen[id]) return;
      seen[id] = true;
      const node = nodes[id];
      if (!node) return;
      if (node.left && node.right) {
        order.push({ kind: 'fork', id, left: node.left, right: node.right });
        seen[node.left] = true;
        seen[node.right] = true;
        const left = nodes[node.left];
        const right = nodes[node.right];
        if (left && left.next) walk(left.next);
        if (right && right.next && !(left && left.next === right.next)) walk(right.next);
        return;
      }
      order.push({ kind: 'room', id });
      walk(node.next);
    }
    walk('entrance');
    if (!seen.stairs && nodes.stairs) order.push({ kind: 'room', id: 'stairs' });
    const html = order.map(piece => {
      if (piece.kind === 'fork') {
        return `<div class="fork">${nodeButton(nodes[piece.left], hot, run)}${nodeButton(nodes[piece.right], hot, run)}</div>`;
      }
      return nodeButton(nodes[piece.id], hot, run);
    }).join('');
    return `<div id="map"><div class="map-label">${esc(run.map.themeName)} · Floor ${run.floor}</div><div class="map-row">${html}</div></div>`;
  }

  function nodeButton(node, hot, run) {
    if (!node) return '';
    let tag = '';
    if (node.id === run.roomId) {
      if (node.mark === 'sword' || run.battle) tag = 'Fight';
      else if (node.mark === 'die') tag = 'Check';
    }
    const cls = [
      'room-node',
      node.id === hot ? 'hot' : '',
      node.visited ? 'visited' : '',
      node.current ? 'current' : '',
    ].filter(Boolean).join(' ');
    const word = tag ? `<span class="room-word">${esc(tag)}</span>` : '';
    return `<span class="${cls}" data-id="${esc(node.id)}" title="${esc(node.mapHint || '')}"><span class="room-name">${esc(node.title)}</span>${word}</span>`;
  }

  function optionButtons(state, content, options) {
    return options.map(opt => {
      const preview = UIRPG.Run.checkPreview(state, content, opt);
      const extra = preview ? ` ${signed(preview.total)} · DC ${preview.dc}` : '';
      const ability = preview ? preview.ability : '';
      return `<button type="button" data-act="option" data-id="${esc(opt.id)}" data-ability="${esc(ability)}">${esc(opt.label)}${esc(extra)}</button>`;
    }).join('');
  }

  function beats(run, skip) {
    if (!run || !run.chronicle) return '';
    const lines = run.chronicle.filter(line => line && line !== skip).slice(-3);
    if (!lines.length) return '';
    return `<ul class="beats">${lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul>`;
  }

  function page(state, content, hot, held) {
    const run = state.run;
    if (state.phase === 'rolling') return rolling(state);
    if (state.phase === 'assign') return assigning(state, content, held);
    if (state.phase === 'recap') return recap(state);
    if (state.phase === 'swap-pet') return swap(state);
    if (!run) return '';
    if (state.phase === 'rest') return rest(run);
    if (run.battle) return battle(state, content);
    const here = run.map.nodes[run.roomId];
    if (here) here.current = true;
    Object.keys(run.map.nodes).forEach(id => {
      if (id !== run.roomId) run.map.nodes[id].current = false;
    });
    let body = here.body;
    const title = here.title;
    if (run.mode === 'node' && content.nodes[run.nodeId]) {
      body = content.nodes[run.nodeId].body;
    }
    const options = UIRPG.Run.currentOptions(state, content);
    const exits = UIRPG.Run.exits(run).map(ex => {
      const cls = ex.id === hot ? ' hot' : '';
      return `<button type="button" class="${cls.trim()}" data-act="move" data-id="${esc(ex.id)}" data-dir="${esc(ex.dir)}">${esc(ex.label)}</button>`;
    }).join('');
    const notice = state.notice ? `<p class="notice">${esc(state.notice)}</p>` : '';
    const hint = run.floor === 1 && run.roomId === 'entrance' && !run.battle
      ? '<p class="hint">Arrows choose a passage. Enter steps through. Space settles the dice.</p>'
      : '';
    return `
      ${map(run, hot)}
      <article id="page">
        <h2>${esc(title)}</h2>
        <p class="prose">${esc(body)}</p>
        ${beats(run, body)}
        ${notice}
        <div class="choices">${optionButtons(state, content, options)}${exits}</div>
        ${hint}
      </article>`;
  }

  function battle(state, content) {
    const run = state.run;
    const b = run.battle;
    const foeHp = state.reveal && state.reveal.hpBefore ? state.reveal.hpBefore.foe : b.foe.hp;
    const classDef = UIRPG.Content.byId(content.classes, run.classId);
    const names = {
      attack: classDef.weapon.name,
      pet: run.pet && run.pet.trick ? run.pet.trick.name : 'Pet',
      heal: 'Heal',
      item: 'Item',
      flee: 'Flee',
    };
    const moves = UIRPG.Run.battleMoves(run).map((id, index) =>
      `<button type="button" data-act="battle" data-id="${esc(id)}">${index + 1} ${esc(names[id] || id)}</button>`
    );
    const node = run.nodeId && content.nodes[run.nodeId];
    const lead = node && node.body ? node.body : '';
    return `
      ${map(run, null)}
      <article id="page">
        ${lead ? `<p class="prose">${esc(lead)}</p>` : ''}
        ${beats(run, lead)}
        <div class="battle-head">
          <div class="who"><strong>${esc(classDef.name)}</strong>${hpBar(state.reveal && state.reveal.hpBefore ? state.reveal.hpBefore.hp : run.hp, run.maxHp)}</div>
          <div class="who"><strong>${esc(b.foe.name)}</strong>${hpBar(foeHp, b.foe.maxHp)}<div>AC ${b.foe.ac}</div></div>
        </div>
        <p class="turn">${b.turn === 'player' ? 'Your turn' : esc(b.foe.name) + ' acts'}</p>
        <div class="choices">${moves.join('')}</div>
      </article>`;
  }

  function rest(run) {
    return `
      ${map(run, null)}
      <article id="page">
        <h2>Stairs</h2>
        <p class="prose">${esc(run.map.nodes[run.roomId].body)}</p>
        ${beats(run, run.map.nodes[run.roomId].body)}
        <p>Hit dice left: ${run.hitDiceLeft}. Spending one rolls your hit die and adds Constitution.</p>
        <div class="choices">
          <button type="button" data-act="spend-die">Spend a hit die</button>
          <button type="button" data-act="descend">Descend</button>
        </div>
      </article>`;
  }

  function rollSlots(rolls) {
    const slots = [];
    for (let i = 0; i < 6; i++) {
      if (i < rolls.length) slots.push(`<span class="roll-chip filled">${rolls[i]}</span>`);
      else slots.push('<span class="roll-chip"></span>');
    }
    return `<div class="chip-row">${slots.join('')}</div>`;
  }

  function rolling(state) {
    const n = state.creation.rolls.length;
    return `<article id="page"><h2>Roll ${Math.min(n + 1, 6)} of 6</h2><p class="prose">4d6, drop the lowest. The tray keeps the discarded die.</p>${rollSlots(state.creation.rolls)}<button type="button" data-act="roll-ability">Roll</button></article>`;
  }

  function assigning(state, content, held) {
    const classDef = UIRPG.Content.byId(content.classes, state.creation.classId);
    const creation = state.creation;
    const placed = {};
    Object.keys(creation.assignments).forEach(key => { placed[creation.assignments[key]] = key; });
    const chips = creation.rolls.map((roll, index) => {
      if (placed[index]) return '';
      const on = held === index ? ' held' : '';
      return `<button type="button" class="roll-chip${on}" data-act="hold-roll" data-index="${index}" data-value="${roll}">${roll}</button>`;
    }).join('');
    const slots = UIRPG.Sheet.ABILITIES.map(key => {
      const index = creation.assignments[key];
      const value = index == null ? 'Place' : creation.rolls[index];
      const primary = key === classDef.primary ? ' primary' : '';
      const name = key === classDef.primary ? ' · primary' : '';
      return `<button type="button" class="place${primary}" data-act="place" data-ability="${key}"><span>${UIRPG.Sheet.LABELS[key]}${name}</span><span class="placed">${value}</span></button>`;
    }).join('');
    const note = state.notice ? `<p class="notice">${esc(state.notice)}</p>` : '';
    return `<article id="page"><h2>${esc(classDef.name)}</h2><p class="prose">Place each roll. The high one wants ${esc(UIRPG.Sheet.NAMES[classDef.primary])}.</p><div class="chip-row">${chips}</div><div class="place-list">${slots}</div>${note}<button type="button" data-act="confirm-assign">Begin</button></article>`;
  }

  function recap(state) {
    const r = state.recap || {};
    const unlocks = (r.unlocks || []).filter(Boolean);
    const earned = unlocks.length ? `<p class="prose">${esc(unlocks.join(' '))}</p>` : '';
    const blow = r.blow || 'The dark';
    const theme = r.theme || 'the delve';
    return `<article id="page"><h2>The run ends</h2><p class="prose">${esc(blow)} ends it, on floor ${esc(r.floor)} of ${esc(theme)}.</p>${earned}<p class="seed">Seed ${esc(r.seed)}</p><button type="button" data-act="to-table">Return to the table</button></article>`;
  }

  function swap(state) {
    const pet = state.run && state.run.pet;
    return `<article id="page"><h2>A companion</h2><p class="prose">${esc(state.petOffer.name)} waits. You already travel with ${esc(pet ? pet.name : 'no one')}.</p><button type="button" data-act="take-pet">Take ${esc(state.petOffer.name)}</button><button type="button" data-act="keep-pet">Keep yours</button></article>`;
  }

  function table(user, state, content, picking) {
    const meta = state.meta;
    const unlocks = (content.unlocks || []).map(u => {
      const known = meta.unlocks.indexOf(u.id) !== -1;
      return `<div class="${known ? 'known' : ''}">${esc(known ? u.name : u.hint)}</div>`;
    }).join('');
    const cont = state.run ? `<button type="button" data-act="continue">Continue · floor ${state.run.floor}</button>` : '';
    const admin = user.admin ? `<button type="button" data-act="open-admin">Add content</button>` : '';
    const notice = state.notice ? `<p class="notice">${esc(state.notice)}</p>` : '';
    return `
      <div id="table-screen">
        <div class="card">
          <h2>The table</h2>
          <p>One run at a time. Death ends it. What you unlock waits for the next.</p>
          ${notice}
          ${cont}
          <button type="button" data-act="new-run">New run</button>
          ${user.admin ? '<button type="button" data-act="test-run">Test run</button>' : ''}
          ${admin}
          <button type="button" data-act="logout">Log out</button>
          <div class="unlocks">${unlocks}</div>
          <div id="class-pick"${picking ? '' : ' hidden'}>
            <h3>Class</h3>
            ${(content.classes || []).filter(c => UIRPG.Meta.classOpen(c, meta)).map(c =>
              `<button type="button" data-act="pick-class" data-id="${esc(c.id)}">${esc(c.name)}</button>`
            ).join('')}
          </div>
        </div>
      </div>`;
  }

  function auth() {
    return `
      <div id="auth">
        <div class="card">
          <h2>Sit down</h2>
          <form id="login-form">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="username" required>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required minlength="8">
            <label for="name">Name, if this is your first time</label>
            <input id="name" name="name" type="text" maxlength="40" autocomplete="nickname">
            <p id="auth-error" class="scene-fail"></p>
            <button type="submit" data-act="login">Log in</button>
            <button type="button" data-act="register">Register</button>
          </form>
        </div>
      </div>`;
  }

  function diceFace(sides, face, lit) {
    const cls = (lit === true ? ' lit' : lit === false ? ' dim' : '') + (sides === 6 ? ' square' : '');
    return `<div class="token${cls}" data-sides="${sides}"><span class="pip">${face}</span><span class="sides">d${sides}</span></div>`;
  }

  function dice(reveal) {
    if (!reveal || !reveal.rolls || !reveal.rolls.length) return { html: '', crit: false, fumble: false };
    let crit = false;
    let fumble = false;
    const bits = [];
    reveal.rolls.forEach(roll => {
      if (roll.crit) crit = true;
      if (roll.fumble) fumble = true;
      const faces = roll.faces || [];
      const tokens = [];
      if (roll.advantage || roll.disadvantage) {
        faces.forEach(face => {
          const kept = face === roll.kept;
          tokens.push(diceFace(20, face, kept));
        });
      } else if (roll.dropped && roll.dropped.length && roll.faces) {
        roll.faces.forEach(face => {
          const dropped = roll.dropped.indexOf(face) !== -1 && roll.kept.indexOf(face) === -1;
          tokens.push(diceFace(roll.sides, face, dropped ? false : true));
        });
      } else {
        faces.forEach(face => tokens.push(diceFace(roll.sides, face, null)));
      }
      const parts = (roll.parts || []).map(p => `${p.label} (${p.value >= 0 ? '+' : ''}${p.value})`).join(' ');
      const note = roll.note || reveal.text || '';
      bits.push(`<div class="roll">${tokens.join('')}<div class="formula">${esc(roll.expr || '')} ${faces.join(' ')} ${esc(parts)} = ${roll.total}${note ? ' · ' + esc(note) : ''}</div></div>`);
    });
    return { html: bits.join(''), crit, fumble };
  }

  function paint(view) {
    const stage = $('stage');
    const sheetEl = $('sheet');
    const who = $('who');
    const tray = $('tray');
    const diceEl = $('dice');
    const chronicle = $('chronicle');
    who.innerHTML = view.user ? `${esc(view.user.name || view.user.email)} <button type="button" data-act="logout">Log out</button>` : '';
    if (!view.user) {
      sheetEl.hidden = true;
      sheetEl.innerHTML = '';
      stage.innerHTML = auth();
      tray.classList.add('closed');
      diceEl.innerHTML = '';
      chronicle.textContent = '';
      return;
    }
    if (view.adminOpen) {
      sheetEl.hidden = true;
      stage.innerHTML = UIRPG.UI.Content.form();
    } else if (!view.state.run && (view.state.phase === 'table' || view.state.phase === 'recap' && !view.state.recap)) {
      sheetEl.hidden = true;
      stage.innerHTML = table(view.user, view.state, view.content, view.picking);
    } else if (view.state.phase === 'recap') {
      sheetEl.hidden = true;
      stage.innerHTML = recap(view.state);
    } else if (view.state.phase === 'table') {
      sheetEl.hidden = true;
      stage.innerHTML = table(view.user, view.state, view.content, view.picking);
    } else {
      sheetEl.hidden = !view.state.run;
      sheetEl.innerHTML = view.state.run ? sheet(view.state, view.content, view.sheetOpen) : '';
      stage.innerHTML = page(view.state, view.content, view.hotExit || null, view.held);
    }
    sheetEl.classList.toggle('open', !!view.sheetOpen);
    const shown = dice(view.state && view.state.reveal);
    if (shown.html) {
      tray.classList.remove('closed');
      tray.classList.toggle('crit', shown.crit);
      tray.classList.toggle('fumble', shown.fumble);
      diceEl.innerHTML = shown.html;
      if (shown.fumble) diceEl.classList.add('shake');
      else diceEl.classList.remove('shake');
    } else {
      tray.classList.add('closed');
      tray.classList.remove('crit', 'fumble');
      diceEl.innerHTML = '';
    }
    chronicle.textContent = '';
  }

  return { paint };
})();
