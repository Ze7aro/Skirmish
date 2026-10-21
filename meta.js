// Progresión y modos de juego (sin DOM): mutadores, reliquias, mazmorra, misiones diarias, XP y cofres.
'use strict';

// ---------- Modificadores ----------
function mergeMods(list) {
  const out = Object.assign({}, DEFAULT_MODS);
  for (const m of list) for (const k in m) {
    if (typeof out[k] === 'boolean') out[k] = out[k] || m[k];
    else if (k === 'startGold') out[k] += m[k];
    else if (k === 'handSwap') out[k] = out[k] ? Math.min(out[k], m[k]) : m[k]; // el cambio de mano más frecuente manda
    else if (k === 'recallChance') out[k] = Math.min(0.9, out[k] + m[k]);
    else out[k] *= m[k];
  }
  return out;
}

// Mutadores: opcionales por misión; más dificultad = más monedas y XP si ganas.
const MUTATORS = [
  { id: 'fast', name: 'Enemigos veloces', icon: '💨', desc: '+25% de velocidad enemiga', mods: { foeSpeed: 1.25 }, bonus: 0.25 },
  { id: 'tough', name: 'Enemigos curtidos', icon: '🛡', desc: '+30% de vida enemiga', mods: { foeHp: 1.3 }, bonus: 0.25 },
  { id: 'poor', name: 'Energía escasa', icon: '⚡', desc: 'La energía pasiva se reduce a la mitad', mods: { goldBase: 0.5 }, bonus: 0.25 },
  { id: 'fragile', name: 'Torres frágiles', icon: '🏰', desc: 'Tus torres tienen un 40% menos de vida', mods: { towerHp: 0.6 }, bonus: 0.25 },
  { id: 'swap', name: 'Mano inestable', icon: '🔀', desc: 'Cada 30 s una carta de tu mano se cambia sola', mods: { handSwap: 30 }, bonus: 0.2 },
  { id: 'drop', name: 'Sin la más cara', icon: '🚫', desc: 'Tu mini más cara no entra en el mazo', mods: { dropCostly: true }, bonus: 0.3 },
  { id: 'noleader', name: 'Sin héroe', icon: '👑', desc: 'No puedes usar la habilidad del héroe', mods: { leaderOff: true }, bonus: 0.4 },
];
const MUTATOR = Object.fromEntries(MUTATORS.map(m => [m.id, m]));
const mutatorMods = ids => mergeMods(ids.map(id => MUTATOR[id].mods));
const mutatorBonus = ids => ids.reduce((s, id) => s + MUTATOR[id].bonus, 0);

// ---------- Reliquias de mazmorra (duran toda la run) ----------
const RELICS = [
  { id: 'blade', name: 'Hoja afilada', icon: '⚔', desc: '+15% de daño de tus minis', mods: { allyDmg: 1.15 } },
  { id: 'oak', name: 'Armadura de roble', icon: '🛡', desc: '+20% de vida de tus minis', mods: { allyHp: 1.2 } },
  { id: 'pick', name: 'Pico de oro', icon: '⛏', desc: '+40% de energía de las minas', mods: { mineRate: 1.4 } },
  { id: 'pack', name: 'Mochila de energía', icon: '⚡', desc: 'Empiezas cada batalla con +3 de energía', mods: { startGold: 3 } },
  { id: 'wall', name: 'Torres reforzadas', icon: '🏰', desc: '+40% de vida de tus torres', mods: { towerHp: 1.4 } },
  { id: 'recall', name: 'Retorno', icon: '↩', desc: '20% de que la carta vuelva a tu mano al desplegarla', mods: { recallChance: 0.2 } },
  { id: 'hourglass', name: 'Reloj de arena', icon: '⏳', desc: '-25% de enfriamiento del héroe', mods: { leaderCd: 0.75 } },
  { id: 'boots', name: 'Botas veloces', icon: '👢', desc: '+15% de velocidad de tus minis', mods: { allySpeed: 1.15 } },
  { id: 'heart', name: 'Corazón de piedra', icon: '❤', desc: '+30% de vida de tu base', mods: { baseHp: 1.3 } },
  { id: 'banner', name: 'Estandarte de paz', icon: '🚩', desc: 'Las oleadas enemigas tardan un 20% más', mods: { waveEvery: 1.2 } },
  { id: 'flow', name: 'Fuente de maná', icon: '💧', desc: '+25% de energía pasiva', mods: { goldBase: 1.25 } },
];
const RELIC = Object.fromEntries(RELICS.map(r => [r.id, r]));
const relicMods = ids => mergeMods(ids.map(id => RELIC[id].mods));

