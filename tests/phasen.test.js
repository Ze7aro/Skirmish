// Fase N: planeta de campaña — 5 regiones × 5 mapas, geometría de la esfera y comprobaciones de accesibilidad.
// Uso: node tests/phasen.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
global.window = {};
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };

const ui = read('ui.js');
const unlockSrc = ui.match(/const missionUnlocked = i => \{[^\n]*\};/)[0];
const code = ['data/kota_roster.js', 'art/manifest.js', 'data.js', 'talents.js'].map(read).join('\n') + '\n' + unlockSrc + '\n' + read('ui_planet.js') +
  '\n;globalThis.M={MISSIONS,CHAMPIONS,BOSS,GOALS,REGIONS,regionMaps,regionProgress,progressText,projectPoint,unprojectNormal,regionAtLonLat,missionUnlocked,CORE_MISSIONS,setSave:s=>{save=s},PITCH_MAX,DEG};';
let save = { stars: {} };
eval(code);
const { MISSIONS, REGIONS } = M;

// ---- datos: 5 regiones × 5 mapas, con los nombres y jefes del proyecto ----
ok(REGIONS.length === 5 && ['Bosque Esmeralda', 'Dunas Doradas', 'Corona Glacial', 'Falla de Ceniza', 'Reino Olvidado'].every((n, i) => REGIONS[i].name === n), 'cinco regiones con los nombres pedidos y en ese orden');
ok(REGIONS.every(r => M.regionMaps(r).length === 5), 'cada región contiene exactamente cinco mapas');
const all = REGIONS.flatMap(r => M.regionMaps(r).map(m => m.id));
ok(new Set(all).size === 25 && all.length === MISSIONS.length, 'los 25 mapas del proyecto están repartidos sin repetir ni faltar');
ok(REGIONS.every(r => { const ms = M.regionMaps(r); return ms.slice(0, 4).every(m => !m.regional && m.id < M.CORE_MISSIONS) && ms[4].regional && ms[4].boss && ms[4].boss.id === M.CHAMPIONS[r.terrain]; }), 'los cuatro primeros son de la campaña original y el quinto es el jefe regional (campeón de su terreno)');
ok(REGIONS.every(r => M.BOSS[M.regionMaps(r)[4].boss.id]), 'los jefes regionales existen en el roster');
ok(MISSIONS.slice(0, 20).every(m => m.id === MISSIONS[m.id].id) && MISSIONS[0].name === 'Linde del bosque' && MISSIONS[19].name === 'Trono ardiente', 'las 20 misiones originales conservan sus nombres e ids');
ok(MISSIONS.every(m => M.GOALS[m.goal]), 'todos los mapas tienen un objetivo conocido');

// ---- progreso y bloqueos ----
M.setSave({ stars: {} }); save = { stars: {} };
const forest = REGIONS[0];
ok(M.progressText(M.regionProgress(forest)) === '5 mapas · ★ 0/15', 'texto de progreso: "5 mapas · ★ 0/15"');
save = { stars: { 0: 3, 1: 2, 10: 1 } }; M.setSave(save);
ok(M.progressText(M.regionProgress(forest)) === '5 mapas · ★ 6/15', 'el progreso suma las estrellas guardadas de la región');
save = { stars: {} }; M.setSave(save);
ok(M.missionUnlocked(0) && !M.missionUnlocked(1) && !M.missionUnlocked(20), 'bloqueos: solo el primer mapa está abierto al empezar');
const others = MISSIONS.filter(m => m.terrain === 'forest' && !m.regional).map(m => m.id);
save = { stars: Object.fromEntries(others.slice(0, 3).map(i => [i, 1])) }; M.setSave(save);
ok(!M.missionUnlocked(20), 'el jefe regional sigue bloqueado con 3 de los 4 mapas superados');
save = { stars: Object.fromEntries(others.map(i => [i, 1])) }; M.setSave(save);
ok(M.missionUnlocked(20), 'el jefe regional se abre al superar los otros 4 mapas de su región');

