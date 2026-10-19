// ---------- r6x: furnished rooms, exteriors, rappel, timed building, crowbar, thrown + placed utility ----------
const REINF_T=140,BARR_T=48,CROW_T=110,RAP_UP=110,RAP_KICK=55,PLACE_R=96,THROW_R=170;
const fk=new Uint8Array(W*H),fc=new Uint8Array(W*H),winF=new Uint8Array(W*H),pathA=new Uint8Array(W*H);
const KD={table:0,bed:1,sofa:2,counter:3,shelf:4,locker:5,machine:6,barrel:7,desk:8,plant:9,pipe:10,tank:11,cont:12,carL:13,carR:14,tree:15,hedge:16,fence:17,bench:18,dump:19,lamp:20,planter:21,stage:22,piano:23,hbed:24,ac:27,safe:29,gym:30,dj:31,tTL:32,tTR:33,tBL:34,tBR:35,water:36,pine:37,fenceV:39,void:40,ledge:41};
const CARC=['#b83a30','#2f5fa8','#d4d6da','#2a2d33','#d8b030','#3a8a4a'],CONC=['#a8402e','#2e6a8a','#3a7a4a','#c8a030','#6a5aa0','#8a8e96'];
function catOf(n){n=n||'';
 if(/VAULT|SAFE/.test(n))return 4;if(/SERVER|CONTROL|LAB|X-RAY|OPERATING/.test(n))return 0;
 if(/OFFICE|ARCHIVE|STUDY|CONFERENCE|MANAGER|WAITING|SUITE|BEDROOM|NURSERY/.test(n))return 1;
 if(/LOBBY|BALLROOM|ATRIUM|DANCE|CHAPEL|CAFETERIA|MESS|STAGE/.test(n))return 6;
 if(/KITCHEN|LAUNDRY|SPA|POOL|MORGUE|WARD|BATHROOM|SAUNA|PHARMACY|PANTRY/.test(n))return 7;
 if(/LIVING|LOUNGE|LIBRARY|BAR|DINING|VIP|CELLAR|COAT/.test(n))return 8;
 return 3}
const PLANS=[
 [/SERVER/,['machine'],[['machine',2,1]],.3],[/VAULT|SAFE/,['safe','locker'],[['table',2,1]],.55],
 [/CONTROL|X-RAY|OPERATING/,['machine','desk'],[['desk',3,1]],.45],[/LAB/,['counter','machine'],[['counter',3,1],['table',2,2]],.5],
 [/OFFICE|STUDY|MANAGER/,['shelf','plant','desk'],[['desk',2,1],['desk',2,1]],.4],[/ARCHIVE|LIBRARY/,['shelf'],[['shelf',4,1],['shelf',4,1],['table',2,2]],.75],
 [/CONFERENCE/,['plant','shelf'],[['table',4,2]],.3],[/WAITING/,['bench','plant'],[['bench',3,1],['bench',3,1]],.5],
 [/LOBBY/,['plant','bench','sofa'],[['counter',4,1],['sofa',3,1],['table',2,2]],.45],[/BALLROOM/,['plant','bench'],[['table',2,2],['table',2,2],['table',2,2],['table',2,2]],.3],
 [/ATRIUM/,['plant','planter'],[['planter',2,2],['planter',3,1]],.5],[/DANCE/,['dj','plant'],[['dj',3,1]],.2],
 [/CHAPEL/,['plant'],[['bench',4,1],['bench',4,1],['bench',4,1],['bench',4,1]],.3],[/CAFETERIA|MESS/,['counter','machine'],[['table',2,2],['table',2,2],['table',2,2],['table',4,1]],.35],
 [/STAGE/,['dj','machine'],[['stage',5,2]],.3],[/KITCHEN|PANTRY/,['counter','machine','shelf'],[['counter',4,1],['table',2,1]],.7],
 [/LAUNDRY/,['machine','counter'],[['machine',3,1],['table',2,1]],.55],[/SPA|SAUNA/,['bench','plant'],[['bed',1,2],['bed',1,2],['planter',2,1]],.4],
 [/POOL/,['bench','plant'],[['water',5,3]],.3],[/MORGUE/,['locker','counter'],[['hbed',2,1],['hbed',2,1],['hbed',2,1]],.5],
 [/WARD|SUITE|BEDROOM|NURSERY/,['shelf','locker','plant'],[['bed',1,2],['bed',1,2]],.35],[/BATHROOM/,['counter','plant'],[['table',1,1]],.4],
 [/PHARMACY/,['shelf','counter'],[['counter',4,1]],.6],[/LIVING|LOUNGE|VIP/,['plant','shelf','piano'],[['sofa',3,1],['table',2,1],['sofa',3,1]],.35],
 [/DINING/,['shelf','plant'],[['table',3,2]],.3],[/BAR/,['counter','shelf'],[['counter',5,1],['table',2,1],['table',2,1]],.5],
 [/COAT|CELLAR/,['shelf','barrel'],[['shelf',3,1]],.6],[/GARAGE/,['machine','barrel','shelf'],[['carL',2,1],['carL',2,1]],.4],
 [/WORKSHOP|ASSEMBLY/,['machine','barrel','shelf'],[['machine',2,2],['machine',3,1],['table',3,1]],.5],[/BOILER|PUMP/,['pipe','tank','machine'],[['tTL',2,2],['pipe',4,1]],.55],
 [/DOCKS|STORAGE/,['barrel','shelf'],[['crate',2,2],['crate',3,2],['crate',2,1]],.5],[/COLD/,['shelf','locker'],[['crate',2,2],['shelf',3,1]],.55],
 [/ARMORY/,['locker','shelf'],[['table',3,1]],.7],[/GYM/,['gym','bench'],[['gym',3,1],['bench',2,1]],.4],[/LOCKER|CELL/,['locker','bench'],[['bench',3,1]],.5]];
