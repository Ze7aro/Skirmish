// Dibujo del campo de batalla 2.5D con los assets de KOTA (con respaldo de formas si falta algo).
'use strict';

const $ = id => document.getElementById(id);
const ART = window.KOTA_ART || { units: {}, props: {}, vfx: {}, leaders: {}, bg: {} };
const canvas = $('c'), ctx = canvas.getContext('2d');
const mouse = { x: 0, y: 0, down: false };
const view = { k: 1 };

// ---------- Carga de imágenes ----------
const IMG = {};
function img(src) {
  if (!src) return null;
  if (!IMG[src]) { const i = new Image(); i.src = src; IMG[src] = i; }
  return IMG[src];
}
const loaded = i => !!i && i.complete && i.naturalWidth > 0;

function preloadAll(onProgress) {
  const srcs = [ART.propsSheet, ART.vfxSheet, ART.vfx2Sheet, ART.logo, ART.worldMap];
  Object.values(ART.bg || {}).forEach(b => srcs.push(b.src));
  Object.values(ART.leaders || {}).forEach(s => srcs.push(s));
  Object.values(ART.units || {}).forEach(u => srcs.push(u.sheet));
  Object.values(ART.structures || {}).forEach(p => srcs.push(p.sheet));
  Object.keys(ART.cos || {}).filter(k => k.startsWith('emote_')).forEach(k => srcs.push(ART.cos[k].file));
  const list = [...new Set(srcs.filter(Boolean))];
  let done = 0;
  return Promise.all(list.map(s => new Promise(res => {
    const i = img(s), fin = () => { done++; onProgress && onProgress(done / list.length); res(); };
    if (i.complete) fin(); else { i.onload = fin; i.onerror = fin; }
  })));
}

// ---------- Canvas ----------
function resizeCanvas() {
  const stage = $('stage');
  if (!stage) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  const s = Math.min(w / W, h / H), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.style.width = Math.floor(W * s) + 'px'; canvas.style.height = Math.floor(H * s) + 'px';
  canvas.width = Math.round(W * s * dpr); canvas.height = Math.round(H * s * dpr);
  view.k = canvas.width / W;
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));

// ---------- Sprites ----------
function spriteFrame(setId, anim, t, progress) {
  const m = ART.units[setId], sheet = m && img(m.sheet);
  if (!m || !loaded(sheet)) return null;
  let a = m.anims[anim];
  if (!a) a = m.anims.walk || m.anims.idle;
  if (!a) return null;
  let idx;
  if (anim === 'attack' && progress !== undefined) idx = Math.min(a.n - 1, Math.floor(progress * a.n));
  else if (anim === 'death') idx = Math.min(a.n - 1, Math.floor(t * 9));
  else if (anim === 'walk') idx = Math.floor(t * 9) % a.n;
  else if (anim === 'idle') idx = Math.floor(t * 4) % a.n;
  else idx = 0;
  return { sheet, sx: idx * m.cw, sy: a.row * m.ch, cw: m.cw, ch: m.ch, bh: m.bh || m.ch, bw: m.bw || m.cw }; // bh/bw: tamaño del personaje dentro de la celda (la celda puede tener margen)
}

// Dibuja un fotograma con los pies en (x, feetY). El arte de KOTA mira a la izquierda.
function blit(f, x, feetY, displayH, flip, alpha) {
  const sc = displayH / (f.bh || f.ch), dw = f.cw * sc, dh = f.ch * sc;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.translate(x, 0);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.sheet, f.sx, f.sy, f.cw, f.ch, -dw / 2, feetY - dh, dw, dh);
  ctx.restore();
  return dw;
}

