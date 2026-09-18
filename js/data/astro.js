/* =====================================================================
   SkyBrain — data/astro.js · THE DEEP SKY (real astronomy + procedural)
   ---------------------------------------------------------------------
   REAL_STARS   — genuine astronomical objects with accurate distances
                  and facts (tagged real:true, shown with a REAL badge).
   genSystem()  — deterministic procedural star systems, endless supply,
                  organised in 5 distance tiers (tagged as SkyBrain
                  fiction). Same seed ⇒ same system, forever.
   REGION TIERS — hierarchical exploration:
                  Expanse → Near Stars → Deep Space → Far Reaches →
                  Galactic Core → Unknown Space.
   ===================================================================== */

const LY_KM=9.4607e12; /* one light-year in kilometres */

/* ---- real celestial objects (scientifically accurate distances) ---- */
const REAL_STARS=[
  {id:'proxima', name:'PROXIMA CENTAURI', ly:4.246,  cls:'M5.5Ve red dwarf', hue:'#ff8f6b',
   fact:'The closest star to the Sun. Hosts Proxima b, an Earth-sized planet in the habitable zone, discovered in 2016.'},
  {id:'alphacen',name:'ALPHA CENTAURI A/B',ly:4.37,  cls:'G2V + K1V binary', hue:'#ffe9a8',
   fact:'A binary of two Sun-like stars orbiting each other every ~80 years. Alpha Cen A is a near-twin of our Sun.'},
  {id:'barnard', name:"BARNARD'S STAR",   ly:5.963,  cls:'M4V red dwarf',    hue:'#ff9d7a',
   fact:'Has the largest proper motion of any star — it crosses a Moon-width of sky every ~180 years.'},
  {id:'wolf359', name:'WOLF 359',         ly:7.86,   cls:'M6.5V red dwarf',  hue:'#ff7a5c',
   fact:'One of the faintest and lowest-mass stars known. If it replaced the Sun, daylight would be only 10× brighter than moonlight.'},
  {id:'sirius',  name:'SIRIUS',           ly:8.66,   cls:'A1V + white dwarf',hue:'#cfe8ff',
   fact:'The brightest star in Earth\'s night sky. Its companion Sirius B was the first white dwarf ever discovered.'},
  {id:'ross154', name:'ROSS 154',         ly:9.71,   cls:'M3.5Ve flare star',hue:'#ffab8a',
   fact:'A flare star: its brightness can jump in minutes as magnetic energy erupts from its surface.'},
  {id:'epseri',  name:'EPSILON ERIDANI',  ly:10.47,  cls:'K2V orange dwarf', hue:'#ffce8a',
   fact:'A young Sun-like star surrounded by two asteroid belts and a Jupiter-mass planet, Epsilon Eridani b.'},
  {id:'procyon', name:'PROCYON',          ly:11.46,  cls:'F5IV + white dwarf',hue:'#fff3d6',
   fact:'The eighth-brightest star in the night sky, slowly evolving into a giant as its core hydrogen runs out.'},
  {id:'tauceti', name:'TAU CETI',         ly:11.90,  cls:'G8V yellow dwarf', hue:'#ffe9b8',
   fact:'The nearest single Sun-like star. A favourite target of SETI searches since 1960.'},
  {id:'vega',    name:'VEGA',             ly:25.04,  cls:'A0V blue-white',   hue:'#dceaff',
   fact:'Was the northern pole star ~12,000 BCE and will be again ~13,700 CE. The first star ever photographed (1850).'},
  {id:'arcturus',name:'ARCTURUS',         ly:36.7,   cls:'K1.5III red giant',hue:'#ffc37a',
   fact:'A red giant 25× the Sun\'s diameter, moving so fast it will drift out of naked-eye view in ~150,000 years.'},
  {id:'pleiades',name:'THE PLEIADES',     ly:444,    cls:'open star cluster',hue:'#bcd8ff',
   fact:'A cluster of over 1,000 young hot stars, ~100 million years old, still wrapped in wisps of reflecting dust.'},
  {id:'betel',   name:'BETELGEUSE',       ly:548,    cls:'M1-2 red supergiant',hue:'#ff9466',
   fact:'A red supergiant ~750× the Sun\'s diameter. When it goes supernova it will briefly outshine the full Moon.'},
  {id:'orion',   name:'ORION NEBULA',     ly:1344,   cls:'H II star nursery',hue:'#e8a8ff',
   fact:'The nearest massive star-forming region: a cloud 24 light-years across where thousands of stars are being born.'},
  {id:'sgra',    name:'SAGITTARIUS A*',   ly:26000,  cls:'supermassive black hole',hue:'#c9b0ff',
   fact:'The 4.3-million-solar-mass black hole at the centre of the Milky Way. Imaged directly in 2022 by the EHT.'},
  {id:'androm',  name:'ANDROMEDA GALAXY', ly:2537000,cls:'SA(s)b spiral galaxy',hue:'#d9c8ff',
   fact:'One trillion stars, 2.5 million light-years away — and closing. It will merge with the Milky Way in ~4.5 billion years.'}
];

