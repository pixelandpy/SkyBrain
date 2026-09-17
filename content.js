/* =====================================================================
   SkyBrain — S4 · CONTENT SYSTEM
   Curated data + procedural generators. Fully local & deterministic.
   ===================================================================== */
const GALAXIES={
  g1:{name:'CORTEX NEBULA', x:-560,y:-300,r:210, hue:'#7c5cff'},
  g2:{name:'SYNAPSE SPIRAL',x: 580,y:-230,r:200, hue:'#3fa9ff'},
  g3:{name:'DEEP MIND',     x:  80,y: 430,r:130, hue:'#ff5ca8'}
};
const RIFT={x:-60,y:640};

/* planets: ang in degrees (orbit start), or = orbit fraction, drift = deg/sec */
const PLANETS=[
  {id:'memory',name:'MEMORY PLANET',short:'MEMORY',game:'memory',icon:'🧠',lv:1,g:'g1',ang:196,or:.86,drift:.0021,size:46,
   c1:'#ff9ad5',c2:'#6d28d9',glow:'#e879f9',moons:1,rings:false,rot:.9,
   tag:'“Hold the light in mind.”',desc:'Sequences of glowing neurons flare and fade. Watch closely, then repeat them from memory.'},
  {id:'speed',name:'SPEED PLANET',short:'SPEED',game:'speed',icon:'⚡',lv:2,g:'g2',ang:152,or:.9,drift:.0024,size:38,
   c1:'#b7f4ff',c2:'#1d4ed8',glow:'#38bdf8',moons:0,rings:false,rot:1.6,
   tag:'“Faster than a falling star.”',desc:'A storm world where orbs flash for a heartbeat. Strike the instant they ignite.'},
  {id:'pattern',name:'PATTERN PLANET',short:'PATTERN',game:'pattern',icon:'🧩',lv:3,g:'g1',ang:318,or:.78,drift:.0018,size:41,
   c1:'#7ef7c9',c2:'#0f766e',glow:'#2dd4bf',moons:2,rings:false,rot:.7,
   tag:'“Everything repeats — if you see it.”',desc:'Crystal lattices grow by hidden rules. Find the rule. Predict what comes next.'},
  {id:'vision',name:'VISION PLANET',short:'VISION',game:'vision',icon:'👁️',lv:5,g:'g2',ang:268,or:.72,drift:.002,size:42,
   c1:'#d9f99d',c2:'#15803d',glow:'#a3e635',moons:1,rings:false,rot:.55,
   tag:'“See what others overlook.”',desc:'Fields of near-identical shapes. Exactly one is different. Your eyes will decide.'},
  {id:'logic',name:'LOGIC PLANET',short:'LOGIC',game:'logic',icon:'💠',lv:6,g:'g1',ang:74,or:.9,drift:.0016,size:44,
   c1:'#ffd9a0',c2:'#9a3412',glow:'#fb923c',moons:0,rings:true,rot:.5,
   tag:'“Thought is the only engine.”',desc:'Riddle monoliths test deduction in a few sharp sentences. Answer true or drift forever.'},
  {id:'math',name:'MATH PLANET',short:'MATH',game:'math',icon:'🔢',lv:8,g:'g2',ang:30,or:.88,drift:.0022,size:45,
   c1:'#c7d2fe',c2:'#312e81',glow:'#818cf8',moons:1,rings:true,rot:.62,
   tag:'“The universe counts itself.”',desc:'Numbers rain from the rings. Solve them mid-air — fast, exact, no calculator.'},
  {id:'focus',name:'FOCUS PLANET',short:'FOCUS',game:'focus',icon:'🎯',lv:12,g:'g3',ang:184,or:.95,drift:.0013,size:41,
   c1:'#f0abfc',c2:'#701a75',glow:'#e879f9',moons:2,rings:false,rot:.8,
   tag:'“One signal in the noise.”',desc:'Debris floods the void. Only the gold stars matter. Tap only them. Nothing else.'}
];
const PLANET_BY_ID={};PLANETS.forEach(p=>PLANET_BY_ID[p.id]=p);

