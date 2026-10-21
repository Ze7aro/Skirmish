// Fase C: logros, tienda diaria con monedas del juego, pase de temporada gratuito y calendario de eventos.
'use strict';

// ---------- Logros ----------
// Cada familia tiene 3 niveles; cada nivel se reclama una sola vez. El progreso sale de los datos ya guardados.
const sumStars = s => Object.values(s.stars || {}).reduce((a, b) => a + b, 0);
const ACH_FAMILIES = [
  { id: 'wins', icon: '🏆', name: 'Veterano', desc: 'Gana {n} batallas', get: s => s.stats.wins, tiers: [10, 50, 150] },
  { id: 'kills', icon: '⚔', name: 'Cazador', desc: 'Derrota {n} enemigos', get: s => s.stats.kills, tiers: [200, 1000, 4000] },
  { id: 'bosses', icon: '👹', name: 'Matajefes', desc: 'Derrota {n} jefes', get: s => s.stats.bosses, tiers: [3, 12, 40] },
  { id: 'mined', icon: '⛏', name: 'Minero', desc: 'Mina {n} de energía', get: s => s.stats.mined, tiers: [100, 500, 2000] },
  { id: 'deployed', icon: '🃏', name: 'Estratega', desc: 'Despliega {n} cartas', get: s => s.stats.deployed, tiers: [150, 800, 3000] },
  { id: 'mapchests', icon: '🎁', name: 'Buscatesoros', desc: 'Abre {n} cofres del mapa', get: s => s.stats.chests || 0, tiers: [10, 40, 120] },
  { id: 'stars', icon: '★', name: 'Estrella', desc: 'Consigue {n} estrellas en la campaña', get: sumStars, tiers: [20, 40, 60] },
  { id: 'dungeon', icon: '🗡', name: 'Explorador', desc: 'Supera el nivel {n} de la mazmorra', get: s => s.dungeon.best, tiers: [3, 6, 8] },
  { id: 'survival', icon: '♾', name: 'Superviviente', desc: 'Llega a la oleada {n}', get: s => s.survival.best, tiers: [10, 20, 35] },
  { id: 'streak', icon: '🔥', name: 'Constante', desc: 'Racha de {n} días en el desafío', get: s => (s.ach && s.ach.max.streak) || 0, tiers: [3, 7, 14] },
  { id: 'duelwins', icon: '🛡', name: 'Duelista', desc: 'Gana {n} duelos', get: s => (s.duel && s.duel.wins) || 0, tiers: [3, 12, 40] },
  { id: 'trophies', icon: '🏅', name: 'Campeón', desc: 'Alcanza {n} trofeos', get: s => (s.duel && s.duel.best) || 0, tiers: [200, 600, 1400] },
  { id: 'level', icon: '⭐', name: 'Leyenda', desc: 'Llega al nivel {n}', get: s => s.level, tiers: [5, 10, 20] },
  { id: 'heroic', icon: '🔥', name: 'Heroico', desc: 'Supera {n} misiones heroicas', get: s => Object.keys(s.heroic || {}).length, tiers: [3, 8, 15] },
  { id: 'skull', icon: '💀', name: 'Calavera', desc: 'Supera el nivel {n} del Camino de calaveras', get: s => (s.skull && s.skull.best) || 0, tiers: [3, 6, 10] },
  { id: 'switches', icon: '🔌', name: 'Palanquero', desc: 'Acciona {n} interruptores del mapa', get: s => s.stats.switches || 0, tiers: [10, 40, 120] },
  { id: 'score', icon: '💯', name: 'Puntuador', desc: 'Suma {n} puntos de récord', get: s => (typeof totalScore === 'function' ? totalScore(s) : 0), tiers: [5000, 20000, 60000] },
  { id: 'cards', icon: '📚', name: 'Coleccionista', desc: 'Consigue {n} minis', get: s => s.cards.length, tiers: [8, 12, 17] },
];
const ACH_REWARD = [{ coins: 60, xp: 30, chests: 0, cores: 0 }, { coins: 150, xp: 80, chests: 1, cores: 1 }, { coins: 350, xp: 160, chests: 1, cores: 2 }];
const ACHIEVEMENTS = ACH_FAMILIES.flatMap(f => f.tiers.map((target, tier) => ({ id: f.id + ':' + tier, fam: f, tier, target, reward: ACH_REWARD[tier], icon: f.icon,
  name: f.name + ' ' + ['I', 'II', 'III'][tier], desc: f.desc.replace('{n}', target) })));

function ensureAch(save) {
  if (!save.ach) save.ach = { claimed: {}, max: { streak: 0 } };
  save.ach.claimed = save.ach.claimed || {}; save.ach.max = save.ach.max || { streak: 0 };
  return save.ach;
}
// Guarda máximos que no se pueden deducir luego (la racha actual puede romperse).
function syncAch(save, day) {
  const a = ensureAch(save);
  a.max.streak = Math.max(a.max.streak, dailyStreakNow(save, day));
  return a;
}
const achValue = (save, a) => Math.min(a.target, Math.floor(a.fam.get(save) || 0));
const achDone = (save, a) => (a.fam.get(save) || 0) >= a.target;
const achClaimable = save => { syncAch(save); return ACHIEVEMENTS.filter(a => achDone(save, a) && !save.ach.claimed[a.id]); };
function claimAch(save, id) {
  const a = ACHIEVEMENTS.find(x => x.id === id); syncAch(save);
  if (!a || !achDone(save, a) || save.ach.claimed[id]) return null;
  save.ach.claimed[id] = true;
  save.coins += a.reward.coins;
  const levelUps = addXp(save, a.reward.xp), lost = grantChests(save, a.reward.chests);
  save.cores = (save.cores || 0) + (a.reward.cores || 0);
  return { coins: a.reward.coins, xp: a.reward.xp, chests: a.reward.chests, cores: a.reward.cores || 0, lost, levelUps };
}

