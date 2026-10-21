// Datos del juego derivados de data/kota_roster.js (fuente única). Contenido original de KOTA.
'use strict';

const R = window.KOTA_ROSTER;
const TILE_R = R.units_scale.tile_range_px, TILE_S = R.units_scale.tile_speed_px_s, MELEE_PX = R.units_scale.melee_px;
const FACTION_COLOR = { humans: '#2F5FD0', ordu: '#C04040', undead: '#8A5AC8', dwarves: '#B8862A' };
const RARITY_COLOR = ['#9aa5b5', '#5ac85a', '#4a8aff', '#b060ff', '#ffb030'];
const MAX_CARD_LEVEL = 5;
const upgradeCost = lvl => 30 * lvl;

// Ficha de roster -> unidad del motor (alcance en casillas -> px, velocidad en casillas/s -> px/s).
function toCard(u) {
  const melee = u.range <= 1;
  const c = {
    id: u.id, name: u.name, faction: u.faction, art: u.art, proc: u.proc || null, ready: !!(u.art || u.proc), status: u.status, note: u.note || '', miner: !!u.miner,
    cost: u.cost, rarity: Math.max(0, R.rarities.indexOf(u.rarity)), roles: u.roles,
    hp: u.hp, dmg: u.dmg, armor: u.armor || 0, cd: u.atk, count: u.spawn.count, formation: u.spawn.formation,
    flying: !!u.flying, targetsAir: u.targets.includes('air'), ranged: !melee,
    range: melee ? MELEE_PX : u.range * TILE_R, speed: u.speed * TILE_S,
    splash: u.splash_px || (u.roles.includes('area') ? 30 : 0),
    heal: u.heal ? { amount: u.heal, range: u.range * TILE_R } : null,
    charge: !!u.charge, siege: u.vs_buildings_mult || 0, buildingsOnly: !!u.buildingsOnlyFocus,
    slow: u.slow || 0, stealth: !!u.stealth, summons: u.summons || null,
    ability: u.ability || null, chain: u.chain || 0, // habilidad automática con enfriamiento / rayo encadenado (saltos extra)
  };
  c.r = u.flying ? 11 : u.hp >= 400 ? 16 : u.hp >= 250 ? 13 : c.count > 1 ? 8 : 10;
  c.h = Math.max(38, Math.min(84, c.r * 4.6)); // alto del sprite en pantalla (px lógicos)
  c.color = FACTION_COLOR[u.faction];
  return c;
}
const CARD_LIST = R.units.map(toCard);
const CARD = Object.fromEntries(CARD_LIST.map(c => [c.id, c]));
// Tipos de daño (Fase H): 'phys' (por defecto), 'magic' (ignora la armadura) y 'siege'. res = multiplicador de daño recibido por tipo (>1 débil, <1 resistente).
const DTYPE = { human_mage: 'magic', undead_lich: 'magic', ordu_shaman: 'magic', undead_dragon: 'magic', undead_wraith: 'magic', ordu_bomber: 'siege', ordu_siege_beast: 'siege' };
const RES = {
  human_warrior: { magic: 1.2 }, human_paladin: { phys: 0.9, magic: 0.85 }, human_mage: { phys: 1.1 },
  undead_skeletons: { phys: 0.8, magic: 1.25 }, undead_wraith: { phys: 0.65 }, undead_abomination: { phys: 0.9, magic: 1.1 },
  undead_gargoyle: { phys: 0.8, magic: 1.2 }, undead_lich: { magic: 0.8 }, ordu_siege_beast: { siege: 0.8 },
};
CARD_LIST.forEach(c => { c.dtype = DTYPE[c.id] || 'phys'; c.res = RES[c.id] || {}; });
const START_CARDS = ['human_warrior', 'human_archer', 'ordu_grunt', 'ordu_bomber', 'undead_skeletons', 'human_griphon'];
// El enano minero es una carta universal: siempre disponible, fuera del mazo y sin rotar.
const UNIVERSAL = 'dwarf_miner';
const DECK_CARDS = CARD_LIST.filter(c => c.id !== UNIVERSAL); // lo que se puede meter en el mazo
const DECK_MAX = 6, HAND_SIZE = 4;                            // mano de 4; el resto espera en la cola