/* ---- difficulty helpers ---- */
const diffMult=d=>1+(d-1)*.16;
const planetDiff=p=>clamp(2+Math.floor((SAVE.level-p.lv)/4),2,10);

/* ---- cosmetics (all cosmetic, all earnable, no purchases) ---- */
const COSMETICS={
  avatars:[
    {id:'av_brain', n:'Neuronaut',  ic:'🧠', cost:0},
    {id:'av_star',  n:'Starchild',  ic:'🌟', cost:150},
    {id:'av_alien', n:'Synaptic',   ic:'👽', cost:250},
    {id:'av_robot', n:'Cortex-9',   ic:'🤖', cost:250},
    {id:'av_comet', n:'Comet',      ic:'☄️', cost:400},
    {id:'av_ufo',   n:'The Visitor',ic:'🛸', cost:500}
  ],
  titles:[
    {id:'ti_drifter',n:'VOID DRIFTER', cost:0},
    {id:'ti_star',   n:'STAR MIND',    cost:200},
    {id:'ti_neuro',  n:'NEURONAUT',    cost:350},
    {id:'ti_deep',   n:'DEEP THINKER', cost:500}
  ],
  themes:[
    {id:'th_violet',  n:'Violet Rift',  cost:0,   pal:{a:'#6d4bff',b:'#c04bff',c:'#232a7a',star:'#cdd6ff'}},
    {id:'th_emerald', n:'Emerald Void', cost:300, pal:{a:'#0b8f5c',b:'#0bbfd0',c:'#0e3a33',star:'#c8ffe0'}},
    {id:'th_crimson', n:'Crimson Nebula',cost:450,pal:{a:'#ff3b5c',b:'#ff7a3b',c:'#4b1020',star:'#ffd9d0'}},
    {id:'th_gold',    n:'Golden Aurora',cost:600, pal:{a:'#ffb648',b:'#ff5ca8',c:'#6b4208',star:'#fff3c8'}}
  ],
  auras:[
    {id:'au_rose',n:'Rose Core', cost:0,   col:'#ff7ac8'},
    {id:'au_cyan',n:'Cyan Core', cost:250, col:'#3fd3ff'},
    {id:'au_gold',n:'Gold Core', cost:500, col:'#ffd166'}
  ]
};
const themePal=()=>{const t=COSMETICS.themes.find(t=>t.id===SAVE.cosmetics.eq.theme);return t?t.pal:COSMETICS.themes[0].pal;};
const auraCol=()=>{const a=COSMETICS.auras.find(a=>a.id===SAVE.cosmetics.eq.aura);return a?a.col:COSMETICS.auras[0].col;};
const avatarIc=()=>{const a=COSMETICS.avatars.find(a=>a.id===SAVE.cosmetics.eq.avatar);return a?a.ic:'🧠';};
const titleName=()=>{const t=COSMETICS.titles.find(t=>t.id===SAVE.cosmetics.eq.title);return t?t.n:'VOID DRIFTER';};

/* ---- achievements ---- */
const ACH=[
  {id:'a_first', ic:'🧠',n:'First Thought',   d:'Complete your first challenge.'},
  {id:'a_five',  ic:'🚀',n:'Warming Up',      d:'Complete 5 sessions.'},
  {id:'a_week',  ic:'🔥',n:'Seven Days',      d:'Reach a 7-day streak.'},
  {id:'a_month', ic:'🌋',n:'Thirty Days',     d:'Reach a 30-day streak.'},
  {id:'a_bolt',  ic:'⚡',n:'Lightning',       d:'Average under 300 ms in a Speed stage.'},
  {id:'a_perfect',ic:'🏆',n:'Perfect Mind',   d:'100% accuracy in a full Daily Challenge.'},
  {id:'a_combo8',ic:'✨',n:'Chain Reaction',  d:'Reach combo ×8.'},
  {id:'a_eye',   ic:'👁️',n:'Sharp Eye',      d:'Clear a Vision stage without a mistake.'},
  {id:'a_gal2',  ic:'🌌',n:'Explorer',        d:'Discover the Synapse Spiral.'},
  {id:'a_gal3',  ic:'🕳️',n:'Deep Diver',     d:'Discover the Deep Mind.'},
  {id:'a_lv10',  ic:'💠',n:'Bright Mind',     d:'Reach Brain Level 10.'},
  {id:'a_lv25',  ic:'🌟',n:'Brilliant Mind',  d:'Reach Brain Level 25.'},
  {id:'a_rich',  ic:'💎',n:'Coin Collector',  d:'Hold 1,000 Brain Coins at once.'},
  {id:'a_end20', ic:'🌀',n:'Rift Walker',     d:'Reach level 20 in the Endless Rift.'},
  {id:'a_end50', ic:'☠️',n:'Insane',          d:'Reach level 50 in the Endless Rift.'},
  {id:'a_shop',  ic:'🛍️',n:'Collector',       d:'Buy your first cosmetic.'}
];

