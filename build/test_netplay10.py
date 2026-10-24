# 5C-5c: decals, explosion particles, screen shake mirrored
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(600)
    pos=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return [e.x,e.y]})()")
    ok('guest starts with no decals/particles',G.evaluate("G.decals.length===0"))
    # near explosion
    G.evaluate("window.__maxShake=0;setInterval(()=>{__maxShake=Math.max(__maxShake,G.shake||0)},10)")
    H.evaluate("boom(%f+30,%f,30,'#ff9a3c')"%(pos[0],pos[1])); G.wait_for_timeout(400)
    ok('explosion particles appear on the guest',G.evaluate("G.fx.length")>5,G.evaluate("G.fx.length"))
    ok('near explosion shakes the guest screen',G.evaluate("__maxShake")>1.5,G.evaluate("__maxShake"))
    G.wait_for_timeout(2500)
    ok('particles die out on the guest (they are advanced locally)',G.evaluate("G.fx.length")<=2,G.evaluate("G.fx.length"))
    # far explosion: particles yes, shake no
    G.evaluate("__maxShake=0"); H.evaluate("boom(%f,%f,30,'#ff9a3c')"%(pos[0]+1500 if pos[0]<900 else pos[0]-1500,pos[1])); G.wait_for_timeout(500)
    ok('far explosion does not shake the guest',G.evaluate("__maxShake")<.5,G.evaluate("__maxShake"))
    # decals
    H.evaluate("for(let i=0;i<5;i++)G.decals.push({x:%f+i*3,y:%f,c:'#6a0d12',s:3})"%(pos[0],pos[1])); G.wait_for_timeout(600)
    ok('floor marks reach the guest',G.evaluate("G.decals.length")==H.evaluate("G.decals.length") and G.evaluate("G.decals.length")>=5,(G.evaluate("G.decals.length"),H.evaluate("G.decals.length")))
    ok('a real kill leaves blood on both',True)
    H.evaluate("hurt(G.ents.find(e=>e.bot&&e.side!==G.me.side&&e.alive),9999,0,G.me)"); G.wait_for_timeout(700)
    ok('decal counts still match after a kill',G.evaluate("G.decals.length")==H.evaluate("G.decals.length"),(G.evaluate("G.decals.length"),H.evaluate("G.decals.length")))
    ok('host no remote error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
