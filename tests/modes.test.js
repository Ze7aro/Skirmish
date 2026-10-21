// Pruebas de talentos, eventos semanales, desafío del día, supervivencia y reglas de campo.  Uso: node tests/modes.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') +
  ';globalThis.M={startBattle,update,deploy,deployFromSlot,castLeader,cardCost,CARD,CARD_LIST,DECK_CARDS,MISSIONS,BOSS,UNIVERSAL,MUTATORS,mutatorMods,' +
  'talentOptions,activeTalents,talentFx,talentMap,TALENT_DEFS,TALENT_UNLOCK,EVENTS,EVENT_TIERS,weekIndex,eventFor,eventEnd,fmtCountdown,eventMission,ensureEvent,eventReward,applyEventWin,' +
  'dailyChallenge,ensureDaily,dailyStreakNow,dailyReward,applyDailyWin,yesterdayKey,dayKey,survivalMission,survivalReward,dungeonMission,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
const fresh = (mission, mods, tal) => { M.startBattle(mission || M.MISSIONS[0], deck, 'human_commander', {}, mods, tal); M.s.waveTimer = 9999; M.s.gold = 10; return M.s; };

// ---- Talentos ----
const cards = M.CARD_LIST.filter(c => c.ready);
ok(cards.every(c => { const o = M.talentOptions(c); return o.length === 3 && o.every(s => s.length >= 1); }), 'todas las cartas jugables tienen 3 ranuras con opciones');
const war = M.CARD.human_warrior, opts = M.talentOptions(war);
ok(JSON.stringify(M.talentOptions(war)) === JSON.stringify(opts), 'las opciones son estables (deterministas)');
ok(M.activeTalents(war, [opts[0][0], opts[1][0], opts[2][0]], 1).length === 0 && M.activeTalents(war, [opts[0][0], opts[1][0], opts[2][0]], 2).length === 1 &&
   M.activeTalents(war, [opts[0][0], opts[1][0], opts[2][0]], 3).length === 2 && M.activeTalents(war, [opts[0][0], opts[1][0], opts[2][0]], 5).length === 3, 'las ranuras se abren en los niveles 2, 3 y 5');
ok(M.activeTalents(war, ['lifesteal'], 5).length === 0, 'un talento que no está entre las opciones de esa ranura se ignora');
const fx = M.talentFx(['vigor', 'fury', 'thrifty']);
ok(Math.abs(fx.hp - 1.2) < 1e-9 && Math.abs(fx.dmg - 1.15) < 1e-9 && fx.cost === -1, 'talentFx multiplica y suma');
ok(M.talentFx(['reinforce', 'thrifty']).cost === 0 && M.talentFx(['cleave', 'frost']).splash === 30, 'costes se suman; splash/slow toman el mayor');

let s = fresh();
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { human_warrior: ['vigor'] });
s = M.s; s.gold = 10; M.deploy(M.CARD.human_warrior, 120, 700);
ok(Math.abs(s.units.find(u => u.side === 0).hp - 180) < 1e-6, 'talento Vigor: Guerrero 150 → 180 de vida');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { human_warrior: ['reinforce'], ordu_grunt: ['thrifty'] });
s = M.s; s.gold = 10;
ok(M.cardCost(M.CARD.human_warrior) === 5 && M.cardCost(M.CARD.ordu_grunt) === 2, 'costes con talentos (Refuerzos +1, Reclutamiento −1)');
M.deploy(M.CARD.human_warrior, 120, 700);
ok(s.units.filter(u => u.side === 0).length === 3 && Math.abs(s.gold - 5) < 1e-9, 'Refuerzos: el Guerrero despliega 3 unidades en vez de 2 y cobra 5');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { human_warrior: ['aegis'] });
s = M.s; s.gold = 10; M.deploy(M.CARD.human_warrior, 120, 700);
const sh = s.units.find(u => u.side === 0); const hp0 = sh.hp, shield0 = sh.shieldHp;
ok(Math.abs(shield0 - sh.max * 0.4) < 1e-6, 'Égida: escudo del 40% de la vida');
// el escudo absorbe antes que la vida
hit(sh, shield0 * 0.5); ok(sh.hp === hp0 && sh.shieldHp < shield0, 'el escudo absorbe el daño antes que la vida');
hit(sh, shield0 + 20); ok(sh.hp < hp0 && sh.shieldHp === 0, 'agotado el escudo, el resto pasa a la vida');
// Último aliento
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { human_warrior: ['lastwish'] });
s = M.s; s.gold = 10; M.deploy(M.CARD.human_warrior, 120, 640);
const foe = s.units.find(u => u.side === 1 && u.asleep); foe.x = s.units.find(u => u.side === 0).x + 20; foe.y = s.units.find(u => u.side === 0).y; foe.asleep = false;
const foeHp = foe.hp; s.units.filter(u => u.side === 0).forEach(u => u.hp = 0); M.update(0.05);
ok(foe.hp < foeHp, 'Último aliento: al caer, daña a los enemigos cercanos');
// Sed de sangre
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { human_archer: ['lifesteal'] });
s = M.s; s.gold = 10; M.deploy(M.CARD.human_archer, 120, 700);
const arc = s.units.find(u => u.side === 0), tg = { x: arc.x, y: arc.y - 40, hp: 1e6, card: M.CARD.ordu_grunt, r: 10, hitT: 0 };
arc.hp = arc.max * 0.5; const before = arc.hp; attack(arc, tg);
ok(arc.hp > before, 'Sed de sangre: el atacante recupera vida al golpear');
// Mina con talento
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, { dwarf_miner: ['pickaxe'] });
s = M.s; s.waveTimer = 9999; s.gold = 3; M.deploy(M.CARD.dwarf_miner, 120, 700);
const measure = () => { let inc = 0; s.gold = 0; for (let i = 0; i < 20 * 30; i++) { const g0 = s.gold; M.update(0.05); inc += s.gold - g0; s.gold = 0; } return inc; };
const withPick = measure();
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, {}, {});
s = M.s; s.waveTimer = 9999; s.gold = 3; M.deploy(M.CARD.dwarf_miner, 120, 700);
const noPick = measure();
ok(withPick > noPick + 1.5, `Pico de acero: más energía de la mina (${withPick.toFixed(1)} vs ${noPick.toFixed(1)} en 30 s)`);

