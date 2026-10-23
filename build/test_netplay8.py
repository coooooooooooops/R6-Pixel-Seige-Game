# 5C-5a: positional sound sync
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    G.evaluate("window.__sl=[];{const o=sfx;window.sfx=function(){__sl.push([...arguments]);return o.apply(this,arguments)}}")
    # near explosion: next to the guest's own operator
    pos=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return [e.x,e.y]})()")
    H.evaluate("explode(%f+24,%f,24,0,G.me)"%(pos[0],pos[1])); G.wait_for_timeout(500)
    near=G.evaluate("__sl.filter(a=>a.length>3)"); print('near',near[:3])
    ok('guest hears a nearby explosion',len(near)>=1)
    ok('nearby sound is loud (volume scaled by distance)',len(near)>=1 and max(x[3] for x in near if len(x)>3)>0.01)
    # far explosion: other end of the map
    G.evaluate("__sl.length=0")
    H.evaluate("explode(%f+1500,%f,24,0,G.me)"%(pos[0] if pos[0]<800 else pos[0]-3000,pos[1])); G.wait_for_timeout(500)
    far=G.evaluate("__sl.filter(a=>a.length>3)"); print('far',far[:3])
    ok('guest does NOT hear a far explosion',len(far)==0)
    # medium distance quieter than near
    G.evaluate("__sl.length=0"); H.evaluate("explode(%f+200,%f,24,0,G.me)"%(pos[0],pos[1])); G.wait_for_timeout(500); mid=G.evaluate("__sl.filter(a=>a.length>3)")
    nv=max(x[3] for x in near); mv=max([x[3] for x in mid] or [0])
    ok('mid-distance sound is quieter than near',mv<nv,(nv,mv))
    # a shot from a bot near guest
    G.evaluate("__sl.length=0")
    H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);const bot=G.ents.find(x=>x.bot&&x.side===e.side&&x.alive);bot.x=e.x+30;bot.y=e.y;bot.a=0;bot.cd=0;bot.rl=0;bot.sel=0;bot.ammo[bot.wp[0]]=99;fire(bot)})()"); G.wait_for_timeout(500)
    ok('guest hears a nearby teammate shot',G.evaluate("__sl.filter(a=>a.length>3).length")>=1,G.evaluate("__sl.slice(0,2)"))
    print('stats',G.evaluate("NP.stats.sndPlayed")); print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
