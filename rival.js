// Fase C: duelo contra un rival simulado ("PvP sin servidor"), ligas y trofeos.
'use strict';

const LEAGUES = [
  { id: 'bronce', name: 'Bronce', icon: '🥉', from: 0 }, { id: 'plata', name: 'Plata', icon: '🥈', from: 200 }, { id: 'oro', name: 'Oro', icon: '🥇', from: 500 },
  { id: 'platino', name: 'Platino', icon: '💠', from: 900 }, { id: 'diamante', name: 'Diamante', icon: '💎', from: 1400 },
];
const leagueIndex = t => { let k = 0; LEAGUES.forEach((l, i) => { if (t >= l.from) k = i; }); return k; };
const leagueOf = t => LEAGUES[leagueIndex(t)];

// Mazos de los rivales: usan las mismas cartas que el jugador y se reparten por arquetipo.
const RIVAL_DECKS = [
  { id: 'horda', name: 'La Horda', faction: 'ordu', deck: ['ordu_grunt', 'ordu_raider', 'ordu_bomber', 'ordu_shaman', 'ordu_siege_beast', 'ordu_wyvern'] },
  { id: 'legion', name: 'Legión Pálida', faction: 'undead', deck: ['undead_skeletons', 'undead_lich', 'undead_wraith', 'undead_dragon', 'undead_abomination', 'undead_gargoyle'] },
  { id: 'alianza', name: 'La Alianza', faction: 'humans', deck: ['human_warrior', 'human_archer', 'human_griphon', 'human_mage', 'human_medic', 'human_paladin'] },
  { id: 'saqueo', name: 'Saqueadores', faction: 'ordu', deck: ['ordu_bomber', 'ordu_raider', 'undead_gargoyle', 'human_griphon', 'ordu_wyvern', 'undead_skeletons'] },
];
const RIVAL_NAMES = ['Garrok', 'Mala', 'Thorvil', 'Lysa', 'Dren', 'Kaelis', 'Brogan', 'Nyx', 'Varek', 'Sela', 'Orlo', 'Ysmir'];
// tier -1 fácil, 0 parejo, +1 difícil: más trofeos si ganas, más pérdida si caes.
const DUEL_TIERS = [
  { tier: -1, label: 'Novato', win: 18, lose: 10, coins: 30 }, { tier: 0, label: 'Parejo', win: 25, lose: 15, coins: 45 }, { tier: 1, label: 'Veterano', win: 35, lose: 20, coins: 65 },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { let s = seed >>> 0; return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) + 3266489917 >>> 0; s = (s ^ (s >>> 13)) >>> 0; return s / 4294967296; }; }

function duelState(save) {
  if (!save.duel) save.duel = { trophies: 0, best: 0, wins: 0, losses: 0, streak: 0, seed: 1, mmr: 0 };
  if (typeof save.duel.mmr !== 'number') save.duel.mmr = save.duel.trophies || 0; // valoración oculta (tipo Elo) que ajusta la dificultad de los rivales
  return save.duel;
}

// Genera un rival; con la misma semilla siempre sale el mismo (así las tres ofertas no cambian al recargar).
// Solo cartas listas (con arte); si faltan, se completa hasta 5 con otras para que la mano siempre rote. Las preferidas entran solas cuando tengan arte.
function rivalDeck(arche, r) {
  const ok = id => CARD[id] && CARD[id].ready && !CARD[id].miner, deck = arche.deck.filter(ok);
  const pool = DECK_CARDS.filter(c => ok(c.id) && !deck.includes(c.id));
  while (deck.length < 5 && pool.length) deck.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  return deck;
}
// Mercenarios: mazo generado al azar (4 cartas de una raza y 2 de otras) con coste medio equilibrado y al menos una carta barata y una cara.
function generateDeck(r) {
  const ok = c => c.ready && !c.miner, pool = DECK_CARDS.filter(ok), fk = ['humans', 'ordu', 'undead'][Math.floor(r() * 3)];
  const mine = pool.filter(c => c.faction === fk), other = pool.filter(c => c.faction !== fk);
  for (let tries = 0; tries < 30; tries++) {
    const a = mine.slice(), b = other.slice(), deck = [];
    while (deck.length < 4 && a.length) deck.push(a.splice(Math.floor(r() * a.length), 1)[0]);
    while (deck.length < 6 && b.length) deck.push(b.splice(Math.floor(r() * b.length), 1)[0]);
    const avg = deck.reduce((s, c) => s + c.cost, 0) / deck.length;
    if (avg >= 2.6 && avg <= 3.8 && deck.some(c => c.cost <= 2) && deck.some(c => c.cost >= 4)) return { faction: fk, deck: deck.map(c => c.id) };
  }
  return { faction: fk, deck: mine.slice(0, 6).map(c => c.id) };
}
// Nivel de cada carta del rival: la más cara +1, la más barata -1 y el resto al nivel objetivo (el nivel medio queda en el objetivo).
function rivalLevels(deck, level) {
  const sorted = deck.slice().sort((a, b) => CARD[b].cost - CARD[a].cost), out = {};
  sorted.forEach((id, i) => { out[id] = clamp(level + (i === 0 ? 1 : i === sorted.length - 1 ? -1 : 0), 1, MAX_CARD_LEVEL + 1); });
  return out;
}
function makeRival(trophies, tier, seed, rating) { // rating: valoración oculta (mmr); si no se da, se usan los trofeos
  rating = rating === undefined ? trophies : rating;
  const r = rng(seed * 7919 + (tier + 2) * 104729), L = leagueIndex(rating);
  const merc = r() < 0.4, gen = merc ? generateDeck(r) : null;
  const arche = merc ? { id: 'mercs', name: 'Mercenarios', faction: gen.faction, deck: gen.deck } : RIVAL_DECKS[Math.floor(r() * RIVAL_DECKS.length)], name = RIVAL_NAMES[Math.floor(r() * RIVAL_NAMES.length)];
  const T = DUEL_TIERS.find(x => x.tier === tier);
  return {
    name, arche: arche.id, title: arche.name, faction: arche.faction, deck: rivalDeck(arche, r), tier, label: T.label,
    level: clamp(1 + Math.floor(rating / 260) + tier, 1, MAX_CARD_LEVEL + 1), rating: rating + 120 * tier,
    skill: clamp(0.62 + 0.06 * L + 0.08 * tier, 0.5, 0.97),
    income: +(0.28 + 0.04 * L + 0.07 * tier).toFixed(3),    // equivale al oro que sacarías de una mina
    think: +clamp(2.0 - 0.15 * L - 0.25 * tier, 0.8, 2.4).toFixed(2),
    hoard: 3 + (tier > 0 ? 1 : 0), startGold: 3, zone: Math.floor(r() * 10), win: T.win, lose: T.lose,
  };
}
function withLevels(rv) { rv.levels = rivalLevels(rv.deck, rv.level); return rv; }
function duelOffers(save) {
  const d = duelState(save);
  return DUEL_TIERS.map(t => withLevels(makeRival(d.trophies, t.tier, d.seed, d.mmr)));
}

