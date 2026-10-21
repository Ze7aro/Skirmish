// Fase B: objetivos de misión (defender, capturar, cacería, escolta), cofres del mapa, disparadores y misiones 11-20.
// Uso: node tests/phaseb.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') +
  ';globalThis.M={startBattle,update,spawnUnit,deploy,hit,openMapChest,CARD,CARD_LIST,BOSS,MISSIONS,GOALS,ZONES,CART_CARD,CHEST_SPOTS,dist,laneX,withGoal,dailyChallenge,survivalMission,dungeonMission,eventMission,EVENTS,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
// Misión de prueba "vacía": sin campamentos, sin oleadas, sin cofres aleatorios, para controlar todo a mano.
function mission(goal, extra) {
  const m = Object.assign({ id: 900, zone: 1, terrain: 'forest', enemy: 'ordu', name: 'prueba', desc: '', camps: [], wave: { every: 9999, max: 1, pool: ['ordu_grunt'] },
    towerHp: 2000, baseHp: 2000, foeMult: 1, coins: 10, matchTime: 100, unlock: { cards: [], leaders: [] }, chests: 0 }, extra || {});
  return M.withGoal(m, goal, (extra && extra.goalOpts) || {});
}
function begin(goal, extra) { M.startBattle(mission(goal, extra), deck, 'human_commander', {}); const s = M.s; s.waveTimer = 9999; s.gold = 10; return s; }
const run = (s, secs) => { for (let i = 0; i < 20 * secs && !s.over; i++) M.update(0.05); };
const ally = (x, y, id) => M.spawnUnit(0, M.CARD[id || 'human_warrior'], x, y, x < 240 ? 0 : 1, -1, 1);
const hold = u => { u.stun = 999; return u; }; // unidad quieta en su sitio (las normales avanzarían por el carril)
const foe = (x, y, id) => M.spawnUnit(1, M.CARD[id || 'ordu_grunt'], x, y, x < 240 ? 0 : 1, 1, 1);

// ---------- Datos ----------
ok(M.MISSIONS.length === 25 && M.ZONES.length === 10 && M.MISSIONS.filter(m => m.regional).length === 5, '20 misiones de campaña + 5 mapas de jefe regional, en 10 zonas');
ok(Object.keys(M.GOALS).length === 5 && Object.values(M.GOALS).every(g => g.objs.length === 3 && g.name && g.icon), '5 tipos de objetivo con 3 estrellas cada uno');
const byGoal = {}; M.MISSIONS.forEach(m => { byGoal[m.goal] = (byGoal[m.goal] || 0) + 1; });
ok(['destroy', 'defend', 'capture', 'hunt', 'escort'].every(g => byGoal[g] >= 2), 'cada tipo de objetivo aparece en al menos 2 misiones: ' + JSON.stringify(byGoal));
ok(M.MISSIONS.filter(m => m.hunt).every(m => M.BOSS[m.hunt.id]) && M.MISSIONS.filter(m => m.goal === 'capture').every(m => m.points.length === 3), 'cacerías con campeón válido y capturas con 3 puntos');
const sleepy = begin('destroy', { chests: 0, camps: [{ lane: 0, y: 450, types: ['ordu_grunt'], mult: 0.5 }] }); const wake = M.spawnUnit(0, M.CART_CARD, 120, 480, 0, -1, 1); run(sleepy, 2);
ok(sleepy.units.filter(u => u.camp).every(u => u.asleep), 'la carreta no despierta a los neutrales dormidos');
ok(M.MISSIONS.every((m, i) => m.id === i) && M.MISSIONS[0].chests === 1, 'ids correlativos; la misión 1 lleva un solo cofre');