// Héroes: la habilidad se lanza apuntando a un punto del mapa.
const LEADER_DESC = {
  rally: 'Los aliados en el área ganan +50% de velocidad y ataque durante 6 s.',
  blades: 'Una tormenta de cuchillas causa 90 de daño a los enemigos en el área.',
  bloodcall: 'Los aliados en el área entran en furia: +50% velocidad y +30% de daño durante 6 s.',
  healing_totem: 'Un tótem cura 110 de vida a los aliados en el área.',
  bone_army: 'Invoca un grupo de esqueletos en tu zona de despliegue.',
  curse_fog: 'Niebla que causa 45 de daño y ralentiza 4 s a los enemigos en el área.',
};
const LEADER_LIST = R.leaders.map(l => ({
  id: l.id, name: l.name, faction: l.faction, portrait: l.portrait, ready: l.status === 'arte_listo',
  ability: l.ability.id, abName: l.ability.name, desc: LEADER_DESC[l.ability.id] || '', color: FACTION_COLOR[l.faction],
  cooldown: l.ability.cooldown, radius: l.ability.radius || 70, spec: l.ability, startGold: 5, towerMult: 1,
}));
const LEADER = Object.fromEntries(LEADER_LIST.map(l => [l.id, l]));
const START_LEADERS = ['human_commander'];

// Jefes: estadísticas base; las habilidades vienen del roster (nombres = VFX de KOTA_VFX/boss_abilities).
const BOSS_STATS = {
  boss_raizantiguo: { hp: 1900, dmg: 40, range: 14, speed: 20, cd: 1.6, r: 22, ranged: false, targetsAir: false },
  boss_capitan_saqueador: { hp: 1700, dmg: 44, range: 14, speed: 34, cd: 1.3, r: 20, ranged: false, targetsAir: false },
  boss_guardian_piedra: { hp: 2400, dmg: 48, range: 14, speed: 18, cd: 1.8, r: 24, ranged: false, targetsAir: false, armor: 0.2 },
  boss_nigromante_tumulo: { hp: 1500, dmg: 34, range: 100, speed: 24, cd: 1.4, r: 20, ranged: true, targetsAir: true },
  boss_senor_cripta: { hp: 2200, dmg: 40, range: 90, speed: 24, cd: 1.4, r: 22, ranged: true, targetsAir: true },
  // Jefes de expansión (Fase L)
  boss_swamp_hydra: { hp: 2000, dmg: 38, range: 60, speed: 20, cd: 1.5, r: 23, ranged: true, targetsAir: false },
  boss_crab_king: { hp: 1800, dmg: 46, range: 14, speed: 28, cd: 1.4, r: 21, ranged: false, targetsAir: false, armor: 0.15 },
  boss_forge_golem: { hp: 2500, dmg: 50, range: 14, speed: 17, cd: 1.8, r: 24, ranged: false, targetsAir: false, armor: 0.25 },
  boss_ice_colossus: { hp: 2300, dmg: 44, range: 14, speed: 18, cd: 1.7, r: 24, ranged: false, targetsAir: false, armor: 0.2 },
  boss_spider_queen: { hp: 1600, dmg: 36, range: 95, speed: 26, cd: 1.3, r: 20, ranged: true, targetsAir: true },
};
const BOSS = Object.fromEntries(R.bosses.map(b => [b.id, Object.assign({
  id: b.id, name: b.name, art: b.art, ready: true, abilities: b.abilities, zone: b.zone, terrain: b.terrain, boss: true,
  cost: 0, count: 1, flying: false, armor: 0, h: 118, roles: ['boss'], rarity: 4, color: '#701818',
}, BOSS_STATS[b.id])]));

// ---------- Zonas y misiones (5 zonas x 2 misiones; la 2.ª lleva jefe) ----------
const ZONES = [
  { id: 1, terrain: 'forest', name: 'Bosque susurrante', enemy: 'ordu' },
  { id: 2, terrain: 'desert', name: 'Dunas ardientes', enemy: 'ordu' },
  { id: 3, terrain: 'ruins', name: 'Ruinas olvidadas', enemy: 'undead' },
  { id: 4, terrain: 'snow', name: 'Páramo helado', enemy: 'undead' },
  { id: 5, terrain: 'volcanic', name: 'Cráter maldito', enemy: 'undead' },
  // Capítulo 2 (Fase B): mismos terrenos, pero con objetivos distintos a "destruir la base".
  { id: 6, terrain: 'forest', name: 'Claro de los robles', enemy: 'ordu' },
  { id: 7, terrain: 'desert', name: 'Oasis disputado', enemy: 'ordu' },
  { id: 8, terrain: 'ruins', name: 'Cripta sellada', enemy: 'undead' },
  { id: 9, terrain: 'snow', name: 'Paso helado', enemy: 'undead' },
  { id: 10, terrain: 'volcanic', name: 'Forja maldita', enemy: 'undead' },
];

