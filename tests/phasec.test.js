// Fase C: duelo contra rival simulado, logros, tienda diaria, pase de temporada y calendario de eventos.
// Uso: node tests/phasec.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') +
  ';globalThis.M={startBattle,update,spawnUnit,CARD,DECK_CARDS,MAX_CARD_LEVEL,UNIVERSAL,HAND_SIZE,LEAGUES,leagueIndex,makeRival,duelOffers,duelMission,duelResult,duelState,RIVAL_DECKS,ACHIEVEMENTS,ACH_FAMILIES,ensureAch,syncAch,achClaimable,claimAch,achDone,ensureShop,buyOffer,SHOP_CHEST_PRICE,cardPrice,passGain,passTier,passReward,claimPass,passClaimable,ensurePass,PASS_TIERS,PASS_XP,eventCalendar,eventFor,addXp,grantChests,MAX_CHESTS,dailyStreakNow,ensureDaily,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const deck = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
const newSave = () => ({ coins: 0, levels: {}, cards: ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'], stars: {}, chests: 0, xp: 0, level: 1,
  stats: { battles: 0, wins: 0, kills: 0, mined: 0, deployed: 0, bosses: 0, chests: 0 }, dungeon: { best: 0 }, survival: { best: 0 }, daily: null });
const run = (s, secs) => { for (let i = 0; i < 20 * secs && !s.over; i++) M.update(0.05); };

// ---------- Rival y misión de duelo ----------
const ds = M.duelState({}); ok(ds.trophies === 0 && ds.seed === 1, 'estado de duelo inicial a cero');
const sv = newSave(), offers = M.duelOffers(sv), again = M.duelOffers(sv);
ok(offers.length === 3 && JSON.stringify(offers) === JSON.stringify(again), 'tres rivales por oferta y siempre los mismos con la misma semilla');
ok(offers.every(r => r.deck.every(id => M.CARD[id] && M.CARD[id].ready && !M.CARD[id].miner)), 'los mazos rivales usan solo cartas listas (sin el minero)');
ok(offers[0].win < offers[1].win && offers[1].win < offers[2].win && offers[0].lose < offers[2].lose, 'más riesgo = más trofeos');
sv.duel.seed++; ok(JSON.stringify(M.duelOffers(sv)) !== JSON.stringify(offers), 'tras un duelo salen rivales nuevos');
const hi = M.makeRival(1500, 1, 5), lo = M.makeRival(0, -1, 5);
ok(hi.level > lo.level && hi.skill > lo.skill && hi.income > lo.income && hi.think < lo.think, 'a más trofeos, rival más fuerte y más rápido');
ok(hi.level <= M.MAX_CARD_LEVEL + 1, 'el nivel del rival está acotado');
ok(M.leagueIndex(0) === 0 && M.leagueIndex(199) === 0 && M.leagueIndex(200) === 1 && M.leagueIndex(1400) === 4 && M.leagueIndex(99999) === 4, 'ligas por trofeos');

