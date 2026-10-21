// Fase I: rango (rareza) de las minis, experiencia de mini con techo y nivel de colección con premios.
// Uso: node tests/phasei.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') + load('economy.js') +
  ';globalThis.M={startBattle,update,spawnUnit,deployFromSlot,CARD,MAX_CARD_LEVEL,UNIVERSAL,START_CARDS,DECK_CARDS,levelMult,upgradeCost,upgradeReq,upgradeCard,ensureWallet,MAX_RANK,RANK_NAMES,MINI_XP_CEIL,ASCEND_COST,RANK_LEVEL_BONUS,' +
  'rankOf,levelCap,xpCeil,miniXp,effLevels,addMiniXp,awardMiniXp,ascendStatus,ascendCard,COLLECTION_MILESTONES,collectionLevel,collectionClaimable,collectionNext,claimCollection,openChest,ensureShop,buyOffer,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const newSave = () => ({ coins: 0, levels: {}, ranks: {}, mxp: {}, cards: M.START_CARDS.slice(), stars: {}, chests: 0, xp: 0, level: 1, stats: {}, dungeon: { best: 0 }, survival: { best: 0 }, daily: null, energy: 100, cores: 20 });
const W = 'human_warrior';

// ---------- Rango y nivel máximo ----------
let s = newSave();
ok(M.rankOf(s, W) === 0 && M.levelCap(s, W) === M.MAX_CARD_LEVEL && M.xpCeil(s, W) === 120, 'rango 0: nivel máximo 5 y techo de XP 120');
s.ranks[W] = 2; ok(M.levelCap(s, W) === M.MAX_CARD_LEVEL + 2 && M.xpCeil(s, W) === 300, 'rango 2: nivel máximo 7 y techo de XP 300');
s.ranks[W] = 3; ok(M.xpCeil(s, W) === 0, 'rango máximo: sin techo de XP (ya no gana)');
s.ranks[W] = 99; ok(M.rankOf(s, W) === M.MAX_RANK, 'un rango corrupto se acota'); s.ranks[W] = -4; ok(M.rankOf(s, W) === 0, 'y los negativos también');
ok(M.RANK_NAMES.length === M.MAX_RANK + 1 && M.MINI_XP_CEIL.length === M.MAX_RANK && M.ASCEND_COST.length === M.MAX_RANK, 'tablas de rango consistentes');
ok(M.ASCEND_COST.every((c, i) => i === 0 || (c.coins > M.ASCEND_COST[i - 1].coins && c.cores > M.ASCEND_COST[i - 1].cores)) && M.MINI_XP_CEIL.every((c, i) => i === 0 || c > M.MINI_XP_CEIL[i - 1]), 'cada rango cuesta más y pide más XP');
s = newSave(); s.levels[W] = 5; let r = M.upgradeCard(s, W); ok(r.err && /^Nivel máximo/.test(r.err), 'sin ascender no se pasa del nivel 5');
s.ranks[W] = 1; s.coins = 1000; r = M.upgradeCard(s, W); ok(r.ok && r.level === 6 && s.levels[W] === 6, 'con rango 1 se puede subir al nivel 6');
s.coins = 1000; s.energy = 100; s.cores = 20; M.upgradeCard(s, W); r = M.upgradeCard(s, W); ok(r.err && s.levels[W] === 6, 'y se para en el nivel máximo del rango (6 con rango 1)');

// ---------- Fuerza por rango ----------
s = newSave(); s.levels[W] = 3; s.ranks[W] = 2;
const eff = M.effLevels(s); ok(Math.abs(eff[W] - (3 + 2 * M.RANK_LEVEL_BONUS)) < 1e-9, 'nivel efectivo = nivel + 0,42 por rango');
ok(Math.abs(M.levelMult(eff[W]) / M.levelMult(3) - 1) > 0.07 && Math.abs(M.levelMult(3 + M.RANK_LEVEL_BONUS) / M.levelMult(3) - 1.05) < 0.02, 'cada rango da en torno a +5% de fuerza');
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'], mission = { id: 901, zone: 1, terrain: 'forest', enemy: 'ordu', name: 'p', desc: '', camps: [], wave: { every: 9999, max: 1, pool: ['ordu_grunt'] }, towerHp: 2000, baseHp: 2000, foeMult: 1, coins: 1, matchTime: 100, unlock: { cards: [], leaders: [] }, chests: 0, goal: 'destroy' };
const hpOf = lv => { M.startBattle(mission, deck, 'human_commander', lv); return M.spawnUnit(0, M.CARD[W], 120, 600, 0, -1, M.levelMult(M.s.levels[W])).max; };
const h0 = hpOf({ [W]: 3 }), h3 = hpOf(M.effLevels(Object.assign(newSave(), { levels: { [W]: 3 }, ranks: { [W]: 3 } })));
ok(h3 > h0 * 1.12 && h3 < h0 * 1.2, 'en batalla, una mini de rango 3 tiene ≈ +15% de vida (' + (h3 / h0).toFixed(3) + ')');
ok(M.effLevels(newSave())[W] === undefined || M.effLevels(newSave())[W] === 1, 'sin nivel ni rango no hay entrada rara');

