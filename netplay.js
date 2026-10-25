/* netplay.js - ONLINE MATCH SYNC, step 5C-1 (live mirror + spectate).
   Host runs the real match (update()). Every 3 ticks it broadcasts a compact snapshot on the unreliable channel; tile changes
   (broken walls, reinforcements, barricades) go on the reliable channel. Guests rebuild the same map from (mapIdx, pair),
   never run update(), and render the snapshot. Guests follow a player (click / TAB to switch).
   5C-2: each guest also gets a real operator. Guest sends its held keys/mouse/camera at 30 Hz (+ key/click events reliably); the host swaps
   keys/mouse/cam/G.me/G.cv/G.dc/G.arm/G.rf/G.prog to that player's copy, runs remoteTick(), swaps back. Host sends each guest a private 'own' state message.
   NOT yet: gadget world state, sound, per-guest operator pick, reconnect (see HANDOFF). */
(function(){
'use strict';
const SNAP_EVERY=3,TILE_EVERY=6,r1=v=>Math.round(v*10)/10;
const NP=window.NP={on:false,role:null,seq:0,follow:0,stats:{snapOut:0,snapIn:0,tilesIn:0,initIn:0,bytesOut:0}};
let ctxs={},pref={},ready={},left={},sentInit={},toks={},ghosts={},base=null,last=null,q={tr:[],ring:[],feed:[],dc:[]},hooked=null,tickN=0,bar=null,lastInit=null;
const ONL=()=>window.R6Online||{},NET=()=>ONL().net,ROLE=()=>ONL().role;
const has=()=>{const n=NET();return !!(n&&n.peers&&Object.keys(n.peers).length)};
const send=(d,rel)=>{const n=NET();if(!n)return 0;try{const s=JSON.stringify(d);NP.stats.bytesOut+=s.length;return n.broadcast(d,rel?undefined:{reliable:false})}catch(e){return 0}};
const copyMap=()=>map.map(r=>Uint8Array.from(r));
function diffTiles(ref){const c=[];for(let y=0;y<H;y++){const a=map[y],b=ref[y];for(let x=0;x<W;x++)if(a[x]!==b[x]){c.push(x,y,a[x]);b[x]=a[x]}}return c}
function opFor(side,bid){let i=OPS[side].findIndex(o=>o.id===bid);if(i<0)i=0;return getOp(side,i)}

/* static layer: buildMap() is NOT repeatable (it reads SITES/HOST left over from the previous round, and HOST is random), so the host ships its real tiles/furniture/windows */
function rle(a){const o=[];let v=a[0],n=0;for(let i=0;i<a.length;i++){if(a[i]===v&&n<65535)n++;else{o.push(v,n);v=a[i];n=1}}o.push(v,n);return o}
function unrle(o,a){let i=0;for(let k=0;k<o.length;k+=2)for(let n=0;n<o[k+1];n++)a[i++]=o[k]}
function layerOf(){const flat=new Uint8Array(W*H);for(let y=0;y<H;y++)flat.set(map[y],y*W);return{m:rle(flat),fk:rle(fk),fc:rle(fc),wf:rle(winF),S:SITES.map(q=>q.slice()),H:HOST.slice()}}
function applyLayer(l){const flat=new Uint8Array(W*H);unrle(l.m,flat);for(let y=0;y<H;y++){const r=map[y];for(let x=0;x<W;x++)r[x]=flat[y*W+x]}unrle(l.fk,fk);unrle(l.fc,fc);unrle(l.wf,winF);
  for(let i=0;i<SITES.length&&i<l.S.length;i++){SITES[i][0]=l.S[i][0];SITES[i][1]=l.S[i][1]}HOST[0]=l.H[0];HOST[1]=l.H[1];fcache={};wh.fill(100);for(let y=0;y<H;y++)for(let x=0;x<W;x++)drawTile(x,y);mver++}
/* ---- sound (5C-5a): sfx() has no position, so the functions that make noise are wrapped to remember WHERE the noise comes from; host queues
   [freq,dur,type,vol,x,y] and the guest plays it attenuated by distance to the entity it is playing/following ---- */
let SRC=null,sndQ=[],LAST=null; // LAST = where the most recent positioned event of THIS tick happened (gadget-tick sounds have no source of their own)
function wrapFn(n,pf){const o=window[n];if(typeof o!=='function'||o.__np)return;
  const w=function(){const prev=SRC;try{SRC=pf?pf.apply(null,arguments):null;if(SRC&&!SRC.g)LAST={x:SRC.x,y:SRC.y,t:tickN}}catch(e){SRC=null}try{return o.apply(this,arguments)}finally{SRC=prev}};w.__np=1;window[n]=w}
const E=e=>e&&typeof e.x==='number'?{x:e.x,y:e.y}:null,XY=(x,y)=>({x,y}),TT=(x,y)=>({x:x*T+8,y:y*T+8}),GL=()=>({g:1});
for(const[n,pf]of[['fire',E],['trace',E],['hurt',E],['throwNade',E],['gadget',E],['gadget2',E],['gadgetOld',E],['rapMove',E],['stairs',E],['navTo',E],['tickX',E],
   ['explode',XY],['wallDmg',TT],['breakBarr',TT],['putBarr',TT],['stepNade',E],['dronePower',E],['tagE',E],['startAct',GL],['objectives',GL],['rqOne',GL]])wrapFn(n,pf);
if(window.R6A){for(const n of['use','barBreak']){const o=R6A[n];if(typeof o==='function'&&!o.__np){R6A[n]=function(a){const prev=SRC;SRC=a&&typeof a.x==='number'?{x:a.x,y:a.y}:prev;try{return o.apply(this,arguments)}finally{SRC=prev}};R6A[n].__np=1}}}
{const _sfx=window.sfx;if(!_sfx.__np){const w=function(f,d,t,v){try{const sr=window.__sfxPos||SRC||(LAST&&LAST.t===tickN?LAST:null);if(NP.on&&NP.role==='host'&&sr&&sndQ.length<24)sndQ.push([f|0,+(+d).toFixed(2),t||'square',+(+(v||.04)).toFixed(3),sr.g?null:Math.round(sr.x),sr.g?null:Math.round(sr.y)])}catch(e){}return _sfx.apply(this,arguments)};w.__np=1;window.sfx=w}}
NP.silent=function(f,d,t,v,x,y){if(NP.on&&NP.role==='host'&&sndQ.length<24)sndQ.push([f|0,d,t,v,Math.round(x),Math.round(y)])}; // sound the host does not play (too far from the host's own operator) but a guest may hear
let boomQ=[];
{const _b=window.boom;if(typeof _b==='function'&&!_b.__np){const w=function(x,y,n,c){try{if(typeof x==='number')LAST={x,y,t:tickN};if(NP.on&&NP.role==='host'&&boomQ.length<10)boomQ.push([Math.round(x),Math.round(y),n|0,c||null])}catch(e){}return _b.apply(this,arguments)};w.__np=1;window.boom=w}}
function playBooms(list){if(!G||!G.guest||!list)return;const me=G.me;for(const a of list){const prev=G.shake||0;try{boom(a[0],a[1],a[2],a[3])}catch(e){}
  if(a[2]>=12){const d=me?Math.hypot(a[0]-me.x,a[1]-me.y):0;G.shake=Math.max(prev,a[2]/3*Math.max(0,1-d/500))}else G.shake=prev}}
const SND_RANGE=380;
function playSnd(list){if(!G||!G.guest||!list||!list.length)return;const me=G.me;let n=0;const seen={};
  for(const a of list){if(n>=8)break;const k=a[0]+'|'+a[4]+'|'+a[5];if(seen[k])continue;seen[k]=1;let att=.85;
    if(a[4]!==null&&me){const dx=a[4]-me.x,dy=a[5]-me.y,d=Math.sqrt(dx*dx+dy*dy);if(d>SND_RANGE)continue;att=Math.pow(1-d/SND_RANGE,1.5)}
    if(att<.04)continue;try{sfx(a[0],a[1],a[2],a[3]*att)}catch(e){}n++;NP.stats.sndPlayed=(NP.stats.sndPlayed||0)+1}}
/* ---------------- host ---------------- */
function wrapPush(arr,key){if(!arr)return;arr.push=function(){for(const v of arguments){q[key].push(v);if(v&&(key==='ring'||key==='tr')){if(typeof v.x==='number')LAST={x:v.x,y:v.y,t:tickN};else if(typeof v.x1==='number')LAST={x:v.x1,y:v.y1,t:tickN}}}return Array.prototype.push.apply(this,arguments)}}
let layer=null;
function initMsg(){const ents=G.ents.map(e=>[e.side,e.op.bid||String(e.op.id).split('_')[0],e.nm,e.x,e.y,e.a,e.gh?1:0]),rp=Object.keys(ctxs).map(id=>[id,G.ents.indexOf(ctxs[id].ent)]);
  return{t:'init',mi:uiSel.mapIdx||0,pr:PAIRN,mode:G.mode,side:G.side,rnd,sc:score.slice(),ents,rp,asite:G.asite,ly:layer,id:Date.now()}}
const bidOf=e=>e.op.bid||String(e.op.id).split('_')[0];
function swapOp(e,bid,L){const side=e.side,idx=OPS[side].findIndex(o=>o.id===bid);if(idx<0)return;if(bidOf(e)===bid&&!L)return;const old=bidOf(e);
  const other=G.ents.find(x=>x!==e&&x.side===side&&bidOf(x)===bid);
  const set=(t,b,L)=>{const i=OPS[side].findIndex(o=>o.id===b);if(i<0)return;const sp=uiSel.prim[b],ss=uiSel.sec[b];if(L){if(L.p)uiSel.prim[b]=L.p;if(L.s)uiSel.sec[b]=L.s}
    let f;try{f=mkEnt(side,getOp(side,i),!L,t.x,t.y,t.nm)}finally{if(L){uiSel.prim[b]=sp;uiSel.sec[b]=ss}}if(L&&L.g)t.rg2=L.g;
    Object.assign(t,f,{x:t.x,y:t.y,a:t.a,gh:t.gh,side:t.side,nm:t.nm,bot:t.bot,rp:t.rp,rpk:t.rpk})};
  set(e,bid,L);if(other&&other!==e&&other.bot&&old!==bid)set(other,old)}
NP.seat=function(){ // inside newRound(): give every connected guest a real (non-bot) operator slot, host's team first
  ctxs={};for(const k in ready)delete ready[k];if(ROLE()!=='host'||!has())return;
  const guests=(ONL().seats?ONL().seats():[]).filter(s=>!s.host&&NET()&&NET().peers[s.id]&&!left[s.id]);
  const hostEnt=G.ents.find(e=>!e.bot),mine=G.ents.filter(e=>e.side===G.side&&e!==hostEnt&&e.bot),theirs=G.ents.filter(e=>e.side!==G.side&&e.bot);
  const slots=mine.concat(theirs);
  guests.forEach((s,i)=>{const e=slots[i];if(!e)return;e.bot=false;e.rp=s.id;e.nm=String(s.n||'GUEST').slice(0,12).toUpperCase();e.rpk={};const want=pref[s.id]&&pref[s.id][e.side];if(want)swapOp(e,want,pref[s.id].L&&pref[s.id].L[e.side]);
    ctxs[s.id]={id:s.id,ent:e,keys:e.rpk,mouse:{x:0,y:0,down:false},cam:{x:0,y:0},cv:-1,dc:-1,arm:null,rf:null,prog:null,bm:0,bmf:0,ev:[],seen:0}})};
NP.round=function(){ // called at the end of newRound() on whoever runs the match
  if(ROLE()!=='host'){NP.on=false;return}
  ghosts={};  sentInit={};for(const s of(ONL().seats?ONL().seats():[]))sentInit[s.id]=1;
  for(const id in ctxs){const c=ctxs[id];c.dc=c.ent.side==='A'?G.drones.findIndex(d=>d.own===c.ent&&d.n===1):-1}
  NP.on=true;NP.role='host';base=copyMap();last=copyMap();q={tr:[],ring:[],feed:[],dc:[]};tickN=0;NP.seq=0;
  wrapPush(G.tr,'tr');wrapPush(G.ring,'ring');wrapPush(G.feed,'feed');wrapPush(G.decals,'dc');
  lastW='';lastEP=[];worldN=0;layer=layerOf();lastInit=initMsg();send(lastInit,true);NP.stats.initBytes=JSON.stringify(lastInit).length};
NP.tick=function(){ // called once per update() on the host
  if(!NP.on||NP.role!=='host'||!G||G.guest)return;tickN++;if(!has()){q={tr:[],ring:[],feed:[],dc:[]};return}
  if(tickN%TILE_EVERY===0){const c=diffTiles(last);if(c.length)send({t:'tiles',c},true)}
  if(tickN%SNAP_EVERY)return;
  const H_=G.hostage,s={t:'snap',n:++NP.seq,ph:G.phase,tm:G.t,msg:G.msg,sc:score,rf:G.reinf,br:G.barr,sh:G.shown?1:0,sn:sndQ.splice(0),sec:G.sec,res:G.res,et:G.endT,
   b:[G.bomb.prog,G.bomb.act?1:0],h:[r1(H_.x),r1(H_.y),H_.hp,G.ents.indexOf(H_.carrier)],
   e:G.ents.map(e=>[r1(e.x),r1(e.y),+e.a.toFixed(2),Math.round(e.hp),e.alive?1:0,+(e.mv||0).toFixed(1),e.sel,e.tag>0?1:0,e.gh?1:0,e.rev?1:0,e.blind>0?1:0,e.stun>0?1:0]),
   d:G.drones.map(d=>[r1(d.x),r1(d.y),+d.a.toFixed(2),Math.round(d.hp),d.alive?1:0,d.fly?1:0,d.n,G.ents.indexOf(d.own),d.hit|0]),
   c:G.cams.map(c=>[Math.round(c.hp),c.alive?1:0,+c.a.toFixed(2)]),
   tr:q.tr.map(t=>[r1(t.x1),r1(t.y1),r1(t.x2),r1(t.y2)]),dc:q.dc.slice(0,30).map(d=>[r1(d.x),r1(d.y),d.c,d.s]),bm:boomQ.splice(0),rg:q.ring.map(r=>[r1(r.x),r1(r.y),r.c]),fd:q.feed.map(f=>[f.s,f.c])};
  q={tr:[],ring:[],feed:[],dc:[]};send(s,false);sendOwn();if(tickN%(SNAP_EVERY*2)===0)sendWorld();NP.stats.snapOut++};
const SKIP={op:1,own:1,rx:1,post:1,wander:1,rpk:1,work:1,tk:1,fol:1,x:1,y:1,a:1,rp:1};
function prims(e){const o={};for(const k of Object.keys(e)){if(SKIP[k])continue;const v=e[k],t=typeof v;if(v===null||t==='number'||t==='string'||t==='boolean')o[k]=v;
  else if(t==='object'&&v){try{const j=JSON.stringify(v);if(j.length<300)o[k]=JSON.parse(j)}catch(x){}}}return o}
const FAKE={repeat:false,preventDefault(){}};
NP.runRemotes=function(){ // host, inside update(): run each remote player's own controls under their own input state
  for(const id in ctxs){const c=ctxs[id],e=c.ent;if(!e)continue;
    if(c.seen&&Date.now()-c.seen>800){for(const k in c.keys)delete c.keys[k];c.mouse.down=false;NP.stats.stale=(NP.stats.stale||0)+1}
    const msg0=G.msg,sv={me:G.me,keys,mouse,cam,cv:G.cv,dc:G.dc,arm:G.arm,rf:G.rf,prog:G.prog,bm:G.bm,bmf:G.bmf};
    G.me=e;keys=c.keys;mouse=c.mouse;cam=c.cam;G.cv=c.cv;G.dc=c.dc;G.arm=c.arm;G.rf=c.rf;G.prog=c.prog;G.bm=c.bm;G.bmf=c.bmf;
    try{
      while(c.ev.length){const v=c.ev.shift();if(!e.alive)continue;
        if(v.k!==undefined){if(v.k!=='escape'&&v.k!=='p')keyAct(v.k,FAKE)}
        else if(v.m===0){mouseLA();if(!((G.cv>=0||DRN())&&inExit()))mouse.down=true;else{exitView();mouse.down=false}}
        else if(v.m===2)mouseR()}
      remoteTick(e)}catch(x){NP.err=String(x&&x.stack||x)}
    c.cv=G.cv;c.dc=G.dc;c.arm=G.arm;c.rf=G.rf;c.prog=G.prog;c.bm=G.bm;c.bmf=G.bmf;
    if(G.msg!==msg0){c.gm=G.msg;c.gmN=(c.gmN||0)+1;G.msg=msg0}
    G.me=sv.me;keys=sv.keys;mouse=sv.mouse;cam=sv.cam;G.cv=sv.cv;G.dc=sv.dc;G.arm=sv.arm;G.rf=sv.rf;G.prog=sv.prog;G.bm=sv.bm;G.bmf=sv.bmf}};
function sendOwn(){const n=NET();if(!n)return;for(const id in ctxs){const c=ctxs[id];let arm=null;try{arm=c.arm?JSON.parse(JSON.stringify(c.arm)):null}catch(x){}
  n.send(id,{t:'own',n:NP.seq,gm:c.gmN?c.gm:undefined,gn:c.gmN|0,q:c.q|0,x:+c.ent.x.toFixed(2),y:+c.ent.y.toFixed(2),p:prims(c.ent),cv:c.cv,dc:c.dc,arm,rf:c.rf,pg:c.prog},{reliable:false})}}
NP._toks=()=>toks;NP._snd=()=>sndQ;
NP.sendInitTo=function(id,noInit){const n=NET();if(!n||!lastInit||!G||!base)return;if(!noInit)n.send(id,lastInit);if(G.decals&&G.decals.length)n.send(id,{t:'decals',d:G.decals.slice(-500).map(d=>[r1(d.x),r1(d.y),d.c,d.s])});
  const full=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map[y][x]!==base[y][x])full.push(x,y,map[y][x]);if(full.length)n.send(id,{t:'tiles',c:full})};

/* ---- world state (5C-3): G.traps/smokes/charges/nades/pings, dynamic cams, all abilities.js arrays (R6A.st()), changed per-entity fields ---- */
let lastW='',lastWt=0,lastEP=[],worldN=0;
const WSKIP={op:1,g:1,fn:1,fol:1,tk:1};
function mkIdx(){const m=a=>{const x=new Map();a.forEach((v,i)=>x.set(v,i));return x};return{e:m(G.ents),d:m(G.drones),c:m(G.cams)}}
function ser(v,d,ix){if(v===null)return null;const t=typeof v;if(t==='number')return isFinite(v)?Math.round(v*100)/100:0;if(t==='string'||t==='boolean')return v;if(t!=='object'||v.nodeType)return undefined;
  let i;if((i=ix.e.get(v))!==undefined)return{$e:i};if((i=ix.d.get(v))!==undefined)return{$d:i};if((i=ix.c.get(v))!==undefined)return{$c:i};if(d>3)return undefined;
  if(Array.isArray(v))return v.slice(0,200).map(x=>{const r=ser(x,d+1,ix);return r===undefined?null:r});
  const o={};for(const k in v){if(WSKIP[k])continue;const r=ser(v[k],d+1,ix);if(r!==undefined)o[k]=r}return o}
function de(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(de);
  if(v.$e!==undefined)return G.ents[v.$e]||null;if(v.$d!==undefined)return G.drones[v.$d]||null;if(v.$c!==undefined)return G.cams[v.$c]||null;
  const o={};for(const k in v)o[k]=de(v[k]);return o}
const EPSKIP={wt:1,ic:1,oc:1,lx:1,ly:1,mvd:1,dre:1,reactT:1,ph:1,hp:1,alive:1,mv:1,sel:1,tag:1,gh:1,rev:1,blind:1,stun:1,tx:1,ty:1,ta:1};
function worldMsg(){const ix=mkIdx(),w={tr:ser(G.traps,0,ix),sm:ser(G.smokes,0,ix),ch:ser(G.charges,0,ix),nd:ser(G.nades,0,ix),pg:ser(G.pings,0,ix),
  dc:G.cams.filter(c=>c.dyn).map(c=>{const o={};for(const k in c){if(WSKIP[k])continue;const r=ser(c[k],1,ix);if(r!==undefined)o[k]=r}return o}),bc:CAMTILES.length};
  const S=window.R6A&&R6A.st&&R6A.st();if(S){w.S={};for(const k in S)if(k!=='g'){const r=ser(S[k],0,ix);if(r!==undefined)w.S[k]=r}}
  const ep=[];G.ents.forEach((e,i)=>{const p=prims(e),prev=lastEP[i]||(lastEP[i]={}),ch={};let n=0;
    for(const k in p){if(EPSKIP[k])continue;const j=JSON.stringify(p[k]);if(prev[k]!==j){prev[k]=j;ch[k]=p[k];n++}}if(n)ep.push([i,ch])});
  return{w,ep}}
NP._w=()=>worldMsg();
function sendWorld(){const{w,ep}=worldMsg(),j=JSON.stringify(w),now=Date.now();
  if(j===lastW&&now-lastWt<1000&&!ep.length)return;lastW=j;lastWt=now;send({t:'world',n:++worldN,w,ep},false);NP.stats.worldOut=(NP.stats.worldOut||0)+1}
function applyWorld(m){if(!G||!G.guest||m.n<=(NP.worldN||0))return;NP.worldN=m.n;NP.stats.worldIn=(NP.stats.worldIn||0)+1;const w=m.w;
  for(const[i,ch]of m.ep||[]){const e=G.ents[i];if(!e||i===NP.self)continue;for(const k in ch)e[k]=ch[k]}
  const fill=(arr,src)=>{arr.length=0;for(const x of src||[])arr.push(de(x))};
  G.cams.length=w.bc;for(const c of de(w.dc||[]))G.cams.push(c);
  fill(G.traps,w.tr);fill(G.smokes,w.sm);fill(G.charges,w.ch);fill(G.nades,w.nd);fill(G.pings,w.pg);
  const S=window.R6A&&R6A.st&&R6A.st();if(S&&w.S)for(const k in w.S){if(Array.isArray(w.S[k])){if(!Array.isArray(S[k]))S[k]=[];fill(S[k],w.S[k])}else S[k]=de(w.S[k])}}

NP.matchEnd=function(){ // host, when the match is decided: give every guest the stats table so it can be paid like single player
  const n=NET();if(!n||ROLE()!=='host'||!G||G.guest)return;const ci={A:0,D:0},key=new Map();for(const e of G.ents){const i=ci[e.side]++;key.set(e,(e.side===G.side?'T':'E')+i)}
  const rows=Object.keys(MS).map(k=>[k,{team:MS[k].team,op:MS[k].op,sc:MS[k].sc,kl:MS[k].kl,dd:MS[k].dd}]);
  for(const id in ctxs){const c=ctxs[id];n.send(id,{t:'mstats',rows,you:key.get(c.ent)||''});NP.stats.mstatsOut=(NP.stats.mstatsOut||0)+1}};
function leaveGuest(id,why){delete pref[id];delete ready[id];left[id]=1;const c=ctxs[id];if(!c||!G||G.guest)return;const e=c.ent;
  if(e&&toks[id])ghosts[toks[id]]={ent:e,nm:e.nm,t:Date.now()};
  if(e){e.bot=true;delete e.rp;delete e.rpk;e.nm=String(e.nm).slice(0,8)+' BOT';if(G.feed)G.feed.push({t:360,s:String(e.nm)+' - '+why,c:'#ff5a4a'})}delete ctxs[id]}
function reseat(id,e,nm){e.bot=false;e.rp=id;e.rpk={};e.nm=nm;delete left[id];
  ctxs[id]={id,ent:e,keys:e.rpk,mouse:{x:0,y:0,down:false},cam:{x:0,y:0},cv:-1,dc:-1,arm:null,rf:null,prog:null,bm:0,bmf:0,ev:[],seen:0};
  const n=NET();sentInit[id]=1;if(n){lastInit=initMsg();n.send(id,lastInit);NP.sendInitTo(id,true)}
  if(G.feed)G.feed.push({t:360,s:nm+' - REJOINED',c:'#6aff9a'});NP.stats.reseat=(NP.stats.reseat||0)+1}
function hostHooks(n){n.on('close',id=>{if(ROLE()==='host'||NP.role==='host')leaveGuest(id,'LEFT')})}
setInterval(()=>{if(ROLE()!=='host'||!NP.on||!G||G.guest)return;for(const s of(ONL().seats?ONL().seats():[])){if(s.host||sentInit[s.id]||!NET()||!NET().peers[s.id])continue;sentInit[s.id]=1;NP.sendInitTo(s.id);NP.stats.lateJoin=(NP.stats.lateJoin||0)+1}},500);
/* ---------------- guest ---------------- */
function barEl(){if(bar)return bar;bar=document.createElement('div');bar.id='npBar';
  bar.style.cssText='position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:30;padding:5px 14px;background:rgba(10,12,16,.82);border:1px solid #e5303a;color:#e8e8ee;font:11px Silkscreen,monospace;letter-spacing:2px;pointer-events:none;display:none;white-space:nowrap';document.body.appendChild(bar);return bar}
function initGuest(m){NP.stats.initIn++;NP.overFor=null;{const o=document.getElementById('over');if(o)o.style.display='none'}NP.lastSnapAt=Date.now();NP.pickMode=false;document.body.classList.remove('npPick');NP.on=true;NP.role='client';NP.follow=0;NP.snapN=0;NP.worldN=0;NP.privMsg=null;NP.hostMsg=null;NP.gmN=0;
  uiSel.mapIdx=m.mi;uiSel.mode=m.mode;uiSel.side=m.side;setMap(m.mi,m.pr);buildMap();resolveSpawns();if(m.ly)applyLayer(m.ly);fcache={};score=m.sc.slice();rnd=m.rnd;
  G={mode:m.mode,side:m.side,phase:'prep',t:2700,rq:[],cams:CAMTILES.map(c=>({x:c[0]*T+8,y:(c[1]+1)*T+3,wy:c[1]*T,a:PI/2,hp:40,alive:1})),cv:-1,pings:[],ents:[],decals:[],nades:[],shake:0,traps:[],smokes:[],charges:[],fx:[],tr:[],ring:[],feed:[],reinf:0,drones:[],dc:-1,
   bomb:{prog:0,act:0,x:SITES[0][0],y:SITES[0][1]},hostage:{x:HOST[0],y:HOST[1],hp:100,carrier:null},sec:0,msg:'',endT:0,res:null,guest:1,barr:0,bq:[],asite:m.asite};
  for(const a of m.ents){const e=mkEnt(a[0],opFor(a[0],a[1]),true,a[3],a[4],a[2]);e.a=a[5];e.gh=a[6];e.tx=a[3];e.ty=a[4];e.ta=a[5];e.ph=0;G.ents.push(e)}
  NP.self=-1;const you=ONL().you,mine=(m.rp||[]).find(r=>r[0]===you);if(mine)NP.self=mine[1];
  for(const r of m.rp||[]){const e=G.ents[r[1]];if(e){e.bot=false;e.rp=r[0]}}
  G.me=NP.self>=0?G.ents[NP.self]:G.ents[0];G.dc=-1;G.drones.length=0;NP.ownN=0;
  for(const id of['menu','load','over','pause'])document.getElementById(id).style.display='none';PAUSED=false;try{musicStop()}catch(e){}
  const b=barEl();b.style.display=NP.self>=0?'none':'block';NP.paintBar()}
NP.paintBar=function(){if(!bar||!G||!G.guest)return;const e=G.me,own=NP.self>=0&&G.ents[NP.self];bar.style.display=own&&own.alive?'none':'block';bar.textContent=(own?'YOU ARE DOWN - ':'')+'SPECTATING  '+(e?e.nm+' ('+(e.side==='A'?'ATK':'DEF')+')':'')+'   CLICK / TAB = NEXT PLAYER'};
function applySnap(s){
  if(!G||!G.guest||s.n<=NP.snapN)return;NP.snapN=s.n;NP.stats.snapIn++;
  G.phase=s.ph;G.t=s.tm;if(s.msg!==NP.hostMsg){NP.hostMsg=s.msg;NP.privMsg=null}G.msg=NP.privMsg!=null?NP.privMsg:s.msg;score=s.sc;G.reinf=s.rf;G.barr=s.br;G.sec=s.sec;G.res=s.res;G.endT=s.et;G.shown=s.sh;NP.lastSnapAt=Date.now();G.bomb.prog=s.b[0];G.bomb.act=s.b[1];
  G.hostage.x=s.h[0];G.hostage.y=s.h[1];G.hostage.hp=s.h[2];G.hostage.carrier=s.h[3]>=0?G.ents[s.h[3]]||null:null;
  s.e.forEach((a,i)=>{const e=G.ents[i];if(!e)return;e.tx=a[0];e.ty=a[1];e.ta=a[2];e.hp=a[3];e.alive=a[4];e.mv=a[5];e.sel=a[6];e.tag=a[7]?30:0;e.gh=a[8];e.rev=a[9];e.blind=a[10]?30:0;e.stun=a[11]?30:0;if(!e.alive)e.hp=0});
  while(G.drones.length<s.d.length){const a=s.d[G.drones.length],o=G.ents[a[7]]||G.ents[0],d=mkDrone(o,a[6],a[5]);if(!d)break;G.drones.push(d)}
  s.d.forEach((a,i)=>{const d=G.drones[i];if(!d)return;d.x=a[0];d.y=a[1];d.a=a[2];d.hp=a[3];d.alive=a[4];d.hit=a[8]});
  s.c.forEach((a,i)=>{const c=G.cams[i];if(c){c.hp=a[0];c.alive=a[1];c.a=a[2]}});
  for(const d of s.dc||[])G.decals.push({x:d[0],y:d[1],c:d[2],s:d[3]});for(const t of s.tr)G.tr.push({x1:t[0],y1:t[1],x2:t[2],y2:t[3],t:3,pl:false});for(const r of s.rg)G.ring.push({x:r[0],y:r[1],r:2,c:r[2]});for(const f of s.fd)G.feed.push({t:360,s:f[0],c:f[1]});
  const own=NP.self>=0&&G.ents[NP.self];if(own&&own.alive)G.me=own;else if(!G.me||!G.me.alive)NP.next(true);NP.paintBar()}
function applyOwn(m){if(!G||!G.guest||NP.self<0||m.n<=NP.ownN)return;NP.ownN=m.n;if(m.gn&&m.gn!==NP.gmN){NP.gmN=m.gn;NP.privMsg=m.gm;G.msg=m.gm}const e=G.ents[NP.self];if(!e)return;for(const k in m.p)if(k!=='alive'||true)e[k]=m.p[k];e.tx=e.tx;G.cv=m.cv;G.dc=m.dc;G.arm=m.arm;G.rf=m.rf;G.prog=m.pg;if(m.x!==undefined){e.tx=m.x;e.ty=m.y}reconcile(m,e);NP.stats.ownIn=(NP.stats.ownIn||0)+1}
NP.next=function(auto){if(!G||!G.guest)return;const n=G.ents.length;if(!n)return;let i=G.ents.indexOf(G.me),tries=0;
  const own=NP.self>=0&&G.ents[NP.self],mates=own?G.ents.some(o=>o.alive&&o.side===own.side):false;
  const pass=o=>o.alive&&(!own||!mates||o.side===own.side); // a downed player watches TEAMMATES only (no peeking through enemy eyes); with no seat (late joiner) or no teammate left anything goes
  do{i=(i+1)%n;tries++}while(tries<=n&&!pass(G.ents[i]));G.me=G.ents[i];NP.paintBar()};
const playing=()=>NP.self>=0&&G&&G.guest&&G.ents[NP.self]&&G.ents[NP.self].alive;
const toHost=(d,rel)=>{const n=NET();if(n)n.send('host',d,rel?undefined:{reliable:false})};
/* ---- client-side prediction of the guest's own walking (5C-5b): same moveEnt() + speed rules as the host, reconciled against the host's
   position for the SAME input sequence number (input history), so latency does not cause rubber-banding ---- */
let hist=[],pacc=0,pLast=0,wasPred=false;NP.predict=true;
function canPredict(){const me=NP.self>=0&&G&&G.guest&&G.ents[NP.self];return !!(NP.predict&&me&&me.alive&&G.me===me&&G.dc<0&&G.cv<0&&!me.lock&&!me.rps&&me.stun<=0&&(G.phase==='act'||me.side==='D')&&!$$('over').style.display.match(/flex/))}
function predictTick(me){let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0);const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
  const sp=PACE*me.op.sp*(me.spr?SPRINT:keys.alt?.5:1)*(me.slow>0?.4:1)*(G.hostage.carrier===me?.8:1);moveEnt(me,dx*sp,dy*sp)}
