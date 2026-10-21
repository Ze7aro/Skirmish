// Fase G: estructura principal de la interfaz — cabecera global, navegación de 5 espacios y las pantallas Mapa, Tienda, Ejército y Perfil.
'use strict';

// ---------- Cabecera global ----------
function renderHeader() {
  const L = LEADER[cur().leader], por = (ART.leaders && ART.leaders[L.portrait]) || '';
  if ($('avatar-img').getAttribute('src') !== por) $('avatar-img').src = por;
  $('avatar').className = ensureCos(save).equip.frame.replace('_', '-') + ((achClaimable(save).length || passClaimable(save)) ? ' notify' : '');
  $('lvl-num').textContent = 'Nv ' + save.level;
  $('xpfill').style.width = Math.round(save.xp / xpNeed(save.level) * 100) + '%';
  ensureWallet(save);
  $('gold-num').textContent = save.coins; $('wallet-energy').textContent = save.energy; $('wallet-cores').textContent = save.cores;
}
$('avatar').onclick = () => show('profile');
$('wallet-btn').onclick = () => { $('wallet').hidden = !$('wallet').hidden; };
$('wallet-shop').onclick = () => show('store');
document.addEventListener('pointerdown', e => { if (!$('wallet').hidden && !e.target.closest('#wallet') && !e.target.closest('#wallet-btn')) $('wallet').hidden = true; });
$('nav-guild').onclick = () => toast('🏰 Guild: próximamente');

function renderNavBadges() {
  $('nav-home').classList.toggle('notify', claimable() > 0 || save.chests > 0);
  $('nav-dungeon').classList.toggle('notify', dailyOpen());
  $('nav-deck').classList.toggle('notify', collectionClaimable(save).length > 0 || DECK_CARDS.concat([CARD[UNIVERSAL]]).some(c => ownsMini(save, c.id) && ascendStatus(save, c.id).ok));
}

// ---------- Mapa (pantalla principal) ----------
function renderHome() {
  const body = $('map-body'); body.innerHTML = '';
  const nextI = nextMissionIndex(); let nextEl = null;
  ZONES.forEach(z => {
    const panel = el('div', 'zone t-' + z.terrain);
    panel.append(el('h3', '', `Zona ${z.id} · ${z.name}`));
    const row = el('div', 'zrow');
    MISSIONS.filter(m => m.zone === z.id).forEach(m => {
      const ok = missionUnlocked(m.id), st = save.stars[m.id] || 0;
      const b = el('button', 'mission' + (m.boss ? ' boss' : '') + (m.id === nextI && ok ? ' next' : ''));
      b.disabled = !ok;
      b.innerHTML = `<b>${GOALS[m.goal].icon} ${m.id + 1}. ${m.name}</b><span>${m.desc}</span>` + (m.boss ? `<i class="tag">Jefe: ${BOSS[m.boss.id].name}</i>` : '') +
        `<em>${ok ? stars(st) : '🔒 Bloqueada'}</em>`;
      b.onclick = () => openBriefing(m.id);
      if (m.id === nextI) nextEl = b;
      row.appendChild(b);
    });
    panel.appendChild(row); body.appendChild(panel);
  });
  renderMapFooter(nextI);
  if (nextEl && !ui.noAuto) requestAnimationFrame(() => nextEl.scrollIntoView({ block: 'center' })); // al llegar, centra la misión en curso
}

