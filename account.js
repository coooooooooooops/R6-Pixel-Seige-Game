/* R6 Pixel Siege - ACCOUNT: Supabase sign-in, cloud save and stats.  (v2)
   No SDK: plain fetch against Supabase Auth + PostgREST, so nothing is loaded from a CDN (MV3 safe).
   Cloud-saved: settings, key bindings, loadouts + favourite operators (R6Data in game.js), the wallet/inventory/equipped
   cosmetics/packs (ECO), the season pass (R6PASS) and player stats.
   The table is READ-ONLY for the game. Writes go through two database functions (see supabase_setup.sql):
     save_player_data()  version-checked save of settings/binds/loadouts/economy/username
     add_stats()         stats can only go up, in small capped steps
   Hooks (called from game.js): R6Acct.dirty() after settings/binds/loadouts save, .round(G,winner) and .match(won). */
(()=>{
const C=window.R6_SUPABASE||{},URL=String(C.url||'').replace(/\/+$/,''),KEY=C.key||'';
const $=id=>document.getElementById(id),tabs=$('tabs');if(!tabs)return;
const configured=()=>/^https?:\/\/\S+$/.test(URL)&&!!KEY;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jget=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const jset=(k,v)=>{try{if(v===undefined||v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const SK='r6s_acct',DK='r6s_acct_dirty',LK='r6s_acct_eco_uid',PK=u=>'r6s_acct_pend_'+u,BK=u=>'r6s_acct_base_'+u,NK=u=>'r6s_acct_snap_'+u;
const STAT_KEYS=['kills','deaths','rounds','round_wins','matches','wins','losses','damage'];
const CAP={kills:60,deaths:10,rounds:10,round_wins:10,matches:5,wins:5,losses:5,damage:20000};   // same caps as add_stats() on the server
const UNAME=/^[A-Za-z0-9_]{3,16}$/;
const clone=o=>JSON.parse(JSON.stringify(o||{}));
const hasKeys=o=>o&&typeof o==='object'&&Object.keys(o).length>0;
const withLock=(name,fn)=>{try{if(navigator.locks&&navigator.locks.request)return navigator.locks.request(name,fn)}catch(e){}return Promise.resolve().then(fn)};

let S=jget(SK,null);            // session {access_token,refresh_token,expires_at,user}
let prof={username:null,stats:{}};
let status='idle',statusMsg='';  // idle | saving | ok | offline | error
let applying=false,pushing=false,flushing=false,syncing=false,ver=0,tPush=0,tFlush=0,lastSync=0,base=null,wantName=null,nameTaken=null;
const uidOf=()=>S&&S.user&&S.user.id;
const isDirty=()=>!!S&&jget(DK,null)===uidOf();
const setDirty=()=>{if(S)jset(DK,uidOf())};
const clearDirty=()=>{if(S&&jget(DK,null)===uidOf())jset(DK,null)};
const storeBase=()=>{if(S)jset(BK(uidOf()),base)};
const getPend=()=>S?jget(PK(uidOf()),{}):{};

/* ---------- Supabase REST ---------- */
async function api(path,o={}){
  const h={apikey:KEY,'Content-Type':'application/json'};if(o.token)h.Authorization='Bearer '+o.token;Object.assign(h,o.headers||{});
  const ctl=(!o.keepalive&&typeof AbortController!=='undefined')?new AbortController():null,to=ctl?setTimeout(()=>ctl.abort(),o.timeout||20000):0;
  const netErr=()=>{clearTimeout(to);const x=new Error('NETWORK');x.net=true;return x};
  let r,t;
  try{r=await fetch(URL+path,{method:o.method||'GET',headers:h,body:o.body===undefined?undefined:JSON.stringify(o.body),keepalive:!!o.keepalive,signal:ctl?ctl.signal:undefined});t=await r.text()}
  catch(e){throw netErr()}
  clearTimeout(to);
  let j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok){const x=new Error((j&&(j.msg||j.error_description||j.message||j.error))||('HTTP '+r.status));x.status=r.status;x.code=j&&(j.error_code||j.code);throw x}
  return j}
function nice(e){const m=String(e&&e.message||e),c=e&&e.code,st=e&&e.status;
  if(e&&e.net)return 'CAN\'T REACH THE SERVER. CHECK YOUR CONNECTION.';
  if(/invalid login/i.test(m)||c==='invalid_credentials')return 'WRONG EMAIL OR PASSWORD.';
  if(/not confirmed/i.test(m)||c==='email_not_confirmed')return 'CONFIRM YOUR EMAIL FIRST. CHECK YOUR INBOX AND SPAM.';
  if(/already registered|already been registered/i.test(m)||c==='user_already_exists')return 'THAT EMAIL ALREADY HAS AN ACCOUNT. SIGN IN INSTEAD.';
  if(c==='same_password'||/different from the old/i.test(m))return 'NEW PASSWORD MUST BE DIFFERENT FROM THE OLD ONE.';
  if(c==='reauthentication_needed'||/reauthentication/i.test(m))return 'FOR SECURITY, SIGN OUT, SIGN BACK IN, THEN TRY AGAIN.';
  if(/password.*(short|least|weak|characters)/i.test(m)||c==='weak_password')return 'PASSWORD IS TOO WEAK. USE 8+ CHARACTERS.';
  if(c==='email_address_not_authorized'||/not authorized/i.test(m))return 'THE EMAIL SERVICE CAN\'T SEND TO THIS ADDRESS YET. TRY ANOTHER EMAIL OR ASK THE GAME OWNER.';
  if(/rate limit|too many/i.test(m)||c==='over_email_send_rate_limit'||c==='over_request_rate_limit'||st===429)return 'TOO MANY ATTEMPTS. WAIT A MINUTE AND TRY AGAIN.';
  if(/error sending (confirmation|recovery)/i.test(m))return 'COULD NOT SEND THE EMAIL. TRY AGAIN IN A FEW MINUTES.';
  if(c==='signup_disabled'||/signups not allowed/i.test(m))return 'SIGN-UPS ARE TURNED OFF RIGHT NOW.';
  if(/invalid.*email|email.*invalid/i.test(m)||c==='email_address_invalid')return 'THAT EMAIL ADDRESS LOOKS WRONG.';
  return m.toUpperCase()}
const isUnconfirmed=e=>!!e&&(e.code==='email_not_confirmed'||/not confirmed/i.test(String(e.message)));
const fail=(e,plainOk)=>{if(!S||(e&&e.signedOut))return;setStatus(e&&e.net?'offline':'error',plainOk&&e&&e.plain?e.message:nice(e))};
const notIn=()=>Object.assign(new Error('NOT SIGNED IN'),{plain:1,signedOut:1});

/* ---------- session (shared by every open window: popup + full tab share localStorage) ---------- */
function setSession(j){
  if(!j||!j.access_token)return null;
  S={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:+j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),user:j.user||(S&&S.user)};
  jset(SK,S);return S}
let refreshing=null;
// One refresh at a time ACROSS windows (Web Locks). Supabase refresh tokens are single-use: if two windows refreshed
// with the same token, the second would be treated as token theft and the whole session would be revoked.
function refresh(force){if(refreshing)return refreshing;
  refreshing=withLock('r6s_refresh',async()=>{
    const cur=jget(SK,null);
    if(!cur||!S){if(S)localOut();throw notIn()}
    if(cur.refresh_token!==S.refresh_token){S=cur;return}                   // another window already refreshed: adopt its tokens
    if(!force&&cur.expires_at*1000-Date.now()>=60000)return;
    try{setSession(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:cur.refresh_token}}))}
    catch(e){
      if(!e.net&&(e.status===400||e.status===401||e.status===403)){
        const again=jget(SK,null);if(again&&again.refresh_token!==cur.refresh_token){S=again;return}
        localOut('SESSION EXPIRED. SIGN IN AGAIN.')}
      throw e}
  }).finally(()=>{refreshing=null});return refreshing}
