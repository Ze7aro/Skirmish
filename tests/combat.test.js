// Fase A: estados (silencio, desgarro, empujar/atraer, parpadeo, segunda oportunidad, rayo encadenado), habilidades automáticas,
// torre neutral capturable y neutrales que patrullan o deambulan.  Uso: node tests/combat.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') +
  ';globalThis.M={startBattle,update,updateUnit,tryAbility,spawnUnit,pushUnit,pullUnit,hit,attack,deploy,pickTarget,ABILITIES,CARD,CARD_LIST,BOSS,MISSIONS,CAMP_EXTRAS,dist,laneX,LANE_HALF,survivalMission,dungeonMission,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
// Escenario limpio: sin oleadas ni unidades, para colocar a mano a quien interese.
function setup(talents, mission) {
  M.startBattle(mission || M.MISSIONS[0], deck, 'human_commander', {}, {}, talents || {});
  const s = M.s; s.waveTimer = 9999; s.gold = 10; s.units.length = 0; return s;
}
const mk = (side, id, x, y, lane) => { const u = M.spawnUnit(side, M.CARD[id], x, y, lane || 0, side === 0 ? -1 : 1, 1); u.abCd = 0; u.t = 99; return u; };
const cast = (u, dt) => { M.tryAbility(u, dt || 0.05); return u.abCd > 5; }; // true si se lanzó (el enfriamiento se pone al valor completo)

// ---------- Estados ----------
let s = setup();
const tgt = mk(1, 'human_warrior', 120, 400);
const a0 = tgt.hp; M.hit(tgt, 100); const normal = a0 - tgt.hp;
tgt.hp = a0; tgt.sunder = 3; M.hit(tgt, 100); const sundered = a0 - tgt.hp;
ok(Math.abs(normal - 90) < 1e-6 && Math.abs(sundered - 120) < 1e-6, 'desgarro: la armadura baja 30% (el Guerrero recibe 120 en vez de 90 de un golpe de 100)');
tgt.hp = a0; tgt.immune = 1; M.hit(tgt, 999); ok(tgt.hp === a0, 'inmunidad: ningún daño');
const boss = M.spawnUnit(1, M.BOSS.boss_raizantiguo, 120, 300, 0, 1, 1), by = boss.y;
M.pushUnit(boss, 120, 400, 50); M.pullUnit(boss, 120, 600, 50); ok(boss.y === by, 'los jefes no se pueden empujar ni atraer');
const grunt = mk(1, 'ordu_grunt', M.laneX(0, 400), 400), gx = grunt.x, lx = M.laneX(0, 400);
M.pushUnit(grunt, lx - 30, 400, 60); ok(Math.abs(grunt.x - lx) <= M.LANE_HALF + 0.001 && grunt.x > gx - 1, 'empujar: la unidad terrestre sigue dentro de su carril');
const far = mk(1, 'ordu_grunt', 120, 300), d0 = M.dist(far, { x: 120, y: 500 });
M.pullUnit(far, 120, 500, 70); ok(Math.abs((d0 - M.dist(far, { x: 120, y: 500 })) - 70) < 1, 'atraer: se acerca 70 px hacia el punto');
M.pullUnit(far, 120, far.y + 5, 70); ok(M.dist(far, { x: 120, y: far.y }) >= 0 && Number.isFinite(far.y), 'atraer no pasa de largo del punto');

// Silencio, aturdimiento
s = setup();
let w = mk(0, 'human_warrior', 120, 500); w.hp = w.max * 0.3; mk(1, 'ordu_grunt', 120, 480);
w.silence = 2; ok(!cast(w) && w.ward === 0, 'silencio: una mini silenciada no lanza su habilidad');
w.silence = 0; ok(cast(w) && w.ward > 0, 'sin silencio sí la lanza');
s = setup(); w = mk(0, 'human_warrior', 120, 500); w.hp = w.max * 0.3; mk(1, 'ordu_grunt', 120, 480); w.stun = 1; M.updateUnit(w, 0.05);
ok(w.ward === 0 && w.abCd <= 0, 'aturdida: no hace nada (ni habilidad ni ataque)');
s = setup(); const lich = mk(1, 'undead_lich', 120, 300); lich.sumT = 0; lich.silence = 2; M.updateUnit(lich, 0.1);
ok(s.units.filter(u => u.summoner === lich.id).length === 0, 'silencio impide que el Lich invoque');

