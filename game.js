// Motor de simulación (sin DOM): carriles, combate, estados, campamentos, minas, oleadas, jefes y héroes.
'use strict';

// Energía: poco pasivo (0,4/s); lo importante es el oro de las minas, que solo da un enano minero vivo trabajando (0,55/s por mina).
const W = 480, H = 800, MAX_GOLD = 10, BASE_GOLD_RATE = 1 / 2.5, MINE_RATE = 0.35;
// Minas con reserva (Fase H): rinden a ritmo normal mientras tienen oro; agotadas, solo gotean, y se recargan solas cuando nadie las trabaja.
const MINE_RESERVE = 20, MINE_RECHARGE = 0.2, MINE_TRICKLE = 0.35;
const FREE_MINES = [{ x: 48, y: 575 }, { x: 432, y: 575 }]; // minas libres junto a tu base (una por carril)
const LANE_HALF = 34, DEPLOY_BASE_Y = 630, OUTPOST_R = 120;
const TOWER_DMG = 32, BASE_DMG = 48;

// Carriles rectos (coinciden con el fondo pintado): de abajo (jugador) a arriba (enemigo).
const LANES_LEGACY = [
  [[120, 700], [120, 560], [120, 420], [120, 280], [120, 150], [200, 95]],
  [[360, 700], [360, 560], [360, 420], [360, 280], [360, 150], [280, 95]],
];
// Carriles por terreno (Fase K): siguen el camino de cada fondo pintado (medidos sobre los mapas; el camino converge un poco hacia la base enemiga).
// Se da la x del carril izquierdo en y = 700, 560, 420, 280 y 150; el derecho es su espejo.
const LANE_YS = [700, 560, 420, 280, 150];
const LANE_LEFT = { forest: [112, 119, 125, 132, 139], desert: [120, 122, 126, 128, 128], ruins: [118, 122, 128, 134, 137], snow: [108, 111, 120, 133, 144], volcanic: [120, 127, 139, 146, 150] };
function lanesFor(terrain) {
  const L = LANE_LEFT[terrain];
  if (!L) return LANES_LEGACY;
  return [L.map((x, i) => [x, LANE_YS[i]]).concat([[200, 95]]), L.map((x, i) => [W - x, LANE_YS[i]]).concat([[280, 95]])];
}
let LANES = LANES_LEGACY;

let state = null;

// Modificadores de batalla (mutadores y reliquias de mazmorra los combinan): multiplicadores, sumas o interruptores.
const DEFAULT_MODS = { allyHp: 1, allyDmg: 1, allySpeed: 1, foeHp: 1, foeSpeed: 1, goldBase: 1, mineRate: 1, startGold: 0, towerHp: 1, baseHp: 1, leaderCd: 1, leaderOff: false, waveEvery: 1, leaderRadius: 1, handSwap: 0, dropCostly: false, recallChance: 0 };
// Objetivos de estrellas de cada misión (independientes, como en un campo de batalla de campaña).
const OBJECTIVES = ['Destruye la base enemiga', 'Conserva al menos el 60% de tu base', 'No pierdas ninguna torre'];
// Cola de eventos para efectos de sonido; la interfaz la vacía en cada fotograma.
// Si la cola se llena, los sonidos repetitivos se descartan y los importantes (victoria, jefe…) entran quitando el más antiguo.
function ev(name) {
  if (!state) return;
  if (state.events.length >= 60) { if (name === 'hit' || name === 'coin' || name === 'deploy') return; state.events.shift(); }
  state.events.push(name);
}

// ---------- Utilidades ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const levelMult = l => 1 + 0.12 * ((l || 1) - 1);
const nearestLane = x => Math.abs(x - LANES[0][0][0]) <= Math.abs(x - LANES[1][0][0]) ? 0 : 1;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function laneX(lane, y) {
  const n = LANES[lane];
  if (y >= n[0][1]) return n[0][0];
  for (let i = 0; i < n.length - 1; i++) {
    const a = n[i], b = n[i + 1];
    if (y <= a[1] && y >= b[1]) return a[0] + (b[0] - a[0]) * (a[1] - y) / (a[1] - b[1]);
  }
  return n[n.length - 1][0];
}

function clampLane(lane, y, x) {
  if (y > 660 || y < 140) return Math.max(8, Math.min(W - 8, x));
  const c = laneX(lane, y);
  return Math.max(c - LANE_HALF, Math.min(c + LANE_HALF, x));
}

function nextNode(u) {
  const n = LANES[u.lane];
  if (u.dir < 0) { for (const p of n) if (p[1] < u.y - 6) return p; return null; }
  for (let i = n.length - 1; i >= 0; i--) if (n[i][1] > u.y + 6) return n[i];
  return null;
}

// ---------- Inicio de batalla ----------
// talentIds: { idCarta: [ids de talentos activos] } (los elige la interfaz según nivel y ranuras desbloqueadas).
function startBattle(mission, deckIds, leaderId, cardLevels, modsIn, talentIds) {
  LANES = lanesFor(mission.terrain); // los carriles dependen del fondo de la misión
  const leader = LEADER[leaderId] || LEADER_LIST[0];
  const mods = Object.assign({}, DEFAULT_MODS, modsIn || {});
  const tfx = {};
  for (const id of deckIds.concat(UNIVERSAL)) tfx[id] = talentFx((talentIds && talentIds[id]) || []);
  state = {
    t: 0, over: false, winner: null, paused: false, speed: 1, overtime: false, mods, events: [], tfx, meteors: [], ruleT: { meteors: 6, blizzard: 14 }, bossesSpawned: [],
    rules: mission.rules || {},
    stats: { kills: 0, mined: 0, deployed: 0, bossKilled: false, chests: 0 },
    goal: mission.goal || 'destroy', points: [], chests: [], triggers: [], cart: null, hunt: null, bonusCoins: 0, switches: [], brush: [], signals: [], sigCd: 0, replyT: 0,
    mission, leader, deck: deckIds.map(id => CARD[id]).filter(c => c && c.id !== UNIVERSAL), hand: [], queue: [], universal: CARD[UNIVERSAL],
    levels: cardLevels || {},
    units: [], fx: [], corpses: [], buildings: [], mines: [], camps: [], zones: [],
    gold: Math.min(MAX_GOLD, leader.startGold + mods.startGold), leaderCd: 0, selected: null, leaderArmed: false,
    waveTimer: 8, waveNo: 0, uid: 1, towersLost: 0, result: null, bossSpawned: false, towerVuln: 0, deadFoes: [],
    timeLimit: mission.matchTime || 180, foeTf: mission.foeTalents && mission.foeTalents.length ? talentFx(mission.foeTalents) : null, swapT: mods.handSwap || 0, springs: [], ruins: [],
  };
  if (mods.dropCostly && state.deck.length > 2) { // mutador "Sin la más cara": la mini más cara no entra en el mazo
    const top = Math.max(...state.deck.map(c => c.cost)); state.dropped = state.deck.splice(state.deck.findIndex(c => c.cost === top), 1)[0];
  }
  // Mano de 4 cartas que rota: al jugar una, entra la siguiente de la cola (el mazo se baraja al empezar).
  // El enano minero se añade solo a todos los mazos (no se elige) y rota como cualquier otra carta.
  const order = state.deck.concat(state.universal);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  state.hand = order.slice(0, HAND_SIZE); state.queue = order.slice(HAND_SIZE);
  state.duel = mission.duel ? makeDuel(mission.rival) : null;
  const eFaction = mission.enemy;
  const pBase = mission.baseHp * mods.baseHp;
  state.buildings.push({ side: 0, kind: 'base', faction: 'humans', x: W / 2, y: 745, hp: pBase, max: pBase, dmg: BASE_DMG, range: 150, cd: 1.1, t: 0, r: 30 });
  // La base enemiga solo se puede destruir en misiones de "destruir la base"; en el resto es indestructible.
  const eBase = (mission.survival || state.goal !== 'destroy') ? 1e9 : mission.baseHp * (mission.duel ? 1.15 : 1.4);
  state.buildings.push({ side: 1, kind: 'base', faction: eFaction, x: W / 2, y: 64, hp: eBase, max: eBase, dmg: BASE_DMG * mission.foeMult, range: 150, cd: 1.1, t: 0, r: 30 });
  for (const lane of [0, 1]) {
    const ph = 760 * leader.towerMult * mods.towerHp;
    state.buildings.push({ side: 0, kind: 'tower', faction: 'humans', x: LANES[lane][0][0], y: 650, hp: ph, max: ph, dmg: TOWER_DMG, range: 130, cd: 1.0, t: 0, r: 18 });
    state.buildings.push({ side: 1, kind: 'tower', faction: eFaction, x: LANES[lane][4][0], y: 200, hp: mission.towerHp, max: mission.towerHp, dmg: TOWER_DMG * mission.foeMult, range: 130, cd: 1.0, t: 0, r: 20 });
  }
  mission.camps.forEach((c, i) => {
    const x = laneX(c.lane, c.y), side = c.lane === 0 ? -1 : 1;
    const mine = { x: x + side * (LANE_HALF + 36), y: c.y, locked: true, miner: null, claim: null, acc: 0, reserve: MINE_RESERVE, max: MINE_RESERVE }; // se desbloquea al despejar el campamento
    const cp = { id: i, x, y: c.y, lane: c.lane, mult: c.mult, mine, alive: 0, cleared: false, tower: !!c.tower, behavior: c.behavior || 'sleep', rs: null };
    state.mines.push(mine); state.camps.push(cp);
    const types = c.groups ? pick(c.groups) : c.types; // grupo aleatorio entre las variantes del campamento
    cp.types = types;
    types.forEach((id, k) => spawnUnit(1, CARD[id], x + (k - 0.5) * 22, c.y + (k % 2) * 12, c.lane, 0, c.mult * mission.foeMult, { camp: cp, behavior: cp.behavior }));
  });
  for (const f of [0, 1].map(l => ({ x: laneX(l, 575) + (l === 0 ? -72 : 72), y: 575 }))) state.mines.push({ x: f.x, y: f.y, locked: false, miner: null, claim: null, acc: 0, reserve: MINE_RESERVE, max: MINE_RESERVE });
  setupGoal(mission); setupChests(mission); setupFeatures(mission); setupPeriodics(mission);
  state.triggers = (mission.triggers || []).map(t => ({ when: t.when, do: t.do, fired: false }));
  return state;
}

