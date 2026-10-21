// Pantallas, progreso guardado, controles táctiles y bucle principal.
'use strict';

const SAVE_KEY = 'kota_skirmish_v2'; // misma clave: los campos nuevos se completan solos
const screens = ['home', 'store', 'deck', 'dungeon', 'profile', 'battle']; // 'campaign' y 'quests' ahora viven dentro de 'home' (el mapa)
const FACTION_NAME = { humans: 'Humanos', ordu: 'Ordu', undead: 'No Muertos', dwarves: 'Enanos' };
const ui = { muts: [] }; // mutadores elegidos para la batalla en curso

// ---------- Progreso ----------
function defaultSave() {
  const slot = () => ({ deck: START_CARDS.slice(), leader: 'human_commander' });
  return {
    coins: 0, levels: {}, cards: START_CARDS.slice(), leaders: START_LEADERS.slice(), stars: {}, objs: {}, firstWin: {},
    slots: [slot(), slot(), slot()], slot: 0, xp: 0, level: 1, chests: 0, quests: null,
    stats: { battles: 0, wins: 0, kills: 0, mined: 0, deployed: 0, bosses: 0, guardians: 0, nests: 0 }, scores: {}, settings: { sound: true, vibrate: true },
    tutorialDone: false, dungeon: { best: 0, run: null }, talents: {}, event: null, daily: null, survival: { best: 0, plays: 0 },
    duel: { trophies: 0, best: 0, wins: 0, losses: 0, streak: 0, seed: 1 }, ach: null, shop: null, pass: null, cos: null, net: null, ranks: {}, mxp: {}, coll: { claimed: [] }, fails: {}, heroic: {}, skull: { best: 0, cleared: {} },
  };
}
let save = defaultSave();
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) save = Object.assign(defaultSave(), JSON.parse(raw)); } catch (e) { /* sin almacenamiento: se juega sin guardar */ }

// Completa campos nuevos y sanea mazos/héroes por si los datos cambiaron entre versiones.
function normalizeSave() {
  const d = defaultSave();
  save.stats = Object.assign(d.stats, save.stats || {});
  save.settings = Object.assign(d.settings, save.settings || {});
  save.dungeon = Object.assign(d.dungeon, save.dungeon || {});
  save.survival = Object.assign(d.survival, save.survival || {});
  save.talents = save.talents || {};
  save.objs = save.objs || {}; save.stars = save.stars || {};
  for (const id in save.stars) if (!save.objs[id]) { const s = save.stars[id]; save.objs[id] = [s >= 1, s >= 2, s >= 3]; }
  if (typeof save.chests !== 'number') save.chests = 0;
  for (const id of START_CARDS) if (!save.cards.includes(id)) save.cards.push(id);
  save.slots = (save.slots || []).slice(0, 3);
  while (save.slots.length < 3) save.slots.push({ deck: START_CARDS.slice(), leader: 'human_commander' });
  for (const s of save.slots) {
    s.deck = (s.deck || []).filter(id => CARD[id] && CARD[id].ready && id !== UNIVERSAL && save.cards.includes(id)).slice(0, DECK_MAX);
    if (!s.deck.length) s.deck = START_CARDS.slice();
    if (!LEADER[s.leader] || !save.leaders.includes(s.leader)) s.leader = 'human_commander';
  }
  save.duel = Object.assign(d.duel, save.duel || {});
  save.fails = save.fails || {}; save.heroic = save.heroic || {}; save.scores = save.scores || {};
  save.ranks = save.ranks || {}; save.mxp = save.mxp || {}; collState(save);
  save.skull = Object.assign({ best: 0, cleared: {} }, save.skull || {}); save.skull.cleared = save.skull.cleared || {};
  ensureQuests(save); ensureEvent(save); ensureDaily(save); ensureAch(save); ensureShop(save); ensurePass(save); syncAch(save); ensureCos(save);
}
normalizeSave();
Sound.enabled = save.settings.sound;
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignorar */ } }
const cur = () => save.slots[save.slot];
// Los mapas de jefe regional se abren al superar los demás mapas de su terreno; el resto sigue la cadena lineal.
const missionUnlocked = i => { const m = MISSIONS[i]; if (m && m.regional) return MISSIONS.filter(x => x.terrain === m.terrain && !x.regional).every(x => (save.stars[x.id] || 0) > 0); return i === 0 || (save.stars[i - 1] || 0) > 0; };
const nextMissionIndex = () => { for (let i = 0; i < MISSIONS.length; i++) if (missionUnlocked(i) && !(save.stars[i] > 0)) return i; return MISSIONS.length - 1; };
const claimable = () => save.quests.list.filter(q => q.progress >= q.target && !q.claimed).length;
const dailyOpen = () => !ensureDaily(save).done; // ¿queda el desafío del día por jugar?

// ---------- Utilidades de interfaz ----------
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
// Estrellas con el sprite del kit de interfaz (si no carga, quedan las de texto)
const starsHtml = n => ART.ui && ART.ui.star ? Array.from({ length: 3 }, (_, i) => `<img src="${(i < n ? ART.ui.star : ART.ui.star_empty).file}" alt="${i < n ? '★' : '☆'}">`).join('') : stars(n);
const coinIcon = '<span class="coin"></span>';
function setCoins() { if (typeof renderHeader === 'function') renderHeader(); } // la cabecera global (ui_main.js) muestra oro, energía y cores
let toastTimer = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600); }
function buzz(ms) { try { if (save.settings.vibrate && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* sin vibración */ } }
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function closeModals() { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); }
function miniIcons(ids, size) { return ids.map(id => { const c = CARD[id], b = el('div', 'mini'); b.style.setProperty('--f', FACTION_COLOR[c.faction]); b.appendChild(makeIcon(c, size)); return b; }); }