function planOf(n){for(const p of PLANS)if(p[0].test(n||''))return p;return[0,['plant','shelf'],[['table',2,1]],.3]}
function putF(x,y,k,c){if(!map[y]||map[y][x]!==1)return;if(k==='crate'){map[y][x]=6;return}map[y][x]=10;fk[y*W+x]=KD[k];fc[y*W+x]=c|0}
function furnishFloor(o,rn,keep){
 const PRO=new Uint8Array(W*H);
 const mark=(x,y,r)=>{for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const a=x+i,b=y+j;if(a>=0&&b>=0&&a<W&&b<H)PRO[b*W+a]=1}};
 const lane=(tx,ty)=>{const ri=roomIdx(tx,ty-o);if(ri<0)return;const r=ROOMS[ri],cx=(r[0]+r[2])>>1,cy=(r[1]+r[3])>>1+0;let x=tx,y=ty;const sx=Math.sign(cx-x);while(x!==cx){mark(x,y,0);PRO[(y+1)*W+x]=1;x+=sx}const sy=Math.sign(cy+o-y);while(y!==cy+o){mark(x,y,0);PRO[y*W+x+1]=1;y+=sy}mark(cx,cy+o,1)};
 for(const[x,y,q]of DOORS){const ys=y+o,ts=q==='h'?[[x,ys],[x+1,ys]]:[[x,ys],[x,ys+1]];for(const[a,b]of ts){mark(a,b,2);for(const[dx,dy]of D4)if(roomIdx(a+dx,b+dy-o)>=0)lane(a+dx,b+dy)}}
 if(!o)for(const[w,a,b,ax]of EN)for(let k=a;k<=b;k++){const ins=ax==='x'?[k,w+(w===BY0?1:-1)]:[w+(w===BX0?1:-1),k];lane(ins[0],ins[1]);mark(ins[0],ins[1],3)}
 else for(const a of RAP)for(const[ix,iy]of a.inside){lane(ix,iy);mark(ix,iy,3)}
 for(const[p,q]of STAIRS){const s=o?q:p;lane(s[0],s[1]);mark(s[0],s[1],3)}
 for(const q of keep)mark(q[0],q[1]+o,4);
 const isF=(x,y)=>map[y]&&map[y][x]===1&&!PRO[y*W+x];
 const busy=(x,y)=>{const t=map[y]&&map[y][x];return t===6||t===7||t===10};
 const fits=(x,y,w,h)=>{for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){const a=x+i,b=y+j;if(i>=0&&j>=0&&i<w&&j<h){if(!isF(a,b))return false}else if(busy(a,b))return false}return true};
 const put=(x,y,k,w,h)=>{const c=rn()*6|0;if(k==='carL'){putF(x,y,'carL',c);putF(x+1,y,'carR',c);return}
  if(k==='tTL'){putF(x,y,'tTL');putF(x+1,y,'tTR');putF(x,y+1,'tBL');putF(x+1,y+1,'tBR');return}
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)putF(x+i,y+j,k,c)};
 ROOMS.forEach((r,ri)=>{const[x0,y0,x1,y1,nm]=r,pl=planOf(nm),wk=pl[1],cs=pl[2],dens=pl[3],cat=catOf(nm);
  if(ri===SECR&&!o)for(const yy of[y0+1,y1-1])for(let x=x0+2;x<=x1-2;x+=2)if(isF(x,yy+o))map[yy+o][x]=7;
  const sides=[[x0,y0+o,1,0,x1-x0+1],[x0,y1+o,1,0,x1-x0+1],[x0,y0+o,0,1,y1-y0+1],[x1,y0+o,0,1,y1-y0+1]];
  for(const[sx,sy,dx,dy,len]of sides){let i=1;while(i<len-1){if(rn()<dens*.55){const L=2+(rn()*3|0),k=wk[rn()*wk.length|0];for(let j=0;j<L&&i+j<len-1;j++){const x=sx+dx*(i+j),y=sy+dy*(i+j);if(isF(x,y))putF(x,y,k,rn()*6|0)}i+=L+1+(rn()*2|0)}else i++}}
  const nc=Math.round((x1-x0)*(y1-y0)/55*(.6+dens));
  for(let a=0;a<nc&&cs.length;a++){const[k,w,h]=cs[rn()*cs.length|0];for(let tr=0;tr<14;tr++){const x=x0+2+(rn()*Math.max(1,x1-x0-3-w)|0),y=y0+2+(rn()*Math.max(1,y1-y0-3-h)|0)+o;if(fits(x,y,w,h)){put(x,y,k,w,h);break}}}
  if(cat===6&&(x1-x0)>9&&(y1-y0)>8)for(let y=y0+3;y<y1-2;y+=6)for(let x=x0+3;x<x1-2;x+=6)if(isF(x,y+o)&&fits(x,y+o,1,1))map[y+o][x]=2})}
