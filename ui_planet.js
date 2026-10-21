// Fase N: pantalla principal de campaña como planeta fantástico girable.
// Cinco regiones (un terreno cada una) sobre una esfera pintada por código; marcadores HTML que giran con ella; modal con los 5 mapas de la región.
// No toca las reglas del combate: "Iniciar mapa" abre el briefing de siempre (openBriefing) con el mapa elegido.
'use strict';

// ---------- Datos: regiones = terrenos ----------
const REGIONS = [
  { id: 'forest', terrain: 'forest', name: 'Bosque Esmeralda', tag: 'Vegetación densa y ríos cristalinos.', lon: 0, lat: 18 },
  { id: 'desert', terrain: 'desert', name: 'Dunas Doradas', tag: 'Desierto infinito con oasis escondidos.', lon: 72, lat: -12 },
  { id: 'snow', terrain: 'snow', name: 'Corona Glacial', tag: 'Nieve eterna y cumbres de hielo.', lon: 144, lat: 30 },
  { id: 'volcanic', terrain: 'volcanic', name: 'Falla de Ceniza', tag: 'Volcanes y ríos de lava.', lon: 216, lat: -22 },
  { id: 'ruins', terrain: 'ruins', name: 'Reino Olvidado', tag: 'Ruinas antiguas y tierras espectrales.', lon: 288, lat: 12 },
];
const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const DEG = Math.PI / 180;
const PITCH_MAX = 40 * DEG;

// Los 5 mapas de una región: los de la campaña en su orden y, al final, el mapa del jefe regional.
function regionMaps(r) {
  const own = MISSIONS.filter(m => m.terrain === r.terrain);
  return own.filter(m => !m.regional).sort((a, b) => a.id - b.id).concat(own.filter(m => m.regional));
}
function regionProgress(r) {
  const maps = regionMaps(r);
  return { maps: maps.length, stars: maps.reduce((s, m) => s + (save.stars[m.id] || 0), 0), max: maps.length * 3, cleared: maps.filter(m => (save.stars[m.id] || 0) > 0).length, open: maps.filter(m => missionUnlocked(m.id)).length };
}
const progressText = p => `${p.maps} mapas · ★ ${p.stars}/${p.max}`;

// ---------- Geometría (puro, sin DOM) ----------
const lonLatToVec = (lon, lat) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
const REGION_VECS = REGIONS.map(r => lonLatToVec(r.lon * DEG, r.lat * DEG));
// Punto del planeta (lon, lat en radianes) -> coordenadas de pantalla normalizadas (x derecha, y arriba, z hacia el observador).
function projectPoint(lon, lat, yaw, pitch) {
  const v = lonLatToVec(lon - yaw, lat), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { x: v[0], y: v[1] * cp - v[2] * sp, z: v[1] * sp + v[2] * cp };
}
// Pantalla (normal de la esfera) -> lon/lat del planeta.
function unprojectNormal(nx, ny, nz, yaw, pitch) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), y2 = ny * cp + nz * sp, z2 = -ny * sp + nz * cp;
  return { lon: Math.atan2(nx, z2) + yaw, lat: Math.asin(Math.max(-1, Math.min(1, y2))) };
}
// Región de un punto de la esfera (con la frontera deformada por ruido para que no sea una línea recta).
function hash3(ix, iy, iz) { let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const a = hash3(ix, iy, iz), b = hash3(ix + 1, iy, iz), c = hash3(ix, iy + 1, iz), d = hash3(ix + 1, iy + 1, iz);
  const e = hash3(ix, iy, iz + 1), f = hash3(ix + 1, iy, iz + 1), g = hash3(ix, iy + 1, iz + 1), h = hash3(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * sx, x2 = c + (d - c) * sx, x3 = e + (f - e) * sx, x4 = g + (h - g) * sx, y1 = x1 + (x2 - x1) * sy, y2 = x3 + (x4 - x3) * sy;
  return y1 + (y2 - y1) * sz;
}
function fbm3(x, y, z, oct) { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += amp * vnoise3(x * f, y * f, z * f); f *= 2.03; amp *= 0.5; } return s; }
// devuelve [índice de región, índice de la segunda, margen entre ambas (0 = justo en la frontera)]
function regionAtVec(x, y, z) {
  const wx = (vnoise3(x * 2.2 + 11, y * 2.2, z * 2.2) - 0.5) * 0.55, wy = (vnoise3(x * 2.2, y * 2.2 + 5, z * 2.2 + 3) - 0.5) * 0.55, wz = (vnoise3(x * 2.2 + 8, y * 2.2 + 2, z * 2.2) - 0.5) * 0.55;
  const qx = x + wx, qy = y + wy, qz = z + wz;
  let b1 = -9, i1 = 0, b2 = -9, i2 = 0;
  for (let i = 0; i < REGION_VECS.length; i++) {
    const v = REGION_VECS[i], d = qx * v[0] + qy * v[1] + qz * v[2];
    if (d > b1) { b2 = b1; i2 = i1; b1 = d; i1 = i; } else if (d > b2) { b2 = d; i2 = i; }
  }
  return [i1, i2, b1 - b2];
}
const regionAtLonLat = (lon, lat) => { const v = lonLatToVec(lon, lat); return regionAtVec(v[0], v[1], v[2])[0]; };

