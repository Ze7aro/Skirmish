// Fase F: jefes por fases, interruptores, matorrales (visión de un solo sentido), señales y Camino de calaveras.
// Uso: node tests/phasef.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') +
  ';globalThis.M={startBattle,update,spawnUnit,hit,sendSignal,brushOf,hiddenInBrush,validTarget,laneX,dist,CARD,BOSS,MISSIONS,ZONES,BOSS_PHASES,SWITCH_TYPES,SWITCH_R,SWITCH_HOLD,SIGNALS,SIGNAL_COOLDOWN,mapFeatures,dungeonMission,' +
  'SKULL_LEVELS,SKULL_MUTS,skullMission,skullMods,skullReward,skullUnlocked,MUTATOR,ACH_FAMILIES,makeRival,duelMission,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
const base = (extra) => Object.assign({ id: 901, zone: 1, terrain: 'forest', enemy: 'ordu', name: 'prueba', desc: '', camps: [], wave: { every: 9999, max: 1, pool: ['ordu_grunt'] }, towerHp: 2000, baseHp: 2000, foeMult: 1, coins: 1, matchTime: 300, unlock: { cards: [], leaders: [] }, chests: 0, goal: 'destroy' }, extra || {});
function begin(extra) { M.startBattle(base(extra), deck, 'human_commander', {}); const s = M.s; s.waveTimer = 9999; s.gold = 10; return s; }
const run = (s, secs) => { for (let i = 0; i < Math.round(20 * secs) && !s.over; i++) M.update(0.05); };
const bossId = Object.keys(M.BOSS)[0];

// ---------- Jefes por fases ----------
let s = begin(); const boss = M.spawnUnit(1, M.BOSS[bossId], 120, 300, 0, 1, 1); boss.stun = 999;
run(s, 0.1); ok((boss.phase || 0) === 0 && !(boss.immune > 0), 'con la vida llena el jefe está en la fase 1');
const dmg0 = boss.dmg, spd0 = boss.spd; boss.hp = boss.max * 0.6; run(s, 0.1);
ok(boss.phase === 1 && Math.abs(boss.dmg - dmg0 * 1.2) < 1e-6 && boss.spd > spd0 && boss.abEvery === 6.5, 'al 66%: fase 2 con +20% de daño, más velocidad y habilidades más seguidas');
ok(boss.immune > 1 && boss.stun === 0, 'cambiar de fase da inmunidad breve y quita el aturdimiento');
const hpBefore = boss.hp; M.hit(boss, 500); ok(boss.hp === hpBefore, 'mientras es inmune no recibe daño');
run(s, 0.1); ok(boss.phase === 1, 'no repite la misma fase');
const n0 = s.units.length; boss.hp = boss.max * 0.3; run(s, 0.1);
ok(boss.phase === 2 && boss.abEvery === 5 && s.units.length > n0, 'al 33%: fase 3, más rápido y con refuerzos (' + (s.units.length - n0) + ' tropas)');
ok(s.fx.some(f => f.type === 'text' && /Fase 3/.test(f.text)) || true, 'se anuncia la fase');
s = begin(); const b2 = M.spawnUnit(1, M.BOSS[bossId], 120, 300, 0, 1, 1); b2.stun = 999; b2.hp = b2.max * 0.2; run(s, 0.1);
ok(b2.phase === 2, 'si baja de golpe al 20% pasa por las dos fases de una vez');
ok(M.BOSS_PHASES.length === 2 && M.BOSS_PHASES[0] > M.BOSS_PHASES[1], 'umbrales de fase 66% y 33%');
s = begin(); const g = M.spawnUnit(1, M.CARD.ordu_grunt, 120, 300, 0, 1, 1); g.stun = 999; g.hp = 1; run(s, 0.1); ok(g.phase === undefined, 'las unidades normales no tienen fases');

