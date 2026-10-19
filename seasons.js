/* R6 Pixel Siege - SEASONS (data + calendar + content packs). Loaded after catalog.js, before shop.js.
   - Hardwired rotating calendar: every calendar month in Australia/Sydney time is a season.
     Starts 12:00:00am on the 1st, ends 11:59:59pm on the last day, then the next month's season begins.
   - Each season has a 30-tier pass whose rewards (skins, headgear, weapon skins, DRONE skins, tracers, kill FX,
     nameplates, rings, crosshairs, muzzle flashes) are generated here as DATA.
   - GitHub content packs (content/content.json, fetched by updater.js) can add items, extend/override a season, and
     announce a new app version. Everything from a pack is validated here before it touches the catalog.
   No DOM / ECO access at load, so tools/validate-content.js can run this file in plain Node. */
(()=>{
const CAT=window.R6CAT;if(!CAT)return;
const TZ='Australia/Sydney',TIERS=30,XP_TIER=1000,CK='r6s_content';
const pad=n=>String(n).padStart(2,'0');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
/* ---------- Sydney calendar ---------- */
const dfmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
let NOW=null;const now=()=>NOW==null?Date.now():NOW;
const dayKey=t=>dfmt.format(new Date(t));
const ymKey=t=>dayKey(t).slice(0,7);
const nextYm=ym=>{let y=+ym.slice(0,4),m=+ym.slice(5,7)+1;if(m>12){m=1;y++}return y+'-'+pad(m)};
const prevYm=ym=>{let y=+ym.slice(0,4),m=+ym.slice(5,7)-1;if(m<1){m=12;y--}return y+'-'+pad(m)};
/* first instant (ms, whole second) at which Sydney's calendar reads this year-month. Sydney is UTC+10/+11 so +-14h brackets it */
function ymStart(ym){const y=+ym.slice(0,4),m=+ym.slice(5,7)-1,base=Date.UTC(y,m,1);let lo=base-15*36e5,hi=base+15*36e5;
 while(hi-lo>500){const mid=(lo+hi)/2;ymKey(mid)<ym?lo=mid:hi=mid}let r=Math.floor(hi/1000)*1000;while(ymKey(r)<ym)r+=1000;while(ymKey(r-1000)>=ym)r-=1000;return r}
const ymEnd=ym=>ymStart(nextYm(ym));
/* ---------- colour helpers ---------- */
const H=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const X=a=>'#'+a.map(v=>('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2)).join('');
const mix=(a,b,k)=>{const A=H(a),B=H(b);return X(A.map((v,i)=>v+(B[i]-v)*k))};
/* DRONE SKIN (type dr): p=[body,dark,led] */
/* ---------- the 12 hardwired seasons ----------
 n order: skin R, skin E, skin L, skin MYTHIC, hat R, hat E, weapon E, weapon L, drone R, drone E, tracer, kill fx, nameplate, ring, crosshair, muzzle flash
 st order: hat R style, hat E style, weapon E style, weapon L style, tracer style, kill-fx style, ring style, crosshair style
 x: optional extra items [type,rarity,name,style,(palette)] */
const BASE=[
{m:1,name:'NEON NEW YEAR',tag:'COUNTDOWN CLEARANCE',col:['#00e5ff','#14082a','#ff3df0'],st:['party','crown','stripe','solid','zig','confetti','pulse','star'],
 n:['Midnight Countdown','Fireworks Finale','Ball Drop Prime','Year Zero','Party Popper','Sparkler Crown','Confetti Cannon','Champagne Gold','Cracker Drone','Fireworks Drone','Sparkler Trail','Fireworks Burst','Resolution','Countdown Ring','Midnight Sight','Spark Flash']},
{m:2,name:'CRIMSON HEARTS',tag:'LOVE AND LEAD',col:['#ff3a6a','#3a0a1a','#ffb0c8'],st:['halo','bow','dots','solid','fade','hearts','dots','heart'],
 n:['Rose Thorn','Valentine Noir','Heartbreaker','Eternal Rose','Cupid Halo','Lovebird Bow','Candy Hearts','Gilded Cupid','Cupid Drone','Heartbeat Drone','Love Letter','Heartburst','Sweetheart','Valentine Ring','Romance Sight','Cupid Flash']},
{m:3,name:'GREEN RUSH',tag:'LUCK OF THE DRAW',col:['#3aff7a','#0a2a14','#ffd24a'],st:['leaf','tophat','camo','scale','rain','coins','dots','plus'],
 n:['Clover Cadet','Emerald Raid','Pot of Gold','Leprechaun King','Lucky Sprout','Clover Topper','Shamrock Camo','Rainbow Scale','Clover Drone','Rainbow Drone','Lucky Streak','Gold Coins','Lucky Charm','Shamrock Ring','Clover Sight','Gold Flash']},
{m:4,name:'SAKURA STORM',tag:'PETALS AND STEEL',col:['#ff8ac8','#2a1030','#ffe0ec'],st:['cat','kabuto','check','grad','fade','petals','pulse','diamond'],
 n:['Blossom Breeze','Cherry Storm','Hanami Master','Kitsune Spirit','Blossom Ears','Petal Kabuto','Petal Check','Blossom Fade','Petal Drone','Koi Drone','Petal Trail','Petal Fall','Hanami','Blossom Ring','Sakura Sight','Pink Flash']},
{m:5,name:'JUNGLE RUN',tag:'THE CANOPY HUNT',col:['#7aff2a','#0a2a0a','#ffd24a'],st:['bucket','mushroom','scale','solid','dash','burst','dash','brackets'],
 n:['Canopy Scout','Viper Strike','Apex Predator','Ancient Idol','Explorer Brim','Spore Cap','Python Scale','Golden Idol','Vine Drone','Idol Drone','Dart Trail','Spore Burst','Jungle Law','Vine Ring','Jaguar Sight','Spore Flash']},
{m:6,name:'SOLAR FLARE',tag:'HIGH NOON HEAT',col:['#ffb62e','#3a1004','#fff0a0'],st:['cap','sombrero','stripe','flame','zig','stars','spin','spin'],
 n:['Sunburn','Heatwave','Solar Sovereign','Midday Sun','Sun Visor','Solar Sombrero','Sunstripe','Molten Core','Sun Drone','Mirage Drone','Heat Haze','Solar Burst','Sundial','Solar Ring','Sunburst Sight','Flare Flash']},
{m:7,name:'OCEAN DEPTHS',tag:'PRESSURE RISING',col:['#4adaff','#04202e','#7affd0'],st:['pot','crown','dots','scale','dbl','bubble','spin','ring'],
 n:['Tide Runner','Deep Diver','Abyss Warden','Leviathan Lord','Diver Helm','Coral Crown','Bubble Dots','Kraken Scale','Reef Drone','Submarine Drone','Wave Trail','Bubble Pop','Tidecaller','Whirlpool Ring','Sonar Sight','Aqua Flash']},
{m:8,name:'DESERT STORM',tag:'SAND AND STATIC',col:['#e0a860','#3a2410','#ffe0a0'],st:['cowboy','crown','camo','solid','fade','burst','dots','cross'],
 n:['Dune Walker','Sandstorm','Sun Pharaoh','Mirage Sovereign','Desert Rider','Pharaoh Crown','Dune Camo','Pharaoh Gold','Scarab Drone','Dust Devil Drone','Dust Trail','Sand Burst','Nomad Lord','Dune Ring','Oasis Sight','Dust Flash']},
{m:9,name:'HARVEST MOON',tag:'GOLDEN HOUR GRIND',col:['#e07a1a','#2a1408','#ffd070'],st:['bucket','leaf','check','flame','dash','petals','dots','dot'],
 n:['Harvest Hand','Autumn Raid','Scarecrow Lord','Moon Reaper','Scarecrow Brim','Acorn Cap','Flannel Check','Harvest Blaze','Hay Drone','Owl Drone','Falling Leaves','Leaf Fall','Harvest Moon','Hay Ring','Acorn Sight','Amber Flash']},
{m:10,name:'HALLOWEEN',tag:'HAUNTED HOURS',col:['#ff7a1a','#1a0a2a','#7aff2a'],st:['pumpkin','ghost','camo','flame','zig','skull','spin','x'],
 n:['Jack Patrol','Haunted Hollow','Nightmare King','Pumpkin Overlord','Jack-o-Lantern','Spectre Sheet','Cobweb Camo','Cursed Flame','Bat Drone','Reaper Drone','Witch Fire','Skull Rise','Trick or Treat','Hex Circle','Cursed Sight','Witch Flash'],
 x:[['hd','e','Horned Fiend','horns'],['hd','r','Witch Hat','wizard'],['kf','e','Spirit Rise','ghost'],['sk','e','Frankenstein Green','',['#3a5a2a','#1a1a1a','#9aff4a']],['wp','r','Bone Camo','camo'],['dr','l','Haunted Hearse Drone',''],['mf','e','Ghostfire Flash','',['#e8ffd0','#7aff2a']],['np','e','Graveyard Shift','']]},
{m:11,name:'AUTUMN EMBER',tag:'SMOKE AND CINDER',col:['#ff6a1a','#1a0c08','#ffd24a'],st:['beanie','flame','flame','spark','zig','flame','pulse','tri'],
 n:['Ember Fall','Cinder Cloak','Ash Warden','Phoenix Dawn','Ember Beanie','Flame Crown','Cinder Flame','Wildfire','Ember Drone','Cinder Drone','Spark Trail','Ashfall','Smolder','Cinder Ring','Ember Sight','Cinder Flash']},
{m:12,name:'WINTER WARFARE',tag:'FROSTBITE PROTOCOL',col:['#7ad8ff','#0a1830','#ffffff'],st:['santa','viking','check','scale','solid','snow','dots','plus'],
 n:['Frost Patrol','Blizzard Ops','Snow Marshal','Aurora Sovereign','Elf Cap','Frost Viking','Ugly Sweater','Ice Dragon','Sleigh Drone','Snowflake Drone','Icicle Trail','Snowfall Blitz','Frostbite','Snowflake Ring','Flurry Sight','Frost Flash']}
];
const RO={c:0,r:1,e:2,l:3,m:4};
/* styles proven to render (taken from the built-in catalog + this table) */
const STY={};for(const c of CAT)if(c.s)(STY[c.t]=STY[c.t]||new Set()).add(c.s);
const TYPES=['sk','hd','wp','tr','kf','np','rg','xh','mf','dr'],RARS=['c','r','e','l','m'];
const NEEDP={sk:[3,3],hd:[2,2],wp:[2,3],tr:[1,4],kf:[2,4],np:[2,2],rg:[1,4],xh:[1,2],mf:[2,2],dr:[3,3]};
const STYLED={hd:1,wp:1,tr:1,kf:1,rg:1,xh:1};
const SPEC=[['sk','r'],['sk','e'],['sk','l'],['sk','m'],['hd','r'],['hd','e'],['wp','e'],['wp','l'],['dr','r'],['dr','e'],['tr','e'],['kf','e'],['np','r'],['rg','e'],['xh','r'],['mf','r']];
function autoPal(t,r,col){const[A,B,C]=col,k={c:.3,r:.4,e:.55,l:.7,m:1}[r];
 switch(t){case'sk':return[mix(B,A,k*.8),mix(B,'#000000',.45),C];
  case'hd':return r==='e'?[C,A]:[A,C];
  case'wp':return r==='l'?[A,C]:[B,A];
  case'dr':return[mix(B,A,.35),mix('#10141c',B,.5),A];
  case'tr':return[A,C];case'kf':return[A,C];case'np':return[A,C];case'rg':return[A,C];case'xh':return[A,C];case'mf':return[C,A]}return[A,C]}
const mk=(t,r,n,s,p,se,pk)=>{const id=t+'_'+slug(n);if(CAT.some(c=>c.id===id))return null;const it={id,n,t,r,s:s||'',p,pk:pk?1:0,se};CAT.push(it);return it};
const GRP={};
for(const B of BASE){const se='m'+pad(B.m),list=[];GRP[se]=list;
 B.n.forEach((n,i)=>{const[t,r]=SPEC[i];let s='';if(t==='hd')s=r==='r'?B.st[0]:B.st[1];else if(t==='wp')s=r==='e'?B.st[2]:B.st[3];else if(t==='tr')s=B.st[4];else if(t==='kf')s=B.st[5];else if(t==='rg')s=B.st[6];else if(t==='xh')s=B.st[7];
  const it=mk(t,r,n,s,autoPal(t,r,B.col),se);if(it)list.push(it)});
 for(const[t,r,n,s,p]of B.x||[]){const it=mk(t,r,n,s,p||autoPal(t,r,B.col),se);if(it)list.push(it)}}
/* ---------- remote content state ---------- */
const RS={seasons:{},rev:'',app:null,announce:'',from:{},ids:new Set(),err:[]};
/* ---------- validation (also used by tools/validate-content.js) ---------- */
const HEX=/^#[0-9a-fA-F]{6}$/,NAME=/^[A-Za-z0-9][A-Za-z0-9 '&.!-]{1,27}$/,TAGRE=/^[A-Za-z0-9 '&.!,-]{1,40}$/,SE=/^[a-z0-9_-]{1,20}$/,DATE=/^\d{4}-\d{2}-\d{2}$/,YM=/^\d{4}-(0[1-9]|1[0-2])$/;
function validateItem(raw){const e=[];if(!raw||typeof raw!=='object')return{ok:0,errors:['not an object']};
 const t=raw.t,r=raw.r,n=typeof raw.n==='string'?raw.n.trim():'';
 if(!TYPES.includes(t))e.push('t must be one of '+TYPES.join(','));
 if(!RARS.includes(r))e.push('r must be one of '+RARS.join(','));
 if(!NAME.test(n))e.push('n must be 2-28 chars: letters, digits, space and \' & . ! -');
 let s=raw.s==null?'':raw.s;if(typeof s!=='string')e.push('s must be a string');
 if(TYPES.includes(t)){if(STYLED[t]){if(!STY[t]||!STY[t].has(s))e.push('s "'+s+'" is not a known '+t+' style (known: '+[...(STY[t]||[])].join(',')+')')}else if(s!=='')e.push('type '+t+' takes no style')}
 const p=raw.p;if(!Array.isArray(p)||!p.every(c=>typeof c==='string'&&HEX.test(c)))e.push('p must be an array of #rrggbb colours');
 else if(NEEDP[t]&&(p.length<NEEDP[t][0]||p.length>NEEDP[t][1]))e.push('p needs '+NEEDP[t][0]+(NEEDP[t][1]!==NEEDP[t][0]?'-'+NEEDP[t][1]:'')+' colours for type '+t);
 let id=raw.id;if(id==null)id=(TYPES.includes(t)&&n?t+'_'+slug(n):'');if(!/^[a-z0-9_]{3,60}$/.test(id))e.push('id must be 3-60 chars a-z 0-9 _');
 if(raw.se!=null&&!SE.test(String(raw.se)))e.push('se (season group) must match a-z0-9_- up to 20 chars');
 if(raw.from!=null&&!DATE.test(String(raw.from)))e.push('from must be YYYY-MM-DD (Sydney date the item enters the shop)');
 if(raw.tier!=null&&!(Number.isInteger(raw.tier)&&raw.tier>=1&&raw.tier<=TIERS))e.push('tier must be an integer 1-'+TIERS);
 if(r==='m'&&!raw.pk&&!raw.se)e.push('mythic items must be pack-only (pk:1) or a season reward (se)');
 if(e.length)return{ok:0,errors:e,id};
 return{ok:1,item:{id,n,t,r,s,p:p.slice(),pk:raw.pk?1:0,se:raw.se?String(raw.se):undefined,from:raw.from||undefined,tier:raw.tier||undefined}}}
function validateSeason(raw){const e=[];if(!raw||typeof raw!=='object')return{ok:0,errors:['not an object']};
 if(!YM.test(String(raw.ym)))e.push('ym must be YYYY-MM');
 if(raw.name!=null&&!NAME.test(String(raw.name)))e.push('name must be 2-28 chars (letters, digits, space and \' & . ! -)');
 if(raw.tag!=null&&!TAGRE.test(String(raw.tag)))e.push('tag must be up to 40 chars');
 if(raw.col!=null&&!(Array.isArray(raw.col)&&raw.col.length===3&&raw.col.every(c=>HEX.test(c))))e.push('col must be three #rrggbb colours');
 if(raw.grp!=null&&!SE.test(String(raw.grp)))e.push('grp must match a-z0-9_-');
 if(e.length)return{ok:0,errors:e};
 return{ok:1,season:{ym:raw.ym,name:raw.name?String(raw.name).toUpperCase():undefined,tag:raw.tag?String(raw.tag).toUpperCase():undefined,col:raw.col,grp:raw.grp,tiers:Array.isArray(raw.tiers)?raw.tiers:undefined}}}
function validatePack(p){const out={ok:1,errors:[],warnings:[],items:[],seasons:[],rev:'',app:null,announce:''};
 if(!p||typeof p!=='object'||Array.isArray(p)){out.ok=0;out.fatal=1;out.errors.push('content must be a JSON object');return out}
 if(p.schema!==1){out.ok=0;out.fatal=1;out.errors.push('schema must be 1');return out}
 out.rev=typeof p.rev==='string'?p.rev.slice(0,40):'';
 if(typeof p.announce==='string')out.announce=p.announce.replace(/[^\x20-\x7e]/g,'').slice(0,140);
 if(p.app&&typeof p.app==='object'&&/^\d+\.\d+\.\d+$/.test(String(p.app.version||'')))out.app={version:p.app.version,url:/^https:\/\/github\.com\//.test(String(p.app.url||''))?p.app.url:'',notes:String(p.app.notes||'').replace(/[^\x20-\x7e]/g,'').slice(0,160)};
 const items=Array.isArray(p.items)?p.items:[];if(items.length>2000){out.ok=0;out.fatal=1;out.errors.push('too many items (max 2000)');return out}
 const seen=new Set();
 items.forEach((raw,i)=>{const v=validateItem(raw);const lab='items['+i+']'+(raw&&raw.n?' "'+raw.n+'"':'');
  if(!v.ok){out.errors.push(lab+': '+v.errors.join('; '));return}
  if(seen.has(v.item.id)){out.errors.push(lab+': duplicate id '+v.item.id);return}
  const ex=CAT.find(c=>c.id===v.item.id);if(ex&&!RS.ids.has(v.item.id)){out.errors.push(lab+': id '+v.item.id+' already exists in the built-in catalog');return}
  seen.add(v.item.id);out.items.push(v.item)});
 const ss=Array.isArray(p.seasons)?p.seasons:[];
 ss.forEach((raw,i)=>{const v=validateSeason(raw);if(!v.ok){out.errors.push('seasons['+i+']: '+v.errors.join('; '));return}out.seasons.push(v.season)});
 /* season-group items need a tier unless that group builds its own track */
 for(const it of out.items)if(it.se&&!it.tier&&GRP[it.se])out.warnings.push('item '+it.id+' joins built-in season group '+it.se+' without a tier: it takes the next free slot, set "tier" to control it');
 out.ok=out.errors.length===0;return out}
/* ---------- tier layout ---------- */
function filler(t){if(t===15)return{k:'pk',p:'elite',n:1};if(t%5===0)return{k:'pk',p:'supply',n:1};return{k:'cr',n:Math.round((150+t*10)/50)*50}}
const BUILTIN=new Set();for(const g in GRP)GRP[g].forEach(c=>BUILTIN.add(c.id));
function layout0(items,explicit){const T=Array(TIERS+1).fill(null),used=new Set(),rest=[];
 if(Array.isArray(explicit)){explicit.slice(0,TIERS).forEach((x,i)=>{if(x&&x.k==='cr'&&x.n>0&&x.n<=5000)T[i+1]={k:'cr',n:Math.floor(x.n)};else if(x&&x.k==='pk'&&PK[x.p])T[i+1]={k:'pk',p:x.p,n:Math.max(1,Math.min(3,x.n|0||1))};else if(x&&x.k==='it'&&CAT.some(c=>c.id===x.id)){T[i+1]={k:'it',id:x.id};used.add(x.id)}})}
 const idx=new Map(items.map((c,i)=>[c.id,i]));
 const myth=items.find(c=>c.r==='m'&&!used.has(c.id));
 for(const c of items){if(used.has(c.id)||c===myth)continue;if(c.tier&&!T[c.tier]){T[c.tier]={k:'it',id:c.id};used.add(c.id)}else rest.push(c)}
 rest.sort((a,b)=>(RO[a.r]-RO[b.r])||(idx.get(a.id)-idx.get(b.id)));
 const cand=[];for(let t=2;t<TIERS;t++)if(!T[t])cand.push(t);const k=Math.min(rest.length,cand.length);
 for(let i=0;i<k;i++){const t=cand[Math.floor((i+.5)*cand.length/k)];T[t]={k:'it',id:rest[i].id}}
 if(myth&&!T[TIERS])T[TIERS]={k:'it',id:myth.id};
 for(let t=1;t<=TIERS;t++)if(!T[t])T[t]=t===TIERS?{k:'pk',p:'elite',n:1}:filler(t);
 return T.slice(1)}
/* Built-in items are laid out first and NEVER move. Items added later from GitHub only take over empty (credit/pack) tiers, so a
   player who already unlocked tier N keeps exactly what they were shown. A season with its own "tiers" list or with no built-in items builds a fresh track. */
function layout(items,explicit){const B=items.filter(c=>BUILTIN.has(c.id)),Rm=items.filter(c=>!BUILTIN.has(c.id));
 if(!B.length||explicit){const T=layout0(items,explicit);T.notes=[];return T}
 const T=layout0(B,null),notes=[],taken=new Set(),isFree=t=>t>=1&&t<=TIERS&&T[t-1].k!=='it'&&!taken.has(t);
 const put=(c,t)=>{T[t-1]={k:'it',id:c.id};taken.add(t)};
 const want=Rm.filter(c=>c.tier).sort((a,b)=>a.tier-b.tier||a.id.localeCompare(b.id)),any=Rm.filter(c=>!c.tier);
 const next=()=>{for(let t=2;t<TIERS;t++)if(isFree(t)&&T[t-1].k==='cr')return t;for(let t=1;t<=TIERS;t++)if(isFree(t))return t;return 0};
 const late=[];for(const c of want){if(isFree(c.tier))put(c,c.tier);else late.push(c)}
 for(const c of late){const t=next();if(t){put(c,t);notes.push(c.id+': tier '+c.tier+' already holds a reward, moved to tier '+t)}else notes.push(c.id+': no free tier left in this season')}
 for(const c of any){const t=next();if(t)put(c,t);else notes.push(c.id+': no free tier left in this season')}
 T.notes=notes;return T}
const PK={supply:1,elite:1};
/* ---------- season resolution ---------- */
function seasonKey(ym){const m=+ym.slice(5,7),B=BASE[m-1],o=RS.seasons[ym];
 const grp=(o&&o.grp)||'m'+pad(m),items=CAT.filter(c=>c.se===grp);
 const bname=B.name,btag=B.tag,bcol=B.col;
 return{key:ym,ym,m,grp,name:(o&&o.name)||bname,tag:(o&&o.tag)||btag,col:(o&&o.col)||bcol,items,tiers:layout(items,o&&o.tiers),start:ymStart(ym),end:ymEnd(ym),override:!!o}}
const seasonAt=(t=now())=>seasonKey(ymKey(t));
const monthName=m=>['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][m-1];
const calendar=(t=now())=>{const cur=ymKey(t),y=+cur.slice(0,4);return BASE.map(B=>{const ym=y+'-'+pad(B.m),o=RS.seasons[ym];return{ym,m:B.m,abbr:monthName(B.m),name:(o&&o.name)||B.name,cur:ym===cur}})};
/* ---------- apply a (validated) content pack ---------- */
function applyContent(p){const v=validatePack(p);const res={ok:!v.fatal,added:0,updated:0,errors:v.errors,warnings:v.warnings,rev:v.rev,app:v.app,announce:v.announce};
 if(v.fatal)return res;
 const E=window.ECO,nextDay=()=>{try{return E&&E.dayKey?E.dayKey(E.nextReset(Date.now())):dayKey(Date.now()+864e5)}catch(_){return dayKey(Date.now()+864e5)}};
 for(const it of v.items){const old=CAT.find(c=>c.id===it.id);const from=it.from||RS.from[it.id]||(it.se?undefined:nextDay());if(from)RS.from[it.id]=from;
  const rec={id:it.id,n:it.n,t:it.t,r:it.r,s:it.s,p:it.p,pk:it.pk,se:it.se,from,tier:it.tier};
  if(old){Object.assign(old,rec);res.updated++}else{CAT.push(rec);if(E&&E.BYID)E.BYID[rec.id]=rec;res.added++}RS.ids.add(it.id);if(rec.s&&STYLED[rec.t]&&!(STY[rec.t]&&STY[rec.t].has(rec.s)))(STY[rec.t]=STY[rec.t]||new Set()).add(rec.s)}
 RS.seasons={};for(const s of v.seasons)RS.seasons[s.ym]=s;
 if(v.rev)RS.rev=v.rev;RS.app=v.app;RS.announce=v.announce;RS.err=v.errors;
 if(E&&E.BYID)for(const c of CAT)E.BYID[c.id]=c;
 return res}
/* ---------- cache: last good pack is applied synchronously at load so offline play keeps the new content ---------- */
function loadCache(){try{const t=localStorage.getItem(CK);if(!t)return;const j=JSON.parse(t);if(j&&j.pack){if(j.from&&typeof j.from==='object')Object.assign(RS.from,j.from);applyContent(j.pack)}}catch(e){}}
loadCache();
window.R6S={TIERS,XP_TIER,TZ,BASE,GRP,RS,CK,
 now,setNow:v=>{NOW=v==null?null:+v},dayKey,ymKey,nextYm,prevYm,ymStart,ymEnd,seasonAt,seasonKey,calendar,monthName,
 layout,validateItem,validateSeason,validatePack,applyContent,
 content:()=>({rev:RS.rev,app:RS.app,announce:RS.announce,errors:RS.err,remoteItems:RS.ids.size})};
if(typeof module!=='undefined')module.exports=window.R6S;
})();