function predictFrame(){const me=G.ents[NP.self],now=performance.now();
  if(!canPredict()){wasPred=false;hist.length=0;pLast=now;return false}
  if(!wasPred){wasPred=true;if(me.tx!==undefined){me.x=me.tx;me.y=me.ty}pLast=now;pacc=0}
  pacc+=Math.min(100,now-pLast)/16.667;pLast=now;let n=0;while(pacc>=1&&n<6){predictTick(me);pacc--;n++}
  if(mouse&&cam)me.a=Math.atan2(mouse.y+cam.y-EY(me),mouse.x+cam.x-EX(me));return true}
function reconcile(m,e){if(!wasPred||m.q===undefined||m.x===undefined)return;const i=hist.findIndex(h=>h[0]===m.q);if(i<0)return;const h=hist[i],ex=m.x-h[1],ey=m.y-h[2],d=Math.hypot(ex,ey);hist.splice(0,i+1);
  const k=d>40?1:d>2.5?.3:.12,cx=ex*k,cy=ey*k;e.x+=cx;e.y+=cy;for(const hh of hist){hh[1]+=cx;hh[2]+=cy}NP.stats.recon=(NP.stats.recon||0)+1;NP.lastErr=d}
NP.key=function(k,ev){if(playing()){if(k==='m'&&!ev.repeat){G.bm=G.bm?0:1;G.bmf=G.me.y>=OY*T?1:0;return}if(k==='tab'){ev.preventDefault();if(G.bm)G.bmf^=1;return}
   if(k===' ')ev.preventDefault();if(!ev.repeat)toHost({t:'ev',k},1);return}
  if(k==='tab'||k==='n'){ev.preventDefault();NP.next()}};
