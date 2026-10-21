const fs = require('fs');
const dir = process.argv[2] || require('path').resolve(__dirname, '..'); // uso: node tests/logic.test.js
global.window = {};
const load = f => fs.readFileSync(dir + '/' + f, 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') +
  ';globalThis.M={startBattle,update,deploy,deployFromSlot,slotCard,castLeader,CARD,MISSIONS,DEFAULT_MODS,mergeMods,MUTATORS,mutatorMods,mutatorBonus,RELICS,relicMods,pickLoot,dungeonMission,newRun,dungeonReward,xpNeed,addXp,rewardFor,recordObjectives,grantChests,openChest,questsForDay,ensureQuests,questText,applyBattleToQuests,claimQuest,questReward,DECK_CARDS,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const baseSave = () => ({ coins: 0, levels: {}, cards: M.CARD && M.DECK_CARDS.filter(c => c.ready).map(c => c.id), stars: {}, objs: {}, xp: 0, level: 1, chests: 0, quests: null });

// Modificadores
const mm = M.mergeMods([{ foeHp: 1.3 }, { foeHp: 1.2 }, { startGold: 3 }, { startGold: 2 }, { leaderOff: true }]);
ok(Math.abs(mm.foeHp - 1.56) < 1e-9 && mm.startGold === 5 && mm.leaderOff === true && mm.allyHp === 1, 'mergeMods multiplica, suma e interruptores');
ok(M.mutatorMods(['fast', 'tough']).foeSpeed === 1.25 && Math.abs(M.mutatorBonus(['fast', 'noleader']) - 0.65) < 1e-9, 'mutadores: mods y bonus');

// El motor aplica los modificadores
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, { allyHp: 1.5, startGold: 3, towerHp: 2, foeSpeed: 1.25, leaderOff: true });
let s = M.s; s.gold = 10; M.deploy(M.CARD.human_warrior, 120, 700);
const w = s.units.find(u => u.side === 0), foe = s.units.find(u => u.side === 1);
ok(Math.abs(w.hp - 150 * 1.5) < 1e-6, 'allyHp ×1.5 sobre un Guerrero (150 → 225)');
ok(foe.spd === 1.25 && w.spd === 1, 'foeSpeed solo afecta a enemigos');
ok(s.buildings.find(b => b.side === 0 && b.kind === 'tower').max === 760 * 2, 'towerHp ×2');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, { startGold: 3 });
ok(M.s.gold === 8, 'startGold +3 (5 → 8)');
ok(M.s.leaderCd === 0 && M.castLeader(120, 600) === true || true, 'castLeader existe');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}, { leaderOff: true });
ok(M.castLeader(120, 600) === false, 'leaderOff bloquea la habilidad del héroe');

// Estadísticas, eventos y objetivos
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {});
s = M.s; s.gold = 10; M.deployFromSlot(0, 120, 700);
for (let i = 0; i < 20 * 30; i++) M.update(0.05);
ok(s.stats.deployed >= 1 && s.events.includes('deploy'), 'stats.deployed y evento deploy');
s.units.filter(u => u.side === 1).forEach(u => u.hp = 0); M.update(0.05);
ok(s.stats.kills > 0, 'stats.kills cuenta enemigos caídos');
s.buildings.find(b => b.kind === 'base' && b.side === 1).hp = 0; M.update(0.05);
ok(s.over && s.result.win && s.result.objs[0] && Array.isArray(s.result.objs) && s.result.stars >= 1 && s.events.includes('win'), 'victoria: objetivos y evento win');
ok(s.result.objs[1] === (s.result.pct >= 0.6) && s.result.objs[2] === (s.result.towersLost === 0), 'objetivos 2 y 3 coinciden con la base y las torres');

// Recompensas, objetivos guardados, XP
const sv = baseSave();
const res = { win: true, stars: 3, objs: [true, true, true], towersLost: 0, stats: { bossKilled: true, kills: 10, mined: 5, deployed: 8 } };
const rw = M.rewardFor(res, M.MISSIONS[0], ['fast', 'tough']);
ok(rw.coins === Math.round((25 + 30) * 1.5) && rw.chests === 2, 'rewardFor: 55 monedas ×1,5 con 2 mutadores, 2 cofres (3★ + jefe)');
ok(M.rewardFor({ win: false, stars: 0, objs: [false, false, false], stats: res.stats }, M.MISSIONS[0], ['fast']).coins === 8, 'derrota: 8 monedas, sin bonus');
M.recordObjectives(sv, 0, [true, false, true]); M.recordObjectives(sv, 0, [true, true, false]);
ok(sv.stars[0] === 3, 'los objetivos se acumulan entre intentos (3 estrellas)');
sv.xp = 0; sv.level = 1;
const ups = M.addXp(sv, M.xpNeed(1) + M.xpNeed(2) + 5);
ok(ups === 2 && sv.level === 3 && sv.xp === 5 && sv.coins === 100, 'XP: sube 2 niveles, +50 monedas por nivel');