async function tok(){if(!S)throw notIn();if(S.expires_at*1000-Date.now()<60000)await refresh();if(!S)throw notIn();return S.access_token}
// authenticated call; one automatic refresh + retry if the server says the token is bad (clock skew, revoked access token)
async function authed(path,o={}){
  let t=await tok();
  try{return await api(path,Object.assign({},o,{token:t}))}
  catch(e){if(e.status===401&&S){await refresh(true);if(!S)throw e;return api(path,Object.assign({},o,{token:S.access_token}))}throw e}}
window.addEventListener('storage',e=>{                                      // another window signed in / out / refreshed
  if(e.key!==SK)return;const n=jget(SK,null);
  if(!n&&S){S=null;prof={username:null,stats:{}};base=null;setStatus('idle');paintBtn();paint()}
  else if(n&&!S){S=n;paintBtn();if(configured())sync()}
  else if(n&&S){const other=n.user&&S.user&&n.user.id!==S.user.id;S=n;if(other){paintBtn();sync()}}});

/* ---------- economy: credits, owned items, equipped cosmetics, packs, season pass ---------- */
function econGet(){const E=window.ECO,P=window.R6PASS;return{eco:E?clone(E._state()):{},pass:P?clone(P.state):{}}}
const econSnap=()=>JSON.stringify(econGet());
let lastSnap='';
// 'exact': this device is already linked to the account, so the cloud copy is the truth.
// 'merge': two different histories meet (first link, or two devices that both changed): keep everything either side owns.
function econApply(cloud,mode){
  const E=window.ECO,P=window.R6PASS;if(!cloud||!E)return;
  const cE=cloud.eco||{},cP=cloud.pass||{};
  if(mode==='exact'){if(hasKeys(cE))E._replace(clone(cE));if(P&&hasKeys(cP))P._replace(clone(cP));return}
  // a wallet that has never earned, bought or opened anything has nothing to merge: taking max() of its default starting credits
  // would hand back credits the account already spent
  const W0=E._state(),pristine=!Object.keys(W0.inv||{}).length&&!(W0.stats&&(W0.stats.buys|W0.stats.opened))&&!(W0.packs&&(W0.packs.supply|W0.packs.elite))&&(+W0.cr||0)<=2500;
  if(pristine&&hasKeys(cE))E._replace(clone(cE));
  else if(hasKeys(cE)){
    const L=clone(E._state()),o=clone(cE);
    for(const id in (L.inv||{}))o.inv=o.inv||{},o.inv[id]=Math.min(+o.inv[id]||Infinity,+L.inv[id]||Infinity);
    for(const id in (o.inv||{}))if(!isFinite(o.inv[id]))o.inv[id]=Date.now();
    o.cr=Math.max(+L.cr||0,+cE.cr||0);
    o.packs={supply:Math.max(L.packs&&L.packs.supply|0,cE.packs&&cE.packs.supply|0),elite:Math.max(L.packs&&L.packs.elite|0,cE.packs&&cE.packs.elite|0)};
    o.eq=Object.assign({},L.eq||{},cE.eq||{});for(const t in o.eq)if(!(o.inv||{})[o.eq[t]])delete o.eq[t];
    o.stats=Object.assign({},L.stats||{},cE.stats||{});for(const k of['buys','opened','pity','pityM'])o.stats[k]=Math.max(+(L.stats&&L.stats[k])||0,+(cE.stats&&cE.stats[k])||0);
    E._replace(o)}
  if(P&&hasKeys(cP)){
    const L=clone(P.state),cur=P.season&&P.season.key;let o;
    if(L.key===cP.key||!cur)o=Object.assign(clone(cP),{xp:Math.max(L.xp|0,cP.xp|0),got:Object.assign({},L.got,cP.got)});
    else o=clone(cP.key===cur?cP:L);
    o.hist=Object.assign({},L.hist||{},cP.hist||{});P._replace(o)}}

