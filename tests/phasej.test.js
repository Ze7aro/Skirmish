// Fase J: arte de design_complete como línea única — hojas de 5 filas empaquetadas con animaciones reales (idle 4, caminar 6, ataque 4, muerte 4).
// Uso: node tests/phasej.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };

const manifest = JSON.parse(read('art/manifest.json')), js = read('art/manifest.js');
ok(JSON.stringify(JSON.parse(js.replace(/^window\.KOTA_ART = /, '').replace(/;\s*$/, ''))) === JSON.stringify(manifest), 'manifest.js y manifest.json están sincronizados');
eval(read('data/kota_roster.js'));
const units = window.KOTA_ROSTER.units.filter(u => u.art && u.status !== 'por_ilustrar');
ok(units.length === 19, '19 minis con arte en el roster');

// tamaño de un WebP leyendo su cabecera (VP8X o VP8L)
function webpSize(file) {
  const b = fs.readFileSync(path.join(dir, file));
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const t = b.toString('ascii', 12, 16);
  if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  return null;
}
const EXPECT = { idle: 4, walk: 6, attack: 4, death: 4 };
let allAnim = true, allDims = true, allCells = true, allKeys = true;
for (const u of units) {
  const m = manifest.units[u.art];
  if (!m) { allKeys = false; console.log('  falta en el manifiesto:', u.art); continue; }
  const anims = Object.keys(EXPECT).every((a, i) => m.anims[a] && m.anims[a].n === EXPECT[a] && m.anims[a].row === i) && !m.anims.hit;
  if (!anims) { allAnim = false; console.log('  animaciones inesperadas en', u.art, JSON.stringify(m.anims)); }
  const cellsOk = m.cw >= 100 && m.cw <= 240 && m.ch >= m.bh && m.ch <= Math.round(m.bh * 1.4) + 1 && m.bh >= 100 && m.bh <= 150 && m.bw >= 60 && m.bw <= m.cw;
  if (!cellsOk) { allCells = false; console.log('  celda rara en', u.art, m.cw, m.ch, m.bw, m.bh); }
  const sz = webpSize(m.sheet);
  if (!sz || sz.w !== m.cw * 6 || sz.h !== m.ch * 4) { allDims = false; console.log('  tamaño de hoja distinto en', u.art, JSON.stringify(sz), m.cw * 6, m.ch * 4); }
}
ok(allKeys, 'las 19 minis están en el manifiesto');
ok(allAnim, 'todas con idle ×4, caminar ×6, ataque ×4 y muerte ×4 en ese orden de filas, sin fila "golpeado"');
ok(allCells, 'celdas con tamaños sensatos: personaje de 100-150 px de alto y margen de hasta +40% arriba');
ok(allDims, 'cada hoja mide (6 columnas × ancho) por (4 filas × alto)');

// los jefes y héroes antiguos siguen intactos
ok(['boss_capitan_saqueador', 'boss_guardian_piedra', 'boss_nigromante_tumulo', 'boss_raizantiguo', 'boss_senor_cripta'].every(k => manifest.units[k]), 'los 5 jefes anteriores siguen en el manifiesto');
ok(Object.keys(manifest.leaders).length >= 10, 'los retratos de héroe siguen en el manifiesto');

// motor de sprites: usa el alto del personaje, no el de la celda
const render = read('render.js');
ok(/bh: m\.bh \|\| m\.ch/.test(render) && /displayH \/ \(f\.bh \|\| f\.ch\)/.test(render), 'spriteFrame y blit escalan con el alto del personaje (bh)');
ok(/cv\.height \/ f\.bh/.test(render) && /f\.bw/.test(render), 'los iconos de carta usan el tamaño del personaje');
ok(/card\.proc === 'dwarf' && !\(ART\.units && ART\.units\[setId\]\)/.test(render), 'el enano usa su arte cuando existe (el dibujo por código queda de respaldo)');

// herramientas y fuentes
ok(fs.existsSync(path.join(dir, 'tools/pack_sheets.py')) && /EXPECT = /.test(read('tools/pack_sheets.py')), 'existe el empaquetador de hojas de 5 filas');
const sw = read('sw.js'); ok(!/design_complete|source_regenerated/.test(sw), 'el service worker no cachea las fuentes de arte');
ok(fs.existsSync(path.join(dir, 'art/design_complete/units_current/human_warrior.png')), 'las hojas fuente siguen disponibles para volver a empaquetar');

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