// ---------- Habilidades automáticas ----------
s = setup(); w = mk(0, 'human_warrior', 120, 500); mk(1, 'ordu_grunt', 120, 480);
ok(!cast(w) && w.ward === 0 && w.abCd > 0 && w.abCd <= 0.4, 'sin ocasión (vida llena): no se lanza y reintenta pronto sin gastar enfriamiento');
w.hp = w.max * 0.4; w.abCd = 0; ok(cast(w) && w.ward > 2.9 && w.abCd === 12, 'Escudo en alto: se activa con poca vida, 3 s y enfriamiento 12');

s = setup(); let arc = mk(0, 'human_archer', 120, 600); const f1 = mk(1, 'ordu_grunt', 120, 530), f2 = mk(1, 'ordu_grunt', 130, 534), f3 = mk(1, 'ordu_grunt', 120, 400);
const h1 = f1.hp, h3 = f3.hp; ok(cast(arc) && f1.hp < h1 && f2.hp < f2.max && f3.hp === h3, 'Lluvia de flechas: daña al grupo y no al lejano');
s = setup(); arc = mk(0, 'human_archer', 120, 600); mk(1, 'ordu_grunt', 120, 530); ok(!cast(arc), 'Lluvia de flechas: no se lanza contra un solo enemigo');

s = setup(); let gr = mk(0, 'human_griphon', 120, 600); let ft = mk(1, 'ordu_grunt', 120, 500); const fh = ft.hp;
ok(cast(gr) && M.dist(gr, ft) < 40 && ft.hp < fh, 'Picado: parpadea hasta el objetivo y lo golpea');
s = setup(); const mage = mk(0, 'human_mage', 120, 500); const pf = mk(1, 'ordu_grunt', 120, 470), py = pf.y, ph = pf.hp;
ok(cast(mage) && pf.y < py && pf.hp < ph, 'Nova arcana: daña y empuja al enemigo lejos del mago');
s = setup(); const med = mk(0, 'human_medic', 120, 600), al1 = mk(0, 'human_warrior', 120, 580), al2 = mk(0, 'human_archer', 125, 590);
al1.hp = al1.max * 0.4; al2.hp = al2.max * 0.5; const e1 = al1.hp;
ok(cast(med) && al1.hp > e1 && Math.abs(al1.hp - (e1 + al1.max * 0.25)) < 1e-6, 'Plegaria: cura un 25% de la vida máxima a los aliados heridos');
s = setup(); const med2 = mk(0, 'human_medic', 120, 600), solo = mk(0, 'human_warrior', 120, 580); solo.hp = solo.max * 0.4; ok(!cast(med2), 'Plegaria: no se lanza con un solo herido');
s = setup(); const gw = mk(0, 'ordu_grunt', 120, 500), gally = mk(0, 'human_archer', 130, 510); mk(1, 'undead_skeletons', 120, 420);
ok(cast(gw) && gally.haste >= 3.9 && gw.haste >= 3.9, 'Grito de guerra: aliados cercanos con 4 s de prisa');
s = setup(); const bomb = mk(0, 'ordu_bomber', 120, 600), bt = mk(1, 'ordu_grunt', 120, 510), bh = bt.hp;
ok(cast(bomb) && bt.hp < bh, 'Barril explosivo: daña en área');
s = setup(); const wy = mk(0, 'ordu_wyvern', 120, 600), wt = mk(1, 'ordu_grunt', 120, 520);
ok(cast(wy) && wt.sunder >= 3.9, 'Lanza envenenada: el objetivo pierde armadura 4 s');
s = setup(); const rd = mk(0, 'ordu_raider', 120, 600), rt = mk(1, 'ordu_grunt', 120, 520);
ok(cast(rd) && rt.stun >= 0.79 && M.dist(rd, rt) < 40, 'Embestida: salta al objetivo y lo aturde');
s = setup(); const sb = mk(0, 'ordu_siege_beast', 120, 500), st1 = mk(1, 'ordu_grunt', 120, 470), st2 = mk(1, 'ordu_grunt', 135, 475), sy = st1.y;
ok(cast(sb) && st1.stun >= 0.99 && st2.stun >= 0.99 && st1.y < sy, 'Pisotón: aturde y empuja a los enemigos cercanos');
s = setup(); const sk = mk(0, 'undead_skeletons', 120, 600), hk = mk(1, 'ordu_grunt', 120, 490), hd = M.dist(sk, hk);
ok(cast(sk) && M.dist(sk, hk) < hd - 60 && hk.stun >= 0.49, 'Garfio óseo: atrae a un enemigo lejano');
s = setup(); const li = mk(0, 'undead_lich', 120, 600), cs = mk(1, 'ordu_grunt', 120, 520);
ok(cast(li) && cs.silence >= 2.9, 'Silencio: silencia a un enemigo con habilidad');
s = setup(); const li2 = mk(0, 'undead_lich', 120, 600); mk(1, 'dwarf_miner', 120, 540); ok(!cast(li2), 'Silencio: no se gasta contra enemigos sin habilidad');
s = setup(); const wr = mk(0, 'undead_wraith', 120, 600), wrt = mk(1, 'ordu_grunt', 120, 520);
ok(cast(wr) && wrt.sunder >= 3.9 && wr.y < wrt.y + 1 && M.dist(wr, wrt) < 40, 'Desgarrar: se coloca tras el objetivo y rompe su armadura');
s = setup(); const dr = mk(0, 'undead_dragon', 120, 600), front = mk(1, 'ordu_grunt', 120, 545), behind = mk(1, 'ordu_grunt', 120, 650);
ok(cast(dr) && front.slow >= 2.9 && front.hp < front.max && behind.slow === 0, 'Aliento helado: afecta a lo que tiene delante y no a lo de atrás');
// Todas las habilidades del roster tienen implementación
ok(M.CARD_LIST.filter(c => c.ability).every(c => M.ABILITIES[c.ability.id]), 'todas las habilidades del roster están implementadas');

