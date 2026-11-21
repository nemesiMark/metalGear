// ===== Livelli =====
'use strict';
// onde: "grunt*3 scout*2" ; casse: [x, contenuto]
const LEVELS = [
  {
    name: 'GIUNGLA DI FUOCO', theme: 'jungle', music: 'jungle', len: 6400, boss: 'tank',
    intro: 'Infiltrati nella giungla e distruggi il carro Rinoceronte.',
    extras: ['scout', 'dog', 'grenadier'],
    zones: [
      { x: 900, waves: ['grunt*2', 'grunt*2 scout'] },
      { x: 1900, waves: ['scout*3', 'grunt*2 scout*2'] },
      { x: 2900, waves: ['grunt*3', 'grenadier grunt*2', 'scout*3'] },
      { x: 3900, waves: ['dog*2 grunt', 'grunt*3 scout*2'] },
      { x: 4900, waves: ['grenadier*2 grunt*2', 'dog*3 scout*2', 'grunt*4'] }
    ],
    crates: [[650, 'med'], [1500, 'w:fucile'], [2500, 'gren'], [3400, 'w:mitra'], [4400, 'shield'], [5400, 'med'], [5600, 'rand']]
  },
  {
    name: 'DESERTO DEI MIRAGGI', theme: 'desert', music: 'desert', len: 6800, boss: 'scorpion',
    intro: 'Attraversa le dune. I cecchini ti tengono sotto tiro.',
    extras: ['sniper', 'heavy', 'dog'],
    zones: [
      { x: 900, waves: ['grunt*3', 'scout*2 grunt*2'] },
      { x: 1900, waves: ['sniper grunt*2', 'grenadier*2 scout*2'] },
      { x: 2900, waves: ['heavy grunt*2', 'dog*3', 'sniper*2 grunt*2'] },
      { x: 3900, waves: ['scout*4', 'heavy grenadier grunt*2'] },
      { x: 4900, waves: ['sniper*2 dog*2', 'heavy*2', 'grunt*3 scout*3'] },
      { x: 5700, waves: ['grenadier*2 heavy', 'dog*4 sniper'] }
    ],
    crates: [[700, 'med'], [1400, 'w:fiamme'], [2400, 'gren'], [3600, 'w:laser'], [4500, 'speed'], [5300, 'med'], [6100, 'shield']]
  },
  {
    name: 'CITTÀ FANTASMA', theme: 'city', music: 'city', len: 7200, boss: 'heli',
    intro: 'Notte, pioggia e rovine. Droni e torrette ovunque.',
    extras: ['drone', 'shield', 'medic'],
    zones: [
      { x: 900, waves: ['grunt*3 drone', 'shield grunt*2'] },
      { x: 1900, waves: ['turret drone*2', 'heavy medic grunt*2'] },
      { x: 2900, waves: ['shield*2 sniper', 'drone*4', 'grunt*3 grenadier'] },
      { x: 3900, waves: ['turret*2 grunt*2', 'heavy*2 medic'] },
      { x: 4900, waves: ['shield*2 drone*2', 'sniper*2 scout*3', 'heavy medic shield'] },
      { x: 6000, waves: ['turret drone*3 grunt*2', 'heavy*2 shield*2 medic'] }
    ],
    crates: [[650, 'med'], [1300, 'w:razzi'], [2400, 'dmg'], [3400, 'gren'], [3800, 'w:devast'], [5000, 'med'], [5800, 'shield'], [6500, 'life']]
  },
  {
    name: 'AVAMPOSTO GLACIALE', theme: 'arctic', music: 'arctic', len: 7400, boss: 'titan',
    intro: 'La base artica nasconde ninja, mastini e il Titano.',
    extras: ['ninja', 'dog', 'turret'],
    zones: [
      { x: 900, waves: ['dog*3 grunt*2', 'ninja grunt*2'] },
      { x: 1900, waves: ['sniper*2 shield', 'turret heavy'] },
      { x: 2900, waves: ['ninja*2 dog*2', 'medic heavy*2', 'drone*4'] },
      { x: 3900, waves: ['shield*2 grenadier*2', 'ninja*3'] },
      { x: 4900, waves: ['turret*2 sniper*2', 'heavy*2 medic dog*2', 'ninja*2 scout*3'] },
      { x: 6100, waves: ['shield*2 heavy*2', 'ninja*3 drone*3', 'medic*2 heavy*2 grunt*2'] }
    ],
    crates: [[600, 'med'], [1200, 'w:plasma'], [2400, 'gren'], [3000, 'w:fulmine'], [4100, 'shield'], [4800, 'w:prisma'], [5600, 'med'], [6700, 'dmg']]
  },
  {
    name: 'FORTEZZA VULCANICA', theme: 'volcano', music: 'volcano', len: 7800, boss: 'hydra',
    intro: "L'ultima difesa prima del Nucleo. Nessuna pietà.",
    extras: ['ninja', 'heavy', 'medic', 'drone'],
    zones: [
      { x: 900, waves: ['heavy grunt*3', 'ninja*2 drone*2'] },
      { x: 1900, waves: ['shield*2 medic sniper', 'dog*4', 'heavy*2 grenadier'] },
      { x: 2900, waves: ['turret*2 drone*3', 'ninja*3 scout*2'] },
      { x: 3900, waves: ['heavy*2 medic*2', 'sniper*2 shield*2', 'drone*5'] },
      { x: 4900, waves: ['ninja*3 dog*3', 'heavy*3 medic', 'turret*2 grenadier*2'] },
      { x: 6000, waves: ['shield*3 heavy*2', 'ninja*4', 'heavy*2 sniper*2 medic*2'] },
      { x: 6900, waves: ['dog*4 scout*4', 'heavy*3 ninja*2 drone*3'] }
    ],
    crates: [[600, 'med'], [1500, 'w:tempesta'], [2500, 'gren'], [3500, 'shield'], [4300, 'w:omega'], [5300, 'med'], [6400, 'life'], [7200, 'med']]
  },
  {
    name: 'IL NUCLEO OMEGA', theme: 'core', music: 'omega', len: 3200, boss: 'omega', final: true,
    intro: "Il cuore della fortezza. OMEGA GEAR ti aspetta.",
    extras: ['heavy', 'ninja', 'shield'],
    zones: [
      { x: 900, waves: ['heavy ninja*2 shield', 'sniper*2 drone*3 medic'] },
      { x: 1800, waves: ['heavy*2 ninja*2', 'shield*2 turret*2 dog*2'] }
    ],
    crates: [[500, 'med'], [1500, 'shield'], [2300, 'med'], [2500, 'gren'], [2600, 'dmg']]
  }
];
function parseWave(s) { const out = []; s.split(/\s+/).filter(Boolean).forEach(tok => { const [t, n] = tok.split('*'); for (let i = 0; i < (+n || 1); i++) out.push(t); }); return out; }
function weaponsBefore(i) { const ws = ['pistol']; for (let k = 0; k < i; k++) LEVELS[k].crates.forEach(([, d]) => { if (d.startsWith('w:')) ws.push(d.slice(2)); }); return ws; }

