// Fase D: cosméticos, cliente de red, rivales fantasma y servidor (cuenta, nube, ranking, seguridad).
// Uso: node tests/phased.test.js
const fs = require('fs'), path = require('path'), os = require('os');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('data/kota_roster.js') + load('data.js') + load('talents.js') + load('game.js') + load('meta.js') + load('rival.js') + load('season.js') + load('cosmetics.js') + load('net.js') +
  ';globalThis.M={startBattle,update,CARD,MAX_CARD_LEVEL,COSMETICS,COSMETIC,COS_DEFAULT,PASS_COSMETICS,ensureCos,cosOwned,grantCos,buyCos,equipCos,cosHow,equippedTerrain,equippedTitle,ensureAch,claimAch,claimPass,passGain,duelMission,makeRival,ghostRival,' +
  'netNormalizeUrl,netSnapshot,netApply,netProfile,netLinked,netState,netUnlink,netRegister,netPush,netPull,netSendProfile,netBoard,netGhosts,ZONES,get s(){return state}};');

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const newSave = () => ({ coins: 0, levels: {}, cards: ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'], stars: {}, chests: 0, xp: 0, level: 1,
  stats: { battles: 0, wins: 0, kills: 0, mined: 0, deployed: 0, bosses: 0, chests: 0 }, dungeon: { best: 0 }, survival: { best: 0 }, daily: null,
  slots: [{ deck: ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'], leader: 'human_commander' }], slot: 0, duel: { trophies: 120, best: 150, wins: 4, losses: 1, streak: 1, seed: 1 } });

(async () => {
  // ---------- Cosméticos ----------
  ok(M.COSMETICS.length >= 20 && new Set(M.COSMETICS.map(c => c.id)).size === M.COSMETICS.length, 'cosméticos con ids únicos');
  ok(['frame', 'title', 'arena'].every(t => M.COSMETICS.some(c => c.type === t && c.how.free)), 'cada tipo tiene uno gratuito por defecto');
  ok(M.COSMETICS.filter(c => c.how.ach).every(c => /^[a-z]+:\d$/.test(c.how.ach)), 'los desbloqueos por logro apuntan a ids con formato válido');
  const s = newSave(); M.ensureAch(s);
  const allAch = new Set(require('fs').readFileSync(path.join(dir, 'season.js'), 'utf8').match(/id: '[a-z]+'/g).map(x => x.slice(5, -1)));
  ok(M.COSMETICS.filter(c => c.how.ach).every(c => allAch.has(c.how.ach.split(':')[0])), 'los logros referenciados existen');
  ok(M.COSMETICS.filter(c => c.how.pass).every(c => M.PASS_COSMETICS[c.how.pass] === c.id), 'cada cosmético del pase coincide con su nivel');
  M.ensureCos(s);
  ok(s.cos.equip.frame === 'frame_base' && s.cos.equip.title === 'title_recluta' && s.cos.equip.arena === 'arena_auto', 'equipamiento inicial por defecto');
  ok(!M.equipCos(s, 'frame_dorado') && s.cos.equip.frame === 'frame_base', 'no se equipa lo que no tienes');
  ok(M.buyCos(s, 'frame_dorado').err === 'No tienes monedas suficientes', 'comprar sin monedas falla');
  s.coins = 500; ok(M.buyCos(s, 'frame_dorado').ok && s.coins === 100 && M.equipCos(s, 'frame_dorado') && s.cos.equip.frame === 'frame_dorado', 'comprar y equipar un marco');
  ok(M.buyCos(s, 'frame_dorado').err === 'Ya la tienes' && s.coins === 100, 'no se cobra dos veces');
  ok(M.buyCos(s, 'frame_fuego').err === 'No se vende', 'lo que no es de pago no se compra');
  ok(M.cosOwned(s, M.COSMETIC.arena_volcanic) === false, 'liga insuficiente: arena bloqueada'); s.duel.best = 1500; ok(M.cosOwned(s, M.COSMETIC.arena_volcanic) && M.cosOwned(s, M.COSMETIC.title_diamante), 'las ligas desbloquean sus cosméticos');
  ok(!M.cosOwned(s, M.COSMETIC.frame_bosque), 'sin el logro no se tiene el marco'); s.stats.wins = 20; M.claimAch(s, 'wins:0'); ok(M.cosOwned(s, M.COSMETIC.frame_bosque), 'reclamar el logro desbloquea el marco');
  const p = newSave(); M.passGain(p, 99999, new Date(2030, 2, 1)); const cl = M.claimPass(p, 10, new Date(2030, 2, 1));
  ok(cl.cos === 'frame_escarcha' && M.cosOwned(p, M.COSMETIC.frame_escarcha), 'el nivel 10 del pase regala un marco');
  M.claimPass(p, 15, new Date(2030, 2, 1)); ok(M.cosOwned(p, M.COSMETIC.arena_snow), 'el nivel 15 regala la arena de nieve');
  const bad = newSave(); bad.cos = { owned: {}, equip: { frame: 'no_existe', title: 'frame_oro', arena: 'arena_volcanic' } }; M.ensureCos(bad);
  ok(bad.cos.equip.frame === 'frame_base' && bad.cos.equip.title === 'title_recluta' && bad.cos.equip.arena === 'arena_auto', 'equipamiento corrupto o de otro tipo vuelve al básico');
  ok(M.equippedTerrain(newSave()) === null && (() => { const q = newSave(); M.equipCos(q, 'arena_forest'); return M.equippedTerrain(q) === 'forest'; })(), 'la arena equipada da terreno; "la del rival" no');
  ok(M.duelMission(M.makeRival(0, 0, 1), 'snow').terrain === 'snow' && M.duelMission(M.makeRival(0, 0, 1)).terrain, 'el duelo usa la arena elegida');
  ok(M.COSMETICS.every(c => M.cosHow(c).length > 0), 'todos explican cómo conseguirlos');

  // ---------- Rival fantasma ----------
  const g = M.ghostRival({ name: 'Ana', trophies: 400, deck: ['human_warrior', 'human_archer', 'human_mage', 'human_medic', 'human_griphon', 'dwarf_miner', 'no_existe'], levels: { human_warrior: 4, human_archer: 4, human_mage: 3 } }, 7);
  ok(g.ghost && g.name === 'Ana' && g.title === 'Jugador real' && g.faction === 'humans', 'fantasma: nombre, tipo y facción mayoritaria');
  ok(!g.deck.includes('dwarf_miner') && !g.deck.includes('no_existe') && g.deck.length >= 5 && g.deck.length <= 6, 'fantasma: sin cartas inválidas y con 5-6 cartas');
  ok(g.level >= 1 && g.level <= M.MAX_CARD_LEVEL + 1 && g.win > g.lose, 'fantasma: nivel acotado y premio mayor que la pérdida');
  const short = M.ghostRival({ name: 'X', trophies: 0, deck: ['human_warrior'] }, 3); ok(short.deck.length >= 5, 'un mazo corto se completa para que la mano rote');
  M.startBattle(M.duelMission(g), ['human_warrior', 'human_archer'], 'human_commander', {}); for (let i = 0; i < 20 * 20; i++) M.update(0.05);
  ok(M.s.duel.played > 0, 'la IA juega el mazo fantasma');
  const evil = M.ghostRival({ name: '<img onerror=x>'.repeat(5), trophies: -5, deck: null }, 1); ok(evil.name.length <= 16 && evil.deck.length >= 5, 'perfil malformado no rompe nada');

  // ---------- Cliente de red (sin servidor) ----------
  ok(M.netNormalizeUrl('192.168.1.5:8787') === 'http://192.168.1.5:8787' && M.netNormalizeUrl('https://a.b/c/d?x=1') === 'https://a.b' && M.netNormalizeUrl('javascript:alert(1)') === '' && M.netNormalizeUrl('') === '' && M.netNormalizeUrl('ftp://x') === '', 'normalizar la dirección: solo http(s) y sin ruta');
  const n = newSave(); M.netState(n).url = 'http://x:1'; n.net.token = 'a:b';
  const snap = M.netSnapshot(n); ok(!('net' in snap) && n.net.token === 'a:b' && snap.coins === 0, 'la partida subida no lleva el token');
  ok(M.netLinked(n) && (M.netUnlink(n), !M.netLinked(n)), 'conectado/desconectado');
  const pr = M.netProfile(n); ok(pr.deck.length === 6 && pr.levels.human_warrior === 1 && pr.trophies === 120 && pr.best === 150, 'perfil público: mazo, niveles y trofeos');
  const local = newSave(); M.netState(local).url = 'http://y:2'; local.net.token = 't:t';
  ok(!M.netApply(local, { hola: 1 }, 5, {}) && local.net.token === 't:t', 'una partida de la nube no válida se rechaza sin tocar la local');
  ok(M.netApply(local, { coins: 77, cards: ['human_warrior'] }, 9, { coins: 0, cards: [], extra: true }) && local.coins === 77 && local.extra === true && local.net.token === 't:t' && local.net.updated === 9, 'aplicar la nube conserva la conexión y completa campos');
  let failed = false; try { await M.netCall; } catch (e) { /* */ }
  const off = newSave(); M.netState(off).url = 'http://127.0.0.1:1'; off.net.token = 'a:b';
  try { await M.netPush(off); } catch (e) { failed = true; } ok(failed, 'sin servidor la red falla con un error controlado (sin colgarse)');

  // ---------- Servidor real (en memoria, con base temporal) ----------
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kota-')); process.env.DATA = path.join(tmp, 'db.json');
  const srv = require(path.join(dir, 'server', 'server.js'));
  await new Promise(r => srv.server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.server.address().port;
  const call = async (m, p, body, tok) => { const r = await fetch(base + p, { method: m, headers: Object.assign({ 'content-type': 'application/json' }, tok ? { authorization: 'Bearer ' + tok } : {}), body: body === undefined ? undefined : JSON.stringify(body) }); return { st: r.status, j: await r.json().catch(() => ({})) }; };

  let r = await call('GET', '/api/me'); ok(r.st === 401, 'sin token: 401');
  r = await call('GET', '/api/me', undefined, 'abc:def'); ok(r.st === 401, 'token inventado: 401');
  r = await call('POST', '/api/register', { name: '  Ana <b>!!  ' }); const A = r.j.token; ok(r.st === 201 && /^[0-9a-f]{16}:[0-9a-f]{32}$/.test(A) && r.j.name === 'Ana b', 'registro: token y nombre saneado');
  r = await call('POST', '/api/register', { name: 'Beto' }); const B = r.j.token;
  r = await call('GET', '/api/me', undefined, A); ok(r.st === 200 && r.j.name === 'Ana b' && !r.j.hasSave, 'perfil propio');
  r = await call('GET', '/api/me', undefined, A.split(':')[0] + ':' + 'f'.repeat(32)); ok(r.st === 401, 'id correcto con secreto equivocado: 401');
  r = await call('GET', '/api/save', undefined, A); ok(r.st === 404, 'aún sin partida: 404');
  r = await call('PUT', '/api/save', { save: { coins: 5, cards: [] }, base: 0 }, A); const t1 = r.j.updated; ok(r.st === 200 && t1 > 0, 'subir partida');
  r = await call('GET', '/api/save', undefined, A); ok(r.st === 200 && r.j.save.coins === 5, 'bajar la misma partida');
  r = await call('PUT', '/api/save', { save: { coins: 9, cards: [] }, base: t1 - 1000 }, A); ok(r.st === 409, 'conflicto: base más antigua que la nube');
  r = await call('PUT', '/api/save', { save: { coins: 9, cards: [] }, base: t1 - 1000, force: true }, A); ok(r.st === 200, 'forzar sobrescribe');
  r = await call('PUT', '/api/save', { save: [1, 2] }, A); ok(r.st === 400, 'una partida que no es objeto se rechaza');
  r = await call('GET', '/api/save', undefined, B); ok(r.st === 404, 'la partida de uno no la ve el otro');
  r = await call('POST', '/api/profile', { trophies: 300, best: 320, wins: 9, level: 4, deck: ['human_warrior', 'human_archer', 'human_mage', 'human_medic', 'human_griphon', '../../etc', 'X'], levels: { human_warrior: 99 }, leader: 'human_commander' }, A); ok(r.st === 200, 'publicar perfil');
  r = await call('POST', '/api/profile', { trophies: 100, best: 100, wins: 2, level: 2, deck: ['ordu_grunt', 'ordu_raider', 'ordu_bomber', 'ordu_wyvern'], name: 'Beto' }, B);
  r = await call('GET', '/api/leaderboard?limit=5', undefined, A); ok(r.st === 200 && r.j.top[0].name === 'Ana b' && r.j.top[0].me && r.j.top.length === 2 && r.j.you.rank === 1 && r.j.you.of === 2, 'ranking ordenado por trofeos con tu puesto');
  ok(!JSON.stringify(r.j).includes('token') && !JSON.stringify(r.j).includes('deck'), 'el ranking no filtra tokens ni mazos');
  r = await call('GET', '/api/ghosts?trophies=250&n=3', undefined, B); ok(r.st === 200 && r.j.ghosts.length === 1 && r.j.ghosts[0].name === 'Ana b' && r.j.ghosts[0].deck.length === 5, 'los fantasmas son otros jugadores y sus ids de carta están saneados');
  ok(r.j.ghosts[0].levels.human_warrior === 5, 'el nivel de carta se limita a 5');
  r = await call('GET', '/api/ghosts', undefined, A); ok(r.st === 200 && r.j.ghosts.every(x => x.name !== 'Ana b'), 'nunca te devuelve a ti mismo');
  // seguridad
  let raw = await fetch(base + '/../server/data/db.json'); ok(raw.status === 404, 'no sirve la base de datos');
  raw = await fetch(base + '/server/server.js'); ok(raw.status === 404, 'no sirve el código del servidor');
  raw = await fetch(base + '/tests/phased.test.js'); ok(raw.status === 404, 'no sirve las pruebas');
  raw = await fetch(base + '/art/design_complete/index.html'); ok(raw.status === 404, 'no sirve las fuentes de arte (design_complete)');
  raw = await fetch(base + '/art/source_regenerated/units/human_warrior.png'); ok(raw.status === 404, 'ni las hojas regeneradas');
  raw = await fetch(base + '/art/manifest.json'); ok(raw.status === 200, 'pero sí el arte empaquetado');
  raw = await fetch(base + '/%2e%2e/%2e%2e/etc/passwd'); ok(raw.status === 404, 'protegido contra salida de carpeta');
  raw = await fetch(base + '/index.html'); ok(raw.status === 200 && (await raw.text()).includes('KOTA'), 'sirve el juego');
  raw = await fetch(base + '/rival.js'); ok(raw.status === 200 && /javascript/.test(raw.headers.get('content-type')), 'sirve los scripts con su tipo');
  r = await call('PUT', '/api/save', { save: { coins: 1, pad: 'x'.repeat(300000) } }, A); ok(r.st === 413 || r.st === 0, 'cuerpo demasiado grande rechazado') ;
  raw = await fetch(base + '/api/register', { method: 'POST', body: '{no json', headers: { 'content-type': 'application/json' } }); ok(raw.status === 400, 'JSON roto: 400');
  r = await call('DELETE', '/api/account', undefined, B); ok(r.st === 200, 'borrar cuenta'); r = await call('GET', '/api/me', undefined, B); ok(r.st === 401, 'tras borrarla el token ya no vale');
  // el cliente de verdad contra el servidor
  const cc = newSave(); await M.netRegister(cc, base, 'Clara'); ok(M.netLinked(cc) && cc.net.name === 'Clara', 'cliente: registro');
  await M.netSendProfile(cc); const pushed = await M.netPush(cc); ok(pushed.updated > 0 && cc.net.updated === pushed.updated, 'cliente: perfil y partida subidos');
  const got = await M.netPull(cc); ok(got.save.coins === 0 && !('net' in got.save), 'cliente: la nube no guarda el token');
  const board = await M.netBoard(cc); ok(board.top.some(x => x.me && x.name === 'Clara'), 'cliente: aparece en el ranking');
  await new Promise(r => srv.server.close(r)); srv.flush();
  ok(fs.existsSync(process.env.DATA) && Object.keys(JSON.parse(fs.readFileSync(process.env.DATA, 'utf8')).players).length >= 2, 'los datos se guardan en disco');
  ok(!JSON.stringify(JSON.parse(fs.readFileSync(process.env.DATA, 'utf8'))).includes(A.split(':')[1]), 'el secreto del token no se guarda en claro');
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
  process.exit(fail ? 1 : 0);
})();
