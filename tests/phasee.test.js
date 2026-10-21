// Fase E: dificultad adaptativa, tiempo extra en duelos, reemplazar mini, grupos de campamento aleatorios y misiones heroicas.
// Uso: node tests/phasee.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') +
  ';globalThis.M={startBattle,update,spawnUnit,hit,replaceSlot,REPLACE_COST,OVERTIME_S,CARD,MISSIONS,ZONES,campGroups,dungeonMission,mergeMods,ASSIST_MODS,ASSIST_FAILS,ASSIST_REWARD,assistAvailable,recordResult,' +
  'heroicMission,heroicUnlocked,HEROIC_REWARD,HEROIC_MIN_STARS,rewardFor,makeRival,duelMission,ACHIEVEMENTS,ACH_FAMILIES,claimAch,ensureAch,HAND_SIZE,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
const run = (s, secs) => { for (let i = 0; i < 20 * secs && !s.over; i++) M.update(0.05); };
const bases = s => ({ p: s.buildings.find(b => b.kind === 'base' && b.side === 0), e: s.buildings.find(b => b.kind === 'base' && b.side === 1) });

// ---------- Dificultad adaptativa ----------
const sv = { stars: {}, fails: {} };
ok(!M.assistAvailable(sv, 3), 'sin derrotas no hay ayuda');
ok(M.recordResult(sv, 3, false) === 1 && !M.assistAvailable(sv, 3), '1 derrota: todavía no');
ok(M.recordResult(sv, 3, false) === M.ASSIST_FAILS && M.assistAvailable(sv, 3), '2 derrotas seguidas: ayuda disponible');
ok(!M.assistAvailable(sv, 4), 'la ayuda es por misión');
M.recordResult(sv, 3, true); ok(!M.assistAvailable(sv, 3) && !('3' in sv.fails), 'ganar la quita');
M.recordResult(sv, 3, false); M.recordResult(sv, 3, true); M.recordResult(sv, 3, false); ok(!M.assistAvailable(sv, 3), 'las derrotas deben ser seguidas');
const plain = M.mergeMods([]), helped = M.mergeMods([M.ASSIST_MODS]);
M.startBattle(M.MISSIONS[1], deck, 'human_commander', {}, plain); const g0 = M.s.gold, hp0 = M.s.buildings.find(b => b.side === 0 && b.kind === 'tower').hp;
M.startBattle(M.MISSIONS[1], deck, 'human_commander', {}, helped); const g1 = M.s.gold, hp1 = M.s.buildings.find(b => b.side === 0 && b.kind === 'tower').hp;
ok(g1 === g0 + 3 && hp1 > hp0 * 1.2, 'la ayuda da +3 de energía y torres más duras');
const ally = M.spawnUnit(0, M.CARD.human_warrior, 120, 600, 0, -1, 1); ok(ally.max > M.CARD.human_warrior.hp * 1.19, 'la ayuda endurece a los aliados');
const win = { win: true, stars: 3, stats: { bossKilled: false } };
ok(M.rewardFor(win, M.MISSIONS[1], [], true).coins < M.rewardFor(win, M.MISSIONS[1], [], false).coins, 'con ayuda la recompensa baja');
ok(Math.abs(M.rewardFor(win, M.MISSIONS[1], [], true).mult - M.ASSIST_REWARD) < 1e-9, 'multiplicador de ayuda ×0.8');