/* ---------- cloud data (settings, binds, loadouts, favourites, economy) ---------- */
const COLS='username,settings,binds,loadouts,economy,stats,version';
const cloudHasData=row=>!!row&&(hasKeys(row.settings)||hasKeys(row.binds)||hasKeys(row.loadouts)||(row.economy&&(hasKeys(row.economy.eco)||hasKeys(row.economy.pass))));
const metaName=()=>{const n=S&&S.user&&S.user.user_metadata&&S.user.user_metadata.username;return typeof n==='string'&&UNAME.test(n)?n:null};
const claimName=()=>{if(!S||prof.username)return null;const n=wantName||metaName();return n&&n!==nameTaken?n:null};
function dirty(){if(applying||!S)return;setDirty();ver++;clearTimeout(tPush);tPush=setTimeout(pushData,2000);if(status!=='saving')setStatus('saving')}
// 3-way merge of one top-level object (settings / binds / loadouts): a key this device changed since the last sync wins,
// every other key takes the cloud value. So a setting changed on another device is never undone by a stale copy here.
function merge3(l,c,b){
  l=l||{};c=c||{};const o={},J=JSON.stringify;
  for(const k of new Set([...Object.keys(l),...Object.keys(c)])){
    const changedHere=!b||J(l[k])!==J(b[k]);
    if(changedHere){if(k in l)o[k]=l[k]}else if(k in c)o[k]=c[k]}
  return o}
