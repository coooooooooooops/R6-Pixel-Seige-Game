from playwright.sync_api import sync_playwright
import sys, json
VPS=[(1111,806),(1280,720),(1024,600),(1920,1080),(800,600)]
JS="""(sel)=>{const root=document.querySelector(sel);if(!root)return {missing:1};
const vw=innerWidth,vh=innerHeight,bad=[];
const vis=e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
const nm=e=>e.tagName+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:'');
for(const e of root.querySelectorAll('*')){if(!vis(e)||e.id==='bgScene')continue;const r=e.getBoundingClientRect();
 // clip check against every ancestor that clips
 let why=null;
 if(r.right>vw+1||r.left<-1)why='viewport-x';
 for(let p=e.parentElement;p&&!why;p=p.parentElement){const s=getComputedStyle(p);const pr=p.getBoundingClientRect();
   if(s.overflowX!=='visible'&&(r.right>pr.right+1||r.left<pr.left-1)){why='clipped-x by '+nm(p);break}
   if(s.overflowY!=='visible'){const scr=/(auto|scroll)/.test(s.overflowY);if(!scr&&(r.bottom>pr.bottom+1||r.top<pr.top-1)){why='clipped-y by '+nm(p);break}if(scr)break}}
 if(!why){let inScroll=false;for(let p=e.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(/(auto|scroll)/.test(s.overflowY)){inScroll=true;break}}if(!inScroll&&(r.bottom>vh+1||r.top<-1))why='viewport-y'}
 // text spilling out of its own box
 if(!why&&e.children.length===0&&e.textContent.trim()&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='visible'&&e.clientWidth>0)why='text-spill '+e.scrollWidth+'>'+e.clientWidth;
 if(why)bad.push([nm(e),why,Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)])}
const sc=[];for(const e of root.querySelectorAll('*')){const s=getComputedStyle(e);if(vis(e)&&/(auto|scroll)/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+1)sc.push((e.id||e.className)+':'+e.scrollHeight+'/'+e.clientHeight)}
return {vw,vh,bad:bad.slice(0,5),nbad:bad.length,scrolls:sc.slice(0,4)}}"""
def run(shots=False):
  with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h) in VPS:
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('file:///home/claude/ext/r6-pixel-siege-extension/game.html'); pg.wait_for_timeout(1200)
        out={}
        for t in ['season','lock','shop']:
            pg.click(f'#tabs [data-tab={t}]'); pg.wait_for_timeout(350)
            if t=='ops':
                for s in ['A','D']:
                    pg.click(f'[data-ot={s}]'); pg.wait_for_timeout(200)
                    out['ops'+s]=pg.evaluate(JS,'#scrMain')
                    if shots: pg.screenshot(path=f'/home/claude/shots/a_{w}_ops{s}.png')
                continue
            out[t]=pg.evaluate(JS,'#scrMain')
            if shots: pg.screenshot(path=f'/home/claude/shots/a_{w}_{t}.png')
        pg.click('#tabs [data-tab=play]'); pg.click('#toOps'); pg.wait_for_timeout(700)
        out['opsel']=pg.evaluate(JS,'#scrOps')
        if shots: pg.screenshot(path=f'/home/claude/shots/a_{w}_opsel.png')
        pg.click('#deploy'); pg.wait_for_timeout(500)
        out['load']=pg.evaluate(JS,'#load')
        if shots: pg.screenshot(path=f'/home/claude/shots/a_{w}_load.png')
        pg.wait_for_timeout(4500)
        # in match: open pause, then end screen
        pg.evaluate("setPause(true)"); pg.wait_for_timeout(400)
        out['pause']=pg.evaluate(JS,'#pause')
        if shots: pg.screenshot(path=f'/home/claude/shots/a_{w}_pause.png')
        pg.evaluate("setPause(false)")
        pg.evaluate("document.getElementById('ot').textContent='ROUND LOST';document.getElementById('os').textContent='ATK 1 - 2 DEF   BEST OF 5';document.getElementById('over').style.display='flex'");pg.wait_for_timeout(400)
        out['over']=pg.evaluate(JS,'#over')
        if shots: pg.screenshot(path=f'/home/claude/shots/a_{w}_over.png')
        print(f'== {w}x{h} errs={errs[:2]}')
        for k,v in out.items():
            flag='OK ' if not v.get('nbad') else 'BAD'
            print(' ',flag,k,json.dumps(v) if v.get('nbad') or v.get('scrolls') else '')
        pg.close()
    b.close()
run(shots=len(sys.argv)>1)
