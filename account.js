/* R6 Pixel Siege - ACCOUNT: Supabase sign-in, cloud save and stats.
   No SDK: plain fetch against Supabase Auth + PostgREST, so nothing is loaded from a CDN (MV3 safe).
   Cloud-saved: settings, key bindings, loadouts + favourite operators (all in R6Data from game.js) and player stats.
   Stats only go up through the add_stats() database function (see supabase_setup.sql).
   Hooks (called from game.js): R6Acct.dirty() after settings/binds/loadouts save, .round(G,winner) and .match(won). */
(()=>{
const C=window.R6_SUPABASE||{},URL=String(C.url||'').replace(/\/+$/,''),KEY=C.key||'';
const $=id=>document.getElementById(id),tabs=$('tabs');if(!tabs)return;
const configured=()=>/^https?:\/\/\S+$/.test(URL)&&!!KEY;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jget=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const jset=(k,v)=>{try{if(v===undefined||v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const SK='r6s_acct',DK='r6s_acct_dirty',PK=u=>'r6s_acct_pend_'+u;
const STAT_KEYS=['kills','deaths','rounds','round_wins','matches','wins','losses','damage'];

let S=jget(SK,null);            // session {access_token,refresh_token,expires_at,user}
let prof={username:null,stats:{}};
let pend={};                    // stat deltas not yet confirmed by the server
let status='idle',statusMsg='';  // idle | saving | ok | offline | error
let applying=false,pushing=false,flushing=false,ver=0,tPush=0,tFlush=0,lastSync=0;

/* ---------- Supabase REST ---------- */
async function api(path,o={}){
  const h={apikey:KEY,'Content-Type':'application/json'};if(o.token)h.Authorization='Bearer '+o.token;Object.assign(h,o.headers||{});
  let r;try{r=await fetch(URL+path,{method:o.method||'GET',headers:h,body:o.body===undefined?undefined:JSON.stringify(o.body),keepalive:!!o.keepalive})}
  catch(e){const x=new Error('NETWORK');x.net=true;throw x}
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok){const x=new Error((j&&(j.msg||j.error_description||j.message||j.error))||('HTTP '+r.status));x.status=r.status;x.code=j&&(j.error_code||j.code);throw x}
  return j}
function nice(e){const m=String(e&&e.message||e),c=e&&e.code;
  if(e&&e.net)return 'CAN\'T REACH THE SERVER. CHECK YOUR CONNECTION.';
  if(/invalid login/i.test(m))return 'WRONG EMAIL OR PASSWORD.';
  if(/not confirmed/i.test(m)||c==='email_not_confirmed')return 'CONFIRM YOUR EMAIL FIRST. CHECK YOUR INBOX.';
  if(/already registered|already been registered/i.test(m)||c==='user_already_exists')return 'THAT EMAIL ALREADY HAS AN ACCOUNT. SIGN IN INSTEAD.';
  if(/password.*(short|least|weak)/i.test(m)||c==='weak_password')return 'PASSWORD IS TOO WEAK. USE 8+ CHARACTERS.';
  if(/rate limit|too many/i.test(m)||c==='over_email_send_rate_limit'||e.status===429)return 'TOO MANY ATTEMPTS. WAIT A MINUTE AND TRY AGAIN.';
  if(/invalid.*email|email.*invalid/i.test(m)||c==='email_address_invalid')return 'THAT EMAIL ADDRESS LOOKS WRONG.';
  return m.toUpperCase()}

/* ---------- session ---------- */
function setSession(j){
  if(!j||!j.access_token)return null;
  S={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),user:j.user||(S&&S.user)};
  jset(SK,S);return S}
let refreshing=null;
function refresh(){if(refreshing)return refreshing;
  refreshing=(async()=>{try{setSession(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:S.refresh_token}}))}
    catch(e){if(!e.net&&(e.status===400||e.status===401||e.status===403)){localOut('SESSION EXPIRED. SIGN IN AGAIN.')}throw e}
    finally{refreshing=null}})();return refreshing}