// ---- exteriors ----
const XTH={city:{g:['#2b4630','#36593b','#223a28'],p:['#6b6f76','#5d6168','#7a7e86'],r:'#30343b'},estate:{g:['#2f5f36','#3c7142','#244c2b'],p:['#8a8478','#7a7468','#9a9488'],r:'#33363c'},ind:{g:['#55554c','#625f55','#47473f'],p:['#78787a','#6a6a6c','#868688'],r:'#2e3136'},snow:{g:['#dfe8ef','#cdd9e3','#eef3f7'],p:['#b6c0c9','#a6b0b9','#c4ccd4'],r:'#454a52'}};
function buildExt(){
 const mp=MAPS[CURM]||{},th=mp.xt||'city';let sd=SEED*131+17;const rn=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
 const yx0=2,yx1=W-3,yy0=2,yy1=BY1+4,cxs=(BX0+BX1)>>1,XP=new Uint8Array(W*H);pathA.fill(0);
 for(let y=BY0-2;y<=BY1+2;y++)for(let x=BX0-2;x<=BX1+2;x++)XP[y*W+x]=1;
 for(let x=cxs-10;x<=cxs+10;x++)for(let y=BY1+1;y<=BY1+6;y++)XP[y*W+x]=1;
 for(const[w,a,b,ax]of EN)for(let k=a-2;k<=b+2;k++)for(let dd=1;dd<=4;dd++){const x=ax==='x'?k:(w===BX0?w-dd:w+dd),y=ax==='x'?(w===BY0?w-dd:w+dd):k;if(x>0&&y>0&&x<W&&y<H)XP[y*W+x]=1}
 for(const a of RAP)for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++)XP[(a.oy+j)*W+a.ox+i]=1;
 const can=(x,y)=>x>1&&y>1&&x<W-2&&y<=BY1+3&&map[y][x]===0&&!XP[y*W+x];
 const busy=(x,y)=>map[y]&&map[y][x]===10;
 const put=(x,y,k,c)=>{map[y][x]=10;fk[y*W+x]=KD[k];fc[y*W+x]=c|0};
 const free=(x,y,w,h)=>{for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){const a=x+i,b=y+j;if(i>=0&&j>=0&&i<w&&j<h){if(!can(a,b))return false}else if(busy(a,b))return false}return true};
 // gates + fences
 const gS=[],gN=[Math.round(W*.28),Math.round(W*.72)],gW=[Math.round((BY0+BY1)/2)],gE=[BY0+12,Math.round((BY0+BY1)/2),BY1-12];
 for(let g0=cxs-84;g0<=cxs+84;g0+=28)if(g0>6&&g0<W-6)gS.push(g0);
 const inG=(v,L)=>L.some(c=>Math.abs(v-c)<=2);
 for(let x=yx0;x<=yx1;x++){if(!inG(x,gN)&&map[yy0][x]===0)put(x,yy0,'fence');if(!inG(x,gS)&&map[yy1][x]===0)put(x,yy1,'fence')}
 for(let y=yy0;y<=yy1;y++){if(!inG(y,gW)&&map[y][yx0]===0)put(y===yy0||y===yy1?yx0:yx0,y,'fenceV');if(!inG(y,gE)&&map[y][yx1]===0)put(yx1,y,'fenceV')}
 for(const gx of gS)for(let y=BY1+3;y<=yy1;y++)for(let x=gx-2;x<=gx+2;x++)pathA[y*W+x]=1;
 for(const gx of gN)for(let y=yy0;y<=BY0-3;y++)for(let x=gx-2;x<=gx+2;x++)pathA[y*W+x]=1;
 for(const gy of gW)for(let x=yx0;x<=BX0-3;x++)for(let y=gy-2;y<=gy+2;y++)pathA[y*W+x]=1;
 for(const gy of gE)for(let x=BX1+3;x<=yx1;x++)for(let y=gy-2;y<=gy+2;y++)pathA[y*W+x]=1;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pathA[y*W+x])XP[y*W+x]=1;
 // street: parked cars on the near and far kerb lanes
 for(const ry of[6,8])for(let x=4;x<W-6;x+=2+(rn()*5|0)){const y=BY1+ry;if(map[y][x]===0&&map[y][x+1]===0&&rn()<.55){const c=rn()*6|0;put(x,y,'carL',c);put(x+1,y,'carR',c);x+=2}}
 // hedge line around the building
 const dd=(x,y)=>Math.max(BX0-x,x-BX1,BY0-y,y-BY1);
 for(let y=BY0-3;y<=BY1+3;y++)for(let x=BX0-3;x<=BX1+3;x++)if(dd(x,y)===3&&can(x,y)&&((x*7+y*3)%11<7)&&y<=BY1+2)put(x,y,'hedge');
 // lawn scatter
 const tp={city:.012,estate:.05,ind:.004,snow:.05}[th];
 for(let y=yy0+1;y<yy1;y++)for(let x=yx0+1;x<yx1;x++)if(can(x,y)&&dd(x,y)>=5&&rn()<tp&&free(x,y,1,1))put(x,y,th==='snow'?'pine':'tree');
 if(th==='city'||th==='estate'){for(let i=0;i<14;i++){const x=yx0+2+(rn()*(yx1-yx0-4)|0),y=BY1+3;if(can(x,y)&&free(x,y,1,1))put(x,y,rn()<.5?'bench':'planter')}
  for(let i=0;i<8;i++){const x=BX0+3+(rn()*(BX1-BX0-6)|0),y=BY0-3;if(can(x,y)&&free(x,y,1,1))put(x,y,'dump')}
  for(let x=10;x<W-10;x+=13){const y=BY1+3;if(can(x,y)&&free(x,y,1,1))put(x,y,'lamp')}}
 if(th==='estate'||mp.pool){for(let tr=0;tr<30;tr++){const px=BX1+7+(rn()*10|0),py=BY0+4+(rn()*(BY1-BY0-20)|0);let ok=true;for(let j=-1;j<=5&&ok;j++)for(let i=-1;i<=9;i++)if(!can(px+i,py+j)||busy(px+i,py+j)){ok=false;break}
   if(ok){for(let j=-1;j<=5;j++)for(let i=-1;i<=9;i++)pathA[(py+j)*W+px+i]=2;for(let j=0;j<4;j++)for(let i=0;i<8;i++)put(px+i,py+j,'water');for(let i=0;i<8;i+=3)if(can(px+i,py+4))put(px+i,py+4,'bench');break}}}
 if(th==='ind'){const isRef=mp.n==='REFINERY';
  for(let i=0;i<(isRef?10:3);i++)for(let tr=0;tr<40;tr++){const x=yx0+3+(rn()*(yx1-yx0-8)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=5&&free(x,y,2,2)){put(x,y,'tTL');put(x+1,y,'tTR');put(x,y+1,'tBL');put(x+1,y+1,'tBR');break}}
  for(let i=0;i<(isRef?9:26);i++)for(let tr=0;tr<40;tr++){const v=rn()<.5,L=3+(rn()*2|0),w=v?1:L,h=v?L:1,x=yx0+3+(rn()*(yx1-yx0-8)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=5&&free(x,y,w,h)){const c=rn()*6|0;for(let j=0;j<h;j++)for(let q=0;q<w;q++)put(x+q,y+j,'cont',c);break}}
  for(let i=0;i<16;i++)for(let tr=0;tr<30;tr++){const x=yx0+3+(rn()*(yx1-yx0-8)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=4&&free(x,y,2,1)){put(x,y,'barrel');put(x+1,y,'barrel');break}}
  if(isRef)for(let i=0;i<7;i++)for(let tr=0;tr<30;tr++){const L=6+(rn()*6|0),x=yx0+3+(rn()*(yx1-yx0-L-6)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=5&&free(x,y,L,1)){for(let q=0;q<L;q++)put(x+q,y,'pipe');break}}}}
function extArt(P,x,y,n){
 const th=XTH[(MAPS[CURM]||{}).xt||'city']||XTH.city;
 if(y>=OY){if(y>OY+BY1+3){P(0,0,T,T,'#05070a');return true}if(x>=BX0&&x<=BX1&&y>=OY+BY0&&y<=OY+BY1)return false;
  if(fk[y*W+x]===KD.ledge){P(0,0,T,T,'#4a4e56');P(0,0,T,2,'#6a6f78');P(0,T-2,T,2,'#2e3138');for(let i=0;i<4;i++)P(n()*14|0,n()*14|0,2,1,'#5a5e66')}
  else{P(0,0,T,T,'#07090e');for(let i=0;i<3;i++)if(n()<.45)P(n()*15|0,n()*15|0,1,1,n()<.5?'#2a3550':'#cdb86a')}return true}
 if(y>BY1+9){P(0,0,T,T,'#05070a');return true}
 if(x>=BX0&&x<=BX1&&y>=BY0&&y<=BY1)return false;
 const d=Math.max(BX0-x,x-BX1,BY0-y,y-BY1),ry=y-BY1;
 if(ry>=5){if(ry===5||ry===9){P(0,0,T,T,th.p[0]);P(0,ry===5?T-2:0,T,2,th.p[1]);for(let i=0;i<3;i++)P(n()*15|0,n()*15|0,1,1,th.p[2])}
  else{P(0,0,T,T,th.r);for(let i=0;i<10;i++)P(n()*15|0,n()*15|0,1,1,'#3a3f47');if(ry===7&&x%3!==0)P(2,7,10,2,'#d8b43a');if(x%44<4&&ry!==7){for(let k=0;k<4;k++)P(k*4,0,2,T,'#c8ccd2')}}return true}
 const pa=pathA[y*W+x];
 if(pa===2){P(0,0,T,T,'#a58a62');for(let k=0;k<4;k++)P(0,k*4+3,T,1,'#7e6844');return true}
 if(d<=2||pa===1||(y>BY1&&y<=BY1+4)){P(0,0,T,T,th.p[0]);P(0,7,T,1,th.p[1]);P(7,0,1,T,th.p[1]);P(1,1,1,1,th.p[2]);P(9,10,1,1,th.p[2]);if(d===1)P(0,0,T,1,'rgba(0,0,0,.18)');return true}
 P(0,0,T,T,th.g[0]);for(let i=0;i<16;i++)P(n()*15|0,n()*15|0,1,1,th.g[1+(n()<.5?1:0)]);if(n()<.04&&(MAPS[CURM]||{}).xt==='estate')P(n()*13|0,n()*13|0,2,2,['#e8c8d8','#f0e060','#d8e8f8'][n()*3|0]);return true}
