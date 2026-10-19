/* R6 Pixel Siege - SEASON tab + season pass progress. Loaded after locker.js.
   Pass: 30 tiers, 1000 XP each. XP comes from finished matches (credits earned x1.5 + 200). Every tier auto-grants the moment
   it is reached, so nothing can be missed when the month rolls over. Progress resets when the Sydney calendar month changes. */
(()=>{
const ECO=window.ECO,S=window.R6S;if(!ECO||!S)return;
const $=id=>document.getElementById(id),tabs=$('tabs');if(!tabs)return;
const PKEY='r6s_pass',SEEN='r6s_seen_season',TIERS=S.TIERS,XPT=S.XP_TIER;
/* ---------- pass state ---------- */
let P;try{P=JSON.parse(localStorage.getItem(PKEY)||'null')}catch(e){}
if(!P||typeof P!=='object')P={key:'',xp:0,got:{},hist:{}};P.got=P.got||{};P.hist=P.hist||{};P.xp|=0;
const save=()=>{try{localStorage.setItem(PKEY,JSON.stringify(P))}catch(e){}};
const bus=new EventTarget(),emit=()=>{save();bus.dispatchEvent(new Event('change'))};
const tierOf=xp=>Math.min(TIERS,Math.floor(xp/XPT));
let SE=S.seasonAt();
function roll(){const cur=S.seasonAt();SE=cur;if(P.key!==cur.key){if(P.key)P.hist[P.key]={xp:P.xp,tier:tierOf(P.xp)};P.key=cur.key;P.xp=0;P.got={};save();return true}return false}
function give(r){if(r.k==='cr'){ECO.add(r.n);return{r,text:'+'+r.n+' CREDITS'}}
 if(r.k==='pk'){ECO.givePack(r.p,r.n||1);return{r,text:(r.n||1)+'x '+ECO.PACKS[r.p].n}}
 const g=ECO.grant(r.id);return{r,item:g.item,dup:!!g.dup,text:g.item?g.item.n.toUpperCase()+(g.dup?' (DUPLICATE +'+g.refund+' CR)':''):'?'}}
function grantReached(){roll();const out=[],t=tierOf(P.xp);for(let i=1;i<=t;i++)if(!P.got[i]){P.got[i]=1;const r=SE.tiers[i-1];if(r)out.push(Object.assign({tier:i},give(r)))}if(out.length)emit();return out}
function addXP(n){roll();const before=tierOf(P.xp);P.xp=Math.max(0,Math.min(TIERS*XPT,P.xp+Math.round(n)));const rewards=grantReached();emit();return{xp:Math.round(n),from:before,to:tierOf(P.xp),rewards}}
const PASS={get state(){roll();return P},get season(){return SE},tierOf,addXP,sync:grantReached,bus,
 _replace(o){if(!o||typeof o!=='object')return;for(const k in P)delete P[k];Object.assign(P,o);P.got=P.got||{};P.hist=P.hist||{};P.xp|=0;P.key=P.key||'';roll();emit()}};
window.R6PASS=PASS;
/* ---------- XP from matches ---------- */
if(typeof ECO.matchEnd==='function'){const orig=ECO.matchEnd;
 ECO.matchEnd=function(a){const info=orig.call(ECO,a);if(info){try{const r=addXP(Math.round(info.credits*1.5)+200);info.pass=r;showXP(r)}catch(e){}}return info}}
function showXP(r){const o=document.getElementById('ovRw');if(!o)return;const old=o.querySelector('.sxp');if(old)old.remove();
 const d=document.createElement('div');d.className='sxp';
 d.innerHTML='<div class="sx1"></div><div class="sx2"></div>';d.firstChild.textContent='SEASON '+SE.name+' // +'+r.xp+' XP // TIER '+r.to+' / '+TIERS;
 d.lastChild.textContent=r.rewards.length?'UNLOCKED: '+r.rewards.map(x=>'T'+x.tier+' '+x.text).join('  //  '):'NEXT TIER IN '+Math.max(0,XPT-(P.xp%XPT))+' XP';
 d.style.setProperty('--se',SE.col[0]);const rw=o.querySelector('.rw');o.insertBefore(d,rw||null)}
/* ---------- formatting ---------- */
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fz=new Intl.DateTimeFormat('en-GB',{timeZone:S.TZ,day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true});
const fmtD=t=>fz.format(new Date(t)).toUpperCase().replace(/\./g,'').replace(/ AM| PM/,m=>m.replace(' ','')).replace(',','');
const lastSec=t=>t-1000;
const p2=n=>String(n).padStart(2,'0');
function cdTxt(ms){let s=Math.max(0,Math.floor(ms/1000));const d=Math.floor(s/86400);s%=86400;return (d?d+'D ':'')+p2(Math.floor(s/3600))+':'+p2(Math.floor(s%3600/60))+':'+p2(s%60)}
/* ---------- UI ---------- */
const tb=document.createElement('button');tb.dataset.tab='season';tb.id='seTab';tb.textContent='SEASON';tabs.insertBefore(tb,tabs.querySelector('[data-tab=lock]')||tabs.querySelector('[data-tab=shop]')||tabs.querySelector('.gear'));
const css=document.createElement('style');css.textContent=`
#tabs #seTab{color:var(--se,#e5303a)}#tabs #seTab.on{color:#fff}
#tp-season{--se:#e5303a;--se2:#7a1218}
#tp-season .sew{display:flex;flex-direction:column;gap:10px;width:min(1040px,100%);margin:0 auto;box-sizing:border-box}
#tp-season .seh{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-bottom:1px solid #2d2d33;padding-bottom:8px}
#tp-season .seh h2{margin:0;font:400 22px Silkscreen,monospace;letter-spacing:4px;color:var(--se)}
#tp-season .seh small{display:block;margin-top:4px;font:500 12px Rajdhani,sans-serif;letter-spacing:3px;color:#8fa3bf}
#tp-season .cd{font:700 26px Rajdhani,sans-serif;letter-spacing:3px;color:#fff;text-align:right;white-space:nowrap}#tp-season .cd small{text-align:right}
#seCal{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px}
#seCal div{font:700 11px Rajdhani,sans-serif;letter-spacing:2px;text-align:center;padding:5px 2px;background:rgba(8,8,10,.8);border:1px solid #2d2d33;color:#666b75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#seCal div.cur{color:#fff;border-color:var(--se);background:color-mix(in srgb,var(--se) 22%,#08080a)}#seCal div.nx{color:#8fa3bf}
#sePr{display:flex;align-items:center;gap:12px}
#sePr .tn{font:700 20px Rajdhani,sans-serif;letter-spacing:3px;color:#fff;white-space:nowrap}#sePr .tn b{color:var(--se)}
#sePr .bar{flex:1;height:12px;background:#14161b;border:1px solid #2d2d33}#sePr .bar i{display:block;height:100%;background:var(--se)}
#sePr .xp{font:600 12px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf;white-space:nowrap}
#seGrid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px}
.stc{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 4px 6px;background:rgba(8,8,10,.8);border:1px solid #2d2d33;border-top:3px solid var(--rc,#2d2d33);min-width:0}
.stc .no{align-self:flex-start;font:700 11px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
.stc canvas{width:auto;height:clamp(34px,7.5vh,66px);aspect-ratio:1;max-width:100%;image-rendering:pixelated;background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.07),rgba(0,0,0,.4));border:1px solid #1d1d22}
.stc .nm{width:100%;font:700 11px Rajdhani,sans-serif;letter-spacing:1px;color:#fff;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stc .st{font:700 10px Rajdhani,sans-serif;letter-spacing:2px;color:#666b75}
.stc.lk{opacity:.62}.stc.got{border-color:#1f5a33;border-top-color:var(--rc)}.stc.got .st{color:#6aff9a}.stc.nxt{opacity:1;box-shadow:0 0 0 1px var(--se),0 0 14px -4px var(--se)}.stc.nxt .st{color:var(--se)}
.stc.fin{box-shadow:0 0 0 1px var(--rc),0 0 16px -4px var(--rc)}
#seFt{display:flex;justify-content:space-between;gap:14px;font:600 12px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
#seFt span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#seFt b{color:#fff}#seFt .an{color:#ffd24a}
#seToast{position:fixed;bottom:56px;left:12px;z-index:99998;max-width:min(460px,calc(100% - 24px));box-sizing:border-box;cursor:pointer;padding:10px 18px;text-align:left;background:rgba(8,8,10,.96);border:1px solid var(--se,#e5303a);border-left:4px solid var(--se,#e5303a);font:700 14px Rajdhani,sans-serif;letter-spacing:3px;color:#fff;animation:seUp .35s both}@keyframes seUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
#seToast small{display:block;margin-top:2px;font:500 12px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
#ovRw .sxp{margin:4px 0 8px;padding:6px 10px;border-left:3px solid var(--se,#e5303a);background:rgba(8,8,10,.6)}#ovRw .sxp .sx1{font:700 14px Rajdhani,sans-serif;letter-spacing:3px;color:var(--se,#fff)}#ovRw .sxp .sx2{margin-top:2px;font:500 11px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
@media(max-width:1100px){#tabs button{padding:12px 11px;letter-spacing:2px}#crBadge{margin-right:6px;padding:6px 8px}}
@media(max-width:900px){#tabs button{padding:12px 5px;letter-spacing:1px;font-size:11px}#crBadge{margin-left:auto;margin-right:4px;padding:5px 6px;font-size:12px;letter-spacing:1px}#tabs .gear{padding:4px 7px}}
@media(max-width:900px){#seGrid{grid-template-columns:repeat(6,minmax(0,1fr))}#seCal{grid-template-columns:repeat(6,minmax(0,1fr))}}
@media(max-height:760px){#tp-season .sew{gap:6px}.stc{padding:3px}.stc .st{display:none}#tp-season .seh h2{font-size:18px}#tp-season .cd{font-size:20px}}
@media(max-height:640px){.stc canvas{height:max(28px,6vh)}#seCal{display:none}}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.className='tp';panel.id='tp-season';panel.hidden=true;
panel.innerHTML='<div class="sew"><div class="seh"><div><h2 id="seT">SEASON</h2><small id="seS"></small></div><div class="cd"><small>SEASON ENDS IN</small><span id="seCd">--</span></div></div><div id="seCal"></div><div id="sePr"><div class="tn" id="seTn"></div><div class="bar"><i id="seBar"></i></div><div class="xp" id="seXp"></div></div><div id="seGrid"></div><div id="seFt"><span id="seNx"></span><span id="seCt"></span></div></div>';
const anchor=$('tp-shop')||$('tp-maps');anchor.parentNode.insertBefore(panel,anchor.nextSibling);
function applyTheme(){const c=SE.col[0];document.documentElement.style.setProperty('--se',c);panel.style.setProperty('--se',c)}
let cvs=[],tick=0;
function rewardOf(r){if(r.k==='it'){const c=ECO.BYID[r.id];return{c,name:c?c.n.toUpperCase():'?',col:c?ECO.RAR[c.r].col:'#2d2d33'}}
 if(r.k==='pk')return{name:ECO.PACKS[r.p].n.replace(' PACK','')+' PACK'+(r.n>1?' x'+r.n:''),col:ECO.PACKS[r.p].col,pk:r.p};
 return{name:'+'+r.n+' CR',col:'#ffd24a',cr:1}}
function drawCr(cv){const g=cv.getContext('2d');g.clearRect(0,0,48,48);g.fillStyle='#ffd24a';for(let i=0;i<9;i++){const w=i<5?i*2+1:(8-i)*2+1;g.fillRect(24-(w>>1)-0,10+i*3,w,3)}g.fillStyle='#fff0a0';g.fillRect(22,16,3,6)}
function render(){roll();SE=S.seasonAt();applyTheme();const t=S.now(),tier=tierOf(P.xp),done=tier>=TIERS;
 $('seT').textContent='SEASON // '+SE.name;$('seS').textContent=SE.tag+'  //  '+fmtD(SE.start)+' TO '+fmtD(lastSec(SE.end))+' SYDNEY TIME';
 $('seCal').innerHTML=S.calendar(t).map(c=>`<div class="${c.cur?'cur':c.m===+S.nextYm(SE.key).slice(5)?'nx':''}" title="${c.name}">${c.abbr}${c.cur?' // NOW':''}</div>`).join('');
 $('seTn').innerHTML='TIER <b>'+tier+'</b> / '+TIERS;$('seBar').style.width=(done?100:(P.xp%XPT)*100/XPT)+'%';$('seXp').textContent=done?'PASS COMPLETE':(P.xp%XPT)+' / '+XPT+' XP TO TIER '+(tier+1);
 const g=$('seGrid');cvs=[];
 g.innerHTML=SE.tiers.map((r,i)=>{const n=i+1,w=rewardOf(r),got=!!P.got[n],nxt=!got&&n===tier+1,fin=n===TIERS;
  return `<div class="stc ${got?'got':'lk'} ${nxt?'nxt':''} ${fin?'fin':''}" style="--rc:${w.col}"><div class="no">${n}</div><canvas width="48" height="48" data-t="${n}"></canvas><div class="nm" title="${w.name}">${w.name}</div><div class="st">${got?'UNLOCKED':nxt?'NEXT':'LOCKED'}</div></div>`}).join('');
 g.querySelectorAll('canvas').forEach(cv=>{const r=SE.tiers[cv.dataset.t-1];cvs.push([cv,r])});paint();
 const nx=S.seasonKey(S.nextYm(SE.key));$('seNx').innerHTML='NEXT SEASON: <b>'+nx.name+'</b> // STARTS '+fmtD(nx.start);
 const cc=S.content();$('seCt').innerHTML=cc.announce?'<span class="an">'+esc(cc.announce)+'</span>':(window.R6U?window.R6U.status():'');
 cd()}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function paint(){for(const[cv,r]of cvs){if(r.k==='it'){const c=ECO.BYID[r.id];if(c&&ECO.drawPreview)ECO.drawPreview(cv,c,tick)}else if(r.k==='pk'&&ECO.drawPack)ECO.drawPack(cv,r.p,tick);else drawCr(cv)}}
function cd(){const left=SE.end-S.now();if(left<=0){render();return}$('seCd').textContent=cdTxt(left)}
setInterval(()=>{if(panel.hidden)return;tick++;cd();if(tick%2===0)paint()},500);
tb.addEventListener('click',()=>{grantReached();render()});
bus.addEventListener('change',()=>{if(!panel.hidden)render()});
ECO.bus.addEventListener('change',()=>{if(!panel.hidden)paint()});
/* ---------- toast ---------- */
function toast(title,sub,ms){let t=$('seToast');if(t)t.remove();t=document.createElement('div');t.id='seToast';t.setAttribute('role','status');const a=document.createElement('div');a.textContent=title;t.appendChild(a);if(sub){const b=document.createElement('small');b.textContent=sub;t.appendChild(b)}
 t.addEventListener('click',()=>{tb.click();t.remove()});document.body.appendChild(t);setTimeout(()=>{if(t.parentNode)t.remove()},ms||7000)}
window.R6UI={toast,render,showTab:()=>tb.click()};
/* ---------- boot ---------- */
roll();applyTheme();grantReached();
try{if(localStorage.getItem(SEEN)!==SE.key){localStorage.setItem(SEEN,SE.key);toast('NEW SEASON // '+SE.name,SE.tag+' // PASS LIVE UNTIL '+fmtD(lastSec(SE.end))+' SYDNEY TIME')}}catch(e){}
/* season changes while the menu is open: roll over at the exact second */
setInterval(()=>{if(S.seasonAt().key!==P.key){roll();grantReached();applyTheme();if(!panel.hidden)render();toast('NEW SEASON // '+SE.name,SE.tag)}},1000);
})();
