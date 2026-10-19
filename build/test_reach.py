from playwright.sync_api import sync_playwright
import json,sys
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(800)
    res=pg.evaluate("""()=>{const out=[];
     function reach(sx,sy,goals){ // BFS over walkable (not solid/blk) treating doors/soft walls(3) as passable, stairs link
       const seen=new Uint8Array(W*H),q=[(sy/T|0)*W+(sx/T|0)];seen[q[0]]=1;
       for(let h=0;h<q.length;h++){const c=q[h],x=c%W,y=(c/W)|0;const nb=[[1,0],[-1,0],[0,1],[0,-1]];
         for(const[dx,dy]of nb){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const i=ny*W+nx;if(seen[i])continue;const t=map[ny][nx];if(t===2||t===10||t===4||t===7||t===6&&0)continue;if(t===2)continue;seen[i]=1;q.push(i)}
         if(STP[c]!==undefined&&!seen[STP[c]]){seen[STP[c]]=1;q.push(STP[c])}}
       return goals.map(g=>!!seen[(g[1]/T|0)*W+(g[0]/T|0)])}
     for(let i=0;i<MAPS.length;i++){const t0=performance.now();
       for(let pi=0;pi<4;pi++){setMap(i,pi);buildMap();resolveSpawns();
        const goals=[SITES[0],SITES[1],HOST];const sp=ATKSP.map(s=>reach(s.x,s.y,goals));
        const df=spots('bomb').map(q=>map[q[1]][q[0]]);
        out.push({m:MAPS[i].n,pi,ms:Math.round(performance.now()-t0),spawns:ATKSP.length,reach:sp,defFloor:df.every(v=>v===1),en:EN.length,rap:RAP.length,doors:DOORS.length+'/'+DOORSU.length,stairs:STAIRS.length})}}
     return out}""")
    bad=[r for r in res if not all(all(x) for x in r['reach']) or not r['defFloor'] or r["en"]<0]
    print(len(res),'builds; problems:',len(bad))
    for r in bad: print(r)
    print('sample',res[0],res[40])
    print('errors',errs[:5]); b.close()