NP.click=function(b){if(playing()){toHost({t:'ev',m:b|0},1);return}if(!b)NP.next()};
setInterval(()=>{if(!playing()||NP.drop)return;const idle=PAUSED||document.hidden||NP.mute,h=[];if(!idle)for(const k in keys)if(keys[k])h.push(k);const q=(NP.inSeq=((NP.inSeq||0)+1)%65000),me=G.ents[NP.self];if(wasPred&&me){hist.push([q,me.x,me.y]);if(hist.length>150)hist.shift()}
  toHost({t:'in',q,k:h,x:+mouse.x.toFixed(1),y:+mouse.y.toFixed(1),d:(!idle&&mouse.down)?1:0,cx:+cam.x.toFixed(1),cy:+cam.y.toFixed(1)},0)},33);
NP.step=function(){ // runs instead of update() on a guest, once per frame
  if(!G||!G.guest)return;if(G.shown)guestOver();
  const predicting=predictFrame();
  for(const e of G.ents){if(e.tx===undefined)continue;if(predicting&&e===G.ents[NP.self]){if(e.mv>.1)e.ph=(e.ph||0)+.2;continue}const dx=e.tx-e.x,dy=e.ty-e.y;if(dx*dx+dy*dy>60*60){e.x=e.tx;e.y=e.ty}else{e.x+=dx*.4;e.y+=dy*.4}e.a+=Math.atan2(Math.sin(e.ta-e.a),Math.cos(e.ta-e.a))*.5;if(e.mv>.1)e.ph=(e.ph||0)+.2}
  try{updFx()}catch(e){}for(const d of G.drones){d.roll+=.1}
  if(G.shake>0)G.shake--;
  if(bar&&((NP.pb=(NP.pb||0)+1)%30===0))NP.paintBar()};

