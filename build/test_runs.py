from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/proj/game.html'); pg.wait_for_timeout(1000)
    out=pg.evaluate("""()=>{const r=[];let n=0;
      for(let i=0;i<MAPS.length;i++)for(const mode of['bomb','secure','hostage'])for(const side of['A','D']){
        try{setMap(i,(n++)%4);buildMap();resolveSpawns();__t.start(mode,side,0);for(let k=0;k<1200;k++)__t.update();__t.render();}
        catch(e){r.push(MAPS[i].n+' '+mode+' '+side+': '+e.message)}}
      return r}""")
    print('run errors:',len(out)); [print(' ',x) for x in out[:10]]
    print('page errs',errs[:3]); b.close()
