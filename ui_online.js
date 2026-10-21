// Fase D (interfaz): pestañas Estilo (cosméticos) y Online (nube, ranking, jugadores reales).
'use strict';

// ---------- Estilo: marcos, títulos y arenas (cosmetics.js) ----------
function styleTab(body) {
  ensureCos(save);
  body.appendChild(el('p', 'muted', 'Solo cambian el aspecto. Se desbloquean con logros, ligas, el pase y monedas. La arena se usa en tus duelos.'));
  [['frame', '🖼 Marcos de avatar'], ['title', '🎖 Títulos'], ['arena', '🗺 Arena de duelo']].forEach(([type, title]) => {
    const box = el('div', 'zone t-ruins'); box.append(el('h3', '', title));
    const grid = el('div', 'cosgrid');
    COSMETICS.filter(c => c.type === type).forEach(c => {
      const owned = cosOwned(save, c), eq = save.cos.equip[type] === c.id;
      const cell = el('button', 'cos' + (eq ? ' on' : '') + (owned ? '' : ' locked'), '');
      const artImg = ART.cos && ART.cos[c.id];
      const prev = el('i', 'cprev' + (artImg ? ' art' + (type === 'arena' ? ' wide' : '') : type === 'frame' ? ' ' + c.id.replace('_', '-') : ''), artImg ? `<img src="${artImg.file}" alt="">` : c.icon);
      cell.append(prev, el('b', '', c.name), el('small', '', eq ? '✔ Equipado' : owned ? 'Equipar' : (c.how.price ? `${coinIcon}${c.how.price}` : '🔒 ' + cosHow(c))));
      cell.onclick = () => {
        if (!owned && c.how.price) { const r = buyCos(save, c.id); if (r.err) return toast(r.err); Sound.play('coin'); toast(`${c.name} desbloqueado`); }
        else if (!owned) return toast('Cómo conseguirlo: ' + cosHow(c));
        equipCos(save, c.id); persist(); rerender();
      };
      grid.appendChild(cell);
    });
    box.appendChild(grid); body.appendChild(box);
  });
}

// ---------- Online: nube, ranking y jugadores reales (server/server.js) ----------
function onlineTab(body) {
  const n = netState(save), box = el('div', 'zone t-snow');
  box.append(el('h3', '', '🌐 Servidor'));
  box.append(el('p', 'muted', 'Opcional. Con un servidor (node server/server.js) puedes guardar tu partida en la nube, ver el ranking y duelar contra los mazos de otros jugadores. Sin él, el juego funciona igual.'));
  const status = el('p', 'netstatus', '');
  const setStatus = (t, bad) => { status.textContent = t; status.classList.toggle('bad', !!bad); };
  if (!netLinked(save)) {
    const url = el('input'); url.placeholder = 'Dirección del servidor (ej. 192.168.1.5:8787)'; url.value = n.url || (location.protocol.startsWith('http') ? location.origin : ''); url.autocapitalize = 'off'; url.spellcheck = false;
    const name = el('input'); name.placeholder = 'Tu nombre (máx. 16)'; name.maxLength = 16; name.value = n.name || '';
    const go = el('button', 'primary', 'Conectar y crear perfil');
    go.onclick = async () => {
      go.disabled = true; setStatus('Conectando…');
      try { await netRegister(save, url.value, name.value); await netSendProfile(save); persist(); toast('Conectado como ' + save.net.name); rerender(); }
      catch (e) { setStatus(e.message, true); go.disabled = false; }
    };
    box.append(url, name, go, status);
    body.appendChild(box); return;
  }
  box.append(el('p', '', `Conectado como <b>${n.name}</b> a <small>${n.url}</small>`));
  const row = el('div', 'row center');
  const up = el('button', '', '☁ Subir partida'), down = el('button', '', '⬇ Descargar'), out = el('button', 'ghost', 'Desconectar');
  up.onclick = async () => {
    setStatus('Subiendo…');
    try { await netSendProfile(save); await netPush(save); setStatus('✔ Partida guardada en la nube'); }
    catch (e) {
      if (e.status === 409 && confirm('La nube tiene una partida más reciente. ¿Sobrescribirla con la de este dispositivo?')) { try { await netPush(save, true); setStatus('✔ Partida guardada en la nube'); } catch (x) { setStatus(x.message, true); } }
      else setStatus(e.message, true);
    }
  };
  down.onclick = async () => {
    setStatus('Descargando…');
    try {
      const r = await netPull(save);
      if (!confirm('Esto reemplaza la partida de este dispositivo por la de la nube. ¿Continuar?')) return setStatus('Cancelado');
      if (!netApply(save, r.save, r.updated, defaultSave())) return setStatus('La partida de la nube no es válida', true);
      normalizeSave(); persist(); toast('Partida descargada'); show('home');
    } catch (e) { setStatus(e.status === 404 ? 'Aún no hay partida en la nube: súbela primero' : e.message, e.status !== 404); }
  };
  out.onclick = () => { if (confirm('¿Desconectar este dispositivo? Tu partida local se conserva.')) { netUnlink(save); persist(); rerender(); } };
  row.append(up, down, out); box.append(row, status);
  body.appendChild(box);

  const board = el('div', 'zone t-desert'); board.append(el('h3', '', '🏅 Ranking'));
  const list = el('div', 'board', '<p class="muted">Cargando…</p>'); board.appendChild(list); body.appendChild(board);
  netSendProfile(save).then(() => netBoard(save)).then(r => {
    list.innerHTML = '';
    if (!r.top.length) list.innerHTML = '<p class="muted">Aún no hay jugadores.</p>';
    r.top.forEach(p => { const row = el('div', 'brow' + (p.me ? ' me' : '')); row.append(el('i', '', p.rank), el('b', '', ''), el('small', '', `Nv ${p.level} · ${p.wins} 🏆`), el('span', '', '🏅 ' + p.best)); row.children[1].textContent = p.name; list.append(row); });
    if (r.you && r.you.rank > r.top.length) list.append(el('p', 'muted', `Tu puesto: ${r.you.rank} de ${r.you.of}`));
  }).catch(e => { list.innerHTML = ''; list.append(el('p', 'muted', 'No se pudo cargar: ' + e.message)); });
}