async function tok(){if(!S)throw new Error('NOT SIGNED IN');if(S.expires_at*1000-Date.now()<60000)await refresh();if(!S)throw new Error('NOT SIGNED IN');return S.access_token}

/* ---------- economy: credits, owned items, equipped cosmetics, packs, season pass ---------- */
const LK='r6s_acct_eco_uid';   // which account this device's wallet was last synced with
const clone=o=>JSON.parse(JSON.stringify(o||{}));
function econGet(){const E=window.ECO,P=window.R6PASS;return{eco:E?clone(E._state()):{},pass:P?clone(P.state):{}}}
const econSnap=()=>JSON.stringify(econGet());
let lastSnap='';
// mode 'exact': this device was already linked to the account, so the cloud copy is the truth.
// mode 'merge': first time this wallet meets this account: keep everything either side owns, never lose an item.
function econApply(cloud,mode){
  const E=window.ECO,P=window.R6PASS;if(!cloud||!E)return;
  const cE=cloud.eco||{},cP=cloud.pass||{};
  if(mode==='exact'){if(hasKeys(cE))E._replace(clone(cE));if(P&&hasKeys(cP))P._replace(clone(cP));return}
  if(hasKeys(cE)){
    const L=clone(E._state()),o=clone(cE);
    for(const id in (L.inv||{}))o.inv=o.inv||{},o.inv[id]=Math.min(+o.inv[id]||Infinity,+L.inv[id]||Infinity);
    for(const id in (o.inv||{}))if(!isFinite(o.inv[id]))o.inv[id]=Date.now();
    o.cr=Math.max(+L.cr||0,+cE.cr||0);
    o.packs={supply:Math.max(L.packs&&L.packs.supply|0,cE.packs&&cE.packs.supply|0),elite:Math.max(L.packs&&L.packs.elite|0,cE.packs&&cE.packs.elite|0)};
    o.eq=Object.assign({},L.eq||{},cE.eq||{});for(const t in o.eq)if(!o.inv[o.eq[t]])delete o.eq[t];
    o.stats=Object.assign({},L.stats||{},cE.stats||{});for(const k of['buys','opened','pity','pityM'])o.stats[k]=Math.max(+(L.stats&&L.stats[k])||0,+(cE.stats&&cE.stats[k])||0);
    E._replace(o)}
  if(P&&hasKeys(cP)){
    const L=clone(P.state),cur=P.season&&P.season.key;let o;
    if(L.key===cP.key||!cur)o=Object.assign(clone(cP),{xp:Math.max(L.xp|0,cP.xp|0),got:Object.assign({},L.got,cP.got)});
    else o=clone(cP.key===cur?cP:L);
    o.hist=Object.assign({},L.hist||{},cP.hist||{});P._replace(o)}}

/* ---------- cloud data (settings, binds, loadouts, favourites) ---------- */
const hasKeys=o=>o&&typeof o==='object'&&Object.keys(o).length>0;
function dirty(){if(applying||!S)return;jset(DK,1);ver++;clearTimeout(tPush);tPush=setTimeout(pushData,2000);if(status!=='saving')setStatus('saving')}
async function pushData(){
  if(!S||pushing)return;if(!window.R6Data)return;pushing=true;const v=ver;setStatus('saving');
  try{
    const t=await tok(),d=R6Data.get(),row={user_id:S.user.id,settings:d.settings,binds:d.binds,loadouts:d.loadouts,economy:econGet(),updated_at:new Date().toISOString()};
    if(prof.username)row.username=prof.username;
    const post=b=>api('/rest/v1/player_data?on_conflict=user_id',{method:'POST',token:t,headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:b});
    try{await post(row)}catch(e){if(e.status===409&&row.username){delete row.username;prof.username=null;await post(row)}else throw e}
    if(ver===v)jset(DK,null);else{clearTimeout(tPush);tPush=setTimeout(pushData,500)}
    lastSync=Date.now();setStatus('ok')
  }catch(e){setStatus(e.net?'offline':'error',nice(e))}finally{pushing=false}}