const saveSnap=d=>{if(S&&d)jset(NK(uidOf()),{s:clone(d.settings),b:clone(d.binds),l:clone(d.loadouts)})};
// how: 'exact' cloud is truth | 'first' device meets the account for the first time | 'local' both sides changed: 3-way merge
function applyRow(row,how){
  if(!window.R6Data)return;applying=true;
  try{
    const L=R6Data.get(),cs=row.settings||{},cb=row.binds||{},cl=row.loadouts||{};
    if(how==='exact')R6Data.apply({settings:cs,binds:cb,loadouts:cl});
    else if(how==='first')R6Data.apply({settings:cs,binds:cb,loadouts:Object.assign({},L.loadouts,cl)});
    else{const B=jget(NK(uidOf()),null)||{};R6Data.apply({settings:merge3(L.settings,cs,B.s),binds:merge3(L.binds,cb,B.b),loadouts:merge3(L.loadouts,cl,B.l)})}
    if(row.economy&&hasKeys(row.economy))econApply(row.economy,how==='exact'?'exact':'merge');
  }catch(e){}finally{applying=false}
  lastSnap=econSnap();
  try{if(window.R6PASS)R6PASS.sync();if(window.R6UI)R6UI.render()}catch(e){}}      // grants anything a rolled-over season owes; flags itself dirty if it changed something
// this device last belonged to a DIFFERENT account: never carry that account's wallet into this one
function resetForForeign(row){
  applying=true;
  try{
    const E=window.ECO,P=window.R6PASS,ce=row.economy||{};
    if(E)E._replace(hasKeys(ce.eco)?clone(ce.eco):{cr:2500,inv:{},eq:{},packs:{supply:0,elite:0},stats:{buys:0}});   // 2500 = starting credits (shop.js START_CR)
    if(P)P._replace(hasKeys(ce.pass)?clone(ce.pass):{key:'',xp:0,got:{},hist:{}});
    if(window.R6Data)R6Data.apply({settings:row.settings||{},binds:row.binds||{},loadouts:row.loadouts||{}});
  }catch(e){}finally{applying=false}
  lastSnap=econSnap();try{if(window.R6PASS)R6PASS.sync();if(window.R6UI)R6UI.render()}catch(e){}}
async function fetchRow(){
  const r=await authed('/rest/v1/player_data?user_id=eq.'+uidOf()+'&select='+COLS);
  return(r&&r[0])||{username:null,settings:{},binds:{},loadouts:{},economy:{},stats:{},version:0}}
async function pullAndMerge(){
  const row=await fetchRow();if(!S)return;
  prof.username=row.username||prof.username;prof.stats=row.stats||prof.stats;
  applyRow(row,'local');base=row.version;storeBase()}   // snapshot is refreshed by the push that follows
async function pushData(){
  if(!S||pushing||!window.R6Data)return;pushing=true;const v=ver,uid=uidOf();setStatus('saving');
  try{
    let res=null;
    let sent=null;
    for(let i=0;i<4;i++){
      const d=sent=clone(R6Data.get());
      res=await authed('/rest/v1/rpc/save_player_data',{method:'POST',body:{p_settings:d.settings,p_binds:d.binds,p_loadouts:d.loadouts,p_economy:econGet(),p_username:claimName(),p_base:base}});
      if(res&&res.conflict){await pullAndMerge();if(!S||uidOf()!==uid)return;continue}   // another device saved first: merge its changes in, then retry
      break}
    if(!res||res.conflict)throw Object.assign(new Error('SYNC CONFLICT. TRY SYNC NOW.'),{plain:1});
    base=res.version;storeBase();saveSnap(sent);prof.username=res.username||null;
    if(res.username_status==='taken'){const n=wantName||metaName();nameTaken=n;if(!wantName)toast('USERNAME TAKEN','SOMEONE ELSE GOT THAT NAME FIRST. PICK ANOTHER IN THE ACCOUNT TAB.')}
    if(ver===v)clearDirty();else{clearTimeout(tPush);tPush=setTimeout(pushData,500)}
    lastSync=Date.now();setStatus('ok')
  }catch(e){fail(e,1)}finally{pushing=false;paint()}}
async function sync(){
  if(!S||syncing)return;syncing=true;const uid=uidOf();setStatus('saving');
  try{
    const row=await fetchRow();if(!S||uidOf()!==uid)return;
    prof.username=row.username||null;prof.stats=row.stats||{};
    const owner=localStorage.getItem(LK),linked=owner===uid,foreign=!!owner&&!linked,dirtyNow=isDirty(),stored=jget(BK(uid),null),has=cloudHasData(row);
    let needPush=false;
    if(foreign){resetForForeign(row);needPush=!has}
    else if(!linked){if(has)applyRow(row,'first');needPush=true}                        // first time this device meets this account: merge, then upload the result
    else if(dirtyNow){if(has&&stored!==null&&stored!==row.version)applyRow(row,'local');needPush=true}   // unsynced edits here (and maybe elsewhere): keep both
    else if(has)applyRow(row,'exact');
    else needPush=true;                                                                  // linked but the cloud copy is empty: restore it from this device
    base=row.version;storeBase();if(!needPush)saveSnap(R6Data.get());try{localStorage.setItem(LK,uid)}catch(e){}
    if(!row.username&&claimName())needPush=true;
    if(needPush){setDirty();await pushData()}
    await flushStats();lastSync=Date.now();
    if(status!=='error'&&status!=='offline')setStatus('ok')
  }catch(e){fail(e,1)}finally{syncing=false}
  paint()}

