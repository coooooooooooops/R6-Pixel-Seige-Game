/* R6 Pixel Siege - cosmetics economy.
   Stage 1: wallet + catalog + daily rotating shop (resets 12:00am Australia/Sydney) + SHOP tab.
   Exposes window.ECO so later stages (packs, equip, match rewards) plug in. */
(()=>{
const TZ='Australia/Sydney',KEY='r6s_eco',START_CR=2500;
const RAR={c:{n:'COMMON',col:'#8fa3bf',price:400,dup:100},r:{n:'RARE',col:'#3aa0ff',price:900,dup:225},e:{n:'EPIC',col:'#b455ff',price:1900,dup:475},l:{n:'LEGENDARY',col:'#ffb62e',price:4200,dup:1050},m:{n:'MYTHIC',col:'#ff3d6e',price:0,dup:2500}};
const TYPES={sk:'OPERATOR SKIN',hd:'HEADGEAR',wp:'WEAPON SKIN',tr:'BULLET TRACER',kf:'KILL EFFECT',np:'NAMEPLATE',rg:'GROUND RING',xh:'CROSSHAIR',mf:'MUZZLE FLASH',dr:'DRONE SKIN'};
const CAT=window.R6CAT||[],BYID={};CAT.forEach(c=>BYID[c.id]=c);
/* ---------- Sydney clock ---------- */
const dfmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
const dayKey=(t=Date.now())=>dfmt.format(new Date(t));
function edge(t,dir){ // dir 1: first instant of next Sydney day, -1: first instant of this day
 const k=dayKey(t);let lo,hi;if(dir>0){lo=t;hi=t+27*36e5;while(hi-lo>500){const m=(lo+hi)/2;dayKey(m)===k?lo=m:hi=m}return Math.floor(hi/1000)*1000}
 lo=t-27*36e5;hi=t;while(hi-lo>500){const m=(lo+hi)/2;dayKey(m)===k?hi=m:lo=m}return Math.floor(hi/1000)*1000}
const nextReset=t=>edge(t,1),dayStart=t=>edge(t,-1);
/* ---------- seeded rotation ---------- */
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const SLOTS=['l','e','e','e','r','r','r','r','c','c','c','c'];
function shopFor(key,prevIds){const R=rng(hash('r6shop:'+key)),out=[],used={},tc={};
 for(const r of SLOTS){let pool=CAT.filter(c=>!c.pk&&!c.se&&c.r===r&&!used[c.id]&&(!c.from||c.from<=key));const fresh=pool.filter(c=>!(prevIds||[]).includes(c.id)&&(tc[c.t]||0)<3);if(fresh.length)pool=fresh;
  const it=pool[Math.floor(R()*pool.length)];used[it.id]=1;tc[it.t]=(tc[it.t]||0)+1;out.push(it.id)}
 return out}
function todaysShop(t=Date.now()){const ds=dayStart(t);return shopFor(dayKey(t),shopFor(dayKey(ds-36e5)))}
/* ---------- wallet / inventory ---------- */
let W;try{W=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
if(!W||typeof W!=='object'){W={cr:START_CR,inv:{},eq:{},packs:0,stats:{buys:0}}}
W.inv=W.inv||{};W.eq=W.eq||{};W.stats=W.stats||{buys:0};if(!W.packs||typeof W.packs!=='object')W.packs={supply:0,elite:0};W.packs.supply|=0;W.packs.elite|=0;W.stats.pity|=0;W.stats.pityM|=0;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(W))}catch(e){}};
const bus=new EventTarget();const emit=()=>{save();bus.dispatchEvent(new Event('change'))};
const ECO={CAT,BYID,RAR,TYPES,dayKey,nextReset,dayStart,todaysShop,shopFor,bus,
 get cr(){return W.cr},get inv(){return W.inv},get eq(){return W.eq},
 has:id=>!!W.inv[id],
 add(n){W.cr=Math.max(0,Math.round(W.cr+n));emit()},
 grant(id){const c=BYID[id];if(!c)return{ok:0};if(W.inv[id]){const d=RAR[c.r].dup;W.cr+=d;emit();return{ok:1,dup:1,refund:d,item:c}}W.inv[id]=Date.now();emit();return{ok:1,dup:0,item:c}},
 buy(id,t=Date.now()){const c=BYID[id];if(!c||c.pk||c.se)return{ok:0,why:'NOT FOR SALE'};if(!todaysShop(t).includes(id))return{ok:0,why:'NOT IN TODAYS SHOP'};if(W.inv[id])return{ok:0,why:'ALREADY OWNED'};const p=RAR[c.r].price;if(W.cr<p)return{ok:0,why:'NOT ENOUGH CREDITS'};W.cr-=p;W.inv[id]=Date.now();W.stats.buys++;emit();return{ok:1,item:c}},
 equip(id){const c=BYID[id];if(!c)return{ok:0,why:'UNKNOWN ITEM'};if(!W.inv[id])return{ok:0,why:'NOT OWNED'};W.eq[c.t]=id;emit();return{ok:1}},
 unequip(t){delete W.eq[t];emit()},
 isEq:id=>{const c=BYID[id];return !!c&&W.eq[c.t]===id},
 save,_state:()=>W};
