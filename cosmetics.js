/* R6 Pixel Siege - cosmetics runtime.
   Draws every cosmetic type. The same functions render the in-game visuals and the shop/locker previews.
   Hooks (called from game.js, all guarded): CXR.recolor, hat, ring, plate, gunCol, flash, trace, kill, fx, xhair, look */
(()=>{
const ECO=window.ECO;if(!ECO)return;
const EQ=t=>{try{const id=ECO.eq[t];return id&&ECO.has(id)?ECO.BYID[id]:null}catch(e){return null}};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hx=s=>{s=String(s||'#000000');return[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)||0)};
const toHex=a=>'#'+a.map(v=>('0'+clamp(Math.round(v),0,255).toString(16)).slice(-2)).join('');
const mix=(a,b,k)=>{const A=hx(a),B=hx(b);return toHex(A.map((v,i)=>v+(B[i]-v)*k))};
const scale=(c,k)=>toHex(hx(c).map(v=>v*k));
const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w||1,h||1)};
const rnd=seed=>{let a=seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
/* ================= operator recolour (fixes customisation + skins) ================= */
const RC=new Map();
const lum=(r,g,b)=>(.299*r+.587*g+.114*b)/255;
function recolored(S,pal,key){if(RC.has(key))return RC.get(key);
 const[suit,helm,acc]=pal,dirs=['down','side','up'],frames=[];let lo=1,hi=0;
 for(const d of dirs)for(let f=0;f<3;f++){const c=S[d][f],x=c.getContext('2d'),im=x.getImageData(0,0,14,18);frames.push([d,f,im]);const D=im.data;
  for(let i=0;i<D.length;i+=4){if(D[i+3]<10)continue;const r=D[i],g=D[i+1],b=D[i+2],L=lum(r,g,b);if(L<.05)continue;if(r>g&&g>b&&r-b>38&&r>130)continue;const py=(i/4/14|0);if(py>12)continue;lo=Math.min(lo,L);hi=Math.max(hi,L)}}
 const span=Math.max(.05,hi-lo),O={w:{}};for(const d of dirs){O[d]=[];O.w[d]=[]}
 const ramp=(c,t)=>scale(c,.5+.85*t);
 for(const[d,f,im]of frames){const D=im.data,out=new ImageData(14,18);const q=out.data;
  for(let i=0;i<D.length;i+=4){const a=D[i+3];q[i]=D[i];q[i+1]=D[i+1];q[i+2]=D[i+2];q[i+3]=a;if(a<10)continue;
   const r=D[i],g=D[i+1],b=D[i+2],L=lum(r,g,b);if(L<.05)continue;if(r>g&&g>b&&r-b>38&&r>130)continue;
   const p=i/4,py=p/14|0;if(py>12)continue;const t=clamp((L-lo)/span,0,1);let col;
   if(py<=6)col=ramp(helm,t);else if(py===7||t>.86)col=ramp(acc,.55+t*.5);else col=ramp(suit,t);
   const C=hx(col);q[i]=C[0];q[i+1]=C[1];q[i+2]=C[2]}
  const c=document.createElement('canvas');c.width=14;c.height=18;c.getContext('2d').putImageData(out,0,0);O[d][f]=c;
  const t=document.createElement('canvas');t.width=14;t.height=18;const tx=t.getContext('2d');tx.drawImage(c,0,0);tx.globalCompositeOperation='source-atop';tx.fillStyle='#fff';tx.fillRect(0,0,14,18);(O.w[d]=O.w[d]||[])[f]=t}
 RC.set(key,O);return O}
function baseCols(op){try{const bid=op.bid||String(op.id).split('_')[0],b=[...OPS.A,...OPS.D].find(o=>o.id===bid);return b?b.c:null}catch(e){return null}}
function sprites(a,op,pl){const sk=pl?EQ('sk'):null;let pal=null,key=null;
 if(sk){pal=sk.p;key='@'+(op.bid||op.id)+'|'+sk.id}
 else{const b=baseCols(op);if(b&&op.c&&(op.c[0]!==b[0]||op.c[1]!==b[1]||op.c[2]!==b[2])){pal=op.c;key='@'+(op.bid||op.id)+'|'+op.c.join('')}}
 return pal?recolored(a,pal,key):a}
/* ================= headgear ================= */
const HAT={
cap:(P,m,a)=>{P(0,-1,6,2,m);P(1,-2,4,1,m);P(0,1,6,1,a)},beanie:(P,m,a)=>{P(0,-1,6,3,m);P(1,-2,4,1,m);P(0,2,6,1,a);P(2,-3,2,1,a)},band:(P,m,a)=>{P(0,1,6,1,m);P(5,1,2,1,a);P(6,2,1,2,a)},
bucket:(P,m,a)=>{P(1,-2,4,2,m);P(-1,0,8,1,m);P(1,-1,4,1,a)},cowboy:(P,m,a)=>{P(-2,0,10,1,m);P(0,-2,6,2,m);P(0,-1,6,1,a)},chef:(P,m,a)=>{P(0,-4,6,4,m);P(1,-5,4,1,m);P(0,0,6,1,a)},
party:(P,m,a)=>{P(2,-5,2,1,a);P(1,-4,4,1,m);P(0,-3,6,1,a);P(0,-2,6,2,m)},tophat:(P,m,a)=>{P(-1,0,8,1,m);P(0,-4,6,4,m);P(0,-1,6,1,a)},
wizard:(P,m,a)=>{P(2,-6,2,1,m);P(1,-5,4,1,m);P(1,-4,4,2,m);P(0,-2,6,2,m);P(-1,0,8,1,m);P(2,-4,1,1,a);P(4,-2,1,1,a)},pirate:(P,m,a)=>{P(-1,-1,8,2,m);P(1,-2,4,1,m);P(2,-1,2,1,a)},
viking:(P,m,a)=>{P(0,-1,6,2,m);P(-1,-3,1,3,a);P(6,-3,1,3,a);P(-1,-4,1,1,a);P(6,-4,1,1,a)},kabuto:(P,m,a)=>{P(0,-1,6,2,m);P(2,-4,2,3,a);P(-1,1,1,3,m);P(6,1,1,3,m)},
cat:(P,m,a)=>{P(0,-2,2,2,m);P(4,-2,2,2,m);P(1,-1,1,1,a);P(4,-1,1,1,a);P(0,0,6,1,m)},bunny:(P,m,a)=>{P(1,-6,1,5,m);P(4,-6,1,5,m);P(1,-5,1,3,a);P(4,-5,1,3,a)},
horns:(P,m,a)=>{P(-1,-3,1,3,m);P(0,-1,1,1,m);P(6,-3,1,3,m);P(5,-1,1,1,m);P(-1,-4,1,1,a);P(6,-4,1,1,a)},halo:(P,m,a,t)=>{const j=t%2?0:-1;P(1,-3+j,4,1,m);P(0,-2+j,1,1,a);P(5,-2+j,1,1,a);P(1,-1+j,4,1,m)},
crown:(P,m,a)=>{P(0,-2,6,2,m);P(0,-3,1,1,m);P(2,-3,2,1,m);P(5,-3,1,1,m);P(2,-1,2,1,a)},prop:(P,m,a,t)=>{P(0,-1,6,1,m);P(2,-2,2,1,a);P(t%2?-1:0,-3,t%2?8:6,1,a)},
antenna:(P,m,a,t)=>{P(3,-4,1,4,m);P(2,-5,3,1,t%2?a:m)},headset:(P,m,a)=>{P(0,-1,6,1,m);P(-1,1,1,3,a);P(6,1,1,3,a)},pumpkin:(P,m,a)=>{P(-1,-2,8,3,m);P(1,-1,1,1,a);P(4,-1,1,1,a);P(3,-3,1,1,'#4a8a2a')},
mohawk:(P,m,a)=>{P(2,-3,2,3,m);P(2,-4,2,1,a)},afro:(P,m,a)=>{P(-2,-3,10,5,m);P(-1,-4,8,1,m);P(0,-5,6,1,a)},flame:(P,m,a,t)=>{P(1,-2,4,2,m);P(2,-3-(t%2),2,2,a);P(1,-4,1,1,a);P(4,-4+(t%2),1,1,a)},
sombrero:(P,m,a)=>{P(-3,0,12,1,m);P(0,-3,6,3,m);P(0,-1,6,1,a)},santa:(P,m,a)=>{P(0,-2,6,3,m);P(-1,1,8,1,a);P(5,-3,2,2,m);P(6,-3,1,1,a)},laurel:(P,m,a)=>{P(-1,-1,1,4,m);P(6,-1,1,4,m);P(0,-1,2,1,a);P(4,-1,2,1,a)},
cone:(P,m,a)=>{P(2,-5,2,1,m);P(1,-4,4,2,m);P(0,-2,6,2,m);P(1,-3,4,1,a)},pot:(P,m,a)=>{P(0,-2,6,2,m);P(-1,-3,8,1,a)},mushroom:(P,m,a)=>{P(-1,-2,8,2,m);P(0,-3,6,1,m);P(1,-2,1,1,a);P(4,-3,1,1,a);P(3,-1,1,1,a)},
ufo:(P,m,a,t)=>{P(1,-4,4,2,a);P(-2,-2,10,1,m);P(0,-3,6,1,m);P(t%2?0:3,-2,1,1,'#fff')},bow:(P,m,a)=>{P(1,-2,4,2,m);P(0,-3,2,2,m);P(4,-3,2,2,m);P(2,-2,2,1,a)},
spike:(P,m,a)=>{P(0,-1,6,2,m);P(0,-3,1,2,a);P(2,-4,1,3,a);P(4,-3,1,2,a)},leaf:(P,m,a)=>{P(3,-3,1,3,m);P(1,-4,2,1,a);P(4,-4,2,1,a);P(2,-3,1,1,a)},
ghost:(P,m,a)=>{P(-1,-2,8,3,m);P(-1,1,1,3,m);P(6,1,1,3,m);P(1,1,1,1,a);P(4,1,1,1,a)}};
function hatDraw(g,it,ox,oy,s,t){const[m,a]=it.p,f=HAT[it.s]||HAT.cap;f((x,y,w,h,c)=>rect(g,c,ox+x*s,oy+y*s,w*s,h*s),m,a,t||0)}
/* ================= weapons ================= */
function gunColor(it,i,L,t){const[b,a]=it.p,s=it.s;let c;
 switch(s){case'stripe':c=((i>>1)&1)?a:b;break;case'dots':c=i%3===1?a:b;break;case'camo':{const h=(Math.imul(i+1,2654435761)>>>8)%3;c=h===0?a:h===1?scale(b,.7):b;break}
  case'grad':c=mix(b,a,L>1?i/(L-1):0);break;case'spark':c=(i===((t>>1)%L))?a:b;break;case'chev':c=((i+(i>>1))&1)?a:b;break;case'check':c=(i&1)?a:b;break;
  case'flame':c=mix(b,a,Math.abs(Math.sin((i+t/3)*.9)));break;case'scale':c=(i&1)?scale(b,1.25):mix(b,a,.35);break;default:c=i>L-3?scale(b,.8):b}
 return c}
/* ================= tracers ================= */
function traceDraw(g,x1,y1,x2,y2,it,al,t){const s=it.s,P=it.p,dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len,nx=-uy,ny=ux;g.globalAlpha=al;
 const seg=(a,b,c,w)=>{g.strokeStyle=c;g.lineWidth=w||1;g.beginPath();g.moveTo(Math.round(x1+ux*a)+.5,Math.round(y1+uy*a)+.5);g.lineTo(Math.round(x1+ux*b)+.5,Math.round(y1+uy*b)+.5);g.stroke()};
 if(s==='dash'){for(let d=0;d<len;d+=6)seg(d,Math.min(len,d+3),P[0])}
 else if(s==='dbl'){for(const o of[-1.5,1.5]){g.strokeStyle=P[0];g.lineWidth=1;g.beginPath();g.moveTo(Math.round(x1+nx*o)+.5,Math.round(y1+ny*o)+.5);g.lineTo(Math.round(x2+nx*o)+.5,Math.round(y2+ny*o)+.5);g.stroke()}}
 else if(s==='zig'){g.strokeStyle=P[0];g.lineWidth=1;g.beginPath();g.moveTo(x1,y1);for(let d=4;d<len;d+=4){const o=((d/4)&1?1:-1)*2;g.lineTo(x1+ux*d+nx*o,y1+uy*d+ny*o)}g.lineTo(x2,y2);g.stroke()}
 else if(s==='rain'){for(let d=0;d<len;d+=3)seg(d,Math.min(len,d+3),P[(d/3+(t>>1))%P.length|0])}
 else if(s==='fade'){const a2=P[1]||P[0];for(let d=0;d<len;d+=3){g.globalAlpha=al*(1-d/len*.8);seg(d,Math.min(len,d+3),d<len*.5?P[0]:a2)}}
 else{seg(0,len,P[0]);if(len>6)seg(len*.55,len,mix(P[0],'#ffffff',.5))}
 g.globalAlpha=1}
/* ================= ring under feet ================= */
function ringDraw(g,x,y,it,t,col0){const P=it.p,s=it.s,c=P[0];g.lineWidth=1;
 const ell=(rx,ry,c2,a)=>{g.globalAlpha=a==null?.9:a;g.strokeStyle=c2;g.beginPath();g.ellipse(x,y+5,rx,ry,0,0,7);g.stroke();g.globalAlpha=1};
 if(s==='dash'){g.strokeStyle=c;g.setLineDash([2,2]);g.lineDashOffset=-(t>>1);g.beginPath();g.ellipse(x,y+5,7.5,3.8,0,0,7);g.stroke();g.setLineDash([])}
 else if(s==='dbl'){ell(6,3,c);ell(8.5,4.5,c,.6)}
 else if(s==='pulse'){const k=(t%40)/40;ell(6+k*5,3+k*2.5,c,1-k);ell(6,3,c,.8)}
 else if(s==='dots'){for(let i=0;i<10;i++){const a=i/10*6.283+(t/40);rect(g,P[i%P.length],x+Math.cos(a)*7.5,y+5+Math.sin(a)*3.8,1,1)}}
 else if(s==='spin'){ell(7.5,3.8,P.length>1?P[0]:c,.35);for(let i=0;i<3;i++){const a=t/10+i*2.1;rect(g,P[i%P.length],x+Math.cos(a)*7.5,y+5+Math.sin(a)*3.8,2,2)}}
 else ell(7.5,3.8,c)}
/* ================= crosshair ================= */
function xhairDraw(g,x,y,it,t){const c=it.p[0],f=(a,b,w,h)=>rect(g,c,x+a,y+b,w,h);
 switch(it.s){case'dot':f(-1,-1,3,3);break;case'ring':g.strokeStyle=c;g.lineWidth=1;g.beginPath();g.arc(x+.5,y+.5,5,0,7);g.stroke();f(0,0,1,1);break;
  case'heart':f(-3,-3,2,2);f(2,-3,2,2);f(-4,-2,8,2);f(-3,0,6,1);f(-2,1,4,1);f(-1,2,2,1);break;
  case'diamond':f(0,-5,1,1);f(-1,-4,3,1);f(-2,-3,5,1);f(-3,-2,7,1);f(-2,3,5,1);f(-1,4,3,1);f(0,5,1,1);f(-3,-1,7,2);f(-2,2,5,1);break;
  case'brackets':f(-6,-6,3,1);f(-6,-6,1,3);f(4,-6,3,1);f(6,-6,1,3);f(-6,6,3,1);f(-6,4,1,3);f(4,6,3,1);f(6,4,1,3);f(0,0,1,1);break;
  case'x':for(let i=2;i<6;i++){f(i,i,1,1);f(-i,i,1,1);f(i,-i,1,1);f(-i,-i,1,1)}break;
  case'tri':f(0,-5,1,1);f(-1,-4,3,1);f(-1,-3,3,1);f(-2,-2,5,1);f(-3,-1,7,1);f(-4,0,9,1);break;
  case'spin':{const a=t/8;for(let i=0;i<4;i++){const q=a+i*1.5708;f(Math.round(Math.cos(q)*5),Math.round(Math.sin(q)*5),2,2)}f(0,0,1,1);break}
  case'plus':f(-1,-5,3,11);f(-5,-1,11,3);break;
  case'star':f(0,-6,1,13);f(-6,0,13,1);f(-3,-3,1,1);f(3,-3,1,1);f(-3,3,1,1);f(3,3,1,1);break;
  default:f(-6,0,4,1);f(3,0,4,1);f(0,-6,1,4);f(0,3,1,4)}}
/* ================= muzzle flash ================= */
function flashDraw(g,tx,ty,it){rect(g,it.p[1],tx-2,ty-2,4,4);rect(g,it.p[0],tx-1,ty-1,2,2)}
/* ================= kill effects ================= */
function emit(arr,x,y,it){const P=it.p,s=it.s,R=Math.random,pc=()=>P[R()*P.length|0];
 const add=(o)=>arr.push(Object.assign({x,y,vx:0,vy:0,t:30,mt:30,c:P[0],sh:'q',g:0},o));
 switch(s){
  case'confetti':for(let i=0;i<18;i++){const a=R()*6.283,v=.6+R()*1.6;add({vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,g:.07,t:40,mt:40,c:pc(),sh:'q'})}break;
  case'petals':for(let i=0;i<14;i++)add({x:x+(R()-.5)*10,y:y-4-R()*6,vx:(R()-.5)*.5,vy:.15+R()*.2,g:.004,t:60,mt:60,c:pc(),sh:'p'});break;
  case'hearts':for(let i=0;i<6;i++)add({x:x+(R()-.5)*10,vx:(R()-.5)*.3,vy:-.5-R()*.3,t:44,mt:44,c:pc(),sh:'h'});break;
  case'coins':for(let i=0;i<9;i++){const a=-1.57+(R()-.5)*2.4,v=1+R()*1.5;add({vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.1,t:46,mt:46,c:P[0],sh:'c'})}break;
  case'bolt':for(let i=0;i<8;i++){const a=i/8*6.283+R()*.4;add({vx:Math.cos(a)*3,vy:Math.sin(a)*3,t:12,mt:12,c:pc(),sh:'l'})}break;
  case'glitch':for(let i=0;i<14;i++)add({x:x+(R()-.5)*18,y:y+(R()-.5)*16,t:12+R()*10|0,mt:22,c:pc(),sh:'b'});break;
  case'ghost':add({vy:-.45,t:56,mt:56,c:P[0],sh:'G'});break;
  case'stars':for(let i=0;i<10;i++){const a=R()*6.283,v=.5+R()*1.8;add({vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:34,mt:34,c:pc(),sh:'s'})}break;
  case'snow':for(let i=0;i<16;i++)add({x:x+(R()-.5)*16,y:y-6-R()*8,vx:(R()-.5)*.3,vy:.15+R()*.25,t:56,mt:56,c:pc(),sh:'q'});break;
  case'flame':for(let i=0;i<16;i++)add({x:x+(R()-.5)*8,vx:(R()-.5)*.4,vy:-.5-R()*.9,t:26+R()*10|0,mt:36,c:pc(),sh:'q'});break;
  case'bubble':for(let i=0;i<8;i++)add({x:x+(R()-.5)*12,vx:(R()-.5)*.2,vy:-.3-R()*.3,t:50,mt:50,c:pc(),sh:'o'});break;
  case'skull':for(let i=0;i<3;i++)add({x:x+(i-1)*7,vy:-.35-R()*.2,t:48,mt:48,c:P[0],sh:'k'});break;
  case'ring':add({t:22,mt:22,c:P[0],sh:'R',r:2,vx:0,vy:0});add({t:30,mt:30,c:P[1]||P[0],sh:'R',r:0,vx:0,vy:0});break;
  case'hole':for(let i=0;i<18;i++){const a=R()*6.283,d=16+R()*6;add({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,vx:-Math.cos(a)*d/28,vy:-Math.sin(a)*d/28,t:28,mt:28,c:pc(),sh:'q'})}add({t:32,mt:32,c:'#000',sh:'D'});break;
  default:for(let i=0;i<16;i++){const a=R()*6.283,v=.5+R()*2;add({vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:24+R()*14|0,mt:38,c:pc(),sh:'q'})}}}
function fxDraw(g,f){const al=clamp(f.t/(f.mt*.55),0,1);g.globalAlpha=al;const c=f.c,x=Math.round(f.x),y=Math.round(f.y);
 switch(f.sh){case'p':rect(g,c,x,y,2,1);rect(g,c,x+1,y+1,1,1);break;
  case'h':rect(g,c,x,y,1,1);rect(g,c,x+2,y,1,1);rect(g,c,x,y+1,3,1);rect(g,c,x+1,y+2,1,1);break;
  case'c':rect(g,c,x,y,2,2);rect(g,'#ffffff',x,y,1,1);break;
  case'l':{const m=Math.hypot(f.vx,f.vy)||1;g.strokeStyle=c;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x-f.vx/m*5,y-f.vy/m*5);g.stroke();break}
  case'b':rect(g,c,x,y,5,1);break;
  case'G':rect(g,c,x,y,5,5);rect(g,c,x,y+5,1,1);rect(g,c,x+2,y+5,1,1);rect(g,c,x+4,y+5,1,1);rect(g,'#14141a',x+1,y+1,1,2);rect(g,'#14141a',x+3,y+1,1,2);break;
  case's':rect(g,c,x,y-1,1,3);rect(g,c,x-1,y,3,1);break;
  case'o':g.strokeStyle=c;g.lineWidth=1;g.beginPath();g.arc(x+.5,y+.5,2,0,7);g.stroke();break;
  case'k':rect(g,c,x,y,5,4);rect(g,c,x+1,y+4,3,1);rect(g,'#14141a',x+1,y+1,1,1);rect(g,'#14141a',x+3,y+1,1,1);break;
  case'R':g.strokeStyle=c;g.lineWidth=1;g.beginPath();g.arc(f.x,f.y,f.r,0,7);g.stroke();break;
  case'D':rect(g,c,x-2,y-2,5,5);rect(g,'#ffffff',x-3,y-3,1,1);break;
  default:rect(g,c,x,y,2,2)}g.globalAlpha=1}
