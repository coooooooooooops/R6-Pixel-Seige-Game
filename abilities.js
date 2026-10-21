/* R6 Pixel Siege - abilities.js
   Real operator abilities, built in stages on top of the old stand-in gadget system (see HANDOFF.md "ABILITIES").
   Loaded right after game.js. Hooks in game.js: gadget() -> R6A.use, update() -> R6A.tick, world render -> R6A.draw, HUD -> R6A.label.
   STAGE 1 (this file): breach + anti-breach.
     Attack: Hibana, Fuze, Buck, Ace, Maverick, Ram, Flores      Defence: Bandit, Kaid, Mute, Jager, Wamai
   Already real in game.js (unchanged): Sledge, Thatcher, Ash, Thermite, Smoke gas, Castle armor panel, Doc-style stim.
   STAGE 2 (intel + drones): IQ, Twitch, Dokkaebi, Zero, Brava, Grim, Deimos, Solid Snake, Lion, Jackal | Valkyrie, Maestro, Echo, Mozzie, Solis
   Everything not listed in DEF below still uses its old stand-in gadget. */
(()=>{
const TS=16;
const DEF={
 hibana:{n:6,L:'X-KOTR',d:'Q: fire a pellet at the wall in front (6). Q at open air: detonate. 1 pellet opens soft walls, 2 on one wall open reinforced'},
 fuze:{n:3,L:'CLUSTER',d:'Q: stick a cluster charge on the wall in front. Q at open air: detonate. Soft walls open; clusters sweep the room beyond, even through reinforced walls'},
 buck:{n:6,L:'SKEL KEY',d:'Q: shotgun breach, opens soft walls and barricades at close range. Cannot open reinforced walls'},
 ace:{n:3,L:'SELMA',d:'Q: stick an aqua breacher on the wall in front. It opens ANY wall after 1.5 s. Electrified walls destroy it'},
 maverick:{n:6,L:'TORCH',d:'Q (hold): burn a hole in the wall in front. Soft/barricade 1 s, reinforced 5 s. You move slowly while burning'},
 ram:{n:3,L:'BU-GI',d:'Q: send a BU-GI robot forward. It smashes barricades, deployable traps and wire in its path. Defenders can shoot it'},
 flores:{n:2,L:'RCE',d:'Q: drive an explosive RC car toward your cursor. Q again (or contact) detonates. Opens soft walls and barricades'},
 bandit:{n:3,L:'SHOCK WIRE',d:'Q: electrify the reinforced wall in front. Attackers touching it are shocked and slowed; breach charges placed on it are destroyed',aim:null},
 kaid:{n:2,L:'ELECTROCLAW',d:'Q: electrify the reinforced wall in front. Attackers touching it are shocked and slowed; breach charges placed on it are destroyed',aim:null},
 mute:{n:4,L:'JAMMER',d:'Placed. Jams electronics within range: X-KOTR/cluster/SELMA charges fizzle and RC cars die',aim:'place'},
 jager:{n:3,L:'ADS',d:'Placed. Shoots down 2 attacker grenades (frag, flash, smoke) that enter its range',aim:'place'},
 iq:{n:3,L:'DETECTOR',d:'Q: sweep for defender electronics for 7 s. Cameras, jammers, ADS, Mag-NET, shock wire and traps within range show through walls'},
 twitch:{n:6,L:'SHOCK',d:'Q (while flying your shock drone, C to switch): zap. Hurts and stuns defenders and destroys cameras, traps and defender gadgets near the drone'},
 dokkaebi:{n:2,L:'LOGIC BOMB',d:'Q: ring every defender phone for 10 s. All defenders are revealed and all cameras go dark'},
 zero:{n:4,L:'ARGUS',d:'Q: fire an Argus camera at the wall in front. It gives vision and destroys defender gadgets in its view'},
 brava:{n:3,L:'KLUDGE',d:'Q (while flying your kludge drone, C to switch): hack the nearest defender gadget. Shock wire, ADS and Mag-NET switch sides; jammers and traps are destroyed; cameras go dark for 25 s'},
 grim:{n:4,L:'HIVE',d:'Q: launch a Kawan Hive at the spot ahead. Its bugs reveal every defender around it for 30 s'},
 deimos:{n:3,L:'DEATHMARK',d:'Q: mark the defender nearest your crosshair. Their position stays revealed until you die (one mark at a time)'},
 solidsnake:{n:0,L:'SOLITON',d:'Passive. A radar shows defenders who are moving within range, through walls'},
 lion:{n:3,L:'EE-ONE-D',d:'Q: scan for 4 s. Every defender who moves is revealed on the whole map'},
 jackal:{n:3,L:'EYENOX',d:'Q: follow fresh footprints near you and track the defender who left them for 15 s'},
 valkyrie:{n:3,L:'BLACK EYE',d:'Q: stick a Black Eye camera on the wall in front. C cycles through cameras'},
 maestro:{n:3,L:'EVIL EYE',d:'Q: stick an Evil Eye camera on the wall in front. Its laser blinds attackers in view. C cycles through cameras'},
 echo:{n:2,L:'YOKAI',d:'Placed. A Yokai drone you view with C. Click while viewing to fire a sonic burst that stuns attackers near it',aim:'place'},
 mozzie:{n:4,L:'PEST',d:'Q: hijack the nearest attacker drone within range. It becomes your camera'},
 solis:{n:2,L:'SPEC-IO',d:'Q: scan for 8 s. Attacker drones and anyone running a device (RC car, pellets, breachers, hive, Argus) are revealed'},
 wamai:{n:5,L:'MAG-NET',d:'Placed. Pulls in 1 attacker grenade and re-throws it back at the attackers'}
};
const WALL=t=>t===3||t===4||t===9;
let S=null;
function st(){if(typeof G==='undefined'||!G)return null;if(!S||S.g!==G)S={g:G,pel:[],clu:[],sel:[],elec:[],jam:[],ads:[],mag:[],rc:[],bugi:[],fl:[],arg:[],hive:[],mark:[],trk:[],dok:0,iqT:0,solT:0,lionT:0};return S}
function install(){
 for(const sd of['A','D'])for(const o of OPS[sd]){const d=DEF[o.id];if(!d)continue;o.gd=o.id;o.gn=d.n;if(d.aim)ARMQ[o.id]=d.aim;else delete ARMQ[o.id];
  GDT[o.id]=d.d;o.t=String(o.t||'').split(' // in this build')[0]+' // in this build: '+d.d+'.'}
}
function brk(tx,ty){if(tx<=0||ty<=0||tx>=W-1||ty>=H-1)return false;const t=map[ty][tx];if(!WALL(t))return false;setTile(tx,ty,t===9?5:1);boom(tx*TS+8,ty*TS+8,14,'#ffb050');sfx(90,.3,'sawtooth',.07);return true}
const cx=tx=>tx*TS+8;
function jammed(x,y){const s=st();return s&&s.jam.some(j=>dst(j.x,j.y,x,y)<j.r)}
function elecAt(tx,ty){const s=st();return s&&s.elec.some(l=>l.tx===tx&&l.ty===ty)}
function msg(e,m){if(e===G.me)G.msg=m}
function wallAhead(e,r){const h=rayHit(e,r);return WALL(h.t)?h:null}


const tg=(e,n)=>{e.tag=Math.max(e.tag||0,n)};
function devs(){const s=st(),L=[];for(const c of G.cams)if(c.alive)L.push({k:'cam',o:c,x:c.x,y:c.y});
 for(const j of s.jam)L.push({k:'jam',o:j,x:j.x,y:j.y});for(const a of s.ads)L.push({k:'ads',o:a,x:a.x,y:a.y});for(const m of s.mag)L.push({k:'mag',o:m,x:m.x,y:m.y});
 for(const l of s.elec)L.push({k:'elec',o:l,x:cx(l.tx),y:cx(l.ty)});for(const t of G.traps)L.push({k:'trap',o:t,x:t.x,y:t.y});
 return L.filter(d=>!d.o.own||d.o.own.side==='D')}
function killDev(d,dmg){const s=st();
 if(d.k==='cam'){d.o.hp-=dmg||999;if(d.o.hp<=0){d.o.alive=0;boom(d.x,d.y,10,'#8fa3bf')}else boom(d.x,d.y,4,'#7ed0ff')}
 else{const arr=d.k==='jam'?s.jam:d.k==='ads'?s.ads:d.k==='mag'?s.mag:d.k==='elec'?s.elec:G.traps,i=arr.indexOf(d.o);if(i>=0)arr.splice(i,1);boom(d.x,d.y,8,'#7ed0ff')}
 sfx(1200,.08,'sawtooth',.05)}
function flyDrone(e){const d=G.dc>=0&&e===G.me?G.drones[G.dc]:null;return d&&d.alive&&d.fly?d:null}
function putCam(e,o){const a0=e.a;let h=null,ang=a0;const tries=e===G.me?[0]:[0,.785,-.785,1.57,-1.57,2.36,-2.36,3.14];
 for(const d of tries){e.a=a0+d;const r=rayHit(e,d?44:70);if(WALL(r.t)){h=r;ang=e.a;break}}
 e.a=a0;if(!h)return null;
 const x=h.x-Math.cos(ang)*6,y=h.y-Math.sin(ang)*6;if(solid(tileAt(x,y)))return null;
 const c={x,y,wy:y-12,a:ang+PI,hp:o.hp||40,alive:1,dyn:1,own:e,...o};G.cams.push(c);return c}
function nearestAtt(e,r,needLos){let b=null,bd=r;for(const o of G.ents)if(o.alive&&o.side!==e.side){const d=dst(e.x,e.y,o.x,o.y);if(d<bd&&(!needLos||los(e.x,e.y,o.x,o.y))){bd=d;b=o}}return b}

function use(e,tx,ty){
 const d=DEF[e.op.gd];if(!d)return false;const s=st();if(!s)return true;const k=e.op.gd;
 if(k==='hibana'){const h=wallAhead(e,150);
  if(h&&e.gn>0){if(elecAt(h.tx,h.ty)){boom(h.x,h.y,8,'#7ed0ff');e.gn--;e.gcd=14;msg(e,'ELECTRIFIED: PELLET DESTROYED');return true}
   s.pel.push({tx:h.tx,ty:h.ty,x:h.x,y:h.y,own:e,t:-1});e.gn--;e.gcd=14;sfx(900,.05,'square',.04);return true}
  const mine=s.pel.filter(p=>p.own===e&&p.t<0);
  if(mine.length){for(const p of mine)p.t=30;e.gcd=30;sfx(1300,.1,'sine',.05);return true}
  msg(e,e.gn>0?'AIM AT A WALL':'NO PELLETS');return true}
 if(k==='fuze'){const h=wallAhead(e,28);
  if(h&&e.gn>0){if(elecAt(h.tx,h.ty)){boom(h.x,h.y,8,'#7ed0ff');e.gn--;e.gcd=20;msg(e,'ELECTRIFIED: CHARGE DESTROYED');return true}
   s.clu.push({tx:h.tx,ty:h.ty,own:e,a:e.a,t:-1,run:0});e.gn--;e.gcd=20;sfx(300,.06,'square',.05);return true}
  const mine=s.clu.filter(c=>c.own===e&&c.t<0);
  if(mine.length){for(const c of mine)c.t=25;e.gcd=30;sfx(1300,.1,'sine',.05);return true}
  msg(e,e.gn>0?'AIM AT A WALL':'NO CHARGES');return true}
 if(k==='buck'){if(e.gn<=0){msg(e,'NO SHELLS');return true}const h=rayHit(e,56);e.gcd=30;
  if(h.t===3||h.t===9){brk(h.tx,h.ty);e.gn--;return true}
  msg(e,h.t===4?'REINFORCED: CANNOT BREACH':'AIM AT A SOFT WALL');return true}
 if(k==='ace'){const h=wallAhead(e,160);if(e.gn<=0){msg(e,'NO CHARGES');return true}
  if(!h){msg(e,'AIM AT A WALL');return true}e.gcd=24;e.gn--;
  if(elecAt(h.tx,h.ty)){boom(h.x,h.y,8,'#7ed0ff');msg(e,'ELECTRIFIED: CHARGE DESTROYED');return true}
  s.sel.push({tx:h.tx,ty:h.ty,own:e,t:90});sfx(500,.08,'square',.05);return true}
 if(k==='maverick'){if(e.tq)return true;if(e.gn<=0){msg(e,'NO TORCH FUEL');return true}const h=wallAhead(e,26);
  if(!h){msg(e,'AIM AT A WALL AND HOLD Q');return true}e.tq={tx:h.tx,ty:h.ty,p:0};e.gcd=4;return true}
 if(k==='ram'){if(e.gn<=0){msg(e,'NO BU-GI');return true}e.gn--;e.gcd=40;
  s.bugi.push({x:e.x+Math.cos(e.a)*10,y:e.y+Math.sin(e.a)*10,a:e.a,t:420,hp:24,own:e,ph:0});sfx(260,.08,'square',.05);return true}
 if(k==='flores'){if(e.rc&&e.rc.alive){rcBoom(e.rc);return true}if(e.gn<=0){msg(e,'NO RC CARS');return true}
  const c={x:e.x+Math.cos(e.a)*10,y:e.y+Math.sin(e.a)*10,a:e.a,t:720,own:e,alive:1};if(solid(tileAt(c.x,c.y))){msg(e,'NO ROOM');return true}
  e.gn--;e.gcd=20;e.rc=c;s.rc.push(c);sfx(400,.1,'square',.05);return true}
 if(k==='bandit'||k==='kaid'){if(e.gn<=0){msg(e,'NONE LEFT');return true}const h=rayHit(e,30);
  if(h.t!==4){msg(e,'AIM AT A REINFORCED WALL');return true}
  if(elecAt(h.tx,h.ty)){msg(e,'ALREADY ELECTRIFIED');return true}
  s.elec.push({tx:h.tx,ty:h.ty,own:e});e.gn--;e.gcd=24;sfx(1500,.12,'sawtooth',.05);boom(cx(h.tx),cx(h.ty),10,'#7ed0ff');return true}
 if(k==='mute'||k==='jager'||k==='wamai'){if(e.gn<=0){msg(e,'NONE LEFT');return true}
  const p=tx===undefined?{x:e.x,y:e.y}:placePt(e,tx,ty);if(!p){msg(e,'TOO FAR OR BLOCKED');return true}
  e.gn--;e.gcd=24;sfx(260,.06,'square',.04);boom(p.x,p.y,4,'#8fa3bf');
  if(k==='mute')s.jam.push({x:p.x,y:p.y,own:e,r:64});
  else if(k==='jager')s.ads.push({x:p.x,y:p.y,own:e,n:2,r:70});
  else s.mag.push({x:p.x,y:p.y,own:e,n:1,r:75});
  return true}

 // ===== STAGE 2: intel + drones =====
 if(k==='iq'){if(e.gn<=0){msg(e,'NO SCANS LEFT');return true}e.gn--;e.iq=420;e.gcd=40;sfx(700,.2,'sine',.05);G.ring.push({x:e.x,y:e.y,r:2,c:'#7ed0ff'});return true}
 if(k==='twitch'){const d=flyDrone(e);if(!d){msg(e,'FLY YOUR SHOCK DRONE (C), THEN Q');return true}if(e.gn<=0){msg(e,'NO SHOCKS LEFT');return true}
  e.gn--;e.gcd=45;G.ring.push({x:d.x,y:d.y,r:2,c:'#7ed0ff'});sfx(1600,.2,'sawtooth',.06);
  for(const v of devs())if(dst(v.x,v.y,d.x,d.y)<38)killDev(v,35);
  for(const o of G.ents)if(o.alive&&o.side==='D'&&dst(o.x,o.y,d.x,d.y)<38){hurt(o,20,undefined,e);o.stun=Math.max(o.stun,60)}return true}
 if(k==='dokkaebi'){if(e.gn<=0){msg(e,'NO LOGIC BOMBS');return true}e.gn--;e.gcd=60;s.dok=600;sfx(900,.4,'square',.05);msg(e,'RINGING EVERY PHONE');return true}
 if(k==='zero'){if(e.gn<=0){msg(e,'NO ARGUS LEFT');return true}const h=wallAhead(e,150);if(!h){msg(e,'AIM AT A WALL');return true}
  const x=h.x-Math.cos(e.a)*5,y=h.y-Math.sin(e.a)*5;e.gn--;e.gcd=30;s.arg.push({x,y,a:e.a,own:e,hp:30,cd:0});sfx(500,.1,'square',.05);return true}
 if(k==='brava'){const d=flyDrone(e);if(!d){msg(e,'FLY YOUR KLUDGE DRONE (C), THEN Q');return true}if(e.gn<=0){msg(e,'NO HACKS LEFT');return true}
  let b=null,bd=70;for(const v of devs()){const q=dst(v.x,v.y,d.x,d.y);if(q<bd){bd=q;b=v}}if(!b){msg(e,'NO GADGET IN RANGE');return true}
  e.gn--;e.gcd=60;sfx(1100,.2,'square',.05);G.ring.push({x:b.x,y:b.y,r:2,c:'#c46aff'});
  if(b.k==='cam'){b.o.off=1500}else if(b.k==='elec'||b.k==='ads'||b.k==='mag'){b.o.own=e}else killDev(b);return true}
 if(k==='grim'){if(e.gn<=0){msg(e,'NO HIVES LEFT');return true}const r=rayHit(e,150);const x=r.x-Math.cos(e.a)*4,y=r.y-Math.sin(e.a)*4;
  e.gn--;e.gcd=40;s.hive.push({x,y,own:e,t:1800});G.ring.push({x,y,r:2,c:'#c46aff'});sfx(250,.2,'sine',.05);return true}
 if(k==='deimos'){if(e.gn<=0){msg(e,'NO MARKS LEFT');return true}const wx=e===G.me?mouse.x+cam.x:e.x+Math.cos(e.a)*80,wy=e===G.me?mouse.y+cam.y:e.y+Math.sin(e.a)*80;
  let b=null,bd=60;for(const o of G.ents)if(o.alive&&o.side!==e.side&&dst(e.x,e.y,o.x,o.y)<240&&los(e.x,e.y,o.x,o.y)){const q=dst(wx,wy,o.x,o.y);if(q<bd){bd=q;b=o}}
  if(!b){msg(e,'NO TARGET NEAR CROSSHAIR');return true}e.gn--;e.gcd=40;s.mark=s.mark.filter(m=>m.own!==e);s.mark.push({own:e,tgt:b});G.ring.push({x:b.x,y:b.y,r:2,c:'#ff4a4a'});sfx(600,.2,'sine',.05);return true}
 if(k==='solidsnake'){msg(e,'PASSIVE: SOLITON RADAR IS ALWAYS ON');return true}
 if(k==='lion'){if(e.gn<=0){msg(e,'NO SCANS LEFT');return true}e.gn--;e.gcd=60;e.lion=240;sfx(400,.5,'sine',.06);G.ring.push({x:e.x,y:e.y,r:2,c:'#ff4a4a'});return true}
 if(k==='jackal'){if(e.gn<=0){msg(e,'NO SCANS LEFT');return true}let b=null,bd=1e9;
  for(const o of G.ents)if(o.alive&&o.side!==e.side&&o.trail)for(const p of o.trail){const q=dst(e.x,e.y,p.x,p.y);if(q<70&&q<bd){bd=q;b=o}}
  if(!b){msg(e,'NO FRESH FOOTPRINTS NEARBY');return true}e.gn--;e.gcd=60;s.trk.push({own:e,tgt:b,t:900});G.ring.push({x:b.x,y:b.y,r:2,c:'#ffd24a'});sfx(500,.2,'sine',.05);return true}
 if(k==='valkyrie'||k==='maestro'){if(e.gn<=0){msg(e,'NO CAMERAS LEFT');return true}
  const c=putCam(e,k==='maestro'?{hp:60,evil:1,bl:0}:{hp:30,bk:1});if(!c){msg(e,'AIM AT A WALL');return true}e.gn--;e.gcd=30;sfx(300,.08,'square',.05);return true}
 if(k==='echo'){if(e.gn<=0){msg(e,'NO YOKAI LEFT');return true}const p=tx===undefined?aimPt(e,60):placePt(e,tx,ty);if(!p){msg(e,'TOO FAR OR BLOCKED');return true}
  e.gn--;e.gcd=30;G.cams.push({x:p.x,y:p.y,wy:p.y-12,a:PI/2,hp:20,alive:1,dyn:1,own:e,echo:1,cd:0});sfx(500,.1,'sine',.05);return true}
 if(k==='mozzie'){if(e.gn<=0){msg(e,'NO PESTS LEFT');return true}let b=null,bd=170;
  for(const d of G.drones)if(d.alive&&dst(e.x,e.y,d.x,d.y)<bd&&los(e.x,e.y,d.x,d.y)){bd=dst(e.x,e.y,d.x,d.y);b=d}
  if(!b){msg(e,'NO ATTACKER DRONE IN RANGE');return true}e.gn--;e.gcd=40;
  b.alive=0;b.hp=0;if(G.drones[G.dc]===b){G.dc=-1;G.msg='DRONE HIJACKED'}boom(b.x,b.y,10,'#c46aff');G.ring.push({x:b.x,y:b.y,r:2,c:'#c46aff'});
  G.cams.push({x:b.x,y:b.y,wy:b.y-12,a:PI/2,hp:20,alive:1,dyn:1,own:e,moz:1});sfx(800,.2,'square',.05);msg(e,'DRONE HIJACKED: C CYCLES CAMERAS');return true}
 if(k==='solis'){if(e.gn<=0){msg(e,'NO SCANS LEFT');return true}e.gn--;e.gcd=40;e.sol=480;sfx(900,.2,'sine',.05);G.ring.push({x:e.x,y:e.y,r:2,c:'#6aff9a'});return true}
 return false}


function rcBoom(c){if(!c.alive)return;c.alive=0;if(c.own)c.own.rc=null;explode(c.x,c.y,38,80,c.own);
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const tx=(c.x/TS|0)+x,ty=(c.y/TS|0)+y;const t=map[ty]&&map[ty][tx];if((t===3||t===9)&&dst(c.x,c.y,cx(tx),cx(ty))<26)brk(tx,ty)}}

function tick(){
 const s=st();if(!s||G.phase==='end')return;
 // ---- X-KOTR pellets
 for(let i=s.pel.length-1;i>=0;i--){const p=s.pel[i];
  if(!WALL(map[p.ty][p.tx])){s.pel.splice(i,1);continue}
  if(elecAt(p.tx,p.ty)){boom(p.x,p.y,8,'#7ed0ff');s.pel.splice(i,1);continue}
  if(p.t>0&&--p.t===0){if(jammed(p.x,p.y)){boom(p.x,p.y,6,'#888');s.pel.splice(i,1);continue}p.go=1}}
 const goTiles={};for(const p of s.pel)if(p.go){const k=p.tx+','+p.ty;(goTiles[k]=goTiles[k]||[]).push(p)}
 for(const k in goTiles){const ps=goTiles[k],t=map[ps[0].ty][ps[0].tx],need=t===4?2:1;
  if(ps.length>=need)brk(ps[0].tx,ps[0].ty);else{boom(ps[0].x,ps[0].y,8,'#ff9a30');sfx(200,.1,'square',.04)}
  s.pel=s.pel.filter(p=>!ps.includes(p))}
 // ---- cluster charges
 for(let i=s.clu.length-1;i>=0;i--){const c=s.clu[i];
  if(!WALL(map[c.ty][c.tx])&&!c.run){s.clu.splice(i,1);continue}
  if(!c.run){if(elecAt(c.tx,c.ty)){boom(cx(c.tx),cx(c.ty),8,'#7ed0ff');s.clu.splice(i,1);continue}
   if(c.t>0&&--c.t===0){if(jammed(cx(c.tx),cx(c.ty))){boom(cx(c.tx),cx(c.ty),6,'#888');s.clu.splice(i,1);continue}
    c.run=150;c.ox=cx(c.tx)+Math.cos(c.a)*10;c.oy=cx(c.ty)+Math.sin(c.a)*10;if(map[c.ty][c.tx]===3||map[c.ty][c.tx]===9)brk(c.tx,c.ty);sfx(120,.3,'sawtooth',.07)}continue}
  c.run--;if(c.run%15===0){const n=c.run/15|0;for(let j=-1;j<=2;j++){const a=c.a+j*.22-.11,r=18+(10-n)*5,x=c.ox+Math.cos(a)*r,y=c.oy+Math.sin(a)*r;
    if(solid(tileAt(x,y))&&!WALL(tileAt(x,y)))continue;
    G.ring.push({x,y,r:2,c:'#ffb050'});boom(x,y,6,'#ff9a30');for(const o of G.ents)if(o.alive&&o.side==='D'&&dst(o.x,o.y,x,y)<20)hurt(o,22,undefined,c.own)}}
  if(c.run<=0)s.clu.splice(i,1)}
 // ---- SELMA
 for(let i=s.sel.length-1;i>=0;i--){const c=s.sel[i];if(!WALL(map[c.ty][c.tx])||elecAt(c.tx,c.ty)){s.sel.splice(i,1);continue}
  if(--c.t<=0){if(!jammed(cx(c.tx),cx(c.ty)))brk(c.tx,c.ty);else boom(cx(c.tx),cx(c.ty),6,'#888');s.sel.splice(i,1)}}
 // ---- Maverick torch
 for(const e of G.ents){const q=e.tq;if(!q)continue;
  const held=e===G.me?keys.q:true,h=e.alive?wallAhead(e,26):null;
  if(!e.alive||!held||!h||h.tx!==q.tx||h.ty!==q.ty||e.gn<=0){e.tq=null;continue}
  const t=map[q.ty][q.tx],need=t===4?300:60;q.p++;e.slow=Math.max(e.slow,2);if(q.p%6===0){boom(h.x,h.y,2,'#9ad0ff');sfx(800+Math.random()*200,.03,'sawtooth',.02)}
  if(e===G.me)G.prog={t:'TORCHING',v:q.p/need,c:'#ff9a30'};
  if(q.p>=need){brk(q.tx,q.ty);e.gn--;e.tq=null}}
 // ---- BU-GI
 for(let i=s.bugi.length-1;i>=0;i--){const b=s.bugi[i];b.t--;
  for(const o of G.ents)if(o.alive&&o.side==='D'&&dst(o.x,o.y,b.x,b.y)<140&&los(o.x,o.y,b.x,b.y))b.hp-=.25;
  if(b.hp<=0){boom(b.x,b.y,14,'#ffb050');sfx(120,.2,'sawtooth',.06);s.bugi.splice(i,1);continue}
  const nx=b.x+Math.cos(b.a)*.9,ny=b.y+Math.sin(b.a)*.9,t=tileAt(nx,ny);
  if(t===9){brk(nx/TS|0,ny/TS|0)}
  else if(!solid(t)){b.x=nx;b.y=ny;b.ph+=.3}
  const n0=G.traps.length;G.traps=G.traps.filter(tr=>!(tr.own&&tr.own.side==='D'||tr.k==='wire'||tr.k==='kap'||tr.k==='mat')||dst(tr.x,tr.y,b.x,b.y)>14);if(G.traps.length<n0){boom(b.x,b.y,8,'#ffb050');sfx(500,.1,'square',.05)}
  const j0=s.jam.length;s.jam=s.jam.filter(j=>dst(j.x,j.y,b.x,b.y)>12);const a0=s.ads.length;s.ads=s.ads.filter(j=>dst(j.x,j.y,b.x,b.y)>12);s.mag=s.mag.filter(j=>dst(j.x,j.y,b.x,b.y)>12);if(s.jam.length<j0||s.ads.length<a0)boom(b.x,b.y,8,'#ffb050');
  if(b.t<=0)s.bugi.splice(i,1)}
 // ---- Flores RC car
 for(let i=s.rc.length-1;i>=0;i--){const c=s.rc[i];if(!c.alive){s.rc.splice(i,1);continue}
  if(!c.own.alive||--c.t<=0){rcBoom(c);continue}
  if(jammed(c.x,c.y)){c.alive=0;c.own.rc=null;boom(c.x,c.y,10,'#7ed0ff');sfx(300,.2,'sawtooth',.05);continue}
  if(c.own===G.me){const ta=Math.atan2(mouse.y+cam.y-c.y,mouse.x+cam.x-c.x);c.a=turn(c.a,ta,.12)}
  const nx=c.x+Math.cos(c.a)*1.6,ny=c.y+Math.sin(c.a)*1.6;
  if(solid(tileAt(nx,ny))){rcBoom(c);continue}c.x=nx;c.y=ny;
  if(G.ents.some(o=>o.alive&&o.side==='D'&&dst(o.x,o.y,c.x,c.y)<9))rcBoom(c)}
 // ---- electrified walls (Bandit / Kaid)
 for(let i=s.elec.length-1;i>=0;i--){const l=s.elec[i];if(map[l.ty][l.tx]!==4){s.elec.splice(i,1);continue}
  const x=cx(l.tx),y=cx(l.ty);
  for(let j=G.charges.length-1;j>=0&&l.own.side==='D';j--)if(G.charges[j].tx===l.tx&&G.charges[j].ty===l.ty){G.charges.splice(j,1);boom(x,y,10,'#7ed0ff');sfx(1500,.15,'sawtooth',.06)}
  if(G.t%20===0)for(const a of G.ents)if(a.alive&&a.side!==l.own.side&&dst(a.x,a.y,x,y)<19){hurt(a,10,undefined,l.own);a.slow=Math.max(a.slow,40);boom(a.x,a.y,3,'#7ed0ff');sfx(1700,.05,'sawtooth',.04)}}
 // ---- ADS and Mag-NET
 for(let i=G.nades.length-1;i>=0;i--){const n=G.nades[i];if(!n.own||n.mag)continue;
  for(let j=s.ads.length-1;j>=0;j--){const a=s.ads[j];if(a.own.side!==n.own.side&&dst(a.x,a.y,n.x,n.y)<a.r&&los(a.x,a.y,n.x,n.y)){G.nades.splice(i,1);G.ring.push({x:n.x,y:n.y,r:2,c:'#7ed0ff'});boom(n.x,n.y,10,'#7ed0ff');sfx(1000,.1,'sawtooth',.05);if(--a.n<=0)s.ads.splice(j,1);n.dead=1;break}}
  if(n.dead)continue;
  for(let j=s.mag.length-1;j>=0;j--){const m=s.mag[j];if(m.own.side!==n.own.side&&dst(m.x,m.y,n.x,n.y)<m.r&&los(m.x,m.y,n.x,n.y)){n.x=m.x;n.y=m.y;n.vx=n.vy=0;n.air=0;n.t=Math.max(n.t,60);n.own=m.own;n.mag=1;G.ring.push({x:m.x,y:m.y,r:2,c:'#c46aff'});sfx(300,.2,'sine',.05);s.mag.splice(j,1);break}}}

 // ===== STAGE 2 tick: intel + drones =====
 for(const e of G.ents){e.mvd=dst(e.x,e.y,e.lx===undefined?e.x:e.lx,e.ly===undefined?e.y:e.ly)>.25;e.lx=e.x;e.ly=e.y;
  if(e.iq>0)e.iq--;if(e.sol>0)e.sol--;if(e.lion>0)e.lion--;if(!e.alive){e.lion=0;e.iq=0}
  if(e.side==='D'&&e.alive&&e.mvd&&G.t%15===0){(e.trail=e.trail||[]).push({x:e.x,y:e.y});if(e.trail.length>10)e.trail.shift()}}
 for(const c of G.cams){if(c.off>0)c.off--;if(c.cd>0)c.cd--}
 if(s.dok>0){s.dok--;for(const c of G.cams)c.off=Math.max(c.off||0,20);
  for(const o of G.ents)if(o.alive&&o.side==='D'){if(s.dok%10===0)tg(o,25);if(s.dok%90===0)G.ring.push({x:o.x,y:o.y,r:2,c:'#ffd24a'})}}
 for(let i=s.arg.length-1;i>=0;i--){const a=s.arg[i];a.cd--;
  for(const o of G.ents)if(o.alive&&o.side==='D'&&dst(a.x,a.y,o.x,o.y)<130&&los(a.x,a.y,o.x,o.y)){tg(o,15);if(G.t%12===0)a.hp-=.4}
  if(a.cd<=0){const v=devs().find(v=>v.k!=='elec'&&dst(v.x,v.y,a.x,a.y)<95&&los(a.x,a.y,v.x,v.y));if(v){killDev(v,30);a.cd=45}}
  if(a.hp<=0){boom(a.x,a.y,10,'#8fa3bf');s.arg.splice(i,1)}}
 for(let i=s.hive.length-1;i>=0;i--){const h=s.hive[i];if(--h.t<=0){s.hive.splice(i,1);continue}
  if(h.t%15===0)for(const o of G.ents)if(o.alive&&o.side!==h.own.side&&dst(h.x,h.y,o.x,o.y)<85)tg(o,90)}
 for(let i=s.mark.length-1;i>=0;i--){const m=s.mark[i];if(!m.tgt.alive||!m.own.alive){s.mark.splice(i,1);continue}tg(m.tgt,15)}
 for(let i=s.trk.length-1;i>=0;i--){const t=s.trk[i];if(!t.tgt.alive||!t.own.alive||--t.t<=0){s.trk.splice(i,1);continue}tg(t.tgt,15);if(t.t%90===0)G.ring.push({x:t.tgt.x,y:t.tgt.y,r:2,c:'#ffd24a'})}
 for(const e of G.ents){if(!e.alive)continue;
  if(e.lion>0)for(const o of G.ents)if(o.alive&&o.side!==e.side&&o.mvd){tg(o,15);if(e.lion%40===0)G.ring.push({x:o.x,y:o.y,r:2,c:'#ff4a4a'})}
  if(e.op.gd==='solidsnake')for(const o of G.ents)if(o.alive&&o.side!==e.side&&o.mvd&&dst(e.x,e.y,o.x,o.y)<230)tg(o,10);
  if(e.sol>0){const own=new Set();for(const arr of[s.pel,s.sel,s.clu,s.bugi,s.rc,s.hive,s.arg,s.mark,s.trk])for(const d of arr)if(d.own)own.add(d.own);for(const o of G.ents)if(o.tq||o.rc)own.add(o);
   for(const o of own)if(o.alive&&o.side!==e.side&&dst(e.x,e.y,o.x,o.y)<260)tg(o,15)}}
 for(const c of G.cams){if(!c.alive||c.off>0)continue;
  if(c.evil){c.bl=(c.bl||0)-1;if(c.bl<=0){const t=G.ents.find(o=>o.alive&&o.side==='A'&&dst(c.x,c.y,o.x,o.y)<130&&los(c.x,c.y,o.x,o.y));if(t){t.blind=Math.max(t.blind,50);c.bl=100;G.ring.push({x:t.x,y:t.y,r:2,c:'#ff4a4a'});sfx(1400,.1,'sawtooth',.04)}}}
  if(c.echo&&G.cv>=0&&G.cams[G.cv]===c&&mouse.down&&c.cd<=0){c.cd=480;G.ring.push({x:c.x,y:c.y,r:2,c:'#6ad0ff'});sfx(220,.4,'sawtooth',.07);
   for(const o of G.ents)if(o.alive&&o.side==='A'&&dst(c.x,c.y,o.x,o.y)<85){o.stun=Math.max(o.stun,150);tg(o,120)}}}
 // ---- bots set up their defender gadgets during prep
 if(G.phase==='prep'&&G.t%45===0)for(const e of G.ents){if(!e.bot||!e.alive||e.side!=='D'||e.abDone||!DEF[e.op.gd])continue;
  const k=e.op.gd;
  if(k==='bandit'||k==='kaid'){let best=null,bd=110;for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){const tx=(e.x/TS|0)+dx,ty=(e.y/TS|0)+dy;if(map[ty]&&map[ty][tx]===4&&!elecAt(tx,ty)){const d=dst(e.x,e.y,cx(tx),cx(ty));if(d<bd){bd=d;best=[tx,ty]}}}
   if(best&&e.gn>0){s.elec.push({tx:best[0],ty:best[1],own:e});e.gn--;e.abDone=1}}
  else if(k==='valkyrie'||k==='maestro'||k==='echo'){e.abTry=(e.abTry||0)+1;const g0=e.gn;if(e.gn>0)use(e);if(e.gn<g0)e.abN=(e.abN||0)+1;if(e.abN>=2||e.gn<=0||e.abTry>8)e.abDone=1}
  else if(e.gn>0){use(e,undefined,undefined);e.abDone=1}}
 if(G.phase==='act'&&G.t%90===0)for(const e of G.ents){if(!e.bot||!e.alive||e.side!=='D'||e.gn<=0||e.gcd>0)continue;const k=e.op.gd;
  if(k==='mozzie'&&G.drones.some(d=>d.alive&&dst(e.x,e.y,d.x,d.y)<150))use(e);
  if(k==='solis'&&!e.sol&&G.ents.some(o=>o.alive&&o.side==='A'&&dst(e.x,e.y,o.x,o.y)<200))use(e)}}