// ---------- Navegación ----------
let current = 'home';
const SCREEN_ALIAS = { campaign: 'home', quests: 'home' };
function show(name) {
  name = SCREEN_ALIAS[name] || name;
  current = name;
  for (const s of screens) $(s).hidden = s !== name;
  closeModals(); $('wallet').hidden = true;
  document.body.dataset.screen = name;
  document.querySelectorAll('#nav button[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === name));
  ensureQuests(save); ensureEvent(save); ensureDaily(save); ensureShop(save); ensurePass(save); ensureWallet(save);
  if (name === 'home') renderHome();
  if (name === 'dungeon') { const sr = ensureDungeonSeason(save); if (sr && sr.chests) { persist(); toast(`🗡 Temporada cerrada (mejor nivel ${sr.prev}): +${sr.chests} cofre${sr.chests > 1 ? 's' : ''}`); } renderModes(); }
  if (name === 'deck') renderArmy();
  if (name === 'store') renderStore();
  if (name === 'profile') renderProfile();
  if (name === 'battle') requestAnimationFrame(resizeCanvas);
  renderNavBadges();
  setCoins();
}
// Vuelve a pintar la pantalla actual conservando el scroll (tras comprar, reclamar, equipar…).
function rerender() {
  const els = [$(current), $('map-body')], tops = els.map(e => e.scrollTop);
  ui.noAuto = true; show(current); ui.noAuto = false; els.forEach((e, i) => { e.scrollTop = tops[i]; });
}
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));

// ---------- Briefing: objetivos y mutadores ----------
// Los mutadores opcionales de la preparación de batalla están guardados pero apagados por ahora (se reactivan poniendo esta constante en true).
// Sus reglas (MUTATORS, mutatorMods, recompensas) siguen intactas y los usan el desafío diario y las calaveras.
const MUTATORS_IN_BRIEFING = false;
const brief = { mission: null, muts: new Set(), assist: false, heroic: false };
function openBriefing(i) { closeModals(); brief.mission = MISSIONS[i]; brief.muts = new Set(); brief.assist = false; brief.heroic = false; renderBriefing(); $('briefing').hidden = false; }
function renderBriefing() {
  const m = brief.mission, objs = save.objs[m.id] || [false, false, false];
  $('b-title').textContent = `${m.id + 1}. ${m.name}`;
  const G = GOALS[m.goal];
  $('b-desc').innerHTML = `<b>${G.icon} ${G.name}:</b> ${G.desc}<br>${m.desc}` + ((m.boss || m.bosses) ? ` Jefe: ${(m.bosses || [m.boss]).map(b => BOSS[b.id].name).join(' y ')}.` : '');
  $('b-objs').innerHTML = G.objs.map((t, k) => `<li class="${objs[k] ? 'ok' : ''}"><b class="ck"></b> ${t}</li>`).join('');
  const opts = $('b-opts'); opts.innerHTML = '';
  if (heroicUnlocked(save, m.id)) { // heroica: misión superada con 2+ estrellas
    const b = el('button', 'chip' + (brief.heroic ? ' on' : ''), `<i>🔥</i><b>Heroica${save.heroic[m.id] ? ' ✔' : ''}</b><small>Enemigos +30% y con talentos (${heroicMission(m).foeTalents.map(t => TALENT_DEFS[t].name).join(', ')}) · recompensa ×${HEROIC_REWARD}${save.heroic[m.id] ? '' : ' · 1.ª vez: cofre y core'}</small>`);
    b.onclick = () => { brief.heroic = !brief.heroic; if (brief.heroic) brief.assist = false; renderBriefing(); };
    opts.appendChild(b);
  }
  if (assistAvailable(save, m.id) && !brief.heroic) { // dificultad adaptativa tras 2 derrotas seguidas
    const b = el('button', 'chip' + (brief.assist ? ' on' : ''), `<i>🆘</i><b>Ayuda</b><small>+3 de energía, aliados y torres más duros · recompensa ×${ASSIST_REWARD}</small>`);
    b.onclick = () => { brief.assist = !brief.assist; renderBriefing(); };
    opts.appendChild(b);
  }
  const notes = [];
  if (m.camps.some(c => c.groups)) notes.push('🎲 Los campamentos cambian de tropas en cada partida.');
  if (m.campRespawn) notes.push('↻ Los campamentos despejados reaparecen (hasta 3 veces): vencerlos da +' + m.campRespawn.bounty + '⚡.');
  if (m.nests && m.nests.length) notes.push('🥚 Hay nidos enemigos: crean criaturas hasta que los destruyes (+' + NEST_BOUNTY + '⚡).');
  if (m.springs && m.springs.length) notes.push('⛲ Hay fuentes que curan a todos los que estén cerca.');
  if (m.switches && m.switches.length) notes.push('🔌 Los interruptores cuestan energía y se pueden reutilizar.');
  if (notes.length) opts.appendChild(el('small', 'muted', notes.join('<br>')));
  $('b-mutwrap').hidden = !MUTATORS_IN_BRIEFING;
  if (!MUTATORS_IN_BRIEFING) brief.muts.clear();
  const muts = $('b-muts'); muts.innerHTML = '';
  if (MUTATORS_IN_BRIEFING) MUTATORS.forEach(mu => {
    const b = el('button', 'chip' + (brief.muts.has(mu.id) ? ' on' : ''), `<i>${mu.icon}</i><b>${mu.name}</b><small>${mu.desc} · +${Math.round(mu.bonus * 100)}%</small>`);
    b.onclick = () => { if (brief.muts.has(mu.id)) brief.muts.delete(mu.id); else brief.muts.add(mu.id); renderBriefing(); };
    muts.appendChild(b);
  });
  const bonus = Math.round(mutatorBonus([...brief.muts]) * 100);
  $('b-bonus').textContent = bonus ? `Recompensa: +${bonus}% de monedas y XP si ganas` : 'Sin mutadores: recompensa normal';
  const bd = $('b-deck'); bd.innerHTML = ''; miniIcons(cur().deck.concat(UNIVERSAL), 34).forEach(x => bd.appendChild(x));
}
$('b-go').onclick = () => { const i = brief.mission.id, muts = [...brief.muts]; closeModals(); launchMission(i, muts, { assist: brief.assist, heroic: brief.heroic }); };
$('b-cancel').onclick = () => { $('briefing').hidden = true; };

// Punto único de arranque: aplica mutadores/reglas del modo y los talentos activos del mazo.
function beginBattle(mission, deck, leader, mods) {
  show('battle');
  startBattle(mission, deck, leader, effLevels(save), mods, talentMap(save, deck)); // nivel + fracción por rango
  buildBattleUI(); startCoach();
}
function launchMission(i, muts, opt) { // opt: { assist, heroic }
  opt = opt || {}; ui.muts = muts || []; ui.assist = !!opt.assist && !opt.heroic && assistAvailable(save, i); ui.replay = () => launchMission(i, ui.muts, opt);
  const m = opt.heroic && heroicUnlocked(save, i) ? heroicMission(MISSIONS[i]) : MISSIONS[i];
  beginBattle(m, cur().deck, cur().leader, ui.assist ? mergeMods([mutatorMods(ui.muts), ASSIST_MODS]) : mutatorMods(ui.muts));
}