/* ---- guest operator pick (5C-4a): host presses START -> guests get the real operator screen with READY instead of DEPLOY ---- */
NP.pick={A:null,D:null};NP.pickMode=false;
const $$=id=>document.getElementById(id);
(function(){const st=document.createElement('style');st.textContent='body.npPick .depl{display:none!important}#npSide{margin-right:10px}';document.head.appendChild(st);
  const b=document.createElement('button');b.className='mini';b.id='npSide';b.style.display='none';const top=$$('opT')&&$$('opT').parentNode;if(top)top.insertBefore(b,$$('opT'));
  b.onclick=()=>{NP.pick[uiSel.side]=OPS[uiSel.side][uiSel.op].id;uiSel.side=uiSel.side==='A'?'D':'A';const i=OPS[uiSel.side].findIndex(o=>o.id===NP.pick[uiSel.side]);uiSel.op=i>=0?i:0;paintSide();renderOps()};
  const dep=$$('deploy');if(dep)dep.addEventListener('click',e=>{if(!NP.pickMode)return;e.stopImmediatePropagation();e.preventDefault();
    NP.pick[uiSel.side]=OPS[uiSel.side][uiSel.op].id;toHost({t:'pick',A:NP.pick.A,D:NP.pick.D,L:{A:loadoutOf('A'),D:loadoutOf('D')}},1);NP.pickMode=false;leavePick();
    const m=document.getElementById('lMsg');if(m)m.textContent='Operator locked in - waiting for the host to deploy';},true)})();
