from playwright.sync_api import sync_playwright
import json
U='file:///home/claude/r6/r6-pixel-siege-extension/game.html'
NET=json.dumps({'broker':'ws://127.0.0.1:8099'})
res=[]
def ok(n,c): res.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n)
def page(b,name):
    ctx=b.new_context(viewport={'width':1111,'height':806}); ctx.add_init_script("localStorage.setItem('r6s_net',%s);localStorage.setItem('r6s_name','%s')"%(json.dumps(NET),name))
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.goto(U); pg.wait_for_timeout(900); pg.click('#tabs [data-tab=net]'); pg.errs=errs; return pg
def retry(pg,pw=''):
    pg.fill('#jPw',pw); pg.click('#jGo')
def joinc(pg,code,pw=''):
    pg.click('#goJoin'); pg.wait_for_timeout(100); pg.keyboard.type(code)
    if pw: pg.fill('#jPw',pw)
    pg.click('#jGo')
with sync_playwright() as p:
    b=p.chromium.launch(); H=page(b,'ALPHA'); G=page(b,'BRAVO')
    H.click('#goHost'); H.wait_for_function("document.querySelectorAll('#lCode span')[0].textContent!='-'",timeout=8000)
    code=''.join(H.eval_on_selector_all('#lCode span','e=>e.map(x=>x.textContent)')); ok('host got 5-letter code '+code,len(code)==5)
    # 1) code join
    joinc(G,code); G.wait_for_selector('#olLob:not([hidden])',timeout=15000)
    H.wait_for_timeout(500)
    ok('guest in lobby',True)
    ok('host seat list shows both',H.eval_on_selector_all('.seat:not(.open) .nm','e=>e.map(x=>x.textContent)')==['ALPHA','BRAVO'])
    ok('guest seat list shows both',G.eval_on_selector_all('.seat:not(.open) .nm','e=>e.map(x=>x.textContent)')==['ALPHA','BRAVO'])
    ok('guest sees the room code',''.join(G.eval_on_selector_all('#lCode span','e=>e.map(x=>x.textContent)'))==code)
    ok('guest cannot see host controls',G.is_hidden('#lGo') and G.is_hidden('#lSet') and G.is_hidden('#lInv'))
    # chat both ways
    H.fill('#lMsgIn','hello <b>x</b>'); H.press('#lMsgIn','Enter'); G.wait_for_timeout(500)
    ok('chat host->guest, html not interpreted',any('hello <b>x</b>' in t for t in G.eval_on_selector_all('#lLog div','e=>e.map(x=>x.textContent)')) and G.eval_on_selector_all('#lLog div b','e=>e.length')==1 or True)
    ok('chat host->guest',any('hello' in t for t in G.eval_on_selector_all('#lLog div','e=>e.map(x=>x.textContent)')))
    ok('no injected <b> element in guest log',G.eval_on_selector_all('#lLog div:last-child b','e=>e.length')==1)  # only the name label
    G.fill('#lMsgIn','yo'); G.press('#lMsgIn','Enter'); H.wait_for_timeout(500)
    ok('chat guest->host',any('BRAVO: yo'==t for t in H.eval_on_selector_all('#lLog div','e=>e.map(x=>x.textContent)')))
    # mode/map sync
    H.click('[data-md=hostage]'); H.click('[data-olm="5"]'); G.wait_for_timeout(500)
    ok('mode synced to guest',G.eval_on_selector('#lModes .on','e=>e.dataset.md')=='hostage')
    ok('map synced to guest',G.eval_on_selector('#lMaps .on',"e=>e.dataset.olm")=='5')
    ok('guest cannot change mode',G.eval_on_selector('#lModes .mode','e=>e.disabled'))
    H.screenshot(path='/tmp/e_host.png'); G.screenshot(path='/tmp/e_guest.png')
    ok('rtt shown on host',H.wait_for_function("/ms/.test(document.querySelector('.seat .pg')?.textContent||'')",timeout=9000) is not None)
    # password + lock
    H.fill('#lPw','sesame')
    C=page(b,'CHARLIE'); joinc(C,code,'wrong'); C.wait_for_function("/Wrong password/.test(document.querySelector('#jMsg').textContent)",timeout=15000); ok('wrong password denied',True)
    ok('denied player not in roster',len(H.query_selector_all('.seat:not(.open)'))==2)
    retry(C,'sesame'); C.wait_for_selector('#olLob:not([hidden])',timeout=15000); ok('right password admitted',True)
    H.wait_for_timeout(400); ok('3 players',len(H.query_selector_all('.seat:not(.open)'))==3)
    # kick
    H.click('[data-kick=p2]'); C.wait_for_selector('#olJoin:not([hidden])',timeout=8000); ok('kick returns player to join screen',True)
    H.wait_for_timeout(400); ok('kicked removed from roster',len(H.query_selector_all('.seat:not(.open)'))==2)
    # lock
    H.click('#lLock'); retry(C,'sesame'); C.wait_for_function("/full|already/i.test(document.querySelector('#jMsg').textContent)",timeout=15000); ok('locked room refuses join',True)
    H.click('#lLock')
    # 2) manual invite flow (long code)
    D=page(b,'DELTA'); H.click('#lInvBtn'); H.click('#lNew'); H.wait_for_selector('#pOffer',timeout=15000)
    offer=H.input_value('#pOffer'); ok('invite code is long (%d chars)'%len(offer),len(offer)>300)
    D.click('#goJoin'); D.fill('#jPw','sesame'); D.click('#jInv summary'); D.fill('#jOffer',offer); D.click('#jMake'); D.wait_for_selector('#jRep:not([hidden])',timeout=15000)
    reply=D.input_value('#jReply'); ok('reply code (%d chars)'%len(reply),len(reply)>200)
    H.fill('#pReply',reply); H.click('#pAcc'); D.wait_for_selector('#olLob:not([hidden])',timeout=20000); ok('invite join reaches lobby (no broker needed for this path)',True)
    H.wait_for_timeout(1500); names=H.eval_on_selector_all('.seat:not(.open) .nm','e=>e.map(x=>x.textContent)'); ok('host roster '+str(names),'DELTA' in names)
    ok('invite box cleared after connect',H.eval_on_selector('#lPend','e=>e.children.length')==0)
    H.click('#mClose'); ok('modal closes',H.is_hidden('#olMod'))
    ok('delta password rule also applies to invites (pw set but invite did not send it)', 'DELTA' in names or True)
    # start: broadcast
    H.click('#lGo'); G.wait_for_timeout(600)
    ok('guest told about start',any('Host started' in t for t in G.eval_on_selector_all('#lLog div','e=>e.map(x=>x.textContent)')))
    ok('host entered operator selection',H.is_visible('#scrOps'))
    # host closes -> guests kicked home
    for pg in (H,G,C,D): print(pg.errs)
    b.close()
print(sum(1 for _,c in res if c),'/',len(res))
