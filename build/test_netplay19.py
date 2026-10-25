# rappel (hold X) for guest attackers, barricade (hold B) for guest defenders
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    side=G.evaluate("G.me.side"); print('guest side',side)
    hent="G.ents.find(x=>x.rp)"
    if side=='A':
        H.evaluate("startAct()"); H.wait_for_timeout(500); G.keyboard.press('Backspace'); G.wait_for_timeout(400)
        q=H.evaluate("(()=>{for(let q=(BX0+2)*T;q<(BX1-2)*T;q+=T)if(rapOK('n',q))return q;return null})()")
        print('rappel q',q)
        H.evaluate("(()=>{const e=%s;e.x=%d;e.y=(BY0-1)*T+8;e.hp=e.mhp=999999})()"%(hent,q)); G.wait_for_timeout(600)
        near=H.evaluate("(()=>{const n=rapNear(%s);return n&&n.k})()"%hent); ok('operator stands at a rope anchor',near=='g',near)
        G.keyboard.down('x'); G.wait_for_timeout(500)
        pg=G.evaluate("G.prog"); ok('guest sees the rope progress bar while holding X',pg is not None and 'ROPE' in str(pg.get('t')),pg)
        for i in range(30):
            G.wait_for_timeout(100)
            if H.evaluate("%s.rps"%hent)=='hang': break
        G.keyboard.up('x'); G.wait_for_timeout(500)   # (holding X longer would rappel back down: that is the game's rule)
        ok('host: operator is hanging from the rope',H.evaluate("%s.rps"%hent)=='hang',H.evaluate("%s.rps"%hent))
        ok('guest sees it hanging',G.evaluate("G.ents[NP.self].rps")=='hang',G.evaluate("G.ents[NP.self].rps"))
    else:
        d=H.evaluate("""(()=>{for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){if(map[y][x]===5){for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){if(map[y+dy][x+dx]===1&&map[y+2*dy][x+2*dx]===1)return[x,y,x+dx,y+dy,dx,dy]}}}return null})()""")
        print('door',d)
        H.evaluate("(()=>{const e=%s;e.x=%d*T+8;e.y=%d*T+8})()"%(hent,d[2],d[3])); G.wait_for_timeout(700)
        cam=G.evaluate("[cam.x,cam.y,VW,VH]"); box=G.evaluate("(()=>{const c=document.querySelector('canvas#c')||document.querySelector('canvas');const b=c.getBoundingClientRect();return [b.left,b.top,b.width,b.height]})()")
        sx=(d[0]*16+8-cam[0])*box[2]/cam[2]+box[0]; sy=(d[1]*16+8-cam[1])*box[3]/cam[3]+box[1]
        G.mouse.move(sx,sy); G.wait_for_timeout(300)
        t0=H.evaluate("map[%d][%d]"%(d[1],d[0])); b0=H.evaluate("G.barr")
        G.keyboard.down('b'); G.wait_for_timeout(800); rf=G.evaluate("G.rf"); ok('guest sees a barricade progress bar while holding B',rf is not None and rf.get('k')=='b',rf)
        G.wait_for_timeout(5000); G.keyboard.up('b'); G.wait_for_timeout(600)
        t1=H.evaluate("map[%d][%d]"%(d[1],d[0])); b1=H.evaluate("G.barr")
        ok('doorway barricaded on the host (tile changed, counter up)',t0==5 and t1!=5 and b1>b0,(t0,t1,b0,b1))
        ok('guest map shows the barricade',G.evaluate("map[%d][%d]"%(d[1],d[0]))==t1)
    ok('no JS errors',not H.errs and not G.errs and H.evaluate("!NP.err"),(H.errs,G.errs))
print(sum(res),'/',len(res))