// ---------- Defender ----------
let s = begin('defend', { goalOpts: { time: 30 } });
ok(s.buildings.find(b => b.side === 1 && b.kind === 'base').max > 1e8, 'defender: la base enemiga es indestructible');
run(s, 29); ok(!s.over, 'defender: a los 29 s la partida sigue');
run(s, 2); ok(s.over && s.result.win && s.result.goal === 'defend', 'defender: se gana al terminar el tiempo con la base en pie');
ok(s.result.objs[1] === true && s.result.objs[2] === true && s.result.stars === 3, 'defender: 3 estrellas si la base está sana y no cae ninguna torre');
s = begin('defend', { goalOpts: { time: 30 } }); s.buildings.find(b => b.side === 0 && b.kind === 'base').hp = 0; M.update(0.05);
ok(s.over && !s.result.win, 'defender: si cae tu base, pierdes');
s = begin('defend', { goalOpts: { time: 10 } }); s.buildings.find(b => b.side === 0 && b.kind === 'base').hp *= 0.7; run(s, 11);
ok(s.result.win && !s.result.objs[1], 'defender: la 2.ª estrella exige conservar el 80% de la base');

// ---------- Capturar ----------
s = begin('capture'); const p = s.points[0];
ok(s.points.length === 3 && s.points.every(q => q.owner === -1 && q.prog === 0), 'capturar: 3 puntos neutrales al empezar');
const a1 = hold(ally(p.x, p.y)); run(s, 2.5); ok(Math.abs(s.points[0].prog - 0.5) < 0.05, 'capturar: con tropas tuyas el progreso sube (50% a los 2,5 s)');
const e1 = foe(p.x + 10, p.y); e1.asleep = false; e1.stun = 99; a1.stun = 99; run(s, 1); const progContested = s.points[0].prog; run(s, 2);
ok(Math.abs(s.points[0].prog - progContested) < 1e-9, 'capturar: con tropas de ambos bandos el punto queda disputado (no avanza ni retrocede)');
a1.hp = 0; run(s, 1); ok(s.points[0].prog < progContested, 'capturar: si solo quedan enemigos, el progreso baja');
e1.hp = 0; run(s, 0.1);
s = begin('capture'); s.units.length = 0;
const ids = s.points.map(q => hold(ally(q.x, q.y))); run(s, 5.5);
ok(s.points.every(q => q.owner === 0) && s.over && s.result.win, 'capturar: capturados los 3 a la vez se gana');
ok(s.zones.filter(z => z.point !== undefined).length === 3, 'capturar: cada punto capturado amplía la zona de despliegue');
s = begin('capture'); hold(ally(s.points[0].x, s.points[0].y)); run(s, 5.2);
ok(s.points[0].owner === 0 && !s.over, 'capturar: un punto capturado no termina la misión');
s.units.length = 0; const sleeper = foe(s.points[0].x, s.points[0].y); sleeper.asleep = false; sleeper.stun = 999; run(s, 8.5);
ok(s.points[0].owner === -1 && !s.zones.some(z => z.point === 0), 'capturar: un punto ocupado solo por enemigos se pierde (y su zona también)');
s = begin('capture'); s.timeLimit = 20; run(s, 21); ok(s.over && !s.result.win, 'capturar: se pierde si se acaba el tiempo');
s = begin('capture'); s.units.length = 0; s.t = 100; s.points.forEach(q => hold(ally(q.x, q.y))); run(s, 5.5);
ok(s.result.win && s.result.objs[1] === true, 'capturar: la 2.ª estrella premia hacerlo en menos de 2:30');
s = begin('capture'); s.units.length = 0; s.t = 160; s.points.forEach(q => hold(ally(q.x, q.y))); run(s, 5.5);
ok(s.result.win && s.result.objs[1] === false, '...y no se da si tardas más');

