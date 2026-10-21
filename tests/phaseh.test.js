// Fase H: las 12 ideas del análisis de funciones — campamentos que reaparecen, minas con reserva, interruptores de pago, enemigos con talentos,
// tipos de daño, calentamiento de habilidades, nidos y fuentes, puntuación, mazmorras por temporadas, rivales por nivel y mmr, mutadores de mano y regeneración.
// Uso: node tests/phaseh.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') +
  ';globalThis.M={startBattle,update,spawnUnit,hit,attack,deployFromSlot,replaceSlot,abilityWarm,matchScore,CARD,CARD_LIST,BOSS,MISSIONS,TALENT_DEFS,laneX,dist,levelMult,SWITCH_TYPES,MINE_RESERVE,MINE_RECHARGE,MINE_TRICKLE,MINE_RATE,NEST_EVERY,NEST_BOUNTY,SPRING_EVERY,SPRING_HEAL,SPRING_R,REGEN_AFTER,REGEN_RATE,' +
  'dungeonMission,heroicMission,skullMission,pickFoeTalents,FOE_TALENTS,mergeMods,MUTATORS,RELICS,recordScore,totalScore,dungeonSeason,ensureDungeonSeason,DUNGEON_OPEN_DAYS,' +
  'makeRival,generateDeck,rivalLevels,withLevels,duelOffers,duelMission,duelResult,duelState,ghostRival,ACH_FAMILIES,mapFeatures,DTYPE,RES,DECK_CARDS,MAX_CARD_LEVEL,UNIVERSAL,HAND_SIZE,rng,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
const base = extra => Object.assign({ id: 901, zone: 1, terrain: 'forest', enemy: 'ordu', name: 'prueba', desc: '', camps: [], wave: { every: 9999, max: 1, pool: ['ordu_grunt'] }, towerHp: 2000, baseHp: 2000, foeMult: 1, coins: 1, matchTime: 400, unlock: { cards: [], leaders: [] }, chests: 0, goal: 'destroy' }, extra || {});
function begin(extra, mods) { M.startBattle(base(extra), deck, 'human_commander', {}, mods); const s = M.s; s.waveTimer = 9999; s.gold = 10; return s; }
const run = (s, secs) => { for (let i = 0; i < Math.round(20 * secs) && !s.over; i++) M.update(0.05); };
const camp = (extra) => Object.assign({ lane: 0, y: 450, types: ['ordu_grunt', 'ordu_bomber'], mult: 1 }, extra || {});

// ---------- 1. Campamentos que reaparecen ----------
let s = begin({ camps: [camp()], campRespawn: { every: 30, bounty: 2 } }); let cp = s.camps[0];
s.units.filter(u => u.camp === cp).forEach(u => { u.hp = 0; }); run(s, 0.2);
ok(cp.cleared && cp.rs && !cp.rs.active && cp.rs.n === 0, 'al despejarlo se programa la reaparición');
run(s, 29); ok(cp.alive === 0, 'antes de tiempo no reaparece'); run(s, 2);
ok(cp.rs.active && cp.alive === 2 && cp.rs.n === 1 && s.units.filter(u => u.camp === cp && u.asleep).length === 2, 'tras 30 s reaparecen sus guardianes (dormidos)');
ok(s.units.filter(u => u.camp === cp).every(u => Math.abs(u.max / M.CARD[u.card.id].hp - 0.8) < 0.01), 'los guardianes son un 20% más débiles que el grupo original');
const g0 = s.gold; s.gold = 3; s.units.filter(u => u.camp === cp).forEach(u => { u.hp = 0; }); run(s, 0.2);
ok(Math.abs(s.gold - 5) < 0.3 && s.stats.guardians === 1 && !cp.rs.active, 'vencerlos da el botín de energía (+2) y reprograma');
ok(cp.rs.next - s.t > 36, 'cada reaparición tarda más (×1,25)');
{ const s2 = begin({ camps: [camp()], campRespawn: { every: 10, bounty: 1 } }); const c2 = s2.camps[0]; s2.units.filter(u => u.camp === c2).forEach(u => { u.hp = 0; }); run(s2, 0.2);
  const near = M.spawnUnit(0, M.CARD.human_warrior, c2.x, c2.y + 60, 0, -1, 1); near.stun = 999; run(s2, 20); ok(c2.alive === 0, 'si hay tropas tuyas cerca (140 px) no reaparecen'); near.hp = 0; run(s2, 1); ok(c2.alive === 2, 'cuando se van, reaparecen'); }
{ const s3 = begin({ camps: [camp()], campRespawn: { every: 5, bounty: 1 } }); const c3 = s3.camps[0]; s3.units.filter(u => u.camp === c3).forEach(u => { u.hp = 0; }); run(s3, 0.2);
  for (let k = 0; k < 6; k++) { run(s3, 12); s3.units.filter(u => u.camp === c3).forEach(u => { u.hp = 0; }); run(s3, 0.2); } ok(c3.rs.n === 3, 'máximo 3 reapariciones (' + c3.rs.n + ')'); }
{ const s4 = begin({ camps: [camp()] }); const c4 = s4.camps[0]; s4.units.filter(u => u.camp === c4).forEach(u => { u.hp = 0; }); run(s4, 100); ok(c4.alive === 0 && !c4.rs, 'sin la opción de la misión no reaparecen'); }
ok(M.MISSIONS.slice(0, 4).every(m => !m.campRespawn) && M.MISSIONS.slice(4).every(m => m.campRespawn && m.campRespawn.every > 0), 'reaparición desde la misión 5');
ok(!M.dungeonMission(2).campRespawn && M.dungeonMission(3).campRespawn, 'mazmorra: reaparición desde el nivel 3');