// ---------- Tienda diaria (monedas del juego) ----------
// Las ofertas se generan una vez al día y se guardan, para que no cambien tras comprar (p. ej. al subir una carta de nivel).
const capOf = (save, id) => (typeof levelCap === 'function' ? levelCap(save, id) : MAX_CARD_LEVEL); // nivel máximo (sube con el rango)
const SHOP_CHEST_PRICE = 140, SHOP_VERSION = 2;
const cardPrice = c => 120 + 70 * c.cost;
function genShop(save, day) {
  let h = hashStr(day + ':tienda');
  const next = n => { h = Math.imul(h, 1103515245) + 12345 >>> 0; return h % n; };
  const offers = [{ key: 'chest', kind: 'chest', price: SHOP_CHEST_PRICE }];
  const ups = DECK_CARDS.filter(c => c.ready && save.cards.includes(c.id) && (save.levels[c.id] || 1) < capOf(save, c.id));
  for (let i = 0; i < 2 && ups.length; i++) {
    const c = ups.splice(next(ups.length), 1)[0];
    offers.push({ key: 'up' + i, kind: 'upgrade', card: c.id, price: Math.ceil(upgradeCost(save.levels[c.id] || 1) * 1.5) }); // sube de nivel sin gastar energía ni cores, pagando de más en oro
  }
  const locked = DECK_CARDS.filter(c => c.ready && !save.cards.includes(c.id));
  if (locked.length) { const c = locked[next(locked.length)]; offers.push({ key: 'card', kind: 'card', card: c.id, price: cardPrice(c) }); }
  else offers.push({ key: 'xp', kind: 'xp', price: 100, xp: 60 });
  return offers;
}
function ensureShop(save, day) {
  day = day || dayKey();
  if (!save.shop || save.shop.day !== day || save.shop.v !== SHOP_VERSION) save.shop = { day, v: SHOP_VERSION, offers: genShop(save, day), bought: {} }; // si cambian las reglas de precios, se regeneran
  return save.shop;
}
function buyOffer(save, key, day) {
  const sh = ensureShop(save, day), o = sh.offers.find(x => x.key === key);
  if (!o) return { err: 'No existe esa oferta' };
  if (sh.bought[key]) return { err: 'Ya comprada hoy' };
  if (save.coins < o.price) return { err: 'No tienes monedas suficientes' };
  const res = { kind: o.kind, price: o.price };
  if (o.kind === 'chest') { if (save.chests >= MAX_CHESTS) return { err: 'Tienes los cofres llenos' }; save.chests++; }
  else if (o.kind === 'upgrade') { if ((save.levels[o.card] || 1) >= capOf(save, o.card)) return { err: 'Esa carta ya está al máximo' }; save.levels[o.card] = (save.levels[o.card] || 1) + 1; res.card = o.card; }
  else if (o.kind === 'card') { if (save.cards.includes(o.card)) return { err: 'Ya tienes esa mini' }; save.cards.push(o.card); res.card = o.card; }
  else if (o.kind === 'xp') res.levelUps = addXp(save, o.xp);
  save.coins -= o.price; sh.bought[key] = true;
  return res;
}

// ---------- Pase de temporada (gratuito, mensual, se llena con el XP que ganas) ----------
const PASS_TIERS = 30, PASS_XP = 100;
const seasonKey = d => { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); };
function seasonEnd(d) { d = d || new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
function ensurePass(save, d) {
  const key = seasonKey(d);
  if (!save.pass || save.pass.season !== key) save.pass = { season: key, xp: 0, claimed: [] };
  return save.pass;
}
function passGain(save, xp, d) { const p = ensurePass(save, d); p.xp = Math.min(PASS_TIERS * PASS_XP, p.xp + Math.max(0, Math.round(xp))); }
const passTier = (save, d) => Math.min(PASS_TIERS, Math.floor(ensurePass(save, d).xp / PASS_XP));
function passReward(tier) {
  return { cores: tier % 10 === 0 ? tier / 10 : 0, coins: 20 + 3 * tier + (tier === PASS_TIERS ? 250 : tier % 10 === 0 ? 100 : 0), chests: tier === PASS_TIERS ? 3 : tier % 10 === 0 ? 2 : tier % 5 === 0 ? 1 : 0 };
}
function claimPass(save, tier, d) {
  const p = ensurePass(save, d);
  if (tier < 1 || tier > passTier(save, d) || p.claimed.includes(tier)) return null;
  p.claimed.push(tier);
  const rw = passReward(tier); save.coins += rw.coins; save.cores = (save.cores || 0) + (rw.cores || 0);
  const lost = grantChests(save, rw.chests), cos = (typeof PASS_COSMETICS !== 'undefined' && PASS_COSMETICS[tier]) || null; // algunos niveles regalan un cosmético (cosmetics.js)
  if (cos && typeof grantCos === 'function') grantCos(save, cos);
  return { coins: rw.coins, chests: rw.chests, cores: rw.cores || 0, lost, cos };
}
const passClaimable = (save, d) => { const p = ensurePass(save, d), t = passTier(save, d); let n = 0; for (let i = 1; i <= t; i++) if (!p.claimed.includes(i)) n++; return n; };

// ---------- Calendario de eventos: los próximos N lunes ----------
function eventCalendar(d, n) {
  d = d || new Date(); const out = [];
  for (let i = 0; i < n; i++) { const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * i); out.push({ ev: eventFor(day), start: i === 0 ? day : eventEnd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * (i - 1))), end: eventEnd(day) }); }
  return out;
}
