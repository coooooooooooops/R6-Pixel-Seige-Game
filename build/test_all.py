from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':756})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1000)
    res=pg.evaluate("""()=>{const bad=[];
     function reach(sx,sy){const seen=new Uint8Array(W*H),q=[(sy/T|0)*W+(sx/T|0)];seen[q[0]]=1;
       for(let h=0;h<q.length;h++){const c=q[h],x=c%W,y=(c/W)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const i=ny*W+nx;if(seen[i])continue;const t=map[ny][nx];if(t===2||t===10||t===4||t===7)continue;seen[i]=1;q.push(i)}
         if(STP[c]!==undefined&&!seen[STP[c]]){seen[STP[c]]=1;q.push(STP[c])}}
       return g=>!!seen[(g[1]/T|0)*W+(g[0]/T|0)]}
     let n=0;
     for(let i=0;i<MAPS.length;i++)for(let pi=0;pi<4;pi++)for(let k=0;k<MAPS[i].host.length+2;k++){setMap(i,pi);buildMap();resolveSpawns();n++;
       // every room centre reachable from first spawn
       const r=reach(ATKSP[0].x,ATKSP[0].y);
       for(const s of ATKSP){const rr=reach(s.x,s.y);for(const g of[SITES[0],SITES[1],HOST])if(!rr(g))bad.push(MAPS[i].n+' pair'+pi+' spawn '+s.n+' cannot reach goal')}
       ROOMS.forEach((rm,ri)=>{if(rm[6])return;const cx=((rm[0]+rm[2])>>1),cy=((rm[1]+rm[3])>>1)+(rm[5]?OY:0);const fx=findFloor(cx,cy);if(!r([fx[0]*T+8,fx[1]*T+8]))bad.push(MAPS[i].n+' room unreachable: '+rm[4])})}
     return {n,bad:[...new Set(bad)]}}""")
    print('builds',res['n'],'problems',len(res['bad']))
    for x in res['bad'][:40]: print(' ',x)
    print('errs',errs[:3]); b.close()