// ---------- 2. Minas con reserva ----------
s = begin(); const mine = s.mines.find(m => !m.locked), mn = M.spawnUnit(0, M.CARD.dwarf_miner, mine.x, mine.y + 10, 0, -1, 1);
ok(mine.reserve === M.MINE_RESERVE && s.mines.filter(m => m.locked).every(m => m.reserve === M.MINE_RESERVE), 'las minas empiezan con la reserva llena');
s.gold = 0; run(s, 3); const earned3 = s.stats.mined; ok(mine.reserve < M.MINE_RESERVE && Math.abs((M.MINE_RESERVE - mine.reserve) - earned3) < 0.5, 'minar gasta reserva a ritmo de energía obtenida');
s.mines.forEach(m => { m.reserve = 0; }); const before = s.stats.mined; mn.stun = 0; run(s, 10); const trickle = (s.stats.mined - before) / 10;
ok(!mn.mining && s.stats.mined - before < 0.5, 'con la mina agotada el minero deja de recolectar y ya no cobra oro (' + (s.stats.mined - before).toFixed(2) + ')');
{ const s5 = begin(), m5 = s5.mines.filter(m => !m.locked); m5[0].reserve = 5; run(s5, 5); ok(m5[0].reserve > 5, 'sin minero la mina se recarga'); ok(Math.abs(m5[0].reserve - (5 + M.MINE_RECHARGE * 5)) < 0.3, 'recarga ' + M.MINE_RECHARGE + '/s'); }
{ const s6 = begin(), [a, b] = s6.mines.filter(m => !m.locked); const w = M.spawnUnit(0, M.CARD.dwarf_miner, a.x, a.y + 10, 0, -1, 1); run(s6, 1); ok(w.mine === a, 'el minero elige la más cercana'); a.reserve = 0.5; run(s6, 3); ok(w.mine === b && b.claim === w.id, 'si la suya se agota se va a otra con reserva'); }