// ---------- Mazos, héroes y mejoras ----------
function cardStats(c) {
  const m = levelMult(save.levels[c.id]);
  return `${c.cost}⚡ · ${Math.round(c.hp * m)} vida · ${Math.round(c.dmg * m)} daño`;
}

// Botón de mejora: cuesta oro, energía y (desde el nivel 3) cores. after: qué repintar al comprar.
function upgradeBtn(c, after) {
  const lvl = save.levels[c.id] || 1, max = lvl >= levelCap(save, c.id), req = upgradeReq(lvl);
  const up = el('button', max ? '' : 'upg', max ? 'Nivel máx.' : `Mejorar ${coinIcon}${req.coins} 🔋${req.energy}${req.cores ? ' 💠' + req.cores : ''}`);
  up.disabled = max || !canAfford(save, req); if (max && rankOf(save, c.id) < MAX_RANK) up.textContent = 'Nivel máx. · asciende';
  up.onclick = () => { const r = upgradeCard(save, c.id); if (r.err) return toast(r.err); const bb = up.getBoundingClientRect(); persist(); Sound.play('capture'); toast(`${c.name} sube a Nv ${r.level}`); levelUpFx(bb.left + bb.width / 2, bb.top + bb.height / 2); (after || rerender)(); };
  return up;
}
function talentBtn(c) {
  const lvl = save.levels[c.id] || 1, n = activeTalents(c, save.talents[c.id], lvl).length, open = TALENT_UNLOCK.filter(u => lvl >= u).length;
  const b = el('button', open > n ? 'hint' : '', `Talentos ${n}/${open || TALENT_UNLOCK.length}${open > n ? ' ●' : ''}`);
  b.onclick = () => openTalents(c.id);
  return b;
}

// ---------- Talentos: 3 ranuras por carta que se abren con el nivel; 1 de 2 opciones en cada una (cambiar es gratis) ----------
function openTalents(id) {
  const c = CARD[id], lvl = save.levels[id] || 1, opts = talentOptions(c), body = $('talents-body');
  const chosen = save.talents[id] = save.talents[id] || [];
  body.innerHTML = '';
  const head = el('div', 'thead'), ic = el('div', 'icon'); ic.appendChild(makeIcon(c, 56));
  head.append(ic, el('div', '', `<h2>${c.name} <small>Nv ${lvl}</small></h2><small>Las ranuras se abren en los niveles ${TALENT_UNLOCK.join(', ')}. Pulsa otra vez un talento para quitarlo.</small>`));
  body.appendChild(head);
  opts.forEach((slotOpts, s) => {
    const unlocked = lvl >= TALENT_UNLOCK[s], row = el('div', 'tslot' + (unlocked ? '' : ' locked'));
    row.appendChild(el('h3', '', `Ranura ${s + 1} <small>${unlocked ? 'abierta' : `🔒 se abre en el nivel ${TALENT_UNLOCK[s]}`}</small>`));
    const box = el('div', 'topts');
    slotOpts.forEach(tid => {
      const t = TALENT_DEFS[tid], b = el('button', 'topt' + (chosen[s] === tid ? ' on' : ''), `<b>${t.name}</b><small>${t.desc}</small>`);
      b.disabled = !unlocked;
      b.onclick = () => { chosen[s] = chosen[s] === tid ? null : tid; persist(); Sound.play('capture'); openTalents(id); };
      box.appendChild(b);
    });
    row.appendChild(box); body.appendChild(row);
  });
  const ok = el('button', 'primary', 'Listo'); ok.onclick = () => { $('talents').hidden = true; renderDeck(); };
  body.appendChild(ok); $('talents').hidden = false;
}

function renderDeck() { renderArmy(); } // compatibilidad: los talentos llaman a esta función al cerrarse

function openChestFlow() {
  const res = openChest(save); if (!res) return;
  persist(); $('chest').hidden = false; $('chest-ok').hidden = true; $('chest-text').textContent = '';
  const cv = $('chest-canvas'), g = cv.getContext('2d'), t0 = performance.now();
  const step = now => {
    const p = (now - t0) / 1200; g.clearRect(0, 0, cv.width, cv.height);
    g.save(); g.translate(120 + (p < 0.5 ? Math.sin(p * 70) * 3 : 0), 0); propOn(g, 'chest', 0, 175, 1.5); g.restore();
    if (p > 0.45) vfxOn(g, 'chest_open', 120, 105, 210, (p - 0.45) / 0.55);
    if (p < 1.1) { requestAnimationFrame(step); return; }
    $('chest-text').innerHTML = `${coinIcon}<b>+${res.coins}</b> monedas` + (res.core ? '<br>💠 <b>+1</b> core' : '') + (res.freeLevel ? `<br>¡<b>${CARD[res.freeLevel].name}</b> sube a Nv ${save.levels[res.freeLevel]}!` : '');
    $('chest-ok').hidden = false; Sound.play('capture'); setCoins();
  };
  Sound.play('boom'); requestAnimationFrame(step);
}
$('chest-ok').onclick = () => rerender();

// ---------- Modos de juego: evento semanal, desafío del día, supervivencia y mazmorra ----------
function renderModes() {
  const body = $('dungeon-body'); body.innerHTML = '';
  body.append(duelCard(), skullCard(), eventCard(), dailyCard(), survivalCard(), dungeonBox());
}

function eventCard() {
  const ev = eventFor(new Date()), st = ensureEvent(save), box = el('div', 'zone t-snow event');
  box.innerHTML = `<h3>${ev.icon} Evento: ${ev.name}</h3><small class="countdown">Termina en ${fmtCountdown(eventEnd(new Date()) - new Date())}</small><p class="muted">${ev.desc}</p>`;
  const tiers = el('div', 'tiers');
  EVENT_TIERS.forEach((t, i) => {
    const b = el('button', 'tier' + (st.cleared[i] ? ' done' : ''), `<b>${t.name}</b><small>${st.cleared[i] ? '✔ superado' : `${coinIcon}${t.coins}${t.chest ? ' · 🎁' : ''}`}</small>`);
    b.onclick = () => launchEvent(i);
    tiers.appendChild(b);
  });
  box.appendChild(tiers);
  box.appendChild(el('small', 'muted', st.bonus ? '★ Bonus del evento conseguido' : 'Supera los 3 niveles para un bonus extra (+100 monedas y 1 cofre).'));
  return box;
}
function launchEvent(tier) {
  const ev = eventFor(new Date()); ui.muts = []; ui.replay = () => launchEvent(tier);
  beginBattle(eventMission(ev, tier), cur().deck, cur().leader, Object.assign({}, ev.mods));
}