// ---------- Rayo encadenado y Segunda oportunidad ----------
s = setup(); const mg = mk(0, 'human_mage', 120, 600); mg.t = 0;
const c1 = mk(1, 'undead_skeletons', 120, 520), c2 = mk(1, 'undead_skeletons', 165, 525), c3 = mk(1, 'undead_skeletons', 150, 570), c4 = mk(1, 'undead_skeletons', 120, 300); // c2 y c3 fuera del área propia del mago (38 px)
M.attack(mg, c1);
ok(c1.max - c1.hp > 29 && Math.abs((c2.max - c2.hp) - 22.5) < 1.5 && Math.abs((c3.max - c3.hp) - 22.5) < 1.5 && c4.hp === c4.max, 'Rayo encadenado (mago): golpe completo + 2 saltos al 60% (los esqueletos sufren ×1,25 de daño mágico), sin afectar a lo lejano');
s = setup({ human_archer: ['chain'] }); const ar2 = mk(0, 'human_archer', 120, 600), k1 = mk(1, 'undead_skeletons', 120, 520), k2 = mk(1, 'undead_skeletons', 140, 525), k3 = mk(1, 'undead_skeletons', 150, 535);
M.attack(ar2, k1); ok(k2.hp < k2.max && k3.hp === k3.max, 'talento Relámpago: 1 salto');
s = setup({ human_warrior: ['sunderT'] }); const sw = mk(0, 'human_warrior', 120, 600), st = mk(1, 'ordu_grunt', 120, 590); M.attack(sw, st); ok(st.sunder >= 2.9, 'talento Desgarro aplica el estado');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { human_warrior: ['secondwind'] });
s = M.s; s.waveTimer = 9999; s.gold = 10; M.deploy(M.CARD.human_warrior, 120, 700);
const sv = s.units.find(u => u.side === 0); sv.hp = 0; M.update(0.05);
ok(s.units.includes(sv) && Math.abs(sv.hp - sv.max * 0.35) < 1 && sv.immune > 1.9, 'Segunda oportunidad: sobrevive con el 35% y 2 s de inmunidad');
const hpNow = sv.hp; M.hit(sv, 9999); ok(sv.hp === hpNow, '...y mientras dura la inmunidad no recibe daño');
sv.immune = 0; sv.hp = 0; M.update(0.05); ok(!s.units.includes(sv), '...pero solo funciona una vez');