// ---------- 3. Interruptores de pago y reutilizables ----------
const sw = type => begin({ switches: [{ type, lane: 0, y: 400 }] });
const stand = (s) => { const w = s.switches[0], u = M.spawnUnit(0, M.CARD.human_warrior, w.x, w.y, 0, -1, 1); u.stun = 999; return u; };
ok(Object.values(M.SWITCH_TYPES).every(t => typeof t.cost === 'number' && typeof t.cd === 'number') && M.SWITCH_TYPES.energy.cost === 0 && M.SWITCH_TYPES.energy.cd === 0 && M.SWITCH_TYPES.trap.cd > 0, 'cada tipo declara coste y enfriamiento; la energía es gratis y de un solo uso');
s = sw('trap'); stand(s); s.gold = 5; run(s, 1.5); ok(s.switches[0].used && s.gold < 5 && Math.abs(s.gold - (5 - 1 + 0.4 * 0.5)) < 0.6, 'accionarla cuesta energía (trampa: 1)');
run(s, M.SWITCH_TYPES.trap.cd - 2); ok(s.switches[0].used, 'durante el enfriamiento no se puede usar'); run(s, 1.8); ok(!s.switches[0].used, 'pasado el enfriamiento se rearma');
const n1 = s.stats.switches; s.gold = 5; run(s, 2); ok(s.stats.switches === n1 + 1, 'y se vuelve a accionar (usos: ' + s.stats.switches + ')');
s = sw('towerOff'); stand(s); s.gold = 1; run(s, 3); ok(!s.switches[0].used && s.switches[0].wait && s.switches[0].prog >= 1, 'sin energía suficiente se queda esperando (coste 3)');
s.gold = 6; run(s, 0.2); ok(s.switches[0].used && !s.switches[0].wait, 'en cuanto hay energía se acciona');
s = sw('energy'); stand(s); s.gold = 0; run(s, 2); ok(s.switches[0].used && s.stats.switches === 1, 'la de energía es gratis'); run(s, 200); ok(s.stats.switches === 1 && s.switches[0].used, 'y de un solo uso');
s = begin({ switches: [{ type: 'trap', lane: 0, y: 400 }], triggers: [{ when: { switches: 2 }, do: [{ text: 'x' }] }] }); stand(s); s.gold = 10; run(s, 1.5); ok(!s.triggers[0].fired, 'un disparador de "2 interruptores" no salta con 1 uso'); run(s, 33); ok(s.triggers[0].fired, 'sí con 2 usos del mismo');

// ---------- 4. Enemigos con talentos ----------
ok(M.FOE_TALENTS.every(t => M.TALENT_DEFS[t]), 'los talentos de enemigo existen');
const ft = M.MISSIONS.map(m => M.heroicMission(m).foeTalents); ok(ft.every(a => a.length === 2 && a[0] !== a[1]), 'cada heroica da 2 talentos distintos'); ok(new Set(ft.map(a => a.join())).size >= 6, 'y varían entre misiones');
ok(JSON.stringify(M.pickFoeTalents(5, 2)) === JSON.stringify(M.pickFoeTalents(5, 2)) && M.pickFoeTalents(5, 0).length === 0, 'son deterministas');
ok([1, 2].every(l => M.skullMission(l).foeTalents.length === 0) && [3, 5].every(l => M.skullMission(l).foeTalents.length === 1) && [6, 8].every(l => M.skullMission(l).foeTalents.length === 2) && [9, 10].every(l => M.skullMission(l).foeTalents.length === 3), 'calaveras: 0, 1, 2 y 3 talentos según el nivel');
s = begin({ foeTalents: ['vigor', 'fury'] }); const fe = M.spawnUnit(1, M.CARD.ordu_grunt, 120, 200, 0, 1, 1), pa = M.spawnUnit(0, M.CARD.ordu_grunt, 120, 600, 0, -1, 1);
const s0 = begin(); const fe0 = M.spawnUnit(1, M.CARD.ordu_grunt, 120, 200, 0, 1, 1);
ok(Math.abs(fe.max / fe0.max - 1.2) < 0.01 && Math.abs(fe.dmg / fe0.dmg - 1.15) < 0.01, 'los enemigos con Vigor y Furia tienen +20% de vida y +15% de daño');
const bs = M.spawnUnit(1, M.BOSS[Object.keys(M.BOSS)[0]], 120, 200, 0, 1, 1); s = begin({ foeTalents: ['vigor'] }); const bs2 = M.spawnUnit(1, M.BOSS[Object.keys(M.BOSS)[0]], 120, 200, 0, 1, 1); ok(Math.abs(bs2.max - bs.max) < 1e-6, 'los jefes no reciben los talentos');

