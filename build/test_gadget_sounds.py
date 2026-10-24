# smoke: run the real gadget tick for mines/clouds/devices; every sound must carry its position and nothing may throw
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    pos=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return [e.x,e.y]})()")
    res_=H.evaluate("""(()=>{const S=R6A.st(),g=G.ents.find(x=>x.rp),own=g,foe=G.ents.find(e=>e.alive&&e.side!==g.side);
      foe.x=g.x+25;foe.y=g.y;foe.hp=99999;foe.mhp=99999;NP._snd().length=0;
      for(const k of ['thorn','gu','den','ela','dread','zoto'])S.mine.push({k,x:foe.x,y:foe.y,r:30,own,fuse:0});
      let err=null;try{for(let i=0;i<150;i++)R6A.tick()}catch(e){err=String(e&&e.stack||e)}
      const q=NP._snd().slice();return {err,n:q.length,withPos:q.filter(a=>a[4]!==null&&a[5]!==null).length,left:S.mine.length}})()""")
    print(res_)
    ok('gadget tick (6 mine kinds) ran without throwing',res_['err'] is None,res_['err'])
    ok('mines produced sounds',res_['n']>=4,res_['n'])
    ok('every queued sound has a position',res_['n']==res_['withPos'],(res_['n'],res_['withPos']))
    # camera destroyed by a jammer + drone/other device sounds
    r2=H.evaluate("""(()=>{const S=R6A.st(),g=G.ents.find(x=>x.rp);let err=null;NP._snd().length=0;
      try{S.jab.push({x:g.x+30,y:g.y,own:g,t:5,v:null});S.ads.push({x:g.x+20,y:g.y+10,r:40,n:3,own:g});G.nades.push({x:g.x+22,y:g.y+10,vx:0,vy:0,t:60,air:0,own:G.ents.find(e=>e.side!==g.side),k:'frag'});
        for(let i=0;i<60;i++)R6A.tick()}catch(e){err=String(e&&e.stack||e)}
      const q=NP._snd().slice();return {err,n:q.length,withPos:q.filter(a=>a[4]!==null).length}})()""")
    print(r2)
    ok('jammer/active-defence tick ran without throwing',r2['err'] is None,r2['err'])
    ok('their sounds all have positions',r2['n']==r2['withPos'],r2)
    G.wait_for_timeout(500)
    ok('host no remote error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