/* ---------- stats (queued on this device, uploaded in capped slices; survive offline, reloads and sign-out) ---------- */
function addStats(d){
  if(!S)return;const p=getPend();let any=0;
  for(const k of STAT_KEYS){const v=Math.max(0,Math.round(+d[k]||0));if(v){p[k]=(p[k]||0)+v;any=1}}
  if(!any)return;jset(PK(uidOf()),p);paint();clearTimeout(tFlush);tFlush=setTimeout(flushStats,1500)}
const subPend=(uid,snap)=>{const q=jget(PK(uid),{});for(const k in snap){q[k]=(q[k]||0)-snap[k];if(q[k]<=0)delete q[k]}jset(PK(uid),Object.keys(q).length?q:null)};
async function flushStats(){
  if(!S||flushing)return;const uid=uidOf();if(!Object.keys(getPend()).length)return;flushing=true;
  try{
    await withLock('r6s_stats_'+uid,async()=>{                                           // one uploader across windows: no double counting
      for(let guard=0;guard<500&&S&&uidOf()===uid;guard++){
        const p=jget(PK(uid),{});if(!Object.keys(p).length)break;
        const snap={};for(const k in p)snap[k]=Math.min(p[k],CAP[k]||1);
        const r=await authed('/rest/v1/rpc/add_stats',{method:'POST',body:{delta:snap}});
        if(r&&typeof r==='object')prof.stats=r;
        subPend(uid,snap);paint()}});
    lastSync=Date.now();if(status!=='error'&&status!=='offline')setStatus('ok')
  }catch(e){fail(e)}finally{flushing=false}}
const total=k=>(+prof.stats[k]||0)+(+getPend()[k]||0);

/* ---------- auth actions ---------- */
// where the e-mail links bring the player back to (only when the game runs as a normal web page; an extension page can't be a redirect target)
const rq=()=>{try{if(/^https?:$/.test(location.protocol))return '?redirect_to='+encodeURIComponent(location.origin+location.pathname)}catch(e){}return ''};
async function doSignIn(email,pw){
  const j=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password:pw}});
  setSession(j);await afterAuth()}
async function doSignUp(email,pw,name){
  const ok=await api('/rest/v1/rpc/username_available',{method:'POST',body:{name}}).catch(e=>{if(e.net)throw e;return true});
  if(ok===false)throw Object.assign(new Error('THAT USERNAME IS TAKEN.'),{plain:1});
  const j=await api('/auth/v1/signup'+rq(),{method:'POST',body:{email,password:pw,data:{username:name}}});
  if(j&&j.access_token){setSession(j);await afterAuth();return 'in'}                      // e-mail confirmation is off: signed in straight away
  const u=j&&(j.user||j);
  if(u&&Array.isArray(u.identities)&&u.identities.length===0)throw Object.assign(new Error('THAT EMAIL ALREADY HAS AN ACCOUNT. SIGN IN INSTEAD.'),{plain:1});   // Supabase hides duplicates behind a 200
  return 'confirm'}
const doResend=email=>api('/auth/v1/resend'+rq(),{method:'POST',body:{type:'signup',email}});
async function doNewPassword(pw){await authed('/auth/v1/user',{method:'PUT',body:{password:pw}})}
async function doClaimName(n){
  wantName=n;nameTaken=null;await pushData();
  if(prof.username===n)return;
  throw Object.assign(new Error(status==='ok'?'THAT USERNAME IS TAKEN.':(statusMsg||'COULD NOT SAVE. TRY AGAIN.')),{plain:1})}
async function afterAuth(){
  toast('SIGNED IN // '+(metaName()||(S.user&&S.user.email)||''),'SETTINGS, KEYBINDS, LOADOUTS, CREDITS, ITEMS AND STATS ARE NOW SAVED TO YOUR ACCOUNT');
  paintBtn();closeModal();await sync()}
function localOut(msg){S=null;jset(SK,null);prof={username:null,stats:{}};base=null;wantName=null;nameTaken=null;clearTimeout(tPush);clearTimeout(tFlush);setStatus('idle');paintBtn();paint();
  const p=$('tp-acct');if(p&&!p.hidden){const b=tabs.querySelector('[data-tab=play]');if(b)b.click()}
  if(msg)toast('SIGNED OUT',msg)}