// ---------- Tipos de objetivo (Fase B) ----------
// Cada misión tiene un objetivo principal y 3 estrellas independientes (la 1.ª es siempre cumplir el objetivo).
const GOALS = {
  destroy: { name: 'Destruir la base', icon: '🏰', desc: 'Destruye la base enemiga antes de que se acabe el tiempo.', objs: ['Destruye la base enemiga', 'Conserva al menos el 60% de tu base', 'No pierdas ninguna torre'] },
  defend: { name: 'Defender', icon: '🛡', desc: 'Resiste hasta que acabe el tiempo. La base enemiga es indestructible.', objs: ['Resiste hasta el final', 'Conserva al menos el 80% de tu base', 'No pierdas ninguna torre'] },
  capture: { name: 'Capturar', icon: '🚩', desc: 'Captura todos los puntos a la vez: ponlos bajo control con tropas cerca. Si solo hay enemigos en un punto, lo pierdes.', objs: ['Captura todos los puntos', 'Hazlo en menos de 2:30', 'No pierdas ninguna torre'] },
  hunt: { name: 'Cacería', icon: '🎯', desc: 'Derrota al campeón enemigo, que vigila su guarida.', objs: ['Derrota al campeón', 'Hazlo en menos de 2:00', 'No pierdas ninguna torre'] },
  escort: { name: 'Escolta', icon: '🛒', desc: 'Lleva la carreta hasta el campamento enemigo: se detiene si hay enemigos cerca.', objs: ['Lleva la carreta hasta el final', 'Que llegue con al menos el 50% de vida', 'No pierdas ninguna torre'] },
};
const POINT_SETS = [[{ lane: 0, y: 540 }, { lane: 1, y: 420 }, { lane: 0, y: 300 }], [{ lane: 1, y: 540 }, { lane: 0, y: 420 }, { lane: 1, y: 300 }]];
// Campeones de las cacerías: los jefes de expansión (Fase L); los jefes de zona siguen siendo los clásicos.
const CHAMPIONS = { forest: 'boss_swamp_hydra', desert: 'boss_crab_king', ruins: 'boss_forge_golem', snow: 'boss_ice_colossus', volcanic: 'boss_spider_queen' };
// Carreta de la escolta: no es una carta (no se despliega); ataca con 0 y solo avanza por su carril.
const CART_CARD = { id: 'cart', name: 'Carreta', faction: 'humans', art: null, proc: 'cart', ready: true, cart: true, cost: 0, rarity: 0, roles: ['cart'], hp: 800, dmg: 0, armor: 0.45, cd: 2, count: 1, formation: 'line',
  flying: false, targetsAir: false, ranged: false, range: 10, speed: 20, splash: 0, heal: null, charge: false, siege: 0, buildingsOnly: false, slow: 0, stealth: false, summons: null, ability: null, chain: 0,
  r: 14, h: 52, color: '#8a5a2a' };