function loadoutOf(side){const id=NP.pick[side],i=OPS[side].findIndex(o=>o.id===id);if(i<0)return null;const o=getOp(side,i);return{p:o.w,s:o.sec,g:(uiSel.g2&&uiSel.g2[id])||G2[side][0]}}
function paintSide(){const b=$$('npSide');if(b)b.textContent='PICKING FOR: '+(uiSel.side==='A'?'ATTACK':'DEFENCE')+'  (CLICK = SWITCH)'}
function leavePick(){document.body.classList.remove('npPick');const b=$$('npSide');if(b)b.style.display='none';const d=$$('deploy');if(d)d.innerHTML='DEPLOY &#9656;';showScr('main')}
(function(){const bk=$$('back');if(bk)bk.addEventListener('click',()=>{if(NP.pickMode){NP.pickMode=false;document.body.classList.remove('npPick');const b=$$('npSide');if(b)b.style.display='none';const d=$$('deploy');if(d)d.innerHTML='DEPLOY &#9656;'}},true)})();
function enterPick(m,force){if(ROLE()!=='client'||(G&&G.guest&&!force))return;NP.pickMode=true;uiSel.mode=m.mode||uiSel.mode;uiSel.mapIdx=typeof m.map==='number'?m.map:0;uiSel.between=0;
  uiSel.side=uiSel.side==='D'?'D':'A';const i=OPS[uiSel.side].findIndex(o=>o.id===NP.pick[uiSel.side]);uiSel.op=i>=0?i:Math.max(0,uiSel.op|0);
  document.body.classList.add('npPick');$$('menu').style.display='';showScr('ops');const b=$$('npSide');if(b)b.style.display='';paintSide();const d=$$('deploy');if(d)d.innerHTML='READY &#9656;';
  const bk=$$('back');if(bk)bk.innerHTML='&#9666; CANCEL'}