/* ---- early-game rotating modifiers (levels 1-4, before Vision unlocks) ----
   Purely a flavor + reward twist on top of a normal planet visit — never a
   mechanical change inside a mini-game — so variety doesn't add unfairness. */
const EARLY_MODIFIERS=[
  {id:'unstable',text:'🌀 <b>UNSTABLE FIELD</b> — readings are glitching, but instability pays: <b>+50% score</b> this visit.',mult:1.5},
  {id:'overclock',text:'⚡ <b>OVERCLOCKED RELAY</b> — the circuit is running hot: <b>+35% score</b> this visit.',mult:1.35},
  {id:'echo',text:'✨ <b>RESONANT ECHO</b> — a rare alignment is boosting the signal: <b>+25% score</b> this visit.',mult:1.25}
];

/* ---- daily missions pool (3 chosen by the daily seed) ---- */
const MISSIONS=[
  {id:'m_daily',   txt:'Complete the Daily Challenge',      target:1,   rw:{xp:120},          ev:'daily'},
  {id:'m_score3k', txt:'Score 3,000 in one session',        target:3000,rw:{coins:60},        ev:'score'},
  {id:'m_combo5',  txt:'Reach combo ×5',                    target:5,   rw:{xp:80},           ev:'combo'},
  {id:'m_correct20',txt:'Answer 20 questions correctly',    target:20,  rw:{coins:50},        ev:'correct'},
  {id:'m_endless3',txt:'Reach level 3 in the Endless Rift', target:3,   rw:{xp:70},           ev:'endless'},
  {id:'m_speed',   txt:'Train on Speed Planet',             target:1,   rw:{coins:40},        ev:'speed'},
  {id:'m_flawless',txt:'Finish a stage with zero mistakes', target:1,   rw:{xp:80},           ev:'flawless'}
];

