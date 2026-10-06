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

  function sheet(state, content) {
    const run = state.run;
    if (!run) return '';
    const classDef = UIRPG.Content.byId(content.classes, run.classId);
    const ac = UIRPG.Sheet.armorClass(classDef, run.abilities);
    const prof = UIRPG.Sheet.proficiency(run.level);
    const hp = state.reveal && state.reveal.hpBefore ? state.reveal.hpBefore.hp : run.hp;
    const lit = state.litAbility || '';
    const abilities = UIRPG.Sheet.ABILITIES.map(key => {
      const score = run.abilities[key];
      const mod = UIRPG.Sheet.modifier(score);
      return `<div class="ability${lit === key ? ' lit' : ''}" data-ability="${key}"><span>${UIRPG.Sheet.LABELS[key]} ${score}</span><span class="mod">${signed(mod)}</span></div>`;
    }).join('');
    const pet = run.pet ? `<div class="pet-line">Pet ${esc(run.pet.name)}${run.pet.trick ? ` · ${esc(run.pet.trick.name)}` : ''}</div>` : '';
    const abandon = `<div class="stat-line"><button type="button" data-act="ask-abandon">Abandon</button></div>`;
    const items = run.inventory.length
      ? `<div class="inv-line">${run.inventory.map(it => esc(it.name)).join(', ')}</div>`
      : '';
    return `
      <div class="ability-grid">${abilities}</div>
      <div class="stat-line">HP ${Math.max(0, hp)}/${run.maxHp}</div>
      ${hpBar(hp, run.maxHp)}
      <div class="stat-line">AC ${ac} · Prof ${signed(prof)} · Floor ${run.floor}</div>
      <div class="stat-line">${esc(classDef.name)} · hit dice ${run.hitDiceLeft}</div>
      ${pet}
      ${items}
      ${abandon}`;
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
    const here = run.map.nodes[run.roomId];
    const linked = node.id === run.roomId || (here && (here.next === node.id || here.left === node.id || here.right === node.id));
    const mark = node.mark === 'sword' ? ' †' : node.mark === 'die' ? ' ◇' : '';
    const cls = [
      'room-node',
      node.id === hot ? 'hot' : '',
      node.visited ? 'visited' : '',
      node.current ? 'current' : '',
    ].filter(Boolean).join(' ');
    const label = `${esc(node.title)}${mark}`;
    if (!linked || node.id === run.roomId) {
      return `<span class="${cls}" title="${esc(node.mapHint || '')}">${label}</span>`;
    }
    return `<button type="button" class="${cls}" data-act="move" data-id="${esc(node.id)}" title="${esc(node.mapHint || '')}">${label}</button>`;
  }

  function optionButtons(state, content, options) {
    return options.map(opt => {
      const preview = UIRPG.Run.checkPreview(state, content, opt);
      const extra = preview ? ` ${signed(preview.total)} · DC ${preview.dc}` : '';
      const ability = preview ? preview.ability : '';
      return `<button type="button" data-act="option" data-id="${esc(opt.id)}" data-ability="${esc(ability)}">${esc(opt.label)}${esc(extra)}</button>`;
    }).join('');
  }

  function page(state, content, hot) {
    const run = state.run;
    if (state.phase === 'rolling') return rolling(state);
    if (state.phase === 'assign') return assigning(state, content);
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
    let title = here.title;
    if (run.mode === 'node' && content.nodes[run.nodeId]) {
      body = content.nodes[run.nodeId].body;
      title = 'After';
    }
    const options = UIRPG.Run.currentOptions(state, content);
    const exits = UIRPG.Run.exits(run).map(ex => {
      const cls = ex.id === hot ? ' hot' : '';
      return `<button type="button" class="${cls.trim()}" data-act="move" data-id="${esc(ex.id)}" data-dir="${esc(ex.dir)}">${esc(ex.label)}</button>`;
    }).join('');
    const notice = state.notice ? `<p class="notice">${esc(state.notice)}</p>` : '';
    return `
      ${map(run, hot)}
      <article id="page">
        <h2>${esc(title)}</h2>
        <p class="prose">${esc(body)}</p>
        ${notice}
        <div class="choices">${optionButtons(state, content, options)}${exits}</div>
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
    return `
      ${map(run, null)}
      <article id="page">
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
        <p>Hit dice left: ${run.hitDiceLeft}. Spending one rolls your hit die and adds Constitution.</p>
        <div class="choices">
          <button type="button" data-act="spend-die">Spend a hit die</button>
          <button type="button" data-act="descend">Descend</button>
        </div>
      </article>`;
  }

  function rolling(state) {
    const n = state.creation.rolls.length;
    return `<article id="page"><h2>Roll ${Math.min(n + 1, 6)} of 6</h2><p class="prose">4d6, drop the lowest. The tray keeps the discarded die.</p><button type="button" data-act="roll-ability">Roll</button></article>`;
  }

  function assigning(state, content) {
    const classDef = UIRPG.Content.byId(content.classes, state.creation.classId);
    const rows = UIRPG.Sheet.ABILITIES.map(key => {
      const options = state.creation.rolls.map((roll, index) => {
        const taken = Object.keys(state.creation.assignments).some(k => k !== key && state.creation.assignments[k] === index);
        const selected = state.creation.assignments[key] === index ? ' selected' : '';
        return `<option value="${index}"${selected}${taken ? ' disabled' : ''}>${roll}</option>`;
      }).join('');
      const mark = key === classDef.primary ? ' · primary' : '';
      return `<div class="assign-row"><label>${UIRPG.Sheet.LABELS[key]}${mark}</label><select data-act="assign" data-ability="${key}"><option value="">—</option>${options}</select></div>`;
    }).join('');
    return `<article id="page"><h2>${esc(classDef.name)}</h2><p class="prose">Place each roll. The high one wants ${esc(UIRPG.Sheet.NAMES[classDef.primary])}.</p>${rows}<button type="button" data-act="confirm-assign">Begin</button></article>`;
  }

  function recap(state) {
    const r = state.recap || {};
    return `<article id="page"><h2>The run ends</h2><p class="prose">Floor ${esc(r.floor)} · ${esc(r.theme || '')}. ${esc(r.blow || '')} ends it. Seed ${esc(r.seed)}.</p><button type="button" data-act="to-table">Return to the table</button></article>`;
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
      sheetEl.innerHTML = view.state.run ? sheet(view.state, view.content) : '';
      stage.innerHTML = page(view.state, view.content, view.hotExit || null);
    }
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
    const run = view.state && view.state.run;
    const last = run && run.chronicle.length ? run.chronicle[run.chronicle.length - 1] : '';
    chronicle.textContent = last || (view.state && view.state.notice) || '';
  }

  return { paint };
})();