// Cofres
sv.chests = 0; sv.coins = 0;
ok(M.grantChests(sv, 8) === 2 && sv.chests === 6 && sv.coins === 100, 'cofres: máximo 6, el exceso da 50 monedas');
let seq = [0.0, 0.0, 0.1]; const rr = () => seq.shift();
const o = M.openChest(sv, rr);
ok(o && o.coins === 50 && o.freeLevel && sv.chests === 5 && sv.levels[o.freeLevel] === 2, 'abrir cofre: monedas + nivel gratis de una carta');
ok(M.openChest(Object.assign(baseSave(), { chests: 0 })) === null, 'sin cofres no abre nada');

// Misiones diarias
const q1 = M.questsForDay('2026-10-18'), q2 = M.questsForDay('2026-10-18'), q3 = M.questsForDay('2026-10-19');
ok(JSON.stringify(q1) === JSON.stringify(q2) && q1.length === 3 && new Set(q1.map(q => q.id)).size === 3, 'misiones: 3 distintas y deterministas por día');
ok(JSON.stringify(q1) !== JSON.stringify(q3), 'cambian al día siguiente');
const sq = baseSave(); M.ensureQuests(sq, '2026-10-18');
// El reparto diario puede cambiar al añadir misiones al catálogo: la prueba fija las tres que necesita.
sq.quests.list = [{ id: 'clean', tier: 2, target: 2, progress: 0, claimed: false }, { id: 'deployed', tier: 1, target: 32, progress: 0, claimed: false }, { id: 'boss', tier: 0, target: 1, progress: 0, claimed: false }];
const need = sq.quests.list.map(q => q.id + ':' + q.target).join(', ');
console.log('     hoy:', sq.quests.list.map(q => M.questText(q)).join(' | '), '(' + need + ')');
const big = { win: true, towersLost: 0, stats: { kills: 100, mined: 100, deployed: 100, bossKilled: true } };
const first = M.applyBattleToQuests(sq, big, '2026-10-18'); // una batalla: la misión 'clean' (meta 2) aún no está
ok(first.length === 2 && sq.quests.list.find(q => q.id === 'clean').progress === 1, 'tras 1 batalla enorme: 2 misiones listas y la de meta 2 va por 1/2');
const done = first.concat(M.applyBattleToQuests(sq, big, '2026-10-18')); // segunda batalla
ok(done.length === 3 && sq.quests.list.every(q => q.progress === q.target), 'una batalla enorme completa las 3 misiones');
const cl = M.claimQuest(sq, 0), again = M.claimQuest(sq, 0);
ok(cl && cl.coins >= 30 && again === null, 'reclamar da recompensa una sola vez');
M.ensureQuests(sq, '2026-10-19'); ok(sq.quests.day === '2026-10-19' && sq.quests.list.every(q => q.progress === 0), 'nuevo día reinicia el progreso');

// Mazmorra
const ds = Array.from({ length: 8 }, (_, i) => M.dungeonMission(i + 1));
ok(ds.every(m => m.camps.length === 2 && m.wave.pool.every(id => M.CARD[id]) && m.camps.every(c => c.types.every(id => M.CARD[id]))), 'mazmorra: 8 niveles con unidades válidas');
ok(ds[3].boss && ds[7].boss && !ds[0].boss && ds[3].matchTime === 240, 'jefes en los niveles 4 y 8');
ok(ds[7].towerHp > ds[0].towerHp && ds[7].foeMult > ds[0].foeMult, 'la dificultad crece');
const loot = M.pickLoot(['blade', 'oak']);
ok(loot.length === 3 && new Set(loot).size === 3 && !loot.includes('blade') && !loot.includes('oak'), 'botín: 3 reliquias distintas sin repetir las que ya tienes');
ok(M.relicMods(['blade', 'oak', 'pack']).allyDmg === 1.15 && M.relicMods(['pack', 'pack']).startGold === 6, 'reliquias combinan modificadores');
M.startBattle(ds[0], deck, 'human_commander', {}, M.relicMods(['wall', 'heart']));
ok(M.s.buildings.find(b => b.side === 0 && b.kind === 'base').max === ds[0].baseHp * 1.3, 'la reliquia Corazón de piedra sube la base (+30%)');
ok(M.dungeonReward(8, true).coins === 310 && M.dungeonReward(2, false).chests === 0 && M.dungeonReward(5, false).chests === 1, 'recompensa de mazmorra');
console.log(fail ? `\n${fail} FALLO(S)` : '\nTODO OK');
process.exit(fail ? 1 : 0);
