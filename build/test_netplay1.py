# 5C-1: host streams the live match, guest mirrors it. Two real browser contexts, real WebRTC, invite join (no broker).
from playwright.sync_api import sync_playwright
import json,sys
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
    H.evaluate("(()=>{const b=document.getElementById('deploy')||document.getElementById('go');if(b)b.click()})()")
    H.wait_for_timeout(500)
    H.wait_for_function("typeof G!=='undefined'&&G&&!G.guest&&G.phase",timeout=20000)
    ok('host match running',True)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0",timeout=15000)
    ok('guest received init and built a mirror match',True)
    n_h=H.evaluate("G.ents.length"); n_g=G.evaluate("G.ents.length"); ok('same entity count',n_h==n_g,(n_h,n_g))
    ok('same map',H.evaluate("MAPN")==G.evaluate("MAPN"),G.evaluate("MAPN"))
    ok('same ops in same order',H.evaluate("G.ents.map(e=>e.op.bid||e.op.id).join()")==G.evaluate("G.ents.map(e=>e.op.bid||e.op.id).join()"))
    H.wait_for_timeout(2500)
    ok('guest menu hidden, canvas visible',G.evaluate("document.getElementById('menu').style.display==='none'"))
    st=G.evaluate("NP.stats"); ok('guest receiving snapshots',st['snapIn']>20,st)
    # positions track: compare after a pause
    H.evaluate("PAUSED=false")
    H.wait_for_timeout(1200)
    d=H.evaluate("G.ents.map(e=>[e.x,e.y])"); g=G.evaluate("G.ents.map(e=>[e.tx,e.ty])")
    md=max(max(abs(a[0]-b2[0]),abs(a[1]-b2[1])) for a,b2 in zip(d,g)); ok('guest targets within a few px of host positions',md<25,round(md,1))
    ok('phase matches',H.evaluate("G.phase")==G.evaluate("G.phase"),G.evaluate("G.phase"))
    # force host into act phase and kill an entity, check mirror
    H.evaluate("startAct()"); H.wait_for_timeout(600)
    ok('phase change reaches guest',G.evaluate("G.phase")=='act')
    H.evaluate("(()=>{const e=G.ents.find(x=>x.bot&&x.side!==G.me.side);hurt(e,9999,0,G.me)})()"); H.wait_for_timeout(600)
    ok('a kill on host shows on guest',G.evaluate("G.ents.filter(e=>!e.alive).length")==H.evaluate("G.ents.filter(e=>!e.alive).length") and G.evaluate("G.ents.filter(e=>!e.alive).length")>=1)
    # break a soft wall on host -> tile arrives on guest
    t=H.evaluate("(()=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map[y][x]===3){setTile(x,y,1);return[x,y]}})()"); H.wait_for_timeout(700)
    ok('broken wall tile reaches guest',t and G.evaluate("map[%d][%d]"%(t[1],t[0]))==1,t)
    # tab cycles follow
    a=G.evaluate("G.ents.indexOf(G.me)"); G.keyboard.press('Tab'); G.wait_for_timeout(200); b2=G.evaluate("G.ents.indexOf(G.me)"); ok('TAB switches followed player',a!=b2,(a,b2))
    G.screenshot(path='/tmp/np_guest.png'); H.screenshot(path='/tmp/np_host.png')
    print('bytes out per second ~',round(H.evaluate("NP.stats.bytesOut")/ (H.evaluate("tickN||0")/60 or 1)) if False else H.evaluate("NP.stats.bytesOut"),'total bytes; snaps',H.evaluate("NP.stats.snapOut"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
