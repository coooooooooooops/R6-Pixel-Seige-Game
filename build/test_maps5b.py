# Stage 5B tests: every map builds, spawns can reach the objectives on foot, vessels look right
import sys
from playwright.sync_api import sync_playwright
res=[]
def ck(n,c,x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if x!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/work/game.html'); pg.wait_for_timeout(1000)
    pg.evaluate('window.requestAnimationFrame=()=>0')
    out=pg.evaluate("""()=>{const bad=[],info={};
      for(let i=0;i<MAPS.length;i++){const id=MAPS[i].id;
        try{setMap(i,0);buildMap();resolveSpawns();
          const reach=(sx,sy)=>{const seen=new Uint8Array(W*H),q=[[sx,sy]];seen[sy*W+sx]=1;
            while(q.length){const[x,y]=q.pop();if(x>BX0&&x<BX1&&y>BY0&&y<BY1)return true;
              for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a<1||b<1||a>=W-1||b>=OY||seen[b*W+a])continue;const tt=map[b][a];if(blk(tt)&&tt!==3)continue;seen[b*W+a]=1;q.push([a,b])}}return false};
          const r=ATKSP.map(s=>reach(s.tx,s.ty));info[id]=r.join('');if(!r.every(Boolean))bad.push(id+' unreachable '+r.join(','));
          // spawns must stand on walkable ground
          for(const s of ATKSP)if(blk(map[s.ty][s.tx]))bad.push(id+' spawn blocked');
        }catch(e){bad.push(id+': '+e.message)}}
      return {bad,info}}""")
    ck('all 18 maps build, every attacker spawn reaches the objectives on foot',len(out['bad'])==0,out['bad'][:6])
    r=pg.evaluate("""()=>{const o={};for(const id of['yacht','plane']){const i=MAPS.findIndex(m=>m.id===id);setMap(i,0);buildMap();const c=vctx();
      let water=0,deck=0,wing=0,nose=0;for(let y=1;y<OY;y++)for(let x=1;x<W-1;x++){const k=MAPX.cls(c,x,y);if(k==='water')water++;if(k==='deck')deck++;if(k==='wing')wing++;if(k==='nose')nose++}
      o[id]={water,deck,wing,nose}}return o}""")
    ck('yacht has sea and deck, plane has wings and nose',r['yacht']['water']>2000 and r['yacht']['deck']>300 and r['plane']['wing']>300 and r['plane']['nose']>100,r)
    ck('every map has its own ground palette (16 non-vessel palettes distinct)',pg.evaluate("()=>{const s=new Set();for(const k in MAPX.pal)s.add(JSON.stringify(MAPX.pal[k]));return s.size===Object.keys(MAPX.pal).length&&Object.keys(MAPX.pal).length===16}"))
    # rounds still run on both vessels in all modes
    bad=pg.evaluate("""()=>{const bad=[];for(const id of['yacht','plane'])for(const mode of['bomb','hostage','secure'])for(const side of['A','D']){try{const i=MAPS.findIndex(m=>m.id===id);setMap(i,0);buildMap();resolveSpawns();__t.start(mode,side,0);for(let k=0;k<1500;k++){if(k===300)startAct();__t.update()}__t.render()}catch(e){bad.push(id+mode+side+e.message)}}return bad}""")
    ck('rounds on yacht and plane, all modes and sides',len(bad)==0,bad[:3])
    ck('no page errors',len(errs)==0,errs[:3])
    b.close()
print('%d/%d passed'%(sum(res),len(res))); sys.exit(0 if all(res) else 1)