window.ECO=ECO;
/* ---------- mystery packs ---------- */
const ORD=['c','r','e','l','m'],PITY=14,MPITY=25;
const PACKS={supply:{n:'SUPPLY PACK',price:900,cnt:3,w:{c:70,r:24,e:5,l:1},minR:'r',note:'3 ITEMS // LAST ITEM RARE OR BETTER',col:'#3aa0ff'},
 elite:{n:'ELITE PACK',price:2400,cnt:3,w:{r:52,e:34,l:12,m:1},minR:'e',note:'3 ITEMS // LAST ITEM EPIC OR BETTER // ONLY SOURCE OF MYTHICS',col:'#ffb62e'}};
function rollPack(type,S,grantFn,inv){const d=PACKS[type],out=[];let hit=false;const pF=S.pity>=PITY-1,mF=type==='elite'&&S.pityM>=MPITY-1;
 for(let i=0;i<d.cnt;i++){const last=i===d.cnt-1,minI=last?ORD.indexOf(d.minR):0;let rar;
  if(last&&mF)rar='m';else if(last&&pF&&!hit)rar=(d.w.m&&Math.random()<.1)?'m':'l';
  else{const en=Object.entries(d.w).filter(([r])=>ORD.indexOf(r)>=minI),tot=en.reduce((a,[,w])=>a+w,0);let x=Math.random()*tot;rar=en[en.length-1][0];for(const[r,w]of en){if((x-=w)<0){rar=r;break}}}
  if(rar==='l'||rar==='m')hit=true;
  const pool=CAT.filter(c=>c.r===rar&&!c.se),ws=pool.map(c=>inv[c.id]?1:3);let y=Math.random()*ws.reduce((a,b)=>a+b,0),it=pool[pool.length-1];for(let k=0;k<pool.length;k++){if((y-=ws[k])<0){it=pool[k];break}}
  const g=grantFn(it);out.push({item:it,dup:!!g.dup,refund:g.refund||0})}
 S.pity=hit?0:S.pity+1;if(out.some(o=>o.item.r==='m'))S.pityM=0;else if(type==='elite')S.pityM++;
 out.sort((a,b)=>ORD.indexOf(a.item.r)-ORD.indexOf(b.item.r));return out}
