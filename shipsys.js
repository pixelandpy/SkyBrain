/* =====================================================================
   SkyBrain — systems/shipsys.js · SHIP SYSTEMS
   ---------------------------------------------------------------------
   Energy & fuel economy · flight drain (thrust-based) · solar charging ·
   upgrades (engine/core/scanner/warp) · star-map surveys with real
   astronomical distances · random travel events · cosmic database ·
   world consequences for solved challenges.
   ===================================================================== */
const Shipsys=(()=>{
  /* ---------- state helpers ---------- */
  function st(){return SAVE.ship;}
  function ex(){return SAVE.exploration;}
  const maxEnergy=()=>100+st().upgrades.core*40;
  const efficiency=()=>1+st().upgrades.core*.15;           /* divides drain */
  const accelBonus=()=>1+st().upgrades.engine*.3;
  const warpLevel=()=>st().upgrades.warp;
  const scannerLvl=()=>st().upgrades.scanner;
  const navLvl=()=>st().upgrades.nav||0;

  /* ---------- upgrades (gameplay-changing, not cosmetic) ---------- */
  const UPGRADES=[
    {id:'engine', icon:'🚀', name:'ENGINE',      max:3, cost:[250,600,1400],
     fx:['+30% acceleration per mark','lower burn cost at cruise','stronger boost']},
    {id:'core',   icon:'🔋', name:'ENERGY CORE', max:3, cost:[200,500,1200],
     fx:['+40 max energy per mark','+15% efficiency per mark','faster solar charging']},
    {id:'scanner',icon:'📡', name:'DEEP SCANNER',max:3, cost:[300,700,1500],
     fx:['signals appear sooner','detects RARE systems before jumping','+survey salvage']},
    {id:'nav',    icon:'🧭', name:'NAV COMPUTER',max:2, cost:[350,900],
     fx:['flags the cheapest jump in the Star Map','auto-plots the nearest signal/pickup on launch']},
    {id:'warp',   icon:'🕳️', name:'WARP DRIVE',  max:4, cost:[400,900,2000,4500],
     fx:['Mk I — DEEP SPACE (20–200 LY)','Mk II — FAR REACHES (200–2,000 LY)','Mk III — GALACTIC CORE','Mk IV — UNKNOWN SPACE']}
  ];
  function upgradeCost(u){const lv=st().upgrades[u.id];return lv>=u.max?null:u.cost[lv];}
  function buyUpgrade(id){
    const u=UPGRADES.find(x=>x.id===id);if(!u)return false;
    const cost=upgradeCost(u);
    if(cost==null){UI.toast('Already at maximum mark.');return false;}
    if(SAVE.coins<cost){UI.toast('Not enough 🪙 — challenges and surveys pay well.');SFX.wrong();return false;}
    SAVE.coins-=cost;st().upgrades[id]++;
    if(id==='core')st().energy=Math.min(st().energy+40,maxEnergy());
    persist();SFX.levelup();buzz(20);
    UI.toast(u.icon+' <b>'+u.name+' MK '+['I','II','III','IV'][st().upgrades[id]-1]+'</b> installed!');
    Archive.record('upgrade',u.name+' upgraded to Mk '+st().upgrades[id]);
    UI.refreshHud();
    return true;
  }

  /* ---------- energy economy ---------- */
  function addEnergy(n,quiet){
    st().energy=clamp(st().energy+n,0,maxEnergy());
    if(!quiet)UI.refreshHud();
    persist();
  }
  function buyEnergy(){
    const COST=60,GAIN=50;
    if(st().energy>=maxEnergy()-5){UI.toast('Energy banks already full.');return;}
    if(SAVE.coins<COST){UI.toast('Not enough 🪙 for an energy cell.');SFX.wrong();return;}
    SAVE.coins-=COST;addEnergy(GAIN);SFX.coin();buzz(12);
    UI.toast('🔋 Energy cell slotted — <b>+'+GAIN+' ⚡</b>');
    UI.refreshHud();
  }
  /* thrust-based drain, called from the universe frame loop */
  let lowWarned=false;
  function drainFlight(thrust,boost,dt){
    if(thrust<=.05)return;
    const rate=(boost?2.0:1.05)*thrust*dt/efficiency()/(1+st().upgrades.engine*.08);
    st().energy=Math.max(0,st().energy-rate);
    if(st().energy<=15&&!lowWarned){
      lowWarned=true;
      UI.toast('⚠ <b>ENERGY LOW</b> — return to the ✦ Core to solar-charge, or buy cells in the Star Map.');
    }
    if(st().energy>30)lowWarned=false;
  }
  const reserveMode=()=>st().energy<=0.5;
  /* solar charging near the Core + emergency trickle */
  function solarTick(dt){
    const s=Universe.ship;
    const nearCore=Math.hypot(s.x,s.y)<300;
    if(nearCore&&st().energy<maxEnergy()){
      st().energy=Math.min(maxEnergy(),st().energy+(1.1+st().upgrades.core*.5)*dt);
    }else if(reserveMode()||st().energy<12){
      st().energy=Math.min(12,st().energy+.6*dt); /* emergency trickle — never soft-locked */
    }
  }

  /* ---------- star map · surveys of real + procedural systems ---------- */
  let pendingSurvey=null;
  function regionUnlocked(reg){
    return SAVE.level>=reg.lv&&warpLevel()>=reg.warp;
  }
  function catalog(tier){return tierCatalog(tier,ex().surveyed[tier]||0);}
  function isSurveyed(id){return(ex().done||(ex().done={}))[id];}
  function launchSurvey(sys){
    const cost=st().freeWarp>0?0:warpEnergyCost(sys.ly,st().upgrades.core+st().upgrades.engine);
    if(cost>0&&st().energy<cost){
      UI.toast('Not enough ⚡ for a '+fmtLy(sys.ly)+' jump — need <b>'+cost+'</b>.');SFX.wrong();return;
    }
    if(st().freeWarp>0){st().freeWarp--;UI.toast('🕳️ Wormhole charge consumed — <b>free jump</b>.');}
    else st().energy-=cost;
    persist();UI.refreshHud();UI.closeSheets();
    pendingSurvey=sys;
    Universe.warpFX(()=>{Engine.startSurvey(sys);});
  }
  function resolveSurvey(result){
    const sys=result.survey;pendingSurvey=null;
    if(!sys)return;
    if(result.surveySolved){
      ex().surveyed[sys.tier]=(ex().surveyed[sys.tier]||0)+1;
      (ex().done||(ex().done={}))[sys.id]=true;
      ex().db.stars++;ex().db.planets+=sys.planets?sys.planets.length:0;
      let bonus=0;
      if(sys.rare){bonus=150+scannerLvl()*60;SAVE.coins+=bonus;ex().db.rare=(ex().db.rare||0)+1;}
      const planetLines=(sys.planets&&sys.planets.length)
        ?'\n\nSurvey log — '+sys.planets.length+' worlds charted: '+sys.planets.map(p=>p.name+' ('+p.type+', '+p.au+' AU)').slice(0,4).join(' · ')+(sys.planets.length>4?' …':'')
        :'';
      const text=sys.real
        ?sys.fact+'\n\nDistance from Earth: '+fmtLy(sys.ly)+' ≈ '+fmtKm(sys.ly)+'.\n\n⚗ REAL ASTRONOMY — this is a genuine celestial object with scientifically accurate data.'
        :'Class: '+sys.cls+' · Distance: '+fmtLy(sys.ly)+' ≈ '+fmtKm(sys.ly)+'.'+planetLines
          +(sys.quirk?'\n\nAnomaly note: '+sys.quirk:'')
          +(sys.rare?'\n\n★ RARE SYSTEM — salvage recovered: +'+bonus+' 🪙':'')
          +'\n\n✦ SKYBRAIN FICTION — a procedurally charted system of the SkyBrain universe.';
      Archive.record(sys.real?'realstar':'star',(sys.real?'⚗ ':'')+sys.name+' surveyed — '+fmtLy(sys.ly),null);
      persist();UI.refreshHud();
      UI.showLore({icon:sys.real?'🔭':'🌟',title:sys.name+(sys.rare?' ★':''),text},()=>{
        applyConsequence('survey');
      });
    }else{
      addEnergy(Math.round(warpEnergyCost(sys.ly,0)/2),true); /* partial refund */
      UI.toast('🔭 Survey window closed — half the jump energy recovered. The system remains uncharted.');
      UI.refreshHud();
    }
  }

  /* ---------- world consequences (solving changes the universe) ---------- */
  function applyConsequence(source){
    const roll=Math.random();let acc=0,c=CONSEQUENCES[0];
    for(const q of CONSEQUENCES){acc+=q.w;if(roll<=acc){c=q;break;}}
    const n=c.n();
    let txt=c.text.replace('{n}',n);
    if(c.id==='cq_energy')addEnergy(n,true);
    else if(c.id==='cq_coins'){SAVE.coins+=n;SAVE.stats.coinsEarned+=n;}
    else if(c.id==='cq_worm'){st().freeWarp++;ex().db.wormholes++;}
    else if(c.id==='cq_shield')SAVE.shields++;
    else if(c.id==='cq_scan'){setTimeout(()=>Signals.ensure(),3000);}
    else if(c.id==='cq_repair')st().energy=maxEnergy();
    persist();UI.refreshHud();SFX.coin();buzz(14);
    UI.toast(c.icon+' '+txt,4200);
  }

  /* ---------- random travel events (living universe) ---------- */
  let flightClock=0,eventCooldown=12;
  /* flavor-only "small discovery" beats — a toast + tiny reward, no mini-game.
     No new mechanic to learn, just something new happening while you fly —
     these lean into levels 1-5 so early exploration never feels empty
     between the 2-3 planets that are open yet (see Improvement Pass §3). */
  const DISCOVERY_EVENTS=[
    {text:'🔍 <b>Faint mineral trace</b> on sensors — logged for the Archive.',fx(){SAVE.coins+=8;SAVE.stats.coinsEarned+=8;}},
    {text:'🌠 A micro-meteor shower sparkles past — harmless, and kind of beautiful.',fx(){}},
    {text:'📻 Ambient static resolves into three seconds of music, then nothing.',fx(){}},
    {text:'🧊 A tiny ice fragment pings off the hull — no damage, just noise.',fx(){}},
    {text:'🔭 Deep Scan logs an unnamed rock in the void — one more dot on the map.',fx(){SAVE.exploration.db.planets+=1;}}
  ];
  function eventTick(dt){
    const s=Universe.ship;
    const speed=Math.hypot(s.vx,s.vy);
    if(speed>60)flightClock+=dt;
    if(eventCooldown>0){eventCooldown-=dt;return;}
    if(flightClock<10)return;
    flightClock=0;
    /* the void feels a little more alive for new players — before Vision
       unlocks there just aren't many planets to visit yet, so events (and
       the small discoveries below) surface a bit more often */
    const earlyGame=SAVE.level<5;
    eventCooldown=(22-scannerLvl()*4-(earlyGame?6:0))+Math.random()*20;
    if(eventCooldown<6)eventCooldown=6;
    if(Engine.active||UI.sheetsOpen())return;
    const roll=Math.random();
    if(roll<.25){ /* common — comet flyby */
      Universe.spawnComet();
      UI.toast('☄️ A comet streaks across your bow.');
    }else if(roll<.45){ /* common — drifting energy crystal */
      const p=Universe.spawnPickup('energy',s.x,s.y);
      if(p){UI.toast('🔹 <b>Strange energy reading</b> nearby — fly to it to harvest.');setTimeout(autoPlot,1400);}
    }else if(roll<.61){ /* uncommon — strong signal */
      if(!Universe.anomaly){Signals.ensure();UI.toast('📡 <b>Distress burst detected</b> — a fresh signal just lit up.');setTimeout(autoPlot,1400);}
    }else if(roll<.74){ /* uncommon — passing spacecraft */
      Universe.spawnComet(true);
      UI.toast('🛰️ An unidentified craft passes in the distance… it does not answer hails.');
    }else if(roll<.90){ /* small discovery — toast + tiny reward, no mini-game */
      const ev=pick(Math.random,DISCOVERY_EVENTS);
      ev.fx();persist();UI.refreshHud();
      UI.toast(ev.text);
    }else if(roll<.985){ /* rare — salvage cache */
      const p=Universe.spawnPickup('cache',s.x,s.y);
      if(p){UI.toast('📦 <b>Abandoned cargo pod</b> on sensors — worth collecting.');setTimeout(autoPlot,1400);}
    }else{ /* extremely rare — wormhole */
      st().freeWarp++;ex().db.wormholes++;persist();
      Universe.burst(s.x,s.y,'#c9b0ff',40);Universe.ringWave(s.x,s.y,'#c9b0ff');
      SFX.fanfare();
      Archive.record('wormhole','Transient wormhole rode your wake');
      UI.toast('🕳️ <b>A WORMHOLE blinks open beside you!</b> Next warp jump is FREE.',5200);
    }
  }
  function collectPickup(pk){
    if(pk.kind==='energy'){
      const n=18+scannerLvl()*6+Math.floor(Math.random()*14);
      addEnergy(n);SFX.coin();buzz(12);
      UI.toast('🔹 Energy crystal harvested — <b>+'+n+' ⚡</b>');
    }else{
      const n=30+Math.floor(Math.random()*45);
      SAVE.coins+=n;SAVE.stats.coinsEarned+=n;persist();SFX.coin();buzz(12);
      UI.toast('📦 Cargo pod cracked — <b>+'+n+' 🪙</b>');
      Archive.record('cache','Abandoned cargo pod salvaged');
    }
    UI.refreshHud();
  }

  /* ---------- flight HUD (velocity / distance / energy) ---------- */
  function hudTick(){
    const chip=$('#travelChip');if(!chip)return;
    const s=Universe.ship;
    const speed=Math.hypot(s.vx,s.vy);
    /* shown for BOTH autopilot travel (s.target set) and manual piloting —
       only the destination/route-% portion needs an active autopilot target */
    if(speed>25&&!Engine.active){
      const burn=((s.boost?2.0:1.05)*s.thrust/efficiency()/(1+st().upgrades.engine*.08));
      let head='';
      if(s.target){
        const d=Math.hypot(s.target.x-s.x,s.target.y-s.y);
        let prog='';
        if(s.routeFrom){
          const total=Math.hypot(s.target.x-s.routeFrom.x,s.target.y-s.routeFrom.y);
          if(total>40)prog=' · '+clamp(Math.round((1-d/total)*100),0,99)+'%';
        }
        head=(s.routeLabel?'→ '+s.routeLabel+' · ':'')+'DIST <b>'+fmt(Math.round(d*470))+'</b> Mm'+prog+' · ';
      }
      chip.innerHTML=head+(s.boost?'⚡ BOOST · ':'')+'VEL <b>'+fmt(Math.round(speed*90))+'</b> km/s'
        +' · −'+burn.toFixed(1)+'⚡/s · ⚡ '+Math.round(st().energy);
      chip.classList.remove('hidden');
      chip.classList.toggle('boosting',!!s.boost);
    }else chip.classList.add('hidden');
  }

  /* ---------- master tick ---------- */
  let tock=0;
  function init(){
    setInterval(()=>{
      const dt=.5;
      solarTick(dt);
      eventTick(dt);
      hudTick();
      if(++tock%4===0)UI.refreshHud(); /* keep ⚡ pill fresh */
    },500);
  }

  /* nav computer Mk II: auto-plot a course to the nearest live signal/pickup */
  function autoPlot(){
    if(navLvl()<2)return false;
    const s=Universe.ship;
    if(s.target||Engine.active||UI.sheetsOpen())return false;
    if(typeof Expedition!=='undefined'&&Expedition.active())return false;
    const cands=[];
    for(const p of Universe.pickups)
      cands.push({x:p.x,y:p.y,name:p.kind==='energy'?'ENERGY CRYSTAL':'CARGO POD'});
    const a=Universe.anomaly;
    if(a)cands.push({x:a.x+(s.x<a.x?-1:1)*80,y:a.y+60,name:a.name});
    if(!cands.length)return false;
    let best=null,bd=1e9;
    for(const c of cands){const d=Math.hypot(c.x-s.x,c.y-s.y);if(d<bd){bd=d;best=c;}}
    if(!best||bd<70)return false; /* already there */
    Universe.flyTo(best.x,best.y,null,false,best.name);
    UI.toast('🧭 <b>NAV Mk II</b> auto-plotted a course → '+best.name);
    return true;
  }

  /* nav computer: cheapest un-surveyed jump in a tier (route suggestion) */
  function bestRoute(tier){
    if(navLvl()<1)return null;
    const cat=catalog(tier).filter(s=>!isSurveyed(s.id));
    if(!cat.length)return null;
    return cat.reduce((a,b)=>a.ly<=b.ly?a:b).id;
  }
  return{init,UPGRADES,upgradeCost,buyUpgrade,buyEnergy,addEnergy,drainFlight,reserveMode,
    maxEnergy,accelBonus,warpLevel,scannerLvl,navLvl,bestRoute,autoPlot,regionUnlocked,catalog,isSurveyed,
    launchSurvey,resolveSurvey,applyConsequence,collectPickup,
    get energy(){return st().energy;},get freeWarp(){return st().freeWarp;}};
})();