function shadow(x, y, rx, ry, a) {
  ctx.fillStyle = `rgba(0,0,0,${a || 0.3})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
}

function bar(x, y, w, pct, side) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = side === 0 ? '#5ac85a' : '#e05a5a';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, pct)), 4);
}

function propDraw(name, x, bottomY, k, alpha) {
  const p = (ART.structures || {})[name] || ART.props[name], sheet = img(p && p.sheet || ART.propsSheet);
  if (!p || !loaded(sheet)) return null;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  k *= p.k0 || 1; // las estructuras de design_complete están a doble resolución (k0 = 0,5)
  ctx.drawImage(sheet, p.x, p.y, p.w, p.h, x - p.w * k / 2, bottomY - p.h * k, p.w * k, p.h * k);
  ctx.restore();
  return p;
}

// Los VFX viven en dos hojas: `vfx` (antigua, celda 96) y `vfx2` (design_complete, celda 160).
function vfxSrc(name) {
  const v2 = ART.vfx2 && ART.vfx2[name];
  if (v2) return { v: v2, sheet: img(ART.vfx2Sheet), cell: ART.vfx2Cell };
  return { v: ART.vfx[name], sheet: img(ART.vfxSheet), cell: ART.vfxCell };
}
function vfxDraw(name, x, y, size, life0, life) {
  const { v, sheet, cell } = vfxSrc(name);
  if (!v || !loaded(sheet)) return false;
  const p = Math.max(0, Math.min(0.999, 1 - life / life0)), idx = Math.floor(p * v.n);
  ctx.drawImage(sheet, idx * cell, v.row * cell, cell, cell, x - size / 2, y - size / 2, size, size);
  return true;
}

function vfxLoop(name, x, y, size, t, fps) {
  const { v, sheet, cell } = vfxSrc(name);
  if (!v || !loaded(sheet)) return false;
  const idx = Math.floor(t * (fps || 12)) % v.n;
  ctx.drawImage(sheet, idx * cell, v.row * cell, cell, cell, x - size / 2, y - size / 2, size, size);
  return true;
}

// ---------- Enano minero (marcador dibujado por código hasta que haya arte) ----------
function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
function drawDwarf(g, x, feetY, h, flip, t, working, moving) {
  const s = h / 64;
  g.save(); g.translate(x, feetY); g.scale(flip ? -s : s, s); // diseñado mirando a la izquierda, como el resto del arte
  g.translate(0, -(moving ? Math.abs(Math.sin(t * 10)) * 2 : 0));
  g.fillStyle = '#4a2f18'; g.fillRect(-9, -14, 7, 14); g.fillRect(2, -14, 7, 14);           // piernas
  g.fillStyle = '#2a1a0c'; g.fillRect(-10, -3, 9, 3); g.fillRect(1, -3, 9, 3);              // botas
  g.fillStyle = '#8a5a2a'; rrect(g, -13, -36, 26, 24, 7);                                   // torso
  g.fillStyle = '#3a2410'; g.fillRect(-13, -20, 26, 4); g.fillStyle = '#e0b040'; g.fillRect(-3, -21, 6, 6); // cinturón
  g.fillStyle = '#c8661e'; g.beginPath(); g.moveTo(-12, -40); g.quadraticCurveTo(-14, -16, 0, -13); g.quadraticCurveTo(14, -16, 12, -40); g.closePath(); g.fill(); // barba
  g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(0, -44, 10, 0, 7); g.fill();               // cabeza
  g.fillStyle = '#c8661e'; g.beginPath(); g.ellipse(0, -39, 9, 6, 0, 0, Math.PI); g.fill(); // barba sobre la cara
  g.fillStyle = '#e0a078'; g.beginPath(); g.arc(-1, -44, 2.4, 0, 7); g.fill();               // nariz
  g.fillStyle = '#222'; g.fillRect(-6, -48, 3, 3); g.fillRect(2, -48, 3, 3);                // ojos
  g.fillStyle = '#7a8090'; g.beginPath(); g.arc(0, -48, 11, Math.PI, 0); g.fill(); g.fillRect(-12, -49, 24, 3); // casco
  g.fillStyle = '#ffd860'; g.beginPath(); g.arc(-8, -52, 3, 0, 7); g.fill();               // lámpara
  g.save(); g.translate(-12, -28); g.rotate(working ? -0.9 + Math.sin(t * 9) * 0.9 : -0.5 + (moving ? Math.sin(t * 10) * 0.15 : 0)); // pico
  g.strokeStyle = '#6a4420'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, -22); g.stroke();
  g.strokeStyle = '#aab0c0'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-12, -24); g.quadraticCurveTo(-4, -30, 6, -22); g.stroke();
  g.restore(); g.restore();
}

// ---------- Carreta de la escolta (dibujada por código; mira a la izquierda como el resto) ----------
function drawCart(g, x, feetY, h, flip, t, moving) {
  const s = h / 52;
  g.save(); g.translate(x, feetY); g.scale(flip ? -s : s, s);
  const wob = moving ? Math.sin(t * 9) * 0.8 : 0;
  g.translate(0, wob);
  g.fillStyle = '#6a4420'; rrect(g, -24, -30, 48, 18, 4);                      // caja
  g.fillStyle = '#8a5a2a'; g.fillRect(-22, -28, 44, 5); g.fillRect(-22, -20, 44, 5); // tablones
  g.fillStyle = '#e8dcb8'; g.beginPath(); g.moveTo(-20, -30); g.quadraticCurveTo(0, -52, 20, -30); g.closePath(); g.fill(); // toldo
  g.strokeStyle = '#b8a878'; g.lineWidth = 1.5; for (const k of [-10, 0, 10]) { g.beginPath(); g.moveTo(k, -31); g.lineTo(k * 0.7, -44); g.stroke(); }
  g.strokeStyle = '#4a2f18'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(24, -22); g.lineTo(36, -26); g.stroke(); // lanza de tiro
  g.fillStyle = '#2F5FD0'; g.beginPath(); g.moveTo(-24, -30); g.lineTo(-24, -46); g.lineTo(-12, -42); g.lineTo(-24, -38); g.closePath(); g.fill(); // bandera
  for (const wx of [-14, 14]) {                                                   // ruedas que giran
    g.save(); g.translate(wx, -8); g.rotate(moving ? t * 6 : 0);
    g.fillStyle = '#3a2410'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
    g.strokeStyle = '#c8a060'; g.lineWidth = 1.6; for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(-8 * Math.cos(a), -8 * Math.sin(a)); g.lineTo(8 * Math.cos(a), 8 * Math.sin(a)); g.stroke(); }
    g.restore();
  }
  g.restore();
}

// ---------- Elementos del mapa ----------
const S = name => (ART.structures || {})[name]; // ¿existe esta pieza de design_complete?
function drawPoint(p, t) { // punto de captura: aro que se llena según el progreso y bandera que cambia de color
  ctx.save(); ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, 0, 7); ctx.stroke();
  if (p.prog > 0) { ctx.strokeStyle = p.owner === 0 ? '#6fa0ff' : '#ffe08a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, -Math.PI / 2, -Math.PI / 2 + p.prog * Math.PI * 2); ctx.stroke(); }
  if (p.owner === 0) { ctx.fillStyle = 'rgba(80,150,255,0.16)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  const mine = state.units.some(u => u.side === 0 && u.hp > 0 && dist(u, p) < p.r), foe = state.units.some(u => u.side === 1 && u.hp > 0 && dist(u, p) < p.r);
  const nm = p.owner === 0 ? 'capture_player' : (mine && foe) ? 'capture_contested' : 'capture_neutral'; // neutral, tuyo o disputado
  if (S(nm)) { propDraw(nm, p.x, p.y + 28, 1); return; }
  propDraw('capture_stone', p.x, p.y + 22, 0.5);
  propDraw(p.owner === 0 ? 'banner_blue' : 'banner_neutral', p.x, p.y + 16, 0.6);
}
function drawChest(c, t) { // cofre del mapa: cerrado (brilla), bloqueado por un campamento (candado) o abierto (se apaga)
  if (S('chest_open')) { // cofres de design_complete: cerrado, bloqueado, abriéndose (0,7 s) y abierto
    if (c.opened) { ctx.save(); ctx.globalAlpha = Math.max(0.35, 1 - c.t / 4); propDraw(c.t < 0.7 ? 'chest_opening' : 'chest_open', c.x, c.y + 18, 1); ctx.restore(); return; }
    if (!c.locked) { ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 4); ctx.beginPath(); ctx.ellipse(c.x, c.y + 16, 28, 11, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    propDraw(c.locked ? 'chest_locked' : 'chest', c.x, c.y + 18, 1); return;
  }
  if (c.opened) { ctx.save(); ctx.globalAlpha = Math.max(0.25, 1 - c.t / 3); propDraw('chest', c.x, c.y + 14, 0.45); ctx.restore(); return; }
  if (!c.locked) { ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 4); ctx.beginPath(); ctx.ellipse(c.x, c.y + 16, 26, 10, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.save(); if (c.locked) ctx.globalAlpha = 0.6; propDraw('chest', c.x, c.y + 16, 0.5); ctx.restore();
  if (c.locked) { ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🔒', c.x, c.y - 16); }
}
// Interruptor: palanca sobre una base de piedra; el aro se llena mientras una tropa tuya está cerca. Apagado = ya usado.
function drawSwitch(sw, t) {
  const T = SWITCH_TYPES[sw.type];
  ctx.save();
  shadow(sw.x, sw.y + 14, 20, 8, 0.3);
  ctx.fillStyle = sw.used ? '#3a3a44' : '#6b6f7e'; ctx.beginPath(); ctx.ellipse(sw.x, sw.y + 10, 17, 8, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = sw.used ? '#555' : '#ffd860'; ctx.lineWidth = 2; ctx.stroke();
  const tilt = sw.used ? 0.7 : -0.7 + 0.4 * sw.prog;                       // la palanca se inclina al accionarla
  ctx.strokeStyle = sw.used ? '#888' : '#c8a060'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sw.x, sw.y + 8); ctx.lineTo(sw.x + Math.sin(tilt) * 20, sw.y + 8 - Math.cos(tilt) * 20); ctx.stroke();
  ctx.fillStyle = sw.used ? '#777' : '#ff5a4a'; ctx.beginPath(); ctx.arc(sw.x + Math.sin(tilt) * 20, sw.y + 8 - Math.cos(tilt) * 20, 4.5, 0, 7); ctx.fill();
  if (sw.used && T.cd) { // reutilizable: arco de enfriamiento y segundos que faltan
    const k = Math.min(1, sw.t / T.cd); ctx.strokeStyle = '#8fb0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sw.x, sw.y + 10, 22, 11, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#cfe0ff'; ctx.fillText(Math.ceil(T.cd - sw.t) + ' s', sw.x, sw.y - 18);
  }
  if (!sw.used) {
    ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 3; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4);
    ctx.beginPath(); ctx.ellipse(sw.x, sw.y + 10, SWITCH_R * 0.9, SWITCH_R * 0.45, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    if (sw.prog > 0) { ctx.strokeStyle = '#8fe08f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sw.x, sw.y + 10, 24, 12, 0, -Math.PI / 2, -Math.PI / 2 + sw.prog * Math.PI * 2); ctx.stroke(); }
    ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(T.icon, sw.x, sw.y - 24);
    if (T.cost) { ctx.font = 'bold 10px system-ui, sans-serif'; ctx.fillStyle = sw.wait ? '#ff8a7a' : '#ffd860'; ctx.fillText(sw.wait ? 'sin energía' : '−' + T.cost + '⚡', sw.x, sw.y + 30); }
  }
  ctx.restore();
}
// Matorral: mancha de hojas semitransparente sobre el carril; las tropas dentro se ven tenues para el que mira desde fuera.
function drawBrush(z, t) {
  ctx.save();
  const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
  g.addColorStop(0, 'rgba(70,170,70,0.38)'); g.addColorStop(1, 'rgba(40,120,50,0.12)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * 1.1, z.r * 0.75, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,230,120,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.8;
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; ctx.fillText('🌿', z.x + Math.cos(a) * z.r * 0.7, z.y + Math.sin(a) * z.r * 0.45 + 5 + Math.sin(t * 2 + i) * 1.5); }
  ctx.restore();
}
function drawUnit(u, t) {
  const c = u.card, persp = 0.88 + 0.24 * (u.y / H), dispH = c.h * persp;
  const lift = c.flying ? 16 : 0, feetY = u.y + c.r * 0.55;
  shadow(u.x, feetY, c.r * 1.05 * persp, c.r * 0.42 * persp, 0.3);
  const ringCol = u.side === 0 ? '#6fa0ff' : (u.camp ? '#e0c050' : '#ff7070');
  ctx.strokeStyle = ringCol; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.ellipse(u.x, feetY, c.r * 1.15 * persp, c.r * 0.46 * persp, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;

  const phase = t + u.id * 0.37;
  const anim = u.stun > 0 ? 'idle' : u.atkT > 0 ? 'attack' : (u.hitT > 0 && ART.units[c.art] && ART.units[c.art].anims.hit) ? 'hit' : u.moving ? 'walk' : 'idle';
  const f = c.art && spriteFrame(c.art, anim, phase, 1 - Math.max(0, u.atkT) / 0.45);
  let stealthA = c.stealth && u.reveal <= 0 ? (u.side === 0 ? 0.5 : 0.35) : 1;
  if (brushOf(u)) stealthA *= u.side === 0 ? 0.75 : (state.units.some(e => e.side === 0 && !hiddenInBrush(u, e)) ? 0.85 : 0.3); // el enemigo oculto casi no se ve
  let top = feetY - lift - dispH;
  if (f) {
    blit(f, u.x, feetY - lift + (anim === 'idle' && c.flying ? Math.sin(phase * 3) * 2 : 0), dispH, u.face > 0, stealthA);
  } else if (c.proc === 'dwarf') {
    drawDwarf(ctx, u.x, feetY, dispH, u.face > 0, phase, u.mining, u.moving);
  } else if (c.proc === 'cart') {
    const damage = u.hp / u.max;
    const name = damage <= 0.25 ? 'escort_cart_smoking' : damage <= 0.65 ? 'escort_cart_dented' : 'escort_cart';
    ctx.save(); ctx.translate(u.x, 0); if (u.face < 0) ctx.scale(-1, 1);
    const drawn = propDraw(name, 0, feetY + (u.moving ? Math.sin(phase * 9) * 0.5 : 0), dispH / 192);
    ctx.restore();
    if (!drawn) drawCart(ctx, u.x, feetY, dispH, u.face > 0, phase, u.moving);
  } else { // respaldo si falta el sprite
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(u.x, u.y - lift, c.r, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = ringCol; ctx.stroke();
    top = u.y - lift - c.r;
  }
  if (u.hitT > 0.1) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(u.x, feetY - lift - dispH / 2, c.r * 0.9, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (u.stun > 0) vfxLoop('stun', u.x, top + 4, 46, t, 14);
  if (u.slow > 0) vfxLoop('slow', u.x, feetY - 4, 48, t, 12);
  if (u.haste > 0) { ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(u.x, feetY, c.r * 1.5, c.r * 0.6, 0, 0, 7); ctx.stroke(); }
  if (u.ward > 0) { ctx.strokeStyle = '#b0b8c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(u.x, feetY, c.r * 1.7, c.r * 0.7, 0, 0, 7); ctx.stroke(); }
  if (u.immune > 0) { ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); ctx.beginPath(); ctx.ellipse(u.x, feetY - dispH * 0.4, c.r * 1.6, dispH * 0.55, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  // Iconos de estado sobre la cabeza: silencio (círculo morado tachado) y desgarro (escudo rojo roto).
  let ix = u.x - ((u.silence > 0) + (u.sunder > 0) - 1) * 7;
  if (u.silence > 0) { ctx.fillStyle = '#7a4ac8'; ctx.beginPath(); ctx.arc(ix, top - 4, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ix - 3.5, top - 7.5); ctx.lineTo(ix + 3.5, top - 0.5); ctx.stroke(); ix += 14; }
  if (u.sunder > 0) { ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.moveTo(ix - 5, top - 9); ctx.lineTo(ix + 5, top - 9); ctx.lineTo(ix + 4, top - 1); ctx.lineTo(ix, top + 2); ctx.lineTo(ix - 4, top - 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ix - 1, top - 9); ctx.lineTo(ix + 1, top - 5); ctx.lineTo(ix - 1, top - 2); ctx.stroke(); }
  if (u.champion) { // campeón de la cacería: aura roja y rótulo
    ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 5); ctx.beginPath(); ctx.ellipse(u.x, feetY, c.r * 2, c.r * 0.9, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff9a8a'; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★ CAMPEÓN ★', u.x, top - 16);
  }
  if (u.asleep) { ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('z', u.x + 8, top + 2); }
  else if (u.hp < u.max || c.boss || c.cart || (c.ability && u.side === 0 && u.abCd > 0)) {
    const bw = Math.max(24, c.r * 2.4); bar(u.x, top - 7, bw, u.hp / u.max, u.side === 0 ? 0 : 1);
    if (c.ability && u.side === 0 && u.abCd > 0 && !u.asleep) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(u.x - bw / 2, top - 1, bw, 3); ctx.fillStyle = '#7fb0ff'; ctx.fillRect(u.x - bw / 2, top - 1, bw * (1 - Math.min(1, u.abCd / c.ability.cd)), 3); } // calentamiento / recarga de la habilidad
    if (c.boss) { // marcas de fase al 66% y al 33% y número de fase actual
      ctx.fillStyle = '#fff'; for (const p of BOSS_PHASES) ctx.fillRect(u.x - bw / 2 + bw * p - 0.5, top - 8, 1.5, 6);
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd860'; ctx.fillText('F' + ((u.phase || 0) + 1), u.x + bw / 2 + 9, top - 2);
    }
  }
}

function drawCorpse(k) {
  const c = k.card, persp = 0.88 + 0.24 * (k.y / H), dispH = c.h * persp, feetY = k.y + c.r * 0.55 - (c.flying ? 16 * Math.max(0, 1 - k.t * 2.2) : 0);
  const alpha = k.t > 1.1 ? Math.max(0, 1 - (k.t - 1.1) / 0.5) : 1;
  shadow(k.x, k.y + c.r * 0.55, c.r * persp, c.r * 0.4 * persp, 0.25 * alpha);
  const f = c.art && spriteFrame(c.art, 'death', k.t);
  if (f) blit(f, k.x, feetY, dispH, k.face > 0, alpha);
  else if (c.proc === 'cart') {
    ctx.save(); ctx.translate(k.x, 0); if (k.face < 0) ctx.scale(-1, 1);
    propDraw('escort_cart_broken', 0, feetY, dispH / 192, alpha); ctx.restore();
  }
}

// Nido enemigo: montículo oscuro con un huevo y su barra de vida; crea una criatura cada pocos segundos.
function drawNest(b, t) {
  shadow(b.x, b.y + 16, 24, 9, 0.35);
  ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 22, 11, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🥚', b.x, b.y + 6 + Math.sin(t * 3 + b.x) * 1.2);
  const k = Math.max(0, 1 - b.spawnT / NEST_EVERY); ctx.strokeStyle = '#b0e060'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y - 10, 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); // se llena hasta la próxima cría
  bar(b.x, b.y - 30, 40, b.hp / b.max, 1);
}
// Fuente: aro azul que late cada vez que cura.
function drawSpring(sp, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(80,170,255,0.14)'; ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 8, sp.r, sp.r * 0.62, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(140,210,255,' + (0.4 + 0.25 * Math.sin(t * 3)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('⛲', sp.x, sp.y + 8);
  ctx.restore();
}
// Escombros de edificios destruidos (design_complete: estado "destruido").
function drawRuin(r) {
  const fk = r.faction === 'humans' ? 'human' : r.faction, nm = r.kind + '_' + fk + '_destroyed';
  if (S(nm)) propDraw(nm, r.x, r.y + r.r + 4, 1, 0.95);
}
function drawBuilding(b) {
  if (b.kind === 'nest') return drawNest(b, state.t);
  const hurt = b.hp < b.max * 0.5, fk = b.faction === 'humans' ? 'human' : b.faction; // los props se llaman tower_human, etc.
  if (b.kind === 'base') {
    if (S('base_' + fk + '_damaged')) propDraw('base_' + fk + (hurt ? '_damaged' : ''), b.x, b.y + b.r * 1.0 + 6, 1); else propDraw('base_' + fk, b.x, b.y + b.r * 1.0, 0.85);
  } else if (b.captured && (ART.structures || {}).tower_neutral_captured) {
    propDraw(hurt ? 'tower_neutral_damaged' : 'tower_neutral_captured', b.x, b.y + b.r, 0.5);
  } else {
    if (S('tower_' + fk + '_damaged')) propDraw('tower_' + fk + (hurt ? '_damaged' : ''), b.x, b.y + b.r * 1.0 + 4, 1);
    else propDraw('tower_' + fk + (hurt && ART.props['tower_' + fk + '_damaged'] ? '_damaged' : ''), b.x, b.y + b.r * 1.0, 0.8);
  }
  if (!ART.props[(b.kind === 'base' ? 'base_' : 'tower_') + fk] && !(ART.structures || {})[(b.kind === 'base' ? 'base_' : 'tower_') + fk]) { ctx.fillStyle = b.side === 0 ? '#3b6fd0' : '#c04040'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); }
  if (b.kind === 'base' && b.max > 1e8) { // base enemiga indestructible (supervivencia)
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(b.x - 54, b.y + b.r + 3, 108, 14);
    ctx.fillStyle = '#e0b040'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('∞  INDESTRUCTIBLE', b.x, b.y + b.r + 14);
  } else if (b.kind === 'base') { // barra grande bajo el castillo, siempre dentro del campo, con la vida en número
    const w = 104, y = b.y + b.r + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(b.x - w / 2 - 2, y - 2, w + 4, 14);
    ctx.fillStyle = b.side === 0 ? '#5ac85a' : '#e05a5a'; ctx.fillRect(b.x - w / 2, y, w * Math.max(0, b.hp / b.max), 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.round(b.max), b.x, y + 8);
  } else bar(b.x, b.y - b.r - 46, b.r * 2.2, b.hp / b.max, b.side);
  if (b.disabled > 0) { ctx.fillStyle = 'rgba(20,20,40,0.45)'; ctx.beginPath(); ctx.arc(b.x, b.y - 4, b.r * 1.3, 0, 7); ctx.fill(); ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd860'; ctx.fillText('🔌 ' + Math.ceil(b.disabled), b.x, b.y - b.r - 30); }
}

// Tres estados: bloqueada (campamento sin despejar), libre (necesita un minero) y trabajando.
function drawMine(m, t) {
  const states = !!S('gold_mine_locked'); // design_complete: libre, bloqueada, trabajando y agotada
  ctx.save(); if (m.locked && !states) ctx.globalAlpha = 0.55;
  if (states) propDraw(m.locked ? 'gold_mine_locked' : (m.max && m.reserve < 1) ? 'gold_mine_depleted' : m.miner ? 'gold_mine_working' : 'gold_mine', m.x, m.y + 30, 1);
  else propDraw('gold_mine', m.x, m.y + 28, 0.72);
  ctx.restore();
  ctx.textAlign = 'center';
  if (!m.locked && m.max) { // reserva de oro: barra bajo la mina y aviso si está agotada
    const w = 40, k = Math.max(0, m.reserve / m.max); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - w / 2 - 1, m.y + 36, w + 2, 6); ctx.fillStyle = k > 0.25 ? '#ffd860' : '#e07a3a'; ctx.fillRect(m.x - w / 2, m.y + 37, w * k, 4);
    if (m.reserve < 1) { ctx.font = 'bold 9px system-ui, sans-serif'; ctx.fillStyle = '#ff9a6a'; ctx.fillText('AGOTADA', m.x, m.y - 26); }
  }
  if (m.locked) { if (!states) { ctx.font = '16px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('🔒', m.x, m.y - 24); } }
  else if (m.miner) { if (!states) vfxLoop('gold_mine', m.x, m.y - 4, 64, t, 12); propDraw('banner_blue', m.x + (m.x < W / 2 ? 36 : -36), m.y + 22, 0.55); }
  else {
    ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4);
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 24, 40, 15, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.fillStyle = '#ffd860'; ctx.fillText('MINA LIBRE', m.x, m.y - 26);
  }
}

function drawCamp(cp) {
  if (cp.tower && !cp.cleared) { // torre neutral: silueta que se vuelve tuya al despejar el campamento
    if (!propDraw('tower_neutral', cp.x, cp.y - 26 + 18, 0.5)) {
      ctx.save(); ctx.globalAlpha = 0.4; propDraw('tower_human', cp.x, cp.y - 26 + 18, 0.8); ctx.restore();
    }
    ctx.fillStyle = '#ffd860'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TORRE NEUTRAL', cp.x, cp.y - 74);
  }
  if (S('camp_outpost')) { // design_complete: tienda según el campamento y círculo rúnico (puesto de despliegue) al despejarlo
    propDraw(cp.cleared ? 'camp_outpost' : ['camp_slime', 'camp_bone', 'camp_gnoll'][cp.id % 3], cp.x, cp.y + 46, cp.cleared ? 0.9 : 0.85); return;
  }
  propDraw('capture_stone', cp.x, cp.y + 46, 0.55);
  if (cp.cleared) propDraw('banner_blue', cp.x, cp.y + 40, 0.6);
}

// ---------- Fotograma ----------
function draw() {
  const s = state;
  if (!s) return;
  const t = s.t;
  ctx.setTransform(view.k, 0, 0, view.k, 0, 0);
  const bg = ART.bg[s.mission.terrain], bgImg = bg && img(bg.src);
  if (loaded(bgImg)) ctx.drawImage(bgImg, 0, 0, W, H);
  else { ctx.fillStyle = '#2d4a2f'; ctx.fillRect(0, 0, W, H); }

  const showZone = s.selected !== null || (s.drag && s.drag.active);
  if (showZone) {
    ctx.fillStyle = 'rgba(80,150,255,0.20)'; ctx.fillRect(0, DEPLOY_BASE_Y, W, H - DEPLOY_BASE_Y);
    for (const z of s.zones) { ctx.beginPath(); ctx.arc(z.x, z.y, OUTPOST_R, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(160,200,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, DEPLOY_BASE_Y); ctx.lineTo(W, DEPLOY_BASE_Y); ctx.stroke(); ctx.setLineDash([]);
  }

  for (const z of s.brush || []) drawBrush(z, t);
  for (const r of s.ruins || []) drawRuin(r);
  for (const k of s.corpses) drawCorpse(k);
  const items = [];
  for (const p of s.points || []) items.push({ y: p.y - 40, f: () => drawPoint(p, t) });
  for (const c of s.chests || []) items.push({ y: c.y + 16, f: () => drawChest(c, t) });
  for (const sw of s.switches || []) items.push({ y: sw.y + 14, f: () => drawSwitch(sw, t) });
  for (const sp of s.springs || []) items.push({ y: sp.y + 8, f: () => drawSpring(sp, t) });
  for (const m of s.mines) items.push({ y: m.y + 28, f: () => drawMine(m, t) });
  for (const cp of s.camps) items.push({ y: cp.y + 46, f: () => drawCamp(cp) });
  for (const b of s.buildings) items.push({ y: b.y + b.r, f: () => drawBuilding(b) });
  for (const u of s.units) items.push({ y: u.y + (u.card.flying ? 200 : 0), f: () => drawUnit(u, t) }); // voladores por encima
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  ctx.textAlign = 'center';
  for (const f of s.fx) {
    f.l0 = f.l0 || f.life;
    if (f.type === 'vfx') { if (!vfxDraw(f.name, f.x1, f.y1, f.size, f.l0, f.life)) { ctx.globalAlpha = f.life / f.l0; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x1, f.y1, f.size / 3, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; } }
    else if (f.type === 'ring') {
      ctx.globalAlpha = Math.max(0, f.life / f.l0) * (f.fill ? 0.35 : 0.9);
      ctx.fillStyle = ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = 3;
      const r = f.r * (0.6 + 0.4 * (1 - f.life / f.l0));
      ctx.beginPath(); ctx.ellipse(f.x1, f.y1, r, r * 0.7, 0, 0, 7); if (f.fill) ctx.fill(); else ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.type === 'text') {
      ctx.globalAlpha = Math.min(1, f.life / f.l0 * 2.2);
      ctx.font = (f.big ? 'bold 30px' : f.ability ? 'bold 11px' : 'bold 13px') + ' system-ui, sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.fillStyle = f.big ? '#ffd060' : f.gold ? '#ffd860' : f.ability ? '#bfe0ff' : '#fff';
      const yy = f.y1 - (f.l0 - f.life) * (f.big ? 6 : 24);
      ctx.strokeText(f.text, f.x1, yy); ctx.fillText(f.text, f.x1, yy);
      ctx.globalAlpha = 1;
    } else if (f.type === 'shot') {
      const p = Math.min(1, 1 - f.life / f.l0), x = f.x1 + (f.x2 - f.x1) * p, y = f.y1 + (f.y2 - f.y1) * p;
      ctx.strokeStyle = f.tower ? '#ffe070' : (f.side === 0 ? '#9cc4ff' : '#ff9a9a'); ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(x - (f.x2 - f.x1) * 0.18, y - (f.y2 - f.y1) * 0.18); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.type === 'hit') {
      vfxDraw('hit_spark', f.x2, f.y2 - 6, 44, f.l0, f.life) || vfxDraw('impact_physical', f.x2, f.y2 - 6, 40, f.l0, f.life);
    }
  }
  for (const g of s.signals || []) { // señales y emotes: globo con icono (y marcador pulsante para "aquí")
    const a = Math.min(1, g.t / 0.4, (g.life - g.t) / 0.15 + 0.2);
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a));
    if (g.kind === 'ping') {
      const pr = 18 + 10 * ((t * 1.6) % 1);
      ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(g.x, g.y, pr, pr * 0.6, 0, 0, 7); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.icon, g.x, g.y - 8 - 3 * Math.sin(t * 6));
    } else if (g.art && ART.cos && ART.cos[g.art] && loaded(img(ART.cos[g.art].file))) { // emote del kit (design_complete): retrato con etiqueta
      const e = img(ART.cos[g.art].file), k = 58 / Math.max(e.naturalWidth, e.naturalHeight), dw = e.naturalWidth * k, dh = e.naturalHeight * k;
      const rise = 8 * (1 - Math.min(1, (g.life - g.t) * 3)), cx = g.x, top = g.y - dh - 6 - rise;
      ctx.fillStyle = g.side === 0 ? 'rgba(30,60,130,0.85)' : 'rgba(130,40,40,0.85)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      rrect(ctx, cx - dw / 2 - 5, top - 4, dw + 10, dh + 8, 14); ctx.fill(); ctx.stroke();
      ctx.drawImage(e, cx - dw / 2, top, dw, dh);
      ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
      ctx.strokeText(g.text, cx, top + dh + 16); ctx.fillText(g.text, cx, top + dh + 16);
    } else {
      const w = 96, h = 30, x = g.x - w / 2, y = g.y - h / 2 - 8 * (1 - Math.min(1, (g.life - g.t) * 3));
      ctx.fillStyle = g.side === 0 ? 'rgba(30,60,130,0.92)' : 'rgba(130,40,40,0.92)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      rrect(ctx, x, y, w, h, 12); ctx.fill(); ctx.stroke();
      ctx.font = '17px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(g.icon, x + 8, y + 21);
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillText(g.text, x + 31, y + 19);
    }
    ctx.restore();
  }
  for (const m of s.meteors || []) { // aviso de meteoro: el aro se llena y parpadea antes del impacto
    const p = 1 - m.t / m.t0;
    ctx.fillStyle = `rgba(255,80,40,${0.12 + 0.3 * p})`; ctx.strokeStyle = `rgba(255,140,60,${0.5 + 0.5 * Math.abs(Math.sin(p * 14))})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, 52, 52 * 0.7, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☄', m.x, m.y - 56 * (0.4 + 0.6 * (1 - p)));
  }
  if (s.leaderArmed) { const lr = s.leader.radius * s.mods.leaderRadius; ctx.strokeStyle = s.leader.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(mouse.x, mouse.y, lr, lr * 0.7, 0, 0, 7); ctx.stroke(); }
  if (s.drag && s.drag.active && s.drag.over) { // fantasma de la unidad que se arrastra
    const c = slotCard(s.drag.i), ok = inDeployArea(s.drag.x, s.drag.y) && s.gold >= cardCost(c);
    const f = c.art && spriteFrame(c.art, 'idle', t);
    shadow(s.drag.x, s.drag.y + c.r * 0.55, c.r * 1.05, c.r * 0.42, 0.3);
    if (f) blit(f, s.drag.x, s.drag.y + c.r * 0.55 - (c.flying ? 16 : 0), c.h, false, ok ? 0.75 : 0.35);
    else if (c.proc === 'dwarf') { ctx.globalAlpha = ok ? 0.8 : 0.4; drawDwarf(ctx, s.drag.x, s.drag.y + c.r * 0.55, c.h, false, t, false, false); ctx.globalAlpha = 1; }
    ctx.strokeStyle = ok ? '#8fe08f' : '#ff7070'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(s.drag.x, s.drag.y + c.r * 0.55, c.r * 1.3, c.r * 0.55, 0, 0, 7); ctx.stroke();
  }
}