function dailyCard() {
  const dc = dailyChallenge(dayKey()), d = ensureDaily(save), box = el('div', 'zone t-ruins');
  const muts = dc.muts.map(id => `<span class="pill">${MUTATOR[id].icon} ${MUTATOR[id].name}</span>`).join('');
  box.innerHTML = `<h3>📅 Desafío del día</h3><p class="muted">Todos los jugadores luchan hoy la misma batalla con estos mutadores:</p><div class="pills">${muts}</div>` +
    `<p>Racha: <b>${dailyStreakNow(save)}</b> día${dailyStreakNow(save) === 1 ? '' : 's'} · ${d.done ? '✔ completado hoy' : `${coinIcon}${dailyReward(save).coins} + 🎁`}</p>`;
  const go = el('button', d.done ? '' : 'primary big', d.done ? 'Jugar otra vez (sin premio)' : '¡Aceptar el reto!'); go.onclick = launchDaily;
  box.appendChild(go);
  return box;
}
function launchDaily() {
  const dc = dailyChallenge(dayKey()); ui.muts = []; ui.replay = launchDaily;
  beginBattle(dc.mission, cur().deck, cur().leader, mutatorMods(dc.muts));
}

function survivalCard() {
  const box = el('div', 'zone t-volcanic');
  box.innerHTML = `<h3>♾ Supervivencia</h3><p class="muted">Oleadas sin fin, cada vez más rápidas y fuertes; un jefe cada 5. La base enemiga es indestructible: aguanta todo lo que puedas. ` +
    `Ganas ${coinIcon}8 por oleada y 1 cofre cada 10.</p><p>Mejor marca: <b>${save.survival.best}</b> oleadas</p>`;
  const go = el('button', 'primary big', 'Empezar supervivencia'); go.onclick = launchSurvival;
  box.appendChild(go);
  return box;
}
function launchSurvival() { ui.muts = []; ui.replay = launchSurvival; beginBattle(survivalMission(), cur().deck, cur().leader, {}); }

// ---------- Mazmorra ----------
function dungeonBox() {
  const d = save.dungeon, run = d.run, box = el('div', 'zone t-desert');
  if (!run) {
    box.innerHTML = `<h3>🗡 Mazmorra: run de ${DUNGEON_STAGES} niveles</h3><p class="muted">Lucha niveles seguidos con tu mazo y tu héroe. Tras cada victoria eliges <b>1 de 3 reliquias</b> que duran toda la run. ` +
      `Tienes <b>${DUNGEON_LIVES} vidas</b>: si pierdes un nivel lo repites; sin vidas, la run termina. Hay jefes en los niveles 4 y 8.</p>` +
      `<p>Mejor nivel superado: <b>${d.best}/${DUNGEON_STAGES}</b></p>`;
    const go = el('button', 'primary big', 'Empezar run'); go.onclick = () => { save.dungeon.run = newRun(cur().deck, cur().leader); persist(); show('dungeon'); };
    box.appendChild(go);
  } else {
    const dots = Array.from({ length: DUNGEON_STAGES }, (_, i) => `<span class="dot ${i + 1 < run.stage ? 'done' : i + 1 === run.stage ? 'cur' : ''}">${i + 1}</span>`).join('');
    box.innerHTML = `<h3>Nivel ${run.stage} de ${DUNGEON_STAGES}</h3><div class="dots">${dots}</div>` +
      `<p class="hearts">${'❤'.repeat(run.lives)}<span>${'❤'.repeat(DUNGEON_LIVES - run.lives)}</span> <small>vidas</small></p>` +
      `<h3>Reliquias <small>(${run.relics.length})</small></h3>` +
      (run.relics.length ? run.relics.map(id => `<div class="relic mini-r"><i>${RELIC[id].icon}</i><div><b>${RELIC[id].name}</b><small>${RELIC[id].desc}</small></div></div>`).join('') : '<p class="muted">Aún no tienes ninguna: gana el primer nivel.</p>');
    const go = el('button', 'primary big', `Luchar: nivel ${run.stage}`); go.onclick = launchDungeon;
    const ab = el('button', 'ghost', 'Abandonar run'); ab.onclick = () => { if (confirm('¿Abandonar la run? Conservas la recompensa de los niveles superados.')) endRun(false); };
    box.append(go, ab);
  }
  const ss = dungeonSeason(), note = el('p', 'muted');
  if (ss.open) note.innerHTML = `🗓 Temporada abierta: cierra en <b>${fmtCountdown(ss.endsAt - new Date())}</b> · mejor esta semana: <b>${d.seasonBest || 0}/${DUNGEON_STAGES}</b> · premio al cierre: 🎁 (nivel 4: 1, nivel 8: 2)`;
  else { note.innerHTML = `😴 La mazmorra descansa hasta dentro de <b>${fmtCountdown(ss.nextOpen - new Date())}</b>. Mientras tanto no se puede jugar.`; box.querySelectorAll('button.primary').forEach(b => { b.disabled = true; }); }
  box.appendChild(note);
  return box;
}

function launchDungeon() {
  const run = save.dungeon.run; if (!run) return;
  if (!dungeonSeason().open) return toast('😴 La mazmorra descansa hasta el lunes');
  ui.muts = []; ui.replay = launchDungeon;
  beginBattle(dungeonMission(run.stage), run.deck, run.leader, relicMods(run.relics));
}

function panelButtons(defs) {
  const row = el('div', 'row center');
  defs.forEach(([label, cls, fn]) => { const b = el('button', cls || '', label); b.onclick = fn; row.appendChild(b); });
  return row;
}
function showPanel(html, buttons) {
  const body = $('result-body'); body.innerHTML = html + (ui.bonusLine || ''); ui.bonusLine = ''; body.appendChild(panelButtons(buttons)); $('result').hidden = false; setCoins();
}

