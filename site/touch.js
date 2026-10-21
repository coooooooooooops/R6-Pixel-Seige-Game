/* R6 Pixel Siege - site/touch.js
   Website only (tools/build-site.js adds it after web.js). On touch screens it:
   1. sizes the page to the REAL visible area (iOS/Android toolbars, notch, home bar) so nothing is cropped,
   2. fits the game view to the screen and parks the controls in the empty side bars instead of on top of the game,
   3. shows a small, clean control set during a match:
        left stick = move, right stick = aim + fire (drag past the dead zone to shoot),
        right cluster  Q  G  1/2  R        left cluster  CAM  ...  RUN  USE      ("..." swaps the left cluster for
        BAR CROW RAP MAP PING CANCEL LEAN- LEAN+), top-right pause. Tap/hold on the game view = mouse click/hold.
   It only sends the same key and mouse events a keyboard and mouse would, so game rules are untouched.
   Force on with ?touch=1, off with ?touch=0. */
(()=>{
const qs=new URLSearchParams(location.search).get('touch');
const touch=qs==='1'||(qs!=='0'&&(matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))));
if(!touch)return;
const $=id=>document.getElementById(id),root=document.documentElement;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ASPECT=480/288;
/* ---------------- styles ---------------- */
const st=document.createElement('style');st.textContent=`
html{touch-action:manipulation;position:fixed!important;left:0;top:0;width:var(--iw,100%)!important;height:var(--ih,100%)!important;box-sizing:border-box!important;overflow:hidden!important;
 padding:var(--st,0px) var(--sr,0px) var(--sb,0px) var(--sl,0px)!important;overscroll-behavior:none;-webkit-text-size-adjust:100%;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
body{width:100%!important;height:100%!important;margin:0!important;overflow:hidden!important;overscroll-behavior:none}
#wrap{height:100%!important}
#c{width:var(--cw,min(100vw,calc(100vh*1.6667)))!important}
input,textarea{-webkit-user-select:text;user-select:text}
body.tcm{-webkit-user-select:none;user-select:none}
body.tcm #seToast,body.tcm #r6wCard{display:none!important}
#seToast{top:auto!important;bottom:calc(var(--sb,0px) + 6px)!important;left:50%!important;transform:translateX(-50%);width:max-content;max-width:min(230px,30vw)!important;padding:5px 9px!important;font-size:9px!important;letter-spacing:1px!important;line-height:1.3!important;animation:none!important;border-left-width:3px!important}
#seToast small{font-size:8px!important;letter-spacing:.5px!important;margin-top:1px!important}
#tcw{position:fixed;left:0;top:0;width:var(--iw,100%);height:var(--ih,100%);z-index:40;pointer-events:none;display:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
 font:400 var(--f,9px)/1 Silkscreen,monospace;letter-spacing:.5px}
#tcw.on{display:block}#tcw *{touch-action:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
.tcs{position:absolute;bottom:calc(var(--sb,0px) + var(--mg));width:var(--S);height:var(--S);border-radius:50%;background:rgba(10,13,18,.28);border:1.5px solid rgba(255,255,255,.22);pointer-events:auto}
.tcs::before{content:"";position:absolute;inset:-14px}
.tcs::after{content:"";position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:rgba(255,255,255,.25)}
.tcs i{position:absolute;left:50%;top:50%;width:var(--K);height:var(--K);margin:calc(var(--K)/-2) 0 0 calc(var(--K)/-2);border-radius:50%;background:rgba(255,255,255,.22);border:1.5px solid rgba(255,255,255,.5);z-index:1}
#tcL{left:calc(var(--sl,0px) + var(--el))}
#tcR{right:calc(var(--sr,0px) + var(--er));border-color:rgba(229,48,58,.55)}
#tcR i{background:rgba(229,48,58,.5);border-color:rgba(255,255,255,.6)}
#tcR.fire{background:rgba(229,48,58,.22)}
#tcR b{position:absolute;left:0;right:0;top:calc(50% + var(--K)/2 + 5px);text-align:center;color:rgba(255,255,255,.4);font-weight:400;font-size:calc(var(--f) - 1px);letter-spacing:2px}
.tcg{position:absolute;display:grid;gap:var(--gap);bottom:calc(var(--sb,0px) + var(--mg)*2 + var(--S));pointer-events:none}
.tcg.l{left:calc(var(--sl,0px) + var(--el));grid-template-columns:repeat(2,var(--u))}
.tcg.l.x{grid-template-columns:repeat(3,var(--u));display:none}
.tcg.r{right:calc(var(--sr,0px) + var(--er));grid-template-columns:repeat(2,var(--u))}
#tcw.more .tcg.l.x{display:grid}#tcw.more .tcg.m{display:none}
.tcb{width:var(--u);height:var(--u);border-radius:calc(var(--u)*.3);background:rgba(10,13,18,.5);border:1.5px solid rgba(255,255,255,.3);color:#e9edf2;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:auto;white-space:nowrap;overflow:hidden;position:relative}
.tcb::before{content:"";position:absolute;inset:-3px}
.tcb.dn{background:rgba(229,48,58,.72);border-color:#fff;color:#fff}
.tcb.pg{border-color:rgba(255,255,255,.18);color:#b9c0cb}
.tcb s{text-decoration:none;opacity:.4;padding:0 2px}.tcb s.on{opacity:1;color:#ff6a72}.tcb.dn s.on{color:#fff}
#gmenu{width:var(--u)!important;height:var(--u)!important;padding:0!important;border-radius:calc(var(--u)*.3)!important;
 right:calc(var(--sr,0px) + var(--er))!important;top:calc(var(--st,0px) + var(--mg))!important;left:auto!important;bottom:auto!important;background:rgba(10,13,18,.5)!important;border:1.5px solid rgba(255,255,255,.3)!important;z-index:41!important}
#gmenu .tcp{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:4px}
#gmenu i{display:block;width:4px;height:36%;background:#e9edf2;border-radius:1px}
#tcFs{position:fixed;left:calc(var(--sl,0px) + 8px);bottom:calc(var(--sb,0px) + 8px);width:30px;height:30px;padding:0;z-index:9;display:flex;align-items:center;justify-content:center;background:rgba(10,13,18,.55);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px}
#tcFs svg{width:14px;height:14px;display:block}body.tcm #tcFs{display:none}
#tcRot{position:fixed;left:0;top:0;width:var(--iw,100%);height:var(--ih,100%);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:rgba(5,8,12,.96);color:#e9edf2;font:400 13px Silkscreen,monospace;letter-spacing:3px;text-align:center;padding:30px}
#tcRot.on{display:flex}
#tcRot .ph{width:34px;height:58px;border:3px solid #e9edf2;border-radius:8px;position:relative;animation:tcRot 2.4s ease-in-out infinite}
#tcRot .ph::after{content:"";position:absolute;left:50%;bottom:4px;width:10px;height:2px;margin-left:-5px;background:#e5303a}
@keyframes tcRot{0%,15%{transform:rotate(0)}55%,100%{transform:rotate(-90deg)}}
`;document.head.appendChild(st);
/* viewport meta: no pinch / double-tap zoom, no focus-zoom on inputs */
(()=>{let m=document.querySelector('meta[name=viewport]');if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m)}
 m.content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'})();
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.id==='seToast')setTimeout(()=>{if(n.parentNode)n.remove()},3200)}).observe(document.body,{childList:true});
{const t0=$('seToast');if(t0)setTimeout(()=>{if(t0.parentNode)t0.remove()},3200)}
/* ---------------- DOM ---------------- */
const w=document.createElement('div');w.id='tcw';
w.innerHTML=`<div class="tcs" id="tcL"><i></i></div><div class="tcs" id="tcR"><i></i><b>FIRE</b></div><div class="tcg l m" id="tcGL"></div><div class="tcg l x" id="tcGX"></div><div class="tcg r" id="tcGR"></div>`;
document.body.appendChild(w);
const rot=document.createElement('div');rot.id='tcRot';rot.innerHTML='<div class="ph"></div><div>ROTATE YOUR PHONE<br><span style="color:#8b8d95;font-size:10px;letter-spacing:2px;line-height:2">LANDSCAPE ONLY</span></div>';document.body.appendChild(rot);
const gm=$('gmenu');if(gm){gm.innerHTML='<span class="tcp"><i></i><i></i></span>';gm.setAttribute('aria-label','Pause');gm.title='Pause'}
/* ---------------- measuring the real screen ---------------- */
const pr=document.createElement('div');
pr.style.cssText='position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;box-sizing:content-box;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
document.body.appendChild(pr);
let M={W:innerWidth,H:innerHeight,st:0,sr:0,sb:0,sl:0};
const typing=()=>{const a=document.activeElement;return!!a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)};
function measure(){
 const cs=getComputedStyle(pr),vv=window.visualViewport;let W=innerWidth,H=innerHeight;
 if(vv&&Math.abs(vv.scale-1)<.02){W=Math.min(W,vv.width);H=Math.min(H,vv.height)}
 const sv=parseFloat(cs.height);if(sv>120)H=Math.min(H,sv);
 return{W:Math.floor(W),H:Math.floor(H),st:parseFloat(cs.paddingTop)||0,sr:parseFloat(cs.paddingRight)||0,sb:parseFloat(cs.paddingBottom)||0,sl:parseFloat(cs.paddingLeft)||0}}