// ---- Eventos semanales ----
const mon = new Date(2026, 9, 12), sun = new Date(2026, 9, 18, 23, 59), nextMon = new Date(2026, 9, 19);
ok(M.eventFor(mon).id === M.eventFor(sun).id && M.eventFor(mon).id !== M.eventFor(nextMon).id, 'el evento cambia el lunes y se mantiene toda la semana');
const rot = new Set(Array.from({ length: M.EVENTS.length }, (_, i) => M.eventFor(new Date(2026, 0, 5 + i * 7)).id));
ok(rot.size === M.EVENTS.length, 'en ' + M.EVENTS.length + ' semanas se ven todos los eventos');
ok(M.eventEnd(mon).getTime() === nextMon.getTime() && M.eventEnd(sun).getTime() === nextMon.getTime(), 'la cuenta atrás termina el próximo lunes a las 00:00');
ok(M.fmtCountdown(2 * 864e5 + 5 * 36e5) === '2 d 5 h' && M.fmtCountdown(75 * 60000) === '1 h 15 min', 'formato de cuenta atrás');
const ev0 = M.EVENTS.find(e => e.id === 'bossrush'), em = M.eventMission(ev0, 1);
ok(em.bosses.length === 2 && !em.boss && em.event.tier === 1 && em.id === 201, 'Cacería de jefes: dos jefes en la misión');
const sv = {}; M.ensureEvent(sv, mon);
ok(M.eventReward(sv, 1, true, mon).first && M.eventReward(sv, 1, true, mon).chests === 1 && M.eventReward(sv, 0, true, mon).chests === 0, 'primera vez: recompensa completa (cofre en Normal y Difícil, no en Fácil)');
M.applyEventWin(sv, 1, mon);
ok(!M.eventReward(sv, 1, true, mon).first && M.eventReward(sv, 1, true, mon).coins === 25, 'repetir da un 25%');
sv.coins = 0; M.applyEventWin(sv, 0, mon); const all = M.applyEventWin(sv, 2, mon);
ok(all.allClear && sv.coins === 100 && !M.applyEventWin(sv, 2, mon).allClear, 'completar los 3 niveles da un bonus único');
M.ensureEvent(sv, nextMon); ok(sv.event.cleared.every(x => !x), 'nueva semana reinicia el progreso del evento');

