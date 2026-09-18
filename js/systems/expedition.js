/* =====================================================================
   SkyBrain — systems/expedition.js · EXPEDITIONS (mini-adventures)
   ---------------------------------------------------------------------
   A 5–10 minute session made of connected events, never the same twice:

     LAUNCH → TRAVEL → random encounter → challenge → discovery
            → TRAVEL → another event → challenge → BONUS REWARD

   Legs are generated at launch: 2–4 waypoints scattered across the void,
   each with a random event type. The ship physically flies every leg
   (energy burns as normal); challenges run through the Engine and the
   world reacts through the consequence system.
   ===================================================================== */
const Expedition=(()=>{
  let exp=null; /* {legs:[{x,y,kind}],i,score,startT} */

  const LEG_KINDS=[
    {k:'encounter',w:.4, icon:'⚠️', name:'UNKNOWN CONTACT'},
    {k:'salvage',  w:.25,icon:'📦', name:'DEBRIS FIELD'},
    {k:'signal',   w:.2, icon:'📡', name:'FAINT SIGNAL'},
    {k:'phenomenon',w:.15,icon:'🌌',name:'STRANGE READING'}
  ];
  function pickKind(r){
    let roll=r(),acc=0;
    for(const k of LEG_KINDS){acc+=k.w;if(roll<=acc)return k;}
    return LEG_KINDS[0];
  }

  const active=()=>!!exp;

  function chip(txt){
    let c=$('#expChip');
    if(!c){c=el('div','','');c.id='expChip';$('#hud').appendChild(c);}
    if(txt==null){c.remove();return;}
    c.textContent=txt;
  }

  function start(){
    if(exp)return;
    if(typeof Shipsys!=='undefined'&&Shipsys.energy<20){
      UI.toast('⚠ Not enough ⚡ for an expedition — charge up near the ✦ Core first.');
      return;
    }
    const r=makeRng('EXP-'+Date.now().toString(36));
    const nLegs=2+Math.floor(r()*3); /* 2–4 legs */
    const legs=[];
    let px=Universe.ship.x,py=Universe.ship.y;
    for(let i=0;i<nLegs;i++){
      const a=r()*6.28,d=380+r()*420;
      px=clamp(px+Math.cos(a)*d,-1200,1200);
      py=clamp(py+Math.sin(a)*d,-850,900);
      legs.push({x:px,y:py,kind:pickKind(r)});
    }
    exp={legs,i:0,score:0,startT:Date.now(),r};
    UI.closeSheets();
    SFX.whoosh();
    UI.toast('🚀 <b>EXPEDITION LAUNCHED</b> — '+nLegs+' waypoints plotted. Follow the course.');
    Archive.record('expedition','Expedition launched — '+nLegs+' waypoints');
    nextLeg();
  }

  let watchT=0;
  function nextLeg(){
    if(!exp)return;
    if(exp.i>=exp.legs.length){finish();return;}
    const leg=exp.legs[exp.i];
    chip('🚀 EXPEDITION · LEG '+(exp.i+1)+' / '+exp.legs.length+' · '+leg.kind.icon+' '+leg.kind.name);
    exp.travelling=true;
    Universe.flyTo(leg.x,leg.y,()=>{exp&&(exp.travelling=false);arrive(leg);},false,leg.kind.name);
    /* course watchdog: if the player taps elsewhere mid-leg, flyTo is
       overridden and the arrival callback is lost — re-plot when idle */
    clearInterval(watchT);
    watchT=setInterval(()=>{
      if(!exp||!exp.travelling){clearInterval(watchT);return;}
      if(Engine.active)return;
      if(Universe.shipNear(leg.x,leg.y,60)){
        clearInterval(watchT);exp.travelling=false;arrive(leg);
      }else if(!Universe.ship.target){
        UI.toast('🧭 Course corrected — back on the expedition route.');
        Universe.flyTo(leg.x,leg.y,()=>{exp&&(exp.travelling=false);arrive(leg);});
      }
    },2500);
  }

  function arrive(leg){
    if(!exp)return;
    Universe.burst(leg.x,leg.y,'#ffd166',16);
    Universe.ringWave(leg.x,leg.y,'#ffd166');
    SFX.tick();buzz(10);
    const k=leg.kind.k;
    if(k==='salvage'){
      /* discovery leg — instant loot, no challenge */
      const n=25+Math.floor(exp.r()*40);
      SAVE.coins+=n;SAVE.stats.coinsEarned+=n;persist();
      SFX.coin();UI.refreshHud();
      UI.toast('📦 Debris field swept — <b>+'+n+' 🪙</b> in salvage.');
      exp.i++;setTimeout(nextLeg,1600);
    }else if(k==='phenomenon'){
      /* discovery leg — energy phenomenon */
      const n=15+Math.floor(exp.r()*20);
      Shipsys.addEnergy(n);
      SFX.coin();
      UI.toast('🌌 The reading was an energy bloom — <b>+'+n+' ⚡</b> absorbed.');
      exp.i++;setTimeout(nextLeg,1600);
    }else{
      /* challenge leg */
      setTimeout(()=>{
        if(!exp)return;
        Engine.startExpeditionLeg(leg,exp.i,exp.legs.length);
      },900);
    }
  }

  /* called by UI when an expedition-leg session's results close */
  function resolveLeg(result){
    if(!exp)return;
    exp.score+=result.score||0;
    if(result.userQuit){abort();return;}
    if(result.accuracy>=50){
      Shipsys.applyConsequence('expedition');
    }else{
      UI.toast('The contact fades… the expedition continues.');
    }
    exp.i++;
    Universe.enterFree();
    setTimeout(nextLeg,1300);
  }

  function finish(){
    if(!exp)return;
    clearInterval(watchT);
    const mins=Math.max(1,Math.round((Date.now()-exp.startT)/60000));
    const xp=90+exp.legs.length*35,coins=45+exp.legs.length*20;
    SAVE.coins+=coins;
    const{ups}=Prog.addXP(xp);
    persist();UI.refreshHud();
    Archive.record('expedition','Expedition completed — '+exp.legs.length+' waypoints · '+fmt(exp.score)+' pts');
    SFX.levelup();buzz([15,30,15]);
    UI.toast('🏁 <b>EXPEDITION COMPLETE</b> — '+exp.legs.length+' waypoints in ~'+mins+' min · +'+xp+' XP · +'+coins+' 🪙'+(ups?' · LEVEL UP!':''),5200);
    chip(null);
    exp=null;
  }

  function abort(){
    if(!exp)return;
    clearInterval(watchT);
    UI.toast('Expedition abandoned — the void keeps its secrets.');
    chip(null);
    exp=null;
  }

  return{start,resolveLeg,abort,active,get current(){return exp;}};
})();