function applyCloud(row,dirtyNow,linked){
  if(!window.R6Data)return;applying=true;
  try{
    if(!dirtyNow)R6Data.apply({settings:row.settings,binds:row.binds,loadouts:row.loadouts});   // cloud wins unless this device has unsynced edits
    if(row.economy&&hasKeys(row.economy)&&!(linked&&dirtyNow))econApply(row.economy,linked?'exact':'merge');
    try{if(window.R6PASS)R6PASS.sync();if(window.R6UI)R6UI.render()}catch(e){}
  }catch(e){}finally{applying=false}}
async function sync(){
  if(!S)return;setStatus('saving');
  try{
    const t=await tok(),r=await api('/rest/v1/player_data?user_id=eq.'+S.user.id+'&select=username,settings,binds,loadouts,economy,stats',{token:t}),row=r&&r[0];
    const meta=(S.user&&S.user.user_metadata&&S.user.user_metadata.username)||null;
    if(row){prof.username=row.username||meta;prof.stats=row.stats||{}}else{prof.username=meta;prof.stats={}}
    const cloudHas=row&&(hasKeys(row.settings)||hasKeys(row.binds)||hasKeys(row.loadouts)||(row.economy&&hasKeys(row.economy.eco))),dirtyNow=!!jget(DK,0),linked=localStorage.getItem(LK)===S.user.id;
    if(cloudHas){applyCloud(row,dirtyNow,linked);if(dirtyNow||!linked)await pushData()}   // push local edits, or the merged result on first link
    else await pushData();                                                                  // brand new account: upload what this device has
    try{localStorage.setItem(LK,S.user.id)}catch(e){}
    lastSnap=econSnap();
    if(!row||(!row.username&&prof.username))await pushData();
    await flushStats();lastSync=Date.now();
    if(status!=='error'&&status!=='offline')setStatus('ok')
  }catch(e){setStatus(e.net?'offline':'error',nice(e))}
  paint()}

/* ---------- stats ---------- */
const loadPend=()=>{pend=S?jget(PK(S.user.id),{}):{}};
const savePend=()=>{if(S)jset(PK(S.user.id),Object.keys(pend).length?pend:null)};
function addStats(d){
  if(!S)return;let any=0;for(const k of STAT_KEYS){const v=Math.max(0,Math.round(+d[k]||0));if(v){pend[k]=(pend[k]||0)+v;any=1}}
  if(!any)return;savePend();paint();clearTimeout(tFlush);tFlush=setTimeout(flushStats,1500)}
async function flushStats(){
  if(!S||flushing||!Object.keys(pend).length)return;flushing=true;
  // the server caps each call, so send in capped slices
  const CAP={kills:60,deaths:10,rounds:10,round_wins:10,matches:5,wins:5,losses:5,damage:20000};
  try{
    while(Object.keys(pend).length){
      const snap={};for(const k in pend)snap[k]=Math.min(pend[k],CAP[k]||1);
      const t=await tok(),r=await api('/rest/v1/rpc/add_stats',{method:'POST',token:t,body:{delta:snap}});
      if(r&&typeof r==='object')prof.stats=r;
      for(const k in snap){pend[k]-=snap[k];if(pend[k]<=0)delete pend[k]}savePend();paint()}
    lastSync=Date.now();if(status!=='error')setStatus('ok')
  }catch(e){setStatus(e.net?'offline':'error',nice(e))}finally{flushing=false}}
const total=k=>(+prof.stats[k]||0)+(+pend[k]||0);

/* ---------- auth actions ---------- */
async function doSignIn(email,pw){
  const j=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password:pw}});
  setSession(j);await afterAuth()}
async function doSignUp(email,pw,name){
  const ok=await api('/rest/v1/rpc/username_available',{method:'POST',body:{name}}).catch(e=>{if(e.net)throw e;return true});
  if(ok===false)throw Object.assign(new Error('THAT USERNAME IS TAKEN.'),{plain:1});
  const j=await api('/auth/v1/signup',{method:'POST',body:{email,password:pw,data:{username:name}}});
  if(j&&j.access_token){setSession(j);await afterAuth();return 'in'}
  return 'confirm'}