Object.assign(ECO,{PACKS,PITY,MPITY,
 get packs(){return W.packs},get stats(){return W.stats},
 givePack(t,n=1){if(!PACKS[t])return;W.packs[t]+=n;emit()},
 buyPack(t){const d=PACKS[t];if(!d)return{ok:0,why:'UNKNOWN PACK'};if(W.cr<d.price)return{ok:0,why:'NOT ENOUGH CREDITS'};W.cr-=d.price;W.packs[t]++;emit();return{ok:1}},
 openPack(t){const d=PACKS[t];if(!d||W.packs[t]<1)return null;W.packs[t]--;W.stats.opened=(W.stats.opened||0)+1;const r=rollPack(t,W.stats,it=>ECO.grant(it.id),W.inv);emit();return r},
 simulate(t,n){const S={pity:0,pityM:0},cnt={c:0,r:0,e:0,l:0,m:0};let gapL=0,maxGapL=0,gapM=0,maxGapM=0,minOK=true;const d=PACKS[t];
  for(let i=0;i<n;i++){const r=rollPack(t,S,()=>({dup:0}),{});r.forEach(o=>cnt[o.item.r]++);if(ORD.indexOf(r[r.length-1].item.r)<ORD.indexOf(d.minR))minOK=false;
   const l=r.some(o=>o.item.r==='l'||o.item.r==='m'),m=r.some(o=>o.item.r==='m');gapL=l?0:gapL+1;maxGapL=Math.max(maxGapL,gapL);gapM=m?0:gapM+1;maxGapM=Math.max(maxGapM,gapM)}
  return{cnt,pct:Object.fromEntries(Object.entries(cnt).map(([k,v])=>[k,+(v*100/(n*d.cnt)).toFixed(2)])),maxGapL,maxGapM,minOK}},
 CR_RULES:{kill:25,round:40,win:250,loss:75,mvp:200},
 matchEnd({won,rows,my=0,their=0}){const rs=(rows||[]).slice().sort((a,b)=>b.sc-a.sc);if(!rs.length)return null;const mvp=rs[0],isYou=!!mvp.you;let pack=null,why='';
  W.stats.matches=(W.stats.matches||0)+1;if(won)W.stats.wins=(W.stats.wins||0)+1;
  if(isYou){W.stats.mvps=(W.stats.mvps||0)+1;pack='elite';why='MATCH MVP'}else if(Math.random()<(won?.45:.3)){pack='supply';why='MATCH DROP'}
  if(pack)W.packs[pack]++;const K=ECO.CR_RULES,you=rs.find(r=>r.you),kills=you?you.kl:0,parts=[['KILLS',kills,K.kill],['ROUNDS WON',my,K.round]],bonus=[[won?'MATCH WIN':'PARTICIPATION',1,won?K.win:K.loss]];if(isYou)bonus.push(['MVP BONUS',1,K.mvp]);
  const lines=[...parts,...bonus].filter(l=>l[1]>0),credits=lines.reduce((a,l)=>a+l[1]*l[2],0);W.cr+=credits;W.stats.earned=(W.stats.earned||0)+credits;emit();const info={mvp,isYou,pack,why,top:rs.slice(0,3),credits,lines};ECO.lastMatch=info;renderRewards(info);return info},
 clearRewards(){const o=document.getElementById('ovRw');if(o)o.remove()}});
