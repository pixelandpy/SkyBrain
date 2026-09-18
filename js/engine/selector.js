/* =====================================================================
   SkyBrain — engine/selector.js · CHALLENGE SELECTOR
   ---------------------------------------------------------------------
   Smart, non-repetitive challenge selection for world events (anomalies).
   NOT plain random.choice: it weighs
     · recency   — games played in the last few picks are strongly avoided
     · unlocks   — locked-planet games appear rarely (as "strange" signals)
     · mastery   — games the player performs worst at surface a bit more
     · context   — an anomaly kind can bias toward fitting games
   Difficulty is progression-aware (brain level + per-game plays).
   ===================================================================== */
const Selector=(()=>{
  const RECENT_KEY='recentGames';
  function recent(){
    SAVE.meta=SAVE.meta||{};
    return SAVE.meta[RECENT_KEY]||(SAVE.meta[RECENT_KEY]=[]);
  }
  function remember(gid){
    const r=recent();
    r.push(gid);while(r.length>4)r.shift();
    persist();
  }
  /* context bias: anomaly kind → fitting brain skills */
  const CONTEXT={
    'UNKNOWN SIGNAL':['memory','pattern','focus'],
    'DERELICT PROBE':['logic','math','timing'],
    'COSMIC ANOMALY':['speed','focus','nav'],
    'FROZEN ECHO':['memory','vision'],
    'DARK STRUCTURE':['logic','pattern','nav']
  };
  /* games not bound to a planet (navigation · timing) — always available,
     surfaced by encounters, expeditions and surveys */
  const FREE_GAMES=['nav','timing'];
  function accuracyOf(gid){
    const pp=SAVE.perPlanet[gid];
    if(!pp||!pp.plays)return null;
    return pp.best; /* proxy: best score — low best ⇒ needs training */
  }
  function pickGame(rng,context){
    const r=rng||Math.random;
    const rec=recent();
    const ctxGames=CONTEXT[context]||[];
    const cands=PLANETS.map(p=>{
      let w=1;
      const unlocked=SAVE.unlocked.planets.includes(p.id);
      if(!unlocked){
        /* rare taste of locked skills — before Vision unlocks (level<5),
           the NEXT couple of worlds surface noticeably more often, so early
           play gets a real "introductory version of later mechanics" instead
           of only ever seeing the 2-3 already-unlocked activities */
        const gap=p.lv-SAVE.level;
        w*=(SAVE.level<5&&gap>0&&gap<=6)?.5:.2;
      }
      const backIdx=rec.lastIndexOf(p.game);
      if(backIdx>=0)w*=[.05,.15,.35,.6][rec.length-1-backIdx]||.6; /* recency penalty */
      if(ctxGames.includes(p.game))w*=2.2;         /* world context bias */
      const best=accuracyOf(p.id);
      if(best!==null&&best<800)w*=1.5;             /* train weakest skills a bit more */
      return{game:p.game,w};
    });
    /* planet-less games: navigation & timing join every pool */
    for(const g of FREE_GAMES){
      let w=.9;
      const backIdx=rec.lastIndexOf(g);
      if(backIdx>=0)w*=[.05,.15,.35,.6][rec.length-1-backIdx]||.6;
      if(ctxGames.includes(g))w*=2.2;
      cands.push({game:g,w});
    }
    let sum=0;for(const c of cands)sum+=c.w;
    let roll=r()*sum;
    for(const c of cands){roll-=c.w;if(roll<=0){remember(c.game);return c.game;}}
    remember(cands[0].game);return cands[0].game;
  }
  function difficultyFor(gid){
    const plays=(SAVE.perPlanet[gid]&&SAVE.perPlanet[gid].plays)||0;
    return clamp(1+Math.floor(SAVE.level/3)+Math.floor(plays/6),1,10);
  }
  /* Compose a 2-stage anomaly encounter: decode (context game) + verify */
  function anomalyStages(rng,context){
    const g1=pickGame(rng,context);
    let g2=pickGame(rng,context);
    if(g2===g1)g2=pickGame(rng,null);
    return[
      {game:g1,difficulty:difficultyFor(g1)},
      {game:g2,difficulty:clamp(difficultyFor(g2)+1,1,10)}
    ];
  }
  return{pickGame,difficultyFor,anomalyStages};
})();
