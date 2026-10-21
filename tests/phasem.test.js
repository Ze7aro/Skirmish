// Fase M: VFX nuevos, cosméticos y kit de interfaz de design_complete.
// Uso: node tests/phasem.test.js
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FALLA:', msg); } else console.log('ok   ', msg); };
const mf = JSON.parse(read('art/manifest.json'));
ok(JSON.stringify(JSON.parse(read('art/manifest.js').replace(/^window\.KOTA_ART = /, '').replace(/;\s*$/, ''))) === JSON.stringify(mf), 'manifest.js y manifest.json sincronizados');
const names = Object.keys(mf.vfx2 || {});
ok(names.length === 23 && names.every(n => mf.vfx2[n].n === 8) && fs.existsSync(path.join(dir, mf.vfx2Sheet)), '23 VFX nuevos de 8 fotogramas y la hoja existe');
const game = read('game.js');
const used = [...game.matchAll(/fxv\((?:'(\w+)'|L\.id \+ '(_power)')/g)].map(m => m[1] || 'power');
ok(used.filter(n => n !== 'power').every(n => mf.vfx2[n]), 'todos los VFX que usa el motor existen en la hoja nueva: ' + [...new Set(used)].join(', '));
ok(['human_commander', 'blade_mistress', 'ordu_warchief', 'ordu_leader2', 'undead_crypt_lord', 'undead_leader2'].every(h => mf.vfx2[h + '_power']), 'cada héroe tiene su VFX de poder');
const render = read('render.js');
ok(/function vfxSrc/.test(render) && /ART\.vfx2Sheet/.test(render), 'el renderizador elige entre la hoja antigua y la nueva');
ok(Object.keys(mf.ui).length >= 35 && Object.values(mf.ui).every(e => fs.existsSync(path.join(dir, e.file))), 'kit de interfaz: ≥35 componentes y los archivos existen');
ok(['badge', 'frame', 'emote', 'arena'].every(p => Object.keys(mf.cos).filter(k => k.startsWith(p + '_')).length >= 5) && Object.values(mf.cos).every(e => fs.existsSync(path.join(dir, e.file))), 'cosméticos: insignias, marcos, emotes y arenas empaquetados');
const cosJs = read('cosmetics.js');
ok(['bosque', 'calavera', 'oro', 'dorado', 'escarcha', 'fuego', 'mitico'].every(f => mf.cos['frame_' + f] && new RegExp('frame_' + f).test(cosJs)), 'cada marco de avatar del juego tiene su arte');
ok(['forest', 'desert', 'ruins', 'snow', 'volcanic'].every(t => mf.cos['arena_' + t]), 'cada arena tiene su miniatura');
const ui = read('ui.js'), gm = read('game.js');
ok(/uiVfx\('level_up'/.test(read('render.js')) && /levelUpFx/.test(ui) && mf.vfx2.level_up, 'level_up se muestra al mejorar una carta y al subir de nivel');
ok(/fxv\('lightning_chain'/.test(gm) && mf.vfx2.lightning_chain, 'la cadena de rayos dibuja lightning_chain');
ok(ui.includes('class="ck"') && mf.ui.check_on && mf.ui.check_off && mf.ui.toast_bell, 'checks en los objetivos y aviso con la campana del kit');
console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
