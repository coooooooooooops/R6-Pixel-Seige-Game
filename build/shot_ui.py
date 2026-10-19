from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':760})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1500)
    pg.screenshot(path='/home/claude/shots/ui_play.png')
    for t in['ops','maps','set','ctl']:
        pg.click(f'#tabs [data-tab={t}]'); pg.wait_for_timeout(500); pg.screenshot(path=f'/home/claude/shots/ui_{t}.png')
    pg.click('#tabs [data-tab=play]'); pg.wait_for_timeout(300)
    pg.click('#toOps'); pg.wait_for_timeout(900); pg.screenshot(path='/home/claude/shots/ui_opsel.png')
    pg.click('#deploy'); pg.wait_for_timeout(700); pg.screenshot(path='/home/claude/shots/ui_load.png')
    print('errs',errs[:3]); b.close()
