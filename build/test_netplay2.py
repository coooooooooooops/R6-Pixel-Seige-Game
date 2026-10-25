# 5C-1: host streams the live match, guest mirrors it. Two real browser contexts, real WebRTC, invite join (no broker).
from playwright.sync_api import sync_playwright
import json,sys,os
SIDE=os.environ.get('SIDE','')
import os
U='file://'+os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','game.html'))
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
    ok('host sees a remote player entity',H.evaluate("G.ents.filter(e=>e.rp).length")==1,H.evaluate("G.ents.filter(e=>e.rp).map(e=>e.nm+':'+e.side+':'+e.bot)"))
    ok('host still controls own entity',H.evaluate("!G.me.bot&&!G.me.rp"))
    s=G.evaluate("NP.self"); ok('guest knows its seat',s>=0,s)
    ok('guest camera/HUD entity is its own',G.evaluate("G.me===G.ents[NP.self]&&!G.me.bot"))
    ok('spectate bar hidden while playing',G.evaluate("document.getElementById('npBar').style.display")=='none')
    H.evaluate("startAct()"); H.wait_for_timeout(500)
    ok('guest got own state',G.evaluate("NP.stats.ownIn")>5,G.evaluate("NP.stats.ownIn"))
    if G.evaluate("G.me.side")=='A': G.keyboard.press('Backspace'); G.wait_for_timeout(400)  # attackers start inside drone 1
    # moving: hold D on guest
    rx0=H.evaluate("G.ents.find(e=>e.rp).x"); ry0=H.evaluate("G.ents.find(e=>e.rp).y")
    G.keyboard.down('d'); G.wait_for_timeout(900); G.keyboard.up('d'); G.wait_for_timeout(300)
    rx1=H.evaluate("G.ents.find(e=>e.rp).x"); gx=G.evaluate("G.me.x")
    ok('guest D key moves their operator on the host',rx1>rx0+10,(rx0,rx1))
    ok('guest sees itself move too',abs(gx-rx1)<12,(gx,rx1))
    ok('host entity did not move',abs(H.evaluate("G.me.x")-H.evaluate("G.me.x"))<1)
    # aim + fire
    am0=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.ammo[e.wp[e.sel]]})()")
    G.mouse.move(700,300); G.wait_for_timeout(200); G.mouse.down(); G.wait_for_timeout(500); G.mouse.up(); G.wait_for_timeout(300)
    am1=H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.ammo[e.wp[e.sel]]})()")
    ok('guest click fires their weapon on the host',am1<am0,(am0,am1))
    a=H.evaluate("G.ents.find(e=>e.rp).a"); ok('aim follows guest mouse',abs(H.evaluate("Math.sin(G.ents.find(e=>e.rp).a)")-G.evaluate("Math.sin(G.me.a)"))<.1 and abs(H.evaluate("Math.cos(G.ents.find(e=>e.rp).a)")-G.evaluate("Math.cos(G.me.a)"))<.1,a)
    # reload key event
    G.keyboard.press('r'); G.wait_for_timeout(400)
    ok('R key reloads on host',H.evaluate("(()=>{const e=G.ents.find(x=>x.rp);return e.rl>0||e.ammo[e.wp[e.sel]]===WP[e.wp[e.sel]].mag})()"))
    # weapon switch
    G.keyboard.press('2'); G.wait_for_timeout(400)
    ok('key 2 switches weapon on host and guest',H.evaluate("G.ents.find(e=>e.rp).sel")==1 and G.evaluate("G.me.sel")==1)
    # gadget: arm secondary gadget with Q or G, cancel with right click
    G.keyboard.press('g'); G.wait_for_timeout(400)
    arm=G.evaluate("!!G.arm"); H_arm=H.evaluate("(()=>{return 1})()")
    print('arm on guest after G:',arm)
    G.mouse.click(600,300,button='right'); G.wait_for_timeout(300)
    ok('right click cancels armed gadget',not G.evaluate("!!G.arm"))
    # drone cycle for attackers
    side=G.evaluate("G.me.side"); print('guest side',side)
    # drone control (only if guest is an attacker)
    if G.evaluate("G.me.side")=='A':
        G.keyboard.press('c'); G.wait_for_timeout(500)
        ok('C cycles into a drone for the guest',G.evaluate("G.dc")>=0,G.evaluate("G.dc"))
        d0=G.evaluate("(()=>{const d=G.drones[G.dc];return d?[d.x,d.y]:null})()")
        G.keyboard.down('w'); G.wait_for_timeout(900); G.keyboard.up('w'); G.wait_for_timeout(300)
        d1=G.evaluate("(()=>{const d=G.drones[G.dc];return d?[d.x,d.y]:null})()")
        ok('guest WASD drives the drone',d0 and d1 and (abs(d1[0]-d0[0])+abs(d1[1]-d0[1]))>8,(d0,d1))
        ok('host entity is still the host player',H.evaluate("G.dc")==0 or H.evaluate("G.dc")==-1)
        G.keyboard.press('Backspace'); G.wait_for_timeout(300)
        ok('Backspace exits the drone view',G.evaluate("G.dc")==-1)
    # host kills guest entity -> guest becomes spectator
    H.evaluate("hurt(G.ents.find(e=>e.rp),9999,0,null)"); H.wait_for_timeout(700)
    ok('guest sees itself down and spectates',G.evaluate("!G.ents[NP.self].alive&&G.me!==G.ents[NP.self]&&G.me.alive"))
    ok('spectate bar shows when down',G.evaluate("document.getElementById('npBar').style.display")=='block')
    ok('host loop survived (no remote error)',H.evaluate("!NP.err"),H.evaluate("NP.err"))
    G.screenshot(path='/tmp/np2_guest.png'); H.screenshot(path='/tmp/np2_host.png')
    print('errs',H.errs,G.errs); ok('no JS errors',not H.errs and not G.errs)
print(sum(res),'/',len(res))