async function afterAuth(){
  loadPend();toast('SIGNED IN // '+((S.user.user_metadata&&S.user.user_metadata.username)||S.user.email),'SETTINGS, KEYBINDS, FAVOURITES AND STATS ARE NOW SAVED TO YOUR ACCOUNT');
  paintBtn();closeModal();await sync()}
function localOut(msg){S=null;jset(SK,null);pend={};prof={username:null,stats:{}};setStatus('idle');paintBtn();paint();
  const p=$('tp-acct');if(p&&!p.hidden){const b=tabs.querySelector('[data-tab=play]');if(b)b.click()}
  if(msg)toast('SIGNED OUT',msg)}
async function doSignOut(){
  clearTimeout(tPush);clearTimeout(tFlush);
  try{if(S){if(jget(DK,0))await pushData();await flushStats();await api('/auth/v1/logout',{method:'POST',token:S.access_token})}}catch(e){}
  localOut()}
function toast(a,b){try{if(window.R6UI&&R6UI.toast)R6UI.toast(a,b||'')}catch(e){}}

/* ---------- UI: tab-bar button ---------- */
const css=document.createElement('style');css.textContent=`
#acctBtn{margin-left:auto!important;display:flex;align-items:center;gap:8px;max-width:210px;font:400 11px Silkscreen,monospace!important;letter-spacing:2px!important;color:#d6d8de!important;border:1px solid #4a4a52!important;background:rgba(0,0,0,.4)!important;padding:7px 12px!important;border-bottom:1px solid #4a4a52!important}
#acctBtn:hover{border-color:var(--red,#e5303a)!important;color:#fff!important}
#acctBtn.on{background:rgba(229,48,58,.18)!important;border-color:var(--red,#e5303a)!important;color:#fff!important}
#acctBtn .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#acctBtn .dot{flex:0 0 8px;height:8px;background:#5dff8c;box-shadow:0 0 8px #5dff8c}
#acctBtn .dot.off{background:#ffb347;box-shadow:0 0 8px #ffb347}
#acctBtn+.gear{margin-left:8px!important}
#scrMain:has(#tp-acct:not([hidden])) .foot{display:none}
#tp-acct{padding-top:8px}
#tp-acct .ac{display:flex;flex-direction:column;gap:14px;width:min(1040px,100%);margin:0 auto;box-sizing:border-box}
#tp-acct .ac *{box-sizing:border-box}
#tp-acct .ach{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;border-bottom:1px solid #2d2d33;padding-bottom:10px;flex-wrap:wrap}
#tp-acct h2{margin:0;font:400 22px Silkscreen,monospace;letter-spacing:4px;color:#fff}
#tp-acct .ach small{display:block;margin-top:4px;font:500 13px Rajdhani,sans-serif;letter-spacing:2px;color:#8fa3bf}
#tp-acct .sy{font:600 13px Rajdhani,sans-serif;letter-spacing:2px;color:#aeb1b9;display:flex;align-items:center;gap:8px}
#tp-acct .sy i{width:9px;height:9px;background:#6a6d75}
#tp-acct .sy.ok i{background:#5dff8c;box-shadow:0 0 8px #5dff8c}#tp-acct .sy.saving i{background:#ffd24a}#tp-acct .sy.offline i,#tp-acct .sy.error i{background:#ff5a60}
#tp-acct .tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
#tp-acct .tile{background:rgba(6,6,8,.72);border:1px solid #232328;border-top:2px solid #3a3a42;padding:12px 14px}
#tp-acct .tile.big{grid-column:span 2;border-top-color:var(--red,#e5303a)}
#tp-acct .tile b{display:block;font:400 28px Silkscreen,monospace;color:#fff;letter-spacing:2px}
#tp-acct .tile.big b{font-size:40px}
#tp-acct .tile span{display:block;margin-top:4px;font:600 12px Rajdhani,sans-serif;letter-spacing:3px;color:#8b8d95}
#tp-acct .pan{background:rgba(6,6,8,.72);border:1px solid #232328;padding:14px 16px}
#tp-acct .lb{font:400 11px Silkscreen,monospace;letter-spacing:3px;color:#8b8d95;margin:0 0 10px;display:flex;align-items:center;gap:10px}
#tp-acct .lb::before{content:"";width:10px;height:2px;background:var(--red,#e5303a)}
#tp-acct .sv{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
#tp-acct .sv div{font:600 14px Rajdhani,sans-serif;letter-spacing:2px;color:#c4c8d0;display:flex;justify-content:space-between;border:1px solid #2d2d33;background:rgba(8,8,10,.8);padding:8px 10px}
#tp-acct .sv div b{color:#6aff9a;font-weight:600}
#tp-acct .note{font:500 13px Rajdhani,sans-serif;letter-spacing:1px;color:#8b8d95;margin-top:10px}
#tp-acct .acts{display:flex;gap:10px;flex-wrap:wrap}
.acb{font:400 12px Silkscreen,monospace;letter-spacing:2px;color:#d6d8de;background:rgba(0,0,0,.45);border:1px solid #4a4a52;padding:10px 16px;cursor:pointer;transition:.15s;white-space:nowrap}
.acb:hover:not(:disabled){border-color:var(--red,#e5303a);color:#fff;background:rgba(229,48,58,.14)}
.acb:disabled{opacity:.45;cursor:default}
.acb.go{color:#fff;border:none;background:linear-gradient(180deg,#f0383f,#c2202a);box-shadow:inset 0 -4px 0 #7a1118;padding:13px 26px;font-size:13px;letter-spacing:3px}
.acb.go:hover:not(:disabled){background:linear-gradient(180deg,#ff4a51,#d42630)}
@media(max-width:900px){#tp-acct .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
#acModal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;padding:16px}
#acModal.on{display:flex}
#acModal .box{width:min(400px,100%);background:#0b0c0f;border:1px solid #3a3a42;border-top:3px solid var(--red,#e5303a);padding:22px 24px;box-sizing:border-box;max-height:100%;overflow:auto}
#acModal *{box-sizing:border-box}
#acModal h3{margin:0 0 4px;font:400 20px Silkscreen,monospace;letter-spacing:4px;color:#fff}
#acModal .sub{font:500 13px Rajdhani,sans-serif;letter-spacing:1px;color:#8b8d95;margin-bottom:14px}
#acModal label{display:block;font:400 10px Silkscreen,monospace;letter-spacing:3px;color:#8b8d95;margin:12px 0 5px}
#acModal input{width:100%;background:#050506;color:#fff;border:1px solid #3a3a42;padding:10px 12px;font:500 15px Rajdhani,sans-serif;letter-spacing:1px;outline:none;border-radius:0}
#acModal input:focus{border-color:var(--red,#e5303a)}
#acModal .msg{min-height:20px;margin:12px 0 0;font:600 13px Rajdhani,sans-serif;letter-spacing:1px;color:#ff7a80}
#acModal .msg.good{color:#6aff9a}
#acModal .row2{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap}
#acModal .lnk{background:none;border:none;color:#8fa3bf;font:600 13px Rajdhani,sans-serif;letter-spacing:1px;cursor:pointer;padding:4px 0;text-decoration:underline}
#acModal .lnk:hover{color:#fff}
#acModal .x{float:right;background:none;border:none;color:#8b8d95;font:400 20px Silkscreen,monospace;cursor:pointer;margin:-6px -8px 0 0}
#acModal .x:hover{color:#fff}`;
document.head.appendChild(css);