function drawWin(P,r){P(0,0,T,T,'#26303c');P(0,0,T,2,'#3b4658');P(0,T-2,T,2,'#1a2028');P(2,3,12,10,'#3f6f94');P(2,3,12,2,'#7fb2d4');P(3,5,3,6,'#4f82a8');P(7,3,1,10,'#26303c');P(2,8,12,1,'#26303c');if(r<.7){P(4,4,1,5,'#d8ecf8');P(5,8,3,1,'#d8ecf8');P(10,6,1,4,'#d8ecf8')}if(r<.35){P(3,3,6,6,'#0e1218');P(9,8,4,4,'#0e1218')}}
function drawFurn(P,x,y,n){const k=fk[y*W+x],c=fc[y*W+x],sh=()=>P(0,14,16,2,'rgba(0,0,0,.35)');
 switch(k){
 case 0:P(2,3,12,10,'#4a3420');P(2,2,12,10,'#8a6a46');P(2,2,12,1,'#a98458');P(4,4,3,2,'#b79b72');P(9,7,3,2,'#6e5334');sh();break;
 case 1:P(1,1,14,14,'#2a2f3a');P(2,2,12,12,['#cfd6de','#d9c7a0','#b7cde0','#d8a8a8'][c&3]);P(3,3,10,3,'#ffffff');P(2,7,12,7,['#3f6fa8','#7a3f3f','#4a7a5a','#6a4a8a'][c&3]);P(2,7,12,1,'#1e2a40');break;
 case 2:P(1,3,14,11,'#2a2236');P(1,3,14,3,'#3a2f4a');P(2,6,6,7,['#6a4a7a','#4a5a7a','#7a4a4a','#4a6a5a'][c&3]);P(8,6,6,7,['#6a4a7a','#4a5a7a','#7a4a4a','#4a6a5a'][c&3]);P(8,6,1,7,'#1a1420');sh();break;
 case 3:P(0,2,16,12,'#33363c');P(0,2,16,3,'#a6acb6');P(0,5,16,1,'#6c727c');P(0,13,16,1,'#1a1c20');for(let i=2;i<16;i+=5)P(i,8,3,3,'#4a4e56');break;
 case 4:P(0,1,16,13,'#2b1f14');for(let r=0;r<3;r++){P(1,2+r*4,14,3,'#4a3828');for(let i=0;i<7;i++)P(1+i*2,2+r*4,1,3,['#a83a30','#3a5a8a','#c8a038','#4a7a4a','#7a4a8a'][(i+r+c)%5])}break;
 case 5:P(1,0,14,15,'#2a3038');P(2,1,6,13,'#5a6572');P(8,1,6,13,'#4c5662');P(2,1,12,1,'#8a96a4');P(7,6,1,3,'#cfd6de');P(9,6,1,3,'#cfd6de');P(3,3,4,1,'#2a3038');P(9,3,4,1,'#2a3038');break;
 case 6:P(1,1,14,14,'#14181e');P(2,2,12,12,'#3a4350');P(3,3,10,4,'#0c1218');P(4,4,2,1,'#6aff9a');P(7,4,2,1,'#ffb62e');P(10,4,2,1,'#4aa8ff');P(3,9,3,3,'#5a6572');P(8,9,5,3,'#2a3038');P(9,10,1,1,'#e0453a');break;
 case 7:P(3,1,10,14,'#14100e');P(4,2,8,12,'#6a2a22');P(4,2,8,1,'#8a3a30');P(4,5,8,1,'#3a1612');P(4,10,8,1,'#3a1612');P(5,3,2,1,'#c85a4a');break;
 case 8:P(0,3,16,10,'#4a3a28');P(0,3,16,2,'#6a5238');P(5,4,6,5,'#0c0e12');P(6,5,4,3,'#4aa0e8');P(7,10,2,1,'#cfd6de');P(1,6,3,4,'#d8d0b8');sh();break;
 case 9:P(5,9,6,5,'#6a4a30');P(5,9,6,1,'#8a6a48');for(const[a,b]of[[3,2],[7,1],[10,3],[4,5],[8,5],[6,3]])P(a,b,4,4,'#2f7a3a');P(5,3,2,2,'#4ab058');P(9,4,2,2,'#4ab058');break;
 case 10:P(0,5,16,6,'#3a3e46');P(0,6,16,2,'#8a8f98');P(0,8,16,1,'#5a5e66');P(0,10,16,1,'#22252a');P(3,4,2,8,'#6a6f78');P(11,4,2,8,'#6a6f78');break;
 case 11:P(2,2,12,12,'#6a6f78');P(3,3,10,10,'#8a8f98');P(4,4,4,3,'#b8bec8');break;
 case 12:P(0,1,16,14,CONC[c%6]);P(0,1,16,2,'rgba(255,255,255,.22)');P(0,13,16,2,'rgba(0,0,0,.35)');for(let i=2;i<16;i+=4)P(i,3,1,10,'rgba(0,0,0,.28)');break;
 case 13:P(1,3,15,10,'#0b0d11');P(2,4,14,8,CARC[c%6]);P(2,4,14,2,'rgba(255,255,255,.25)');P(6,5,9,6,'#1c2430');P(7,6,2,4,'#6a8fb0');P(1,5,2,2,'#f0e8a0');P(1,10,2,2,'#f0e8a0');P(3,12,3,2,'#0b0d11');P(11,12,3,2,'#0b0d11');break;
 case 14:P(0,3,15,10,'#0b0d11');P(0,4,14,8,CARC[c%6]);P(0,4,14,2,'rgba(255,255,255,.25)');P(0,5,6,6,'#1c2430');P(2,6,2,4,'#6a8fb0');P(13,5,2,2,'#c8281e');P(13,10,2,2,'#c8281e');P(2,12,3,2,'#0b0d11');P(10,12,3,2,'#0b0d11');break;
 case 15:P(1,1,14,14,'#16301c');P(2,0,12,15,'#245a2c');P(3,1,10,12,'#2f7a3a');for(let i=0;i<10;i++)P(3+(n()*9|0),2+(n()*9|0),2,2,n()<.5?'#3f9a4a':'#1f5a2a');P(5,3,3,2,'#58b862');break;
 case 16:P(0,3,16,11,'#16301c');P(0,2,16,10,'#2f6a3a');for(let i=0;i<9;i++)P(n()*14|0,2+(n()*8|0),2,2,n()<.5?'#3f8a4a':'#244f2c');P(0,2,16,1,'#4a9a58');break;
 case 17:P(0,6,16,2,'#8a909a');P(0,6,16,1,'#c8ced6');for(let i=1;i<16;i+=4){P(i,3,2,9,'#6a7078');P(i,3,2,1,'#c8ced6')}break;
 case 39:P(6,0,2,16,'#8a909a');P(6,0,1,16,'#c8ced6');for(let i=1;i<16;i+=4){P(3,i,8,2,'#6a7078')}break;
 case 18:P(1,4,14,3,'#6a4a2c');P(1,8,14,3,'#6a4a2c');P(1,4,14,1,'#8a6a44');P(2,11,2,3,'#2a2d33');P(12,11,2,3,'#2a2d33');break;
 case 19:P(1,3,14,11,'#0e1410');P(2,4,12,9,'#2f5a3a');P(2,4,12,2,'#47805a');P(2,9,12,1,'#1f3a26');break;
 case 20:P(6,6,4,4,'#2a2d33');P(7,7,2,2,'#f0e8a0');P(4,4,8,8,'rgba(240,232,160,.15)');break;
 case 21:P(1,1,14,14,'#6a6f78');P(2,2,12,12,'#3a2a1c');for(const[a,b]of[[3,3],[8,4],[5,8],[9,9]])P(a,b,3,3,'#3f9a4a');break;
 case 22:P(0,0,16,16,'#3a2c20');P(1,1,14,13,'#5a4630');P(0,14,16,2,'#1a120c');P(3,3,2,2,'#a88a5a');break;
 case 23:P(1,2,14,12,'#0c0e12');P(2,3,12,5,'#1c2028');for(let i=3;i<14;i+=2)P(i,9,1,4,'#e8e8e8');break;
 case 24:P(1,1,14,14,'#8a909a');P(2,2,12,12,'#e8eef4');P(2,2,5,4,'#ffffff');P(1,7,14,1,'#8a909a');P(1,10,14,1,'#8a909a');break;
 case 27:P(1,2,14,12,'#0e1014');P(2,3,12,10,'#8a909a');P(5,5,6,6,'#2a2d33');P(7,7,2,2,'#6a6f78');break;
 case 29:P(1,1,14,14,'#14161a');P(2,2,12,12,'#555a62');P(3,3,10,1,'#8a909a');P(8,8,3,3,'#c8a038');P(9,9,1,1,'#14161a');break;
 case 30:P(1,1,14,14,'#14161a');P(2,2,12,12,'#3a3e46');P(3,3,10,3,'#c8281e');P(4,8,8,5,'#22252a');break;
 case 31:P(0,2,16,12,'#1a1226');P(1,3,14,10,'#3a2a5a');P(3,5,4,4,'#0c0e12');P(9,5,4,4,'#0c0e12');P(4,6,2,2,'#d85ad8');P(10,6,2,2,'#5ad8d8');break;
 case 32:P(4,2,12,14,'#6a6f78');P(2,4,14,12,'#6a6f78');P(5,4,3,2,'#b8bec8');break;
 case 33:P(0,2,12,14,'#6a6f78');P(0,4,14,12,'#6a6f78');P(5,4,3,2,'#8a909a');break;
 case 34:P(4,0,12,14,'#4a4f58');P(2,0,14,12,'#4a4f58');break;
 case 35:P(0,0,12,14,'#4a4f58');P(0,0,14,12,'#4a4f58');P(0,13,14,2,'rgba(0,0,0,.3)');break;
 case 36:P(0,0,16,16,'#2a6a9a');for(let i=0;i<4;i++)P(n()*13|0,n()*13|0,3,1,'#6ab0d8');P(0,0,16,1,'#8fc8e8');break;
 case 37:P(2,2,12,12,'#14301f');P(3,3,10,10,'#1f4a34');P(5,5,6,6,'#2a5e42');P(4,3,8,2,'#e8f0f6');P(6,8,4,2,'#e8f0f6');break;
 }}
