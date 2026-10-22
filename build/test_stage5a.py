# Stage 5A tests: prep rules, outside ping, circular minimap + drone floor switch
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
    # ---- prep: defender can fire, attackers are ghosts
    r=ev("""()=>{__t.start('bomb','D',0);const me=G.me;me.hp=me.mhp=999;G.ents.forEach(o=>{if(o!==me)o.cd=999999});
      const a=G.ents.find(o=>o.side==='A'&&o.alive);
      let ok=null;for(let ty=4;ty<H-4&&!ok;ty++)for(let tx=4;tx<W-18&&!ok;tx++){let c=true;for(let k=0;k<16;k++)for(let j=-2;j<=2;j++)if(solid(map[ty+j][tx+k]))c=false;if(c)ok=[tx,ty]}
      G.ents.forEach(o=>{if(o!==me&&o!==a){o.x=me.x+9999;o.y=me.y+9999}});
      me.x=ok[0]*16+8;me.y=ok[1]*16+8;me.a=0;a.x=me.x+50;a.y=me.y;a.hp=a.mhp=300;
      const k=me.wp[me.sel],am0=me.ammo[k];mouse.down=true;mouse.x=VW;mouse.y=VH2/2;
      let fired=false;const hp0=a.hp;for(let i=0;i<40;i++){a.x=me.x+50;a.y=me.y;me.a=0;update();if(me.ammo[k]<am0)fired=true}
      mouse.down=false;
      return {phase:G.phase,fired,gh:a.gh,ghHurt:a.hp===hp0,alive:a.alive}}""")
    ck('defender fires in prep; prep attackers take no damage',r['phase']=='prep' and r['fired'] and r['gh']==1 and r['ghHurt'] and r['alive'],r)
    r=ev("""()=>{const me=G.me;const a=G.ents.find(o=>o.side==='A'&&o.alive);const gh0=a.gh;startAct();a.x=me.x+50;a.y=me.y;a.hp=a.mhp=300;me.cd=0;me.rl=0;me.ammo[me.wp[me.sel]]=99;mouse.down=true;mouse.x=VW;mouse.y=VH2/2;
      const hp0=a.hp;for(let i=0;i<60;i++){a.x=me.x+50;a.y=me.y;me.a=0;update();if(a.hp<hp0)break}mouse.down=false;return {gh0,gh1:a.gh,hurt:a.hp<hp0}}""")
    ck('attackers spawn in for real once the action phase starts',r['gh0']==1 and r['gh1']==0 and r['hurt'],r)
    # ghost attackers not drawn to defenders: draw loop skips them (render runs clean in prep)
    r=ev("""()=>{__t.start('bomb','D',0);__t.render();return G.ents.filter(o=>o.side==='A').every(o=>o.gh===1)||G.ents.filter(o=>o.side==='A').every(o=>o.gh===undefined)}""")
    ck('prep render ok',r,r)
    # ---- outside ping
    r=ev("""()=>{__t.start('bomb','A',0);startAct();const me=G.me;const d=G.ents.find(o=>o.side==='D'&&o.alive);d.hp=d.mhp=9999;G.ents.forEach(o=>{if(o!==me&&o!==d)o.cd=999999});
      d.cd=999999;const ins={x:(BX0+BX1)/2*T,y:(BY0+BY1)/2*T},outp={x:(BX1+4)*T,y:(BY0+BY1)/2*T};
      const log={};
      const run=(p,n)=>{for(let i=0;i<n;i++){d.x=p.x;d.y=p.y;d.stun=0;update()}};
      run(outp,170);log.at170=!!d.rev;run(outp,20);log.at190=!!d.rev;log.tag=d.tag>0;log.ping=G.pings.some(q=>q.k==='out');log.vis=visible(d);
      run(ins,170);log.inside170=!!d.rev;run(ins,20);log.inside190=!!d.rev;log.pingGone=!G.pings.some(q=>q.k==='out');
      return log}""")
    ck('defender outside 3s is pinged red, stays pinged until inside 3s',(not r['at170']) and r['at190'] and r['tag'] and r['ping'] and r['vis'] and r['inside170'] and (not r['inside190']) and r['pingGone'],r)
    # defender briefly stepping out then in does not trigger
    r=ev("""()=>{__t.start('bomb','A',0);startAct();const me=G.me;const d=G.ents.find(o=>o.side==='D'&&o.alive);const ins={x:(BX0+BX1)/2*T,y:(BY0+BY1)/2*T},outp={x:(BX1+4)*T,y:(BY0+BY1)/2*T};
      const run=(p,n)=>{for(let i=0;i<n;i++){d.x=p.x;d.y=p.y;d.stun=0;update()}};run(outp,150);run(ins,10);run(outp,150);return !!d.rev}""")
    ck('stepping in for a moment resets the 3s outside timer',r==False,r)
    # ---- minimap floors
    r=ev("""()=>{__t.start('bomb','A',0);startAct();const me=G.me;const out={};
      __t.render();out.me1=G.mmf;
      G.drones.length=0;const d=mkDrone(me,1,0);G.drones.push(d);G.dc=0;d.alive=1;d.x=me.x;d.y=OY*T+200;
      __t.render();out.drone2=G.mmf;
      d.y=300;__t.render();out.drone1=G.mmf;
      G.dc=-1;me.y=OY*T+100;__t.render();out.me2=G.mmf;return out}""")
    ck('minimap floor follows the drone upstairs and back',r['me1']==1 and r['drone2']==2 and r['drone1']==1 and r['me2']==2,r)
    # screenshots for eyeballing (real render path)
    ev("""()=>{__t.start('bomb','D',0);}""");pg.wait_for_timeout(50)
    out=ev("""()=>{__t.render();return 1}""");pg.screenshot(path='/tmp/shot_prep.png')
    ev("""()=>{__t.start('bomb','A',0);startAct();const me=G.me;G.drones.length=0;const d=mkDrone(me,1,0);G.drones.push(d);G.dc=0;d.alive=1;d.x=me.x;d.y=OY*T+200;for(let i=0;i<5;i++)update();__t.render()}""");pg.screenshot(path='/tmp/shot_drone2.png')
    # many-round smoke
    out=ev("""()=>{const bad=[];for(const side of['A','D'])for(const mode of['bomb','hostage','secure']){try{__t.start(mode,side,0);for(let k=0;k<2500;k++){if(k===400)startAct();__t.update()}__t.render()}catch(e){bad.push(side+mode+e.message)}}return bad}""")
    ck('smoke rounds no errors',len(out)==0,out)
    ck('no page errors',len(errs)==0,errs[:3])
    b.close()
print('%d/%d passed'%(sum(res),len(res))); sys.exit(0 if all(res) else 1)
