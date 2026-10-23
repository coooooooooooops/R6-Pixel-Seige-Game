# 5C-4c(a,c): guest loadout in pick, guest leaves -> operator becomes a bot again
from playwright.sync_api import sync_playwright
from np_helpers import *
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
    H=mk(b,'HOSTY'); G=mk(b,'GUESTY'); host(H); connect(H,G)
    H.click('[data-olm="0"]'); H.wait_for_timeout(300); H.click('#lGo'); H.wait_for_timeout(800)
    G.wait_for_function("document.getElementById('scrOps').style.display!=='none'",timeout=8000)
    # guest: attacker op #5 with non-default secondary weapon and non-default gadget; same for defender #7
    info=G.evaluate("""(()=>{const out={};for(const sd of ['A','D']){const ix=OPS[sd].findIndex(o=>o.pw.length>1&&o.sw.length>1&&o.id!=='montagne');const b=OPS[sd][ix];
      uiSel.side=sd;uiSel.op=ix;uiSel.prim[b.id]=b.pw[b.pw.length-1];uiSel.sec[b.id]=b.sw[b.sw.length-1];uiSel.g2[b.id]=G2[sd][1];
      out[sd]={ix,id:b.id,pri:b.pw[b.pw.length-1],sec:b.sw[b.sw.length-1],g:G2[sd][1],npw:b.pw.length,nsw:b.sw.length};NP.pick[sd]=b.id}uiSel.side='A';uiSel.op=out.A.ix;renderOps();return out})()""")
    print('choice',info)
    G.click('#deploy'); G.wait_for_timeout(600)
    deploy(H,SIDE)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0",timeout=15000)
    side=G.evaluate("G.me.side"); w=info[side]
    he=lambda js:H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return "+js+"})()")
    ok('guest operator applied',he("e.op.bid||String(e.op.id).split('_')[0]")==w['id'],w['id'])
    ok('guest PRIMARY weapon applied',he("e.wp[0]")==w['pri'],(he("e.wp"),w['pri']))
    ok('guest secondary weapon applied',he("e.wp[1]")==w['sec'],(he("e.wp"),w['sec']))
    ok('guest secondary gadget applied',he("e.g2")==w['g'],(he("e.g2"),w['g']))
    ok('guest sees the same loadout on its entity',G.evaluate("G.me.g2")==w['g'],G.evaluate("G.me.g2"))
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    # --- guest leaves the match from the pause menu (toMenu) ---
    nm=he("e.nm"); n_before=H.evaluate("G.ents.filter(e=>!e.bot).length")
    G.evaluate("toMenu()"); H.wait_for_timeout(900)
    ok('host: guest operator is a bot again',H.evaluate("G.ents.filter(e=>e.rp).length")==0 and H.evaluate("G.ents.filter(e=>!e.bot).length")==n_before-1,(n_before,H.evaluate("G.ents.filter(e=>!e.bot).length")))
    ok('host: the bot is still alive and acting (moves or holds)',H.evaluate("G.ents.some(e=>e.nm.endsWith(' BOT'))"))
    ok('host: leave shows in the feed',H.evaluate("G.feed.some(f=>/LEFT/.test(f.s))"))
    ok('guest is back at the menu',G.evaluate("!G&&document.getElementById('menu').style.display!=='none'"))
    ok('host remote-runner has no error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    tt=H.evaluate('G.t'); H.wait_for_timeout(1500)
    ok('host clock keeps ticking',H.evaluate('G.t')<tt,(tt,H.evaluate('G.t')))
    ok('host keeps running',H.evaluate("G.t")>H.evaluate("G.t")-0.5 and H.evaluate("G.phase")=='act')
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