function pickLoot(owned, rnd) {
  rnd = rnd || Math.random;
  const pool = RELICS.filter(r => !owned.includes(r.id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3).map(r => r.id);
}

// ---------- Mazmorra: 8 niveles seguidos, 3 vidas, una reliquia a elegir tras cada victoria ----------
const DUNGEON_STAGES = 8, DUNGEON_LIVES = 3;
const DUNGEON_BOSSES = { 4: 'boss_guardian_piedra', 6: 'boss_ice_colossus', 8: 'boss_senor_cripta' };
function dungeonMission(stage) {
  const z = ZONES[(stage - 1) % ZONES.length];
  const pool = (z.enemy === 'ordu' ? ['ordu_grunt', 'ordu_raider', 'ordu_bomber', 'ordu_wyvern'] : ['undead_skeletons', 'undead_lich', 'undead_wraith', 'undead_dragon'])
    .slice(0, Math.min(4, 2 + Math.floor(stage / 2)));
  const boss = DUNGEON_BOSSES[stage];
  const m = 0.55 + 0.04 * stage;
  return {
    id: 100 + stage, zone: z.id, terrain: z.terrain, enemy: z.enemy, dungeon: true, stage,
    name: `Mazmorra · Nivel ${stage}`, desc: boss ? `Jefe: ${BOSS[boss].name}` : `${z.name}`,
    // Fase A: desde el nivel 3 hay torre neutral capturable y un campamento que patrulla; desde el 5, otro que deambula.
    camps: [camp(0, 450, [pool[0], pool[1]], m, stage >= 3 ? { tower: true } : {}), camp(1, 410, [pool[0], pool[pool.length - 1]], m, stage >= 5 ? { behavior: 'wander' } : stage >= 3 ? { behavior: 'patrol' } : {})]
      .map((c, i) => { const g = stage >= 2 && campGroups(c.types, pool, stage * 10 + i + 7); return g ? Object.assign(c, { groups: g }) : c; }),
    ...mapFeatures(0, stage, [{ lane: 0, y: 450 }, { lane: 1, y: 410 }], pool), campRespawn: stage >= 3 ? { every: 60, bounty: 1 } : undefined,
    wave: { every: Math.max(14, 24 - stage), max: Math.min(6, 2 + Math.floor(stage / 2)), pool },
    towerHp: 2300 + 460 * (stage - 1), baseHp: 3000 + 620 * (stage - 1), foeMult: +(1.2 + 0.24 * (stage - 1)).toFixed(2),
    boss: boss ? { id: boss, at: 40 } : undefined, matchTime: boss ? 240 : 180, coins: 0, unlock: { cards: [], leaders: [] },
  };
}
function newRun(deck, leader) { return { stage: 1, lives: DUNGEON_LIVES, relics: [], deck: deck.slice(), leader }; }
function dungeonReward(stageReached, completed) {
  return { coins: stageReached * 20 + (completed ? 150 : 0), xp: stageReached * 15 + (completed ? 60 : 0), chests: (stageReached >= 4 ? 1 : 0) + (completed ? 1 : 0) };
}

// ---------- XP y nivel de jugador ----------
const xpNeed = lvl => 80 + 40 * lvl;
function addXp(save, xp) {
  save.xp += xp; let ups = 0;
  while (save.xp >= xpNeed(save.level)) { save.xp -= xpNeed(save.level); save.level++; save.coins += 50; ups++; }
  if (typeof energyGain === 'function') energyGain(save, xp); // la energía de mejora se gana jugando (economy.js)
  if (typeof passGain === 'function') passGain(save, xp); // el pase de temporada (season.js) se llena con el mismo XP
  return ups; // cada nivel da 50 monedas
}

// ---------- Recompensas de batalla de campaña ----------
function rewardFor(result, mission, mutatorIds, assist) {
  const mult = (1 + (result.win ? mutatorBonus(mutatorIds || []) : 0)) * (mission.heroic ? HEROIC_REWARD : 1) * (assist ? ASSIST_REWARD : 1);
  const coins = result.win ? Math.round((mission.coins + result.stars * 10) * mult) : 8;
  const xp = result.win ? Math.round((40 + result.stars * 10) * mult) : 10;
  const chests = result.win ? (result.stars >= 2 ? 1 : 0) + (result.stats.bossKilled ? 1 : 0) : 0;
  return { coins, xp, chests, mult };
}

// ---------- Dificultad adaptativa y misiones heroicas (Fase E) ----------
// Tras 2 derrotas seguidas en una misión se ofrece una ayuda opcional (más energía inicial, aliados y torres más duros) con recompensa reducida.
const ASSIST_FAILS = 2, ASSIST_REWARD = 0.8, ASSIST_MODS = { startGold: 3, allyHp: 1.2, towerHp: 1.25 };
const assistAvailable = (save, id) => ((save.fails && save.fails[id]) || 0) >= ASSIST_FAILS;
function recordResult(save, id, win) { // cuenta las derrotas seguidas; ganar las pone a cero
  if (!save.fails) save.fails = {};
  if (win) delete save.fails[id]; else save.fails[id] = (save.fails[id] || 0) + 1;
  return save.fails[id] || 0;
}
// Heroica: una misión ya superada con 2+ estrellas, más dura (enemigos +30%, edificios y oleadas más fuertes) y con más premio.
const HEROIC_MIN_STARS = 2, HEROIC_REWARD = 1.8;
const heroicUnlocked = (save, id) => ((save.stars && save.stars[id]) || 0) >= HEROIC_MIN_STARS;
// Talentos que pueden llevar los enemigos de las misiones difíciles (los mismos que usa el jugador; se eligen de forma determinista).
const FOE_TALENTS = ['armor', 'fury', 'vigor', 'lifesteal', 'cleave', 'frost', 'stunner', 'rapid', 'aegis', 'swiftA'];
function pickFoeTalents(seed, n) {
  const out = []; for (let k = 0; out.length < n && k < 40; k++) { const t = FOE_TALENTS[(seed * 3 + 1 + k * 7) % FOE_TALENTS.length]; if (!out.includes(t)) out.push(t); } // el paso 7 es primo con 10: recorre todos los talentos sin repetir
  return out;
}
function heroicMission(m) {
  return Object.assign({}, m, { heroic: true, foeTalents: pickFoeTalents(m.id, 2), name: 'Heroica: ' + m.name, foeMult: +(m.foeMult * 1.3).toFixed(2), towerHp: Math.round(m.towerHp * 1.2), baseHp: Math.round(m.baseHp * 1.15),
    camps: m.camps.map(c => Object.assign({}, c, { mult: +(c.mult * 1.25).toFixed(2) })), wave: Object.assign({}, m.wave, { every: Math.max(8, Math.round(m.wave.every * 0.9)) }) });
}

// ---------- Camino de calaveras (Fase F) ----------
// Ruta de 10 niveles de dificultad creciente (una batalla por nivel). Cada nivel recicla una misión de campaña (con su objetivo) y le suma enemigos más duros y mutadores fijos.
const SKULL_LEVELS = 10;
const SKULL_MUTS = [[], [], ['tough'], ['fast'], ['tough', 'fast'], ['poor'], ['tough', 'poor'], ['fast', 'fragile'], ['tough', 'fast', 'poor'], ['tough', 'fast', 'fragile']];
const skullUnlocked = (save, level) => level === 1 || !!(save.skull && save.skull.cleared && save.skull.cleared[level - 1]);
function skullMission(level) {
  const base = MISSIONS[(level * 2 + 1) % CORE_MISSIONS], m = Object.assign({}, base);
  return Object.assign(m, { id: 600 + level, heroic: false, skull: level, foeTalents: pickFoeTalents(level + 20, level >= 9 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0), name: 'Calavera ' + level + ': ' + base.name, desc: '💀'.repeat(Math.min(5, Math.ceil(level / 2))) + ' ' + base.desc,
    foeMult: +(0.9 + 0.17 * level).toFixed(2), towerHp: Math.round(base.towerHp * (0.9 + 0.06 * level)), baseHp: Math.round(base.baseHp * (0.9 + 0.04 * level)),
    wave: Object.assign({}, base.wave, { every: Math.max(9, Math.round(base.wave.every * (1.05 - 0.03 * level))) }),
    camps: base.camps.map(c => Object.assign({}, c, { mult: +(c.mult * (0.9 + 0.05 * level)).toFixed(2) })), coins: 0, unlock: { cards: [], leaders: [] } });
}
const skullMods = level => mutatorMods(SKULL_MUTS[level - 1] || []);
function skullReward(level, first) {
  return first ? { coins: 70 + 45 * level, xp: 50 + 10 * level, chests: 1 + (level >= 5 ? 1 : 0) + (level === SKULL_LEVELS ? 1 : 0), cores: level >= 4 ? 1 + (level === SKULL_LEVELS ? 2 : 0) : 0 } : { coins: 25 + 8 * level, xp: 20 + 3 * level, chests: 0 };
}

// ---------- Puntuación por partida (Fase H) ----------
// Se guarda la mejor puntuación de cada misión (clave: id, id+'h' en heroicas, 'k'+nivel en calaveras, 'duel' en duelos).
function recordScore(save, key, score) {
  if (!save.scores) save.scores = {};
  const prev = save.scores[key] || 0, record = score > prev;
  if (record) save.scores[key] = score;
  return { score, best: Math.max(prev, score), prev, record };
}
const totalScore = save => Object.values(save.scores || {}).reduce((a, b) => a + b, 0);

// ---------- Mazmorras por temporadas con descanso (Fase H) ----------
// Abierta de lunes a viernes; sábado y domingo descansa. Al empezar una semana nueva se reparten cofres según el mejor nivel de la anterior (≥4: 1, ≥8: 2).
const DUNGEON_OPEN_DAYS = 5;
function dungeonSeason(d) {
  d = d || new Date();
  const dow = (d.getDay() + 6) % 7, monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  return { open: dow < DUNGEON_OPEN_DAYS, week: weekIndex(d), endsAt: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + DUNGEON_OPEN_DAYS), nextOpen: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7) };
}
function ensureDungeonSeason(save, d) {
  const s = dungeonSeason(d), dg = save.dungeon;
  if (dg.season === undefined) { dg.season = s.week; dg.seasonBest = dg.seasonBest || 0; return null; }
  if (dg.season === s.week) return null;
  const prev = dg.seasonBest || 0, chests = prev >= 8 ? 2 : prev >= 4 ? 1 : 0;
  if (chests) grantChests(save, chests);
  dg.season = s.week; dg.seasonBest = 0;
  return { prev, chests };
}