function apply(){
 const m=measure();
 if(typing()&&m.H<M.H*.85)return;           /* on-screen keyboard: keep the layout, do not shrink everything */
 M=m;const{W,H}=m,s=root.style;
 const u=clamp(Math.round(H*.125),34,46),S=clamp(Math.round(H*.27),80,112),K=Math.round(S*.42),mg=clamp(Math.round(H*.03),8,12),gap=Math.max(5,Math.round(u*.13));
 const el=m.sl>8?8:Math.max(mg,18),er=m.sr>8?8:Math.max(mg,18),f=clamp(u*.2,7.5,9.5);   /* a notch inset already keeps us off the screen edge (and the iOS back-swipe zone) */
 const availW=W-m.sl-m.sr,availH=H-m.st-m.sb;
 let cw=Math.min(availW,availH*ASPECT);
 const gw=Math.max(S,2*u+gap),lim=availW-(el+er)-2*(gw+4);       /* leave room for the controls beside the game if we can */
 if(lim<cw)cw=Math.max(lim,cw*.88);
 cw=Math.floor(cw);
 const set=(k,v)=>s.setProperty(k,v);
 set('--iw',W+'px');set('--ih',H+'px');set('--st',m.st+'px');set('--sr',m.sr+'px');set('--sb',m.sb+'px');set('--sl',m.sl+'px');set('--cw',cw+'px');
 for(const[k,v]of[['--u',u],['--S',S],['--K',K],['--mg',mg],['--gap',gap],['--el',el],['--er',er],['--f',f]])set(k,v+'px');
 if(window.scrollX||window.scrollY)scrollTo(0,0);
 if(window.R6Fit)R6Fit.fit()}