/* ---- curated logic library (tier 1–3) — every problem has one provably right answer ---- */
const LOGIC_LIB=[
  {t:1,q:'Rita is taller than Mita. Mita is taller than Sita. Who is the shortest?',o:['Rita','Mita','Sita','All equal'],a:2},
  {t:1,q:'Which does not belong?',o:['Rose','Oak','Lily','Tulip'],a:1},
  {t:1,q:'All Zibs are Zobs. Kiko is a Zib. Therefore:',o:['Kiko is a Zob','Kiko is not a Zob','Some Zobs are not Zibs','Nothing is certain'],a:0},
  {t:1,q:'What letter comes next?  A · C · E · G · ?',o:['H','I','J','K'],a:1},
  {t:1,q:'If today is Wednesday, which day will it be in 5 days?',o:['Sunday','Saturday','Monday','Friday'],a:2},
  {t:1,q:'A train travels 60 km in one hour. At the same speed, how far does it go in 30 minutes?',o:['15 km','30 km','60 km','120 km'],a:1},
  {t:1,q:'Which number does not belong?  2 · 3 · 5 · 7 · 9',o:['2','5','7','9'],a:3},
  {t:1,q:'You face North and turn 90° clockwise, then 180° anticlockwise. Which way do you face?',o:['East','South','West','North'],a:2},
  {t:2,q:'Sam is twice as old as Kim. In 5 years their ages will add up to 40. How old is Sam now?',o:['15','18','20','22'],a:2},
  {t:2,q:'In a race, Amy finished before Ben but after Cara. Dio finished last. Who won?',o:['Amy','Ben','Cara','Dio'],a:2},
  {t:2,q:'In a code, CODE is written as DPEF. How is MIND written?',o:['NJOE','NJOD','MJOE','NPEF'],a:0},
  {t:2,q:'There are 4 apples on a table. You take away 3. How many apples do you have?',o:['1','3','4','0'],a:1},
  {t:2,q:'What does the machine do?  5 → 10,   8 → 16,   12 → ?',o:['18','20','24','26'],a:2},
  {t:2,q:'All roses fade. This flower is a rose. So this flower:',o:['will fade','never fades','is not real','cannot say'],a:0},
  {t:2,q:'A clock shows exactly 3:00. What is the angle between the hands?',o:['60°','75°','90°','120°'],a:2},
  {t:2,q:'Jai is 7th in a queue. Max is right behind Jai. How many people stand between them?',o:['0','1','2','3'],a:0},
  {t:3,q:'If A > B, B = C and C > D, which is the smallest?',o:['A','B','C','D'],a:3},
  {t:3,q:'Five friends sit in a row: P Q R S T. Q is exactly in the middle. P sits immediately left of Q. S is not at either end. Who sits immediately right of Q?',o:['P','R','S','T'],a:2},
  {t:3,q:'A is the brother of B. B is the daughter of C. How is A related to C?',o:['Son','Daughter','Father','Cannot say'],a:0},
  {t:3,q:'Complete the chain: 1 · 1 · 2 · 3 · 5 · 8 · ?',o:['11','12','13','15'],a:2},
  {t:3,q:'Which does not belong?',o:['Square','Circle','Cube','Triangle'],a:2},
  {t:3,q:'If it rains, the ground gets wet. The ground is NOT wet. Therefore:',o:['it rained','it did not rain','the ground is dry anyway','nothing follows'],a:1},
  {t:3,q:'Zara walks 3 km North, then 3 km East, then 3 km South. How far is she from her start?',o:['0 km','3 km','6 km','9 km'],a:1},
  {t:3,q:'In a code, 1=F, 2=E, 3=D … (the alphabet backwards). What does 9 stand for?',o:['R','S','Q','T'],a:0}
];

