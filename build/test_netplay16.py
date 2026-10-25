# a downed guest may only spectate teammates (while one is alive); a seatless spectator may watch anyone
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    H.evaluate("hurt(G.ents.find(e=>e.rp),9999,0,null)"); H.wait_for_timeout(800)
    side=G.evaluate("G.ents[NP.self].side")
    seen=set()
    for i in range(12):
        G.keyboard.press('Tab'); G.wait_for_timeout(120); seen.add(G.evaluate("G.me.side+':'+G.ents.indexOf(G.me)"))
    sides={x.split(':')[0] for x in seen}
    ok('dead guest cycled through %d players'%len(seen),len(seen)>=2,sorted(seen))
    ok('dead guest only sees teammates',sides=={side},sides)
    ok('followed player is alive',G.evaluate("G.me.alive"))
    # wipe the team: then anything goes (round is about to end)
    H.evaluate("G.ents.filter(e=>e.side==='%s').forEach(e=>{if(e.alive)hurt(e,9999,0,null)})"%side); H.wait_for_timeout(800)
    G.keyboard.press('Tab'); G.wait_for_timeout(200)
    ok('no teammate left: guest does not crash',G.evaluate("!!G.me")and not G.errs,G.errs)
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