// Prepara los campos que necesita cada objetivo y fija su tiempo límite.
function withGoal(m, goal, o) {
  o = o || {}; m.goal = goal;
  if (goal === 'capture') { m.points = (o.points || POINT_SETS[m.id % 2]).slice(0, o.n || 3); m.matchTime = 240; m.par = 150; }
  if (goal === 'hunt') { m.hunt = { id: o.champion || null, hpMult: o.hpMult || 0.7 }; m.matchTime = 240; m.par = 120; } // el campeón se resuelve por terreno más abajo
  if (goal === 'escort') { m.escort = { lane: o.lane !== undefined ? o.lane : m.id % 2 }; m.matchTime = 240; }
  if (goal === 'defend') { m.matchTime = o.time || 150; }
  return m;
}
// opts: behavior 'sleep' (por defecto) | 'patrol' | 'wander'; tower: true -> al despejar el campamento se captura una torre neutral.
const camp = (lane, y, types, mult, opts) => Object.assign({ lane, y, types, mult }, opts || {});
const MISSIONS = [
  { id: 0, zone: 1, name: 'Linde del bosque', desc: 'Primer contacto: dos campamentos y oleadas suaves.',
    camps: [camp(0, 440, ['ordu_grunt', 'ordu_bomber'], 0.5), camp(1, 400, ['ordu_grunt', 'ordu_bomber'], 0.5)],
    wave: { every: 24, max: 3, pool: ['ordu_grunt', 'ordu_grunt', 'ordu_bomber'] }, towerHp: 1300, baseHp: 1900, foeMult: 1, coins: 25, matchTime: 180,
    unlock: { cards: ['human_medic'], leaders: [] } },
  { id: 1, zone: 1, name: 'Corazón del bosque', desc: 'La Raíz antigua despierta y atrapa a tus tropas.', boss: { id: 'boss_raizantiguo', at: 50 },
    camps: [camp(0, 450, ['ordu_grunt', 'ordu_bomber'], 0.55), camp(1, 390, ['ordu_grunt', 'ordu_grunt'], 0.55)],
    wave: { every: 22, max: 3, pool: ['ordu_grunt', 'ordu_bomber', 'ordu_raider'] }, towerHp: 1500, baseHp: 2200, foeMult: 1.1, coins: 40, matchTime: 240,
    unlock: { cards: ['undead_lich'], leaders: ['blade_mistress'] } },
  { id: 2, zone: 2, name: 'Dunas ardientes', desc: 'Jinetes de lobo y wyverns cruzan el desierto.',
    camps: [camp(0, 460, ['ordu_grunt', 'ordu_bomber'], 0.6), camp(1, 420, ['ordu_raider'], 0.6), camp(0, 330, ['ordu_grunt', 'ordu_grunt'], 0.6)],
    wave: { every: 21, max: 4, pool: ['ordu_grunt', 'ordu_raider', 'ordu_wyvern', 'ordu_bomber'] }, towerHp: 1750, baseHp: 2500, foeMult: 1.2, coins: 50, matchTime: 180,
    unlock: { cards: ['ordu_wyvern'], leaders: [] } },
  { id: 3, zone: 2, name: 'Cañón del saqueador', desc: 'El Capitán saqueador embiste tus líneas.', boss: { id: 'boss_capitan_saqueador', at: 45 },
    camps: [camp(0, 440, ['ordu_raider', 'ordu_bomber'], 0.6), camp(1, 400, ['ordu_grunt', 'ordu_grunt'], 0.6)],
    wave: { every: 20, max: 4, pool: ['ordu_grunt', 'ordu_raider', 'ordu_wyvern', 'ordu_bomber'] }, towerHp: 1900, baseHp: 2700, foeMult: 1.3, coins: 65, matchTime: 240,
    unlock: { cards: ['human_mage'], leaders: ['ordu_warchief'] } },
  { id: 4, zone: 3, name: 'Ruinas olvidadas', desc: 'Esqueletos y espectros rondan entre las piedras.',
    camps: [camp(0, 450, ['undead_skeletons'], 0.6), camp(1, 410, ['undead_skeletons', 'undead_lich'], 0.6), camp(1, 320, ['undead_skeletons'], 0.6)],
    wave: { every: 20, max: 4, pool: ['undead_skeletons', 'undead_skeletons', 'undead_lich', 'undead_wraith'] }, towerHp: 2000, baseHp: 2900, foeMult: 1.35, coins: 75, matchTime: 180,
    unlock: { cards: ['ordu_raider'], leaders: [] } },
  { id: 5, zone: 3, name: 'Salón del guardián', desc: 'El Guardián de piedra sacude el suelo y fragiliza tus torres.', boss: { id: 'boss_guardian_piedra', at: 45 },
    camps: [camp(0, 440, ['undead_skeletons', 'undead_lich'], 0.65), camp(1, 400, ['undead_skeletons', 'undead_wraith'], 0.65)],
    wave: { every: 19, max: 5, pool: ['undead_skeletons', 'undead_lich', 'undead_wraith', 'undead_dragon'] }, towerHp: 2200, baseHp: 3200, foeMult: 1.4, coins: 90, matchTime: 240,
    unlock: { cards: ['undead_wraith'], leaders: ['undead_crypt_lord'] } },
  { id: 6, zone: 4, name: 'Páramo helado', desc: 'Dragones esqueléticos sobrevuelan la nieve.',
    camps: [camp(0, 450, ['undead_lich', 'undead_skeletons'], 0.65), camp(1, 410, ['undead_wraith', 'undead_wraith'], 0.65)],
    wave: { every: 18, max: 5, pool: ['undead_skeletons', 'undead_lich', 'undead_dragon', 'undead_wraith'] }, towerHp: 2400, baseHp: 3400, foeMult: 1.5, coins: 100, matchTime: 180,
    unlock: { cards: ['undead_dragon'], leaders: [] } },
  { id: 7, zone: 4, name: 'Túmulo del nigromante', desc: 'El Nigromante levanta ejércitos de huesos.', boss: { id: 'boss_nigromante_tumulo', at: 45 },
    camps: [camp(0, 440, ['undead_lich', 'undead_lich'], 0.7), camp(1, 400, ['undead_skeletons', 'undead_wraith'], 0.7)],
    wave: { every: 18, max: 5, pool: ['undead_skeletons', 'undead_lich', 'undead_dragon', 'undead_wraith'] }, towerHp: 2600, baseHp: 3700, foeMult: 1.6, coins: 120, matchTime: 240,
    unlock: { cards: ['ordu_siege_beast'], leaders: [] } },
  { id: 8, zone: 5, name: 'Cráter maldito', desc: 'Todas las legiones se unen bajo el volcán.',
    camps: [camp(0, 460, ['ordu_grunt', 'undead_lich'], 0.7), camp(1, 420, ['ordu_raider', 'undead_skeletons'], 0.7), camp(0, 330, ['undead_dragon'], 0.7)],
    wave: { every: 17, max: 5, pool: ['ordu_grunt', 'ordu_raider', 'undead_skeletons', 'undead_lich', 'undead_dragon', 'ordu_wyvern'] }, towerHp: 3000, baseHp: 4400, foeMult: 1.85, coins: 140, matchTime: 180,
    unlock: { cards: [], leaders: [] } },
  { id: 9, zone: 5, name: 'Trono del dolor', desc: 'Prueba final: el Señor de la cripta maldice a tu ejército.', boss: { id: 'boss_senor_cripta', at: 40 },
    camps: [camp(0, 450, ['ordu_grunt', 'undead_lich'], 0.75), camp(1, 410, ['ordu_raider', 'undead_wraith'], 0.75)],
    wave: { every: 16, max: 6, pool: ['ordu_grunt', 'ordu_raider', 'undead_skeletons', 'undead_lich', 'undead_dragon', 'undead_wraith'] }, towerHp: 3500, baseHp: 5400, foeMult: 2.1, coins: 200, matchTime: 240,
    unlock: { cards: [], leaders: [] } },
];

