// Fase C (interfaz): duelo contra rival simulado, tienda diaria, pase de temporada y logros.
'use strict';

// ---------- Duelo (tarjeta en la pantalla Modos) ----------
// Insignia de liga (design_complete); si falta, queda el emoji de la liga.
const leagueBadge = i => { const b = ART.cos && ART.cos['badge_' + ['bronze', 'silver', 'gold', 'platinum', 'diamond'][i]]; return b ? `<img class="lgb" src="${b.file}" alt="">` : ''; };
function duelCard() {
  const d = duelState(save), li = leagueIndex(d.trophies), L = LEAGUES[li], next = LEAGUES[li + 1], box = el('div', 'zone t-ruins duel');
  const pct = next ? Math.round((d.trophies - L.from) / (next.from - L.from) * 100) : 100;
  box.innerHTML = `<h3>⚔ Duelo contra un rival</h3><p class="muted">Un rival simulado juega con tus mismas reglas: su propia energía, su mano de cartas y su zona de despliegue. ` +
    `Derriba su base antes de que caiga la tuya. Gana trofeos para subir de liga.</p>` +
    `<p class="league"><b>${leagueBadge(li) || L.icon} ${L.name}</b> · 🏅 <b>${d.trophies}</b>${next ? ` <small>(${next.icon} ${next.name} a ${next.from})</small>` : ' <small>liga máxima</small>'}</p>` +
    `<div class="pbar"><i style="width:${pct}%"></i></div><small class="muted">${d.wins} victorias · ${d.losses} derrotas${d.streak > 1 ? ` · 🔥 racha de ${d.streak}` : ''}</small>`;
  const row = el('div', 'tiers');
  duelOffers(save).forEach(r => {
    const b = el('button', 'tier rival', `<b>${r.name}</b><small>${r.title} · Nv ${r.level}</small><small>${r.label}</small><small class="tro">+${r.win} / −${r.lose} 🏅</small>`);
    b.onclick = () => launchDuel(r);
    row.appendChild(b);
  });
  box.appendChild(row);
  if (netLinked(save)) {
    const g = el('button', 'ghostbtn', '👥 Duelo contra un jugador real');
    g.onclick = async () => {
      g.disabled = true; g.textContent = 'Buscando…';
      try { const r = await netGhosts(save); if (!r.ghosts.length) toast('Aún no hay otros jugadores con mazo en el servidor'); else launchDuel(ghostRival(r.ghosts[0], d.seed)); }
      catch (e) { toast('Sin conexión: ' + e.message); }
      g.disabled = false; g.textContent = '👥 Duelo contra un jugador real';
    };
    box.appendChild(g);
  }
  return box;
}
function launchDuel(rival) {
  ui.muts = []; ui.replay = () => show('dungeon');
  beginBattle(duelMission(rival, equippedTerrain(save)), cur().deck, cur().leader, {});
}
function showDuelResult(r, m) {
  const rival = m.rival, res = duelResult(save, rival, r.win), extra = applyRewards(res.rw), tro = res.delta, sc = recordScore(save, 'duel', r.score || 0);
  syncAch(save); persist();
  showPanel(`<h2 class="${r.win ? 'win' : 'lose'}">${r.win ? '¡Duelo ganado!' : 'Duelo perdido'}</h2><p>⚔ ${rival.name} · ${rival.title} (Nv ${rival.level})</p>` +
    `<p>🏅 <b>${tro >= 0 ? '+' : ''}${tro}</b> trofeos → <b>${res.trophies}</b> ${leagueBadge(LEAGUES.indexOf(res.league)) || res.league.icon} ${res.league.name}</p><p>💯 Puntuación <b>${sc.score}</b>${sc.record ? ' 🏅 <b>¡Récord!</b>' : ` <small>(récord ${sc.best})</small>`}</p>` +
    (res.promoted ? `<p>🎉 <b>¡Subes a la liga ${res.league.name}!</b></p>` : '') +
    `<p>${coinIcon}<b>+${res.rw.coins}</b> monedas · <b>+${res.rw.xp}</b> XP · ${fmtTime(r.time)}</p>` +
    (r.win && res.streak > 1 ? `<p>🔥 Racha de <b>${res.streak}</b> victorias</p>` : '') + extra,
    [['Nuevo duelo', 'primary', () => show('dungeon')], ['Inicio', 'ghost', () => show('home')]]);
}