function endRun(completed) {
  const run = save.dungeon.run; if (!run) return;
  const cleared = completed ? DUNGEON_STAGES : run.stage - 1, rw = dungeonReward(cleared, completed);
  save.coins += rw.coins; const ups = addXp(save, rw.xp); grantChests(save, rw.chests);
  save.dungeon.best = Math.max(save.dungeon.best, cleared); save.dungeon.seasonBest = Math.max(save.dungeon.seasonBest || 0, cleared); save.dungeon.run = null; persist();
  showPanel(`<h2 class="${completed ? 'win' : 'lose'}">${completed ? '¡Run completada!' : 'Run terminada'}</h2><p>Niveles superados: <b>${cleared}/${DUNGEON_STAGES}</b></p>` +
    `<p>${coinIcon}+${rw.coins} monedas · +${rw.xp} XP${rw.chests ? ` · 🎁 +${rw.chests} cofre${rw.chests > 1 ? 's' : ''}` : ''}</p>${ups ? `<p>¡Subes al nivel ${save.level}!</p>` : ''}`,
    [['Aceptar', 'primary', () => show('dungeon')]]);
}

function openLoot() {
  const run = save.dungeon.run, offers = pickLoot(run.relics), body = $('loot-body');
  body.innerHTML = `<h2 class="win">¡Nivel ${run.stage} superado!</h2><p class="muted">Elige una reliquia para el resto de la run.</p>`;
  offers.forEach(id => {
    const r = RELIC[id], b = el('button', 'relic', `<i>${r.icon}</i><div><b>${r.name}</b><small>${r.desc}</small></div>`);
    b.onclick = () => { run.relics.push(id); run.stage++; persist(); Sound.play('capture'); show('dungeon'); };
    body.appendChild(b);
  });
  $('loot').hidden = false;
}

function showDungeonResult(r) {
  const run = save.dungeon.run; if (!run) return show('home');
  if (r.win) {
    save.dungeon.best = Math.max(save.dungeon.best, state.mission.stage); save.dungeon.seasonBest = Math.max(save.dungeon.seasonBest || 0, state.mission.stage); persist();
    if (state.mission.stage >= DUNGEON_STAGES) return endRun(true);
    return openLoot();
  }
  run.lives--; persist();
  if (run.lives <= 0) return endRun(false);
  showPanel(`<h2 class="lose">Nivel perdido</h2><p>Pierdes una vida. Te quedan <b class="hearts">${'❤'.repeat(run.lives)}</b></p>`,
    [['Reintentar nivel', 'primary', launchDungeon], ['Abandonar run', 'ghost', () => endRun(false)]]);
}

// ---------- Batalla ----------
let drag = null; // { i, sx, sy, moved }

// Cuatro ranuras de mano; el enano minero (borde dorado) rota con el resto. Se repinta solo la ranura cuyo contenido cambia.
function paintSlot(b, c) {
  b.dataset.cid = c.id;
  b.classList.toggle('universal', c.id === UNIVERSAL);
  b.style.setProperty('--f', FACTION_COLOR[c.faction]); b.style.setProperty('--r', RARITY_COLOR[c.rarity]);
  b.innerHTML = '';
  b.append(el('i', 'gem', cardCost(c)), makeIcon(c, 50), el('span', 'nm', c.name));
}
function paintNext() {
  const n = $('next'), c = state.queue[0];
  n.hidden = !c;
  if (!c || n.dataset.cid === c.id) return;
  n.dataset.cid = c.id; n.innerHTML = '';
  n.append(el('small', '', 'Sig. ↻'), makeIcon(c, 30));
  n.style.setProperty('--f', FACTION_COLOR[c.faction]);
}

function buildBattleUI() {
  const box = $('cards'); box.innerHTML = '';
  $('next').dataset.cid = '';
  for (let i = 0; i < state.hand.length; i++) {
    const b = el('button', 'card');
    paintSlot(b, slotCard(i));
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (state.over || state.paused) return; drag = { i, sx: e.clientX, sy: e.clientY, moved: false }; });
    box.appendChild(b);
  }
  paintNext(); state.replaceMode = false; state.pingMode = false; $('signal-menu').hidden = true;
  const L = state.leader, hb = $('leader');
  hb.innerHTML = `<img src="${ART.leaders[L.portrait] || ''}" alt=""><span class="nm">${state.mods.leaderOff ? 'Sin héroe' : L.abName}</span><span class="cd"></span>`;
  hb.style.setProperty('--f', L.color);
  closeModals(); $('pausebanner').hidden = true;
}

function updateBattleUI() {
  const s = state, mines = s.mines.filter(m => m.miner).length;
  $('energynum').textContent = Math.floor(s.gold);
  $('energybar').firstElementChild.style.width = (s.gold / MAX_GOLD * 100) + '%';
  $('mines').textContent = `⛏ ${mines}/${s.mines.length}`;
  const left = s.timeLimit - s.t;
  $('timer').textContent = s.mission.survival ? `Oleada ${s.waveNo}` : fmtTime(left); // la supervivencia no tiene reloj
  $('timer').classList.toggle('warn', !s.mission.survival && left < 30);
  const hb = $('leader'), cd = s.leaderCd;
  hb.disabled = cd > 0 || s.over || s.mods.leaderOff;
  hb.classList.toggle('armed', s.leaderArmed);
  hb.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) : '';
  [...$('cards').children].forEach((b, i) => {
    const c = slotCard(i);
    if (b.dataset.cid !== c.id) { paintSlot(b, c); b.classList.remove('deal'); void b.offsetWidth; b.classList.add('deal'); } // entró una carta nueva
    b.classList.toggle('sel', s.selected === i || !!(s.drag && s.drag.active && s.drag.i === i));
    b.classList.toggle('swap', !!s.replaceMode);
    b.classList.toggle('poor', s.gold < cardCost(c));
    const gem = b.querySelector('.gem'); if (gem && gem.textContent !== String(cardCost(c))) gem.textContent = cardCost(c);
  });
  paintNext();
  $('goal').textContent = goalText(s); $('goal').hidden = !$('goal').textContent;
  $('signal').classList.toggle('cool', s.sigCd > 0); $('signal').classList.toggle('armed', !!s.pingMode);
  $('pause').textContent = s.paused ? '▶' : '⏸';
  $('speed').textContent = 'x' + s.speed;
  $('pausebanner').hidden = !s.paused;
  if (coachOn && COACH[coachStep].done(s)) { coachStep++; if (coachStep >= COACH.length) { coachOn = false; save.tutorialDone = true; persist(); } renderCoach(); }
  if (s.over && !s.rewarded) showResult();
}

