/* =====================================================================
   SkyBrain — boot.js · first-run intro · flight-control onboarding ·
   boot sequence · PWA registration
   ===================================================================== */
/* ---------- first-run cinematic intro ---------- */
let _introToken=0;
function playIntro(){
  const tok=++_introToken;
  $('#hintChip').classList.add('hidden');
  Universe.enterFree(0,0,3.0);
  Universe.focusPoint(0,-30,.74,4600,true);
  $('#introFade').style.opacity=1;
  setTimeout(()=>{if(tok===_introToken)$('#introFade').style.opacity=0;},700);
  setTimeout(()=>{
    if(tok!==_introToken)return;
    Universe.burst(0,0,'#ffffff',34);
    Universe.ringWave(0,0,auraCol());
    SFX.whoosh();
  },1000);
  setTimeout(()=>{if(tok===_introToken)UI.showIntro();},2500);
  const begin=()=>{
    if(tok!==_introToken)return;
    ++_introToken;
    UI.hideIntro();
    Universe.enterFree(0,-30,.74);
    SAVE.set.intro=true;persist();
    SFX.unlock();if(SAVE.set.music)SFX.startMusic();
    UI.refreshHud();
    if(!SAVE.tutorial.flight)setTimeout(()=>FlightTutorial.start(),700);
    else if(!SAVE.daily.lastDone)setTimeout(()=>UI.toast('Tap the glowing ✦ Core — your first Daily Challenge awaits.'),900);
  };
  $('#introBegin').onclick=begin;
  $('#intro').onclick=e=>{if(e.target.id!=='introBegin')begin();};
}

/* ---------- first-run flight-control onboarding ----------
   Short, interactive, shown once (per SAVE.tutorial.flight), then never
   again unless the player taps "Replay flight training" in Settings.
   Every existing save gets this once too — tap-to-fly is gone, so
   returning players need the same one-time lesson as brand-new ones. */
const FlightTutorial=(()=>{
  let stepIdx=0,tStep=0,timer=null,active=false,startPos=null;
  const STEPS=[
    {text:'Tap <b>◀</b> or <b>▶</b> to rotate your ship.',
      hl:['#ctrlLeft','#ctrlRight'],
      done:()=>Universe.ctrl.left||Universe.ctrl.right},
    {text:'Hold <b>▲</b> to fire the main engine and accelerate forward.',
      hl:['#ctrlFwd'],
      done:()=>Math.hypot(Universe.ship.vx,Universe.ship.vy)>60},
    {text:'Let go of <b>▲</b> — the ship keeps drifting. That\'s inertia: there\'s no friction out here.',
      hl:[],
      done:()=>!Universe.ctrl.fwd&&tStep>1.3},
    {text:'Hold <b>▼</b> to fire retro-thrusters and slow back down.',
      hl:['#ctrlRev'],
      done:()=>Universe.ctrl.rev},
    {text:'Hold <b>⚡ BOOST</b> together with <b>▲</b> for a burst of speed. Boost only works while thrusting forward.',
      hl:['#ctrlBoost','#ctrlFwd'],
      done:()=>Universe.ctrl.boost&&Universe.ctrl.fwd},
    {text:'That burst burns energy about twice as fast as normal thrust — save it for when you really need it.',
      hl:[],
      done:()=>tStep>2.1},
    {text:'Now fly a short distance on your own to finish training. You\'ve got this, Neuronaut.',
      hl:['#ctrlFwd','#ctrlLeft','#ctrlRight'],
      done:()=>startPos&&Math.hypot(Universe.ship.x-startPos.x,Universe.ship.y-startPos.y)>240}
  ];
  function clearHighlights(){$$('.scBtn').forEach(b=>b.classList.remove('tutHighlight'));}
  function applyHighlights(){
    clearHighlights();
    (STEPS[stepIdx].hl||[]).forEach(sel=>{const b=$(sel);if(b)b.classList.add('tutHighlight');});
  }
  function render(){
    $('#ftStep').textContent=stepIdx+1;
    $('#ftText').innerHTML=STEPS[stepIdx].text;
    $('#ftNext').classList.add('hidden');
    applyHighlights();
  }
  function tick(){
    if(!active)return;
    tStep+=.15;
    if(tStep>5.5)$('#ftNext').classList.remove('hidden'); /* stuck? an escape hatch appears */
    if(STEPS[stepIdx].done())advance();
  }
  function advance(){
    stepIdx++;tStep=0;
    if(stepIdx>=STEPS.length){finish();return;}
    render();SFX.select();buzz(10);
  }
  function finish(){
    active=false;clearInterval(timer);clearHighlights();
    $('#flightTut').classList.add('hidden');
    SAVE.tutorial.flight=true;persist();
    SFX.levelup&&SFX.levelup();
    UI.toast('🚀 Flight training complete — fly safe out there.');
  }
  function start(){
    if(active)return;
    active=true;stepIdx=0;tStep=0;
    startPos={x:Universe.ship.x,y:Universe.ship.y};
    $('#flightTut').classList.remove('hidden');
    render();
    clearInterval(timer);timer=setInterval(tick,150);
  }
  $('#ftSkip').onclick=()=>finish();
  $('#ftNext').onclick=()=>advance();
  return{start,get active(){return active;}};
})();

