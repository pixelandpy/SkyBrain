/* =====================================================================
   SkyBrain smoke tests — dom-shim.js
   A deliberately small, zero-dependency stand-in for a browser: just
   enough DOM (parsed from the REAL index.html so ids/classes/structure
   can never drift from the shipped markup), Canvas 2D and Web Audio to
   let the actual game files run under plain Node with `node tests/smoke.js`.
   No npm install, no jsdom, no browser — see tests/README.md.
   ===================================================================== */
'use strict';

/* ---------- generic "auto stub" ----------
   Used for Canvas 2D contexts and Web Audio nodes, where the smoke tests
   only care that calls don't throw, never about what gets drawn/played.
   Any property access or call returns another stub; plain property
   assignment (e.g. `gain.value = .5`) behaves like a normal object. */
function makeAutoStub(label){
  const target=function autoStub(){return makeAutoStub(label+'()');};
  target.__label=label;
  return new Proxy(target,{
    get(t,prop){
      if(prop==='then'||prop===Symbol.toPrimitive||prop===Symbol.iterator)return undefined;
      if(prop==='toString')return()=>'[AutoStub '+label+']';
      if(!(prop in t))t[prop]=makeAutoStub(label+'.'+String(prop));
      return t[prop];
    },
    set(t,prop,v){t[prop]=v;return true;},
    has(){return true;}
  });
}

/* ---------- tiny HTML → DOM parser ----------
   Handles exactly what index.html actually uses: tags, attributes (quoted/
   unquoted/boolean), self-closing tags, void elements, comments, doctype,
   and the handful of entities the file contains. Not a spec parser — a
   pragmatic one, validated against the real file (see tests/smoke.js). */