// ---------- Capítulo 2: misiones 11-20, una por tipo de objetivo y zona ----------
const FOES_ORDU = ['ordu_grunt', 'ordu_raider', 'ordu_bomber', 'ordu_wyvern'];
const FOES_UNDEAD = ['undead_skeletons', 'undead_lich', 'undead_wraith', 'undead_dragon'];
const FOES_MIX = ['ordu_grunt', 'ordu_raider', 'undead_skeletons', 'undead_lich', 'undead_dragon', 'undead_wraith'];
const ch2 = (id, zone, goal, name, desc, o, extra) => {
  const m = Object.assign({ id, zone, name, desc, camps: o.camps, wave: o.wave, towerHp: o.towerHp, baseHp: o.baseHp, foeMult: +(o.foeMult * 0.9).toFixed(2), coins: o.coins, matchTime: 180, // el capítulo 2 arranca un 10% por debajo de la escala escrita
    unlock: { cards: [], leaders: [] }, triggers: o.triggers || [], chests: 2 }, extra || {});
  return withGoal(m, goal, o.goalOpts);
};
MISSIONS.push(
  ch2(10, 6, 'capture', 'Banderas del claro', 'Captura los tres puntos a la vez; si los enemigos los ocupan, se pierden.', {
    camps: [camp(0, 450, ['ordu_grunt', 'ordu_bomber'], 0.8), camp(1, 400, ['ordu_raider', 'ordu_grunt'], 0.8)],
    wave: { every: 20, max: 4, pool: FOES_ORDU }, towerHp: 3700, baseHp: 5600, foeMult: 2.2, coins: 150,
    triggers: [{ when: { points: 2 }, do: [{ text: '¡Emboscada!' }, { spawn: { ids: ['ordu_raider', 'ordu_raider', 'ordu_grunt'], lane: 1, y: 600 } }] }] }),
  ch2(11, 6, 'hunt', 'Guarida del campeón', 'El campeón vigila su guarida: derrótalo antes de que lleguen los refuerzos.', {
    camps: [camp(0, 450, ['ordu_grunt', 'ordu_bomber'], 0.8), camp(1, 410, ['ordu_raider', 'ordu_raider'], 0.8)],
    wave: { every: 22, max: 3, pool: FOES_ORDU }, towerHp: 3800, baseHp: 5700, foeMult: 2.3, coins: 170,
    triggers: [{ when: { time: 70 }, do: [{ text: '¡Refuerzos enemigos!' }, { spawn: { ids: ['ordu_raider', 'ordu_grunt', 'ordu_grunt'], lanes: [0, 1], y: 130 } }] }] }),
  ch2(12, 7, 'defend', 'Defensa del oasis', 'Aguanta 2:30. Las oleadas se intensifican a mitad de partida.', {
    camps: [camp(0, 450, ['ordu_grunt', 'ordu_raider'], 0.8, { chest: true }), camp(1, 400, ['ordu_bomber', 'ordu_grunt'], 0.8)],
    wave: { every: 20, max: 3, pool: FOES_ORDU }, towerHp: 3900, baseHp: 5800, foeMult: 1.9, coins: 190, goalOpts: { time: 150 },
    triggers: [{ when: { time: 60 }, do: [{ text: '¡Oleada reforzada!' }, { spawn: { ids: ['ordu_wyvern', 'ordu_raider'], lane: 0, y: 130 } }] },
               { when: { time: 110 }, do: [{ text: '¡Última carga!' }, { spawn: { ids: ['ordu_grunt', 'ordu_raider'], lanes: [0, 1], y: 130 } }] }] }),
  ch2(13, 7, 'escort', 'Caravana del desierto', 'Escolta la carreta por el carril izquierdo hasta el campamento enemigo.', {
    camps: [camp(0, 450, ['ordu_grunt', 'ordu_bomber'], 0.8), camp(1, 400, ['ordu_raider', 'ordu_grunt'], 0.8, { behavior: 'patrol' })],
    wave: { every: 20, max: 4, pool: FOES_ORDU }, towerHp: 4000, baseHp: 5900, foeMult: 2.5, coins: 210, goalOpts: { lane: 0 },
    triggers: [{ when: { chests: 1 }, do: [{ text: '¡Botín!' }, { energy: 3 }] }] }),
  ch2(14, 8, 'capture', 'Altares de la cripta', 'Tres altares que capturar mientras los no muertos despiertan.', {
    camps: [camp(0, 450, ['undead_skeletons', 'undead_lich'], 0.8), camp(1, 410, ['undead_skeletons', 'undead_wraith'], 0.8, { behavior: 'wander' })],
    wave: { every: 19, max: 5, pool: FOES_UNDEAD }, towerHp: 4100, baseHp: 6100, foeMult: 2.6, coins: 230,
    triggers: [{ when: { campCleared: 0 }, do: [{ text: '¡Los muertos se levantan!' }, { spawn: { ids: ['undead_skeletons', 'undead_skeletons', 'undead_wraith'], lane: 0, y: 580 } }] }] }),
  ch2(15, 8, 'hunt', 'El nigromante en su cripta', 'Acaba con el campeón no muerto que reina en la cripta.', {
    camps: [camp(0, 450, ['undead_skeletons', 'undead_lich'], 0.85), camp(1, 410, ['undead_wraith', 'undead_wraith'], 0.85)],
    wave: { every: 21, max: 4, pool: FOES_UNDEAD }, towerHp: 4200, baseHp: 6200, foeMult: 2.6, coins: 250, goalOpts: { hpMult: 0.55 },
    triggers: [{ when: { time: 80 }, do: [{ text: '¡Despiertan los guardianes!' }, { spawn: { ids: ['undead_lich', 'undead_skeletons', 'undead_skeletons'], lanes: [0, 1], y: 130 } }] }] }),
  ch2(16, 9, 'escort', 'Paso de los trineos', 'Lleva la carreta por el carril derecho a través del hielo.', {
    camps: [camp(0, 450, ['undead_lich', 'undead_skeletons'], 0.85), camp(1, 410, ['undead_skeletons', 'undead_wraith'], 0.85, { behavior: 'patrol' })],
    wave: { every: 18, max: 5, pool: FOES_UNDEAD }, towerHp: 4400, baseHp: 6400, foeMult: 2.8, coins: 270, goalOpts: { lane: 1 },
    triggers: [{ when: { time: 50 }, do: [{ text: '¡Emboscada en el camino!' }, { spawn: { ids: ['undead_wraith', 'undead_skeletons', 'undead_skeletons'], lane: 1, y: 330 } }] }] }),
  ch2(17, 9, 'defend', 'Resistir la ventisca', 'Aguanta 3:00 mientras la ventisca congela los carriles.', {
    camps: [camp(0, 450, ['undead_lich', 'undead_lich'], 0.85), camp(1, 410, ['undead_skeletons', 'undead_dragon'], 0.85, { chest: true })],
    wave: { every: 18, max: 4, pool: FOES_UNDEAD }, towerHp: 4500, baseHp: 6600, foeMult: 2.5, coins: 290, goalOpts: { time: 180 },
    triggers: [{ when: { time: 90 }, do: [{ text: '¡Una horda baja de la montaña!' }, { spawn: { ids: ['undead_dragon', 'undead_lich', 'undead_skeletons', 'undead_skeletons'], lanes: [0, 1], y: 130 } }] }] }, { rules: { blizzard: true } }),
  ch2(18, 10, 'capture', 'Forjas en llamas', 'Captura las tres forjas bajo una lluvia de meteoros.', {
    camps: [camp(0, 450, ['ordu_grunt', 'undead_lich'], 0.9), camp(1, 410, ['ordu_raider', 'undead_wraith'], 0.9)],
    wave: { every: 17, max: 5, pool: FOES_MIX }, towerHp: 4600, baseHp: 6800, foeMult: 3.0, coins: 320,
    triggers: [{ when: { points: 2 }, do: [{ text: '¡El volcán ruge!' }, { spawn: { ids: ['undead_dragon', 'ordu_raider', 'ordu_raider'], lane: 0, y: 600 } }] }] }, { rules: { meteors: true } }),
  ch2(19, 10, 'destroy', 'Trono ardiente', 'La batalla final: dos jefes atacan a la vez.', {
    camps: [camp(0, 450, ['ordu_grunt', 'undead_lich'], 0.9), camp(1, 410, ['ordu_raider', 'undead_wraith'], 0.9)],
    wave: { every: 16, max: 5, pool: FOES_MIX }, towerHp: 4800, baseHp: 7000, foeMult: 2.9, coins: 450 }, { bosses: [{ id: 'boss_senor_cripta', at: 30 }, { id: 'boss_forge_golem', at: 90 }], matchTime: 300 }),
);
// ---------- Mapas de jefe regional (Fase N): el quinto mapa de cada región, con el jefe regional de CHAMPIONS ----------
// Se desbloquean al superar los otros cuatro mapas de su terreno (ver missionUnlocked). Mismas reglas de combate que el resto.
const CORE_MISSIONS = MISSIONS.length; // las 20 misiones de la campaña original
[
  [20, 6, 'forest', 'Pantano de la Hidra', 'La Hidra del pantano guarda el corazón del bosque.', FOES_ORDU, 'boss_swamp_hydra'],
  [21, 7, 'desert', 'Cueva del Rey cangrejo', 'El Rey cangrejo reina sobre las dunas y sus oasis.', FOES_ORDU, 'boss_crab_king'],
  [22, 8, 'ruins', 'Forja del Gólem', 'El Gólem de forja despierta entre las ruinas.', FOES_UNDEAD, 'boss_forge_golem'],
  [23, 9, 'snow', 'Cumbre del Coloso', 'El Coloso de hielo vigila la corona glacial.', FOES_UNDEAD, 'boss_ice_colossus'],
  [24, 10, 'volcanic', 'Telaraña de la Reina', 'La Reina araña teje su nido junto a la lava.', FOES_MIX, 'boss_spider_queen'],
].forEach(([id, zone, terrain, name, desc, pool, boss], k) => MISSIONS.push(ch2(id, zone, 'destroy', name, desc, {
  camps: [camp(0, 450, pool.slice(0, 2), 0.9), camp(1, 410, pool.slice(1, 3), 0.9)],
  wave: { every: 17, max: 5, pool }, towerHp: 4900, baseHp: 7200, foeMult: 3.1, coins: 500 + k * 20,
}, { boss: { id: boss, at: 30 }, regional: true, matchTime: 300 })));
MISSIONS[0].chests = 1; // la primera misión (tutorial) solo lleva un cofre