// ---------- Objetivos de misión (Fase B) ----------
// Puntos de captura, campeón de la cacería y carreta de la escolta se crean al empezar.
function setupGoal(mission) {
  const goal = state.goal;
  if (goal === 'capture') state.points = (mission.points || []).map((p, i) => ({ id: i, lane: p.lane, x: laneX(p.lane, p.y), y: p.y, owner: -1, prog: 0, r: 46 }));
  if (goal === 'hunt' && mission.hunt) {
    const lane = Math.floor(Math.random() * 2), b = BOSS[mission.hunt.id];
    const u = spawnUnit(1, b, laneX(lane, 135), 135, lane, 1, mission.foeMult * (mission.hunt.hpMult || 1));
    u.guard = { x: u.x, y: u.y }; u.champion = true; // vigila su guarida: solo persigue a lo que se acerca
    state.hunt = { unit: u, dead: false };
  }
  if (goal === 'escort' && mission.escort) {
    const lane = mission.escort.lane;
    state.cart = spawnUnit(0, CART_CARD, laneX(lane, 690), 690, lane, -1, 1);
  }
}

// Captura: se llena en 5 s con tropas tuyas y sin enemigos; si solo hay enemigos, se vacía en 8 s. Un punto capturado amplía tu zona de despliegue.
function updatePoints(dt) {
  for (const p of state.points) {
    let mine = 0, foes = 0;
    for (const u of state.units) {
      if (u.hp <= 0 || dist(u, p) > p.r) continue;
      if (u.side === 0 && !u.card.miner && !u.card.cart) mine++; else if (u.side === 1 && !u.asleep) foes++;
    }
    if (mine && !foes) p.prog = Math.min(1, p.prog + dt / 5);
    else if (foes && !mine) p.prog = Math.max(0, p.prog - dt / 8);
    if (p.prog >= 1 && p.owner !== 0) {
      p.owner = 0; state.zones.push({ x: p.x, y: p.y, point: p.id }); ev('capture');
      state.fx.push({ type: 'vfx', name: 'tower_capture', x1: p.x, y1: p.y, size: 120, life: 0.9 }); fxv('capture_ring', p.x, p.y, 120, 1.0);
      state.fx.push({ type: 'text', x1: p.x, y1: p.y - 50, text: '¡Punto capturado!', life: 1.4 });
    } else if (p.owner === 0 && p.prog <= 0) {
      p.owner = -1; state.zones = state.zones.filter(z => z.point !== p.id);
      state.fx.push({ type: 'text', x1: p.x, y1: p.y - 50, text: '¡Punto perdido!', life: 1.4 });
    }
  }
}

// La carreta avanza por su carril y se detiene si hay enemigos cerca, para que haya que limpiarle el camino.
const CART_DELAY = 10; // la carreta espera antes de salir para dar tiempo a desplegar la escolta
function cartStep(u, dt) {
  if (state.t < CART_DELAY) return;
  const near = state.units.some(e => e.side !== u.side && e.hp > 0 && !e.asleep && dist(e, u) < 75);
  if (!near) followLane(u, dt);
}
const guardStep = (u, dt) => { if (dist(u, u.guard) > 8) moveToward(u, u.guard.x, u.guard.y, dt * 0.8); };

// ---------- Jefes por fases (Fase F) ----------
// Al bajar al 66% y al 33% de vida el jefe cambia de fase: 1,5 s de inmunidad, más daño y velocidad, habilidades más seguidas y, en la última, refuerzos.
const REGEN_AFTER = 5, REGEN_RATE = 0.015; // 5 s sin combatir y luego +2% de vida por segundo
const BOSS_PHASES = [0.66, 0.33], BOSS_CAST_EVERY = [8, 6.5, 5];
function bossPhase(u) {
  const want = BOSS_PHASES.filter(p => u.hp / u.max <= p).length;
  if (u.phase === undefined) u.phase = 0;
  while (u.phase < want) {
    u.phase++; u.immune = 1.5; u.stun = 0; u.silence = 0; u.slow = 0;
    u.dmg *= 1.2; u.spd *= 1.12; u.abEvery = BOSS_CAST_EVERY[u.phase]; u.abT = Math.min(u.abT, 0.8);
    state.fx.push({ type: 'text', x1: u.x, y1: u.y - 70, text: '¡Fase ' + (u.phase + 1) + '!', life: 1.8, big: true });
    state.fx.push({ type: 'ring', x1: u.x, y1: u.y, r: 60, life: 0.7, color: '#ff8a4a', fill: true }); ev('boss');
    if (u.phase === 2) castBoss(u, u.card.abilities && u.card.abilities.includes('army_of_dead') ? 'army_of_dead' : 'summoning');
  }
}

// ---------- Interruptores y matorrales (Fase F) ----------
// Interruptor: palanca junto al carril; una tropa tuya que se quede cerca 1,2 s la acciona (una vez por partida). Lo usan tus tropas, no las del enemigo.
// Matorral: zona de un solo sentido; quien está dentro no puede ser atacado desde fuera hasta que el atacante se acerca a menos de 48 px o entra también.
const SWITCH_HOLD = 1.2, SWITCH_R = 52, BRUSH_SEE = 48, SWITCH_OFFSET = 44;
// cost: energía que cuesta accionarla; cd: segundos hasta poder usarla otra vez (0 = una sola vez por partida).
const SWITCH_TYPES = {
  towerOff: { icon: '🔌', name: 'Apagar torre', desc: 'Apaga la torre enemiga más cercana durante 15 s', cost: 3, cd: 45 },
  reinforce: { icon: '🛡', name: 'Refuerzos', desc: 'Llegan 2 tropas aliadas de tu mazo', cost: 2, cd: 40 },
  trap: { icon: '💥', name: 'Trampa', desc: 'Daña y aturde a los enemigos cercanos', cost: 1, cd: 30 },
  energy: { icon: '⚡', name: 'Energía', desc: '+4 de energía (una sola vez)', cost: 0, cd: 0 },
};
function setupFeatures(mission) {
  state.switches = (mission.switches || []).map((s, i) => ({ id: i, type: s.type, lane: s.lane, x: laneX(s.lane, s.y) + (s.lane === 0 ? -SWITCH_OFFSET : SWITCH_OFFSET), y: s.y, prog: 0, used: false, t: 0 }));
  state.brush = (mission.brush || []).map(b => ({ lane: b.lane, x: laneX(b.lane, b.y), y: b.y, r: b.r || 46 }));
}
const brushOf = u => (u.card && u.card.flying) ? null : (state.brush.find(z => dist(u, z) < z.r) || null);
function hiddenInBrush(e, viewer) {
  const z = brushOf(e);
  if (!z) return false;
  return !(dist(viewer, e) <= BRUSH_SEE || (viewer.card && brushOf(viewer) === z));
}
function updateSwitches(dt) {
  for (const sw of state.switches) {
    const T = SWITCH_TYPES[sw.type];
    if (sw.used) { sw.t += dt; if (T.cd && sw.t >= T.cd) { sw.used = false; sw.prog = 0; } continue; } // las reutilizables se rearman
    const near = state.units.some(u => u.side === 0 && u.hp > 0 && !u.card.cart && dist(u, sw) < SWITCH_R);
    sw.prog = near ? Math.min(1, sw.prog + dt / SWITCH_HOLD) : Math.max(0, sw.prog - dt / (SWITCH_HOLD * 2));
    sw.wait = sw.prog >= 1 && state.gold < T.cost; // lista pero sin energía para pagarla
    if (sw.prog >= 1 && !sw.wait) { state.gold -= T.cost; fireSwitch(sw); }
  }
}
function fireSwitch(sw) {
  sw.used = true; sw.t = 0; state.stats.switches = (state.stats.switches || 0) + 1; ev('capture');
  const T = SWITCH_TYPES[sw.type];
  state.fx.push({ type: 'text', x1: sw.x, y1: sw.y - 40, text: T.icon + ' ' + T.name, life: 1.6, gold: true });
  state.fx.push({ type: 'ring', x1: sw.x, y1: sw.y, r: 44, life: 0.6, color: '#ffd860', fill: true });
  if (sw.type === 'towerOff') {
    let best = null, bd = 1e9;
    for (const b of state.buildings) if (b.side === 1 && b.kind === 'tower') { const d = dist(b, sw); if (d < bd) { best = b; bd = d; } }
    if (best) best.disabled = 15;
  } else if (sw.type === 'reinforce') {
    const pool = state.deck.filter(c => !c.miner && c.ready);
    for (let i = 0; i < 2 && pool.length; i++) { const c = pool[Math.floor(Math.random() * pool.length)], y = sw.y + i * 16; spawnUnit(0, c, laneX(sw.lane, y), y, sw.lane, -1, levelMult(state.levels[c.id])); }
  } else if (sw.type === 'trap') {
    for (const e of state.units) if (e.side === 1 && e.hp > 0 && dist(e, sw) < 150 && !(e.card.flying && !e.card.boss)) { hit(e, 140); if (!e.card.boss) e.stun = 1.5; }
    state.fx.push({ type: 'vfx', name: 'impact_magic', x1: sw.x, y1: sw.y, size: 200, life: 0.6 });
  } else if (sw.type === 'energy') state.gold = Math.min(MAX_GOLD, state.gold + 4);
}

// ---------- Campamentos que reaparecen, nidos, fuentes y cambio de mano (Fase H) ----------
// Un campamento despejado vuelve a tener guardianes tras un rato (si no hay tropas tuyas cerca); vencerlos da energía de botín. Máximo 3 veces.
function updateRespawn(cp, rs) {
  if (cp.rs.active) {
    if (cp.alive > 0) return;
    cp.rs.active = false; cp.rs.next = state.t + rs.every * (1 + 0.25 * cp.rs.n);
    state.gold = Math.min(MAX_GOLD, state.gold + rs.bounty); state.stats.guardians = (state.stats.guardians || 0) + 1;
    state.fx.push({ type: 'text', x1: cp.x, y1: cp.y - 50, text: '¡Guardianes vencidos! +' + rs.bounty + '⚡', life: 1.6, gold: true });
    return;
  }
  if (cp.rs.n >= 3 || state.t < cp.rs.next || state.units.some(u => u.side === 0 && u.hp > 0 && dist(u, cp) < 140)) return;
  const mult = cp.mult * state.mission.foeMult * 0.8 * (1 + 0.1 * cp.rs.n);
  (cp.types || []).forEach((id, k) => spawnUnit(1, CARD[id], cp.x + (k - 0.5) * 22, cp.y + (k % 2) * 12, cp.lane, 0, mult, { camp: cp, behavior: 'sleep' }));
  cp.rs.active = true; cp.rs.n++;
  state.fx.push({ type: 'text', x1: cp.x, y1: cp.y - 50, text: '¡Guardianes!', life: 1.6 }); state.fx.push({ type: 'ring', x1: cp.x, y1: cp.y, r: 50, life: 0.6, color: '#e0c050', fill: true });
}