let tmo=[];function settle(){tmo.forEach(clearTimeout);apply();tmo=[80,250,600,1200].map(d=>setTimeout(apply,d))}
addEventListener('resize',settle);addEventListener('orientationchange',settle);addEventListener('pageshow',settle);addEventListener('load',settle);
if(window.visualViewport){visualViewport.addEventListener('resize',()=>apply());visualViewport.addEventListener('scroll',()=>{if(!typing())scrollTo(0,0)})}
document.addEventListener('focusout',()=>setTimeout(settle,120));
addEventListener('scroll',()=>{if(!typing()&&(scrollX||scrollY))scrollTo(0,0)});
apply();settle();
/* ---------------- fullscreen button: only where the browser can do it (not iPhone) ---------------- */
const canFs=!!(root.requestFullscreen||root.webkitRequestFullscreen);
function fixFs(){const b=[...document.body.children].find(x=>x.tagName==='BUTTON'&&x.title==='Fullscreen');if(!b)return;
 if(!canFs){b.remove();return}
 b.id='tcFs';b.removeAttribute('style');b.innerHTML='<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M2 7V2h5M11 2h5v5M16 11v5h-5M7 16H2v-5"/></svg>'}
fixFs();setTimeout(fixFs,300);
/* ---------------- input plumbing ---------------- */
const key=a=>(typeof BIND!=='undefined'&&BIND[a])||DEFB[a];
const kev=(t,k)=>window.dispatchEvent(new KeyboardEvent(t,{key:k,bubbles:true}));
const canv=()=>$('c');
const mev=(el,t,x,y,b)=>el.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,button:b||0,bubbles:true,cancelable:true}));
const down=new Set();let run=false,runB=null,swB=null,pageB=null;
function setRun(on){if(run===on)return;run=on;kev(on?'keydown':'keyup',key('sprint'));if(runB)runB.classList.toggle('dn',on)}
/* ---------------- buttons ---------------- */
function mkBtn(host,lab,act,mode){
 const b=document.createElement('div');b.className='tcb'+(mode==='page'?' pg':'');b.innerHTML=lab;
 const rel=()=>{if(!down.delete(b))return;if(mode==='hold'){b.classList.remove('dn');kev('keyup',key(act))}else if(mode==='tap')b.classList.remove('dn')};
 b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}
  if(mode==='page'){w.classList.toggle('more');return}
  if(mode==='latch'){setRun(!run);return}
  down.add(b);b.classList.add('dn');
  if(act==='sw'){const k=key(G&&G.me&&G.me.sel?'w1':'w2');kev('keydown',k);kev('keyup',k);return}
  if(act==='rc'){const[x,y]=aimClient();mev(canv(),'mousedown',x,y,2);return}
  kev('keydown',key(act));if(mode==='tap')setTimeout(()=>kev('keyup',key(act)),60)});
 b.addEventListener('pointerup',rel);b.addEventListener('pointercancel',rel);host.appendChild(b);return b}