// ---------- Tienda, pase y logros ----------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function shopTab(body) {
  const sh = ensureShop(save), box = el('div', 'zone t-forest');
  const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
  box.innerHTML = `<h3>Ofertas del día</h3><small class="countdown">Nuevas en ${fmtCountdown(midnight - new Date())}</small><p class="muted">Se pagan con las monedas que ganas jugando. Cada oferta se compra una vez al día.</p>`;
  const grid = el('div', 'offers');
  sh.offers.forEach(o => {
    const bought = !!sh.bought[o.key], card = o.card && CARD[o.card];
    const t = { chest: ['🎁', 'Cofre', 'Monedas y, a veces, un nivel gratis'], xp: ['⭐', 'Experiencia', `+${o.xp} XP`],
      upgrade: [null, card && card.name, card && `Sube a Nv ${(save.levels[o.card] || 1) + 1} · sin energía ni cores`], card: [null, card && card.name, 'Mini nueva para tu colección'] }[o.kind];
    const cell = el('div', 'offer' + (bought ? ' bought' : ''));
    const ic = el('div', 'oicon'); if (card) { ic.style.setProperty('--f', FACTION_COLOR[card.faction]); ic.appendChild(makeIcon(card, 44)); } else ic.textContent = t[0];
    cell.append(ic, el('div', 'otxt', `<b>${t[1]}</b><small>${t[2]}</small>`));
    const b = el('button', bought ? '' : 'primary', bought ? '✔ Comprada' : `${coinIcon}${o.price}`);
    b.disabled = bought || save.coins < o.price;
    b.onclick = () => {
      const r = buyOffer(save, o.key); if (r.err) return toast(r.err);
      persist(); Sound.play('coin'); toast(r.kind === 'chest' ? '🎁 Cofre comprado' : r.kind === 'card' ? `🃏 ${CARD[r.card].name} es tuya` : r.kind === 'upgrade' ? `⬆ ${CARD[r.card].name} sube a Nv ${save.levels[r.card]}` : '⭐ XP añadida');
      rerender();
    };
    cell.appendChild(b); grid.appendChild(cell);
  });
  box.appendChild(grid); body.appendChild(box);
}

function passTab(body) {
  const p = ensurePass(save), tier = passTier(save), now = new Date();
  const box = el('div', 'zone t-snow');
  box.innerHTML = `<h3>🎟 Pase de ${MESES[now.getMonth()]}</h3><small class="countdown">Termina en ${fmtCountdown(seasonEnd(now) - now)}</small>` +
    `<p class="muted">Gratis. Cada ${PASS_XP} XP que ganas jugando desbloquea un nivel con premio. Al acabar el mes se reinicia: reclama a tiempo.</p>` +
    `<p>Nivel <b>${tier}</b> / ${PASS_TIERS}</p><div class="pbar"><i style="width:${Math.round(p.xp / (PASS_TIERS * PASS_XP) * 100)}%"></i></div>` +
    `<small class="muted">${tier >= PASS_TIERS ? 'Pase completado' : `${p.xp % PASS_XP} / ${PASS_XP} XP para el nivel ${tier + 1}`}</small>`;
  const all = passClaimable(save);
  if (all) { const b = el('button', 'primary', `Reclamar todo (${all})`); b.onclick = () => { let c = 0, k = 0; for (let i = 1; i <= tier; i++) { const r = claimPass(save, i); if (r) { c += r.coins; k += r.chests; } } persist(); Sound.play('coin'); toast(`+${c} monedas${k ? ` · 🎁 ${k}` : ''}`); rerender(); }; box.appendChild(b); }
  body.appendChild(box);
  const list = el('div', 'zone t-desert passlist');
  for (let i = 1; i <= PASS_TIERS; i++) {
    const rw = passReward(i), got = p.claimed.includes(i), open = i <= tier;
    const row = el('div', 'prow' + (got ? ' claimed' : open ? ' open' : ''));
    row.innerHTML = `<i class="pn">${i}</i><span>${coinIcon}${rw.coins}${rw.chests ? ` · 🎁×${rw.chests}` : ''}</span>`;
    const b = el('button', open && !got ? 'primary' : '', got ? '✔' : open ? 'Reclamar' : '🔒'); b.disabled = got || !open;
    b.onclick = () => { const r = claimPass(save, i); if (!r) return; persist(); Sound.play('coin'); toast(`+${r.coins} monedas${r.chests ? ` · 🎁 ${r.chests}` : ''}`); rerender(); };
    row.appendChild(b); list.appendChild(row);
  }
  body.appendChild(list);
  const cal = el('div', 'zone event'); cal.append(el('h3', '', '📆 Calendario de eventos'));
  eventCalendar(now, 4).forEach((c, i) => {
    const f = d => `${d.getDate()}/${d.getMonth() + 1}`;
    cal.append(el('div', 'calrow' + (i === 0 ? ' now' : ''), `<i>${c.ev.icon}</i><div><b>${c.ev.name}</b><small>${i === 0 ? 'Ahora' : f(c.start)} → ${f(c.end)}</small></div>`));
  });
  body.appendChild(cal);
}

