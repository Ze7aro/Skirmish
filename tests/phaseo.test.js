// Fase O: comportamiento de los mineros — se defienden si los atacan salvo mientras recolectan, y avanzan si su mina se agota.
// Uso: node tests/phaseo.test.js
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
const free = s => s.mines.filter(m => !m.locked);
const dwarf = (s, x, y) => M.spawnUnit(0, M.CARD.dwarf_miner, x, y, 0, -1, 1);
const grunt = (s, x, y) => M.spawnUnit(1, M.CARD.ordu_grunt, x, y, 0, 1, 1);

// A. recolectando en una mina con oro: no deja el trabajo aunque lo ataquen
let s = begin(); let mine = free(s)[0]; let mn = dwarf(s, mine.x, mine.y + 10); run(s, 3);
ok(mn.mining, 'el minero llega a su mina y recolecta');
s.buildings = s.buildings.filter(b => !(b.side === 0 && b.kind === 'tower')); // sin torres propias que dañen al atacante
let g = grunt(s, mn.x + 12, mn.y); g.dmg = 1; const ghp = g.hp; run(s, 4);
ok(mn.mining && g.hp === ghp, 'recolectando en una mina con oro no se defiende (sigue minando y no golpea al atacante)');

// B. en camino a la mina (sin recolectar): si lo atacan, se defiende
s = begin(); mine = free(s)[0]; mn = dwarf(s, mine.x, mine.y + 200); g = grunt(s, mn.x + 14, mn.y); g.dmg = 1; g.hp = g.max = 5000; M.hit(mn, 1); const g0 = g.hp;
run(s, 3);
ok(g.hp < g0 && !mn.mining, 'yendo hacia la mina, si lo atacan contraataca');

// C. mina agotada y ninguna otra: avanza y ataca una edificación enemiga
s = begin(); mine = free(s)[0]; s.mines.forEach(m => { if (m !== mine) m.locked = true; }); mn = dwarf(s, mine.x, mine.y + 10); run(s, 3);
ok(mn.mining, 'C: empieza recolectando'); const y0 = mn.y; mine.reserve = 0; run(s, 5);
ok(!mn.mining && mn.y < y0 - 20, 'con la mina sin oro y sin otra libre deja de recolectar y avanza por el carril (' + Math.round(y0 - mn.y) + ' px)');
const tw = s.buildings.filter(b => b.side === 1), hp0 = tw.map(b => b.hp); mn.hp = mn.max = 99999; run(s, 90);
ok(tw.some((b, i) => b.hp < hp0[i]) && !mn.mining, 'sigue avanzando hasta una edificación enemiga y la ataca');

// D. mina agotada con otra con reserva: va a esa otra y la trabaja
s = begin(); const [m1, m2] = free(s); mn = dwarf(s, m1.x, m1.y + 10); run(s, 3); m1.reserve = 0; m2.reserve = M.MINE_RESERVE; const lane0 = mn.lane;
run(s, 12);
ok(mn.mining && mn.mine === m2 && m1.miner !== mn.id, 'con la mina agotada se va a otra mina con oro y la trabaja');

// E. avanzando: si aparece una mina libre con oro, la toma
s = begin(); mine = free(s)[0]; s.mines.forEach(m => { if (m !== mine) m.locked = true; }); mn = dwarf(s, mine.x, mine.y + 10); run(s, 3); mine.reserve = 0; run(s, 4);
const other = s.mines.find(m => m !== mine); other.locked = false; other.reserve = M.MINE_RESERVE; run(s, 25);
ok(mn.mining && mn.mine === other, 'avanzando por una mina agotada, al encontrar otra con oro la ocupa');
console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
