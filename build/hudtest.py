from playwright.sync_api import sync_playwright
import sys, json, itertools
JS_CHECK="""()=>{const R=TB.slice();TB.length=0;const bad=[];
for(let i=0;i<R.length;i++){const a=R[i];if(a.x0<0||a.x1>VW||a.y0<0||a.y1+1>VH)bad.push(['OUT',a.s,Math.round(a.x0),Math.round(a.x1),a.y0]);
 for(let j=i+1;j<R.length;j++){const b=R[j];if(a.x0<b.x1-.5&&b.x0<a.x1-.5&&a.y0<b.y1-1&&b.y0<a.y1-1)bad.push(['OVL',a.s,b.s,Math.round(a.x0),Math.round(a.y0)])}}
return {n:R.length,bad}}"""
def main():
  with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1111,'height':806})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1500)
    total=0; fails={}
    nops=pg.evaluate("[OPS.A.length,OPS.D.length]")
    def check(tag):
        nonlocal total
        pg.evaluate("TB.length=0;TBON=true;render();TBON=false"); r=pg.evaluate(JS_CHECK); total+=1
        if r['bad']: fails.setdefault(tag,[]).extend(r['bad'][:3])
    for mode in ['bomb','secure','hostage']:
      for side in ['A','D']:
        names=pg.evaluate(f"OPS.{side}.map(o=>o.n)")
        pick=sorted(range(len(names)),key=lambda i:-len(names[i]))[:4]+[0,5]
        for oi in pick:
            pg.evaluate(f"__t.start('{mode}','{side}',{oi})")
            tag=f'{mode}/{side}/op{oi}'
            check(tag+'/prep0')
            # feed + long message + prog + stamina in prep
            pg.evaluate("G.msg='PREP: REINFORCE WALLS (9) AND BARRICADE DOORS';G.feed.push({s:'THUNDERBIRD > MONTAGNE (SUPER SHORTY)',c:'#fff'},{s:'A > B',c:'#fff'});G.me.stam=.5;G.cams&&0")
            check(tag+'/prep+msg')
            for i in range(60): pg.evaluate("__t.update()")
            pg.evaluate("G.phase='act';G.t=3600;G.msg='ROUND STARTED - ATTACKERS ARE BREACHING THE NORTH WALL OF THE BUILDING NOW';G.prog={t:'REINFORCING WALL',v:.4,c:'#ffe14a'};G.me.stam=.4;G.bomb&&(G.bomb.prog=.5);G.sec=200;G.hostage&&(G.hostage.carrier=1)")
            check(tag+'/act+long')
            pg.evaluate("G.prog=null;G.me.g2n=3")
            check(tag+'/act')
            if oi in (0,5):
                pg.evaluate("G.me.alive=false;G.me.hp=0");check(tag+'/dead')
                pg.evaluate("G.me.alive=true;G.me.hp=100;G.bm=1;G.bmf=0");check(tag+'/bigmap0')
                pg.evaluate("G.bmf=1");check(tag+'/bigmap1')
                pg.evaluate("G.bm=0")
                if side=='D': pg.evaluate("G.cv=0");check(tag+'/cam'); pg.evaluate("G.cv=-1")
    print('frames',total,'errs',errs[:3])
    # distinct failures
    seen={}
    for t,v in fails.items():
        for x in v:
            key=(x[0],x[1],x[2] if x[0]=='OVL' else '')
            seen.setdefault(key,[]).append(t)
    print('FAILING FRAMES',len(fails))
    for k,v in list(seen.items())[:25]: print(k,len(v),v[0])
    b.close()
main()