/* previews are drawn by cosmetics.js (ECO.drawPreview) */
function px(g,c,x,y,w,h){g.fillStyle=c;g.fillRect(x,y,w||1,h||1)}
const draw=(cv,it,t)=>{if(ECO.drawPreview)ECO.drawPreview(cv,it,t)};
/* ---------- UI ---------- */
const $=id=>document.getElementById(id),tabs=$('tabs');if(!tabs)return;
const tb=document.createElement('button');tb.dataset.tab='shop';tb.textContent='SHOP';tabs.insertBefore(tb,tabs.querySelector('.gear'));
const badge=document.createElement('span');badge.id='crBadge';badge.title='Credits';tabs.insertBefore(badge,tabs.querySelector('.gear'));
const css=document.createElement('style');css.textContent=`
#crBadge{margin-left:auto;margin-right:14px;font:600 14px Rajdhani,sans-serif;letter-spacing:2px;color:#ffd24a;border:1px solid #4a3a10;background:rgba(40,30,6,.6);padding:6px 12px;white-space:nowrap}
#crBadge:before{content:'';display:inline-block;width:9px;height:9px;background:#ffd24a;margin-right:8px;transform:rotate(45deg)}
#tabs .gear{margin-left:0}
#tp-shop .shw{display:flex;flex-direction:column;gap:12px;width:min(1040px,100%);margin:0 auto;box-sizing:border-box}
#tp-shop .shh{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-bottom:1px solid #2d2d33;padding-bottom:8px}
#tp-shop .shh h2{margin:0;font:400 22px Silkscreen,monospace;letter-spacing:4px;color:#fff}
#tp-shop .shh small{display:block;margin-top:4px;font:500 12px Rajdhani,sans-serif;letter-spacing:3px;color:#8fa3bf}
#tp-shop .cd{font:700 26px Rajdhani,sans-serif;letter-spacing:3px;color:#ff5a60;text-align:right;white-space:nowrap}#tp-shop .cd small{text-align:right}
#shGrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
.shc{position:relative;display:flex;flex-direction:column;gap:6px;padding:8px;background:rgba(8,8,10,.8);border:1px solid #2d2d33;border-top:3px solid var(--rc);min-width:0}
.shc.feat{box-shadow:0 0 0 1px var(--rc),0 0 18px -4px var(--rc)}
.shc canvas{width:auto;height:clamp(60px,15vh,150px);aspect-ratio:1;align-self:center;max-width:100%;image-rendering:pixelated;background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.08),rgba(0,0,0,.4));border:1px solid #1d1d22;display:block}
.shc .rn{font:600 11px Rajdhani,sans-serif;letter-spacing:3px;color:var(--rc)}
.shc h4{margin:0;font:700 15px Rajdhani,sans-serif;letter-spacing:2px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.shc .ty{font:500 11px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
.shc button{cursor:pointer;font:700 13px Rajdhani,sans-serif;letter-spacing:3px;padding:7px 8px;color:#fff;background:#c4262e;border:0;border-bottom:3px solid #7a1218}
.shc button:hover:not(:disabled){background:#e5303a}
.shc button:disabled{background:#1d1d22;border-bottom-color:#111;color:#666b75;cursor:default}
.shc.own button{background:#14301c;border-bottom-color:#0a1c10;color:#6aff9a}
#shMsg{min-height:16px;font:600 13px Rajdhani,sans-serif;letter-spacing:3px;color:#ffd24a;text-align:center}
@media(max-width:900px){#shGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.shc h4{font-size:12px;letter-spacing:1px}}
@media(max-height:680px){.shc canvas{height:max(44px,10vh)}.shc .ty{display:none}#tp-shop .shh h2{font-size:18px}}
@media(max-height:760px){#shGrid{gap:6px}.shc{padding:6px;gap:3px}#tp-shop .shw{gap:8px}}

[hidden]{display:none!important}
#tp-shop .shtabs{display:flex;gap:6px;margin-left:auto;margin-right:18px}
#tp-shop .shtabs button{cursor:pointer;font:700 13px Rajdhani,sans-serif;letter-spacing:3px;color:#8fa3bf;background:rgba(8,8,10,.8);border:1px solid #2d2d33;padding:7px 16px}
#tp-shop .shtabs button.on{color:#fff;border-color:#e5303a;background:#2a0f12}
#tp-shop .shtabs i{font-style:normal;margin-left:8px;color:#ffd24a}
#shPacks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.pkc{display:flex;flex-direction:column;gap:7px;padding:10px;background:rgba(8,8,10,.8);border:1px solid #2d2d33;border-top:3px solid var(--rc);min-width:0}
.pkc canvas{height:clamp(70px,17vh,160px);width:auto;aspect-ratio:1;align-self:center;image-rendering:pixelated;background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.08),rgba(0,0,0,.4));border:1px solid #1d1d22}
.pkc h4{margin:0;font:700 18px Rajdhani,sans-serif;letter-spacing:3px;color:var(--rc)}
.pkc .nt{font:500 12px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
.pkc .rt{display:grid;grid-template-columns:1fr auto;gap:0 10px;font:600 11px Rajdhani,sans-serif;letter-spacing:2px;line-height:1.25}
.pkc .btn2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
.pkc button,#pkM button{cursor:pointer;font:700 13px Rajdhani,sans-serif;letter-spacing:3px;padding:8px 6px;color:#fff;background:#c4262e;border:0;border-bottom:3px solid #7a1218}
.pkc button:hover:not(:disabled),#pkM button:hover:not(:disabled){background:#e5303a}
.pkc button.g,#pkM button.g{background:#14301c;border-bottom-color:#0a1c10;color:#6aff9a}
.pkc button:disabled{background:#1d1d22;border-bottom-color:#111;color:#666b75;cursor:default}
.pkc.inf{--rc:#8fa3bf}.pkc.inf ul{margin:0;padding:0 0 0 14px;font:500 13px Rajdhani,sans-serif;letter-spacing:1px;color:#c4c8d0;display:flex;flex-direction:column;gap:6px}
.pkc.inf b{color:#ffd24a;font-weight:700}
.pkc .bar{height:8px;background:#1d1d22;border:1px solid #2d2d33}.pkc .bar i{display:block;height:100%;background:#ffb62e}
#pkM{position:fixed;inset:0;z-index:99999;background:rgba(2,3,6,.94);display:flex;align-items:center;justify-content:center}
#pkM .pkbox{display:flex;flex-direction:column;align-items:center;gap:clamp(8px,2vh,18px);width:min(900px,calc(100% - 24px));max-height:calc(100% - 16px);box-sizing:border-box;padding:12px}
#pkM .pkt{font:400 clamp(16px,3.4vh,26px) Silkscreen,monospace;letter-spacing:4px;color:var(--pc,#fff);text-align:center}
#pkM .pkst{display:flex;gap:clamp(8px,1.6vw,18px);align-items:center;justify-content:center;min-height:0;width:100%}
#pkM .pkh{font:700 14px Rajdhani,sans-serif;letter-spacing:4px;color:#ffd24a;animation:pkb 1s infinite alternate}
@keyframes pkb{to{opacity:.35}}
#pkM .pkbig{background:none!important;border:0!important;display:flex;flex-direction:column;align-items:center;gap:12px;cursor:pointer;background:none;border:0;padding:0}
#pkM .pkbig canvas{height:clamp(110px,38vh,330px);width:auto;aspect-ratio:1;image-rendering:pixelated;animation:pks .5s infinite alternate;filter:drop-shadow(0 0 22px var(--pc))}
@keyframes pks{from{transform:rotate(-3deg) scale(1)}to{transform:rotate(3deg) scale(1.04)}}
#pkM .pkcd{width:clamp(110px,24vh,230px);flex:none;aspect-ratio:3/4.1;position:relative;perspective:900px}
#pkM .pkin{position:absolute;inset:0;transition:transform .5s;transform-style:preserve-3d}
#pkM .pkcd.flip .pkin{transform:rotateY(180deg)}
#pkM .pkf,#pkM .pkb{position:absolute;inset:0;backface-visibility:hidden;box-sizing:border-box;border:2px solid #2d2d33;background:#0b0c10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:6px}
#pkM .pkb{font:400 clamp(20px,5vh,40px) Silkscreen,monospace;color:#2d2d33}
#pkM .pkf{transform:rotateY(180deg);border-color:var(--rc);box-shadow:0 0 26px -6px var(--rc),inset 0 0 22px -12px var(--rc)}
#pkM .pkf canvas{width:80%;height:auto;aspect-ratio:1;image-rendering:pixelated;background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.08),rgba(0,0,0,.4))}
#pkM .pkf .rn{font:700 11px Rajdhani,sans-serif;letter-spacing:3px;color:var(--rc)}#pkM .pkf h5{margin:0;font:700 clamp(12px,2vh,16px) Rajdhani,sans-serif;letter-spacing:2px;color:#fff;text-align:center}
#pkM .pkf .ty{font:500 10px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf;text-align:center}#pkM .pkf .tg{font:700 12px Rajdhani,sans-serif;letter-spacing:2px}
#pkM .pkbtn{display:flex;gap:8px;min-height:36px}
#pkM.fl{animation:pkf .6s}@keyframes pkf{0%{background:#fff}100%{background:rgba(2,3,6,.94)}}
#ovRw{margin:10px 0 4px;padding:10px 14px;border:1px solid #3a3a42;border-left:3px solid #ffb62e;background:rgba(8,8,10,.7);text-align:left;max-width:100%;box-sizing:border-box}
#ovRw .mv{font:700 15px Rajdhani,sans-serif;letter-spacing:3px;color:#ffd24a}#ovRw .mv b{color:#fff}
#ovRw .tp3{display:flex;flex-direction:column;gap:2px;margin:6px 0;font:500 13px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
#ovRw .tp3 .y{color:#6aff9a}
#ovRw .cr{margin:4px 0 6px;font:700 15px Rajdhani,sans-serif;letter-spacing:3px;color:#ffd24a}#ovRw .cr b{color:#fff}#ovRw .cr span{display:block;margin-top:2px;font:500 11px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
#ovRw .rw{display:flex;align-items:center;justify-content:space-between;gap:12px;font:700 14px Rajdhani,sans-serif;letter-spacing:3px;color:#fff}
#ovRw button{cursor:pointer;font:700 13px Rajdhani,sans-serif;letter-spacing:3px;padding:7px 14px;color:#fff;background:#c4262e;border:0;border-bottom:3px solid #7a1218}
@media(max-width:900px){#shPacks{grid-template-columns:repeat(2,minmax(0,1fr))}#shPacks .inf{grid-column:1/3}}
@media(max-height:760px){.pkc{padding:7px;gap:4px}.pkc .nt{display:none}#shPacks{gap:6px}}
@media(max-height:680px){.pkc canvas{height:max(36px,8vh)}.pkc .rt{font-size:9px}.pkc h4{font-size:15px}.pkc.inf ul{font-size:11px;gap:3px}}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.className='tp';panel.id='tp-shop';panel.hidden=true;
panel.innerHTML=`<div class="shw"><div class="shh"><div><h2 id="shTitle">DAILY SHOP</h2><small id="shSub">12 ITEMS // RESETS 12:00AM SYDNEY TIME</small></div><div class="shtabs"><button data-st="daily" class="on">DAILY</button><button data-st="packs">PACKS<i id="pkN"></i></button></div><div class="cd" id="shCdBox"><small>NEXT ROTATION</small><span id="shCd">--:--:--</span></div></div><div id="shDaily"><div id="shGrid"></div></div><div id="shPacks" hidden></div><div id="shMsg"></div></div>`;
const host=document.getElementById('tp-maps');host.parentNode.insertBefore(panel,host.nextSibling);
const fmtT=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return [h,m,x].map(v=>String(v).padStart(2,'0')).join(':')};
let curKey='',rst=0,tick=0,msgT=0;const cvs=[];
function say(m){$('shMsg').textContent=m;clearTimeout(msgT);msgT=setTimeout(()=>{$('shMsg').textContent=''},2600)}
function renderShop(){curKey=dayKey();rst=nextReset(Date.now());const ids=todaysShop(),g=$('shGrid');cvs.length=0;
 g.innerHTML=ids.map((id,i)=>{const c=BYID[id],R=RAR[c.r],own=ECO.has(id),can=ECO.cr>=R.price;
  return `<div class="shc ${i===0?'feat':''} ${own?'own':''}" style="--rc:${R.col}"><canvas width="48" height="48" data-id="${id}"></canvas><div class="rn">${R.n}${i===0?' // FEATURED':''}</div><h4 title="${c.n}">${c.n.toUpperCase()}</h4><div class="ty">${TYPES[c.t]}</div><button data-buy="${id}" ${own||!can?'disabled':''}>${own?'OWNED':can?'BUY // '+R.price:'NEED '+R.price}</button></div>`}).join('');
 g.querySelectorAll('canvas').forEach(cv=>{cvs.push([cv,BYID[cv.dataset.id]])});anim()}
