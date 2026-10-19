/* R6 Pixel Siege - LOCKER tab: browse owned cosmetics, preview them live, equip/unequip. */
(()=>{
const ECO=window.ECO,CXR=window.CXR;if(!ECO||!CXR)return;
const $=id=>document.getElementById(id),tabs=$('tabs');if(!tabs)return;
const ORDER=['sk','hd','wp','dr','tr','kf','np','rg','xh','mf'],SHORT={sk:'SKIN',hd:'HEAD',wp:'WEAPON',dr:'DRONE',tr:'TRACER',kf:'KILL FX',np:'PLATE',rg:'RING',xh:'SIGHT',mf:'FLASH'};
const RO={c:0,r:1,e:2,l:3,m:4};
const tb=document.createElement('button');tb.dataset.tab='lock';tb.textContent='LOCKER';tabs.insertBefore(tb,tabs.querySelector('[data-tab=shop]'));
const css=document.createElement('style');css.textContent=`
#tp-lock .lkw{display:flex;flex-direction:column;gap:10px;width:min(1040px,100%);margin:0 auto;box-sizing:border-box}
#tp-lock .lkh{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid #2d2d33;padding-bottom:8px}
#tp-lock .lkh h2{margin:0;font:400 22px Silkscreen,monospace;letter-spacing:4px;color:#fff}#tp-lock .lkh small{display:block;margin-top:4px;font:500 12px Rajdhani,sans-serif;letter-spacing:3px;color:#8fa3bf}
#tp-lock .lkb{display:grid;grid-template-columns:minmax(0,370px) minmax(0,1fr);gap:12px;height:calc(100vh - 222px);min-height:300px}
#tp-lock .lkl{display:flex;flex-direction:column;gap:8px;min-height:0}
#lkCv{width:100%;aspect-ratio:3/2;max-height:46%;image-rendering:pixelated;border:1px solid #2d2d33;background:#0c1016;display:block;flex:none}
#lkEq{display:flex;flex-direction:column;gap:3px;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#e5303a #14161b}
#lkEq button{display:grid;grid-template-columns:62px 1fr auto;gap:8px;align-items:center;text-align:left;cursor:pointer;background:rgba(8,8,10,.8);border:1px solid #2d2d33;border-left:3px solid var(--rc,#2d2d33);padding:4px 8px;color:#fff;font:600 12px Rajdhani,sans-serif;letter-spacing:2px;min-width:0}
#lkEq button.on{background:#2a0f12;border-color:#e5303a;border-left-color:var(--rc,#e5303a)}
#lkEq button i{font-style:normal;color:#8fa3bf;font-size:11px}#lkEq button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#lkEq button u{text-decoration:none;color:#ff5a60;font-size:11px}
#tp-lock .lkr{display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0}
#lkCats{display:flex;flex-wrap:wrap;gap:4px}
#lkCats button{cursor:pointer;font:700 12px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf;background:rgba(8,8,10,.8);border:1px solid #2d2d33;padding:6px 10px}
#lkCats button.on{color:#fff;border-color:#e5303a;background:#2a0f12}#lkCats button b{color:#ffd24a;font-weight:600;margin-left:6px}
#lkGrid{flex:1 1 auto;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;align-content:start;padding-right:4px;scrollbar-width:thin;scrollbar-color:#e5303a #14161b}
.lkt{position:relative;cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:5px;background:rgba(8,8,10,.8);border:1px solid #2d2d33;border-top:2px solid var(--rc);min-width:0}
.lkt canvas{width:100%;aspect-ratio:1;height:auto;image-rendering:pixelated;background:rgba(0,0,0,.35);display:block}
.lkt span{font:700 11px Rajdhani,sans-serif;letter-spacing:1px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lkt.sel{border-color:#fff;border-top-color:var(--rc)}.lkt.eq:after{content:'EQUIPPED';position:absolute;top:2px;right:2px;font:700 9px Rajdhani,sans-serif;letter-spacing:1px;background:#14301c;color:#6aff9a;padding:1px 4px}
.lkt.lock{opacity:.38}.lkt.lock canvas{filter:grayscale(1) brightness(.7)}
#lkBar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:none;min-height:38px;border:1px solid #2d2d33;background:rgba(8,8,10,.8);padding:6px 10px;font:600 13px Rajdhani,sans-serif;letter-spacing:2px;color:#c4c8d0}
#lkBar b{color:#fff}#lkBar button{cursor:pointer;font:700 13px Rajdhani,sans-serif;letter-spacing:3px;padding:7px 18px;color:#fff;background:#c4262e;border:0;border-bottom:3px solid #7a1218;white-space:nowrap}
#lkBar button.g{background:#14301c;border-bottom-color:#0a1c10;color:#6aff9a}#lkBar button:disabled{background:#1d1d22;border-bottom-color:#111;color:#666b75}
@media(max-width:900px){#tp-lock .lkb{grid-template-columns:minmax(0,260px) minmax(0,1fr)}#lkEq button{grid-template-columns:50px 1fr}#lkEq button u{display:none}}
@media(min-height:901px){#tp-lock .lkb{height:calc(100vh - 238px)}}
@media(max-height:760px){#tp-lock .lkb{height:calc(100vh - 216px)}#lkEq button{padding:2px 6px}#tp-lock .lkw{gap:6px}}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.className='tp';panel.id='tp-lock';panel.hidden=true;
panel.innerHTML=`<div class="lkw"><div class="lkh"><div><h2>LOCKER</h2><small id="lkSub"></small></div></div><div class="lkb"><div class="lkl"><canvas id="lkCv" width="300" height="200"></canvas><div id="lkEq"></div></div><div class="lkr"><div id="lkCats"></div><div id="lkGrid"></div><div id="lkBar"></div></div></div></div>`;
const host=$('tp-shop');host.parentNode.insertBefore(panel,host);
let cat='sk',sel=null,tick=0;const pv={}; // pv: type -> previewed item (defaults to equipped)
const eqItem=t=>ECO.eq[t]&&ECO.has(ECO.eq[t])?ECO.BYID[ECO.eq[t]]:null;
const curEq=()=>{const o={};for(const t of ORDER)o[t]=pv[t]!==undefined?pv[t]:eqItem(t);return o};
function renderAll(){const own=ECO.CAT.filter(c=>ECO.has(c.id)).length;$('lkSub').textContent=own+' / '+ECO.CAT.length+' UNLOCKED // CLICK AN ITEM TO PREVIEW, THEN EQUIP';
 $('lkCats').innerHTML=ORDER.map(t=>`<button data-c="${t}" class="${t===cat?'on':''}">${SHORT[t]}<b>${ECO.CAT.filter(c=>c.t===t&&ECO.has(c.id)).length}/${ECO.CAT.filter(c=>c.t===t).length}</b></button>`).join('');
 const e=curEq();$('lkEq').innerHTML=ORDER.map(t=>{const it=eqItem(t),prev=pv[t];const R=it?ECO.RAR[it.r].col:'#2d2d33';return `<button data-e="${t}" class="${t===cat?'on':''}" style="--rc:${R}"><i>${SHORT[t]}</i><span>${it?it.n.toUpperCase():'DEFAULT'}</span>${it?'<u data-x="'+t+'">REMOVE</u>':''}</button>`}).join('');
 renderGrid();renderBar()}
let gridCvs=[];
function renderGrid(){const list=ECO.CAT.filter(c=>c.t===cat).sort((a,b)=>(ECO.has(b.id)-ECO.has(a.id))||(RO[b.r]-RO[a.r])||a.n.localeCompare(b.n));
 $('lkGrid').innerHTML=list.map(c=>{const own=ECO.has(c.id),R=ECO.RAR[c.r];return `<div class="lkt ${own?'':'lock'} ${ECO.isEq(c.id)?'eq':''} ${sel===c.id?'sel':''}" data-i="${c.id}" style="--rc:${R.col}"><canvas width="48" height="48"></canvas><span title="${c.n}">${c.n.toUpperCase()}</span></div>`}).join('');
 gridCvs=[...$('lkGrid').children].map((d,i)=>[d.querySelector('canvas'),list[i]]);gridCvs.forEach(([cv,it])=>ECO.drawPreview(cv,it,0))}
function renderBar(){const it=sel?ECO.BYID[sel]:null,b=$('lkBar');if(!it){b.innerHTML='<span>SELECT AN ITEM</span>';return}
 const own=ECO.has(it.id),R=ECO.RAR[it.r],q=ECO.isEq(it.id);
 b.innerHTML=`<span><b style="color:${R.col}">${R.n}</b> // <b>${it.n.toUpperCase()}</b> // ${ECO.TYPES[it.t]}${own?'':' // NOT OWNED'+(it.pk?' (PACK EXCLUSIVE)':it.se?' (SEASON PASS)':'')}</span>`+(own?`<button class="${q?'':'g'}" data-eq="${it.id}">${q?'UNEQUIP':'EQUIP'}</button>`:`<button disabled>LOCKED</button>`)}
panel.addEventListener('click',e=>{
 const x=e.target.closest('[data-x]');if(x){e.stopPropagation();ECO.unequip(x.dataset.x);delete pv[x.dataset.x];return}
 const c=e.target.closest('[data-c]');if(c){cat=c.dataset.c;sel=null;renderAll();return}
 const q=e.target.closest('[data-e]');if(q){cat=q.dataset.e;sel=null;renderAll();return}
 const t=e.target.closest('[data-i]');if(t){sel=t.dataset.i;const it=ECO.BYID[sel];pv[it.t]=it;renderAll();return}
 const b=e.target.closest('[data-eq]');if(b){const it=ECO.BYID[b.dataset.eq];if(ECO.isEq(it.id)){ECO.unequip(it.t);delete pv[it.t]}else{ECO.equip(it.id);delete pv[it.t]}renderAll()}});
ECO.bus.addEventListener('change',()=>{if(!panel.hidden)renderAll()});
tb.addEventListener('click',()=>{for(const k in pv)delete pv[k];sel=null;renderAll()});
setInterval(()=>{if(panel.hidden)return;tick++;CXR.look($('lkCv'),curEq(),tick)},100);
})();
