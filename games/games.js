/* =====================================================================
   SkyBrain — S5 · MINI-GAMES A (memory · speed · math)
   Each game: {id,name,planet,icon,instruction,create(stage)->{start}}
   Stage API: {area,prompt,correct,wrong,timer,popup,finish,cleanup,mode,rng,difficulty}
   Contract: on timer timeout the ENGINE already registers the wrong —
   the game only advances. finish() must be called exactly once.
   ===================================================================== */
const Games={};
function sleeper(){
  const T=[];
  return{
    sleep(ms){return new Promise(res=>{const t=setTimeout(res,ms);T.push({t,res});});},
    kill(){T.forEach(o=>{clearTimeout(o.t);o.res();});T.length=0;}
  };
}
function optButtons(area,options,onPick){
  const grid=el('div','opts');
  const btns=options.map((o,i)=>{
    const b=el('button','opt');b.innerHTML=o;b.setAttribute('aria-label','option '+(i+1));
    b.onclick=()=>onPick(i,b);grid.appendChild(b);return b;
  });
  area.appendChild(grid);
  return{grid,btns,disable(){btns.forEach(b=>b.disabled=true);}};
}
const pentFreq=i=>[261.6,293.7,329.6,392,440,523.3,587.3,659.3,784,880,987.9,1174.7,1318.5,1568,1760,2093][i%16];

/* ---------------- MEMORY — sequence recall ---------------- */
Games.memory={
  id:'memory',name:'RELAY UPLINK',planet:'memory',icon:'🛰️',
  instruction:'A satellite array is transmitting its link order.<br>Watch the uplink — then <b>re-transmit: tap the satellites in sequence</b>.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const n=d>=6?4:3,cells=n*n;
    const L0=clamp(2+Math.round(d*.8),3,cells);
    const rounds=[L0,Math.min(L0+1,cells),Math.min(L0+2,cells)];
    let ri_=0,seq=[],pos=0,inputOn=false,roundHits=0;

    api.area.appendChild(el('div','memWrap',
      `<div class="memRound" id="memRound">ROUND 1 / ${rounds.length}</div>
       <div class="memGrid" style="--n:${n}"></div>`));
    const grid=$('.memGrid',api.area),label=$('#memRound',api.area);
    const nodes=[];
    for(let i=0;i<cells;i++){
      const nd=el('button','memNode');nd.setAttribute('aria-label','node '+(i+1));
      nd.onclick=()=>tapNode(i);grid.appendChild(nd);nodes.push(nd);
    }
    const lit=(i,cls,ms)=>{nodes[i].classList.add(cls||'lit');setTimeout(()=>nodes[i].classList.remove(cls||'lit'),ms);};

    async function playRound(){
      label.textContent=`ROUND ${ri_+1} / ${rounds.length} — RECEIVING`;
      api.prompt('Recording uplink order…');
      const len=rounds[ri_];seq=[];let prev=-1;
      for(let i=0;i<len;i++){let v;do{v=ri(r,0,cells-1);}while(v===prev&&cells>2);seq.push(v);prev=v;}
      await S.sleep(700);if(!alive)return;
      const gap=Math.max(240,560-d*35);
      for(const idx of seq){
        if(!alive)return;
        SFX.note(idx);lit(idx,'lit',Math.max(240,520-d*28));await S.sleep(gap*.45);
      }
      if(!alive)return;
      inputOn=true;pos=0;label.textContent=`ROUND ${ri_+1} / ${rounds.length} — TRANSMIT`;
      api.prompt('Re-transmit: tap the satellites in order.');
    }
    function tapNode(i){
      if(!inputOn||!alive)return;
      const good=i===seq[pos];
      lit(i,good?'good':'bad',300);
      if(good){
        SFX.note(i);pos++;
        if(pos===seq.length){
          inputOn=false;roundHits++;
          api.correct(200*diffMult(d),{text:'SEQUENCE +'});
          setTimeout(next,700);
        }
      }else{
        inputOn=false;api.wrong();
        api.prompt('<b>Uplink corrupted.</b> The link order slips away…');
        setTimeout(next,900);
      }
    }
    function next(){if(!alive)return;ri_++;if(ri_>=rounds.length)api.finish({info:`${roundHits}/${rounds.length} sequences held`,extra:{seqHeld:roundHits,seqTotal:rounds.length}});else playRound();}
    return{start(){playRound();}};
  }
};