function anim(){cvs.forEach(([cv,it])=>draw(cv,it,tick))}
function badgeUpd(){badge.textContent=ECO.cr.toLocaleString('en-US')}
bus.addEventListener('change',()=>{badgeUpd();if(!panel.hidden)renderShop()});badgeUpd();
panel.addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(!b)return;const r=ECO.buy(b.dataset.buy);if(r.ok){say('PURCHASED // '+r.item.n.toUpperCase());try{sfx(880,.08,'square',.04)}catch(_){}}else{say(r.why);try{sfx(180,.1,'sawtooth',.04)}catch(_){}}});
tb.addEventListener('click',()=>{setSub(sub);cd()});
function cd(){const n=Date.now();if(n>=rst&&!panel.hidden)renderShop();$('shCd').textContent=fmtT(Math.max(0,Math.floor((rst-n)/1000)))}
setInterval(()=>{if(panel.hidden)return;tick++;cd();if(tick%2===0)anim()},500);

/* ---------- packs UI ---------- */
function drawPack(cv,type,t){const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,48,48);const el=type==='elite',m=el?'#1a1408':'#1c2634',a=el?'#ffb62e':'#3aa0ff',h=el?'#ffe680':'#9ad0ff',j=t%2;
 px(g,'#000',9,11+j,32,32);px(g,m,10,12+j,30,30);px(g,a,10,12+j,30,4);px(g,a,10,38+j,30,4);px(g,h,10,16+j,30,1);for(let i=0;i<30;i+=3){px(g,a,10+i,10+j,2,2);px(g,a,10+i,42+j,2,2)}
 const cx=25,cy=27+j;px(g,a,cx-1,cy-7,3,15);px(g,a,cx-7,cy-1,15,3);px(g,h,cx-4,cy-4,9,9);px(g,m,cx-2,cy-2,5,5);if(el){px(g,h,cx-1,cy-1,3,3)}
 if(t%4<2){px(g,'#fff',14,20,1,1);px(g,'#fff',35,33,1,1)}else{px(g,'#fff',34,20,1,1);px(g,'#fff',15,34,1,1)}}