// Nido: edificio enemigo que crea una criatura cada 18 s (máx. 3 vivas) hasta que lo destruyes; da energía. Fuente: cura a todos los que estén cerca cada 4 s.
const NEST_EVERY = 26, NEST_MAX_KIDS = 2, NEST_BOUNTY = 2, SPRING_EVERY = 4, SPRING_HEAL = 0.12, SPRING_R = 70, FEATURE_INSET = 62;
function setupPeriodics(mission) {
  for (const n of mission.nests || []) {
    const hp = Math.round(mission.towerHp * 0.22);
    state.buildings.push({ side: 1, kind: 'nest', faction: mission.enemy, x: laneX(n.lane, n.y) + (n.lane === 0 ? FEATURE_INSET : -FEATURE_INSET), y: n.y, hp, max: hp, dmg: 0, range: 0, cd: 1e9, t: 1e9, r: 16, card: n.card, spawnT: 8, lane: n.lane });
  }
  state.springs = (mission.springs || []).map(s => ({ x: laneX(s.lane, s.y) + (s.lane === 0 ? FEATURE_INSET : -FEATURE_INSET), y: s.y, r: SPRING_R, t: 2 }));
}
function updatePeriodics(dt) {
  for (const b of state.buildings) {
    if (b.kind !== 'nest') continue;
    b.spawnT -= dt;
    if (b.spawnT > 0) continue;
    b.spawnT = NEST_EVERY;
    if (state.units.filter(u => u.nest === b && u.hp > 0).length >= NEST_MAX_KIDS) continue;
    const u = spawnUnit(1, CARD[b.card], b.x, b.y + 10, b.lane, 1, state.mission.foeMult * 0.7); u.nest = b;
    state.fx.push({ type: 'ring', x1: b.x, y1: b.y, r: 30, life: 0.5, color: '#b0e060', fill: true });
  }
  for (const sp of state.springs) {
    sp.t -= dt;
    if (sp.t > 0) continue;
    sp.t = SPRING_EVERY;
    let any = false;
    for (const u of state.units) if (u.hp > 0 && u.hp < u.max && !u.card.cart && dist(u, sp) < sp.r) { u.hp = Math.min(u.max, u.hp + u.max * SPRING_HEAL); any = true; }
    if (any) state.fx.push({ type: 'ring', x1: sp.x, y1: sp.y, r: sp.r, life: 0.6, color: '#6fd0ff', fill: true });
  }
}
function updateHandSwap(dt) { // mutador "Mano inestable": cada cierto tiempo una carta de tu mano se cambia sola
  if (!state.mods.handSwap || !state.queue.length) return;
  state.swapT -= dt;
  if (state.swapT > 0) return;
  state.swapT = state.mods.handSwap;
  const i = Math.floor(Math.random() * state.hand.length);
  state.queue.push(state.hand[i]); state.hand[i] = state.queue.shift(); state.dealt = { slot: i, t: state.t };
  state.fx.push({ type: 'text', x1: W / 2, y1: 600, text: '🔀 ¡Carta cambiada!', life: 1.4, ability: true });
}

// ---------- Señales y emotes (Fase F) ----------
// Cosméticas: no cambian el combate. En los duelos el rival simulado responde con un emote.
const SIGNALS = {
  hello: { icon: '👋', text: '¡Hola!', art: 'emote_saludo' }, go: { icon: '🔥', text: '¡Vamos!', art: 'emote_enfado' }, oops: { icon: '😮', text: '¡Ups!', art: 'emote_asombro' }, gg: { icon: '👏', text: '¡Buen juego!', art: 'emote_gg' },
  laugh: { icon: '😄', text: '¡Ja, ja!', art: 'emote_risa' }, cry: { icon: '😭', text: 'Uf…', art: 'emote_llanto' }, warn: { icon: '⚠', text: '¡Cuidado!', art: 'emote_aviso' }, thanks: { icon: '🙏', text: '¡Gracias!', art: 'emote_gracias' },
  ping: { icon: '📍', text: 'Aquí' },
};
const SIGNAL_COOLDOWN = 3;
function sendSignal(kind, x, y) {
  if (!state || state.over || !SIGNALS[kind] || state.sigCd > 0) return false;
  const S = SIGNALS[kind]; state.sigCd = SIGNAL_COOLDOWN; state.stats.signals = (state.stats.signals || 0) + 1;
  if (kind === 'ping') state.signals.push({ side: 0, kind, icon: S.icon, text: S.text, x: Math.max(20, Math.min(W - 20, x)), y: Math.max(40, Math.min(H - 40, y)), t: 4, life: 4 });
  else state.signals.push({ side: 0, kind, icon: S.icon, text: S.text, x: W / 2, y: 690, t: 2.6, life: 2.6 });
  ev('ui');
  if (state.duel && kind !== 'ping') state.replyT = 1.2 + Math.random() * 1.2; // el rival responde
  return true;
}
function updateSignals(dt) {
  state.sigCd = Math.max(0, state.sigCd - dt);
  for (const s of state.signals) s.t -= dt;
  state.signals = state.signals.filter(s => s.t > 0);
  if (state.replyT > 0) {
    state.replyT -= dt;
    if (state.replyT <= 0) {
      const eb = state.buildings.find(b => b.kind === 'base' && b.side === 1), pb = state.buildings.find(b => b.kind === 'base' && b.side === 0);
      const winning = eb && pb && eb.hp / eb.max >= pb.hp / pb.max, k = winning ? 'go' : 'oops', S = SIGNALS[k];
      state.signals.push({ side: 1, kind: k, icon: winning ? '😎' : S.icon, text: winning ? '¡Vamos!' : '¡Ups!', x: W / 2, y: 120, t: 2.6, life: 2.6 });
    }
  }
}

// ---------- Cofres del mapa e interactuables ----------
// Posiciones libres al lado interior de los carriles; los cofres de campamento aparecen bloqueados hasta despejarlo.
const CHEST_SPOTS = [{ x: 182, y: 300 }, { x: 298, y: 380 }, { x: 182, y: 470 }, { x: 298, y: 540 }, { x: 182, y: 610 }, { x: 298, y: 260 }];
function setupChests(mission) {
  const n = mission.chests !== undefined ? mission.chests : 2;
  const spots = CHEST_SPOTS.slice();
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  for (const s of spots.slice(0, n)) state.chests.push({ x: s.x, y: s.y, opened: false, locked: false, camp: null, t: 0 });
  state.camps.forEach((cp, i) => {
    if (!mission.camps[i].chest) return;
    state.chests.push({ x: cp.x + (mission.camps[i].lane === 0 ? 62 : -62), y: cp.y - 22, opened: false, locked: true, camp: cp, t: 0 });
  });
}

function updateChests(dt) {
  for (const c of state.chests) {
    if (c.opened) { c.t += dt; continue; }
    if (c.camp) c.locked = !c.camp.cleared;
    if (c.locked) continue;
    if (state.units.some(u => u.side === 0 && u.hp > 0 && !u.card.cart && dist(u, c) < 42)) openMapChest(c);
  }
}

// Recompensas del cofre: energía, curación, aliados, monedas al final de la batalla o... un mímico.
function openMapChest(c) {
  c.opened = true; state.stats.chests++; ev('capture');
  state.fx.push({ type: 'vfx', name: 'chest_open', x1: c.x, y1: c.y - 10, size: 96, life: 0.9 }); fxv('chest_light', c.x, c.y - 14, 110, 1.0);
  const say = text => state.fx.push({ type: 'text', x1: c.x, y1: c.y - 46, text, life: 1.5 });
  const r = Math.random();
  if (r < 0.35) { state.gold = Math.min(MAX_GOLD, state.gold + 4); say('+4 energía'); }
  else if (r < 0.55) { for (const u of state.units) if (u.side === 0) u.hp = Math.min(u.max, u.hp + u.max * 0.4); say('¡Curación!'); }
  else if (r < 0.75) {
    const pool = state.deck.filter(d => !d.flying && d.ready), lane = nearestLane(c.x);
    for (let i = 0; i < 2 && pool.length; i++) { const d = pick(pool); spawnUnit(0, d, clampLane(lane, c.y, c.x + (i - 0.5) * 16), c.y, lane, -1, levelMult(state.levels[d.id])); }
    say('¡Aliados!');
  } else if (r < 0.9) { state.bonusCoins += 30; say('+30 monedas'); }
  else { // mímico: el cofre estaba vivo
    const pool = state.mission.wave.pool.length ? state.mission.wave.pool : ['ordu_grunt'], lane = nearestLane(c.x);
    for (let i = 0; i < 3; i++) spawnUnit(1, CARD[pick(pool)], c.x + (i - 1) * 16, c.y - 10, lane, 1, state.mission.foeMult * 0.8);
    say('¡Era un mímico!');
  }
}

// ---------- Disparadores de mapa ----------
// when: { time | campCleared | chests | points | kills | mined | boss }   do: [{ text, spawn:{ids,lane|lanes,y,side?,mult?}, energy, heal }]
function trigWhen(w) {
  if (!w) return false;
  if (w.time !== undefined) return state.t >= w.time;
  if (w.campCleared !== undefined) return !!(state.camps[w.campCleared] && state.camps[w.campCleared].cleared);
  if (w.chests !== undefined) return state.stats.chests >= w.chests;
  if (w.points !== undefined) return state.points.filter(p => p.owner === 0).length >= w.points;
  if (w.kills !== undefined) return state.stats.kills >= w.kills;
  if (w.switches !== undefined) return (state.stats.switches || 0) >= w.switches;
  if (w.mined !== undefined) return state.stats.mined >= w.mined;
  if (w.boss) return state.bossesSpawned.length > 0;
  return false;
}
function doTrigger(a) {
  if (a.text) { ev('boss'); state.fx.push({ type: 'text', x1: W / 2, y1: 330, text: a.text, life: 2.2, big: true }); }
  if (a.energy) state.gold = Math.min(MAX_GOLD, state.gold + a.energy);
  if (a.heal) for (const u of state.units) if (u.side === 0) u.hp = Math.min(u.max, u.hp + u.max * a.heal);
  if (a.spawn) {
    const s = a.spawn, side = s.side === 0 ? 0 : 1, mult = s.mult || (side === 1 ? state.mission.foeMult * 0.9 : 1);
    for (const lane of (s.lanes || [s.lane])) s.ids.forEach((id, i) => {
      const y = s.y + i * 14 * (side === 1 ? 1 : -1);
      spawnUnit(side, CARD[id], laneX(lane, y), y, lane, side === 1 ? 1 : -1, mult);
    });
  }
}
function runTriggers() {
  for (const t of state.triggers) { if (t.fired || !trigWhen(t.when)) continue; t.fired = true; for (const a of t.do) doTrigger(a); }
}

