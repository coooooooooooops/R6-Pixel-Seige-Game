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
const MAN='https://raw.githubusercontent.com/'+REPO+'/'+BRANCH+'/manifest.json',RAW='https://raw.githubusercontent.com/'+REPO+'/'+BRANCH+'/',TREE='https://api.github.com/repos/'+REPO+'/git/trees/'+BRANCH+'?recursive=1';
const SKIP=/^(\.git|\.github|tools|build|content)\/|^(README\.md|HANDOFF\.md|\.gitignore)$|\.zip$/,RV='r6s_remote_ver',FORCE=/[?&]update=1/.test(location.search);
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

function pickApp(a){let v=null;try{v=localStorage.getItem(RV)}catch(e){}
 if(v&&(!a||newer(v,a.version)))return{version:v,url:REL,notes:(a&&a.notes)||''};return a||null}
const hex=u8=>[...u8].map(b=>b.toString(16).padStart(2,'0')).join('');
async function gitSha(buf){const h=new TextEncoder().encode('blob '+buf.byteLength+'\0'),m=new Uint8Array(h.length+buf.byteLength);m.set(h);m.set(new Uint8Array(buf),h.length);return hex(new Uint8Array(await crypto.subtle.digest('SHA-1',m)))}
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('r6s_upd',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function getH(){try{const d=await idb();return await new Promise(res=>{const q=d.transaction('h').objectStore('h').get('dir');q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})}catch(e){return null}}
async function setH(h){try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction('h','readwrite');t.objectStore('h').put(h,'dir');t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
const encPath=p=>p.split('/').map(encodeURIComponent).join('/');
async function writeFile(dir,path,buf){const parts=path.split('/'),name=parts.pop();let d=dir;for(const p of parts)d=await d.getDirectoryHandle(p,{create:true});const w=await (await d.getFileHandle(name,{create:true})).createWritable();await w.write(buf);await w.close()}
/* Downloads every changed file of the repo's main branch and writes it over the extension folder the player picked, then reloads the extension.
   Only files from this repo are written (paths validated, tools/content/.github skipped, manifest.json last). Nothing is executed here. */
async function pull(dir,log){
 let mf;try{mf=JSON.parse(await (await (await dir.getFileHandle('manifest.json')).getFile()).text())}catch(e){throw new Error('NO manifest.json IN THAT FOLDER')}
 if(mf.name!=='R6 Pixel Siege')throw new Error('WRONG FOLDER // PICK THE R6 PIXEL SIEGE EXTENSION FOLDER');
 log('READING FILE LIST...');
 const tr=await (await fetch(TREE,{cache:'no-store'})).json();if(!tr.tree)throw new Error(tr.message||'COULD NOT READ FILE LIST');
 const files=tr.tree.filter(e=>e.type==='blob'&&!SKIP.test(e.path)&&!/(^|\/)\.\.?(\/|$)/.test(e.path)&&!e.path.startsWith('/')&&e.size<8e6);
 const base=(window.chrome&&chrome.runtime&&chrome.runtime.getURL)?chrome.runtime.getURL(''):'';
 const todo=[];let n=0;
 for(const f of files){n++;if(n%20===0)log('COMPARING FILES '+n+'/'+files.length);let same=false;try{same=(await gitSha(await (await fetch(base+encPath(f.path),{cache:'no-store'})).arrayBuffer()))===f.sha}catch(e){}if(!same)todo.push(f)}
 todo.sort((a,b)=>(a.path==='manifest.json')-(b.path==='manifest.json'));
 const got=[];let bytes=0;
 for(let i=0;i<todo.length;i++){log('DOWNLOADING '+(i+1)+'/'+todo.length);const r=await fetch(RAW+encPath(todo[i].path)+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('DOWNLOAD FAILED: '+todo[i].path);const b=await r.arrayBuffer();bytes+=b.byteLength;if(bytes>60e6)throw new Error('UPDATE TOO LARGE');got.push([todo[i].path,b])}
 for(let i=0;i<got.length;i++){log('INSTALLING '+(i+1)+'/'+got.length);await writeFile(dir,got[i][0],got[i][1])}
 log(got.length?'UPDATED '+got.length+' FILES // RELOADING...':'ALREADY UP TO DATE // RELOADING...');
 setTimeout(()=>{try{chrome.runtime.reload()}catch(e){location.reload()}},900);
}
async function updateNow(log){
 if(window.top!==window){parent.postMessage({r6:'update'},'*');return}
 if(!window.showDirectoryPicker)throw new Error('THIS BROWSER CANNOT WRITE FILES // USE DOWNLOAD');
 let dir=await getH();
 if(dir){let p='denied';try{p=await dir.queryPermission({mode:'readwrite'});if(p!=='granted')p=await dir.requestPermission({mode:'readwrite'})}catch(e){}if(p!=='granted')dir=null}
 if(!dir){log('PICK THE R6 PIXEL SIEGE EXTENSION FOLDER');dir=await window.showDirectoryPicker({mode:'readwrite',id:'r6s'});await setH(dir)}
 await pull(dir,log);
}
function banner(a){let b=document.getElementById('upBar');if(b)b.remove();if(!a||st.ver==='0.0.0'||!newer(a.version,st.ver))return;
 if(!FORCE)try{if(localStorage.getItem(SEENUP)===a.version+'x')return}catch(e){}
 b=document.createElement('div');b.id='upBar';
 const s=document.createElement('style');if(!document.getElementById('upCss')){s.id='upCss';s.textContent='#upBar{position:fixed;left:60px;bottom:72px;z-index:99990;display:flex;align-items:center;gap:12px;max-width:min(560px,calc(100% - 24px));box-sizing:border-box;padding:8px 12px;background:rgba(8,8,10,.96);border:1px solid #ffd24a;border-left:4px solid #ffd24a;font:700 13px Rajdhani,sans-serif;letter-spacing:2px;color:#fff}#upBar a{color:#ffd24a;text-decoration:underline;white-space:nowrap}#upBar small{display:block;font:500 11px Rajdhani,sans-serif;color:#8fa3bf;letter-spacing:1px;margin-top:2px}#upBar button{cursor:pointer;background:none;border:0;color:#8fa3bf;font:700 16px Rajdhani,sans-serif}';document.head.appendChild(s)}
 const t=document.createElement('div');const h=document.createElement('div');h.textContent='UPDATE AVAILABLE // v'+a.version+' (YOU HAVE v'+st.ver+')';t.appendChild(h);
 if(a.notes){const n=document.createElement('small');n.textContent=a.notes;t.appendChild(n)}
 const u=document.createElement('button');u.textContent='UPDATE NOW';u.style.cssText='background:#ffd24a;color:#000;padding:5px 10px;font:700 12px Rajdhani,sans-serif;letter-spacing:2px;white-space:nowrap';
 u.onclick=async()=>{u.disabled=true;try{await updateNow(m=>{h.textContent=m})}catch(e){u.disabled=false;if(e&&e.name==='AbortError')h.textContent='UPDATE AVAILABLE // v'+a.version+' (YOU HAVE v'+st.ver+')';else h.textContent=String(e&&e.message||e).toUpperCase()}};
 const l=document.createElement('a');l.href=a.url||REL;l.target='_blank';l.rel='noopener noreferrer';l.textContent='DOWNLOAD';
 const x=document.createElement('button');x.textContent='\u00d7';x.title='Dismiss';x.onclick=()=>{b.remove();try{localStorage.setItem(SEENUP,a.version+'x')}catch(e){}};
 b.append(t,u,l,x);(document.getElementById('menu')||document.body).appendChild(b)}
let busy=false;
async function check(){if(busy)return;busy=true;const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),9000);
 try{const r=await fetch(URL+'?t='+Date.now(),{cache:'no-store',signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);
  const txt=await r.text();if(txt.length>MAXB)throw new Error('content too large');
  try{const m=await fetch(MAN+'?t='+Date.now(),{cache:'no-store',signal:ctl.signal});if(m.ok){const j=await m.json();if(j&&/^\d+\.\d+\.\d+$/.test(j.version||''))localStorage.setItem(RV,j.version)}}catch(e){}
  const pack=JSON.parse(txt),res=S.applyContent(pack);if(!res.ok)throw new Error(res.errors[0]||'invalid content');
  const prev=(()=>{try{return JSON.parse(localStorage.getItem(S.CK)||'null')}catch(e){return null}})();
  const changed=!prev||prev.txt!==txt;
  try{localStorage.setItem(S.CK,JSON.stringify({pack,txt,from:S.RS.from,at:Date.now(),rev:res.rev}))}catch(e){}
  st={at:Date.now(),ok:true,msg:'',last:res,ver:st.ver};
  if(changed){refreshUI();
   try{const seen=localStorage.getItem(SEENREV);if(res.rev&&seen!==res.rev&&window.R6UI){localStorage.setItem(SEENREV,res.rev);
     if(res.announce)R6UI.toast('NEW CONTENT // '+res.announce,res.added?res.added+' NEW ITEMS ADDED':'');
     else if(res.added)R6UI.toast('NEW CONTENT // '+res.added+' NEW ITEMS ADDED','CHECK THE SHOP, LOCKER AND SEASON TABS')}}catch(e){}}
  banner(pickApp(res.app));
 }catch(e){st={at:Date.now(),ok:false,msg:String(e&&e.message||e),last:null,ver:st.ver};const c=S.content();banner(pickApp(c.app))}
 finally{clearTimeout(to);busy=false;try{const p=document.getElementById('tp-season');if(p&&!p.hidden&&window.R6UI)R6UI.render()}catch(e){}}}
window.R6U={URL,REL,check,status,updateNow,pull,get state(){return st}};
appVersion().then(v=>{st.ver=v;const c=S.content();banner(pickApp(c.app));setTimeout(check,1200);setInterval(check,EVERY)});
window.addEventListener('online',()=>setTimeout(check,500));
window.addEventListener('focus',()=>{if(Date.now()-st.at>10*60*1000)check()});
})();
