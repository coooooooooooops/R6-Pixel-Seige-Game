from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':806})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1200)
    print('items',pg.evaluate("ECO.CAT.length"),'pack-only',pg.evaluate("ECO.CAT.filter(c=>c.pk).length"))
    # reset instant is exactly Sydney midnight, incl. both DST changeovers
    r=pg.evaluate("""(()=>{const out=[];for(const iso of ['2026-10-19T03:00:00Z','2026-10-03T12:00:00Z','2026-04-04T12:00:00Z','2026-01-15T00:00:00Z','2026-07-01T10:00:00Z']){const t=Date.parse(iso),n=ECO.nextReset(t);
      const f=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Sydney',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      out.push([iso,f.format(new Date(n)),f.format(new Date(n-1000)),ECO.dayKey(n-1000),ECO.dayKey(n)])}return out})()""")
    for x in r: print(x)
    # determinism + rotation + variety
    print(pg.evaluate("""(()=>{const t=Date.parse('2026-10-19T03:00:00Z');const a=ECO.todaysShop(t),b=ECO.todaysShop(t+3600e3);
      const days=[];for(let i=0;i<30;i++)days.push(ECO.todaysShop(t+i*864e5).join());
      const nx=ECO.todaysShop(ECO.nextReset(t)+1000);const overlap=a.filter(x=>nx.includes(x)).length;
      const seen=new Set(days.join().split(','));
      return {same:a.join()===b.join(),distinctDays:new Set(days).size,tomorrowOverlap:overlap,uniqueItemsIn30d:seen.size,noPackOnly:a.every(i=>!ECO.BYID[i].pk),rar:a.map(i=>ECO.BYID[i].r).join('')}})()"""))
    # buy flow
    print(pg.evaluate("""(()=>{const id=ECO.todaysShop()[5];const b0=ECO.cr;const r=ECO.buy(id);const r2=ECO.buy(id);const notShop=ECO.buy(ECO.CAT.find(c=>c.pk).id);const leg=ECO.buy(ECO.todaysShop()[0]);
      return {first:r.ok,spent:b0-ECO.cr,again:r2.why,pack:notShop.why,legendary:leg.ok||leg.why,cr:ECO.cr}})()"""))
    for (w,h) in [(1111,806),(1280,720),(1920,1080),(1024,600)]:
        pg.set_viewport_size({'width':w,'height':h}); pg.click('#tabs [data-tab=shop]'); pg.wait_for_timeout(500)
        print(w,h,'menu scroll',pg.evaluate("(()=>{const m=document.getElementById('menu');return [m.scrollHeight,m.clientHeight]})()"))
        pg.screenshot(path=f'/home/claude/shots/shop_{w}.png')
    pg.set_viewport_size({'width':1111,'height':806}); pg.click('#tabs [data-tab=shop]'); pg.wait_for_timeout(300)
    pg.screenshot(path='/home/claude/shots/shop1.png'); print('errs',errs)
    b.close()