const VOID_TAGS=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const RAW_TEXT_TAGS=new Set(['script','style']);
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
function decodeEntities(s){
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,(m,body)=>{
    if(body[0]==='#'){
      const code=body[1]==='x'||body[1]==='X'?parseInt(body.slice(2),16):parseInt(body.slice(1),10);
      return Number.isFinite(code)?String.fromCodePoint(code):m;
    }
    return ENTITIES[body]!=null?ENTITIES[body]:m;
  });
}
const TAG_RE=/<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][a-zA-Z0-9:-]*)\s*>|<([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'=<>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)\s*>|([^<]+)/gi;
const ATTR_RE=/([^\s"'=<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
function parseAttrs(str){
  const out={};
  if(!str)return out;
  let m;ATTR_RE.lastIndex=0;
  while((m=ATTR_RE.exec(str))){
    const name=m[1].toLowerCase();
    const val=m[2]!=null?m[2]:m[3]!=null?m[3]:m[4]!=null?m[4]:'';
    out[name]=decodeEntities(val);
  }
  return out;
}
/* Parses an HTML fragment into an array of nodes (Element | string), and
   wires parentNode via `attachTo` if provided. `createElement` is injected
   so the parser can build real shim Elements without a circular import. */
function parseHTML(html,createElement){
  const root=createElement('#fragment');
  const stack=[root];
  let m;TAG_RE.lastIndex=0;
  while((m=TAG_RE.exec(html))){
    const[whole,closeTag,openTag,attrStr,selfClose,text]=m;
    const top=()=>stack[stack.length-1];
    if(closeTag){
      const lc=closeTag.toLowerCase();
      for(let i=stack.length-1;i>0;i--){
        if(stack[i].tagName.toLowerCase()===lc){stack.length=i;break;}
      }
      continue;
    }
    if(openTag){
      const tag=openTag.toLowerCase();
      const node=createElement(tag);
      const attrs=parseAttrs(attrStr);
      for(const k in attrs)node.setAttribute(k,attrs[k]);
      top()._appendParsed(node);
      if(RAW_TEXT_TAGS.has(tag)){
        const closeRe=new RegExp('<\\/'+tag+'\\s*>','i');
        const rest=html.slice(TAG_RE.lastIndex);
        const idx=rest.search(closeRe);
        const raw=idx===-1?rest:rest.slice(0,idx);
        if(raw)node._appendParsed(raw);
        TAG_RE.lastIndex+=(idx===-1?rest.length:idx+rest.match(closeRe)[0].length);
        continue;
      }
      if(!selfClose&&!VOID_TAGS.has(tag))stack.push(node);
      continue;
    }
    if(text!=null&&text.trim().length){
      top()._appendParsed(decodeEntities(text));
    }
  }
  return root.childNodes;
}

class ClassList{
  constructor(el){this._el=el;this._set=new Set();}
  add(...c){c.forEach(x=>x&&this._set.add(x));}
  remove(...c){c.forEach(x=>this._set.delete(x));}
  toggle(c,force){
    const has=this._set.has(c);
    const want=force===undefined?!has:!!force;
    if(want)this._set.add(c);else this._set.delete(c);
    return want;
  }
  contains(c){return this._set.has(c);}
  get length(){return this._set.size;}
  toString(){return[...this._set].join(' ');}
  forEach(fn){this._set.forEach(fn);}
}

class EventTarget{
  constructor(){this._listeners=new Map();}
  addEventListener(type,fn){
    if(typeof fn!=='function')return;
    if(!this._listeners.has(type))this._listeners.set(type,new Set());
    this._listeners.get(type).add(fn);
  }
  removeEventListener(type,fn){
    const s=this._listeners.get(type);if(s)s.delete(fn);
  }
  dispatchEvent(evt){
    evt.target=evt.target||this;
    const s=this._listeners.get(evt.type);
    if(s)[...s].forEach(fn=>{try{fn.call(this,evt);}catch(e){throw e;}});
    const onProp=this['on'+evt.type];
    if(typeof onProp==='function')onProp.call(this,evt);
    return!evt.defaultPrevented;
  }
}

class ShimEvent{
  constructor(type,opts){
    this.type=type;this.defaultPrevented=false;this.propagationStopped=false;
    Object.assign(this,opts||{});
  }
  preventDefault(){this.defaultPrevented=true;}
  stopPropagation(){this.propagationStopped=true;}
  stopImmediatePropagation(){this.propagationStopped=true;}
}

class Element extends EventTarget{
  constructor(tagName,doc){
    super();
    this.tagName=(tagName||'div').toUpperCase();
    this.ownerDocument=doc||null;
    this._attrs={};
    this.classList=new ClassList(this);
    this.style={};
    this.childNodes=[];
    this.parentNode=null;
    this.value='';this.checked=false;this.disabled=false;
    this._innerHTML='';
  }
  _appendParsed(node){
    if(typeof node==='string'){this.childNodes.push(node);return;}
    node.parentNode=this;this.childNodes.push(node);
  }
  get children(){return this.childNodes.filter(n=>n instanceof Element);}
  get firstChild(){return this.childNodes[0];}
  get id(){return this._attrs.id||'';}
  set id(v){this._attrs.id=v;}
  get className(){return this.classList.toString();}
  set className(v){this.classList=new ClassList(this);(v||'').split(/\s+/).filter(Boolean).forEach(c=>this.classList.add(c));}
  setAttribute(name,val){
    name=name.toLowerCase();
    if(name==='class'){this.className=val;return;}
    if(name==='id'){this._attrs.id=val;return;}
    this._attrs[name]=val;
    if(name.indexOf('data-')===0)this.dataset[camel(name.slice(5))]=val;
  }
  getAttribute(name){name=name.toLowerCase();return name==='class'?this.className:name==='id'?this.id:(this._attrs[name]!=null?this._attrs[name]:null);}
  hasAttribute(name){name=name.toLowerCase();return name==='id'?!!this._attrs.id:name in this._attrs;}
  removeAttribute(name){delete this._attrs[name.toLowerCase()];}
  get dataset(){if(!this._dataset)this._dataset={};return this._dataset;}
  appendChild(node){
    if(node.parentNode)node.parentNode.removeChild(node);
    node.parentNode=this;this.childNodes.push(node);return node;
  }
  removeChild(node){
    const i=this.childNodes.indexOf(node);
    if(i>=0)this.childNodes.splice(i,1);
    node.parentNode=null;return node;
  }
  remove(){if(this.parentNode)this.parentNode.removeChild(this);}
  set innerHTML(html){
    this.childNodes=[];
    this._innerHTML=String(html);
    const createEl=(tag)=>new Element(tag,this.ownerDocument);
    parseHTML(this._innerHTML,createEl).forEach(n=>this._appendParsed(n));
  }
  get innerHTML(){return this._innerHTML;}
  set textContent(t){this.childNodes=[String(t)];}
  get textContent(){
    return this.childNodes.map(n=>typeof n==='string'?n:n.textContent).join('');
  }
  querySelector(sel){const r=queryAll(this,sel);return r[0]||null;}
  querySelectorAll(sel){return queryAll(this,sel);}
  getContext(type){
    if(!this._ctx)this._ctx={};
    if(!this._ctx[type])this._ctx[type]=makeAutoStub('ctx2d');
    return this._ctx[type];
  }
  setPointerCapture(){}
  releasePointerCapture(){}
  select(){}
  click(){this.dispatchEvent(new ShimEvent('click',{target:this}));}
}
function camel(s){return s.replace(/-([a-z])/g,(m,c)=>c.toUpperCase());}

function matchesSimple(el,tok){
  if(!(el instanceof Element))return false;
  if(tok==='*')return true;
  if(tok[0]==='#')return el.id===tok.slice(1);
  if(tok[0]==='.')return el.classList.contains(tok.slice(1));
  if(tok[0]==='['){
    const m=/^\[([a-zA-Z0-9_-]+)\]$/.exec(tok);
    return m?el.hasAttribute(m[1]):false;
  }
  return el.tagName.toLowerCase()===tok.toLowerCase();
}
function collect(root,pred,out){
  for(const c of root.childNodes){
    if(!(c instanceof Element))continue;
    if(pred(c))out.push(c);
    collect(c,pred,out);
  }
}
function queryAll(root,selector){
  const tokens=selector.trim().split(/\s+/).filter(Boolean);
  let scopes=[root];
  for(const tok of tokens){
    const found=[];
    for(const s of scopes)collect(s,el=>matchesSimple(el,tok),found);
    scopes=found;
    if(!scopes.length)break;
  }
  return scopes;
}

/* ---------- document / window ---------- */
function createDocument(bodyHTML){
  const doc=new EventTarget();
  doc.hidden=false;
  doc.createElement=(tag)=>new Element(tag,doc);
  doc.createElementNS=(ns,tag)=>new Element(tag,doc);
  doc.body=new Element('body',doc);
  doc.body.setAttribute('id','__body__'); /* harmless marker, never queried */
  doc.documentElement=new Element('html',doc);
  doc.documentElement.appendChild(doc.body);
  parseHTML(bodyHTML,(tag)=>new Element(tag,doc)).forEach(n=>doc.body._appendParsed(n));
  doc._activeElement=doc.body;
  Object.defineProperty(doc,'activeElement',{get(){return doc._activeElement;}});
  doc.getElementById=(id)=>{const f=[];collect(doc.body,el=>el.id===id,f);return f[0]||null;};
  doc.querySelector=(sel)=>queryAll(doc.body,sel)[0]||null;
  doc.querySelectorAll=(sel)=>queryAll(doc.body,sel);
  doc.execCommand=()=>true;
  return doc;
}

class FakeAudioContext{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination=makeAutoStub('destination');}
  createGain(){return makeAutoStub('gain');}
  createOscillator(){return makeAutoStub('osc');}
  createBufferSource(){return makeAutoStub('bufSrc');}
  createBiquadFilter(){return makeAutoStub('biquad');}
  createBuffer(){return makeAutoStub('buffer');}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
}

function createEnvironment(bodyHTML){
  const document=createDocument(bodyHTML);
  const store=new Map();
  const localStorage={
    getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>{store.set(k,String(v));},
    removeItem:k=>{store.delete(k);},
    clear:()=>store.clear()
  };
  const listenersHost=new EventTarget();
  const rafCbs=new Map();let rafId=1;
  const window={
    document,localStorage,
    innerWidth:390,innerHeight:844,devicePixelRatio:2,
    AudioContext:FakeAudioContext,webkitAudioContext:FakeAudioContext,
    navigator:{
      onLine:true,
      vibrate(){return true;},
      clipboard:{writeText:async()=>{}},
      serviceWorker:{register:()=>Promise.resolve({scope:'/'})}
    },
    location:{protocol:'https:',href:'https://example.test/skybrain/',reload(){}},
    matchMedia(){return{matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}};},
    requestAnimationFrame(cb){const id=rafId++;rafCbs.set(id,setTimeout(()=>{rafCbs.delete(id);cb(Date.now());},16));return id;},
    cancelAnimationFrame(id){const t=rafCbs.get(id);if(t){clearTimeout(t);rafCbs.delete(id);}},
    addEventListener:listenersHost.addEventListener.bind(listenersHost),
    removeEventListener:listenersHost.removeEventListener.bind(listenersHost),
    dispatchEvent:listenersHost.dispatchEvent.bind(listenersHost),
    setTimeout,clearTimeout,setInterval,clearInterval,
    console,
    btoa:s=>Buffer.from(String(s),'binary').toString('base64'),
    atob:s=>Buffer.from(String(s),'base64').toString('binary'),
    performance:typeof performance!=='undefined'?performance:{now:()=>Date.now()},
    Event:ShimEvent
  };
  window.window=window;window.self=window;window.globalThis=window;
  document.defaultView=window;
  return{window,document,Element,ShimEvent,makeAutoStub};
}

module.exports={createEnvironment,parseHTML,Element,ShimEvent,makeAutoStub};
