# shared helpers for two-browser online tests
import os
U='file:///home/claude/ext/r6-pixel-siege-extension/game.html'
res=[]
def ok(n,c,extra=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(extra) if extra!='' else ''))
def mk(b,name):
    c=b.new_context(viewport={'width':1111,'height':806}); c.add_init_script("localStorage.setItem('r6s_name','%s')"%name)
    pg=c.new_page(); pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.goto(U); pg.wait_for_timeout(900); pg.click('#tabs [data-tab=net]'); return pg
def host(H):
    H.click('#goHost'); H.wait_for_timeout(2500)
def connect(H,G):
    H.click('#lInvBtn'); H.click('#lNew'); H.wait_for_selector('#pOffer',timeout=15000); offer=H.input_value('#pOffer')
    G.click('#goJoin'); G.click('#jInv summary'); G.fill('#jOffer',offer); G.click('#jMake'); G.wait_for_selector('#jRep:not([hidden])',timeout=15000)
    H.fill('#pReply',G.input_value('#jReply')); H.click('#pAcc'); G.wait_for_selector('#olLob:not([hidden])',timeout=20000)
    H.click('#mClose'); H.wait_for_timeout(300)
def deploy(H,side=''):
    if side: H.evaluate("uiSel.side='%s';uiSel.op=0"%side)
    H.evaluate("document.getElementById('deploy').click()")
    H.wait_for_function("typeof G!=='undefined'&&G&&!G.guest&&G.phase",timeout=20000)
SIDE=os.environ.get('SIDE','')
LAG_JS="""(ms,loss)=>{const n=R6Online.net;if(!n||n.__lagged)return 0;n.__lagged=1;const os=n.send.bind(n),ob=n.broadcast.bind(n);
  const w=f=>function(){const a=[...arguments],o=a[a.length-1];const unrel=o&&typeof o==='object'&&o.reliable===false;if(unrel&&Math.random()<loss)return true;setTimeout(()=>f(...a),ms*(0.8+Math.random()*.4));return true};
  n.send=w(os);n.broadcast=w(ob);return 1}"""