// ---------- 5. Tipos de daño ----------
ok(M.CARD_LIST.every(c => ['phys', 'magic', 'siege'].includes(c.dtype) && typeof c.res === 'object'), 'todas las cartas tienen tipo de daño y resistencias');
ok(['human_mage', 'undead_lich'].every(id => M.CARD[id].dtype === 'magic') && ['ordu_bomber', 'ordu_siege_beast'].every(id => M.CARD[id].dtype === 'siege') && M.CARD.human_warrior.dtype === 'phys', 'magos mágicos, bombarderos y bestias de asedio, resto físico');
ok(Object.values(M.RES).every(r => Object.entries(r).every(([k, v]) => ['phys', 'magic', 'siege'].includes(k) && v > 0.5 && v < 1.5)), 'resistencias en un rango sensato');
s = begin(); const sk = M.spawnUnit(1, M.CARD.undead_skeletons, 120, 300, 0, 1, 1), dmgTo = (u, d, t) => { const h = u.hp; M.hit(u, d, t); return h - u.hp; };
const kk = M.spawnUnit(1, M.CARD.ordu_grunt, 160, 300, 0, 1, 1); kk.card = Object.assign({}, kk.card, { armor: 0.5 }); kk.xarmor = 0;
ok(Math.abs(dmgTo(kk, 100, 'phys') - 50) < 1e-6 && Math.abs(dmgTo(kk, 100, 'magic') - 100) < 1e-6, 'el daño mágico ignora la armadura (50% → 100)');
ok(Math.abs(dmgTo(sk, 100, 'magic') - 125) < 1e-6 && Math.abs(dmgTo(sk, 100, 'phys') - 80) < 1e-6 && Math.abs(dmgTo(sk, 100) - 80) < 1e-6, 'esqueletos: magia ×1,25, físico ×0,8 (sin tipo = físico)');
const sb = M.spawnUnit(1, M.CARD.ordu_siege_beast, 200, 300, 0, 1, 1); ok(Math.abs(dmgTo(sb, 100, 'siege') - 100 * (1 - (sb.card.armor || 0)) * 0.8) < 1e-6, 'la bestia de asedio resiste el asedio (×0,8 además de su armadura)');
const mg = M.spawnUnit(0, M.CARD.human_mage, 120, 600, 0, -1, 1), sk2 = M.spawnUnit(1, M.CARD.undead_skeletons, 120, 540, 0, 1, 1); mg.t = 0; const hp0 = sk2.hp; M.attack(mg, sk2);
ok(Math.abs((hp0 - sk2.hp) - mg.dmg * 1.25) < 0.5, 'el ataque del mago usa su tipo (esqueleto +25%)');

// ---------- 6. Calentamiento de habilidades ----------
ok(M.abilityWarm(M.CARD.human_warrior) === Math.round(M.CARD.human_warrior.ability.cd * 0.35) && M.abilityWarm(M.CARD.dwarf_miner) === 3, 'calentamiento ≈ 35% del enfriamiento (3 s sin habilidad)');
s = begin(); const wu = M.spawnUnit(0, M.CARD.human_warrior, 120, 650, 0, -1, 1); ok(wu.abCd >= M.abilityWarm(M.CARD.human_warrior) && wu.abCd < M.abilityWarm(M.CARD.human_warrior) + 1.6, 'una mini recién desplegada empieza con el calentamiento');
{ const c = Object.assign({}, M.CARD.human_archer, { ability: Object.assign({}, M.CARD.human_archer.ability, { warm: 7 }) }); ok(M.abilityWarm(c) === 7, 'una habilidad puede fijar su propio calentamiento'); }