ONL().onStart=m=>{if(ROLE()==='client')enterPick(m)};

/* ---- round flow (5C-4b) ---- */
function guestPay(){if(NP.paid||!NP.mstats||!NP.matchOver)return;NP.paid=1;const mo=NP.matchOver,rows=NP.mstats.rows.map(([k,r])=>Object.assign({},r,{you:k===NP.mstats.you}));
  try{window.R6Acct&&R6Acct.match(mo.mw)}catch(_){}try{if(window.ECO)ECO.matchEnd({won:mo.mw,rows,my:mo.my,their:mo.their})}catch(_){}}
function guestOver(){const ov=$$('over');const key=rnd+'|'+(G&&G.res?G.res.w+'|'+G.res.why:'');if(!G||!G.guest||!G.res||NP.overFor===key)return;NP.overFor=key;
  const own=NP.self>=0&&G.ents[NP.self]?G.ents[NP.self].side:G.side,i=own==='A'?0:1,mw=score[i]>=3,ml=score[1-i]>=3,won=G.res.w===own;
  $$('ot').textContent=mw?'MATCH WON':ml?'MATCH LOST':(won?'ROUND WON':'ROUND LOST');$$('ot').style.color=won?'#6aff9a':'#ff5a4a';
  $$('os').textContent=G.res.why+'  |  ATK '+score[0]+' - '+score[1]+' DEF  |  BEST OF 5, FIRST TO 3';
  const b=$$('ob'),nxt=own==='A'?'D':'A',mode=G.mode,mapi=uiSel.mapIdx;b.textContent=(mw||ml)?'MAIN MENU':'NEXT ROUND: PICK OPERATOR ('+(nxt==='A'?'ATTACK':'DEFENCE')+')';
  b.onclick=()=>{ov.style.display='none';NP.overFor=null;G=null;if(mw||ml){NP.on=false;NP.paid=false;NP.mstats=null;NP.matchOver=null;score=[0,0];rnd=1;toMenu();return}
    rnd++;uiSel.side=nxt;uiSel.mapIdx=mapi;$$('menu').style.display='block';enterPick({mode,map:mapi},1)};
  try{const me=NP.self>=0&&G.ents[NP.self];if(me&&window.R6Acct)R6Acct.round({me,side:me.side},G.res.w)}catch(_){}
  if(mw||ml){NP.matchOver={mw,ml,my:score[i],their:score[1-i]};guestPay()}else{try{window.ECO&&ECO.clearRewards()}catch(_){}}
  ov.style.display='flex'}