// ---------- Textura del planeta (pintada por código, por trozos para no bloquear la interfaz) ----------
const TEX_W = 768, TEX_H = 384;
let planetTex = null; // { data: Uint32Array, row: filas pintadas, building: bool }
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const BIOME = [
  (x, y, z) => { // bosque: verdes, copas más oscuras, ríos y flores
    const n = fbm3(x * 5, y * 5, z * 5, 3); let c = mixc([34, 104, 50], [96, 172, 72], n);
    const t = vnoise3(x * 34, y * 34, z * 34); if (t > 0.64) c = mixc(c, [22, 78, 38], 0.8);
    const r = Math.abs(fbm3(x * 3.2 + 7, y * 3.2, z * 3.2, 3) - 0.5); if (r < 0.014) c = mixc([70, 166, 220], [150, 214, 240], r < 0.008 ? 0.6 : 0);
    else if (r < 0.021) c = mixc(c, [196, 190, 120], 0.45);
    if (vnoise3(x * 70, y * 70, z * 70) > 0.93) c = [250, 226, 120];
    return c;
  },
  (x, y, z) => { // desierto: dunas onduladas y oasis
    const n = fbm3(x * 3, y * 3, z * 3, 3), band = 0.5 + 0.5 * Math.sin(20 * (x * 0.7 + z * 0.5 + y * 0.3) + 7 * n);
    let c = mixc([208, 146, 62], [240, 196, 108], band * 0.8 + n * 0.3);
    const o = vnoise3(x * 6 + 3, y * 6, z * 6); if (o > 0.76) c = [60, 186, 170]; else if (o > 0.71) c = [92, 168, 72];
    if (vnoise3(x * 55, y * 55, z * 55) > 0.9) c = mixc(c, [150, 96, 44], 0.7);
    return c;
  },
  (x, y, z) => { // nieve y hielo
    const n = fbm3(x * 4, y * 4, z * 4, 3); let c = mixc([176, 214, 240], [240, 249, 255], n * 1.2);
    const r = Math.abs(fbm3(x * 5 + 2, y * 5, z * 5, 3) - 0.5); if (r < 0.009) c = [112, 182, 232];
    if (vnoise3(x * 40, y * 40, z * 40) > 0.84) c = mixc(c, [56, 118, 120], 0.8);
    return c;
  },
  (x, y, z) => { // volcanes: ceniza oscura y ríos de lava
    const n = fbm3(x * 5, y * 5, z * 5, 3); let c = mixc([52, 36, 46], [104, 66, 60], n);
    const r = Math.abs(fbm3(x * 4.4, y * 4.4, z * 4.4, 3) - 0.5);
    if (r < 0.03) c = mixc([255, 92, 30], [255, 200, 70], r < 0.012 ? 0.9 : 0.2);
    else if (r < 0.05) c = mixc(c, [190, 70, 34], 0.55);
    if (vnoise3(x * 6 + 9, y * 6, z * 6) > 0.8) c = [255, 120, 40];
    return c;
  },
  (x, y, z) => { // ruinas: piedra con musgo, bloques y brillos espectrales
    const n = fbm3(x * 5, y * 5, z * 5, 3); let c = mixc([112, 128, 124], [92, 132, 100], n);
    const gx = (x * 14) % 1, gy = (y * 14) % 1, gz = (z * 14) % 1;
    if (Math.min(Math.abs(gx), Math.abs(gy), Math.abs(gz)) < 0.03 && n > 0.5) c = mixc(c, [64, 78, 78], 0.7);
    const w = fbm3(x * 3 + 4, y * 3, z * 3, 3); if (w > 0.62) c = mixc(c, [150, 108, 214], Math.min(1, (w - 0.62) * 8));
    if (vnoise3(x * 50, y * 50, z * 50) > 0.93) c = [110, 232, 210];
    return c;
  },
];
function paintTexel(x, y, z) {
  const [i1, i2, diff] = regionAtVec(x, y, z);
  let c = BIOME[i1](x, y, z);
  if (diff < 0.1) { const t = diff / 0.1, c2 = BIOME[i2](x, y, z); c = mixc(c2, c, 0.5 + 0.5 * t); } // mezcla suave entre regiones
  if (diff < 0.014) c = mixc(c, [255, 214, 120], 0.55 * (1 - diff / 0.014)); // costura dorada entre regiones
  return c;
}
function startPlanetTexture(onProgress) {
  if (planetTex) return planetTex;
  const tex = planetTex = { data: new Uint32Array(TEX_W * TEX_H), row: 0, building: true };
  const sinL = new Float32Array(TEX_W), cosL = new Float32Array(TEX_W);
  for (let u = 0; u < TEX_W; u++) { const lon = (u + 0.5) / TEX_W * Math.PI * 2; sinL[u] = Math.sin(lon); cosL[u] = Math.cos(lon); }
  const step = () => {
    const t0 = performance.now();
    while (tex.row < TEX_H && performance.now() - t0 < 9) {
      const lat = (0.5 - (tex.row + 0.5) / TEX_H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let u = 0; u < TEX_W; u++) { const c = paintTexel(cl * sinL[u], sl, cl * cosL[u]); tex.data[tex.row * TEX_W + u] = 0xff000000 | (Math.max(0, Math.min(255, c[2] | 0)) << 16) | (Math.max(0, Math.min(255, c[1] | 0)) << 8) | Math.max(0, Math.min(255, c[0] | 0)); }
      tex.row++;
    }
    if (onProgress) onProgress(tex.row / TEX_H);
    if (tex.row < TEX_H) requestAnimationFrame(step); else tex.building = false;
  };
  requestAnimationFrame(step);
  return tex;
}