function draw(g,me){const s=st();if(!s)return;
 const vis=(own,x,y)=>me.side==='D'||(own&&own.side===me.side)||dst(me.x,me.y,x,y)<30;
 g.save();
 for(const p of s.pel){g.fillStyle=p.go||p.t>=0?'#fff':'#ff9a30';g.fillRect(p.x-1,p.y-1,3,3);g.fillStyle=G.t%12<6?'#ff4a4a':'#331';g.fillRect(p.x,p.y-2,1,1)}
 for(const c of s.clu){const x=cx(c.tx),y=cx(c.ty);if(!c.run){g.fillStyle='#222';g.fillRect(x-5,y-5,10,10);g.fillStyle=G.t%14<7?'#ffb050':'#7a4a10';g.fillRect(x-3,y-3,6,6)}else{g.fillStyle='rgba(255,170,60,.35)';g.fillRect(c.ox-3,c.oy-3,6,6)}}
 for(const c of s.sel){const x=cx(c.tx),y=cx(c.ty);g.fillStyle='#14202a';g.fillRect(x-5,y-5,10,10);g.fillStyle='#4ad0ff';g.fillRect(x-3,y-3,6*(1-c.t/90)+0,6)}
 for(const l of s.elec){if(!vis(l.own,cx(l.tx),cx(l.ty)))continue;const x=cx(l.tx),y=cx(l.ty);g.strokeStyle=G.t%6<3?'#9ad8ff':'#2a6aa0';g.lineWidth=1;g.beginPath();g.moveTo(x-8,y-8);g.lineTo(x-3,y+2);g.lineTo(x+2,y-4);g.lineTo(x+8,y+8);g.stroke()}
 for(const j of s.jam){if(!vis(j.own,j.x,j.y))continue;g.fillStyle='#111';g.fillRect(j.x-3,j.y-3,6,6);g.fillStyle='#ffd24a';g.fillRect(j.x-1,j.y-1,2,2);if(me.side==='D'){g.strokeStyle='rgba(255,210,74,.25)';g.beginPath();g.arc(j.x,j.y,j.r,0,7);g.stroke()}}
 for(const a of s.ads){if(!vis(a.own,a.x,a.y))continue;g.fillStyle='#111';g.fillRect(a.x-3,a.y-3,6,6);g.fillStyle='#6aff9a';g.fillRect(a.x-1,a.y-1,2,2)}
 for(const m of s.mag){if(!vis(m.own,m.x,m.y))continue;g.fillStyle='#111';g.fillRect(m.x-3,m.y-3,6,6);g.fillStyle='#c46aff';g.fillRect(m.x-1,m.y-1,2,2)}
 for(const b of s.bugi){g.fillStyle='#111';g.fillRect(b.x-4,b.y-3,8,6);g.fillStyle='#e5303a';g.fillRect(b.x-3,b.y-2,6,4);g.fillStyle='#ccc';g.fillRect(b.x+Math.cos(b.a)*3-1,b.y+Math.sin(b.a)*3-1,2,2)}
 for(const c of s.rc){g.fillStyle='#111';g.fillRect(c.x-3,c.y-3,6,6);g.fillStyle='#ff4a4a';g.fillRect(c.x-2,c.y-2,4,4);g.fillStyle='#fff';g.fillRect(c.x+Math.cos(c.a)*3,c.y+Math.sin(c.a)*3,1,1)}
 if(me.side==='A'&&me.iq>0){g.strokeStyle='rgba(126,208,255,.35)';g.beginPath();g.arc(me.x,me.y,200,0,7);g.stroke();
  for(const v of devs())if(dst(me.x,me.y,v.x,v.y)<200){g.strokeStyle='#ff4a4a';g.strokeRect(v.x-5.5,v.y-5.5,11,11);g.fillStyle='#ff4a4a';g.fillRect(v.x-1,v.y-1,2,2)}}
 if(me.side==='D'&&me.sol>0)for(const d of G.drones)if(d.alive){g.strokeStyle='#6aff9a';g.beginPath();g.arc(d.x,d.y,9,0,7);g.stroke();g.fillStyle='#6aff9a';g.fillRect(d.x-1,d.y-1,3,3)}
 for(const h of s.hive){g.fillStyle='#4a3a1a';g.fillRect(h.x-3,h.y-3,6,6);g.fillStyle='#ffd24a';for(let i=0;i<5;i++)g.fillRect(h.x+Math.cos(G.t/8+i*1.3)*9,h.y+Math.sin(G.t/6+i*1.7)*9,1,1)}
 for(const a of s.arg){g.fillStyle='#111';g.fillRect(a.x-3,a.y-3,6,6);g.fillStyle='#4ad0ff';g.fillRect(a.x-1,a.y-1,2,2);g.strokeStyle='rgba(74,208,255,.2)';g.beginPath();g.arc(a.x,a.y,130,a.a-.7,a.a+.7);g.stroke()}
 g.restore()}

window.R6A={DEF,install,use,tick,draw,label:e=>{const d=DEF[e.op.gd];return d?d.L:null},state:()=>st(),brk,rcBoom};
install();
})();
