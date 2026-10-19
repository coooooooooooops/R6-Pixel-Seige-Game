"""Seasons + pass + GitHub content updater + drone skins. Headless Chromium; GitHub is faked with page.route."""
import json, sys
from playwright.sync_api import sync_playwright
R = 'file:///home/claude/ext/r6-pixel-siege-extension/game.html'
RAW = 'https://raw.githubusercontent.com/coooooooooooops/R6-Pixel-Seige-Game/main/content/content.json'
fails = []; n = [0]
def chk(name, ok, extra=''):
    n[0] += 1
    if not ok: fails.append(name); print('FAIL', name, extra)
    else: print('ok  ', name, extra)

PACK = {
 "schema": 1, "rev": "2026-10-20.1", "announce": "Turkey Trot event live",
 "app": {"version": "9.9.9", "url": "https://github.com/coooooooooooops/R6-Pixel-Seige-Game/releases/latest", "notes": "New operators"},
 "items": [
  {"n": "Pilgrim Hat", "t": "hd", "r": "r", "s": "bucket", "p": ["#7a5a2a", "#ffd070"], "se": "m11", "tier": 3},
  {"n": "Feast Drone", "t": "dr", "r": "e", "p": ["#8a5a2a", "#2a1408", "#ffb62e"], "se": "m11", "tier": 7},
  {"n": "Gravy Tracer", "t": "tr", "r": "r", "s": "dash", "p": ["#8a5a2a"], "se": "m11", "tier": 9},
  {"n": "Conflict Charm", "t": "np", "r": "r", "p": ["#8a5a2a", "#ffd070"], "se": "m11", "tier": 4},
  {"n": "Shop Extra Skin", "t": "sk", "r": "c", "p": ["#223344", "#112233", "#88aacc"], "from": "2026-10-19"},
  {"n": "Bad Style", "t": "hd", "r": "r", "s": "nope", "p": ["#7a5a2a", "#ffd070"]},
  {"n": "Bad Hex", "t": "hd", "r": "r", "s": "cap", "p": ["red", "#ffd070"]},
  {"n": "<img src=x onerror=alert(1)>", "t": "hd", "r": "r", "s": "cap", "p": ["#7a5a2a", "#ffd070"]},
  {"n": "Mythic Loose", "t": "sk", "r": "m", "p": ["#223344", "#112233", "#88aacc"]},
  {"n": "Dup Of Builtin", "t": "sk", "r": "c", "p": ["#223344", "#112233", "#88aacc"], "id": "sk_midnight_ops"},
 ],
 "seasons": [{"ym": "2026-11", "name": "Turkey Trot", "tag": "Gobble gobble", "col": ["#ff9a3a", "#2a1408", "#ffe0a0"]}]
}
state = {'pack': PACK, 'fail': False}
def handler(route):
    if state['fail']: return route.abort()
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(state['pack']))

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1111, 'height': 806}); pg = ctx.new_page()
    errs = []; dialogs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: (dialogs.append(d.message), d.dismiss()))
    # ---------------- 1. fresh load, GitHub unreachable ----------------
    pg.add_init_script("window.chrome={runtime:{getManifest:()=>({version:'0.16.0'})}}")
    pg.route('https://raw.githubusercontent.com/**', lambda r: r.abort())
    pg.goto(R); pg.wait_for_timeout(1500)
    pg.evaluate("R6S.setNow(Date.parse('2026-10-19T03:00:00Z'))")
    chk('loads with GitHub unreachable', pg.evaluate("R6U.state.ok") is False and not [e for e in errs])
    chk('Oct season = HALLOWEEN, 24 items', pg.evaluate("(()=>{const s=R6S.seasonAt();return s.name==='HALLOWEEN'&&s.items.length===24&&s.tiers.length===30})()"))
    chk('tier 30 is the mythic skin', pg.evaluate("(()=>{const s=R6S.seasonAt(),r=s.tiers[29];return r.k==='it'&&ECO.BYID[r.id].r==='m'&&ECO.BYID[r.id].t==='sk'})()"))
    chk('every season item appears exactly once in its track, no dupes', pg.evaluate("""(()=>{let ok=true;for(let m=1;m<=12;m++){const s=R6S.seasonKey('2026-'+String(m).padStart(2,'0'));const ids=s.tiers.filter(t=>t.k==='it').map(t=>t.id);if(new Set(ids).size!==ids.length||ids.length!==s.items.length)ok=false}return ok})()"""))
    # ---------------- 2. calendar edges in the browser ----------------
    r = pg.evaluate("""(()=>{const f=t=>{R6S.setNow(t);return R6S.seasonAt().name};
      return [f(Date.parse('2026-10-31T12:59:59Z')),f(Date.parse('2026-10-31T13:00:00Z')),f(Date.parse('2026-09-30T13:59:59Z')),f(Date.parse('2026-09-30T14:00:00Z')),f(Date.parse('2026-12-31T12:59:59Z')),f(Date.parse('2026-12-31T13:00:00Z'))]})()""")
    chk('Oct 31 11:59:59pm = HALLOWEEN, 12:00:00am = AUTUMN EMBER', r[0] == 'HALLOWEEN' and r[1] == 'AUTUMN EMBER', str(r[:2]))
    chk('Sep 30 11:59:59pm(AEST) -> Oct 1 12:00am', r[2] == 'HARVEST MOON' and r[3] == 'HALLOWEEN', str(r[2:4]))
    chk('Dec 31 -> Jan 1 rolls year', r[4] == 'WINTER WARFARE' and r[5] == 'NEON NEW YEAR', str(r[4:]))
    pg.evaluate("R6S.setNow(Date.parse('2026-10-19T03:00:00Z'))")
    # ---------------- 3. pass progression ----------------
    pg.evaluate("localStorage.removeItem('r6s_pass')")
    r = pg.evaluate("""(()=>{const cr0=ECO.cr,a=R6PASS.addXP(999);const t0=R6PASS.state.xp;const b=R6PASS.addXP(1);return {a:a.rewards.length,b:b.rewards.map(x=>x.text),t:b.to,cr:ECO.cr-cr0}})()""")
    chk('999 XP = no tier, +1 XP = tier 1 (150 CR)', r['a'] == 0 and r['b'] == ['+150 CREDITS'] and r['t'] == 1 and r['cr'] == 150, str(r))
    r = pg.evaluate("""(()=>{const again=R6PASS.sync().length;const s=R6PASS.season;const big=R6PASS.addXP(40000);
      const owned=s.items.filter(c=>ECO.has(c.id)).length;return {again,tier:big.to,owned,total:s.items.length,got:Object.keys(R6PASS.state.got).length,packs:ECO.packs.supply+ECO.packs.elite}})()""")
    chk('no double grant, full pass unlocks all 24 items', r['again'] == 0 and r['tier'] == 30 and r['owned'] == r['total'] == 24 and r['got'] == 30, str(r))
    r = pg.evaluate("""(()=>{const x=R6PASS.addXP(5000).rewards.length;return {x,xp:R6PASS.state.xp}})()""")
    chk('XP capped at 30 tiers', r['x'] == 0 and r['xp'] == 30000, str(r))
    # rollover to November at the exact second
    r = pg.evaluate("""(()=>{R6S.setNow(Date.parse('2026-10-31T12:59:59Z'));const k1=R6PASS.state.key;R6S.setNow(Date.parse('2026-10-31T13:00:00Z'));const st=R6PASS.state;
      const octOwned=R6S.seasonKey('2026-10').items.every(c=>ECO.has(c.id));return {k1,k2:st.key,xp:st.xp,got:Object.keys(st.got).length,octOwned,hist:st.hist['2026-10']}})()""")
    chk('rollover resets pass, Oct items stay owned, history kept', r['k1'] == '2026-10' and r['k2'] == '2026-11' and r['xp'] == 0 and r['got'] == 0 and r['octOwned'] and r['hist']['tier'] == 30, str(r))
    pg.evaluate("R6S.setNow(Date.parse('2026-10-19T03:00:00Z'))")
    # live rollover with the menu open: toast + theme
    pg.evaluate("localStorage.removeItem('r6s_pass');R6S.setNow(Date.parse('2026-10-31T12:59:58Z'))"); pg.wait_for_timeout(1200)
    pg.evaluate("R6S.setNow(Date.parse('2026-10-31T13:00:01Z'))"); pg.wait_for_timeout(1500)
    r = pg.evaluate("({key:R6PASS.state.key,toast:(document.getElementById('seToast')||{}).textContent||'',col:getComputedStyle(document.documentElement).getPropertyValue('--se').trim()})")
    chk('live rollover at midnight: key, toast, theme colour', r['key'] == '2026-11' and 'AUTUMN EMBER' in r['toast'] and r['col'] == '#ff6a1a', str(r))
    pg.evaluate("R6S.setNow(Date.parse('2026-10-19T03:00:00Z'))"); pg.wait_for_timeout(1200)
    # ---------------- 4. seasonal items never leak into shop / packs ----------------
    r = pg.evaluate("""(()=>{let leak=0;const t0=Date.parse('2026-10-19T03:00:00Z');for(let i=0;i<60;i++)for(const id of ECO.todaysShop(t0+i*864e5))if(ECO.BYID[id].se)leak++;
      const sid=R6S.seasonAt().items[0].id;const buy=ECO.buy(sid);return {leak,buy:buy.why}})()""")
    chk('60 days of daily shops contain no season items; season item not buyable', r['leak'] == 0 and r['buy'] in ('NOT FOR SALE',), str(r))
    r = pg.evaluate("""(()=>{ECO.givePack('supply',150);ECO.givePack('elite',150);let leak=0,n=0;for(let i=0;i<150;i++)for(const t of['supply','elite']){const res=ECO.openPack(t);for(const o of res){n++;if(o.item.se)leak++}}return {leak,n}})()""")
    chk('300 packs (900 items) contain no season items', r['leak'] == 0 and r['n'] == 900, str(r))
    # ---------------- 5. every item renders (non-empty preview) ----------------
    r = pg.evaluate("""(()=>{const bad=[];const cv=document.createElement('canvas');cv.width=cv.height=48;for(const it of ECO.CAT){const g=cv.getContext('2d');g.clearRect(0,0,48,48);for(const t of[0,3]){ECO.drawPreview(cv,it,t)}const d=g.getImageData(0,0,48,48).data;let k=0;for(let i=3;i<d.length;i+=4)if(d[i]>20)k++;if(k<12)bad.push(it.id)}return {bad:bad.slice(0,10),n:ECO.CAT.length}})()""")
    chk('all %d catalog items draw a non-empty preview' % r['n'], not r['bad'], str(r['bad']))
    # ---------------- 6. GitHub content pack, live ----------------
    pg.unroute('https://raw.githubusercontent.com/**'); pg.route('https://raw.githubusercontent.com/**', handler)
    nov0 = pg.evaluate("JSON.stringify(R6S.seasonKey('2026-11').tiers)")
    before = pg.evaluate("ECO.CAT.length")
    pg.evaluate("R6U.check()"); pg.wait_for_timeout(1500)
    r = pg.evaluate("""(()=>{const g=id=>!!ECO.BYID[id];return {n:ECO.CAT.length,pilgrim:g('hd_pilgrim_hat'),drone:g('dr_feast_drone'),shop:g('sk_shop_extra_skin'),
      badStyle:g('hd_bad_style'),badHex:g('hd_bad_hex'),xss:ECO.CAT.some(c=>/img|script|onerror/i.test(c.n)),myth:g('sk_mythic_loose'),dup:ECO.CAT.filter(c=>c.id==='sk_midnight_ops').length,
      ok:R6U.state.ok,rev:R6S.content().rev}})()""")
    chk('valid pack items added live (4 season + 1 shop)', r['n'] - before == 5 and r['pilgrim'] and r['drone'] and r['shop'], str(r))
    chk('invalid items rejected (style, hex, XSS name, loose mythic, id clash)', not r['badStyle'] and not r['badHex'] and not r['xss'] and not r['myth'] and r['dup'] == 1, str(r))
    chk('status shows synced + rev', r['ok'] and r['rev'] == '2026-10-20.1')
    r = pg.evaluate("""(()=>{const s=R6S.seasonKey('2026-11');const t=s.tiers;return {name:s.name,col:s.col[0],t3:t[2].id,t7:t[6].id,t9:t[8].id,items:s.items.length,tag:s.tag,notes:t.notes}})()""")
    chk('Nov renamed by pack; 3 new items land on the free tiers the pack asked for', r['name'] == 'TURKEY TROT' and r['t3'] == 'hd_pilgrim_hat' and r['t7'] == 'dr_feast_drone' and r['t9'] == 'tr_gravy_tracer' and r['items'] == 20, str(r))
    r2 = pg.evaluate("""(()=>{const a=JSON.parse(%s),b=R6S.seasonKey('2026-11').tiers;const builtin=new Set(R6S.GRP.m11.map(c=>c.id));let moved=0,kept=0;for(let i=0;i<30;i++){if(a[i].k==='it'&&builtin.has(a[i].id)){if(b[i].k==='it'&&b[i].id===a[i].id)kept++;else moved++}}
      const ci=b.findIndex(x=>x.id==='np_conflict_charm');return {moved,kept,conflictAt:ci+1,note:b.notes.join('|')}})()""" % json.dumps(nov0))
    chk('NO built-in reward moved; conflicting request fell to next free tier with a note', r2['moved'] == 0 and r2['kept'] == 16 and r2['conflictAt'] == 11 and 'already holds' in r2['note'], str(r2))
    r = pg.evaluate("""(()=>{const t=Date.parse('2026-10-19T03:00:00Z');const today=ECO.todaysShop(t).includes('sk_shop_extra_skin');return {today,nextWeek:[...Array(10)].some((_,i)=>ECO.todaysShop(t+(i+1)*864e5).includes('sk_shop_extra_skin'))}})()""")
    r2 = pg.evaluate("""(()=>{const it=ECO.BYID['sk_shop_extra_skin'];it.from='2027-06-01';const t=Date.parse('2026-10-19T03:00:00Z');let early=0;for(let i=0;i<200;i++)if(ECO.todaysShop(t+i*864e5).includes(it.id))early++;
      it.from='2026-10-19';return early})()""")
    chk('shop item with a future from-date never appears before it (200 days)', r2 == 0, str(r2))
    chk('toast announces new content', 'Turkey Trot'.upper() in pg.evaluate("(document.getElementById('seToast')||{}).textContent||''").upper())
    chk('update banner shown for v9.9.9, link is a github.com URL', pg.evaluate("(()=>{const b=document.getElementById('upBar');return !!b&&/9\\.9\\.9/.test(b.textContent)&&b.querySelector('a').href.startsWith('https://github.com/')})()"))
    chk('no alert()/script execution from pack names', not dialogs)
    # cached, then offline reload
    pg.unroute('https://raw.githubusercontent.com/**'); pg.route('https://raw.githubusercontent.com/**', lambda r: r.abort())
    pg.reload(); pg.wait_for_timeout(1800)
    r = pg.evaluate("({drone:!!ECO.BYID['dr_feast_drone'],n:R6S.seasonKey('2026-11').name,ok:R6U.state.ok,ban:!!document.getElementById('upBar')})")
    chk('offline restart keeps downloaded content + update notice', r['drone'] and r['n'] == 'TURKEY TROT' and r['ok'] is False and r['ban'], str(r))
    # garbage / HTML 404-ish response must not break anything
    state['pack'] = {"schema": 2}; pg.unroute('https://raw.githubusercontent.com/**'); pg.route('https://raw.githubusercontent.com/**', handler)
    pg.evaluate("R6U.check()"); pg.wait_for_timeout(800)
    chk('wrong schema rejected, saved content untouched', pg.evaluate("!!ECO.BYID['dr_feast_drone']&&R6U.state.ok===false"))
    # ---------------- 7. drone skin in game ----------------
    pg.evaluate("R6S.setNow(Date.parse('2026-10-19T03:00:00Z'))")
    pg.evaluate("localStorage.removeItem('r6s_pass')")
    r = pg.evaluate("""(()=>{const id=R6S.seasonAt().items.find(c=>c.t==='dr'&&c.r==='l').id;ECO.grant(id);ECO.equip(id);__t.start('bomb','A',0);for(let i=0;i<120;i++)__t.update();__t.render();
      let ok=true;try{for(const d of __t.G.drones||[]){}}catch(e){ok=false};return {id,drones:(__t.G.drones||[]).length,eq:ECO.isEq(id)}})()""")
    chk('drone skin equipped, match runs with drones', r['eq'] and r['drones'] >= 2, str(r))
    pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/shots/drone_ingame.png')
    # hit-flash + flying drone through skin path
    r = pg.evaluate("""(()=>{try{const G=__t.G;if(G.drones[0])G.drones[0].hit=5;for(let i=0;i<20;i++){__t.update();__t.render()}return 'ok'}catch(e){return e.message}})()""")
    chk('drone skin render path survives hit flash', r == 'ok', r)
    # ---------------- 8. match XP wrapper ----------------
    pg.evaluate("document.getElementById('menu').style.display='';localStorage.removeItem('r6s_pass')")
    r = pg.evaluate("""(()=>{const x0=R6PASS.state.xp;const info=ECO.matchEnd({won:true,rows:[{you:1,op:'Striker',sc:900,kl:6},{op:'Bot',sc:300,kl:2}],my:3,their:1});return {gain:R6PASS.state.xp-x0,expect:Math.round(info.credits*1.5)+200,tier:info.pass.to}})()""")
    chk('match end feeds season XP (credits*1.5+200)', r['gain'] == r['expect'] and r['gain'] > 0, str(r))
    # ---------------- 9. locker + season tab render ----------------
    pg.click('#tabs [data-tab=lock]'); pg.wait_for_timeout(300)
    chk('locker has DRONE category chip', 'DRONE' in pg.evaluate("document.getElementById('lkCats').textContent"))
    pg.click('#lkCats [data-c=dr]'); pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/shots/locker_dr.png')
    pg.click('#tabs [data-tab=season]'); pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/shots/season2.png')
    chk('no page errors during the whole run', not errs, str(errs[:3]))
    b.close()
print('\n%d checks, %d failed' % (n[0], len(fails))); print(fails); sys.exit(1 if fails else 0)