function bakeSupport(){}
// ---- timed building + crowbar ----
function barrPair(tx,ty){for(const[dx,dy]of D4)if(map[ty+dy]&&map[ty+dy][tx+dx]===9)return[tx+dx,ty+dy];return null}
function breakBarr(tx,ty){if(!map[ty]||map[ty][tx]!==9)return;const p=barrPair(tx,ty);setTile(tx,ty,5);if(p)setTile(p[0],p[1],5);boom(tx*T+8,ty*T+8,16,'#b27a42');sfx(130,.25,'sawtooth',.06)}
function buildTgt(me){let f=null;
 if(keys.b){for(let d=6;d<=40&&!f;d+=3){const x=me.x+Math.cos(me.a)*d,y=me.y+Math.sin(me.a)*d,tx=x/T|0,ty=y/T|0,t=map[ty]&&map[ty][tx];if(t===5)f={tx,ty,k:'b'};else if(t===3&&G.phase==='prep')f={tx,ty,k:'r'}}}
 else{const tx=(mouse.x+cam.x)/T|0,ty=(mouse.y+cam.y)/T|0,t=map[ty]&&map[ty][tx];if(t===3&&dst(me.x,me.y,tx*T+8,ty*T+8)<72)f={tx,ty,k:'r'};else if(t===5&&dst(me.x,me.y,tx*T+8,ty*T+8)<90)f={tx,ty,k:'b'}}
 if(!f){if(keys.b)G.msg='FACE A DOORWAY (OR A WALL IN PREP)';return null}
 if(f.k==='r'&&G.reinf>=REINF){G.msg='NO REINFORCEMENTS LEFT';return null}
 if(f.k==='b'&&G.barr>=BARR){G.msg='NO BARRICADES LEFT';return null}
 if(f.k==='b'&&G.bcd>0&&G.phase==='act')return null;return f}
