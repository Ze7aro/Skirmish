// Fase G: monedas de mejora (energía y cores), mejora de unidades con varios costes, paquetes de la tienda y ofertas de dinero real (solo escaparate).
'use strict';

// Energía: material de mejora que se gana jugando (1 por cada 10 XP). Cores: material raro (cofres, logros, pase, primeras victorias grandes).
const ENERGY_START = 20, CORES_START = 1;
const upgradeReq = lvl => ({ coins: upgradeCost(lvl), energy: 5 * lvl, cores: Math.max(0, lvl - 2) }); // coste de pasar de lvl a lvl+1

function ensureWallet(save) {
  if (typeof save.energy !== 'number' || !isFinite(save.energy)) save.energy = ENERGY_START;
  if (typeof save.cores !== 'number' || !isFinite(save.cores)) save.cores = CORES_START;
  return save;
}
const energyGain = (save, xp) => { ensureWallet(save); save.energy += Math.ceil(Math.max(0, xp) / 10); };

function canAfford(save, req) { ensureWallet(save); return save.coins >= req.coins && save.energy >= req.energy && save.cores >= req.cores; }
function upgradeCard(save, id) {
  ensureWallet(save);
  const lvl = save.levels[id] || 1;
  if (lvl >= levelCap(save, id)) return { err: 'Nivel máximo: asciende la mini para seguir' };
  if (!save.cards.includes(id) && id !== UNIVERSAL) return { err: 'Aún no tienes esta mini' };
  const req = upgradeReq(lvl);
  if (!canAfford(save, req)) return { err: 'Te faltan recursos' };
  save.coins -= req.coins; save.energy -= req.energy; save.cores -= req.cores; save.levels[id] = lvl + 1;
  return { ok: true, level: lvl + 1, req };
}

const ENERGY_PACKS = [{ id: 'en_s', name: 'Pila pequeña', amount: 30, price: 60 }, { id: 'en_m', name: 'Pila mediana', amount: 100, price: 180 }, { id: 'en_l', name: 'Pila grande', amount: 300, price: 480 }];
const CORE_PACKS = [{ id: 'co_1', name: 'Un core', amount: 1, price: 150 }, { id: 'co_5', name: 'Cinco cores', amount: 5, price: 650 }, { id: 'co_15', name: 'Quince cores', amount: 15, price: 1800 }];
function buyPack(save, id) {
  ensureWallet(save);
  const p = ENERGY_PACKS.find(x => x.id === id) || CORE_PACKS.find(x => x.id === id);
  if (!p) return { err: 'No existe ese paquete' };
  if (save.coins < p.price) return { err: 'No tienes monedas suficientes' };
  save.coins -= p.price;
  if (id.startsWith('en_')) save.energy += p.amount; else save.cores += p.amount;
  return { ok: true, kind: id.startsWith('en_') ? 'energy' : 'cores', amount: p.amount, price: p.price };
}

// Ofertas con dinero real: solo se muestran. No hay pasarela de pago ni entrega de nada, así que no se pueden comprar (available: false).
const REAL_BUNDLES = [
  { id: 'b_start', name: 'Pack de aventurero', price: '$4.99', items: ['500 de oro', '100 de energía', '5 cores', '1 cofre'], available: false },
  { id: 'b_hero', name: 'Pack del héroe', price: '$9.99', items: ['1200 de oro', '300 de energía', '15 cores', '3 cofres', 'Marco de avatar exclusivo'], available: false },
  { id: 'b_war', name: 'Cofre de guerra', price: '$19.99', items: ['3000 de oro', '800 de energía', '40 cores', '8 cofres', 'Título y arena exclusivos'], available: false },
];

// ---------- Rango (rareza) y experiencia de mini (Fase I) ----------
// Cada mini tiene un RANGO (0-3). Subirlo ("ascender") cuesta oro y cores y exige haber llenado su barra de XP, que tiene un techo según el rango.
// El rango sube el nivel máximo de la mini (+1 por rango) y le da un +5% de fuerza por rango.
const MAX_RANK = 3, RANK_NAMES = ['Recluta', 'Veterano', 'Élite', 'Leyenda'], RANK_COLORS = ['#9aa3b5', '#6fcf4a', '#6fa0ff', '#ffd860'];
const MINI_XP_CEIL = [120, 200, 300], ASCEND_COST = [{ coins: 300, cores: 3 }, { coins: 600, cores: 6 }, { coins: 1000, cores: 10 }], RANK_LEVEL_BONUS = 0.42; // 0,42 niveles ≈ +5% de fuerza
const rankOf = (save, id) => Math.max(0, Math.min(MAX_RANK, (save.ranks && save.ranks[id]) || 0));
const levelCap = (save, id) => MAX_CARD_LEVEL + rankOf(save, id);
const xpCeil = (save, id) => (rankOf(save, id) < MAX_RANK ? MINI_XP_CEIL[rankOf(save, id)] : 0);
const miniXp = (save, id) => Math.min(xpCeil(save, id), (save.mxp && save.mxp[id]) || 0);
const ownsMini = (save, id) => id === UNIVERSAL || save.cards.includes(id);

