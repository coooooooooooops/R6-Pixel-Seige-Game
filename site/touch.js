/* R6 Pixel Siege - site/touch.js
   Website only (tools/build-site.js adds it after web.js). On touch screens it overlays on-screen controls during a match:
   left stick = move, right stick = aim + fire (drag past the dead zone to shoot), buttons for the keys, tap/hold the
   game view itself = mouse click/hold (reinforce walls, tag from drone, EXIT VIEW). It only sends the same key and mouse
   events a keyboard and mouse would, so game rules are untouched. Force on with ?touch=1, off with ?touch=0. */
(()=>{
const q=new URLSearchParams(location.search).get('touch');
const touch=q==='1'||(q!=='0'&&(matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))));
if(!touch)return;
const $=id=>document.getElementById(id);
const st=document.createElement('style');st.textContent=`
#tcw{position:fixed;inset:0;z-index:40;pointer-events:none;display:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;font:400 11px Silkscreen,monospace;letter-spacing:1px}
#tcw.on{display:block}#tcw *{touch-action:none;-webkit-tap-highlight-color:transparent}
.tcs{position:absolute;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:128px;height:128px;border-radius:50%;background:rgba(10,13,18,.38);border:2px solid rgba(255,255,255,.28);pointer-events:auto}
.tcs i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(229,48,58,.55);border:2px solid rgba(255,255,255,.55)}
#tcL{left:calc(14px + env(safe-area-inset-left,0px))}#tcR{right:calc(14px + env(safe-area-inset-right,0px));border-color:rgba(229,48,58,.6)}
#tcR b{position:absolute;left:0;right:0;top:50%;margin-top:-6px;text-align:center;color:rgba(255,255,255,.55);font-weight:400}
.tcb{position:absolute;width:50px;height:50px;border-radius:50%;background:rgba(10,13,18,.5);border:2px solid rgba(255,255,255,.35);color:#fff;display:flex;align-items:center;justify-content:center;pointer-events:auto;text-align:center;line-height:1.1}
.tcb.dn{background:rgba(229,48,58,.7);border-color:#fff}
#tcMore{display:none}#tcw.more #tcMore{display:block}
#tcRot{position:fixed;inset:0;z-index:41;display:none;align-items:center;justify-content:center;background:rgba(5,8,12,.9);color:#fff;font:400 14px Silkscreen,monospace;letter-spacing:3px;text-align:center;padding:30px}
#seToast,#r6wCard{pointer-events:none}
#seToast *,#r6wCard *{pointer-events:none}
@media (orientation:portrait){#tcw.on~#tcRot{display:flex}}
`;document.head.appendChild(st);
const w=document.createElement('div');w.id='tcw';
w.innerHTML=`<div class="tcs" id="tcL"><i></i></div><div class="tcs" id="tcR"><i></i><b>FIRE</b></div><div id="tcBtns"></div><div id="tcMore"></div>`;
document.body.appendChild(w);
const rot=document.createElement('div');rot.id='tcRot';rot.textContent='ROTATE YOUR PHONE TO PLAY';document.body.appendChild(rot);
const key=a=>(typeof BIND!=='undefined'&&BIND[a])||DEFB[a];
const kev=(t,k)=>window.dispatchEvent(new KeyboardEvent(t,{key:k,bubbles:true}));
const canv=()=>$('c');
function cpt(x,y){const r=canv().getBoundingClientRect();return[(x-r.left)/r.width*VW,(y-r.top)/r.height*VH]}
const mev=(el,t,x,y,b)=>el.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,button:b||0,bubbles:true,cancelable:true}));
/* ---- buttons: [label, action key name, mode, x-from-right, y-from-bottom] ---- */
const main=[['R','reload','tap',0,0],['Q','gad','tap',1,0],['G','gad2','tap',2,0],['USE','use','hold',3,0],['CAM','cam','tap',0,1],['RUN','sprint','hold',1,1],['1/2','sw','tap',2,1],['...','more','tog',3,1]];
const more=[['BAR','barr','hold',0,2],['CROW','crow','hold',1,2],['RAP','rap','hold',2,2],['MAP','map','tap',3,2],['PING','ping','tap',0,3],['LEAN-','lnl','hold',1,3],['LEAN+','lnr','hold',2,3],['CANCEL','rc','tap',3,3]];
let sw=0;const down=new Set();
function mkBtn(host,[lab,act,mode,col,row]){const rx=150+col*56,by=14+row*56;
 const b=document.createElement('div');b.className='tcb';b.textContent=lab;b.style.right=`calc(${rx}px + env(safe-area-inset-right,0px))`;b.style.bottom=`calc(${by}px + env(safe-area-inset-bottom,0px))`;
 const rel=()=>{b.classList.remove('dn');if(down.delete(b)&&mode==='hold')kev('keyup',key(act))};
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('dn');down.add(b);
  if(act==='more'){w.classList.toggle('more');return}
  if(act==='sw'){sw^=1;kev('keydown',sw?'2':'1');kev('keyup',sw?'2':'1');return}
  if(act==='rc'){const[x,y]=aimClient();mev(canv(),'mousedown',x,y,2);return}
  kev('keydown',key(act));if(mode==='tap')setTimeout(()=>kev('keyup',key(act)),60)});
 b.addEventListener('pointerup',rel);b.addEventListener('pointercancel',rel);host.appendChild(b)}