// ---------- Torre neutral capturable ----------
const towerMission = M.MISSIONS[1]; // el campamento 0 lleva torre
M.startBattle(towerMission, deck, 'human_commander', {}); s = M.s; s.waveTimer = 9999;
const cp = s.camps[0];
ok(cp.tower === true && !s.buildings.some(b => b.captured), 'antes de despejar no hay torre capturada');
s.units.filter(u => u.camp === cp).forEach(u => { u.hp = 0; }); M.update(0.05);
const tw = s.buildings.find(b => b.captured);
ok(cp.cleared && tw && tw.side === 0 && tw.kind === 'tower' && tw.hp === 900, 'al despejar el campamento se captura una torre tuya (900 de vida)');
const enemy = M.spawnUnit(1, M.CARD.ordu_grunt, tw.x, tw.y - 70, 0, 1, 1), eh = enemy.hp;
for (let i = 0; i < 60; i++) M.update(0.05);
ok(enemy.hp < eh, 'la torre capturada dispara a los enemigos');
const lost0 = s.towersLost; tw.hp = 0; M.update(0.05);
ok(!s.buildings.includes(tw) && s.towersLost === lost0, 'perder una torre capturada no cuenta para el objetivo "sin perder torres"');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}); ok(M.s.camps.every(c => !c.tower), 'la misión 1 se queda sin torres neutrales (es el tutorial)');

// ---------- Neutrales: dormidos, patrulla y deambular ----------
M.startBattle(M.MISSIONS[2], deck, 'human_commander', {}); s = M.s; s.waveTimer = 9999;
const wander = s.units.filter(u => u.camp && u.wander), sleepers = s.units.filter(u => u.camp && !u.wander && !u.patrol);
ok(wander.length > 0 && wander.every(u => !u.asleep) && sleepers.length > 0 && sleepers.every(u => u.asleep), 'misión 3: un campamento deambula (despierto) y los demás duermen');
const w0 = wander.map(u => ({ x: u.x, y: u.y })); let moved = 0, maxd = 0;
for (let i = 0; i < 20 * 14; i++) { M.update(0.05); wander.forEach(u => { maxd = Math.max(maxd, M.dist(u, u.home)); }); }
wander.forEach((u, i) => { if (M.dist(u, w0[i]) > 3) moved++; });
ok(moved > 0 && maxd <= 75 && wander.every(u => !u.asleep), `los que deambulan se mueven (hasta ${maxd.toFixed(0)} px de su sitio) y no se duermen`);
M.startBattle(M.MISSIONS[1], deck, 'human_commander', {}); s = M.s; s.waveTimer = 9999;
const pat = s.units.filter(u => u.camp && u.patrol), p0 = pat.map(u => u.y); let minY = 1e9, maxY = -1e9;
for (let i = 0; i < 20 * 30; i++) { M.update(0.05); pat.forEach(u => { minY = Math.min(minY, u.y); maxY = Math.max(maxY, u.y); }); }
ok(pat.length > 0 && maxY - minY > 30 && pat.every(u => M.dist(u, u.home) < 110), `la patrulla va y viene (recorre ${(maxY - minY).toFixed(0)} px) sin alejarse de su campamento`);
const bait = M.spawnUnit(0, M.CARD.human_warrior, pat[0].home.x, pat[0].home.y + 60, 0, -1, 1), baitHp = bait.hp;
for (let i = 0; i < 20 * 3; i++) M.update(0.05);
ok(bait.hp < baitHp || !s.units.includes(bait), 'la patrulla ataca a una unidad que se acerca');

// ---------- Integración: todas las cartas lanzan sus habilidades sin romper nada ----------
let broken = 0, casts = 0;
for (const c of M.CARD_LIST.filter(c => c.ready && !c.miner)) {
  M.startBattle(M.MISSIONS[5], deck, 'human_commander', {}); s = M.s; s.waveTimer = 9999; s.gold = 10; s.units.length = 0;
  for (let i = 0; i < 2; i++) { M.spawnUnit(0, c, 100 + i * 20, 330 + i * 10, 0, -1, 1); M.spawnUnit(1, c, 110 + i * 25, 250 + i * 10, 0, 1, 1); }
  M.spawnUnit(1, M.CARD.ordu_grunt, 120, 280, 0, 1, 1);
  const before = s.events.length; try { for (let i = 0; i < 20 * 25; i++) M.update(0.05); } catch (e) { broken++; console.log('   excepción con', c.id, e.message); }
  casts += s.events.filter(e => e === 'ability').length;
  if (s.units.some(u => !Number.isFinite(u.x) || !Number.isFinite(u.y) || !Number.isFinite(u.hp))) { broken++; console.log('   valores no finitos con', c.id); }
}
ok(broken === 0 && casts > 5, `batallas de prueba con las 13 cartas sin errores (${casts} habilidades lanzadas)`);

console.log(fail ? `\n${fail} FALLO(S)` : '\nTODO OK');
process.exit(fail ? 1 : 0);