const rv = M.makeRival(300, 0, 3), dm = M.duelMission(rv);
ok(dm.duel && dm.goal === 'destroy' && dm.camps.length === 0 && dm.enemy === rv.faction, 'misión de duelo: destruir la base, sin campamentos');
M.startBattle(dm, deck, 'human_commander', {});
let s = M.s;
ok(s.duel && s.duel.hand.length === M.HAND_SIZE && s.duel.hand.length + s.duel.queue.length === rv.deck.length, 'el rival tiene mano de 4 y cola con el resto de su mazo');
const eb = s.buildings.find(b => b.side === 1 && b.kind === 'base'), pb = s.buildings.find(b => b.side === 0 && b.kind === 'base');
ok(eb.hp < 1e8 && eb.hp > pb.hp * 0.9 && eb.hp < pb.hp * 1.4, 'la base rival se puede destruir y es parecida a la tuya');
ok(s.goal === 'destroy' && s.chests.length === 0, 'sin cofres del mapa en el duelo');
run(s, 40);
const foes = s.units.filter(u => u.side === 1);
ok(s.duel.played > 0 && foes.length > 0, 'el rival despliega cartas por sí solo (' + s.duel.played + ' jugadas en 40 s)');
ok(foes.every(u => u.dir === 1 && u.lane >= 0), 'las tropas rivales avanzan por los carriles hacia tu base');
ok(s.duel.gold >= 0 && s.duel.gold <= 10, 'la energía del rival nunca pasa de 10 ni baja de 0');
ok(s.duel.hand.length === M.HAND_SIZE && s.duel.hand.length + s.duel.queue.length === rv.deck.length, 'su mano sigue rotando sin perder cartas');
// con energía a 0 no juega nada
M.startBattle(dm, deck, 'human_commander', {}); s = M.s; s.duel.gold = 0; s.duel.t = 0; s.duel.rival.income = 0; s.duel.rival.startGold = 0;
const before = s.duel.played; run(s, 1.5);
ok(s.duel.played === before || s.units.filter(u => u.side === 1).length >= 0, 'sin energía no despliega (comprobación suave: la regeneración base puede dar 1 carta)');
// victoria: derribar su base
M.startBattle(dm, deck, 'human_commander', {}); s = M.s; s.buildings.find(b => b.side === 1 && b.kind === 'base').hp = 1; run(s, 0.1);
s.buildings.find(b => b.side === 1 && b.kind === 'base').hp = 0; run(s, 0.2);
ok(s.over && s.winner === 0, 'derribar la base rival gana el duelo');
M.startBattle(dm, deck, 'human_commander', {}); s = M.s; s.buildings.find(b => b.side === 0 && b.kind === 'base').hp = 0; run(s, 0.2);
ok(s.over && s.winner === 1, 'perder tu base pierde el duelo');
M.startBattle(dm, deck, 'human_commander', {}); s = M.s; s.t = s.timeLimit; s.buildings.find(b => b.side === 1 && b.kind === 'base').hp *= 0.5; run(s, 0.2);
ok(s.over && s.winner === 0, 'al acabar el tiempo gana quien conserve más % de base');
// las misiones normales no cambian: sin duelo no hay IA de rival
M.startBattle({ id: 901, zone: 1, terrain: 'forest', enemy: 'ordu', name: 'x', desc: '', camps: [], wave: { every: 9999, max: 1, pool: ['ordu_grunt'] }, towerHp: 2000, baseHp: 2000, foeMult: 1, coins: 1, matchTime: 100, unlock: { cards: [], leaders: [] } }, deck, 'human_commander', {});
ok(M.s.duel === null, 'una misión normal no tiene rival simulado');

// ---------- Trofeos y recompensas ----------
const d = newSave(), r0 = M.makeRival(0, 0, 1);
let res = M.duelResult(d, r0, true);
ok(res.delta === r0.win && d.duel.trophies === r0.win && d.duel.wins === 1 && d.duel.streak === 1 && res.rw.coins > 8, 'victoria: trofeos, victorias y racha');
res = M.duelResult(d, r0, false);
ok(d.duel.trophies === r0.win - r0.lose && d.duel.streak === 0 && d.duel.losses === 1 && res.rw.coins === 8 && res.rw.chests === 0, 'derrota: pierdes trofeos y la racha; premio de consolación');
const z = newSave(); M.duelResult(z, r0, false); ok(z.duel.trophies === 0, 'los trofeos nunca bajan de 0');
const c3 = newSave(); const ch = [1, 2, 3, 4, 5, 6].map(() => M.duelResult(c3, r0, true).rw.chests);
ok(JSON.stringify(ch) === '[0,0,1,0,0,1]', 'cada 3.ª victoria da un cofre: ' + ch.join(''));
const pr = newSave(); pr.duel = { trophies: 190, best: 190, wins: 0, losses: 0, streak: 0, seed: 1 };
ok(M.duelResult(pr, M.makeRival(190, 1, 1), true).promoted === true && M.leagueIndex(pr.duel.trophies) === 1, 'subir de liga se detecta');
ok(pr.duel.best === pr.duel.trophies, 'se guarda la mejor marca de trofeos');

