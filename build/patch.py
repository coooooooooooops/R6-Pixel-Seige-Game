import re,shutil
P='/home/claude/r6-pixel-siege-extension/'
s=open(P+'game.js').read()
def rep(old,new,cnt=1):
    global s
    n=s.count(old)
    assert n==cnt,(n,old[:80])
    s=s.replace(old,new)
def rex(pat,new):
    global s
    m=re.subn(pat,lambda m:new,s,count=1,flags=re.S)
    assert m[1]==1,pat[:80]
    s=m[0]
# world size + margins
rep("const W=136,H=176,T=16","const W=168,H=216,T=16")
rep("const BX0=6,BY0=3,REINF=9","const BX0=14,BY0=12,REINF=9")
rep("let BX1=73,BY1=46,OY=62;","let BX1=73,BY1=46,OY=62;let RAP=[],ROOMCAT=[],CURM=0;")
rep("m.cw=grow(m.cw,92);m.rh=grow(m.rh,54)","m.cw=grow(m.cw,118);m.rh=grow(m.rh,64)")
# theme data per map
rep("const MAPS=[","const MAPX={BUILDING:['city',['OFFICE','LOBBY','ARCHIVE','LAB','KITCHEN','CAFETERIA','CONTROL ROOM','STORAGE','GARAGE','LIBRARY','LOUNGE','GYM']],EMBASSY:['city',['BALLROOM','LOBBY','OFFICE','LIBRARY','ARCHIVE','KITCHEN','LOUNGE','CHAPEL','CONTROL ROOM','ATRIUM','MESS HALL','STUDY']],HOUSE:['estate',['KITCHEN','LIVING ROOM','BEDROOM','BATHROOM','DINING ROOM','STUDY','LAUNDRY','GARAGE','PANTRY','NURSERY']],'NIGHT CLUB':['city',['BAR','DANCE FLOOR','VIP LOUNGE','STAGE','STORAGE','KITCHEN','OFFICE','COAT CHECK','CELLAR','BAR']],BANK:['city',['LOBBY','VAULT','OFFICE','ARCHIVE','SAFE DEPOSIT','CONTROL ROOM','STORAGE','MANAGER','CAFETERIA','OFFICE']],CONSULATE:['estate',['LOBBY','OFFICE','ARCHIVE','LIBRARY','CHAPEL','KITCHEN','BEDROOM','STUDY','DINING ROOM','GARAGE']],HOTEL:['estate',['SUITE','LOBBY','BAR','KITCHEN','SPA','POOL','LAUNDRY','GYM','BALLROOM','STORAGE','CONFERENCE','SUITE']],FACTORY:['ind',['WORKSHOP','ASSEMBLY','STORAGE','DOCKS','BOILER ROOM','OFFICE','LAB','GARAGE','LOCKER ROOM','COLD ROOM']],HOSPITAL:['city',['WARD','PHARMACY','MORGUE','LAB','OPERATING ROOM','WAITING ROOM','OFFICE','KITCHEN','STORAGE','X-RAY','WARD']],CHALET:['snow',['LIVING ROOM','KITCHEN','BEDROOM','BATHROOM','SAUNA','GARAGE','STUDY','DINING ROOM','LOUNGE','WORKSHOP']],REFINERY:['ind',['BOILER ROOM','CONTROL ROOM','WORKSHOP','STORAGE','DOCKS','LAB','OFFICE','GARAGE','PUMP ROOM','COLD ROOM']],SKYLINE:['city',['OFFICE','CONFERENCE','LOBBY','CAFETERIA','LOUNGE','GYM','CONTROL ROOM','ARCHIVE','KITCHEN','OFFICE']]};\nconst MAPS=[")
rep("MAPS.forEach(m=>{m.cw=grow","MAPS.forEach(m=>{const x=MAPX[m.n];if(x){m.xt=x[0];m.nm=x[1]}if(m.n==='HOTEL')m.pool=1;m.cw=grow")
# setMap
rep("function setMap(i){const d=MAPS[i];","function setMap(i){CURM=i;const d=MAPS[i];")
rep("let x=7;RX=","let x=BX0+1;RX=")
rep("let y=4;RY=","let y=BY0+1;RY=")
rep("OY=BY1+16;","OY=BY1+22;")
rep("const nm=NP.slice().sort(()=>rnd()-.5)","const nm=(d.nm||NP).slice().sort(()=>rnd()-.5)")
rep("nm[j*nc+k]","nm[(j*nc+k)%nm.length]")
old_en=s[s.index(" EN=[];const nudge"):s.index("function findFloor")]
new_en=""" EN=[];const nudge=(c,L)=>{while(L.some(v=>Math.abs(v-c)<=2))c+=4;return c};
 for(const side of['s','n']){const n=8;for(let k=0;k<n;k++){const c=nudge(Math.round(BX0+4+(BX1-BX0-14)*(k+.5)/n+rnd()*6-3),VX);EN.push([side==='s'?BY1:BY0,c-1,c+1,'x'])}}
 for(const side of['w','e']){const n=6;for(let k=0;k<n;k++){const c=nudge(Math.round(BY0+3+(BY1-BY0-8)*(k+.5)/n+rnd()*4-2),HY);EN.push([side==='w'?BX0:BX1,c-1,c+1,'y'])}}
 RAP=[];for(let k=0;k<6;k++){const c=nudge(Math.round(BX0+10+(BX1-BX0-20)*(k+.5)/6+rnd()*4-2),VX);RAP.push({ox:c,oy:BY0-1,hx:c,hy:OY+BY0-1,ix:c,iy:OY+BY0+1,win:[[c,OY+BY0],[c+1,OY+BY0]],inside:[[c,OY+BY0+1],[c+1,OY+BY0+1]]})}
 for(let k=0;k<3;k++){const c=nudge(Math.round(BX0+14+(BX1-BX0-28)*(k+.5)/3+rnd()*4-2),VX);RAP.push({ox:c,oy:BY1+1,hx:c,hy:OY+BY1+1,ix:c,iy:OY+BY1-1,win:[[c,OY+BY1],[c+1,OY+BY1]],inside:[[c,OY+BY1-1],[c+1,OY+BY1-1]]})}
 for(const[sd_,bx] of[['w',BX0],['e',BX1]])for(let k=0;k<4;k++){const r=nudge(Math.round(BY0+8+(BY1-BY0-16)*(k+.5)/4+rnd()*4-2),HY),ox=sd_==='w'?bx-1:bx+1,ix=sd_==='w'?bx+1:bx-1;RAP.push({ox,oy:r,hx:ox,hy:OY+r,ix,iy:OY+r,win:[[bx,OY+r],[bx,OY+r+1]],inside:[[ix,OY+r],[ix,OY+r+1]]})}
 ROOMCAT=ROOMS.map(r=>catOf(r[4]))}
"""
s=s.replace(old_en,new_en)
# buildMap
rep("function buildMap(){map=[];","function buildMap(){fk.fill(0);fc.fill(0);winF.fill(0);map=[];")
rex(r"  ROOMS\.forEach\(\(r,i\)=>\{if\(i===SECR&&!o\)\{for\(let x=r\[0\]\+2.*?map\[y\+o\]\[x\]=rn\(\)<\.8\?6:2\}\}\)\}","  furnishFloor(o,rn,keep)}")
rep(" wh.fill(100);for(let y=0;y<H;y++)for(let x=0;x<W;x++)drawTile(x,y)}"," buildExtras();wh.fill(100);for(let y=0;y<H;y++)for(let x=0;x<W;x++)drawTile(x,y)}")
rep("const blk=t=>","const blk0=t=>") if False else None
rep("blk=t=>(t>=2&&t<=4)||t===6||t===7||t===9","blk=t=>(t>=2&&t<=4)||t===6||t===7||t===9||t===10")
rep("if(t===2||t===6||t===7)continue;if(t===3)c=5","if(t===2||t===6||t===7||t===10)continue;if(t===3)c=5")
# floor art header
rex(r"function floorArt\(P,x,y,n\)\{.*?const r0=roomIdx\(x,y\),r=r0<0\?-1:r0%5;","function floorArt(P,x,y,n){\n if(extArt(P,x,y,n))return;\n const r0=roomIdx(x,y),r=r0<0?-1:ROOMCAT[r0];")
rep(" else if(r===6){P(0,0,T,T,((x+y)&1)?'#6a6f78':'#5d626b');"," else if(r===7){P(0,0,T,T,'#c4ccd4');P(0,0,T,1,'#a6b0ba');P(0,0,1,T,'#a6b0ba');P(8,0,1,T,'#b2bcc6');P(0,8,T,1,'#b2bcc6')}\n else if(r===8){P(0,0,T,T,'#7a5634');for(let k=0;k<4;k++){P(0,k*4+3,T,1,'#5a3e24');P((k*5+x*3)%15,k*4,1,3,'#5a3e24')}for(let i=0;i<4;i++)P(n()*15|0,n()*15|0,2,1,'#8a6640')}\n else if(r===6){P(0,0,T,T,((x+y)&1)?'#6a6f78':'#5d626b');")
# tile art hooks
rep("  if(t===8){P(0,0,T,T,'#3a4150');","  if(t===10)drawFurn(P,x,y,n);\n  if(t===8){P(0,0,T,T,'#3a4150');")
rep(" else if(t===3){const r=wh[y*W+x]/100;"," else if(t===3&&winF[y*W+x]){drawWin(P,wh[y*W+x]/100)}\n else if(t===3){const r=wh[y*W+x]/100;")
# gadget renames
rep("function gadget(e){if(e.gcd>0","function gadgetOld(e){if(e.gcd>0")
rep("function gadget2(e){if(!e.alive","function gadget2Old(e){if(!e.alive")
rep("function buildBarr(){const me=G&&G.me;","function buildBarrOld(){const me=G&&G.me;")
# new round message
rep("'PREP: click walls to reinforce ('+REINF+'), doorways or B to barricade'","'PREP: HOLD CLICK on a wall to reinforce ('+REINF+'), HOLD B at a doorway to barricade'")
# update hooks
rep("if(G.phase==='end'){G.endT--;if(G.endT<=0&&!G.shown)showOver();updFx();return}\n","if(G.phase==='end'){G.endT--;if(G.endT<=0&&!G.shown)showOver();updFx();return}\n tickX(me);\n")
rep("if(G.phase==='prep'&&G.bq.length&&G.t%240===100)bqOne();","if(G.phase==='prep'&&G.bq.length&&++G.bqp>=BARR_T*2.2){G.bqp=0;bqOne()}")
rep("if(G.phase==='prep'&&G.rq.length&&G.t%270===0)rqOne();","if(G.phase==='prep'&&G.rq.length&&++G.rqp>=REINF_T){G.rqp=0;rqOne()}")
rep("moveEnt(me,dx*sp,dy*sp);me.mv=Math.hypot(dx,dy)*(keys.shift?.4:1)}","if(!me.lock)moveEnt(me,dx*sp,dy*sp);me.mv=me.lock?0:Math.hypot(dx,dy)*(keys.shift?.4:1)}")
rep("if(mouse.down&&G.phase==='act'&&!(me.op.id==='montagne'&&false))fire(me)}","if(mouse.down&&G.phase==='act'&&!me.nofire)fire(me)}")
rep("e.g2cd>0&&e.g2cd--;e.ph=","e.g2cd>0&&e.g2cd--;e.cwo>0&&e.cwo--;e.ph=")
rex(r"for\(let i=G\.nades\.length-1;i>=0;i--\)\{const n=G\.nades\[i\];if\(--n\.t<=0\)\{.*?G\.nades\.splice\(i,1\)\}\}","updNades();")
# render hooks
rex(r"for\(const n of G\.nades\)\{g\.fillStyle='#050608';.*?g\.fillRect\(n\.x,n\.y-3,1,1\)\}","for(const n of G.nades)drawNade(n);")
rep(" if(G.phase==='prep'&&me.side==='D'){const tx=(mouse.x+cam.x)/T|0"," drawWorldExtra();\n if(G.phase==='prep'&&me.side==='D'){const tx=(mouse.x+cam.x)/T|0")
rep("xhair();hud(me)}","xhair();hud(me);hudExtra(me)}")
rep("if(dir==='up')drawGun(e,x,y);","if(dir==='up')drawHand(e,x,y);")
rep("if(dir!=='up')drawGun(e,x,y);","if(dir!=='up')drawHand(e,x,y);")
# bots
rep("if(t===3||t===9){e.bt++;if(e.bt>(t===9?32:50)){setTile(best[0],best[1],t===9?5:1);boom(cx,cy,12,'#c8b896');sfx(110,.3,'sawtooth',.06);e.bt=0}}","if(t===3||t===9){e.bt++;if(t===9)e.cwo=4;if(e.bt>(t===9?90:50)){if(t===9)breakBarr(best[0],best[1]);else setTile(best[0],best[1],1);boom(cx,cy,12,'#c8b896');sfx(110,.3,'sawtooth',.06);e.bt=0}}")
rep("const d=dst(e.x,e.y,gx,gy);\n if(m==='bomb'&&d<20&&!fight)","if(!fight&&rapBot(e,gx,gy,sp))return;const d=dst(e.x,e.y,gx,gy);\n if(m==='bomb'&&d<20&&!fight)")
# input
rep("if(k==='b')buildBarr();if(k==='g')gadget2(G.me);","if(k==='g')armG(G.me,'g2');")
rep("if(k==='q')gadget(G.me);","if(k==='q')armG(G.me,'q');")
rep("mouse.down=true;if(G&&G.phase==='prep'&&G.me.side==='D'&&G.me.alive){const tx=(mouse.x+cam.x)/T|0,ty=(mouse.y+cam.y)/T|0;if(map[ty]&&map[ty][tx]===3&&G.reinf<REINF&&dst(G.me.x,G.me.y,tx*T+8,ty*T+8)<70){setTile(tx,ty,4);G.reinf++;sfx(300,.1,'square',.05)}else if(map[ty]&&map[ty][tx]===5&&dst(G.me.x,G.me.y,tx*T+8,ty*T+8)<90)putBarr(tx,ty,1)}});","mouse.down=true});")
# binds
rep("barr:'b',reload:'r'","barr:'b',crow:'f',rap:'x',reload:'r'")
rep("barr:'BUILD BARRICADE',","barr:'BUILD BARRICADE / REINFORCE (HOLD)',crow:'CROWBAR (HOLD)',rap:'RAPPEL (HOLD)',")
# insert block after wallDmg line
blk=open('/home/claude/build/block.js').read()
i=s.index("function wallDmg")
j=s.index("\n",i)
s=s[:j+1]+blk+"\n"+s[j+1:]
# init at end
s=s.rstrip('\n')+"\nr6xInit();\n"
open(P+'game.js','w').write(s)
print('patched',len(s))