// ---- geometría de la esfera ----
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
let worst = 0;
for (let i = 0; i < 500; i++) {
  const lon = (rnd() * 2 - 1) * Math.PI, lat = (rnd() * 2 - 1) * Math.PI / 2 * 0.95, yaw = (rnd() * 2 - 1) * Math.PI, pitch = (rnd() * 2 - 1) * M.PITCH_MAX;
  const p = M.projectPoint(lon, lat, yaw, pitch);
  if (p.z <= 0.05) continue; // detrás del planeta: no se puede recuperar desde la pantalla
  const q = M.unprojectNormal(p.x, p.y, p.z, yaw, pitch);
  const dl = Math.abs(((q.lon - lon + Math.PI * 3) % (Math.PI * 2)) - Math.PI), dt = Math.abs(q.lat - lat);
  worst = Math.max(worst, dl * Math.cos(lat), dt);
}
ok(worst < 1e-6, 'proyectar y deshacer la proyección devuelve el mismo punto (error máx ' + worst.toExponential(1) + ')');
const r0 = REGIONS[1], c = M.projectPoint(r0.lon * M.DEG, r0.lat * M.DEG, r0.lon * M.DEG, r0.lat * M.DEG * 0.7);
ok(Math.abs(c.x) < 1e-9 && c.z > 0.9, 'al girar hacia una región, su marcador queda en el centro y de frente');
ok(REGIONS.every(r => M.projectPoint(r.lon * M.DEG, r.lat * M.DEG, r.lon * M.DEG + Math.PI, 0).z < 0), 'con el planeta girado 180° los marcadores quedan detrás (z < 0) y se ocultan');
// la superficie y el marcador giran juntos: mismo ángulo de giro -> mismo desplazamiento del punto y de la región bajo él
const yawA = 0.4, yawB = 1.3, lonP = 2.1, latP = 0.2;
const pa = M.projectPoint(lonP, latP, yawA, 0.1), back = M.unprojectNormal(pa.x, pa.y, pa.z, yawA, 0.1);
ok(Math.abs(back.lon - lonP) < 1e-9 && M.regionAtLonLat(back.lon, back.lat) === M.regionAtLonLat(lonP, latP), 'el punto tocado en pantalla pertenece a la región que dibuja la superficie');
const pb = M.projectPoint(lonP, latP, yawB, 0.1);
ok(Math.abs((pb.x - pa.x)) > 0.01, 'al girar el planeta el punto se desplaza en pantalla');
// regiones sobre la esfera
ok(REGIONS.every((r, i) => M.regionAtLonLat(r.lon * M.DEG, r.lat * M.DEG) === i), 'el centro de cada región cae dentro de ella');
const seen = new Set(); for (let lo = -180; lo < 180; lo += 6) for (let la = -80; la <= 80; la += 8) seen.add(M.regionAtLonLat(lo * M.DEG, la * M.DEG));
ok(seen.size === 5, 'las cinco regiones ocupan la superficie');
ok(M.PITCH_MAX <= 41 * M.DEG && M.PITCH_MAX > 0, 'el giro vertical está limitado');

// ---- accesibilidad y gestos (comprobaciones sobre el código) ----
const src = read('ui_planet.js'), html = read('index.html'), css = read('style.css'), sw = read('sw.js');
ok(/aria-modal/.test(src) && /aria-labelledby/.test(src) && /role', 'radiogroup'/.test(src) && /aria-checked/.test(src), 'el modal es un diálogo con grupo de mapas seleccionables (roles ARIA)');
ok(/e\.key === 'Escape'/.test(src) && /Tab/.test(src) && /o\.focus\(/.test(src), 'Escape cierra el modal, Tab no sale de él y el foco vuelve al marcador');
ok(/ArrowLeft/.test(src) && /ArrowRight/.test(src) && /ArrowUp/.test(src) && /ArrowDown/.test(src) && /aria-label', label/.test(src), 'giro con teclado y botones con etiqueta accesible');
ok(/< 8\) return/.test(src) && /PL\.suppress/.test(src) && /addEventListener\('click'.*true\)/.test(src), 'un arrastre (> 8 px) no se confunde con un toque: el click posterior se descarta');
ok(/touch-action: none/.test(css) && /prefers-reduced-motion/.test(css) && /reducedMotion\(\)/.test(src), 'sin conflicto con gestos táctiles y respeta "reducir movimiento"');
ok(/PITCH_MAX/.test(src) && /clampPitch/.test(src), 'el giro vertical se limita al arrastrar');
ok(/z > 0\.2/.test(src) && /lbl\.off|'off'/.test(src) && /PL\.W - 6/.test(src), 'marcadores traseros ocultos y etiquetas dentro de pantalla sin superponerse');
ok(/ui_planet\.js/.test(html) && /ui_planet\.js/.test(sw), 'el módulo está en index.html y en la caché del service worker');
ok(/openBriefing\(sel\.id\)/.test(src), '"Iniciar mapa" usa el sistema actual de inicio de partidas (briefing)');
console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
