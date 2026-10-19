// R6 PIXEL SIEGE - menu theme: pixel-art briefing-room backdrop + scene dimming per screen. Loaded after game.js.
(function(){
const cv=document.getElementById('bgScene'),menu=document.getElementById('menu');if(!cv||!menu)return;
const W=320,H=180,g=cv.getContext('2d');g.imageSmoothingEnabled=false;
let sd=11;const rnd=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
const R=(x,y,w,h,c,a)=>{g.globalAlpha=a==null?1:a;g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));g.globalAlpha=1};
function vgrad(x,y,w,h,c0,c1,n){for(let i=0;i<n;i++){const t=i/(n-1),m=(a,b)=>Math.round(a+(b-a)*t),p=c=>[1,3,5].map(k=>parseInt(c.substr(k,2),16));const A=p(c0),B=p(c1);R(x,y+h*i/n,w,Math.ceil(h/n)+1,'rgb('+m(A[0],B[0])+','+m(A[1],B[1])+','+m(A[2],B[2])+')')}}
function monitor(x,y,w,h,hot){const cols=hot?['#7a1a20','#c8262e','#5a1015','#3a3a42']:['#1c1c22','#2a2a30','#3a0d10','#24242a'];R(x,y,w,h,'#050506');R(x+1,y+1,w-2,h-2,cols[(rnd()*cols.length)|0]);if(w>7){for(let k=0;k<2;k++)R(x+2,y+2+k*3,(rnd()*(w-5))|0+2,1,'#e9e9ee',.35)}}
function chair(x,y){R(x+1,y,6,7,'#a3161d');R(x+1,y,6,1,'#d33a42');R(x+2,y+7,4,3,'#0c0c0e');R(x,y+10,8,1,'#0c0c0e')}
function desk(x,y,w,n){R(x,y,w,3,'#2c2c32');R(x,y+3,w,9,'#131316');R(x,y,w,1,'#4a4a52');for(let i=0;i<n;i++){const mx=x+4+i*((w-8)/n);monitor(mx,y-9,9,8,i%2===0);R(mx+3,y-1,3,1,'#050506')}}
function draw(){
 // wall
 vgrad(0,0,W,118,'#1b1b1f','#0e0e11',24);
 for(let x=0;x<W;x+=40)R(x,0,1,118,'#08080a',.7);
 // ceiling lights
 R(30,0,90,3,'#d8dae0',.55);R(200,0,90,3,'#d8dae0',.55);R(0,3,W,1,'#050506');
 // glass wall with dusk city
 R(28,16,264,62,'#050506');vgrad(30,18,260,58,'#1a0a0d','#5a1218',20);
 for(let i=0;i<46;i++){const bw=4+((rnd()*10)|0),bh=8+((rnd()*30)|0),bx=30+((rnd()*250)|0);R(bx,76-bh,bw,bh,'#09090b');if(rnd()<.7)for(let k=0;k<3;k++)R(bx+1+((rnd()*(bw-2))|0),76-bh+2+((rnd()*(bh-4))|0),1,1,'#ff7a68',.8)}
 for(let x=82;x<290;x+=52)R(x,16,2,62,'#050506');R(28,46,264,1,'#050506',.6);
 // glass sheen
 for(let i=0;i<4;i++)R(48+i*60,18,10,58,'#ffffff',.035);
 // neon strips (red) + diagonal accent like the briefing screen
 R(0,13,W,2,'#e5303a');R(0,11,W,6,'#e5303a',.14);R(0,79,W,2,'#e5303a');R(0,77,W,6,'#e5303a',.12);
 for(let i=0;i<90;i++){R(0+i*1.1,66-i*.55,2,2,'#e5303a',.35)}
 // monitor walls
 for(let side=0;side<2;side++){const bx=side?252:6;R(bx-2,84,66,38,'#08080a');for(let r=0;r<4;r++)for(let c=0;c<7;c++)monitor(bx+c*9,86+r*9,8,8,rnd()<.45)}
 // floor
 vgrad(0,118,W,62,'#121214','#040405',20);
 g.strokeStyle='rgba(229,48,58,.13)';g.lineWidth=1;for(let i=-10;i<=10;i++){g.beginPath();g.moveTo(160+i*14,118);g.lineTo(160+i*52,180);g.stroke()}
 for(let y=124;y<180;y+=9+((y-118)/9|0)){R(0,y,W,1,'#e5303a',.05)}
 // desks + chairs
 desk(10,112,100,5);desk(210,112,100,5);chair(24,124);chair(54,124);chair(228,124);chair(262,124);
 desk(2,134,70,3);desk(248,134,70,3);
 // floor glow where the operator stands
 for(let i=0;i<14;i++){g.globalAlpha=.035;g.fillStyle='#e5303a';g.beginPath();g.ellipse(160,162,92-i*5,16-i*.8,0,0,7);g.fill()}g.globalAlpha=1;
 R(0,0,W,1,'#000');
}
draw();
function sync(){const p=document.getElementById('tp-play'),m=document.getElementById('scrMain');const playing=p&&!p.hidden&&m&&m.style.display!=='none';menu.classList.toggle('dim',!playing)}
const o=new MutationObserver(sync);['tp-play','scrMain','scrOps'].forEach(id=>{const e=document.getElementById(id);if(e)o.observe(e,{attributes:true,attributeFilter:['hidden','style']})});sync();
})();