function buildBarr(){}
// ---- rappel ----
function rapNear(e){if(!RAP.length)return null;if(e.y<OY*T){for(let i=0;i<RAP.length;i++){const a=RAP[i];if(dst(e.x,e.y,a.ox*T+8,a.oy*T+8)<15)return{i,s:'g'}}}else for(let i=0;i<RAP.length;i++){const a=RAP[i];if(dst(e.x,e.y,a.ix*T+8,a.iy*T+8)<16)return{i,s:'i'}}return null}
function winState(a){return map[a.win[0][1]][a.win[0][0]]}
function rapMove(e,i,to){const a=RAP[i];
 if(to==='hang'){e.x=a.hx*T+8;e.y=a.hy*T+8;e.rps='hang';e.rpi=i;e.rpp=0;e.a=Math.atan2(a.win[0][1]*T+8-e.y,a.win[0][0]*T+8-e.x);boom(e.x,e.y,6,'#cfd6de');sfx(380,.08,'triangle',.04);return}
 if(to==='in'){const st=winState(a);if(st===4){if(e===G.me)G.msg='WINDOW IS REINFORCED';e.rpp=0;return false}
  for(const[x,y]of a.win)if(map[y][x]===3||map[y][x]===4){setTile(x,y,1)}boom(a.win[0][0]*T+8,a.win[0][1]*T+8,18,'#9ac8e8');sfx(240,.25,'sawtooth',.07);e.x=a.ix*T+8;e.y=a.iy*T+8;e.rps=null;e.rpi=-1;e.stun=Math.max(e.stun,20);return true}
 if(to==='ground'){e.x=a.ox*T+8;e.y=a.oy*T+8;e.rps=null;e.rpi=-1;sfx(300,.1,'triangle',.04)}}
function rapTick(me){if(G.phase!=='act'){me.rpp=0;return}
 if(me.rps==='hang'){const a=RAP[me.rpi];me.x=a.hx*T+8;me.y=a.hy*T+8;me.lock=1;me.mv=0;const down=!!keys.s;
  if(keys.x){me.rpp=(me.rpp||0)+1;const need=down?RAP_UP:RAP_KICK;G.prog={t:down?'DESCENDING':'KICKING IN',v:me.rpp/need,c:'#7ed0ff'};if(me.rpp>=need){me.rpp=0;rapMove(me,me.rpi,down?'ground':'in')}}else me.rpp=0;return}
 const n=rapNear(me);if(n&&keys.x){me.lock=1;me.mv=0;me.rpp=(me.rpp||0)+1;const need=n.s==='g'?RAP_UP:RAP_KICK;G.prog={t:n.s==='g'?'ATTACHING ROPE':'GOING OUT',v:me.rpp/need,c:'#7ed0ff'};if(me.rpp>=need){me.rpp=0;rapMove(me,n.i,'hang')}}else me.rpp=0}
function rapBot(e,gx,gy,sp){if(!RAP.length)return false;
 if(e.rps==='hang'){e.mv=0;e.rpp=(e.rpp||0)+1;if(e.rpp>=RAP_KICK+25){e.rpp=0;rapMove(e,e.rpi,'in')}return true}
 if(gy>=OY*T&&e.y<OY*T){if(e.useR===undefined)e.useR=Math.random()<.55;if(!e.useR)return false;
  if(e.ri===undefined){let b=0,bd=1e9;RAP.forEach((a,i)=>{const d=dst(a.ix*T+8,a.iy*T+8,gx,gy);if(d<bd){bd=d;b=i}});e.ri=b}
  const a=RAP[e.ri],px=a.ox*T+8,py=a.oy*T+8;if(dst(e.x,e.y,px,py)>10){navTo(e,px,py,sp);return true}
  e.mv=0;e.a=Math.atan2(a.win[0][1]*T-py,0)+0;e.rpp=(e.rpp||0)+1;if(e.rpp>=RAP_UP){e.rpp=0;rapMove(e,e.ri,'hang')}return true}
 return false}
// ---- thrown + placed utility ----
const THR={frag:1,flash:1},ARMQ={flash:'throw',smoke:'throw',kap:'place',mat:'place'};
function throwNade(e,k,tx,ty,fuse){const a=Math.atan2(ty-e.y,tx-e.x),d=Math.min(dst(e.x,e.y,tx,ty),THROW_R),v=Math.max(1,d*.05);
 G.nades.push({x:e.x+Math.cos(a)*7,y:e.y+Math.sin(a)*7,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:fuse,k,own:e,b:0,air:22,amp:7});sfx(300,.05,'triangle',.03)}
function stepNade(n,fx){const sp=Math.hypot(n.vx,n.vy);if(sp<.06){n.vx=n.vy=0;return}
 for(let s=0;s<2;s++){const nx=n.x+n.vx/2,ny=n.y+n.vy/2;let hit=0;
  if(solid(tileAt(nx,n.y))){n.vx*=-.5;n.vy*=.85;hit=1}else n.x=nx;
  if(solid(tileAt(n.x,ny))){n.vy*=-.5;n.vx*=.85;hit=1}else n.y=ny;
  if(hit){n.b++;n.air=9;n.amp=Math.max(2,n.amp*.5);if(fx&&n.b<5){sfx(520-n.b*70,.04,'square',.025);boom(n.x,n.y,2,'#c8c8c8')}}}
 n.vx*=.95;n.vy*=.95;if(n.air>0)n.air--}
function updNades(){for(let i=G.nades.length-1;i>=0;i--){const n=G.nades[i];stepNade(n,true);
 if(--n.t<=0){if(n.k==='frag')explode(n.x,n.y,38,75,n.own);
  else if(n.k==='smoke'){G.smokes.push({x:n.x,y:n.y,t:700,r:34});sfx(200,.4,'sine',.04)}
  else{for(const d of G.ents)if(d.alive&&d.side!==n.own.side&&dst(d.x,d.y,n.x,n.y)<100&&los(n.x,n.y,d.x,d.y))d.blind=150;G.ring.push({x:n.x,y:n.y,r:2,c:'#ffffff'});boom(n.x,n.y,10,'#ffffff');sfx(1200,.15,'sine',.05)}
  G.nades.splice(i,1)}}}
function drawNade(n){const z=n.air>0?Math.sin(Math.PI*n.air/(n.b?9:22))*n.amp:0;g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(n.x,n.y+1,3,1.6,0,0,7);g.fill();
 const x=Math.round(n.x),y=Math.round(n.y-z-2);g.fillStyle='#050608';g.fillRect(x-3,y-3,6,6);g.fillStyle=n.k==='flash'?'#e8e8e8':n.k==='smoke'?'#9aa4ae':'#4a5d3a';g.fillRect(x-2,y-2,4,4);g.fillStyle='#8a929c';g.fillRect(x-1,y-4,2,1);g.fillStyle=n.t%10<5?'#ff4a4a':'#fff';g.fillRect(x+1,y-4,1,1)}
