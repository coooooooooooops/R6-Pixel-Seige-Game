from playwright.sync_api import sync_playwright
import base64,sys,json
ids=[int(a) for a in sys.argv[1:]] or list(range(18))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1200)
    for i in ids:
        r=pg.evaluate("""(i)=>{setMap(i,0);buildMap();const x0=(BX0-3)*T,w=(BX1-BX0+7)*T;
          const mk=(oy,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h*T;const g=c.getContext('2d');g.drawImage(mapC,x0,oy*T,w,h*T,0,0,w,h*T);return c.toDataURL('image/png')};
          return {n:MAPN,f0:mk(BY0-3,BY1-BY0+8),f1:mk(OY+BY0-3,BY1-BY0+8)}}""",i)
        for k in('f0','f1'):
            open(f'/home/claude/shots/{i:02d}_{k}.png','wb').write(base64.b64decode(r[k].split(',')[1]))
        print(i,r['n'])
    print('errs',errs[:3]); b.close()