// ---------- Helpers para dibujar props y VFX en cualquier canvas (p. ej. el cofre de la interfaz) ----------
function propOn(g, name, x, bottomY, k) {
  const p = ART.props[name], sheet = img(ART.propsSheet);
  if (!p || !loaded(sheet)) return false;
  g.drawImage(sheet, p.x, p.y, p.w, p.h, x - p.w * k / 2, bottomY - p.h * k, p.w * k, p.h * k);
  return true;
}
function vfxOn(g, name, x, y, size, progress) {
  const { v, sheet, cell } = vfxSrc(name);
  if (!v || !loaded(sheet)) return false;
  const idx = Math.min(v.n - 1, Math.floor(Math.max(0, Math.min(0.999, progress)) * v.n));
  g.drawImage(sheet, idx * cell, v.row * cell, cell, cell, x - size / 2, y - size / 2, size, size);
  return true;
}

// Efecto de la hoja de VFX sobre la interfaz (p. ej. "level_up"): un canvas temporal que anima sus fotogramas y se quita solo.
function uiVfx(name, cx, cy, size, ms) {
  try {
    const dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas');
    cv.width = cv.height = Math.round(size * dpr);
    cv.style.cssText = 'position:fixed;pointer-events:none;z-index:90;width:' + size + 'px;height:' + size + 'px;left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px';
    document.body.appendChild(cv);
    const g = cv.getContext('2d'), t0 = performance.now(), dur = ms || 1100;
    (function step(now) {
      const p = (now - t0) / dur;
      g.clearRect(0, 0, cv.width, cv.height);
      if (p >= 1) return cv.remove();
      g.save(); g.scale(dpr, dpr); vfxOn(g, name, size / 2, size / 2, size, p); g.restore();
      requestAnimationFrame(step);
    })(t0);
  } catch (e) { /* sin efecto */ }
}
const levelUpFx = (x, y) => uiVfx('level_up', x === undefined ? innerWidth / 2 : x, y === undefined ? innerHeight * 0.38 : y, 240, 1200);

// ---------- Iconos para la interfaz (se dibujan al cargar la hoja; sin leer píxeles) ----------
function makeIcon(card, size) {
  const setId = card && card.art;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size * 2; cv.style.width = cv.style.height = size + 'px';
  if (card && card.proc === 'dwarf' && !(ART.units && ART.units[setId])) { drawDwarf(cv.getContext('2d'), size, size * 1.94, size * 1.9, false, 0.3, false, false); return cv; } // el enano usa su dibujo por código solo si no hay arte
  const paint = () => {
    const f = spriteFrame(setId, 'idle', 0) || spriteFrame(setId, 'walk', 0);
    if (!f) return;
    const g = cv.getContext('2d'), k = Math.min(cv.width / f.bw, cv.height / f.bh);
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(f.sheet, f.sx, f.sy, f.cw, f.ch, (cv.width - f.cw * k) / 2, cv.height - f.ch * k, f.cw * k, f.ch * k);
  };
  const m = ART.units[setId], im = m && img(m.sheet);
  if (im) { if (loaded(im)) paint(); else im.addEventListener('load', paint); }
  return cv;
}