function placePt(e,tx,ty){if(e.bot)return aimPt(e,60);const d=dst(e.x,e.y,tx,ty);if(d>PLACE_R||!los(e.x,e.y,tx,ty)||blk(tileAt(tx,ty)))return null;return{x:tx,y:ty}}
function nitroBoom(e){let any=0;for(let i=G.traps.length-1;i>=0;i--){const t=G.traps[i];if(t.k==='nitro'&&t.own===e){G.traps.splice(i,1);explode(t.x,t.y,46,85,e);any=1}}return any}
function gadget2(e,tx,ty){if(!e.alive||e.g2cd>0||!e.g2)return;const k=e.g2,tp=tx===undefined?(e===G.me?{x:mouse.x+cam.x,y:mouse.y+cam.y}:aimPt(e,110)):{x:tx,y:ty};
 if(THR[k]){if(e.g2n<=0)return;e.g2cd=30;throwNade(e,k,tp.x,tp.y,k==='frag'?100:70);e.g2n--;return}
 if(k==='nitro'&&e.g2n<=0){e.g2cd=20;nitroBoom(e);return}
 if(e.g2n<=0)return;const p=placePt(e,tp.x,tp.y);if(!p){if(e===G.me)G.msg='TOO FAR OR BLOCKED';return}
 G.traps.push({x:p.x,y:p.y,k,own:e});e.g2n--;e.g2cd=24;sfx(260,.06,'square',.04);boom(p.x,p.y,4,'#8fa3bf')}
function gadget(e,tx,ty){if(e.gcd>0||!e.alive)return;const o=e.op.gd;if(!o)return;
 if(o==='flash'||o==='smoke'||o==='kap'||o==='mat'){if(e.gn<=0)return;const tp=tx===undefined?(e===G.me?{x:mouse.x+cam.x,y:mouse.y+cam.y}:aimPt(e,110)):{x:tx,y:ty};
  if(o==='flash'||o==='smoke'){throwNade(e,o,tp.x,tp.y,o==='flash'?60:45);e.gcd=40;e.gn--;return}
  const p=placePt(e,tp.x,tp.y);if(!p){if(e===G.me)G.msg='TOO FAR OR BLOCKED';return}G.traps.push({x:p.x,y:p.y,k:o});e.gn--;e.gcd=24;sfx(260,.06,'square',.04);boom(p.x,p.y,4,'#8fa3bf');return}
 gadgetOld(e)}
function armG(e,src){if(!e.alive||G.phase==='end'||DRN()||G.cv>=0)return;if(G.arm&&G.arm.src===src){G.arm=null;return}
 if(src==='g2'){const k=e.g2;if(!k)return;if(k==='nitro'&&e.g2n<=0){gadget2(e);return}if(e.g2n<=0){G.msg='NONE LEFT';return}G.arm={src,k,kind:THR[k]?'throw':'place'}}
 else{const o=e.op.gd;if(!o)return;if(ARMQ[o]){if(e.gn<=0){G.msg='NONE LEFT';return}G.arm={src,k:o,kind:ARMQ[o]}}else gadget(e)}}
function useArmed(){const a=G.arm,e=G.me;if(!a||!e.alive)return;const tx=mouse.x+cam.x,ty=mouse.y+cam.y;if(a.src==='g2')gadget2(e,tx,ty);else gadget(e,tx,ty);
 if(a.kind==='throw'||(a.src==='g2'&&e.g2n<=0)||(a.src==='q'&&e.gn<=0))G.arm=null}
function tickX(me){if(G.rqp===undefined){G.rqp=0;G.bqp=0;G.rf=null;G.arm=null}
 me.lock=0;me.nofire=G.arm?1:0;G.prog=null;
 if(!me.alive||DRN()||G.cv>=0||PAUSED){G.rf=null;G.arm=null;return}
 // hold-to-build (reinforce a wall / barricade a doorway)
 let tgt=null;if(me.side==='D'&&G.phase!=='end'&&(keys.b||(mouse.down&&G.phase==='prep'&&!G.arm)))tgt=buildTgt(me);
 if(tgt){if(!G.rf||G.rf.tx!==tgt.tx||G.rf.ty!==tgt.ty||G.rf.k!==tgt.k)G.rf={tx:tgt.tx,ty:tgt.ty,k:tgt.k,p:0};
  const need=tgt.k==='r'?REINF_T:BARR_T;G.rf.p++;me.lock=1;me.mv=0;G.prog={t:tgt.k==='r'?'REINFORCING':'BARRICADING',v:G.rf.p/need,c:tgt.k==='r'?'#ffe14a':'#ffcf6a'};
  if(G.rf.p%13===1){sfx(tgt.k==='r'?170:210,.06,'square',.035);boom(tgt.tx*T+8,tgt.ty*T+8,2,'#b8b8b8')}
  if(G.rf.p>=need){if(tgt.k==='r'){if(map[tgt.ty][tgt.tx]===3){setTile(tgt.tx,tgt.ty,4);G.reinf++;sfx(300,.12,'square',.05);boom(tgt.tx*T+8,tgt.ty*T+8,8,'#aab4c0')}}
   else if(putBarr(tgt.tx,tgt.ty,1))G.bcd=G.phase==='prep'?10:120;G.rf=null}}
 else G.rf=null;
 // crowbar: only drawn while actually working on a barricade
 if(keys.f&&G.phase!=='end'&&me.rps!=='hang'){const r=rayHit(me,26);if(r.t===9){me.lock=1;me.nofire=1;me.mv=0;me.cwo=5;me.a=Math.atan2(r.ty*T+8-me.y,r.tx*T+8-me.x);me.cp=(me.cp||0)+1;
   G.prog={t:'CROWBAR',v:me.cp/CROW_T,c:'#e08a3a'};if(me.cp%14===1){sfx(140+Math.random()*60,.06,'square',.045);boom(r.x,r.y,3,'#b27a42')}
   if(me.cp>=CROW_T){me.cp=0;breakBarr(r.tx,r.ty);G.msg='BARRICADE DOWN'}}else me.cp=0}
 else if(me.cp>0)me.cp=Math.max(0,me.cp-4);
 rapTick(me)}
// ---- drawing helpers ----
function drawCrow(e,x,y){const a=e.a+Math.sin(G.t*.55+(e.id||0))*.8,ca=Math.cos(a),sa=Math.sin(a),bx=x+Math.cos(e.a)*5,by=y-2+Math.sin(e.a)*5;
 for(let i=0;i<11;i++){g.fillStyle=i>8?'#d8dce2':'#8a9099';g.fillRect(Math.round(bx+ca*i)-1,Math.round(by+sa*i)-1,2,2)}
 const tx=bx+ca*11,ty=by+sa*11;g.fillStyle='#c8281e';g.fillRect(Math.round(tx-sa*2)-1,Math.round(ty+ca*2)-1,2,2);g.fillRect(Math.round(tx+sa*2)-1,Math.round(ty-ca*2)-1,2,2)}
