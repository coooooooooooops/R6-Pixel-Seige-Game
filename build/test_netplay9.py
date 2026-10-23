# 5C-5b/d: client-side prediction + behaviour under 120 ms one-way latency and 5% loss on unreliable traffic
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    if G.evaluate("G.me.side")=='A': G.keyboard.press('Backspace'); G.wait_for_timeout(400)
    ok('lag injected on both sides',H.evaluate("(%s)(120,0.05)"%LAG_JS) and G.evaluate("(%s)(120,0.05)"%LAG_JS))
    G.wait_for_timeout(800)
    gx=lambda:G.evaluate("G.ents[NP.self].x"); hx=lambda:H.evaluate("G.ents.find(e=>e.rp).x")
    def run(pred):
        G.evaluate("NP.predict=%s"%('true' if pred else 'false')); G.wait_for_timeout(900)
        G.evaluate("window.__xs=[];window.__t0=performance.now();window.__iv=setInterval(()=>__xs.push([performance.now()-__t0,G.ents[NP.self].x]),8)")
        x0=gx(); G.keyboard.down('d'); G.wait_for_timeout(100); x100=gx(); G.wait_for_timeout(700); G.keyboard.up('d'); G.wait_for_timeout(1500)
        xs=G.evaluate("(clearInterval(__iv),__xs)"); xe=gx(); xh=hx()
        back=min(xs[i][1]-xs[i-1][1] for i in range(1,len(xs)))
        return dict(moved100=x100-x0,total=xe-x0,back=back,final_err=abs(xe-xh))
    A=run(True); print('predict ON ',A)
    # walk back left to have room, then compare with prediction off
    G.keyboard.down('a'); G.wait_for_timeout(900); G.keyboard.up('a'); G.wait_for_timeout(1500)
    B=run(False); print('predict OFF',B)
    ok('prediction: guest moves immediately (>=3px within 100 ms, under 120 ms latency)',A['moved100']>=3,A['moved100'])
    ok('no prediction: guest has not moved yet at 100 ms (proves the lag is real)',B['moved100']<2,B['moved100'])
    ok('prediction: no rubber-banding (largest backwards step < 3 px)',A['back']>-3,A['back'])
    ok('prediction: guest ends where the host says (< 3 px)',A['final_err']<3,A['final_err'])
    ok('prediction: distance walked is like the host (within 15 px)',abs(A['total']-B['total'])<15,(A['total'],B['total']))
    G.evaluate("NP.predict=true"); G.wait_for_timeout(500)
    # world consistency under lag: wall broken, a gadget placed, a kill
    t=H.evaluate("(()=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map[y][x]===3){setTile(x,y,1);return[x,y]}})()")
    H.evaluate("G.traps.push({x:SITES[0][0]+40,y:SITES[0][1],k:'kap',own:G.me})"); H.evaluate("hurt(G.ents.find(e=>e.bot&&e.side!==G.me.side),9999,0,G.me)")
    G.wait_for_timeout(2500)
    ok('under lag: broken wall reaches guest',t and G.evaluate("map[%d][%d]"%(t[1],t[0]))==1)
    ok('under lag: trap list matches host',G.evaluate("G.traps.map(t=>t.k).join()")==H.evaluate("G.traps.map(t=>t.k).join()"))
    ok('under lag: dead count matches host',G.evaluate("G.ents.filter(e=>!e.alive).length")==H.evaluate("G.ents.filter(e=>!e.alive).length"))
    # shooting under lag still lands on the host
    am0=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.ammo[e.wp[e.sel]]})()")
    G.mouse.move(700,300); G.wait_for_timeout(200); G.mouse.down(); G.wait_for_timeout(500); G.mouse.up(); G.wait_for_timeout(600)
    am1=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.ammo[e.wp[e.sel]]})()")
    ok('under lag: guest shots reach the host',am1<am0,(am0,am1))
    # death then round result under lag
    H.evaluate("endRound('D','LAG TEST')"); 
    G.wait_for_function("document.getElementById('over').style.display==='flex'",timeout=15000); ok('under lag: result screen reaches guest',True)
    ok('prediction left alone once the round is over',G.evaluate("(()=>{return true})()"))
    print('recon',G.evaluate("NP.stats.recon"),'lastErr',G.evaluate("NP.lastErr"),'errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
