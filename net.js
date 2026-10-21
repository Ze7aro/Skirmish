// Fase D: cliente opcional del servidor (server/server.js): partida en la nube, ranking y rivales fantasma.
// El juego funciona igual sin servidor; todo falla en silencio si no hay conexión.
'use strict';

const NET_TIMEOUT = 6000;
const netState = save => { if (!save.net) save.net = { url: '', id: '', token: '', name: '', updated: 0 }; return save.net; };
const netLinked = save => !!(save.net && save.net.url && save.net.token);

// Acepta "192.168.1.5:8787" o "http://host:puerto"; solo http(s) y sin ruta.
function netNormalizeUrl(raw) {
  let t = String(raw || '').trim(); if (!t) return '';
  if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(t) && !/^https?:\/\//i.test(t)) return ''; // otros esquemas (ftp://, file://…) no valen
  if (!/^https?:\/\//i.test(t)) t = 'http://' + t;
  try { const u = new URL(t); return /^https?:$/.test(u.protocol) && u.hostname ? u.origin : ''; } catch (e) { return ''; }
}

async function netCall(save, method, path, body) {
  const n = netState(save); if (!n.url) throw new Error('Sin servidor configurado');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), NET_TIMEOUT);
  try {
    const res = await fetch(n.url + path, { method, signal: ctl.signal, headers: Object.assign({ 'content-type': 'application/json' }, n.token ? { authorization: 'Bearer ' + n.token } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Error ' + res.status), { status: res.status, data });
    return data;
  } catch (e) { throw e.name === 'AbortError' ? new Error('El servidor no responde') : e; } finally { clearTimeout(timer); }
}

async function netRegister(save, rawUrl, name) {
  const url = netNormalizeUrl(rawUrl); if (!url) throw new Error('Dirección no válida');
  const n = netState(save); n.url = url; n.token = '';
  const r = await netCall(save, 'POST', '/api/register', { name });
  Object.assign(n, { id: r.id, token: r.token, name: r.name, updated: 0 });
  return r;
}
const netUnlink = save => { save.net = { url: '', id: '', token: '', name: '', updated: 0 }; };

// La partida que se sube nunca lleva el token ni la dirección del servidor.
const netSnapshot = save => { const c = JSON.parse(JSON.stringify(save)); delete c.net; return c; };
async function netPush(save, force) {
  const n = netState(save), r = await netCall(save, 'PUT', '/api/save', { save: netSnapshot(save), base: n.updated, force: !!force });
  n.updated = r.updated; if (typeof persist === 'function') persist(); return r;
}
async function netPull(save) { const r = await netCall(save, 'GET', '/api/save'); return r; }
// Sustituye la partida local por la de la nube conservando la conexión. Devuelve false si los datos no parecen una partida.
function netApply(save, cloud, updated, defaults) {
  if (!cloud || typeof cloud !== 'object' || typeof cloud.coins !== 'number' || !Array.isArray(cloud.cards)) return false;
  const net = netState(save); net.updated = updated;
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, defaults, cloud, { net });
  return true;
}

function netProfile(save) {
  const d = save.duel || {}, slot = save.slots[save.slot], levels = {};
  for (const id of slot.deck) levels[id] = save.levels[id] || 1;
  return { name: netState(save).name, trophies: d.trophies || 0, best: d.best || 0, wins: d.wins || 0, mmr: d.mmr || 0, score: (typeof totalScore === 'function' ? totalScore(save) : 0), level: save.level, deck: slot.deck.slice(), levels, leader: slot.leader };
}
const netSendProfile = save => netCall(save, 'POST', '/api/profile', netProfile(save));
const netBoard = save => netCall(save, 'GET', '/api/leaderboard?limit=20');
const netGhosts = save => netCall(save, 'GET', '/api/ghosts?trophies=' + ((save.duel && save.duel.trophies) || 0) + '&mmr=' + ((save.duel && save.duel.mmr) || 0) + '&n=3');

// Tras cada batalla: sube el perfil y la partida sin molestar (un error de red no cambia nada).
let netTimer = null;
function netSyncSoon(save, done) {
  if (!netLinked(save)) return;
  clearTimeout(netTimer);
  netTimer = setTimeout(async () => {
    try { await netSendProfile(save); await netPush(save); if (done) done(true); } catch (e) { if (done) done(false, e); }
  }, 1500);
}