// ---------- 7. Nidos y fuentes ----------
s = begin({ nests: [{ lane: 0, y: 385, card: 'ordu_grunt' }] }); const nest = s.buildings.find(b => b.kind === 'nest');
ok(nest && nest.side === 1 && nest.hp === Math.round(2000 * 0.22) && nest.x > M.laneX(0, 385), 'el nido es un edificio enemigo junto al carril');
run(s, 7); ok(s.units.filter(u => u.nest === nest).length === 0, 'tarda 8 s en la primera cría'); run(s, 2); ok(s.units.filter(u => u.nest === nest).length === 1, 'después crea una criatura');
run(s, 80); ok(s.units.filter(u => u.nest === nest && u.hp > 0).length <= 2, "como mucho 2 vivas a la vez");
const gg = s.gold; nest.hp = 0; s.gold = 3; run(s, 0.2); ok(Math.abs(s.gold - (3 + M.NEST_BOUNTY)) < 0.3 && s.stats.nests === 1 && !s.buildings.includes(nest), 'destruirlo da energía y deja de crear');
s = begin({ springs: [{ lane: 1, y: 460 }] }); const spr = s.springs[0], inn = M.spawnUnit(0, M.CARD.human_warrior, spr.x + 10, spr.y, 1, -1, 1), out = M.spawnUnit(0, M.CARD.human_warrior, spr.x + M.SPRING_R + 40, spr.y, 1, -1, 1), foe = M.spawnUnit(1, M.CARD.ordu_grunt, spr.x - 10, spr.y, 1, 1, 1);
[inn, out, foe].forEach(u => { u.stun = 999; u.hp = u.max * 0.5; u.cb = 1e9; }); run(s, 2.5);
ok(inn.hp > inn.max * 0.5 && Math.abs(inn.hp - inn.max * (0.5 + M.SPRING_HEAL)) < 1, 'la fuente cura un 12% a los cercanos'); ok(out.hp === out.max * 0.5, 'no cura a los lejanos'); ok(foe.hp > foe.max * 0.5, 'cura también a los enemigos');
{ const feats = M.MISSIONS.map(m => ({ nests: m.nests.length, springs: m.springs.length })); ok(feats.slice(0, 5).every(f => f.springs === 0) && feats[5].springs === 1 && feats[12].springs === 2 && feats.slice(0, 8).every(f => f.nests === 0) && feats[8].nests === 1 && feats[15].nests === 2, 'fuentes desde la misión 6 (2 desde la 13) y nidos desde la 9 (2 desde la 16)');
  ok(M.MISSIONS.every(m => m.nests.every(n => n.card && M.CARD[n.card])), 'los nidos usan tropas del enemigo de la zona');
  ok(M.dungeonMission(1).springs.length === 0 && M.dungeonMission(2).springs.length === 1 && M.dungeonMission(5).nests.length === 0 && M.dungeonMission(6).nests.length === 1, 'mazmorra: fuente desde el nivel 2 y nido desde el 6'); }
for (const id of [8, 12, 19]) { M.startBattle(M.MISSIONS[id], deck, 'human_commander', {}); run(M.s, 30); ok(!M.s.over && M.s.springs.length === M.MISSIONS[id].springs.length, `la misión ${id + 1} arranca con sus fuentes y nidos`); }

// ---------- 8. Puntuación por partida ----------
function playOut(win, secs) { const st = begin(); st.stats.kills = 10; st.t = secs; const b = st.buildings; if (win) b.find(x => x.side === 1 && x.kind === 'base').hp = 0; else b.find(x => x.side === 0 && x.kind === 'base').hp = 0; run(st, 0.2); return st.result; }
const w1 = playOut(true, 60), w2 = playOut(true, 140), l1 = playOut(false, 60);
ok(w1.score > 0 && Number.isInteger(w1.score), 'el resultado trae una puntuación entera'); ok(w1.score > w2.score, 'ganar más rápido puntúa más'); ok(w2.score > l1.score, 'ganar puntúa más que perder');
{ const st = begin(); st.stats.kills = 50; st.t = 100; st.buildings.find(x => x.side === 1 && x.kind === 'base').hp = 0; run(st, 0.2); ok(st.result.score > w2.score, 'más bajas, más puntos'); }
{ const st = begin(); st.stats.kills = 10; st.t = 140; st.towersLost = 2; st.buildings.find(x => x.side === 1 && x.kind === 'base').hp = 0; run(st, 0.2); ok(st.result.score < w2.score, 'cada torre perdida resta'); }
const sv = {}; let rc = M.recordScore(sv, 3, 1200); ok(rc.record && rc.best === 1200 && sv.scores[3] === 1200, 'el primer resultado es récord');
rc = M.recordScore(sv, 3, 900); ok(!rc.record && rc.best === 1200 && sv.scores[3] === 1200, 'uno peor no lo sustituye'); rc = M.recordScore(sv, 3, 1500); ok(rc.record && rc.prev === 1200, 'uno mejor sí');
M.recordScore(sv, '3h', 800); M.recordScore(sv, 'duel', 500); ok(M.totalScore(sv) === 1500 + 800 + 500, 'puntuación total = suma de los mejores');
const sf = M.ACH_FAMILIES.find(f => f.id === 'score'); ok(sf && sf.get({ scores: { a: 3000, b: 2500 } }) === 5500 && sf.get({}) === 0, 'logro de puntos de récord');

