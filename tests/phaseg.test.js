// Fase G: energía y cores, mejora de unidades con varios costes, paquetes, ofertas de dinero real (escaparate) y estructura de la nueva interfaz.
// Uso: node tests/phaseg.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') + load('economy.js') + load('cosmetics.js') +
  ';globalThis.M={CARD,MAX_CARD_LEVEL,UNIVERSAL,upgradeCost,upgradeReq,ensureWallet,energyGain,canAfford,upgradeCard,ENERGY_PACKS,CORE_PACKS,buyPack,REAL_BUNDLES,ENERGY_START,CORES_START,addXp,openChest,claimAch,ensureAch,passGain,passReward,claimPass,skullReward,ensureShop,buyOffer,SHOP_VERSION,ACHIEVEMENTS,PASS_TIERS,MISSIONS,LEADER_LIST,DECK_CARDS,START_CARDS};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const newSave = () => ({ coins: 0, levels: {}, cards: M.START_CARDS.slice(), stars: {}, chests: 0, xp: 0, level: 1, stats: {}, dungeon: { best: 0 }, survival: { best: 0 }, daily: null });

// ---------- Cartera ----------
const s0 = newSave(); M.ensureWallet(s0);
ok(s0.energy === M.ENERGY_START && s0.cores === M.CORES_START, 'una partida antigua recibe energía y cores iniciales');
const s1 = newSave(); s1.energy = 7; s1.cores = 2; M.ensureWallet(s1); ok(s1.energy === 7 && s1.cores === 2, 'no se pisan los valores existentes');
const s2 = newSave(); s2.energy = NaN; s2.cores = 'x'; M.ensureWallet(s2); ok(isFinite(s2.energy) && typeof s2.cores === 'number', 'valores corruptos se corrigen');
const g = newSave(); M.ensureWallet(g); const e0 = g.energy; M.addXp(g, 55); ok(g.energy === e0 + 6, 'ganar XP da energía (1 por cada 10 XP, redondeando hacia arriba)');
M.addXp(g, 0); M.addXp(g, -30); ok(g.energy === e0 + 6, 'sin XP o con XP negativo no cambia la energía');

// ---------- Mejoras ----------
ok(M.upgradeReq(1).coins === M.upgradeCost(1) && M.upgradeReq(1).energy === 5 && M.upgradeReq(1).cores === 0, 'Nv1→2: oro y energía, sin cores');
ok(M.upgradeReq(2).cores === 0 && M.upgradeReq(3).cores === 1 && M.upgradeReq(4).cores === 2, 'los cores se piden desde el nivel 3→4');
ok([1, 2, 3, 4].every((l, i, a) => i === 0 || (M.upgradeReq(l).coins > M.upgradeReq(a[i - 1]).coins && M.upgradeReq(l).energy > M.upgradeReq(a[i - 1]).energy)), 'cada nivel cuesta más');
let u = newSave(); u.coins = 1000; u.energy = 100; u.cores = 10;
let r = M.upgradeCard(u, 'human_warrior'); ok(r.ok && r.level === 2 && u.levels.human_warrior === 2 && u.coins === 1000 - M.upgradeCost(1) && u.energy === 95 && u.cores === 10, 'mejorar descuenta oro y energía');
M.upgradeCard(u, 'human_warrior'); const cb = u.cores; r = M.upgradeCard(u, 'human_warrior'); ok(r.ok && u.cores === cb - 1 && u.levels.human_warrior === 4, 'pasar de Nv3 a Nv4 gasta 1 core');
M.upgradeCard(u, 'human_warrior'); ok(u.levels.human_warrior === 5 && /^Nivel máximo/.test(M.upgradeCard(u, 'human_warrior').err || ''), 'tope en el nivel 5');
u = newSave(); u.coins = 1000; u.energy = 3; ok(M.upgradeCard(u, 'human_warrior').err && !u.levels.human_warrior && u.coins === 1000, 'sin energía suficiente no se mejora ni se cobra');
u = newSave(); u.coins = 1000; u.energy = 100; u.cores = 0; u.levels.human_warrior = 3; ok(M.upgradeCard(u, 'human_warrior').err && u.energy === 100, 'sin cores no se pasa del Nv3');
u = newSave(); u.coins = 5; u.energy = 100; ok(M.upgradeCard(u, 'human_warrior').err, 'sin oro no se mejora');
u = newSave(); u.coins = 1000; u.energy = 100; ok(M.upgradeCard(u, 'human_paladin').err === 'Aún no tienes esta mini', 'no se mejora una mini que no tienes');
u = newSave(); u.coins = 1000; u.energy = 100; ok(M.upgradeCard(u, M.UNIVERSAL).ok, 'el enano minero (universal) sí se puede mejorar');
ok(M.canAfford({ coins: 10, energy: 5, cores: 0 }, { coins: 10, energy: 5, cores: 0 }) && !M.canAfford({ coins: 9, energy: 5, cores: 0 }, { coins: 10, energy: 5, cores: 0 }), 'canAfford exige los tres recursos');