// Texto del indicador de objetivo: progreso de la meta y cofres encontrados.
function goalText(s) {
  const m = s.mission, parts = [];
  if (m.survival) return '';
  const left = Math.max(0, s.timeLimit - s.t);
  if (s.overtime) parts.push('⏱ TIEMPO EXTRA');
  if (s.goal === 'defend') parts.push(`🛡 Resiste ${fmtTime(left)}`);
  else if (s.goal === 'capture') parts.push(`🚩 ${s.points.filter(p => p.owner === 0).length}/${s.points.length} puntos`);
  else if (s.goal === 'hunt' && s.hunt) parts.push(`🎯 Campeón ${Math.max(0, Math.round(s.hunt.unit.hp / s.hunt.unit.max * 100))}%`);
  else if (s.goal === 'escort' && s.cart && s.t < CART_DELAY) parts.push(`🛒 La carreta sale en ${Math.ceil(CART_DELAY - s.t)} s`);
  else if (s.goal === 'escort' && s.cart) parts.push(`🛒 Carreta ${Math.max(0, Math.round(s.cart.hp / s.cart.max * 100))}% · ${Math.max(0, Math.min(100, Math.round((690 - s.cart.y) / 540 * 100)))}%`);
  else if (s.duel) { const eb = s.buildings.find(b => b.side === 1 && b.kind === 'base'); parts.push(`⚔ ${s.duel.rival.name} · ⚡${Math.floor(s.duel.gold)} · 🏰 ${eb ? Math.round(eb.hp / eb.max * 100) : 0}%`); }
  else if (s.goal === 'destroy') parts.push('🏰 Destruye la base');
  if (s.chests.length) parts.push(`🎁 ${s.stats.chests}/${s.chests.length}`);
  return parts.join('  ·  ');
}

// ---------- Tutorial (solo la primera misión) ----------
const COACH = [
  { text: 'Arrastra una carta hasta tu zona azul para desplegarla.', done: s => s.stats.deployed >= 1 },
  { text: 'Despliega al Enano minero sobre una MINA LIBRE: la energía de las minas es clave.', done: s => s.units.some(u => u.card.miner && u.mining) },
  { text: 'Despeja un campamento para desbloquear su mina y ampliar tu zona de despliegue.', done: s => s.camps.some(c => c.cleared) },
];
let coachOn = false, coachStep = 0;
function startCoach() { coachOn = !save.tutorialDone && !state.mission.dungeon && state.mission.id === 0; coachStep = 0; renderCoach(); }
function renderCoach() { const c = $('coach'); c.hidden = !coachOn; if (coachOn) c.textContent = COACH[coachStep].text + '  (toca para ocultar)'; }
$('coach').onclick = () => { coachOn = false; save.tutorialDone = true; persist(); renderCoach(); };

// ---------- Resultados de los modos especiales ----------
// Suma monedas, XP y cofres; devuelve texto con subidas de nivel y cofres para mostrar en el panel.
function applyRewards(rw) {
  save.coins += rw.coins; save.cores = (save.cores || 0) + (rw.cores || 0); const ups = addXp(save, rw.xp), lost = grantChests(save, rw.chests || 0);
  return (rw.cores ? `<p>💠 +${rw.cores} core${rw.cores > 1 ? 's' : ''}</p>` : '') + (ups ? (setTimeout(levelUpFx, 350), `<p>⭐ ¡Subes al nivel <b>${save.level}</b>! +${50 * ups} monedas</p>`) : '') +
    (rw.chests ? `<p>🎁 +${rw.chests} cofre${rw.chests > 1 ? 's' : ''}${lost ? ' (lleno: el exceso da monedas)' : ''}</p>` : '');
}
const modeButtons = () => [['Reintentar', 'primary', () => ui.replay && ui.replay()], ['Modos', 'ghost', () => show('dungeon')]];

function showEventResult(r, m) {
  const ev = eventFor(new Date()), tier = m.event.tier, rw = eventReward(save, tier, r.win);
  let all = { allClear: false, coins: 0, chests: 0 };
  if (r.win) all = applyEventWin(save, tier);
  const extra = applyRewards({ coins: rw.coins, xp: rw.xp, chests: rw.chests + all.chests }); persist();
  showPanel(`<h2 class="${r.win ? 'win' : 'lose'}">${r.win ? '¡Nivel superado!' : 'Derrota'}</h2><p>${ev.icon} ${ev.name} · ${EVENT_TIERS[tier].name}</p>` +
    `<p>${coinIcon}<b>+${rw.coins}</b> monedas · <b>+${rw.xp}</b> XP${r.win && !rw.first ? ' <small>(repetición: 25%)</small>' : ''}</p>` +
    (all.allClear ? `<p>🏆 <b>¡Evento completado!</b> Bonus +${all.coins} monedas</p>` : '') + extra, modeButtons());
}

function showDailyResult(r) {
  const d = ensureDaily(save);
  let rw = { coins: 5, xp: 10, chests: 0 }, note = '';
  if (r.win && !d.done) { const x = applyDailyWin(save); rw = { coins: x.coins, xp: x.xp, chests: x.chests }; note = `<p>🔥 Racha: <b>${x.streak}</b> día${x.streak > 1 ? 's' : ''} seguidos</p>`; }
  else if (r.win) { rw = { coins: 10, xp: 15, chests: 0 }; note = '<p class="muted">Ya completaste el reto de hoy: premio reducido.</p>'; }
  const extra = applyRewards(rw); persist();
  showPanel(`<h2 class="${r.win ? 'win' : 'lose'}">${r.win ? '¡Reto superado!' : 'Reto fallido'}</h2><p>📅 Desafío del día</p>` +
    `<p>${coinIcon}<b>+${rw.coins}</b> monedas · <b>+${rw.xp}</b> XP</p>${note}${extra}${r.win ? '' : '<p class="muted">Puedes volver a intentarlo hoy.</p>'}`, modeButtons());
}

function showSurvivalResult(r) {
  const waves = r.wave || 0, rw = survivalReward(waves), newBest = waves > save.survival.best;
  if (newBest) save.survival.best = waves; save.survival.plays++;
  const extra = applyRewards(rw); persist();
  showPanel(`<h2 class="win">Fin de la supervivencia</h2><p>Oleada alcanzada: <b>${waves}</b>${newBest ? ' 🏅 <b>¡Nuevo récord!</b>' : ` <small>(mejor: ${save.survival.best})</small>`}</p>` +
    `<p>${coinIcon}<b>+${rw.coins}</b> monedas · <b>+${rw.xp}</b> XP · ${fmtTime(r.time)}</p>${extra}`, modeButtons());
}

