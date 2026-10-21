// Servidor opcional de KOTA Skirmish: partida en la nube, ranking y rivales "fantasma" (mazos de otros jugadores).
// Sin dependencias: solo Node 18+. Uso:  node server/server.js   →  http://127.0.0.1:8787
// Variables: PORT (8787), HOST (127.0.0.1; usa 0.0.0.0 para jugar desde el móvil en tu red local), DATA (server/data/db.json).
// También sirve el juego (la carpeta padre), así que todo funciona desde un único origen.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = +process.env.PORT || 8787, HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.resolve(__dirname, '..');
const DB_FILE = process.env.DATA || path.join(__dirname, 'data', 'db.json');
const MAX_BODY = 256 * 1024, MAX_PLAYERS = 5000;

// ---------- Almacenamiento (un JSON con escritura atómica) ----------
let db = { players: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); if (!db.players) db.players = {}; } catch (e) { /* base nueva */ }
let saveTimer = null;
function flush() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE);
}
function persistSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { flush(); } catch (e) { console.error('no se pudo guardar:', e.message); } }, 400); }

// ---------- Validación ----------
const ID_RE = /^[a-z0-9_]{2,40}$/;
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16);
const hash = t => crypto.createHash('sha256').update(t).digest('hex');
const sameHash = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function cleanProfile(b) {
  const deck = (Array.isArray(b.deck) ? b.deck : []).filter(id => typeof id === 'string' && ID_RE.test(id)).slice(0, 6);
  const levels = {}; for (const id of deck) levels[id] = num(b.levels && b.levels[id], 1, 5);
  return { trophies: num(b.trophies, 0, 99999), best: num(b.best, 0, 99999), wins: num(b.wins, 0, 1e7), mmr: num(b.mmr, 0, 99999), score: num(b.score, 0, 1e9), level: num(b.level, 1, 999), deck, levels,
    leader: typeof b.leader === 'string' && ID_RE.test(b.leader) ? b.leader : 'human_commander' };
}

// ---------- Límite de peticiones por IP ----------
const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60000); h.push(now); hits.set(ip, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k);
  return h.length > 120;
}

// ---------- API ----------
function auth(req) {
  const m = /^Bearer ([0-9a-f]{16,64}):([0-9a-f]{32,64})$/.exec(req.headers.authorization || '');
  const p = m && db.players[m[1]];
  return p && sameHash(p.tokenHash, hash(m[2])) ? p : null;
}
const send = (res, code, obj) => { const t = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(t); };
function readBody(req) {
  return new Promise((ok, bad) => {
    let n = 0, big = false; const chunks = [];
    req.on('data', c => { n += c.length; if (n > MAX_BODY) { big = true; if (n > 8 * MAX_BODY) req.destroy(); } else chunks.push(c); }); // se descarta el exceso (hasta un límite) para poder contestar 413
    req.on('end', () => { if (big) return bad(Object.assign(new Error('demasiado grande'), { code: 413 })); try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { bad(Object.assign(new Error('JSON no válido'), { code: 400 })); } });
    req.on('error', bad);
  });
}