// ---------- Heroicas ----------
ok(!M.heroicUnlocked({ stars: { 2: 1 } }, 2) && M.heroicUnlocked({ stars: { 2: 2 } }, 2) && M.heroicUnlocked({ stars: { 2: 3 } }, 2), 'la heroica se abre con 2+ estrellas');
const base = M.MISSIONS[5], her = M.heroicMission(base), snap = JSON.stringify(base);
ok(her.heroic && her.name.startsWith('Heroica') && her.id === base.id && her.goal === base.goal, 'heroica: marca, nombre y mismo id y objetivo');
ok(her.foeMult > base.foeMult * 1.29 && her.towerHp > base.towerHp && her.baseHp > base.baseHp && her.camps.every((c, i) => c.mult > base.camps[i].mult), 'heroica: enemigos, edificios y campamentos más fuertes');
ok(her.wave.every <= base.wave.every && JSON.stringify(base) === snap, 'la misión original no se modifica');
ok(her.camps.every((c, i) => c.types === base.camps[i].types || JSON.stringify(c.types) === JSON.stringify(base.camps[i].types)), 'heroica conserva los campamentos');
const rh = M.rewardFor(win, her, [], false), rn = M.rewardFor(win, base, [], false);
ok(rh.coins > rn.coins * 1.6 && Math.abs(rh.mult - M.HEROIC_REWARD) < 1e-9, 'heroica: recompensa ×1.8');
M.startBattle(her, deck, 'human_commander', {}); ok(M.s.mission.heroic && M.s.buildings.find(b => b.side === 1 && b.kind === 'tower').max === her.towerHp, 'la batalla usa los valores heroicos');
ok(M.MISSIONS.every(m => M.heroicMission(m).goal === m.goal), 'toda misión tiene su versión heroica');
const hf = M.ACH_FAMILIES.find(f => f.id === 'heroic'); ok(hf && hf.get({ heroic: { 1: true, 2: true, 3: true } }) === 3 && hf.get({}) === 0, 'logro de heroicas cuenta las superadas');

// ---------- Reemplazar mini ----------
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}); let s = M.s; s.gold = 5;
const before = s.hand.concat(s.queue).map(c => c.id).sort().join(), h0 = s.hand[2].id, next = s.queue[0].id, qlen = s.queue.length;
ok(M.replaceSlot(2) && s.hand[2].id === next && s.gold === 5 - M.REPLACE_COST, 'reemplazar: entra la siguiente carta y cuesta 1 de energía');
ok(s.queue.length === qlen && s.queue[s.queue.length - 1].id === h0, 'la carta cambiada va al final de la cola');
ok(s.hand.concat(s.queue).map(c => c.id).sort().join() === before, 'no se pierde ni se duplica ninguna carta');
ok(s.hand.length === M.HAND_SIZE && s.stats.replaced === 1, 'la mano sigue teniendo 4 cartas y se cuenta el reemplazo');
s.gold = 0.5; ok(!M.replaceSlot(0) && s.gold === 0.5, 'sin energía no se puede');
s.gold = 5; s.paused = true; ok(!M.replaceSlot(0), 'en pausa no se puede'); s.paused = false;
ok(!M.replaceSlot(9), 'ranura inexistente'); const q = s.queue; s.queue = []; ok(!M.replaceSlot(0), 'sin cola no se puede'); s.queue = q;
for (let i = 0; i < 40; i++) { s.gold = 5; M.replaceSlot(i % 4); } ok(new Set(s.hand.map(c => c.id)).size === s.hand.length, 'tras muchos reemplazos no hay cartas repetidas en la mano');

// ---------- Tiempo extra en duelos ----------
const rv = M.makeRival(300, 0, 3), dm = M.duelMission(rv);
function duel() { M.startBattle(dm, deck, 'human_commander', {}); const s = M.s; s.duel.t = 1e9; return s; } // el rival no juega: aislamos la regla
s = duel(); s.t = s.timeLimit - 0.1; { const b = bases(s); b.e.hp = b.e.max * 0.55; b.p.hp = b.p.max * 0.55; } // 55% vs 55%: empate
run(s, 0.3);
ok(!s.over && s.overtime && s.timeLimit > 240 && Math.abs(s.timeLimit - 240 - M.OVERTIME_S) < 1e-9, 'bases igualadas al acabar: 60 s de tiempo extra');
{ const b = bases(s); const hp = b.p.hp; M.hit(b.p, 100); ok(Math.abs((hp - b.p.hp) - 150) < 1e-6, 'en el tiempo extra las bases reciben ×1.5'); }
{ const g = s.gold; s.gold = 0; run(s, 1); ok(s.gold > 0.4 * 1.4 - 1e-6, 'el tiempo extra acelera la energía (×1.5)'); }
s.t = s.timeLimit - 0.05; { const b = bases(s); b.e.hp = b.e.max * 0.3; } run(s, 0.3);
ok(s.over && s.winner === 0, 'al acabar el tiempo extra gana quien tenga más % de base');
s = duel(); s.t = s.timeLimit - 0.05; { const b = bases(s); b.e.hp = b.e.max * 0.5; b.p.hp = b.p.max * 0.5; } run(s, 0.1); s.t = s.timeLimit - 0.05; run(s, 0.3);
ok(s.over && s.winner === 1, 'si sigue el empate exacto tras el tiempo extra, pierdes');
s = duel(); s.t = s.timeLimit - 0.05; { const b = bases(s); b.e.hp = b.e.max * 0.3; } run(s, 0.3);
ok(s.over && s.winner === 0 && !s.overtime, 'diferencia clara: se decide sin tiempo extra');
s = duel(); s.t = s.timeLimit - 0.05; { const b = bases(s); b.p.hp = b.p.max * 0.3; } run(s, 0.3);
ok(s.over && s.winner === 1 && !s.overtime, 'diferencia clara en contra: pierdes sin tiempo extra');
s = duel(); s.t = s.timeLimit - 0.05; { const b = bases(s); b.e.hp = b.e.max * 0.55; b.p.hp = b.p.max * 0.55; } run(s, 0.1); { const b = bases(s); b.e.hp = 0; } run(s, 0.2);
ok(s.over && s.winner === 0, 'se puede ganar derribando la base durante el tiempo extra');
M.startBattle(M.MISSIONS[0], deck, 'human_commander', {}); s = M.s; s.t = s.timeLimit - 0.05; { const b = bases(s); b.e.hp = b.e.max * 0.5; b.p.hp = b.p.max * 0.5; } run(s, 0.3);
ok(s.over && !s.overtime, 'las misiones de campaña no tienen tiempo extra');