async function doSignOut(){
  clearTimeout(tPush);clearTimeout(tFlush);
  const t0=S&&S.access_token;
  try{if(S)await Promise.race([(async()=>{if(isDirty())await pushData();await flushStats()})(),new Promise(r=>setTimeout(r,6000))])}catch(e){}   // anything unsent stays queued on this device
  const t=(S&&S.access_token)||t0;
  try{if(t)await api('/auth/v1/logout?scope=local',{method:'POST',token:t,timeout:8000})}catch(e){}     // local: other devices stay signed in
  localOut()}
function toast(a,b){try{if(window.R6UI&&R6UI.toast)R6UI.toast(a,b||'')}catch(e){}}
// links from the e-mails land on the page with the result in the URL hash
async function handleHash(){
  const h=location.hash;if(!h||h.length<2)return;let p;try{p=new URLSearchParams(h.slice(1))}catch(e){return}
  const clean=()=>{try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}};
  if(p.get('error')||p.get('error_code')){clean();const c=p.get('error_code');
    setTimeout(()=>toast(c==='otp_expired'?'EMAIL LINK ALREADY USED':'EMAIL LINK PROBLEM',c==='otp_expired'?'THAT LINK WAS ALREADY USED OR HAS EXPIRED. IF YOU ALREADY CONFIRMED, JUST SIGN IN.':String(p.get('error_description')||'').toUpperCase()),700);return}
  const at=p.get('access_token'),rt=p.get('refresh_token');if(!at||!rt)return;
  const type=p.get('type');clean();if(!configured())return;
  try{
    const u=await api('/auth/v1/user',{token:at});
    setSession({access_token:at,refresh_token:rt,expires_at:p.get('expires_at'),expires_in:+p.get('expires_in')||3600,user:u});
    if(type==='recovery'){paintBtn();openModal('newpw',{recovery:1})}else await afterAuth()
  }catch(e){toast('EMAIL LINK PROBLEM',nice(e))}}

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
#acModal .x:hover{color:#fff}
#acModal .lnk[hidden]{display:none}
#acModal .lnk.rs{display:block;margin-top:8px;color:#ffb347}`;
document.head.appendChild(css);

const btn=document.createElement('button');btn.id='acctBtn';btn.className='acct';tabs.insertBefore(btn,tabs.querySelector('.gear'));
const bDot=document.createElement('span'),bNm=document.createElement('span');bDot.className='dot';bNm.className='nm';btn.append(bDot,bNm);
function paintBtn(){  // update in place: replacing btn's children mid-click would detach the click target from the tab handler
  if(S){const n=prof.username||metaName()||(S.user&&S.user.email||'ACCOUNT').split('@')[0];
    btn.dataset.tab='acct';btn.title='Account, stats and cloud save';bDot.style.display='';bDot.classList.toggle('off',status==='offline'||status==='error');bNm.textContent=String(n).toUpperCase()}
  else{delete btn.dataset.tab;btn.classList.remove('on');btn.title='Sign in to save settings, keybinds, favourites, credits and stats';bDot.style.display='none';bNm.textContent='SIGN IN'}}
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
   '<div class="note">Changes sync automatically a couple of seconds after you make them. Sign in on another device and everything is there.'+(lastSync?' Last sync '+new Date(lastSync).toLocaleTimeString('en-AU')+'.':'')+(Object.keys(getPend()).length?' Some stats are waiting to upload.':'')+'</div></div>'+
   '<div class="acts"><button class="acb" id="acSync">SYNC NOW</button>'+(prof.username?'':'<button class="acb" id="acName">SET USERNAME</button>')+'<button class="acb" id="acPw">CHANGE PASSWORD</button><button class="acb" id="acOut">SIGN OUT</button></div></div>'}
panel.addEventListener('click',e=>{
  if(e.target.closest('#acSync')){const b=$('acSync');if(b)b.disabled=true;clearTimeout(tPush);clearTimeout(tFlush);sync().then(()=>{const x=$('acSync');if(x)x.disabled=false})}
  if(e.target.closest('#acName'))openModal('name');
  if(e.target.closest('#acPw'))openModal('newpw');
  if(e.target.closest('#acOut'))doSignOut()});
new MutationObserver(()=>{if(!panel.hidden)paint()}).observe(panel,{attributes:true,attributeFilter:['hidden']});

