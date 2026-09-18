/* =====================================================================
   SkyBrain — S8 · THE BRAIN UNIVERSE (canvas scene + camera)
   Everything is procedural: starfields, nebulae, rotating planets,
   the living Core, the Endless Rift, discovery cinematics.
   ===================================================================== */
const Universe=(()=>{
  const cv=$('#space');
  let ctx=null,W=0,H=0,dpr=1;
  let running=false,raf0=0,lastT=0,time=0;
  const cam={x:0,y:-20,z:.8};
  let mode='free'; /* free | tween | cine */
  let tween=null,vel={x:0,y:0};
  const ZMIN=.42,ZMAX=2.8;
  let stars=[],asteroids=[],glowCache={},texCache={},shadeSprite=null,coreSkin=null,nebulas=[];
  let hoverId=null,lowQ=false,dtAvg=16;
  const onPickRef={fn:null};
  const onBackRef={fn:null};
  let token=0;

  /* ---------- the player's spacecraft — thrust-based flight model ----------
     Real(ish) physics: the engine applies THRUST along the nose; velocity
     integrates from acceleration; inertia carries the ship when the engine
     cuts; retro-thrust brakes on approach; boost doubles thrust at double
     energy burn. Long taps boost. No teleporting, ever. */
  const ship={
    x:0,y:150,a:-Math.PI/2,      /* position + heading                 */
    vx:0,vy:0,                   /* velocity (inertia lives here)      */
    av:0,                        /* angular velocity (turn inertia)    */
    thrust:0,                    /* current engine output 0..1         */
    boost:false,retro:false,     /* boost burn / retro-braking flags   */
    shake:0,                     /* hull shake amount during hard burns*/
    target:null,arriveCb:null,trail:[]
  };
  let follow=false;
  const SHIP_ACC=250,SHIP_TURN=9,SHIP_VMAX=430;
  /* ---------- manual pilot controls (on-screen thruster buttons + keyboard) ----------
     This is now the PRIMARY way of flying: rotate, forward thrust, reverse/
     braking, boost, and a dedicated full-stop. `flyTo` (below) still powers
     the handful of assisted-autopilot features that were never "tap
     anywhere to fly" in spirit — the NAV COMPUTER Mk II suggestion, the
     Expedition system's waypoint travel, and the one-off intro/"follow the
     signal" cinematics — but any manual input immediately hands control
     back to the player by cancelling an active autopilot target. */
  const ctrl={left:false,right:false,fwd:false,rev:false,boost:false,brake:false};
  function setCtrl(key,on){
    if(!(key in ctrl))return;
    ctrl[key]=!!on;
    if(on&&ship.target){ship.target=null;ship.arriveCb=null;} /* manual input takes over */
  }
  function anyManualInput(){return ctrl.left||ctrl.right||ctrl.fwd||ctrl.rev||ctrl.boost||ctrl.brake;}
  function flyTo(x,y,cb,boost,label){
    ship.target={x,y};ship.arriveCb=cb||null;follow=true;
    ship.boost=!!boost;
    ship.routeFrom={x:ship.x,y:ship.y};          /* for travelled-distance HUD */
    ship.routeLabel=label||null;                 /* destination name, if known  */
    SFX.whoosh&&SFX.whoosh();
  }
  function shipNear(x,y,r){return Math.hypot(ship.x-x,ship.y-y)<(r||90);}
  function updateShip(dt){
    const hasSys=typeof Shipsys!=='undefined';
    const reserve=hasSys&&Shipsys.reserveMode();
    const accMul=(hasSys?Shipsys.accelBonus():1)*(reserve?.35:1);
    ship.retro=false;
    if(ship.target){
      const dx=ship.target.x-ship.x,dy=ship.target.y-ship.y,d=Math.hypot(dx,dy);
      const speed=Math.hypot(ship.vx,ship.vy);
      if(d<18&&speed<70){
        ship.target=null;ship.thrust=0;ship.boost=false;
        const cb=ship.arriveCb;ship.arriveCb=null;
        if(cb)cb();
      }else{
        /* steer the nose with angular inertia */
        const desired=Math.atan2(dy,dx);
        let da=desired-ship.a;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
        ship.av=lerp(ship.av,clamp(da*6,-SHIP_TURN,SHIP_TURN),clamp(dt*6,0,1));
        ship.a+=ship.av*dt;
        /* stopping distance decides burn vs retro-burn */
        const acc=SHIP_ACC*accMul*(ship.boost?1.9:1);
        const stopDist=speed*speed/(2*acc);
        if(d>stopDist*1.15){
          /* main burn along the nose */
          const facing=Math.cos(ship.a)*dx/d+Math.sin(ship.a)*dy/d; /* alignment */
          ship.thrust=lerp(ship.thrust,clamp(.35+facing*.65,0,1),clamp(dt*4,0,1));
          const a2=acc*ship.thrust*Math.max(0,facing);
          ship.vx+=Math.cos(ship.a)*a2*dt;
          ship.vy+=Math.sin(ship.a)*a2*dt;
        }else{
          /* retro thrust — burn against velocity to brake.
             The decel impulse is capped at the current speed so the burn can
             stop the ship but never push it backwards (no low-speed jitter). */
          ship.retro=true;
          ship.thrust=lerp(ship.thrust,.75,clamp(dt*5,0,1));
          const dec=Math.min(acc*1.25*dt,speed);
          const inv=1/Math.max(speed,.001);
          ship.vx-=ship.vx*inv*dec;
          ship.vy-=ship.vy*inv*dec;
        }
        /* velocity cap (boost raises it) — approached smoothly, never an
           instant clamp: excess speed bleeds off like drag, preserving inertia */
        const vmax=SHIP_VMAX*(ship.boost?1.5:1)*(reserve?.4:1);
        const v=Math.hypot(ship.vx,ship.vy);
        if(v>vmax){
          const k=Math.exp(-dt*2.2);              /* exponential decay toward vmax */
          const nv=vmax+(v-vmax)*k;
          ship.vx*=nv/v;ship.vy*=nv/v;
        }
        /* energy burn ∝ thrust; boost burns double */
        if(hasSys)Shipsys.drainFlight(ship.thrust,ship.boost,dt);
      }
    }else if(anyManualInput()){
      /* ---------- MANUAL PILOT — the primary flight control ----------
         Same acceleration/inertia/vmax/energy model as the autopilot above,
         just driven by button/key state instead of a steering target. */
      if(ctrl.fwd||ctrl.rev||ctrl.brake)follow=true; /* re-lock the camera on real movement intent */
      const turnDir=(ctrl.left?-1:0)+(ctrl.right?1:0);
      ship.av=lerp(ship.av,turnDir*SHIP_TURN,clamp(dt*6,0,1));
      ship.a+=ship.av*dt;
      const canBoost=ctrl.boost&&ctrl.fwd&&(!hasSys||Shipsys.energy>8);
      ship.boost=canBoost;
      const acc=SHIP_ACC*accMul*(ship.boost?1.9:1);
      if(ctrl.brake){
        /* STOP — strong braking regardless of heading */
        ship.retro=true;
        ship.thrust=lerp(ship.thrust,.95,clamp(dt*6,0,1));
        const speed=Math.hypot(ship.vx,ship.vy);
        if(speed>.05){
          const dec=Math.min(acc*2.1*dt,speed),inv=1/speed;
          ship.vx-=ship.vx*inv*dec;ship.vy-=ship.vy*inv*dec;
        }else{ship.vx=0;ship.vy=0;}
      }else if(ctrl.fwd){
        /* forward thrust along the nose */
        ship.thrust=lerp(ship.thrust,1,clamp(dt*4,0,1));
        ship.vx+=Math.cos(ship.a)*acc*ship.thrust*dt;
        ship.vy+=Math.sin(ship.a)*acc*ship.thrust*dt;
      }else if(ctrl.rev){
        /* reverse / braking — retro-burn against velocity while moving,
           easing into a gentle reverse crawl once nearly stopped */
        ship.thrust=lerp(ship.thrust,.85,clamp(dt*4,0,1));
        const speed=Math.hypot(ship.vx,ship.vy);
        if(speed>8){
          ship.retro=true;
          const dec=Math.min(acc*1.25*dt,speed),inv=1/speed;
          ship.vx-=ship.vx*inv*dec;ship.vy-=ship.vy*inv*dec;
        }else{
          ship.vx-=Math.cos(ship.a)*acc*.45*ship.thrust*dt;
          ship.vy-=Math.sin(ship.a)*acc*.45*ship.thrust*dt;
        }
      }else{
        ship.thrust*=Math.exp(-dt*5); /* rotating in place — engine spools down */
      }
      /* velocity cap — same smooth exponential bleed-off as the autopilot */
      const vmax=SHIP_VMAX*(ship.boost?1.5:1)*(reserve?.4:1);
      const v=Math.hypot(ship.vx,ship.vy);
      if(v>vmax){
        const k=Math.exp(-dt*2.2);
        const nv=vmax+(v-vmax)*k;
        ship.vx*=nv/v;ship.vy*=nv/v;
      }
      if(hasSys)Shipsys.drainFlight(ship.thrust,ship.boost,dt);
    }else{
      /* engine off: inertia + very weak drag so space still feels like space */
      ship.vx*=Math.exp(-dt*.55);ship.vy*=Math.exp(-dt*.55);
      ship.av*=Math.exp(-dt*3);ship.a+=ship.av*dt;
      ship.thrust*=Math.exp(-dt*5);ship.boost=false;
    }
    /* hull shake during hard burns */
    const targetShake=(ship.boost?1:0)+(ship.thrust>.8?.4:0)+(ship.retro?.3:0);
    ship.shake=lerp(ship.shake,targetShake,clamp(dt*5,0,1));
    ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;
    ship.x=clamp(ship.x,-1340,1340);ship.y=clamp(ship.y,-940,990);
    /* engine trail scales with thrust */
    if(ship.thrust>.15&&!lowQ){
      ship.trail.push({x:ship.x-Math.cos(ship.a)*14,y:ship.y-Math.sin(ship.a)*14, /* from the nozzles */
        life:.4+ship.thrust*.4,s:1+ship.thrust*(ship.boost?3:1.6)});
      if(ship.trail.length>(ship.boost?40:26))ship.trail.shift();
    }
    for(const t of ship.trail)t.life-=dt;
    ship.trail=ship.trail.filter(t=>t.life>0);
    /* soft camera follow while flying — works for both autopilot travel and
       manual piloting; a manual pan-drag sets follow=false until movement resumes */
    if(follow&&mode==='free'){
      cam.x=lerp(cam.x,ship.x,clamp(dt*1.7,0,1));
      cam.y=lerp(cam.y,ship.y,clamp(dt*1.7,0,1));
      clampCam();
    }
  }
  /* ---------- the spacecraft itself — a real ship, not a cursor ----------
     The hull is pre-rendered once to an offscreen sprite (fuselage, swept
     delta wings, wingtip nacelles, cockpit canopy, dorsal fin, panel lines);
     dynamic layers (engine flames, retro thrusters, navigation lights) are
     drawn per frame on top. Ship local space: nose = -y, 1 unit = 5 px. */
  let shipSprite=null;
  function makeShipSprite(){
    const PX=5;                       /* pixels per ship unit  */
    const c=document.createElement('canvas');
    c.width=130;c.height=160;         /* fits x ±13 · y -16..+16 units */
    const g=c.getContext('2d');
    g.translate(65,80);g.scale(PX,PX);
    g.lineJoin='round';

    /* — swept delta wings (dark steel, lit leading edge) — */
    const wing=side=>{
      g.save();g.scale(side,1);
      const wg=g.createLinearGradient(2,0,12,8);
      wg.addColorStop(0,'#8d9cd0');wg.addColorStop(.6,'#57648f');wg.addColorStop(1,'#39466e');
      g.fillStyle=wg;
      g.beginPath();
      g.moveTo(2.4,-2.4);              /* wing root, high on the hull   */
      g.lineTo(12,7.2);                /* swept tip                     */
      g.lineTo(12,9.8);                /* tip chord                     */
      g.lineTo(3.4,7.6);               /* trailing edge back to hull    */
      g.closePath();g.fill();
      g.strokeStyle='rgba(205,225,255,.5)';g.lineWidth=.35;g.stroke();
      /* leading-edge highlight */
      g.strokeStyle='rgba(220,240,255,.8)';g.lineWidth=.3;
      g.beginPath();g.moveTo(2.6,-2.1);g.lineTo(11.7,7.3);g.stroke();
      /* — wingtip engine nacelle — */
      const ng=g.createLinearGradient(10.4,4,13,4);
      ng.addColorStop(0,'#a9b7e6');ng.addColorStop(.5,'#6c7aa8');ng.addColorStop(1,'#46527c');
      g.fillStyle=ng;
      rrect(g,10.5,3.6,2.5,7.6,1.1);g.fill();
      g.strokeStyle='rgba(205,225,255,.45)';g.lineWidth=.3;g.stroke();
      /* nacelle intake glow */
      g.fillStyle='#7fd8ff';
      g.beginPath();g.arc(11.75,4.6,.62,0,7);g.fill();
      /* nacelle exhaust ring */
      g.fillStyle='#2b3557';
      rrect(g,10.9,10.4,1.7,.9,.4);g.fill();
      g.restore();
    };
    wing(1);wing(-1);

    /* — main fuselage (sleek tapering hull) — */
    const hg=g.createLinearGradient(0,-14,0,12);
    hg.addColorStop(0,'#f4f8ff');hg.addColorStop(.35,'#c3d0f2');
    hg.addColorStop(.7,'#8194c8');hg.addColorStop(1,'#525f92');
    g.fillStyle=hg;
    g.beginPath();
    g.moveTo(0,-14);                             /* nose tip            */
    g.bezierCurveTo( 2.6,-11.5, 3.8,-6,  3.8,-1);/* right shoulder      */
    g.bezierCurveTo( 3.8, 3.5,  3.2, 7,  2.8,9.4);/* right flank        */
    g.lineTo(-2.8,9.4);                          /* stern               */
    g.bezierCurveTo(-3.2, 7, -3.8, 3.5, -3.8,-1);/* left flank          */
    g.bezierCurveTo(-3.8,-6, -2.6,-11.5, 0,-14); /* back to nose        */
    g.closePath();g.fill();
    g.strokeStyle='rgba(215,232,255,.75)';g.lineWidth=.35;g.stroke();
    /* side shading for a rounded cross-section */
    const sg=g.createLinearGradient(-3.8,0,3.8,0);
    sg.addColorStop(0,'rgba(20,28,64,.4)');sg.addColorStop(.25,'rgba(20,28,64,0)');
    sg.addColorStop(.75,'rgba(20,28,64,0)');sg.addColorStop(1,'rgba(20,28,64,.4)');
    g.fillStyle=sg;
    g.beginPath();
    g.moveTo(0,-14);
    g.bezierCurveTo(2.6,-11.5,3.8,-6,3.8,-1);g.bezierCurveTo(3.8,3.5,3.2,7,2.8,9.4);
    g.lineTo(-2.8,9.4);g.bezierCurveTo(-3.2,7,-3.8,3.5,-3.8,-1);g.bezierCurveTo(-3.8,-6,-2.6,-11.5,0,-14);
    g.closePath();g.fill();
    /* nose cone (heat-shield tone) */
    g.fillStyle='#39466e';
    g.beginPath();g.moveTo(0,-14);g.bezierCurveTo(1.6,-12.6,2.2,-11,2.4,-9.6);
    g.lineTo(-2.4,-9.6);g.bezierCurveTo(-2.2,-11,-1.6,-12.6,0,-14);g.closePath();g.fill();
    g.strokeStyle='rgba(160,190,255,.4)';g.lineWidth=.3;g.stroke();
    /* hull panel lines */
    g.strokeStyle='rgba(35,45,90,.55)';g.lineWidth=.28;
    g.beginPath();g.moveTo(-3.6,1.2);g.lineTo(3.6,1.2);g.stroke();
    g.beginPath();g.moveTo(-3.2,5.6);g.lineTo(3.2,5.6);g.stroke();
    /* cyan accent stripes along the flanks */
    g.strokeStyle='rgba(95,217,255,.85)';g.lineWidth=.42;
    g.beginPath();g.moveTo(-3.45,-3.2);g.lineTo(-2.95,6.8);g.stroke();
    g.beginPath();g.moveTo(3.45,-3.2);g.lineTo(2.95,6.8);g.stroke();

    /* — cockpit canopy (teardrop, glass gradient + glint) — */
    const cg=g.createLinearGradient(0,-9.4,0,-2);
    cg.addColorStop(0,'#eafcff');cg.addColorStop(.35,'#6fd9ff');cg.addColorStop(1,'#0c5a8f');
    g.fillStyle=cg;
    g.beginPath();g.ellipse(0,-5.6,2,3.6,0,0,7);g.fill();
    g.strokeStyle='rgba(220,245,255,.9)';g.lineWidth=.3;g.stroke();
    /* canopy frame + specular glint */
    g.strokeStyle='rgba(10,40,70,.5)';g.lineWidth=.25;
    g.beginPath();g.moveTo(-1.9,-5.6);g.lineTo(1.9,-5.6);g.stroke();
    g.fillStyle='rgba(255,255,255,.85)';
    g.beginPath();g.ellipse(-.7,-7.4,.5,1.1,-.35,0,7);g.fill();

    /* — dorsal fin — */
    const fg2=g.createLinearGradient(0,2,0,9);
    fg2.addColorStop(0,'#b9c6ec');fg2.addColorStop(1,'#5a6796');
    g.fillStyle=fg2;
    g.beginPath();g.moveTo(0,2.2);g.lineTo(1.1,8.8);g.lineTo(-1.1,8.8);g.closePath();g.fill();
    g.strokeStyle='rgba(205,225,255,.5)';g.lineWidth=.25;g.stroke();

    /* — twin main engine nozzles — */
    for(const sx of[-1.9,1.9]){
      const eg=g.createLinearGradient(sx-1.2,9,sx+1.2,9);
      eg.addColorStop(0,'#39466e');eg.addColorStop(.5,'#818fc0');eg.addColorStop(1,'#39466e');
      g.fillStyle=eg;
      rrect(g,sx-1.15,9.2,2.3,2.6,.5);g.fill();
      g.strokeStyle='rgba(180,205,255,.4)';g.lineWidth=.28;g.stroke();
      g.fillStyle='#171f3d';
      g.beginPath();g.ellipse(sx,11.6,.85,.5,0,0,7);g.fill();
    }
    return c;
  }
  function rrect(g,x,y,w,h,r){
    g.beginPath();
    if(g.roundRect){g.roundRect(x,y,w,h,r);return;}
    g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
  }
  function flame(x,yTop,wd,len,boost){
    /* two-layer engine flame: hot white core inside a colored plume */
    const fg=ctx.createLinearGradient(0,yTop,0,yTop+len);
    fg.addColorStop(0,boost?'rgba(216,180,255,.95)':'rgba(150,235,255,.95)');
    fg.addColorStop(.55,boost?'rgba(150,100,255,.55)':'rgba(80,170,255,.5)');
    fg.addColorStop(1,'rgba(120,110,255,0)');
    ctx.fillStyle=fg;
    ctx.beginPath();ctx.moveTo(x-wd,yTop);ctx.quadraticCurveTo(x,yTop+len*1.06,x+wd,yTop);ctx.closePath();ctx.fill();
    ctx.fillStyle=boost?'rgba(245,235,255,.95)':'rgba(235,252,255,.95)';
    ctx.beginPath();ctx.moveTo(x-wd*.42,yTop);ctx.quadraticCurveTo(x,yTop+len*.55,x+wd*.42,yTop);ctx.closePath();ctx.fill();
  }
  function drawShip(t){
    /* course line — the autopilot target (assisted travel) OR a tapped
       waypoint marker (manual piloting guide, drawn a touch dimmer) */
    const navPoint=ship.target||waypoint;
    if(navPoint){
      ctx.save();ctx.setLineDash([5/cam.z,9/cam.z]);
      ctx.strokeStyle=ship.target?'rgba(120,220,255,.28)':'rgba(120,220,255,.2)';
      ctx.lineWidth=1.2/cam.z;
      ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(navPoint.x,navPoint.y);ctx.stroke();
      ctx.setLineDash([]);
      const pu=1+Math.sin(t*6)*.25;
      ctx.strokeStyle=ship.target?'rgba(120,220,255,.5)':'rgba(120,220,255,.4)';
      ctx.beginPath();ctx.arc(navPoint.x,navPoint.y,7*pu,0,7);ctx.stroke();
      ctx.restore();
    }
    /* trail — width & glow scale with the burn that made each puff */
    ctx.globalCompositeOperation='lighter';
    for(const tr of ship.trail){
      ctx.globalAlpha=tr.life*.6;
      ctx.fillStyle=ship.boost?'#b18cff':'#6fe3ff';
      ctx.beginPath();ctx.arc(tr.x,tr.y,(tr.s||2.6)*tr.life+.6,0,7);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    /* body (hull shake during hard burns; banked into turns) */
    const bob=ship.target?0:Math.sin(t*1.6)*1.5;
    const shx=ship.shake?(Math.random()-.5)*ship.shake*2.4:0;
    const shy=ship.shake?(Math.random()-.5)*ship.shake*2.4:0;
    ctx.save();ctx.translate(ship.x+shx,ship.y+bob+shy);
    ctx.rotate(ship.a+Math.PI/2);
    ctx.scale(1+Math.abs(ship.av)*.008,1); /* subtle bank stretch in turns */
    /* aura glow behind the ship */
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.42+ship.thrust*.3;
    ctx.drawImage(glow(ship.boost?'#b18cff':'#6fe3ff'),-30,-30,60,60);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    /* — engine flames (twin main nozzles; nacelles join during boost) — */
    if(ship.thrust>.12){
      const power=ship.thrust*(ship.boost?1.9:1);
      const flick=()=>Math.random()*2.4*power;
      ctx.globalCompositeOperation='lighter';
      flame(-1.9*1.0,11.4,1.5+power*1.1,4+power*13+flick(),ship.boost);
      flame( 1.9*1.0,11.4,1.5+power*1.1,4+power*13+flick(),ship.boost);
      if(ship.boost){ /* wingtip nacelles ignite on boost */
        flame(-11.75,11.2,1.0,3+power*7+flick()*.5,true);
        flame( 11.75,11.2,1.0,3+power*7+flick()*.5,true);
      }
      ctx.globalCompositeOperation='source-over';
    }
    /* — retro-thrusters fire forward from the nose when braking — */
    if(ship.retro&&ship.thrust>.3){
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(255,209,140,.85)';
      for(const sx of[-3.1,3.1]){
        const rl=2.5+Math.random()*3;
        ctx.beginPath();ctx.moveTo(sx-1,-8.6);ctx.lineTo(sx+1,-8.6);ctx.lineTo(sx*1.15,-8.6-rl);ctx.closePath();ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';
    }
    /* — the hull sprite — */
    if(!shipSprite)shipSprite=makeShipSprite();
    ctx.drawImage(shipSprite,-13,-16,26,32);
    /* — navigation lights: port red · starboard green (alternating pulse),
         white tail strobe (short double-blink like real aircraft) — */
    const blink=Math.sin(t*4);
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=.35+.65*Math.max(0,blink);
    ctx.fillStyle='#ff5c6e';
    ctx.beginPath();ctx.arc(-11.75,8.9,.8,0,7);ctx.fill();
    ctx.globalAlpha=.35+.65*Math.max(0,-blink);
    ctx.fillStyle='#57ff9a';
    ctx.beginPath();ctx.arc(11.75,8.9,.8,0,7);ctx.fill();
    const strobe=(t%1.4);
    if(strobe<.08||(strobe>.16&&strobe<.24)){
      ctx.globalAlpha=.95;ctx.fillStyle='#ffffff';
      ctx.beginPath();ctx.arc(0,8.4,.9,0,7);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.restore();
  }

  /* ---------- comets & passing craft (living-universe flourishes) ---------- */
  let comets=[];
  function spawnComet(isCraft){
    const a=Math.random()*6.28;
    const cx=ship.x+Math.cos(a)*700,cy=ship.y+Math.sin(a)*500;
    const dir=a+Math.PI+(Math.random()-.5)*.9;
    comets.push({x:cx,y:cy,vx:Math.cos(dir)*(isCraft?120:260),vy:Math.sin(dir)*(isCraft?120:260),
      life:isCraft?11:6,craft:!!isCraft});
    if(comets.length>4)comets.shift();
  }
  function drawComets(dt){
    comets=comets.filter(c=>{
      c.x+=c.vx*dt;c.y+=c.vy*dt;c.life-=dt;
      if(c.life<=0)return false;
      const fade=Math.min(1,c.life);
      if(c.craft){
        ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.atan2(c.vy,c.vx)+Math.PI/2);
        ctx.globalAlpha=.85*fade;
        ctx.fillStyle='#8d97c4';
        ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffd166';ctx.globalAlpha=(.5+.5*Math.sin(time*6))*fade;
        ctx.beginPath();ctx.arc(0,0,1.4,0,7);ctx.fill();
        ctx.restore();
      }else{
        ctx.globalCompositeOperation='lighter';
        const L=Math.hypot(c.vx,c.vy)*.22;
        const g=ctx.createLinearGradient(c.x,c.y,c.x-c.vx/260*L,c.y-c.vy/260*L);
        g.addColorStop(0,'rgba(200,235,255,'+(.9*fade)+')');g.addColorStop(1,'rgba(200,235,255,0)');
        ctx.strokeStyle=g;ctx.lineWidth=2.4;
        ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x-c.vx/260*L,c.y-c.vy/260*L);ctx.stroke();
        ctx.fillStyle='#fff';ctx.globalAlpha=fade;
        ctx.beginPath();ctx.arc(c.x,c.y,2.2,0,7);ctx.fill();
        ctx.globalCompositeOperation='source-over';
      }
      ctx.globalAlpha=1;
      return true;
    });
  }

  /* ---------- collectible pickups (energy crystals · cargo pods) ---------- */
  let pickups=[];
  function spawnPickup(kind,nearX,nearY){
    if(pickups.length>=3)return null;
    const a=Math.random()*6.28,d=260+Math.random()*260;
    const p={kind,x:clamp(nearX+Math.cos(a)*d,-1250,1250),y:clamp(nearY+Math.sin(a)*d,-880,940),born:time};
    pickups.push(p);return p;
  }
  function drawPickups(){
    for(const p of pickups){
      const pu=1+Math.sin(time*3+p.x)*.18;
      const col=p.kind==='energy'?'#5fd9ff':'#ffd166';
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5;
      ctx.drawImage(glow(col),p.x-40*pu,p.y-40*pu,80*pu,80*pu);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(time*.9);
      if(p.kind==='energy'){
        ctx.fillStyle=col;
        ctx.beginPath();ctx.moveTo(0,-8*pu);ctx.lineTo(5*pu,0);ctx.lineTo(0,8*pu);ctx.lineTo(-5*pu,0);ctx.closePath();ctx.fill();
        ctx.fillStyle='#eafcff';ctx.beginPath();ctx.arc(0,0,1.8,0,7);ctx.fill();
      }else{
        ctx.fillStyle='rgba(60,52,30,.95)';ctx.strokeStyle=col;ctx.lineWidth=1.4;
        ctx.beginPath();ctx.rect(-6,-6,12,12);ctx.fill();ctx.stroke();
        ctx.strokeStyle='rgba(255,209,102,.6)';
        ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.stroke();
      }
      ctx.restore();
    }
  }
  function pickupTick(){
    if(typeof Shipsys==='undefined')return;
    pickups=pickups.filter(p=>{
      if(time-p.born>90)return false; /* drifts away eventually */
      if(shipNear(p.x,p.y,46)){
        burst(p.x,p.y,p.kind==='energy'?'#5fd9ff':'#ffd166',20);
        Shipsys.collectPickup(p);
        return false;
      }
      return true;
    });
  }

  /* ---------- warp jump FX (entering warp feels special) ---------- */
  let warping=0,warpCb=null;
  function warpFX(cb){
    warping=1;warpCb=cb||null;
    SFX.whoosh&&SFX.whoosh();
    buzz([20,40,60]);
  }
  function drawWarp(dt){
    if(warping<=0)return;
    warping+=dt*.9;
    const p=warping-1; /* 0..~1.1 */
    /* star tunnel */
    ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.globalCompositeOperation='lighter';
    const n=lowQ?26:60;
    for(let i=0;i<n;i++){
      const a=(i/n)*6.28+i*.7;
      const rr0=(i%7+1)/8*Math.min(W,H)*.55*(0.15+p*1.4);
      const x0=W/2+Math.cos(a)*rr0,y0=H/2+Math.sin(a)*rr0;
      const L=20+p*160;
      const g=ctx.createLinearGradient(x0,y0,W/2+Math.cos(a)*(rr0+L),H/2+Math.sin(a)*(rr0+L));
      g.addColorStop(0,'rgba(160,190,255,0)');g.addColorStop(1,'rgba(200,225,255,'+Math.min(.9,p*1.4)+')');
      ctx.strokeStyle=g;ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(W/2+Math.cos(a)*(rr0+L),H/2+Math.sin(a)*(rr0+L));ctx.stroke();
    }
    /* white-out at the end */
    if(p>.75){
      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='rgba(240,245,255,'+Math.min(1,(p-.75)*4)+')';
      ctx.fillRect(0,0,W,H);
    }
    ctx.restore();
    if(p>=1){
      warping=0;
      const cb=warpCb;warpCb=null;
      if(cb)cb();
    }
  }

  /* ---------- anomalies — brain challenges embedded in the world ---------- */
  let anomaly=null; /* {x,y,icon,name,hue,seed,born} */
  function spawnAnomaly(seed){
    const r=makeRng('ANOM-'+(seed||Date.now()));
    let x=0,y=0,tries=0;
    do{
      x=rr(r,-1150,1150);y=rr(r,-820,860);tries++;
    }while(tries<40&&(Math.hypot(x,y)<330||Math.hypot(x-RIFT.x,y-RIFT.y)<260));
    const kinds=[
      {icon:'📡',name:'UNKNOWN SIGNAL',hue:'#7ef7ff'},
      {icon:'🛰️',name:'DERELICT PROBE',hue:'#ffd166'},
      {icon:'🌌',name:'COSMIC ANOMALY',hue:'#e879f9'},
      {icon:'🧊',name:'FROZEN ECHO',hue:'#a5f3fc'},
      {icon:'🕳️',name:'DARK STRUCTURE',hue:'#a78bfa'}
    ];
    /* NOTE: use direct index — the local pick(sx,sy) hit-tester shadows the global pick(r,arr) */
    anomaly=Object.assign({x,y,seed:seed||Date.now(),born:performance.now()},kinds[Math.floor(r()*kinds.length)]);
    return anomaly;
  }
  function clearAnomaly(){anomaly=null;}
  function drawAnomaly(t){
    if(!anomaly)return;
    const{x,y,hue}=anomaly;
    const pu=1+Math.sin(t*2.2)*.12;
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55;
    ctx.drawImage(glow(hue),x-90*pu,y-90*pu,180*pu,180*pu);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    /* rotating dashed diamond */
    ctx.save();ctx.translate(x,y);ctx.rotate(t*.7);
    ctx.setLineDash([7/cam.z,7/cam.z]);ctx.strokeStyle=hue;ctx.lineWidth=1.6/cam.z;ctx.globalAlpha=.85;
    const R=26*pu;
    ctx.beginPath();ctx.moveTo(0,-R);ctx.lineTo(R,0);ctx.lineTo(0,R);ctx.lineTo(-R,0);ctx.closePath();ctx.stroke();
    ctx.restore();ctx.setLineDash([]);
    /* radio wave rings */
    const w=(t*.8)%1;
    for(const ph of[w,(w+.5)%1]){
      ctx.globalAlpha=(1-ph)*.5;ctx.strokeStyle=hue;ctx.lineWidth=1.4/cam.z;
      ctx.beginPath();ctx.arc(x,y,18+ph*68,0,7);ctx.stroke();
    }
    ctx.globalAlpha=1;
    /* core spark */
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='#ffffff';ctx.globalAlpha=.75+.25*Math.sin(t*5);
    ctx.beginPath();ctx.arc(x,y,3.2,0,7);ctx.fill();
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }

  /* ---------- helpers ---------- */
  function hexRGB(h){const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];}
  function glow(color){
    if(glowCache[color])return glowCache[color];
    const s=256,c=document.createElement('canvas');c.width=c.height=s;
    const g=c.getContext('2d'),[r,gg,b]=hexRGB(color);
    const gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    gr.addColorStop(0,`rgba(${r},${gg},${b},.85)`);
    gr.addColorStop(.35,`rgba(${r},${gg},${b},.32)`);
    gr.addColorStop(1,`rgba(${r},${gg},${b},0)`);
    g.fillStyle=gr;g.fillRect(0,0,s,s);
    glowCache[color]=c;return c;
  }
  function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function makeTex(p){
    const s=256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,s);grad.addColorStop(0,p.c1);grad.addColorStop(1,p.c2);
    g.fillStyle=grad;g.fillRect(0,0,s,s);
    const rnd=mulberry32(hashStr(p.id));
    for(let i=0;i<10;i++){
      const y=rnd()*s,h=6+rnd()*24;
      g.fillStyle=rnd()<.5?`rgba(255,255,255,${.03+rnd()*.08})`:`rgba(8,8,40,${.05+rnd()*.1})`;
      g.fillRect(0,y,s,h);
    }
    for(let i=0;i<8;i++){
      const x=rnd()*s,y=rnd()*s,rx=8+rnd()*26,ry=rx*(.4+rnd()*.5),ro=rnd()*3;
      g.fillStyle=rnd()<.5?`rgba(255,255,255,${.07+rnd()*.1})`:`rgba(15,10,55,${.08+rnd()*.12})`;
      for(const ox of[-s,0,s]){g.beginPath();g.ellipse(x+ox,y,rx,ry,ro,0,7);g.fill();}
    }
    return c;
  }
  function makeShade(){
    const s=256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
    const gr=g.createRadialGradient(s*.36,s*.3,s*.05,s*.5,s*.5,s*.72);
    gr.addColorStop(0,'rgba(255,255,255,.18)');
    gr.addColorStop(.45,'rgba(255,255,255,0)');
    gr.addColorStop(.8,'rgba(6,6,26,.34)');
    gr.addColorStop(1,'rgba(4,4,20,.82)');
    g.fillStyle=gr;g.beginPath();g.arc(s/2,s/2,s/2,0,7);g.fill();
    return c;
  }
  function makeCoreSkin(col){
    const s=256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
    const rnd=mulberry32(77);
    g.strokeStyle=col;g.lineCap='round';
    for(let i=0;i<7;i++){
      g.lineWidth=5+rnd()*7;g.globalAlpha=.35+rnd()*.3;
      const x0=40+rnd()*176,y0=40+rnd()*176;
      g.beginPath();g.moveTo(x0,y0);
      g.quadraticCurveTo(40+rnd()*176,40+rnd()*176,40+rnd()*176,40+rnd()*176);
      g.stroke();
    }
    g.globalAlpha=1;
    return c;
  }
  function buildStars(){
    const pal=themePal();
    const mk=(n,par,smin,smax)=>{
      const arr=[];
      for(let i=0;i<n;i++)arr.push({
        x:Math.random()*4200,y:Math.random()*4200,
        s:smin+Math.random()*(smax-smin),
        a:.35+Math.random()*.65,tw:Math.random()<.6,sp:.5+Math.random()*1.6,ph:Math.random()*6.28,
        c:Math.random()<.14?pal.b:(Math.random()<.12?'#ffffff':pal.star)
      });
      return arr;
    };
    stars=[{arr:mk(lowQ?60:130,.22,.6,1.2),par:.22},
           {arr:mk(lowQ?50:100,.45,.8,1.7),par:.45},
           {arr:mk(lowQ?26:52,1.05,1,2.2),par:1.05}];
    asteroids=[];
    for(let i=0;i<(lowQ?10:22);i++)asteroids.push({
      x:rr(Math.random,-1300,1300),y:rr(Math.random,-950,950),
      vx:rr(Math.random,-6,6),vy:rr(Math.random,-5,5),r:.8+Math.random()*1.8,a:.25+Math.random()*.35});
  }
  function buildNebulas(){
    const pal=themePal();
    nebulas=[];
    for(const gid in GALAXIES){
      const g=GALAXIES[gid];
      nebulas.push({gid,x:g.x-g.r*.7,y:g.y-g.r*.3,r:g.r*2.5,c:pal.a,dr:1});
      nebulas.push({gid,x:g.x+g.r*.8,y:g.y+g.r*.4,r:g.r*2.1,c:g.hue,dr:-1});
      nebulas.push({gid,x:g.x+g.r*.1,y:g.y-g.r*.8,r:g.r*1.7,c:pal.b,dr:1.4});
    }
    nebulas.push({gid:'-',x:RIFT.x,y:RIFT.y,r:330,c:'#5b21b6',dr:1});
    nebulas.push({gid:'-',x:0,y:0,r:430,c:auraCol(),dr:1});
  }
  function applyTheme(){
    glowCache={};texCache={};
    for(const p of PLANETS)texCache[p.id]=makeTex(p);
    shadeSprite=makeShade();
    coreSkin=makeCoreSkin(auraCol());
    buildStars();buildNebulas();
  }

  /* ---------- coords ---------- */
  function planetPos(p,t){
    const g=GALAXIES[p.g],a=(p.ang+t*p.drift*57.3)*Math.PI/180,R=g.r*p.or;
    return{x:g.x+Math.cos(a)*R*1.22,y:g.y+Math.sin(a)*R*.86};
  }
  const s2w=(sx,sy)=>({x:cam.x+(sx-W/2)/cam.z,y:cam.y+(sy-H/2)/cam.z});
  const w2s=(wx,wy)=>({x:(wx-cam.x)*cam.z+W/2,y:(wy-cam.y)*cam.z+H/2});

  /* ---------- camera ---------- */
  function tweenTo(x,y,z,dur,easeName,lock,cb){
    mode=lock?'cine':'tween';
    tween={x0:cam.x,y0:cam.y,z0:cam.z,x1:x,y1:y,z1:z,t0:performance.now(),dur:SAVE.set.motion?dur:260,ease:Ease[easeName||'ioC'],lock,cb};
    vel.x=vel.y=0;
  }
  function focusPoint(x,y,z,dur,lock,cb){tweenTo(x,y,clamp(z,ZMIN,ZMAX),dur||1200,'ioC',lock,cb);}
  function focusPlanet(p,z,dur,lock,cb){const pos=planetPos(p,time);focusPoint(pos.x,pos.y,z||1.9,dur,lock,cb);}

  /* ---------- input ---------- */
  const pointers=new Map();
  let downInfo=null,pinch0=null,moved=false;
  function pdown(e){
    if(mode==='cine'||warping>0)return; /* input locked during cinematics & warp */
    try{cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);}catch(err){}
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){
      downInfo={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};moved=false;
      if(mode==='tween'){tween=null;mode='free';}
      vel.x=vel.y=0;
    }else if(pointers.size===2){
      const pts=[...pointers.values()];
      pinch0={d:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),z:cam.z,
              mx:(pts[0].x+pts[1].x)/2,my:(pts[0].y+pts[1].y)/2};
      moved=true;
    }
  }
  function pmove(e){
    const prev=pointers.get(e.pointerId);
    if(prev)pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2&&pinch0){
      const pts=[...pointers.values()];
      const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const mx=(pts[0].x+pts[1].x)/2,my=(pts[0].y+pts[1].y)/2;
      const before=s2w(mx,my);
      cam.z=clamp(pinch0.z*d/Math.max(20,pinch0.d),ZMIN,ZMAX);
      const after=s2w(mx,my);
      cam.x+=before.x-after.x;cam.y+=before.y-after.y;
      clampCam();return;
    }
    if(pointers.size===1&&downInfo&&mode!=='cine'&&prev){
      const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
      if(Math.abs(e.clientX-downInfo.x)+Math.abs(e.clientY-downInfo.y)>9)moved=true;
      if(moved){
        follow=false; /* manual pan overrides ship-follow camera */
        cam.x-=dx/cam.z;cam.y-=dy/cam.z;
        vel.x=-dx/cam.z*60;vel.y=-dy/cam.z*60;
        clampCam();
      }
    }else if(e.pointerType==='mouse'&&pointers.size===0){
      const hit=pick(e.clientX,e.clientY);
      hoverId=hit?hit.type+hit.id:null;
      cv.style.cursor=hit?'pointer':'grab';
    }
  }
  /* a tapped-but-distant object becomes a WAYPOINT: a visual guide only
     (dashed course line + pulsing marker) — it never drives the ship. The
     player pilots there manually with the thruster controls; arriving
     within range triggers the same interaction a close-range tap would. */
  let waypoint=null;
  function pup(e){
    pointers.delete(e.pointerId);
    if(pointers.size<2)pinch0=null;
    if(downInfo&&e.pointerId===downInfo.id){
      const dt=performance.now()-downInfo.t;
      if(!moved&&dt<600){
        const hit=pick(e.clientX,e.clientY);
        if(hit){
          SFX.tap();buzz(8);pulse(hit);
          if(shipNear(hit.x,hit.y,Math.max(hit.r*1.6,110))){
            /* already in range — interact immediately, no flying needed */
            waypoint=null;
            onPickRef.fn&&onPickRef.fn(hit);
          }else{
            /* too far — mark it as a waypoint; the player flies there themselves */
            const lbl=hit.type==='planet'?(PLANET_BY_ID[hit.id]?PLANET_BY_ID[hit.id].short:null)
                     :hit.type==='core'?'THE CORE':hit.type==='rift'?'THE RIFT'
                     :hit.type==='anomaly'&&anomaly?anomaly.name:null;
            waypoint={x:hit.x,y:hit.y,hit,label:lbl,from:{x:ship.x,y:ship.y}};
            UI.toast&&UI.toast('🧭 Waypoint set'+(lbl?' — '+lbl:'')+'. Pilot there with your thrusters.');
          }
        }else if(mode==='free'){
          waypoint=null; /* tapping empty space clears any waypoint marker */
        }
      }
      downInfo=null;
    }
  }
  /* checked every frame: has manual flight brought the ship to its waypoint? */
  function waypointTick(){
    if(!waypoint)return;
    const hit=waypoint.hit;
    if(shipNear(hit.x,hit.y,Math.max(hit.r*1.6,110))){
      waypoint=null;
      onPickRef.fn&&onPickRef.fn(hit);
    }
  }
  function wheel(e){
    e.preventDefault();
    if(mode==='cine'||warping>0)return;
    const f=Math.exp(-e.deltaY*.0011);
    zoomAt(e.clientX,e.clientY,f);
  }
  function zoomAt(sx,sy,f){
    if(mode==='tween'){tween=null;mode='free';}
    const b=s2w(sx,sy);
    cam.z=clamp(cam.z*f,ZMIN,ZMAX);
    const a=s2w(sx,sy);
    cam.x+=b.x-a.x;cam.y+=b.y-a.y;clampCam();
  }
  function clampCam(){
    cam.x=clamp(cam.x,-1350,1350);cam.y=clamp(cam.y,-950,1000);
  }
  function pick(sx,sy){
    const w=s2w(sx,sy);let best=null,bd=1e9;
    const cands=[{type:'core',id:'core',x:0,y:0,r:78},{type:'rift',id:'rift',x:RIFT.x,y:RIFT.y,r:60}];
    if(anomaly)cands.push({type:'anomaly',id:'anomaly',x:anomaly.x,y:anomaly.y,r:60});
    for(const p of PLANETS){const pos=planetPos(p,time);cands.push({type:'planet',id:p.id,x:pos.x,y:pos.y,r:p.size});}
    for(const c of cands){
      const rad=Math.max(c.r*1.32,36/cam.z);
      const d=Math.hypot(w.x-c.x,w.y-c.y);
      if(d<rad&&d<bd){bd=d;best=c;}
    }
    return best;
  }
  const pulses={};
  function pulse(hit){pulses[hit.type+hit.id]=performance.now();}

  /* ---------- drawing ---------- */
  function drawBg(){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070a1c');g.addColorStop(.55,'#04060f');g.addColorStop(1,'#03040a');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  function drawStars(layer){
    for(const s of layer.arr){
      let sx=(s.x-cam.x*layer.par)%W;if(sx<0)sx+=W;
      let sy=(s.y-cam.y*layer.par)%H;if(sy<0)sy+=H;
      let a=s.a;
      if(s.tw&&!lowQ)a*= .55+.45*Math.sin(time*s.sp+s.ph);
      ctx.globalAlpha=a;ctx.fillStyle=s.c;
      ctx.fillRect(sx,sy,s.s,s.s);
    }
    ctx.globalAlpha=1;
  }
  /* stars streak past when the ship travels fast (screen-space) */
  function drawSpeedLines(){
    const sp=Math.hypot(ship.vx,ship.vy);
    if(sp<240||lowQ)return;
    const k=clamp((sp-240)/300,0,1)*(ship.boost?1.3:1);
    const ang=Math.atan2(ship.vy,ship.vx);
    ctx.save();ctx.globalCompositeOperation='lighter';
    const n=Math.floor(10+k*18);
    for(let i=0;i<n;i++){
      const seed=i*97.3;
      const x=((seed*13.7+time*sp*.9)%(W+120))-60;
      const y=(seed*29.1)%H;
      const L=18+k*46;
      ctx.globalAlpha=.10+k*.18;
      ctx.strokeStyle='#cfe4ff';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*L,y-Math.sin(ang)*L);ctx.stroke();
    }
    ctx.restore();ctx.globalAlpha=1;
  }
  function drawNebulas(){
    ctx.globalCompositeOperation='lighter';
    for(const n of nebulas){
      const wob=Math.sin(time*.14*n.dr+n.x)*30;
      ctx.globalAlpha=.11;
      ctx.drawImage(glow(n.c),n.x-n.r+wob,n.y-n.r-wob*.4,n.r*2,n.r*2);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  function drawOrbits(){
    const pal=themePal();
    for(const gid in GALAXIES){
      const g=GALAXIES[gid],on=SAVE.unlocked.galaxies.includes(gid);
      ctx.strokeStyle=on?pal.a:pal.star;ctx.globalAlpha=on?.13:.045;
      ctx.lineWidth=1.2/cam.z;
      ctx.beginPath();ctx.ellipse(g.x,g.y,g.r*1.22,g.r*.86,-.16,0,7);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  function drawRing(x,y,r,rot,front,col,alpha){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,.4);
    ctx.strokeStyle=col;ctx.globalAlpha=alpha;ctx.lineWidth=r*.17;
    ctx.beginPath();ctx.arc(0,0,r*1.75,front?0:Math.PI,front?Math.PI:2*Math.PI);ctx.stroke();
    ctx.lineWidth=r*.06;ctx.globalAlpha=alpha*.6;
    ctx.beginPath();ctx.arc(0,0,r*2.15,front?0:Math.PI,front?Math.PI:2*Math.PI);ctx.stroke();
    ctx.restore();ctx.globalAlpha=1;
  }
  function drawPlanet(p,t){
    const pos=planetPos(p,t);
    if(pos.x<cam.x-W/cam.z||pos.x>cam.x+W/cam.z||pos.y<cam.y-H/cam.z||pos.y>cam.y+H/cam.z)return;
    const r=p.size*(1+Math.sin(t*.8+pos.x)*.012);
    const locked=!SAVE.unlocked.planets.includes(p.id);
    const hov=hoverId==='planet'+p.id?1.07:1;
    const key='planet'+p.id;
    let bump=1;
    if(pulses[key]){const e=(performance.now()-pulses[key])/380;if(e<1)bump=1+Math.sin(e*Math.PI)*.13;else delete pulses[key];}
    const rr_=r*hov*bump;
    /* glow */
    ctx.globalAlpha=locked?.16:(.6+(hoverId==='planet'+p.id?.25:0)+(p._glow||0)*.8);
    ctx.globalCompositeOperation='lighter';
    const gs=rr_*5.4+(p._glow||0)*rr_*2;
    ctx.drawImage(glow(p.glow),pos.x-gs/2,pos.y-gs/2,gs,gs);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    /* rings back */
    if(p.rings)drawRing(pos.x,pos.y,rr_,.5,false,p.c1,locked?.25:.7);
    /* moons behind */
    const moons=[];
    for(let i=0;i<p.moons;i++){
      const a=t*(.42+i*.21)+i*2.2,mr=rr_*1.95+i*15;
      const mx=pos.x+Math.cos(a)*mr,my=pos.y+Math.sin(a)*mr*.4;
      moons.push({mx,my,front:Math.sin(a)>=0,sz:4.6-i*1.1});
    }
    for(const m of moons)if(!m.front)drawMoon(m);
    /* body */
    ctx.save();
    ctx.beginPath();ctx.arc(pos.x,pos.y,rr_,0,7);ctx.clip();
    const per=rr_*2;
    const off=((t*p.rot*rr_*.22)%per+per)%per;
    const tex=texCache[p.id];
    ctx.drawImage(tex,pos.x-rr_-off,pos.y-rr_,per,rr_*2);
    ctx.drawImage(tex,pos.x-rr_-off+per,pos.y-rr_,per,rr_*2);
    ctx.drawImage(shadeSprite,pos.x-rr_,pos.y-rr_,rr_*2,rr_*2);
    if(locked){ctx.fillStyle='rgba(5,7,18,.66)';ctx.fillRect(pos.x-rr_,pos.y-rr_,rr_*2,rr_*2);}
    if(p._glow){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,p._glow);
      ctx.drawImage(glow('#ffffff'),pos.x-rr_,pos.y-rr_,rr_*2,rr_*2);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
    ctx.restore();
    /* rings front */
    if(p.rings)drawRing(pos.x,pos.y,rr_,.5,true,p.c1,locked?.3:.85);
    /* moons front */
    for(const m of moons)if(m.front)drawMoon(m);
  }
  function drawMoon(m){
    ctx.fillStyle='#c9d2f2';ctx.globalAlpha=.9;
    ctx.beginPath();ctx.arc(m.mx,m.my,m.sz,0,7);ctx.fill();
    ctx.globalAlpha=.35;ctx.fillStyle='#0a0d22';
    ctx.beginPath();ctx.arc(m.mx+m.sz*.3,m.my+m.sz*.34,m.sz,0,7);ctx.fill();
    ctx.globalAlpha=1;
  }
  function drawCore(t){
    const col=auraCol();
    const pulse=1+Math.sin(t*1.5)*.03;
    const R=70*pulse;
    ctx.globalCompositeOperation='lighter';
    let a=.75+Math.sin(t*1.2)*.08;
    ctx.globalAlpha=a;
    const gs=R*6.4;ctx.drawImage(glow(col),-gs/2,-gs/2,gs,gs);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    /* body */
    const g=ctx.createRadialGradient(-R*.25,-R*.3,R*.1,0,0,R);
    g.addColorStop(0,'#ffffff');g.addColorStop(.45,col);g.addColorStop(1,'rgba(20,10,50,.9)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
    /* brain squiggles */
    ctx.save();ctx.beginPath();ctx.arc(0,0,R*.94,0,7);ctx.clip();
    ctx.translate(0,0);ctx.rotate(Math.sin(t*.1)*.06);
    ctx.globalAlpha=.5;ctx.drawImage(coreSkin,-R,-R,R*2,R*2);
    ctx.restore();ctx.globalAlpha=1;
    /* dashed synapse ring */
    ctx.save();ctx.rotate(t*.14);
    ctx.setLineDash([6/cam.z,10/cam.z]);ctx.strokeStyle=col;ctx.globalAlpha=.5;ctx.lineWidth=1.6/cam.z;
    ctx.beginPath();ctx.arc(0,0,R*1.22,0,7);ctx.stroke();ctx.restore();
    ctx.setLineDash([]);
    /* sparks */
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<10;i++){
      const a2=t*(.5+(i%3)*.14)+i*2.52;
      const sx=Math.cos(a2)*R*(1.45+(i%4)*.16),sy=Math.sin(a2)*R*(1.05+(i%3)*.2);
      ctx.globalAlpha=.5+.4*Math.sin(t*2+i);
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(sx,sy,1.8/cam.z+1,0,7);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  function drawRift(t){
    const x=RIFT.x,y=RIFT.y;
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5;
    ctx.drawImage(glow('#7c3aed'),x-190,y-190,380,380);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.fillStyle='#05030d';ctx.beginPath();ctx.arc(x,y,30,0,7);ctx.fill();
    ctx.strokeStyle='#a78bfa';ctx.lineWidth=2/cam.z;
    for(let i=0;i<3;i++){
      ctx.save();ctx.translate(x,y);ctx.scale(1,.6);ctx.rotate(t*(.5+i*.22)*(i%2?-1:1)+i);
      ctx.setLineDash([10,8]);ctx.globalAlpha=.75-i*.18;
      ctx.beginPath();ctx.arc(0,0,40+i*17,0,7);ctx.stroke();ctx.restore();
    }
    ctx.setLineDash([]);ctx.globalAlpha=1;
    /* occasional spiral sparkle */
    const a=t*1.7;
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.6+.4*Math.sin(t*3);
    ctx.fillStyle='#e9d5ff';
    ctx.beginPath();ctx.arc(x+Math.cos(a)*46,y+Math.sin(a)*28,2,0,7);ctx.fill();
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  function drawAsteroids(dt){
    for(const a of asteroids){
      a.x+=a.vx*dt;a.y+=a.vy*dt;
      if(a.x<-1350)a.x=1350;if(a.x>1350)a.x=-1350;
      if(a.y<-950)a.y=950;if(a.y>950)a.y=-950;
      ctx.globalAlpha=a.a;ctx.fillStyle='#8d97c4';
      ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  /* ---------- fx ---------- */
  let fx=[];
  function burst(x,y,col,n){
    for(let i=0;i<(n||18);i++){
      const a=Math.random()*6.28,sp=40+Math.random()*160;
      fx.push({k:'p',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,dk:1.2+Math.random(),c:col,s:1.5+Math.random()*2.5});
    }
  }
  function ringWave(x,y,col){fx.push({k:'r',x,y,r:10,life:1,c:col});}
  function beams(tx,ty,col,n){
    for(let i=0;i<(n||26);i++){
      const a=(i/(n||26))*6.28+Math.random()*.3;
      const d=380+Math.random()*300;
      fx.push({k:'b',x:tx+Math.cos(a)*d,y:ty+Math.sin(a)*d,tx,ty,delay:Math.random()*.5,t:0,c:col,s:1.6+Math.random()*2});
    }
  }
  function drawFx(dt){
    ctx.globalCompositeOperation='lighter';
    fx=fx.filter(f=>{
      if(f.k==='p'){
        f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.985;f.vy*=.985;f.life-=f.dk*dt;
        if(f.life<=0)return false;
        ctx.globalAlpha=Math.max(0,f.life)*.9;ctx.fillStyle=f.c;
        ctx.beginPath();ctx.arc(f.x,f.y,f.s,0,7);ctx.fill();return true;
      }
      if(f.k==='r'){
        f.r+=260*dt;f.life-=1.4*dt;
        if(f.life<=0)return false;
        ctx.globalAlpha=f.life*.7;ctx.strokeStyle=f.c;ctx.lineWidth=2.4;
        ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.stroke();return true;
      }
      if(f.k==='b'){
        f.delay-=dt;if(f.delay>0)return true;
        f.t+=dt*1.4;if(f.t>=1)return false;
        const e=Ease.oC(f.t);
        const x=lerp(f.x,f.tx,e),y=lerp(f.y,f.ty,e);
        ctx.globalAlpha=Math.sin(f.t*Math.PI);ctx.fillStyle=f.c;
        ctx.beginPath();ctx.arc(x,y,f.s,0,7);ctx.fill();return true;
      }
      return false;
    });
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  /* ---------- labels (screen space) ---------- */
  function drawLabels(){
    ctx.textAlign='center';
    const labelAlpha=clamp((cam.z-.5)*2.4,.35,1);
    ctx.font='700 10px system-ui,sans-serif';
    for(const p of PLANETS){
      const pos=planetPos(p,time),s=w2s(pos.x,pos.y);
      if(s.x<-60||s.x>W+60||s.y<-40||s.y>H+40)continue;
      const locked=!SAVE.unlocked.planets.includes(p.id);
      const y=s.y+p.size*cam.z+16;
      ctx.globalAlpha=labelAlpha;
      if(locked){
        const txt='🔒 LV '+p.lv;
        ctx.font='700 10px system-ui,sans-serif';
        const w=ctx.measureText(txt).width+14;
        ctx.fillStyle='rgba(10,13,30,.75)';
        ctx.beginPath();ctx.roundRect?ctx.roundRect(s.x-w/2,y-11,w,18,9):ctx.rect(s.x-w/2,y-11,w,18);ctx.fill();
        ctx.strokeStyle='rgba(150,170,255,.3)';ctx.stroke();
        ctx.fillStyle='#ffd166';ctx.fillText(txt,s.x,y+2);
      }else{
        ctx.fillStyle='#c9d3ff';ctx.fillText(p.short,s.x,y+2);
      }
    }
    const c=w2s(0,0);
    if(c.x>-80&&c.x<W+80&&c.y>-40&&c.y<H+80){
      ctx.globalAlpha=labelAlpha;ctx.fillStyle=auraCol();
      ctx.font='800 11px system-ui,sans-serif';
      ctx.fillText('✦ THE CORE — DAILY',c.x,c.y+70*cam.z+22);
    }
    const rf=w2s(RIFT.x,RIFT.y);
    if(rf.x>-80&&rf.x<W+80&&rf.y>-40&&rf.y<H+80){
      ctx.globalAlpha=labelAlpha;ctx.fillStyle='#c4b5fd';
      ctx.font='800 11px system-ui,sans-serif';
      ctx.fillText('🌀 ENDLESS RIFT',rf.x,rf.y+66);
    }
    if(anomaly){
      const an=w2s(anomaly.x,anomaly.y);
      if(an.x>-100&&an.x<W+100&&an.y>-60&&an.y<H+60){
        ctx.globalAlpha=Math.max(labelAlpha,.7);ctx.fillStyle=anomaly.hue;
        ctx.font='800 11px system-ui,sans-serif';
        ctx.fillText(anomaly.icon+' '+anomaly.name,an.x,an.y+52);
      }else{
        /* off-screen pointer toward the anomaly */
        const dx=an.x-W/2,dy=an.y-H/2,len=Math.hypot(dx,dy)||1;
        const ex=W/2+dx/len*(Math.min(W,H)*.42),ey=H/2+dy/len*(Math.min(W,H)*.42);
        ctx.save();ctx.translate(ex,ey);ctx.rotate(Math.atan2(dy,dx));
        ctx.globalAlpha=.55+.35*Math.sin(time*3);
        ctx.fillStyle=anomaly.hue;
        ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-6);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();
        ctx.restore();ctx.globalAlpha=1;
      }
    }
    ctx.globalAlpha=.09;
    for(const gid in GALAXIES){
      const g=GALAXIES[gid],s=w2s(g.x,g.y);
      if(s.x<-200||s.x>W+200||s.y<-100||s.y>H+100)continue;
      ctx.font='800 15px system-ui,sans-serif';
      ctx.fillStyle=themePal().star;
      ctx.fillText(g.name,s.x,s.y-g.r*.92);
    }
    ctx.globalAlpha=1;ctx.textAlign='start';
  }

  /* ---------- main loop ---------- */
  function frame(now){
    if(!running)return;
    raf0=requestAnimationFrame(frame);
    let dt=Math.min(.05,(now-lastT)/1000||.016);lastT=now;time+=dt;
    dtAvg=dtAvg*.95+dt*1000*.05;
    if(dtAvg>27&&lowQ===false){lowQ=true;buildStars();}
    /* camera update */
    if(tween){
      const p=clamp((performance.now()-tween.t0)/tween.dur,0,1),e=tween.ease(p);
      cam.x=lerp(tween.x0,tween.x1,e);cam.y=lerp(tween.y0,tween.y1,e);cam.z=lerp(tween.z0,tween.z1,e);
      if(p>=1){const cb=tween.cb,lk=tween.lock;tween=null;mode=lk?'cine':'free';cb&&cb();}
    }else if(mode==='free'){
      cam.x+=vel.x*dt;cam.y+=vel.y*dt;
      const damp=Math.exp(-dt*3.2);vel.x*=damp;vel.y*=damp;
      if(Math.abs(vel.x)<1)vel.x=0;if(Math.abs(vel.y)<1)vel.y=0;
      clampCam();
    }
    /* draw */
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawBg();
    ctx.save();
    /* parallax star layers behind world */
    drawStars(stars[0]);drawStars(stars[1]);
    ctx.translate(W/2,H/2);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
    drawNebulas();
    drawOrbits();
    drawAsteroids(lowQ?dt*.5:dt);
    for(const p of PLANETS)drawPlanet(p,time);
    drawCore(time);
    drawRift(time);
    drawAnomaly(time);
    drawPickups();
    drawComets(dt);
    updateShip(dt);
    pickupTick();
    waypointTick();
    drawShip(time);
    drawFx(dt);
    ctx.restore();
    drawStars(stars[2]);
    drawSpeedLines();
    drawLabels();
    drawWarp(dt);
    syncCtrlVisibility();
  }

  /* ---------- lifecycle ---------- */
  function resize(){
    dpr=Math.min(2,window.devicePixelRatio||1);
    W=window.innerWidth;H=window.innerHeight;
    cv.width=Math.floor(W*dpr);cv.height=Math.floor(H*dpr);
    cv.style.width=W+'px';cv.style.height=H+'px';
  }
  function start(){
    if(running)return;running=true;lastT=performance.now();
    raf0=requestAnimationFrame(frame);
  }
  function stop(){
    running=false;cancelAnimationFrame(raf0);
    /* the frame loop (and its per-frame control-visibility check) is about
       to go silent — e.g. a mini-game session is starting — so force the
       on-screen thruster controls hidden right now instead of leaving
       whatever was true one paused frame ago */
    ctrlsVisible=false;
    const el=$('#shipControls');if(el)el.classList.add('hidden');
    for(const k in ctrl)ctrl[k]=false;
  }
  function init(){
    ctx=cv.getContext('2d');
    resize();applyTheme();start();
    cv.addEventListener('pointerdown',pdown);
    window.addEventListener('pointermove',pmove);
    window.addEventListener('pointerup',pup);
    window.addEventListener('pointercancel',pup);
    cv.addEventListener('wheel',wheel,{passive:false});
    window.addEventListener('resize',resize);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){stop();SFX.suspend();for(const k in ctrl)ctrl[k]=false;}
      else if(!Engine.active){start();SFX.resumeCtx();}
    });
    /* ---------- desktop keyboard piloting ----------
       Arrows or WASD fly the ship (same control set as the on-screen
       buttons); Shift boosts; X/Space is the STOP button. +/- still zoom,
       Escape still backs out of a focused view — those are single-shot
       actions on keydown, piloting keys are held state via keydown/keyup. */
    const PILOT_KEYS={ArrowLeft:'left',a:'left',A:'left',
      ArrowRight:'right',d:'right',D:'right',
      ArrowUp:'fwd',w:'fwd',W:'fwd',
      ArrowDown:'rev',s:'rev',S:'rev',
      Shift:'boost',
      x:'brake',X:'brake',' ':'brake'};
    function typingTarget(){
      const a=document.activeElement;
      return !!(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable));
    }
    window.addEventListener('keydown',e=>{
      const action=PILOT_KEYS[e.key];
      if(action){
        if(!typingTarget()&&mode==='free'&&!Engine.active&&warping<=0){setCtrl(action,true);e.preventDefault();}
        return;
      }
      if(Engine.active)return;
      if(e.key==='+'||e.key==='=')zoomAt(W/2,H/2,1.15);
      if(e.key==='-')zoomAt(W/2,H/2,.87);
      if(e.key==='Escape'){mode='free';tween=null;onBackRef.fn&&onBackRef.fn();}
    });
    window.addEventListener('keyup',e=>{
      const action=PILOT_KEYS[e.key];
      if(action)setCtrl(action,false);
    });
    window.addEventListener('blur',()=>{for(const k in ctrl)ctrl[k]=false;});
    /* ---------- on-screen thruster buttons (mobile-first, works with mouse too) ---------- */
    function bindPilotBtn(id,key){
      const b=$(id);if(!b)return;
      const press=e=>{
        e.preventDefault();e.stopPropagation();
        try{b.setPointerCapture(e.pointerId);}catch(err){}
        b.classList.add('on');setCtrl(key,true);
      };
      const release=()=>{b.classList.remove('on');setCtrl(key,false);};
      b.addEventListener('pointerdown',press);
      b.addEventListener('pointerup',release);
      b.addEventListener('pointercancel',release);
      b.addEventListener('contextmenu',e=>e.preventDefault());
    }
    bindPilotBtn('#ctrlLeft','left');bindPilotBtn('#ctrlRight','right');
    bindPilotBtn('#ctrlFwd','fwd');bindPilotBtn('#ctrlRev','rev');
    bindPilotBtn('#ctrlBoost','boost');bindPilotBtn('#ctrlStop','brake');
    cv.style.cursor='grab';
  }
  /* shows/hides the on-screen controls exactly when they're usable —
     checked once per frame, only touches the DOM when the state changes */
  let ctrlsVisible=null;
  function syncCtrlVisibility(){
    const should=mode==='free'&&!Engine.active&&warping<=0&&(typeof UI==='undefined'||!UI.sheetsOpen());
    if(should!==ctrlsVisible){
      ctrlsVisible=should;
      const el=$('#shipControls');
      if(el)el.classList.toggle('hidden',!should);
    }
  }
  function enterFree(x,y,z){
    mode='free';tween=null;
    if(x!=null){cam.x=x;cam.y=y;cam.z=z||.8;}
    clampCam();
  }
  function homeView(cb){focusPoint(0,-30,.78,1300,false,cb);}

  return{
    init,applyTheme,start,stop,pause:stop,resume:start,enterFree,homeView,focusPlanet,focusPoint,
    planetPos,burst,ringWave,beams,
    flyTo,shipNear,spawnAnomaly,clearAnomaly,
    spawnComet,spawnPickup,warpFX,
    setCtrl,
    get ctrl(){return ctrl;},
    get ship(){return ship;},
    get anomaly(){return anomaly;},
    get pickups(){return pickups;},
    set onPick(f){onPickRef.fn=f;},
    set onBack(f){onBackRef.fn=f;},
    __dbg(){return{mode,pointers:pointers.size,down:!!downInfo,z:cam.z};},
    __pick(sx,sy){const h=pick(sx,sy);return h?h.type+':'+h.id:null;},
    __hasOnPick(){return !!onPickRef.fn;},
    get cam(){return cam;},
    get time(){return time;},
    get running(){return running;},
    get pausedForGame(){return !running&&!document.hidden;}
  };
})();