// ---------- Cores y energía como premio ----------
let c = newSave(); M.ensureWallet(c); c.chests = 5; c.cores = 0; const seq = [0.1, 0.9, 0.1]; let k = 0;
let res = M.openChest(c, () => seq[k++ % 3]); ok(res.core === 1 && c.cores === 1, 'un cofre puede dar un core (25%)');
c.chests = 1; res = M.openChest(c, () => 0.99); ok(res.core === 0 && c.cores === 1, 'o no darlo');
c = newSave(); M.ensureWallet(c); c.stats.wins = 200; c.cores = 0; ok(M.claimAch(c, 'wins:0').cores === 0 && c.cores === 0, 'los logros de nivel I no dan cores');
ok(M.claimAch(c, 'wins:1').cores === 1 && M.claimAch(c, 'wins:2').cores === 2 && c.cores === 3, 'los niveles II y III dan 1 y 2 cores');
c = newSave(); M.ensureWallet(c); c.cores = 0; M.passGain(c, 99999, new Date(2030, 2, 1)); for (let i = 1; i <= 30; i++) M.claimPass(c, i, new Date(2030, 2, 1));
ok(c.cores === 6 && M.passReward(10).cores === 1 && M.passReward(20).cores === 2 && M.passReward(30).cores === 3 && M.passReward(9).cores === 0, 'el pase da 1, 2 y 3 cores en los niveles 10, 20 y 30 (6 en total)');
ok(M.skullReward(1, true).cores === 0 && M.skullReward(4, true).cores === 1 && M.skullReward(10, true).cores === 3 && !M.skullReward(7, false).cores, 'las calaveras dan cores solo la 1.ª vez y desde el nivel 4');

// ---------- Paquetes de la tienda ----------
ok(M.ENERGY_PACKS.length === 3 && M.CORE_PACKS.length === 3, '3 paquetes de energía y 3 de cores');
ok([M.ENERGY_PACKS, M.CORE_PACKS].every(l => l.every((p, i) => i === 0 || (p.amount > l[i - 1].amount && p.price > l[i - 1].price && p.price / p.amount <= l[i - 1].price / l[i - 1].amount))), 'los paquetes grandes son más baratos por unidad');
let b = newSave(); M.ensureWallet(b); b.coins = 100; const en = b.energy;
r = M.buyPack(b, 'en_s'); ok(r.ok && b.energy === en + 30 && b.coins === 40, 'comprar energía con oro');
ok(M.buyPack(b, 'en_m').err && b.energy === en + 30 && b.coins === 40, 'sin oro no se vende ni se cobra');
b.coins = 1000; const co = b.cores; r = M.buyPack(b, 'co_5'); ok(r.ok && b.cores === co + 5 && b.coins === 350, 'comprar cores con oro');
ok(M.buyPack(b, 'nope').err, 'paquete inexistente');
ok(M.buyPack(b, 'co_1').kind === 'cores' && M.buyPack(b, 'en_s').kind === 'energy', 'el resultado indica qué se compró');