// Pie del mapa: 3 misiones diarias, la misión en curso, los cofres y un hueco reservado para el PvP.
function renderMapFooter(nextI) {
  const f = $('map-footer'); f.innerHTML = '';
  const q = el('div', 'mf-quests');
  save.quests.list.forEach((qq, i) => {
    const done = qq.progress >= qq.target, r = questReward(qq);
    const row = el('div', 'mq' + (qq.claimed ? ' claimed' : done ? ' ready' : ''));
    row.innerHTML = `<div class="mqt"><b>${questText(qq)}</b><div class="pbar"><i style="width:${Math.round(qq.progress / qq.target * 100)}%"></i></div></div><small>${qq.progress}/${qq.target}</small>`;
    const b = el('button', done && !qq.claimed ? 'primary' : '', qq.claimed ? '✔' : done ? `${coinIcon}${r.coins}` : `${coinIcon}${r.coins}`);
    b.disabled = !done || qq.claimed;
    b.onclick = () => {
      const res = claimQuest(save, i); if (!res) return;
      persist(); Sound.play('coin'); toast(`+${res.coins} monedas · +${res.xp} XP` + (res.levelUps ? ` · ¡Nivel ${save.level}!` : '')); if (res.levelUps) levelUpFx(); rerender();
    };
    row.appendChild(b); q.appendChild(row);
  });
  const row = el('div', 'mf-row');
  const go = el('button', 'primary mf-go', `<b>▶ Misión ${nextI + 1}</b><small>${MISSIONS[nextI].name}</small>`); go.onclick = () => openBriefing(nextI);
  const ch = el('button', 'mf-chest', `<i>🎁</i><b>${save.chests}</b>`); ch.disabled = !save.chests; ch.onclick = openChestFlow;
  const pvp = el('button', 'mf-pvp locked', '<i>⚔</i><small>PvP</small><em>🔒</em>'); pvp.onclick = () => toast('⚔ PvP: próximamente (los duelos contra rivales están en Mazmorras)');
  row.append(go, ch, pvp);
  const open = !!ui.questsOpen, nq = save.quests.list.filter(x => x.claimed).length;
  const tg = el('button', 'mf-qtoggle', `📜 Misiones diarias · ${nq}/${save.quests.list.length} <i>${open ? '▴' : '▾'}</i>`);
  tg.type = 'button'; tg.setAttribute('aria-expanded', open ? 'true' : 'false');
  tg.onclick = () => { ui.questsOpen = !open; renderMapFooter(nextI); };
  q.hidden = !open;
  f.append(tg, q, row);
}

// ---------- Tienda ----------
function renderStore() {
  const body = $('store-body'); body.innerHTML = '';
  body.append(el('h2', 'ptitle', 'Tienda'));
  shopTab(body);
  body.append(packSection('🔋 Energía', 'Material para mejorar unidades. También se gana jugando.', ENERGY_PACKS, 'energy'), packSection('💠 Cores', 'Material raro para mejorar unidades a partir del nivel 3.', CORE_PACKS, 'cores'), bundleSection());
}
function packSection(title, desc, packs, kind) {
  const box = el('div', 'zone t-desert'); box.append(el('h3', '', title), el('p', 'muted', desc));
  const grid = el('div', 'packs');
  packs.forEach(p => {
    const cell = el('div', 'pack'); cell.append(el('i', 'pico', kind === 'energy' ? '🔋' : '💠'), el('b', '', '+' + p.amount), el('small', '', p.name));
    const b = el('button', save.coins >= p.price ? 'primary' : '', `${coinIcon}${p.price}`); b.disabled = save.coins < p.price;
    b.onclick = () => { const r = buyPack(save, p.id); if (r.err) return toast(r.err); persist(); Sound.play('coin'); toast(`+${r.amount} ${kind === 'energy' ? 'de energía' : 'cores'}`); rerender(); };
    cell.appendChild(b); grid.appendChild(cell);
  });
  box.appendChild(grid); return box;
}
function bundleSection() {
  const box = el('div', 'zone event'); box.append(el('h3', '', '⭐ Ofertas especiales'), el('p', 'muted', 'Paquetes con dinero real. Todavía no están disponibles: no se cobra ni se entrega nada.'));
  REAL_BUNDLES.forEach(bd => {
    const row = el('div', 'bundle'); row.innerHTML = `<div><b>${bd.name}</b><small>${bd.items.join(' · ')}</small></div>`;
    const b = el('button', '', `${bd.price}<small>Próximamente</small>`); b.disabled = !bd.available;
    row.appendChild(b); box.appendChild(row);
  });
  return box;
}

