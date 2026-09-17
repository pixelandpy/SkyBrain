/* =====================================================================
   SkyBrain — blog/blog.js · BLOG RENDERER
   Renders ARTICLES (js/blog/articles.js) into blog.html.
   Simple hash routing: #article-id opens an article, no hash = index.
   Completely independent from the game runtime.
   ===================================================================== */
(function(){
  'use strict';
  const list=document.getElementById('bList');
  const art=document.getElementById('bArticle');
  const cats=document.getElementById('bCats');
  let activeCat='ALL';

  function fmtDate(s){
    const[y,m,d]=s.split('-').map(Number);
    return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
  }
  function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  /* tiny markdown-ish renderer: ## headers, - lists, paragraphs */
  function renderBody(body){
    const blocks=body.split(/\n\s*\n/);
    return blocks.map(b=>{
      const lines=b.split('\n');
      if(lines.every(l=>l.trim().startsWith('- '))){
        return '<ul>'+lines.map(l=>'<li>'+esc(l.trim().slice(2))+'</li>').join('')+'</ul>';
      }
      return lines.map(l=>{
        l=l.trim();
        if(l.startsWith('## '))return '<h2>'+esc(l.slice(3))+'</h2>';
        if(l.startsWith('- '))return '<ul><li>'+esc(l.slice(2))+'</li></ul>';
        return '<p>'+esc(l)+'</p>';
      }).join('');
    }).join('');
  }

  function catList(){
    const set=['ALL',...new Set(ARTICLES.map(a=>a.cat))];
    cats.innerHTML=set.map(c=>`<button class="bCat${c===activeCat?' on':''}" data-cat="${c}">${c}</button>`).join('');
    cats.querySelectorAll('.bCat').forEach(b=>b.onclick=()=>{activeCat=b.dataset.cat;location.hash='';render();});
  }

  function renderIndex(){
    art.style.display='none';list.style.display='grid';
    catList();
    const items=ARTICLES.filter(a=>activeCat==='ALL'||a.cat===activeCat);
    list.innerHTML=items.map(a=>`
      <a class="bCard" href="#${a.id}">
        <div class="bIcon">${a.icon}</div>
        <div class="bMeta"><span class="bTag">${a.cat}</span><span class="bDate">${fmtDate(a.date)}</span></div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.teaser)}</p>
        <span class="bMore">READ →</span>
      </a>`).join('');
  }

  function renderArticle(a){
    list.style.display='none';art.style.display='block';
    art.innerHTML=`
      <a class="bBack" href="#">← ALL ARTICLES</a>
      <div class="bMeta"><span class="bTag">${a.cat}</span><span class="bDate">${fmtDate(a.date)}</span></div>
      <div class="bArtIcon">${a.icon}</div>
      <h1>${esc(a.title)}</h1>
      <div class="bBody">${renderBody(a.body)}</div>
      <a class="bBack" href="#">← ALL ARTICLES</a>`;
    window.scrollTo(0,0);
  }

  function render(){
    const id=location.hash.replace('#','');
    const a=ARTICLES.find(x=>x.id===id);
    if(a)renderArticle(a);else renderIndex();
  }
  window.addEventListener('hashchange',render);
  render();
})();
