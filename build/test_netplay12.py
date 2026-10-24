# 5C-7: a guest whose connection drops can rejoin and get its own operator back (same round, still alive)
from playwright.sync_api import sync_playwright
from np_helpers import *
import json
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.click('#deploy'); G.wait_for_timeout(500); deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0",timeout=15000)
    H.evaluate("startAct()"); H.wait_for_timeout(1500)
    ok('host got the guest token',H.evaluate("Object.keys(NP._toks()).length")==1)
    idx=H.evaluate("G.ents.findIndex(e=>e.rp)"); op0=H.evaluate("G.ents[%d].op.id"%idx); hp0=H.evaluate("G.ents[%d].hp"%idx)
    H.evaluate("G.ents[%d].hp=77"%idx)   # remember state across the drop
    # --- connection drops ---
    G.evaluate("R6Online.net.close()"); H.wait_for_timeout(1500)
    ok('host turned the dropped guest into a bot',H.evaluate("G.ents[%d].bot&&!G.ents[%d].rp"%(idx,idx)))
    # --- host makes a fresh invite (menu is hidden mid-match: drive the DOM directly) ---
    H.evaluate("document.getElementById('lInvBtn').click()"); H.evaluate("document.getElementById('lNew').click()")
    H.wait_for_function("document.getElementById('pOffer')&&document.getElementById('pOffer').value.length>20",timeout=15000)
    offer=H.evaluate("document.getElementById('pOffer').value")
    # guest rejoins
    G.evaluate("(o)=>{document.getElementById('goJoin').click();const d=document.querySelector('#jInv');if(d)d.open=true;document.getElementById('jOffer').value=o;document.getElementById('jMake').click()}",offer)
    G.wait_for_function("document.getElementById('jRep')&&!document.getElementById('jRep').hidden&&document.getElementById('jReply').value.length>20",timeout=20000)
    reply=G.evaluate("document.getElementById('jReply').value")
    H.evaluate("(r)=>{document.getElementById('pReply').value=r;document.getElementById('pAcc').click()}",reply)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0&&NP.self>=0&&NP.stats.initIn>=2",timeout=30000)
    ok('guest got a seat back (new init)',G.evaluate("NP.self")==idx,(G.evaluate("NP.self"),idx))
    ok('host: the same entity is human-controlled again',H.evaluate("(()=>{const e=G.ents[%d];return !e.bot&&!!e.rp&&e.nm==='GUESTY'})()"%idx),H.evaluate("G.ents[%d].nm"%idx))
    ok('same operator, same health (state kept)',H.evaluate("G.ents[%d].op.id"%idx)==op0 and H.evaluate("G.ents[%d].hp"%idx)<=77,H.evaluate("G.ents[%d].hp"%idx))
    ok('guest sees itself as the playing entity',G.evaluate("G.me===G.ents[NP.self]&&G.me.alive"))
    # controls work again
    if G.evaluate("G.me.side")=='A': G.keyboard.press('Backspace'); G.wait_for_timeout(300)
    x0=H.evaluate("G.ents[%d].x"%idx); G.keyboard.down('d'); G.wait_for_timeout(800); G.keyboard.up('d'); G.wait_for_timeout(300)
    ok('rejoined guest can move its operator',H.evaluate("G.ents[%d].x"%idx)>x0+5,(x0,H.evaluate("G.ents[%d].x"%idx)))
    ok('rejoin shown in kill feed',H.evaluate("G.feed.some(f=>/REJOINED/.test(f.s))"))
    ok('host no remote error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