function duelMission(rival, terrain) { // terrain: arena elegida por el jugador (cosmético); si no, la del rival
  const z = ZONES[rival.zone % ZONES.length];
  return {
    id: 500, zone: z.id, terrain: terrain || z.terrain, enemy: rival.faction, duel: true, rival, goal: 'destroy', name: 'Duelo: ' + rival.name, desc: rival.title,
    camps: [], wave: { every: 999, max: 0, pool: [] }, towerHp: 850, baseHp: 3200, foeMult: 1, matchTime: 240, coins: 0, chests: 0, triggers: [], unlock: { cards: [], leaders: [] },
  };
}

// Resultado de un duelo: trofeos, racha y recompensa. Cada 3.ª victoria da un cofre.
function duelResult(save, rival, win) {
  const d = duelState(save), T = DUEL_TIERS.find(x => x.tier === rival.tier), before = d.trophies;
  if (win) { d.trophies += rival.win; d.wins++; d.streak++; d.best = Math.max(d.best, d.trophies); }
  else { d.trophies = Math.max(0, d.trophies - rival.lose); d.losses++; d.streak = 0; }
  const exp = 1 / (1 + Math.pow(10, ((rival.rating || 0) - d.mmr) / 400)); // probabilidad esperada de ganar
  d.mmr = Math.max(0, Math.round(d.mmr + 32 * ((win ? 1 : 0) - exp)));
  d.seed++; // nuevos rivales
  const L = leagueIndex(d.trophies);
  const rw = win ? { coins: T.coins + 10 * L + Math.min(5, d.streak) * 5, xp: 50 + 10 * L, chests: d.wins % 3 === 0 ? 1 : 0 } : { coins: 8, xp: 10, chests: 0 };
  return { win, mmr: d.mmr, delta: d.trophies - before, trophies: d.trophies, league: leagueOf(d.trophies), promoted: leagueIndex(d.trophies) > leagueIndex(before), streak: d.streak, rw };
}

// Rival "fantasma": el mazo real de otro jugador (del servidor), jugado por la IA. Su fuerza sale de sus trofeos y del nivel de sus cartas.
function ghostRival(profile, seed) {
  const base = makeRival(profile.trophies || 0, 0, seed || 1);
  const ok = id => CARD[id] && CARD[id].ready && !CARD[id].miner;
  const deck = (profile.deck || []).filter(ok).filter((id, i, a) => a.indexOf(id) === i).slice(0, 6);
  for (const id of base.deck) if (deck.length < 5 && !deck.includes(id)) deck.push(id);
  const lv = deck.map(id => (profile.levels && profile.levels[id]) || 1);
  const f = {}; for (const id of deck) f[CARD[id].faction] = (f[CARD[id].faction] || 0) + 1;
  const main = Object.keys(f).sort((a, b) => f[b] - f[a])[0], T = DUEL_TIERS[1];
  const levels = {}; for (const id of deck) levels[id] = clamp((profile.levels && profile.levels[id]) || 1, 1, MAX_CARD_LEVEL + 1);
  return Object.assign(base, { levels, rating: profile.mmr !== undefined ? profile.mmr : (profile.trophies || 0), name: String(profile.name || 'Jugador').slice(0, 16), title: 'Jugador real', ghost: true, faction: main === 'dwarves' ? 'ordu' : main, deck,
    level: clamp(Math.round(lv.reduce((a, b) => a + b, 0) / lv.length), 1, MAX_CARD_LEVEL + 1), tier: 0, label: 'Fantasma', win: T.win + 5, lose: T.lose });
}