// ---------- Cacería ----------
s = begin('hunt', { goalOpts: { champion: 'boss_guardian_piedra', hpMult: 0.5 } });
const ch = s.hunt && s.hunt.unit;
ok(ch && ch.champion && ch.guard && ch.card.boss && s.buildings.find(b => b.side === 1 && b.kind === 'base').max > 1e8, 'cacería: hay un campeón con guarida y la base enemiga es indestructible');
const gx = ch.x, gy = ch.y; run(s, 6); ok(M.dist(ch, { x: gx, y: gy }) < 3, 'cacería: el campeón se queda en su guarida si nadie se acerca');
const bait = ally(ch.x, ch.y + 90, 'human_archer'); run(s, 3); ok(M.dist(ch, { x: gx, y: gy }) > 5 || bait.hp < bait.max, 'cacería: el campeón reacciona a quien se acerca');
bait.hp = 0; ch.x = gx; ch.y = gy + 150; run(s, 12); ok(M.dist(ch, { x: gx, y: gy }) < 80, 'cacería: tras la pelea vuelve hacia su guarida');
s.t = 60; ch.hp = 0; run(s, 0.2); ok(s.over && s.result.win && s.result.objs[1] === true && s.result.goal === 'hunt', 'cacería: al caer el campeón se gana (2.ª estrella si es antes de 2:00)');
s = begin('hunt', { goalOpts: { champion: 'boss_guardian_piedra', hpMult: 0.5 } }); s.t = 130; s.hunt.unit.hp = 0; run(s, 0.2); ok(s.result.win && !s.result.objs[1], 'cacería: tarde no da la 2.ª estrella');
s = begin('hunt', { goalOpts: { champion: 'boss_guardian_piedra', hpMult: 0.5 } }); s.timeLimit = 15; run(s, 16); ok(s.over && !s.result.win, 'cacería: se pierde si se acaba el tiempo');

// ---------- Escolta ----------
s = begin('escort', { goalOpts: { lane: 1 } }); const cart = s.cart;
ok(cart && cart.side === 0 && cart.card.cart && Math.abs(cart.x - M.laneX(1, 690)) < 1, 'escolta: la carreta sale de tu base por el carril elegido');
const y0 = cart.y; run(s, 9); ok(Math.abs(cart.y - y0) < 1, 'escolta: espera 10 s antes de salir (da tiempo a desplegar la escolta)');
run(s, 11); ok(cart.y < y0 - 100, `escolta: después avanza sola por el carril (recorre ${(y0 - cart.y).toFixed(0)} px en 11 s)`);
const e2 = foe(cart.x, cart.y - 50); e2.asleep = false; e2.stun = 999; const yStop = cart.y; run(s, 3);
ok(Math.abs(cart.y - yStop) < 1, 'escolta: se detiene si hay enemigos a menos de 75 px');
e2.hp = 0; run(s, 2); ok(cart.y < yStop - 10, '...y reanuda cuando despejas el camino');
cart.y = 160; run(s, 6); ok(s.over && s.result.win && s.result.objs[1] === true, 'escolta: al llegar al final se gana (2.ª estrella con ≥ 50% de vida)');
s = begin('escort', { goalOpts: { lane: 0 } }); s.t = 10; s.cart.hp = s.cart.max * 0.3; s.cart.y = 160; run(s, 6); ok(s.result.win && !s.result.objs[1], 'escolta: llegar casi muerta no da la 2.ª estrella');
s = begin('escort', { goalOpts: { lane: 0 } }); M.hit(s.cart, 99999); run(s, 0.2); ok(s.over && !s.result.win, 'escolta: si la carreta muere, pierdes');
s = begin('escort', { goalOpts: { lane: 0 } }); s.timeLimit = 12; run(s, 13); ok(s.over && !s.result.win, 'escolta: se pierde si se acaba el tiempo');