const btn=document.createElement('button');btn.id='acctBtn';btn.className='acct';tabs.insertBefore(btn,tabs.querySelector('.gear'));
const bDot=document.createElement('span'),bNm=document.createElement('span');bDot.className='dot';bNm.className='nm';btn.append(bDot,bNm);
function paintBtn(){  // update in place: replacing btn's children mid-click would detach the click target from the tab handler
  if(S){const n=prof.username||(S.user&&S.user.user_metadata&&S.user.user_metadata.username)||(S.user&&S.user.email||'ACCOUNT').split('@')[0];
    btn.dataset.tab='acct';btn.title='Account, stats and cloud save';bDot.style.display='';bDot.classList.toggle('off',status==='offline'||status==='error');bNm.textContent=String(n).toUpperCase()}
  else{delete btn.dataset.tab;btn.classList.remove('on');btn.title='Sign in to save settings, keybinds, favourites and stats';bDot.style.display='none';bNm.textContent='SIGN IN'}}
btn.addEventListener('click',()=>{if(!S)openModal('in');else{paint()}});

/* ---------- UI: account tab ---------- */
const panel=document.createElement('div');panel.className='tp';panel.id='tp-acct';panel.hidden=true;
const host=$('tp-ctl');host.parentNode.insertBefore(panel,host.nextSibling);
const STATUS={idle:'',saving:'SAVING...',ok:'SYNCED',offline:'OFFLINE. WILL RETRY',error:'SYNC PROBLEM'};
function setStatus(s,m){status=s;statusMsg=m||'';paintBtn();const e=$('acSy');if(e){e.className='sy '+status;e.innerHTML='<i></i>'+esc(statusMsg&&(s==='error'||s==='offline')?statusMsg:STATUS[s]||'')}}
const fmt=n=>Math.round(n).toLocaleString('en-AU');
function paint(){
  if(!S||panel.hidden){paintBtn();return}
  paintBtn();btn.classList.add('on');
  const k=total('kills'),d=total('deaths'),m=total('matches'),w=total('wins'),l=total('losses'),R=total('rounds'),rw=total('round_wins');
  const kd=d?(k/d):k,wr=m?Math.round(w/m*100):0,rwr=R?Math.round(rw/R*100):0;
  const cd=window.R6Data?R6Data.get():{settings:{},binds:{},loadouts:{}},fav=Object.values(cd.loadouts||{}).filter(x=>x&&x.f).length,lds=Object.values(cd.loadouts||{}).filter(x=>x&&(x.p||x.s||x.g)).length;
  const t=(b,v,x)=>'<div class="tile'+(x?' big':'')+'"><b>'+v+'</b><span>'+b+'</span></div>';
  panel.innerHTML='<div class="ac"><div class="ach"><div><h2>ACCOUNT</h2><small>'+esc((prof.username||'').toUpperCase())+(prof.username?' // ':'')+esc(S.user&&S.user.email||'')+'</small></div><div class="sy '+status+'" id="acSy"><i></i>'+esc(statusMsg&&(status==='error'||status==='offline')?statusMsg:STATUS[status]||'')+'</div></div>'+
   '<div class="tiles">'+t('K/D RATIO',kd.toFixed(2),1)+t('WIN RATE',wr+'%',1)+t('KILLS',fmt(k))+t('DEATHS',fmt(d))+t('MATCHES',fmt(m))+t('WINS / LOSSES',fmt(w)+' / '+fmt(l))+t('ROUNDS PLAYED',fmt(R))+t('ROUND WIN RATE',rwr+'%')+t('ROUNDS WON',fmt(rw))+t('DAMAGE DEALT',fmt(total('damage')))+'</div>'+
   '<div class="pan"><div class="lb">SAVED TO YOUR ACCOUNT</div><div class="sv"><div>FAVOURITE OPERATORS<b>'+fav+'</b></div><div>SAVED LOADOUTS<b>'+lds+'</b></div><div>KEY BINDINGS<b>&#10003;</b></div><div>SETTINGS<b>&#10003;</b></div><div>STATS<b>&#10003;</b></div><div>CREDITS<b>'+fmt(window.ECO?ECO.cr:0)+'</b></div><div>ITEMS OWNED<b>'+(window.ECO?Object.keys(ECO.inv).length:0)+'</b></div><div>SEASON PASS<b>&#10003;</b></div></div>'+
   '<div class="note">Changes sync automatically a couple of seconds after you make them. Sign in on another device and everything is there.'+(lastSync?' Last sync '+new Date(lastSync).toLocaleTimeString('en-AU')+'.':'')+(Object.keys(pend).length?' Some stats are waiting to upload.':'')+'</div></div>'+
   '<div class="acts"><button class="acb" id="acSync">SYNC NOW</button><button class="acb" id="acOut">SIGN OUT</button></div></div>'}
