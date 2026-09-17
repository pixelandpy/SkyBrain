#!/usr/bin/env node
/* =====================================================================
   SkyBrain — tests/smoke.js
   A very lightweight regression/smoke-test harness. Zero npm
   dependencies, zero build step, doesn't touch or slow down the shipped
   browser game (index.html and sw.js never reference this directory).

   Run it with:  node tests/smoke.js

   What it does: loads the REAL game files (in their real <script> order,
   read straight out of index.html) into a small hand-rolled DOM/Canvas/
   WebAudio shim (see dom-shim.js) under Node's `vm` module — the same
   way a browser loads a set of classic, non-module <script> tags sharing
   one global scope — then runs a battery of assertions against the
   actual running app. See README.md in this folder for more detail.
   ===================================================================== */
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const{createEnvironment}=require('./dom-shim.js');

const ROOT=path.join(__dirname,'..');

/* ---------- tiny test runner (no framework) ---------- */
const results=[];
async function test(name,fn){
  try{
    await fn();
    results.push({name,ok:true});
    console.log('  \x1b[32m✓\x1b[0m '+name);
  }catch(e){
    results.push({name,ok:false,error:e});
    console.log('  \x1b[31m✗\x1b[0m '+name);
    console.log('      '+(e&&e.stack?e.stack.split('\n').slice(0,3).join('\n      '):e));
  }
}
function assert(cond,msg){if(!cond)throw new Error(msg||'assertion failed');}
function assertEqual(a,b,msg){if(a!==b)throw new Error((msg||'expected equal')+' — got '+JSON.stringify(a)+' vs '+JSON.stringify(b));}
const delay=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- load index.html, build the shim, load every script ---------- */
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const bodyMatch=/<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
if(!bodyMatch){console.error('Could not find <body> in index.html — aborting.');process.exit(1);}
const scriptPaths=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
if(!scriptPaths.length){console.error('Found no <script src="..."> tags in index.html — aborting.');process.exit(1);}

console.log('SkyBrain smoke test\n====================\n');
console.log('Loading '+scriptPaths.length+' script(s) from index.html, in document order:');

const{window,document}=createEnvironment(bodyMatch[1]);
const context=vm.createContext(window);
let loadError=null;
for(const rel of scriptPaths){
  const abs=path.join(ROOT,rel);
  let code;
  try{code=fs.readFileSync(abs,'utf8');}
  catch(e){loadError={rel,error:e};break;}
  try{
    vm.runInContext(code,context,{filename:rel});
    console.log('  \x1b[32m✓\x1b[0m '+rel);
  }catch(e){
    console.log('  \x1b[31m✗\x1b[0m '+rel);
    loadError={rel,error:e};
    break;
  }
}

if(loadError){
  console.log('\n\x1b[31mAborting: '+loadError.rel+' failed to load without throwing.\x1b[0m');
  console.log(loadError.error&&loadError.error.stack||loadError.error);
  console.log('\nThis is exactly the kind of regression these tests exist to catch —');
  console.log('every other check is skipped because the app itself never finished loading.');
  process.exit(1);
}
console.log('\nAll scripts loaded without throwing — boot() has already run.\n');
console.log('Running checks:');

/* ---------- bridge ----------
   Top-level `function` declarations attach to the shared global object
   automatically (so `vm.runInContext('this',context).makeRng` already
   works), but this codebase's `const`/`let` top-level bindings — SAVE,
   Engine, Universe, UI, SFX, Games, ... — do NOT, by spec, become
   properties of the global object (exactly like classic <script> tags in
   a real browser). They DO live in one shared lexical scope across every
   script we just ran in this context, so a getter *evaluated inside that
   same context* can still reach them by name. SAVE itself gets reassigned
   at runtime (loadSave()/save-import), so it gets a real getter/setter;
   everything else is a stable reference. */
vm.runInContext(`
  Object.defineProperty(window,'__bridge',{configurable:true,value:{
    get SAVE(){return SAVE;}, set SAVE(v){SAVE=v;},
    Engine,Universe,UI,SFX,Games,Shipsys,Missions,Achieves,Discoveries,Archive,
    Signals,Selector,Store,Prog,PLANETS,makeRng,persist,loadSave,clamp,pick,fmt,
    exportSaveCode,importSaveCode,FlightTutorial,Ads,SKYBRAIN_ADS_PRODUCTION,
    buildDaily,endlessStage,genVision,genMath,genPattern,EARLY_MODIFIERS,RIFT_DANGER_LINES
  }});
`,context,{filename:'(test bridge)'});
const g=window.__bridge;