// host: show who is ready on the operator screen, and soft-gate DEPLOY
(function(){const d=document.createElement('div');d.id='npReady';d.style.cssText='position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:40;padding:5px 14px;background:rgba(10,12,16,.85);border:1px solid #e5303a;color:#e8e8ee;font:11px Silkscreen,monospace;letter-spacing:2px;display:none';document.body.appendChild(d);
  const guests=()=>ROLE()==='host'?(ONL().seats?ONL().seats():[]).filter(s=>!s.host&&NET()&&NET().peers[s.id]):[];
  NP.readyInfo=()=>{const g=guests();return{n:g.length,r:g.filter(s=>ready[s.id]).length}};
  setInterval(()=>{const ops=$$('scrOps'),show=ROLE()==='host'&&ops&&ops.style.display!=='none'&&!NP.pickMode&&guests().length&&(!G||!G.guest);
    if(!show){d.style.display='none';return}const i=NP.readyInfo();d.style.display='block';
    d.textContent='GUESTS READY '+i.r+'/'+i.n+(i.r<i.n?'  -  CLICK DEPLOY AGAIN TO GO ANYWAY':'')},400);
  const dep=$$('deploy');if(dep)dep.addEventListener('click',e=>{if(ROLE()!=='host'||NP.pickMode||!e.isTrusted)return;const i=NP.readyInfo();if(!i.n||i.r>=i.n)return;
    if(Date.now()<(NP.force||0))return;NP.force=Date.now()+5000;e.stopImmediatePropagation();e.preventDefault()},true)})();