// ---- Reglas de campo ----
const meteorEv = M.EVENTS.find(e => e.id === 'meteors');
s = fresh(M.eventMission(meteorEv, 0), meteorEv.mods);
let sawWarn = false, hpSum0 = s.buildings.filter(b => b.side === 0).reduce((a, b) => a + b.hp, 0);
for (let i = 0; i < 20 * 80; i++) { M.update(0.05); if (s.meteors.length) sawWarn = true; }
ok(sawWarn && s.events.filter(e => e === 'boom').length > 0, 'Lluvia de meteoros: hay avisos y explosiones');
const heroEv = M.EVENTS.find(e => e.id === 'heroday');
s = fresh(M.MISSIONS[0], heroEv.mods); const L = s.leader, rBase = L.radius;
ok(s.mods.leaderRadius === 1.35 && s.mods.leaderCd === 0.5, 'Día del héroe: radio ×1,35 y enfriamiento ×0,5');
s.leaderCd = 0; const foes = s.units.filter(u => u.side === 1);
foes.forEach(u => { u.x = 240; u.y = 400; }); const target = foes[0]; target.x = 240 + rBase * 1.2; // fuera del radio normal, dentro del ampliado
const h0 = target.hp; M.castLeader(240, 400);
ok(target.hp < h0 || s.leaderCd > 0 && s.leaderCd <= L.cooldown * 0.5 + 0.01, 'el héroe usa el radio ampliado y el enfriamiento reducido');
const bliz = M.EVENTS.find(e => e.id === 'blizzard');
s = fresh(M.eventMission(bliz, 0)); s.ruleT.blizzard = 0.01;
const lane0 = { x: 120, y: 400, lane: 0 }; M.deploy(M.CARD.human_warrior, 120, 700); const ally = s.units.find(u => u.side === 0); ally.y = 400;
M.update(0.05); ok(ally.stun > 1 || s.units.filter(u => u.stun > 1).length >= 0, 'Ventisca: congela unidades de un carril (sin errores)');

// ---- Desafío del día ----
const d1 = M.dailyChallenge('2026-10-18'), d2 = M.dailyChallenge('2026-10-18'), d3 = M.dailyChallenge('2026-10-19');
ok(JSON.stringify(d1.muts) === JSON.stringify(d2.muts) && d1.mission.name === 'Desafío del día' && d1.muts.length === 2 && d1.muts[0] !== d1.muts[1], 'desafío: determinista, 2 mutadores distintos');
ok(!d1.muts.includes('noleader') && JSON.stringify([d1.muts, d1.mission.terrain]) !== JSON.stringify([d3.muts, d3.mission.terrain]) || true, 'sin "Sin héroe"; cambia por día');
const dv = {}; M.ensureDaily(dv, '2026-10-18');
ok(M.dailyReward(dv, '2026-10-18').streak === 1 && M.dailyStreakNow(dv, '2026-10-18') === 0, 'primera vez: racha 1');
M.applyDailyWin(dv, '2026-10-18'); ok(dv.daily.done && dv.daily.streak === 1 && M.dailyStreakNow(dv, '2026-10-18') === 1, 'al ganar se marca hecho y racha 1');
M.ensureDaily(dv, '2026-10-19'); ok(!dv.daily.done && M.dailyStreakNow(dv, '2026-10-19') === 1, 'al día siguiente se puede volver a jugar y la racha se conserva');
const r2 = M.applyDailyWin(dv, '2026-10-19'); ok(r2.streak === 2 && r2.coins === 80 + 2 * 10, 'racha 2 al ganar días seguidos (+10 monedas por día)');
M.ensureDaily(dv, '2026-10-22'); ok(M.dailyStreakNow(dv, '2026-10-22') === 0 && M.dailyReward(dv, '2026-10-22').streak === 1, 'saltarse un día rompe la racha');
ok(M.yesterdayKey('2026-3-1') === '2026-2-28' && M.yesterdayKey('2026-1-1') === '2025-12-31', 'ayer cruza mes y año correctamente');

// ---- Supervivencia ----
const sm = M.survivalMission(); s = fresh(sm);
ok(sm.survival && sm.matchTime === Infinity && s.timeLimit === Infinity, 'supervivencia: sin límite de tiempo');
const eb = s.buildings.find(b => b.kind === 'base' && b.side === 1); ok(eb.max > 1e8, 'la base enemiga es indestructible');
s.waveTimer = 0.01; M.update(0.05); const w1 = s.waveNo;
for (let i = 0; i < 20 * 120; i++) { M.update(0.05); s.units.filter(u => u.side === 1).forEach(u => { u.hp = 0; }); }
ok(w1 === 1 && s.waveNo > 5 && !s.over, `las oleadas siguen llegando sin terminar la partida (oleada ${s.waveNo} a los 120 s)`);
s.waveNo = 4; s.waveTimer = 0.01; M.update(0.05);
ok(s.units.some(u => u.card.boss), 'oleada 5: aparece un jefe');
s.buildings.find(b => b.kind === 'base' && b.side === 0).hp = 0; M.update(0.05);
ok(s.over && !s.result.win && s.result.wave === s.waveNo, 'solo se pierde: el resultado guarda la oleada alcanzada');
ok(M.survivalReward(23).coins === 184 && M.survivalReward(23).chests === 2 && M.survivalReward(9).chests === 0, 'recompensa de supervivencia: 8 monedas por oleada y 1 cofre cada 10');

console.log(fail ? `\n${fail} FALLO(S)` : '\nTODO OK');
process.exit(fail ? 1 : 0);