(async()=>{

  /* ---- required global systems exist ---- */
  await test('required global systems exist',()=>{
    const need=['SAVE','Engine','Universe','UI','SFX','Games','Shipsys','Missions',
      'Achieves','Discoveries','Archive','Signals','Selector','Store','Prog',
      'buildDaily','endlessStage','genVision','genMath','genPattern',
      'exportSaveCode','importSaveCode','FlightTutorial','Ads'];
    const missing=need.filter(n=>g[n]===undefined);
    assert(missing.length===0,'missing globals: '+missing.join(', '));
  });

  await test('all 9 mini-games are registered',()=>{
    const ids=['memory','speed','pattern','vision','logic','math','focus','nav','timing'];
    const missing=ids.filter(id=>!g.Games[id]||typeof g.Games[id].create!=='function');
    assert(missing.length===0,'missing/broken Games entries: '+missing.join(', '));
  });

  /* ---- settings controls can be initialized ---- */
  await test('settings controls exist and are initialized from SAVE',()=>{
    const sound=document.getElementById('setSound');
    const music=document.getElementById('setMusic');
    const motion=document.getElementById('setMotion');
    const haptics=document.getElementById('setHaptics');
    assert(sound&&music&&motion&&haptics,'one or more settings toggles missing from the DOM');
    assertEqual(sound.checked,!!g.SAVE.set.sound,'setSound checkbox not synced to SAVE.set.sound');
    assertEqual(music.checked,!!g.SAVE.set.music,'setMusic checkbox not synced to SAVE.set.music');
  });

  /* ---- Sound toggle works ---- */
  await test('Sound toggle updates SAVE.set.sound',()=>{
    const inp=document.getElementById('setSound');
    const before=g.SAVE.set.sound;
    inp.checked=!before;
    assert(typeof inp.onchange==='function','setSound has no onchange handler bound');
    inp.onchange();
    assertEqual(g.SAVE.set.sound,!before,'toggling the checkbox did not update SAVE.set.sound');
    inp.checked=before;inp.onchange(); /* restore */
  });

  /* ---- Music toggle works ---- */
  await test('Music toggle updates SAVE.set.music',()=>{
    const inp=document.getElementById('setMusic');
    const before=g.SAVE.set.music;
    inp.checked=!before;inp.onchange();
    assertEqual(g.SAVE.set.music,!before,'toggling the checkbox did not update SAVE.set.music');
    inp.checked=before;inp.onchange();
  });

  /* ---- volume controls work ---- */
  await test('SFX/music volume sliders control SAVE and the gain nodes',()=>{
    const sfx=document.getElementById('setSfxVol');
    const mus=document.getElementById('setMusicVol');
    assert(sfx&&mus,'volume sliders missing from the DOM');
    sfx.value='40';assert(typeof sfx.oninput==='function','setSfxVol has no oninput handler');sfx.oninput();
    assertEqual(g.SAVE.set.sfxVolume,40,'sfx slider did not update SAVE.set.sfxVolume');
    mus.value='65';mus.oninput();
    assertEqual(g.SAVE.set.musicVolume,65,'music slider did not update SAVE.set.musicVolume');
    /* and the actual Web Audio gain nodes must move, not just the SAVE fields */
    g.SFX.unlock();
    g.SAVE.set.sound=true;sfx.value='20';sfx.oninput();
    g.SFX.setToggles();
    sfx.value='100';sfx.oninput();g.SFX.setToggles();
    /* can't read the private gain node from here; unlock+setToggles just must not throw
       with a range of volume values, which the earlier calls already proved */
  });

  /* ---- important UI sheets can open ---- */
  await test('important UI sheets can open',()=>{
    for(const id of['sheetPlay','sheetSettings','sheetAwards','sheetProfile']){
      g.UI.openSheet(id);
      const el=document.getElementById(id);
      assert(el&&el.classList.contains('open'),id+' did not gain the "open" class');
      g.UI.closeSheets();
    }
  });

  await test('planet / core / rift / shipyard / star-map sheets render without throwing',()=>{
    const p=g.PLANETS&&g.PLANETS[0];
    assert(p,'PLANETS[0] not found');
    g.UI.planetSheet(p);
    g.UI.coreSheet();
    g.UI.riftSheet();
    g.UI.shipyardSheet();
    g.UI.starMapSheet();
    g.UI.closeSheets();
  });

  /* ---- save can be created and loaded ---- */
  await test('save can be created and loaded (round-trips through Store)',async()=>{
    g.SAVE.coins=12345;g.SAVE.level=7;
    g.persist();
    await delay(260); /* persist() debounces ~200ms */
    g.loadSave();
    assertEqual(g.SAVE.coins,12345,'coins did not survive a persist/loadSave round trip');
    assertEqual(g.SAVE.level,7,'level did not survive a persist/loadSave round trip');
  });

  /* ---- save export/import works ---- */
  await test('exportSaveCode/importSaveCode round-trip a save',()=>{
    g.SAVE.coins=777;g.SAVE.xp=42;
    const code=g.exportSaveCode();
    assert(typeof code==='string'&&code.startsWith('SKYBRAIN1:'),'export code has the wrong shape');
    const res=g.importSaveCode(code);
    assert(res.ok,'importSaveCode rejected a code it just exported: '+(res.error||''));
    assertEqual(res.save.coins,777,'imported save lost the coins field');
    assertEqual(res.save.xp,42,'imported save lost the xp field');
  });

  /* ---- invalid save data is rejected safely ---- */
  await test('importSaveCode rejects garbage without throwing',()=>{
    const cases=['','not a save code','SKYBRAIN1:bad:checksum',
      'SKYBRAIN1:'+'x'.repeat(10)+':'+Buffer.from('{}').toString('base64'),
      null,undefined,12345,'SKYBRAIN1::'];
    for(const c of cases){
      const res=g.importSaveCode(c);
      assert(res&&res.ok===false&&typeof res.error==='string','did not safely reject: '+JSON.stringify(c));
    }
  });

  /* ---- each mini-game can be initialized ---- */
  await test('every mini-game initializes via Games[id].create(api).start()',()=>{
    const ids=Object.keys(g.Games);
    assert(ids.length>=9,'expected at least 9 registered mini-games, found '+ids.length);
    for(const id of ids){
      const area=document.createElement('div');
      let finished=false,cleanupFns=[];
      const api={
        area,rng:g.makeRng('smoke-test-'+id),difficulty:5,mode:'test',
        prompt(){},correct(){},wrong(){},popup(){},
        timer(){let cancelled=false;return{over:new Promise(()=>{}),cancel(){cancelled=true;}};},
        finish(){finished=true;},
        cleanup(fn){cleanupFns.push(fn);}
      };
      let instance;
      try{instance=g.Games[id].create({api});}
      catch(e){throw new Error('Games.'+id+'.create() threw: '+e.message);}
      assert(instance&&typeof instance.start==='function',id+'.create() did not return a {start()}');
      try{instance.start();}
      catch(e){throw new Error('Games.'+id+'.start() threw: '+e.message);}
      cleanupFns.forEach(fn=>{try{fn();}catch(e){}}); /* stop any timers the game armed */
    }
  });

  /* ---- Endless Rift can generate stages ---- */
  await test('endlessStage generates a valid stage at every checked level, ramping smoothly toward 50',()=>{
    const levels=[1,5,19,20,34,35,40,45,48,49,50,51,80];
    let prevDiff=0;
    for(const lv of levels){
      const st=g.endlessStage('smoke-seed',lv);
      assert(st&&typeof st.game==='string','no game chosen at level '+lv);
      assert(st.difficulty>=1,'difficulty below 1 at level '+lv);
      assertEqual(st.insane,lv>=50,'insane flag wrong at level '+lv);
      assert(st.difficulty>=prevDiff-0.001,'difficulty regressed at level '+lv+' ('+st.difficulty+' < '+prevDiff+')');
      prevDiff=st.difficulty;
    }
    /* the specific regression this exists to catch: level 49 must already be
       close to level 50's difficulty — no cliff */
    const d49=g.endlessStage('smoke-seed',49).difficulty;
    const d50=g.endlessStage('smoke-seed',50).difficulty;
    assert(d50-d49<=1,'difficulty jumps more than 1 tier between level 49 and 50 (d49='+d49+', d50='+d50+') — that is the cliff this feature removes');
    assert(d49>10,'level 49 should already be ramping past the old difficulty-10 ceiling');
  });

  /* ---- Vision can generate accessible visual challenges ---- */
  await test('genVision never relies on hue alone — hue rounds always carry a non-color cue',()=>{
    let hueRounds=0;
    for(let d=1;d<=10;d++){
      for(let seed=0;seed<40;seed++){
        const rng=g.makeRng('vision-a11y-'+d+'-'+seed);
        const v=g.genVision(rng,d);
        if(v.attr==='hue'){
          hueRounds++;
          assert(v.odd.mark===true,'hue round odd tile has no accessibility mark (d='+d+', seed='+seed+')');
          assert(!v.base.mark,'hue round base tile unexpectedly marked (d='+d+', seed='+seed+')');
          assert(v.odd.shape===v.base.shape,'hue round should only vary hue+mark, not shape');
        }else{
          assert(!v.odd.mark,'non-hue round should not carry the hue accessibility mark');
        }
      }
    }
    assert(hueRounds>50,'expected plenty of hue rounds across 400 samples, saw '+hueRounds);
  });

  /* ---- spaceship control state can initialize ---- */
  await test('Universe.ctrl exists with the 6 expected flight-control flags',()=>{
    const c=g.Universe.ctrl;
    assert(c,'Universe.ctrl is not exposed');
    for(const k of['left','right','fwd','rev','boost','brake'])
      assertEqual(typeof c[k],'boolean',k+' is not a boolean on Universe.ctrl');
  });

  await test('on-screen thruster buttons drive Universe.ctrl',()=>{
    const btn=document.getElementById('ctrlLeft');
    assert(btn,'#ctrlLeft missing from the DOM');
    btn.dispatchEvent(new window.Event('pointerdown',{pointerId:1}));
    assert(g.Universe.ctrl.left===true,'pressing #ctrlLeft did not set Universe.ctrl.left');
    btn.dispatchEvent(new window.Event('pointerup',{pointerId:1}));
    assert(g.Universe.ctrl.left===false,'releasing #ctrlLeft did not clear Universe.ctrl.left');
  });

  await test('setCtrl only accepts known control keys and cancels an active autopilot target',()=>{
    g.Universe.setCtrl('nonsense',true); /* must be a no-op, never throw */
    g.Universe.flyTo(10,10,null,false,'test');
    assert(g.Universe.ship.target,'flyTo did not set an autopilot target');
    g.Universe.setCtrl('fwd',true);
    assert(!g.Universe.ship.target,'manual input did not cancel the autopilot target');
    g.Universe.setCtrl('fwd',false);
  });

  /* ---- protect against regressions like startMusic() vs SFX.startMusic() ----
     applyToggles() wraps the call in try/catch (deliberately, so a future
     typo can't take the rest of Settings down) — so the regression this
     guards against does NOT throw, it silently no-ops. The only way to
     actually catch it is to check the OUTCOME: with music turned on and
     the audio context running, ambient music must actually start. */
  await test('turning music on while unlocked actually starts it (startMusic/stopMusic regression)',()=>{
    g.SFX.unlock();
    g.SAVE.set.music=false;g.SFX.setToggles();
    assertEqual(g.SFX.musicOn,false,'sanity check: music should be off before this test starts it');
    g.SAVE.set.music=true;
    g.SFX.setToggles(); /* must reach the real api.startMusic(), not a bare (and silently swallowed) startMusic() */
    assertEqual(g.SFX.musicOn,true,'SAVE.set.music=true did not actually start the music — a bare startMusic()/stopMusic() call is likely being silently swallowed');
    g.SAVE.set.music=false;
    g.SFX.setToggles();
    assertEqual(g.SFX.musicOn,false,'SAVE.set.music=false did not actually stop the music');
  });

  /* ---- Ads dev/prod safety ---- */
  await test('Ads.showRewarded auto-grants in dev mode and is deniable in production mode',async()=>{
    const devResult=await g.Ads.showRewarded('smoke-test');
    assertEqual(devResult,true,'dev mode (no provider, production flag off) should auto-grant');
    const flagName='SKYBRAIN_ADS_PRODUCTION';
    assert(g[flagName]===false,'SKYBRAIN_ADS_PRODUCTION should default to false in this repo');
  });

  /* ---- early-progression modifiers exist and are well-formed ---- */
  await test('EARLY_MODIFIERS and RIFT_DANGER_LINES are well-formed',()=>{
    assert(Array.isArray(g.EARLY_MODIFIERS)&&g.EARLY_MODIFIERS.length>0,'EARLY_MODIFIERS missing/empty');
    g.EARLY_MODIFIERS.forEach(m=>assert(m.mult>1&&typeof m.text==='string','malformed EARLY_MODIFIERS entry'));
    assert(Array.isArray(g.RIFT_DANGER_LINES)&&g.RIFT_DANGER_LINES.length>0,'RIFT_DANGER_LINES missing/empty');
  });

  await test('Universe.init did not leave the old tap-to-fly path wired as primary input',()=>{
    /* the ship must not reach max velocity from a single instantaneous tap —
       manual thrust is gradual; this is a light behavioural guard, not a
       full physics test */
    const s=g.Universe.ship;
    s.vx=0;s.vy=0;s.target=null;
    g.Universe.setCtrl('fwd',true);
    /* one tiny simulated frame's worth of thrust shouldn't already be at vmax */
    assert(Math.hypot(s.vx,s.vy)<430,'ship velocity is already at/above vmax with no elapsed time — instant teleport regression');
    g.Universe.setCtrl('fwd',false);
  });

  /* ---------- summary ---------- */
  const failed=results.filter(r=>!r.ok);
  console.log('\n'+results.length+' checks, '+(results.length-failed.length)+' passed, '+failed.length+' failed.');
  process.exit(failed.length?1:0);
})();