function drawHand(e,x,y){e.cwo>0?drawCrow(e,x,y):drawGun(e,x,y)}
function drawWorldExtra(){const me=G.me;
 // rappel anchors on the ground + ropes on hanging operators
 for(const a of RAP){const x=a.ox*T+8,y=a.oy*T+8;g.fillStyle='#0b0d11';g.fillRect(x-4,y-4,8,8);g.fillStyle='#d8b43a';g.fillRect(x-3,y-3,6,2);g.fillRect(x-3,y+1,6,2);g.fillStyle='#cfd6de';g.fillRect(x-1,y-3,2,6)}
 for(const e of G.ents)if(e.alive&&e.rps==='hang'){const a=RAP[e.rpi],dx=a.hx<BX0?-1:a.hx>BX1?1:0,dy=a.hy<OY+BY0?-1:a.hy>OY+BY1?1:0;g.strokeStyle='#d8c898';g.lineWidth=1;g.beginPath();g.moveTo(e.x,e.y-6);g.lineTo(e.x-dx*3,e.y-6-(dy?dy*70:70));g.stroke();g.fillStyle='#d8b43a';g.fillRect(e.x-2,e.y-8,4,2)}
 // reinforcement / barricade progress
 if(G.rf){const x=G.rf.tx*T,y=G.rf.ty*T,need=G.rf.k==='r'?REINF_T:BARR_T;g.strokeStyle=G.rf.k==='r'?'#ffe14a':'#ffcf6a';g.lineWidth=1;g.strokeRect(x+.5,y+.5,T-1,T-1);g.fillStyle='#000c';g.fillRect(x,y-5,T,4);g.fillStyle=G.rf.k==='r'?'#ffe14a':'#ffcf6a';g.fillRect(x+1,y-4,Math.round((T-2)*cl(G.rf.p/need,0,1)),2)}
 if(G.phase==='prep'){if(G.rq&&G.rq.length){const w=G.rq[G.rq.length-1];if(map[w[1]][w[0]]===3){const x=w[0]*T,y=w[1]*T;g.fillStyle='#000c';g.fillRect(x,y-5,T,4);g.fillStyle='#ffe14a';g.fillRect(x+1,y-4,Math.round((T-2)*cl(G.rqp/REINF_T,0,1)),2)}}
  if(G.bq&&G.bq.length){const w=G.bq[G.bq.length-1],x=w[0]*T,y=w[1]*T;g.fillStyle='#000c';g.fillRect(x,y-5,T,4);g.fillStyle='#ffcf6a';g.fillRect(x+1,y-4,Math.round((T-2)*cl(G.bqp/(BARR_T*2.2),0,1)),2)}}
 // crowbar bar over bots
 for(const e of G.ents)if(e.alive&&e.bot&&e.cwo>0){g.fillStyle='#000c';g.fillRect(e.x-7,e.y-20,14,3);g.fillStyle='#e08a3a';g.fillRect(e.x-6,e.y-19,Math.round(12*cl(e.bt/90,0,1)),1)}
 // throw / placement preview
 const a=G.arm;if(a&&me.alive){const tx=mouse.x+cam.x,ty=mouse.y+cam.y;
  if(a.kind==='throw'){const n={x:me.x+Math.cos(Math.atan2(ty-me.y,tx-me.x))*7,y:me.y+Math.sin(Math.atan2(ty-me.y,tx-me.x))*7,vx:0,vy:0,b:0,air:22,amp:7},aa=Math.atan2(ty-me.y,tx-me.x),d=Math.min(dst(me.x,me.y,tx,ty),THROW_R),v=Math.max(1,d*.05);n.vx=Math.cos(aa)*v;n.vy=Math.sin(aa)*v;
   g.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<150&&Math.hypot(n.vx,n.vy)>=.06;i++){stepNade(n,false);if(i%5===0)g.fillRect(Math.round(n.x),Math.round(n.y),1,1)}
   g.strokeStyle='#ffe14a';g.lineWidth=1;g.beginPath();g.arc(n.x,n.y,a.k==='frag'?38:a.k==='smoke'?30:100*.35,0,7);g.stroke()}
  else{const ok=!!placePt(me,tx,ty);g.strokeStyle=ok?'#6aff9a':'#ff4a4a';g.lineWidth=1;g.beginPath();g.arc(tx,ty,5,0,7);g.stroke();g.beginPath();g.arc(me.x,me.y,PLACE_R,0,7);g.globalAlpha=.25;g.stroke();g.globalAlpha=1;g.fillStyle=ok?'rgba(106,255,154,.35)':'rgba(255,74,74,.35)';g.fillRect(Math.round(tx)-3,Math.round(ty)-3,6,6)}}}
function hudExtra(me){
 if(G.prog){const w=96,x=VW/2-w/2,y=VH2-44;g.fillStyle='#000c';g.fillRect(x-3,y-13,w+6,21);T8(G.prog.t,VW/2,y-11,G.prog.c||'#ffe14a','center');g.fillStyle='#1a1d24';g.fillRect(x,y,w,5);g.fillStyle=G.prog.c||'#ffe14a';g.fillRect(x,y,Math.round(w*cl(G.prog.v,0,1)),5)}
 let hint='';
 if(G.arm)hint=(G.arm.kind==='throw'?'CLICK: THROW':'CLICK: PLACE')+'   RIGHT CLICK: CANCEL';
 else if(me.alive&&G.phase!=='end'&&!DRN()&&G.cv<0){const r=rayHit(me,26);
  if(r.t===9)hint='HOLD F: CROWBAR';else if(me.rps==='hang')hint='HOLD X: KICK IN    S + X: DESCEND';
  else{const n=G.phase==='act'?rapNear(me):null;if(n)hint=n.s==='g'?'HOLD X: RAPPEL UP':'HOLD X: RAPPEL OUT';else if(G.phase==='prep'&&me.side==='D'&&!G.prog)hint='HOLD CLICK: REINFORCE WALL    HOLD B: BARRICADE DOOR'}}
 if(hint){const tw=hint.length*6+10;g.fillStyle='rgba(8,10,14,.85)';g.fillRect(VW/2-tw/2,VH2-62,tw,12);T8(hint,VW/2,VH2-60,'#ffd27a','center')}}
function r6xInit(){
 cv.addEventListener('mousedown',e=>{if(!G)return;if(e.button===2){if(G.arm)G.arm=null;else if(G.me.alive&&G.me.g2==='nitro'&&G.phase==='act')nitroBoom(G.me);return}
  if(e.button===0&&G.arm){useArmed();mouse.down=false}})}
