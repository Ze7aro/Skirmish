// Genera docs/ENCARGO_ARTE.md con las fichas que aún no tienen arte (status != listo) a partir del roster. Uso: node tools/make_art_brief.js
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const r = JSON.parse(fs.readFileSync(path.join(root, 'data', 'kota_roster.json'), 'utf8'));
const prompt = fs.readFileSync(path.join(root, '..', 'assets', 'AI_ART_PROMPT.md'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean).join(' ');
const F = { humans: 'Humanos', ordu: 'Ordu', undead: 'No Muertos', dwarves: 'Enanos' };
const pend = r.units.filter(u => !u.art && !u.proc); // el enano minero se dibuja por código (proc)
let md = `# Encargo de arte pendiente\n\nGenerado con \`node tools/make_art_brief.js\`. Mientras no tengan arte estas fichas quedan desactivadas en el juego (no salen en mazos ni rivales); cuando exista se añade a \`assets/\` y se corre \`tools/build_art.py\`.\n\n` +
  `**Formato de entrega** (igual que el resto de KOTA): hoja ortográfica con vistas frontal, 3/4, lateral y trasera; idle (4–8 cuadros), caminar, ataque y muerte; fondo transparente, 2.5D, estilo *Hero Stylized Fantasy*.\n\n` +
  `**Prompt base común:** ${prompt}\n\n## Minis sin ilustrar (${pend.length})\n`;
for (const u of pend) {
  md += `\n### ${u.name} (\`${u.id}\`)\n- Facción: ${F[u.faction]} · Coste ${u.cost} · ${u.rarity}\n- Rol: ${(u.roles || []).join(', ')} · ${u.targets.join('/')}${u.flying ? ' · VUELA' : ''}\n` +
    `- Despliegue: ${u.spawn.count} unidad(es), formación ${u.spawn.formation}\n- Silueta: debe leerse a 40 px; ${u.flying ? 'alas bien marcadas' : 'arma o rasgo grande y reconocible'}.\n`;
}
const L = (r.leaders || []).filter(l => !l.portrait);
md += `\n## Héroes sin retrato (${L.length})\n`;
for (const l of L) md += `\n### ${l.name || l.id} (\`${l.id}\`)\n- Facción: ${F[l.faction] || l.faction}\n- Habilidad: ${l.abName || l.ability || '—'}\n- Retrato de busto 3/4 con el arma o símbolo de la habilidad, sobre fondo transparente.\n`;
md += `\n## Cosméticos (opcional)\nLos marcos de avatar de la Fase D son CSS. Si se quiere arte propio: marcos circulares de 96×96 px (Bosque, Calavera, Oro viejo, Dorado, Escarcha, Fuego, Mítico) y 5 miniaturas de arena de 160×100 px.\n`;
fs.writeFileSync(path.join(root, 'docs', 'ENCARGO_ARTE.md'), md);
console.log('escrito docs/ENCARGO_ARTE.md:', pend.length, 'minis,', L.length, 'héroes');