/* ---- procedural number generators ---- */
function optSet(r,ans,cands){
  const opts=[ans],pool=shuffle(r,cands.filter(c=>c!==ans&&Number.isFinite(c)));
  for(const c of pool){if(opts.length>=4)break;if(!opts.includes(c))opts.push(c);}
  let g=1;while(opts.length<4){const c=ans+g*(r()<.5?1:-1);if(!opts.includes(c))opts.push(c);g++;}
  return shuffle(r,opts);
}
/* Pattern generators → {text?:string[], vis?:fn(k)->svg, ans, options:[4]} answer value = index-agnostic: we compare chosen option value */
function genPattern(r,d){
  const hard=d>=4,very=d>=7;
  const kind=very?pick(r,['geo','fib','muladd','visRot','visHue','visCount'])
            :hard?pick(r,['arith','geo','alt','visRot','visHue','visCount'])
            :pick(r,['arith','alt','visCount','visRot','visHue']);
  if(kind==='arith'){
    const a=ri(r,1,9),s=ri(r,2,9),seq=[a,a+s,a+2*s,a+3*s,a+4*s],ans=a+5*s;
    return{text:seq,ans,options:optSet(r,ans,[ans-s,ans+s,ans+2*s,ans-s*2,ans+s*3,ans+1,ans-1])};
  }
  if(kind==='geo'){
    const a=ri(r,1,3),m=pick(r,[2,3]),seq=[a,a*m,a*m*m,a*m*m*m],ans=a*m*m*m*m;
    return{text:seq,ans,options:optSet(r,ans,[ans*m,ans-m,Math.round(ans*m/2),ans+a,ans-2,ans+m])};
  }
  if(kind==='alt'){
    const a=ri(r,2,8),p=ri(r,3,7),q=ri(r,1,4);let seq=[a],x=a;
    for(let i=0;i<5;i++){x+=(i%2===0?p:q);seq.push(x);}
    const ans=seq.pop();
    return{text:seq,ans,options:optSet(r,ans,[ans+p,ans+q,ans-q,ans-1,ans+1,ans+p+q])};
  }
  if(kind==='fib'){
    let a=ri(r,1,4),b=ri(r,1,5),seq=[a,b];for(let i=0;i<4;i++){seq.push(seq[seq.length-1]+seq[seq.length-2]);}
    const ans=seq[seq.length-1]+seq[seq.length-2];seq=seq.slice(1);
    return{text:seq,ans,options:optSet(r,ans,[ans-1,ans+1,ans+2,ans-3,ans+4,ans-2])};
  }
  if(kind==='muladd'){
    const a=ri(r,1,3),m=pick(r,[2,3]),c=ri(r,1,5);let seq=[a],x=a;
    for(let i=0;i<4;i++){x=x*m+c;seq.push(x);}
    const ans=x*m+c;
    return{text:seq,ans,options:optSet(r,ans,[x*m,x+c,ans+1,ans-c,ans-m,ans+2])};
  }
  /* visual ones */
  if(kind==='visRot'){
    const step=pick(r,[45,-45,90]);
    const rot=[0,1,2,3].map(k=>((k*step)%360+360)%360),ans=((4*step)%360+360)%360;
    const wrongs=[45,-45,90,180,135,-90].map(w=>((ans+w)%360+360)%360).filter(w=>w!==ans);
    return{vis:{shape:pick(r,['tri','arrow']),rot},ans,options:optSet(r,ans,wrongs)};
  }
  if(kind==='visHue'){
    const base=ri(r,0,300),step=hard?ri(r,25,40):ri(r,45,70);
    const hues=[0,1,2,3].map(k=>(base+k*step)%360),ans=(base+4*step)%360;
    const wrongs=[step,-step,step*2,-step*2,step*3].map(w=>((ans+w)%360+360)%360).filter(w=>w!==ans);
    return{vis:{shape:'drop',rot:null,hues},ans,options:optSet(r,ans,wrongs)};
  }
  const n0=ri(r,1,3),st=pick(r,[1,2]);
  const counts=[0,1,2,3].map(k=>n0+k*st),ans=n0+4*st;
  return{vis:{shape:'dots',rot:null,hues:null,counts},ans,options:optSet(r,ans,[ans+st,ans-st,ans+1,ans-1,ans+2,ans-2])};
}

/* Math generator → {q, ans, options} — always exact integers */
function genMath(r,d){
  const roll=r();let q,ans;
  if(d<=2){
    if(roll<.55){const a=ri(r,2,12),b=ri(r,2,12);q=`${a} + ${b}`;ans=a+b;}
    else{let a=ri(r,5,20),b=ri(r,2,a-1);q=`${a} − ${b}`;ans=a-b;}
  }else if(d<=4){
    if(roll<.4){const a=ri(r,12,49),b=ri(r,11,49);q=`${a} + ${b}`;ans=a+b;}
    else if(roll<.7){const a=ri(r,25,90),b=ri(r,5,a-4);q=`${a} − ${b}`;ans=a-b;}
    else{const a=ri(r,3,6),b=ri(r,3,9);q=`${a} × ${b}`;ans=a*b;}
  }else if(d<=6){
    if(roll<.3){const a=ri(r,3,9),b=ri(r,4,12);q=`${a} × ${b}`;ans=a*b;}
    else if(roll<.55){const b=ri(r,3,9),k=ri(r,3,12);q=`${b*k} ÷ ${b}`;ans=k;}
    else if(roll<.8){const a=ri(r,30,120),b=ri(r,12,a-6);q=`${a} − ${b}`;ans=a-b;}
    else{const p=pick(r,[10,20,25,50]),n=pick(r,[40,60,80,120,200,240]);q=`${p}% of ${n}`;ans=n*p/100;}
  }else{
    if(roll<.3){const a=ri(r,5,30),b=ri(r,2,9),c=ri(r,2,9);q=`${a} + ${b} × ${c}`;ans=a+b*c;}
    else if(roll<.5){const a=ri(r,6,12),b=ri(r,3,12);q=`${a} × ${b}`;ans=a*b;}
    else if(roll<.7){const b=ri(r,4,12),k=ri(r,6,14);q=`${b*k} ÷ ${b}`;ans=k;}
    else if(roll<.85){const a=ri(r,4,9),b=ri(r,3,9);q=`${a} × ? = ${a*b}`;ans=b;}
    else{const p=pick(r,[25,50,75]),n=pick(r,[80,120,160,200,300]);q=`${p}% of ${n}`;ans=n*p/100;}
  }
  const cands=[ans+1,ans-1,ans+2,ans-2,ans+ri(r,3,9),ans-ri(r,3,9),ans+10,ans-10,ans*2,Math.round(ans/2)];
  return{q,ans,options:optSet(r,ans,cands)};
}