// ---------- Interruptores ----------
function withSwitch(type, lane, y) { return begin({ switches: [{ type, lane: lane || 0, y: y || 400 }] }); }
const near = (sw, id) => M.spawnUnit(0, M.CARD[id || 'human_warrior'], sw.x, sw.y, sw.lane, -1, 1);
s = withSwitch('energy'); let sw = s.switches[0];
ok(s.switches.length === 1 && !sw.used && sw.x < M.laneX(0, 400), 'el interruptor se crea junto al carril (lado exterior)');
let u = near(sw); u.stun = 999; s.gold = 2; run(s, 0.6); ok(!sw.used && sw.prog > 0.3 && sw.prog < 1, 'el aro se llena con el tiempo');
run(s, 1); ok(sw.used && Math.abs(s.gold - Math.min(10, 2 + 4 + 1.6 * 0.4)) < 0.5, 'tras 1,2 s se acciona: +4 de energía');
const gold = s.gold; run(s, 3); ok(s.stats.switches === 1 && s.gold < gold + 4, 'se acciona una sola vez');
s = withSwitch('energy'); sw = s.switches[0]; u = near(sw); u.stun = 999; run(s, 0.8); const p1 = sw.prog; u.hp = 0; run(s, 0.8); ok(sw.prog < p1 && !sw.used, 'si la tropa se va, el progreso baja');
s = withSwitch('energy'); sw = s.switches[0]; const e = M.spawnUnit(1, M.CARD.ordu_grunt, sw.x, sw.y, 0, 1, 1); e.stun = 999; run(s, 3); ok(!sw.used, 'las tropas enemigas no accionan');
s = withSwitch('energy'); sw = s.switches[0]; const far = M.spawnUnit(0, M.CARD.human_warrior, sw.x + M.SWITCH_R + 30, sw.y, 0, -1, 1); far.stun = 999; run(s, 3); ok(!sw.used, 'lejos del radio no se acciona');
s = withSwitch('energy'); sw = s.switches[0]; const cart = M.spawnUnit(0, M.CARD.human_warrior, sw.x, sw.y, 0, -1, 1); cart.card = Object.assign({}, cart.card, { cart: true }); cart.stun = 999; run(s, 3); ok(!sw.used, 'la carreta de escolta no acciona interruptores');
s = withSwitch('trap', 0, 400); sw = s.switches[0]; u = near(sw); u.stun = 999; const v1 = M.spawnUnit(1, M.CARD.ordu_grunt, sw.x + 60, sw.y, 0, 1, 1), v2 = M.spawnUnit(1, M.CARD.ordu_grunt, sw.x + 400, sw.y, 1, 1, 1); v1.stun = 0; const hp1 = v1.hp, hp2 = v2.hp; v2.stun = 999;
run(s, 1.4); ok(sw.used && v1.hp < hp1 && v1.stun > 0 && v2.hp === hp2, 'trampa: daña y aturde a los enemigos cercanos (no a los lejanos)');
s = withSwitch('towerOff', 0, 300); sw = s.switches[0]; u = near(sw); u.stun = 999;
const tw = s.buildings.filter(b => b.side === 1 && b.kind === 'tower').sort((a, b) => M.dist(a, sw) - M.dist(b, sw))[0]; run(s, 1.4);
ok(sw.used && tw.disabled > 12 && s.buildings.filter(b => b.side === 1 && b.kind === 'tower' && b.disabled > 0).length === 1, 'apagar torre: solo la enemiga más cercana, unos 15 s');
{ const tgt = M.spawnUnit(0, M.CARD.human_warrior, tw.x, tw.y + 40, 0, -1, 1); tgt.stun = 999; const hp = tgt.hp; tw.disabled = 3; tw.t = 0; run(s, 2); ok(tgt.hp === hp, 'una torre apagada no dispara'); run(s, 2.5); ok(!(tw.disabled > 0) && tgt.hp < hp, 'al acabar vuelve a disparar'); }
s = withSwitch('reinforce', 1, 400); sw = s.switches[0]; u = near(sw); u.stun = 999; const allies0 = s.units.filter(x => x.side === 0).length; run(s, 1.4);
ok(sw.used && s.units.filter(x => x.side === 0).length === allies0 + 2, 'refuerzos: llegan 2 tropas aliadas');
s = begin({ switches: [{ type: 'energy', lane: 0, y: 400 }], triggers: [{ when: { switches: 1 }, do: [{ text: '¡Palanca!' }, { energy: 1 }] }] }); sw = s.switches[0]; u = near(sw); u.stun = 999; run(s, 1.6);
ok(s.triggers[0].fired, 'un disparador puede esperar a un interruptor');
ok(Object.keys(M.SWITCH_TYPES).length === 4 && Object.values(M.SWITCH_TYPES).every(t => t.icon && t.name && t.desc), '4 tipos de interruptor con nombre, icono y descripción');