const NO_TALENTS = { hp: 1, dmg: 1, spd: 1, cd: 1, range: 1, heal: 1, mine: 1, bldg: 1, armor: 0, cost: 0, extra: 0, ls: 0, shield: 0, deathBlast: 0, splash: 0, slow: 0, stunEvery: 0, chain: 0, sunder: 0, cheat: 0 };
const tfOf = card => (state.tfx && state.tfx[card.id]) || NO_TALENTS;
// Coste real de una carta con sus talentos (mínimo 1). La interfaz lo usa para mostrar el coste y saber si hay energía.
function cardCost(card) { return Math.max(1, card.cost + tfOf(card).cost); }
// Alcance real de una unidad (talentos incluidos).
const urange = u => u.card.range * (u.tf ? u.tf.range : 1);

// Calentamiento: una mini recién desplegada tarda un rato en poder usar su habilidad (≈35% de su enfriamiento).
const abilityWarm = card => card.ability ? (card.ability.warm !== undefined ? card.ability.warm : Math.round(card.ability.cd * 0.35)) : 3;

function mkUnit(side, card, x, y, lane, dir, mult) {
  const m = mult || 1, md = state.mods, tf = side === 0 ? tfOf(card) : (state.foeTf && !card.boss && !card.cart ? state.foeTf : NO_TALENTS); // los enemigos heroicos pueden llevar talentos
  const hpM = m * (side === 0 ? md.allyHp : md.foeHp) * tf.hp, dmgM = m * (side === 0 ? md.allyDmg : 1) * tf.dmg;
  return { id: state.uid++, side, card, x, y, lane, dir, hp: card.hp * hpM, max: card.hp * hpM, dmg: card.dmg * dmgM, spd: (side === 0 ? md.allySpeed : md.foeSpeed) * tf.spd,
    tf, xarmor: tf.armor, cdMul: tf.cd, shieldHp: card.hp * hpM * tf.shield,
    t: Math.random() * card.cd, stun: 0, slow: 0, haste: 0, ward: 0, rage: 0, reveal: 0, hits: 0, charging: !!card.charge,
    silence: 0, sunder: 0, immune: 0, abCd: abilityWarm(card) + Math.random() * 1.5, cheated: false, cb: undefined,
    face: side === 0 ? -1 : 1, atkT: 0, hitT: 0, moving: false, sumT: 6 + Math.random() * 3, abT: 5, abIdx: 0, born: state.t };
}

function spawnUnit(side, card, x, y, lane, dir, mult, opts) {
  const u = mkUnit(side, card, x, y, lane, dir, mult);
  if (opts && opts.camp) {
    u.camp = opts.camp; u.home = { x, y }; opts.camp.alive++;
    const b = opts.behavior || 'sleep'; // dormido (por defecto), patrulla ida y vuelta o deambula; los dos últimos están despiertos
    u.asleep = b === 'sleep'; u.patrol = b === 'patrol'; u.wander = b === 'wander';
  }
  state.units.push(u);
  return u;
}

// Posiciones de despliegue según la formación de la ficha.
function formationOffsets(card, extra) {
  const n = card.count + (extra || 0);
  if (n === 1) return [[0, 0]];
  if (card.formation === 'triangle' && n === 3) return [[0, -12], [-14, 8], [14, 8]];
  return Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * 18, 0]);
}

function inDeployArea(x, y) {
  if (y >= DEPLOY_BASE_Y && y <= H - 20) return true;
  return state.zones.some(z => Math.hypot(x - z.x, y - z.y) <= OUTPOST_R);
}

function deploy(card, x, y) {
  const cost = cardCost(card);
  if (!card.ready || state.gold < cost || !inDeployArea(x, y)) return false;
  state.gold -= cost; state.stats.deployed++; ev('deploy');
  const by = state.stats.by || (state.stats.by = {}); by[card.id] = (by[card.id] || 0) + 1; // cuántas veces se despliega cada mini (da XP de mini)
  const lane = nearestLane(x), m = levelMult(state.levels[card.id]);
  for (const [ox, oy] of formationOffsets(card, tfOf(card).extra)) {
    const ux = card.flying ? x + ox : clampLane(lane, y, x + ox);
    spawnUnit(0, card, ux, y + oy, lane, -1, m);
  }
  state.fx.push({ type: 'ring', x1: x, y1: y, r: 26, life: 0.3, color: '#7fb0ff' });
  return true;
}

// Ranuras 0..3 = mano. El mazo + el enano minero rotan juntos.
function slotCard(i) { return state.hand[i]; }
function deployFromSlot(i, x, y) {
  const card = slotCard(i);
  if (!card || !deploy(card, x, y)) return false;
  if (state.mods.recallChance && Math.random() < state.mods.recallChance) { // reliquia Retorno: la carta no rota
    state.fx.push({ type: 'text', x1: x, y1: y - 40, text: '↩ ¡Vuelve a tu mano!', life: 1.2, ability: true }); state.stats.recalls = (state.stats.recalls || 0) + 1; return true;
  }
  if (state.queue.length) { // la carta jugada va al final de la cola y entra la siguiente
    state.queue.push(state.hand[i]);
    state.hand[i] = state.queue.shift();
    state.dealt = { slot: i, t: state.t };
  }
  return true;
}

// ---------- Minas y minero ----------
// Reemplazar mini (Fase E): paga 1 de energía para devolver una carta de la mano al final de la cola y robar la siguiente.
const REPLACE_COST = 1, OVERTIME_S = 60; // el tiempo extra solo existe en los duelos
function replaceSlot(i) {
  if (!state || state.over || state.paused || !state.queue.length || !state.hand[i] || state.gold < REPLACE_COST) return false;
  state.gold -= REPLACE_COST;
  state.queue.push(state.hand[i]); state.hand[i] = state.queue.shift();
  state.dealt = { slot: i, t: state.t }; state.stats.replaced = (state.stats.replaced || 0) + 1;
  ev('deploy');
  return true;
}

function unitAlive(id) { return state.units.some(e => e.id === id); }

// El enano minero va solo a la mina libre más cercana y trabaja allí.
// - Si lo atacan y no está recolectando oro, se defiende (combate normal); mientras recolecta en una mina con oro, no deja el trabajo.
// - Si su mina se queda sin oro, busca otra con reserva; si no hay, sigue avanzando por su carril (atacando lo que encuentre,
//   edificios enemigos incluidos) hasta dar con otra mina libre o con una edificación enemiga.
// Devuelve true si el minero ya ha hecho su turno; false si debe actuar como una tropa normal (combatir o avanzar).
const MINER_ALERT = 4; // segundos que dura el "me están atacando" tras recibir un golpe
const mineUsable = (m, u) => !m.locked && m.reserve >= 5 && m !== u.skipMine && !(m.claim && m.claim !== u.id && unitAlive(m.claim));
function mineStep(u, dt) {
  let mine = u.mine && !u.mine.locked ? u.mine : null;
  const working = !!(u.mining && mine && mine.reserve >= 1 && dist(u, mine) <= 48);
  if (u.cb !== undefined && state.t - u.cb < MINER_ALERT && !working) { u.mining = false; return false; } // lo atacan y no recolecta: contraataca
  if (mine && mine.reserve < 1) { // su mina está agotada: se va a otra con reserva
    const alt = state.mines.find(m => m !== mine && mineUsable(m, u));
    mine.claim = null; mine.miner = null; u.skipMine = mine; u.mine = null; mine = null;
    if (alt) { mine = alt; alt.claim = u.id; u.mine = alt; u.lane = nearestLane(alt.x); u.advancing = false; }
    else u.advancing = true; // ninguna otra: sigue avanzando
  }
  if (!mine) {
    let bd = 1e9;
    for (const m of state.mines) {
      if (!mineUsable(m, u)) continue;
      const d = dist(u, m) + Math.abs(nearestLane(m.x) - u.lane) * 80;
      if (d < bd) { mine = m; bd = d; }
    }
    if (mine) { mine.claim = u.id; u.mine = mine; u.lane = nearestLane(mine.x); u.advancing = false; }
  }
  u.mining = false;
  if (!mine) return !u.advancing; // sin minas libres: espera, salvo que venga de una mina agotada (entonces avanza)
  if (dist(u, mine) > 48) { moveToward(u, mine.x, mine.y, dt); return true; }
  u.face = mine.x >= u.x ? 1 : -1; u.mining = true; mine.miner = u.id;
  return true;
}

// ---------- Combate ----------
function validTarget(u, e) {
  if (e.card && e.card.flying && !u.card.targetsAir) return false;
  if (u.card.buildingsOnly && e.card) return false;
  if (e.card && e.card.stealth && e.reveal <= 0 && dist(u, e) > 45) return false;
  if (e.card && hiddenInBrush(e, u)) return false;
  return true;
}

function pickTarget(u) {
  const aggro = urange(u) + 80;
  let best = null, bd = 1e9;
  for (const e of state.units) {
    if (e.side === u.side || !e.card.taunt || !validTarget(u, e)) continue;
    const d = dist(u, e);
    if (d < 95 && d < bd) { best = e; bd = d; }
  }
  if (best) return best;
  for (const e of state.units) {
    if (e.side === u.side || !validTarget(u, e)) continue;
    const d = dist(u, e);
    if (d < aggro && d < bd) { best = e; bd = d; }
  }
  if (best) return best;
  for (const b of state.buildings) {
    if (b.side === u.side) continue;
    const d = dist(u, b) - b.r;
    if (d < aggro && d < bd) { best = b; bd = d; }
  }
  return best;
}

function hit(target, dmg, dtype) { // dtype: 'phys' (por defecto), 'magic' (ignora la armadura) o 'siege'; cada mini puede resistir o sufrir más cada tipo
  if (target.immune > 0) return; // inmunidad temporal (Segunda oportunidad)
  // Desgarro: -30% de armadura mientras dure; la armadura puede quedar negativa (hasta -30%) y entonces recibe más daño.
  if (target.card) {
    const ar = dtype === 'magic' ? 0 : Math.max(-0.3, Math.min(0.6, (target.card.armor || 0) + (target.xarmor || 0) - (target.sunder > 0 ? 0.3 : 0))); if (ar) dmg *= 1 - ar;
    const rs = target.card.res && target.card.res[dtype || 'phys']; if (rs) dmg *= rs;
  }
  if (target.ward > 0) dmg *= 0.3;
  if (target.kind === 'tower' && target.side === 0 && state.towerVuln > 0) dmg *= 1.6;
  if (target.kind === 'base' && state.overtime) dmg *= 1.5; // en el tiempo extra las bases caen más rápido
  if (target.shieldHp > 0) { const ab = Math.min(target.shieldHp, dmg); target.shieldHp -= ab; dmg -= ab; } // escudo (talento Égida)
  target.hp -= dmg;
  if (target.card) { target.hitT = 0.18; target.cb = state.t; }
  if (target.camp && target.asleep) wakeCamp(target.camp);
  if (dmg >= 40) state.fx.push({ type: 'text', x1: target.x, y1: target.y - 14, text: String(Math.round(dmg)), life: 0.5 });
}