// ---------- XP de mini ----------
s = newSave(); ok(M.addMiniXp(s, W, 50) === 50 && M.miniXp(s, W) === 50, 'ganar XP');
ok(M.addMiniXp(s, W, 100) === 70 && M.miniXp(s, W) === 120, 'tiene techo (120 en rango 0): solo suma lo que cabe');
ok(M.addMiniXp(s, W, 10) === 0, 'con el techo alcanzado no gana más');
ok(M.addMiniXp(s, 'human_paladin', 10) === 0 && M.addMiniXp(s, W, -5) === 0, 'sin tener la mini o con XP negativa no pasa nada');
ok(M.addMiniXp(s, M.UNIVERSAL, 10) === 10, 'el enano minero también gana XP');
s.ranks[W] = 3; ok(M.addMiniXp(s, W, 10) === 0, 'rango máximo: no gana XP');
s = newSave(); let aw = M.awardMiniXp(s, ['human_warrior', 'human_archer'], { by: { human_warrior: 4, human_archer: 30 } }, true);
ok(aw[0].gain === 5 + 3 + 4 && aw[1].gain === 5 + 3 + 10, 'tras ganar: 5 + 3 + despliegues (máx. 10)');
aw = M.awardMiniXp(s, ['human_warrior'], { by: {} }, false); ok(aw[0].gain === 5, 'tras perder: 5 + despliegues');
s = newSave(); s.mxp[W] = 118; aw = M.awardMiniXp(s, [W], {}, true); ok(aw[0].gain === 2 && aw[0].full, 'se avisa cuando llega al techo');
aw = M.awardMiniXp(s, [W], {}, true); ok(aw.length === 1 && aw[0].gain === 0 && aw[0].full, 'y sigue avisando como "lista para ascender"');
M.startBattle(mission, deck, 'human_commander', {}); const st = M.s; st.gold = 10; M.deployFromSlot(0, 120, 700); const first = Object.keys(st.stats.by)[0];
ok(st.stats.by && Object.values(st.stats.by).reduce((a, b) => a + b, 0) === 1 && M.CARD[first], 'la batalla cuenta cuántas veces se despliega cada mini');

// ---------- Ascender ----------
s = newSave(); s.coins = 5000;
let a = M.ascendStatus(s, W); ok(!a.ok && !a.max && a.need.level === 5 && a.need.xp === 120 && a.need.cores === 3 && a.need.coins === 300, 'requisitos del primer ascenso: nivel 5, XP lleno, 300 de oro y 3 cores');
ok(M.ascendCard(s, W).err === 'Aún no cumples los requisitos', 'sin cumplir no se asciende');
s.levels[W] = 5; ok(!M.ascendStatus(s, W).ok, 'el nivel solo no basta'); s.mxp[W] = 120; ok(M.ascendStatus(s, W).ok, 'con nivel y XP basta (hay oro y cores)');
s.cores = 2; ok(!M.ascendStatus(s, W).ok && M.ascendCard(s, W).err, 'faltan cores');
s.cores = 20; s.coins = 100; ok(!M.ascendStatus(s, W).ok, 'o falta oro'); s.coins = 5000;
r = M.ascendCard(s, W); ok(r.ok && r.rank === 1 && s.ranks[W] === 1 && s.coins === 4700 && s.cores === 17 && s.mxp[W] === 0, 'ascender cobra, sube el rango y vacía la XP');
ok(M.levelCap(s, W) === 6 && M.xpCeil(s, W) === 200 && !M.ascendStatus(s, W).ok, 'ahora el techo es 200 y hace falta nivel 6');
s.levels[W] = 6; s.mxp[W] = 200; r = M.ascendCard(s, W); ok(r.ok && r.rank === 2 && s.cores === 17 - 6 && s.coins === 4700 - 600, 'segundo ascenso: 600 de oro y 6 cores');
s.levels[W] = 7; s.mxp[W] = 300; r = M.ascendCard(s, W); ok(r.ok && r.rank === 3 && s.cores === 11 - 10, 'tercero: 1000 de oro y 10 cores');
ok(M.ascendStatus(s, W).max && M.ascendCard(s, W).err === 'Ya es de rango máximo', 'rango máximo: no se asciende más');
ok(M.ascendCard(newSave(), 'human_paladin').err === 'Aún no tienes esta mini', 'sin tener la mini no se asciende');

