// Dice notation and rolls. Every random result in the game comes through here.
// Pass rng() -> [0, 1). Tests pass a seeded or scripted function. The page passes Math.random.
UIRPG.Dice = (() => {
  function parse(expr) {
    const text = String(expr).trim().toLowerCase();
    const m = text.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!m) throw new Error(`Bad dice expression: ${expr}`);
    return {
      n: Number(m[1] || 1),
      sides: Number(m[2]),
      mod: m[3] ? Number(m[3]) : 0,
    };
  }

  function face(sides, rng) {
    return 1 + Math.floor(rng() * sides);
  }

  function roll(expr, rng, opts) {
    const options = opts || {};
    const spec = typeof expr === 'string' ? parse(expr) : expr;
    if (options.dropLowest) {
      const faces = [];
      for (let i = 0; i < spec.n; i++) faces.push(face(spec.sides, rng));
      let dropAt = 0;
      for (let i = 1; i < faces.length; i++) if (faces[i] < faces[dropAt]) dropAt = i;
      const dropped = [faces[dropAt]];
      const kept = faces.filter((_, i) => i !== dropAt);
      const dieSum = kept.reduce((a, b) => a + b, 0);
      return {
        expr: `${spec.n}d${spec.sides}`,
        sides: spec.sides,
        faces,
        dropped,
        kept,
        dieSum,
        mod: spec.mod,
        total: dieSum + spec.mod,
        parts: options.parts || [],
      };
    }
    if (spec.sides === 20 && spec.n === 1 && (options.advantage || options.disadvantage)) {
      const a = face(20, rng);
      const b = face(20, rng);
      const kept = options.advantage ? Math.max(a, b) : Math.min(a, b);
      return {
        expr: 'd20',
        sides: 20,
        faces: [a, b],
        kept,
        dropped: kept === a ? b : a,
        dieSum: kept,
        mod: (options.mod || 0) + spec.mod,
        total: kept + (options.mod || 0) + spec.mod,
        parts: options.parts || [],
        advantage: !!options.advantage,
        disadvantage: !!options.disadvantage,
        crit: kept === 20,
        fumble: kept === 1,
      };
    }
    const faces = [];
    for (let i = 0; i < spec.n; i++) faces.push(face(spec.sides, rng));
    const dieSum = faces.reduce((a, b) => a + b, 0);
    const mod = spec.mod + (options.mod || 0);
    const oneD20 = spec.sides === 20 && spec.n === 1;
    return {
      expr: `${spec.n}d${spec.sides}`,
      sides: spec.sides,
      faces,
      kept: oneD20 ? faces[0] : dieSum,
      dieSum,
      mod,
      total: dieSum + mod,
      parts: options.parts || [],
      crit: oneD20 && faces[0] === 20,
      fumble: oneD20 && faces[0] === 1,
    };
  }

  function average(expr) {
    const spec = parse(expr);
    return spec.n * (spec.sides + 1) / 2 + spec.mod;
  }

  function dieAverage(expr) {
    const spec = parse(expr);
    return spec.n * (spec.sides + 1) / 2;
  }

  function makeRng(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return function rng() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function scripted(values) {
    let i = 0;
    return function rng() {
      if (i >= values.length) throw new Error('Scripted rng ran out of values');
      return values[i++];
    };
  }

  return { parse, roll, average, dieAverage, makeRng, scripted };
})();