function fxStep(f){if(f.sh==='R')f.r+=1.6;if(f.g)f.vy+=f.g}
/* ================= nameplate ================= */
function plateDraw(c,it,x,y,t,fit){const s=it.n.toUpperCase();c.font='8px Silkscreen,monospace';c.textBaseline='top';c.textAlign='center';let col=it.p[0];
 if(it.r==='l')col=(t>>3)&1?it.p[1]||col:col;else if(it.r==='m')col=['#ff4a4a','#ffe14a','#4aff6a','#4ac0ff','#c07aff'][(t>>2)%5];
 const w=Math.ceil(c.measureText(s).width),tag=it.r==='e'||it.r==='l'||it.r==='m'?'['+s+']':s,tw=Math.ceil(c.measureText(tag).width);
 c.fillStyle='rgba(8,10,14,.7)';c.fillRect(Math.round(x-tw/2-2),y-1,tw+4,10);c.fillStyle='#000';c.fillText(tag,x+1,y+1);c.fillStyle=col;c.fillText(tag,x,y);
 if(it.r!=='c'){c.fillStyle=col;c.globalAlpha=.7;c.fillRect(Math.round(x-tw/2-2),y+9,tw+4,1);c.globalAlpha=1}return tw}
/* ================= drone skins (type dr: p=[body,dark,led]) ================= */
function droneCol(it,t){const[b,d,l]=it.p;let led=l;if(it.r==='l')led=(t>>2)&1?l:'#ffffff';else if(it.r==='m')led=['#ff4a4a','#ffe14a','#4aff6a','#4ac0ff','#c07aff'][(t>>1)%5];return{body:b,dark:d,led,dim:mix(l,'#000000',.55),acc:l}}
/* centred on 0,0 facing +x, same footprint as the stock drone in game.js */
function droneShape(g,K,hit,roll,b,fly){
 if(fly){rect(g,'#050608',-6,-6,12,12);rect(g,K.body,-4,-4,8,8);rect(g,K.led,-2,-2,4,4);for(const[a,c]of[[-6,-6],[3,-6],[-6,3],[3,3]])rect(g,b?mix(K.body,'#ffffff',.45):K.dark,a,c,3,3);return}
 rect(g,K.body,-3,-5,6,10);rect(g,K.dark,-3,-5,2,10);rect(g,K.acc,1,-5,1,10);
 for(const sy of[-8,5]){rect(g,hit>0?'#ffffff':'#171c19',-4,sy,8,3);rect(g,mix(K.body,'#ffffff',.25),-4,sy,8,1);for(let i=0;i<4;i++)rect(g,K.dark,((i*2+((roll||0)*.5|0))%8)-4,sy+1,1,2)}
 for(let i=0;i<6;i++)rect(g,(b||i%2)?K.led:K.dim,0,-4+Math.round(i*1.5+(i>2?1:0)),1,1)}