function wakeCamp(camp) { for (const u of state.units) if (u.camp === camp) u.asleep = false; }

function attack(u, tgt) {
  const c = u.card, tf = u.tf || NO_TALENTS;
  let dmg = u.dmg;
  if (u.charging) { dmg *= 2.5; u.charging = false; }
  if (u.rage > 0) dmg *= 1.3;
  if (tgt.kind) dmg *= (c.siege || 1) * tf.bldg;
  u.atkT = 0.45; u.reveal = c.stealth ? 1.5 : 0;
  u.face = tgt.x >= u.x ? 1 : -1;
  hit(tgt, dmg, c.dtype); ev('hit'); u.cb = state.t;
  if (tf.ls) u.hp = Math.min(u.max, u.hp + dmg * tf.ls); // sed de sangre
  const splash = Math.max(c.splash, tf.splash), slow = Math.max(c.slow, tf.slow), every = c.stunEvery || tf.stunEvery;
  if (splash) for (const e of state.units) if (e.side !== u.side && e !== tgt && !(e.card.flying && !c.targetsAir) && dist(e, tgt) < splash) hit(e, dmg * 0.6, c.dtype);
  if (slow && tgt.card) tgt.slow = Math.max(tgt.slow, slow);
  if (every && tgt.card && ++u.hits % every === 0) tgt.stun = c.stunEvery ? 1.1 : 0.8;
  if (tf.sunder && tgt.card) tgt.sunder = Math.max(tgt.sunder, tf.sunder);
  const jumps = (c.chain || 0) + tf.chain; // rayo encadenado: salta a enemigos cercanos con el 60% del daño
  if (jumps && tgt.card) {
    let last = tgt; const done = [tgt];
    for (let j = 0; j < jumps; j++) {
      let nxt = null, bd = 75;
      for (const e of state.units) { if (e.side === u.side || done.includes(e) || e.hp <= 0 || !validTarget(u, e)) continue; const d = dist(e, last); if (d < bd) { nxt = e; bd = d; } }
      if (!nxt) break;
      hit(nxt, dmg * 0.6, c.dtype); done.push(nxt);
      state.fx.push({ type: 'shot', x1: last.x, y1: last.y, x2: nxt.x, y2: nxt.y, life: 0.2, side: u.side });
      fxv('lightning_chain', (last.x + nxt.x) / 2, (last.y + nxt.y) / 2 - 8, Math.max(64, dist(last, nxt) * 1.5), 0.45); last = nxt;
    }
  }
  state.fx.push({ type: c.ranged ? 'shot' : 'hit', x1: u.x, y1: u.y, x2: tgt.x, y2: tgt.y, life: 0.2, side: u.side });
  if (splash) state.fx.push({ type: 'vfx', name: 'impact_magic', x1: tgt.x, y1: tgt.y, size: splash * 2.4, life: 0.5 });
}

function moveToward(u, ax, ay, dt) {
  const c = u.card, dx = ax - u.x, dy = ay - u.y, l = Math.hypot(dx, dy) || 1;
  let sp = c.speed * dt * (u.spd || 1);
  if (u.leash) sp *= 1.6;
  if (u.slow > 0) sp *= 0.55;
  if (u.haste > 0) sp *= 1.5;
  if (u.charging) sp *= 1.7;
  const ox = u.x, oy = u.y;
  u.x += (dx / l) * sp; u.y += (dy / l) * sp;
  if (!c.flying && !u.camp) u.x = clampLane(u.lane, u.y, u.x);
  if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
  u.moving = Math.hypot(u.x - ox, u.y - oy) > 0.05;
}

function followLane(u, dt) {
  const node = nextNode(u);
  if (node) return moveToward(u, node[0], node[1], dt);
  const b = state.buildings.find(b => b.kind === 'base' && b.side !== u.side);
  if (b) moveToward(u, b.x, b.y, dt);
}

// ---------- Estados de posición y habilidades automáticas de las minis ----------
// Todas las habilidades se lanzan solas (con IA sencilla) y valen igual para aliados y enemigos. El silencio las bloquea.
const canHit = (u, e) => !(e.card.flying && !u.card.targetsAir);
const foesAlive = u => state.units.filter(e => e.side !== u.side && e.hp > 0);
const foesWithin = (u, r, from) => foesAlive(u).filter(e => canHit(u, e) && dist(e, from || u) < r);
function clampArena(e) {
  e.y = Math.max(75, Math.min(745, e.y));
  e.x = (!e.card.flying && !e.camp) ? clampLane(e.lane, e.y, e.x) : Math.max(8, Math.min(W - 8, e.x));
}
function pushUnit(e, fx, fy, d) { // empujar: los jefes son inamovibles
  if (e.card.boss) return;
  const dx = e.x - fx, dy = e.y - fy, l = Math.hypot(dx, dy) || 1;
  e.x += dx / l * d; e.y += dy / l * d; clampArena(e);
}
function pullUnit(e, tx, ty, d) { // atraer hacia un punto sin pasar de largo
  if (e.card.boss) return;
  const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy) || 1, k = Math.min(d, l - 10);
  if (k <= 0) return;
  e.x += dx / l * k; e.y += dy / l * k; clampArena(e);
}
function blinkTo(u, x, y) { // parpadeo: se teletransporta dejando un destello en origen y destino
  state.fx.push({ type: 'ring', x1: u.x, y1: u.y, r: 16, life: 0.3, color: '#b8a0ff' });
  u.x = x; u.y = y; clampArena(u);
  state.fx.push({ type: 'ring', x1: u.x, y1: u.y, r: 22, life: 0.35, color: '#e0d4ff' });
}
function areaHit(u, center, r, dmg) {
  for (const e of foesWithin(u, r, center)) hit(e, dmg);
  state.fx.push({ type: 'vfx', name: 'impact_magic', x1: center.x, y1: center.y, size: r * 2.4, life: 0.5 });
}
const sideFace = (u, t) => (t.x >= u.x ? 1 : -1);
const ABILITIES = {
  shieldwall: { want: u => u.hp < u.max * 0.65 && foesWithin(u, 75).length >= 1, cast: u => { u.ward = 3; fxv('shield', u.x, u.y - 10, 72, 0.9); } },
  volley: { want: u => { const t = pickTarget(u); return t && t.card && foesWithin(u, 48, t).length >= 2 && t; }, cast: (u, t) => areaHit(u, t, 48, u.dmg * 1.2) },
  dive: { want: u => { const t = pickTarget(u); return t && t.card && dist(u, t) > 55 && dist(u, t) < 160 && t; }, cast: (u, t) => { fxv('blink', u.x, u.y, 64, 0.5); blinkTo(u, t.x - sideFace(u, t) * 18, t.y + 14); hit(t, u.dmg * 2); } },
  nova: { want: u => foesWithin(u, 58).length >= 1, cast: u => { for (const e of foesWithin(u, 58)) { hit(e, u.dmg * 0.8); pushUnit(e, u.x, u.y, 45); } state.fx.push({ type: 'ring', x1: u.x, y1: u.y, r: 58, life: 0.5, color: '#9ad0ff', fill: true }); } },
  prayer: { want: u => state.units.filter(e => e.side === u.side && e.hp < e.max * 0.75 && dist(e, u) < 95).length >= 2, cast: u => { for (const e of state.units) if (e.side === u.side && dist(e, u) < 95) { e.hp = Math.min(e.max, e.hp + e.max * 0.25); state.fx.push({ type: 'vfx', name: 'heal', x1: e.x, y1: e.y - 8, size: 50, life: 0.6 }); } } },
  warcry: { want: u => foesWithin(u, 150).length >= 1, cast: u => { fxv('haste', u.x, u.y, 120, 0.9); for (const e of state.units) if (e.side === u.side && dist(e, u) < 90) e.haste = 4; state.fx.push({ type: 'ring', x1: u.x, y1: u.y, r: 90, life: 0.5, color: '#ffd060', fill: true }); } },
  barrel: { want: u => { const t = pickTarget(u); return t && t.card && dist(u, t) < urange(u) + 30 && t; }, cast: (u, t) => areaHit(u, t, 52, u.dmg * 1.6) },
  sunderspear: { want: u => { const t = pickTarget(u); return t && t.card && t.sunder <= 0 && dist(u, t) < urange(u) + 40 && t; }, cast: (u, t) => { t.sunder = 4; hit(t, u.dmg * 0.8); fxv('armor_tear', t.x, t.y - 8, 60, 0.7); } },
  dash: { want: u => { const t = pickTarget(u); const d = t ? dist(u, t) : 0; return t && t.card && d > 45 && d < 140 && t; }, cast: (u, t) => { blinkTo(u, t.x - sideFace(u, t) * 16, t.y + 12); t.stun = Math.max(t.stun, 0.8); hit(t, u.dmg * 1.3); } },
  stomp: { want: u => foesWithin(u, 62).filter(e => !e.card.flying).length >= 2, cast: u => { fxv('ground_slam', u.x, u.y, 140, 0.8); for (const e of foesWithin(u, 62)) if (!e.card.flying) { hit(e, u.dmg * 0.7); e.stun = Math.max(e.stun, 1); pushUnit(e, u.x, u.y, 30); } state.fx.push({ type: 'vfx', name: 'impact_physical', x1: u.x, y1: u.y, size: 130, life: 0.5 }); } },
  bonehook: { want: u => foesAlive(u).find(e => !e.card.flying && !e.card.boss && !e.camp && dist(e, u) > 85 && dist(e, u) < 160 && canHit(u, e)), cast: (u, e) => { pullUnit(e, u.x, u.y, 70); e.stun = Math.max(e.stun, 0.5); state.fx.push({ type: 'shot', x1: u.x, y1: u.y, x2: e.x, y2: e.y, life: 0.3, side: u.side }); } },
  silence: { want: u => foesAlive(u).find(e => e.silence <= 0 && !e.asleep && dist(e, u) < urange(u) + 30 && (e.card.ability || e.card.summons || e.card.boss || e.card.heal)), cast: (u, e) => { fxv('silence', e.x, e.y - 8, 64, 0.8); e.silence = 3; } },
  rend: { want: u => { const t = pickTarget(u); const d = t ? dist(u, t) : 0; return t && t.card && d > 40 && d < 170 && t; }, cast: (u, t) => { blinkTo(u, t.x + sideFace(u, t) * 16, t.y + (u.side === 0 ? -16 : 16)); t.sunder = 4; hit(t, u.dmg); } },
  frostbreath: { want: u => foesWithin(u, 105).filter(e => Math.abs(e.x - u.x) < 70 && (u.y - e.y) * (u.side === 0 ? 1 : -1) > -10).length >= 1,
    cast: u => { for (const e of foesWithin(u, 105)) if (Math.abs(e.x - u.x) < 70 && (u.y - e.y) * (u.side === 0 ? 1 : -1) > -10) { hit(e, u.dmg * 0.9); e.slow = Math.max(e.slow, 3); } state.fx.push({ type: 'vfx', name: 'slow', x1: u.x, y1: u.y + (u.side === 0 ? -50 : 50), size: 150, life: 0.7 }); } },
};
function tryAbility(u, dt) {
  const ab = u.card.ability;
  if (!ab || u.silence > 0) return;
  u.abCd -= dt;
  if (u.abCd > 0) return;
  const def = ABILITIES[ab.id], t = def && def.want(u);
  if (!t) { u.abCd = 0.4; return; } // no hay ocasión: reintenta enseguida sin gastar el enfriamiento
  def.cast(u, t === true ? null : t);
  u.abCd = ab.cd; u.atkT = 0.5; if (t && t.x !== undefined) u.face = sideFace(u, t);
  state.fx.push({ type: 'text', x1: u.x, y1: u.y - 48, text: ab.name, life: 1.0, ability: true }); ev('ability');
}