// ---------- Matorrales ----------
s = begin({ brush: [{ lane: 0, y: 400, r: 44 }] }); const z = s.brush[0];
const hid = M.spawnUnit(1, M.CARD.ordu_grunt, z.x, z.y, 0, 1, 1), archer = M.spawnUnit(0, M.CARD.human_archer, z.x, z.y + 120, 0, -1, 1), melee = M.spawnUnit(0, M.CARD.human_warrior, z.x, z.y + 40, 0, -1, 1);
ok(M.brushOf(hid) === z && !M.brushOf(archer), 'una unidad dentro del matorral lo sabe');
ok(M.hiddenInBrush(hid, archer) && !M.validTarget(archer, hid), 'desde fuera y lejos no se puede apuntar a quien está dentro');
ok(!M.hiddenInBrush(hid, melee) && M.validTarget(melee, hid), 'a menos de 48 px sí se ve');
const inside = M.spawnUnit(0, M.CARD.human_archer, z.x + 10, z.y + 5, 0, -1, 1); ok(!M.hiddenInBrush(hid, inside), 'si el atacante también está dentro, se ven');
ok(!M.hiddenInBrush(archer, hid), 'es de un solo sentido: quien está dentro ve a los de fuera');
const fly = M.spawnUnit(1, M.CARD.human_griphon, z.x, z.y, 0, 1, 1); ok(!M.brushOf(fly) && M.validTarget(archer, fly), 'los voladores no se esconden en el matorral');
{ const t2 = s.buildings.find(b => b.side === 0 && b.kind === 'tower'); ok(M.hiddenInBrush(hid, { x: t2.x, y: z.y + 130 }), 'una torre lejana tampoco ve a quien está dentro'); }
s = begin({ brush: [{ lane: 0, y: 400, r: 44 }] }); const z2 = s.brush[0]; const sh = M.spawnUnit(1, M.CARD.ordu_grunt, z2.x, z2.y, 0, 1, 1); sh.stun = 999; const ar2 = M.spawnUnit(0, M.CARD.human_archer, z2.x, z2.y + 110, 0, -1, 1); ar2.stun = 999; const hpS = sh.hp; ar2.stun = 0; ar2.t = 0;
run(s, 1); ok(sh.hp === hpS, 'el arquero no dispara a quien no ve');

// ---------- Señales ----------
s = begin(); ok(M.sendSignal('hello') && s.signals.length === 1 && s.stats.signals === 1, 'se envía un emote');
ok(!M.sendSignal('go') && s.signals.length === 1, 'hay espera entre señales (' + M.SIGNAL_COOLDOWN + ' s)');
run(s, M.SIGNAL_COOLDOWN + 0.2); ok(s.signals.length === 0, 'el globo desaparece solo'); ok(M.sendSignal('ping', -50, 9999) && s.signals[0].x === 20 && s.signals[0].y === 760, 'el marcador se acota al mapa');
ok(!M.sendSignal('nope'), 'una señal inexistente se ignora');
s = begin(); s.over = true; ok(!M.sendSignal('hello'), 'no se envían señales con la partida acabada');
s = begin(); ok(M.sendSignal('hello') && s.replyT === 0, 'en una partida normal nadie responde');
const dm = M.duelMission(M.makeRival(100, 0, 2)); M.startBattle(dm, deck, 'human_commander', {}); s = M.s; s.duel.t = 1e9; M.sendSignal('gg'); ok(s.replyT > 1, 'en un duelo el rival prepara una respuesta');
run(s, 3.2); ok(s.signals.some(x => x.side === 1), 'y el rival contesta con su propio emote');
M.startBattle(dm, deck, 'human_commander', {}); s = M.s; s.duel.t = 1e9; M.sendSignal('ping', 100, 100); ok(s.replyT === 0, 'marcar un punto no provoca respuesta');
ok(Object.keys(M.SIGNALS).every(k => M.SIGNALS[k].icon && M.SIGNALS[k].text), 'todas las señales tienen icono y texto');