// ---------- Ejército ----------
const FACTION_ORDER = ['humans', 'ordu', 'undead', 'dwarves'];
const unlockHint = (kind, id) => { const m = MISSIONS.find(x => x.unlock && x.unlock[kind].includes(id)); return m ? `Se desbloquea al superar la misión ${m.id + 1}: ${m.name}` : 'Todavía no está disponible'; };
function renderArmy() {
  const body = $('army-body'), keep = $('deck').scrollTop; body.innerHTML = '';
  const slots = el('div', 'army-slots');
  save.slots.forEach((s, i) => { const b = el('button', save.slot === i ? 'sel' : '', `Mazo ${i + 1}<small>${s.deck.length}/${DECK_MAX}</small>`); b.onclick = () => { save.slot = i; persist(); renderArmy(); }; slots.appendChild(b); });
  body.appendChild(slots);
  body.appendChild(collectionPanel());

  // carrusel de héroes: en color los que tienes, en gris los bloqueados
  body.appendChild(el('h3', 'sec', 'Héroes'));
  const car = el('div', 'hcar'); let selEl = null;
  LEADER_LIST.forEach(l => {
    const owned = save.leaders.includes(l.id) && l.ready, sel = cur().leader === l.id;
    const b = el('button', 'hframe' + (sel ? ' sel' : '') + (owned ? '' : ' locked'));
    b.style.setProperty('--f', FACTION_COLOR[l.faction]);
    b.innerHTML = `<div class="hpic">${l.ready && ART.leaders[l.portrait] ? `<img src="${ART.leaders[l.portrait]}" alt="">` : '<div class="silh">?</div>'}${owned ? '' : '<em>🔒</em>'}</div><b>${l.name}</b><small>${FACTION_NAME[l.faction]}</small>`;
    b.onclick = () => { if (!owned) return toast(unlockHint('leaders', l.id)); if (!sel) { cur().leader = l.id; persist(); renderHeader(); renderArmy(); } else openHero(l.id); };
    if (sel) selEl = b; car.appendChild(b);
  });
  enableDragScroll(car); body.appendChild(car);

  // héroe elegido (2 filas de alto) + 6 minis (3 arriba y 3 abajo)
  const L = LEADER[cur().leader], deck = el('div', 'army-deck');
  const hc = el('button', 'hcard'); hc.style.setProperty('--f', L.color || FACTION_COLOR[L.faction]);
  hc.innerHTML = `<div class="hpic">${ART.leaders[L.portrait] ? `<img src="${ART.leaders[L.portrait]}" alt="">` : ''}</div><b>${L.name}</b><small>${L.abName}</small>`;
  hc.onclick = () => openHero(L.id); deck.appendChild(hc);
  const grid = el('div', 'mgrid');
  for (let i = 0; i < DECK_MAX; i++) {
    const id = cur().deck[i], c = id && CARD[id];
    if (!c) { const e = el('button', 'mslot empty', '<span>+</span>'); e.onclick = () => { toast('Elige una mini de la colección'); $('army-coll').scrollIntoView({ behavior: 'smooth' }); }; grid.appendChild(e); continue; }
    const s = el('button', 'mslot'); s.style.setProperty('--f', FACTION_COLOR[c.faction]); s.style.setProperty('--r', RARITY_COLOR[c.rarity]);
    s.append(el('i', 'gem', c.cost), makeIcon(c, 54), el('b', '', c.name), el('small', '', 'Nv ' + (save.levels[c.id] || 1) + rankStars(c.id)));
    s.onclick = () => openUnit(c.id); grid.appendChild(s);
  }
  deck.appendChild(grid); body.appendChild(deck);
  const dw = CARD[UNIVERSAL], uni = el('button', 'uni-row'); uni.append(makeIcon(dw, 30), el('span', '', `<b>${dw.name}</b> · siempre en tu mano, no ocupa lugar`), el('small', '', 'Nv ' + (save.levels[dw.id] || 1)));
  uni.onclick = () => openUnit(UNIVERSAL); body.appendChild(uni);

  // colección por raza
  const coll = el('div', 'coll'); coll.id = 'army-coll'; body.append(el('h3', 'sec', 'Colección'), coll);
  FACTION_ORDER.forEach(fk => {
    const list = fk === 'dwarves' ? [CARD[UNIVERSAL]] : DECK_CARDS.filter(c => c.faction === fk && c.ready);
    if (!list.length) return;
    const have = list.filter(c => save.cards.includes(c.id) || c.id === UNIVERSAL).length;
    const g = el('div', 'cgroup'); g.style.setProperty('--f', FACTION_COLOR[fk]);
    g.append(el('h4', '', `${FACTION_NAME[fk]} <small>${have}/${list.length}</small>`));
    const cg = el('div', 'cgrid');
    list.forEach(c => {
      const owned = save.cards.includes(c.id) || c.id === UNIVERSAL, inDeck = cur().deck.includes(c.id);
      const t = el('button', 'ccard' + (owned ? '' : ' locked') + (inDeck ? ' indeck' : ''));
      t.style.setProperty('--f', FACTION_COLOR[c.faction]); t.style.setProperty('--r', RARITY_COLOR[c.rarity]);
      t.append(el('i', 'gem', c.cost), makeIcon(c, 50), el('b', '', c.name), el('small', '', owned ? 'Nv ' + (save.levels[c.id] || 1) + rankStars(c.id) : '🔒'));
      t.onclick = () => openUnit(c.id); cg.appendChild(t);
    });
    g.appendChild(cg); coll.appendChild(g);
  });
  $('deck').scrollTop = keep;
  if (selEl) car.scrollLeft = selEl.offsetLeft - (car.clientWidth - selEl.offsetWidth) / 2;
}

