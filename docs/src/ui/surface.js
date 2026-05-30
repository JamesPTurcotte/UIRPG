UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Surface = (() => {
  let wrapped = new WeakSet();

  function wrap(el, options = {}) {
    if (!el || wrapped.has(el)) return null;

    const title = options.title || '';
    const controls = options.controls || [];

    el.classList.add('surface');

    const body = document.createElement('div');
    body.className = 'surface-body';

    while (el.firstChild) body.appendChild(el.firstChild);
    el.appendChild(body);

    let header = null;
    let titleEl = null;
    let controlsEl = null;

    if (title || controls.length) {
      header = document.createElement('div');
      header.className = 'surface-header';

      titleEl = document.createElement('span');
      titleEl.className = 'surface-title';
      titleEl.textContent = title;
      header.appendChild(titleEl);

      controlsEl = document.createElement('span');
      controlsEl.className = 'surface-controls';
      controls.forEach(cfg => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'surface-control-btn';
        btn.dataset.surfaceAction = cfg.action || '';
        btn.textContent = cfg.label || '';
        if (cfg.title) btn.title = cfg.title;
        if (cfg.onClick) btn.addEventListener('click', cfg.onClick);
        controlsEl.appendChild(btn);
      });
      header.appendChild(controlsEl);

      el.insertBefore(header, body);
    }

    wrapped.add(el);

    return {
      el,
      body,
      header,
      setTitle: (t) => { if (titleEl) titleEl.textContent = t; },
      showControl: (action) => {
        if (!controlsEl) return;
        const btn = controlsEl.querySelector(`[data-surface-action="${action}"]`);
        if (btn) btn.classList.remove('hidden');
      },
      hideControl: (action) => {
        if (!controlsEl) return;
        const btn = controlsEl.querySelector(`[data-surface-action="${action}"]`);
        if (btn) btn.classList.add('hidden');
      },
    };
  }

  function wrapAll(map) {
    const results = [];
    for (const [id, opts] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) results.push(wrap(el, opts));
    }
    return results;
  }

  return { wrap, wrapAll };
})();
