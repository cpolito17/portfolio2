/* ═══ App catalogue ═════════════════════════════════════════
   Content only. Every variant reads from here, so the copy, the URLs, and the
   icons are written once and cannot drift between frontends. Nothing in this
   file emits layout: `tier` is a hint about relative prominence that a variant
   may honour or ignore. */
const ICONS = __ICONS__;

/* Six Aurora colours give the 24px sprites enough range for readable depth
   while keeping every icon inside one shared visual system. */
const PAL = {
  '1':'#F2FAFF', '2':'#9FB5D4', '3':'#40527C',
  '4':'#69F0D2', '5':'#A98BFF', '6':'#FFCE7A'
};
function iconSVG(name){
  const rows = ICONS[name]; if (!rows) return '';
  const h = rows.length, w = Math.max(...rows.map(row => row.length));
  let r = '';
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const c = rows[y][x];
    if (c === '.') continue;
    r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[c]}"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

const APPS = {
  cairn: { id:'cairn', name:'Cairn', url:'https://tasks.charliepolito.com/demo', tier:'lg',
    desc:'Plan the week by dragging tasks onto a calendar grid. Shows which tasks are waiting on others, and keeps personal and work separate.' },
  compass: { id:'trajectory', name:'Compass', url:'https://charliepolito.com/compass', tier:'lg',
    desc:'Projects your net worth from today to age 100. Drop life events on the timeline and watch the curve move. No account, and nothing leaves your browser.' },
  localize: { id:'localize', name:'Localize', url:'https://charliepolito.com/localize', tier:'lg',
    desc:'Search a big-box brand, get the independent shops near you instead. Every result is scored 0 to 100 on how locally owned it actually is.',
    note:'Requires a login' },
  apex: { id:'apex', name:'Apex', url:'https://charliepolito.com/apex', tier:'lg',
    desc:'Ranks the roads worth driving near any address. Colors every corner by how twisty it is, and re-sorts instantly when you change the weighting.' },
  garagechallenge: { id:'garagechallenge', name:'Garage Challenge', url:'https://garagechallenge.lol', tier:'lg',
    desc:'Split one car budget across several cars that each do a different job. Picking a rougher condition does not filter the list, it re-prices it. Then dare someone to beat your garage.' },

  ghost: { id:'ghost', name:'Ghost in the Machine', url:'https://charliepolito.com/GhostInTheMachine', tier:'sm',
    desc:'Learn how language models actually work, one short interactive lesson at a time.' },
  liteedit: { id:'liteedit', name:'LiteEdit', url:'https://liteedit.charliepolito.com', tier:'sm',
    desc:'A lightweight photo editor that runs in your browser. Layers and full undo, with no upload.' },
  ttlw: { id:'ttlw', name:'Take the Long Way', url:'https://charliepolito.com/takethelongway', tier:'sm',
    desc:"Finds the ghost towns and roadside oddities along your route, things you won't find on Google Maps. Then sends it to your navigation app." },
  keeran: { id:'keeran', name:'Architecture Portfolio', url:'https://keerancross.com', tier:'sm',
    desc:'Built for my girlfriend. A fun Frutiger-Aero portfolio experience, down to the Windows 98 cursor and Wii music.' },
  taxhaven: { id:'taxhaven', name:'Tax Haven', url:'https://charliepolito.com/taxhaven', tier:'sm',
    desc:'Redesign the US tax code and federal budget, then simulate what it does to the country.' },
  homegame: { id:'homegamehero', name:'HomeGameHero', url:'https://charliepolito.com/homegame', tier:'sm',
    desc:'Home Poker games made easy. Chip, blind, and payout math. Automatically settle the night in the fewest payments.' },
  payload: { id:'payload', name:'PAYLOAD', url:'https://charliepolito.com/payload', tier:'sm',
    desc:'A space-mining roguelite. Drill for ore, then survive the launch back to orbit.' }
};

/* Canonical reading order. This is also the mobile order everywhere, since a
   single column follows the DOM. Compass leads; the games and Tax Haven trail.

   Every key must name an entry in APPS. A typo used to yield an `undefined`
   slot that only surfaced as a TypeError once a variant read `.url` off it,
   taking the whole hub down with a blank page, so the miss is thrown here
   instead, naming the bad key. */
const ORDER = ['compass','cairn','apex','garagechallenge','localize','ttlw','keeran','liteedit','ghost','homegame','taxhaven','payload']
  .map(k => { const app = APPS[k]; if (!app) throw new Error(`apps.js: ORDER names "${k}", which is not in APPS`); return app; });

const ABOUT_LINK = { id:'about', name:'About me', url:'/about' };