// ---------- Estado del planeta (se conserva al cerrar el modal y al volver a la pantalla) ----------
const PL = { yaw: null, pitch: 0.18, vyaw: 0, vpitch: 0, tw: null, drag: null, suppress: false, raf: 0, dirty: true, el: null, S: 0, D: 0, W: 0, H: 0, px: null, lastFacing: -1, region: null, opener: null };
const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const clampPitch = p => Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));

function facingRegion() { // región más cercana al centro de la vista
  let best = 0, bz = -2;
  REGIONS.forEach((r, i) => { const p = projectPoint(r.lon * DEG, r.lat * DEG, PL.yaw, PL.pitch), s = p.z - 0.15 * Math.hypot(p.x, p.y); if (s > bz) { bz = s; best = i; } });
  return best;
}
function turnTo(r, instant) { // lleva la región al centro (el giro vertical se queda dentro del límite)
  PL.tw = { yaw: r.lon * DEG, pitch: clampPitch(r.lat * DEG * 0.7) };
  if (instant || reducedMotion()) { PL.yaw = PL.tw.yaw; PL.pitch = PL.tw.pitch; PL.tw = null; }
  kick();
}
function nudge(dyaw, dpitch) {
  const base = PL.tw || { yaw: PL.yaw, pitch: PL.pitch };
  PL.tw = { yaw: base.yaw + dyaw, pitch: clampPitch(base.pitch + dpitch) };
  if (reducedMotion()) { PL.yaw = PL.tw.yaw; PL.pitch = PL.tw.pitch; PL.tw = null; }
  PL.vyaw = PL.vpitch = 0; kick();
}
function kick() { PL.dirty = true; if (!PL.raf && PL.el) PL.raf = requestAnimationFrame(planetLoop); }