/* ---- exploration region tiers (progressive unlocking) ---- */
const REGIONS=[
  {t:1,name:'NEAR STARS',   lyMin:4,    lyMax:20,     lv:1, warp:0,
   blurb:'The Sun\'s closest neighbours — red dwarfs and Sun-twins within twenty light-years.'},
  {t:2,name:'DEEP SPACE',   lyMin:20,   lyMax:200,    lv:6, warp:1,
   blurb:'Bright beacons and old giants. A Warp Drive Mk I is required to reach them.'},
  {t:3,name:'FAR REACHES',  lyMin:200,  lyMax:2000,   lv:12,warp:2,
   blurb:'Supergiants, clusters and star nurseries, hundreds of light-years out.'},
  {t:4,name:'GALACTIC CORE',lyMin:2000, lyMax:50000,  lv:18,warp:3,
   blurb:'The crowded, ancient heart of the Milky Way — and the black hole that anchors it.'},
  {t:5,name:'UNKNOWN SPACE',lyMin:50000,lyMax:3000000,lv:25,warp:4,
   blurb:'Beyond the galaxy\'s rim. The signals out here answer nothing… yet.'}
];

/* ---- procedural star system generator (deterministic, endless) ---- */
const SYS_SYL1=['Ker','Vel','Tho','Nym','Zau','Ori','Cal','Dre','Sol','Myr','Aeg','Lum','Qir','Hex','Tal','Ves'];
const SYS_SYL2=['ath','en','ira','os','une','eth','ax','ion','ara','ys','umbra','el','ov','is','ur','ea'];
const STAR_CLASSES=[
  {c:'M', name:'red dwarf',        hue:'#ff8f6b', w:.45},
  {c:'K', name:'orange dwarf',     hue:'#ffce8a', w:.2},
  {c:'G', name:'yellow dwarf',     hue:'#ffe9a8', w:.14},
  {c:'F', name:'yellow-white star',hue:'#fff3d6', w:.09},
  {c:'A', name:'white star',       hue:'#dceaff', w:.06},
  {c:'B', name:'blue giant',       hue:'#bcd8ff', w:.04},
  {c:'O', name:'blue supergiant',  hue:'#a8c8ff', w:.02}
];
const PLANET_TYPES=['scorched world','rocky world','ocean world','ice world','gas giant','ringed giant','carbon world','shattered world','tidally-locked world','rogue captured world'];
const SYS_QUIRKS=[
  'A slow radio pulse repeats from the second planet every 47 minutes.',
  'The asteroid belt here is unnaturally flat — as if combed.',
  'Auroras on the outer giant flicker in prime-number bursts.',
  'One moon\'s orbit is retrograde and precisely circular. Odd.',
  'Ice geysers on the inner world spell brief glyphs before collapsing.',
  'The star dims 0.8% on a schedule no natural cycle explains.',
  'Debris rings hold the outline of something long dismantled.',
  'Background static here resolves into almost-music at 432 Hz.'
];

function genSystem(tier,idx){
  const seed='SYS-T'+tier+'-'+idx;
  const r=makeRng(seed);
  const reg=REGIONS[tier-1];
  /* star class — weighted */
  let roll=r(),cls=STAR_CLASSES[0];
  for(const sc of STAR_CLASSES){roll-=sc.w;if(roll<=0){cls=sc;break;}}
  const name=(pick(r,SYS_SYL1)+pick(r,SYS_SYL2)).toUpperCase()+'-'+ri(r,100,999);
  const ly=Math.round(rr(r,reg.lyMin,reg.lyMax)*100)/100;
  const nPlanets=ri(r,1,tier>=4?9:6);
  const planets=[];
  for(let i=0;i<nPlanets;i++){
    planets.push({
      name:name+' '+String.fromCharCode(98+i), /* b, c, d… like real exoplanets */
      type:pick(r,PLANET_TYPES),
      au:Math.round(rr(r,.2,tier*8+4)*100)/100
    });
  }
  return{
    id:seed,seed,tier,idx,real:false,
    name,ly,cls:cls.c+'-class '+cls.name,hue:cls.hue,
    planets,
    quirk:r()<.4?pick(r,SYS_QUIRKS):null,
    rare:r()<.06 /* rare systems carry bonus discoveries */
  };
}