function openUnit(id) {
  const c = CARD[id], owned = save.cards.includes(id) || id === UNIVERSAL, lvl = save.levels[id] || 1, body = $('unit-body');
  const inDeck = cur().deck.includes(id), after = () => { renderArmy(); openUnit(id); renderHeader(); };
  body.innerHTML = '';
  const head = el('div', 'uhead'); head.style.setProperty('--f', FACTION_COLOR[c.faction]);
  const ic = el('div', 'uicon'); ic.appendChild(makeIcon(c, 76));
  const rk = rankOf(save, id), cap = levelCap(save, id);
  head.append(ic, el('div', '', `<h2>${c.name}</h2><small style="color:${FACTION_COLOR[c.faction]}">${FACTION_NAME[c.faction]} · ${R.rarities[c.rarity]}</small><div class="rank" style="color:${RANK_COLORS[rk]}">${'★'.repeat(rk + 1)}${'☆'.repeat(MAX_RANK - rk)} <small>${RANK_NAMES[rk]}</small></div><div class="pips">${Array.from({ length: cap }, (_, i) => `<i class="${i < lvl && owned ? 'on' : ''}"></i>`).join('')}<small>Nv ${owned ? lvl : '—'}/${cap}</small></div>`));
  body.appendChild(head);
  if (!owned) { body.append(el('p', 'muted', unlockHint('cards', id))); }
  const m = levelMult(lvl), n = levelMult(lvl + 1);
  const stat = (k, v, nx) => `<div><small>${k}</small><b>${v}</b>${lvl < levelCap(save, id) && owned ? `<em>→ ${nx}</em>` : ''}</div>`;
  body.append(el('div', 'ustats', stat('Coste', c.cost + '⚡', c.cost + '⚡') + stat('Vida', Math.round(c.hp * m), Math.round(c.hp * n)) + stat('Daño', Math.round(c.dmg * m), Math.round(c.dmg * n))));
  if (c.dmg > 0 || c.dtype !== 'phys') { // tipo de daño y debilidades
    const DT = { phys: '⚔ Físico', magic: '✨ Mágico (ignora la armadura)', siege: '💣 Asedio' }, NM = { phys: 'físico', magic: 'mágico', siege: 'asedio' };
    const weak = Object.entries(c.res || {}).filter(([, v]) => v > 1).map(([k, v]) => `${NM[k]} +${Math.round((v - 1) * 100)}%`), tough = Object.entries(c.res || {}).filter(([, v]) => v < 1).map(([k, v]) => `${NM[k]} −${Math.round((1 - v) * 100)}%`);
    body.append(el('p', 'dtype', `Daño: <b>${DT[c.dtype || 'phys']}`.concat('</b>', weak.length ? ` · <span class="no">Recibe más: ${weak.join(', ')}</span>` : '', tough.length ? ` · <span class="ok">Resiste: ${tough.join(', ')}</span>` : '')));
  }
  if (c.ability) body.append(el('p', 'ab', `✦ <b>${c.ability.name}</b> (${c.ability.cd} s, lista ${abilityWarm(c)} s tras desplegar): ${c.ability.desc}`));
  if (c.note && c.miner) body.append(el('p', 'muted', 'Va solo a una mina libre y da energía mientras vive. Está siempre en tu mano y no ocupa lugar en el mazo.'));
  if (owned) {
    if (lvl < levelCap(save, id)) {
      const rq = upgradeReq(lvl), have = (a, b) => (a >= b ? 'ok' : 'no');
      body.append(el('div', 'ucost', `<small>Mejorar a Nv ${lvl + 1}</small><span class="${have(save.coins, rq.coins)}">${coinIcon}${save.coins}/${rq.coins}</span><span class="${have(save.energy, rq.energy)}">🔋 ${save.energy}/${rq.energy}</span>${rq.cores ? `<span class="${have(save.cores, rq.cores)}">💠 ${save.cores}/${rq.cores}</span>` : ''}`));
    }
    body.appendChild(ascendBox(c, after));
    const row = el('div', 'row center');
    const up = upgradeBtn(c, after); const tb = talentBtn(c); const closeT = tb.onclick; tb.onclick = () => { $('unit').hidden = true; closeT(); };
    row.append(up, tb);
    if (id !== UNIVERSAL) {
      const add = el('button', inDeck ? '' : 'primary', inDeck ? 'Quitar del mazo' : 'Añadir al mazo');
      add.disabled = !inDeck && cur().deck.length >= DECK_MAX;
      add.onclick = () => { cur().deck = inDeck ? cur().deck.filter(x => x !== id) : cur().deck.concat(id); persist(); after(); };
      row.appendChild(add); if (!inDeck && cur().deck.length >= DECK_MAX) body.append(el('p', 'muted', 'El mazo está lleno (6): quita una mini primero.'));
    }
    body.appendChild(row);
  }
  const cl = el('button', 'ghost', 'Cerrar'); cl.onclick = () => { $('unit').hidden = true; }; body.appendChild(cl);
  $('unit').hidden = false;
}

