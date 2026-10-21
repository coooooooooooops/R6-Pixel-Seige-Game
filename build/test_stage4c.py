# Stage 4 part 2b tests: Mira, Sens, Clash, Sentry, Tachanka (+Montagne check)
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
      me.x=ok[0]*16+8;me.y=ok[1]*16+8;me.a=0;G.ents.forEach(o=>{if(o!==me){o.x=me.x+9999;o.y=me.y+9999}});G.smokes.length=0;G.traps.length=0;return ok}"""
    S=lambda side,id: ev("([f,side,id])=>eval(f)(side,id)",[SETUP,side,id])
    ck('installed',ev("['mira','clash','sentry','tachanka'].every(k=>OPS.D.find(o=>o.id===k).gd===k)&&OPS.A.find(o=>o.id==='sens').gd==='sens'"))
    # Mira one-way
    S('D','mira')
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const m=R6A.state().bar[0];
      const front={x:m.x-20,y:m.y},back={x:m.x+20,y:m.y}; // mira faces +x? owner stands on -x side (placed in front of him)
      const a=los(front.x,front.y,back.x,back.y),c=los(back.x,back.y,front.x,front.y);
      return {a,c,sg:m.sg,k:m.k}}""")
    ck('mira: one direction sees through, the other is blocked',r['a']!=r['c'],r)
    # Sens screen blocks both ways, not movement, not bullets
    S('A','sens')
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const sc=R6A.state().scr[0];
      const o1=los(sc.x-20,sc.y,sc.x+20,sc.y),o2=los(sc.x+20,sc.y,sc.x-20,sc.y);
      const w=G.ents.find(o=>o!==me&&o.alive&&o.side!=='A');w.x=sc.x-6;w.y=sc.y;for(let i=0;i<20;i++)moveEnt(w,1,0,5);
      for(let i=0;i<1300;i++)update();
      return {o1,o2,walked:w.x>sc.x,expired:R6A.state().scr.length===0}}""")
    ck('sens screen blocks sight both ways, lets you walk, expires',(not r['o1']) and (not r['o2']) and r['walked'] and r['expired'],r)
    # Clash taser + frontal shield
    S('D','clash')
    r=ev("""()=>{const me=G.me;const a=G.ents.find(o=>o!==me&&o.side==='A');a.x=me.x+20;a.y=me.y;a.stun=0;a.slow=0;me.gcd=0;gadget(me);
      const front=a.stun>0&&a.slow>0&&me.gn===2;
      me.hp=me.mhp=100;hurt(me,100,Math.PI,null);const fr=100-me.hp;me.hp=100;hurt(me,100,0,null);const bk=100-me.hp;
      a.x=me.x-40;a.y=me.y;me.gcd=0;const g0=me.gn;gadget(me);
      return {front,fr,bk,noWaste:me.gn===g0}}""")
    ck('clash taser stuns in front, shield blocks front shots, no waste when empty',r['front'] and abs(r['fr']-15)<.01 and abs(r['bk']-100)<.01 and r['noWaste'],r)
    # Montagne check (existing frontal rule)
    ev("([f,side,id])=>eval(f)(side,id)",[SETUP,'A','montagne'])
    r=ev("""()=>{const me=G.me;me.a=0;me.hp=me.mhp=100;hurt(me,100,Math.PI,null);const f=100-me.hp;me.hp=100;hurt(me,100,0,null);return {f,b:100-me.hp}}""")
    ck('montagne front 10 percent, back 100',abs(r['f']-10)<.01 and abs(r['b']-100)<.01,r)
    # Sentry barrier
    S('D','sentry')
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const b=R6A.state().bar[0];const w=G.ents.find(o=>o!==me&&o.alive&&o.side==='A');w.x=b.x-14;w.y=b.y;for(let i=0;i<60;i++)moveEnt(w,1,0,5);return {n:R6A.state().bar.length,blocked:w.x<b.x}}""")
    ck('sentry guard blocks movement',r['n']==1 and r['blocked'],r)
    # Tachanka turret fires, can be shot down, ignores friendlies
    S('D','tachanka')
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const t=R6A.state().tur[0];const a=G.ents.find(o=>o!==me&&o.side==='A');a.x=t.x+60;a.y=t.y;a.hp=a.mhp=300;a.cd=999999;
      const mate=G.ents.find(o=>o!==me&&o.side==='D');mate.x=t.x;mate.y=t.y+40;mate.hp=mate.mhp=300;const mh=mate.hp;
      const hp0=a.hp;for(let i=0;i<120;i++){a.x=t.x+60;a.y=t.y;update()}
      const hurtA=a.hp<hp0,friendly=mate.hp===mh;
      for(let i=0;i<8;i++)trace(a,Math.atan2(t.y-a.y,t.x-a.x),20,200);
      return {hurtA,friendly,gone:R6A.state().tur.length===0}}""")
    ck('tachanka turret hurts attackers, spares team, shootable',r['hurtA'] and r['friendly'] and r['gone'],r)
    # smoke runs with every new op, bots included
    out=ev("""()=>{const bad=[];let n=0;for(const [side,id] of [['D','mira'],['D','clash'],['D','sentry'],['D','tachanka'],['A','sens']])for(const mode of['bomb','hostage','secure']){
      try{const i=OPS[side].findIndex(o=>o.id===id);__t.start(mode,side,i);if(side==='D')G.ents.forEach(e=>{if(e.side==='D'&&e.bot){e.op=OPS.D.find(o=>o.id===id);e.gn=e.op.gn;e.abDone=0}});
       for(let k=0;k<1500;k++){if(k===300)startAct();if(k%80===0){G.me.gcd=0;gadget(G.me)}__t.update()}n+=R6A.state().bar.length+R6A.state().tur.length+R6A.state().scr.length;__t.render()}catch(e){bad.push(id+' '+mode+': '+e.message)}}return {bad,n}}""")
    ck('smoke rounds, bots place them, no errors',len(out['bad'])==0 and out['n']>0,out)
    ck('no page errors',len(errs)==0,errs[:3])
    b.close()
print('%d/%d passed'%(sum(res),len(res))); sys.exit(0 if all(res) else 1)