panel.addEventListener('click',e=>{
  if(e.target.closest('#acSync')){const b=$('acSync');if(b)b.disabled=true;clearTimeout(tPush);clearTimeout(tFlush);sync().then(()=>{const x=$('acSync');if(x)x.disabled=false})}
  if(e.target.closest('#acOut'))doSignOut()});
new MutationObserver(()=>{if(!panel.hidden)paint()}).observe(panel,{attributes:true,attributeFilter:['hidden']});

/* ---------- UI: sign-in prompt ---------- */
const modal=document.createElement('div');modal.id='acModal';document.body.appendChild(modal);
let mode='in',busy=false;
function openModal(m){mode=m||'in';busy=false;renderModal();modal.classList.add('on');const f=modal.querySelector('input');if(f)f.focus()}
function closeModal(){modal.classList.remove('on')}
function msg(t,good){const e=modal.querySelector('.msg');if(e){e.textContent=t||'';e.classList.toggle('good',!!good)}}
function renderModal(){
  if(!configured()){modal.innerHTML='<div class="box"><button class="x" data-ac="close">&times;</button><h3>ACCOUNTS OFFLINE</h3><div class="sub">Add your Supabase Project URL to <b>account-config.js</b> and reload the extension.</div><div class="row2"><button class="acb" data-ac="close">OK</button></div></div>';return}
  const T={in:['SIGN IN','Save your settings, keybinds, favourites and stats.'],up:['CREATE ACCOUNT','Pick a username. It is shown on your stats.'],reset:['RESET PASSWORD','We will email you a reset link.']}[mode];
  modal.innerHTML='<div class="box"><button class="x" data-ac="close" title="Close">&times;</button><h3>'+T[0]+'</h3><div class="sub">'+T[1]+'</div><form id="acForm" autocomplete="on" novalidate>'+
   (mode==='up'?'<label for="acU">USERNAME</label><input id="acU" name="username" maxlength="16" autocomplete="username" placeholder="3-16 letters, numbers, _">':'')+
   '<label for="acE">EMAIL</label><input id="acE" name="email" type="email" autocomplete="email" placeholder="you@example.com">'+
   (mode!=='reset'?'<label for="acP">PASSWORD</label><input id="acP" name="password" type="password" autocomplete="'+(mode==='up'?'new-password':'current-password')+'" placeholder="'+(mode==='up'?'8+ characters':'Your password')+'">':'')+
   '<div class="msg"></div><div class="row2"><button class="acb go" type="submit" id="acGo">'+(mode==='in'?'SIGN IN':mode==='up'?'CREATE ACCOUNT':'SEND LINK')+'</button><div>'+
   (mode==='in'?'<button type="button" class="lnk" data-ac="up">Create account</button><br><button type="button" class="lnk" data-ac="reset">Forgot password?</button>':'<button type="button" class="lnk" data-ac="in">Back to sign in</button>')+'</div></div></form></div>'}