// Neutrales despiertos sin objetivo: patrullan de ida y vuelta o deambulan cerca de su campamento.
function neutralWalk(u, dt) {
  if (u.patrol) {
    const far = { x: u.home.x, y: u.home.y - 70 };
    if (!u.wp) u.wp = far;
    if (dist(u, u.wp) < 6) u.wp = u.wp === far || u.wp.y < u.home.y - 35 ? { x: u.home.x, y: u.home.y } : far;
    moveToward(u, u.wp.x, u.wp.y, dt * 0.55);
  } else if (u.wander) {
    u.pt = (u.pt || 0) - dt;
    if (u.pt <= 0 || !u.wp) { u.wp = { x: u.home.x + (Math.random() - 0.5) * 70, y: u.home.y + (Math.random() - 0.5) * 50 }; u.pt = 2 + Math.random() * 2; }
    if (dist(u, u.wp) > 4) moveToward(u, u.wp.x, u.wp.y, dt * 0.5);
  }
}

function updateUnit(u, dt) {
  const c = u.card;
  u.moving = false;
  u.t -= dt * (u.haste > 0 ? 1.5 : 1);
  for (const k of ['slow', 'haste', 'ward', 'rage', 'reveal', 'atkT', 'hitT', 'silence', 'sunder', 'immune']) if (u[k] > 0) u[k] -= dt;
  if (c.rage && u.hp < u.max * 0.5) u.haste = Math.max(u.haste, 0.2);
  if (c.boss) bossPhase(u); // las fases cambian aunque esté aturdido
  if (u.hp > 0 && u.hp < u.max && !u.camp && !c.boss && !c.cart && state.t - (u.cb !== undefined ? u.cb : u.born) > REGEN_AFTER) u.hp = Math.min(u.max, u.hp + u.max * REGEN_RATE * dt); // fuera de combate se recupera solo
  if (u.stun > 0) { u.stun -= dt; return; }

  if (u.camp) { // creeps: dormidos, con correa a su campamento
    if (u.asleep) {
      for (const e of state.units) if (e.side === 0 && !e.card.cart && dist(u, e) < 85) { wakeCamp(u.camp); break; } // la carreta no despierta a los neutrales
      if (u.asleep) return;
    }
    if (dist(u, u.home) > 190) u.leash = true;
    if (u.leash) {
      moveToward(u, u.home.x, u.home.y, dt);
      u.hp = Math.min(u.max, u.hp + u.max * 0.15 * dt);
      if (dist(u, u.home) < 6) { u.leash = false; u.asleep = !(u.patrol || u.wander); u.hp = u.max; }
      return;
    }
  }

  if (c.cart) { cartStep(u, dt); return; }

  tryAbility(u, dt);

  if (c.summons && u.silence <= 0) { // Lich: invoca esqueletos cada pocos segundos (el silencio lo impide)
    u.sumT -= dt;
    if (u.sumT <= 0 && state.units.filter(e => e.summoner === u.id).length < 3) {
      u.sumT = 9;
      const s = spawnUnit(u.side, CARD[c.summons], u.x + (Math.random() - 0.5) * 26, u.y + (u.side === 0 ? -14 : 14), u.lane, u.dir, 0.45 * (u.max / c.hp));
      s.summoner = u.id;
      state.fx.push({ type: 'ring', x1: s.x, y1: s.y, r: 18, life: 0.4, color: '#7CFFB0' });
    }
  }

  if (c.boss && u.silence <= 0) {
    u.abT -= dt;
    const near = state.units.some(e => e.side !== u.side && dist(e, u) < 230) || state.buildings.some(b => b.side !== u.side && dist(b, u) < 260);
    if (u.abT <= 0 && near) { u.abT = u.abEvery || 8; castBoss(u, c.abilities[u.abIdx++ % c.abilities.length]); }
  }

  if (c.miner && mineStep(u, dt)) return; // si devuelve false, el minero actúa como una tropa normal (se defiende o avanza)

  if (c.heal) { // sacerdote: se queda junto al aliado más herido
    let best = null, br = 1;
    for (const e of state.units) {
      if (e.side !== u.side || e === u || e.hp >= e.max) continue;
      const r = e.hp / e.max;
      if (dist(u, e) < c.heal.range && r < br) { best = e; br = r; }
    }
    if (best) {
      if (u.t <= 0) {
        u.t = c.cd * u.cdMul; best.hp = Math.min(best.max, best.hp + c.heal.amount * u.tf.heal); u.atkT = 0.45;
        u.face = best.x >= u.x ? 1 : -1;
        state.fx.push({ type: 'vfx', name: 'heal', x1: best.x, y1: best.y - 8, size: 54, life: 0.6 });
      }
    } else followLane(u, dt);
    return;
  }

  const tgt = pickTarget(u);
  if (tgt) {
    const d = dist(u, tgt) - (tgt.r || c.r) - c.r;
    if (d <= urange(u)) { if (u.t <= 0) { u.t = c.cd * u.cdMul; attack(u, tgt); } else u.face = tgt.x >= u.x ? 1 : -1; }
    else moveToward(u, tgt.x, tgt.y, dt);
  } else if (u.guard) guardStep(u, dt); // el campeón de la cacería vuelve a su guarida
  else if (!u.camp) followLane(u, dt);
  else if (u.patrol || u.wander) neutralWalk(u, dt);
}

function update(dt) {
  if (!state || state.over || state.paused) return;
  dt *= state.speed;
  state.t += dt;
  state.towerVuln = Math.max(0, state.towerVuln - dt);
  state.gold = Math.min(MAX_GOLD, state.gold + BASE_GOLD_RATE * state.mods.goldBase * (state.overtime ? 1.5 : 1) * dt); // el tiempo extra acelera la energía de ambos
  state.leaderCd = Math.max(0, state.leaderCd - dt);

  for (const u of state.units) updateUnit(u, dt);

  for (const m of state.mines) { // una mina solo rinde mientras su minero está vivo y trabajando
    const mu = m.miner && state.units.find(u => u.id === m.miner && u.mining);
    if (!mu) { m.miner = null; if (!m.locked && m.reserve < m.max) m.reserve = Math.min(m.max, m.reserve + MINE_RECHARGE * dt); continue; } // sin minero se recarga
    let rate = MINE_RATE * state.mods.mineRate * (mu.tf ? mu.tf.mine : 1);
    if (m.reserve > 0.01) m.reserve = Math.max(0, m.reserve - rate * dt); else rate *= MINE_TRICKLE; // agotada: solo gotea
    state.gold = Math.min(MAX_GOLD, state.gold + rate * dt);
    state.stats.mined += rate * dt;
    m.acc += rate * dt;
    if (m.acc >= 1) { m.acc -= 1; ev('coin'); fxv('coin_pickup', m.x, m.y - 30, 44, 0.7); state.fx.push({ type: 'text', x1: m.x, y1: m.y - 34, text: '+1', life: 0.9, gold: true }); }
  }

  for (let i = 0; i < state.units.length; i++) { // separación
    for (let j = i + 1; j < state.units.length; j++) {
      const a = state.units[i], b = state.units[j];
      if (!!a.card.flying !== !!b.card.flying) continue;
      const d = dist(a, b), min = a.card.r + b.card.r;
      if (d > 0 && d < min) {
        const p = (min - d) / 2, nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
        a.x += nx * p; a.y += ny * p; b.x -= nx * p; b.y -= ny * p;
      }
    }
  }

  for (const b of state.buildings) {
    b.t -= dt;
    if (b.disabled > 0) { b.disabled -= dt; continue; } // torre apagada por un interruptor
    if (b.t > 0) continue;
    let best = null, bd = b.range;
    for (const e of state.units) {
      if (e.side === b.side || e.asleep || (e.card.stealth && e.reveal <= 0 && dist(b, e) > 45) || hiddenInBrush(e, b)) continue;
      const d = dist(b, e);
      if (d < bd) { best = e; bd = d; }
    }
    if (best) {
      b.t = b.cd; hit(best, b.dmg);
      state.fx.push({ type: 'shot', x1: b.x, y1: b.y - 20, x2: best.x, y2: best.y, life: 0.2, tower: true });
    }
  }

  applyRules(dt);
  updatePoints(dt); updateChests(dt); updateSwitches(dt); updateSignals(dt); updatePeriodics(dt); updateHandSwap(dt); runTriggers();

  // "Segunda oportunidad" (talento o rasgo): en lugar de morir una vez, queda al 35% de vida con 2 s de inmunidad.
  for (const u of state.units) {
    if (u.hp > 0 || u.cheated || !((u.tf && u.tf.cheat) || u.card.cheatDeath)) continue;
    u.cheated = true; u.hp = u.max * 0.35; u.immune = 2; u.stun = 0;
    state.fx.push({ type: 'ring', x1: u.x, y1: u.y, r: 30, life: 0.6, color: '#ffd860', fill: true });
    state.fx.push({ type: 'text', x1: u.x, y1: u.y - 44, text: '¡Resiste!', life: 1.0, ability: true }); ev('capture');
  }

  // Talento "Último aliento": la explosión se resuelve antes de contar las muertes para que sus bajas cuenten.
  for (const u of state.units) {
    if (u.hp > 0 || u.side !== 0 || !u.tf || !u.tf.deathBlast || u.blasted) continue;
    u.blasted = true;
    for (const e of state.units) if (e.side !== 0 && e.hp > 0 && dist(e, u) < 50) hit(e, u.tf.deathBlast);
    state.fx.push({ type: 'vfx', name: 'impact_magic', x1: u.x, y1: u.y, size: 110, life: 0.5 }); ev('boom');
  }

  // Muertes: cadáver con animación, campamentos despejados, edificios destruidos.
  for (const u of state.units) {
    if (u.hp > 0) continue;
    if (u.camp) u.camp.alive--;
    if (u.side === 1) { state.stats.kills++; if (u.card.boss) { state.stats.bossKilled = true; ev('bossdown'); fxv('death_smoke', u.x, u.y - 20, 150, 1.1); } }
    if (u.champion && state.hunt) state.hunt.dead = true;
    state.corpses.push({ card: u.card, x: u.x, y: u.y, t: 0, face: u.face, side: u.side });
    if (u.side === 1 && !u.card.boss) { state.deadFoes.push({ card: u.card, mult: u.max / u.card.hp, lane: u.lane, x: u.x, y: u.y }); if (state.deadFoes.length > 4) state.deadFoes.shift(); }
  }
  state.units = state.units.filter(u => u.hp > 0);
  for (const cp of state.camps) {
    const rs = state.mission.campRespawn;
    if (cp.cleared && rs && cp.rs) updateRespawn(cp, rs);
    if (!cp.cleared && cp.alive <= 0) {
      cp.cleared = true; cp.mine.locked = false; ev('capture'); // la mina queda libre para el enano minero
      if (rs) cp.rs = { next: state.t + rs.every, n: 0, active: false };
      state.zones.push({ x: cp.x, y: cp.y });
      state.fx.push({ type: 'vfx', name: 'tower_capture', x1: cp.x, y1: cp.y, size: 140, life: 0.9 });
      if (cp.tower) captureTower(cp);
    }
  }
  state.buildings = state.buildings.filter(b => {
    if (b.hp > 0) return true;
    if (b.side === 0 && b.kind === 'tower' && !b.captured) state.towersLost++; // las torres capturadas no cuentan para el objetivo
    if (b.kind === 'base' || b.kind === 'tower') state.ruins.push({ kind: b.kind, faction: b.faction, x: b.x, y: b.y, r: b.r, captured: !!b.captured, t: 0 }); // queda el escombro
    if (b.kind === 'nest') { state.gold = Math.min(MAX_GOLD, state.gold + NEST_BOUNTY); state.stats.nests = (state.stats.nests || 0) + 1; state.fx.push({ type: 'text', x1: b.x, y1: b.y - 40, text: '¡Nido destruido! +' + NEST_BOUNTY + '⚡', life: 1.6, gold: true }); }
    ev('boom');
    state.fx.push({ type: 'vfx', name: 'base_hit', x1: b.x, y1: b.y, size: 130, life: 0.8 });
    return false;
  });
  for (const f of state.fx) f.life -= dt;
  state.fx = state.fx.filter(f => f.life > 0);
  for (const k of state.corpses) k.t += dt;
  state.corpses = state.corpses.filter(k => k.t < 1.6);

  spawnWaves(dt);
  endCheck();
}

