UIRPG.UI = UIRPG.UI || {};
UIRPG.UI.Layout = (() => {
  const KEY = 'uirpg_layout';
  const PAD = 3;
  const GAP = 2;
  const BAR_H = 36;
  let layout = null;

  function defaults() {
    return { colRatio: 0.4, topRatio: 0.55 };
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && typeof d.colRatio === 'number' && typeof d.topRatio === 'number') return d;
    } catch {}
    return defaults();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(layout));
  }

  function apply() {
    const app = document.getElementById('app');
    if (!app) return;
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const aw = ww - PAD * 2 - GAP;
    const ah = wh - PAD * 2 - GAP * 2 - BAR_H;
    const cl = Math.max(80, Math.round(aw * layout.colRatio));
    const cr = Math.max(80, aw - cl);
    const rt = Math.max(60, Math.round(ah * layout.topRatio));
    const rm = Math.max(60, ah - rt);
    app.style.gridTemplateColumns = `${cl}px ${cr}px`;
    app.style.gridTemplateRows = `${rt}px ${rm}px auto`;

    const vs = document.getElementById('vsplitter');
    const hs = document.getElementById('hsplitter');
    if (vs) vs.style.left = `${PAD + cl + GAP / 2}px`;
    if (hs) hs.style.top = `${PAD + rt + GAP / 2}px`;
  }

  function init() {
    layout = load();
    apply();
    window.addEventListener('resize', apply);

    const vs = document.getElementById('vsplitter');
    const hs = document.getElementById('hsplitter');
    if (vs) {
      vs.addEventListener('mousedown', e => startDrag(e, true));
      vs.addEventListener('touchstart', e => startDrag(e.touches[0], true), { passive: true });
    }
    if (hs) {
      hs.addEventListener('mousedown', e => startDrag(e, false));
      hs.addEventListener('touchstart', e => startDrag(e.touches[0], false), { passive: true });
    }
  }

  function startDrag(e, vert) {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const sr = layout.colRatio, st = layout.topRatio;

    function move(ev) {
      const pt = ev.touches ? ev.touches[0] : ev;
      const ww = window.innerWidth, wh = window.innerHeight;
      const aw = ww - PAD * 2 - GAP;
      const ah = wh - PAD * 2 - GAP * 2 - BAR_H;
      if (vert) {
        layout.colRatio = Math.max(0.08, Math.min(0.92, sr + (pt.clientX - sx) / aw));
      } else {
        layout.topRatio = Math.max(0.1, Math.min(0.9, st + (pt.clientY - sy) / ah));
      }
      apply();
    }

    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
      save();
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', up);
  }

  return { init, apply };
})();