// ---------- Construcción de la pantalla ----------
function renderHome() {
  const body = $('map-body'); body.innerHTML = ''; body.className = 'pl-on';
  const nextI = nextMissionIndex();
  if (PL.yaw === null) { const r = REGION_BY_ID[MISSIONS[nextI].terrain] || REGIONS[0]; PL.yaw = r.lon * DEG; PL.pitch = clampPitch(r.lat * DEG * 0.7); }
  const stage = el('div', 'pl-stage');
  stage.tabIndex = 0; stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', 'Planeta de la campaña: cinco regiones con cinco mapas cada una. Usa las flechas del teclado para girarlo y Intro para abrir la región del centro.');
  const stars = el('canvas', 'pl-stars'); stars.setAttribute('aria-hidden', 'true');
  const wrap = el('div', 'pl-globewrap'), cv = el('canvas', 'pl-globe'); cv.setAttribute('aria-hidden', 'true'); wrap.appendChild(cv);
  const markers = el('div', 'pl-markers');
  const live = el('div', 'pl-live'); live.setAttribute('aria-live', 'polite');
  const ctrl = el('div', 'pl-ctrl');
  [['◀', 'Girar a la izquierda', -0.35, 0], ['▲', 'Girar hacia arriba', 0, 0.25], ['▼', 'Girar hacia abajo', 0, -0.25], ['▶', 'Girar a la derecha', 0.35, 0]].forEach(([t, label, dy, dp]) => {
    const b = el('button', 'pl-btn', t); b.type = 'button'; b.setAttribute('aria-label', label); b.onclick = () => nudge(dy, dp); ctrl.appendChild(b);
  });
  const hint = el('div', 'pl-hint', 'Arrastra para girar · toca una región');
  const mk = REGIONS.map((r, i) => {
    const p = regionProgress(r), b = el('button', 'pl-marker t-' + r.terrain), locked = p.open === 0;
    b.type = 'button'; b.dataset.i = i;
    b.setAttribute('aria-label', `${r.name}: ${progressText(p)}${locked ? ', bloqueada' : ''}. Abrir región`);
    b.innerHTML = `<span class="pin"><img src="art/cosmetics/arena_${r.terrain}.webp" alt="">${locked ? '<i class="lk">🔒</i>' : ''}</span><span class="lbl"><b>${r.name}</b><small>${progressText(p)}</small></span>`;
    b.onclick = () => openRegion(r.id, b);
    b.onfocus = () => { if (!PL.drag && b.matches(':focus-visible')) turnTo(r); }; // solo con el teclado: con el ratón el planeta no se mueve bajo el dedo
    markers.appendChild(b); return b;
  });
  stage.append(stars, wrap, markers, ctrl, hint, live);
  body.appendChild(stage);
  Object.assign(PL, { el: { stage, stars, wrap, cv, markers, live, hint, mk, lbl: mk.map(b => b.querySelector('.lbl')) }, lastFacing: -1 });
  bindStage(stage);
  layoutPlanet();
  if (!PL.ro && window.ResizeObserver) { PL.ro = new ResizeObserver(() => { if (PL.el && PL.el.stage.isConnected) { layoutPlanet(); kick(); } }); }
  if (PL.ro) { PL.ro.disconnect(); PL.ro.observe(body); }
  startPlanetTexture(() => { PL.dirty = true; kick(); });
  renderMapFooter(nextI);
  kick();
  setTimeout(() => { if (PL.el && PL.el.hint) PL.el.hint.classList.add('fade'); }, 5000);
}

