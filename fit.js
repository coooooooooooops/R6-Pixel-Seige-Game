/* R6 Pixel Siege - fit.js
   One layout for every window size. The menus and overlays (#menu, #load, #pause, #over) are laid out for a
   "logical" window of at least BW x BH pixels and scaled (CSS zoom) to fill the real window, so the popup
   (800x580), a small browser tab and a 4K fullscreen all show exactly the same arrangement, just bigger or smaller.
   - zoom is applied to the four overlays only; the game canvas (#c) is untouched.
   - --vw / --vh hold 1% of the LOGICAL window (CSS vh/vw would be the real window, which is wrong inside zoom).
   - every @media rule that tests a pixel size in any stylesheet is re-evaluated against the logical size, so the
     existing compact / narrow rules fire at the right moment. */
(()=>{
const BW=1010,BH=680,MAXZ=2.4,MINZ=.45;
const IDS=['menu','load','pause','over'];
const root=document.documentElement;
const orig=new WeakMap();
let Z=0;
function walk(list,fn){for(const r of list){if(r.type===4)fn(r);if(r.cssRules&&r.cssRules.length)walk(r.cssRules,fn)}}
function retarget(z){
 for(const sh of document.styleSheets){
  let rl;try{rl=sh.cssRules}catch(e){continue}
  walk(rl,r=>{
   let o=orig.get(r);if(o===undefined){o=r.media.mediaText;orig.set(r,o)}
   if(!/\d(px|em)\b/.test(o))return;
   const t=o.replace(/(-?\d*\.?\d+)px/g,(m,n)=>(+n*z).toFixed(2)+'px');
   if(r.media.mediaText!==t)r.media.mediaText=t;
  });
 }
}
function fit(force){
 const W=root.clientWidth||innerWidth,H=root.clientHeight||innerHeight;
 if(!W||!H)return;
 let z=Math.min(W/BW,H/BH);z=Math.max(MINZ,Math.min(MAXZ,z));
 z=Math.round(z*1000)/1000;
 const lw=W/z,lh=H/z;
 root.style.setProperty('--vw',(lw/100)+'px');root.style.setProperty('--vh',(lh/100)+'px');
 root.style.setProperty('--lw',lw+'px');root.style.setProperty('--lh',lh+'px');
 for(const id of IDS){const e=document.getElementById(id);if(e)e.style.zoom=z}
 root.dataset.lw=lw<1100?'s':lw<1400?'m':'l';
 if(force||Math.abs(z-Z)>.002){Z=z;retarget(z)}
 if(window.fitOps)requestAnimationFrame(()=>window.fitOps())
}
window.R6Fit={fit,get zoom(){return Z}};
addEventListener('resize',()=>fit());
document.addEventListener('fullscreenchange',()=>setTimeout(fit,50));
/* stylesheets injected later (shop, season, account...) get retargeted too */
new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.tagName==='STYLE'||n.tagName==='LINK')))fit(true)}).observe(document.head,{childList:true});
fit(true);
/* second pass once everything (fonts, late style tags) has settled */
addEventListener('load',()=>{fit(true);setTimeout(()=>fit(true),400)});
})();
