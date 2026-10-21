/* R6 Pixel Siege - site/touch.js
   Website only (tools/build-site.js adds it after web.js). On touch screens it:
   1. sizes the page to the REAL visible area (iOS/Android toolbars, notch, home bar) so nothing is cropped,
   2. fills the screen: the game view is as big as the screen allows and a soft, blurred copy of it fills the
      leftover edges, so it never looks like a small window inside the phone,
   3. shows a small, clean control set during a match (no pages, no MORE):
        left stick  = move (push it all the way out to sprint)      right stick = aim + fire (drag past the dead zone)
        above right stick:  Q  G  1/2  R
        above left stick:   lean left / right, camera, and one smart button: hand = use (attackers: plant/defuse/hostage), planks = barricade (defenders)
        top-left:           pause, then small icon chips: map, ping, rappel hook (attackers) / crowbar (defenders)
   It only sends the same key and mouse events a keyboard and mouse would, so game rules are untouched.
   Portrait shows a solid rotate screen. Force on with ?touch=1, off with ?touch=0. */
(()=>{
const qs=new URLSearchParams(location.search).get('touch');
const touch=qs==='1'||(qs!=='0'&&(matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))));
if(!touch)return;
const $=id=>document.getElementById(id),root=document.documentElement;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ASPECT=480/288;
/* ---------------- icons (stroke SVG, 24x24) ---------------- */
const ic=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const ICO={
 use:ic('<path d="M9 11V5.5a1.6 1.6 0 0 1 3.2 0V10"/><path d="M12.2 9.5V4.4a1.6 1.6 0 0 1 3.2 0V10"/><path d="M15.4 10V6.2a1.6 1.6 0 0 1 3.2 0V14c0 4.2-2.6 7-6.6 7-2.8 0-4.4-1.2-5.8-3.4L4 13.6a1.6 1.6 0 0 1 2.6-1.8L9 15"/>'),
 bar:ic('<path d="M4 3v18M20 3v18"/><rect x="2.5" y="6.5" width="19" height="4" rx=".8"/><rect x="2.5" y="13.5" width="19" height="4" rx=".8"/><path d="M6.5 8.5h.01M17.5 8.5h.01M6.5 15.5h.01M17.5 15.5h.01" stroke-width="2.6"/>'),
 cam:ic('<rect x="2.5" y="6.5" width="13" height="11" rx="2.5"/><path d="M15.5 10.8 21.5 7.5v9l-6-3.3z"/>'),
 map:ic('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>'),
 ping:ic('<circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M7.6 7.6a6.2 6.2 0 0 0 0 8.8M16.4 7.6a6.2 6.2 0 0 1 0 8.8M4.6 4.6a10.4 10.4 0 0 0 0 14.8M19.4 4.6a10.4 10.4 0 0 1 0 14.8"/>'),
 rap:ic('<circle cx="12" cy="4.6" r="2.2"/><path d="M12 6.8V16a4.6 4.6 0 0 1-9.2 0v-3.2"/><path d="M2.8 12.8l-1.6 2M2.8 12.8l1.6 2"/>'),
 crow:ic('<path d="M3.5 20.5 17 7"/><path d="M17 7C17.4 4.2 19.8 2.8 22.2 3.8M22.2 3.8 20.6 7"/><path d="M2.4 19.4l2.2 2.2"/>'),
 rl:ic('<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.8 3.8v4.6h-4.6"/>'),
 lnl:ic('<path d="M3 21.5h18" opacity=".55"/><circle cx="9.5" cy="7" r="2.7"/><path d="M14 21 10.8 10.8"/><path d="M5 3.6 2.4 6.6 5 9.6"/>'),
 lnr:ic('<path d="M3 21.5h18" opacity=".55"/><circle cx="14.5" cy="7" r="2.7"/><path d="M10 21 13.2 10.8"/><path d="M19 3.6l2.6 3-2.6 3"/>')
};
/* ---------------- styles ---------------- */
const st=document.createElement('style');st.textContent=`
html{touch-action:manipulation;position:fixed!important;left:0;top:0;width:var(--iw,100%)!important;height:var(--ih,100%)!important;box-sizing:border-box!important;overflow:hidden!important;
 padding:var(--st,0px) var(--sr,0px) var(--sb,0px) var(--sl,0px)!important;overscroll-behavior:none;-webkit-text-size-adjust:100%;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
body{width:100%!important;height:100%!important;margin:0!important;overflow:hidden!important;overscroll-behavior:none}
#wrap{height:100%!important}
#c{width:var(--cw,min(100vw,calc(100vh*1.6667)))!important;position:relative;z-index:1}
body.tcm{background:transparent!important}
body.tcm #c{box-shadow:0 0 28px 14px rgba(5,8,12,.45)}
#tcAmb{position:fixed;left:0;top:0;width:var(--iw,100%);height:var(--ih,100%);z-index:-1;display:none;pointer-events:none}
body.tcm #tcAmb{display:block}
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
.tcg.r{right:calc(var(--sr,0px) + var(--er));grid-template-columns:repeat(2,var(--u))}
.tcg.t{bottom:auto;top:calc(var(--st,0px) + var(--mg) + var(--u)*.15);left:calc(var(--sl,0px) + var(--el) + var(--u) + var(--gap));grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:var(--u)}
.tcb.sm{height:calc(var(--u)*.7);border-radius:calc(var(--u)*.24);background:rgba(10,13,18,.42);border-color:rgba(255,255,255,.22)}
.tcb.hid{display:none}
.tcb svg{width:calc(var(--u)*.52);height:calc(var(--u)*.52);display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.tcb.sm svg{width:calc(var(--u)*.4);height:calc(var(--u)*.4)}
.tcb b{font:400 calc(var(--f) + 4px)/1 Silkscreen,monospace;pointer-events:none}
#tcL.run{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.08)}
.tcb{width:var(--u);height:var(--u);border-radius:calc(var(--u)*.3);background:rgba(10,13,18,.5);border:1.5px solid rgba(255,255,255,.3);color:#e9edf2;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:auto;white-space:nowrap;overflow:hidden;position:relative}
.tcb::before{content:"";position:absolute;inset:-3px}
.tcb.dn{background:rgba(229,48,58,.72);border-color:#fff;color:#fff}
.tcb s{text-decoration:none;opacity:.4;padding:0 2px}.tcb s.on{opacity:1;color:#ff6a72}.tcb.dn s.on{color:#fff}
#gmenu{width:var(--u)!important;height:var(--u)!important;padding:0!important;border-radius:calc(var(--u)*.3)!important;
 left:calc(var(--sl,0px) + var(--el))!important;top:calc(var(--st,0px) + var(--mg))!important;right:auto!important;bottom:auto!important;background:rgba(10,13,18,.5)!important;border:1.5px solid rgba(255,255,255,.3)!important;z-index:41!important}
#gmenu .tcp{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:4px}
#gmenu i{display:block;width:4px;height:36%;background:#e9edf2;border-radius:1px}
#tcFs{position:fixed;left:calc(var(--sl,0px) + 8px);bottom:calc(var(--sb,0px) + 8px);width:30px;height:30px;padding:0;z-index:9;display:flex;align-items:center;justify-content:center;background:rgba(10,13,18,.55);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px}
#tcFs svg{width:14px;height:14px;display:block}body.tcm #tcFs{display:none}
#tcRot{position:fixed;left:0;top:0;width:var(--iw,100vw);height:var(--ih,100vh);z-index:2147483000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:#05080c;color:#e9edf2;font:400 13px Silkscreen,monospace;letter-spacing:3px;text-align:center;padding:30px;box-sizing:border-box;border-top:3px solid #e5303a}
#tcRot.on{display:flex}
@media (orientation:portrait) and (max-width:600px){#tcRot{display:flex}}
body.trot>*:not(#tcRot){visibility:hidden!important}
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
w.innerHTML=`<div class="tcs" id="tcL"><i></i></div><div class="tcs" id="tcR"><i></i><b>FIRE</b></div><div class="tcg l m" id="tcGL"></div><div class="tcg t" id="tcGT"></div><div class="tcg r" id="tcGR"></div>`;
document.body.appendChild(w);
const amb=document.createElement('canvas');amb.id='tcAmb';amb.width=64;amb.height=32;document.body.insertBefore(amb,document.body.firstChild);const actx=amb.getContext('2d');
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
 const u=clamp(Math.round(H*.125),34,46),S=clamp(Math.round(H*.25),76,100),K=Math.round(S*.42),mg=clamp(Math.round(H*.03),8,12),gap=Math.max(5,Math.round(u*.13));
 const el=m.sl>8?8:Math.max(mg,18),er=m.sr>8?8:Math.max(mg,18),f=clamp(u*.2,7.5,9.5);   /* a notch inset already keeps us off the screen edge (and the iOS back-swipe zone) */
 const availW=W-m.sl-m.sr,availH=H-m.st-m.sb;
 let cw=Math.min(availW,availH*ASPECT);   /* as big as the screen allows; the controls float over the edges and the blurred fill hides the rest */
 cw=Math.floor(cw);
 const set=(k,v)=>s.setProperty(k,v);
 set('--iw',W+'px');set('--ih',H+'px');set('--st',m.st+'px');set('--sr',m.sr+'px');set('--sb',m.sb+'px');set('--sl',m.sl+'px');set('--cw',cw+'px');amb.height=Math.max(24,Math.round(64*H/W));
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
const down=new Set();let run=false,swB=null,useB=null,rapB=null;
function setRun(on){if(run===on)return;run=on;kev(on?'keydown':'keyup',key('sprint'));$('tcL').classList.toggle('run',on)}
const side=()=>(typeof G!=='undefined'&&G&&G.me&&G.me.side)||'A';
/* ---------------- buttons ---------------- */
function mkBtn(host,lab,act,mode,cls){
 const b=document.createElement('div');b.className='tcb'+(cls?' '+cls:'');b.innerHTML=lab;
 const rel=()=>{if(!down.delete(b))return;b.classList.remove('dn');if(mode==='hold'&&b._a)kev('keyup',key(b._a))};
 b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}
  const a=typeof act==='function'?act():act;b._a=a;
  down.add(b);b.classList.add('dn');
  if(a==='sw'){const k=key(G&&G.me&&G.me.sel?'w1':'w2');kev('keydown',k);kev('keyup',k);return}
  kev('keydown',key(a));if(mode==='tap')setTimeout(()=>kev('keyup',key(a)),60)});
 b.addEventListener('pointerup',rel);b.addEventListener('pointercancel',rel);host.appendChild(b);return b}
const GL=$('tcGL'),GT=$('tcGT'),GR=$('tcGR');$('tcGX')&&$('tcGX').remove();
/* right cluster: top row Q G, bottom row 1/2 R */
mkBtn(GR,'<b>Q</b>','gad','tap');mkBtn(GR,'<b>G</b>','gad2','tap');swB=mkBtn(GR,'<s class="on">1</s><s>2</s>','sw','tap');mkBtn(GR,ICO.rl,'reload','tap');
/* left cluster: lean chips on top, then CAM + one smart button (USE for attackers, BAR for defenders) */
mkBtn(GL,ICO.lnl,'lnl','hold','sm');mkBtn(GL,ICO.lnr,'lnr','hold','sm');
mkBtn(GL,ICO.cam,'cam','tap');useB=mkBtn(GL,ICO.use,()=>side()==='D'?'barr':'use','hold');
/* top row, right of pause: the occasional actions */
mkBtn(GT,ICO.map,'map','tap','sm');mkBtn(GT,ICO.ping,'ping','tap','sm');rapB=mkBtn(GT,ICO.rap,()=>side()==='D'?'crow':'rap','hold','sm');
/* ---------------- sticks ---------------- */
function stick(el,onMove,onEnd){let id=null,cx=0,cy=0,R=40;const knob=el.querySelector('i');
 el.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();id=e.pointerId;try{el.setPointerCapture(id)}catch(_){}const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;R=Math.max(20,(r.width-knob.offsetWidth)/2);mv(e)});
 const mv=e=>{if(e.pointerId!==id)return;let dx=e.clientX-cx,dy=e.clientY-cy;const m=Math.hypot(dx,dy)||1,k=Math.min(1,m/R);dx=dx/m*k;dy=dy/m*k;knob.style.transform=`translate(${dx*R}px,${dy*R}px)`;onMove(dx,dy,k)};
 const end=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';onEnd()};
 el.addEventListener('pointermove',mv);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
const dirs={w:0,a:0,s:0,d:0};
function setDir(k,on){if(dirs[k]!==on){dirs[k]=on;keys[k]=!!on}}
stick($('tcL'),(dx,dy,m)=>{const on=m>.3;setDir('d',on&&dx>.38);setDir('a',on&&dx<-.38);setDir('s',on&&dy>.38);setDir('w',on&&dy<-.38);
 setRun(run?m>.72:m>.93)},()=>{for(const k in dirs)setDir(k,0);setRun(false)});   /* push the stick all the way out = sprint */
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
 if(was&&!on)releaseAll();was=on;
 const portrait=innerHeight>innerWidth,needRot=portrait&&(on||Math.min(innerWidth,innerHeight)<600);
 rot.classList.toggle('on',needRot);document.body.classList.toggle('trot',needRot);
 if(portrait&&on&&!lastPort&&typeof setPause==='function')setPause(true);     /* turned the phone upright mid-match: pause it */
 lastPort=portrait;
 if(on&&G&&G.me){const d=side()==='D';if(useB&&useB._d!==d){useB._d=d;useB.innerHTML=d?ICO.bar:ICO.use}if(rapB&&rapB._d!==d){rapB._d=d;rapB.innerHTML=d?ICO.crow:ICO.rap}}
 if(on&&G&&G.me&&swB){const s=G.me.sel?1:0;if(s!==lastSel){lastSel=s;swB.innerHTML=s?'<s>1</s><s class="on">2</s>':'<s class="on">1</s><s>2</s>'}}}
setInterval(tick,150);addEventListener('resize',()=>tick());addEventListener('orientationchange',()=>setTimeout(tick,60));tick();
/* soft blurred copy of the game fills the screen behind the game view (cheap: a 64px canvas stretched up) */
let at=0;(function ambLoop(t){requestAnimationFrame(ambLoop);if(!document.body.classList.contains('tcm')||t-at<80)return;at=t;
 const c=canv(),aw=amb.width,ah=amb.height,sc=Math.max(aw/VW,ah/VH),dw=VW*sc,dh=VH*sc;
 try{actx.drawImage(c,(aw-dw)/2,(ah-dh)/2,dw,dh);actx.fillStyle='rgba(5,8,12,.5)';actx.fillRect(0,0,aw,ah)}catch(e){}})(0);
addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
})();