/* real stars mapped into the same tier structure */
function realStarsInTier(tier){
  const reg=REGIONS[tier-1];
  return REAL_STARS.filter(s=>s.ly>=reg.lyMin&&s.ly<reg.lyMax)
    .map(s=>({id:'REAL-'+s.id,real:true,tier,name:s.name,ly:s.ly,cls:s.cls,hue:s.hue,fact:s.fact,planets:[],seed:'REAL-'+s.id}));
}

/* the visible catalog for a tier: real stars + procedural systems.
   TRULY INFINITE: for every system you survey, a new one surfaces —
   there are always ~6 uncharted systems ahead, forever. genSystem(tier, idx)
   is unbounded and deterministic, so idx can grow without limit. */
function tierCatalog(tier,surveyedCount){
  const list=realStarsInTier(tier);
  const nProc=6+surveyedCount; /* no cap — grows 1:1 with your exploration */
  for(let i=0;i<nProc;i++)list.push(genSystem(tier,i));
  return list;
}

/* travel mathematics */
function warpEnergyCost(ly,effLvl){
  const base=8+5.2*Math.log(1+ly);
  return Math.max(6,Math.round(base/(1+(effLvl||0)*.15)));
}
function fmtLy(ly){
  if(ly>=1e6)return (ly/1e6).toFixed(2)+' MILLION LY';
  if(ly>=1000)return fmt(ly)+' LY';
  return ly+' LY';
}
function fmtKm(ly){
  const km=ly*LY_KM;
  if(km>=1e18)return (km/1e18).toFixed(1)+' quintillion km';
  if(km>=1e15)return (km/1e15).toFixed(1)+' quadrillion km';
  return (km/1e12).toFixed(1)+' trillion km';
}

/* ---- mission framing: puzzles exist because something is happening ---- */
const MISSION_FRAMES={
  memory:['Relay satellites drift out of alignment — repeat the beacon sequence to re-link them.',
          'The transmission is fragmenting. Hold the signal pattern in mind and echo it back.'],
  speed:['Debris field ahead! Fire thrusters the instant a fragment ignites cyan.',
         'Micro-meteors incoming — strike the moment each one enters the intercept window.'],
  math:['Plot the burn: compute each value to keep the trajectory from decaying.',
        'The reactor is drifting off-curve — feed it exact numbers to stabilise the field.'],
  pattern:['An ancient machine is missing one element of its cycle. Complete the pattern to restart it.',
           'The structure\'s lattice grows by a hidden rule. Predict the next segment to repair it.'],
  vision:['Deep scan running — one return among the field is not natural. Find it.',
          'Something is camouflaged in the sensor grid. Spot the impostor before it slips away.'],
  logic:['The gate demands proof of reasoning. Answer its riddle to open the energy path.',
         'The derelict\'s lock is a chain of statements — deduce the one that is true.'],
  focus:['Hostile noise floods every channel. Track ONLY the gold carrier signals.',
         'Decoys everywhere — lock exclusively onto the marked returns and let the rest burn past.'],
  nav:['Nav computer offline — memorise the buoy route and fly it by hand.',
       'The corridor shifts every minute. Learn the safe path through the beacons, then run it.'],
  timing:['The docking ring spins out of phase. Fire thrusters exactly inside the gold window.',
          'Orbital insertion window opening — one precise burn, or you skip off the atmosphere.']
};

/* ---- world consequences: solving changes the universe ---- */
const CONSEQUENCES=[
  {id:'cq_energy', w:.26, icon:'🔋', text:'Intact energy cells found aboard — <b>+{n} ENERGY</b>',        n:()=>25+Math.floor(Math.random()*20)},
  {id:'cq_coins',  w:.22, icon:'💎', text:'A sealed cargo cache cracks open — <b>+{n} 🪙</b>',            n:()=>40+Math.floor(Math.random()*50)},
  {id:'cq_worm',   w:.14, icon:'🕳️', text:'The structure tears space open — <b>your next warp jump is FREE</b>',n:()=>1},
  {id:'cq_shield', w:.1,  icon:'🛡', text:'A guardian protocol imprints on you — <b>+1 streak shield</b>', n:()=>1},
  {id:'cq_scan',   w:.14, icon:'📡', text:'The antenna array boosts your sensors — <b>a new signal is already inbound</b>',n:()=>1},
  {id:'cq_repair', w:.14, icon:'🔧', text:'Nano-swarms sweep your hull — <b>energy recharged to full</b>', n:()=>1}
];