async function api(req, res, url) {
  const route = req.method + ' ' + url.pathname;
  if (route === 'POST /api/register') {
    if (Object.keys(db.players).length >= MAX_PLAYERS) return send(res, 503, { error: 'servidor lleno' });
    const b = await readBody(req), name = cleanName(b.name) || 'Jugador';
    const id = crypto.randomBytes(8).toString('hex'), token = crypto.randomBytes(16).toString('hex');
    db.players[id] = { id, name, tokenHash: hash(token), created: Date.now(), updated: 0, save: null, profile: null, seen: Date.now() };
    persistSoon();
    return send(res, 201, { id, name, token: id + ':' + token });
  }
  const me = auth(req);
  if (!me) return send(res, 401, { error: 'no autorizado' });
  me.seen = Date.now();
  if (route === 'GET /api/me') return send(res, 200, { id: me.id, name: me.name, updated: me.updated, hasSave: !!me.save });
  if (route === 'PUT /api/save') {
    const b = await readBody(req);
    if (!b || typeof b.save !== 'object' || Array.isArray(b.save) || !b.save) return send(res, 400, { error: 'falta save' });
    if (me.updated && b.base && Number(b.base) < me.updated && !b.force) return send(res, 409, { error: 'la nube tiene una partida más reciente', updated: me.updated });
    me.save = b.save; me.updated = Date.now(); persistSoon();
    return send(res, 200, { ok: true, updated: me.updated });
  }
  if (route === 'GET /api/save') return me.save ? send(res, 200, { save: me.save, updated: me.updated }) : send(res, 404, { error: 'no hay partida en la nube' });
  if (route === 'POST /api/profile') {
    const b = await readBody(req); me.profile = cleanProfile(b);
    if (b.name) me.name = cleanName(b.name) || me.name;
    persistSoon(); return send(res, 200, { ok: true });
  }
  if (route === 'GET /api/leaderboard') {
    const limit = num(url.searchParams.get('limit') || 20, 1, 50);
    const all = Object.values(db.players).filter(p => p.profile).sort((a, b) => b.profile.best - a.profile.best || b.profile.wins - a.profile.wins);
    const rank = all.findIndex(p => p.id === me.id);
    return send(res, 200, { top: all.slice(0, limit).map((p, i) => ({ rank: i + 1, name: p.name, trophies: p.profile.trophies, best: p.profile.best, wins: p.profile.wins, level: p.profile.level, me: p.id === me.id })),
      you: rank < 0 ? null : { rank: rank + 1, of: all.length } });
  }
  if (route === 'GET /api/ghosts') { // mazos de otros jugadores con trofeos parecidos, para duelar contra ellos sin conexión simultánea
    const t = url.searchParams.has('mmr') ? num(url.searchParams.get('mmr'), 0, 99999) : num(url.searchParams.get('trophies'), 0, 99999), n = num(url.searchParams.get('n') || 3, 1, 10);
    const rate = p => (url.searchParams.has('mmr') && typeof p.profile.mmr === 'number' ? p.profile.mmr : p.profile.trophies); // emparejamiento por valoración oculta (mmr) si está disponible
    const pool = Object.values(db.players).filter(p => p.profile && p.id !== me.id && p.profile.deck.length >= 4)
      .sort((a, b) => Math.abs(rate(a) - t) - Math.abs(rate(b) - t)).slice(0, 20);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return send(res, 200, { ghosts: pool.slice(0, n).map(p => ({ name: p.name, ...p.profile })) });
  }
  if (route === 'DELETE /api/account') { delete db.players[me.id]; persistSoon(); return send(res, 200, { ok: true }); }
  return send(res, 404, { error: 'no existe' });
}

// ---------- Archivos del juego ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
function serveFile(req, res, url) {
  let rel = decodeURIComponent(url.pathname); if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, '.' + path.sep + rel);
  const inRoot = file === ROOT || file.startsWith(ROOT + path.sep), hidden = /(^|[\\/])(server|tests|docs|tools)([\\/]|$)|(^|[\\/])art[\\/](design_complete|source_generated|source_regenerated)([\\/]|$)/.test(path.relative(ROOT, file)); // tampoco se sirven las fuentes de arte (cientos de MB de PNG)
  if (!inRoot || hidden) { res.writeHead(404); return res.end('no existe'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('no existe'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }); res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'authorization, content-type'); res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) { if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'demasiadas peticiones' }); return await api(req, res, url); }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveFile(req, res, url);
  } catch (e) { send(res, e.code || 500, { error: e.code ? e.message : 'error interno' }); }
});
if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(`KOTA servidor en http://${HOST}:${PORT}  (datos: ${DB_FILE})`));
  process.on('SIGINT', () => { try { flush(); } catch (e) { /* nada */ } process.exit(0); });
}
module.exports = { server, flush, db: () => db };