/* ---------------- SPEED — reaction orbs ---------------- */
Games.speed={
  id:'speed',name:'DEBRIS DODGE',planet:'speed',icon:'☄️',
  instruction:'Debris fragments lock onto your hull — the instant one flares <b>cyan</b>, fire thrusters (tap anywhere).<br>Burn too early and the dodge fails.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const total=d>=6?6:5;
    let i=0;const times=[];
    const zone=el('div','spZone');api.area.appendChild(zone);
    function place(){
      zone.innerHTML='';
      const orb=el('div','spOrb','<div class="spCharge"></div><div class="spCore"></div>');
      orb.style.left=rr(r,16,84)+'%';orb.style.top=rr(r,24,72)+'%';
      zone.appendChild(orb);return orb;
    }
    function pop(cls,txt,x,y){const p=el('div',cls,txt);p.style.left=x+'%';p.style.top=(y-6)+'%';zone.appendChild(p);}
    async function run(){
      let earlies=0;
      while(i<total&&alive){
        api.prompt(`Fragment ${i+1} / ${total} — thrust on <b>CYAN</b>…`);
        const orb=place();
        let hot=false,settled=false,t0=0;
        zone.onpointerdown=()=>{
          if(settled||!alive)return;settled=true;
          if(hot){const ms=performance.now()-t0;resolveTap(ms);}
          else{resolveTap('early');}
        };
        let resolveTap;
        const tapP=new Promise(res=>{resolveTap=res;});
        const timeoutP=S.sleep(1350).then(()=>'-1');
        const charge=rr(r,900,Math.max(750,2100-d*110));
        await S.sleep(charge);if(!alive)return;
        if(!settled){hot=true;t0=performance.now();orb.classList.add('hot');SFX.tick();}
        const res=await Promise.race([tapP,timeoutP]);if(!alive)return;
        zone.onpointerdown=null;
        const x=parseFloat(orb.style.left),y=parseFloat(orb.style.top);
        let retrySame=false;
        if(res==='early'){
          api.wrong({x,y});pop('spEarly','TOO EARLY',x,y);
          await S.sleep(600);if(!alive)return;
          if(earlies<1){earlies++;retrySame=true;} /* one forgiving retry, then it counts as a miss */
        }else if(res==='-1'){
          api.wrong({x,y});times.push(1000);pop('spEarly','TOO SLOW',x,y);
        }else{
          const ms=Math.round(res);times.push(ms);
          const pts=clamp(320-(ms-180)*.55,40,320)*diffMult(d);
          api.correct(pts,{x,y,text:ms+'ms'});pop('spMs',ms+'ms',x,y);
        }
        await S.sleep(430);
        if(!retrySame){i++;earlies=0;}
      }
      if(!alive)return;
      const avg=times.length?times.reduce((a,b)=>a+b,0)/times.length:999;
      api.finish({info:`avg ${Math.round(avg)} ms`,extra:{avgReaction:avg}});
    }
    return{start(){run();}};
  }
};

/* ---------------- MATH — rapid arithmetic ---------------- */
Games.math={
  id:'math',name:'TRAJECTORY CALC',planet:'math',icon:'🧮',
  instruction:'The nav computer is down — plot the burn by hand.<br>Solve each value fast to <b>hold the course</b>.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const total=8;let i=0;
    function revealAnswer(m){
      $$('.opt',api.area).forEach(b=>{if(parseFloat(b.textContent)===m.ans)b.classList.add('reveal');});
    }
    function ask(){
      if(!alive)return;
      if(i>=total){api.finish({info:'mental arithmetic'});return;}
      const m=genMath(r,d);
      api.area.innerHTML='';
      api.prompt(`BURN ${i+1} / ${total} — course correction`);
      api.area.appendChild(el('div','qBody',
        `<div class="seqRow"><div class="seqChip q" style="min-width:auto;padding:8px 26px;font-size:clamp(22px,7vw,30px)">${m.q}</div></div>`));
      let locked=false;
      const ctl=optButtons(api.area,m.options.map(o=>`<span>${o}</span>`),(k,btn)=>{
        if(locked||!alive)return;locked=true;ctl.disable();tm.cancel();
        if(m.options[k]===m.ans){btn.classList.add('correct');api.correct(150*diffMult(d),{x:50,y:42});}
        else{btn.classList.add('wrong');revealAnswer(m);api.wrong();}
        S.sleep(430).then(()=>{i++;ask();});
      });
      const tm=api.timer(d>=6?7:8);
      tm.over.then(v=>{
        if(v==='timeout'&&!locked&&alive){locked=true;ctl.disable();revealAnswer(m);S.sleep(500).then(()=>{i++;ask();});}
      });
    }
    return{start(){ask();}};
  }
};