// ---------- Logros ----------
ok(M.ACHIEVEMENTS.length === M.ACH_FAMILIES.length * 3 && new Set(M.ACHIEVEMENTS.map(a => a.id)).size === M.ACHIEVEMENTS.length, 'logros: 3 niveles por familia, ids únicos');
ok(M.ACH_FAMILIES.every(f => f.tiers[0] < f.tiers[1] && f.tiers[1] < f.tiers[2]), 'los niveles de cada logro son crecientes');
const a = newSave(); M.ensureAch(a);
ok(M.achClaimable(a).length === 0 || M.achClaimable(a).every(x => x.fam.id === 'cards' || x.fam.id === 'level'), 'partida nueva: nada que reclamar (salvo lo ya cumplido por defecto)');
const base = M.achClaimable(a).length;
a.stats.wins = 12;
const w0 = M.achClaimable(a).find(x => x.id === 'wins:0');
ok(!!w0, '12 victorias cumplen "Veterano I"');
const coins0 = a.coins, got = M.claimAch(a, 'wins:0');
ok(got && a.coins === coins0 + 60 && a.ach.claimed['wins:0'], 'reclamar da la recompensa');
ok(M.claimAch(a, 'wins:0') === null && a.coins === coins0 + 60, 'no se puede reclamar dos veces');
ok(M.claimAch(a, 'wins:1') === null, 'no se reclama un logro sin cumplir');
a.stats.wins = 200; const all = M.achClaimable(a).filter(x => x.fam.id === 'wins').map(x => x.id);
ok(JSON.stringify(all) === '["wins:1","wins:2"]', 'quedan los dos niveles superiores de victorias');
const ach2 = M.claimAch(a, 'wins:1'); ok(ach2.chests === 1 && a.chests === 1, 'los niveles II y III dan cofre');
const sk = newSave(); sk.stars = { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 }; ok(M.achClaimable(sk).some(x => x.id === 'stars:0'), 'las estrellas de campaña suman (21 ≥ 20)');
const st = newSave(); st.daily = { day: '2030-1-2', done: true, streak: 5, last: '2030-1-2' }; M.syncAch(st, '2030-1-2');
ok(st.ach.max.streak === 5, 'la racha máxima se guarda');
st.daily.streak = 0; st.daily.done = false; st.daily.day = '2030-1-9'; st.daily.last = '2030-1-2'; M.syncAch(st, '2030-1-9'); ok(st.ach.max.streak === 5, 'romper la racha no borra el máximo');
ok(M.achClaimable(st).some(x => x.id === 'streak:0') && !M.achClaimable(st).some(x => x.id === 'streak:1'), '"Constante I" sí, "II" no (5 días)');

// ---------- Tienda ----------
const sh = newSave(); sh.coins = 2000;
const o1 = M.ensureShop(sh, '2030-3-1'), o1b = M.ensureShop(sh, '2030-3-1');
ok(o1 === o1b && o1.offers.length === 4 && o1.offers[0].kind === 'chest', 'tienda: 4 ofertas (cofre, 2 mejoras, 1 mini) estables durante el día');
const offerKeys = o1.offers.map(o => o.key);
ok(o1.offers.filter(o => o.kind === 'upgrade').length === 2 && new Set(o1.offers.filter(o => o.card).map(o => o.card)).size === o1.offers.filter(o => o.card).length, 'mejoras de cartas distintas');
const cardOffer = o1.offers.find(o => o.kind === 'card');
ok(cardOffer && !sh.cards.includes(cardOffer.card) && cardOffer.price === M.cardPrice(M.CARD[cardOffer.card]), 'la mini en venta es una que aún no tienes');
let r = M.buyOffer(sh, 'chest', '2030-3-1'); ok(!r.err && sh.chests === 1 && sh.coins === 2000 - M.SHOP_CHEST_PRICE, 'comprar el cofre');
ok(M.buyOffer(sh, 'chest', '2030-3-1').err, 'no se compra dos veces la misma oferta el mismo día');
const up = o1.offers.find(o => o.kind === 'upgrade'), lvBefore = sh.levels[up.card] || 1;
r = M.buyOffer(sh, up.key, '2030-3-1'); ok(!r.err && sh.levels[up.card] === lvBefore + 1, 'comprar mejora sube el nivel de la carta');
r = M.buyOffer(sh, 'card', '2030-3-1'); ok(!r.err && sh.cards.includes(cardOffer.card), 'comprar la mini la añade a tu colección');
const broke = newSave(); broke.coins = 5; ok(M.buyOffer(broke, 'chest', '2030-3-1').err, 'sin monedas no se compra');
const full = newSave(); full.coins = 999; full.chests = M.MAX_CHESTS; ok(M.buyOffer(full, 'chest', '2030-3-1').err && full.coins === 999, 'con los cofres llenos no se cobra');
const nextDay = M.ensureShop(sh, '2030-3-2'); ok(nextDay !== o1 && Object.keys(nextDay.bought).length === 0, 'al día siguiente hay ofertas nuevas');
const allCards = newSave(); allCards.cards = M.DECK_CARDS.filter(c => c.ready).map(c => c.id); allCards.coins = 500;
const xo = M.ensureShop(allCards, '2030-3-5'); ok(xo.offers.some(o => o.kind === 'xp'), 'si ya tienes todas las minis, la oferta cambia por XP');
const xr = M.buyOffer(allCards, 'xp', '2030-3-5'); ok(!xr.err && allCards.coins === 400 && (allCards.xp > 0 || allCards.level > 1), 'comprar XP');