const GL=$('tcGL'),GX=$('tcGX'),GR=$('tcGR');
/* right cluster: top row Q G, bottom row 1/2 R */
mkBtn(GR,'Q','gad','tap');mkBtn(GR,'G','gad2','tap');swB=mkBtn(GR,'<s class="on">1</s><s>2</s>','sw','tap');mkBtn(GR,'R','reload','tap');
/* left cluster: top row CAM ..., bottom row RUN USE */
mkBtn(GL,'CAM','cam','tap');pageB=mkBtn(GL,'MORE','more','page');runB=mkBtn(GL,'RUN','sprint','latch');mkBtn(GL,'USE','use','hold');
/* left cluster, second page */
[['BAR','barr','hold'],['CROW','crow','hold'],['RAP','rap','hold'],['MAP','map','tap'],['PING','ping','tap'],['CANCEL','rc','tap'],['LEAN-','lnl','hold'],['LEAN+','lnr','hold']].forEach(d=>mkBtn(GX,d[0],d[1],d[2]));
mkBtn(GX,'BACK','more','page');
/* ---------------- sticks ---------------- */
function stick(el,onMove,onEnd){let id=null,cx=0,cy=0,R=40;const knob=el.querySelector('i');
 el.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();id=e.pointerId;try{el.setPointerCapture(id)}catch(_){}const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;R=Math.max(20,(r.width-knob.offsetWidth)/2);mv(e)});
 const mv=e=>{if(e.pointerId!==id)return;let dx=e.clientX-cx,dy=e.clientY-cy;const m=Math.hypot(dx,dy)||1,k=Math.min(1,m/R);dx=dx/m*k;dy=dy/m*k;knob.style.transform=`translate(${dx*R}px,${dy*R}px)`;onMove(dx,dy,k)};
 const end=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';onEnd()};
 el.addEventListener('pointermove',mv);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