/* =====================================================================
   SkyBrain — S6 · MINI-GAMES B (pattern · vision · logic · focus)
   ===================================================================== */

/* ---------------- PATTERN — what comes next ---------------- */
Games.pattern={
  id:'pattern',name:'STRUCTURE REPAIR',planet:'pattern',icon:'🧩',
  instruction:'An alien lattice grows by a hidden rule — one segment is missing.<br><b>Restore the next segment</b> to repair the structure.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const total=6;let i=0;
    function questionHTML(p){
      if(p.text){
        const chips=p.text.map(v=>`<div class="seqChip">${v}</div>`).join('')+`<div class="seqChip q">?</div>`;
        return `<div class="seqRow">${chips}</div>`;
      }
      const tiles=[0,1,2,3].map(k=>`<div class="seqChip">${patternSVG(p.vis,k)}</div>`).join('')+`<div class="seqChip q">?</div>`;
      return `<div class="seqRow">${tiles}</div>`;
    }
    function ask(){
      if(!alive)return;
      if(i>=total){api.finish({info:'rule finding'});return;}
      const p=genPattern(r,d);
      api.area.innerHTML='';
      api.prompt(`Segment ${i+1} / ${total} — restore the lattice`);
      api.area.appendChild(el('div','qBody',questionHTML(p)));
      /* build 4 option values (numbers or visual variants) */
      let optsHtml,answerIdx;
      if(p.text){
        answerIdx=p.options.indexOf(p.ans);
        optsHtml=p.options.map(v=>`<span>${v}</span>`);
      }else{
        /* visual options: correct next state + wrong variants */
        let wrongs=p.options.filter(v=>v!==p.ans).slice(0,3);
        const vals=shuffle(r,[p.ans,...wrongs]);
        answerIdx=vals.indexOf(p.ans);
        optsHtml=vals.map(v=>{
          if(p.vis.counts)return dotsSVG(v);
          if(p.vis.hues)return `<svg viewBox="0 0 40 40"><path d="M20 5l6 8-6 22-6-22z" fill="hsl(${v} 75% 60%)" stroke="hsl(${v} 85% 78%)" stroke-width="1"/></svg>`;
          const ang=((v%360)+360)%360;
          const inner=p.vis.shape==='tri'
            ?'<polygon points="20,6 33,32 7,32" fill="#8ef7d4"/>'
            :'<path d="M20 5 L20 33 M20 5 L13 13 M20 5 L27 13" stroke="#8ef7d4" stroke-width="4.6" fill="none" stroke-linecap="round"/>';
          return `<svg viewBox="0 0 40 40"><g transform="rotate(${ang} 20 20)">${inner}</g></svg>`;
        });
      }
      let locked=false;
      const ctl=optButtons(api.area,optsHtml,(k,btn)=>{
        if(locked||!alive)return;locked=true;ctl.disable();tm.cancel();
        if(k===answerIdx){btn.classList.add('correct');api.correct(170*diffMult(d),{x:50,y:42});}
        else{btn.classList.add('wrong');ctl.btns[answerIdx].classList.add('reveal');api.wrong();}
        S.sleep(520).then(()=>{i++;ask();});
      });
      const tm=api.timer(13);
      tm.over.then(v=>{
        if(v==='timeout'&&!locked&&alive){locked=true;ctl.disable();ctl.btns[answerIdx].classList.add('reveal');S.sleep(600).then(()=>{i++;ask();});}
      });
    }
    function dotsSVG(n){
      let dots='';
      for(let i2=0;i2<n;i2++){const a=i2*2.4-1.9;dots+=`<circle cx="${20+Math.cos(a)*8*Math.sqrt(i2+.6)}" cy="${20+Math.sin(a)*8*Math.sqrt(i2+.6)}" r="3.4" fill="#9be8ff"/>`;}
      return `<svg viewBox="0 0 40 40">${dots}</svg>`;
    }
    return{start(){ask();}};
  }
};