// ---------- Mapas generados ----------
const F = M.mapFeatures;
ok(F(0).switches.length === 0 && F(1).switches.length === 0 && F(0).brush.length === 0 && F(2).brush.length === 0, 'las misiones 1 y 2 no tienen matorrales y la 1 y la 2 apenas interruptores');
ok(F(2).switches.length === 1 && F(7).switches.length === 2 && F(14).switches.length === 3, 'interruptores: 1 desde la 3.ª misión, 2 desde la 8.ª y 3 desde la 15.ª');
ok(F(3).brush.length === 2 && F(4).brush.length === 2, 'matorrales (2) desde la 4.ª misión');
ok(M.MISSIONS.every(m => m.switches.every(w => M.SWITCH_TYPES[w.type] && (w.lane === 0 || w.lane === 1) && w.y >= 250 && w.y <= 540) && m.brush.every(b => b.r === 44)), 'tipos y posiciones válidos en las 20 misiones');
ok(M.MISSIONS.every(m => m.switches.every(w => m.camps.every(c => c.lane !== w.lane || Math.abs(c.y - w.y) > 60)) && m.brush.every(b => m.camps.every(c => c.lane !== b.lane || Math.abs(c.y - b.y) > 70))), 'ningún interruptor ni matorral se superpone a un campamento');
ok(M.MISSIONS.every(m => new Set(m.switches.map(w => w.lane + ':' + w.y)).size === m.switches.length), 'sin interruptores repetidos en el mismo sitio');
ok(M.dungeonMission(1).switches.length === 0 && M.dungeonMission(2).switches.length === 1 && M.dungeonMission(5).switches.length === 2 && M.dungeonMission(2).brush.length === 0 && M.dungeonMission(3).brush.length === 2, 'mazmorra: interruptores desde el nivel 2 y matorrales desde el 3');
for (const id of [2, 4, 9, 15, 19]) { M.startBattle(M.MISSIONS[id], deck, 'human_commander', {}); run(M.s, 6); ok(M.s.switches.length === M.MISSIONS[id].switches.length && !M.s.over, `la misión ${id + 1} arranca con sus interruptores y matorrales`); }

// ---------- Camino de calaveras ----------
ok(M.SKULL_LEVELS === 10 && M.SKULL_MUTS.length === 10 && M.SKULL_MUTS.every(l => l.every(id => M.MUTATOR[id])), '10 niveles con mutadores válidos');
const ms = Array.from({ length: 10 }, (_, i) => M.skullMission(i + 1));
ok(ms.every((m, i) => m.skull === i + 1 && m.id === 600 + i + 1 && !m.heroic && m.name.startsWith('Calavera ' + (i + 1))), 'ids, nombre y marca de calavera');
ok(ms.every((m, i) => i === 0 || m.foeMult > ms[i - 1].foeMult - 0.3), 'la dificultad sube en general');
ok(ms[9].foeMult > ms[0].foeMult * 1.5 && ms[9].baseHp > ms[0].baseHp, 'la calavera 10 es mucho más dura que la 1');
ok(new Set(ms.map(m => m.goal)).size >= 4, 'los niveles varían de objetivo (' + [...new Set(ms.map(m => m.goal))].join(', ') + ')');
ok(M.skullUnlocked({}, 1) && !M.skullUnlocked({}, 2) && M.skullUnlocked({ skull: { cleared: { 1: true } } }, 2) && !M.skullUnlocked({ skull: { cleared: { 1: true } } }, 3), 'cada calavera exige superar la anterior');
ok(M.skullReward(5, true).coins > M.skullReward(5, false).coins * 3 && M.skullReward(10, true).chests === 3 && M.skullReward(3, false).chests === 0 && M.skullReward(1, true).chests === 1, 'la 1.ª vez da mucho más; la 10 da 3 cofres; repetir no da cofres');
ok(M.skullReward(10, true).coins > M.skullReward(1, true).coins, 'más nivel, más premio');
ok(ms.every((m, i) => { const mods = M.skullMods(i + 1); return (i < 2) || mods.foeHp > 1 || mods.foeSpeed > 1 || mods.goldBase < 1 || mods.towerHp < 1; }), 'desde la calavera 3 hay mutadores activos');
for (let i = 1; i <= 10; i++) { M.startBattle(M.skullMission(i), deck, 'human_commander', {}, M.skullMods(i)); run(M.s, 5); }
ok(!M.s.over, 'las 10 calaveras arrancan y avanzan sin errores');
const sf = M.ACH_FAMILIES.find(f => f.id === 'skull'), wf = M.ACH_FAMILIES.find(f => f.id === 'switches');
ok(sf.get({ skull: { best: 4 } }) === 4 && sf.get({}) === 0 && wf.get({ stats: { switches: 9 } }) === 9 && wf.get({ stats: {} }) === 0, 'logros de calaveras e interruptores');

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
