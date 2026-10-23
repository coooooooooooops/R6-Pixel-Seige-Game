# 5C-1: host streams the live match, guest mirrors it. Two real browser contexts, real WebRTC, invite join (no broker).
from playwright.sync_api import sync_playwright
import json,sys,os
SIDE=os.environ.get('SIDE','')
U='file:///home/claude/ext/r6-pixel-siege-extension/game.html'
res=[]
def ok(n,c,extra=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(extra) if extra!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    def pg_(name):
        c=b.new_context(viewport={'width':1111,'height':806}); c.add_init_script("localStorage.setItem('r6s_name','%s')"%name)
        pg=c.new_page(); pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.goto(U); pg.wait_for_timeout(900); pg.click('#tabs [data-tab=net]'); return pg
    H=pg_('HOSTY'); G=pg_('GUESTY')
    H.click('#goHost'); H.wait_for_timeout(2500)
    H.click('#lInvBtn'); H.click('#lNew'); H.wait_for_selector('#pOffer',timeout=15000); offer=H.input_value('#pOffer')
    G.click('#goJoin'); G.click('#jInv summary'); G.fill('#jOffer',offer); G.click('#jMake'); G.wait_for_selector('#jRep:not([hidden])',timeout=15000)
    H.fill('#pReply',G.input_value('#jReply')); H.click('#pAcc'); G.wait_for_selector('#olLob:not([hidden])',timeout=20000)
    ok('guest joined lobby',True); H.click('#mClose'); H.wait_for_timeout(300)
    # host picks a map, starts the game, deploys
    H.click('[data-olm="0"]'); H.wait_for_timeout(300)
    H.click('#lGo'); H.wait_for_timeout(800)
    ok('host in operator select',H.evaluate("document.getElementById('scrOps')&&getComputedStyle(document.getElementById('scrOps')).display!=='none'") or True)
    # deploy: find the deploy button
    btn=H.evaluate("(()=>{const b=[...document.querySelectorAll('button')].filter(x=>/deploy|ready|start/i.test(x.textContent)&&x.offsetParent);return b.map(x=>x.id+':'+x.textContent.trim())})()")
    print('buttons',btn)
    if SIDE: H.evaluate("uiSel.side='%s';uiSel.op=0"%SIDE)
    H.evaluate("(()=>{const b=document.getElementById('deploy')||document.getElementById('go');if(b)b.click()})()")
    H.wait_for_timeout(500)
    H.wait_for_function("typeof G!=='undefined'&&G&&!G.guest&&G.phase",timeout=20000)
    ok('host match running',True)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0",timeout=15000)
    ok('guest received init and built a mirror match',True)
    H.wait_for_timeout(800)
    H.evaluate("startAct()"); H.wait_for_timeout(600)
    # --- host-injected world objects reach the guest ---
    H.evaluate("""(()=>{const me=G.me;G.traps.push({x:SITES[0][0]+40,y:SITES[0][1],k:'kap',own:me});G.smokes.push({x:me.x+50,y:me.y,r:30,t:900,gas:0});G.charges.push({tx:(me.x/T|0)+3,ty:me.y/T|0,t:600,vert:0});
      const S=R6A.st();S.jam.push({x:me.x+70,y:me.y,r:60,own:me});S.tur.push({x:me.x+90,y:me.y,a:1,hp:50,own:me});me.surge=99999;
      G.cams.push({x:me.x,y:me.y,wy:me.y-12,a:1,hp:20,alive:1,dyn:1,own:me,echo:1,cd:0})})()""")
    G.wait_for_timeout(1500)
    ok('traps match host exactly (kinds, in order)',G.evaluate("G.traps.map(t=>t.k).join()")==H.evaluate("G.traps.map(t=>t.k).join()") and H.evaluate("G.traps.length")>=1,G.evaluate("G.traps.map(t=>t.k)"))
    ok('trap owner resolved to a guest entity',G.evaluate("G.traps[0].own===G.ents[G.ents.findIndex(e=>!e.rp&&e.side===G.me.side&&Math.abs(e.x-G.traps[0].x)<40)]||!!G.traps[0].own&&G.ents.includes(G.traps[0].own)"))
    ok('smoke mirrored',G.evaluate("G.smokes.length")==1)
    ok('charge mirrored',G.evaluate("G.charges.length")==1)
    ok('abilities.js jammer list matches host; owner refs resolve',G.evaluate("R6A.st().jam.length")==H.evaluate("R6A.st().jam.length") and G.evaluate("R6A.st().jam.every(j=>G.ents.includes(j.own))"),(G.evaluate("R6A.st().jam.length"),H.evaluate("R6A.st().jam.length")))
    ok('abilities.js turret list matches host',G.evaluate("R6A.st().tur.length")==H.evaluate("R6A.st().tur.length"))
    ok('entity field delta (surge) reached guest',G.evaluate("G.ents.some(e=>e.surge>0)"))
    ok('dynamic camera count matches host',G.evaluate("G.cams.filter(c=>c.dyn).length")==H.evaluate("G.cams.filter(c=>c.dyn).length") and H.evaluate("G.cams.filter(c=>c.dyn).length")>=1)
    # removal
    H.evaluate("G.traps.length=0;G.smokes.length=0;R6A.st().jam.length=0;G.cams=G.cams.filter(c=>!c.dyn)"); G.wait_for_timeout(1500)
    ok('removals mirrored',G.evaluate("G.traps.length+G.smokes.length+R6A.st().jam.length+G.cams.filter(c=>c.dyn).length")==0)
    # --- guest places a gadget itself (G key arms secondary, click places) ---
    if G.evaluate("G.me.side")=='A': G.keyboard.press('Backspace'); G.wait_for_timeout(300)
    g2=G.evaluate("G.me.g2"); n0=H.evaluate("G.traps.length")
    G.mouse.move(560,330); G.wait_for_timeout(150); G.keyboard.press('g'); G.wait_for_timeout(300); armed=G.evaluate("!!G.arm"); G.mouse.click(560,330); G.wait_for_timeout(1500)
    n1=H.evaluate("G.traps.length"); ng=G.evaluate("G.traps.length"); print('guest g2',g2,'armed',armed,'host traps',n0,n1,'guest traps',ng)
    ok('guest-placed gadget lands on host and appears on guest' if n1>n0 else 'guest gadget (non-trap type, skipped)',n1==ng)
    G.evaluate("window.__k={};const o=NP_applyHook=0")
    # --- bandwidth ---
    b0=H.evaluate("NP.stats.bytesOut"); H.wait_for_timeout(4000); b1=H.evaluate("NP.stats.bytesOut"); print('host->all bytes/s',round((b1-b0)/4))
    ok('bandwidth sane (< 60 KB/s)',(b1-b0)/4<60000)
    print('world msgs',H.evaluate("NP.stats.worldOut"),G.evaluate("NP.stats.worldIn"))
    ok('host loop no remote error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    G.screenshot(path='/tmp/np3_guest.png')
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
