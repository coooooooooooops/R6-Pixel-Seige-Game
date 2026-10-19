from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':806},device_scale_factor=2)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1200)
    pg.evaluate("window._c0=ECO.cr;window._st=ECO.stats.earned||0")
    pg.evaluate("__t.resetMS();__t.start('bomb','A',0)"); pg.evaluate("for(let i=0;i<10;i++)__t.update()")
    pg.evaluate("""(()=>{const G=__t.G,en=G.ents.filter(e=>e.side!==G.side);for(let i=0;i<3;i++)hurt(en[i],999,0,G.me);__t.msAcc('A');score=[3,1];G.res={w:'A',why:'T'};G.phase='end'})()""")
    pg.wait_for_timeout(1500)
    print('wallet delta',pg.evaluate("ECO.cr-window._c0"),'earned stat delta',pg.evaluate("(ECO.stats.earned||0)-window._st"),'over visible',pg.evaluate("getComputedStyle(document.getElementById('over')).display"))
    pg.screenshot(path='/home/claude/shots/credits_over.png')
    # HUD weapon stripe
    pg.evaluate("document.getElementById('over').style.display='none'")
    pg.evaluate("for(const t of ['wp']){const c=ECO.CAT.find(x=>x.t===t&&x.s==='camo'&&x.r==='r');ECO.grant(c.id);ECO.equip(c.id)}")
    pg.evaluate("__t.resetMS();__t.start('bomb','A',0)"); pg.evaluate("for(let i=0;i<10;i++)__t.update()"); pg.evaluate("update=function(){}"); pg.wait_for_timeout(300)
    r=pg.evaluate("(()=>{const r=cv.getBoundingClientRect();return [r.left,r.top,r.width/VW]})()")
    s=r[2]; pg.screenshot(path='/home/claude/shots/hud_stripe.png',clip={'x':r[0]+s*150,'y':r[1]+s*(288-36),'width':s*330,'height':s*36})
    print('errs',errs); b.close()