/* ---------------- VISION — odd one out ---------------- */
Games.vision={
  id:'vision',name:'DEEP SCAN',planet:'vision',icon:'🔭',
  instruction:'Sensor returns flood the grid — <b>exactly one is artificial</b>.<br>Find the impostor before it slips away.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const total=6;let i=0;
    function ask(){
      if(!alive)return;
      if(i>=total){api.finish({info:'odd-one-out'});return;}
      const v=genVision(r,d);
      api.area.innerHTML='';
      const timeLeft=Math.max(3.4,6.4-d*.35);
      api.prompt(`Sweep ${i+1} / ${total} — tap the <b>artificial</b> return`);
      const wrap=el('div','qBody');
      const grid=el('div','visGrid');
      grid.style.gridTemplateColumns=`repeat(${v.grid},1fr)`;
      grid.style.width=`min(88vw,${v.grid*74}px)`;
      wrap.appendChild(grid);api.area.appendChild(wrap);
      let locked=false;
      for(let k=0;k<v.grid*v.grid;k++){
        const odd=k===v.oddIdx;
        const t=el('button','vTile');
        const spec=odd?v.odd:v.base;
        t.innerHTML=shapeSVG(spec.shape,spec.hue,spec.rot,spec.scale,spec.mark);
        t.onclick=()=>{
          if(locked||!alive)return;locked=true;tm.cancel();
          if(odd){t.classList.add('good');api.correct(190*diffMult(d),{x:50,y:40});}
          else{t.classList.add('bad');
            const cells=$$('.vTile',grid);cells[v.oddIdx].classList.add('reveal');
            api.wrong();}
          S.sleep(560).then(()=>{i++;ask();});
        };
        grid.appendChild(t);
      }
      const tm=api.timer(timeLeft);
      tm.over.then(vv=>{
        if(vv==='timeout'&&!locked&&alive){locked=true;$$('.vTile',grid)[v.oddIdx].classList.add('reveal');S.sleep(600).then(()=>{i++;ask();});}
      });
    }
    return{start(){ask();}};
  }
};

/* ---------------- LOGIC — quick deduction ---------------- */
Games.logic={
  id:'logic',name:'ANCIENT GATE',planet:'logic',icon:'🗿',
  instruction:'An ancient gate tests reasoning before it opens.<br>Short questions — <b>choose the true path</b>.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const tierMax=d<=2?1:d<=5?2:3;
    const pool=shuffle(r,LOGIC_LIB.filter(L=>L.t<=tierMax)).slice(0,5);
    let i=0;
    function ask(){
      if(!alive)return;
      if(i>=pool.length){api.finish({info:'deduction'});return;}
      const L=pool[i];
      api.area.innerHTML='';
      api.prompt(`Monolith ${i+1} / ${pool.length}`);
      api.area.appendChild(el('div','qBody',`<div class="logicQ">${L.q}</div>`));
      let locked=false;
      const ctl=optButtons(api.area,L.o.map(o=>`<span style="font-size:clamp(14px,3.8vw,17px)">${o}</span>`),(k,btn)=>{
        if(locked||!alive)return;locked=true;ctl.disable();tm.cancel();
        if(k===L.a){btn.classList.add('correct');api.correct(180*diffMult(d),{x:50,y:42});}
        else{btn.classList.add('wrong');ctl.btns[L.a].classList.add('reveal');api.wrong();}
        S.sleep(560).then(()=>{i++;ask();});
      });
      const tm=api.timer(15);
      tm.over.then(v=>{
        if(v==='timeout'&&!locked&&alive){locked=true;ctl.disable();ctl.btns[L.a].classList.add('reveal');S.sleep(600).then(()=>{i++;ask();});}
      });
    }
    return{start(){ask();}};
  }
};