function openHero(id) {
  const L = LEADER[id], owned = save.leaders.includes(id) && L.ready, body = $('unit-body'), sel = cur().leader === id;
  body.innerHTML = '';
  const head = el('div', 'uhead'); head.style.setProperty('--f', FACTION_COLOR[L.faction]);
  const full = ART.leadersFull && ART.leadersFull[L.portrait];
  const ic = el('div', full ? 'uicon big hfull' : 'uicon big'); ic.innerHTML = full || ART.leaders[L.portrait] ? `<img src="${full || ART.leaders[L.portrait]}" alt=""${owned ? '' : ' style="filter:grayscale(1) brightness(.55)"'}>` : '';
  head.append(ic, el('div', '', `<h2>${L.name}</h2><small style="color:${FACTION_COLOR[L.faction]}">${FACTION_NAME[L.faction]}</small>`));
  body.append(head, el('p', 'ab', `✦ <b>${L.abName}</b>: ${L.desc}`));
  if (!owned) body.append(el('p', 'muted', unlockHint('leaders', id)));
  const row = el('div', 'row center');
  if (owned && !sel) { const b = el('button', 'primary', 'Elegir héroe'); b.onclick = () => { cur().leader = id; persist(); $('unit').hidden = true; renderHeader(); renderArmy(); }; row.appendChild(b); }
  const cl = el('button', 'ghost', 'Cerrar'); cl.onclick = () => { $('unit').hidden = true; }; row.appendChild(cl);
  body.appendChild(row); $('unit').hidden = false;
}

