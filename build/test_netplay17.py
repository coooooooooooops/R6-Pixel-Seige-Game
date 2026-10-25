# holding the mouse button fires automatically for guests (was: one shot per click); releasing stops; exit-view click does not start firing
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    att=G.evaluate("G.me.side")=='A'
    if att: G.keyboard.press('Backspace'); G.wait_for_timeout(300)
    ammo=lambda:H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.ammo[e.wp[e.sel]]})()")
    H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);e.wp[0]='g_mp5';e.ammo['g_mp5']=WP['g_mp5'].mag;e.sel=0;e.cd=0;e.rl=0})()")
    G.keyboard.press('1'); G.wait_for_timeout(300)
    a0=ammo(); G.mouse.move(700,300); G.wait_for_timeout(200); G.mouse.down(); G.wait_for_timeout(1000); a1=ammo(); G.mouse.up(); G.wait_for_timeout(400); a2=ammo()
    ok('holding the button fires many shots (>=5 in 1 s)',a0-a1>=5,(a0,a1))
    G.wait_for_timeout(600); a3=ammo(); ok('releasing the button stops firing',a3==a2,(a2,a3))
    ok('guest local mouse.down is false after release',G.evaluate("!mouse.down"))
    # single click still fires exactly a shot or two
    H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);e.cd=0;e.ammo[e.wp[e.sel]]=WP[e.wp[e.sel]].mag})()"); b0=ammo(); G.mouse.click(700,300); G.wait_for_timeout(500); b1=ammo()
    ok('a quick click fires only a few shots (<=3)',0<b0-b1<=3,(b0,b1))
    if att:
        # exit-view click must not start auto fire: re-enter a drone, click EXIT VIEW
        G.keyboard.press('c'); G.wait_for_timeout(500)
        if G.evaluate("G.dc")>=0:
            c0=ammo(); G.evaluate("(()=>{const r=EXB;mouse.x=r.x+r.w/2;mouse.y=r.y+r.h/2})()")
            box=G.evaluate("(()=>{const c=document.getElementById('c')||document.querySelector('canvas');const b=c.getBoundingClientRect();return [b.left,b.top,b.width,b.height,VW,VH]})()")
            px=box[0]+(G.evaluate("EXB.x+EXB.w/2"))*box[2]/box[4]; py=box[1]+(G.evaluate("EXB.y+EXB.h/2"))*box[3]/box[5]
            G.mouse.move(px,py); G.wait_for_timeout(200); G.mouse.down(); G.wait_for_timeout(600); G.mouse.up(); G.wait_for_timeout(500)
            ok('EXIT VIEW click leaves the drone',G.evaluate("G.dc")==-1,G.evaluate("G.dc"))
            ok('...and does not start firing',ammo()==c0,(c0,ammo()))
    ok('no JS errors',not H.errs and not G.errs and H.evaluate("!NP.err"),(H.errs,G.errs))
print(sum(res),'/',len(res))