// ---------- Grupos aleatorios de campamento ----------
const pool = ['ordu_grunt', 'ordu_raider', 'ordu_bomber', 'ordu_wyvern'], cost = ids => ids.reduce((a, id) => a + M.CARD[id].cost, 0);
const g = M.campGroups(['ordu_grunt', 'ordu_bomber'], pool, 11), g2 = M.campGroups(['ordu_grunt', 'ordu_bomber'], pool, 11);
ok(g && g.length === 3 && JSON.stringify(g) === JSON.stringify(g2), 'campGroups: 3 variantes y siempre las mismas con la misma semilla');
ok(g.every(x => x.length === 2 && Math.abs(cost(x) - cost(g[0])) <= 1), 'las variantes tienen el mismo tamaño y un coste parecido (±1)');
ok(new Set(g.map(x => x.slice().sort().join())).size === g.length, 'las variantes son distintas entre sí');
ok(g.every(x => x.every(id => pool.includes(id))), 'solo usan tropas del enemigo de la zona');
ok(M.MISSIONS[0].camps.every(c => !c.groups), 'la misión 1 (tutorial) no cambia');
ok(M.MISSIONS.slice(1).every(m => m.camps.every(c => c.groups && c.groups[0] === c.types)), 'las demás misiones tienen grupos y el primero es el base');
ok(M.dungeonMission(1).camps.every(c => !c.groups) && M.dungeonMission(4).camps.every(c => c.groups), 'mazmorra: grupos desde el nivel 2');
const m3 = M.MISSIONS[3], orig = Math.random;
for (let k = 0; k < 3; k++) { Math.random = () => k / 3 + 0.01; M.startBattle(m3, deck, 'human_commander', {}); const sel = M.s.camps.map(c => c.types.join('+')), exp = m3.camps.map(c => c.groups[Math.floor((k / 3 + 0.01) * c.groups.length)].join('+')); ok(JSON.stringify(sel) === JSON.stringify(exp), `el sorteo ${k + 1} elige el grupo esperado (${sel.join(' | ')})`); }
Math.random = orig;
M.startBattle(m3, deck, 'human_commander', {}); const camp0 = M.s.camps[0]; ok(M.s.units.filter(u => u.camp === camp0).length === camp0.types.length, 'se crean exactamente las tropas del grupo elegido');
const seen = new Set(); for (let k = 0; k < 40; k++) { M.startBattle(m3, deck, 'human_commander', {}); seen.add(M.s.camps[0].types.join('+')); } ok(seen.size >= 2, 'con azar real salen grupos distintos entre partidas (' + seen.size + ')');
ok(M.MISSIONS.every(m => m.camps.every(c => !c.groups || c.groups.every(gr => gr.every(id => M.CARD[id] && M.CARD[id].ready)))), 'todas las variantes usan cartas con arte');

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