ECO.drawPack=drawPack;
const SHT={daily:['DAILY SHOP','12 ITEMS // RESETS 12:00AM SYDNEY TIME'],packs:['MYSTERY PACKS','OPEN FOR RANDOM COSMETICS // DUPLICATES REFUND CREDITS']};let sub='daily';
function setSub(n){sub=n;$('shDaily').hidden=n!=='daily';$('shPacks').hidden=n!=='packs';$('shCdBox').style.visibility=n==='daily'?'visible':'hidden';$('shTitle').textContent=SHT[n][0];$('shSub').textContent=SHT[n][1];panel.querySelectorAll('[data-st]').forEach(b=>b.classList.toggle('on',b.dataset.st===n));if(n==='packs')renderPacks();else renderShop()}
panel.querySelector('.shtabs').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(b)setSub(b.dataset.st)});
const RC=['c','r','e','l','m'];
function pct(t){const d=PACKS[t],row=(lab,minR)=>{const en=Object.entries(d.w).filter(([r])=>ORD.indexOf(r)>=ORD.indexOf(minR)),tot=en.reduce((a,[,w])=>a+w,0);return `<span style="grid-column:1/3;color:#8fa3bf">${lab}</span>`+en.map(([r,w])=>`<span style="color:${RAR[r].col}">${RAR[r].n}</span><span style="color:${RAR[r].col};text-align:right">${+(w*100/tot).toFixed(1)}%</span>`).join('')};return row('ITEMS 1-2','c')+row('ITEM 3 ('+RAR[d.minR].n+'+)',d.minR)}
function renderPacks(){const n=ECO.packs,own=CAT.filter(c=>ECO.has(c.id)).length,pc=Math.min(100,Math.round(ECO.stats.pity*100/PITY));
 $('shPacks').innerHTML=['supply','elite'].map(t=>{const d=PACKS[t],can=ECO.cr>=d.price;return `<div class="pkc" style="--rc:${d.col}"><canvas width="48" height="48" data-pk="${t}"></canvas><h4>${d.n}</h4><div class="nt">${d.note}</div><div class="rt">${pct(t)}</div><div class="btn2"><button data-pbuy="${t}" ${can?'':'disabled'}>${can?'BUY // '+d.price:'NEED '+d.price}</button><button class="g" data-popen="${t}" ${n[t]?'':'disabled'}>OPEN // ${n[t]}</button></div></div>`}).join('')+
 `<div class="pkc inf"><h4>HOW TO GET PACKS</h4><ul><li><b>MATCH MVP</b> // ELITE PACK, EVERY TIME</li><li><b>MATCH DROP</b> // 30% SUPPLY PACK (45% IF YOU WIN)</li><li><b>PITY</b> // LEGENDARY OR BETTER WITHIN ${PITY} PACKS, MYTHIC WITHIN ${MPITY} ELITE</li><li><b>DUPLICATES</b> // REFUND CREDITS</li></ul><div class="nt" style="margin-top:auto">LEGENDARY PITY ${ECO.stats.pity}/${PITY}</div><div class="bar"><i style="width:${pc}%"></i></div><div class="nt">COLLECTION ${own}/${CAT.length} // PACKS OPENED ${ECO.stats.opened||0}</div></div>`;
 $('shPacks').querySelectorAll('canvas').forEach(cv=>drawPack(cv,cv.dataset.pk,tick))}