function achTab(body) {
  syncAch(save);
  const rank = a => achDone(save, a) ? (save.ach.claimed[a.id] ? 2 : 0) : 1;
  const list = ACHIEVEMENTS.slice().sort((a, b) => rank(a) - rank(b) || (b.fam.get(save) / b.target) - (a.fam.get(save) / a.target));
  const done = ACHIEVEMENTS.filter(a => save.ach.claimed[a.id]).length;
  const box = el('div', 'zone t-ruins'); box.append(el('h3', '', `Logros · ${done}/${ACHIEVEMENTS.length}`));
  list.forEach(a => {
    const ok = achDone(save, a), got = !!save.ach.claimed[a.id], v = achValue(save, a);
    const row = el('div', 'quest' + (got ? ' claimed' : ''));
    row.innerHTML = `<div class="qtxt"><b>${a.icon} ${a.name}</b> <small>${a.desc}</small><div class="pbar"><i style="width:${Math.round(v / a.target * 100)}%"></i></div>` +
      `<small>${v} / ${a.target} · ${coinIcon}${a.reward.coins} · ${a.reward.xp} XP${a.reward.chests ? ' · 🎁' : ''}</small></div>`;
    const b = el('button', ok && !got ? 'primary' : '', got ? '✔' : 'Reclamar'); b.disabled = !ok || got;
    b.onclick = () => {
      const r = claimAch(save, a.id); if (!r) return; persist(); Sound.play('coin');
      toast(`🏅 ${a.name}: +${r.coins} monedas · +${r.xp} XP${r.chests ? ' · 🎁' : ''}`); rerender();
    };
    row.appendChild(b); box.appendChild(row);
  });
  body.appendChild(box);
}

// ---------- Camino de calaveras (Fase F) ----------
function skullCard() {
  const sk = save.skull, box = el('div', 'zone t-volcanic skull');
  box.innerHTML = `<h3>💀 Camino de calaveras</h3><p class="muted">${SKULL_LEVELS} batallas de dificultad creciente con mutadores fijos. Supera una calavera para abrir la siguiente. La 1.ª vez da un gran premio.</p>` +
    `<p>Mejor: <b>${sk.best}/${SKULL_LEVELS}</b></p>`;
  const grid = el('div', 'skullgrid');
  for (let n = 1; n <= SKULL_LEVELS; n++) {
    const open = skullUnlocked(save, n), done = !!sk.cleared[n], muts = SKULL_MUTS[n - 1].map(id => MUTATOR[id].icon).join('');
    const b = el('button', 'skullbtn' + (done ? ' done' : '') + (!open ? ' locked' : ''), `<b>${open ? '💀' + n : '🔒'}</b><small>${done ? '✔' : muts || '—'}</small>`);
    b.disabled = !open; b.onclick = () => launchSkull(n);
    grid.appendChild(b);
  }
  box.appendChild(grid);
  return box;
}
function launchSkull(level) {
  ui.muts = []; ui.assist = false; ui.replay = () => launchSkull(level);
  beginBattle(skullMission(level), cur().deck, cur().leader, skullMods(level));
}
function showSkullResult(r, m) {
  const lvl = m.skull, first = r.win && !save.skull.cleared[lvl], rw = r.win ? skullReward(lvl, first) : { coins: 8, xp: 10, chests: 0 }, sc = recordScore(save, 'k' + lvl, r.score || 0);
  if (r.win) { save.skull.cleared[lvl] = true; save.skull.best = Math.max(save.skull.best, lvl); }
  const extra = applyRewards(rw); syncAch(save); persist();
  const buttons = [];
  if (r.win && lvl < SKULL_LEVELS) buttons.push(['Siguiente calavera', 'primary', () => launchSkull(lvl + 1)]);
  buttons.push(['Reintentar', r.win ? '' : 'primary', () => launchSkull(lvl)], ['Modos', 'ghost', () => show('dungeon')]);
  showPanel(`<h2 class="${r.win ? 'win' : 'lose'}">${r.win ? '¡Calavera superada!' : 'Derrota'}</h2><p>💀 Nivel ${lvl}: ${m.name.replace(/^Calavera \d+: /, '')}</p>` +
    `<p>💯 Puntuación <b>${sc.score}</b>${sc.record ? ' 🏅 <b>¡Récord!</b>' : ` <small>(récord ${sc.best})</small>`}</p><p>${coinIcon}<b>+${rw.coins}</b> monedas · <b>+${rw.xp}</b> XP · ${fmtTime(r.time)}${r.win && !first ? ' <small>(repetición)</small>' : ''}</p>` +
    (first ? '<p>🏆 <b>¡Primera vez!</b> Premio completo</p>' : '') + (r.win && lvl === SKULL_LEVELS ? '<p>👑 <b>¡Has completado el Camino de calaveras!</b></p>' : '') + extra, buttons);
}
