# Stage 4 part 1 tests: Finka, Capitao, Zofia, Ying, Thunderbird, Aruni, Warden
import sys
from playwright.sync_api import sync_playwright
URL='file:///home/claude/work/game.html'
res=[]
def ck(n,c,extra=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(extra) if extra!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1200)
    pg.evaluate('window.requestAnimationFrame=()=>0'); pg.wait_for_timeout(300)  # stop the page's own loop so only our update() calls advance the game
    def ev(js): return pg.evaluate(js)
    def start(side,opid,mode='bomb'):
        return ev("""([side,opid,mode])=>{const i=OPS[side].findIndex(o=>o.id===opid);__t.start(mode,side,i);startAct();
          const e=G.me;e.x=e.x;return {i,gd:e.op.gd,gn:e.gn,hp:e.hp}}""",) if False else pg.evaluate("""([side,opid,mode])=>{const i=OPS[side].findIndex(o=>o.id===opid);__t.start(mode,side,i);startAct();G.me.hp=G.me.mhp=99999;G.ents.forEach(o=>{if(o.side!==G.me.side&&o.bot)o.cd=999999});return {i,gd:G.me.op.gd,gn:G.me.gn,hp:G.me.hp}}""",[side,opid,mode])
    # --- DEF coverage
    ck('DEF has 7 new ops',ev("['finka','capitao','zofia','ying','thunderbird','aruni','warden'].every(k=>R6A.DEF[k])"))
    ck('install set gd for all 7',ev("['finka','capitao','zofia','ying'].every(k=>OPS.A.find(o=>o.id===k).gd===k)&&['thunderbird','aruni','warden'].every(k=>OPS.D.find(o=>o.id===k).gd===k)"))
    # --- Finka
    r=start('A','finka'); ck('finka start',r['gd']=='finka',r)
    r=ev("""()=>{const me=G.me,mate=G.ents.find(o=>o!==me&&o.side==='A'&&o.alive);me.hp=20;mate.hp=30;mate.slow=200;mate.stun=100;
      gadget(me);for(let i=0;i<5;i++)update();
      return {me:me.hp,mate:mate.hp,mhp:mate.mhp,slow:mate.slow,stun:mate.stun,surge:mate.surge,gn:me.gn}}""")
    ck('finka heals team +60 capped at max+20',r['me']==80 and r['mate']==90,r)
    ck('finka clears slow/stun during surge',r['slow']==0 and r['stun']==0 and r['surge']>0 and r['gn']==1,r)
    r=ev("""()=>{const me=G.me;me.hp=me.mhp;gadget(me);me.gcd=0;gadget(me);me.hp=me.mhp;me.gcd=0;gadget(me);return me.gn}""")
    ck('finka limited to 2 uses',r==0,r)
    ev("()=>{for(let i=0;i<700;i++)update();render&&0}") if False else None
    r=ev("()=>{for(let i=0;i<700;i++)update();return G.ents.filter(o=>o.side==='A').every(o=>!(o.surge>0))}")
    ck('finka surge expires',r,r)
    # --- Zofia withstand + launcher
    start('A','zofia')
    r=ev("""()=>{const me=G.me;me.hp=50;hurt(me,200,0,null);const a=me.alive,h=me.hp;hurt(me,10,0,null);return {a,h,dead:!me.alive,ws:me.wsUsed}}""")
    ck('zofia withstand: survives first lethal hit on 1hp, dies on next',r['a'] and r['h']==1 and r['dead'],r)
    start('A','zofia')
    r=ev("""()=>{const me=G.me;const d=G.ents.find(o=>o.side==='D'&&o.alive);me.x=200;me.y=200;
      // find an open straight line to put a defender in front
      let ok=null;for(let ty=3;ty<H-3&&!ok;ty++)for(let tx=3;tx<W-14&&!ok;tx++){let c=true;for(let k=0;k<14;k++)if(solid(map[ty][tx+k]))c=false;if(c)ok=[tx,ty]}
      me.x=ok[0]*16+8;me.y=ok[1]*16+8;me.a=0;d.x=me.x+70;d.y=me.y;d.stun=0;d.slow=0;d.blind=0;d.hp=d.mhp;
      me.gcd=0;gadget(me);let ev1=0;const dx0=d.x,dy0=d.y;for(let i=0;i<60;i++){d.x=dx0;d.y=dy0;update();if(d.stun>0){ev1=1;break}}
      const conc={stun:d.stun>0,slow:d.slow>0,gn:me.gn,lq:me.lq};
      d.x=me.x+70;d.y=me.y;d.hp=d.mhp;me.gcd=0;gadget(me);const hp0=d.hp;for(let i=0;i<60;i++){d.x=dx0;d.y=dy0;update();if(d.hp<hp0)break}
      return {conc,impact:d.hp<hp0,gn:me.gn,label:R6A.label(me)}}""")
    ck('zofia conc shell stuns+slows',r['conc']['stun'] and r['conc']['slow'],r)
    ck('zofia impact shell hurts, alternates',r['impact'] and r['gn']==2,r)
    # --- Capitao
    start('A','capitao')
    r=ev("""()=>{const me=G.me;const d=G.ents.find(o=>o.side==='D'&&o.alive);
      let ok=null;for(let ty=3;ty<H-3&&!ok;ty++)for(let tx=3;tx<W-14&&!ok;tx++){let c=true;for(let k=0;k<14;k++)if(solid(map[ty][tx+k]))c=false;if(c)ok=[tx,ty]}
      me.x=ok[0]*16+8;me.y=ok[1]*16+8;me.a=0;d.x=me.x+60;d.y=me.y;d.hp=d.mhp;d.stun=0;
      me.gcd=0;gadget(me);for(let i=0;i<40;i++)update();const fires=R6A.state().fire.length;
      const hp0=d.hp;d.x=R6A.state().fire[0]?R6A.state().fire[0].x:d.x;d.y=R6A.state().fire[0]?R6A.state().fire[0].y:d.y;
      for(let i=0;i<70;i++)update();
      const burned=d.hp<hp0;
      me.gcd=0;gadget(me);for(let i=0;i<80;i++)update();
      const sm=G.smokes.filter(s=>s.noGas).length;
      for(const s of G.smokes)s.gas=true;update();
      const friendlyOK=G.smokes.filter(s=>s.noGas).every(s=>!s.gas);
      return {fires,burned,sm,friendlyOK,gn:me.gn,alive:me.alive,hp:me.hp,phase:G.phase,gcd:me.gcd,stun:me.stun,lq:me.lq}}""")
    ck('capitao fire bolt makes a burning cloud',r['fires']==1 and r['burned'],r)
    ck('capitao 2nd bolt is smoke, never toxic',r['sm']==1 and r['friendlyOK'] and r['gn']==4,r)
    # --- Ying
    start('A','ying')
    r=ev("""()=>{const me=G.me;const d=G.ents.find(o=>o.side==='D'&&o.alive);
      let ok=null;for(let ty=3;ty<H-3&&!ok;ty++)for(let tx=3;tx<W-14&&!ok;tx++){let c=true;for(let k=0;k<14;k++)if(solid(map[ty][tx+k]))c=false;if(c)ok=[tx,ty]}
      me.x=ok[0]*16+8;me.y=ok[1]*16+8;me.a=0;d.x=me.x+55;d.y=me.y;d.blind=0;
      me.gcd=0;gadget(me,me.x+60,me.y);let bl=0,peak=0;for(let i=0;i<140;i++){update();if(d.blind>peak)peak=d.blind}
      return {peak,gn:me.gn,left:R6A.state().can.length}}""")
    ck('ying candela blinds defender in sight, then clears',r['peak']>=100 and r['gn']==2 and r['left']==0,r)
    # --- Thunderbird
    start('D','thunderbird')
    r=ev("""()=>{const me=G.me;me.gcd=0;gadget(me);const k=R6A.state().kona;
      const n0=k.length;const kx=k[0].x,ky=k[0].y;const mate=G.ents.find(o=>o!==me&&o.side==='D'&&o.alive);
      mate.x=kx+3;mate.y=ky;mate.hp=40;for(let i=0;i<5;i++){mate.x=kx+3;mate.y=ky;update()}
      const after=mate.hp;for(let i=0;i<400;i++){if(i%70===0)mate.hp=10;mate.x=kx+3;mate.y=ky;update()}
      return {n0,after,left:R6A.state().kona.length,gn:me.gn}}""")
    ck('thunderbird kona heals 25 and runs out after 4 uses',r['n0']==1 and r['after']==65 and r['left']==0,r)
    # --- Aruni
    start('D','aruni')
    r=ev("""()=>{const me=G.me;G.ents.forEach(o=>{o.cd=999999});const a=G.ents.find(o=>o.side==='A'&&o.alive);me.a=0;me.gcd=0;gadget(me);const gt=R6A.state().gate;
      G.traps.length=0;const n0=gt.length;a.x=gt[0].x;a.y=gt[0].y;a.hp=a.mhp;a.slow=0;a.tag=0;const hp0=a.hp;
      for(let i=0;i<60;i++){a.x=gt[0].x;a.y=gt[0].y;update()}
      const hurt1=a.hp<hp0,slow=a.slow>0,tag=a.tag>0;
      window.__src=[];const _h=hurt;hurt=function(e,d,an,s){if(e===a&&s&&s.bot)return;if(e===a)window.__src.push((s&&s.nm)||(s&&s.op&&s.op.id)||'null:'+d);return _h(e,d,an,s)};a.x=gt[0].x+40;a.y=gt[0].y+40;a.hp=a.mhp;for(let i=0;i<40;i++){a.x=gt[0].x+40;a.y=gt[0].y+40;G.smokes.length=0;G.traps.length=0;{const S=R6A.state();for(const k of['mine','cloud','trax','ban','elec','jab','fire','rov','holo'])S[k].length=0}update()}
      hurt=_h;const farOK=a.hp===a.mhp;
      return {n0,hurt1,slow,tag,farOK,ahp:a.hp,amhp:a.mhp,phase:G.phase,tr:G.traps.length,aal:a.alive,t:G.t,src:window.__src.slice(0,5)}}""")
    ck('aruni gate hurts/slows/reveals touchers only',r['n0']==1 and r['hurt1'] and r['slow'] and r['tag'] and r['farOK'],r)
    # --- Warden
    start('D','warden')
    r=ev("""()=>{const me=G.me;me.blind=150;update();return me.blind}""")
    ck('warden cannot be blinded',r==0,r)
    # --- smoke: every attacker op + defender op 2000 ticks no errors (stage 4 ops)
    out=ev("""()=>{const bad=[];for(const [side,ids] of [['A',['finka','capitao','zofia','ying']],['D',['thunderbird','aruni','warden']]])for(const id of ids)for(const mode of['bomb','hostage','secure']){
      try{const i=OPS[side].findIndex(o=>o.id===id);__t.start(mode,side,i);startAct();for(let k=0;k<1800;k++){if(k%60===0){G.me.gcd=0;gadget(G.me)}__t.update()}__t.render()}catch(e){bad.push(id+' '+mode+': '+e.message)}}return bad}""")
    ck('smoke rounds 7 ops x 3 modes no errors',len(out)==0,out[:3])
    # --- bots (defenders) place thunderbird/aruni in prep
    out=ev("""()=>{const r={};for(const id of['thunderbird','aruni']){__t.start('bomb','A',0);G.ents.forEach(e=>{if(e.side==='D'&&e.bot){e.op=OPS.D.find(o=>o.id===id);e.gn=e.op.gn;e.abDone=0}});
       for(let k=0;k<900;k++)__t.update();r[id]=id==='aruni'?R6A.state().gate.length:R6A.state().kona.length}return r}""")
    ck('defender bots place thunderbird/aruni devices in prep',out['thunderbird']>0 and out['aruni']>0,out)
    ck('no page errors',len(errs)==0,errs[:3])
    b.close()
print('%d/%d passed'%(sum(res),len(res)))
sys.exit(0 if all(res) else 1)
