// R6 PIXEL SIEGE - per-map exteriors (stage 5B). Loaded BEFORE game.js; game.js calls these at runtime only.
// - MAPX.pal[id]   : ground/pavement/road colour overrides so every map has its own look
// - MAPX.sg[id]    : signature exterior features (trees, clutter, ponds, canal, sea) placed by MAPX.sig()
// - YACHT + PLANE  : MAPX.isV(mp) -> real vessel exterior (sea + hull + ice shelf / tarmac + fuselage nose, tail, wings)
const MAPX=(()=>{
const H2=(x,y)=>{let h=((x*73856093)^(y*19349663))>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return((h^(h>>>16))>>>0)/4294967296};
const pal={
 bank:{r:'#2d3037',p:['#7a766f','#6b675f','#8a867e']},
 bartlett:{g:['#3f7a3f','#4b8a4b','#336a36'],p:['#8b5a4a','#7b4a3c','#9b6a58']},
 border:{g:['#8a8460','#7a7452','#948e6c'],p:['#8d8d8d','#7d7d7d','#9d9d9d'],r:'#34363a'},
 chalet:{g:['#e2ecf5','#d0dde9','#f2f7fb'],p:['#b8c4cf','#a8b4bf','#c8d2db']},
 clubhouse:{g:['#2a5a30','#346a3a','#204a26'],p:['#7a6a58','#6a5a48','#8a7a68']},
 coastline:{g:['#d8c690','#c9b57c','#e6d8a6'],p:['#b8a888','#a89878','#c8b898']},
 consulate:{g:['#4a7a3a','#588a46','#3c6a30'],p:['#c9b99a','#b9a98a','#d9c9aa']},
 favela:{g:['#7a5a40','#6a4c36','#8a6a4c'],p:['#8a6a50','#7a5a42','#9a7a5e'],r:'#3a3028'},
 hereford:{g:['#4a6a3a','#567a44','#3c5a30'],p:['#6a7068','#5a6058','#7a8078']},
 house:{g:['#3f8040','#4a9050','#337032'],p:['#9a9a9a','#8a8a8a','#aaaaaa']},
 kafe:{g:['#3a4a40','#445a4c','#30403a'],p:['#5a5a60','#4a4a50','#6a6a72'],r:'#26282e'},
 kanal:{g:['#4a4f44','#555a4e','#3e4338'],p:['#6a6e70','#5a5e60','#7a7e80']},
 oregon:{g:['#2a5a2a','#346a32','#204a22'],p:['#7a6a4a','#6a5a3c','#8a7a58']},
 skyscraper:{g:['#2a3a48','#344856','#202e3a'],p:['#3a3f4a','#2e333e','#484e5a'],r:'#1c2028'},
 themepark:{g:['#3a8a4a','#46a058','#2e7a3c'],p:['#c8a0b0','#b89098','#d8b0c0']},
 tower:{g:['#2a3d4a','#344c5a','#203040'],p:['#9aa0a8','#8a9098','#aab0b8']}
};
// signature exterior features per map (counts are tries, placement skips anything that does not fit)
const sg={
 bank:{fountain:1,lamp:12,bench:8,cars:1.2},
 bartlett:{tree:.09,pond:2,bench:14,planter:10},
 border:{lanes:1,cont:10,barrel:12,lamp:6},
 chalet:{tree:.13,pond:1,barrel:6},
 clubhouse:{tree:.1,pond:1,barrel:8,bench:6},
 coastline:{sea:1,bench:6,lamp:4,tree:.01},
 consulate:{tree:.06,fountain:1,planter:16,lamp:8},
 favela:{cont:22,dump:20,barrel:20,lamp:3},
 hereford:{cont:16,barrel:10,lamp:8,fence2:1},
 house:{tree:.08,pond:1,bench:4,cars:.4},
 kafe:{cars:2,bench:12,planter:10,lamp:10},
 kanal:{canal:1,cont:8,barrel:12},
 oregon:{tree:.16,pond:2,barrel:5},
 skyscraper:{planter:30,lamp:16,bench:8,fountain:1},
 themepark:{planter:28,bench:20,lamp:14,pond:1,cont:6},
 tower:{fountain:1,planter:22,lamp:12,bench:10}
};
const isV=mp=>!!mp&&(mp.id==='yacht'||mp.id==='plane');
// ---- vessel geometry (all in tile coordinates) -------------------------------------------------
function geo(c){const mp=c.mp,RY=c.RY,fy0=RY[1][0]-1,fy1=RY[RY.length-2][1]+1,cy=(fy0+fy1)/2,hh=(fy1-fy0)/2;return{id:mp.id,fy0,fy1,cy,hh}}
// returns '' (not part of the vessel scene), or a class string
function cls(c,x,y){const g=geo(c),{BX0,BX1,BY0,BY1}=c,inR=x>=BX0&&x<=BX1&&y>=BY0&&y<=BY1,ady=Math.abs(y-g.cy);
 if(g.id==='yacht'){
  if(x>BX1){const t=(x-BX1)/16;if(t<=1){const h=g.hh*(1-Math.pow(t,1.6));if(ady<=h)return h-ady<1.3?'rail':'deck'}}
  else if(x<BX0){const t=(BX0-x)/8;if(t<=1){const h=g.hh*Math.sqrt(1-t*t);if(ady<=h)return h-ady<1.3?'rail':'deck'}}
  if(inR)return '';
  const north=y<BY0,w=4+Math.round(2*H2(x>>1,north?1:2));
  if(x>=BX0-3&&x<=BX1+3&&((north&&y>=BY0-w)||(!north&&y>BY1&&y<=BY1+w)))return 'shelf';
  return 'water'}
 // plane
 if(x>BX1){const t=(x-BX1)/14;if(t<=1){const h=g.hh*Math.sqrt(1-t*t);if(ady<=h)return h-ady<1.3?'skin':'nose'}}
 else if(x<BX0){const t=(BX0-x)/12;if(t<=1){const h=g.hh*(1-.8*t),st=(x>=BX0-10&&x<=BX0-3)&&ady<=g.hh*.62;if(ady<=h)return h-ady<1.3?'skin':'tail';if(st)return 'stab'}}
 const s=y<g.fy0?g.fy0-y:y>g.fy1?y-g.fy1:0;
 if(s>0&&s<=14){const x0=BX0+44-s*3,x1=x0+54-s*3.6;if(x>=x0&&x<=x1){return(s>=6&&s<=9&&x>=x0+4&&x<=x0+12)?'engine':'wing'}}
 return inR?'':'tarmac'}
// build: stamps blocked tiles for the vessel scene (replaces the generic street/fence yard)
function build(c){const{map,fk,KD,W,BX0,BX1,BY0,BY1,OY,put,can}=c;
 for(let y=1;y<OY-1;y++)for(let x=1;x<W-1;x++){if(x>=BX0&&x<=BX1&&y>=BY0&&y<=BY1)continue;if(map[y][x]!==0)continue;
  const k=cls(c,x,y);if(k==='water'||k==='rail'||k==='nose'||k==='tail'||k==='skin'||k==='stab'||k==='engine'){map[y][x]=10;fk[y*W+x]=KD.void}}
 // world edge
 for(let x=0;x<W;x++)for(const y of[0,OY-1]){if(map[y][x]===0){map[y][x]=10;fk[y*W+x]=KD.void}}
 for(let y=0;y<OY;y++)for(const x of[0,W-1]){if(map[y][x]===0){map[y][x]=10;fk[y*W+x]=KD.void}}
 const free=(x,y)=>map[y]&&map[y][x]===0;
 if(c.mp.id==='yacht'){
  // snowmobile at the south spawn, a few crates and ice blocks on the shelf
  for(const[x,y,k,cc]of[[121,67,'carL',3],[122,67,'carR',3]])if(free(x,y))put(x,y,k,cc);
  for(let i=0;i<40;i++){const x=BX0-3+(c.rn()*(BX1-BX0+6)|0),y=c.rn()<.5?BY0-5+(c.rn()*4|0):BY1+2+(c.rn()*4|0);if(free(x,y)&&H2(x,y)<.5)put(x,y,c.rn()<.5?'barrel':'cont',c.rn()*6|0)}}
 else{
  // airfield clutter on the apron: luggage carts (containers), fuel barrels, lamps, airstair truck at the south spawn
  for(let i=0;i<60;i++){const x=3+(c.rn()*(W-6)|0),y=3+(c.rn()*(OY-6)|0);if(free(x,y)&&cls(c,x,y)==='tarmac'&&!(x>=BX0-1&&x<=BX1+1&&y>=BY0-1&&y<=BY1+1)){const r=c.rn();put(x,y,r<.5?'cont':r<.8?'barrel':'lamp',c.rn()*6|0)}}
  for(const[x,y,k,cc]of[[121,70,'carL',1],[122,70,'carR',1]])if(free(x,y))put(x,y,k,cc)}}
// ---- art ---------------------------------------------------------------------------------------
const wave=(P,n,c1,c2)=>{P(0,0,16,16,c1);for(let i=0;i<5;i++)P(n()*13|0,n()*15|0,3,1,c2)};
function art(P,x,y,n,c){const k=cls(c,x,y);if(!k)return false;
 if(c.mp.id==='yacht'){
  if(k==='water'){wave(P,n,'#16405e','#2b6a94');
   // submarine under the north spawn: dark hull + conning tower
   if(y>=2&&y<=5&&x>=102&&x<=122){P(0,0,16,16,'#16405e');const hull=y>=3&&y<=4;if(hull){P(0,y===3?5:0,16,y===3?11:11,'#3a424c');P(0,y===3?5:10,16,1,'#2a3038');if(x===110&&y===3){P(3,0,8,10,'#4a5260');P(6,0,2,3,'#8a96a6')}}if(x===102||x===122){P(8,4,8,8,'#2a3038')}}
   return true}
  if(k==='shelf'){P(0,0,16,16,'#e4eef7');for(let i=0;i<8;i++)P(n()*15|0,n()*15|0,2,1,'#cfe0ee');if(H2(x,y)<.12)P(2,2,10,1,'#9ab6cf');return true}
  if(k==='rail'){P(0,0,16,16,'#e8ecf0');P(0,0,16,3,'#fff');P(0,13,16,3,'#9aa6b4');return true}
  if(k==='deck'){P(0,0,16,16,'#9a7a52');for(let q=0;q<4;q++)P(0,q*4+3,16,1,'#7a5c3a');return true}}
 else{
  if(k==='nose'||k==='tail'){P(0,0,16,16,'#dfe4ea');P(0,7,16,2,'#2a4f8a');if(k==='nose'&&H2(x,y)<.2)P(4,3,8,4,'#7aa0c8');return true}
  if(k==='skin'){P(0,0,16,16,'#eef1f5');P(0,13,16,3,'#a8b2be');P(0,0,16,2,'#fff');return true}
  if(k==='stab'||k==='wing'){P(0,0,16,16,'#c4ccd6');P(0,0,16,1,'#a6b0bc');if(((x+y)&3)===0)P(0,7,16,1,'#aab4c0');return true}
  if(k==='engine'){P(0,0,16,16,'#8a929e');P(2,2,12,12,'#5a626e');P(6,6,4,4,'#2a2f38');return true}
  if(k==='tarmac'){P(0,0,16,16,'#4a4c50');for(let i=0;i<10;i++)P(n()*15|0,n()*15|0,1,1,'#55575c');
   if(y%10===0&&x%4<2)P(0,7,16,2,'#d8d8d0');if(x%44===0)P(7,0,2,16,'#d8b43a');return true}}
 return false}
// outdoor rooms INSIDE the building rectangle: glacier / deck / tarmac strips
function out(P,x,y,n,nm,c){const mp=c.mp;
 if(mp.id==='yacht'){
  if(/GLACIER/.test(nm)){P(0,0,16,16,'#e4eef7');for(let i=0;i<8;i++)P(n()*15|0,n()*15|0,2,1,'#cfe0ee');if(H2(x,y)<.1)P(3,5,9,1,'#8fb0cc');return true}
  if(/DECK|ANCHOR|ROOF/.test(nm)){P(0,0,16,16,'#9a7a52');for(let q=0;q<4;q++)P(0,q*4+3,16,1,'#7a5c3a');return true}}
 else if(/TARMAC/.test(nm)){const k=cls(c,x,y);if(k==='wing'||k==='engine'||k==='stab')return art(P,x,y,n,c);
  P(0,0,16,16,'#4a4c50');for(let i=0;i<10;i++)P(n()*15|0,n()*15|0,1,1,'#55575c');if(y%10===0&&x%4<2)P(0,7,16,2,'#d8d8d0');return true}
 return false}
// ---- signature features for the ordinary maps ---------------------------------------------------
function sig(c){const S=sg[c.mp.id];if(!S)return;const{can,free,put,rn,dd,yx0,yx1,yy0,yy1,BX0,BX1,BY0,BY1,W,map,KD}=c,th=c.mp.xt;
 const tries=(n,f)=>{for(let i=0;i<n;i++)for(let t=0;t<30;t++){const x=yx0+2+(rn()*(yx1-yx0-4)|0),y=yy0+2+(rn()*(yy1-yy0-4)|0);if(dd(x,y)>=4&&f(x,y))break}};
 if(S.tree)for(let y=yy0+1;y<yy1;y++)for(let x=yx0+1;x<yx1;x++)if(can(x,y)&&dd(x,y)>=5&&rn()<S.tree&&free(x,y,1,1))put(x,y,th==='snow'?'pine':'tree');
 for(const k of['cont','barrel','dump','bench','planter','lamp'])if(S[k])tries(S[k],(x,y)=>{if(!can(x,y)||!free(x,y,1,1))return false;put(x,y,k,rn()*6|0);return true});
 if(S.pond)tries(S.pond,(x,y)=>{const w=5+(rn()*4|0),h=3+(rn()*2|0);if(!free(x,y,w,h))return false;for(let j=0;j<h;j++)for(let i=0;i<w;i++)put(x+i,y+j,'water');return true});
 if(S.fountain){const w=6,h=4,x0=((BX0+BX1)>>1)-3,y0=BY1+4;if(free(x0,y0,w,h)){for(let j=0;j<h;j++)for(let i=0;i<w;i++)put(x0+i,y0+j,'water');for(const i of[-1,w])if(can(x0+i,y0+1))put(x0+i,y0+1,'planter')}}
 if(S.cars)for(let i=0;i<Math.round(8*S.cars);i++)for(let t=0;t<20;t++){const x=4+(rn()*(W-10)|0),y=BY1+6+(rn()<.5?0:2);if(map[y][x]===0&&map[y][x+1]===0){const cc=rn()*6|0;put(x,y,'carL',cc);put(x+1,y,'carR',cc);break}}
 if(S.lanes)for(let k=0;k<5;k++){const x0=BX0+8+k*((BX1-BX0-16)/4|0),y0=BY1+3;for(let q=0;q<3;q++)if(can(x0,y0+q)&&free(x0,y0+q,1,1))put(x0,y0+q,'cont',2)}
 if(S.fence2)for(let x=BX0-6;x<=BX1+6;x++){const y=BY0-6;if(map[y]&&map[y][x]===0&&!c.XP[y*W+x]&&(x%9)>1)put(x,y,'fence')}
 // water bands: they never cut the gate/path lanes (pathA), so every area stays reachable
 if(S.canal)for(let y=BY1+6;y<=BY1+8;y++)for(let x=3;x<W-3;x++)if(map[y][x]===0&&!c.pathA[y*W+x]&&(x%46)>5)put(x,y,'water');
 if(S.sea)for(let x=BX1+12;x<W-2;x++)for(let y=3;y<=BY1+8;y++)if(map[y][x]===0&&!c.pathA[y*W+x])put(x,y,'water')}
return{pal,sg,isV,cls,build,art,out,sig}})();
if(typeof module!=='undefined')module.exports=MAPX;