/* ---------- UI: sign-in prompt ---------- */
const modal=document.createElement('div');modal.id='acModal';document.body.appendChild(modal);
let mode='in',mo={},busy=false,pendingEmail='';
function openModal(m,o){mode=m||'in';mo=o||{};busy=false;renderModal();modal.classList.add('on');const f=[...modal.querySelectorAll('input')].find(x=>!x.value)||modal.querySelector('input');if(f)f.focus()}
function closeModal(){modal.classList.remove('on')}
function msg(t,good){const e=modal.querySelector('.msg');if(e){e.textContent=t||'';e.classList.toggle('good',!!good)}}
const showResend=on=>{const e=modal.querySelector('.rs');if(e)e.hidden=!on};
const setGo=on=>{const g=$('acGo');if(g)g.disabled=!!on};
function renderModal(){
  if(!configured()){modal.innerHTML='<div class="box"><button class="x" data-ac="close">&times;</button><h3>ACCOUNTS OFFLINE</h3><div class="sub">Add your Supabase Project URL to <b>account-config.js</b> and reload the extension.</div><div class="row2"><button class="acb" data-ac="close">OK</button></div></div>';return}
  const T={in:['SIGN IN','Save your settings, keybinds, loadouts, credits and stats.'],up:['CREATE ACCOUNT','Pick a username. It is shown on your stats.'],reset:['RESET PASSWORD','We will email you a reset link.'],
    newpw:[mo.recovery?'NEW PASSWORD':'CHANGE PASSWORD','Choose a new password (8+ characters).'],name:['SET USERNAME','3-16 letters, numbers or _. It is shown on your stats and cannot be changed later.']}[mode];
  const L=(id,t)=>'<label for="'+id+'">'+t+'</label>';
  let f='';
  if(mode==='up'||mode==='name')f+=L('acU','USERNAME')+'<input id="acU" name="username" maxlength="16" autocomplete="username" placeholder="3-16 letters, numbers, _">';
  if(mode==='in'||mode==='up'||mode==='reset')f+=L('acE','EMAIL')+'<input id="acE" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="'+esc(mo.email||'')+'">';
  if(mode==='in'||mode==='up')f+=L('acP','PASSWORD')+'<input id="acP" name="password" type="password" autocomplete="'+(mode==='up'?'new-password':'current-password')+'" placeholder="'+(mode==='up'?'8+ characters':'Your password')+'">';
  if(mode==='newpw')f+=L('acP','NEW PASSWORD')+'<input id="acP" name="password" type="password" autocomplete="new-password" placeholder="8+ characters">'+L('acP2','CONFIRM PASSWORD')+'<input id="acP2" name="password2" type="password" autocomplete="new-password" placeholder="Same again">';
  const GO={in:'SIGN IN',up:'CREATE ACCOUNT',reset:'SEND LINK',newpw:'SAVE PASSWORD',name:'CLAIM USERNAME'}[mode];
  const links=mode==='in'?'<button type="button" class="lnk" data-ac="up">Create account</button><br><button type="button" class="lnk" data-ac="reset">Forgot password?</button>':(mode==='newpw'||mode==='name')?'<button type="button" class="lnk" data-ac="close">Cancel</button>':'<button type="button" class="lnk" data-ac="in">Back to sign in</button>';
  modal.innerHTML='<div class="box"><button class="x" data-ac="close" title="Close">&times;</button><h3>'+T[0]+'</h3><div class="sub">'+T[1]+'</div><form id="acForm" autocomplete="on" novalidate>'+f+
   '<div class="msg'+(mo.good?' good':'')+'">'+esc(mo.msg||'')+'</div><button type="button" class="lnk rs" data-ac="resend"'+(mo.resend?'':' hidden')+'>RESEND CONFIRMATION EMAIL</button>'+
   '<div class="row2"><button class="acb go" type="submit" id="acGo">'+GO+'</button><div>'+links+'</div></div></form></div>'}
modal.addEventListener('click',async e=>{
  if(e.target===modal)return closeModal();const x=e.target.closest('[data-ac]');if(!x)return;const v=x.dataset.ac;
  if(v==='close')closeModal();
  else if(v==='resend'){const em=pendingEmail||(modal.querySelector('#acE')||{}).value;if(!em)return msg('ENTER YOUR EMAIL FIRST.');msg('SENDING...',true);
    try{await doResend(em.trim());msg('SENT. CHECK YOUR INBOX AND SPAM FOLDER.',true)}catch(err){msg(nice(err))}}
  else openModal(v,{email:(modal.querySelector('#acE')||{}).value||pendingEmail})});
