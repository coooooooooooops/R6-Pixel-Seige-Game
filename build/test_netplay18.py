# held-E actions work for guests: attackers defuse/plant at the site, defenders reinforce a wall in prep
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    side=G.evaluate("G.me.side"); print('guest side',side)
    if side=='A':
        H.evaluate("startAct()"); H.wait_for_timeout(500); G.keyboard.press('Backspace'); G.wait_for_timeout(400)
        H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);e.x=SITES[0][0];e.y=SITES[0][1];e.hp=e.mhp=999999})()"); G.wait_for_timeout(600)
        p0=H.evaluate("G.bomb.prog"); G.keyboard.down('e'); G.wait_for_timeout(1500); p1=H.evaluate("G.bomb.prog"); gp=G.evaluate("G.bomb.prog"); G.keyboard.up('e')
        ok('guest holding E advances the bomb progress on the host',p1>p0+30,(p0,p1))
        ok('guest sees the progress too',gp>10,gp)
        G.wait_for_timeout(500); ok('progress decays when E is released',H.evaluate("G.bomb.prog")<p1,(p1,H.evaluate("G.bomb.prog")))
    else:
        # prep phase: find a soft wall (3) with a walkable tile next to it inside the defenders' area, stand next to it, look at it
        spot=H.evaluate("""(()=>{for(let y=OY+2;y<H-2;y++)for(let x=2;x<W-2;x++){if(map[y][x]===3){for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){if(map[y+dy][x+dx]===1&&map[y+2*dy]&&map[y+2*dy][x+2*dx]===1)return[x,y,x+dx,y+dy]}}}
          for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){if(map[y][x]===3){for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){if(map[y+dy][x+dx]===1)return[x,y,x+dx,y+dy]}}}return null})()""")
        print('wall spot',spot)
        H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);e.x=%d*T+8;e.y=%d*T+8})()"%(spot[2],spot[3])); G.wait_for_timeout(700)
        cam=G.evaluate("[cam.x,cam.y,VW,VH]"); box=G.evaluate("(()=>{const c=document.querySelector('canvas#c')||document.querySelector('canvas');const b=c.getBoundingClientRect();return [b.left,b.top,b.width,b.height]})()")
        sx=(spot[0]*16+8-cam[0])*box[2]/cam[2]+box[0]; sy=(spot[1]*16+8-cam[1])*box[3]/cam[3]+box[1]
        G.mouse.move(sx,sy); G.wait_for_timeout(300)
        t0=H.evaluate("map[%d][%d]"%(spot[1],spot[0])); r0=H.evaluate("G.reinf")
        G.keyboard.down('e'); G.wait_for_timeout(1200)
        rf=G.evaluate("G.rf"); print('guest G.rf while holding',rf)
        ok('guest sees a reinforce progress bar while holding E',rf is not None,rf)
        G.wait_for_timeout(6000); G.keyboard.up('e'); G.wait_for_timeout(600)
        t1=H.evaluate("map[%d][%d]"%(spot[1],spot[0])); r1=H.evaluate("G.reinf")
        ok('wall got reinforced on the host (3 -> 4, counter went up)',t0==3 and t1==4 and r1>r0,(t0,t1,r0,r1))
        ok('guest map shows the reinforced wall',G.evaluate("map[%d][%d]"%(spot[1],spot[0]))==t1)
    ok('no JS errors',not H.errs and not G.errs and H.evaluate("!NP.err"),(H.errs,G.errs))
print(sum(res),'/',len(res))