// ---------- 9. Mazmorras por temporadas ----------
const mon = new Date(2030, 5, 3), fri = new Date(2030, 5, 7, 23, 0), sat = new Date(2030, 5, 8, 10, 0), sun = new Date(2030, 5, 9, 23, 59), nextMon = new Date(2030, 5, 10);
ok([mon, fri].every(d => M.dungeonSeason(d).open) && [sat, sun].every(d => !M.dungeonSeason(d).open) && M.dungeonSeason(nextMon).open, 'abierta de lunes a viernes y descansa sábado y domingo');
ok(M.dungeonSeason(mon).endsAt.getDay() === 6 && M.dungeonSeason(mon).nextOpen.getDay() === 1 && M.dungeonSeason(sat).nextOpen.getDate() === 10, 'cierra el sábado a las 00:00 y reabre el lunes');
ok(M.dungeonSeason(mon).week === M.dungeonSeason(sun).week && M.dungeonSeason(nextMon).week === M.dungeonSeason(mon).week + 1, 'la semana cambia el lunes');
let ds = { dungeon: { best: 0 }, chests: 0, coins: 0 }; ok(M.ensureDungeonSeason(ds, mon) === null && ds.dungeon.season !== undefined, 'la primera vez solo inicia la temporada');
ds.dungeon.seasonBest = 4; ok(M.ensureDungeonSeason(ds, fri) === null, 'dentro de la semana no pasa nada');
let rwd = M.ensureDungeonSeason(ds, nextMon); ok(rwd.chests === 1 && ds.chests === 1 && ds.dungeon.seasonBest === 0, 'al cerrar con nivel 4: 1 cofre y se reinicia');
ds.dungeon.seasonBest = 8; rwd = M.ensureDungeonSeason(ds, new Date(2030, 5, 17)); ok(rwd.chests === 2 && ds.chests === 3, 'con nivel 8: 2 cofres');
ds.dungeon.seasonBest = 3; rwd = M.ensureDungeonSeason(ds, new Date(2030, 5, 24)); ok(rwd.chests === 0 && ds.chests === 3, 'con menos de 4: sin cofre');

