from playwright.sync_api import sync_playwright
import json
OV="""(()=>{const o=document.querySelector('#over .res');if(!o)return 'none';const bad=[];const vw=innerWidth,vh=innerHeight;for(const e of o.querySelectorAll('*')){const r=e.getBoundingClientRect();if(r.width&&(r.right>vw+1||r.bottom>vh+1||r.left<-1||r.top<-1))bad.push(e.tagName+'#'+e.id)}const r=o.getBoundingClientRect();return {bad,top:Math.round(r.top),bottom:Math.round(r.bottom),vh}})()"""
def run(w,h,shot=False):
  with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':h})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1200)
    def match(kills,won,my,their,botkills=0):
        pg.evaluate("__t.resetMS();__t.start('bomb','A',0)"); pg.evaluate("for(let i=0;i<10;i++)__t.update()")
        pg.evaluate(f"""(()=>{{const G=__t.G,en=G.ents.filter(e=>e.side!==G.side),mine=G.ents.filter(e=>e.side===G.side&&e!==G.me);G.paid=0;
          for(let i=0;i<{kills};i++)hurt(en[i],999,0,G.me);for(let i={kills};i<{kills}+{botkills};i++)hurt(en[i],999,0,mine[0]);__t.msAcc('{'A' if won else 'D'}');
          score=[{my},{their}];G.res={{w:'{'A' if won else 'D'}',why:'T'}};G.phase='end'}})()""")
        c0=pg.evaluate("ECO.cr"); pg.evaluate("showOver()"); pg.wait_for_timeout(300)
        d=pg.evaluate("ECO.cr")-c0; txt=pg.evaluate("document.querySelector('#ovRw .cr')?document.querySelector('#ovRw .cr').innerText:null")
        pg.evaluate("showOver()"); d2=pg.evaluate("ECO.cr")-c0-d
        return d,d2,txt
    print(f'--- {w}x{h}')
    r=match(3,True,3,1); print('MVP win  paid',r[0],'(expect 3*25+3*40+250+200=645) second showOver paid',r[1]); print('  ',r[2].replace('\n',' | '))
    print('  overlay',pg.evaluate(OV))
    if shot: pg.screenshot(path='/home/claude/shots/credits_over.png')
    r=match(0,False,1,3,4); print('non-MVP loss paid',r[0],'(expect 0*25+1*40+75=115)',r[2].replace('\n',' | '))
    print('  overlay',pg.evaluate(OV)); print('earned stat',pg.evaluate("ECO.stats.earned"),'errs',errs[:2]); b.close()
run(1111,806,True); run(800,600); run(1280,720)
