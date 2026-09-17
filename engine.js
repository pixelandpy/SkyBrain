/* =====================================================================
   SkyBrain — S7 · GAME ENGINE + PROGRESSION
   Controls session flow: stage intro → countdown → play → clear → next
   Handles score, combo, lives, timers, rewards, unlocks.
   Stage RNG is fully deterministic per session seed.
   ===================================================================== */
const Prog={
  xpNeed:lv=>120+(lv-1)*90,
  addXP(n){
    SAVE.xp+=n;let ups=0;
    while(SAVE.xp>=this.xpNeed(SAVE.level)&&SAVE.level<999){SAVE.xp-=this.xpNeed(SAVE.level);SAVE.level++;ups++;}
    const un=this.checkUnlocks();persist();
    return{ups,unlocks:un};
  },
  checkUnlocks(){
    const nu=[],ng=[];
    for(const p of PLANETS){
      if(SAVE.level>=p.lv&&!SAVE.unlocked.planets.includes(p.id)){
        SAVE.unlocked.planets.push(p.id);nu.push(p);
        if(typeof Archive!=='undefined')Archive.record('planet',p.name+' awakened');
      }
    }
    for(const gid of['g2','g3']){
      const ps=PLANETS.filter(p=>p.g===gid);
      if(ps.some(p=>SAVE.unlocked.planets.includes(p.id))&&!SAVE.unlocked.galaxies.includes(gid)){
        SAVE.unlocked.galaxies.push(gid);ng.push(gid);
        if(typeof Archive!=='undefined')Archive.record('galaxy',GALAXIES[gid].name+' relit');
      }
    }
    return{planets:nu,galaxies:ng};
  }
};