/* Vision round generator → {shape,hue,rot,scale,grid,odd,attr}
   Accessibility: when the distinguishing attribute is hue, color alone can
   be invisible to players with common color-vision deficiencies. Whenever
   attr==='hue' the odd tile also gets a `mark` — a dashed ring rendered in a
   fixed, hue-independent color — so the odd tile is always identifiable by
   shape/border alone, never by color perception. rot/size rounds are already
   distinguishable without color, so they are left untouched. */
const V_SHAPES=['star','hex','tri','diamond','circle','square'];
function genVision(r,d){
  const grid=d<4?3:d<7?4:5;
  const shape=pick(r,V_SHAPES),hue=ri(r,0,359),rot=ri(r,0,359),sc=1;
  const attr=pick(r,['hue','rot','size']);
  const base={shape,hue,rot,scale:1,mark:false};
  const odd=Object.assign({},base);
  if(attr==='hue'){
    odd.hue=(hue+(d<5?ri(r,26,40):ri(r,14,26))+360)%360;
    odd.mark=true; /* non-color cue: a dashed border ring, always visible */
  }
  if(attr==='rot')odd.rot=(rot+(d<5?ri(r,35,55):ri(r,18,34)))%360;
  if(attr==='size')odd.scale=d<5?rr(r,.68,.78):rr(r,.76,.86);
  return{base,odd,grid,attr,oddIdx:ri(r,0,grid*grid-1)};
}
function shapeSVG(shape,hue,rot,scale,mark){
  const c=`hsl(${hue} 72% 62%)`,gl=`hsl(${hue} 80% 78%)`;
  const t=`transform="rotate(${rot} 20 20) translate(20 20) scale(${scale}) translate(-20 -20)"`;
  let path='';
  if(shape==='star')path=`<path d="M20 4l4.4 9.6 10.4 1.2-7.7 7.1 2.1 10.3L20 27l-9.2 5.2 2.1-10.3-7.7-7.1 10.4-1.2z" fill="${c}"/><circle cx="20" cy="19" r="2.4" fill="${gl}"/>`;
  else if(shape==='hex')path=`<polygon points="20,4 33.9,12 33.9,28 20,36 6.1,28 6.1,12" fill="${c}"/><polygon points="20,11 27.8,15.5 27.8,24.5 20,29 12.2,24.5 12.2,15.5" fill="${gl}" opacity=".55"/>`;
  else if(shape==='tri')path=`<polygon points="20,4 35,33 5,33" fill="${c}"/><polygon points="20,14 27,27 13,27" fill="${gl}" opacity=".55"/>`;
  else if(shape==='diamond')path=`<polygon points="20,3 36,20 20,37 4,20" fill="${c}"/><polygon points="20,12 28,20 20,28 12,20" fill="${gl}" opacity=".55"/>`;
  else if(shape==='circle')path=`<circle cx="20" cy="20" r="15" fill="${c}"/><circle cx="15" cy="15" r="5" fill="${gl}" opacity=".5"/>`;
  else path=`<rect x="6" y="6" width="28" height="28" rx="4" fill="${c}"/><rect x="13" y="13" width="14" height="14" rx="2" fill="${gl}" opacity=".55"/>`;
  /* fixed-color dashed ring: the color-independent "this one is different"
     signal for hue-based rounds. Drawn last so it always reads clearly. */
  const cue=mark?'<circle cx="20" cy="20" r="18.2" fill="none" stroke="#eafcff" stroke-width="1.6" stroke-dasharray="3.6 3.1" opacity=".9"/>':'';
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><g ${t}>${path}</g>${cue}</svg>`;
}
function patternSVG(vis,k){
  /* k = position in sequence (0..3), renders the visual tile for pattern game */
  const rot=v=>((v%360)+360)%360;
  if(vis.shape==='dots'){
    const n=vis.counts?vis.counts[k]:null;
    let dots='';const total=n||k+1;
    for(let i=0;i<total;i++){const a=i*2.4-1.9;dots+=`<circle cx="${20+Math.cos(a)*8*Math.sqrt(i+.6)}" cy="${20+Math.sin(a)*8*Math.sqrt(i+.6)}" r="3.4" fill="#9be8ff"/>`;}
    return `<svg viewBox="0 0 40 40">${dots}</svg>`;
  }
  if(vis.hues){
    const h=vis.hues?vis.hues[k]:0;
    return `<svg viewBox="0 0 40 40"><path d="M20 5l6 8-6 22-6-22z" fill="hsl(${h} 75% 60%)" stroke="hsl(${h} 85% 78%)" stroke-width="1"/></svg>`;
  }
  const ang=vis.rot?rot(vis.rot[k]):0;
  const inner=vis.shape==='tri'
    ?`<polygon points="20,6 33,32 7,32" fill="#8ef7d4"/>`
    :`<path d="M20 5 L20 33 M20 5 L13 13 M20 5 L27 13" stroke="#8ef7d4" stroke-width="4.6" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 40 40"><g transform="rotate(${ang} 20 20)">${inner}</g></svg>`;
}

