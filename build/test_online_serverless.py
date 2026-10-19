from playwright.sync_api import sync_playwright
import json
U='file:///home/claude/r6/r6-pixel-siege-extension/game.html'
def ok(n,c): print(('PASS ' if c else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch()
    # no broker anywhere (sandbox has no internet -> public brokers unreachable): invites only
    def pg_(name,w=1111,h=806):
        c=b.new_context(viewport={'width':w,'height':h}); c.add_init_script("localStorage.setItem('r6s_name','%s')"%name); pg=c.new_page(); pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.goto(U); pg.wait_for_timeout(800); pg.click('#tabs [data-tab=net]'); return pg
    H=pg_('HOSTY'); G=pg_('GUESTY')
    H.click('#goHost'); H.wait_for_function("/unreachable/.test(document.querySelector('#lMsg').textContent)",timeout=30000)
    ok('host with no signaling shows unreachable',True); H.click('#lInvBtn'); H.click('#lNew'); H.wait_for_selector('#pOffer',timeout=15000); offer=H.input_value('#pOffer')
    G.click('#goJoin'); G.click('#jInv summary'); G.fill('#jOffer',offer); G.click('#jMake'); G.wait_for_selector('#jRep:not([hidden])',timeout=15000)
    H.fill('#pReply',G.input_value('#jReply')); H.click('#pAcc'); G.wait_for_selector('#olLob:not([hidden])',timeout=20000)
    ok('serverless invite join works with no broker',True)
    ok('guest shows "Joined by invite"', 'invite' in G.inner_text('#lCodeNote').lower())
    # host closes lobby -> guest returned with message
    H.click('#mClose'); H.click('#lBack'); G.wait_for_selector('#olJoin:not([hidden])',timeout=10000); ok('host closing sends guest back with a message','closed' in G.inner_text('#jMsg').lower())
    print(H.errs,G.errs)
    # fit audit for the three views at several sizes
    JS="""()=>{const bad=[];const root=document.getElementById('tp-net');const vw=innerWidth,vh=innerHeight;
    for(const e of root.querySelectorAll('*')){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')continue;const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;
     if(r.right>vw+1||r.left<-1)bad.push(['x',e.tagName+'.'+e.className,Math.round(r.left),Math.round(r.right)]);
     if(e.children.length===0&&e.textContent.trim()&&e.scrollWidth>e.clientWidth+1&&s.overflowX==='visible'&&e.clientWidth>0&&!e.closest('.nm,.mp,.maps'))bad.push(['spill',e.tagName+'.'+e.className,e.scrollWidth,e.clientWidth])}
    const sc=document.querySelector('#scrMain'),m=document.getElementById('menu');return {bad:bad.slice(0,4),docOver:Math.max(document.documentElement.scrollHeight,m.scrollHeight)-vh}}"""
    for (w,h) in [(1111,806),(1280,720),(1024,600),(1111,756),(800,600)]:
        P=pg_('FITTEST',w,h); r={}
        r['home']=P.evaluate(JS)
        P.click('#goJoin'); P.wait_for_timeout(100); r['join']=P.evaluate(JS)
        P.click('#jInv summary'); P.wait_for_timeout(100); r['join+inv']=P.evaluate(JS); P.click('#jBack')
        P.click('#goHost'); P.wait_for_function("/unreachable/.test(document.querySelector('#lMsg').textContent)",timeout=30000); r['lobby']=P.evaluate(JS); P.click('#lInvBtn'); P.click('#lNew'); P.wait_for_selector('#pOffer',timeout=15000); r['lobby+invite']=P.evaluate(JS)
        print((w,h),{k:(v['bad'],v['docOver']) for k,v in r.items()})
        if (w,h)==(1111,806): P.screenshot(path='/tmp/f_lobby.png')
        if (w,h)==(1024,600): P.screenshot(path='/tmp/f_small.png')
    b.close()