// ---------- Resultado de batalla ----------
// Resumen de la XP de minis: las que ganaron y las que ya están listas para ascender.
function xpLine(list) {
  if (!list.length) return '';
  const full = list.filter(x => x.full), gained = list.filter(x => x.gain > 0);
  return `<p class="muted">🆙 XP de minis: ${gained.slice(0, 3).map(x => `${CARD[x.id].name} +${x.gain}`).join(' · ')}${gained.length > 3 ? ` · +${gained.length - 3} más` : ''}${full.length ? `<br>⭐ Listas para ascender: ${full.map(x => CARD[x.id].name).join(', ')}` : ''}</p>`;
}
function showResult() {
  state.rewarded = true;
  const r = state.result, m = state.mission, st = save.stats;
  st.battles++; if (r.win) st.wins++; st.kills += r.stats.kills; st.mined += Math.floor(r.stats.mined); st.deployed += r.stats.deployed; if (r.stats.bossKilled) st.bosses++; st.chests = (st.chests || 0) + (r.stats.chests || 0); st.guardians = (st.guardians || 0) + (r.stats.guardians || 0); st.nests = (st.nests || 0) + (r.stats.nests || 0); st.switches = (st.switches || 0) + (r.stats.switches || 0);
  const xpRes = awardMiniXp(save, state.deck.map(c => c.id).concat(UNIVERSAL), r.stats, r.win); // XP de las minis del mazo (techo según el rango)
  const bonus = r.bonusCoins || 0; // monedas de cofres del mapa
  if (bonus) { save.coins += bonus; toast(`🎁 +${bonus} monedas de cofres del mapa`); }
  ui.bonusLine = (bonus ? `<p>🎁 ${coinIcon}<b>+${bonus}</b> monedas de cofres del mapa</p>` : '') + xpLine(xpRes);
  netSyncSoon(save);
  const qdone = applyBattleToQuests(save, r);
  if (qdone.length) toast('📜 Misión diaria completada: ' + questText(qdone[0]));
  if (m.dungeon) { persist(); return showDungeonResult(r); }
  if (m.event) return showEventResult(r, m);
  if (m.daily) return showDailyResult(r);
  if (m.survival) return showSurvivalResult(r);
  if (m.duel) return showDuelResult(r, m);
  if (m.skull) return showSkullResult(r, m);

  const rw = rewardFor(r, m, ui.muts, ui.assist), sc = recordScore(save, m.heroic ? m.id + 'h' : m.id, r.score || 0);
  let extra = '';
  if (m.heroic) { // las heroicas no tocan estrellas ni desbloqueos: dan premio extra y se cuentan aparte
    if (r.win && !save.heroic[m.id]) { save.heroic[m.id] = true; rw.chests += 1; rw.cores = 1; extra += '<div>🔥 ¡Primera victoria heroica! +1 cofre y +1 core</div>'; }
  } else {
    const fails = recordResult(save, m.id, r.win);
    if (!r.win && fails === ASSIST_FAILS) extra += '<div>🆘 Se desbloqueó la <b>ayuda</b> para esta misión (en el briefing).</div>';
    if (r.win) recordObjectives(save, m.id, r.objs);
  }
  save.coins += rw.coins; save.cores = (save.cores || 0) + (rw.cores || 0); const ups = addXp(save, rw.xp); const lost = grantChests(save, rw.chests);
  if (!m.heroic && r.win && !save.firstWin[m.id]) {
    save.firstWin[m.id] = true;
    for (const id of m.unlock.cards) if (!save.cards.includes(id)) { save.cards.push(id); extra += `<div>🃏 Nueva mini: <b>${CARD[id].name}</b></div>`; }
    for (const id of m.unlock.leaders) if (!save.leaders.includes(id)) { save.leaders.push(id); extra += `<div>👑 Nuevo héroe: <b>${LEADER[id].name}</b></div>`; }
  }
  persist();
  const next = r.win && MISSIONS[m.id + 1] && missionUnlocked(m.id + 1) && MISSIONS[m.id + 1];
  showPanel(`<h2 class="${r.win ? 'win' : 'lose'}">${r.win ? '¡Victoria!' : 'Derrota'}</h2>` + (r.win ? `<div class="stars">${starsHtml(r.stars)}</div>` : '') +
    `<ul class="objs">${GOALS[m.goal || 'destroy'].objs.map((t, k) => `<li class="${r.objs[k] ? 'ok' : 'no'}"><b class="ck"></b> ${t}</li>`).join('')}</ul>` +
    `<p>💯 Puntuación <b>${sc.score}</b>${sc.record ? ' 🏅 <b>¡Récord!</b>' : ` <small>(récord ${sc.best})</small>`}</p><p>${coinIcon}<b>+${rw.coins}</b> monedas · <b>+${rw.xp}</b> XP · ${fmtTime(r.time)}${rw.mult !== 1 ? ` <small>(${m.heroic ? 'heroica · ' : ''}${ui.assist ? 'ayuda · ' : ''}recompensa ×${rw.mult.toFixed(2)})</small>` : ''}</p>` +
    (ups ? (setTimeout(levelUpFx, 350), `<p>⭐ ¡Subes al nivel <b>${save.level}</b>! +${50 * ups} monedas</p>`) : '') +
    (rw.chests ? `<p>🎁 +${rw.chests} cofre${rw.chests > 1 ? 's' : ''}${lost ? ' (lleno: el exceso da monedas)' : ''}</p>` : '') + extra,
    [next ? ['Siguiente', 'primary', () => openBriefing(m.id + 1)] : null, ['Reintentar', r.win ? '' : 'primary', () => launchMission(m.id, ui.muts)], ['Inicio', 'ghost', () => show('home')]].filter(Boolean));
}

// ---------- Ajustes ----------
function renderSettings() {
  $('set-sound').textContent = 'Sonido: ' + (save.settings.sound ? 'activado' : 'silenciado');
  $('set-vibrate').textContent = 'Vibración: ' + (save.settings.vibrate ? 'activada' : 'desactivada');
  $('set-sound').classList.toggle('is-on', !!save.settings.sound); $('set-vibrate').classList.toggle('is-on', !!save.settings.vibrate);
}
function openSettings() { renderSettings(); $('settings').hidden = false; }
$('set-sound').onclick = () => { save.settings.sound = !save.settings.sound; Sound.enabled = save.settings.sound; persist(); renderSettings(); Sound.play('ui'); };
$('set-vibrate').onclick = () => { save.settings.vibrate = !save.settings.vibrate; persist(); renderSettings(); buzz(30); };
$('set-close').onclick = () => { $('settings').hidden = true; };
$('set-reset').onclick = () => { if (confirm('¿Borrar todo el progreso?')) { save = defaultSave(); normalizeSave(); persist(); Sound.enabled = true; show('home'); } };