/* ---- Daily Challenge composition (deterministic per date) ---- */
function dailySeed(dateStr){return 'SKYBRAIN-'+dateStr;}
function buildDaily(dateStr){
  const r=makeRng(dailySeed(dateStr));
  const order=shuffle(r,PLANETS.map(p=>p.game)).slice(0,6);
  const ramp=[2,2,3,4,5,6];
  const stages=order.map((g,i)=>({game:g,difficulty:ramp[i]}));
  const missions=shuffle(r,MISSIONS).slice(0,3).map(m=>m.id);
  return{number:dailyNumber(dateStr),date:dateStr,stages,missions};
}
/* ---- Endless composition (deterministic per run seed) ----
   Levels 1–34: unchanged from the original curve (difficulty climbs every
   2 levels, capped at 10) — no change to established early/mid balance.
   Levels 35–48: the difficulty CEILING itself keeps rising (10 → 16), so
   the run keeps getting harder instead of plateauing well before level 50.
   Levels 48+: ceiling holds at 16 — level 50's INSANE tag is a milestone
   inside an already-intense stretch, not a sudden cliff. `ramp` (0..1)
   exposes how far into that pre-INSANE intensity a stage is, so the
   engine can tighten timers proportionally without touching every game. */
function endlessStage(runSeed,level){
  const r=makeRng('RIFT-'+runSeed+'-'+level);
  const base=1+Math.floor((level-1)/2);
  const t=clamp((level-34)/14,0,1);           /* 0 at lvl34 → 1 at lvl48+ */
  const ceiling=10+Math.round(t*6);           /* 10 → 16 */
  const diff=clamp(base,1,ceiling);
  const ramp=clamp((diff-10)/6,0,1);          /* how deep into the ramp this stage bites */
  /* full pool: the 7 planet skills + the free-roaming nav & timing games */
  const pool=[...PLANETS.map(p=>p.game),'nav','timing'];
  return{game:pick(r,pool),difficulty:diff,insane:level>=50,level,ramp};
}
/* flavor lines shown instead of the plain "Game · difficulty N" subtitle
   once the pre-INSANE ramp is clearly biting (levels ~40+) */
const RIFT_DANGER_LINES=[
  '⚠ THE RIFT TIGHTENS','⚠ SIGNAL DEGRADING — THINK FASTER',
  '⚠ PRESSURE RISING','⚠ HOLD YOUR NERVE','⚠ THE WALLS ARE CLOSING IN'
];

