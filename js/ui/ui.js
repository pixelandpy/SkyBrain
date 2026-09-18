/* =====================================================================
   SkyBrain — S9 · UI LAYER (HUD · sheets · results · game shell · toasts)
   ===================================================================== */
const UI=(()=>{
  /* ---------- toasts ---------- */
  function toast(html,ms){
    const t=el('div','toast',html);
    $('#toasts').appendChild(t);
    setTimeout(()=>t.remove(),ms||3100);
  }
  function achToast(a){
    const t=el('div','toast',`🏆 <b>${a.n}</b> unlocked! +40 🪙`);
    t.style.borderColor='rgba(255,209,102,.55)';
    $('#toasts').appendChild(t);
    setTimeout(()=>t.remove(),3600);
  }

  /* ---------- HUD ---------- */
  function refreshHud(){
    $('#hudLvl').textContent='LV '+SAVE.level;
    $('#hudAvatar').textContent=avatarIc();
    $('#hudCoins').textContent=fmt(SAVE.coins);
    $('#hudStreak').textContent=SAVE.streak+(SAVE.shields>0?' 🛡':'');
    $('#xpFill').style.width=Math.round(SAVE.xp/Prog.xpNeed(SAVE.level)*100)+'%';
    $('#hintChip').classList.toggle('hidden',!(SAVE.set.hint&&!Engine.active));
    /* ⚡ energy pill */
    if(typeof Shipsys!=='undefined'&&SAVE.ship){
      const p=$('#pillEnergy');
      if(p){
        const pct=Math.round(SAVE.ship.energy/Shipsys.maxEnergy()*100);
        $('#hudEnergy').textContent=pct+'%';
        $('#hudEnergyFill').style.width=pct+'%';
        p.classList.toggle('elow',pct<=20);
      }
    }
  }

  /* ---------- sheets ---------- */
  let openId=null,sheetOpenedAt=0;
  function openSheet(id){
    closeSheets(true);
    openId=id;
    sheetOpenedAt=performance.now();
    $('#'+id).classList.add('open');
    $('#scrim').classList.add('on');
    document.body.classList.add('dim');
  }
  function closeSheets(soft){
    if(openId){$('#'+openId).classList.remove('open');openId=null;}
    if(!soft){$('#scrim').classList.remove('on');document.body.classList.remove('dim');}
  }
  const sheetsOpen=()=>!!openId;

  /* ---------- planet sheet ---------- */
  function planetSheet(p){
    const locked=!SAVE.unlocked.planets.includes(p.id);
    const rec=(SAVE.perPlanet&&SAVE.perPlanet[p.id])||{best:0,plays:0};
    $('#plBody').innerHTML=`
      <div class="pHead">
        <div class="pIcon">${p.icon}</div>
        <div><div class="pName">${p.name}</div><div class="pTag">${p.tag}</div></div>
      </div>
      <div class="pDesc">${p.desc}</div>
      ${locked?`<div class="lockNote">🔒 This world awakens at <b>Brain Level ${p.lv}</b>. Keep training — you are level ${SAVE.level}.</div>`
      :`<div class="pStats">
          <div class="pStat"><b>${fmt(rec.best)}</b><span>best</span></div>
          <div class="pStat"><b>${rec.plays}</b><span>visits</span></div>
          <div class="pStat"><b>${p.lv<=SAVE.level?'✓':'LV '+p.lv}</b><span>status</span></div>
        </div>`}
      <button class="btn primary big" id="plEnter" ${locked?'disabled':''}>${locked?'LOCKED — REACH LV '+p.lv:'ENTER TRAINING'}</button>
      <p class="finePrint">A focused ${p.short.toLowerCase()} session · difficulty scales with your brain level</p>`;
    $('#plEnter').onclick=()=>{if(locked)return;SFX.select();closeSheets();Engine.startPlanet(p);};
    openSheet('sheetPlanet');
  }

  /* ---------- core (daily) sheet ---------- */
  function coreSheet(){
    const t=todayStr(),d=buildDaily(t);
    const done=SAVE.daily.lastDone===t;
    const chips=d.stages.map((s,i)=>`<div class="chip"><em>${pad2(i+1)}</em><i>${Games[s.game].icon}</i>${Games[s.game].name}</div>`).join('');
    $('#coreBody').innerHTML=`
      <div class="pHead">
        <div class="pIcon">✦</div>
        <div><div class="pName">DAILY CHALLENGE #${d.number}</div><div class="pTag">${prettyDate(t)} · everyone on Earth plays this one</div></div>
      </div>
      <div class="stageChips">${chips}</div>
      <div class="pStats">
        <div class="pStat"><b>🔥 ${SAVE.streak}</b><span>streak</span></div>
        <div class="pStat"><b>${fmt(SAVE.best.daily)}</b><span>best</span></div>
        <div class="pStat"><b>${(SAVE.daily.history[t]||0)>0?fmt(SAVE.daily.history[t]):'—'}</b><span>today</span></div>
      </div>
      ${done?`<div class="lockNote" style="color:var(--gn);border-color:rgba(74,222,128,.35);background:rgba(74,222,128,.07)">✓ Official run complete. Practice all you like — the daily result is sealed.</div>
       <button class="btn big" id="coreGo">PRACTICE RUN</button>`
      :`<button class="btn primary big" id="coreGo">START — OFFICIAL RUN</button>`}
      <p class="finePrint">6 stages · ~4 minutes · +XP, coins and 🔥 streak on your first clear.<br>Your streak survives one miss with a 🛡 shield (earned every 7-day streak).</p>`;
    $('#coreGo').onclick=()=>{SFX.select();closeSheets();Engine.startDaily(done);};
    openSheet('sheetCore');
  }

  /* ---------- anomaly sheet (world event → challenge) ---------- */
  function anomalySheet(anom){
    const decoded=SAVE.meta&&SAVE.meta.anomaliesDecoded||0;
    const nextFrag=STORY_MAIN[SAVE.story?SAVE.story.fragment:0];
    $('#riftBody').innerHTML=`
      <div class="pHead">
        <div class="pIcon">${anom.icon}</div>
        <div><div class="pName">${anom.name}</div><div class="pTag">“Something out here is transmitting…”</div></div>
      </div>
      <div class="pDesc">Your ship has locked onto an encrypted transmission. Decoding it takes two bursts of raw
      brainpower — the signal itself decides which abilities it demands.
      ${nextFrag?'Decode it and a <b>story fragment</b> joins your Cosmic Archive.':'Decode it to strengthen the Archive.'}</div>
      <div class="pStats">
        <div class="pStat"><b>📡 ${decoded}</b><span>decoded</span></div>
        <div class="pStat"><b>${(SAVE.story&&SAVE.story.fragment)||0} / ${STORY_MAIN.length}</b><span>story</span></div>
        <div class="pStat"><b>2</b><span>stages</span></div>
      </div>
      <button class="btn primary big" id="anomGo">🔓 DECODE THE SIGNAL</button>
      <p class="finePrint">${DECODE_FLAVOR[Math.floor(Math.random()*DECODE_FLAVOR.length)]}</p>`;
    $('#anomGo').onclick=()=>{SFX.select();closeSheets();Engine.startAnomaly(anom);};
    openSheet('sheetRift');
  }

  /* ---------- lore reveal ---------- */
  function showLore(frag,onDone){
    $('#loreIcon').textContent=frag.icon;
    $('#loreTitle').textContent=frag.title;
    $('#loreText').textContent=frag.text;
    $('#lore').classList.remove('hidden');
    SFX.achieve();
    $('#loreOk').onclick=()=>{
      $('#lore').classList.add('hidden');SFX.coin();
      onDone&&onDone();
    };
  }

  /* ---------- cosmic archive ---------- */
  function renderArchive(){
    const list=$('#arcList');if(!list)return;
    list.innerHTML='';
    const items=(SAVE.archive||[]);
    const fr=SAVE.story?SAVE.story.fragment:0;
    list.appendChild(el('p','finePrint',`📖 Story recovered: <b>${fr} / ${STORY_MAIN.length}</b> fragments`));
    /* re-readable story fragments */
    for(let i=0;i<fr;i++){
      const f=STORY_MAIN[i];
      const card=el('div','achCard',`<div class="ic">${f.icon}</div><div><b>${f.title}</b><p>Tap to re-read this transmission.</p></div>`);
      card.style.cursor='pointer';
      card.onclick=()=>{showLore(f,null);SFX.tap();};
      list.appendChild(card);
    }
    if(!items.length&&!fr){list.appendChild(el('p','finePrint','The Archive is empty. Follow a 📡 signal in the void and decode it.'));return;}
    for(const it of items.slice(0,40)){
      const kind=ARCHIVE_KINDS[it.k]||{icon:'✦',label:'DISCOVERY'};
      list.appendChild(el('div','achCard',
        `<div class="ic">${kind.icon}</div><div><b>${it.title}</b><p>${kind.label}</p></div>
         <span class="when">${new Date(it.t).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>`));
    }
  }

  /* ---------- STAR MAP · real + procedural systems, tiered regions ---------- */
  let mapTier=1;
  function starMapSheet(tier){
    if(tier)mapTier=tier;
    const reg=REGIONS[mapTier-1];
    const unlocked=Shipsys.regionUnlocked(reg);
    const db=SAVE.exploration.db;
    const tabs=REGIONS.map(r2=>{
      const ok=Shipsys.regionUnlocked(r2);
      return `<button class="tab${r2.t===mapTier?' on':''}" data-tier="${r2.t}">${ok?'':'🔒 '}T${r2.t}</button>`;
    }).join('');
    let rows='';
    if(unlocked){
      const catAll=Shipsys.catalog(mapTier);
      const best=Shipsys.bestRoute(mapTier); /* nav computer suggestion */
      /* infinite catalog, finite list: collapse older surveyed systems so the
         sheet stays readable after hundreds of surveys */
      const doneList=catAll.filter(s=>Shipsys.isSurveyed(s.id));
      const pendingAll=catAll.filter(s=>!Shipsys.isSurveyed(s.id));
      const pending=pendingAll.slice(0,12); /* the visible frontier */
      const recentDone=doneList.slice(-3);
      const hiddenDone=doneList.length-recentDone.length;
      const cat=[...recentDone,...pending];
      if(hiddenDone>0)rows+=`<div class="lockNote" style="color:var(--gn);border-color:rgba(74,222,128,.3);background:rgba(74,222,128,.06)">✓ ${hiddenDone} more system${hiddenDone>1?'s':''} already surveyed in this region — new systems keep surfacing forever.</div>`;
      rows+=cat.map(sys=>{
        const done=Shipsys.isSurveyed(sys.id);
        const cost=SAVE.ship.freeWarp>0?0:warpEnergyCost(sys.ly,SAVE.ship.upgrades.core+SAVE.ship.upgrades.engine);
        const afford=SAVE.ship.energy>=cost||cost===0;
        const rare=(!sys.real&&sys.rare&&Shipsys.scannerLvl()>=2)?' <span class="smRare">★ RARE</span>':'';
        const nav=(best===sys.id&&!done)?' <span class="smRare" style="color:var(--cy)">🧭 BEST ROUTE</span>':'';
        return `<button class="smRow${done?' done':''}${!done&&!afford?' broke':''}" data-sys="${sys.id}" ${done?'disabled':''}>
          <i class="smDot" style="background:${sys.hue};box-shadow:0 0 10px ${sys.hue}"></i>
          <span class="smName">${sys.real?'⚗ ':''}${sys.name}${rare}${nav}<em>${sys.cls}</em></span>
          <span class="smDist">${fmtLy(sys.ly)}<em${!done&&!afford?' style="color:var(--rd)"':''}>${done?'SURVEYED ✓':(cost===0?'FREE JUMP':'⚡ '+cost)}</em></span>
        </button>`;
      }).join('');
    }else{
      rows=`<div class="lockNote">🔒 ${reg.name} needs <b>Brain Level ${reg.lv}</b>${reg.warp?` + <b>Warp Drive Mk ${['I','II','III','IV'][reg.warp-1]}</b>`:''}.<br>${reg.blurb}</div>`;
    }
    $('#mapBody').innerHTML=`
      <div class="pHead">
        <div class="pIcon">🗺️</div>
        <div><div class="pName">STAR MAP — ${reg.name}</div>
        <div class="pTag">${reg.lyMin}–${fmt(reg.lyMax)} light-years out · ${reg.blurb}</div></div>
      </div>
      <div class="energyRow">
        <span>⚡ ENERGY</span>
        <span class="ebar"><i style="width:${Math.round(SAVE.ship.energy/Shipsys.maxEnergy()*100)}%"></i></span>
        <b>${Math.round(SAVE.ship.energy)} / ${Shipsys.maxEnergy()}</b>
        <button class="miniBtn" id="smBuyE">＋50 ⚡ · 60 🪙</button>
      </div>
      ${SAVE.ship.freeWarp>0?`<div class="lockNote" style="color:var(--vi);border-color:rgba(167,139,250,.4);background:rgba(167,139,250,.08)">🕳️ ${SAVE.ship.freeWarp} wormhole charge${SAVE.ship.freeWarp>1?'s':''} — next jump${SAVE.ship.freeWarp>1?'s are':' is'} free.</div>`:''}
      <div class="tabs" id="smTiers">${tabs}</div>
      <div class="smList">${rows}</div>
      <div class="dbCard">
        <b>COSMIC DATABASE</b>
        <span>⭐ Stars: <b>${db.stars}</b></span><span>🪐 Planets: <b>${db.planets}</b></span>
        <span>📡 Signals: <b>${db.signals}</b></span><span>🌌 Anomalies: <b>${db.anomalies}</b></span>
        <span>🕳️ Wormholes: <b>${db.wormholes}</b></span><span>★ Rare: <b>${db.rare||0}</b></span>
      </div>
      <p class="finePrint">⚗ = real celestial object with accurate astronomical data.<br>Others are procedurally charted SkyBrain fiction. Surveys cost ⚡ by distance — plan long jumps.</p>`;
    $('#smBuyE').onclick=()=>{Shipsys.buyEnergy();starMapSheet();};
    $$('#smTiers .tab').forEach(t=>t.onclick=()=>{SFX.tap();starMapSheet(+t.dataset.tier);});
    $$('.smRow',$('#mapBody')).forEach(b=>b.onclick=()=>{
      const cat=Shipsys.catalog(mapTier);
      const sys=cat.find(s=>s.id===b.dataset.sys);
      if(sys){SFX.select();Shipsys.launchSurvey(sys);}
    });
    openSheet('sheetMap');
  }

  /* ---------- SHIPYARD · gameplay-changing upgrades ---------- */
  function shipyardSheet(){
    const up=SAVE.ship.upgrades;
    const rows=Shipsys.UPGRADES.map(u=>{
      const lv=up[u.id],cost=Shipsys.upgradeCost(u);
      const marks=Array.from({length:u.max},(_,i)=>`<i class="mk${i<lv?' on':''}"></i>`).join('');
      return `<div class="upRow">
        <div class="upIcon">${u.icon}</div>
        <div class="upInfo"><b>${u.name}</b><span class="upMarks">${marks}</span>
        <p>${u.fx[Math.min(lv,u.fx.length-1)]}</p></div>
        ${cost==null?'<span class="mcTag done">MAX</span>'
          :`<button class="miniBtn upBuy" data-up="${u.id}">🪙 ${fmt(cost)}</button>`}
      </div>`;
    }).join('');
    $('#yardBody').innerHTML=`
      <div class="pHead">
        <div class="pIcon">🛠️</div>
        <div><div class="pName">SHIPYARD</div><div class="pTag">“A sharper ship for a sharper mind.”</div></div>
      </div>
      <div class="energyRow">
        <span>⚡ ENERGY</span>
        <span class="ebar"><i style="width:${Math.round(SAVE.ship.energy/Shipsys.maxEnergy()*100)}%"></i></span>
        <b>${Math.round(SAVE.ship.energy)} / ${Shipsys.maxEnergy()}</b>
        <button class="miniBtn" id="syBuyE">＋50 ⚡ · 60 🪙</button>
      </div>
      ${rows}
      <p class="finePrint">Upgrades change gameplay: acceleration, energy efficiency, sensor range and warp reach.<br>🪙 ${fmt(SAVE.coins)} available · solar-charge free near the ✦ Core.</p>`;
    $('#syBuyE').onclick=()=>{Shipsys.buyEnergy();shipyardSheet();};
    $$('.upBuy',$('#yardBody')).forEach(b=>b.onclick=()=>{if(Shipsys.buyUpgrade(b.dataset.up))shipyardSheet();});
    openSheet('sheetYard');
  }

  /* ---------- rift (endless) sheet ---------- */
  function riftSheet(){
    $('#riftBody').innerHTML=`
      <div class="pHead">
        <div class="pIcon">🌀</div>
        <div><div class="pName">ENDLESS RIFT</div><div class="pTag">“How deep does the mind go?”</div></div>
      </div>
      <div class="pDesc">One run. Three lives. Every level is a random trial that hits harder than the last.
      Past level 50 lies the <b style="color:var(--rd)">INSANE</b> tier, where timers shrink and only the sharpest survive.</div>
      <div class="pStats">
        <div class="pStat"><b>${SAVE.best.endlessLevel}</b><span>best level</span></div>
        <div class="pStat"><b>${fmt(SAVE.best.endlessScore)}</b><span>best score</span></div>
        <div class="pStat"><b>3</b><span>lives</span></div>
      </div>
      <button class="btn primary big" id="riftGo">ENTER THE RIFT</button>
      <p class="finePrint">A wrong answer costs a life. Combos multiply everything.</p>`;
    $('#riftGo').onclick=()=>{SFX.select();closeSheets();Engine.startEndless();};
    openSheet('sheetRift');
  }

  /* ---------- awards sheet ---------- */
  function renderAch(){
    const grid=$('#achGrid');grid.innerHTML='';
    const ids=Object.keys(SAVE.ach);
    for(const a of ACH){
      const on=!!SAVE.ach[a.id];
      grid.appendChild(el('div','achCard'+(on?'':' off'),
        `<div class="ic">${a.ic}</div><div><b>${a.n}</b><p>${a.d}</p></div>${on?`<span class="when">${new Date(SAVE.ach[a.id]).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>`:''}`));
    }
  }
  function renderMissions(){
    const list=$('#misList');list.innerHTML='';
    if(!Missions.today){list.innerHTML='<p class="finePrint">Missions arrive with tomorrow\'s light.</p>';return;}
    for(const m of Missions.today){
      const p=SAVE.missions.progress[m.id]||0,done=!!SAVE.missions.done[m.id];
      const pct=clamp(p/m.target*100,0,100);
      const rw=m.rw.xp?('+'+m.rw.xp+' XP'):('+'+m.rw.coins+' 🪙');
      list.appendChild(el('div','misItem'+(done?' done':''),
        `<div class="misTop"><span>${done?'✅ ':''}${m.txt}</span><span class="rw">${rw}</span></div>
         <div class="mbar"><i style="width:${done?100:pct}%"></i></div>`));
    }
  }

  /* ---------- profile + shop ---------- */
  let shopTab='avatars';
  const EQ_KEY={avatars:'avatar',titles:'title',themes:'theme',auras:'aura'};
  function renderProfile(){
    $('#pfAvatar').textContent=avatarIc();
    $('#pfTitle').textContent=titleName();
    $('#pfLvl').textContent='BRAIN LEVEL '+SAVE.level+' · '+SAVE.xp+' / '+Prog.xpNeed(SAVE.level)+' XP';
    $('#pfXpFill').style.width=Math.round(SAVE.xp/Prog.xpNeed(SAVE.level)*100)+'%';
    const st=SAVE.stats;
    $('#pfStats').innerHTML=[
      ['🔥 '+SAVE.streak,'streak'],['⭐ '+fmt(SAVE.best.daily),'best daily'],
      [SAVE.unlocked.planets.length+' / '+PLANETS.length,'planets'],
      [Object.keys(SAVE.ach).length+' / '+ACH.length,'awards'],
      ['LV '+SAVE.best.endlessLevel,'rift best'],['🪙 '+fmt(SAVE.coins),'coins']
    ].map(x=>`<div class="pfStat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
    renderRoadmap();
    renderShop();
  }
  /* explorer roadmap: what your next levels unlock (progression is a journey) */
  function renderRoadmap(){
    let host=$('#pfRoadmap');
    if(!host){
      host=el('div','roadmap');host.id='pfRoadmap';
      $('#pfStats').after(host);
    }
    const MILESTONES=[
      {lv:2, txt:'⚡ Speed Planet awakens'},
      {lv:3, txt:'🧩 Pattern Planet awakens'},
      {lv:5, txt:'👁️ Vision Planet · 🌌 Synapse Spiral galaxy'},
      {lv:6, txt:'💠 Logic Planet · 🗺️ DEEP SPACE region (with Warp Mk I)'},
      {lv:8, txt:'🔢 Math Planet'},
      {lv:12,txt:'🎯 Focus Planet · 🕳️ Deep Mind galaxy · FAR REACHES region'},
      {lv:18,txt:'🌀 GALACTIC CORE region (with Warp Mk III)'},
      {lv:25,txt:'🚀 UNKNOWN SPACE — beyond the galaxy\'s rim (Warp Mk IV)'}
    ];
    const next=MILESTONES.filter(m=>m.lv>SAVE.level).slice(0,3);
    const done=MILESTONES.filter(m=>m.lv<=SAVE.level).slice(-1);
    host.innerHTML='<b>EXPLORER ROADMAP</b>'+
      done.map(m=>`<div class="rmRow done"><span class="lv">LV ${m.lv} ✓</span><span>${m.txt}</span></div>`).join('')+
      (next.length?next.map(m=>`<div class="rmRow"><span class="lv">LV ${m.lv}</span><span>${m.txt}</span></div>`).join('')
        :'<div class="rmRow"><span class="lv">✦</span><span>Every region charted — the Unknown awaits.</span></div>');
  }
  function renderShop(){
    const grid=$('#shopGrid');grid.innerHTML='';
    const items=COSMETICS[shopTab];
    for(const it of items){
      const owned=SAVE.cosmetics.owned.includes(it.id);
      const equipped=SAVE.cosmetics.eq[EQ_KEY[shopTab]]===it.id;
      const ic=it.ic||'<span style="font-size:18px">🏷️</span>';
      let btn;
      if(equipped)btn=`<button class="shopBtn on">EQUIPPED</button>`;
      else if(owned)btn=`<button class="shopBtn equip" data-eq="${it.id}">EQUIP</button>`;
      else btn=`<button class="shopBtn buy" data-buy="${it.id}">🪙 ${it.cost}</button>`;
      const sub=shopTab==='themes'?universeTintSwatch(it):'';
      grid.appendChild(el('div','shopItem'+(equipped?' equipped':''),
        `<span class="si">${it.ic||'🏷️'}</span><b>${it.n}</b><span class="sub">${sub}</span>${btn}`));
    }
    $$('#shopGrid [data-buy]',grid).forEach(b=>b.onclick=()=>buyCosmetic(b.dataset.buy));
    $$('#shopGrid [data-eq]',grid).forEach(b=>b.onclick=()=>equipCosmetic(b.dataset.eq));
  }
  function universeTintSwatch(it){
    if(!it.pal)return'';
    return `<span style="display:inline-flex;gap:3px;justify-content:center">${[it.pal.a,it.pal.b,it.pal.c].map(c=>`<i style="width:10px;height:10px;border-radius:3px;background:${c};display:inline-block"></i>`).join('')}</span>`;
  }
  function buyCosmetic(id){
    const item=[...COSMETICS.avatars,...COSMETICS.titles,...COSMETICS.themes,...COSMETICS.auras].find(i=>i.id===id);
    if(!item)return;
    if(SAVE.coins<item.cost){toast('Not enough 🪙 — earn more in challenges!');SFX.wrong();return;}
    SAVE.coins-=item.cost;SAVE.cosmetics.owned.push(id);
    SAVE.cosmetics.eq[EQ_KEY[shopTab]]=id;
    applyCosmetic(id);
    Achieves.grant('a_shop');
    SFX.coin();buzz(15);toast(`Unlocked <b>${item.n}</b>!`);persist();
    refreshHud();renderProfile();
  }
  function equipCosmetic(id){
    SAVE.cosmetics.eq[EQ_KEY[shopTab]]=id;
    applyCosmetic(id);SFX.select();persist();renderProfile();
  }
  function applyCosmetic(id){
    if(id.startsWith('th_'))Universe.applyTheme();
    if(id.startsWith('au_')){Universe.applyTheme();}
    refreshHud();
  }

  /* ---------- settings ---------- */
  function bindSettings(){
    const map={setSound:'sound',setMusic:'music',setMotion:'motion',setHaptics:'haptics'};
    for(const id in map){
      const inp=$('#'+id);
      inp.checked=!!SAVE.set[map[id]];
      inp.onchange=()=>{
        SAVE.set[map[id]]=inp.checked;persist();SFX.setToggles();
        document.body.classList.toggle('rm',!SAVE.set.motion);
        if(map[id]==='music'&&inp.checked)SFX.startMusic();
        if(map[id]==='haptics'&&inp.checked)buzz(30);
      };
    }
    /* volume sliders (0-100) — live-update the Web Audio gain nodes while
       dragging, keeping the mute toggles above as the master on/off switch */
    const volMap={setSfxVol:'sfxVolume',setMusicVol:'musicVolume'};
    for(const id in volMap){
      const inp=$('#'+id),num=$('#'+id+'Num');
      const v=SAVE.set[volMap[id]]!=null?SAVE.set[volMap[id]]:100;
      inp.value=v;if(num)num.textContent=v;
      inp.oninput=()=>{
        SAVE.set[volMap[id]]=+inp.value;
        if(num)num.textContent=inp.value;
        SFX.setToggles();
      };
      inp.onchange=()=>persist();
    }
    $('#btnReset').onclick=()=>{
      confirmDlg('RESET PROGRESS?','Your level, coins, streak, planets and cosmetics will vanish into the void forever.','RESET').then(ok=>{
        if(!ok)return;
        try{localStorage.removeItem(SAVE_KEY);}catch(e){try{Store.set(SAVE_KEY,null);}catch(e2){}}
        location.reload();
      });
    };
    $('#btnReplayTutorial').onclick=()=>{
      SAVE.tutorial.flight=false;persist();
      closeSheets();
      setTimeout(()=>FlightTutorial.start(),260);
    };
    bindSaveIO();
  }

  /* ---------- save export / import ----------
     Compact, versioned, copy-pasteable text — the player's own backup.
     No server, no database: exportSaveCode/importSaveCode (core.js) do all
     the encoding/validation; this just wires the sheet UI to them. */
  function bindSaveIO(){
    $('#btnExportSave').onclick=()=>{
      const code=exportSaveCode();
      if(!code){toast('Could not build a save code — try again.');return;}
      $('#exportArea').value=code;
      $('#exportOverlay').classList.remove('hidden');
    };
    $('#exportClose').onclick=()=>$('#exportOverlay').classList.add('hidden');
    $('#exportCopy').onclick=async()=>{
      const area=$('#exportArea');
      try{
        if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(area.value);
        else{area.select();document.execCommand('copy');}
        toast('📋 Save code copied.');SFX.select();
      }catch(e){area.select();toast('Could not copy automatically — the code is selected, copy it manually.');}
    };
    $('#btnImportSave').onclick=()=>{
      $('#importArea').value='';
      $('#importError').classList.add('hidden');
      $('#importOverlay').classList.remove('hidden');
    };
    $('#importClose').onclick=()=>$('#importOverlay').classList.add('hidden');
    $('#importGo').onclick=()=>{
      const res=importSaveCode($('#importArea').value);
      const err=$('#importError');
      if(!res.ok){
        err.textContent='⚠ '+res.error;err.classList.remove('hidden');
        SFX.wrong();buzz(40);
        return; /* corrupted/invalid data is rejected safely — nothing changes */
      }
      err.classList.add('hidden');
      $('#importOverlay').classList.add('hidden');
      confirmDlg('REPLACE CURRENT PROGRESS?',
        'This will overwrite your current save with the imported one — level '+res.save.level+', '+fmt(res.save.coins)+' coins. This cannot be undone.',
        'REPLACE').then(ok=>{
        if(!ok)return;
        SAVE=res.save;
        try{Store.set(SAVE_KEY,JSON.stringify(SAVE));}catch(e){}
        toast('✅ Save imported — reloading…');
        setTimeout(()=>location.reload(),700);
      });
    };
  }

  /* ---------- confirm ---------- */
  let cfRes=null;
  function confirmDlg(title,text,okLabel){
    $('#cfTitle').textContent=title;$('#cfText').textContent=text;
    $('#cfOk').textContent=okLabel||'CONFIRM';
    $('#confirm').classList.remove('hidden');
    return new Promise(res=>{cfRes=res;});
  }

  /* ---------- signal ---------- */
  function showSignal(){$('#signal').classList.remove('hidden');}
  function hideSignal(){$('#signal').classList.add('hidden');}

  /* ---------- intro ---------- */
  function showIntro(){$('#intro').classList.remove('hidden');}
  function hideIntro(){$('#intro').classList.add('hidden');$('#introFade').style.opacity=0;}

  /* ---------- discovery ---------- */
  function showDiscover(p,isGalaxy,onEnter,onOk){
    $('#discIcon').textContent=p.icon;
    $('#discName').textContent=p.name;
    $('#discDesc').textContent=isGalaxy?('A whole new galaxy opens: '+GALAXIES[p.g].name+'.'):p.tag.replace(/[“”]/g,'');
    document.body.classList.add('disc');
    $('#discover').classList.add('on');
    const done=()=>{document.body.classList.remove('disc');$('#discover').classList.remove('on');};
    $('#discEnter').onclick=()=>{done();SFX.select();onEnter();};
    $('#discOk').onclick=()=>{done();onOk();};
  }

  /* =====================================================================
     GAME SHELL
     ===================================================================== */
  const game={
    open(cfg){
      $('#game').classList.add('on');
      $('#gLives').classList.toggle('hidden',cfg.mode!=='endless');
      game.lives(3);
      $('#gExit').onclick=()=>Engine.quit();
      $('#gArea').innerHTML='';$('#gPrompt').innerHTML='';
      $('#gTimer').style.opacity=.25;
      $('#gCombo').classList.remove('show');
    },
    close(){
      $('#game').classList.remove('on');
      $('#gArea').innerHTML='';
    },
    header(txt,insane){$('#gStage').textContent=insane?'⚠ '+txt+' · INSANE':txt;},
    lives(n){
      $('#gLives').textContent=[0,1,2].map(i=>i<n?'❤️':'🖤').join('');
    },
    prompt(h){$('#gPrompt').innerHTML=h;},
    score(v){
      const e=$('#gScore');
      if(e.textContent!==fmt(v)){e.textContent=fmt(v);e.style.transform='scale(1.18)';setTimeout(()=>e.style.transform='',120);}
    },
    comboShow(n){
      const c=$('#gCombo');
      c.textContent='COMBO ×'+n;
      c.classList.remove('show');void c.offsetWidth;c.classList.add('show');
    },
    comboHide(){$('#gCombo').classList.remove('show');},
    popup(text,x,y,neg){
      const a=$('#gArea');
      const p=el('div','pts'+(neg?' neg':''),text);
      p.style.left=clamp(x,6,94)+'%';p.style.top=clamp(y,4,88)+'%';
      a.appendChild(p);
      setTimeout(()=>p.remove(),950);
    },
    badFlash(){
      if(!SAVE.set.motion)return;
      const a=$('#gArea');
      const f=el('div','flashBad');a.appendChild(f);setTimeout(()=>f.remove(),520);
      a.classList.remove('shake');void a.offsetWidth;a.classList.add('shake');
      setTimeout(()=>a.classList.remove('shake'),450);
    },
    stageIntro(g,st,label,onGo){
      const si=$('#stageIntro');
      si.innerHTML=`<div class="siCard">
        <div class="siIcon">${g.icon}</div>
        <div class="siName">${g.name}</div>
        <div class="k" style="margin-bottom:12px">${label}${st.insane?' · ⚠ INSANE':''}</div>
        ${st.frame?`<div class="siFrame">⚠ ${st.frame}</div>`:''}
        <div class="siDesc">${g.instruction}</div>
        <div class="siTap">TAP TO START</div>
      </div>`;
      si.classList.remove('hidden');
      const go=()=>{si.classList.add('hidden');si.onclick=null;SFX.select();onGo();};
      si.onclick=go;
    },
    async countdown(){
      const cd=$('#countdown');
      const steps=SAVE.set.motion?['3','2','1','GO!']:['GO!'];
      for(const s of steps){
        cd.innerHTML=`<div class="cdNum">${s}</div>`;
        cd.classList.remove('hidden');
        if(s==='GO!'){SFX.go();}else{SFX.tick();buzz(8);}
        await wait(s==='GO!'?420:560);
      }
      cd.classList.add('hidden');
    },
    splash(big,small){
      const sp=$('#splash');
      sp.innerHTML=`<div class="splashTxt"><h2>${big}</h2><p>${small||''}</p></div>`;
      sp.classList.remove('hidden');
      SFX.whoosh();
      return wait(1150).then(()=>sp.classList.add('hidden'));
    },
    banner(big,small){
      const sp=$('#splash');
      sp.innerHTML=`<div class="splashTxt"><h2 style="color:var(--gn)">${big}</h2><p>${small||''}</p></div>`;
      sp.classList.remove('hidden');
      SFX.star();
      return wait(1050).then(()=>sp.classList.add('hidden'));
    }
  };

  /* =====================================================================
     RESULTS
     ===================================================================== */
  const results={
    last:null,
    show(r){
      this.last=r;
      /* queue newly awakened worlds for the discovery cinematic */
      if(r.newPlanets&&r.newPlanets.length&&typeof Discoveries!=='undefined'){
        for(const p of r.newPlanets)if(!Discoveries.queue.includes(p))Discoveries.queue.push(p);
      }
      $('#results').classList.remove('hidden');
      $('#rMode').textContent=r.label;
      $('#rPracticeTag').classList.toggle('hidden',!(r.practice&&r.mode!=='planet'));
      $('#rNew').classList.toggle('hidden',!r.isNewBest);
      $('#rStars').innerHTML='<span>★</span><span>★</span><span>★</span>';
      /* skill bars */
      const spd=r.avgReaction!=null?clamp((800-r.avgReaction)/(800-230)*100,4,100):null;
      const mem=r.seqTotal?Math.round(r.seqHeld/r.seqTotal*100):null;
      const log=r.logicT?Math.round(r.logicC/r.logicT*100):null;
      const acc=r.answers?Math.round(r.correct/r.answers*100):null;
      const bar=(name,v,col)=>`<div class="rbar">${name}<div class="track" style="position:relative"><i data-w="${v==null?0:v}" style="background:${col}"></i><b style="position:absolute;right:0;top:-2px;font-size:9px;color:var(--faint)">${v==null?'—':v}</b></div></div>`;
      $('#rBars').innerHTML=
        bar('⚡ SPEED',spd!=null?Math.round(spd):null,'linear-gradient(90deg,#5fd9ff,#38bdf8)')+
        bar('🧠 MEMORY',mem,'linear-gradient(90deg,#ff7ac8,#e879f9)')+
        bar('🧩 LOGIC',log,'linear-gradient(90deg,#a78bfa,#818cf8)')+
        bar('🎯 ACCURACY',acc,'linear-gradient(90deg,#4ade80,#2dd4bf)');
      $('#rXP').textContent='0';
      $('#rCoins').textContent='0';
      $('#rLvlTag').textContent='LV '+SAVE.level;
      $('#rXpFill').style.width='0%';
      $('#rDouble').classList.toggle('hidden',!(r.mode==='daily'&&r.official));
      $('#rDouble').disabled=false;
      $('#rStreakRow').style.display=r.mode==='daily'?'flex':'none';
      $('#rStreak').textContent=r.streak;
      $('#rAch').innerHTML='';
      /* play again label */
      $('#rAgain').textContent=r.mode==='endless'?'DIVE AGAIN':(r.practice?'PRACTICE AGAIN':'PLAY AGAIN');
      $('#rAgain').classList.toggle('hidden',r.mode==='anomaly'||r.mode==='survey'||r.mode==='expedition');
      if(r.mode==='expedition')$('#rHome').textContent='CONTINUE EXPEDITION';
      else $('#rHome').textContent='RETURN TO UNIVERSE';
      /* animate in */
      setTimeout(()=>{
        $$('#rBars .track i').forEach(i=>i.style.width=i.dataset.w+'%');
      },150);
      /* score count up */
      const sc=$('#rScore');const t0=performance.now(),dur=SAVE.set.motion?1300:300;
      (function cnt(){
        const p=clamp((performance.now()-t0)/dur,0,1);
        sc.textContent=fmt(r.score*Ease.oC(p));
        if(p<1)requestAnimationFrame(cnt);
      })();
      /* stars */
      for(let i=0;i<3;i++){
        const s=$$('#rStars span')[i];
        if(i<r.stars)setTimeout(()=>{s.classList.add('on');SFX.star();},600+i*350);
      }
      /* xp + coins fly */
      setTimeout(()=>{
        $('#rXP').textContent=fmt(r.xp);
        $('#rCoins').textContent=fmt(r.coins);
        $('#rLvlTag').textContent='LV '+SAVE.level;
        $('#rXpFill').style.width=Math.round(SAVE.xp/Prog.xpNeed(SAVE.level)*100)+'%';
        if(r.levelUps>0){
          SFX.levelup();toast('⬆ BRAIN LEVEL '+SAVE.level+'!');
          const MS={2:'⚡ Speed Planet awakens!',3:'🧩 Pattern Planet awakens!',
            5:'👁️ Vision Planet + 🌌 Synapse Spiral unlocked!',
            6:'🗺️ DEEP SPACE region in reach — fit a Warp Drive Mk I!',
            8:'🔢 Math Planet awakens!',
            12:'🕳️ FAR REACHES region + Deep Mind galaxy unlocked!',
            18:'🌀 GALACTIC CORE region in reach — Warp Mk III!',
            25:'🚀 UNKNOWN SPACE awaits — Warp Mk IV!'};
          if(MS[SAVE.level])setTimeout(()=>toast('🔓 <b>UNLOCKED</b> — '+MS[SAVE.level],4800),1400);
        }
      },900);
      SFX.coin();
    },
    hide(){
      $('#results').classList.add('hidden');
    }
  };

  /* ---------- wire static buttons ---------- */
  function init(){
    $('#scrim').onclick=()=>{
      if(performance.now()-sheetOpenedAt<400)return; /* ignore the synthetic click from the opening tap */
      closeSheets();SFX.tap();
    };
    $$('#sheetAwards .tab').forEach(t=>t.onclick=()=>{
      $$('#sheetAwards .tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
      $('#tabAch').classList.toggle('on',t.dataset.tab==='ach');
      $('#tabMis').classList.toggle('on',t.dataset.tab==='mis');
      $('#tabArc').classList.toggle('on',t.dataset.tab==='arc');
      if(t.dataset.tab==='mis')renderMissions();
      if(t.dataset.tab==='arc')renderArchive();
      SFX.tap();
    });
    $$('#shopTabs .tab').forEach(t=>t.onclick=()=>{
      $$('#shopTabs .tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
      shopTab=t.dataset.shop;renderShop();SFX.tap();
    });
    $('#cfOk').onclick=()=>{$('#confirm').classList.add('hidden');cfRes&&cfRes(true);};
    $('#cfNo').onclick=()=>{$('#confirm').classList.add('hidden');cfRes&&cfRes(false);};
    $('#sigRetry').onclick=()=>{
      if(navigator.onLine){hideSignal();SFX.select();}
      else{toast('Still no signal — check your connection.');SFX.wrong();}
    };
    window.addEventListener('online',()=>{if(!$('#signal').classList.contains('hidden')){hideSignal();toast('📡 Signal restored — welcome back, Neuronaut.');}});
    window.addEventListener('offline',()=>{
      if(Engine.active){/* mid-session drop */}
      showSignal();
    });
    $('#adClose').onclick=()=>{$('#adOverlay').classList.add('hidden');};
    $('#rDouble').onclick=()=>{
      const r=results.last;if(!r)return;
      Ads.showRewarded('double_coins').then(ok=>{
        if(ok){
          SAVE.coins+=r.coins;persist();refreshHud();
          $('#rCoins').textContent=fmt(r.coins*2);
          $('#rDouble').disabled=true;$('#rDouble').textContent='DOUBLED ✓';
          SFX.coin();toast('🪙 Coins doubled!');
        }
      });
    };
    $('#rHome').onclick=()=>{
      SFX.tap();results.hide();
      const r=results.last;
      if(r&&r.mode==='anomaly'){Signals.resolve(r);Universe.enterFree();}
      else if(r&&r.mode==='survey'){Shipsys.resolveSurvey(r);Universe.enterFree();}
      else if(r&&r.mode==='expedition'){Expedition.resolveLeg(r);}
      else Discoveries.maybeRun();
      Ads.maybeInterstitial('session_end');
      /* NAV Mk II: auto-plot nearest signal/pickup when back in free flight */
      setTimeout(()=>{Shipsys.autoPlot&&Shipsys.autoPlot();},1600);
    };
    $('#rAgain').onclick=()=>{
      SFX.select();results.hide();
      const r=results.last;
      if(!r)return;
      if(r.mode==='endless')Engine.startEndless();
      else Engine.startDaily(true);
    };
    bindSettings();
  }

  return{toast,achToast,refreshHud,openSheet,closeSheets,sheetsOpen,
    planetSheet,coreSheet,riftSheet,anomalySheet,starMapSheet,shipyardSheet,
    showLore,renderArchive,
    renderAch,renderMissions,renderProfile,
    confirm:confirmDlg,showSignal,hideSignal,showIntro,hideIntro,showDiscover,
    game,results,init,
    set shopTab(v){shopTab=v;},get shopTab(){return shopTab;}};
})();

/* =====================================================================
   ADS — abstraction layer. No fake ads, no pay-to-win.
   Integrate a real network by assigning Ads.provider (see README).
   ---------------------------------------------------------------------
   DEV vs PRODUCTION is explicit and intentional:
     • DEV MODE — SKYBRAIN_ADS_PRODUCTION is false (the default in this
       repo, since no ad network ships with it): rewarded requests resolve
       instantly with no provider, so the reward flow stays fully testable.
     • PRODUCTION — SKYBRAIN_ADS_PRODUCTION is true: a real provider MUST
       be assigned to Ads.provider. If production mode is on but no
       provider is wired up, rewards are safely DENIED (never silently
       auto-granted) and an error is logged — this is what stops a build
       from accidentally shipping unlimited free rewards because a real
       ad network was never actually integrated.
   To go live: implement {showRewarded(label)->Promise<bool>,
   showInterstitial(reason)} on a provider object, assign it to
   Ads.provider, THEN flip the flag below to true.
   ===================================================================== */
const SKYBRAIN_ADS_PRODUCTION=false; /* flip to true only once Ads.provider is a real network */
const Ads={
  provider:null, /* e.g. {showInterstitial(reason), showRewarded(label)->Promise<bool>} */
  showRewarded(label){
    if(this.provider&&typeof this.provider.showRewarded==='function')return this.provider.showRewarded(label);
    if(SKYBRAIN_ADS_PRODUCTION){
      console.error('[SkyBrain] PRODUCTION ad mode is on but no Ads.provider is configured — denying reward "'+label+'" instead of granting it for free. Wire a real ad network into Ads.provider before shipping.');
      return Promise.resolve(false);
    }
    console.info('[SkyBrain] DEV MODE — rewarded ad requested ("'+label+'") with no provider configured, granting directly for testing. This auto-grant path is disabled the moment SKYBRAIN_ADS_PRODUCTION is true.');
    return Promise.resolve(true);
  },
  maybeInterstitial(reason){
    if(this.provider&&typeof this.provider.showInterstitial==='function'){this.provider.showInterstitial(reason);return;}
    if(SKYBRAIN_ADS_PRODUCTION)console.error('[SkyBrain] PRODUCTION ad mode is on but no Ads.provider is configured — skipping interstitial ("'+reason+'").');
  }
};