modal.addEventListener('click',e=>{if(e.target===modal)return closeModal();const x=e.target.closest('[data-ac]');if(!x)return;const v=x.dataset.ac;if(v==='close')closeModal();else openModal(v)});
modal.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeModal()});
modal.addEventListener('keyup',e=>e.stopPropagation());
modal.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const g=id=>{const x=modal.querySelector('#'+id);return x?x.value.trim():''},email=g('acE'),pw=modal.querySelector('#acP')?modal.querySelector('#acP').value:'',name=g('acU');
  if(!/^\S+@\S+\.\S+$/.test(email))return msg('ENTER A VALID EMAIL.');
  if(mode==='up'&&!/^[A-Za-z0-9_]{3,16}$/.test(name))return msg('USERNAME: 3-16 LETTERS, NUMBERS OR _ ONLY.');
  if(mode!=='reset'&&pw.length<(mode==='up'?8:1))return msg(mode==='up'?'PASSWORD NEEDS 8+ CHARACTERS.':'ENTER YOUR PASSWORD.');
  busy=true;const go=$('acGo');if(go)go.disabled=true;msg('WORKING...',true);
  try{
    if(mode==='in')await doSignIn(email,pw);
    else if(mode==='up'){const r=await doSignUp(email,pw,name);if(r==='confirm'){msg('ACCOUNT CREATED. CHECK YOUR EMAIL TO CONFIRM, THEN SIGN IN.',true);busy=false;if(go)go.disabled=false;mode='in';return}}
    else{await api('/auth/v1/recover',{method:'POST',body:{email}});msg('IF THAT EMAIL HAS AN ACCOUNT, A RESET LINK IS ON ITS WAY.',true)}
  }catch(err){msg(err.plain?err.message:nice(err))}
  busy=false;const g2=$('acGo');if(g2)g2.disabled=false});