// Ajuste global de dificultad (calibrado con simulaciones): escala edificios, enemigos y ritmo de oleadas.
const DIFF = { tower: 1.75, base: 1.58, foe: 1.1, wave: 0.95 };
// Variedad de campamentos por misión (índice de campamento -> opciones). La misión 1 se queda simple a propósito.
const CAMP_EXTRAS = {
  1: [{ tower: true }, { behavior: 'patrol' }],
  2: [{ behavior: 'wander' }, {}, { tower: true }],
  3: [{ tower: true }, { behavior: 'patrol' }],
  4: [{ tower: true }, { behavior: 'wander' }, { behavior: 'patrol' }],
  5: [{ behavior: 'patrol' }, { tower: true }],
  6: [{ tower: true }, { behavior: 'wander' }],
  7: [{ behavior: 'patrol' }, { tower: true }],
  8: [{ tower: true }, { behavior: 'patrol' }, { behavior: 'wander' }],
  9: [{ behavior: 'wander' }, { tower: true }],
  10: [{ tower: true }, { behavior: 'patrol', chest: true }],
  11: [{ behavior: 'wander' }, { tower: true }],
  14: [{ tower: true, chest: true }, {}],
  15: [{ behavior: 'patrol' }, { tower: true }],
  17: [{ tower: true }, {}],
  18: [{ behavior: 'patrol' }, { tower: true, chest: true }],
  19: [{ tower: true }, { behavior: 'patrol', chest: true }],
};
// Cofres guardados por un campamento en misiones anteriores (se abren al despejar el campamento).
[[3, 1], [5, 0], [7, 1], [9, 0]].forEach(([id, i]) => { CAMP_EXTRAS[id][i] = Object.assign({}, CAMP_EXTRAS[id][i], { chest: true }); });
MISSIONS.forEach(m => (CAMP_EXTRAS[m.id] || []).forEach((o, i) => Object.assign(m.camps[i], o)));