/* ================= shop-card preview (48x48) ================= */
ECO.drawPreview=function(cv,it,t){const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,48,48);t=t||0;
 try{
 if(it.t==='sk'||it.t==='hd'){const o=typeof getOp==='function'?getOp('A',0):null;let S=null;try{S=atlasSprites(o.bid)}catch(e){}
  const f=it.t==='sk'&&S?recolored(S,it.p,'@'+o.bid+'|'+it.id):S;
  if(f){g.drawImage(f.down[0],10,6,28,36)}else{rect(g,'#2b3340',18,18,12,14);rect(g,'#e0b890',18,8,12,10)}
  if(it.t==='hd')hatDraw(g,it,18,8,2,t)}
 else if(it.t==='wp'){const L=14;for(let i=0;i<L;i++)for(let k=0;k<2;k++)rect(g,gunColor(it,i,L,t),6+i*2.4|0,22+k*2,3,2);rect(g,'#10141c',14,28,4,8);rect(g,'#10141c',24,26,3,4);rect(g,gunColor(it,3,L,t),30,18,6,3);rect(g,'#10141c',38,23,8,2)}
 else if(it.t==='tr'){const k=(t*3)%20;traceDraw(g,4,24,40,24,it,1,t);rect(g,'#fff',40,22,5,4);rect(g,'#c8d0dc',45,23,2,2)}
 else if(it.t==='kf'){if(!it._fx||it._fxt>t){it._fx=[];it._fxt=0;emit(it._fx,24,28,it)}
  for(const f of it._fx){f.x+=f.vx;f.y+=f.vy;fxStep(f);f.vx*=.97;if(--f.t<=0)f.t=0}it._fxt=t;it._fx=it._fx.filter(f=>f.t>0);if(!it._fx.length||t%26===25){it._fx=[];emit(it._fx,24,28,it)}
  rect(g,'#3a404c',22,30,5,10);rect(g,'#5a606a',22,24,5,6);for(const f of it._fx)fxDraw(g,f)}
 else if(it.t==='np'){rect(g,'#0a0c10',2,16,44,14);plateDraw(g,it,24,19,t)}
 else if(it.t==='rg'){rect(g,'#1a1d24',8,24,32,2);g.save();g.translate(0,-6);ringDraw(g,24,24,it,t);g.restore();g.save();g.translate(24,26);g.scale(2.2,2.2);ringDraw(g,0,0,it,t);g.restore()}
 else if(it.t==='xh'){rect(g,'#0e1218',6,6,36,36);g.save();g.translate(24,24);g.scale(2,2);xhairDraw(g,0,0,it,t);g.restore()}
 else if(it.t==='mf'){rect(g,'#10141c',4,22,22,4);rect(g,'#2d2e33',26,21,6,6);const cx=38,cy=24;rect(g,it.p[1],cx-5,cy-5,10,10);rect(g,it.p[0],cx-3,cy-3,6,6);rect(g,'#fff',cx-1,cy-1,2,2);rect(g,it.p[1],cx-9,cy,3,1);rect(g,it.p[1],cx+6,cy,3,1)}
 else if(it.t==='dr'){rect(g,'#10141c',4,38,40,2);g.save();g.translate(24,24);g.scale(2.3,2.3);g.rotate(-Math.PI/2);droneShape(g,droneCol(it,t),0,t*3,!!(t&1),false);g.restore()}
 if(it.r==='m'&&it.t!=='np'){g.globalCompositeOperation='source-atop';const gr=g.createLinearGradient(0,0,48,48);gr.addColorStop(0,'#ff3d6e');gr.addColorStop(.5,'#ffe14a');gr.addColorStop(1,'#3aa0ff');g.globalAlpha=.3;g.fillStyle=gr;g.fillRect(0,0,48,48);g.globalAlpha=1;g.globalCompositeOperation='source-over'}
 }catch(e){}};