/* ---------------- FOCUS — go / no-go stream ---------------- */
Games.focus={
  id:'focus',name:'SIGNAL LOCK',planet:'focus',icon:'📡',
  instruction:'Noise floods every channel.<br>Lock <b>ONLY onto ⭐ gold carrier signals</b>. Ignore all decoys.',
  target:'⭐',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const DECOYS=['🪐','☄️','🛰️','🌙','💫'];
    const DUR=24;
    let hits=0,starMiss=0,ended=false;
    api.area.appendChild(el('div','fBanner','LOCK ONLY THE ⭐ CARRIERS — IGNORE DECOYS'));
    api.prompt('Gold carriers only. Everything else is noise.');
    function spawn(){
      if(!alive||ended)return;
      const star=r()<.42;
      const item=el('button','fItem',star?'⭐':pick(r,DECOYS));
      const x=rr(r,10,80),y=rr(r,16,72);
      item.style.left=x+'%';item.style.top=y+'%';
      let dead=false;
      item.onpointerdown=e=>{
        e.stopPropagation();if(dead||!alive)return;dead=true;
        if(star){hits++;item.classList.add('hit');api.correct(180*diffMult(d),{x:x+4,y:y});}
        else{api.wrong({x:x+4,y:y});item.style.visibility='hidden';}
        setTimeout(()=>item.remove(),350);
      };
      api.area.appendChild(item);
      const life=Math.max(650,1500-d*85);
      setTimeout(()=>{
        if(dead||!alive)return;
        dead=true;item.remove();
        if(star){starMiss++;if(starMiss%2===0)api.wrong(null,true);}
      },life);
    }
    const spawnT=setInterval(spawn,Math.max(420,790-d*32));
    api.cleanup(()=>clearInterval(spawnT));
    (function tick(){
      const t0=Date.now();
      const iv=setInterval(()=>{
        if(!alive||ended){clearInterval(iv);return;}
        const left=DUR-(Date.now()-t0)/1000;
        api.prompt(`⭐ ${hits} locked · ${Math.max(0,Math.ceil(left))}s — <b>carriers only</b>`);
        if(left<=0){clearInterval(iv);ended=true;
          api.finish({info:`${hits} stars caught`,extra:{focusHits:hits,starMiss}});
        }
      },250);
      api.cleanup(()=>clearInterval(iv));
    })();
    return{start(){spawn();}};
  }
};

/* ---------------- NAVIGATION — waypoint run ---------------- */
Games.nav={
  id:'nav',name:'WAYPOINT RUN',planet:null,icon:'🧭',
  instruction:'The nav computer plots a route through beacon buoys.<br>Watch the route light up — then <b>fly it: tap the buoys in order</b>.',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true;api.cleanup(()=>{alive=false;S.kill();});
    const rounds=d>=6?3:2;
    let round=0,route=[],pos=0,inputOn=false,hits=0;
    const zone=el('div','navZone');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','navSvg');svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','none');
    zone.appendChild(svg);
    api.area.appendChild(zone);
    const nN=Math.min(5+Math.floor(d/2),9);
    let nodes=[];
    function build(){
      nodes.forEach(n=>n.el.remove());nodes=[];
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(let i=0;i<nN;i++){
        let x=50,y=50,ok=false,tries=0;
        while(!ok&&tries<80){x=rr(r,12,88);y=rr(r,16,84);ok=nodes.every(n=>Math.hypot(n.x-x,(n.y-y)*1.4)>21);tries++;}
        const b=el('button','navNode','◆');
        b.style.left=x+'%';b.style.top=y+'%';
        b.setAttribute('aria-label','buoy '+(i+1));
        const idx=i;b.onclick=()=>tap(idx);
        zone.appendChild(b);
        nodes.push({x,y,el:b});
      }
    }
    function line(a,b,cls){
      const l=document.createElementNS('http://www.w3.org/2000/svg','line');
      l.setAttribute('x1',nodes[a].x);l.setAttribute('y1',nodes[a].y);
      l.setAttribute('x2',nodes[b].x);l.setAttribute('y2',nodes[b].y);
      l.setAttribute('class',cls);
      svg.appendChild(l);
    }
    async function playRound(){
      build();
      const len=clamp(3+Math.floor(d*.5)+round,3,nN);
      route=shuffle(r,nodes.map((_,i)=>i)).slice(0,len);
      api.prompt('Plotting route '+(round+1)+' / '+rounds+'…');
      await S.sleep(700);if(!alive)return;
      for(let i=0;i<route.length;i++){
        if(!alive)return;
        const n=nodes[route[i]];
        n.el.classList.add('lit');SFX.note(i);
        if(i>0)line(route[i-1],route[i],'navLine');
        await S.sleep(Math.max(320,640-d*32));
        n.el.classList.remove('lit');
      }
      await S.sleep(380);if(!alive)return;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      pos=0;inputOn=true;
      api.prompt('<b>Fly the route.</b> Tap the buoys in order.');
    }
    function tap(i){
      if(!inputOn||!alive)return;
      const good=i===route[pos];
      const n=nodes[i];
      n.el.classList.add(good?'good':'bad');
      setTimeout(()=>{n.el.classList.remove('good','bad');},360);
      if(good){
        SFX.note(pos);
        if(pos>0)line(route[pos-1],route[pos],'navLine good');
        pos++;
        if(pos===route.length){
          inputOn=false;hits++;
          api.correct(220*diffMult(d),{text:'ROUTE FLOWN'});
          setTimeout(next,700);
        }
      }else{
        inputOn=false;api.wrong();
        api.prompt('<b>Off course.</b> The buoys go dark…');
        setTimeout(next,900);
      }
    }
    function next(){if(!alive)return;round++;if(round>=rounds)api.finish({info:hits+'/'+rounds+' routes flown'});else playRound();}
    return{start(){playRound();}};
  }
};