// ---------- Controles (táctil y ratón) ----------
function pos(e) { return canvasPos(e); }
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
}
canvas.addEventListener('pointermove', e => { const p = canvasPos(e); mouse.x = p.x; mouse.y = p.y; });
canvas.addEventListener('pointerdown', e => {
  const p = canvasPos(e); mouse.x = p.x; mouse.y = p.y;
  if (!state || state.over || state.paused) return;
  if (state.pingMode) { state.pingMode = false; if (sendSignal('ping', p.x, p.y)) buzz(8); return; }
  if (state.leaderArmed) { if (castLeader(p.x, p.y)) { state.leaderArmed = false; buzz(25); } }
  else if (state.selected !== null && deployFromSlot(state.selected, p.x, p.y)) buzz(12);
});
document.addEventListener('pointermove', e => {
  if (!drag || !state) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { drag.moved = true; state.selected = null; state.leaderArmed = false; }
  if (drag.moved) { const p = canvasPos(e); mouse.x = p.x; mouse.y = p.y; state.drag = { i: drag.i, active: true, x: p.x, y: p.y, over: p.inside }; }
});
document.addEventListener('pointerup', e => {
  if (!drag || !state) { drag = null; return; }
  if (drag.moved) { const p = canvasPos(e); if (p.inside && !state.over && deployFromSlot(drag.i, p.x, p.y)) buzz(12); }
  else if (state.replaceMode) { state.replaceMode = false; if (replaceSlot(drag.i)) { buzz(10); Sound.play('deploy'); } else toast('Necesitas 1 de energía'); }
  else { state.selected = state.selected === drag.i ? null : drag.i; state.leaderArmed = false; }
  state.drag = null; drag = null;
});
document.addEventListener('pointercancel', () => { drag = null; if (state) state.drag = null; });
// Los navegadores móviles solo dejan sonar tras un gesto: se activa con el primer toque.
document.addEventListener('pointerdown', () => Sound.resume(), { once: true });
document.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('.card')) Sound.play('ui'); });

// Señales: 📣 abre el menú (4 emotes y "marcar aquí"). Tienen una espera de 3 s.
(function buildSignalMenu() {
  const menu = $('signal-menu');
  for (const k of Object.keys(SIGNALS)) {
    const em = SIGNALS[k].art && ART.cos && ART.cos[SIGNALS[k].art];
    const b = el('button', 'sig', `<i>${em ? `<img src="${em.file}" alt="">` : SIGNALS[k].icon}</i><span>${k === 'ping' ? 'Marcar' : SIGNALS[k].text}</span>`);
    b.onclick = () => {
      menu.hidden = true;
      if (!state || state.over) return;
      if (state.sigCd > 0) return toast('Espera ' + Math.ceil(state.sigCd) + ' s para otra señal');
      if (k === 'ping') { state.pingMode = true; toast('Toca el mapa para marcar un punto'); } else sendSignal(k);
    };
    menu.appendChild(b);
  }
  $('signal').onclick = () => { if (!state || state.over) return; state.pingMode = false; menu.hidden = !menu.hidden; };
})();
$('next').onclick = () => { if (!state || state.over || state.paused || !state.queue.length) return; state.replaceMode = !state.replaceMode; state.selected = null; state.leaderArmed = false; if (state.replaceMode) toast('Toca la carta que quieres cambiar (cuesta 1 ⚡)'); };
$('leader').onclick = () => { if (!state.over && !state.mods.leaderOff) { state.leaderArmed = !state.leaderArmed; state.selected = null; } };
$('pause').onclick = () => { if (!state.over) state.paused = !state.paused; };
$('speed').onclick = () => { state.speed = state.speed === 1 ? 2 : 1; };
const inModes = () => state && (state.mission.dungeon || state.mission.event || state.mission.daily || state.mission.survival || state.mission.duel || state.mission.skull);
$('quit').onclick = () => {
  if (!state || state.over) return show(inModes() ? 'dungeon' : 'campaign');
  if (state.mission.survival) { // retirarse en supervivencia cierra la marca con las oleadas alcanzadas
    if (!confirm('¿Terminar la supervivencia? Conservas la recompensa de las oleadas alcanzadas.')) return;
    state.over = true; state.result = { win: false, objs: [false, false, false], stars: 0, pct: 0, time: state.t, towersLost: state.towersLost, wave: state.waveNo, stats: Object.assign({}, state.stats) };
    return;
  }
  if (state.mission.duel) { // abandonar un duelo cuenta como derrota
    if (!confirm('¿Abandonar el duelo? Cuenta como derrota y pierdes trofeos.')) return;
    state.over = true; state.result = { win: false, objs: [false, false, false], stars: 0, pct: 0, time: state.t, towersLost: state.towersLost, stats: Object.assign({}, state.stats) };
    return;
  }
  if (state.mission.dungeon) { // abandonar un nivel de mazmorra cuenta como perderlo
    if (!confirm('¿Abandonar el nivel? Perderás una vida.')) return;
    state.over = true; state.result = { win: false, objs: [false, false, false], stars: 0, pct: 0, time: state.t, towersLost: state.towersLost, stats: Object.assign({}, state.stats) };
  } else show(inModes() ? 'dungeon' : 'campaign'); // evento y desafío: salir no tiene penalización ni premio
};
document.addEventListener('visibilitychange', () => { if (document.hidden && state && !state.over) state.paused = true; });
document.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Instalación (PWA) ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('install').hidden = false; });
$('install').onclick = async () => { if (installEvt) { installEvt.prompt(); installEvt = null; $('install').hidden = true; } };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { /* sin SW */ });

// ---------- Arranque ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (current === 'battle' && state) { update(dt); draw(); updateBattleUI(); Sound.drain(state); }
  requestAnimationFrame(frame);
}
preloadAll(p => { $('loadbar').firstElementChild.style.width = Math.round(p * 100) + '%'; })
  .then(() => new Promise(res => (document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true })))) // con todo en caché la precarga acaba antes de que se ejecuten los últimos scripts
  .then(() => {
  $('loading').hidden = true;
  const wm = ART.worldMap;
  if (wm) { $('map-body').style.setProperty('--map', `url(${wm})`); $('dungeon').style.setProperty('--map', `url(${wm})`); }
  show('home');
});
window.addEventListener('resize', () => { if (current === 'battle') resizeCanvas(); });
requestAnimationFrame(frame);
