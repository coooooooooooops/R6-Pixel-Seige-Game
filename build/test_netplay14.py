# every game mode and a spread of maps online: same map layer, same entities, snapshots flow, no errors
from playwright.sync_api import sync_playwright
from np_helpers import *
import os,json
COMBOS=json.loads(os.environ.get('COMBOS','[["bomb",0],["hostage",1],["secure",2]]'))
CHK="(()=>{let s=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)s=(s*31+map[y][x]*7+fk[y*W+x]*13+fc[y*W+x]*3+winF[y*W+x])>>>0;return [s,JSON.stringify([SITES,HOST]),MAPN,G.mode,G.ents.length,G.ents.map(e=>e.op.id).join()]})()"
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    for mode,mi in COMBOS:
        H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
        H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
        G.click('#deploy'); G.wait_for_timeout(500)
        H.evaluate("uiSel.mode='%s';uiSel.mapIdx=%d"%(mode,mi))
        deploy(H,SIDE)
        G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=20000)
        H.evaluate("startAct()"); H.wait_for_timeout(2500)
        a=H.evaluate(CHK); c=G.evaluate(CHK)
        ok('[%s/map %d %s] guest map layer, sites, mode and operators identical'%(mode,mi,a[2]),a[0]==c[0] and a[1]==c[1] and a[2]==c[2] and a[3]==c[3] and a[4]==c[4] and a[5]==c[5],(a[2],a[3]))
        ok('[%s/%d] snapshots flowing'%(mode,mi),G.evaluate("NP.stats.snapIn")>30,G.evaluate("NP.stats.snapIn"))
        hh=H.evaluate("[G.hostage.x,G.hostage.y]"); gh=G.evaluate("[G.hostage.x,G.hostage.y]")
        ok('[%s/%d] hostage position matches host'%(mode,mi),abs(hh[0]-gh[0])<2 and abs(hh[1]-gh[1])<2,(hh,gh))
        ok('[%s/%d] phase matches'%(mode,mi),H.evaluate("G.phase")==G.evaluate("G.phase"))
        ok('[%s/%d] no errors'%(mode,mi),not H.errs and not G.errs and H.evaluate("!NP.err") and G.evaluate("!NP.err"),(H.errs,G.errs))
        H.context.close(); G.context.close()
print(sum(res),'/',len(res))