// Grupos aleatorios de campamento (Fase E): cada campamento tiene su grupo base y 2 alternativos del mismo tamaño y coste parecido (±1),
// así que la dificultad no cambia pero cada partida es distinta. Se generan de forma determinista; el sorteo se hace al empezar la batalla.
function campGroups(types, pool, seed) {
  const cost = ids => ids.reduce((s, id) => s + CARD[id].cost, 0), base = cost(types), uniq = [...new Set(pool)].filter(id => CARD[id] && CARD[id].ready);
  let h = seed * 2654435761 >>> 0; const next = n => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return (h >>> 16) % n; }; // bits altos: los bajos de este generador se repiten
  const key = a => a.slice().sort().join('+'), seen = new Set([key(types)]), out = [types];
  for (let tries = 0; tries < 60 && out.length < 3; tries++) {
    const g = types.map(() => uniq[next(uniq.length)]);
    if (Math.abs(cost(g) - base) <= 1 && !seen.has(key(g))) { seen.add(key(g)); out.push(g); }
  }
  return out.length > 1 ? out : null;
}
// Interruptores y matorrales (Fase F). Posiciones elegidas para no pisar minas, campamentos ni cofres.
const SWITCH_KINDS = ['energy', 'reinforce', 'trap', 'towerOff'];
const FEATURE_YS = { switch: [300, 510, 270, 340, 540], brush: [330, 560, 270, 520, 600] }; // alturas candidatas; se salta la que choque con un campamento del mismo carril
function freeY(lane, ys, camps, clear, taken) {
  return ys.find(y => (camps || []).every(c => c.lane !== lane || Math.abs(c.y - y) > clear) && taken.every(t => t.lane !== lane || Math.abs(t.y - y) > clear));
}
// Nidos y fuentes (Fase H): se colocan al lado interior del carril, entre los huecos de los cofres.
const NEST_SPOTS = [{ lane: 0, y: 385 }, { lane: 1, y: 320 }], SPRING_SPOTS = [{ lane: 1, y: 460 }, { lane: 0, y: 540 }];
function mapFeatures(id, stage, camps, pool) { // id: número de misión (1.ª = 0); stage: nivel de mazmorra (opcional); camps: campamentos para no pisarlos; pool: tropas del enemigo (para los nidos)
  const n = stage ? (stage >= 2 ? 1 + (stage >= 5 ? 1 : 0) : 0) : (id >= 2 ? 1 + (id >= 7 ? 1 : 0) + (id >= 14 ? 1 : 0) : 0);
  const seed = stage ? stage + 3 : id, switches = [], bush = [];
  for (let k = 0; k < n; k++) {
    const lane = (seed + k) % 2, y = freeY(lane, FEATURE_YS.switch, camps, 70, switches);
    if (y !== undefined) switches.push({ type: SWITCH_KINDS[(seed + k) % SWITCH_KINDS.length], lane, y });
  }
  if (stage ? stage >= 3 : id >= 3) for (let k = 0; k < 2; k++) {
    const lane = (seed + k) % 2, y = freeY(lane, FEATURE_YS.brush, camps, 85, bush);
    if (y !== undefined) bush.push({ lane, y, r: 44 });
  }
  const nNests = stage ? (stage >= 6 ? 1 : 0) : (id >= 15 ? 2 : id >= 8 ? 1 : 0), nSprings = stage ? (stage >= 2 ? 1 : 0) : (id >= 12 ? 2 : id >= 5 ? 1 : 0);
  const nests = NEST_SPOTS.slice(0, nNests).map((s, k) => Object.assign({ card: (pool && pool[0]) || 'ordu_grunt' }, NEST_SPOTS[(seed + k) % 2])), springs = Array.from({ length: nSprings }, (_, k) => SPRING_SPOTS[(seed + k) % 2]);
  return { switches, brush: bush, nests: nests.filter((n, i, a) => a.findIndex(m => m.lane === n.lane) === i), springs: springs.filter((n, i, a) => a.findIndex(m => m.lane === n.lane) === i).map(s => Object.assign({}, s)) };
}
MISSIONS.forEach(m => { Object.assign(m, mapFeatures(m.id, 0, m.camps, m.wave.pool)); if (m.id >= 4) m.campRespawn = { every: 90, bounty: 1 }; });
MISSIONS.forEach(m => { if (m.id > 0) m.camps.forEach((c, i) => { const g = campGroups(c.types, m.wave.pool, m.id * 10 + i + 1); if (g) c.groups = g; }); });
MISSIONS.forEach(m => {
  m.terrain = ZONES[m.zone - 1].terrain; m.enemy = ZONES[m.zone - 1].enemy;
  m.goal = m.goal || 'destroy';
  if (m.hunt && !m.hunt.id) m.hunt.id = CHAMPIONS[m.terrain]; // el campeón depende del terreno de la zona
  m.towerHp = Math.round(m.towerHp * DIFF.tower); m.baseHp = Math.round(m.baseHp * DIFF.base);
  m.foeMult = +(m.foeMult * DIFF.foe).toFixed(2); m.wave.every = Math.round(m.wave.every * DIFF.wave);
});