// ---------- Perfil (se abre desde el avatar): estadísticas, pase, logros, estilo y online ----------
let profileTab = 'perfil';
function renderProfile() {
  const tabs = $('profile-tabs'), body = $('profile-body'); tabs.innerHTML = ''; body.innerHTML = '';
  const badge = { perfil: 0, pase: passClaimable(save), logros: achClaimable(save).length, estilo: 0, online: 0 };
  [['perfil', '👤 Perfil'], ['pase', '🎟 Pase'], ['logros', '🏅 Logros'], ['estilo', '🎨 Estilo'], ['online', '🌐 Online']].forEach(([id, label]) => {
    const b = el('button', 'tab' + (profileTab === id ? ' on' : ''), label + (badge[id] ? ` <i class="badge">${badge[id]}</i>` : ''));
    b.onclick = () => { profileTab = id; renderProfile(); };
    tabs.appendChild(b);
  });
  ({ pase: passTab, logros: achTab, estilo: styleTab, online: onlineTab }[profileTab] || profileSummary)(body);
}
function profileSummary(body) {
  const L = LEADER[cur().leader], box = el('div', 'zone t-snow pro');
  box.innerHTML = `<div class="pro-head"><div class="pro-pic ${ensureCos(save).equip.frame.replace('_', '-')}">${ART.leaders[L.portrait] ? `<img src="${ART.leaders[L.portrait]}" alt="">` : ''}</div>` +
    `<div><h2>Nivel ${save.level}</h2><small>${equippedTitle(save)} · ${L.name}</small><div class="xpbar"><i style="width:${Math.round(save.xp / xpNeed(save.level) * 100)}%"></i></div><small>${save.xp} / ${xpNeed(save.level)} XP</small></div></div>`;
  body.appendChild(box);
  const s = save.stats, st = el('div', 'zone t-ruins'); st.append(el('h3', '', 'Estadísticas'));
  st.append(el('div', 'stats', [['Batallas', s.battles], ['Victorias', s.wins], ['Enemigos derrotados', s.kills], ['Energía minada', s.mined], ['Cartas desplegadas', s.deployed], ['Jefes derrotados', s.bosses], ['Cofres del mapa', s.chests || 0], ['Interruptores', s.switches || 0], ['Guardianes vencidos', s.guardians || 0], ['Nidos destruidos', s.nests || 0], ['Puntos de récord', totalScore(save)]]
    .map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`).join('')));
  body.appendChild(st);
  const set = el('button', 'big', '⚙ Ajustes'); set.onclick = openSettings; body.appendChild(set);
}

// ---------- Arrastre con ratón en carruseles ----------
// Con el dedo el navegador ya desliza solo; con el ratón no, así que se arrastra a mano. La rueda también mueve el carrusel de lado.
// Si el gesto fue un arrastre (más de 6 px) se cancela el clic para no elegir un héroe sin querer.
function enableDragScroll(box) {
  let down = null, moved = false;
  box.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = { x: e.clientX, left: box.scrollLeft }; moved = false;
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!moved && Math.abs(dx) > 6) { moved = true; box.classList.add('dragging'); }
    if (moved) box.scrollLeft = down.left - dx;
  });
  const end = () => { if (!down) return; down = null; setTimeout(() => box.classList.remove('dragging'), 0); };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  box.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  box.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && box.scrollWidth > box.clientWidth) { box.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
}

// ---------- Rango, XP de mini y nivel de colección (Fase I) ----------
const rankStars = id => { const r = rankOf(save, id); return r ? ' <span class="rs" style="color:' + RANK_COLORS[r] + '">' + '★'.repeat(r) + '</span>' : ''; };

// Caja de la ficha: barra de XP con su techo y requisitos para ascender.
function ascendBox(c, after) {
  const id = c.id, st = ascendStatus(save, id), box = el('div', 'ascend');
  if (st.max) { box.innerHTML = '<b>★ Rango máximo</b><small>Leyenda: ya no gana XP.</small>'; return box; }
  const pct = Math.round(st.have.xp / st.need.xp * 100), req = (ok, txt) => `<span class="${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${txt}</span>`;
  box.innerHTML = `<b>Ascender a ${RANK_NAMES[st.rank + 1]}</b><div class="pbar"><i style="width:${pct}%"></i></div><small>XP ${st.have.xp}/${st.need.xp}${st.have.xp >= st.need.xp ? ' · ¡techo alcanzado!' : ' · gana XP jugando con ella'}</small>` +
    `<div class="ucost">${req(st.have.level >= st.need.level, 'Nivel ' + st.have.level + '/' + st.need.level)}${req(st.have.xp >= st.need.xp, 'XP')}${req(st.have.coins >= st.need.coins, coinIcon + st.need.coins)}${req(st.have.cores >= st.need.cores, '💠 ' + st.need.cores)}</div>` +
    `<small>Da +1 al nivel máximo y +5% de fuerza.</small>`;
  const b = el('button', st.ok ? 'primary' : '', 'Ascender'); b.disabled = !st.ok;
  b.onclick = () => { const r = ascendCard(save, id); if (r.err) return toast(r.err); persist(); Sound.play('capture'); toast(`${c.name} asciende a ${RANK_NAMES[r.rank]}`); after(); };
  box.appendChild(b); return box;
}

// Panel de nivel de colección con el próximo premio y los que ya puedes reclamar.
function collectionPanel() {
  const cl = collectionLevel(save), next = collectionNext(save), ready = collectionClaimable(save), box = el('div', 'collpanel');
  const prev = [...COLLECTION_MILESTONES].reverse().find(m => cl >= m.at), from = prev ? prev.at : 0, to = next ? next.at : cl, pct = next ? Math.max(0, Math.min(100, Math.round((cl - from) / (to - from) * 100))) : 100;
  const rtxt = m => [m.coins ? coinIcon + m.coins : '', m.energy ? '🔋' + m.energy : '', m.cores ? '💠' + m.cores : '', m.chests ? '🎁' + m.chests : ''].filter(Boolean).join(' ');
  box.innerHTML = `<div class="ch"><b>📚 Nivel de colección ${cl}</b><small>${next ? 'Próximo premio al ' + next.at + ': ' + rtxt(next) : 'Todos los premios reclamados'}</small></div><div class="pbar"><i style="width:${pct}%"></i></div>`;
  if (ready.length) { const b = el('button', 'primary', `Reclamar ${ready.length} premio${ready.length > 1 ? 's' : ''}`); b.onclick = () => { let t = ''; for (const m of ready) { const r = claimCollection(save, m.at); if (r) t += rtxt(r) + ' '; } persist(); Sound.play('coin'); toast('📚 ' + t); rerender(); }; box.appendChild(b); }
  return box;
}