function layoutPlanet() {
  const E = PL.el; if (!E) return;
  const W = E.stage.clientWidth, H = E.stage.clientHeight; if (!W || !H) return;
  const D = Math.floor(Math.min(W * 0.9, H * 0.84)), dpr = Math.min(window.devicePixelRatio || 1, 2), S = Math.max(200, Math.min(400, Math.round(D * dpr)));
  Object.assign(PL, { W, H, D, S });
  const cy = H * 0.47;
  Object.assign(E.wrap.style, { width: D + 'px', height: D + 'px', left: (W / 2 - D / 2) + 'px', top: (cy - D / 2) + 'px' });
  E.cv.width = E.cv.height = S; E.cv.style.width = E.cv.style.height = D + 'px';
  PL.cy = cy;
  // píxeles del disco: normal de la esfera, luz y cobertura del borde (se calcula una vez por tamaño)
  const n = S * S, idx = [], nxs = [], nys = [], nzs = [], shade = [], cov = [];
  const R = S / 2, L = [-0.5, 0.55, 0.67], ll = Math.hypot(...L);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const dx = (px + 0.5 - R) / R, dy = -(py + 0.5 - R) / R, rr = Math.hypot(dx, dy);
    if (rr >= 1.004) continue;
    const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), dot = (dx * L[0] + dy * L[1] + nz * L[2]) / ll;
    idx.push(py * S + px); nxs.push(dx); nys.push(dy); nzs.push(nz);
    shade.push(Math.max(0.42, Math.min(1.18, 0.5 + 0.7 * dot)) * (0.72 + 0.28 * Math.sqrt(nz)));
    cov.push(Math.max(0, Math.min(1, (1 - rr) * R + 0.5)));
  }
  PL.px = { idx: Int32Array.from(idx), nx: Float32Array.from(nxs), ny: Float32Array.from(nys), nz: Float32Array.from(nzs), shade: Float32Array.from(shade), cov: Float32Array.from(cov) };
  PL.img = E.cv.getContext('2d').createImageData(S, S); PL.buf = new Uint32Array(PL.img.data.buffer);
  drawStars(E.stars, W, H);
  PL.lblSize = null; PL.dirty = true;
}
function drawStars(cv, W, H) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let s = 12345; const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < Math.round(W * H / 2600); i++) {
    const x = rnd() * W, y = rnd() * H, r = rnd() < 0.08 ? 1.6 : 0.5 + rnd() * 0.8, hue = rnd() < 0.25 ? '255,224,150' : rnd() < 0.3 ? '170,200,255' : '255,255,255';
    g.fillStyle = `rgba(${hue},${0.35 + rnd() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}

// ---------- Dibujo ----------
function renderGlobe() {
  const E = PL.el, tex = planetTex, P = PL.px; if (!E || !P || !PL.img) return;
  const buf = PL.buf, S = PL.S, cp = Math.cos(PL.pitch), sp = Math.sin(PL.pitch), yaw = PL.yaw;
  buf.fill(0);
  const td = tex ? tex.data : null, rowsDone = tex ? tex.row : 0, TWf = TEX_W / (Math.PI * 2), THf = TEX_H / Math.PI;
  for (let i = 0; i < P.idx.length; i++) {
    const nx = P.nx[i], ny = P.ny[i], nz = P.nz[i];
    const y2 = ny * cp + nz * sp, z2 = -ny * sp + nz * cp;
    let lon = Math.atan2(nx, z2) + yaw; lon -= Math.floor(lon / (Math.PI * 2)) * Math.PI * 2;
    const lat = Math.asin(y2 > 1 ? 1 : y2 < -1 ? -1 : y2);
    let u = (lon * TWf) | 0, v = ((Math.PI / 2 - lat) * THf) | 0; if (u >= TEX_W) u = TEX_W - 1; if (v >= TEX_H) v = TEX_H - 1;
    let c = (td && v < rowsDone) ? td[v * TEX_W + u] : 0xff3a2a1c;
    const sh = P.shade[i];
    let r = (c & 255) * sh, g = ((c >> 8) & 255) * sh, b = ((c >> 16) & 255) * sh;
    r = r > 255 ? 255 : r; g = g > 255 ? 255 : g; b = b > 255 ? 255 : b;
    buf[P.idx[i]] = (((P.cov[i] * 255) | 0) << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
  }
  E.cv.getContext('2d').putImageData(PL.img, 0, 0);
}
function placeMarkers() {
  const E = PL.el; if (!E || !PL.D) return;
  const Rr = PL.D / 2, cx = PL.W / 2, cy = PL.cy, placed = [];
  if (!PL.lblSize) PL.lblSize = E.lbl.map(l => { l.style.left = '0'; return { w: l.offsetWidth, h: l.offsetHeight }; });
  const items = REGIONS.map((r, i) => { const p = projectPoint(r.lon * DEG, r.lat * DEG, PL.yaw, PL.pitch); return { i, p, x: cx + p.x * Rr * 0.97, y: cy - p.y * Rr * 0.97 }; });
  items.sort((a, b) => b.p.z - a.p.z);
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  for (const it of items) {
    const b = E.mk[it.i], l = E.lbl[it.i], z = it.p.z, vis = z > 0.2, sc = 0.78 + 0.3 * Math.min(1, z);
    b.style.transform = `translate(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    b.style.opacity = vis ? Math.min(1, (z - 0.2) / 0.22).toFixed(2) : '0';
    b.style.pointerEvents = vis ? 'auto' : 'none'; b.style.zIndex = String(Math.round(z * 100) + 10);
    b.classList.toggle('back', !vis);
    if (!vis) { l.classList.add('off'); continue; }
    const pin = { x0: it.x - 24 * sc, x1: it.x + 24 * sc, y0: it.y - 24 * sc, y1: it.y + 24 * sc };
    const sz = PL.lblSize[it.i], lw = sz.w * sc, lh = sz.h * sc;
    let ok = false;
    for (const below of [true, false]) {
      let x0 = it.x - lw / 2; x0 = Math.max(6, Math.min(PL.W - 6 - lw, x0)); // la etiqueta nunca sale de la pantalla
      const y0 = below ? it.y + 26 * sc : it.y - 26 * sc - lh, rect = { x0, x1: x0 + lw, y0, y1: y0 + lh };
      if (rect.y0 < 4 || rect.y1 > PL.H - 4) continue;
      if (placed.some(p => hit(rect, p))) continue;
      placed.push(rect); ok = true;
      l.style.left = ((x0 - it.x) / sc) + 'px'; l.style.transform = 'none'; l.style.top = below ? '26px' : (-26 - sz.h) + 'px';
      break;
    }
    l.classList.toggle('off', !ok); placed.push(pin);
  }
}
function planetLoop(now) {
  PL.raf = 0;
  if (!PL.el || !PL.el.stage.isConnected) return;
  const dt = Math.min(0.05, PL.last ? (now - PL.last) / 1000 : 0.016); PL.last = now;
  let moving = false;
  if (PL.drag && PL.drag.on) moving = true;
  else {
    if (PL.tw) { // giro dirigido (teclado, botones, foco): se acerca suavemente al destino
      const dy = angDiff(PL.tw.yaw, PL.yaw), dp = PL.tw.pitch - PL.pitch, k = 1 - Math.pow(0.0008, dt);
      PL.yaw += dy * k; PL.pitch += dp * k;
      if (Math.abs(dy) < 0.0015 && Math.abs(dp) < 0.0015) { PL.yaw = PL.tw.yaw; PL.pitch = PL.tw.pitch; PL.tw = null; } else moving = true;
    } else if (Math.abs(PL.vyaw) > 0.01 || Math.abs(PL.vpitch) > 0.01) { // inercia tras soltar
      PL.yaw += PL.vyaw * dt; PL.pitch = clampPitch(PL.pitch + PL.vpitch * dt);
      const f = Math.pow(0.04, dt); PL.vyaw *= f; PL.vpitch *= f; moving = true;
    }
  }
  if (moving || PL.dirty) { PL.dirty = false; renderGlobe(); placeMarkers(); }
  const fr = facingRegion();
  if (!moving && fr !== PL.lastFacing) { PL.lastFacing = fr; PL.el.live.textContent = REGIONS[fr].name; }
  if (moving) { PL.raf = requestAnimationFrame(planetLoop); } else PL.last = 0;
}

