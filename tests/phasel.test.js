// Fase L: jefes de expansión y héroes de cuerpo entero empaquetados.
// Uso: node tests/phasel.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const mf = JSON.parse(read('art/manifest.json'));
ok(JSON.stringify(JSON.parse(read('art/manifest.js').replace(/^window\.KOTA_ART = /, '').replace(/;\s*$/, ''))) === JSON.stringify(mf), 'manifest.js y manifest.json sincronizados');
eval(read('data/kota_roster.js'));
const bosses = window.KOTA_ROSTER.bosses;
const news = bosses.filter(b => b.expansion);
ok(bosses.length === 10 && news.length === 5, '10 jefes en el roster: 5 anteriores + 5 de expansión');
const data = read('data.js');
for (const b of news) {
  const m = mf.units[b.art];
  ok(m && m.anims.idle.n === 4 && m.anims.walk.n === 6 && m.anims.attack.n === 4 && m.anims.death.n === 4 && fs.existsSync(path.join(dir, m.sheet)), `${b.id}: hoja de 5 filas y archivo existe`);
  ok(new RegExp(b.id + ': \{ hp').test(data), `${b.id}: tiene estadísticas`);
}
const heroes = window.KOTA_ROSTER.leaders;
ok(heroes.every(h => mf.leadersFull[h.portrait] && fs.existsSync(path.join(dir, mf.leadersFull[h.portrait])) && mf.units['hero_' + h.portrait]), 'los 6 héroes tienen pose de cuerpo entero y hoja animada');
ok(/bossrush2/.test(read('meta.js')), 'hay un evento con los jefes de expansión');
console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
