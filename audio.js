// Efectos de sonido sintetizados con Web Audio: no usan ningún archivo, así que son originales y no pesan nada.
'use strict';

const Sound = (() => {
  let ctx = null, master = null, on = true;
  const last = {};
  const gap = { hit: 0.07, coin: 0.12, deploy: 0.05, boom: 0.15, ability: 0.18 }; // evita saturar con eventos repetidos

  function init() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  // Los navegadores móviles solo permiten sonar tras un gesto del usuario.
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { /* sin audio */ }); }

  function tone(t, f, d, type, vol, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(t, d, vol, freq) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * d)), buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq || 1200; g.gain.value = vol || 0.15;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const arp = (t, notes, step, type, vol) => notes.forEach((f, i) => tone(t + i * step, f, step * 1.6, type || 'triangle', vol || 0.2));

  const defs = {
    deploy: t => { tone(t, 320, 0.09, 'sine', 0.2, 520); tone(t + 0.06, 520, 0.1, 'sine', 0.15, 700); },
    hit: t => noise(t, 0.05, 0.07, 1500),
    coin: t => { tone(t, 880, 0.1, 'triangle', 0.16); tone(t + 0.07, 1320, 0.14, 'triangle', 0.16); },
    boom: t => { noise(t, 0.4, 0.3, 380); tone(t, 110, 0.35, 'sine', 0.3, 40); },
    capture: t => arp(t, [440, 554, 659], 0.09),
    boss: t => { tone(t, 80, 1.0, 'sawtooth', 0.25, 50); noise(t, 0.8, 0.12, 300); tone(t + 0.5, 110, 0.7, 'square', 0.12, 70); },
    bossdown: t => { noise(t, 0.5, 0.25, 500); arp(t + 0.15, [330, 392, 494, 659], 0.1, 'triangle', 0.22); },
    leader: t => { tone(t, 280, 0.35, 'sawtooth', 0.2, 900); noise(t, 0.3, 0.1, 2200); },
    win: t => arp(t, [523, 659, 784, 1047], 0.14, 'triangle', 0.25),
    lose: t => arp(t, [440, 370, 311, 220], 0.2, 'sawtooth', 0.15),
    ui: t => tone(t, 620, 0.05, 'square', 0.08),
    ability: t => { tone(t, 420, 0.12, 'triangle', 0.14, 760); tone(t + 0.08, 760, 0.12, 'sine', 0.1, 1100); },
  };

  function play(name) {
    if (!on || !ctx || ctx.state !== 'running' || !defs[name]) return;
    const now = ctx.currentTime;
    if (gap[name] && last[name] && now - last[name] < gap[name]) return;
    last[name] = now; defs[name](now);
  }
  // Reproduce y vacía la cola de eventos del motor.
  function drain(st) { if (!st || !st.events.length) return; const seen = new Set(); for (const e of st.events) { if (!seen.has(e)) { seen.add(e); play(e); } } st.events.length = 0; }
  return { resume, play, drain, get enabled() { return on; }, set enabled(v) { on = !!v; } };
})();