/* ---------- housekeeping ---------- */
function flushOnLeave(){
  if(!S||S.expires_at*1000<Date.now()+5000)return;
  try{
    if(Object.keys(pend).length){const snap={};for(const k in pend)snap[k]=pend[k];api('/rest/v1/rpc/add_stats',{method:'POST',token:S.access_token,body:{delta:snap},keepalive:true}).then(r=>{if(r&&typeof r==='object')prof.stats=r;for(const k in snap){pend[k]-=snap[k];if(pend[k]<=0)delete pend[k]}savePend()}).catch(()=>{})}
    if(jget(DK,0)&&window.R6Data){const d=R6Data.get();api('/rest/v1/player_data?on_conflict=user_id',{method:'POST',token:S.access_token,keepalive:true,headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:{user_id:S.user.id,settings:d.settings,binds:d.binds,loadouts:d.loadouts,economy:econGet(),updated_at:new Date().toISOString()}}).then(()=>jset(DK,null)).catch(()=>{})}
  }catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushOnLeave()});
window.addEventListener('pagehide',flushOnLeave);
window.addEventListener('online',()=>{if(S){if(jget(DK,0))pushData();flushStats()}});
setInterval(()=>{if(S&&!pushing&&!flushing&&(jget(DK,0)||Object.keys(pend).length)&&status!=='saving'){if(jget(DK,0))pushData();flushStats()}},60000);

/* ---------- public hooks ---------- */
window.R6Acct={
  dirty,
  round(G,w){try{const me=G&&G.me;if(!S||!me)return;addStats({kills:me.kl|0,deaths:me.alive?0:1,rounds:1,round_wins:w===G.side?1:0,damage:Math.round(me.dd||0)})}catch(e){}},
  match(won){addStats({matches:1,wins:won?1:0,losses:won?0:1})},
  get signedIn(){return!!S},get user(){return S&&S.user},get stats(){const o={};STAT_KEYS.forEach(k=>o[k]=total(k));return o},
  open:()=>S?btn.click():openModal('in'),sync,signOut:doSignOut};

function econChanged(){if(applying||!S)return;const n=econSnap();if(n===lastSnap)return;lastSnap=n;dirty()}
try{if(window.ECO&&ECO.bus)ECO.bus.addEventListener('change',econChanged);if(window.R6PASS&&R6PASS.bus)R6PASS.bus.addEventListener('change',econChanged)}catch(e){}
lastSnap=econSnap();
paintBtn();
if(S){loadPend();if(!configured()){S=null;paintBtn()}else setTimeout(()=>sync(),600)}
})();
