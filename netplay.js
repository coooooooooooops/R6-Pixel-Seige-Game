/* netplay.js - ONLINE MATCH SYNC, step 5C-1 (live mirror + spectate).
   Host runs the real match (update()). Every 3 ticks it broadcasts a compact snapshot on the unreliable channel; tile changes
   (broken walls, reinforcements, barricades) go on the reliable channel. Guests rebuild the same map from (mapIdx, pair),
   never run update(), and render the snapshot. Guests follow a player (click / TAB to switch).
   NOT in this step: guests controlling their own operator, gadget/trap/smoke state, sound, reconnect (see HANDOFF checkpoint 41). */
(function(){
'use strict';
const SNAP_EVERY=3,TILE_EVERY=6,r1=v=>Math.round(v*10)/10;
const NP=window.NP={on:false,role:null,seq:0,follow:0,stats:{snapOut:0,snapIn:0,tilesIn:0,initIn:0,bytesOut:0}};
let base=null,last=null,q={tr:[],ring:[],feed:[]},hooked=null,tickN=0,bar=null,lastInit=null;
const ONL=()=>window.R6Online||{},NET=()=>ONL().net,ROLE=()=>ONL().role;
const has=()=>{const n=NET();return !!(n&&n.peers&&Object.keys(n.peers).length)};
const send=(d,rel)=>{const n=NET();if(!n)return 0;try{const s=JSON.stringify(d);NP.stats.bytesOut+=s.length;return n.broadcast(d,rel?undefined:{reliable:false})}catch(e){return 0}};
const copyMap=()=>map.map(r=>Uint8Array.from(r));
function diffTiles(ref){const c=[];for(let y=0;y<H;y++){const a=map[y],b=ref[y];for(let x=0;x<W;x++)if(a[x]!==b[x]){c.push(x,y,a[x]);b[x]=a[x]}}return c}
function opFor(side,bid){let i=OPS[side].findIndex(o=>o.id===bid);if(i<0)i=0;return getOp(side,i)}

/* ---------------- host ---------------- */
function wrapPush(arr,key){if(!arr)return;arr.push=function(){for(const v of arguments)q[key].push(v);return Array.prototype.push.apply(this,arguments)}}
function initMsg(){const ents=G.ents.map(e=>[e.side,e.op.bid||String(e.op.id).split('_')[0],e.nm,e.x,e.y,e.a,e.gh?1:0]);
  return{t:'init',mi:uiSel.mapIdx||0,pr:PAIRN,mode:G.mode,side:G.side,rnd,sc:score.slice(),ents,asite:G.asite,id:Date.now()}}
NP.round=function(){ // called at the end of newRound() on whoever runs the match
  if(ROLE()!=='host'||!has()){NP.on=false;return}
  NP.on=true;NP.role='host';base=copyMap();last=copyMap();q={tr:[],ring:[],feed:[]};tickN=0;NP.seq=0;
  wrapPush(G.tr,'tr');wrapPush(G.ring,'ring');wrapPush(G.feed,'feed');
  lastInit=initMsg();send(lastInit,true)};
NP.tick=function(){ // called once per update() on the host
  if(!NP.on||NP.role!=='host'||!G||G.guest)return;tickN++;
  if(tickN%TILE_EVERY===0){const c=diffTiles(last);if(c.length)send({t:'tiles',c},true)}
  if(tickN%SNAP_EVERY)return;
  const H_=G.hostage,s={t:'snap',n:++NP.seq,ph:G.phase,tm:G.t,msg:G.msg,sc:score,rf:G.reinf,br:G.barr,sec:G.sec,res:G.res,et:G.endT,
   b:[G.bomb.prog,G.bomb.act?1:0],h:[r1(H_.x),r1(H_.y),H_.hp,G.ents.indexOf(H_.carrier)],
   e:G.ents.map(e=>[r1(e.x),r1(e.y),+e.a.toFixed(2),Math.round(e.hp),e.alive?1:0,+(e.mv||0).toFixed(1),e.sel,e.tag>0?1:0,e.gh?1:0,e.rev?1:0,e.blind>0?1:0,e.stun>0?1:0]),
   d:G.drones.map(d=>[r1(d.x),r1(d.y),+d.a.toFixed(2),Math.round(d.hp),d.alive?1:0,d.fly?1:0,d.n,G.ents.indexOf(d.own),d.hit|0]),
   c:G.cams.map(c=>[Math.round(c.hp),c.alive?1:0,+c.a.toFixed(2)]),
   tr:q.tr.map(t=>[r1(t.x1),r1(t.y1),r1(t.x2),r1(t.y2)]),rg:q.ring.map(r=>[r1(r.x),r1(r.y),r.c]),fd:q.feed.map(f=>[f.s,f.c])};
  q={tr:[],ring:[],feed:[]};send(s,false);NP.stats.snapOut++};
NP.sendInitTo=function(id){const n=NET();if(!n||!lastInit||!G||!base)return;n.send(id,lastInit);
  const full=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map[y][x]!==base[y][x])full.push(x,y,map[y][x]);if(full.length)n.send(id,{t:'tiles',c:full})};

/* ---------------- guest ---------------- */
function barEl(){if(bar)return bar;bar=document.createElement('div');bar.id='npBar';
  bar.style.cssText='position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:30;padding:5px 14px;background:rgba(10,12,16,.82);border:1px solid #e5303a;color:#e8e8ee;font:11px Silkscreen,monospace;letter-spacing:2px;pointer-events:none;display:none;white-space:nowrap';document.body.appendChild(bar);return bar}
function initGuest(m){NP.stats.initIn++;NP.on=true;NP.role='client';NP.follow=0;NP.snapN=0;
  uiSel.mapIdx=m.mi;uiSel.mode=m.mode;uiSel.side=m.side;setMap(m.mi,m.pr);buildMap();resolveSpawns();fcache={};score=m.sc.slice();rnd=m.rnd;
  G={mode:m.mode,side:m.side,phase:'prep',t:2700,rq:[],cams:CAMTILES.map(c=>({x:c[0]*T+8,y:(c[1]+1)*T+3,wy:c[1]*T,a:PI/2,hp:40,alive:1})),cv:-1,pings:[],ents:[],decals:[],nades:[],shake:0,traps:[],smokes:[],charges:[],fx:[],tr:[],ring:[],feed:[],reinf:0,drones:[],dc:-1,
   bomb:{prog:0,act:0,x:SITES[0][0],y:SITES[0][1]},hostage:{x:HOST[0],y:HOST[1],hp:100,carrier:null},sec:0,msg:'',endT:0,res:null,guest:1,barr:0,bq:[],asite:m.asite};
  for(const a of m.ents){const e=mkEnt(a[0],opFor(a[0],a[1]),true,a[3],a[4],a[2]);e.a=a[5];e.gh=a[6];e.tx=a[3];e.ty=a[4];e.ta=a[5];e.ph=0;G.ents.push(e)}
  G.me=G.ents[0];mkDrones();G.dc=-1;G.drones.length=0;
  for(const id of['menu','load','over','pause'])document.getElementById(id).style.display='none';PAUSED=false;try{musicStop()}catch(e){}
  const b=barEl();b.style.display='block';NP.paintBar()}
NP.paintBar=function(){if(!bar||!G||!G.guest)return;const e=G.me;bar.textContent='SPECTATING  '+(e?e.nm+' ('+(e.side==='A'?'ATK':'DEF')+')':'')+'   CLICK / TAB = NEXT PLAYER'};
function applySnap(s){
  if(!G||!G.guest||s.n<=NP.snapN)return;NP.snapN=s.n;NP.stats.snapIn++;
  G.phase=s.ph;G.t=s.tm;G.msg=s.msg;score=s.sc;G.reinf=s.rf;G.barr=s.br;G.sec=s.sec;G.res=s.res;G.endT=s.et;G.bomb.prog=s.b[0];G.bomb.act=s.b[1];
  G.hostage.x=s.h[0];G.hostage.y=s.h[1];G.hostage.hp=s.h[2];G.hostage.carrier=s.h[3]>=0?G.ents[s.h[3]]||null:null;
  s.e.forEach((a,i)=>{const e=G.ents[i];if(!e)return;e.tx=a[0];e.ty=a[1];e.ta=a[2];e.hp=a[3];e.alive=a[4];e.mv=a[5];e.sel=a[6];e.tag=a[7]?30:0;e.gh=a[8];e.rev=a[9];e.blind=a[10]?30:0;e.stun=a[11]?30:0;if(!e.alive)e.hp=0});
  while(G.drones.length<s.d.length){const a=s.d[G.drones.length],o=G.ents[a[7]]||G.ents[0],d=mkDrone(o,a[6],a[5]);if(!d)break;G.drones.push(d)}
  s.d.forEach((a,i)=>{const d=G.drones[i];if(!d)return;d.x=a[0];d.y=a[1];d.a=a[2];d.hp=a[3];d.alive=a[4];d.hit=a[8]});
  s.c.forEach((a,i)=>{const c=G.cams[i];if(c){c.hp=a[0];c.alive=a[1];c.a=a[2]}});
  for(const t of s.tr)G.tr.push({x1:t[0],y1:t[1],x2:t[2],y2:t[3],t:3,pl:false});for(const r of s.rg)G.ring.push({x:r[0],y:r[1],r:2,c:r[2]});for(const f of s.fd)G.feed.push({t:360,s:f[0],c:f[1]});
  if(!G.me||!G.me.alive)NP.next(true)}
NP.next=function(auto){if(!G||!G.guest)return;const n=G.ents.length;if(!n)return;let i=G.ents.indexOf(G.me),tries=0;
  const pass=o=>o.alive&&(!auto||o.side===(G.me?G.me.side:G.side)||true);
  do{i=(i+1)%n;tries++}while(tries<=n&&!pass(G.ents[i]));G.me=G.ents[i];NP.paintBar()};
NP.key=function(k,ev){if(k==='tab'||k==='n'){ev.preventDefault();NP.next()}};
NP.click=function(){NP.next()};
NP.step=function(){ // runs instead of update() on a guest, once per frame
  if(!G||!G.guest)return;
  for(const e of G.ents){if(e.tx===undefined)continue;const dx=e.tx-e.x,dy=e.ty-e.y;if(dx*dx+dy*dy>60*60){e.x=e.tx;e.y=e.ty}else{e.x+=dx*.4;e.y+=dy*.4}e.a+=Math.atan2(Math.sin(e.ta-e.a),Math.cos(e.ta-e.a))*.5;if(e.mv>.1)e.ph=(e.ph||0)+.2}
  for(const d of G.drones){d.roll+=.1}
  for(let i=G.tr.length-1;i>=0;i--)if(--G.tr[i].t<=0)G.tr.splice(i,1);for(let i=G.ring.length-1;i>=0;i--){G.ring[i].r+=3;if(G.ring[i].r>60)G.ring.splice(i,1)}
  for(let i=G.feed.length-1;i>=0;i--)if(--G.feed[i].t<=0)G.feed.splice(i,1);
  if(G.shake>0)G.shake--;
  if(bar&&((NP.pb=(NP.pb||0)+1)%30===0))NP.paintBar()};

/* ---------------- wiring ---------------- */
function onMsg(from,m){if(!m||typeof m!=='object')return;
  if(ROLE()==='client'&&from==='host'){
   if(m.t==='init')initGuest(m);else if(m.t==='tiles'&&G&&G.guest){NP.stats.tilesIn++;for(let i=0;i<m.c.length;i+=3)if(map[m.c[i+1]]&&map[m.c[i+1]][m.c[i]]!==m.c[i+2])setTile(m.c[i],m.c[i+1],m.c[i+2])}
   else if(m.t==='snap')applySnap(m)}}
NP.leave=function(){NP.on=false;if(bar)bar.style.display='none'};
setInterval(()=>{const n=NET();if(n&&hooked!==n){hooked=n;n.on('message',onMsg)}
  if(bar&&(!G||!G.guest))bar.style.display='none'},500);
})();