// Al despejar un campamento con torre neutral, esa torre pasa a ser tuya: dispara a los enemigos y los enemigos la atacan.
function captureTower(cp) {
  const hp = 900;
  state.buildings.push({ side: 0, kind: 'tower', captured: true, faction: 'humans', x: cp.x, y: cp.y - 26, hp, max: hp, dmg: TOWER_DMG * 0.8, range: 120, cd: 1.1, t: 0, r: 18 });
  state.fx.push({ type: 'text', x1: cp.x, y1: cp.y - 70, text: '¡Torre capturada!', life: 1.6 }); ev('capture');
}

// ---------- Reglas de evento (peligros del campo) ----------
function applyRules(dt) {
  const r = state.rules;
  if (!r) return;
  if (r.meteors) { // meteoros: un aviso de 1,3 s y luego daño a todo lo que haya debajo, de ambos bandos
    state.ruleT.meteors -= dt;
    if (state.ruleT.meteors <= 0) {
      state.ruleT.meteors = 7 + Math.random() * 4;
      const lane = Math.floor(Math.random() * 2), y = 180 + Math.random() * 420;
      state.meteors.push({ x: laneX(lane, y) + (Math.random() - 0.5) * 50, y, t: 1.3, t0: 1.3 });
    }
    for (const m of state.meteors) {
      m.t -= dt;
      if (m.t > 0) continue;
      m.done = true; ev('boom');
      state.fx.push({ type: 'vfx', name: 'meteor', x1: m.x, y1: m.y, size: 150, life: 0.8 });
      for (const u of state.units) if (Math.hypot(u.x - m.x, u.y - m.y) < 52) hit(u, u.card.boss ? 30 : 70);
      for (const b of state.buildings) if (Math.hypot(b.x - m.x, b.y - m.y) < 52 + b.r) hit(b, 40);
    }
    state.meteors = state.meteors.filter(m => !m.done);
  }
  if (r.blizzard) { // ventisca: congela un carril entero durante un momento
    state.ruleT.blizzard -= dt;
    if (state.ruleT.blizzard <= 0) {
      state.ruleT.blizzard = 18;
      const lane = Math.floor(Math.random() * 2);
      for (const u of state.units) if (!u.card.flying && u.lane === lane && u.y > 140 && u.y < 660) u.stun = Math.max(u.stun, 1.8);
      for (const y of [250, 400, 550]) state.fx.push({ type: 'vfx', name: 'blizzard', x1: laneX(lane, y), y1: y, size: 190, life: 0.9 });
      state.fx.push({ type: 'text', x1: laneX(lane, 400), y1: 380, text: '¡Ventisca!', life: 1.4 }); ev('leader');
    }
  }
}

// ---------- Oleadas y jefes ----------
const SURVIVAL_TIERS = [
  { from: 1, ids: ['ordu_grunt', 'undead_skeletons'] }, { from: 4, ids: ['ordu_raider', 'undead_lich', 'ordu_bomber'] },
  { from: 8, ids: ['ordu_wyvern', 'undead_wraith', 'undead_dragon'] }, { from: 12, ids: ['ordu_siege_beast'] },
];
// Supervivencia: oleadas sin fin cada vez más rápidas y fuertes; un jefe cada 5. Termina cuando cae tu base.
function spawnSurvival(dt) {
  const m = state.mission;
  state.waveTimer -= dt;
  if (state.waveTimer > 0) return;
  const n = ++state.waveNo;
  state.waveTimer = Math.max(8, 18 - n * 0.35) * state.mods.waveEvery;
  const pool = SURVIVAL_TIERS.filter(t => n >= t.from).flatMap(t => t.ids);
  const size = Math.min(10, 3 + Math.floor(n / 2)), mult = m.foeMult * (1 + 0.07 * n);
  const lanes = n % 3 === 0 ? [0, 1] : [Math.floor(Math.random() * 2)];
  for (const lane of lanes) for (let i = 0; i < size; i++) { const y = 110 + i * 16; spawnUnit(1, CARD[pick(pool)], laneX(lane, y), y, lane, 1, mult); }
  state.fx.push({ type: 'text', x1: W / 2, y1: 320, text: 'Oleada ' + n, life: 1.4 });
  if (n % 5 === 0) {
    const ids = Object.keys(BOSS), b = BOSS[ids[(n / 5 - 1) % ids.length]], lane = Math.floor(Math.random() * 2);
    spawnUnit(1, b, laneX(lane, 105), 105, lane, 1, mult * 0.8);
    ev('boss'); state.fx.push({ type: 'text', x1: W / 2, y1: 280, text: '¡' + b.name + '!', life: 2.2, big: true });
  }
}

// ---------- Duelo contra un rival simulado (Fase C) ----------
// El rival juega con las mismas reglas que tú: energía propia, mano de 4 cartas que rota y despliegue en su zona (arriba). Sin minas ni campamentos.
function makeDuel(rival) {
  const order = rival.deck.map(id => CARD[id]).filter(c => c && c.ready && !c.miner);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return { rival, gold: rival.startGold, hand: order.slice(0, HAND_SIZE), queue: order.slice(HAND_SIZE), t: 5, mult: levelMult(rival.level), played: 0 };
}

function duelAI(dt) {
  const d = state.duel, r = d.rival;
  d.gold = Math.min(MAX_GOLD, d.gold + (BASE_GOLD_RATE + r.income) * (state.overtime ? 1.5 : 1) * dt);
  d.t -= dt;
  if (d.t > 0) return;
  d.t = r.think * (0.8 + Math.random() * 0.5);
  const threat = [0, 0], own = [0, 0]; // fuerza de cada bando por carril (coste × vida restante)
  for (const u of state.units) {
    if (u.card.cart || u.camp || u.card.miner) continue;
    const v = u.card.cost * (u.hp / u.max);
    if (u.side === 0 && u.y < 520) threat[u.lane] += v; else if (u.side === 1 && u.y > 140) own[u.lane] += v;
  }
  const deficit = [threat[0] - own[0], threat[1] - own[1]], pressure = Math.max(deficit[0], deficit[1]) > 0;
  let lane = deficit[0] >= deficit[1] ? 0 : 1;
  if (!pressure) lane = own[0] === own[1] ? Math.floor(Math.random() * 2) : own[0] > own[1] ? 0 : 1; // sin amenaza: refuerza su ataque
  if (Math.random() > r.skill) lane = Math.floor(Math.random() * 2); // a veces se equivoca de carril
  let opts = d.hand.map((c, i) => ({ c, i })).filter(o => o.c.cost <= d.gold && !(o.c.heal && own[lane] <= 0));
  if (!opts.length) return;
  if (!pressure && d.gold < r.hoard) return; // sin presión, ahorra energía para jugar cartas mejores
  opts.sort((a, b) => b.c.cost - a.c.cost);
  const pickO = pressure || Math.random() < r.skill ? opts[0] : opts[Math.floor(Math.random() * opts.length)];
  const card = pickO.c, y = 110;
  d.gold -= card.cost; d.played++;
  const x = laneX(lane, y);
  const mult = r.levels && r.levels[card.id] ? levelMult(r.levels[card.id]) : d.mult; // cada carta del rival tiene su propio nivel
  for (const [ox, oy] of formationOffsets(card, 0)) spawnUnit(1, card, card.flying ? x + ox : clampLane(lane, y, x + ox), y + oy, lane, 1, mult);
  state.fx.push({ type: 'ring', x1: x, y1: y, r: 26, life: 0.3, color: '#ff7f7f' });
  if (d.queue.length) { d.queue.push(d.hand[pickO.i]); d.hand[pickO.i] = d.queue.shift(); }
}

