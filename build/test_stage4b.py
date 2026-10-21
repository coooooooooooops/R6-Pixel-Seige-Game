# Stage 4 part 2a tests: Azami, Goyo, Osa, Rauora, Blackbeard
import sys
from playwright.sync_api import sync_playwright
res=[]
def ck(n,c,x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if x!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/work/game.html'); pg.wait_for_timeout(1200)
    pg.evaluate('window.requestAnimationFrame=()=>0'); pg.wait_for_timeout(300)
    ev=pg.evaluate
    SETUP="""(side,id)=>{const i=OPS[side].findIndex(o=>o.id===id);__t.start('bomb',side,i);startAct();const me=G.me;me.hp=me.mhp=99999;
      G.ents.forEach(o=>{if(o!==me)o.cd=999999});
      let ok=null;for(let ty=4;ty<H-4&&!ok;ty++)for(let tx=4;tx<W-18&&!ok;tx++){let c=true;for(let k=0;k<16;k++)for(let j=-2;j<=2;j++)if(solid(map[ty+j][tx+k]))c=false;if(c)ok=[tx,ty]}
      me.x=ok[0]*16+8;me.y=ok[1]*16+8;me.a=0;G.ents.forEach(o=>{if(o!==me){o.x=me.x+9999;o.y=me.y+9999}});return ok}"""
    ck('DEF installed',ev("['azami','goyo'].every(k=>OPS.D.find(o=>o.id===k).gd===k)&&['osa','rauora'].every(k=>OPS.A.find(o=>o.id===k).gd===k)&&OPS.A.find(o=>o.id==='blackbeard').gd==='blackbeard'"))
    for side,id in [('D','azami'),('D','goyo'),('A','osa'),('A','rauora')]:
        ev("([f,side,id])=>eval(f)(side,id)",[SETUP,side,id])
        r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const S=R6A.state();const n=S.bar.length;const bx=S.bar[0];
          // walker on the other side: enemy bot tries to walk through
          const w=G.ents.find(o=>o!==me&&o.alive&&o.side!==me.side);w.x=bx.x-14;w.y=bx.y;const x0=w.x;
          for(let i=0;i<60;i++)moveEnt(w,1,0,5);
          const blocked=w.x<bx.x;
          bx.hp=9999;const hp0=bx.hp;const sh=bx.x+30;
          // shoot through it: a bullet from the left must not hit a target behind
          const t2=w;t2.x=bx.x+20;t2.y=bx.y;t2.hp=t2.mhp=500;me.x=bx.x-30;me.y=bx.y;me.a=0;me.cd=0;me.rl=0;me.stun=0;me.ammo[me.wp[me.sel]]=99;
          const th=t2.hp;for(let i=0;i<5;i++){trace(me,0,20,200)}
          return {n,blocked,shotBlocked:t2.hp===th,barHurt:bx.hp<hp0}}""")
        ck(id+' barrier blocks movement and bullets',r['n']==1 and r['blocked'] and r['shotBlocked'] and r['barHurt'],r)
    # breaking: explosive wears down, goyo makes fire
    ev("([f,side,id])=>eval(f)(side,id)",[SETUP,'D','goyo'])
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const S=R6A.state();const b=S.bar[0];const x=b.x,y=b.y;
      const a=G.ents.find(o=>o!==me&&o.side==='A');a.x=x+10;a.y=y+10;a.hp=a.mhp=500;
      for(let i=0;i<4;i++)trace(a,Math.atan2(y-a.y,x-a.x),30,200);
      for(let i=0;i<5;i++)explode(x,y,30,80,a);
      return {gone:S.bar.length===0,fire:S.fire.length}}""")
    ck('goyo breaks into a fire cloud',r['gone'] and r['fire']==1,r)
    ev("([f,side,id])=>eval(f)(side,id)",[SETUP,'D','azami'])
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const S=R6A.state();const b=S.bar[0];const a=G.ents.find(o=>o!==me&&o.side==='A');
      for(let i=0;i<8;i++)explode(b.x,b.y,30,80,a);return S.bar.length}""")
    ck('azami destroyed by explosives',r==0,r)
    # place on top of existing barrier refused; entity standing inside is not frozen
    ev("([f,side,id])=>eval(f)(side,id)",[SETUP,'A','osa'])
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);me.gcd=0;const n0=R6A.state().bar.length;gadget(me);return {n0,n1:R6A.state().bar.length,gn:me.gn}}""")
    ck('cannot stack barriers on one spot',r['n0']==1 and r['n1']==1,r)
    # Blackbeard frontal reduction
    ev("([f,side,id])=>eval(f)(side,id)",[SETUP,'A','blackbeard'])
    r=ev("""()=>{const me=G.me;me.hp=me.mhp=100;me.a=0;hurt(me,10,Math.PI,null);const front=100-me.hp;me.hp=100;hurt(me,10,0,null);const back=100-me.hp;return {front,back}}""")
    ck('blackbeard rifle shield: front 3, back 10',abs(r['front']-3)<.01 and abs(r['back']-10)<.01,r)
    # bots place barriers in prep, round still works (no deadlock): 3000 ticks, bots keep moving
    out=ev("""()=>{const bad=[];let placed=0;for(const [side,id] of [['D','azami'],['D','goyo'],['A','osa'],['A','rauora'],['A','blackbeard']])for(const mode of['bomb','hostage']){
      try{const i=OPS[side].findIndex(o=>o.id===id);__t.start(mode,side,i);if(side==='D')G.ents.forEach(e=>{if(e.side==='D'&&e.bot){e.op=OPS.D.find(o=>o.id===id);e.gn=e.op.gn;e.abDone=0}});
        for(let k=0;k<1500;k++){if(k===300)startAct();if(k%80===0){G.me.gcd=0;gadget(G.me)}__t.update()}placed+=R6A.state().bar.length;__t.render()}catch(e){bad.push(id+' '+mode+': '+e.message)}}return {bad,placed}}""")
    ck('smoke rounds with barriers, no errors',len(out['bad'])==0,out)
    ck('no page errors',len(errs)==0,errs[:3])
    b.close()
print('%d/%d passed'%(sum(res),len(res))); sys.exit(0 if all(res) else 1)