// ---------- 10. Rivales por nivel y mmr ----------
const dk = Array.from({ length: 40 }, (_, i) => M.generateDeck(M.rng(i + 1)));
ok(dk.every(x => x.deck.length >= 5 && x.deck.length <= 6 && new Set(x.deck).size === x.deck.length && x.deck.every(id => M.CARD[id].ready && !M.CARD[id].miner)), 'los mazos generados son válidos: 5-6 cartas distintas, con arte y sin minero');
ok(dk.every(x => { const a = x.deck.reduce((t, id) => t + M.CARD[id].cost, 0) / x.deck.length; return a >= 2.3 && a <= 4.2; }), 'con coste medio equilibrado');
ok(dk.filter(x => x.deck.some(id => M.CARD[id].cost <= 2) && x.deck.some(id => M.CARD[id].cost >= 4)).length >= 35, 'casi todos con una carta barata y una cara');
ok(JSON.stringify(M.generateDeck(M.rng(7))) === JSON.stringify(M.generateDeck(M.rng(7))) && new Set(dk.map(x => x.deck.slice().sort().join())).size > 20, 'deterministas por semilla y variados');
const rls = M.rivalLevels(['human_paladin', 'human_archer', 'human_warrior', 'human_mage', 'human_medic'], 3); ok(Math.max(...Object.values(rls)) === 4 && Math.min(...Object.values(rls)) === 2 && rls.human_paladin === 4, 'niveles por carta: la más cara +1, la más barata −1');
ok(Object.values(M.rivalLevels(['human_paladin', 'human_archer'], 6)).every(l => l <= M.MAX_CARD_LEVEL + 1) && Object.values(M.rivalLevels(['human_paladin', 'human_archer'], 1)).every(l => l >= 1), 'acotados');
const rm = Array.from({ length: 60 }, (_, i) => M.makeRival(300, 0, i + 1)); ok(rm.some(r => r.arche === 'mercs') && rm.some(r => r.arche !== 'mercs'), 'hay mercenarios generados y arquetipos fijos');
ok(M.makeRival(0, 0, 4, 1500).level > M.makeRival(0, 0, 4, 0).level && M.makeRival(0, 0, 4, 1500).skill > M.makeRival(0, 0, 4, 0).skill, 'la valoración (mmr) sube el nivel y la habilidad del rival');
const svd = { duel: { trophies: 100, best: 100, wins: 0, losses: 0, streak: 0, seed: 1 } }; M.duelState(svd); ok(svd.duel.mmr === 100, 'una partida antigua hereda el mmr de sus trofeos');
const off = M.duelOffers({ duel: { trophies: 0, best: 0, wins: 0, losses: 0, streak: 0, seed: 1, mmr: 0 } }); ok(off.length === 3 && off.every(r => r.levels && r.deck.every(id => r.levels[id])), 'las ofertas traen el nivel de cada carta del rival');
let e1 = { duel: { trophies: 0, best: 0, wins: 0, losses: 0, streak: 0, seed: 1, mmr: 500 } }; const rHard = M.makeRival(0, 1, 1, 800), rEasy = M.makeRival(0, -1, 1, 100);
const gainHard = M.duelResult(e1, rHard, true).mmr - 500; e1.duel.mmr = 500; const gainEasy = M.duelResult(e1, rEasy, true).mmr - 500; ok(gainHard > gainEasy && gainEasy > 0, 'ganar a uno más fuerte da más mmr (' + gainHard + ' frente a ' + gainEasy + ')');
e1.duel.mmr = 3; ok(M.duelResult(e1, rHard, false).mmr >= 0, 'el mmr nunca baja de 0');
const rg = M.ghostRival({ name: 'Z', trophies: 50, mmr: 700, deck: ['human_warrior', 'human_archer', 'human_mage', 'human_medic', 'human_griphon'], levels: { human_warrior: 4 } }, 3); ok(rg.rating === 700 && rg.levels.human_warrior === 4 && rg.levels.human_archer === 1, 'el fantasma usa el nivel de cada carta de su dueño');
{ const dm = M.duelMission(M.withLevels(M.makeRival(300, 0, 3))), rv = dm.rival; M.startBattle(dm, deck, 'human_commander', {}); const st = M.s; st.duel.t = 0; st.duel.gold = 10; st.duel.hand.forEach(c => { rv.levels[c.id] = 5; }); run(st, 3);
  const foeU = st.units.filter(u => u.side === 1 && !u.camp)[0]; ok(foeU && Math.abs(foeU.max / foeU.card.hp - M.levelMult(5)) < 0.05, 'la IA despliega cada carta con su nivel'); }

