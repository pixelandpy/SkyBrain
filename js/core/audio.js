/* =====================================================================
   AUDIO — WebAudio synth: SFX + generative ambient space music
   ===================================================================== */
const SFX=(()=>{
  let ctx=null,master=null,sfxG=null,musG=null,musicOn=false,musTimer=0,chordIdx=0,chordNodes=[];
  const PENTA=[440,523.25,587.33,659.25,783.99,880];
  function init(){
    if(ctx)return true;
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false;
      ctx=new AC();
      master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);
      sfxG=ctx.createGain();sfxG.connect(master);
      musG=ctx.createGain();musG.gain.value=.16;musG.connect(master);
      applyToggles();
      return true;
    }catch(e){return false;}
  }
  /* volume sliders (0-100) sit on top of the on/off toggles — 100 preserves
     the original fixed levels (.9 / .16) exactly, so existing players hear
     no change until they actually touch a slider */
  const sfxVol=()=>clamp((SAVE.set.sfxVolume!=null?SAVE.set.sfxVolume:100)/100,0,1);
  const musVol=()=>clamp((SAVE.set.musicVolume!=null?SAVE.set.musicVolume:100)/100,0,1);
  function applyToggles(){
    if(!ctx)return;
    sfxG.gain.value=SAVE.set.sound?.9*sfxVol():0;
    musG.gain.value=SAVE.set.music?.16*musVol():0;
    /* startMusic/stopMusic live on the returned api object, not as bare
       names in this closure — call them through api, and never let a
       future typo here take the rest of the settings handler down with it */
    try{
      if(musicOn&&!SAVE.set.music)api.stopMusic();
      if(!musicOn&&SAVE.set.music&&ctx.state==='running')api.startMusic();
    }catch(e){}
  }
  function resume(){if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{});}
  function tone(f,dur,type,vol,when,glide,dest){
    if(!ctx||!SAVE.set.sound&&dest!==musG)return;
    const t=(when||ctx.currentTime);
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(f,t);
    if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+.05);
  }
  function noise(dur,vol,f0,f1,type){
    if(!ctx||!SAVE.set.sound)return;
    const t=ctx.currentTime,len=Math.floor(ctx.sampleRate*dur);
    const buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource();src.buffer=buf;
    const bp=ctx.createBiquadFilter();bp.type=type||'bandpass';bp.Q.value=1.1;
    bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(bp);bp.connect(g);g.connect(sfxG);src.start(t);src.stop(t+dur);
  }
  const api={
    unlock(){if(init())resume();},
    setToggles:applyToggles,
    get musicOn(){return musicOn;}, /* read-only — lets settings UI (and tests) observe ambient-music state */
    tap(){tone(640,.07,'sine',.22);},
    select(){tone(520,.09,'triangle',.24);},
    correct(){tone(660,.1,'sine',.3);tone(990,.16,'sine',.26,ctx&&ctx.currentTime+.07);},
    wrong(){tone(150,.22,'square',.22,0,95);noise(.16,.1,300,120,'lowpass');},
    combo(n){const f=440*Math.pow(2,Math.min(n,12)/12);tone(f,.1,'triangle',.26);tone(f*1.5,.14,'sine',.18,ctx&&ctx.currentTime+.06);},
    tick(){tone(880,.05,'square',.12);},
    note(i){
      const P=[261.6,293.7,329.6,392,440,523.3,587.3,659.3,784,880,987.9,1174.7,1318.5,1568,1760,2093];
      tone(P[i%P.length],.24,'sine',.3);
    },
    go(){tone(660,.2,'sine',.3,0,990);},
    coin(){tone(1318,.07,'sine',.22);tone(1760,.14,'sine',.2,ctx&&ctx.currentTime+.07);},
    whoosh(){noise(.5,.16,220,1400);},
    levelup(){[523,659,784,1046].forEach((f,i)=>tone(f,.16,'triangle',.26,ctx&&ctx.currentTime+i*.09));},
    achieve(){tone(988,.5,'sine',.24);tone(1318,.7,'sine',.18,ctx&&ctx.currentTime+.12);},
    fanfare(){[196,392,523,659,784].forEach((f,i)=>tone(f,.5,'sine',.2,ctx&&ctx.currentTime+i*.1));noise(1.1,.06,900,3200,'highpass');},
    star(){tone(1568,.3,'sine',.2);tone(2093,.45,'sine',.15,ctx&&ctx.currentTime+.1);},
    /* generative ambient music: slow chord pads + pentatonic bells */
    startMusic(){
      if(!init()||musicOn||!SAVE.set.music)return;
      musicOn=true;resume();
      const CHORDS=[[110,164.81,220,261.63],[87.31,130.81,174.61,220],[98,146.83,196,246.94],[82.41,123.47,164.81,196]];
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;lp.Q.value=.6;lp.connect(musG);
      const lfo=ctx.createOscillator(),lg=ctx.createGain();
      lfo.frequency.value=.06;lg.gain.value=180;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
      function playChord(idx){
        CHORDS[idx%CHORDS.length].forEach((f,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.type=i%2?'sawtooth':'triangle';o.frequency.value=f*(1+(i-1.5)*.0012);
          g.gain.setValueAtTime(0,ctx.currentTime);
          g.gain.linearRampToValueAtTime(.05,ctx.currentTime+2.5);
          g.gain.linearRampToValueAtTime(0,ctx.currentTime+8.4);
          o.connect(g);g.connect(lp);o.start();o.stop(ctx.currentTime+8.6);
        });
      }
      playChord(0);
      musTimer=setInterval(()=>{chordIdx++;playChord(chordIdx);},8000);
      (function bell(){
        if(!musicOn)return;
        if(SAVE.set.music&&ctx)tone(pick(Math.random,PENTA)*(Math.random()<.3?2:1),2.4,'sine',.05,ctx.currentTime+.1,0,musG);
        setTimeout(bell,3800+Math.random()*5200);
      })();
    },
    stopMusic(){musicOn=false;clearInterval(musTimer);},
    suspend(){if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});},
    resumeCtx(){if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{});}
  };
  return api;
})();