// Guarda los objetivos cumplidos (se acumulan entre intentos); las estrellas son cuántos objetivos se han cumplido alguna vez.
function recordObjectives(save, missionId, objs) {
  const prev = save.objs[missionId] || [false, false, false];
  save.objs[missionId] = objs.map((v, i) => !!(v || prev[i]));
  save.stars[missionId] = save.objs[missionId].filter(Boolean).length;
  return save.objs[missionId];
}

// ---------- Cofres ----------
const MAX_CHESTS = 6;
function grantChests(save, n) {
  let lost = 0;
  for (let i = 0; i < n; i++) { if (save.chests < MAX_CHESTS) save.chests++; else { save.coins += 50; lost++; } }
  return lost; // si no caben, se convierten en 50 monedas cada uno
}
function openChest(save, rnd) {
  rnd = rnd || Math.random;
  if (save.chests <= 0) return null;
  save.chests--;
  const coins = 50 + Math.floor(rnd() * 80);
  let freeLevel = null;
  if (rnd() < 0.3) {
    const cand = DECK_CARDS.filter(c => c.ready && save.cards.includes(c.id) && (save.levels[c.id] || 1) < (typeof levelCap === 'function' ? levelCap(save, c.id) : MAX_CARD_LEVEL));
    if (cand.length) { const c = cand[Math.floor(rnd() * cand.length)]; save.levels[c.id] = (save.levels[c.id] || 1) + 1; freeLevel = c.id; }
  }
  let core = 0; if (rnd() < 0.25) { core = 1; save.cores = (save.cores || 0) + 1; } // a veces sale un core
  save.coins += coins;
  return { coins, freeLevel, core };
}

