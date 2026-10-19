from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1000)
    pg.click('[data-tab=maps]'); pg.wait_for_timeout(500); pg.screenshot(path='s_maps.png')
    pg.evaluate("uiSel.mapPick='10'"); pg.click('[data-tab=play]'); pg.wait_for_timeout(300)
    pg.click('#toOps'); pg.wait_for_timeout(600); pg.screenshot(path='s_ops.png')
    side=pg.evaluate("uiSel.side"); print('side',side)
    pg.click('#deploy'); pg.wait_for_timeout(500); pg.screenshot(path='s_load.png')
    pg.wait_for_timeout(3500)
    print('in game', pg.evaluate("!!G&&G.phase"))
    pg.evaluate("""()=>{for(let i=0;i<1500;i++)update();render()}""")
    pg.screenshot(path='s_game.png')
    # drive match: force round ends and flow through 5-round match
    for r in range(5):
        st=pg.evaluate("(()=>{const w=score[0]>score[1]?'D':'A';const side=G.side;endRound(r_=>0,'t');return 0})()") if False else None
        pg.evaluate("""()=>{ if(G.phase!=='end'){ // let player's team win
            endRound(G.side,'TEST WIN');} G.endT=0; for(let i=0;i<200;i++)update(); }""")
        pg.wait_for_timeout(200)
        vis=pg.evaluate("document.getElementById('over').style.display")
        txt=pg.evaluate("document.getElementById('ot').textContent+' | '+document.getElementById('os').textContent+' | '+document.getElementById('ob').textContent")
        print('round',r+1,vis,txt)
        if 'MAIN MENU' in txt: break
        pg.click('#ob'); pg.wait_for_timeout(400)
        print(' ops visible',pg.evaluate("getComputedStyle(document.getElementById('scrOps')).display"),'side',pg.evaluate("uiSel.side"),'between',pg.evaluate("uiSel.between"))
        if r==0: pg.screenshot(path='s_ops2.png')
        pg.click('#deploy'); pg.wait_for_timeout(2200)
        print(' in game',pg.evaluate("!!G&&G.phase"),'rnd',pg.evaluate("rnd"),'score',pg.evaluate("score"))
    print('errors',errs[:5]); b.close()
