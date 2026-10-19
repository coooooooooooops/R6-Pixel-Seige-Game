/* R6 Pixel Siege - GitHub content updater. Loaded last.
   Pulls content/content.json from the repo's main branch (raw.githubusercontent.com, CORS-enabled, no permissions needed).
   The pack is DATA only (items, season overrides, announcement, latest app version): Chrome MV3 does not allow remotely hosted
   code, so everything is validated by R6S.applyContent and nothing from the network is ever executed.
   Last good pack is cached in localStorage and applied at next start, so content also works offline.
   Code changes (new mechanics, operators with new art) ship as a normal new extension version: the pack's "app" block makes
   players see an UPDATE AVAILABLE notice with a link to the GitHub release. */
(()=>{
const S=window.R6S;if(!S)return;
const REPO='coooooooooooops/R6-Pixel-Seige-Game',BRANCH='main';
const URL='https://raw.githubusercontent.com/'+REPO+'/'+BRANCH+'/content/content.json';
const REL='https://github.com/'+REPO+'/releases/latest';
const EVERY=20*60*1000,MAXB=1500000,SEENREV='r6s_seen_rev',SEENUP='r6s_seen_up';
let st={at:0,ok:null,msg:'CHECKING FOR CONTENT UPDATES...',last:null,ver:'0.0.0'};
const vnum=v=>String(v).split('.').map(n=>+n||0),newer=(a,b)=>{const A=vnum(a),B=vnum(b);for(let i=0;i<3;i++){if((A[i]||0)>(B[i]||0))return true;if((A[i]||0)<(B[i]||0))return false}return false};
async function appVersion(){try{if(window.chrome&&chrome.runtime&&chrome.runtime.getManifest)return chrome.runtime.getManifest().version}catch(e){}
 try{const r=await fetch('manifest.json');return (await r.json()).version}catch(e){return '0.0.0'}}
const clock=t=>new Intl.DateTimeFormat('en-GB',{timeZone:S.TZ,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(t)).toUpperCase();
function status(){const c=S.content();
 if(st.ok===null)return st.msg;
 return (st.ok?'CONTENT SYNCED '+clock(st.at):'OFFLINE // USING SAVED CONTENT')+(c.rev?' // REV '+c.rev:'')+(c.remoteItems?' // '+c.remoteItems+' ONLINE ITEMS':'')}
function refreshUI(){try{if(window.ECO&&ECO.bus)ECO.bus.dispatchEvent(new Event('change'))}catch(e){}try{const p=document.getElementById('tp-season');if(p&&!p.hidden&&window.R6UI)R6UI.render()}catch(e){}}
function banner(a){let b=document.getElementById('upBar');if(b)b.remove();if(!a||st.ver==='0.0.0'||!newer(a.version,st.ver))return;
 try{if(localStorage.getItem(SEENUP)===a.version+'x')return}catch(e){}
 b=document.createElement('div');b.id='upBar';
 const s=document.createElement('style');if(!document.getElementById('upCss')){s.id='upCss';s.textContent='#upBar{position:fixed;left:60px;bottom:12px;z-index:99990;display:flex;align-items:center;gap:12px;max-width:min(560px,calc(100% - 24px));box-sizing:border-box;padding:8px 12px;background:rgba(8,8,10,.96);border:1px solid #ffd24a;border-left:4px solid #ffd24a;font:700 13px Rajdhani,sans-serif;letter-spacing:2px;color:#fff}#upBar a{color:#ffd24a;text-decoration:underline;white-space:nowrap}#upBar small{display:block;font:500 11px Rajdhani,sans-serif;color:#8fa3bf;letter-spacing:1px;margin-top:2px}#upBar button{cursor:pointer;background:none;border:0;color:#8fa3bf;font:700 16px Rajdhani,sans-serif}';document.head.appendChild(s)}
 const t=document.createElement('div');const h=document.createElement('div');h.textContent='UPDATE AVAILABLE // v'+a.version+' (YOU HAVE v'+st.ver+')';t.appendChild(h);
 if(a.notes){const n=document.createElement('small');n.textContent=a.notes;t.appendChild(n)}
 const l=document.createElement('a');l.href=a.url||REL;l.target='_blank';l.rel='noopener noreferrer';l.textContent='DOWNLOAD';
 const x=document.createElement('button');x.textContent='\u00d7';x.title='Dismiss';x.onclick=()=>{b.remove();try{localStorage.setItem(SEENUP,a.version+'x')}catch(e){}};
 b.append(t,l,x);(document.getElementById('menu')||document.body).appendChild(b)}
let busy=false;
async function check(){if(busy)return;busy=true;const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),9000);
 try{const r=await fetch(URL+'?t='+Date.now(),{cache:'no-store',signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);
  const txt=await r.text();if(txt.length>MAXB)throw new Error('content too large');
  const pack=JSON.parse(txt),res=S.applyContent(pack);if(!res.ok)throw new Error(res.errors[0]||'invalid content');
  const prev=(()=>{try{return JSON.parse(localStorage.getItem(S.CK)||'null')}catch(e){return null}})();
  const changed=!prev||prev.txt!==txt;
  try{localStorage.setItem(S.CK,JSON.stringify({pack,txt,from:S.RS.from,at:Date.now(),rev:res.rev}))}catch(e){}
  st={at:Date.now(),ok:true,msg:'',last:res,ver:st.ver};
  if(changed){refreshUI();
   try{const seen=localStorage.getItem(SEENREV);if(res.rev&&seen!==res.rev&&window.R6UI){localStorage.setItem(SEENREV,res.rev);
     if(res.announce)R6UI.toast('NEW CONTENT // '+res.announce,res.added?res.added+' NEW ITEMS ADDED':'');
     else if(res.added)R6UI.toast('NEW CONTENT // '+res.added+' NEW ITEMS ADDED','CHECK THE SHOP, LOCKER AND SEASON TABS')}}catch(e){}}
  banner(res.app);
 }catch(e){st={at:Date.now(),ok:false,msg:String(e&&e.message||e),last:null,ver:st.ver};const c=S.content();if(c.app)banner(c.app)}
 finally{clearTimeout(to);busy=false;try{const p=document.getElementById('tp-season');if(p&&!p.hidden&&window.R6UI)R6UI.render()}catch(e){}}}
window.R6U={URL,REL,check,status,get state(){return st}};
appVersion().then(v=>{st.ver=v;const c=S.content();if(c.app)banner(c.app);setTimeout(check,1200);setInterval(check,EVERY)});
window.addEventListener('online',()=>setTimeout(check,500));
window.addEventListener('focus',()=>{if(Date.now()-st.at>10*60*1000)check()});
})();