// ---------- Misiones diarias ----------
const QUEST_POOL = [
  { id: 'wins', text: 'Gana {n} batallas', metric: 'wins', targets: [1, 2, 3] },
  { id: 'kills', text: 'Derrota {n} enemigos', metric: 'kills', targets: [25, 40, 60] },
  { id: 'mined', text: 'Mina {n} de energía', metric: 'mined', targets: [12, 24, 40] },
  { id: 'deployed', text: 'Despliega {n} cartas', metric: 'deployed', targets: [20, 32, 45] },
  { id: 'boss', text: 'Derrota a un jefe', metric: 'boss', targets: [1, 1, 1] },
  { id: 'clean', text: 'Gana sin perder ninguna torre', metric: 'clean', targets: [1, 1, 2] },
  { id: 'chests', text: 'Abre {n} cofres del mapa', metric: 'chests', targets: [2, 3, 5] },
];
const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function questsForDay(day) {
  let h = hashStr(day);
  const ids = QUEST_POOL.map((_, i) => i), out = [];
  for (let k = 0; k < 3; k++) {
    const pick = ids.splice(h % ids.length, 1)[0]; h = Math.imul(h, 1103515245) + 12345 >>> 0;
    const def = QUEST_POOL[pick], tier = h % 3; h = Math.imul(h, 1103515245) + 12345 >>> 0;
    out.push({ id: def.id, tier, target: def.targets[tier], progress: 0, claimed: false });
  }
  return out;
}
function ensureQuests(save, day) {
  day = day || dayKey();
  if (!save.quests || save.quests.day !== day) save.quests = { day, list: questsForDay(day) };
  return save.quests.list;
}
const questDef = q => QUEST_POOL.find(d => d.id === q.id);
const questText = q => questDef(q).text.replace('{n}', q.target);
const questReward = q => ({ coins: 30 + q.tier * 20, xp: 20 + q.tier * 15 });
// Aplica el resumen de una batalla; devuelve las misiones que acaban de completarse.
function applyBattleToQuests(save, r, day) {
  ensureQuests(save, day);
  const delta = { wins: r.win ? 1 : 0, kills: r.stats.kills, mined: Math.floor(r.stats.mined), deployed: r.stats.deployed,
    boss: r.stats.bossKilled ? 1 : 0, clean: r.win && r.towersLost === 0 ? 1 : 0, chests: r.stats.chests || 0 };
  const done = [];
  for (const q of save.quests.list) {
    if (q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + (delta[questDef(q).metric] || 0));
    if (q.progress >= q.target) done.push(q);
  }
  return done;
}
function claimQuest(save, i) {
  const q = save.quests.list[i];
  if (!q || q.claimed || q.progress < q.target) return null;
  q.claimed = true;
  const r = questReward(q);
  save.coins += r.coins;
  return { coins: r.coins, xp: r.xp, levelUps: addXp(save, r.xp) };
}