const DIFFS = [
  { name: 'PRINCIPIANTE', col: '#51cf66', lives: 5, ehp: .65, edmg: .5, efire: .65, espd: .85, bspd: .82, count: .75, elite: 0, bhp: .6, bt: .78, lead: false, flank: 0, desc: ['Nemici lenti e deboli', '5 vite, più cure', 'Il boss finale resta tosto'] },
  { name: 'NORMALE', col: '#fcc419', lives: 3, ehp: 1, edmg: 1, efire: 1, espd: 1, bspd: 1, count: 1, elite: .06, bhp: 1, bt: 1, lead: false, flank: .1, desc: ['La sfida giusta', '3 vite', 'Qualche nemico élite'] },
  { name: 'DIFFICILE', col: '#ff922b', lives: 3, ehp: 1.4, edmg: 1.5, efire: 1.35, espd: 1.12, bspd: 1.15, count: 1.3, elite: .2, bhp: 1.5, bt: 1.2, lead: true, flank: .25, desc: ['Nemici mirano in anticipo', 'Più ondate, attacchi alle spalle', 'Molti élite'] },
  { name: 'ESTREMO', col: '#ff2a2a', lives: 2, ehp: 1.9, edmg: 2.2, efire: 1.75, espd: 1.25, bspd: 1.3, count: 1.6, elite: .4, bhp: 2.2, bt: 1.45, lead: true, flank: .4, desc: ['Solo per veterani', '2 vite, danni doppi', 'Mega boss quasi imbattibile'] }
];