modal.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeModal()});
modal.addEventListener('keyup',e=>e.stopPropagation());
modal.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const val=id=>{const x=modal.querySelector('#'+id);return x?x.value:''},email=val('acE').trim(),pw=val('acP'),pw2=val('acP2'),name=val('acU').trim();
  if((mode==='in'||mode==='up'||mode==='reset')&&!/^\S+@\S+\.\S+$/.test(email))return msg('ENTER A VALID EMAIL.');
  if((mode==='up'||mode==='name')&&!UNAME.test(name))return msg('USERNAME: 3-16 LETTERS, NUMBERS OR _ ONLY.');
  if(mode==='in'&&!pw)return msg('ENTER YOUR PASSWORD.');
  if((mode==='up'||mode==='newpw')&&pw.length<8)return msg('PASSWORD NEEDS 8+ CHARACTERS.');
  if(mode==='newpw'&&pw!==pw2)return msg('PASSWORDS DO NOT MATCH.');
  busy=true;setGo(true);msg('WORKING...',true);showResend(false);if(email)pendingEmail=email;
  try{
    if(mode==='in')await doSignIn(email,pw);
    else if(mode==='up'){const r=await doSignUp(email,pw,name);
      if(r==='confirm')openModal('in',{email,good:1,resend:1,msg:'ACCOUNT CREATED. WE EMAILED A CONFIRMATION LINK TO '+email.toUpperCase()+'. CLICK IT, THEN SIGN IN HERE.'})}
    else if(mode==='reset'){await api('/auth/v1/recover'+rq(),{method:'POST',body:{email}});msg('IF THAT EMAIL HAS AN ACCOUNT, A RESET LINK IS ON ITS WAY.',true)}
    else if(mode==='newpw'){const rec=mo.recovery;await doNewPassword(pw);closeModal();if(rec)await afterAuth();else toast('PASSWORD CHANGED','USE THE NEW PASSWORD NEXT TIME YOU SIGN IN')}
    else if(mode==='name'){await doClaimName(name);closeModal();toast('USERNAME SET',name.toUpperCase());paintBtn();paint()}
  }catch(err){msg(err.plain?err.message:nice(err));if(mode==='in'&&isUnconfirmed(err))showResend(true)}
  finally{busy=false;setGo(false)}});

/* ---------- housekeeping ---------- */
function flushOnLeave(){          // best effort when the window is closing or hidden; anything that doesn't make it stays queued for next time
  if(!S||S.expires_at*1000<Date.now()+5000||flushing||pushing)return;
  const uid=uidOf(),t=S.access_token;
  try{
    const p=jget(PK(uid),{});
    if(Object.keys(p).length){const snap={};for(const k in p)snap[k]=Math.min(p[k],CAP[k]||1);flushing=true;
      api('/rest/v1/rpc/add_stats',{method:'POST',token:t,body:{delta:snap},keepalive:true}).then(r=>{if(r&&typeof r==='object')prof.stats=r;subPend(uid,snap)}).catch(()=>{}).finally(()=>{flushing=false})}
    if(isDirty()&&window.R6Data){const d=R6Data.get(),v=ver;pushing=true;
      api('/rest/v1/rpc/save_player_data',{method:'POST',token:t,keepalive:true,body:{p_settings:d.settings,p_binds:d.binds,p_loadouts:d.loadouts,p_economy:econGet(),p_base:base}})
        .then(r=>{if(r&&r.ok){base=r.version;storeBase();saveSnap(d);if(ver===v)clearDirty()}}).catch(()=>{}).finally(()=>{pushing=false})}
  }catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushOnLeave()});
window.addEventListener('pagehide',flushOnLeave);
window.addEventListener('online',()=>{if(S){if(isDirty())pushData();flushStats()}});
setInterval(()=>{if(S&&!pushing&&!flushing&&!syncing&&(isDirty()||Object.keys(getPend()).length)){if(isDirty())pushData();flushStats()}},60000);

/* ---------- public hooks ---------- */
window.R6Acct={
  dirty,
  round(G,w){try{const me=G&&G.me;if(!S||!me)return;addStats({kills:me.kl|0,deaths:me.alive?0:1,rounds:1,round_wins:w===G.side?1:0,damage:Math.round(me.dd||0)})}catch(e){}},
  match(won){addStats({matches:1,wins:won?1:0,losses:won?0:1})},
  get signedIn(){return!!S},get user(){return S&&S.user},get status(){return status},get stats(){const o={};STAT_KEYS.forEach(k=>o[k]=total(k));return o},
  open:()=>S?btn.click():openModal('in'),sync,signOut:doSignOut};

function econChanged(){if(applying||!S)return;const n=econSnap();if(n===lastSnap)return;lastSnap=n;dirty()}
try{if(window.ECO&&ECO.bus)ECO.bus.addEventListener('change',econChanged);if(window.R6PASS&&R6PASS.bus)R6PASS.bus.addEventListener('change',econChanged)}catch(e){}
lastSnap=econSnap();
if(S)base=jget(BK(uidOf()),null);
paintBtn();
if(S){if(!configured()){S=null;paintBtn()}else setTimeout(()=>sync(),600)}
handleHash();
})();