const dirs={w:0,a:0,s:0,d:0};
function setDir(k,on){if(dirs[k]!==on){dirs[k]=on;keys[k]=!!on}}
stick($('tcL'),(dx,dy,m)=>{const on=m>.3;setDir('d',on&&dx>.38);setDir('a',on&&dx<-.38);setDir('s',on&&dy>.38);setDir('w',on&&dy<-.38)},()=>{for(const k in dirs)setDir(k,0);setRun(false)});
let aim=[240,144],firing=false;
function aimClient(){const r=canv().getBoundingClientRect();return[r.left+aim[0]/VW*r.width,r.top+aim[1]/VH*r.height]}
const tcR=$('tcR');
stick(tcR,(dx,dy,m)=>{
 let rx=VW/2,ry=VH/2;if(G&&G.me&&G.cv<0&&!DRN()){rx=G.me.x-cam.x;ry=G.me.y-cam.y}
 if(m>.25){aim=[Math.max(0,Math.min(VW,rx+dx*110)),Math.max(0,Math.min(VH,ry+dy*110))];mouse.x=aim[0];mouse.y=aim[1]}
 const f=m>.55;if(f&&!firing){firing=true;tcR.classList.add('fire');const[x,y]=aimClient();mev(canv(),'mousedown',x,y,0)}else if(!f&&firing){firing=false;tcR.classList.remove('fire');mouse.down=false}},
 ()=>{if(firing){firing=false;mouse.down=false}tcR.classList.remove('fire')});
/* ---------------- tap / hold on the game view itself = mouse ---------------- */
let vp=null;
const cvOn=(t,e)=>{if(t==='touchstart'){if(vp!==null)return;vp=e.changedTouches[0].identifier}const tc=[...e.changedTouches].find(x=>x.identifier===vp);if(!tc)return;e.preventDefault();
 const[x,y]=[tc.clientX,tc.clientY];if(t==='touchstart'){mev(canv(),'mousemove',x,y);mev(canv(),'mousedown',x,y,0)}else if(t==='touchmove')mev(canv(),'mousemove',x,y);else{mev(window,'mouseup',x,y);vp=null}};
for(const t of['touchstart','touchmove','touchend','touchcancel'])canv().addEventListener(t,e=>cvOn(t,e),{passive:false});
/* ---------------- show only during a match; release everything when it ends ---------------- */
function inMatch(){return typeof G!=='undefined'&&G&&$('menu').style.display==='none'&&$('over').style.display==='none'&&getComputedStyle($('load')).display==='none'&&!PAUSED}
function releaseAll(){for(const k in dirs)setDir(k,0);setRun(false);mouse.down=false;firing=false;tcR.classList.remove('fire');
 for(const b of down){b.classList.remove('dn')}down.clear();for(const k of['reload','gad','gad2','use','cam','barr','crow','rap','map','ping','lnl','lnr'])kev('keyup',key(k))}
let was=false,lastSel=-1,lastPort=false;
function tick(){
 const on=inMatch();w.classList.toggle('on',on);document.body.classList.toggle('tcm',on);
 if(was&&!on){releaseAll();w.classList.remove('more')}was=on;
 const portrait=innerHeight>innerWidth,needRot=portrait&&(on||Math.min(innerWidth,innerHeight)<600);
 rot.classList.toggle('on',needRot);
 if(portrait&&on&&!lastPort&&typeof setPause==='function')setPause(true);     /* turned the phone upright mid-match: pause it */
 lastPort=portrait;
 if(on&&G&&G.me&&swB){const s=G.me.sel?1:0;if(s!==lastSel){lastSel=s;swB.innerHTML=s?'<s>1</s><s class="on">2</s>':'<s class="on">1</s><s>2</s>'}}}
setInterval(tick,150);
addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
})();
