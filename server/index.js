const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { DatabaseSync } = require('node:sqlite');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'game.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saves (
    user_id INTEGER PRIMARY KEY,
    run_json TEXT,
    meta_json TEXT NOT NULL,
    phase TEXT,
    recap_json TEXT
  );
  CREATE TABLE IF NOT EXISTS story (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json TEXT NOT NULL
  );
`);

function loadEngine() {
  const files = [
    'src/game/core.js',
    'src/game/utils.js',
    'src/game/events.js',
    'src/game/story/dice.js',
    'src/game/story/sheet.js',
    'src/game/story/balance.js',
    'src/game/story/content.js',
    'src/game/story/meta.js',
    'src/game/story/floors.js',
    'src/game/story/battle.js',
    'src/game/story/run.js',
  ];
  const context = { console, Math, Date, JSON, Object, Array, Number, String, Error };
  vm.createContext(context);
  files.forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return vm.runInContext('UIRPG', context);
}

const UIRPG = loadEngine();

function seedStory() {
  const row = db.prepare('SELECT json FROM story WHERE id = 1').get();
  if (row) return JSON.parse(row.json);
  const content = UIRPG.Content.clone();
  db.prepare('INSERT INTO story (id, json) VALUES (1, ?)').run(JSON.stringify(content));
  return content;
}

function readStory() {
  return JSON.parse(db.prepare('SELECT json FROM story WHERE id = 1').get().json);
}

function writeStory(content) {
  db.prepare('UPDATE story SET json = ? WHERE id = 1').run(JSON.stringify(content));
}

seedStory();

function admins() {
  const fromEnv = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (fromEnv.length) return fromEnv;
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'admins.json'), 'utf8')).map(s => String(s).toLowerCase());
  } catch (err) {
    return [];
  }
}

function isAdmin(email) {
  return admins().indexOf(String(email).toLowerCase()) !== -1;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function cookieToken(req) {
  const header = req.headers.cookie || '';
  const parts = header.split(';');
  for (let i = 0; i < parts.length; i++) {
    const bit = parts[i].trim();
    if (bit.startsWith('sid=')) return decodeURIComponent(bit.slice(4));
  }
  return null;
}

function userFrom(req) {
  const token = cookieToken(req);
  if (!token) return null;
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  return db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(session.user_id);
}

function publicUser(user) {
  if (!user) return null;
  return { email: user.email, name: user.name, admin: isAdmin(user.email) };
}

function loadSave(userId) {
  const row = db.prepare('SELECT run_json, meta_json, phase, recap_json FROM saves WHERE user_id = ?').get(userId);
  if (!row) {
    return { run: null, meta: UIRPG.Meta.fresh(), phase: 'table', recap: null };
  }
  return {
    run: row.run_json ? JSON.parse(row.run_json) : null,
    meta: JSON.parse(row.meta_json),
    phase: row.phase || 'table',
    recap: row.recap_json ? JSON.parse(row.recap_json) : null,
  };
}

function payload(user) {
  const saved = user ? loadSave(user.id) : { run: null, meta: UIRPG.Meta.fresh(), phase: 'table', recap: null };
  UIRPG.Meta.recompute(saved.meta, readStory());
  return {
    user: publicUser(user),
    content: readStory(),
    run: saved.run,
    meta: saved.meta,
    phase: saved.phase,
    recap: saved.recap,
  };
}

function send(res, status, body, extra) {
  const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {});
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('Too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (err) { reject(err); }
    });
  });
}

function setSession(res, token) {
  return { 'Set-Cookie': `sid=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax` };
}

function clearSession() {
  return { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax' };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  if (rel.includes('..')) {
    res.writeHead(400);
    res.end('Bad path');
    return;
  }
  const file = path.join(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

function addContent(content, list, item) {
  UIRPG.Content.apply(content, list, item);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/me' && req.method === 'GET') {
      return send(res, 200, payload(userFrom(req)));
    }
    if (url.pathname === '/api/register' && req.method === 'POST') {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || 'Adventurer').trim().slice(0, 40) || 'Adventurer';
      if (!email.includes('@') || password.length < 8) {
        return send(res, 400, { error: 'Use an email and a password of at least 8 characters.' });
      }
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
        return send(res, 400, { error: 'That email is already registered. Log in.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const info = db.prepare('INSERT INTO users (email, name, pass_hash, salt) VALUES (?, ?, ?, ?)').run(
        email, name, hashPassword(password, salt), salt
      );
      const userId = Number(info.lastInsertRowid);
      const token = crypto.randomBytes(24).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
      db.prepare('INSERT INTO saves (user_id, run_json, meta_json, phase) VALUES (?, NULL, ?, ?)').run(
        userId, JSON.stringify(UIRPG.Meta.fresh()), 'table'
      );
      return send(res, 200, payload({ id: userId, email, name }), setSession(res, token));
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = db.prepare('SELECT id, email, name, pass_hash, salt FROM users WHERE email = ?').get(email);
      if (!user || hashPassword(password, user.salt) !== user.pass_hash) {
        return send(res, 401, { error: 'Email or password does not match.' });
      }
      const token = crypto.randomBytes(24).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
      return send(res, 200, payload(user), setSession(res, token));
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') {
      const token = cookieToken(req);
      if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return send(res, 200, { ok: true }, clearSession());
    }
    if (url.pathname === '/api/save' && req.method === 'PUT') {
      const user = userFrom(req);
      if (!user) return send(res, 401, { error: 'Log in.' });
      const body = await readBody(req);
      const meta = body.meta || UIRPG.Meta.fresh();
      db.prepare(`
        INSERT INTO saves (user_id, run_json, meta_json, phase, recap_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          run_json = excluded.run_json,
          meta_json = excluded.meta_json,
          phase = excluded.phase,
          recap_json = excluded.recap_json
      `).run(
        user.id,
        body.run ? JSON.stringify(body.run) : null,
        JSON.stringify(meta),
        body.phase || 'table',
        body.recap ? JSON.stringify(body.recap) : null
      );
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/content' && req.method === 'POST') {
      const user = userFrom(req);
      if (!user) return send(res, 401, { error: 'Log in.' });
      if (!isAdmin(user.email)) return send(res, 403, { error: 'Only an admin can add content.' });
      const body = await readBody(req);
      const content = readStory();
      try {
        addContent(content, body.list, body.item);
      } catch (err) {
        return send(res, 400, { error: err.message });
      }
      const checked = UIRPG.Content.validate(content);
      if (!checked.ok) return send(res, 400, { error: 'Invalid content', errors: checked.errors });
      writeStory(content);
      return send(res, 200, { content, warnings: checked.warnings });
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    return serveStatic(req, res);
  } catch (err) {
    send(res, 500, { error: 'Server error' });
  }
});

const port = Number(process.env.PORT) || 4173;
server.listen(port, () => {
  console.log('UIRPG listening on ' + port);
});