function spawnWaves(dt) {
  const m = state.mission, w = m.wave;
  if (m.duel) return duelAI(dt);
  if (m.survival) return spawnSurvival(dt);
  const bosses = m.bosses || (m.boss ? [m.boss] : []);
  bosses.forEach((bs, i) => {
    if (state.bossesSpawned.includes(i) || state.t < bs.at) return;
    state.bossesSpawned.push(i);
    const lane = Math.floor(Math.random() * 2), b = BOSS[bs.id];
    spawnUnit(1, b, laneX(lane, 105), 105, lane, 1, m.foeMult * 0.85);
    ev('boss'); state.fx.push({ type: 'text', x1: W / 2, y1: 300, text: '¡' + b.name + '!', life: 2.2, big: true });
  });
  state.waveTimer -= dt;
  if (state.waveTimer > 0) return;
  state.waveTimer = (state.overtime ? w.every * 0.6 : w.every) * state.mods.waveEvery;
  state.waveNo++;
  const size = Math.min(w.max, 2 + Math.floor(state.waveNo / 2));
  const lanes = state.waveNo % 3 === 0 ? [0, 1] : [Math.floor(Math.random() * 2)];
  for (const lane of lanes) {
    for (let i = 0; i < size; i++) {
      const card = CARD[pick(w.pool)], y = 110 + i * 16;
      spawnUnit(1, card, laneX(lane, y), y, lane, 1, m.foeMult);
    }
  }
}

function nearestEnemy(u, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const e of state.units) { if (e.side === u.side) continue; const d = dist(u, e); if (d < bd) { best = e; bd = d; } }
  return best;
}

// Habilidades de jefe: el nombre coincide con el VFX de KOTA_VFX/boss_abilities.
const fxv = (name, x, y, size, life) => state.fx.push({ type: 'vfx', name, x1: x, y1: y, size, life: life || 0.8 }); // efecto de la hoja de VFX
function castBoss(u, id) {
  const foes = state.units.filter(e => e.side !== u.side);
  const inR = r => foes.filter(e => dist(e, u) < r);
  const vfx = (x, y, size) => state.fx.push({ type: 'vfx', name: 'boss_' + id, x1: x, y1: y, size, life: 0.9 });
  const foeMult = state.mission.foeMult;
  u.atkT = 0.6;
  switch (id) {
    case 'roots': vfx(u.x, u.y, 230); for (const e of inR(115)) e.stun = 2.2; break;
    case 'overgrowth': vfx(u.x, u.y, 240); for (const e of state.units) if (e.side === u.side && dist(e, u) < 125) e.hp = Math.min(e.max, e.hp + 90); break;
    case 'thorn_burst': vfx(u.x, u.y, 200); for (const e of inR(85)) hit(e, 45); break;
    case 'charge': { const t = nearestEnemy(u, 400); if (t) { u.x += (t.x - u.x) * 0.5; u.y += (t.y - u.y) * 0.5; u.x = clampLane(u.lane, u.y, u.x); vfx(u.x, u.y, 170); for (const e of inR(60)) { hit(e, 40); e.stun = 1; } } break; }
    case 'mine_rage': vfx(u.x, u.y, 160); u.haste = 7; u.rage = 7; break;
    case 'summoning': vfx(u.x, u.y, 180); for (let i = 0; i < 2; i++) spawnUnit(u.side, CARD.ordu_grunt, u.x + (i - 0.5) * 30, u.y + 12, u.lane, u.dir, foeMult * 0.8); break;
    case 'quake': vfx(u.x, u.y, 260); for (const e of inR(105)) { if (!e.card.flying) { hit(e, 35); e.stun = 1.2; } } break;
    case 'fragile_towers': vfx(u.x, u.y, 200); state.towerVuln = 8; state.fx.push({ type: 'text', x1: W / 2, y1: 560, text: '¡Torres frágiles!', life: 1.6 }); break;
    case 'army_of_dead': vfx(u.x, u.y, 220); for (let i = 0; i < 4; i++) spawnUnit(u.side, CARD.undead_skeletons, u.x + (i - 1.5) * 20, u.y + 14, u.lane, u.dir, foeMult * 0.5); break;
    case 'resurrection': vfx(u.x, u.y, 220); for (const d of state.deadFoes.splice(0, 2)) spawnUnit(1, d.card, d.x, d.y, d.lane, 1, d.mult * 0.6); break;
    case 'mass_curse': vfx(u.x, u.y, 280); for (const e of inR(145)) { hit(e, 20); e.slow = 4; } break;
    case 'soul_drain': { const t = nearestEnemy(u, 150); vfx(t ? t.x : u.x, t ? t.y : u.y, 170); if (t) { hit(t, 60); u.hp = Math.min(u.max, u.hp + 60); } break; }
  }
}

// ---------- Fin de partida ----------
// Puntuación de la partida (Fase H): premia ganar, el daño a la base enemiga, conservar la tuya, las bajas, la energía minada, la rapidez, las estrellas y los cofres; resta las torres perdidas.
function matchScore(win, pbase, objs) {
  const eb = state.buildings.find(b => b.kind === 'base' && b.side === 1), m = state.mission, par = m.par || 150;
  const edmg = eb && eb.max < 1e8 ? 1 - Math.max(0, eb.hp) / eb.max : (win ? 1 : 0), pct = pbase ? Math.max(0, pbase.hp) / pbase.max : 0;
  return Math.max(0, Math.round((win ? 1000 : 300) + edmg * 500 + pct * 300 + state.stats.kills * 8 + state.stats.mined * 5 + (win ? Math.max(0, par - state.t) * 3 : 0) + objs.filter(Boolean).length * 150 - state.towersLost * 80 + (state.stats.chests || 0) * 60));
}

function endCheck() {
  const eb = state.buildings.find(b => b.kind === 'base' && b.side === 1);
  const pb = state.buildings.find(b => b.kind === 'base' && b.side === 0);
  if (state.mission.survival) { if (!pb) finish(false, null); return; } // supervivencia: solo se pierde
  if (!pb) return finish(false, null); // si cae tu base pierdes sea cual sea el objetivo
  const timeUp = state.t >= state.timeLimit;
  if (timeUp && state.mission.duel && !state.overtime && eb && Math.abs(pb.hp / pb.max - eb.hp / eb.max) < 0.1) { // duelo igualado: 60 s de tiempo extra
    state.overtime = true; state.timeLimit += OVERTIME_S; state.gold = Math.min(MAX_GOLD, state.gold + 2); state.duel.gold = Math.min(MAX_GOLD, state.duel.gold + 2);
    state.fx.push({ type: 'text', x1: W / 2, y1: 340, text: '¡TIEMPO EXTRA!', life: 2.2, big: true }); ev('boss');
    return;
  }
  switch (state.goal) {
    case 'defend': if (timeUp) finish(true, pb); return;                                   // resistir hasta el final
    case 'capture': if (state.points.length && state.points.every(p => p.owner === 0)) finish(true, pb); else if (timeUp) finish(false, pb); return;
    case 'hunt': if (state.hunt && state.hunt.dead) finish(true, pb); else if (timeUp) finish(false, pb); return;
    case 'escort': { const c = state.cart;
      if (c && c.hp <= 0) finish(false, pb); else if (c && c.y < 150) finish(true, pb); else if (timeUp) finish(false, pb); return; }
  }
  if (!eb) return finish(true, pb);
  if (timeUp) { // tiempo agotado: gana quien conserve más % de base (en un empate del tiempo extra pierdes)
    const pe = eb.hp / eb.max, pp = pb.hp / pb.max;
    finish(pp > pe, pb);
  }
}

// Tres objetivos independientes según el tipo de misión (ver GOALS); las estrellas son cuántos se cumplen y solo cuentan si ganas.
function finish(win, pbase) {
  state.over = true; state.winner = win ? 0 : 1;
  const pct = pbase ? pbase.hp / pbase.max : 0, m = state.mission, noTowers = state.towersLost === 0;
  const cartPct = state.cart ? Math.max(0, state.cart.hp / state.cart.max) : 0;
  const second = { defend: pct >= 0.8, capture: state.t <= (m.par || 150), hunt: state.t <= (m.par || 120), escort: cartPct >= 0.5 }[state.goal] !== undefined
    ? { defend: pct >= 0.8, capture: state.t <= (m.par || 150), hunt: state.t <= (m.par || 120), escort: cartPct >= 0.5 }[state.goal] : pct >= 0.6;
  const objs = [win, win && second, win && noTowers];
  state.result = { win, objs, stars: objs.filter(Boolean).length, pct, time: state.t, towersLost: state.towersLost, wave: state.waveNo, goal: state.goal,
    bonusCoins: state.bonusCoins, stats: Object.assign({}, state.stats), score: matchScore(win, pbase, objs) };
  ev(win ? 'win' : 'lose');
}

// ---------- Habilidad de héroe ----------
function castLeader(x, y) {
  const L = state.leader;
  if (state.leaderCd > 0 || !L.ready || state.mods.leaderOff) return false;
  const R = L.radius * state.mods.leaderRadius; // radio real de la habilidad (el evento Día del héroe lo amplía)
  const near = o => Math.hypot(o.x - x, o.y - y) < R;
  const allies = () => state.units.filter(u => u.side === 0 && near(u));
  const foes = () => state.units.filter(u => u.side === 1 && near(u));
  const sp = L.spec;
  switch (L.ability) {
    case 'rally': for (const u of allies()) u.haste = sp.buff_s; break;
    case 'blades':
      for (const u of foes()) hit(u, sp.dmg);
      for (const b of state.buildings) if (b.side === 1 && near(b)) hit(b, sp.dmg * 0.5);
      break;
    case 'bloodcall': for (const u of allies()) { u.haste = sp.buff_s; u.rage = sp.buff_s; } break;
    case 'healing_totem': for (const u of allies()) u.hp = Math.min(u.max, u.hp + sp.heal); break;
    case 'bone_army': {
      if (!inDeployArea(x, y)) return false;
      const lane = nearestLane(x);
      formationOffsets(CARD.undead_skeletons).forEach(([ox, oy]) => spawnUnit(0, CARD.undead_skeletons, clampLane(lane, y, x + ox), y + oy, lane, -1, 1));
      break;
    }
    case 'curse_fog': for (const u of foes()) { hit(u, sp.dmg); u.slow = sp.slow_s; } break;
  }
  state.leaderCd = L.cooldown * state.mods.leaderCd; ev('leader');
  fxv(L.id + '_power', x, y, R * 2.2, 1.0);
  state.fx.push({ type: 'ring', x1: x, y1: y, r: R, life: 0.6, color: L.color, fill: true });
  return true;
}