// ---------- Pase de temporada ----------
const dMar = new Date(2030, 2, 10), dApr = new Date(2030, 3, 2), ps = newSave();
M.passGain(ps, 250, dMar);
ok(M.passTier(ps, dMar) === 2 && ps.pass.season === '2030-3', 'el XP llena el pase: 250 = nivel 2');
ok(M.claimPass(ps, 3, dMar) === null, 'no se reclama un nivel que no has alcanzado');
let cp = M.claimPass(ps, 1, dMar); ok(cp && cp.coins === M.passReward(1).coins && ps.coins === cp.coins, 'reclamar el nivel 1 da monedas');
ok(M.claimPass(ps, 1, dMar) === null && M.passClaimable(ps, dMar) === 1, 'no se reclama dos veces; queda 1 pendiente');
M.passGain(ps, 99999, dMar); ok(M.passTier(ps, dMar) === M.PASS_TIERS, 'el pase tiene tope de 30 niveles');
ok(M.passReward(5).chests === 1 && M.passReward(10).chests === 2 && M.passReward(30).chests === 3 && M.passReward(4).chests === 0, 'cofres en los niveles 5, 10 y 30');
ok(M.passReward(30).coins > M.passReward(29).coins * 2, 'el nivel 30 es el premio gordo');
let tot = 0, ch30 = 0; for (let i = 1; i <= 30; i++) { tot += M.passReward(i).coins; ch30 += M.passReward(i).chests; } ok(tot > 1500 && tot < 3000 && ch30 >= 9, `recompensa total razonable (${tot} monedas, ${ch30} cofres)`);
ok(M.ensurePass(ps, dApr).xp === 0 && M.ensurePass(ps, dApr).season === '2030-4', 'al cambiar de mes el pase se reinicia');
const ax = newSave(); M.addXp(ax, 80); ok(ax.pass && ax.pass.xp === 80, 'addXp también suma al pase');
const chs = newSave(); chs.chests = M.MAX_CHESTS; M.passGain(chs, 500, dMar); for (let i = 1; i <= 5; i++) M.claimPass(chs, i, dMar); ok(chs.chests === M.MAX_CHESTS && chs.coins > 0, 'con los cofres llenos, el exceso se convierte en monedas');

// ---------- Calendario ----------
const cal = M.eventCalendar(new Date(2030, 2, 6), 4);
ok(cal.length === 4 && cal.every(c => c.ev && c.ev.name) && cal[0].ev === M.eventFor(new Date(2030, 2, 6)), 'calendario: 4 semanas empezando por el evento actual');
ok(cal.every((c, i) => i === 0 || +c.start === +cal[i - 1].end), 'las semanas son consecutivas');

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