function pkBadge(){const t=n=>n,k=ECO.packs.supply+ECO.packs.elite;$('pkN').textContent=k?k:''}
$('shPacks').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.pbuy){const r=ECO.buyPack(b.dataset.pbuy);if(r.ok){say('PURCHASED // '+PACKS[b.dataset.pbuy].n);try{sfx(880,.08,'square',.04)}catch(_){}}else say(r.why)}else if(b.dataset.popen)openModal(b.dataset.popen)});
bus.addEventListener('change',()=>{pkBadge();if(!panel.hidden&&sub==='packs')renderPacks()});pkBadge();
const _tick=setInterval(()=>{if(!panel.hidden&&sub==='packs')$('shPacks').querySelectorAll('canvas').forEach(cv=>drawPack(cv,cv.dataset.pk,tick))},500);
/* ---------- opening modal ---------- */
const M=document.createElement('div');M.id='pkM';M.hidden=true;M.innerHTML='<div class="pkbox"><div class="pkt" id="pkT"></div><div class="pkst" id="pkSt"></div><div class="pkbtn" id="pkBt"></div></div>';document.body.appendChild(M);
let pkType='',pkTm=[],pkTick=0,pkAnim=0;
const clrT=()=>{pkTm.forEach(clearTimeout);pkTm=[]};
function sfxR(r,i){try{sfx([440,560,700,900,1200][RC.indexOf(r)]+i*20,.12,r==='m'||r==='l'?'square':'triangle',.05)}catch(_){}}
function openModal(t){if(!ECO.packs[t])return;pkType=t;M.hidden=false;M.style.setProperty('--pc',PACKS[t].col);showClosed()}
function closeModal(){clrT();clearInterval(pkAnim);M.hidden=true;if(!panel.hidden)sub==='packs'?renderPacks():renderShop()}
function showClosed(){clrT();const d=PACKS[pkType];$('pkT').textContent=d.n+(ECO.packs[pkType]>1?'  x'+ECO.packs[pkType]:'');$('pkSt').innerHTML='<button class="pkbig" id="pkGo"><canvas width="48" height="48"></canvas><span class="pkh">CLICK TO OPEN</span></button>';
 const cv=M.querySelector('canvas');clearInterval(pkAnim);pkAnim=setInterval(()=>{pkTick++;drawPack(cv,pkType,pkTick)},400);drawPack(cv,pkType,0);
 $('pkBt').innerHTML='<button id="pkX">CLOSE</button>';$('pkX').onclick=closeModal;$('pkGo').onclick=reveal}