// ---------- Gestos y teclado ----------
function bindStage(stage) {
  const R = () => PL.D / 2 || 150;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button > 0) return;
    if (e.target.closest && e.target.closest('.pl-ctrl')) return;
    PL.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), on: false, vx: 0, vy: 0 };
    PL.tw = null; PL.vyaw = PL.vpitch = 0;
    const move = ev => {
      const d = PL.drag; if (!d || ev.pointerId !== d.id) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y, now = performance.now(), dt = Math.max(1, now - d.t) / 1000;
      if (!d.on) { if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 8) return; d.on = true; stage.classList.add('drag'); } // por debajo de 8 px sigue siendo un toque
      PL.yaw -= dx / R(); PL.pitch = clampPitch(PL.pitch + dy / R());
      d.vx = d.vx * 0.6 + (-dx / R() / dt) * 0.4; d.vy = d.vy * 0.6 + (dy / R() / dt) * 0.4;
      d.x = ev.clientX; d.y = ev.clientY; d.t = now; PL.dirty = true; kick();
    };
    const up = ev => {
      const d = PL.drag; if (!d || ev.pointerId !== d.id) return;
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      stage.classList.remove('drag'); PL.drag = null;
      if (d.on) {
        PL.suppress = true; setTimeout(() => { PL.suppress = false; }, 60); // el "click" que sigue a un arrastre no debe abrir nada
        if (!reducedMotion() && performance.now() - d.t < 90) { PL.vyaw = Math.max(-4, Math.min(4, d.vx)); PL.vpitch = Math.max(-3, Math.min(3, d.vy)); }
        kick();
      } else if (ev.type === 'pointerup' && !(ev.target.closest && ev.target.closest('.pl-marker'))) tapSurface(ev, stage);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
  stage.addEventListener('click', e => { if (PL.suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
  stage.addEventListener('keydown', e => {
    if (e.target !== stage) return;
    const k = e.key;
    if (k === 'ArrowLeft') nudge(-0.3, 0); else if (k === 'ArrowRight') nudge(0.3, 0); else if (k === 'ArrowUp') nudge(0, 0.2); else if (k === 'ArrowDown') nudge(0, -0.2);
    else if (k === 'Enter' || k === ' ') { openRegion(REGIONS[facingRegion()].id, stage); }
    else return;
    e.preventDefault();
  });
}
function tapSurface(ev, stage) { // toque sobre la superficie: abre la región que hay bajo el dedo
  const rect = PL.el.wrap.getBoundingClientRect(), R = rect.width / 2;
  const dx = (ev.clientX - rect.left - R) / R, dy = -(ev.clientY - rect.top - R) / R, rr = dx * dx + dy * dy;
  if (rr >= 1) return;
  const nz = Math.sqrt(1 - rr), ll = unprojectNormal(dx, dy, nz, PL.yaw, PL.pitch);
  openRegion(REGIONS[regionAtLonLat(ll.lon, ll.lat)].id, stage);
}

// ---------- Modal de la región ----------
function regionModal() {
  let m = document.getElementById('region-modal');
  if (m) return m;
  m = el('div', 'modal rg-modal'); m.id = 'region-modal'; m.hidden = true;
  m.innerHTML = '<div class="panel wide rg-panel" role="dialog" aria-modal="true" aria-labelledby="rg-title" tabindex="-1"></div>';
  m.addEventListener('pointerdown', e => { if (e.target === m) closeRegion(); });
  document.body.appendChild(m);
  document.addEventListener('keydown', e => {
    if (m.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeRegion(); return; }
    if (e.key === 'Tab') { // el foco se queda dentro del modal
      const f = [...m.querySelectorAll('button:not([disabled]), [role="radio"]:not([aria-disabled="true"])')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !m.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !m.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });
  return m;
}
function lockReason(m) {
  if (m.regional) return 'Supera los otros 4 mapas de la región';
  const prev = MISSIONS[m.id - 1]; return prev ? `Supera «${prev.name}»` : 'Bloqueado';
}
function mapThumb(m, r) {
  const d = el('span', 'rg-thumb t-' + m.terrain);
  d.innerHTML = `<img src="art/cosmetics/arena_${r.terrain}.webp" alt="">`;
  const boss = m.boss ? BOSS[m.boss.id] : m.hunt ? BOSS[m.hunt.id] : null;
  if (boss) d.appendChild(makeIcon(boss, 40)).classList.add('rg-boss');
  d.append(el('i', 'rg-goal', GOALS[m.goal].icon));
  return d;
}
function openRegion(rid, opener) {
  const r = REGION_BY_ID[rid], maps = regionMaps(r), p = regionProgress(r), modal = regionModal(), panel = modal.firstElementChild;
  PL.region = rid; PL.opener = opener || null;
  const nextI = nextMissionIndex();
  let sel = maps.find(m => m.id === nextI && missionUnlocked(m.id)) || maps.find(m => missionUnlocked(m.id) && !(save.stars[m.id] > 0)) || [...maps].reverse().find(m => missionUnlocked(m.id)) || maps[0];
  panel.innerHTML = '';
  const head = el('div', 'rg-head t-' + r.terrain);
  head.innerHTML = `<img class="rg-art" src="art/cosmetics/arena_${r.terrain}.webp" alt=""><div><h2 id="rg-title">${r.name}</h2><small>${r.tag}</small><div class="rg-prog">${progressText(p)}</div></div>`;
  const list = el('div', 'rg-list'); list.setAttribute('role', 'radiogroup'); list.setAttribute('aria-label', 'Mapas de ' + r.name);
  const start = el('button', 'primary', 'Iniciar mapa'), close = el('button', 'ghost', 'Cerrar');
  const cards = maps.map((m, k) => {
    const ok = missionUnlocked(m.id), st = save.stars[m.id] || 0, boss = m.boss ? BOSS[m.boss.id] : m.hunt ? BOSS[m.hunt.id] : null;
    const b = el('button', 'rg-map' + (m.regional ? ' regional' : '') + (ok ? '' : ' locked')); b.type = 'button';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); if (!ok) b.setAttribute('aria-disabled', 'true');
    b.append(mapThumb(m, r));
    const info = el('span', 'rg-info');
    info.innerHTML = `<b>${k + 1}. ${m.name}</b><small class="goal">${GOALS[m.goal].icon} ${GOALS[m.goal].name}${m.regional ? ' · Jefe regional' : ''}</small>` +
      `<small>${m.desc}</small>` + (boss ? `<small class="boss">${m.hunt ? 'Campeón' : 'Jefe'}: ${boss.name}</small>` : '');
    const right = el('span', 'rg-st'); right.innerHTML = ok ? starsHtml(st) : `<span class="lk">🔒</span><small>${lockReason(m)}</small>`;
    b.append(info, right);
    b.onclick = () => { if (!ok) { toast('🔒 ' + lockReason(m)); return; } choose(m); };
    b.onkeydown = e => { // flechas: mover la selección entre mapas
      const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
      e.preventDefault(); const n = cards[(k + dir + cards.length) % cards.length]; n.focus(); if (!n.classList.contains('locked')) n.click();
    };
    list.appendChild(b); return b;
  });
  function choose(m) {
    sel = m; cards.forEach((c, i) => { const on = maps[i] === m; c.classList.toggle('sel', on); c.setAttribute('aria-checked', on ? 'true' : 'false'); c.tabIndex = on ? 0 : -1; });
    start.disabled = !missionUnlocked(m.id); start.textContent = `Iniciar mapa ${maps.indexOf(m) + 1}`;
  }
  start.onclick = () => { if (!sel || !missionUnlocked(sel.id)) return; closeRegion(true); openBriefing(sel.id); };
  close.onclick = () => closeRegion();
  const row = el('div', 'row center rg-actions'); row.append(start, close);
  panel.append(head, list, row);
  choose(sel);
  modal.hidden = false;
  const first = cards.find(c => c.classList.contains('sel')) || cards[0]; first.focus({ preventScroll: false });
  first.scrollIntoView({ block: 'nearest' });
}
function closeRegion(noFocus) {
  const m = document.getElementById('region-modal'); if (!m || m.hidden) return;
  m.hidden = true;
  const o = PL.opener; PL.opener = null;
  if (!noFocus && o && o.isConnected) o.focus({ preventScroll: true }); // el planeta conserva su orientación; el foco vuelve a donde estaba
}
