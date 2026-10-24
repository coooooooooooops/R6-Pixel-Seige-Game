# 5C-6: team-scoped pings + private HUD messages for remote players
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(600)
    gside=G.evaluate("G.me.side"); other='D' if gside=='A' else 'A'
    G.evaluate("window.__lab=new Set();{const o=T8;window.T8=function(t){__lab.add(String(t));return o.apply(this,arguments)}}")
    H.evaluate("G.pings.push({x:G.me.x+20,y:G.me.y,t:2000,k:'loc',c:'#ffd27a',l:'ZZ%s',s:'%s'});G.pings.push({x:G.me.x+40,y:G.me.y,t:2000,k:'loc',c:'#ffd27a',l:'ZZ%s',s:'%s'})"%(gside,gside,other,other))
    G.wait_for_timeout(900)
    labs=G.evaluate("[...__lab].filter(t=>t.startsWith('ZZ'))"); print('labels drawn on guest',labs)
    ok('guest sees its own team ping',('ZZ'+gside) in labs)
    ok('guest does NOT see the enemy team ping',('ZZ'+other) not in labs)
    # per-side ping trim: 6 pings from the host must not evict the enemy ping
    H.evaluate("G.pings.length=0;G.pings.push({x:50,y:50,t:2000,k:'loc',c:'#fff',l:'EN',s:'%s'})"%('D' if H.evaluate("G.me.side")=='A' else 'A'))
    H.evaluate("(()=>{mouse.x=200;mouse.y=100;for(let i=0;i<6;i++)doPing(G.me)})()")
    r=H.evaluate("[G.pings.filter(p=>p.s===G.me.side).length,G.pings.filter(p=>p.s!==G.me.side).length]")
    ok('own-side pings capped at 4 and enemy ping not evicted',r[0]<=4 and r[1]==1,r)
    # private HUD message (attackers start inside a drone; Backspace closes it -> 'VIEW CLOSED')
    if gside=='A':
        H.evaluate("G.msg='HOST BANNER'"); G.wait_for_timeout(500)
        ok('guest shows the host banner',G.evaluate("G.msg")=='HOST BANNER',G.evaluate("G.msg"))
        G.keyboard.press('Backspace'); G.wait_for_timeout(700)
        ok('guest sees its own message (VIEW CLOSED)',G.evaluate("G.msg")=='VIEW CLOSED',G.evaluate("G.msg"))
        ok('host banner NOT overwritten by the guest action',H.evaluate("G.msg")=='HOST BANNER',H.evaluate("G.msg"))
        H.evaluate("G.msg='NEW BANNER'"); G.wait_for_timeout(600)
        ok('a new host banner replaces the private message',G.evaluate("G.msg")=='NEW BANNER',G.evaluate("G.msg"))
    else: print('(private message check needs guest attacker; run with SIDE=A)')
    ok('host no remote error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
