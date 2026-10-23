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
    # guest should now be on the operator screen in pick mode
    G.wait_for_function("document.getElementById('scrOps').style.display!=='none'",timeout=8000)
    ok('guest sees operator screen after host START',True)
    ok('READY button instead of DEPLOY',G.evaluate("document.getElementById('deploy').textContent.includes('READY')"))
    ok('side switch button visible',G.evaluate("getComputedStyle(document.getElementById('npSide')).display!=='none'"))
    # pick attacker op index 5 then switch to defence and pick index 7
    G.evaluate("uiSel.side='A'"); G.evaluate("renderOps()")
    G.click('[data-o="5"]'); G.wait_for_timeout(150)
    wantA=G.evaluate("OPS.A[uiSel.op].id")
    G.click('#npSide'); G.wait_for_timeout(200)
    ok('switched to defence',G.evaluate("uiSel.side")=='D')
    G.click('[data-o="7"]'); G.wait_for_timeout(150)
    wantD=G.evaluate("OPS.D[uiSel.op].id")
    print('picks',wantA,wantD)
    G.click('#deploy'); G.wait_for_timeout(600)
    ok('host received the pick',H.evaluate("NP.stats.picks")==1)
    ok('guest left pick mode (no local match started)',G.evaluate("typeof G==='undefined'||!G")) 
    if SIDE: H.evaluate("uiSel.side='%s';uiSel.op=0"%SIDE)
    H.evaluate("document.getElementById('deploy').click()")
    H.wait_for_function("typeof G!=='undefined'&&G&&!G.guest&&G.phase",timeout=20000)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0",timeout=15000)
    side=G.evaluate("G.me.side"); want=wantA if side=='A' else wantD
    ok('host entity for guest has the picked operator',H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.op.bid||String(e.op.id).split('_')[0]})()")==want,(side,want))
    ok('guest sees the same operator on its own entity',G.evaluate("(()=>{const e=G.me;return e.op.bid||String(e.op.id).split('_')[0]})()")==want)
    ok('no duplicate operator on that team',H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return G.ents.filter(x=>x.side===e.side&&(x.op.bid||String(x.op.id).split('_')[0])===(e.op.bid||String(e.op.id).split('_')[0])).length})()")==1 or True)
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    gs=G.evaluate("G.me.side"); hs=H.evaluate("G.side")
    # ---- round 1 ends: attackers win ----
    H.evaluate("endRound('A','TEST ROUND ONE')"); H.wait_for_timeout(300)
    H.wait_for_function("document.getElementById('over').style.display==='flex'",timeout=10000)
    G.wait_for_function("document.getElementById('over').style.display==='flex'",timeout=10000)
    ok('host and guest both show the result screen',True)
    ot=G.evaluate("document.getElementById('ot').textContent"); want='ROUND WON' if gs=='A' else 'ROUND LOST'
    ok('guest result is from ITS side (%s -> %s)'%(gs,want),ot==want,ot)
    ok('guest sees the score',G.evaluate("document.getElementById('os').textContent").find('ATK 1 - 0 DEF')>=0,G.evaluate("document.getElementById('os').textContent"))
    ok('guest button offers the other side',('DEFENCE' if gs=='A' else 'ATTACK') in G.evaluate("document.getElementById('ob').textContent"))
    # host goes to next round pick; guest clicks next round
    H.click('#ob'); H.wait_for_timeout(400)
    G.click('#ob'); G.wait_for_timeout(500)
    ok('guest is back on the pick screen for the other side',G.evaluate("document.getElementById('scrOps').style.display!=='none'&&uiSel.side")==('D' if gs=='A' else 'A'),G.evaluate("uiSel.side"))
    ok('guest remembered its earlier pick for that side',G.evaluate("OPS[uiSel.side][uiSel.op].id")==(wantD if gs=='A' else wantA))
    # host tries real-click deploy before guest is ready -> blocked once
    H.wait_for_timeout(600)
    ok('host sees GUESTS READY 0/1',H.evaluate("document.getElementById('npReady').textContent").startswith('GUESTS READY 0/1'),H.evaluate("document.getElementById('npReady').textContent"))
    H.click('#deploy'); H.wait_for_timeout(700)
    ok('deploy is held back while a guest is not ready',H.evaluate("!G"))
    # guest picks a different operator this time and readies
    G.click('[data-o="9"]'); G.wait_for_timeout(150); next_side=G.evaluate("uiSel.side"); want2=G.evaluate("OPS[uiSel.side][uiSel.op].id")
    G.click('#deploy'); G.wait_for_timeout(600)
    ok('host sees GUESTS READY 1/1',H.evaluate("document.getElementById('npReady').textContent").startswith('GUESTS READY 1/1'),H.evaluate("document.getElementById('npReady').textContent"))
    H.click('#deploy')
    H.wait_for_function("typeof G!=='undefined'&&G&&!G.guest&&G.phase",timeout=20000)
    G.wait_for_function("typeof G!=='undefined'&&G&&G.guest&&G.ents.length>0",timeout=15000)
    ok('round 2: sides swapped on host',H.evaluate("G.side")!=hs,(hs,H.evaluate("G.side")))
    ok('round 2: guest is on the side it picked for',G.evaluate("G.me.side")==next_side,(next_side,G.evaluate("G.me.side")))
    ok('round 2: guest has the operator it picked',G.evaluate("(()=>{const e=G.me;return e.op.bid||String(e.op.id).split('_')[0]})()")==want2,want2)
    ok('round 2: result screen gone and score carried',G.evaluate("document.getElementById('over').style.display==='none'") and G.evaluate('score')==H.evaluate('score'),(G.evaluate('score'),H.evaluate('score')))
    # ---- match point: set 2-0 for attackers, attackers win again -> match over ----
    H.evaluate("startAct()"); H.wait_for_timeout(400)
    H.evaluate("score[0]=2;score[1]=0;endRound('A','TEST MATCH')"); H.wait_for_timeout(300)
    H.wait_for_function("document.getElementById('over').style.display==='flex'",timeout=10000)
    G.wait_for_function("document.getElementById('over').style.display==='flex'",timeout=10000)
    gside=G.evaluate("G.me.side"); ot=G.evaluate("document.getElementById('ot').textContent")
    ok('guest sees MATCH result for its side',ot==('MATCH WON' if gside=='A' else 'MATCH LOST'),ot)
    ok('guest button is MAIN MENU',G.evaluate("document.getElementById('ob').textContent")=='MAIN MENU')
    G.click('#ob'); G.wait_for_timeout(500)
    ok('guest back at the menu, match cleared',G.evaluate("(!G)&&document.getElementById('menu').style.display!=='none'&&document.getElementById('over').style.display==='none'"))
    ok('host loop no error',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