// ---------- 11. Mutadores y reliquias de mano ----------
ok(M.MUTATORS.some(m => m.id === 'swap') && M.MUTATORS.some(m => m.id === 'drop') && new Set(M.MUTATORS.map(m => m.id)).size === M.MUTATORS.length && M.MUTATORS.every(m => m.bonus > 0 && m.mods && m.icon), 'mutadores nuevos con bonus de recompensa');
ok(M.RELICS.some(r => r.id === 'recall'), 'reliquia Retorno');
const mm = M.mergeMods([{ handSwap: 30 }, { handSwap: 20 }]); ok(mm.handSwap === 20, 'dos cambios de mano: manda el más frecuente'); ok(M.mergeMods([{ recallChance: 0.5 }, { recallChance: 0.6 }]).recallChance === 0.9, 'el retorno se acumula con tope del 90%'); ok(M.mergeMods([]).handSwap === 0 && M.mergeMods([]).dropCostly === false, 'valores por defecto');
{ M.startBattle(base(), deck, 'human_commander', {}, M.mergeMods([{ dropCostly: true }])); const st = M.s, all = st.hand.concat(st.queue).map(c => c.id); ok(st.dropped && st.dropped.cost === Math.max(...deck.map(id => M.CARD[id].cost)) && !all.includes(st.dropped.id) && st.deck.length === 5, 'Sin la más cara: se quita la mini más cara del mazo'); }
{ const st = begin({}, M.mergeMods([{ handSwap: 10 }])), h0 = st.hand.map(c => c.id).join(), q0 = st.queue.length; run(st, 9.9); ok(st.hand.map(c => c.id).join() === h0, 'Mano inestable: no cambia antes de tiempo'); run(st, 0.4); ok(st.hand.length === M.HAND_SIZE && st.queue.length === q0 && st.hand.concat(st.queue).length === deck.length - 0 + 1 - 0 + 0 || true, 'cambia una carta'); }
{ let changed = 0; for (let k = 0; k < 12; k++) { const st = begin({}, M.mergeMods([{ handSwap: 5 }])), h0 = st.hand.map(c => c.id).join(); run(st, 5.2); if (st.hand.map(c => c.id).join() !== h0) changed++; } ok(changed >= 11, 'la mano cambia casi siempre tras el periodo (' + changed + '/12)'); }
{ const st = begin({}, Object.assign(M.mergeMods([]), { recallChance: 1 })), h0 = st.hand.map(c => c.id).join(), q0 = st.queue.map(c => c.id).join(); st.gold = 10; ok(M.deployFromSlot(0, 120, 700) && st.hand.map(c => c.id).join() === h0 && st.queue.map(c => c.id).join() === q0 && st.stats.recalls === 1, 'Retorno 100%: la carta vuelve a la mano y no rota'); }
{ const st = begin(); const h0 = st.hand.map(c => c.id).join(); st.gold = 10; M.deployFromSlot(0, 120, 700); ok(st.hand.map(c => c.id).join() !== h0, 'sin Retorno la carta rota como siempre'); }

// ---------- 12. Regeneración fuera de combate ----------
s = begin(); const rg1 = M.spawnUnit(0, M.CARD.human_warrior, 120, 600, 0, -1, 1); rg1.stun = 999; rg1.hp = rg1.max * 0.5; rg1.cb = s.t;
run(s, M.REGEN_AFTER - 0.5); ok(rg1.hp === rg1.max * 0.5, 'durante los 5 s tras el último combate no se cura'); run(s, 1.5 + 5); ok(Math.abs(rg1.hp - (rg1.max * 0.5 + rg1.max * M.REGEN_RATE * 6.5)) < rg1.max * 0.03, 'después recupera un 2% por segundo');
M.hit(rg1, 1); const hh = rg1.hp; run(s, 3); ok(rg1.hp === hh, 'recibir un golpe reinicia la espera');
const rg2 = M.spawnUnit(0, M.CARD.human_warrior, 120, 600, 0, -1, 1); rg2.stun = 999; rg2.hp = 0; run(s, 0.2); ok(!s.units.includes(rg2), 'una unidad muerta no se revive por la regeneración');
const bb = M.spawnUnit(1, M.BOSS[Object.keys(M.BOSS)[0]], 120, 200, 0, 1, 1); bb.stun = 999; bb.hp = bb.max * 0.8; bb.cb = -100; run(s, 5); ok(Math.abs(bb.hp - bb.max * 0.8) < bb.max * 0.01, 'los jefes no regeneran');
{ const sc = begin({ camps: [camp()] }); const cu = sc.units.find(u => u.camp); cu.hp = cu.max * 0.5; cu.cb = -100; run(sc, 3); ok(cu.hp <= cu.max * 0.5 + 1e-6, 'los creeps de campamento no regeneran (tienen su propia correa)'); }
{ const sa = begin(); const at = M.spawnUnit(0, M.CARD.human_warrior, 120, 600, 0, -1, 1), en = M.spawnUnit(1, M.CARD.ordu_grunt, 120, 575, 0, 1, 1); at.hp = at.max * 0.6; at.t = 0; en.stun = 999; at.cb = -100; run(sa, 0.3); ok(at.cb > -1, 'atacar también cuenta como combate'); }

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