// guest: notice a silent host
setInterval(()=>{if(!bar||!G||!G.guest||!NP.lastSnapAt)return;const quiet=Date.now()-NP.lastSnapAt>4000&&!NP.overFor;
  if(quiet){bar.style.display='block';bar.textContent='WAITING FOR THE HOST...'}else if(NP.wasQuiet)NP.paintBar();NP.wasQuiet=quiet},1000);

function hostEnded(text){const ov=$$('over');NP.pickMode=false;document.body.classList.remove('npPick');const nb=$$('npSide');if(nb)nb.style.display='none';const d=$$('deploy');if(d)d.innerHTML='DEPLOY &#9656;';
  if(G&&G.guest){$$('ot').textContent=text;$$('ot').style.color='#ff5a4a';$$('os').textContent='';const b=$$('ob');b.textContent='MAIN MENU';NP.overFor='ended';
    b.onclick=()=>{ov.style.display='none';NP.overFor=null;G=null;NP.on=false;score=[0,0];rnd=1;toMenu()};ov.style.display='flex'}
  else if($$('scrOps').style.display!=='none'){showScr('main')}
  const m=document.getElementById('lMsg');if(m)m.textContent=text}
{const _tm=toMenu;toMenu=function(){try{if(G&&G.guest&&ROLE()==='client')toHost({t:'bye'},1);else if(ROLE()==='host'&&NP.on)send({t:'end'},true)}catch(e){}NP.on=false;return _tm.apply(this,arguments)}}
/* ---------------- wiring ---------------- */
function onMsg(from,m){if(!m||typeof m!=='object')return;
  if(ROLE()==='host'&&m.t==='bye'){leaveGuest(from,'LEFT');return}
  if(ROLE()==='host'&&m.t==='tok'&&typeof m.tok==='string'&&m.tok.length<40){toks[from]=m.tok;const gh=ghosts[m.tok];
    if(gh&&NP.on&&G&&!G.guest&&G.ents.includes(gh.ent)&&gh.ent.alive&&gh.ent.bot&&!ctxs[from]&&G.phase!=='end'){delete ghosts[m.tok];reseat(from,gh.ent,gh.nm)}return}
  if(ROLE()==='host'&&m.t==='pick'){const p={};for(const sd of['A','D'])if(typeof m[sd]==='string'&&OPS[sd].some(o=>o.id===m[sd]))p[sd]=m[sd];if(m.L&&typeof m.L==='object'){p.L={};for(const sd of['A','D']){const l=m.L[sd],b=p[sd]&&OPS[sd].find(o=>o.id===p[sd]);if(l&&b&&typeof l==='object')p.L[sd]={p:b.pw.includes(l.p)?l.p:null,s:b.sw.includes(l.s)?l.s:null,g:G2[sd].includes(l.g)?l.g:null}}}delete left[from];pref[from]=p;ready[from]=1;NP.stats.picks=(NP.stats.picks||0)+1;return}
  if(ROLE()==='host'){const c=ctxs[from];if(!c)return;
   if(m.t==='in'&&Array.isArray(m.k)){const k={};for(const n of m.k.slice(0,20))if(typeof n==='string'&&n.length<12)k[n]=true;
     for(const n in c.keys)delete c.keys[n];Object.assign(c.keys,k);c.mouse.x=+m.x||0;c.mouse.y=+m.y||0;c.mouse.down=!!m.d;c.cam.x=+m.cx||0;c.cam.y=+m.cy||0;c.q=m.q|0;c.seen=Date.now()}
   else if(m.t==='ev'&&c.ev.length<30){if(typeof m.k==='string'&&m.k.length<12)c.ev.push({k:m.k});else if(m.m===0||m.m===2)c.ev.push({m:m.m})}
   return}
  if(ROLE()==='client'&&from==='host'){
   if(m.t==='init'){try{initGuest(m)}catch(e){NP.err=String(e&&e.stack||e);console.error('netplay init failed',NP.err)}}else if(m.t==='tiles'&&G&&G.guest){NP.stats.tilesIn++;for(let i=0;i<m.c.length;i+=3)if(map[m.c[i+1]]&&map[m.c[i+1]][m.c[i]]!==m.c[i+2])setTile(m.c[i],m.c[i+1],m.c[i+2])}
   else if(m.t==='end')hostEnded('HOST ENDED THE MATCH');else if(m.t==='snap'){applySnap(m);if(m.sn&&m.sn.length)playSnd(m.sn);if(m.bm&&m.bm.length)playBooms(m.bm)}else if(m.t==='own')applyOwn(m);else if(m.t==='mstats'&&Array.isArray(m.rows)){NP.mstats={rows:m.rows.slice(0,12),you:String(m.you||'')};guestPay()}else if(m.t==='decals'&&G&&G.guest){for(const d of m.d)G.decals.push({x:d[0],y:d[1],c:d[2],s:d[3]})}else if(m.t==='world')applyWorld(m)}}
NP.leave=function(){NP.on=false;if(bar)bar.style.display='none'};
setInterval(()=>{const n=NET();if(n&&ROLE()==='client'&&NP.tokFor!==n){let t='';try{t=localStorage.getItem('r6s_tok')||'';if(!t){t=Math.random().toString(36).slice(2,12)+Date.now().toString(36);localStorage.setItem('r6s_tok',t)}}catch(e){t='t'+Math.random().toString(36).slice(2,12)}
  if(n.send('host',{t:'tok',tok:t}))NP.tokFor=n}
  if(n&&hooked!==n){hooked=n;n.on('message',onMsg);hostHooks(n);n.on('close',id=>{if(id==='host')hostEnded('HOST DISCONNECTED')})}
  if(bar&&(!G||!G.guest))bar.style.display='none'},500);
})();