// ---------- Cofres y tienda respetan el nivel máximo ----------
s = newSave(); s.chests = 5; s.cards = [W]; s.levels[W] = 5; k = 0; const seq = [0.0, 0.0, 0.9];
let rr = M.openChest(s, () => 0.1); ok(rr.freeLevel === null && s.levels[W] === 5, 'un cofre no sube una mini que ya está en su nivel máximo');
s.ranks[W] = 1; s.chests = 5; let got = null; for (let i = 0; i < 40 && !got; i++) { s.chests = 5; const q = M.openChest(s, () => 0.1); got = q.freeLevel; } ok(got === W && s.levels[W] === 6, 'con rango 1 sí puede subirla a 6');
s = newSave(); s.coins = 5000; s.levels = Object.fromEntries(M.START_CARDS.map(id => [id, 5])); ok(M.ensureShop(s, '2032-1-1').offers.every(o => o.kind !== 'upgrade'), 'la tienda no ofrece mejoras de minis en su nivel máximo');
M.START_CARDS.forEach(id => { s.ranks[id] = 1; }); s.shop = null; ok(M.ensureShop(s, '2032-1-2').offers.filter(o => o.kind === 'upgrade').length === 2, 'pero sí cuando el rango sube el máximo');

// ---------- Nivel de colección ----------
s = newSave(); ok(M.collectionLevel(s) === M.START_CARDS.length + 1, 'al empezar: 1 por cada mini inicial + el enano (' + M.collectionLevel(s) + ')');
s.levels[W] = 4; ok(M.collectionLevel(s) === M.START_CARDS.length + 1 + 3, 'cada nivel suma 1');
s.ranks[W] = 1; ok(M.collectionLevel(s) === M.START_CARDS.length + 1 + 3 + 2, 'cada rango suma 2');
s.cards.push('human_paladin'); ok(M.collectionLevel(s) === M.START_CARDS.length + 2 + 3 + 2, 'una mini nueva suma 1');
ok(M.COLLECTION_MILESTONES.every((m, i, l) => i === 0 || m.at > l[i - 1].at) && M.COLLECTION_MILESTONES.every(m => m.coins || m.energy || m.cores || m.chests), 'hitos crecientes y todos con premio');
s = newSave(); ok(M.collectionClaimable(s).length === 0 && M.collectionNext(s).at === 10, 'al empezar no hay premios y el siguiente es el del 10');
Object.keys(s.levels).length; M.START_CARDS.forEach(id => { s.levels[id] = 3; }); s.levels[M.UNIVERSAL] = 3; ok(M.collectionLevel(s) === 21 && M.collectionClaimable(s).map(m => m.at).join() === '10,15,20', 'con nivel de colección 21 hay 3 premios por reclamar');
s.coins = 0; s.energy = 0; s.cores = 0; r = M.claimCollection(s, 10); ok(r && r.coins === 100 && s.coins === 100, 'reclamar da el premio');
ok(M.claimCollection(s, 10) === null && s.coins === 100, 'no se reclama dos veces');
ok(M.claimCollection(s, 25) === null, 'no se reclama un hito que no se ha alcanzado');
ok(M.claimCollection(s, 99) === null, 'ni uno que no existe');
r = M.claimCollection(s, 15); ok(r.energy === 30 && s.energy === 30, 'premio de energía'); r = M.claimCollection(s, 20); ok(r.cores === 1 && r.coins === 100 && s.cores === 1, 'premio mixto');
ok(M.collectionNext(s).at === 25 && M.collectionClaimable(s).length === 0, 'el siguiente hito pasa al 25');
s.levels[W] = 9; s.ranks[W] = 3; s.chests = 6; const bigger = M.collectionLevel(s); r = M.claimCollection(s, 25); ok(bigger >= 25 && r && r.chests === 1 && r.lost === 1 && s.coins > 200, 'con los cofres llenos, el exceso se convierte en monedas');
ok(M.collectionNext(Object.assign(newSave(), { coll: { claimed: M.COLLECTION_MILESTONES.map(m => m.at) } })) === null, 'con todos reclamados no hay siguiente');

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
