/* =====================================================================
   SkyBrain — systems/systems.js
   Missions · Achievements · Discovery cinematics · Cosmic Archive ·
   Signals (living anomaly events + story).
   ===================================================================== */

/* ---------- Cosmic Archive — permanent record of discoveries ---------- */
const Archive={
  record(kind,title,extra){
    SAVE.archive=SAVE.archive||[];
    SAVE.archive.unshift({k:kind,title,t:Date.now(),x:extra||null});
    if(SAVE.archive.length>200)SAVE.archive.length=200;
    persist();
  },
  all(){return SAVE.archive||[];}
};

/* ---------- Signals — living world events (anomalies + story) ---------- */
const Signals={
  _spawnT:0,
  ensure(){
    /* keep exactly one live anomaly out in the void */
    if(!Universe.anomaly){
      const a=Universe.spawnAnomaly(Date.now());
      const chip=$('#signalChip');
      if(chip){chip.textContent='📡 '+a.name+' DETECTED — FLY TO IT';chip.classList.remove('hidden');}
      return a;
    }
    return Universe.anomaly;
  },
  hideChip(){const c=$('#signalChip');if(c)c.classList.add('hidden');},
  /* player tapped / reached the anomaly */
  engage(anom){
    UI.anomalySheet(anom);
  },
  /* called after an anomaly session's results are closed */
  resolve(result){
    const anom=result.anomaly;
    if(!anom)return;
    this.hideChip();
    Universe.clearAnomaly();
    if(result.anomalySolved){
      SAVE.meta.anomaliesDecoded=(SAVE.meta.anomaliesDecoded||0)+1;
      if(SAVE.exploration){SAVE.exploration.db.signals++;SAVE.exploration.db.anomalies++;}
      /* the world reacts: solving produces a physical consequence */
      setTimeout(()=>Shipsys.applyConsequence('anomaly'),1200);
      /* reveal next main-story fragment, if any remain */
      const idx=SAVE.story.fragment;
      const frag=STORY_MAIN[idx]||null;
      if(frag)SAVE.story.fragment=idx+1;
      Archive.record('anomaly',anom.name+(frag?' — '+frag.title:''),frag?frag.id:null);
      persist();
      if(frag){UI.showLore(frag,()=>Signals._afterResolve());}
      else{UI.toast('📡 Signal decoded — the Archive grows.');Signals._afterResolve();}
    }else{
      UI.toast('📡 The signal slipped away… it will resurface elsewhere.');
      Signals._afterResolve();
    }
  },
  _afterResolve(){
    /* let the universe breathe, then a new signal appears */
    clearTimeout(this._spawnT);
    this._spawnT=setTimeout(()=>{
      this.ensure();
      UI.toast('📡 <b>New signal detected</b> — check your radar.');
      SFX.tick();
    },20000+Math.random()*25000);
  }
};
const Missions={
  today:null,
  ensure(){
    const t=todayStr();
    if(SAVE.missions.date!==t){SAVE.missions={date:t,progress:{},done:{}};persist();}
    const d=buildDaily(t);
    this.today=d.missions.map(id=>MISSIONS.find(m=>m.id===id));
  },
  ev(ev,val){
    if(!this.today)return;
    if(SAVE.missions.date!==todayStr())this.ensure(); /* midnight rollover mid-session */
    let changed=false;
    for(const m of this.today){
      if(m.ev!==ev||SAVE.missions.done[m.id])continue;
      const cur=SAVE.missions.progress[m.id]||0;
      const nv=(ev==='score'||ev==='combo'||ev==='endless')?Math.max(cur,val||0):cur+(val||1);
      SAVE.missions.progress[m.id]=nv;changed=true;
      if(nv>=m.target){
        SAVE.missions.done[m.id]=true;
        if(m.rw.xp)Prog.addXP(m.rw.xp);
        if(m.rw.coins)SAVE.coins+=m.rw.coins;
        UI.toast('📜 Mission complete — '+m.txt+' <b>'+(m.rw.xp?'+'+m.rw.xp+' XP':'+'+m.rw.coins+' 🪙')+'</b>');
        SFX.achieve();buzz(20);UI.refreshHud();
      }
    }
    if(changed){
      persist();
      if($('#sheetAwards').classList.contains('open'))UI.renderMissions();
    }
  }
};

const Achieves={
  grant(id){
    if(SAVE.ach[id])return;
    SAVE.ach[id]=Date.now();
    const a=ACH.find(x=>x.id===id);
    SAVE.coins+=40;SAVE.stats.coinsEarned+=40;
    UI.achToast(a);SFX.achieve();buzz([15,30,15]);
    UI.refreshHud();persist();
  },
  check(ctx){
    ctx=ctx||{};
    if(SAVE.stats.sessions>=1)this.grant('a_first');
    if(SAVE.stats.sessions>=5)this.grant('a_five');
    if(SAVE.streak>=7)this.grant('a_week');
    if(SAVE.streak>=30)this.grant('a_month');
    if(ctx.avgReaction!=null&&ctx.avgReaction<300)this.grant('a_bolt');
    if(ctx.official&&ctx.accuracy===100&&(ctx.answers||0)>=20)this.grant('a_perfect');
    if(ctx.flawlessGame==='vision')this.grant('a_eye');
    if(SAVE.unlocked.galaxies.includes('g2'))this.grant('a_gal2');
    if(SAVE.unlocked.galaxies.includes('g3'))this.grant('a_gal3');
    if(SAVE.level>=10)this.grant('a_lv10');
    if(SAVE.level>=25)this.grant('a_lv25');
    if(SAVE.coins>=1000)this.grant('a_rich');
    if(SAVE.best.endlessLevel>=20)this.grant('a_end20');
    if(SAVE.best.endlessLevel>=50)this.grant('a_end50');
    if(SAVE.cosmetics.owned.length>4)this.grant('a_shop');
  }
};

/* ---------- discovery cinematics queue ---------- */
const Discoveries={
  queue:[],_running:false,
  maybeRun(){
    if(this._running||!this.queue.length){if(!this.queue.length)Universe.homeView();return;}
    this._running=true;
    this._next();
  },
  _next(){
    const p=this.queue.shift();
    if(!p){this._running=false;Universe.homeView();return;}
    const pos=Universe.planetPos(p,Universe.time);
    const isGalaxy=p.g!=='g1'&&SAVE.unlocked.galaxies.includes(p.g)&&PLANETS.filter(x=>x.g===p.g&&x.lv<=SAVE.level)[0]===p;
    Universe.focusPlanet(p,1.6,1700,true);
    SFX.whoosh();
    setTimeout(()=>{
      if(!Universe.running)return this._fallback(p);
      Universe.beams(pos.x,pos.y,p.glow,30);
      Universe.ringWave(pos.x,pos.y,p.glow);
      SFX.fanfare();
    },700);
    setTimeout(()=>{
      UI.showDiscover(p,isGalaxy,
        ()=>{Universe.enterFree();UI.planetSheet(p);},
        ()=>{this._next();});
    },1300);
  },
  _fallback(p){/* if canvas paused, just show the panel */
    UI.showDiscover(p,false,()=>{Universe.enterFree();UI.planetSheet(p);},()=>this._next());
  }
};