// ---------- Talentos: los activos de cada carta según su nivel y lo que hayas elegido ----------
function talentMap(save, ids) {
  const out = {};
  for (const id of ids.concat(UNIVERSAL)) out[id] = activeTalents(CARD[id], (save.talents || {})[id], save.levels[id] || 1);
  return out;
}

// ---------- Eventos semanales: rotan solos cada lunes; cada uno cambia las reglas del campo ----------
const EVENTS = [
  { id: 'goldrush', name: 'Fiebre del oro', icon: '💰', desc: 'Las minas rinden el doble… pero los enemigos aguantan un 20% más.', mods: { mineRate: 2, foeHp: 1.2 }, rules: {} },
  { id: 'meteors', name: 'Lluvia de meteoros', icon: '☄', desc: 'Cada pocos segundos cae un meteoro marcado en el suelo: daña a todos, aliados y enemigos.', mods: {}, rules: { meteors: true } },
  { id: 'bossrush', name: 'Cacería de jefes', icon: '💀', desc: 'Dos jefes atacan en la misma batalla.', mods: {}, rules: {}, bosses: [{ id: 'boss_guardian_piedra', at: 20 }, { id: 'boss_nigromante_tumulo', at: 70 }] },
  { id: 'bossrush2', name: 'Jefes de expansión', icon: '🦀', desc: 'La Reina araña y el Gólem de forja atacan en la misma batalla.', mods: {}, rules: {}, bosses: [{ id: 'boss_forge_golem', at: 20 }, { id: 'boss_spider_queen', at: 70 }] },
  { id: 'heroday', name: 'Día del héroe', icon: '👑', desc: 'Tu héroe se recarga el doble de rápido y su habilidad cubre un área mayor.', mods: { leaderCd: 0.5, leaderRadius: 1.35 }, rules: {} },
  { id: 'blizzard', name: 'Ventisca', icon: '❄', desc: 'Cada cierto tiempo la ventisca congela uno de los carriles.', mods: {}, rules: { blizzard: true } },
];
const EVENT_TIERS = [
  { name: 'Fácil', stage: 2, coins: 60, xp: 40, chest: false },
  { name: 'Normal', stage: 4, coins: 100, xp: 70, chest: true },
  { name: 'Difícil', stage: 6, coins: 160, xp: 110, chest: true },
];
const DAY_MS = 864e5;
const calDay = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());                  // fecha local sin horas (inmune al cambio horario)
const weekIndex = d => Math.floor((calDay(d) - Date.UTC(2024, 0, 1)) / (7 * DAY_MS));      // el 1-ene-2024 fue lunes
const eventFor = d => EVENTS[((weekIndex(d || new Date()) % EVENTS.length) + EVENTS.length) % EVENTS.length];
function eventEnd(d) { d = d || new Date(); const dow = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - dow)); } // próximo lunes 00:00 local
function fmtCountdown(ms) {
  ms = Math.max(0, ms); const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d} d ${h} h` : `${h} h ${m % 60} min`;
}
function eventMission(ev, tier) {
  const m = dungeonMission(EVENT_TIERS[tier].stage);
  Object.assign(m, { id: 200 + tier, dungeon: false, event: { id: ev.id, tier }, name: `${ev.name} · ${EVENT_TIERS[tier].name}`, desc: ev.desc, rules: ev.rules, matchTime: 240 });
  if (ev.bosses) { m.bosses = ev.bosses; delete m.boss; }
  return m;
}
function ensureEvent(save, d) {
  const w = weekIndex(d || new Date());
  if (!save.event || save.event.week !== w) save.event = { week: w, cleared: [false, false, false], bonus: false };
  return save.event;
}
// Recompensa de un nivel del evento: completa la primera vez; las repeticiones dan un 25%.
function eventReward(save, tier, win, date) {
  const t = EVENT_TIERS[tier], first = win && !ensureEvent(save, date).cleared[tier];
  if (!win) return { coins: 5, xp: 10, chests: 0, first: false, allClear: false };
  const k = first ? 1 : 0.25;
  return { coins: Math.round(t.coins * k), xp: Math.round(t.xp * k), chests: first && t.chest ? 1 : 0, first, allClear: false };
}
// Marca el nivel como superado; si con él se completan los 3, da un bonus único.
function applyEventWin(save, tier, date) {
  const ev = ensureEvent(save, date);
  ev.cleared[tier] = true;
  if (ev.cleared.every(Boolean) && !ev.bonus) { ev.bonus = true; save.coins += 100; return { allClear: true, coins: 100, chests: 1 }; }
  return { allClear: false, coins: 0, chests: 0 };
}

// ---------- Desafío del día: misma batalla para todos ese día, con 2 mutadores fijos ----------
function yesterdayKey(day) { const [y, m, d] = day.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)); }
function dailyChallenge(day) {
  day = day || dayKey();
  const h = hashStr('daily:' + day), pool = MUTATORS.filter(m => m.id !== 'noleader');
  const ia = h % pool.length, ib = (ia + 1 + (Math.floor(h / 11) % (pool.length - 1))) % pool.length;
  const stage = 3 + (h % 4), z = ZONES[Math.floor(h / 5) % ZONES.length];
  const m = dungeonMission(stage), goal = Object.keys(GOALS)[Math.floor(h / 13) % Object.keys(GOALS).length];
  Object.assign(m, { id: 300, dungeon: false, daily: true, zone: z.id, terrain: z.terrain, enemy: z.enemy, name: 'Desafío del día', desc: `${pool[ia].name} + ${pool[ib].name}` });
  withGoal(m, goal); // el tipo de objetivo (destruir, defender, capturar, cacería, escolta) cambia cada día
  if (m.hunt && !m.hunt.id) m.hunt.id = CHAMPIONS[z.terrain];
  return { mission: m, muts: [pool[ia].id, pool[ib].id] };
}
function ensureDaily(save, day) {
  day = day || dayKey();
  if (!save.daily) save.daily = { day, done: false, streak: 0, last: '' };
  if (save.daily.day !== day) { save.daily.day = day; save.daily.done = false; }
  return save.daily;
}
const dailyStreakNow = (save, day) => { day = day || dayKey(); const d = ensureDaily(save, day); return d.done || d.last === yesterdayKey(day) ? d.streak : 0; };
function dailyReward(save, day) {
  day = day || dayKey();
  const d = ensureDaily(save, day), streak = (d.last === yesterdayKey(day) ? d.streak : 0) + 1;
  return { coins: 80 + Math.min(7, streak) * 10, xp: 60, chests: 1, streak };
}
function applyDailyWin(save, day) { day = day || dayKey(); const d = ensureDaily(save, day), r = dailyReward(save, day); d.done = true; d.streak = r.streak; d.last = day; return r; }

// ---------- Supervivencia: oleadas infinitas ----------
function survivalMission() {
  const m = dungeonMission(3);
  Object.assign(m, { id: 400, dungeon: false, survival: true, name: 'Supervivencia', desc: 'Aguanta todas las oleadas que puedas', matchTime: Infinity,
    towerHp: 3200, baseHp: 4800, foeMult: 1.1, wave: { every: 18, max: 6, pool: [] } });
  delete m.boss;
  return m;
}
const survivalReward = waves => ({ coins: waves * 8, xp: waves * 6, chests: Math.floor(waves / 10) });
