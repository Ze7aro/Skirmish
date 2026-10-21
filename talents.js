// Talentos por carta (sin DOM). Cada carta tiene 3 ranuras que se abren al subir de nivel; en cada una se elige 1 de 2 opciones
// (cambiar de opción es gratis). Las opciones se reparten de forma determinista según la carta y su rol.
'use strict';

const TALENT_UNLOCK = [2, 3, 5]; // nivel de carta que abre cada ranura

// fx: hp/dmg/spd/cd/range/heal/mine/bldg se multiplican; armor/cost/extra/ls/shield/deathBlast se suman; splash/slow se toman el mayor; stunEvery el menor.
const TALENT_DEFS = {
  // Ranura 1: estadísticas
  vigor: { name: 'Vigor', slot: 0, desc: '+20% de vida', fx: { hp: 1.2 }, ok: c => !c.heal },
  tough: { name: 'Piel dura', slot: 0, desc: '+30% de vida', fx: { hp: 1.3 }, ok: c => c.miner || c.heal },
  fury: { name: 'Furia', slot: 0, desc: '+15% de daño', fx: { dmg: 1.15 }, ok: c => c.dmg > 8 },
  swiftA: { name: 'Pies ligeros', slot: 0, desc: '+15% de velocidad', fx: { spd: 1.15 }, ok: () => true },
  // Ranura 2: utilidad
  armor: { name: 'Coraza', slot: 1, desc: '+12% de armadura', fx: { armor: 0.12 }, ok: c => !c.flying },
  rapid: { name: 'Ritmo de combate', slot: 1, desc: '-15% de tiempo entre ataques', fx: { cd: 0.85 }, ok: c => c.dmg > 8 && !c.heal },
  reach: { name: 'Largo alcance', slot: 1, desc: '+20% de alcance', fx: { range: 1.2 }, ok: c => c.ranged },
  thrifty: { name: 'Reclutamiento', slot: 1, desc: 'Cuesta 1 menos', fx: { cost: -1 }, ok: c => c.cost >= 3 },
  doctor: { name: 'Manos expertas', slot: 1, desc: '+40% de curación', fx: { heal: 1.4 }, ok: c => !!c.heal },
  swiftB: { name: 'Zancada', slot: 1, desc: '+20% de velocidad', fx: { spd: 1.2 }, ok: c => c.miner },
  pickaxe: { name: 'Pico de acero', slot: 1, desc: '+30% de energía de su mina', fx: { mine: 1.3 }, ok: c => c.miner },
  chain: { name: 'Relámpago', slot: 1, desc: 'Sus ataques saltan a 1 enemigo cercano (60% del daño)', fx: { chain: 1 }, ok: c => c.dmg > 8 && !c.heal && !c.miner && !c.chain },
  sunderT: { name: 'Desgarro', slot: 1, desc: 'Sus ataques reducen la armadura del objetivo durante 3 s', fx: { sunder: 3 }, ok: c => c.dmg > 8 && !c.heal && !c.miner },
  // Ranura 3: especial
  lifesteal: { name: 'Sed de sangre', slot: 2, desc: 'Se cura el 25% del daño que inflige', fx: { ls: 0.25 }, ok: c => c.dmg > 8 && !c.heal },
  cleave: { name: 'Golpe en área', slot: 2, desc: 'Sus ataques dañan en un área pequeña', fx: { splash: 30 }, ok: c => !c.ranged && c.dmg > 8 && !c.splash },
  frost: { name: 'Escarcha', slot: 2, desc: 'Sus ataques ralentizan 1,5 s', fx: { slow: 1.5 }, ok: c => c.dmg > 8 && !c.slow },
  stunner: { name: 'Golpe aturdidor', slot: 2, desc: 'Cada 4.º ataque aturde 0,8 s', fx: { stunEvery: 4 }, ok: c => c.dmg > 8 && !c.heal },
  reinforce: { name: 'Refuerzos', slot: 2, desc: 'Despliega 1 unidad más, pero cuesta 1 más', fx: { extra: 1, cost: 1 }, ok: c => !c.miner && !c.heal && c.hp < 300 && c.count <= 2 },
  lastwish: { name: 'Último aliento', slot: 2, desc: 'Al caer explota y daña 45 en el área', fx: { deathBlast: 45 }, ok: c => !c.miner },
  bane: { name: 'Rompemuros', slot: 2, desc: '+60% de daño contra edificios', fx: { bldg: 1.6 }, ok: c => c.dmg > 8 && !c.heal },
  secondwind: { name: 'Segunda oportunidad', slot: 2, desc: 'Sobrevive una vez con el 35% de vida y 2 s de inmunidad', fx: { cheat: 1 }, ok: c => c.hp >= 100 && !c.miner },
  aegis: { name: 'Égida', slot: 2, desc: 'Empieza con un escudo del 40% de su vida', fx: { shield: 0.4 }, ok: () => true },
  richvein: { name: 'Veta rica', slot: 2, desc: '+60% de energía de su mina', fx: { mine: 1.6 }, ok: c => c.miner },
};
const TALENT_BY_SLOT = [0, 1, 2].map(s => Object.keys(TALENT_DEFS).filter(id => TALENT_DEFS[id].slot === s));

function talentHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Dos opciones por ranura, elegidas de forma estable entre las que encajan con la carta.
function talentOptions(card) {
  return [0, 1, 2].map(slot => {
    const pool = TALENT_BY_SLOT[slot].filter(id => TALENT_DEFS[id].ok(card));
    const a = talentHash(card.id + ':' + slot) % pool.length;
    let b = talentHash(card.id + '#' + slot) % pool.length;
    if (b === a) b = (a + 1) % pool.length;
    return pool.length > 1 ? [pool[a], pool[b]] : [pool[a]];
  });
}

// Talentos elegidos y desbloqueados para una carta a un nivel dado: ['vigor', null, 'lifesteal'] -> ['vigor', 'lifesteal'].
function activeTalents(card, chosen, level) {
  const opts = talentOptions(card), out = [];
  (chosen || []).forEach((id, slot) => { if (id && level >= TALENT_UNLOCK[slot] && opts[slot] && opts[slot].includes(id)) out.push(id); });
  return out;
}

function talentFx(ids) {
  const f = { hp: 1, dmg: 1, spd: 1, cd: 1, range: 1, heal: 1, mine: 1, bldg: 1, armor: 0, cost: 0, extra: 0, ls: 0, shield: 0, deathBlast: 0, splash: 0, slow: 0, stunEvery: 0, chain: 0, sunder: 0, cheat: 0 };
  for (const id of ids) {
    const x = TALENT_DEFS[id].fx;
    for (const k in x) {
      if (['hp', 'dmg', 'spd', 'cd', 'range', 'heal', 'mine', 'bldg'].includes(k)) f[k] *= x[k];
      else if (k === 'splash' || k === 'slow' || k === 'sunder') f[k] = Math.max(f[k], x[k]);
      else if (k === 'stunEvery') f[k] = f[k] ? Math.min(f[k], x[k]) : x[k];
      else f[k] += x[k];
    }
  }
  return f;
}
