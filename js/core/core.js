
'use strict';
/* =====================================================================
   SkyBrain — core/core.js · UTILITIES · STORAGE · SAVE
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const Ease={
  ioC:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  oC:t=>1-Math.pow(1-t,3),
  oQ:t=>1-(1-t)*(1-t),
  iC:t=>t*t*t
};
const fmt=n=>Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ---- deterministic RNG (xmur3 hash + mulberry32) ---- */
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return function(){h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return (h^=h>>>16)>>>0;};}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRng(seed){const h=xmur3(String(seed));return mulberry32(h());}
const rr=(r,a,b)=>a+r()*(b-a);
const ri=(r,a,b)=>Math.floor(a+r()*(b-a+1));
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
function shuffle(r,arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---- dates (LOCAL time = the player's day) ---- */
const pad2=n=>String(n).padStart(2,'0');
function todayStr(d){d=d||new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function strToDate(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function addDays(s,n){const d=strToDate(s);d.setDate(d.getDate()+n);return todayStr(d);}
function dailyNumber(s){return Math.floor((strToDate(s)-strToDate('2026-01-01'))/86400000)+1;}
function prettyDate(s){return strToDate(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}

/* ---- vibration ---- */
function buzz(p){try{if(SAVE.set.haptics&&navigator.vibrate)navigator.vibrate(p);}catch(e){}}

/* ---- safe storage (survives sandboxed iframes / private mode) ---- */
const Store=(()=>{
  let mem={},ok=false;
  try{const t='__sb'+Math.random();localStorage.setItem(t,'1');localStorage.removeItem(t);ok=true;}catch(e){ok=false;}
  return{
    ok:()=>ok,
    get(k){try{if(ok)return localStorage.getItem(k);}catch(e){}return mem[k]??null;},
    set(k,v){try{if(ok){localStorage.setItem(k,v);return;}}catch(e){}mem[k]=v;}
  };
})();

/* ---- save state ---- */
const SAVE_KEY='skybrain_save_v1';
function defaultSave(){
  let rm=true;
  try{rm=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  return{
    v:1,created:Date.now(),xp:0,level:1,coins:0,
    unlocked:{planets:['memory'],galaxies:['g1']},
    best:{daily:0,endlessLevel:0,endlessScore:0},
    daily:{lastDone:null,history:{}},
    streak:0,bestStreak:0,shields:0,lastNudge:null,
    perPlanet:{},
    ach:{},
    missions:{date:null,progress:{},done:{}},
    cosmetics:{owned:['av_brain','ti_drifter','th_violet','au_rose'],eq:{avatar:'av_brain',title:'ti_drifter',theme:'th_violet',aura:'au_rose'}},
    stats:{sessions:0,answers:0,correct:0,bestReaction:null,maxCombo:0,coinsEarned:0,dailies:0,flawless:0,speedPlays:0},
    story:{fragment:0},                 /* next STORY_MAIN index to reveal   */
    archive:[],                         /* cosmic archive: {k,t,title,when}  */
    meta:{recentGames:[],anomaliesDecoded:0},
    ship:{energy:100,freeWarp:0,upgrades:{engine:0,core:0,scanner:0,nav:0,warp:0}},
    exploration:{surveyed:{},done:{},db:{stars:0,planets:0,anomalies:0,signals:0,wormholes:0,rare:0}},
    tutorial:{flight:false},           /* one-time flight-control onboarding flag */
    set:{sound:true,music:true,motion:rm,haptics:true,intro:false,hint:true,
         sfxVolume:100,musicVolume:100} /* 0-100 — sliders on top of the sound/music toggles */
  };
}
function mergeDeep(base,over){
  const out=Array.isArray(base)?base.slice():Object.assign({},base);
  for(const k in over){
    if(over[k]&&typeof over[k]==='object'&&!Array.isArray(over[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k]))out[k]=mergeDeep(base[k],over[k]);
    else out[k]=over[k];
  }
  return out;
}
let SAVE=defaultSave();
let _saveT=0;
function persist(){clearTimeout(_saveT);_saveT=setTimeout(()=>{try{Store.set(SAVE_KEY,JSON.stringify(SAVE));}catch(e){}},200);}
function loadSave(){
  const raw=Store.get(SAVE_KEY);
  if(raw){try{SAVE=mergeDeep(defaultSave(),JSON.parse(raw));}catch(e){SAVE=defaultSave();}}
}

/* ---- save export / import ----------------------------------------------
   A compact, versioned, copy-pasteable text code — the player's own backup.
   No server, no database: everything round-trips through localStorage only.
   Format: "SKYBRAIN1:<checksum>:<base64 JSON>" — the checksum exists purely
   to reject corrupted/incomplete pastes safely, not for security. ---- */
const SAVE_EXPORT_TAG='SKYBRAIN1';
function _saveChecksum(str){
  let h=0;
  for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))|0;
  return (h>>>0).toString(36);
}
function exportSaveCode(){
  try{
    const payload={tag:SAVE_EXPORT_TAG,v:SAVE.v||1,exportedAt:Date.now(),save:SAVE};
    const json=JSON.stringify(payload);
    const b64=btoa(unescape(encodeURIComponent(json)));
    return SAVE_EXPORT_TAG+':'+_saveChecksum(b64)+':'+b64;
  }catch(e){return null;}
}
/* Returns {ok:true,save} or {ok:false,error}. Never throws, never mutates
   SAVE — the caller decides whether/when to actually replace progress. */
function importSaveCode(code){
  try{
    if(typeof code!=='string')return{ok:false,error:'That is not a valid save code.'};
    const trimmed=code.trim();
    const parts=trimmed.split(':');
    if(parts.length!==3||parts[0]!==SAVE_EXPORT_TAG)
      return{ok:false,error:'That does not look like a SkyBrain save code.'};
    const[,checksum,b64]=parts;
    if(!b64||_saveChecksum(b64)!==checksum)
      return{ok:false,error:'This code looks corrupted (checksum mismatch) — check you copied all of it.'};
    let payload;
    try{payload=JSON.parse(decodeURIComponent(escape(atob(b64))));}
    catch(e){return{ok:false,error:'This code could not be decoded — it may be corrupted or incomplete.'};}
    if(!payload||typeof payload!=='object'||!payload.save||typeof payload.save!=='object')
      return{ok:false,error:'This code does not contain valid save data.'};
    const incoming=payload.save;
    /* shallow shape check — a real SAVE always has these, at these types */
    if(typeof incoming.level!=='number'||typeof incoming.coins!=='number'||typeof incoming.xp!=='number')
      return{ok:false,error:'This save is missing required data and was not imported.'};
    /* merge against a fresh default so unknown/missing fields never crash the game */
    const merged=mergeDeep(defaultSave(),incoming);
    return{ok:true,save:merged,exportedAt:payload.exportedAt||null};
  }catch(e){
    return{ok:false,error:'This code could not be read — it may be corrupted or incomplete.'};
  }
}