/* ---------- boot ---------- */
function refreshPlaySheet(){
  const d=buildDaily(todayStr());
  $('#mcDailySub').textContent='#'+d.number+' · '+d.stages.length+' stages · ~4 min';
  const done=SAVE.daily.lastDone===todayStr();
  $('#mcDailyTag').textContent=done?'DONE ✓':'READY';
  $('#mcDailyTag').classList.toggle('done',done);
  $('#mcRiftTag').textContent='BEST LV '+SAVE.best.endlessLevel;
}
function boot(){
  loadSave();
  document.body.classList.toggle('rm',!SAVE.set.motion);
  Universe.init();
  UI.init();
  Shipsys.init();
  Missions.ensure();
  UI.renderAch();
  UI.refreshHud();
  refreshPlaySheet();

  Universe.onPick=hit=>{
    if(Engine.active)return;
    if(hit.type==='planet')UI.planetSheet(PLANET_BY_ID[hit.id]);
    else if(hit.type==='core')UI.coreSheet();
    else if(hit.type==='rift')UI.riftSheet();
    else if(hit.type==='anomaly'&&Universe.anomaly){Signals.hideChip();Signals.engage(Universe.anomaly);}
  };
  Universe.onBack=()=>{UI.closeSheets();};

  /* a living signal is always somewhere out in the void */
  setTimeout(()=>{if(!Engine.active)Signals.ensure();},SAVE.set.intro?2500:16000);

  /* audio unlock on first gesture */
  const un=()=>{SFX.unlock();if(SAVE.set.music)SFX.startMusic();window.removeEventListener('pointerdown',un);window.removeEventListener('keydown',un);};
  window.addEventListener('pointerdown',un);
  window.addEventListener('keydown',un);

  /* dock + hud wiring */
  $('#dockPlay').onclick=()=>{refreshPlaySheet();UI.openSheet('sheetPlay');SFX.tap();};
  $('#dockMap').onclick=()=>{UI.starMapSheet();SFX.tap();};
  $('#pillEnergy').onclick=()=>{UI.shipyardSheet();SFX.tap();};
  $('#dockAwards').onclick=()=>{UI.renderAch();UI.renderMissions();UI.openSheet('sheetAwards');SFX.tap();};
  $('#dockProfile').onclick=()=>{UI.renderProfile();UI.openSheet('sheetProfile');SFX.tap();};
  $('#dockSettings').onclick=()=>UI.openSheet('sheetSettings');
  $('#hudLevel').onclick=$('#dockProfile').onclick;
  $('#pillStreak').onclick=$('#dockAwards').onclick;
  $('#pillCoins').onclick=$('#dockProfile').onclick;
  $('#modeDaily').onclick=()=>{
    if(!navigator.onLine){UI.showSignal();return;}
    UI.closeSheets();SFX.select();
    Universe.homeView(()=>UI.coreSheet());
  };
  $('#modeRift').onclick=()=>{
    if(!navigator.onLine){UI.showSignal();return;}
    UI.closeSheets();SFX.select();
    Universe.focusPoint(RIFT.x,RIFT.y,1.1,900,false);
    setTimeout(()=>UI.riftSheet(),650);
  };
  $('#modeExplore').onclick=()=>{
    UI.closeSheets();SFX.select();
    const a=Signals.ensure();
    if(a){
      Universe.flyTo(a.x+(Universe.ship.x<a.x?-1:1)*80,a.y+60,()=>{UI.toast('📡 Signal in range — tap it to decode.');},false,a.name);
      UI.toast('🛸 Course set — following the '+a.name.toLowerCase()+'…');
    }
  };
  $('#modeSurvey').onclick=()=>{
    if(!navigator.onLine){UI.showSignal();return;}
    UI.closeSheets();SFX.select();
    UI.starMapSheet();
  };
  $('#modeExped').onclick=()=>{
    SFX.select();
    if(Expedition.active()){UI.closeSheets();UI.toast('🚀 An expedition is already underway — follow the course.');return;}
    Expedition.start();
  };

  /* connectivity gate */
  if(!navigator.onLine)UI.showSignal();

  /* first run vs returning */
  if(!SAVE.set.intro){
    playIntro();
  }else{
    Universe.enterFree(0,-30,.74);
    const t=todayStr();
    if(SAVE.streak>0&&SAVE.daily.lastDone&&SAVE.daily.lastDone!==t&&SAVE.lastNudge!==t){
      SAVE.lastNudge=t;persist();
      setTimeout(()=>UI.toast('🔥 Your '+SAVE.streak+'-day streak awaits — today\'s Daily Challenge is ready.'),1400);
    }
    if(SAVE.set.music)setTimeout(()=>{if(SAVE.set.music)SFX.startMusic();},400);
    /* returning players whose save predates manual flight controls (or who
       never finished the lesson) get the same one-time onboarding */
    if(!SAVE.tutorial.flight)setTimeout(()=>FlightTutorial.start(),1200);
  }

  /* PWA — registration only (no offline gameplay by design) */
  try{
    if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  }catch(e){}
}
boot();

/* test/debug handle */
window.SkyBrain={SAVE,Engine,Universe,UI,Games,buildDaily,endlessStage,makeRng,Prog,Missions,Achieves,Discoveries,Archive,Signals,Selector,Shipsys,Store,todayStr,addDays,dailyNumber,genMath,genPattern,genVision,LOGIC_LIB,STORY_MAIN,REAL_STARS,REGIONS,genSystem,tierCatalog,warpEnergyCost,exportSaveCode,importSaveCode,FlightTutorial,RIFT_DANGER_LINES,EARLY_MODIFIERS,Ads};