/* ================= LOCKER live preview scene ================= */
function look(cv,eq,t){const g=cv.getContext('2d'),W=cv.width,H=cv.height;g.imageSmoothingEnabled=false;g.clearRect(0,0,W,H);
 const s=Math.max(2,Math.floor(Math.min(W/92,H/62)));g.fillStyle='#0c1016';g.fillRect(0,0,W,H);const gr=g.createRadialGradient(W*.32,H*.7,5,W*.32,H*.7,W*.5);gr.addColorStop(0,'rgba(229,48,58,.22)');gr.addColorStop(1,'rgba(229,48,58,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.save();g.scale(s,s);const w=W/s,h=H/s,bx=Math.round(w*.3),by=Math.round(h*.42);
 // ring + shadow
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(bx,by+5,6,3,0,0,7);g.fill();
 if(eq.rg)ringDraw(g,bx,by,eq.rg,t);else{g.strokeStyle='rgba(255,155,58,.85)';g.lineWidth=1;g.beginPath();g.ellipse(bx,by+5,7.5,3.8,0,0,7);g.stroke()}
 // operator (side view facing right)
 let S=null;try{const o=getOp(uiSel.side,uiSel.op),a=atlasSprites(o.bid);S=a?(eq.sk?recolored(a,eq.sk.p,'@'+o.bid+'|'+eq.sk.id):sprites(a,o,false)):spritesOld(o)}catch(e){}
 if(S){g.drawImage(S.side[0],bx-7,by-12)}
 if(eq.hd)hatDraw(g,eq.hd,bx-2,by-11,1,t);
 // gun
 const gx=bx+4,gy=by-4,L=10;for(let i=0;i<L;i++){g.fillStyle=eq.wp?gunColor(eq.wp,i,L,t):(i>L-3?'#2d2e33':'#15161a');g.fillRect(gx+i,gy,1,2)}
 // shots
 const cyc=t%36;if(cyc<4){const f=eq.mf?eq.mf.p:['#fff3b0','#ffb030'];rect(g,f[1],gx+L,gy-1,4,4);rect(g,f[0],gx+L+1,gy,2,2)}
 if(cyc>=1&&cyc<7){const it=eq.tr||{s:'solid',p:['#fff3b0']};traceDraw(g,gx+L+4,gy+1,w-6,gy+1,it,1-(cyc-1)/6,t)}
 // target + kill fx
 const tx=Math.round(w*.84),ty=by;rect(g,'#3a404c',tx-3,ty-8,6,12);rect(g,'#5a606a',tx-2,ty-12,4,4);
 if(cyc===6)look._fx=null;
 if(eq.kf){if(cyc===7||!look._fx){look._fx=[];emit(look._fx,tx,ty-4,eq.kf)}for(const f of look._fx){f.x+=f.vx;f.y+=f.vy;fxStep(f);f.vx*=.97;f.t--}look._fx=look._fx.filter(f=>f.t>0);if(cyc>=7)for(const f of look._fx)fxDraw(g,f)}
 // drone
 if(eq.dr){g.save();g.translate(Math.round(w*.56),by+6);droneShape(g,droneCol(eq.dr,t),0,t,!!((t>>2)&1),false);g.restore()}
 // nameplate
 if(eq.np){g.font='8px Silkscreen,monospace';plateDraw(g,eq.np,Math.round(w/2),3,t)}
 // crosshair box
 if(eq.xh){g.fillStyle='rgba(8,10,14,.8)';g.fillRect(w-26,3,23,23);xhairDraw(g,w-15,14,eq.xh,t)}
 g.restore()}
/* ================= runtime hooks ================= */
let T=0;setInterval(()=>T++,100);
window.CXR={EQ,sprites,
 recolor:(a,op,pl)=>sprites(a,op,pl),
 hat(g,e,x,y,dir,fl){const it=EQ('hd');if(!it)return;const ox=dir==='side'?(fl?x-4:x-2):x-3;hatDraw(g,it,ox,y-11,1,T)},
 ring(g,x,y,side){const it=EQ('rg');if(!it)return false;ringDraw(g,x,y,it,T);return true},
 plate(g,e,x,y){const it=EQ('np');if(!it)return;plateDraw(g,it,x,y-24,T)},
 gunCol(i,L){const it=EQ('wp');return it?gunColor(it,i,L,T):null},
 flash(){const it=EQ('mf');return it?it.p:null},
 trace(g,t){const it=EQ('tr');if(!it)return false;traceDraw(g,t.x1,t.y1,t.x2,t.y2,it,t.t/3,T);return true},
 kill(G,x,y){const it=EQ('kf');if(it)emit(G.fx,x,y-3,it)},
 fx(g,f){fxDraw(g,f)},fxStep,
 xhair(g,x,y){const it=EQ('xh');if(!it)return false;xhairDraw(g,x,y,it,T);return true},
 droneArt(g,d,b){const it=EQ('dr');if(!it)return false;droneShape(g,droneCol(it,T),d.hit,d.roll,b,!!d.fly);return true},
 look,eqAll(){const o={};for(const t of['sk','hd','wp','tr','kf','np','rg','xh','mf','dr'])o[t]=EQ(t);return o}};
})();