// ---------- Cofres del mapa ----------
M.startBattle(mission('destroy', { chests: 3 }), deck, 'human_commander', {}); s = M.s; s.waveTimer = 9999;
ok(s.chests.length === 3 && new Set(s.chests.map(c => c.x + ',' + c.y)).size === 3 && s.chests.every(c => !c.opened && !c.locked), 'cofres: se colocan 3 en posiciones distintas');
ok(s.chests.every(c => M.CHEST_SPOTS.some(sp => sp.x === c.x && sp.y === c.y)), 'cofres: solo en las posiciones libres junto a los carriles');
const ck = s.chests[0], a0 = ally(ck.x, ck.y + 20); const stats0 = s.stats.chests; M.update(0.05);
ok(ck.opened && s.stats.chests === stats0 + 1, 'cofres: se abren cuando una unidad tuya se acerca');
s = begin('destroy', { chests: 1 }); const c2 = s.chests[0]; foe(c2.x, c2.y + 10).asleep = false; run(s, 1);
ok(!c2.opened, 'cofres: los enemigos no abren cofres');
// recompensas con azar controlado
const withRand = (r, f) => { const old = Math.random; Math.random = () => r; try { return f(); } finally { Math.random = old; } };
s = begin('destroy', { chests: 1 }); s.gold = 2; withRand(0.1, () => M.openMapChest(s.chests[0])); ok(Math.abs(s.gold - 6) < 1e-9, 'cofre (0,10): +4 de energía');
s = begin('destroy', { chests: 1 }); const hurt = ally(120, 600); hurt.hp = hurt.max * 0.2; withRand(0.4, () => M.openMapChest(s.chests[0])); ok(Math.abs(hurt.hp - hurt.max * 0.6) < 1e-6, 'cofre (0,40): cura un 40% a tus unidades');
s = begin('destroy', { chests: 1 }); const n0 = s.units.length; withRand(0.6, () => M.openMapChest(s.chests[0])); ok(s.units.length === n0 + 2 && s.units.slice(-2).every(u => u.side === 0), 'cofre (0,60): 2 aliados nuevos');
s = begin('destroy', { chests: 1 }); withRand(0.8, () => M.openMapChest(s.chests[0])); ok(s.bonusCoins === 30, 'cofre (0,80): +30 monedas al final de la batalla');
s = begin('destroy', { chests: 1 }); const f0 = s.units.filter(u => u.side === 1).length; withRand(0.95, () => M.openMapChest(s.chests[0])); ok(s.units.filter(u => u.side === 1).length === f0 + 3, 'cofre (0,95): ¡mímico! 3 enemigos');
s = begin('destroy', { chests: 1 }); withRand(0.8, () => M.openMapChest(s.chests[0])); s.buildings.find(b => b.side === 1 && b.kind === 'base').hp = 0; M.update(0.05);
ok(s.result.bonusCoins === 30 && s.result.stats.chests === 1, 'cofres: el resultado incluye las monedas del mapa y el recuento');
// cofres de campamento
const campMission = mission('destroy', { chests: 0, camps: [{ lane: 0, y: 450, types: ['ordu_grunt'], mult: 0.5, chest: true }] });
M.startBattle(campMission, deck, 'human_commander', {}); s = M.s; s.waveTimer = 9999; const cc = s.chests[0];
ok(cc && cc.locked && cc.camp === s.camps[0], 'cofre de campamento: aparece bloqueado');
ally(cc.x, cc.y + 5); M.update(0.05); ok(!cc.opened, '...y no se abre mientras el campamento esté vivo');
s.units.filter(u => u.camp).forEach(u => { u.hp = 0; }); M.update(0.05); M.update(0.05); ok(!cc.locked && cc.opened, '...al despejarlo se desbloquea y se abre con la unidad que está al lado');

