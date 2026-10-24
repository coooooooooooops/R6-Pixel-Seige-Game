# 5C-8: a guest that goes quiet (paused menu, throttled/hidden tab, lost packets) must not keep walking
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    if G.evaluate("G.me.side")=='A': G.keyboard.press('Backspace'); G.wait_for_timeout(300)
    hx=lambda:H.evaluate("G.ents.find(e=>e.rp).x")
    x0=hx(); G.keyboard.down('d'); G.wait_for_timeout(500); x1=hx(); ok('walking works while input flows',x1>x0+5,(x0,x1))
    # 1) paused guest (ESC menu) sends empty input
    G.evaluate("PAUSED=true"); G.wait_for_timeout(500); xa=hx(); G.wait_for_timeout(700); xb=hx()
    ok('paused guest stops walking even though D is still physically held',abs(xb-xa)<1,(xa,xb)); G.evaluate("PAUSED=false")
    G.wait_for_timeout(500); xc=hx(); ok('walking resumes after unpausing',xc>xb+3,(xb,xc))
    # 2) input stream dies completely (tab throttled / connection stalls): host must time out
    G.evaluate("NP.drop=true"); H.wait_for_timeout(1300); xd=hx(); H.wait_for_timeout(800); xe=hx()
    ok('host stops a silent guest (stale-input timeout)',abs(xe-xd)<1,(xd,xe))
    ok('stale timeout was used',H.evaluate("NP.stats.stale")>0,H.evaluate("NP.stats.stale"))
    G.keyboard.up('d'); G.keyboard.down('a'); G.evaluate("NP.drop=false"); G.wait_for_timeout(700); xf=hx(); ok('guest walks again when input returns',abs(xf-xe)>3,(xe,xf))
    G.keyboard.up('a')
    ok('host no remote error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