const Engine=(()=>{
  let S=null;

  /* ---------- session configs ---------- */
  function startDaily(practice){
    const t=todayStr(),d=buildDaily(t);
    return run({mode:'daily',practice:!!practice,label:'DAILY CHALLENGE #'+d.number,stages:d.stages,daily:d,seedBase:'SKYBRAIN-'+t});
  }
  /* planet visits are dynamic missions: the world's own skill leads, and the
     selector may add a second, different challenge — every visit differs.
     Before Vision unlocks (level<5) a mixed second stage is noticeably more
     likely, so a visit rarely feels like "just the one activity" while the
     player only has 2-3 planets open — see SkyBrain_Improvement_Pass §3. */
  function startPlanet(p){
    const rng=makeRng('PLANET-'+p.id+'-'+Date.now().toString(36));
    const earlyGame=SAVE.level<5;
    const stages=[frameStage({game:p.game,difficulty:planetDiff(p)},rng)];
    let scoreMult=1,modifier=null;
    if(rng()<(earlyGame?.68:.45)){
      let g2=Selector.pickGame(rng,null);
      if(g2===p.game)g2=Selector.pickGame(rng,null);
      if(g2!==p.game)stages.push(frameStage({game:g2,difficulty:clamp(planetDiff(p)-1,1,10)},rng));
    }
    /* occasional rotating modifier: purely a flavor + reward twist, never a
       mechanical change to a mini-game — early runs stay approachable */
    if(earlyGame&&rng()<.25){
      modifier=pick(rng,EARLY_MODIFIERS);
      scoreMult=modifier.mult;
      stages[0].frame=modifier.text+(stages[0].frame?' '+stages[0].frame:'');
    }
    return run({mode:'planet',practice:true,label:p.name,stages,planet:p,modifier,scoreMult,
      seedBase:'PLANET-'+p.id});
  }
  function startEndless(){
    const seed=Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
    return run({mode:'endless',label:'ENDLESS RIFT',nextStage:lv=>endlessStage(seed,lv),seedBase:'RIFT-'+seed});
  }
  /* anomaly encounter: 2 context-picked stages via the Selector (see engine/selector.js) */
  function startAnomaly(anom){
    const rng=makeRng('ANOM-'+anom.seed);
    const stages=Selector.anomalyStages(rng,anom.name).map(s=>frameStage(s,rng));
    return run({mode:'anomaly',practice:false,label:anom.icon+' '+anom.name,stages,anomaly:anom,seedBase:'ANOM-'+anom.seed});
  }
  /* star-system survey: warp jump → 1-2 framed challenges → charted system */
  function startSurvey(sys){
    const rng=makeRng('SURVEY-'+sys.seed);
    const n=sys.tier>=3?2:1;
    const stages=[];
    for(let i=0;i<n;i++){
      const g=Selector.pickGame(rng,null);
      stages.push(frameStage({game:g,difficulty:clamp(Selector.difficultyFor(g)+sys.tier-1,1,10)},rng));
    }
    return run({mode:'survey',practice:false,label:'🔭 SURVEY · '+sys.name,stages,survey:sys,seedBase:'SURVEY-'+sys.seed});
  }
  /* expedition leg: 1 dynamically selected challenge at a waypoint */
  function startExpeditionLeg(leg,idx,total){
    const rng=makeRng('EXPLEG-'+Date.now().toString(36));
    const ctx=leg.kind.k==='signal'?'UNKNOWN SIGNAL':null;
    const g=Selector.pickGame(rng,ctx);
    const stages=[frameStage({game:g,difficulty:Selector.difficultyFor(g)},rng)];
    return run({mode:'expedition',practice:false,
      label:'🚀 EXPEDITION '+(idx+1)+'/'+total+' · '+leg.kind.icon+' '+leg.kind.name,
      stages,seedBase:'EXPLEG-'+idx+'-'+Date.now().toString(36)});
  }
  /* mission framing: the puzzle exists because something is happening */
  function frameStage(s,rng){
    if(typeof MISSION_FRAMES!=='undefined'&&MISSION_FRAMES[s.game]){
      s.frame=pick(rng||Math.random,MISSION_FRAMES[s.game]);
    }
    return s;
  }

  /* ---------- main loop ---------- */
  async function run(cfg){
    if(typeof navigator!=='undefined'&&!navigator.onLine){UI.showSignal();return false;}
    S={cfg,score:0,combo:0,maxCombo:0,correct:0,wrong:0,answers:0,
       lives:cfg.mode==='endless'?3:0,level:0,stagesDone:0,
       avgReaction:null,seqHeld:0,seqTotal:0,logicC:0,logicT:0,
       flawlessStage:false,flawlessGame:null,speedPlayed:false,userQuit:false};
    Universe.pause();
    UI.game.open(cfg);
    let dead=false;
    if(cfg.mode==='endless'){
      while(S.lives>0&&!dead&&!S.userQuit){
        S.level++;
        const st=cfg.nextStage(S.level);
        const subtitle=st.insane?'INSANE TIER — timers shrink'
          :(st.ramp>.4?pick(Math.random,RIFT_DANGER_LINES):Games[st.game].name+' · difficulty '+st.difficulty);
        await UI.game.splash('LEVEL '+S.level,subtitle);
        if(S.userQuit)break;
        if(!(await runStage(st,-1)))dead=true;
        await wait(1150);
      }
    }else{
      for(let i=0;i<cfg.stages.length;i++){
        if(S.userQuit)break;
        if(!(await runStage(cfg.stages[i],i)))dead=true;
        if(dead)break;
        await wait(1150);
      }
    }
    const result=finish();
    UI.game.close();
    Universe.resume();
    UI.results.show(result);
    return true;
  }

  /* ---------- one stage ---------- */
  function runStage(st,idx){
    let _resolve=null;const cleanups=[];
    return new Promise(resolve=>{
      if(!S){resolve(false);return;}
      const g=Games[st.game];
      const label=st.level!==undefined?('LEVEL '+st.level):('STAGE '+(idx+1)+'/'+S.cfg.stages.length);
      const stageRngKey=S.cfg.seedBase+'|'+(st.level!=null?('L'+st.level):('S'+idx))+'|'+st.game;
      UI.game.header(label+' · '+g.name,!!st.insane);
      /* allow quitting while the intro card is up */
      S._abort=()=>{const si=$('#stageIntro');if(si){si.classList.add('hidden');si.onclick=null;}resolve(false);};
      UI.game.stageIntro(g,st,label,async()=>{
        if(!S||S.userQuit){resolve(false);return;}
        await UI.game.countdown();
        if(!S||S.userQuit){resolve(false);return;}
        const area=$('#gArea');
        area.innerHTML='';UI.game.prompt('');UI.game.score(S.score);UI.game.comboHide();
        const stage={game:st.game,difficulty:st.difficulty,score:0,correct:0,wrong:0,answers:0};
        const api={
          area,rng:makeRng(stageRngKey),difficulty:st.difficulty,mode:S.cfg.mode,
          prompt(h){UI.game.prompt(h);},
          correct(base,opts){
            if(!S)return;opts=opts||{};
            S.combo++;stage.correct++;S.correct++;S.answers++;stage.answers++;
            const mult=1+Math.min(S.combo-1,10)*.1;
            const pts=Math.round(base*mult*(S.cfg.scoreMult||1));
            stage.score+=pts;S.score+=pts;
            UI.game.popup(opts.text||('+'+fmt(pts)),opts.x!=null?opts.x:50,opts.y!=null?opts.y:32,false);
            SFX.correct();buzz(12);
            if(S.combo>=2){SFX.combo(S.combo);UI.game.comboShow(S.combo);}
            UI.game.score(S.score);
            Missions.ev('correct',1);
            if(S.combo>=5)Missions.ev('combo',S.combo);
            if(S.combo>=8)Achieves.grant('a_combo8');
            SAVE.stats.maxCombo=Math.max(SAVE.stats.maxCombo,S.combo);
          },
          wrong(opts,quiet){
            if(!S)return;
            S.combo=0;stage.wrong++;S.wrong++;S.answers++;stage.answers++;
            UI.game.comboHide();SFX.wrong();buzz([18,40,18]);
            if(!quiet)UI.game.popup((opts&&opts.text)||'✕',(opts&&opts.x!=null)?opts.x:50,(opts&&opts.y!=null)?opts.y:40,true);
            UI.game.badFlash();
            if(S.cfg.mode==='endless'){
              S.lives--;UI.game.lives(S.lives);
              if(S.lives<=0){abortStage();return;}
            }
          },
          popup(t,x,y,neg){UI.game.popup(t,x,y,neg);},
          timer(sec){
            /* pre-INSANE ramp (Endless Rift, levels ~35-48): timers tighten
               smoothly as `ramp` climbs toward 1, so level 50 is a milestone
               inside an already-tense stretch rather than a sudden cliff */
            if(S.cfg.mode==='endless'&&st.ramp)sec=sec*(1-st.ramp*.22);
            const bar=$('#gTimer'),fill=$('#gTimerFill');
            bar.style.opacity=1;fill.style.width='100%';
            let doneT=false,raf0=0;const t0=performance.now();
            let res=null;
            const over=new Promise(r=>{res=r;});
            function frame(now){
              if(doneT)return;
              const f=1-(now-t0)/(sec*1000);
              fill.style.width=Math.max(0,f*100)+'%';
              if(f<=0){doneT=true;bar.style.opacity=.25;api.wrong({timeout:true,quiet:true});res('timeout');return;}
              raf0=requestAnimationFrame(frame);
            }
            raf0=requestAnimationFrame(frame);
            return{over,cancel(){if(doneT)return;doneT=true;cancelAnimationFrame(raf0);bar.style.opacity=.25;}};
          },
          finish(summary){
            if(!S)return;
            summary=summary||{};
            cleanups.forEach(f=>{try{f();}catch(e){}});
            S.stagesDone++;
            if(st.game==='speed'&&summary.extra&&summary.extra.avgReaction){
              S.avgReaction=S.avgReaction==null?summary.extra.avgReaction:Math.min(S.avgReaction,summary.extra.avgReaction);
              S.speedPlayed=true;
            }
            if(st.game==='memory'&&summary.extra){S.seqHeld+=summary.extra.seqHeld||0;S.seqTotal+=summary.extra.seqTotal||0;}
            if(st.game==='logic'||st.game==='pattern'){S.logicC+=stage.correct;S.logicT+=stage.answers;}
            if(stage.wrong===0){S.flawlessStage=true;S.flawlessGame=st.game;}
            if(st.game==='speed')Missions.ev('speed',1);
            const txt=S.cfg.mode==='endless'?'LEVEL CLEAR':'STAGE CLEAR';
            UI.game.banner(txt,'+'+fmt(stage.score)+' pts'+(summary.info?' · '+summary.info:''));
            resolve(true);_resolve=null;S._abort=null;
          },
          cleanup(fn){cleanups.push(fn);}
        };
        S._abort=abortStage;
        g.create({api}).start();
      });
      function abortStage(){
        cleanups.forEach(f=>{try{f();}catch(e){}});
        $('#gArea').innerHTML='';
        UI.game.banner(S.cfg.mode==='endless'?'RIFT COLLAPSE':'SESSION ENDED',S.userQuit?'you left the session':'no lives left');
        setTimeout(()=>resolve(false),950);
      }
    });
  }

  /* ---------- rewards + summary ---------- */
  function finish(){
    const cfg=S.cfg,mode=cfg.mode;
    const official=mode==='daily'&&!cfg.practice;
    const score=S.score;
    const accuracy=S.answers?Math.round(S.correct/S.answers*100):0;
    const stars=score<=0?0:1+(accuracy>=70?1:0)+(accuracy>=90&&S.wrong===0?1:0);
    let xp,coins;
    if(mode==='daily'&&official){xp=Math.round(score/18)+140;coins=Math.round(score/160)+60;}
    else if(mode==='endless'){xp=Math.round(score/22)+S.level*6;coins=Math.round(score/180)+S.level*2;}
    else if(mode==='anomaly'){xp=Math.round(score/30)+50;coins=Math.round(score/250)+20;}
    else if(mode==='survey'){
      const tier=(cfg.survey&&cfg.survey.tier)||1;
      xp=Math.round(score/26)+40+tier*25;coins=Math.round(score/220)+15+tier*12;
    }
    else if(mode==='expedition'){xp=Math.round(score/32)+30;coins=Math.round(score/280)+12;}
    else{xp=Math.round(score/60);coins=Math.round(score/400);}

    const prevStreak=SAVE.streak;
    if(mode==='daily'&&official){
      const t=todayStr(),y=addDays(t,-1);
      if(SAVE.daily.lastDone!==t){
        if(SAVE.daily.lastDone===y)SAVE.streak++;
        else if(SAVE.shields>0){SAVE.shields--;SAVE.streak++;}
        else SAVE.streak=1;
        SAVE.bestStreak=Math.max(SAVE.bestStreak,SAVE.streak);
        SAVE.daily.lastDone=t;SAVE.daily.history[t]=score;
        SAVE.stats.dailies++;Missions.ev('daily',1);
      }
      coins+=Math.min(SAVE.streak,10)*4;
    }

    let isNewBest=false;
    if(mode==='daily'&&official&&score>SAVE.best.daily){SAVE.best.daily=score;isNewBest=true;}
    if(mode==='endless'){
      if(S.level>SAVE.best.endlessLevel){SAVE.best.endlessLevel=S.level;isNewBest=true;}
      if(score>SAVE.best.endlessScore)SAVE.best.endlessScore=score;
      if(S.level>=3)Missions.ev('endless',S.level);
    }
    if(score>=3000)Missions.ev('score',score);
    if(S.flawlessStage){SAVE.stats.flawless++;Missions.ev('flawless',1);}

    /* credit the session rewards (coins were previously display-only — bug) */
    SAVE.coins+=coins;SAVE.stats.coinsEarned+=coins;
    const{ups,unlocks}=Prog.addXP(xp);
    SAVE.stats.sessions++;SAVE.stats.answers+=S.answers;SAVE.stats.correct+=S.correct;
    if(S.speedPlayed)SAVE.stats.speedPlays++;
    if(S.avgReaction!=null&&(SAVE.stats.bestReaction==null||S.avgReaction<SAVE.stats.bestReaction))SAVE.stats.bestReaction=S.avgReaction;
    if(mode==='planet'&&cfg.planet){
      const pp=SAVE.perPlanet[cfg.planet.id]||(SAVE.perPlanet[cfg.planet.id]={best:0,plays:0});
      pp.plays++;pp.best=Math.max(pp.best,score);
    }
    Achieves.check({official,accuracy,avgReaction:S.avgReaction,answers:S.answers,flawlessGame:S.flawlessGame});
    /* cosmic archive records */
    if(typeof Archive!=='undefined'){
      if(mode==='daily'&&official)Archive.record('daily','Daily Challenge #'+(cfg.daily?cfg.daily.number:'?')+' — '+fmt(score)+' pts');
      if(mode==='endless'&&S.level>=5)Archive.record('rift','Rift descent — level '+S.level);
    }
    persist();

    const result={mode,practice:!!cfg.practice,label:cfg.label,official,score,stars,accuracy,
      correct:S.correct,answers:S.answers,avgReaction:S.avgReaction,seqHeld:S.seqHeld,seqTotal:S.seqTotal,
      logicC:S.logicC,logicT:S.logicT,xp,coins,levelUps:ups,newPlanets:unlocks.planets,newGalaxies:unlocks.galaxies,
      isNewBest,streak:SAVE.streak,streakUp:official&&SAVE.streak>prevStreak,levelReached:S.level,
      userQuit:S.userQuit,flawlessGame:S.flawlessGame,dailyNumber:cfg.daily?cfg.daily.number:null,
      anomaly:cfg.anomaly||null,anomalySolved:mode==='anomaly'&&!S.userQuit&&accuracy>=50,
      survey:cfg.survey||null,surveySolved:mode==='survey'&&!S.userQuit&&accuracy>=50};
    S=null;
    return result;
  }

  function quit(){
    if(!S)return;
    UI.confirm('LEAVE SESSION?','Progress in this session will be lost. Are you sure?','LEAVE').then(ok=>{
      if(!ok||!S)return;
      S.userQuit=true;
      if(S._abort)S._abort();
    });
  }

  return{startDaily,startPlanet,startEndless,startAnomaly,startSurvey,startExpeditionLeg,quit,get active(){return !!S;}};
})();