function reveal(){const res=ECO.openPack(pkType);if(!res){closeModal();return}clearInterval(pkAnim);try{sfx(300,.2,'sawtooth',.05)}catch(_){}
 $('pkSt').innerHTML=res.map((r,i)=>{const R=RAR[r.item.r];return `<div class="pkcd" style="--rc:${R.col}" data-i="${i}"><div class="pkin"><div class="pkb">?</div><div class="pkf"><canvas width="48" height="48"></canvas><div class="rn">${R.n}</div><h5>${r.item.n.toUpperCase()}</h5><div class="ty">${TYPES[r.item.t]}</div><div class="tg" style="color:${r.dup?'#ffd24a':'#6aff9a'}">${r.dup?'DUPLICATE +'+r.refund+' CR':'NEW!'}</div></div></div></div>`}).join('');
 const cds=[...$('pkSt').children];cds.forEach((c,i)=>draw(c.querySelector('canvas'),res[i].item,0));$('pkBt').innerHTML='<button id="pkSk">SKIP</button>';
 const flip=i=>{const c=cds[i];if(!c||c.classList.contains('flip'))return;c.classList.add('flip');const r=res[i].item.r;sfxR(r,i);if(r==='l'||r==='m'){M.classList.remove('fl');void M.offsetWidth;M.classList.add('fl')}};
 const done=()=>{const more=ECO.packs[pkType];$('pkBt').innerHTML=(more?`<button class="g" id="pkMore">OPEN ANOTHER // ${more}</button>`:'')+'<button id="pkDn">DONE</button>';$('pkDn').onclick=closeModal;if(more)$('pkMore').onclick=showClosed};
 res.forEach((_,i)=>pkTm.push(setTimeout(()=>flip(i),500+i*750)));pkTm.push(setTimeout(done,500+res.length*750+300));
 $('pkSk').onclick=()=>{clrT();res.forEach((_,i)=>flip(i));done()}}
M.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
/* ---------- match result reward block ---------- */
function renderRewards(info){ECO.clearRewards();const res=document.querySelector('#over .res'),ob=document.getElementById('ob');if(!res||!ob)return;
 const nm=r=>(r.you?'YOU':'BOT')+' // '+String(r.op).toUpperCase(),d=document.createElement('div');d.id='ovRw';
 d.innerHTML=`<div class="mv">MATCH MVP // <b>${nm(info.mvp)}</b></div><div class="tp3">${info.top.map((r,i)=>`<div class="${r.you?'y':''}">${i+1}. ${nm(r)} // ${Math.round(r.sc)} PTS // ${r.kl} KILLS</div>`).join('')}</div>`+
 `<div class="cr">CREDITS EARNED // <b>+${info.credits}</b><span>${info.lines.map(l=>l[1]>1||l[2]<100?l[0]+' '+l[1]+'x'+l[2]:l[0]+' '+l[2]).join('  //  ')}</span></div>`+
 (info.pack?`<div class="rw"><span>${info.why} // ${PACKS[info.pack].n} UNLOCKED</span><button id="ovOpen">OPEN NOW</button></div>`:`<div class="rw"><span style="color:#8fa3bf">NO PACK DROP THIS MATCH</span></div>`);
 res.insertBefore(d,ob);const b=d.querySelector('#ovOpen');if(b)b.onclick=()=>openModal(info.pack)}
})();