main.forEach(d=>mkBtn($('tcBtns'),d));more.forEach(d=>mkBtn($('tcMore'),d));
/* ---- sticks ---- */
function stick(el,onMove,onEnd){let id=null,cx=0,cy=0;const knob=el.querySelector('i'),R=48;
 el.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();id=e.pointerId;el.setPointerCapture(id);const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;mv(e)});
 const mv=e=>{if(e.pointerId!==id)return;let dx=e.clientX-cx,dy=e.clientY-cy;const m=Math.hypot(dx,dy)||1,k=Math.min(1,m/R);dx=dx/m*k;dy=dy/m*k;knob.style.transform=`translate(${dx*R}px,${dy*R}px)`;onMove(dx,dy,k)};
 const end=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';onEnd()};
 el.addEventListener('pointermove',mv);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
const dirs={w:0,a:0,s:0,d:0};
function setDir(k,on){if(dirs[k]!==on){dirs[k]=on;keys[k]=!!on}}
stick($('tcL'),(dx,dy,m)=>{const on=m>.3;setDir('d',on&&dx>.38);setDir('a',on&&dx<-.38);setDir('s',on&&dy>.38);setDir('w',on&&dy<-.38)},()=>{for(const k in dirs)setDir(k,0)});
let aim=[240,144],firing=false;
function aimClient(){const r=canv().getBoundingClientRect();return[r.left+aim[0]/VW*r.width,r.top+aim[1]/VH*r.height]}
stick($('tcR'),(dx,dy,m)=>{
 let rx=VW/2,ry=VH/2;if(G&&G.me&&G.cv<0&&!DRN()){rx=G.me.x-cam.x;ry=G.me.y-cam.y}
 if(m>.25){aim=[Math.max(0,Math.min(VW,rx+dx*110)),Math.max(0,Math.min(VH,ry+dy*110))];mouse.x=aim[0];mouse.y=aim[1]}
 const f=m>.55;if(f&&!firing){firing=true;const[x,y]=aimClient();mev(canv(),'mousedown',x,y,0)}else if(!f&&firing){firing=false;mouse.down=false}},
 ()=>{if(firing){firing=false;mouse.down=false}});
/* ---- tap / hold on the game view itself = mouse ---- */
let vp=null;
const cvOn=(t,e)=>{if(t==='touchstart'){if(vp!==null)return;vp=e.changedTouches[0].identifier}const tc=[...e.changedTouches].find(x=>x.identifier===vp);if(!tc)return;e.preventDefault();
 const[x,y]=[tc.clientX,tc.clientY];if(t==='touchstart'){mev(canv(),'mousemove',x,y);mev(canv(),'mousedown',x,y,0)}else if(t==='touchmove')mev(canv(),'mousemove',x,y);else{mev(window,'mouseup',x,y);vp=null}};
for(const t of['touchstart','touchmove','touchend','touchcancel'])canv().addEventListener(t,e=>cvOn(t,e),{passive:false});
/* ---- show only during a match ---- */
function inMatch(){return typeof G!=='undefined'&&G&&$('menu').style.display==='none'&&$('over').style.display==='none'&&getComputedStyle($('load')).display==='none'&&!PAUSED}
let was=false;
setInterval(()=>{const on=inMatch();w.classList.toggle('on',on);if(was&&!on){for(const k in dirs)setDir(k,0);mouse.down=false;firing=false;for(const b of down)b.classList.remove('dn');down.clear()}was=on},200);
})();