// Niveles "efectivos" que usa la batalla: el nivel más una fracción por cada rango.
function effLevels(save) {
  const out = {};
  for (const id of new Set(Object.keys(save.levels || {}).concat(Object.keys(save.ranks || {})))) out[id] = (save.levels[id] || 1) + rankOf(save, id) * RANK_LEVEL_BONUS;
  return out;
}
function addMiniXp(save, id, n) {
  if (!ownsMini(save, id) || rankOf(save, id) >= MAX_RANK || n <= 0) return 0;
  if (!save.mxp) save.mxp = {};
  const before = miniXp(save, id); save.mxp[id] = Math.min(xpCeil(save, id), before + Math.round(n));
  return save.mxp[id] - before;
}
// Tras una batalla: cada mini del mazo gana 5 de XP (+3 si ganas) y +1 por cada vez que la desplegaste (máx. 10).
function awardMiniXp(save, ids, stats, win) {
  const out = [];
  for (const id of ids) { const g = addMiniXp(save, id, 5 + (win ? 3 : 0) + Math.min(10, (stats && stats.by && stats.by[id]) || 0)); if (g > 0 || (rankOf(save, id) < MAX_RANK && miniXp(save, id) >= xpCeil(save, id))) out.push({ id, gain: g, full: miniXp(save, id) >= xpCeil(save, id) }); }
  return out;
}
function ascendStatus(save, id) {
  const rank = rankOf(save, id), lvl = save.levels[id] || 1;
  if (rank >= MAX_RANK) return { max: true };
  const cost = ASCEND_COST[rank], ceil = xpCeil(save, id), need = { level: levelCap(save, id), xp: ceil, coins: cost.coins, cores: cost.cores };
  const have = { level: lvl, xp: miniXp(save, id), coins: save.coins, cores: save.cores || 0 };
  return { max: false, rank, need, have, ok: ownsMini(save, id) && have.level >= need.level && have.xp >= need.xp && have.coins >= need.coins && have.cores >= need.cores };
}
function ascendCard(save, id) {
  ensureWallet(save);
  const st = ascendStatus(save, id);
  if (!ownsMini(save, id)) return { err: 'Aún no tienes esta mini' };
  if (st.max) return { err: 'Ya es de rango máximo' };
  if (!st.ok) return { err: 'Aún no cumples los requisitos' };
  save.coins -= st.need.coins; save.cores -= st.need.cores;
  if (!save.ranks) save.ranks = {}; if (!save.mxp) save.mxp = {};
  save.ranks[id] = st.rank + 1; save.mxp[id] = 0;
  return { ok: true, rank: st.rank + 1 };
}

// ---------- Nivel de colección ----------
// Suma de (nivel + 2 × rango) de todas tus minis. Cada hito da un premio que se reclama a mano.
const COLLECTION_MILESTONES = [
  { at: 10, coins: 100 }, { at: 15, energy: 30 }, { at: 20, cores: 1, coins: 100 }, { at: 25, chests: 1 }, { at: 30, coins: 250, energy: 50 }, { at: 40, cores: 2, chests: 1 },
  { at: 50, coins: 400, cores: 2 }, { at: 60, chests: 2, energy: 100 }, { at: 75, cores: 3, coins: 600 }, { at: 90, chests: 2, cores: 3 }, { at: 110, coins: 1000, cores: 5, chests: 3 },
];
function collectionLevel(save) {
  const ids = new Set(save.cards.concat(UNIVERSAL)); let n = 0;
  for (const id of ids) if (CARD[id]) n += (save.levels[id] || 1) + 2 * rankOf(save, id);
  return n;
}
const collState = save => { if (!save.coll) save.coll = { claimed: [] }; if (!Array.isArray(save.coll.claimed)) save.coll.claimed = []; return save.coll; };
const collectionClaimable = save => { const cl = collectionLevel(save), c = collState(save); return COLLECTION_MILESTONES.filter(m => cl >= m.at && !c.claimed.includes(m.at)); };
const collectionNext = save => COLLECTION_MILESTONES.find(m => !collState(save).claimed.includes(m.at)) || null;
function claimCollection(save, at) {
  ensureWallet(save);
  const m = COLLECTION_MILESTONES.find(x => x.at === at), c = collState(save);
  if (!m || collectionLevel(save) < at || c.claimed.includes(at)) return null;
  c.claimed.push(at);
  save.coins += m.coins || 0; save.energy += m.energy || 0; save.cores += m.cores || 0;
  const lost = m.chests ? grantChests(save, m.chests) : 0;
  return { coins: m.coins || 0, energy: m.energy || 0, cores: m.cores || 0, chests: m.chests || 0, lost };
}