// ---------- Ofertas de dinero real: solo escaparate ----------
ok(M.REAL_BUNDLES.length === 3 && M.REAL_BUNDLES.every(x => x.name && /^\$\d+\.\d\d$/.test(x.price) && x.items.length >= 4), '3 paquetes con precio y contenido');
ok(M.REAL_BUNDLES.every(x => x.available === false), 'ninguno se puede comprar (no hay pasarela de pago)');
ok(!/function\s+(buyBundle|buyReal|checkout|pay)\b/.test(load('economy.js') + load('ui_main.js')), 'no existe código que entregue un paquete de dinero real');

// ---------- Tienda diaria con precios nuevos ----------
const sh = newSave(); sh.coins = 5000; const st = M.ensureShop(sh, '2031-5-5'), up = st.offers.find(o => o.kind === 'upgrade');
ok(st.v === M.SHOP_VERSION && up.price === Math.ceil(M.upgradeCost(sh.levels[up.card] || 1) * 1.5), 'la mejora de la tienda cuesta oro ×1,5 (sin energía ni cores)');
sh.shop.v = 1; sh.shop.bought = { chest: true }; ok(M.ensureShop(sh, '2031-5-5').bought.chest === undefined, 'una tienda guardada con reglas antiguas se regenera');

// ---------- Estructura de la interfaz ----------
const html = load('index.html'), ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const dynamic = new Set(['army-coll']); // ids que crea el código
const used = new Set(); for (const f of ['ui.js', 'ui_main.js', 'ui_store.js', 'ui_online.js']) for (const m of load(f).matchAll(/\$\('([a-z0-9-]+)'\)/g)) used.add(m[1]);
const missing = [...used].filter(i => !ids.has(i) && !dynamic.has(i));
ok(missing.length === 0, 'todos los elementos que usa el código existen en index.html' + (missing.length ? ': faltan ' + missing.join(', ') : ''));
const nav = [...html.slice(html.indexOf('<nav id="nav">'), html.indexOf('</nav>')).matchAll(/<button([^>]*)>.*?<span>([^<]+)<\/span>/g)];
ok(nav.map(m => m[2]).join(',') === 'Tienda,Ejército,Mapa,Mazmorras,Guild', 'la navegación tiene 5 espacios en el orden pedido: Tienda, Ejército, Mapa, Mazmorras, Guild');
ok(/data-go="home"[^>]*class="center|class="center[^>]*data-go="home"/.test(html) && nav[2][1].includes('data-go="home"'), 'el Mapa es el espacio central');
ok(/id="nav-guild"[^>]*class="locked"/.test(html) && !/id="nav-guild"[^>]*data-go/.test(html), 'Guild está bloqueado y no navega');
ok(html.indexOf('id="topbar"') < html.indexOf('id="home"') && html.indexOf('id="topbar"') > html.indexOf('id="loading"'), 'la cabecera va una sola vez, fuera de las pantallas');
ok(['wallet', 'wallet-energy', 'wallet-cores', 'gold-num', 'avatar', 'xpfill'].every(i => ids.has(i)), 'la cabecera tiene avatar con barra de XP, oro y desplegable con energía y cores');
ok(['map-body', 'map-footer'].every(i => ids.has(i)) && html.indexOf('id="map-footer"') > html.indexOf('id="map-body"'), 'el Mapa tiene cuerpo y pie');
ok(!/id="(quests|campaign|hero-stage|play|tile-quests)"/.test(html), 'ya no quedan las pantallas antiguas');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]), sw = load('sw.js');
ok(scripts.every(s => s.startsWith('data/') || s.startsWith('art/') || sw.includes("'" + s + "'")), 'todos los scripts están en la caché del service worker');
ok(scripts.indexOf('economy.js') > scripts.indexOf('season.js') && scripts.indexOf('ui_main.js') > scripts.indexOf('ui_online.js'), 'orden de carga correcto');
const lead = M.LEADER_LIST; ok(lead.length === 6, '6 héroes para el carrusel');
const byF = {}; M.DECK_CARDS.filter(x => x.ready).forEach(x => { byF[x.faction] = (byF[x.faction] || 0) + 1; }); ok(Object.keys(byF).sort().join() === 'humans,ordu,undead', 'la colección se agrupa por 3 razas (+ enanos, el minero universal): ' + JSON.stringify(byF));

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