/* ---------------- TIMING — orbital docking sync ---------------- */
Games.timing={
  id:'timing',name:'ORBITAL SYNC',planet:null,icon:'⏱️',
  instruction:'A docking ring spins out of sync with your ship.<br><b>Tap the instant the marker crosses the gold gate.</b>',
  create(stage){
    const api=stage.api,r=api.rng,d=api.difficulty,S=sleeper();
    let alive=true,raf=0,tok=0;
    api.cleanup(()=>{alive=false;S.kill();cancelAnimationFrame(raf);});
    const total=6;let i=0;
    const zone=el('div','syncZone',
      '<div class="syncRing">'+
        '<svg viewBox="0 0 100 100">'+
          '<circle cx="50" cy="50" r="42" class="syncTrack"/>'+
          '<path class="syncGate" d=""/>'+
        '</svg>'+
        '<div class="syncMarker"></div>'+
        '<div class="syncCore">🛰️</div>'+
      '</div>');
    api.area.appendChild(zone);
    const gateEl=$('.syncGate',zone),marker=$('.syncMarker',zone),track=$('.syncTrack',zone);
    let ang=rr(r,0,6.28),speed=0,gate=0,gateW=0,waiting=false,lastT=0;
    function arc(a0,a1){
      const p0x=50+42*Math.cos(a0),p0y=50+42*Math.sin(a0);
      const p1x=50+42*Math.cos(a1),p1y=50+42*Math.sin(a1);
      const large=(a1-a0)>Math.PI?1:0;
      return 'M '+p0x+' '+p0y+' A 42 42 0 '+large+' 1 '+p1x+' '+p1y;
    }
    function setup(){
      const myTok=++tok;
      gateW=Math.max(.3,.9-d*.06-i*.04);
      gate=rr(r,0,Math.PI*2);
      speed=(1.4+d*.22+i*.13)*(r()<.5?1:-1);
      gateEl.setAttribute('d',arc(gate-gateW/2,gate+gateW/2));
      waiting=true;
      api.prompt('Docking window '+(i+1)+' / '+total+' — tap inside the <b>gold gate</b>');
      /* window closes after 6s — a missed window is a miss */
      S.sleep(6000).then(()=>{
        if(!alive||!waiting||myTok!==tok)return;
        waiting=false;
        api.wrong({text:'WINDOW CLOSED'});
        advance();
      });
    }
    function advance(){
      S.sleep(650).then(()=>{
        if(!alive)return;
        i++;
        if(i>=total)api.finish({info:'docking sync'});
        else setup();
      });
    }
    function frame(now){
      if(!alive)return;
      raf=requestAnimationFrame(frame);
      const dt=Math.min(.05,(now-lastT)/1000||.016);lastT=now;
      ang+=speed*dt;
      marker.style.left=(50+42*Math.cos(ang))+'%';
      marker.style.top=(50+42*Math.sin(ang))+'%';
    }
    zone.onpointerdown=()=>{
      if(!waiting||!alive)return;
      waiting=false;tok++;
      const diff=Math.atan2(Math.sin(ang-gate),Math.cos(ang-gate));
      if(Math.abs(diff)<=gateW/2){
        const prec=1-Math.abs(diff)/(gateW/2);
        api.correct((120+220*prec)*diffMult(d),{text:prec>.75?'PERFECT SYNC':'SYNCED'});
        track.classList.add('good');setTimeout(()=>track.classList.remove('good'),320);
      }else{
        api.wrong({text:'OUT OF SYNC'});
        track.classList.add('bad');setTimeout(()=>track.classList.remove('bad'),320);
      }
      advance();
    };
    return{start(){setup();lastT=performance.now();raf=requestAnimationFrame(frame);}};
  }
};
