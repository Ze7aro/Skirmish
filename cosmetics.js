// Fase D: cosméticos (marcos de avatar, títulos y arenas). Solo cambian el aspecto, nunca la fuerza.
// Se consiguen con monedas, logros, ligas o niveles del pase. Las arenas usan los 5 terrenos que ya existen y los marcos son CSS (clases frame-*).
'use strict';

const PASS_COSMETICS = { 10: 'frame_escarcha', 15: 'arena_snow', 20: 'frame_fuego', 25: 'title_pase', 30: 'frame_mitico' };
const COSMETICS = [
  { id: 'frame_base', type: 'frame', icon: '⚪', name: 'Sencillo', how: { free: true } },
  { id: 'frame_bosque', type: 'frame', icon: '🌿', name: 'Bosque', how: { ach: 'wins:0' } },
  { id: 'frame_calavera', type: 'frame', icon: '💀', name: 'Calavera', how: { ach: 'bosses:0' } },
  { id: 'frame_oro', type: 'frame', icon: '🥇', name: 'Oro viejo', how: { league: 2 } },
  { id: 'frame_dorado', type: 'frame', icon: '✨', name: 'Dorado', how: { price: 400 } },
  { id: 'frame_escarcha', type: 'frame', icon: '❄', name: 'Escarcha', how: { pass: 10 } },
  { id: 'frame_fuego', type: 'frame', icon: '🔥', name: 'Fuego', how: { pass: 20 } },
  { id: 'frame_mitico', type: 'frame', icon: '🌈', name: 'Mítico', how: { pass: 30 } },
  { id: 'title_recluta', type: 'title', icon: '🎖', name: 'Recluta', how: { free: true } },
  { id: 'title_mariscal', type: 'title', icon: '🏆', name: 'Mariscal', how: { ach: 'wins:1' } },
  { id: 'title_jefes', type: 'title', icon: '👹', name: 'Cazador de jefes', how: { ach: 'bosses:1' } },
  { id: 'title_minero', type: 'title', icon: '⛏', name: 'Minero mayor', how: { ach: 'mined:1' } },
  { id: 'title_super', type: 'title', icon: '♾', name: 'Imparable', how: { ach: 'survival:1' } },
  { id: 'title_plata', type: 'title', icon: '🥈', name: 'Duelista de plata', how: { league: 1 } },
  { id: 'title_diamante', type: 'title', icon: '💎', name: 'Leyenda de diamante', how: { league: 4 } },
  { id: 'title_osado', type: 'title', icon: '🎲', name: 'El intrépido', how: { price: 250 } },
  { id: 'title_pase', type: 'title', icon: '🎟', name: 'Veterano de temporada', how: { pass: 25 } },
  { id: 'arena_auto', type: 'arena', icon: '🎲', name: 'La del rival', how: { free: true } },
  { id: 'arena_forest', type: 'arena', icon: '🌲', name: 'Bosque', terrain: 'forest', how: { free: true } },
  { id: 'arena_desert', type: 'arena', icon: '🏜', name: 'Desierto', terrain: 'desert', how: { price: 200 } },
  { id: 'arena_ruins', type: 'arena', icon: '🏛', name: 'Ruinas', terrain: 'ruins', how: { ach: 'stars:0' } },
  { id: 'arena_snow', type: 'arena', icon: '🏔', name: 'Nieve', terrain: 'snow', how: { pass: 15 } },
  { id: 'arena_volcanic', type: 'arena', icon: '🌋', name: 'Volcán', terrain: 'volcanic', how: { league: 3 } },
];
const COSMETIC = Object.fromEntries(COSMETICS.map(c => [c.id, c]));
const COS_DEFAULT = { frame: 'frame_base', title: 'title_recluta', arena: 'arena_auto' };

function cosOwned(save, c) {
  if (!c) return false;
  const h = c.how, o = (save.cos && save.cos.owned) || {};
  if (h.free || o[c.id]) return true;
  if (h.ach) return !!(save.ach && save.ach.claimed && save.ach.claimed[h.ach]);
  if (h.league !== undefined) return leagueIndex((save.duel && save.duel.best) || 0) >= h.league;
  return false;
}
function ensureCos(save) {
  if (!save.cos) save.cos = { owned: {}, equip: {} };
  save.cos.owned = save.cos.owned || {};
  save.cos.equip = Object.assign({}, COS_DEFAULT, save.cos.equip || {});
  for (const t of Object.keys(COS_DEFAULT)) { // si algo deja de ser válido o cambió de tipo, vuelve al básico
    const c = COSMETIC[save.cos.equip[t]];
    if (!c || c.type !== t || !cosOwned(save, c)) save.cos.equip[t] = COS_DEFAULT[t];
  }
  return save.cos;
}
function grantCos(save, id) {
  if (!COSMETIC[id]) return false;
  if (!save.cos) save.cos = { owned: {}, equip: {} };
  save.cos.owned = save.cos.owned || {}; save.cos.owned[id] = true; return true;
}
function buyCos(save, id) {
  const c = COSMETIC[id]; ensureCos(save);
  if (!c || !c.how.price) return { err: 'No se vende' };
  if (cosOwned(save, c)) return { err: 'Ya la tienes' };
  if (save.coins < c.how.price) return { err: 'No tienes monedas suficientes' };
  save.coins -= c.how.price; save.cos.owned[id] = true; return { ok: true };
}
function equipCos(save, id) {
  const c = COSMETIC[id]; ensureCos(save);
  if (!c || !cosOwned(save, c)) return false;
  save.cos.equip[c.type] = id; return true;
}
function cosHow(c) {
  const h = c.how;
  if (h.free) return 'Incluido';
  if (h.price) return h.price + ' monedas';
  if (h.ach) return 'Logro: ' + (ACHIEVEMENTS.find(a => a.id === h.ach) || { name: h.ach }).name;
  if (h.league !== undefined) return 'Liga ' + LEAGUES[h.league].name;
  if (h.pass) return 'Pase: nivel ' + h.pass;
  return '';
}
const equippedTerrain = save => { const c = COSMETIC[ensureCos(save).equip.arena]; return (c && c.terrain) || null; };
const equippedTitle = save => COSMETIC[ensureCos(save).equip.title].name;