// ---------- Disparadores ----------
const trig = (when, doList) => ({ triggers: [{ when, do: doList }] });
s = begin('destroy', trig({ time: 5 }, [{ text: '¡Hola!' }, { energy: 3 }])); s.gold = 0; run(s, 4.9); ok(!s.triggers[0].fired && s.gold < 2.2, 'disparador por tiempo: aún no salta antes de tiempo');
run(s, 0.3); ok(s.triggers[0].fired && s.gold > 4.5 && s.fx.some(f => f.type === 'text' && f.text === '¡Hola!'), '...salta a los 5 s: da +3 de energía y muestra el aviso');
const before = s.gold; run(s, 5); ok(s.gold - before < 2.5, '...y solo salta una vez');
s = begin('destroy', trig({ time: 1 }, [{ spawn: { ids: ['ordu_grunt', 'ordu_bomber'], lanes: [0, 1], y: 300 } }])); run(s, 1.2);
ok(s.units.filter(u => u.side === 1).length === 4 && s.units.filter(u => u.side === 1).every(u => u.dir === 1), 'disparador de apariciones: 2 unidades en cada uno de los 2 carriles');
s = begin('destroy', trig({ time: 1 }, [{ spawn: { ids: ['human_warrior'], lane: 0, y: 600, side: 0 } }])); run(s, 1.2); ok(s.units.some(u => u.side === 0 && u.card.id === 'human_warrior'), 'disparador de refuerzos aliados (side 0)');
M.startBattle(mission('destroy', Object.assign({ chests: 0, camps: [{ lane: 0, y: 450, types: ['ordu_grunt'], mult: 0.5 }] }, trig({ campCleared: 0 }, [{ text: '¡Emboscada!' }]))), deck, 'human_commander', {});
s = M.s; s.waveTimer = 9999; M.update(0.05); ok(!s.triggers[0].fired, 'disparador por campamento: no salta mientras esté vivo');
s.units.filter(u => u.camp).forEach(u => { u.hp = 0; }); M.update(0.05); M.update(0.05); ok(s.triggers[0].fired, '...salta al despejar el campamento');
s = begin('capture', trig({ points: 1 }, [{ energy: 2 }])); s.gold = 0; hold(ally(s.points[1].x, s.points[1].y)); run(s, 6); ok(s.triggers[0].fired, 'disparador por puntos capturados');
s = begin('destroy', Object.assign({ chests: 1 }, trig({ chests: 1 }, [{ heal: 0.5 }]))); const h2 = ally(120, 600); h2.hp = h2.max * 0.1; ally(s.chests[0].x, s.chests[0].y + 10, 'human_archer'); run(s, 0.3);
ok(s.triggers[0].fired && h2.hp > h2.max * 0.3, 'disparador por cofres abiertos (aquí cura al abrir el primero)');

// ---------- Misiones nuevas: referencias y jugabilidad ----------
const bad = [];
for (const m of M.MISSIONS) {
  for (const c of m.camps) for (const id of c.types) if (!M.CARD[id]) bad.push(m.id + ':' + id);
  for (const id of m.wave.pool) if (!M.CARD[id]) bad.push(m.id + ':' + id);
  for (const t of m.triggers || []) for (const a of t.do) if (a.spawn) for (const id of a.spawn.ids) if (!M.CARD[id]) bad.push(m.id + ':trigger:' + id);
}
ok(bad.length === 0, 'todas las unidades de campamentos, oleadas y disparadores existen' + (bad.length ? ' → ' + bad.join(',') : ''));
let broken = 0;
for (const m of M.MISSIONS.slice(10)) {
  try { M.startBattle(m, deck, 'human_commander', {}); const st = M.s; st.gold = 10; for (let i = 0; i < 20 * 150 && !st.over; i++) { M.update(0.05); if (i % 40 === 0) M.deploy(M.CARD.human_warrior, 120 + (i % 3) * 120, 700); } }
  catch (e) { broken++; console.log('   excepción en la misión', m.id + 1, e.message); }
}
ok(broken === 0, 'las 10 misiones nuevas se juegan 150 s sin excepciones');
// el desafío del día reparte tipos de objetivo distintos según el día
const goals = new Set(); for (let d = 1; d <= 40; d++) { const g = M.dailyChallenge('2026-11-' + d).mission; goals.add(g.goal); if (g.hunt) ok(!!M.BOSS[g.hunt.id], 'desafío día ' + d + ': el campeón existe'); }
ok(goals.size === 5, 'desafío del día: en 40 días salen los 5 tipos de objetivo (' + [...goals].join(', ') + ')');

console.log(fail ? `\n${fail} FALLO(S)` : '\nTODO OK');
process.exit(fail ? 1 : 0);
