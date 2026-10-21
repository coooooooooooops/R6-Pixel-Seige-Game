
'use strict';
const W=168,H=216,T=16,VW=480,VH=288,PI=Math.PI,D4=[[1,0],[-1,0],[0,1],[0,-1]];
const cv=document.getElementById('c'),g=cv.getContext('2d');cv.width=VW;cv.height=VH;g.imageSmoothingEnabled=false;
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),dst=(a,b,c,d)=>Math.hypot(a-c,b-d);
const adiff=(a,b)=>{let d=a-b;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;return d};
const turn=(a,b,s)=>{const d=adiff(b,a);return Math.abs(d)<s?b:a+Math.sign(d)*s};
const SDF={vol:1,mu:.8,sv:1,shake:1,hurt:1,feed:1,mini:1,fps:0,xs:1,xc:0,diff:1,fog:1};
const SET=Object.assign({},SDF);try{Object.assign(SET,JSON.parse(localStorage.getItem('r6s_set')||'{}'));SET.fog=1}catch(e){}
const DEFB={up:'w',down:'s',left:'a',right:'d',sprint:'shift',walk:'alt',map:'m',use:'e',barr:'b',crow:'f',rap:'x',reload:'r',w1:'1',w2:'2',gad:'q',gad2:'g',cam:'c',lnl:'z',lnr:'v',ping:'t',pause:'escape',ff:'enter'};
const BIND=Object.assign({},DEFB);try{Object.assign(BIND,JSON.parse(localStorage.getItem('r6s_bind')||'{}'))}catch(e){}
let KM={},PAUSED=false,FPS=60,REB=null;const rkm=()=>{KM={};for(const a in DEFB)KM[BIND[a]]=DEFB[a]};rkm();
const DEFV=new Set(Object.values(DEFB)),tk=r=>KM[r]||(DEFV.has(r)?'\0':r),saveS=()=>{try{localStorage.setItem('r6s_set',JSON.stringify(SET));localStorage.setItem('r6s_bind',JSON.stringify(BIND))}catch(e){}try{window.R6Acct&&R6Acct.dirty()}catch(e){}};
// ---------- audio ----------
let AC=null;function sfx(f,d,type,v){try{AC=AC||new AudioContext();const o=AC.createOscillator(),n=AC.createGain();o.type=type||'square';o.frequency.value=f;n.gain.value=(v||.04)*SET.vol*SET.sv;o.connect(n);n.connect(AC.destination);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/3),AC.currentTime+d);n.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.start();o.stop(AC.currentTime+d)}catch(e){}}
// ---------- menu music ----------
const MUS={run:false,on:true};
function musicStart(){if(!MUS.on||MUS.run||G)return;try{AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume()}catch(e){return}
 const a=AC,t0=a.currentTime;MUS.run=true;const m=a.createGain();m.gain.setValueAtTime(0,t0);m.gain.linearRampToValueAtTime(.55*Math.max(.02,SET.mu*SET.vol),t0+3);m.connect(a.destination);
 const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=650;lp.Q.value=3;lp.connect(m);
 const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=.06;lg.gain.value=300;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
 const dl=a.createDelay(2);dl.delayTime.value=.62;const fb=a.createGain();fb.gain.value=.45;const df=a.createBiquadFilter();df.type='lowpass';df.frequency.value=1500;dl.connect(df);df.connect(fb);fb.connect(dl);df.connect(m);
 const CH=[[55,110,164.81,220],[43.65,87.31,130.81,174.61],[36.71,73.42,110,146.83],[41.2,82.41,123.47,164.81]];
 const oscs=[];CH[0].forEach((f,i)=>{for(const d of[-6,6]){const o=a.createOscillator(),gg=a.createGain();o.type=i?'sawtooth':'sine';o.frequency.value=f;o.detune.value=d;gg.gain.value=i?.035:.2;o.connect(gg);gg.connect(lp);o.start();oscs.push([o,i])}});
 const note=(f,when,dur,vol,type,dest)=>{const o=a.createOscillator(),n=a.createGain();o.type=type;o.frequency.value=f;n.gain.setValueAtTime(0,when);n.gain.linearRampToValueAtTime(vol,when+.02);n.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(n);n.connect(dest);if(dest===m)n.connect(dl);o.start(when);o.stop(when+dur+.05)};
 const nb=a.createBuffer(1,Math.floor(a.sampleRate*.3),a.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 let b=0;MUS.iv=setInterval(()=>{const t=a.currentTime+.05,ch=CH[(b>>4)&3];
  if(b%16===0)oscs.forEach(([o,i])=>o.frequency.setTargetAtTime(ch[i],t,1.8));
  if(b%4===0)note(ch[0],t,1.7,.5,'sine',lp);
  if(b%2===0){const sr=a.createBufferSource(),bf=a.createBiquadFilter(),sg=a.createGain(),big=b%4===0;sr.buffer=nb;bf.type='bandpass';bf.frequency.value=big?120:2400;sg.gain.setValueAtTime(big?.14:.012,t);sg.gain.exponentialRampToValueAtTime(.0001,t+.18);sr.connect(bf);bf.connect(sg);sg.connect(m);sr.start(t)}
  if(Math.random()<.5)note(ch[1+(Math.random()*3|0)]*(Math.random()<.5?2:4),t,1.4,.05,'triangle',m);
  b++},520);
 MUS.m=m;MUS.nodes=[lfo,...oscs.map(x=>x[0])]}
function musicStop(){if(!MUS.run)return;MUS.run=false;clearInterval(MUS.iv);try{const a=AC,m=MUS.m,n=MUS.nodes;m.gain.cancelScheduledValues(a.currentTime);m.gain.setValueAtTime(m.gain.value,a.currentTime);m.gain.linearRampToValueAtTime(0,a.currentTime+1.2);setTimeout(()=>{for(const o of n)try{o.stop()}catch(e){}},1400)}catch(e){}}
// ---------- data ----------
const WP={ar:{n:'Assault Rifle',dmg:24,cd:7,mag:30,spr:.05,pel:1,rl:110,rng:270},smg:{n:'SMG',dmg:15,cd:4,mag:35,spr:.09,pel:1,rl:90,rng:210},sg:{n:'Shotgun',dmg:11,cd:34,mag:6,spr:.22,pel:8,rl:120,rng:150},dmr:{n:'DMR',dmg:55,cd:24,mag:10,spr:.01,pel:1,rl:120,rng:320},lmg:{n:'LMG',dmg:20,cd:6,mag:100,spr:.08,pel:1,rl:200,rng:260},ar2:{n:'Carbine',dmg:21,cd:5,mag:30,spr:.07,pel:1,rl:100,rng:240},bar:{n:'Battle Rifle',dmg:38,cd:12,mag:20,spr:.04,pel:1,rl:120,rng:300},snp:{n:'Sniper',dmg:90,cd:50,mag:5,spr:0,pel:1,rl:140,rng:420},asg:{n:'Auto Shotgun',dmg:9,cd:12,mag:8,spr:.2,pel:6,rl:130,rng:130},mp:{n:'Machine Pistol',dmg:12,cd:3,mag:30,spr:.11,pel:1,rl:80,rng:170},rev:{n:'Revolver',dmg:48,cd:30,mag:6,spr:.02,pel:1,rl:110,rng:230},pst:{n:'Pistol',dmg:22,cd:11,mag:14,spr:.06,pel:1,rl:70,rng:210}};
const OPS={A:[
{id:'sledge',n:'SLEDGE',c:['#2f5d8a','#1c1c22','#e0a030'],hp:130,sp:.95,w:'ar',gd:'hammer',gn:99,t:'Breaching Hammer: Q smashes the soft wall in front of you.'},
{id:'thatcher',n:'THATCHER',c:['#355c3d','#222','#7ed0ff'],hp:110,sp:1.1,w:'ar',gd:'emp',gn:2,t:'EMP Grenades: Q destroys defender traps in the blast.'},
{id:'ash',n:'ASH',c:['#a33a2b','#2a1a1a','#ffd27a'],hp:90,sp:1.35,w:'ar',gd:'ash',gn:3,t:'Breaching Rounds: Q blasts a soft wall from range. Fast, fragile.'},
{id:'thermite',n:'THERMITE',c:['#6c4a2b','#2b2b2b','#ff7a1a'],hp:110,sp:1.1,w:'smg',gd:'therm',gn:1,t:'Exothermic Charge: Q burns open a reinforced steel wall (3 s).'},
{id:'montagne',n:'MONTAGNE',c:['#3d4a66','#15151c','#99aabb'],hp:160,sp:.75,w:'pst',gd:null,gn:0,t:'Extendable Shield: frontal bullets mostly blocked. Pistol only. Slow.'},
{id:'blitz',n:'BLITZ',c:['#2a2f3a','#111','#ffffff'],hp:110,sp:1.1,w:'smg',gd:'flash',gn:3,t:'Flash Shield: Q blinds defenders in a cone in front of you.'}],
D:[
{id:'rook',n:'ROOK',c:['#5a6b3a','#222','#e8e8e8'],hp:150,sp:.9,w:'smg',gd:null,gn:0,t:'Armor Plates: extra health for you. Heavy, durable.'},
{id:'smoke',n:'SMOKE',c:['#4a3a5a','#1a1a1a','#9aff4a'],hp:100,sp:1.05,w:'smg',gd:'smoke',gn:2,t:'Toxic Canisters: Q throws a gas cloud that damages attackers.'},
{id:'kapkan',n:'KAPKAN',c:['#7a3a2a','#222','#ff5a3a'],hp:100,sp:1.05,w:'sg',gd:'kap',gn:3,t:'Entry Denial Devices: Q places a hidden laser mine (explodes on attackers).'},
{id:'castle',n:'CASTLE',c:['#8a7a2a','#222','#ffe14a'],hp:100,sp:1.05,w:'smg',gd:'castle',gn:2,t:'Armor Panels: Q reinforces the soft wall in front of you (beyond team limit).'},
{id:'pulse',n:'PULSE',c:['#2a5a6a','#111','#ff4a6a'],hp:90,sp:1.3,w:'sg',gd:'pulse',gn:99,t:'Cardiac Sensor: Q shows attacker heartbeats through walls (team sees them).'},
{id:'doc',n:'DOC',c:['#3a6a4a','#222','#ffffff'],hp:130,sp:.9,w:'smg',gd:'doc',gn:2,t:'Stim Pistol: Q heals you and a nearby ally.'},
{id:'frost',n:'FROST',c:['#4a6a8a','#222','#bfe6ff'],hp:100,sp:1.05,w:'sg',gd:'mat',gn:3,t:'Welcome Mats: Q drops a hidden leg trap at your feet.'}]};
const NEWOPS={A:[["Striker", 2, 2, "ar2", "flash", 2, "SUPPORT", "Intel Cache"], ["Twitch", 1, 3, "ar2", "emp", 2, "ENTRY", "Shock Drones"], ["Glaz", 2, 2, "snp", "", 0, "SNIPER", "Flip Sight"], ["Fuze", 3, 1, "lmg", "ash", 2, "BREACHER", "Cluster Charge"], ["IQ", 1, 3, "ar2", "emp", 2, "INTEL", "Electronics Detector"], ["Buck", 2, 2, "ar2", "ash", 2, "BREACHER", "Skeleton Key"], ["Blackbeard", 2, 2, "bar", "", 0, "FRONT LINE", "Rifle Shield"], ["Capitao", 1, 3, "ar2", "flash", 2, "AREA CONTROL", "Tactical Crossbow"], ["Hibana", 1, 3, "ar2", "ash", 2, "HARD BREACH", "X-KOTR Launcher"], ["Jackal", 2, 2, "smg", "", 0, "TRACKER", "Eyenox Model III"], ["Ying", 2, 2, "smg", "flash", 2, "ENTRY", "Candela Flashes"], ["Zofia", 2, 2, "lmg", "flash", 2, "CONCUSSION", "Withstand and KS79 Launcher"], ["Dokkaebi", 2, 2, "smg", "emp", 2, "HACKER", "Logic Bomb"], ["Lion", 2, 2, "ar2", "", 0, "INTEL", "EE-ONE-D Scan"], ["Finka", 2, 2, "ar2", "doc", 2, "BOOST", "Adrenal Surge"], ["Maverick", 2, 2, "ar2", "hammer", 99, "BREACHER", "Suzaku Torch"], ["Nomad", 2, 2, "ar2", "emp", 2, "FLANK", "Airjab Launcher"], ["Gridlock", 3, 1, "ar2", "", 0, "AREA CONTROL", "Trax Stingers"], ["Nokk", 2, 2, "smg", "flash", 2, "STEALTH", "HEL Presence Reduction"], ["Amaru", 2, 2, "smg", "", 0, "MOBILITY", "Garra Hook"], ["Kali", 2, 2, "snp", "", 0, "SNIPER", "CSRX 300 Lance"], ["Iana", 2, 2, "ar2", "", 0, "RECON", "Gemini Replicator"], ["Ace", 2, 2, "ar", "ash", 3, "HARD BREACH", "S.E.L.M.A. Aqua Breacher"], ["Zero", 2, 2, "smg", "emp", 2, "INTEL", "Argus Launcher"], ["Flores", 2, 2, "ar2", "ash", 2, "DEMOLITION", "RCE-Ratero Charge"], ["Osa", 2, 2, "smg", "", 0, "SUPPORT", "Talon-8 Shield"], ["Sens", 2, 2, "ar2", "flash", 2, "VISION DENIAL", "R.O.U. Projector"], ["Grim", 2, 2, "smg", "", 0, "TRACKER", "Kawan Hive Launcher"], ["Brava", 2, 2, "ar2", "emp", 2, "HACKER", "Kludge Drone"], ["Ram", 3, 1, "lmg", "hammer", 99, "BREACHER", "BU-GI Auto Breacher"], ["Deimos", 2, 2, "ar2", "", 0, "TRACKER", "DeathMARK Tracker"], ["Rauora", 2, 2, "bar", "", 0, "MAP CONTROL", "D.O.M. Panel Launcher"], ["Solid Snake", 1, 3, "bar", "", 0, "INTEL", "Soliton Radar Mk III"]],D:[["Sentry", 2, 2, "sg", "", 0, "SUPPORT", "Deployable Shield Guard"], ["Mute", 2, 2, "smg", "", 0, "ANTI-GADGET", "Signal Disruptor"], ["Tachanka", 3, 1, "lmg", "", 0, "ANCHOR", "Shumikha Launcher"], ["Jager", 2, 2, "ar2", "", 0, "ROAMER", "Active Defense System"], ["Bandit", 2, 2, "smg", "kap", 3, "ANTI-BREACH", "Shock Wire"], ["Valkyrie", 2, 2, "smg", "pulse", 0, "INTEL", "Black Eye Cameras"], ["Caveira", 2, 2, "smg", "", 0, "ROAMER", "Silent Step"], ["Echo", 3, 1, "smg", "pulse", 0, "INTEL", "Yokai Drones"], ["Mira", 2, 2, "asg", "castle", 2, "ANCHOR", "Black Mirror"], ["Lesion", 2, 2, "smg", "mat", 3, "TRAP", "Gu Mines"], ["Ela", 1, 3, "smg", "kap", 3, "TRAP", "Grzmot Mines"], ["Vigil", 1, 3, "smg", "", 0, "ROAMER", "ERC-7 Cloak"], ["Maestro", 3, 1, "lmg", "pulse", 0, "INTEL", "Evil Eye Cameras"], ["Alibi", 1, 3, "smg", "kap", 3, "DECOY", "Prisma Holograms"], ["Clash", 3, 1, "smg", "", 0, "CROWD CONTROL", "CCE Shield"], ["Kaid", 3, 1, "asg", "kap", 2, "ANTI-BREACH", "Rtila Electroclaw"], ["Mozzie", 2, 2, "smg", "pulse", 0, "INTEL", "Pests"], ["Warden", 2, 2, "smg", "", 0, "ANTI-FLASH", "Glance Smart Glasses"], ["Goyo", 3, 1, "asg", "castle", 2, "ANCHOR", "Volcan Shield"], ["Wamai", 2, 2, "smg", "", 0, "PROJECTILE DEFENSE", "Mag-NET System"], ["Oryx", 3, 1, "asg", "", 0, "ROAMER", "Remah Dash"], ["Melusi", 1, 3, "smg", "mat", 3, "AREA DENIAL", "Banshee Sonic Defense"], ["Aruni", 2, 2, "smg", "castle", 2, "PASSAGE DENIAL", "Surya Gate"], ["Thunderbird", 2, 2, "smg", "doc", 3, "SUPPORT", "Kona Station"], ["Thorn", 2, 2, "asg", "kap", 3, "TRAP", "Razorbloom Shell"], ["Azami", 2, 2, "smg", "castle", 3, "MAP CONTROL", "Kiba Barrier"], ["Solis", 1, 3, "smg", "pulse", 0, "INTEL", "SPEC-IO Electro-Sensor"], ["Fenrir", 3, 1, "smg", "smoke", 2, "AREA DENIAL", "F-NATT Dread Mine"], ["Tubarao", 2, 2, "smg", "smoke", 2, "AREA DENIAL", "Zoto Canister"], ["Skopos", 2, 2, "smg", "", 0, "INTEL", "Pantheon Shells"], ["Denari", 2, 2, "smg", "kap", 3, "TRAP", "Trap Deployer"], ["Noor", 2, 2, "ar2", "mat", 2, "ANTI-ENTRY", "Horus Lance Launcher"]]};const GDT={"": "no active gadget", "flash": "blinds defenders in a cone", "emp": "destroys defender traps in the blast", "ash": "blasts a soft wall from range", "hammer": "smashes the soft wall in front", "doc": "heals you and a nearby ally", "smoke": "throws a damaging gas cloud", "kap": "places a hidden laser trap", "mat": "drops a hidden leg trap", "castle": "reinforces the wall in front", "pulse": "shows attacker heartbeats to the team"};
(()=>{const hc=n=>{let h=0;for(const ch of n)h=(h*31+ch.charCodeAt(0))>>>0;return h};const hx=(h,s,l)=>{const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12,c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return('0'+Math.round(255*c).toString(16)).slice(-2)};return'#'+f(0)+f(8)+f(4)};
for(const sd of['A','D'])for(const[n,a,sp,w,g,gn,r,ab]of NEWOPS[sd]){const id=n.toLowerCase().replace(/[^a-z]/g,'');if(OPS[sd].some(o=>o.id===id))continue;const h=hc(n)%360;
OPS[sd].push({id,n:n.toUpperCase(),c:[hx(h,.35,.3),hx((h+40)%360,.1,.12),hx((h+180)%360,.8,.6)],hp:[0,90,110,140][a],sp:[0,.9,1.1,1.3][sp],w,gd:g||null,gn,r,t:ab+' // in this build: '+GDT[g]+(g?'.':'. Passive only for now.')})}})();
// ---------- real guns, per-operator loadouts, appearances ----------
// Stats are archetype-based approximations (not Ubisoft's numbers). [name, archetype, dmg x, cooldown x]
const GUNS=[['L85A2','ar'],['AR33','ar'],['G36C','ar2'],['R4-C','ar2'],['TYPE-89','ar'],['416-C Carbine','ar2'],['M4','ar2'],['F2','ar'],['C8-SFW','ar2'],['Spear .308','bar',1,1.1],['AK-12','ar',1.05,1],['AK-74M','ar'],['M762','bar'],['MK17 CQB','bar'],['PARA-308','bar',.95,.9],['V308','bar'],['ARX200','bar'],['SC3000K','ar'],['POF-9','ar2'],['SG551','ar'],['AUG A2','ar'],['AUG A3','ar'],['C7E','ar2'],['F90','ar'],['556XI','ar'],['Commando 9','ar2'],['ALDA 5.56','ar2'],['417','dmr'],['CAMRS','dmr'],['SR-25','dmr'],['Mk 14 EBR','dmr'],['AR-15.50','dmr',1.1,1.1],['PMR90A2','dmr'],['OTs-03','snp'],['CSRX 300','snp'],
['M249','lmg'],['M249 SAW','lmg',.95,.85],['6P41','lmg'],['G8A1','lmg'],['T-95 LSW','lmg'],['LMG-E','lmg'],['DP27','lmg',1.15,1.3],
['MP5K','smg'],['MP5','smg'],['MP5SD','smg',.95,1],['MP7','smg',.9,.8],['P90','smg',.9,.8],['UMP45','smg',1.3,1.5],['FMG-9','smg'],['MPX','smg'],['M12','smg'],['Vector .45 ACP','smg',1.2,.7],['T-5 SMG','smg'],['Scorpion EVO 3 A1','smg'],['K1A','smg'],['MX4 Storm','smg'],['P10 RONI','smg'],['9mm C1','smg'],['9x19VSN','smg'],['PDW9','smg'],['SPSMG9','smg'],['UZK50GI','smg'],['Mk1 9mm','smg'],['SMG-12','mp'],['SMG-11','mp'],['Bearing 9','mp'],
['M1014','asg'],['M590A1','sg',1,1],['Super 90','sg'],['SuperNova','sg'],['SIX12','sg'],['SIX12 SD','sg'],['BOSG.12.2','sg'],['SG-CQB','sg'],['ITA12L','sg'],['ITA12S','sg'],['ACS12','asg'],['TCSG12','sg'],['FO-12','asg'],['SPAS-12','sg'],['SPAS-15','asg'],['M870','sg'],['SASG-12','asg'],['Super Shorty','sg',1.3,.8],
['P226 Mk 25','pst'],['5.7 USG','pst',1.1,1],['M45 MEUSOC','pst',1.3,1.2],['P9','pst'],['LFP586','rev'],['P12','pst'],['PMM','pst'],['GSh-18','pst'],['USP40','pst'],['SDP 9mm','pst'],['D-50','rev',1.2,1.2],['Q-929','pst'],['RG15','pst'],['C75 Auto','pst'],['Luison','pst'],['Keratos .357','rev'],['Bailiff 410','rev',.9,1],['.44 Vendetta','rev',1.05,1],['1911 TACOPS','pst'],['P229','pst'],['Gonne-6','rev',1.3,1.6],['D-40','pst'],['PRB92','pst'],['P-10C','pst'],['Reaper MK2','pst'],['TACIT .45','pst',1.1,1],['Smith 5.7','pst']];
const gk=n=>n.toLowerCase().replace(/[^a-z0-9]/g,'');
const GN={};for(const[n,a,dm,cm]of GUNS){const k='g_'+gk(n),b=WP[a];WP[k]={...b,n,a,dmg:Math.round(b.dmg*(dm||1)),cd:Math.max(2,Math.round(b.cd*(cm||1)))};GN[gk(n)]=k}
const glist=s=>s.split(',').map(x=>{const k=GN[gk(x.trim())];if(!k)throw new Error('unknown gun '+x);return k});
// operator id : 'primaries / secondaries'  (from recall of the Siege loadouts; see notes)
const LOAD={
sledge:'L85A2,M590A1/P226 Mk 25,SMG-11',thatcher:'AR33,L85A2/P226 Mk 25',ash:'G36C,R4-C/5.7 USG,M45 MEUSOC',thermite:'556XI,M1014/5.7 USG,M45 MEUSOC',montagne:'P9/P9,LFP586',blitz:'P12/P12',
striker:'M4,416-C Carbine/P12,SMG-11',twitch:'F2,417,SG-CQB/P9,LFP586',glaz:'OTs-03/PMM,GSh-18',fuze:'6P41,AK-12/PMM,GSh-18',iq:'AUG A2,G8A1/P12',buck:'C8-SFW,CAMRS/Mk1 9mm',blackbeard:'MK17 CQB,SR-25/D-50',capitao:'PARA-308,M249/PRB92,1911 TACOPS',hibana:'TYPE-89,SuperNova/P229,Bearing 9',
jackal:'C7E,PDW9,ITA12L/USP40,ITA12S',ying:'T-95 LSW,SIX12/Q-929',zofia:'LMG-E,M762/RG15',dokkaebi:'Mk 14 EBR,BOSG.12.2/SMG-12,5.7 USG',lion:'V308,417,SG-CQB/P9,LFP586',finka:'Spear .308,6P41,SASG-12/PMM,GSh-18',maverick:'M4,AR-15.50/1911 TACOPS',nomad:'AK-74M,ARX200/.44 Vendetta',gridlock:'F90,M249 SAW/Super Shorty,SMG-11',
nokk:'FMG-9,SIX12 SD/D-50',amaru:'G8A1,SuperNova/SMG-11',kali:'CSRX 300/SPSMG9,C75 Auto',iana:'ARX200,G36C/Gonne-6',ace:'AK-12,M1014/P9,Keratos .357',zero:'SC3000K,MP7/5.7 USG,Gonne-6',flores:'AR33,SR-25,T-95 LSW/GSh-18',osa:'PDW9,556XI/PMM',sens:'POF-9,417/SDP 9mm',grim:'SG551,P90/1911 TACOPS',brava:'PARA-308,Super 90/USP40,Super Shorty',ram:'R4-C,M590A1,LMG-E/Mk1 9mm',deimos:'AK-74M,M590A1/Gonne-6',rauora:'417,M249/Reaper MK2,GSh-18',solidsnake:'PMR90A2,F2/TACIT .45',
sentry:'Commando 9/Super Shorty',mute:'MP5K,M590A1/P226 Mk 25,SMG-11',tachanka:'DP27,9x19VSN/GSh-18,Bearing 9',jager:'416-C Carbine,M870/P12',bandit:'MP7,M870/P12',valkyrie:'MPX,SPAS-12/D-50',caveira:'M12,SPAS-15/Luison',echo:'MP5SD,SuperNova/P229,Bailiff 410',mira:'Vector .45 ACP,ITA12L/USP40',lesion:'SIX12,T-5 SMG/Q-929',ela:'Scorpion EVO 3 A1,FO-12/RG15',vigil:'K1A/C75 Auto',maestro:'ALDA 5.56,ACS12/Bailiff 410',alibi:'MX4 Storm,ACS12/Keratos .357,Bailiff 410',clash:'Luison/SPSMG9',kaid:'AUG A3,TCSG12/LFP586,D-40',mozzie:'Commando 9,P10 RONI/SDP 9mm',warden:'MPX,M590A1/P-10C',goyo:'Vector .45 ACP,TCSG12/P229',wamai:'AUG A2,MP5K/Keratos .357',oryx:'T-5 SMG,SPAS-12/Bearing 9',melusi:'MP5,SASG-12/D-50',aruni:'P10 RONI,Mk 14 EBR/PRB92',thunderbird:'Spear .308,SPSMG9/Bearing 9',thorn:'UZK50GI,M870/1911 TACOPS,Bailiff 410',azami:'9mm C1,ACS12/D-40',solis:'P90,ITA12S/SMG-11',fenrir:'MP7,SASG-12/Smith 5.7',tubarao:'MPX,AR-15.50/ITA12S',skopos:'MP5K,SPAS-12/P229',denari:'Scorpion EVO 3 A1,SG-CQB/P12',noor:'AR-15.50,SIX12/D-40',
rook:'MP5,P90,SG-CQB/P9,LFP586',doc:'MP5,P90,SG-CQB/P9,LFP586',smoke:'FMG-9,M590A1/P226 Mk 25,SMG-11',kapkan:'9x19VSN,SASG-12/PMM,GSh-18',castle:'UMP45,M1014/5.7 USG,Super Shorty,Bailiff 410',pulse:'UMP45,M1014/5.7 USG,M45 MEUSOC',frost:'Super 90,9mm C1/Mk1 9mm,ITA12S'};
for(const sd of['A','D'])for(const o of OPS[sd]){const L=LOAD[o.id];if(!L)throw new Error('no loadout '+o.id);const[p,s]=L.split('/');o.pw=glist(p);o.sw=glist(s);o.w=o.pw[0];if(o.id==='montagne')o.w='pst';}
// appearance: sk skin, hd head style (helm|bal|cap|bare|gas|hood|visor), hc head colour, hr hair, gl lens/goggle colour, mk lower-face cover, bd beard, vc vest colour, pt pants, c [suit,head,accent], ex extras
const SKN={a:'#f2cfa8',b:'#e0b890',c:'#c68a5c',d:'#9a6540',e:'#6b4328',f:'#4a2e1c'};
const APP={
sledge:{sk:'a',hd:'helm',hc:'#2b3340',bd:'#7a4a2a',vc:'#1e242c',c:['#2f4a6a','#2b3340','#e0a030']},
thatcher:{sk:'a',hd:'helm',hc:'#1d2a22',gl:'#7ed0ff',bd:'#6a6a6a',vc:'#16201a',c:['#355c3d','#1d2a22','#7ed0ff']},
ash:{sk:'b',hd:'bare',hr:'#4a2c1a',ex:'pony',vc:'#3a2222',c:['#7a2a24','#2a1a1a','#ffd27a']},
thermite:{sk:'b',hd:'gas',hc:'#c4a56a',gl:'#ffb030',vc:'#6a5a3a',c:['#6c5a3a','#c4a56a','#ff7a1a']},
montagne:{sk:'b',hd:'helm',hc:'#2a3550',vc:'#1f2740',c:['#3d4a66','#2a3550','#99aabb']},
blitz:{sk:'a',hd:'helm',hc:'#2a2f3a',gl:'#ffffff',vc:'#181b22',c:['#2a2f3a','#111111','#ffffff']},
striker:{sk:'b',hd:'cap',hc:'#6b6b4a',hr:'#3a2a1a',bd:'#3a2a1a',vc:'#5a5a3a',c:['#6b6b4a','#6b6b4a','#c8b36a']},
twitch:{sk:'a',hd:'helm',hc:'#1c2a44',hr:'#2a1a14',ex:'pony',vc:'#16203a',c:['#2b4a7a','#1c2a44','#7ed0ff']},
glaz:{sk:'a',hd:'hood',hc:'#e8e8e8',mk:'#e8e8e8',gl:'#9ad0ff',vc:'#b8c0c8',c:['#d8dde2','#e8e8e8','#7a8794']},
fuze:{sk:'b',hd:'bal',hc:'#4a4a40',vc:'#3a3a2c',c:['#4a4a38','#2a2a24','#ff7a1a'],ex:'pack'},
iq:{sk:'a',hd:'bare',hr:'#b89a5a',gl:'#7ed0ff',vc:'#1e2a1e',c:['#2a3a2a','#1a1a1a','#7ed0ff']},
buck:{sk:'a',hd:'cap',hc:'#2a2a2a',hr:'#3a2a1a',bd:'#3a2a1a',vc:'#352f28',c:['#4a4036','#2a2a2a','#c8a050']},
blackbeard:{sk:'b',hd:'helm',hc:'#2f3a4a',gl:'#99ccff',bd:'#5a3a22',vc:'#1c242f',c:['#2f3a4a','#1c242f','#99aabb']},
capitao:{sk:'c',hd:'bal',hc:'#2f4a2a',mk:'#1c3a1c',vc:'#244024',c:['#2f5a2e','#1c3a1c','#9aff4a']},
hibana:{sk:'b',hd:'helm',hc:'#1a1a22',mk:'#1a1a22',gl:'#ff4a4a',vc:'#141820',c:['#1f2733','#1a1a22','#ff4a4a']},
jackal:{sk:'c',hd:'cap',hc:'#6b4a2a',hr:'#2a1a14',bd:'#2a1a14',vc:'#4a3a28',c:['#5a4a38','#6b4a2a','#e0b84a']},
ying:{sk:'b',hd:'helm',hc:'#1d1a2a',hr:'#1a1a1a',mk:'#1d1a2a',ex:'pony',vc:'#1a1830',c:['#2a2a40','#1d1a2a','#c04aff']},
zofia:{sk:'a',hd:'helm',hc:'#2a2d1e',hr:'#4a2a1a',ex:'pony',vc:'#2a2d1e',c:['#3a3d2a','#2a2d1e','#e8c85a']},
dokkaebi:{sk:'b',hd:'bal',hc:'#16161c',hr:'#1a1a1a',mk:'#16161c',vc:'#101016',c:['#1a1a22','#111111','#ff4a8a'],ex:'pony'},
lion:{sk:'a',hd:'helm',hc:'#2a2f3a',bd:'#2a2a2a',vc:'#232a34',c:['#3a4352','#2a2f3a','#7ed0ff']},
finka:{sk:'a',hd:'helm',hc:'#2a2a1e',hr:'#8a4a2a',vc:'#3a3a28',c:['#4a4a32','#2a2a1e','#ffcc4a']},
maverick:{sk:'b',hd:'helm',hc:'#4a3a2a',gl:'#ffb030',mk:'#3a2a1a',vc:'#4a3a28',c:['#6a4a2a','#4a3a2a','#ff7a1a']},
nomad:{sk:'e',hd:'hood',hc:'#c8b080',mk:'#c8b080',gl:'#2a2a2a',vc:'#8a7448',c:['#a08a5a','#c8b080','#ffd27a']},
gridlock:{sk:'c',hd:'helm',hc:'#3a3a28',hr:'#2a1a14',vc:'#44442c',c:['#5a5a3a','#3a3a28','#ff7a1a'],ex:'pack'},
nokk:{sk:'a',hd:'visor',hc:'#1a1d24',gl:'#3a4654',vc:'#101216',c:['#1a1d24','#101216','#7a7a82']},
amaru:{sk:'d',hd:'bare',hr:'#1a1a1a',ex:'band',vc:'#4a3220',c:['#6a4a2a','#3a2a1a','#e07a3a']},
kali:{sk:'c',hd:'hood',hc:'#2a2a22',mk:'#2a2a22',vc:'#3a3022',c:['#4a3a2a','#2a2a22','#ffaa3a']},
iana:{sk:'c',hd:'bare',hr:'#2a1a1a',ex:'pony',vc:'#18202c',c:['#2a3a4a','#1a2230','#7ed0ff']},
ace:{sk:'e',hd:'helm',hc:'#1c1f26',bd:'#222222',vc:'#1a1d24',c:['#2a2f3a','#1c1f26','#ffcc33']},
zero:{sk:'a',hd:'bal',hc:'#1a1a1a',gl:'#3fe0ff',mk:'#1a1a1a',vc:'#0e0e0e',c:['#1a1a1a','#101010','#3fe0ff']},
flores:{sk:'c',hd:'helm',hc:'#3a3a2a',bd:'#2a1a14',vc:'#44442e',c:['#5a5a3a','#3a3a2a','#ff7a1a']},
osa:{sk:'a',hd:'bare',hr:'#c8a060',ex:'pony',vc:'#16282a',c:['#2a3a3a','#1a2a2a','#7ed0ff']},
sens:{sk:'c',hd:'bare',hr:'#2a1a14',gl:'#e8e8e8',vc:'#25252c',c:['#3a3a44','#2a2a30','#ffffff']},
grim:{sk:'b',hd:'helm',hc:'#2a3a2a',mk:'#2a2a2a',vc:'#2f402f',c:['#3a4a3a','#2a3a2a','#9aff4a']},
brava:{sk:'d',hd:'helm',hc:'#1c2a2a',hr:'#1a1a1a',vc:'#1f3a2e',c:['#2a4a3a','#1c2a2a','#9aff4a']},
ram:{sk:'e',hd:'helm',hc:'#2f2f26',bd:'#222222',vc:'#3a3a2c',c:['#4a4a3a','#2f2f26','#ffaa3a'],ex:'pack'},
deimos:{sk:'c',hd:'bal',hc:'#1a1212',mk:'#1a1212',vc:'#2a1a1a',c:['#3a2a2a','#1a1212','#ff4a3a']},
rauora:{sk:'d',hd:'helm',hc:'#1f2f26',ex:'tat',hr:'#1a1a1a',vc:'#22382c',c:['#2f4a3a','#1f2f26','#bfe6ff']},
solidsnake:{sk:'a',hd:'bare',hr:'#6a5a3a',bd:'#6a5a3a',ex:'band',vc:'#1e2a36',c:['#2a3a4a','#1a2230','#e8e8e8']},
sentry:{sk:'b',hd:'helm',hc:'#2f3a46',vc:'#3a4654',c:['#4a5a6a','#2f3a46','#ffcc33']},
mute:{sk:'a',hd:'visor',hc:'#2a2a30',gl:'#7ed0ff',vc:'#16181d',c:['#2a2f3a','#16181d','#7ed0ff']},
tachanka:{sk:'a',hd:'helm',hc:'#4a4a34',bd:'#9a9a9a',vc:'#4a4a34',c:['#6a6a4a','#4a4a34','#c8b46a'],ex:'pack'},
jager:{sk:'a',hd:'helm',hc:'#1f2a1f',gl:'#9aff4a',vc:'#232f20',c:['#2f3a2a','#1f2a1f','#9aff4a']},
bandit:{sk:'a',hd:'bal',hc:'#232a2a',gl:'#7ed0ff',vc:'#232a2a',c:['#2f3a3a','#232a2a','#7ed0ff']},
valkyrie:{sk:'e',hd:'bare',hr:'#1a1a1a',vc:'#1a2430',c:['#2a3a4a','#1a2430','#e0c030']},
caveira:{sk:'c',hd:'bal',hc:'#1a1a1a',mk:'#e8e8e8',vc:'#16161a',c:['#2a2a30','#16161a','#e8e8e8']},
echo:{sk:'b',hd:'visor',hc:'#1c2a3c',gl:'#7ed0ff',vc:'#1c2a3c',c:['#2a4a6a','#1c2a3c','#7ed0ff']},
mira:{sk:'c',hd:'bare',hr:'#2a1a1a',gl:'#e0c0ff',ex:'pony',vc:'#2a1a22',c:['#5a2a4a','#2a1a22','#e8b0ff']},
lesion:{sk:'b',hd:'cap',hc:'#1a2a1a',hr:'#1a1a1a',vc:'#1a2a1a',c:['#2a3a2a','#1a2a1a','#9aff4a']},
ela:{sk:'a',hd:'helm',hc:'#1a1a22',hr:'#8a4a2a',ex:'pony',vc:'#202028',c:['#2a2a30','#1a1a22','#ff5a8a']},
vigil:{sk:'a',hd:'gas',hc:'#25272d',gl:'#ff4a4a',vc:'#2c2e34',c:['#3a3d45','#25272d','#ff4a4a']},
maestro:{sk:'a',hd:'helm',hc:'#2a2a30',bd:'#3a2a1a',gl:'#ef3a42',vc:'#38383f',c:['#4a4a52','#2a2a30','#ef3a42']},
alibi:{sk:'b',hd:'cap',hc:'#2a2a2a',hr:'#c0c0c0',vc:'#333333',c:['#4a4a4a','#2a2a2a','#ffcc33']},
clash:{sk:'a',hd:'helm',hc:'#1a2338',hr:'#8a5a3a',vc:'#1a2640',c:['#2a3a5a','#1a2338','#7ed0ff']},
kaid:{sk:'c',hd:'hood',hc:'#2a2f2a',mk:'#2a2f2a',bd:'#2a1a14',vc:'#2f3a2f',c:['#3a4a3a','#2a2f2a','#ffd27a']},
mozzie:{sk:'c',hd:'bare',hr:'#2a1a14',gl:'#ffcc33',vc:'#2f3a24',c:['#4a5a3a','#2f3a24','#9aff4a']},
warden:{sk:'e',hd:'helm',hc:'#1a1d24',gl:'#3fe0ff',vc:'#20242c',c:['#2a2f3a','#1a1d24','#3fe0ff']},
goyo:{sk:'d',hd:'helm',hc:'#3a2a22',bd:'#1a1a1a',vc:'#4a2a1e',c:['#6a3a2a','#3a2a22','#ff7a1a']},
wamai:{sk:'e',hd:'bal',hc:'#222222',vc:'#2c3a2c',c:['#3a4a3a','#222222','#e0a030']},
oryx:{sk:'c',hd:'hood',hc:'#6a5a3a',mk:'#6a5a3a',gl:'#e0a030',vc:'#4a3c24',c:['#5a4a32','#6a5a3a','#e0a030']},
melusi:{sk:'e',hd:'bare',hr:'#1a1a1a',ex:'pony',vc:'#221a2e',c:['#3a2a4a','#221a2e','#c04aff']},
aruni:{sk:'c',hd:'bare',hr:'#1a1a1a',ex:'pony',vc:'#3a2218',c:['#6a3a2a','#3a2a22','#ffaa3a']},
thunderbird:{sk:'c',hd:'bare',hr:'#1a1a1a',ex:'pony',vc:'#3a2f26',c:['#5a4a3a','#3a2f26','#ff7a3a']},
thorn:{sk:'a',hd:'gas',hc:'#1a2a1a',gl:'#9aff4a',vc:'#1a2a1a',c:['#2a4a2a','#1a2a1a','#9aff4a']},
azami:{sk:'b',hd:'helm',hc:'#22222c',hr:'#1a1a1a',mk:'#22222c',vc:'#2a2a38',c:['#3a3a4a','#22222c','#ff9a4a']},
solis:{sk:'d',hd:'bare',hr:'#1a1a1a',gl:'#3fe0ff',vc:'#16161a',c:['#2a2a2a','#16161a','#3fe0ff']},
fenrir:{sk:'a',hd:'gas',hc:'#2a2a2e',gl:'#ff4a4a',bd:'#aaaaaa',vc:'#1c2228',c:['#2a3138','#161a1e','#ff4a4a']},
tubarao:{sk:'d',hd:'bare',hr:'#1a1a1a',bd:'#1a1a1a',vc:'#16303a',c:['#2a5a6a','#16303a','#7ed0ff']},
skopos:{sk:'b',hd:'visor',hc:'#2a1a3a',gl:'#c04aff',vc:'#2a1a3a',c:['#4a2a6a','#2a1a3a','#c04aff']},
denari:{sk:'b',hd:'bare',hr:'#2a1a14',vc:'#2a2a36',c:['#3a3a4a','#22222c','#ffcc33']},
noor:{sk:'c',hd:'hood',hc:'#c8a870',mk:'#c8a870',gl:'#7ed0ff',vc:'#8a7448',c:['#8a7a5a','#c8a870','#7ed0ff']},
rook:{sk:'a',hd:'helm',hc:'#1f2a1f',bd:'#2a1a14',vc:'#2a2a2a',c:['#3a4a3a','#1f2a1f','#ffffff']},
doc:{sk:'a',hd:'bare',hr:'#e0b890',bd:'#2a1a14',vc:'#2a4a36',c:['#3a6a4a','#222222','#ffffff']},
smoke:{sk:'a',hd:'gas',hc:'#3a2f4a',gl:'#9aff4a',vc:'#2a2236',c:['#4a3a5a','#1a1a1a','#9aff4a']},
kapkan:{sk:'a',hd:'helm',hc:'#2a2220',bd:'#4a3a2a',gl:'#ff5a3a',vc:'#3a2018',c:['#6a3a2a','#2a2220','#ff5a3a']},
castle:{sk:'e',hd:'helm',hc:'#3a3010',bd:'#222222',vc:'#4a4010',c:['#8a7a2a','#3a3010','#ffe14a']},
pulse:{sk:'b',hd:'helm',hc:'#1a2a30',gl:'#ff4a6a',vc:'#15303a',c:['#2a4a5a','#111111','#ff4a6a']},
frost:{sk:'a',hd:'bal',hc:'#dde4ea',mk:'#e8e8e8',vc:'#2f4a60',c:['#4a6a8a','#222222','#bfe6ff']}};
for(const sd of['A','D'])for(const o of OPS[sd]){const a=APP[o.id];if(!a)throw new Error('no appearance '+o.id);o.ap=a;o.c=[a.c[0],a.hc||a.c[1],a.c[2]]}
for(const k in WP)if(!WP[k].a)WP[k].a=k;
const MODES={bomb:'BOMB',secure:'SECURE AREA',hostage:'HOSTAGE'};
const BX0=14,BY0=12,REINF=9,PACE=.85,DEFUSE=420,BARR=8;let BX1=73,BY1=46,OY=62;let RAP=[],ROOMCAT=[],CURM=0;
const SPRINT=1.3,SPR_T=300,SPR_R=420; // sprint = x1.3 speed, 5 s of stamina, ~7 s to refill

const MAPS=MAPDATA;
let STAIRS=[],STP={},VX,HY,RX,RY,ROOMS,SITES,HOST,EXT,DOORS,DOORSU,CAMTILES,EN,OPENS,MAPN='',MT='',SECR=-1,SEED=1,WL=[null,null],ATKSP=[],PAIRN=0;
const rname=r=>r[4];
function roomIdxF(x,yl,fl){for(let i=0;i<ROOMS.length;i++){const r=ROOMS[i];if(r[5]===fl&&x>=r[0]&&x<=r[2]&&yl>=r[1]&&yl<=r[3])return i}return -1}
function setMap(i,pi){CURM=i;const d=MAPS[i];MAPN=d.n;MT=d.t;SEED=d.sd;PAIRN=pi==null?Math.random()*d.pairs.length|0:pi;
 let x=BX0+1;RX=d.cw.map(w=>{const r=[x,x+w-1];x+=w+1;return r});let y=BY0+1;RY=d.rh.map(h=>{const r=[y,y+h-1];y+=h+1;return r});
 BX1=x-1;BY1=y-1;OY=BY1+22;VX=RX.slice(0,-1).map(r=>r[1]+1);HY=RY.slice(0,-1).map(r=>r[1]+1);
 let sd=d.sd*7919+13;const rnd=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
 const nc=RX.length,nr=RY.length;ROOMS=[];const cell=[[],[]];
 for(let fl=0;fl<2;fl++){const f=d.f[fl],bb={};
  f.g.forEach((row,j)=>[...row].forEach((c,k)=>{const b=bb[c]||(bb[c]={k0:k,k1:k,j0:j,j1:j});b.k0=Math.min(b.k0,k);b.k1=Math.max(b.k1,k);b.j0=Math.min(b.j0,j);b.j1=Math.max(b.j1,j)}));
  const idx={};for(const c in bb){const b=bb[c],nm=f.l[c],out=nm[0]==='~';idx[c]=ROOMS.length;ROOMS.push([RX[b.k0][0],RY[b.j0][0],RX[b.k1][1],RY[b.j1][1],out?nm.slice(1):nm,fl,out])}
  cell[fl]=f.g.map(row=>[...row].map(c=>idx[c]))}
 const roomOf=(fl,nm)=>ROOMS.findIndex(r=>r[5]===fl&&r[4]===nm);
 DOORS=[];DOORSU=[];
 for(let fl=0;fl<2;fl++){const C=cell[fl],wl=WL[fl]=new Uint8Array(W*H),segs=[],links=[];const wall=(x,y)=>{wl[y*W+x]=1};
  for(let k=0;k<nc-1;k++)for(let j=0;j<nr;j++){const a=C[j][k],b=C[j][k+1];if(a===b)continue;if(ROOMS[a][6]&&ROOMS[b][6]){links.push([a,b]);continue}
   for(let y=RY[j][0];y<=RY[j][1];y++)wall(VX[k],y);segs.push({a,b,o:'v',x:VX[k],y0:RY[j][0],y1:RY[j][1]})}
  for(let j=0;j<nr-1;j++)for(let k=0;k<nc;k++){const a=C[j][k],b=C[j+1][k];if(a===b)continue;if(ROOMS[a][6]&&ROOMS[b][6]){links.push([a,b]);continue}
   for(let x=RX[k][0];x<=RX[k][1];x++)wall(x,HY[j]);segs.push({a,b,o:'h',y:HY[j],x0:RX[k][0],x1:RX[k][1]})}
  for(let k=0;k<nc-1;k++)for(let j=0;j<nr-1;j++){const X=VX[k],Y=HY[j];if(wl[Y*W+RX[k][1]]||wl[Y*W+RX[k+1][0]]||wl[RY[j][1]*W+X]||wl[RY[j+1][0]*W+X])wall(X,Y)}
  const par=ROOMS.map((_,i)=>i),find=a=>par[a]===a?a:(par[a]=find(par[a])),uni=(a,b)=>{par[find(a)]=find(b)};links.forEach(([a,b])=>uni(a,b));
  const pm={};segs.forEach(s=>{const k=Math.min(s.a,s.b)+'_'+Math.max(s.a,s.b);(pm[k]=pm[k]||[]).push(s)});
  const slen=s=>s.o==='v'?s.y1-s.y0+1:s.x1-s.x0+1,L=fl?DOORSU:DOORS,dp={};
  const addDoor=(s,k)=>{const len=slen(s),p=1+(rnd()*(len-3)|0);dp[k]=1;if(s.o==='v')L.push([s.x,s.y0+p,'v']);else L.push([s.x0+p,s.y,'h'])};
  const ks=Object.keys(pm).sort(()=>rnd()-.5);
  for(const k of ks){const ss=pm[k].slice().sort((p,q)=>slen(q)-slen(p)),s=ss[0];if(find(s.a)!==find(s.b)){uni(s.a,s.b);addDoor(s,k)}}
  for(const k of ks){const ss=pm[k].slice().sort((p,q)=>slen(q)-slen(p));const mix=ROOMS[ss[0].a][6]!==ROOMS[ss[0].b][6];if(d.opn&&!fl&&mix){for(const sg of ss)addDoor(sg,k+sg.x0+sg.y0);continue}if(!dp[k]&&rnd()<.6)addDoor(ss[0],k);else if(ss.length>1&&rnd()<.4)addDoor(ss[1],k)}}
 // perimeter: open sides of outdoor ground rooms, entry windows, entry doors, rappel windows
 OPENS=[];EN=[];RAP=[];const C0=cell[0],C1=cell[1];
 const edges=(C,wantOut)=>{const E=[];for(let k=0;k<nc;k++){if(!!ROOMS[C[0][k]][6]===wantOut)E.push(['n',RX[k][0],RX[k][1],C[0][k]]);if(!!ROOMS[C[nr-1][k]][6]===wantOut)E.push(['s',RX[k][0],RX[k][1],C[nr-1][k]])}
  for(let j=0;j<nr;j++){if(!!ROOMS[C[j][0]][6]===wantOut)E.push(['w',RY[j][0],RY[j][1],C[j][0]]);if(!!ROOMS[C[j][nc-1]][6]===wantOut)E.push(['e',RY[j][0],RY[j][1],C[j][nc-1]])}return E};
 for(const[s,a,b]of edges(C0,true))OPENS.push([s==='n'?BY0:s==='s'?BY1:s==='w'?BX0:BX1,a,b,s==='n'||s==='s'?'x':'y']);
 const taken=[];const clash=(w,c)=>taken.some(t=>t[0]===w&&Math.abs(t[1]-c)<6);
 for(const nm of d.ent||[]){const ri=roomOf(0,nm);if(ri<0)continue;const E=edges(C0,false).filter(e=>e[3]===ri).sort((p,q)=>(q[0]==='s')-(p[0]==='s'));if(!E.length)continue;const[s,a,b]=E[0],c=((a+b)>>1)-1,w=s==='n'?BY0:s==='s'?BY1:s==='w'?BX0:BX1,ax=s==='n'||s==='s'?'x':'y';EN.push([w,c-1,c+2,ax,1]);taken.push([w,c])}
 for(const[s,a,b]of edges(C0,false)){const len=b-a+1,n=len>=19?3:2;for(let q=0;q<n;q++){if(rnd()<.1)continue;const c=a+4+(rnd()*(len-8)|0),w=s==='n'?BY0:s==='s'?BY1:s==='w'?BX0:BX1;if(clash(w,c))continue;taken.push([w,c]);EN.push([w,c-1,c+1,s==='n'||s==='s'?'x':'y'])}}
 const cnt={n:0,s:0,w:0,e:0},cap={n:7,s:4,w:4,e:4};
 for(const[s,a,b]of edges(C1,false)){if(cnt[s]>=cap[s])continue;const len=b-a+1,c=a+3+(rnd()*(len-7)|0);cnt[s]++;
  if(s==='n')RAP.push({s:'n',c:c,ox:c,oy:BY0-1,hx:c,hy:OY+BY0-1,ix:c,iy:OY+BY0+1,win:[[c,OY+BY0],[c+1,OY+BY0]],inside:[[c,OY+BY0+1],[c+1,OY+BY0+1]]});
  else if(s==='s')RAP.push({s:'s',c:c,ox:c,oy:BY1+1,hx:c,hy:OY+BY1+1,ix:c,iy:OY+BY1-1,win:[[c,OY+BY1],[c+1,OY+BY1]],inside:[[c,OY+BY1-1],[c+1,OY+BY1-1]]});
  else{const bx=s==='w'?BX0:BX1,ox=s==='w'?bx-1:bx+1,ix=s==='w'?bx+1:bx-1;RAP.push({s:s,c:c,ox,oy:c,hx:ox,hy:OY+c,ix,iy:OY+c,win:[[bx,OY+c],[bx,OY+c+1]],inside:[[ix,OY+c],[ix,OY+c+1]]})}}
 // stairs
 STAIRS=[];for(const[n0,n1]of d.stairs){const a=ROOMS[roomOf(0,n0)],b=ROOMS[roomOf(1,n1)];if(a&&b)STAIRS.push([[a[0]+2,a[1]+2],[b[0]+2,b[1]+2+OY]])}
 // sites, hostage
 const pr=d.pairs[PAIRN],mid=([fl,nm],tag)=>{const r=ROOMS[roomOf(fl,nm)];return[(((r[0]+r[2])>>1)*T+8),((((r[1]+r[3])>>1)+fl*OY)*T+8),tag]};
 SITES=[mid(pr[0],'A'),mid(pr[1],'B')];const hp=d.host[Math.random()*d.host.length|0],hm=mid(hp);HOST=[hm[0],hm[1]];
 EXT=[((BX0+BX1)>>1)*T+8,(BY1+2)*T+8];SECR=roomOf(pr[0][0],pr[0][1]);
 CAMTILES=DOORS.filter(q=>q[2]==='h').slice(0,12).map(q=>[q[0]-1,q[1]]);
 ROOMCAT=ROOMS.map(r=>catOf(r[4]))}
function pairLabel(i,p){const d=MAPS[i],pr=d.pairs[p];return pr[0][1].replace(/^(B|1F|2F|3F) /,'')+' / '+pr[1][1].replace(/^(B|1F|2F|3F) /,'')}
function pairFloor(i,p){return MAPS[i].pairs[p][0][1].split(' ')[0]}
function openTile(tx,ty){for(let r=0;r<14;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const a=tx+dx,b=ty+dy;if(map[b]&&map[b][a]===0&&map[b][a+1]===0&&map[b][a-1]===0)return[a,b]}return[tx,ty]}
function resolveSpawns(){const d=MAPS[CURM];ATKSP=d.spawns.map(([n,sd,f])=>{let tx,ty;const ax=BX0+Math.round(f*(BX1-BX0)),ay=BY0+Math.round(f*(BY1-BY0));if(sd==='s'){tx=ax;ty=BY1+3}else if(sd==='n'){tx=ax;ty=BY0-4}else if(sd==='w'){tx=BX0-4;ty=ay}else{tx=BX1+4;ty=ay}const[a,b]=openTile(tx,ty);return{n,sd,x:a*T+8,y:b*T+8,tx:a,ty:b}})}
function spawnFor(i){const n=ATKSP.length,sp=ATKSP[((uiSel.spawn||0)+i)%n],k=(i/n|0),[a,b]=openTile(sp.tx+(i?((i%2)?1:-1)*(1+k):0),sp.ty);return[a*T+8,b*T+8]}
function findFloor(x,y){for(let r=0;r<10;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const a=x+dx,b=y+dy;if(map[b]&&map[b][a]===1)return[a,b]}return[x,y]}
function spots(mode){const a=SITES[0],b=SITES[1],h=HOST,tx=q=>q[0]/T|0,ty=q=>q[1]/T|0;let L;
 if(mode==='bomb')L=[[tx(a)-2,ty(a)-2],[tx(a)+2,ty(a)+2],[tx(b)-2,ty(b)-2],[tx(b)+2,ty(b)+2],[(tx(a)+tx(b))>>1,ty(a)]];
 else if(mode==='secure')L=[[tx(a)-3,ty(a)],[tx(a)+3,ty(a)],[tx(a),ty(a)-3],[tx(a),ty(a)+3],[tx(a)+2,ty(a)+2]];
 else L=[[tx(h)-2,ty(h)],[tx(h)+2,ty(h)],[tx(h),ty(h)-2],[tx(h),ty(h)+2],[tx(h)+3,ty(h)+3]];return L.map(q=>findFloor(q[0],q[1]))}
setMap(0);
// ---------- map ----------
let map,wh=new Float32Array(W*H),mapC=mkc(W*T,H*T),mc=mapC.getContext('2d'),mver=0;
const solid=t=>(t>=2&&t<=4)||t===9,blk=t=>(t>=2&&t<=4)||t===6||t===7||t===9||t===10;
function buildMap(){fk.fill(0);fc.fill(0);winF.fill(0);map=[];for(let y=0;y<H;y++)map.push(new Array(W).fill(0));STP={};
 let sd=SEED*977+5;const rn=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;const keep=[...SITES,HOST].map(q=>{const ty=q[1]/T|0;return[q[0]/T|0,ty>=OY?ty-OY:ty]});
 for(const o of[0,OY]){const fl=o?1:0,wl=WL[fl];
  for(let y=BY0;y<=BY1;y++)for(let x=BX0;x<=BX1;x++)map[y+o][x]=1;
  for(let x=BX0;x<=BX1;x++){map[BY0+o][x]=2;map[BY1+o][x]=2}for(let y=BY0;y<=BY1;y++){map[y+o][BX0]=2;map[y+o][BX1]=2}
  for(let y=BY0+1;y<BY1;y++)for(let x=BX0+1;x<BX1;x++)if(wl[y*W+x])map[y+o][x]=3;
  if(!fl)for(const[w,a,b,ax]of OPENS)for(let k=a;k<=b;k++){if(ax==='x')map[w][k]=1;else map[k][w]=1}
  for(const[x,y,q]of(fl?DOORSU:DOORS)){map[y+o][x]=5;if(q==='h')map[y+o][x+1]=5;else map[y+1+o][x]=5}
  if(!fl)for(const[w,a,b,ax,dr]of EN){for(let k=a;k<=b;k++){if(ax==='x')map[w][k]=3;else map[k][w]=3}if(dr)for(let k=a+1;k<=a+2;k++){if(ax==='x')map[w][k]=5;else map[k][w]=5}}
  furnishFloor(o,rn,keep)}
 STAIRS.forEach(([p,q])=>{map[p[1]][p[0]]=8;map[q[1]][q[0]]=8;const i1=p[1]*W+p[0],i2=q[1]*W+q[0];STP[i1]=i2;STP[i2]=i1});
 buildExtras();wh.fill(100);for(let y=0;y<H;y++)for(let x=0;x<W;x++)drawTile(x,y)}
function stairs(e){if(tileAt(e.x,e.y)===8){if(!e.onst){const p=STP[(e.y/T|0)*W+(e.x/T|0)];if(p!==undefined){e.x=(p%W)*T+8;e.y=((p/W)|0)*T+8;e.onst=1;if(e===G.me)sfx(440,.12,'triangle',.04)}}}else e.onst=0}
function drawTile(x,y){drawTile0(x,y);if(MT){mc.fillStyle=MT;mc.fillRect(x*T,y*T,T,T)}}
const roomIdx=(x,y)=>y>=OY?roomIdxF(x,y-OY,1):roomIdxF(x,y,0);
const isW=(x,y)=>y>=0&&x>=0&&x<W&&y<H&&map[y][x]>=2&&map[y][x]<=4;
function outArt(P,x,y,n,nm){const th=XTH[(MAPS[CURM]||{}).xt||'city']||XTH.city;
 if(/GARDEN|LAWN|YARD|PATIO|SLOPE|FIELD|CAMPUS|PARK\b/.test(nm)){P(0,0,T,T,th.g[0]);for(let i=0;i<14;i++)P(n()*15|0,n()*15|0,1,1,th.g[1+(n()<.5?1:0)]);return}
 if(/ROOF|TERRACE|BALCONY|WING|HELIPAD|DECK|WALKWAY|RIDE|CAFE|BRIDGE/.test(nm)){P(0,0,T,T,'#6c7078');P(0,0,T,1,'#5c6068');P(0,0,1,T,'#5c6068');if(/HELIPAD/.test(nm)&&((x+y)&3)===0)P(5,5,6,6,'#c8a030');for(let i=0;i<6;i++)P(n()*15|0,n()*15|0,1,1,'#7a7e86');return}
 P(0,0,T,T,th.p[0]);for(let i=0;i<10;i++)P(n()*15|0,n()*15|0,1,1,th.p[1+(n()<.5?1:0)]);if(/PARKING|LOT|TARMAC|ALLEY|STREET|DOCKS|QUAY|MIDWAY|PLAZA|LOADING|PARADE/.test(nm)&&x%6===0)P(0,7,2,2,'#cfcfcf')}
function floorArt(P,x,y,n){
 if(extArt(P,x,y,n))return;
 const r0=roomIdx(x,y),r=r0<0?-1:ROOMCAT[r0];
 if(r0>=0&&ROOMS[r0][6]){outArt(P,x,y,n,ROOMS[r0][4]);return}
 if(r===0){P(0,0,T,T,'#2a2f39');P(0,7,T,1,'#20252e');P(7,0,1,T,'#20252e');P(1,1,1,1,'#3d4552');P(9,9,1,1,'#3d4552');P(15,15,1,1,'#3d4552')}
 else if(r===1){P(0,0,T,T,'#1d2838');P(0,0,T,1,'#16202e');P(0,0,1,T,'#16202e');P(0,8,T,1,'#16202e');P(8,0,1,T,'#16202e');if(n()<.5)P(n()*14|0,n()*14|0,1,1,n()<.5?'#3fd0ff':'#2fbf6a')}
 else if(r===2){P(0,0,T,T,'#445562');for(let i=0;i<22;i++)P(n()*15|0,n()*15|0,1,1,n()<.5?'#3b4b57':'#4e6070')}
 else if(r===3){P(0,0,T,T,'#585b61');for(let i=0;i<14;i++)P(n()*15|0,n()*15|0,1,1,n()<.5?'#4f5258':'#62666d');if(x%2===0)P(0,7,8,2,'#caa62a')}
 else if(r===4){P(0,0,T,T,'#363742');P(0,0,T,1,'#2b2c35');P(0,0,1,T,'#2b2c35');P(2,2,1,1,'#5a5c6a');P(13,2,1,1,'#5a5c6a');P(2,13,1,1,'#5a5c6a');P(13,13,1,1,'#5a5c6a');P(7,7,2,2,'#2e2f39')}
 else if(r===7){P(0,0,T,T,'#c4ccd4');P(0,0,T,1,'#a6b0ba');P(0,0,1,T,'#a6b0ba');P(8,0,1,T,'#b2bcc6');P(0,8,T,1,'#b2bcc6')}
 else if(r===8){P(0,0,T,T,'#7a5634');for(let k=0;k<4;k++){P(0,k*4+3,T,1,'#5a3e24');P((k*5+x*3)%15,k*4,1,3,'#5a3e24')}for(let i=0;i<4;i++)P(n()*15|0,n()*15|0,2,1,'#8a6640')}
 else if(r===6){P(0,0,T,T,((x+y)&1)?'#6a6f78':'#5d626b');for(let i=0;i<8;i++)P(n()*15|0,n()*15|0,1,1,'#555a63')}
 else{P(0,0,T,T,'#8d6b48');const v=(x*7+y*13)%3;for(let k=0;k<4;k++){P(0,k*4+3,T,1,'#715436');P((k*5+v*4)%15,k*4,1,3,'#715436')}for(let i=0;i<5;i++)P(n()*15|0,n()*15|0,2,1,'#9b7a55')}}
function drawTile0(x,y){const t=map[y][x],o=x*T,p=y*T;let h=((x*73856093)^(y*19349663))>>>0;const n=()=>{h=(Math.imul(h,1664525)+1013904223)>>>0;return h/4294967296};
 const P=(a,b,w,hh,c)=>{mc.fillStyle=c;mc.fillRect(o+a,p+b,w,hh)};
 if(t<2||t>4){floorArt(P,x,y,n);
  if(isW(x,y-1))P(0,0,T,5,'rgba(0,0,0,.42)');
  if(t===5){P(0,6,T,4,'#b8a07a');P(0,6,T,1,'#d6c19a');P(0,9,T,1,'#8d7a5e')}
  if(t===6){P(1,3,14,12,'#2a1a0e');P(2,2,12,11,'#b27a42');P(2,2,12,1,'#d19a5c');P(2,2,1,11,'#c88c4e');P(2,12,12,1,'#7a4f26');P(5,2,1,11,'#8d5d2e');P(10,2,1,11,'#8d5d2e');P(3,6,10,1,'#8d5d2e');P(6,5,4,3,'#d8a868')}
  if(t===7){P(1,2,14,13,'#0d1016');P(2,1,12,12,'#262c38');P(2,1,12,1,'#3a4252');for(let r=0;r<4;r++){P(3,3+r*3,10,2,'#151922');P(4,3+r*3,1,1,n()<.5?'#3fd0ff':'#2fbf6a');P(6,3+r*3,1,1,'#ffb62e');P(10,3+r*3,3,1,'#2d3544')}}
  if(t===9){const r=wh[y*W+x]/100;P(0,0,T,T,'#1c140c');for(let k=0;k<3;k++){const by=1+k*5;P(0,by,T,4,'#a8743c');P(0,by,T,1,'#c9955a');P(0,by+3,T,1,'#6b4520');P(2,by+1,1,1,'#2a1a0e');P(13,by+1,1,1,'#2a1a0e')}P(6,0,3,T,'#7a5128');P(6,0,1,T,'#966636');P(7,3,1,1,'#2a1a0e');P(7,12,1,1,'#2a1a0e');if(r<.7){P(3,2,1,3,'#1c140c');P(10,7,2,1,'#1c140c')}if(r<.4){P(2,6,5,2,'#1c140c');P(9,11,5,3,'#1c140c')}}
  if(t===10)drawFurn(P,x,y,n);
  if(t===8){P(0,0,T,T,'#3a4150');for(let i=0;i<5;i++)P(1,2+i*3,14,2,i%2?'#8d97a8':'#b8c2d2');P(6,0,4,3,'#6aff9a');P(5,3,6,1,'#6aff9a')}
  return}
 const below=isW(x,y+1),fh=below?0:6,tp=T-fh;
 if(t===2){P(0,0,T,T,'#9a5240');for(let r=0;r<4;r++){P(0,r*4+3,T,1,'#6e3629');for(let c=(r&1)?0:4;c<T;c+=8)P(c,r*4,1,4,'#6e3629')}P(0,0,T,1,'#c27a60');for(let i=0;i<5;i++)P(n()*15|0,n()*(tp-2)|0,1,1,'#b46a52');
  if(fh){P(0,tp,T,fh,'#6b3326');P(0,tp+2,T,1,'#4d2419');P(0,tp+4,T,1,'#4d2419');P(4,tp,1,2,'#4d2419');P(11,tp+2,1,2,'#4d2419');P(0,T-1,T,1,'#2e140e')}}
 else if(t===3&&winF[y*W+x]){drawWin(P,wh[y*W+x]/100)}
 else if(t===3){const r=wh[y*W+x]/100;P(0,0,T,T,'#d5c19a');P(0,0,T,1,'#ecdcb8');P(0,0,1,T,'#e4d2ac');P(T-1,0,1,T,'#b7a07a');
  if(fh){P(0,tp,T,fh,'#a98f68');P(0,tp,T,1,'#8d7650');for(let i=0;i<4;i++)P(2+i*4,tp+1,1,3,'#9b8359');P(0,T-2,T,2,'#6e5a3a');P(0,T-1,T,1,'#4a3a24')}
  if(r<.75){P(4,3,1,5,'#5a4a36');P(5,8,2,1,'#5a4a36');P(3,7,1,2,'#5a4a36')}if(r<.5){P(10,2,1,6,'#5a4a36');P(7,9,4,1,'#5a4a36');P(3,11,4,3,'#2a2218');P(11,9,2,2,'#2a2218')}if(r<.25){P(2,2,12,11,'#2a2218');P(6,0,2,16,'#7a6a50');P(10,3,1,10,'#7a6a50');P(3,6,10,1,'#6a5a44')}}
 else{P(0,0,T,T,'#707a86');P(0,0,T,1,'#98a4b2');for(let i=0;i<T;i+=4){P(i,0,2,tp,'#d9b11f');P(i+2,0,2,tp,'#4a5360')}P(0,0,T,2,'#8a95a3');P(0,tp-2,T,2,'#56606c');P(1,1,2,2,'#cfd6de');P(13,1,2,2,'#cfd6de');
  if(fh){P(0,tp,T,fh,'#3d444e');for(let i=0;i<T;i+=4)P(i,tp+1,2,fh-3,'#c9a018');P(0,T-1,T,1,'#1c2026')}}}
const tileAt=(x,y)=>{const tx=x/T|0,ty=y/T|0;return(x<0||y<0||tx>=W||ty>=H)?2:map[ty][tx]};
function setTile(x,y,t){map[y][x]=t;wh[y*W+x]=100;drawTile(x,y);if(y+1<H)drawTile(x,y+1);if(y>0)drawTile(x,y-1);mver++}
function wallDmg(x,y,d){const t0=map[y][x];if(t0!==3&&t0!==9)return;const k=y*W+x;wh[k]-=t0===9?d*.7:d;if(wh[k]<=0){setTile(x,y,t0===9?5:1);boom(x*T+8,y*T+8,10,'#c8b896');sfx(120,.3,'sawtooth',.06)}else drawTile(x,y)}
// ---------- r6x: furnished rooms, exteriors, rappel, timed building, crowbar, thrown + placed utility ----------
const REINF_T=140,BARR_T=48,CROW_T=110,PLACE_R=96,THROW_R=170;
const fk=new Uint8Array(W*H),fc=new Uint8Array(W*H),winF=new Uint8Array(W*H),pathA=new Uint8Array(W*H);
const KD={table:0,bed:1,sofa:2,counter:3,shelf:4,locker:5,machine:6,barrel:7,desk:8,plant:9,pipe:10,tank:11,cont:12,carL:13,carR:14,tree:15,hedge:16,fence:17,bench:18,dump:19,lamp:20,planter:21,stage:22,piano:23,hbed:24,ac:27,safe:29,gym:30,dj:31,tTL:32,tTR:33,tBL:34,tBR:35,water:36,pine:37,fenceV:39,void:40,ledge:41};
const CARC=['#b83a30','#2f5fa8','#d4d6da','#2a2d33','#d8b030','#3a8a4a'],CONC=['#a8402e','#2e6a8a','#3a7a4a','#c8a030','#6a5aa0','#8a8e96'];
function catOf(n){n=n||'';
 if(/VAULT|SAFE/.test(n))return 4;if(/SERVER|CONTROL|LAB|X-RAY|OPERATING/.test(n))return 0;
 if(/OFFICE|ARCHIVE|STUDY|CONFERENCE|MANAGER|WAITING|SUITE|BEDROOM|NURSERY/.test(n))return 1;
 if(/LOBBY|BALLROOM|ATRIUM|DANCE|CHAPEL|CAFETERIA|MESS|STAGE/.test(n))return 6;
 if(/KITCHEN|LAUNDRY|SPA|POOL|MORGUE|WARD|BATHROOM|SAUNA|PHARMACY|PANTRY/.test(n))return 7;
 if(/LIVING|LOUNGE|LIBRARY|BAR|DINING|VIP|CELLAR|COAT/.test(n))return 8;
 return 3}
const PLANS=[
 [/SERVER/,['machine'],[['machine',2,1]],.3],[/VAULT|SAFE/,['safe','locker'],[['table',2,1]],.55],
 [/CONTROL|X-RAY|OPERATING/,['machine','desk'],[['desk',3,1]],.45],[/LAB/,['counter','machine'],[['counter',3,1],['table',2,2]],.5],
 [/OFFICE|STUDY|MANAGER/,['shelf','plant','desk'],[['desk',2,1],['desk',2,1]],.4],[/ARCHIVE|LIBRARY/,['shelf'],[['shelf',4,1],['shelf',4,1],['table',2,2]],.75],
 [/CONFERENCE/,['plant','shelf'],[['table',4,2]],.3],[/WAITING/,['bench','plant'],[['bench',3,1],['bench',3,1]],.5],
 [/LOBBY/,['plant','bench','sofa'],[['counter',4,1],['sofa',3,1],['table',2,2]],.45],[/BALLROOM/,['plant','bench'],[['table',2,2],['table',2,2],['table',2,2],['table',2,2]],.3],
 [/ATRIUM/,['plant','planter'],[['planter',2,2],['planter',3,1]],.5],[/DANCE/,['dj','plant'],[['dj',3,1]],.2],
 [/CHAPEL/,['plant'],[['bench',4,1],['bench',4,1],['bench',4,1],['bench',4,1]],.3],[/CAFETERIA|MESS/,['counter','machine'],[['table',2,2],['table',2,2],['table',2,2],['table',4,1]],.35],
 [/STAGE/,['dj','machine'],[['stage',5,2]],.3],[/KITCHEN|PANTRY/,['counter','machine','shelf'],[['counter',4,1],['table',2,1]],.7],
 [/LAUNDRY/,['machine','counter'],[['machine',3,1],['table',2,1]],.55],[/SPA|SAUNA/,['bench','plant'],[['bed',1,2],['bed',1,2],['planter',2,1]],.4],
 [/POOL/,['bench','plant'],[['water',5,3]],.3],[/MORGUE/,['locker','counter'],[['hbed',2,1],['hbed',2,1],['hbed',2,1]],.5],
 [/WARD|SUITE|BEDROOM|NURSERY/,['shelf','locker','plant'],[['bed',1,2],['bed',1,2]],.35],[/BATHROOM/,['counter','plant'],[['table',1,1]],.4],
 [/PHARMACY/,['shelf','counter'],[['counter',4,1]],.6],[/LIVING|LOUNGE|VIP/,['plant','shelf','piano'],[['sofa',3,1],['table',2,1],['sofa',3,1]],.35],
 [/DINING/,['shelf','plant'],[['table',3,2]],.3],[/BAR/,['counter','shelf'],[['counter',5,1],['table',2,1],['table',2,1]],.5],
 [/COAT|CELLAR/,['shelf','barrel'],[['shelf',3,1]],.6],[/GARAGE/,['machine','barrel','shelf'],[['carL',2,1],['carL',2,1]],.4],
 [/WORKSHOP|ASSEMBLY/,['machine','barrel','shelf'],[['machine',2,2],['machine',3,1],['table',3,1]],.5],[/BOILER|PUMP/,['pipe','tank','machine'],[['tTL',2,2],['pipe',4,1]],.55],
 [/DOCKS|STORAGE/,['barrel','shelf'],[['crate',2,2],['crate',3,2],['crate',2,1]],.5],[/COLD/,['shelf','locker'],[['crate',2,2],['shelf',3,1]],.55],
 [/ARMORY/,['locker','shelf'],[['table',3,1]],.7],[/GYM/,['gym','bench'],[['gym',3,1],['bench',2,1]],.4],[/LOCKER|CELL/,['locker','bench'],[['bench',3,1]],.5]];
function outPlan(n){if(/GARDEN|LAWN|YARD|PATIO|SLOPE|FIELD|PARK\b/.test(n))return[0,['hedge','planter'],[['tree',1,1],['bench',2,1],['planter',2,1]],.25];if(/PARKING|LOT|ALLEY|LOADING|STREET|DOCKS|QUAY|TARMAC|PARADE|MIDWAY|PLAZA|BEACH|BRIDGE/.test(n))return[0,['barrel'],[['carL',2,1],['cont',2,1],['dump',1,1],['lamp',1,1]],.15];if(/ROOF|TERRACE|BALCONY|WING|HELIPAD|DECK|WALKWAY|RIDE|CAFE/.test(n))return[0,['planter','ac'],[['ac',1,1],['planter',2,1],['bench',2,1]],.15];return[0,['planter'],[['bench',2,1]],.1]}
function planOf(n){for(const p of PLANS)if(p[0].test(n||''))return p;return[0,['plant','shelf'],[['table',2,1]],.3]}
function putF(x,y,k,c){if(!map[y]||map[y][x]!==1)return;if(k==='crate'){map[y][x]=6;return}map[y][x]=10;fk[y*W+x]=KD[k];fc[y*W+x]=c|0}
function furnishFloor(o,rn,keep){
 const PRO=new Uint8Array(W*H);
 const mark=(x,y,r)=>{for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const a=x+i,b=y+j;if(a>=0&&b>=0&&a<W&&b<H)PRO[b*W+a]=1}};
 const fl_=o?1:0,lane=(tx,ty)=>{const ri=roomIdxF(tx,ty-o,fl_);if(ri<0)return;const r=ROOMS[ri],cx=(r[0]+r[2])>>1,cy=(r[1]+r[3])>>1+0;let x=tx,y=ty;const sx=Math.sign(cx-x);while(x!==cx){mark(x,y,0);PRO[(y+1)*W+x]=1;x+=sx}const sy=Math.sign(cy+o-y);while(y!==cy+o){mark(x,y,0);PRO[y*W+x+1]=1;y+=sy}mark(cx,cy+o,1)};
 for(const[x,y,q]of(o?DOORSU:DOORS)){const ys=y+o,ts=q==='h'?[[x,ys],[x+1,ys]]:[[x,ys],[x,ys+1]];for(const[a,b]of ts){mark(a,b,2);for(const[dx,dy]of D4)if(roomIdxF(a+dx,b+dy-o,fl_)>=0)lane(a+dx,b+dy)}}
 if(!o)for(const[w,a,b,ax]of EN)for(let k=a;k<=b;k++){const ins=ax==='x'?[k,w+(w===BY0?1:-1)]:[w+(w===BX0?1:-1),k];lane(ins[0],ins[1]);mark(ins[0],ins[1],3)}
 else for(const a of RAP)for(const[ix,iy]of a.inside){lane(ix,iy);mark(ix,iy,3)}
 for(const[p,q]of STAIRS){const s=o?q:p;lane(s[0],s[1]);mark(s[0],s[1],3)}
 for(const q of keep)mark(q[0],q[1]+o,4);
 const isF=(x,y)=>map[y]&&map[y][x]===1&&!PRO[y*W+x];
 const busy=(x,y)=>{const t=map[y]&&map[y][x];return t===6||t===7||t===10};
 const fits=(x,y,w,h)=>{for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){const a=x+i,b=y+j;if(i>=0&&j>=0&&i<w&&j<h){if(!isF(a,b))return false}else if(busy(a,b))return false}return true};
 const put=(x,y,k,w,h)=>{const c=rn()*6|0;if(k==='carL'){putF(x,y,'carL',c);putF(x+1,y,'carR',c);return}
  if(k==='tTL'){putF(x,y,'tTL');putF(x+1,y,'tTR');putF(x,y+1,'tBL');putF(x+1,y+1,'tBR');return}
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)putF(x+i,y+j,k,c)};
 ROOMS.forEach((r,ri)=>{if(r[5]!==fl_)return;const[x0,y0,x1,y1,nm]=r,pl=r[6]?outPlan(nm):planOf(nm),wk=pl[1],cs=pl[2],dens=pl[3],cat=r[6]?-1:catOf(nm);
  if(ri===SECR&&!o&&/SERVER|CONTROL|CCTV/.test(nm))for(const yy of[y0+1,y1-1])for(let x=x0+2;x<=x1-2;x+=2)if(isF(x,yy+o))map[yy+o][x]=7;
  const sides=[[x0,y0+o,1,0,x1-x0+1],[x0,y1+o,1,0,x1-x0+1],[x0,y0+o,0,1,y1-y0+1],[x1,y0+o,0,1,y1-y0+1]];
  for(const[sx,sy,dx,dy,len]of sides){let i=1;while(i<len-1){if(rn()<dens*.95){const L=2+(rn()*3|0),k=wk[rn()*wk.length|0];for(let j=0;j<L&&i+j<len-1;j++){const x=sx+dx*(i+j),y=sy+dy*(i+j);if(isF(x,y))putF(x,y,k,rn()*6|0)}i+=L+1+(rn()*2|0)}else i++}}
  const nc=Math.round((x1-x0)*(y1-y0)/55*(1.1+dens*1.4));
  for(let a=0;a<nc&&cs.length;a++){const[k,w,h]=cs[rn()*cs.length|0];for(let tr=0;tr<14;tr++){const x=x0+2+(rn()*Math.max(1,x1-x0-3-w)|0),y=y0+2+(rn()*Math.max(1,y1-y0-3-h)|0)+o;if(fits(x,y,w,h)){put(x,y,k,w,h);break}}}
  if(cat===6&&(x1-x0)>9&&(y1-y0)>8)for(let y=y0+3;y<y1-2;y+=6)for(let x=x0+3;x<x1-2;x+=6)if(isF(x,y+o)&&fits(x,y+o,1,1))map[y+o][x]=2})}
// ---- exteriors ----
const XTH={city:{g:['#2b4630','#36593b','#223a28'],p:['#6b6f76','#5d6168','#7a7e86'],r:'#30343b'},estate:{g:['#2f5f36','#3c7142','#244c2b'],p:['#8a8478','#7a7468','#9a9488'],r:'#33363c'},ind:{g:['#55554c','#625f55','#47473f'],p:['#78787a','#6a6a6c','#868688'],r:'#2e3136'},snow:{g:['#dfe8ef','#cdd9e3','#eef3f7'],p:['#b6c0c9','#a6b0b9','#c4ccd4'],r:'#454a52'},tarmac:{g:['#4a4c50','#55575c','#3f4146'],p:['#6d7076','#5f6268','#7b7e85'],r:'#2c2e33'},ice:{g:['#e4eef7','#cfe0ee','#f4f9fd'],p:['#a9c4da','#9ab6cf','#b9d0e3'],r:'#5a6c80'},sea:{g:['#1f4f7d','#2a6296','#183f66'],p:['#8a6b46','#7a5c3a','#9a7a52'],r:'#1a2430'}};
function buildExt(){
 const mp=MAPS[CURM]||{},th=mp.xt||'city';let sd=SEED*131+17;const rn=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
 const yx0=2,yx1=W-3,yy0=2,yy1=BY1+4,cxs=(BX0+BX1)>>1,XP=new Uint8Array(W*H);pathA.fill(0);
 for(let y=BY0-2;y<=BY1+2;y++)for(let x=BX0-2;x<=BX1+2;x++)XP[y*W+x]=1;
 for(let x=cxs-10;x<=cxs+10;x++)for(let y=BY1+1;y<=BY1+6;y++)XP[y*W+x]=1;
 for(const[w,a,b,ax]of EN)for(let k=a-2;k<=b+2;k++)for(let dd=1;dd<=4;dd++){const x=ax==='x'?k:(w===BX0?w-dd:w+dd),y=ax==='x'?(w===BY0?w-dd:w+dd):k;if(x>0&&y>0&&x<W&&y<H)XP[y*W+x]=1}
 for(const a of RAP)for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++)XP[(a.oy+j)*W+a.ox+i]=1;
 const can=(x,y)=>x>1&&y>1&&x<W-2&&y<=BY1+3&&map[y][x]===0&&!XP[y*W+x];
 const busy=(x,y)=>map[y]&&map[y][x]===10;
 const put=(x,y,k,c)=>{map[y][x]=10;fk[y*W+x]=KD[k];fc[y*W+x]=c|0};
 const free=(x,y,w,h)=>{for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){const a=x+i,b=y+j;if(i>=0&&j>=0&&i<w&&j<h){if(!can(a,b))return false}else if(busy(a,b))return false}return true};
 // gates + fences
 const gS=[],gN=[Math.round(W*.28),Math.round(W*.72)],gW=[Math.round((BY0+BY1)/2)],gE=[BY0+12,Math.round((BY0+BY1)/2),BY1-12];
 for(let g0=cxs-84;g0<=cxs+84;g0+=28)if(g0>6&&g0<W-6)gS.push(g0);
 const inG=(v,L)=>L.some(c=>Math.abs(v-c)<=2);
 for(let x=yx0;x<=yx1;x++){if(!inG(x,gN)&&map[yy0][x]===0)put(x,yy0,'fence');if(!inG(x,gS)&&map[yy1][x]===0)put(x,yy1,'fence')}
 for(let y=yy0;y<=yy1;y++){if(!inG(y,gW)&&map[y][yx0]===0)put(y===yy0||y===yy1?yx0:yx0,y,'fenceV');if(!inG(y,gE)&&map[y][yx1]===0)put(yx1,y,'fenceV')}
 for(const gx of gS)for(let y=BY1+3;y<=yy1;y++)for(let x=gx-2;x<=gx+2;x++)pathA[y*W+x]=1;
 for(const gx of gN)for(let y=yy0;y<=BY0-3;y++)for(let x=gx-2;x<=gx+2;x++)pathA[y*W+x]=1;
 for(const gy of gW)for(let x=yx0;x<=BX0-3;x++)for(let y=gy-2;y<=gy+2;y++)pathA[y*W+x]=1;
 for(const gy of gE)for(let x=BX1+3;x<=yx1;x++)for(let y=gy-2;y<=gy+2;y++)pathA[y*W+x]=1;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pathA[y*W+x])XP[y*W+x]=1;
 // street: parked cars on the near and far kerb lanes
 for(const ry of[6,8])for(let x=4;x<W-6;x+=2+(rn()*5|0)){const y=BY1+ry;if(map[y][x]===0&&map[y][x+1]===0&&rn()<.55){const c=rn()*6|0;put(x,y,'carL',c);put(x+1,y,'carR',c);x+=2}}
 // hedge line around the building
 const dd=(x,y)=>Math.max(BX0-x,x-BX1,BY0-y,y-BY1);
 for(let y=BY0-3;y<=BY1+3;y++)for(let x=BX0-3;x<=BX1+3;x++)if(dd(x,y)===3&&can(x,y)&&((x*7+y*3)%11<7)&&y<=BY1+2)put(x,y,'hedge');
 // lawn scatter
 const tp={city:.012,estate:.05,ind:.004,snow:.05,tarmac:0,sea:0,ice:0}[th];
 for(let y=yy0+1;y<yy1;y++)for(let x=yx0+1;x<yx1;x++)if(can(x,y)&&dd(x,y)>=5&&rn()<tp&&free(x,y,1,1))put(x,y,th==='snow'?'pine':'tree');
 if(th==='city'||th==='estate'){for(let i=0;i<14;i++){const x=yx0+2+(rn()*(yx1-yx0-4)|0),y=BY1+3;if(can(x,y)&&free(x,y,1,1))put(x,y,rn()<.5?'bench':'planter')}
  for(let i=0;i<8;i++){const x=BX0+3+(rn()*(BX1-BX0-6)|0),y=BY0-3;if(can(x,y)&&free(x,y,1,1))put(x,y,'dump')}
  for(let x=10;x<W-10;x+=13){const y=BY1+3;if(can(x,y)&&free(x,y,1,1))put(x,y,'lamp')}}
 if(th==='estate'||mp.pool){for(let tr=0;tr<30;tr++){const px=BX1+7+(rn()*10|0),py=BY0+4+(rn()*(BY1-BY0-20)|0);let ok=true;for(let j=-1;j<=5&&ok;j++)for(let i=-1;i<=9;i++)if(!can(px+i,py+j)||busy(px+i,py+j)){ok=false;break}
   if(ok){for(let j=-1;j<=5;j++)for(let i=-1;i<=9;i++)pathA[(py+j)*W+px+i]=2;for(let j=0;j<4;j++)for(let i=0;i<8;i++)put(px+i,py+j,'water');for(let i=0;i<8;i+=3)if(can(px+i,py+4))put(px+i,py+4,'bench');break}}}
 if(th==='ind'){const isRef=mp.n==='REFINERY';
  for(let i=0;i<(isRef?10:3);i++)for(let tr=0;tr<40;tr++){const x=yx0+3+(rn()*(yx1-yx0-8)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=5&&free(x,y,2,2)){put(x,y,'tTL');put(x+1,y,'tTR');put(x,y+1,'tBL');put(x+1,y+1,'tBR');break}}
  for(let i=0;i<(isRef?9:26);i++)for(let tr=0;tr<40;tr++){const v=rn()<.5,L=3+(rn()*2|0),w=v?1:L,h=v?L:1,x=yx0+3+(rn()*(yx1-yx0-8)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=5&&free(x,y,w,h)){const c=rn()*6|0;for(let j=0;j<h;j++)for(let q=0;q<w;q++)put(x+q,y+j,'cont',c);break}}
  for(let i=0;i<16;i++)for(let tr=0;tr<30;tr++){const x=yx0+3+(rn()*(yx1-yx0-8)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=4&&free(x,y,2,1)){put(x,y,'barrel');put(x+1,y,'barrel');break}}
  if(isRef)for(let i=0;i<7;i++)for(let tr=0;tr<30;tr++){const L=6+(rn()*6|0),x=yx0+3+(rn()*(yx1-yx0-L-6)|0),y=yy0+3+(rn()*(yy1-yy0-8)|0);if(dd(x,y)>=5&&free(x,y,L,1)){for(let q=0;q<L;q++)put(x+q,y,'pipe');break}}}}
function extArt(P,x,y,n){
 const th=XTH[(MAPS[CURM]||{}).xt||'city']||XTH.city;
 if(y>=OY){if(y>OY+BY1+3){P(0,0,T,T,'#05070a');return true}if(x>=BX0&&x<=BX1&&y>=OY+BY0&&y<=OY+BY1)return false;
  if(fk[y*W+x]===KD.ledge){P(0,0,T,T,'#4a4e56');P(0,0,T,2,'#6a6f78');P(0,T-2,T,2,'#2e3138');for(let i=0;i<4;i++)P(n()*14|0,n()*14|0,2,1,'#5a5e66')}
  else{P(0,0,T,T,'#07090e');for(let i=0;i<3;i++)if(n()<.45)P(n()*15|0,n()*15|0,1,1,n()<.5?'#2a3550':'#cdb86a')}return true}
 if(y>BY1+9){P(0,0,T,T,'#05070a');return true}
 if(x>=BX0&&x<=BX1&&y>=BY0&&y<=BY1)return false;
 const d=Math.max(BX0-x,x-BX1,BY0-y,y-BY1),ry=y-BY1;
 if(ry>=5){if(ry===5||ry===9){P(0,0,T,T,th.p[0]);P(0,ry===5?T-2:0,T,2,th.p[1]);for(let i=0;i<3;i++)P(n()*15|0,n()*15|0,1,1,th.p[2])}
  else{P(0,0,T,T,th.r);for(let i=0;i<10;i++)P(n()*15|0,n()*15|0,1,1,'#3a3f47');if(ry===7&&x%3!==0)P(2,7,10,2,'#d8b43a');if(x%44<4&&ry!==7){for(let k=0;k<4;k++)P(k*4,0,2,T,'#c8ccd2')}}return true}
 const pa=pathA[y*W+x];
 if(pa===2){P(0,0,T,T,'#a58a62');for(let k=0;k<4;k++)P(0,k*4+3,T,1,'#7e6844');return true}
 if(d<=2||pa===1||(y>BY1&&y<=BY1+4)){P(0,0,T,T,th.p[0]);P(0,7,T,1,th.p[1]);P(7,0,1,T,th.p[1]);P(1,1,1,1,th.p[2]);P(9,10,1,1,th.p[2]);if(d===1)P(0,0,T,1,'rgba(0,0,0,.18)');return true}
 P(0,0,T,T,th.g[0]);for(let i=0;i<16;i++)P(n()*15|0,n()*15|0,1,1,th.g[1+(n()<.5?1:0)]);if(n()<.04&&(MAPS[CURM]||{}).xt==='estate')P(n()*13|0,n()*13|0,2,2,['#e8c8d8','#f0e060','#d8e8f8'][n()*3|0]);return true}
function drawWin(P,r){P(0,0,T,T,'#26303c');P(0,0,T,2,'#3b4658');P(0,T-2,T,2,'#1a2028');P(2,3,12,10,'#3f6f94');P(2,3,12,2,'#7fb2d4');P(3,5,3,6,'#4f82a8');P(7,3,1,10,'#26303c');P(2,8,12,1,'#26303c');if(r<.7){P(4,4,1,5,'#d8ecf8');P(5,8,3,1,'#d8ecf8');P(10,6,1,4,'#d8ecf8')}if(r<.35){P(3,3,6,6,'#0e1218');P(9,8,4,4,'#0e1218')}}
function drawFurn(P,x,y,n){const k=fk[y*W+x],c=fc[y*W+x],sh=()=>P(0,14,16,2,'rgba(0,0,0,.35)');
 switch(k){
 case 0:P(2,3,12,10,'#4a3420');P(2,2,12,10,'#8a6a46');P(2,2,12,1,'#a98458');P(4,4,3,2,'#b79b72');P(9,7,3,2,'#6e5334');sh();break;
 case 1:P(1,1,14,14,'#2a2f3a');P(2,2,12,12,['#cfd6de','#d9c7a0','#b7cde0','#d8a8a8'][c&3]);P(3,3,10,3,'#ffffff');P(2,7,12,7,['#3f6fa8','#7a3f3f','#4a7a5a','#6a4a8a'][c&3]);P(2,7,12,1,'#1e2a40');break;
 case 2:P(1,3,14,11,'#2a2236');P(1,3,14,3,'#3a2f4a');P(2,6,6,7,['#6a4a7a','#4a5a7a','#7a4a4a','#4a6a5a'][c&3]);P(8,6,6,7,['#6a4a7a','#4a5a7a','#7a4a4a','#4a6a5a'][c&3]);P(8,6,1,7,'#1a1420');sh();break;
 case 3:P(0,2,16,12,'#33363c');P(0,2,16,3,'#a6acb6');P(0,5,16,1,'#6c727c');P(0,13,16,1,'#1a1c20');for(let i=2;i<16;i+=5)P(i,8,3,3,'#4a4e56');break;
 case 4:P(0,1,16,13,'#2b1f14');for(let r=0;r<3;r++){P(1,2+r*4,14,3,'#4a3828');for(let i=0;i<7;i++)P(1+i*2,2+r*4,1,3,['#a83a30','#3a5a8a','#c8a038','#4a7a4a','#7a4a8a'][(i+r+c)%5])}break;
 case 5:P(1,0,14,15,'#2a3038');P(2,1,6,13,'#5a6572');P(8,1,6,13,'#4c5662');P(2,1,12,1,'#8a96a4');P(7,6,1,3,'#cfd6de');P(9,6,1,3,'#cfd6de');P(3,3,4,1,'#2a3038');P(9,3,4,1,'#2a3038');break;
 case 6:P(1,1,14,14,'#14181e');P(2,2,12,12,'#3a4350');P(3,3,10,4,'#0c1218');P(4,4,2,1,'#6aff9a');P(7,4,2,1,'#ffb62e');P(10,4,2,1,'#4aa8ff');P(3,9,3,3,'#5a6572');P(8,9,5,3,'#2a3038');P(9,10,1,1,'#e0453a');break;
 case 7:P(3,1,10,14,'#14100e');P(4,2,8,12,'#6a2a22');P(4,2,8,1,'#8a3a30');P(4,5,8,1,'#3a1612');P(4,10,8,1,'#3a1612');P(5,3,2,1,'#c85a4a');break;
 case 8:P(0,3,16,10,'#4a3a28');P(0,3,16,2,'#6a5238');P(5,4,6,5,'#0c0e12');P(6,5,4,3,'#4aa0e8');P(7,10,2,1,'#cfd6de');P(1,6,3,4,'#d8d0b8');sh();break;
 case 9:P(5,9,6,5,'#6a4a30');P(5,9,6,1,'#8a6a48');for(const[a,b]of[[3,2],[7,1],[10,3],[4,5],[8,5],[6,3]])P(a,b,4,4,'#2f7a3a');P(5,3,2,2,'#4ab058');P(9,4,2,2,'#4ab058');break;
 case 10:P(0,5,16,6,'#3a3e46');P(0,6,16,2,'#8a8f98');P(0,8,16,1,'#5a5e66');P(0,10,16,1,'#22252a');P(3,4,2,8,'#6a6f78');P(11,4,2,8,'#6a6f78');break;
 case 11:P(2,2,12,12,'#6a6f78');P(3,3,10,10,'#8a8f98');P(4,4,4,3,'#b8bec8');break;
 case 12:P(0,1,16,14,CONC[c%6]);P(0,1,16,2,'rgba(255,255,255,.22)');P(0,13,16,2,'rgba(0,0,0,.35)');for(let i=2;i<16;i+=4)P(i,3,1,10,'rgba(0,0,0,.28)');break;
 case 13:P(1,3,15,10,'#0b0d11');P(2,4,14,8,CARC[c%6]);P(2,4,14,2,'rgba(255,255,255,.25)');P(6,5,9,6,'#1c2430');P(7,6,2,4,'#6a8fb0');P(1,5,2,2,'#f0e8a0');P(1,10,2,2,'#f0e8a0');P(3,12,3,2,'#0b0d11');P(11,12,3,2,'#0b0d11');break;
 case 14:P(0,3,15,10,'#0b0d11');P(0,4,14,8,CARC[c%6]);P(0,4,14,2,'rgba(255,255,255,.25)');P(0,5,6,6,'#1c2430');P(2,6,2,4,'#6a8fb0');P(13,5,2,2,'#c8281e');P(13,10,2,2,'#c8281e');P(2,12,3,2,'#0b0d11');P(10,12,3,2,'#0b0d11');break;
 case 15:P(1,1,14,14,'#16301c');P(2,0,12,15,'#245a2c');P(3,1,10,12,'#2f7a3a');for(let i=0;i<10;i++)P(3+(n()*9|0),2+(n()*9|0),2,2,n()<.5?'#3f9a4a':'#1f5a2a');P(5,3,3,2,'#58b862');break;
 case 16:P(0,3,16,11,'#16301c');P(0,2,16,10,'#2f6a3a');for(let i=0;i<9;i++)P(n()*14|0,2+(n()*8|0),2,2,n()<.5?'#3f8a4a':'#244f2c');P(0,2,16,1,'#4a9a58');break;
 case 17:P(0,5,16,3,'#2a2d33');P(0,5,16,1,'#c8ced6');P(0,7,16,1,'#5a5e66');for(let i=1;i<16;i+=4){P(i,2,2,11,'#3a3e46');P(i,2,2,1,'#c8ced6')}break;
 case 39:P(6,0,3,16,'#2a2d33');P(6,0,1,16,'#c8ced6');for(let i=1;i<16;i+=4){P(4,i,7,2,'#3a3e46')}break;
 case 18:P(1,4,14,3,'#6a4a2c');P(1,8,14,3,'#6a4a2c');P(1,4,14,1,'#8a6a44');P(2,11,2,3,'#2a2d33');P(12,11,2,3,'#2a2d33');break;
 case 19:P(1,3,14,11,'#0e1410');P(2,4,12,9,'#2f5a3a');P(2,4,12,2,'#47805a');P(2,9,12,1,'#1f3a26');break;
 case 20:P(6,6,4,4,'#2a2d33');P(7,7,2,2,'#f0e8a0');P(4,4,8,8,'rgba(240,232,160,.15)');break;
 case 21:P(1,1,14,14,'#6a6f78');P(2,2,12,12,'#3a2a1c');for(const[a,b]of[[3,3],[8,4],[5,8],[9,9]])P(a,b,3,3,'#3f9a4a');break;
 case 22:P(0,0,16,16,'#3a2c20');P(1,1,14,13,'#5a4630');P(0,14,16,2,'#1a120c');P(3,3,2,2,'#a88a5a');break;
 case 23:P(1,2,14,12,'#0c0e12');P(2,3,12,5,'#1c2028');for(let i=3;i<14;i+=2)P(i,9,1,4,'#e8e8e8');break;
 case 24:P(1,1,14,14,'#8a909a');P(2,2,12,12,'#e8eef4');P(2,2,5,4,'#ffffff');P(1,7,14,1,'#8a909a');P(1,10,14,1,'#8a909a');break;
 case 27:P(1,2,14,12,'#0e1014');P(2,3,12,10,'#8a909a');P(5,5,6,6,'#2a2d33');P(7,7,2,2,'#6a6f78');break;
 case 29:P(1,1,14,14,'#14161a');P(2,2,12,12,'#555a62');P(3,3,10,1,'#8a909a');P(8,8,3,3,'#c8a038');P(9,9,1,1,'#14161a');break;
 case 30:P(1,1,14,14,'#14161a');P(2,2,12,12,'#3a3e46');P(3,3,10,3,'#c8281e');P(4,8,8,5,'#22252a');break;
 case 31:P(0,2,16,12,'#1a1226');P(1,3,14,10,'#3a2a5a');P(3,5,4,4,'#0c0e12');P(9,5,4,4,'#0c0e12');P(4,6,2,2,'#d85ad8');P(10,6,2,2,'#5ad8d8');break;
 case 32:P(4,2,12,14,'#6a6f78');P(2,4,14,12,'#6a6f78');P(5,4,3,2,'#b8bec8');break;
 case 33:P(0,2,12,14,'#6a6f78');P(0,4,14,12,'#6a6f78');P(5,4,3,2,'#8a909a');break;
 case 34:P(4,0,12,14,'#4a4f58');P(2,0,14,12,'#4a4f58');break;
 case 35:P(0,0,12,14,'#4a4f58');P(0,0,14,12,'#4a4f58');P(0,13,14,2,'rgba(0,0,0,.3)');break;
 case 36:P(0,0,16,16,'#2a6a9a');for(let i=0;i<4;i++)P(n()*13|0,n()*13|0,3,1,'#6ab0d8');P(0,0,16,1,'#8fc8e8');break;
 case 37:P(2,2,12,12,'#14301f');P(3,3,10,10,'#1f4a34');P(5,5,6,6,'#2a5e42');P(4,3,8,2,'#e8f0f6');P(6,8,4,2,'#e8f0f6');break;
 }}
function buildExtras(){
 for(const a of RAP)for(const[x,y]of a.win){map[y][x]=3;winF[y*W+x]=1}
 for(let y=OY;y<=OY+BY1+3&&y<H;y++)for(let x=0;x<W;x++){if(x>=BX0&&x<=BX1&&y>=OY+BY0&&y<=OY+BY1)continue;map[y][x]=10;fk[y*W+x]=(x>=BX0-1&&x<=BX1+1&&y>=OY+BY0-1&&y<=OY+BY1+1)?KD.ledge:KD.void}
 buildExt()}
// ---- timed building + crowbar ----
function barrPair(tx,ty){for(const[dx,dy]of D4)if(map[ty+dy]&&map[ty+dy][tx+dx]===9)return[tx+dx,ty+dy];return null}
function breakBarr(tx,ty){if(!map[ty]||map[ty][tx]!==9)return;const p=barrPair(tx,ty);setTile(tx,ty,5);if(p)setTile(p[0],p[1],5);boom(tx*T+8,ty*T+8,16,'#b27a42');sfx(130,.25,'sawtooth',.06)}
function buildTgt(me){let f=null;
 if(keys.b){for(let d=6;d<=40&&!f;d+=3){const x=me.x+Math.cos(me.a)*d,y=me.y+Math.sin(me.a)*d,tx=x/T|0,ty=y/T|0,t=map[ty]&&map[ty][tx];if(t===5)f={tx,ty,k:'b'};else if(t===3&&G.phase==='prep')f={tx,ty,k:'r'}}}
 else{const tx=(mouse.x+cam.x)/T|0,ty=(mouse.y+cam.y)/T|0,t=map[ty]&&map[ty][tx];if(t===3&&dst(me.x,me.y,tx*T+8,ty*T+8)<72)f={tx,ty,k:'r'};else if(t===5&&dst(me.x,me.y,tx*T+8,ty*T+8)<90)f={tx,ty,k:'b'}}
 if(!f){if(keys.b)G.msg='FACE A DOORWAY (OR A WALL IN PREP)';return null}
 if(f.k==='r'&&G.reinf>=REINF){G.msg='NO REINFORCEMENTS LEFT';return null}
 if(f.k==='b'&&G.barr>=BARR){G.msg='NO BARRICADES LEFT';return null}
 if(f.k==='b'&&G.bcd>0&&G.phase==='act')return null;return f}
function buildBarr(){}
// ---- rappel (ATTACKERS ONLY) ----
// Attackers rope up an upper-floor outer wall from the ground beside it, hang on the outside, slide ALONG the wall
// (A/D on north/south walls, W/S on east/west walls), shoot, kick in an unreinforced window or let themselves down.
const RAP_UP=70,RAP_KICK=40,RAP_DOWN=45,RAP_SL=.95;
const RNORM={n:[0,1],s:[0,-1],w:[1,0],e:[-1,0]}; // inward (towards the roof anchor)
function rapPos(s,q){return s==='n'?[q,(OY+BY0-1)*T+8]:s==='s'?[q,(OY+BY1+1)*T+8]:s==='w'?[(BX0-1)*T+8,q]:[(BX1+1)*T+8,q]}
function rapGroundPos(s,q){return s==='n'?[q,(BY0-1)*T+8]:s==='s'?[q,(BY1+1)*T+8]:s==='w'?[(BX0-1)*T+8,q-OY*T]:[(BX1+1)*T+8,q-OY*T]}
function rapWallT(s,q){const c=q/T|0;return s==='n'?[c,OY+BY0]:s==='s'?[c,OY+BY1]:s==='w'?[BX0,c]:[BX1,c]}
function rapOK(s,q){const[x,y]=rapWallT(s,q);if(s==='n'||s==='s'){if(x<BX0+1||x>BX1-1)return false}else if(y<OY+BY0+1||y>OY+BY1-1)return false;const t=map[y]&&map[y][x];return t===2||t===3||t===4||(t===1&&winF[y*W+x]===1)}
function rapWinQ(a){return a.s==='n'||a.s==='s'?(a.c+1)*T:(OY+a.c+1)*T}
function rapWinAt(s,q){for(let i=0;i<RAP.length;i++){const a=RAP[i];if(a.s!==s)continue;const base=s==='n'||s==='s'?a.c:OY+a.c,idx=(q/T|0)-base;if(idx>=0&&idx<=1)return{i,a,idx}}return null}
function winState(a){return map[a.win[0][1]][a.win[0][0]]}
function rapNear(e){if(e.side!=='A')return null;
 if(e.y<OY*T){let s=null,q=0;const tx=e.x/T|0,ty=e.y/T|0;
  if(tx>BX0&&tx<BX1){if(e.y<BY0*T&&e.y>BY0*T-13){s='n';q=e.x}else if(e.y>(BY1+1)*T&&e.y<(BY1+1)*T+13){s='s';q=e.x}}
  if(!s&&ty>BY0&&ty<BY1){if(e.x<BX0*T&&e.x>BX0*T-13){s='w';q=e.y+OY*T}else if(e.x>(BX1+1)*T&&e.x<(BX1+1)*T+13){s='e';q=e.y+OY*T}}
  if(s&&rapOK(s,q))return{k:'g',s,q};return null}
 for(let i=0;i<RAP.length;i++){const a=RAP[i];if(dst(e.x,e.y,a.ix*T+8,a.iy*T+8)<16)return{k:'i',i,s:a.s,q:rapWinQ(a)}}return null}
function rapMove(e,to,arg){
 if(to==='hang'){e.rs=arg.s;e.rq=arg.q;const[x,y]=rapPos(arg.s,arg.q);e.x=x;e.y=y;e.rps='hang';e.rpp=0;e.hold=0;const n=RNORM[arg.s];e.a=Math.atan2(n[1],n[0]);boom(e.x,e.y,6,'#cfd6de');sfx(380,.08,'triangle',.04);return true}
 if(to==='in'){const w=rapWinAt(e.rs,e.rq);if(!w)return false;const a=w.a;if(winState(a)===4){if(e===G.me)G.msg='WINDOW IS REINFORCED';e.rpp=0;return false}
  for(const[x,y]of a.win)if(map[y][x]===3||map[y][x]===4){setTile(x,y,1)}boom(a.win[w.idx][0]*T+8,a.win[w.idx][1]*T+8,18,'#9ac8e8');sfx(240,.25,'sawtooth',.07);const[ix,iy]=a.inside[w.idx];e.x=ix*T+8;e.y=iy*T+8;e.rps=null;e.stun=Math.max(e.stun,20);return true}
 if(to==='ground'){let best=null;for(const d of[0,T,-T,2*T,-2*T,3*T,-3*T]){const q=e.rq+d;if(!rapOK(e.rs,q))continue;const[x,y]=rapGroundPos(e.rs,q);if(!blk(tileAt(x-5,y-5))&&!blk(tileAt(x+5,y-5))&&!blk(tileAt(x-5,y+5))&&!blk(tileAt(x+5,y+5))){best=[x,y];break}}
  if(!best)best=rapGroundPos(e.rs,e.rq);e.x=best[0];e.y=best[1];e.rps=null;sfx(300,.1,'triangle',.04);return true}
 return false}
function rapTick(me){
 if(me.side!=='A'){me.rps=null;me.rpp=0;return}
 if(G.phase!=='act'){me.rpp=0;return}
 if(me.rps==='hang'){const s=me.rs,hz=s==='n'||s==='s';
  const mv=hz?(keys.d?1:0)-(keys.a?1:0):(keys.s?1:0)-(keys.w?1:0);
  const away=s==='n'?keys.w:s==='s'?keys.s:s==='w'?keys.a:keys.d;
  if(mv){const sp=RAP_SL*(keys.alt?.5:1);if(rapOK(s,me.rq+mv*sp+mv*6))me.rq+=mv*sp}
  const[x,y]=rapPos(s,me.rq);me.x=x;me.y=y;me.lock=1;me.mv=mv?.6:0;
  const w=rapWinAt(s,me.rq),mode=away||!w?'down':'in';
  if(keys.x){me.rpp=(me.rpp||0)+1;const need=mode==='down'?RAP_DOWN:RAP_KICK;
   if(mode==='in'&&winState(w.a)===4){G.prog={t:'WINDOW REINFORCED',v:0,c:'#ff4a4a'};me.rpp=0}
   else{G.prog={t:mode==='down'?'DESCENDING':'KICKING IN',v:me.rpp/need,c:'#7ed0ff'};if(me.rpp>=need){me.rpp=0;rapMove(me,mode==='down'?'ground':'in')}}}
  else me.rpp=0;return}
 const n=rapNear(me);
 if(n&&keys.x){me.lock=1;me.mv=0;me.rpp=(me.rpp||0)+1;const need=n.k==='g'?RAP_UP:RAP_KICK;G.prog={t:n.k==='g'?'ATTACHING ROPE':'GOING OUT',v:me.rpp/need,c:'#7ed0ff'};
  if(me.rpp>=need){me.rpp=0;rapMove(me,'hang',{s:n.s,q:n.q})}}else me.rpp=0}
function rapBot(e,gx,gy,sp){if(e.side!=='A'||!RAP.length)return false;
 if(e.rps==='hang'){e.mv=0;e.rpp=(e.rpp||0)+1;if(e.rpp>=RAP_KICK+25){e.rpp=0;if(!rapMove(e,'in')){e.useR=false;rapMove(e,'ground')}}return true}
 if(gy>=OY*T&&e.y<OY*T){if(e.useR===undefined)e.useR=Math.random()<.55;if(!e.useR)return false;
  if(e.ri===undefined){let b=0,bd=1e9;RAP.forEach((a,i)=>{const d=dst(a.ix*T+8,a.iy*T+8,gx,gy);if(d<bd){bd=d;b=i}});e.ri=b}
  const a=RAP[e.ri],px=a.ox*T+8,py=a.oy*T+8;if(dst(e.x,e.y,px,py)>10){navTo(e,px,py,sp);return true}
  e.mv=0;e.rpp=(e.rpp||0)+1;if(e.rpp>=RAP_UP){e.rpp=0;rapMove(e,'hang',{s:a.s,q:rapWinQ(a)})}return true}
 return false}
// ---- thrown + placed utility ----
const THR={frag:1,flash:1},ARMQ={flash:'throw',smoke:'throw',kap:'place',mat:'place'};
function throwNade(e,k,tx,ty,fuse){const a=Math.atan2(ty-e.y,tx-e.x),d=Math.min(dst(e.x,e.y,tx,ty),THROW_R),v=Math.max(1,d*.05);
 G.nades.push({x:e.x+Math.cos(a)*7,y:e.y+Math.sin(a)*7,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:fuse,k,own:e,b:0,air:22,amp:7});sfx(300,.05,'triangle',.03)}
function stepNade(n,fx){const sp=Math.hypot(n.vx,n.vy);if(sp<.06){n.vx=n.vy=0;return}
 for(let s=0;s<2;s++){const nx=n.x+n.vx/2,ny=n.y+n.vy/2;let hit=0;
  if(solid(tileAt(nx,n.y))){n.vx*=-.5;n.vy*=.85;hit=1}else n.x=nx;
  if(solid(tileAt(n.x,ny))){n.vy*=-.5;n.vx*=.85;hit=1}else n.y=ny;
  if(hit){n.b++;n.air=9;n.amp=Math.max(2,n.amp*.5);if(fx&&n.b<5){sfx(520-n.b*70,.04,'square',.025);boom(n.x,n.y,2,'#c8c8c8')}}}
 n.vx*=.95;n.vy*=.95;if(n.air>0)n.air--}
function updNades(){for(let i=G.nades.length-1;i>=0;i--){const n=G.nades[i];stepNade(n,true);
 if(--n.t<=0){if(n.k==='frag')explode(n.x,n.y,38,75,n.own);
  else if(n.k==='smoke'){G.smokes.push({x:n.x,y:n.y,t:700,r:34});sfx(200,.4,'sine',.04)}
  else{for(const d of G.ents)if(d.alive&&d.side!==n.own.side&&dst(d.x,d.y,n.x,n.y)<100&&los(n.x,n.y,d.x,d.y))d.blind=150;G.ring.push({x:n.x,y:n.y,r:2,c:'#ffffff'});boom(n.x,n.y,10,'#ffffff');sfx(1200,.15,'sine',.05)}
  G.nades.splice(i,1)}}}
function drawNade(n){const z=n.air>0?Math.sin(Math.PI*n.air/(n.b?9:22))*n.amp:0;g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(n.x,n.y+1,3,1.6,0,0,7);g.fill();
 const x=Math.round(n.x),y=Math.round(n.y-z-2);g.fillStyle='#050608';g.fillRect(x-3,y-3,6,6);g.fillStyle=n.k==='flash'?'#e8e8e8':n.k==='smoke'?'#9aa4ae':'#4a5d3a';g.fillRect(x-2,y-2,4,4);g.fillStyle='#8a929c';g.fillRect(x-1,y-4,2,1);g.fillStyle=n.t%10<5?'#ff4a4a':'#fff';g.fillRect(x+1,y-4,1,1)}
function placePt(e,tx,ty){if(e.bot)return aimPt(e,60);const d=dst(e.x,e.y,tx,ty);if(d>PLACE_R||!los(e.x,e.y,tx,ty)||blk(tileAt(tx,ty)))return null;return{x:tx,y:ty}}
function nitroBoom(e){let any=0;for(let i=G.traps.length-1;i>=0;i--){const t=G.traps[i];if(t.k==='nitro'&&t.own===e){G.traps.splice(i,1);explode(t.x,t.y,46,85,e);any=1}}return any}
function gadget2(e,tx,ty){if(!e.alive||e.g2cd>0||!e.g2)return;const k=e.g2,tp=tx===undefined?(e===G.me?{x:mouse.x+cam.x,y:mouse.y+cam.y}:aimPt(e,110)):{x:tx,y:ty};
 if(THR[k]){if(e.g2n<=0)return;e.g2cd=30;throwNade(e,k,tp.x,tp.y,k==='frag'?100:70);e.g2n--;return}
 if(k==='nitro'&&e.g2n<=0){e.g2cd=20;nitroBoom(e);return}
 if(e.g2n<=0)return;const p=placePt(e,tp.x,tp.y);if(!p){if(e===G.me)G.msg='TOO FAR OR BLOCKED';return}
 G.traps.push({x:p.x,y:p.y,k,own:e});e.g2n--;e.g2cd=24;sfx(260,.06,'square',.04);boom(p.x,p.y,4,'#8fa3bf')}
function gadget(e,tx,ty){if(e.gcd>0||!e.alive)return;const o=e.op.gd;if(!o)return;if(window.R6A&&R6A.use(e,tx,ty))return;
 if(o==='flash'||o==='smoke'||o==='kap'||o==='mat'){if(e.gn<=0)return;const tp=tx===undefined?(e===G.me?{x:mouse.x+cam.x,y:mouse.y+cam.y}:aimPt(e,110)):{x:tx,y:ty};
  if(o==='flash'||o==='smoke'){throwNade(e,o,tp.x,tp.y,o==='flash'?60:45);e.gcd=40;e.gn--;return}
  const p=placePt(e,tp.x,tp.y);if(!p){if(e===G.me)G.msg='TOO FAR OR BLOCKED';return}G.traps.push({x:p.x,y:p.y,k:o});e.gn--;e.gcd=24;sfx(260,.06,'square',.04);boom(p.x,p.y,4,'#8fa3bf');return}
 gadgetOld(e)}
function armG(e,src){if(!e.alive||G.phase==='end'||DRN()||G.cv>=0)return;if(G.arm&&G.arm.src===src){G.arm=null;return}
 if(src==='g2'){const k=e.g2;if(!k)return;if(k==='nitro'&&e.g2n<=0){gadget2(e);return}if(e.g2n<=0){G.msg='NONE LEFT';return}G.arm={src,k,kind:THR[k]?'throw':'place'}}
 else{const o=e.op.gd;if(!o)return;if(ARMQ[o]){if(e.gn<=0){G.msg='NONE LEFT';return}G.arm={src,k:o,kind:ARMQ[o]}}else gadget(e)}}
function useArmed(){const a=G.arm,e=G.me;if(!a||!e.alive)return;const tx=mouse.x+cam.x,ty=mouse.y+cam.y;if(a.src==='g2')gadget2(e,tx,ty);else gadget(e,tx,ty);
 if(a.kind==='throw'||(a.src==='g2'&&e.g2n<=0)||(a.src==='q'&&e.gn<=0))G.arm=null}
function tickX(me){if(G.rqp===undefined){G.rqp=0;G.bqp=0;G.rf=null;G.arm=null}
 me.lock=0;me.nofire=G.arm?1:0;G.prog=null;
 if(!me.alive||DRN()||G.cv>=0||PAUSED){G.rf=null;G.arm=null;return}
 // hold-to-build (reinforce a wall / barricade a doorway)
 let tgt=null;if(me.side==='D'&&G.phase!=='end'&&(keys.b||(mouse.down&&G.phase==='prep'&&!G.arm&&Math.abs(me.ln||0)<.2)))tgt=buildTgt(me);
 if(tgt){if(!G.rf||G.rf.tx!==tgt.tx||G.rf.ty!==tgt.ty||G.rf.k!==tgt.k)G.rf={tx:tgt.tx,ty:tgt.ty,k:tgt.k,p:0};
  const need=tgt.k==='r'?REINF_T:BARR_T;G.rf.p++;me.lock=1;me.mv=0;G.prog={t:tgt.k==='r'?'REINFORCING':'BARRICADING',v:G.rf.p/need,c:tgt.k==='r'?'#ffe14a':'#ffcf6a'};
  if(G.rf.p%13===1){sfx(tgt.k==='r'?170:210,.06,'square',.035);boom(tgt.tx*T+8,tgt.ty*T+8,2,'#b8b8b8')}
  if(G.rf.p>=need){if(tgt.k==='r'){if(map[tgt.ty][tgt.tx]===3){setTile(tgt.tx,tgt.ty,4);G.reinf++;sfx(300,.12,'square',.05);boom(tgt.tx*T+8,tgt.ty*T+8,8,'#aab4c0')}}
   else if(putBarr(tgt.tx,tgt.ty,1))G.bcd=G.phase==='prep'?10:120;G.rf=null}}
 else G.rf=null;
 // crowbar: only drawn while actually working on a barricade
 if(keys.f&&G.phase!=='end'&&me.rps!=='hang'){const r=rayHit(me,26);if(r.t===9){me.lock=1;me.nofire=1;me.mv=0;me.cwo=5;me.a=Math.atan2(r.ty*T+8-me.y,r.tx*T+8-me.x);me.cp=(me.cp||0)+1;
   G.prog={t:'CROWBAR',v:me.cp/CROW_T,c:'#e08a3a'};if(me.cp%14===1){sfx(140+Math.random()*60,.06,'square',.045);boom(r.x,r.y,3,'#b27a42')}
   if(me.cp>=CROW_T){me.cp=0;breakBarr(r.tx,r.ty);G.msg='BARRICADE DOWN'}}else me.cp=0}
 else if(me.cp>0)me.cp=Math.max(0,me.cp-4);
 rapTick(me)}
// ---- drawing helpers ----
function drawCrow(e,x,y){const a=e.a+Math.sin(G.t*.55+(e.id||0))*.8,ca=Math.cos(a),sa=Math.sin(a),bx=x+Math.cos(e.a)*5,by=y-2+Math.sin(e.a)*5;
 for(let i=0;i<11;i++){g.fillStyle=i>8?'#d8dce2':'#8a9099';g.fillRect(Math.round(bx+ca*i)-1,Math.round(by+sa*i)-1,2,2)}
 const tx=bx+ca*11,ty=by+sa*11;g.fillStyle='#c8281e';g.fillRect(Math.round(tx-sa*2)-1,Math.round(ty+ca*2)-1,2,2);g.fillRect(Math.round(tx+sa*2)-1,Math.round(ty-ca*2)-1,2,2)}
function drawHand(e,x,y){e.cwo>0?drawCrow(e,x,y):drawGun(e,x,y)}
function drawWorldExtra(){const me=G.me;
 // rappel anchors on the ground + ropes on hanging operators
 for(const a of RAP){const x=a.ox*T+8,y=a.oy*T+8;g.fillStyle='#0b0d11';g.fillRect(x-4,y-4,8,8);g.fillStyle='#d8b43a';g.fillRect(x-3,y-3,6,2);g.fillRect(x-3,y+1,6,2);g.fillStyle='#cfd6de';g.fillRect(x-1,y-3,2,6)}
 for(const e of G.ents)if(e.alive&&e.rps==='hang'&&RNORM[e.rs]){const n=RNORM[e.rs];g.strokeStyle='#d8c898';g.lineWidth=1;g.beginPath();g.moveTo(e.x,e.y);g.lineTo(e.x+n[0]*90,e.y+n[1]*90);g.stroke();g.fillStyle='#d8b43a';g.fillRect(Math.round(e.x)-2,Math.round(e.y)-2,4,4);g.fillStyle='#0b0d11';g.fillRect(Math.round(e.x)-1,Math.round(e.y)-1,2,2)}
 // reinforcement / barricade progress
 if(G.rf){const x=G.rf.tx*T,y=G.rf.ty*T,need=G.rf.k==='r'?REINF_T:BARR_T;g.strokeStyle=G.rf.k==='r'?'#ffe14a':'#ffcf6a';g.lineWidth=1;g.strokeRect(x+.5,y+.5,T-1,T-1);g.fillStyle='#000c';g.fillRect(x,y-5,T,4);g.fillStyle=G.rf.k==='r'?'#ffe14a':'#ffcf6a';g.fillRect(x+1,y-4,Math.round((T-2)*cl(G.rf.p/need,0,1)),2)}
 if(G.phase==='prep'){if(G.rq&&G.rq.length){const w=G.rq[G.rq.length-1];if(map[w[1]][w[0]]===3){const x=w[0]*T,y=w[1]*T;g.fillStyle='#000c';g.fillRect(x,y-5,T,4);g.fillStyle='#ffe14a';g.fillRect(x+1,y-4,Math.round((T-2)*cl(G.rqp/REINF_T,0,1)),2)}}
  if(G.bq&&G.bq.length){const w=G.bq[G.bq.length-1],x=w[0]*T,y=w[1]*T;g.fillStyle='#000c';g.fillRect(x,y-5,T,4);g.fillStyle='#ffcf6a';g.fillRect(x+1,y-4,Math.round((T-2)*cl(G.bqp/(BARR_T*2.2),0,1)),2)}}
 // crowbar bar over bots
 for(const e of G.ents)if(e.alive&&e.bot&&e.cwo>0){g.fillStyle='#000c';g.fillRect(e.x-7,e.y-20,14,3);g.fillStyle='#e08a3a';g.fillRect(e.x-6,e.y-19,Math.round(12*cl(e.bt/90,0,1)),1)}
 for(const e of G.ents)if(e.alive&&e.work&&(e.side===me.side||visible(e)===true)){const c=e.work.k==='r'?'#ffe14a':e.work.k==='b'?'#ffcf6a':'#8fa3bf';g.fillStyle='#000c';g.fillRect(e.x-8,e.y-21,16,4);g.fillStyle=c;g.fillRect(e.x-7,e.y-20,Math.round(14*cl(e.work.v,0,1)),2);if(e.work.k==='r'){g.strokeStyle=c;g.lineWidth=1;g.strokeRect(e.work.tx*T+.5,e.work.ty*T+.5,T-1,T-1)}}
 // throw / placement preview
 const a=G.arm;if(a&&me.alive){const tx=mouse.x+cam.x,ty=mouse.y+cam.y;
  if(a.kind==='throw'){const n={x:me.x+Math.cos(Math.atan2(ty-me.y,tx-me.x))*7,y:me.y+Math.sin(Math.atan2(ty-me.y,tx-me.x))*7,vx:0,vy:0,b:0,air:22,amp:7},aa=Math.atan2(ty-me.y,tx-me.x),d=Math.min(dst(me.x,me.y,tx,ty),THROW_R),v=Math.max(1,d*.05);n.vx=Math.cos(aa)*v;n.vy=Math.sin(aa)*v;
   g.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<150&&Math.hypot(n.vx,n.vy)>=.06;i++){stepNade(n,false);if(i%5===0)g.fillRect(Math.round(n.x),Math.round(n.y),1,1)}
   g.strokeStyle='#ffe14a';g.lineWidth=1;g.beginPath();g.arc(n.x,n.y,a.k==='frag'?38:a.k==='smoke'?30:100*.35,0,7);g.stroke()}
  else{const ok=!!placePt(me,tx,ty);g.strokeStyle=ok?'#6aff9a':'#ff4a4a';g.lineWidth=1;g.beginPath();g.arc(tx,ty,5,0,7);g.stroke();g.beginPath();g.arc(me.x,me.y,PLACE_R,0,7);g.globalAlpha=.25;g.stroke();g.globalAlpha=1;g.fillStyle=ok?'rgba(106,255,154,.35)':'rgba(255,74,74,.35)';g.fillRect(Math.round(tx)-3,Math.round(ty)-3,6,6)}}}
function bigMap(me){if(!G.bm)return;const fl=G.bmf?OY:0,ox0=BX0-2,oy0=fl+BY0-2,tw=BX1-BX0+5,th=BY1-BY0+5+(fl?0:5);
 const ah=VH2-24,ms=Math.min((VW-12)/tw,ah/th),dw=tw*ms,dh=th*ms,mx=(VW-dw)/2,my=13+(ah-dh)/2;
 if(TBON)for(let i=TB.length-1;i>=0;i--)if(TB[i].y0<VH2)TB.splice(i,1);g.fillStyle='#030406';g.fillRect(0,0,VW,VH2);g.fillStyle=me.side==='A'?'#ef3a42':'#c4c8d0';g.fillRect(0,0,VW,2);
 g.save();g.beginPath();g.rect(mx,my,dw,dh);g.clip();g.drawImage(mapC,ox0*T,oy0*T,tw*T,th*T,mx,my,dw,dh);g.fillStyle='rgba(8,12,22,.25)';g.fillRect(mx,my,dw,dh);
 const P=(x,y)=>[mx+(x/T-ox0)*ms,my+(y/T-oy0)*ms],on=y=>fl?y>=OY*T:y<OY*T;
 for(const r of ROOMS){if(((r[5]|0)?OY:0)!==fl)continue;const[px,py]=P(((r[0]+r[2])/2+.5)*T,((r[1]+r[3])/2+.5+fl)*T),rw=(r[2]-r[0]+1)*ms-4,rh=(r[3]-r[1]+1)*ms-2;let nm=String(r[4]).toUpperCase();
  if(Tw(nm)>rw)nm=nm.replace(/^(B|1F|2F|3F|4F) /,'');let ls=Tw(nm)>rw?wrapW(nm,rw):[nm];const ml=rh>=19?2:1;if(ls.length>ml)ls=[ls[0],ls.slice(1).join(' ')].slice(0,ml);
  ls=ls.map(x=>fitStr(x,rw));ls.forEach((x,i)=>T8(x,px,py-4-(ls.length-1)*4+i*8,'rgba(255,255,255,.8)','center'))}
 for(const st of STAIRS)for(const q of st)if(on(q[1]*T)){const[px,py]=P(q[0]*T+8,q[1]*T+8);g.fillStyle='#6aff9a';g.fillRect(px-2,py-2,5,5)}
 if(G.mode==='bomb')for(const q of SITES)if(on(q[1])){const[px,py]=P(q[0],q[1]);g.fillStyle='#ffb62e';g.fillRect(px-3,py-3,7,7);T8(q[2],px,py-14,'#ffb62e','center')}
 if(me.side==='D')for(const c of G.cams)if(c.alive&&on(c.y)){const[px,py]=P(c.x,c.y);g.fillStyle='#ff4a4a';g.fillRect(px-2,py-2,4,4)}
 for(const e of G.ents)if(e.alive&&on(e.y)&&e!==me&&(e.side===me.side||visible(e))){const[px,py]=P(e.x,e.y);g.fillStyle='#000';g.fillRect(px-3,py-3,7,7);g.fillStyle=e.side==='A'?'#ff5a60':'#c4c8d0';g.fillRect(px-2,py-2,5,5)}
 for(const d of G.drones)if(d.alive&&on(d.y)&&dSee(d)){const[px,py]=P(d.x,d.y);g.fillStyle='#000';g.fillRect(px-3,py-3,7,7);g.fillStyle=d.own.side===me.side?'#7ed0ff':'#ff5a60';g.fillRect(px-2,py-2,5,5)}
 if(me.alive&&on(me.y)){const[px,py]=P(me.x,me.y);g.fillStyle='#000';g.fillRect(px-4,py-4,9,9);g.fillStyle='#fff';g.fillRect(px-3,py-3,7,7);g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(me.a)*10,py+Math.sin(me.a)*10);g.stroke()}
 g.restore();g.strokeStyle='#3a3a42';g.lineWidth=1;g.strokeRect(mx-.5,my-.5,dw+1,dh+1);
 T8((fl?'FLOOR 2':'FLOOR 1')+'   //   '+(MAPS[CURM]?MAPS[CURM].n.toUpperCase():''),6,3,'#fff');T8('TAB: SWITCH FLOOR     M / ESC: CLOSE',VW/2,VH2-12,'#8fa3bf','center')}
function hudExtra(me){
 if(me.alive&&me.stam!==undefined&&me.stam<.999){const w=60,x=6,ry=lrow(10),y=ry+3;g.fillStyle='#000a';g.fillRect(x-1,y-1,w+2,5);g.fillStyle=me.tired?'#ff6a4a':'#7ed0ff';g.fillRect(x,y,Math.round(w*me.stam),3);T8('SPRINT',x+w+5,ry,'#8fa3bf')}
 if(G.prog){const w=96,x=VW/2-w/2,y=VH2-44;g.fillStyle='#000c';g.fillRect(x-3,y-13,w+6,21);T8(G.prog.t,VW/2,y-11,G.prog.c||'#ffe14a','center',w+2);g.fillStyle='#1a1d24';g.fillRect(x,y,w,5);g.fillStyle=G.prog.c||'#ffe14a';g.fillRect(x,y,Math.round(w*cl(G.prog.v,0,1)),5)}
 if(me.side==='A'&&me.alive&&G.phase!=='end'){const L=[];for(const n of[1,2,3]){const d=G.drones.find(q=>q.own===me&&q.n===n);if(d)L.push(d);else if(n===2&&me.dr2)L.push({st:1,n:2})}
  if(L.length){let x=6;const y=lrow(13)+1;for(const d of L){const act=!d.st&&CD()===d&&DRN(),f=d.st?0:cl(d.hp/d.mhp,0,1);g.fillStyle=act?'#ef3a42':'#000a';g.fillRect(x-1,y-1,26,12);g.fillStyle=d.st||d.alive?'#15181d':'#2a1010';g.fillRect(x,y,24,10);T8(d.fly?'S':String(d.n),x+2,y+1,d.st?(G.phase==='act'?'#6aff9a':'#8fa3bf'):d.alive?'#e8e8e8':'#6a3a3a');
   if(d.st){if(G.phase==='act'){g.strokeStyle='#6aff9a';g.lineWidth=1;g.strokeRect(x+10.5,y+3.5,11,3)}else T8('---',x+8,y+1,'#6a7380',undefined,15)}else if(d.alive){g.fillStyle=f>.5?'#6aff9a':f>.25?'#ffd27a':'#ff4a4a';g.fillRect(x+10,y+3,Math.round(12*f),4)}else T8('x',x+14,y+1,'#6a3a3a');x+=28}T8('C: DRONE',x+2,y+1,'#8fa3bf')}}
 let hint='';
 if(G.arm)hint=(G.arm.kind==='throw'?'CLICK: THROW':'CLICK: PLACE')+'   RIGHT CLICK: CANCEL';
 else if(DRN())hint=CD().ctrl!==G.me?CD().own.nm+' DRONE '+CD().n+':  VIEW ONLY   RIGHT CLICK PING   C NEXT':'DRONE '+CD().n+(CD().fly?' ('+CD().nm+')':'')+':  WASD DRIVE   CLICK TAG'+(CD().fly?' / USE POWER':'')+'   RIGHT CLICK PING   C NEXT';
 else if(me.alive&&G.phase!=='end'&&!DRN()&&G.cv<0){const r=rayHit(me,26);
  if(r.t===9)hint='HOLD F: CROWBAR';else if(me.rps==='hang'){const w=rapWinAt(me.rs,me.rq),hz=me.rs==='n'||me.rs==='s';hint=(hz?'A/D':'W/S')+': SLIDE ALONG WALL   '+(w?(winState(w.a)===4?'WINDOW REINFORCED':'HOLD X: KICK IN'):'HOLD X: DESCEND')+(w?'   AWAY+X: DESCEND':'')}
  else{const n=G.phase==='act'?rapNear(me):null;if(n)hint=n.k==='g'?'HOLD X: RAPPEL UP':'HOLD X: RAPPEL OUT';else if(G.phase==='prep'&&me.side==='D'&&!G.prog)hint='HOLD CLICK: REINFORCE WALL    HOLD B: BARRICADE DOOR'}}
 if(hint){const hy=G.prog?VH2-76:VH2-62,hh=fitStr(hint,VW-24),tw=Math.ceil(Tw(hh))+10;g.fillStyle='rgba(8,10,14,.85)';g.fillRect(Math.round(VW/2-tw/2),hy,tw,12);T8(hh,VW/2,hy+2,'#ffd27a','center')}
 bigMap(me)}
function r6xInit(){
 cv.addEventListener('mousedown',e=>{if(!G)return;if(e.button===2){mpos(e);if(G.arm)G.arm=null;else if(G.me.alive&&(G.cv>=0||DRN()))pingView();else if(G.me.alive&&G.me.g2==='nitro'&&G.phase==='act')nitroBoom(G.me);return}
  if(e.button===0&&G.arm){useArmed();mouse.down=false}})}

// ---------- sprites ----------
const SP={};
function mixc(a,b,k){const q=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),A=q(a),B=q(b);return'#'+A.map((v,i)=>('0'+Math.round(v+(B[i]-v)*k).toString(16)).slice(-2)).join('')}
function spritesOld(op){if(SP[op.id])return SP[op.id];const c=op.c,ap=op.ap||{},SKc=SKN[ap.sk]||'#e0b890',hd=ap.hd||'helm',hr=ap.hr||'#3a2a1a',gl=ap.gl,mk=ap.mk,bd=ap.bd,PANT=ap.pt||'#262a33',BOOT='#0f1013',H=c[1],sh=mixc(c[0],'#000000',.3),hi=mixc(H,'#ffffff',.25),hd2=mixc(H,'#000000',.35),vc=(ap.c&&c[0]===ap.c[0]&&ap.vc)?ap.vc:sh,EYE='#15161a',pk=mixc(c[0],'#000000',.45),S={w:{}};
 const mk1=(dir,f)=>{const k=mkc(14,18),x=k.getContext('2d');const P=(a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(a+1,b+1,w,h)};
  const A=f===1?1:0,B=f===2?1:0,leg=(lx,off)=>{P(lx,12-off,3,3,PANT);P(lx,15-off,3,1,BOOT)};
  if(dir==='side'){leg(3,A);leg(6,B)}else{leg(2,A);leg(7,B)}
  const eyes=()=>{P(4,3,1,1,EYE);P(7,3,1,1,EYE)};
  if(dir==='down'){
   if(ap.ex==='pack'){P(1,5,2,2,pk);P(9,5,2,2,pk)}
   P(2,6,8,6,c[0]);P(3,7,6,4,vc);P(4,7,4,1,mixc(vc,'#ffffff',.2));P(2,6,8,1,c[2]);P(2,11,8,1,'#111111');P(0,7,2,5,c[0]);P(10,7,2,5,c[0]);P(0,12,2,1,SKc);P(10,12,2,1,SKc);if(mk&&(hd==='hood'||hd==='helm'))P(3,6,6,1,mk);
   switch(hd){
    case'bare':P(3,0,6,3,hr);P(3,3,1,2,hr);P(8,3,1,2,hr);P(4,2,4,4,SKc);P(4,1,4,1,hr);eyes();break;
    case'cap':P(3,0,6,2,H);P(3,2,6,1,hd2);P(3,3,1,2,hr);P(8,3,1,2,hr);P(4,3,4,3,SKc);eyes();break;
    case'bal':P(3,0,6,6,H);P(4,3,4,1,SKc);P(4,3,1,1,EYE);P(7,3,1,1,EYE);P(3,0,6,1,hi);break;
    case'gas':P(3,0,6,6,H);P(3,0,6,1,hi);P(4,2,4,4,'#3f444b');P(4,3,1,1,gl||'#9aff4a');P(7,3,1,1,gl||'#9aff4a');P(5,5,2,1,EYE);break;
    case'hood':P(2,0,8,6,H);P(2,0,8,1,hi);P(4,2,4,4,SKc);eyes();break;
    case'visor':P(3,0,6,6,H);P(3,0,6,1,hi);P(4,2,4,3,gl||'#3fe0ff');P(4,2,4,1,mixc(gl||'#3fe0ff','#ffffff',.5));break;
    default:P(3,0,6,6,H);P(3,0,6,1,hi);P(4,2,4,3,SKc);eyes()}
   if(hd!=='gas'&&hd!=='visor'){if(gl&&hd!=='bal')P(4,3,4,1,gl);if(ap.ex==='band')P(3,1,6,1,c[2]);if(ap.ex==='tat'){P(4,2,1,2,'#1a1a1a');P(7,4,1,2,'#1a1a1a')}
    if(mk&&hd!=='bare'&&hd!=='cap'){P(4,4,4,2,mk);if(hd==='bal')P(5,5,2,1,'#15161a')}
    else if(bd){P(4,5,4,1,bd);P(4,4,1,1,bd);P(7,4,1,1,bd)}}
   else if(bd){P(4,5,4,1,bd)}
  }else if(dir==='up'){
   if(ap.ex==='pack')P(2,6,8,6,pk);
   P(2,6,8,6,c[0]);P(3,7,6,4,ap.ex==='pack'?pk:sh);if(ap.ex==='pack'){P(3,7,6,1,c[2]);P(5,8,2,3,mixc(pk,'#ffffff',.15))}P(2,6,8,1,c[2]);P(2,11,8,1,'#111111');P(0,7,2,5,c[0]);P(10,7,2,5,c[0]);P(0,12,2,1,SKc);P(10,12,2,1,SKc);
   if(hd==='bare')P(3,0,6,6,hr);else if(hd==='cap'){P(3,0,6,6,hr);P(3,0,6,3,H)}else if(hd==='hood'){P(2,0,8,6,H)}else P(3,0,6,6,H);
   P(3,0,6,1,hd==='bare'?mixc(hr,'#ffffff',.2):hi);P(3,4,6,2,mixc(hd==='bare'?hr:H,'#000000',.3));
   if(ap.ex==='pony')P(5,5,2,4,hr);if(ap.ex==='band')P(3,2,6,1,c[2]);if(gl&&hd!=='visor'&&hd!=='gas')P(3,3,6,1,gl);
  }else{
   if(ap.ex==='pack')P(1,6,3,5,pk);
   P(3,6,7,6,c[0]);P(3,6,7,1,c[2]);P(3,11,7,1,'#111111');P(4,7,3,4,vc);P(7,8,4,2,c[0]);P(10,8,1,2,SKc);
   switch(hd){
    case'bare':P(4,0,6,6,hr);P(8,2,2,4,SKc);P(9,3,1,1,EYE);break;
    case'cap':P(4,0,6,2,H);P(9,2,2,1,hd2);P(4,2,3,3,hr);P(8,3,2,3,SKc);P(9,3,1,1,EYE);break;
    case'bal':P(4,0,6,6,H);P(4,0,6,1,hi);P(9,3,1,1,SKc);P(9,3,1,1,EYE);break;
    case'gas':P(4,0,6,6,H);P(4,0,6,1,hi);P(8,2,3,4,'#3f444b');P(9,3,1,1,gl||'#9aff4a');P(10,4,1,2,EYE);break;
    case'hood':P(3,0,7,6,H);P(3,0,7,1,hi);P(8,2,2,4,SKc);P(9,3,1,1,EYE);break;
    case'visor':P(4,0,6,6,H);P(4,0,6,1,hi);P(8,2,2,3,gl||'#3fe0ff');break;
    default:P(4,0,6,6,H);P(4,0,6,1,hi);P(8,2,2,3,SKc);P(9,3,1,1,EYE)}
   if(hd!=='gas'&&hd!=='visor'){if(gl&&hd!=='bal')P(8,3,3,1,gl);if(ap.ex==='band')P(4,1,6,1,c[2]);
    if(mk&&hd!=='bare'&&hd!=='cap')P(8,4,2,2,mk);else if(bd)P(8,4,2,2,bd)}
   if(ap.ex==='pony')P(3,2,1,5,hr);
  }
  const o=mkc(14,18),ox=o.getContext('2d');for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])ox.drawImage(k,dx,dy);ox.globalCompositeOperation='source-in';ox.fillStyle='#050608';ox.fillRect(0,0,14,18);ox.globalCompositeOperation='source-over';ox.drawImage(k,0,0);
  const t=mkc(14,18),tx=t.getContext('2d');tx.drawImage(o,0,0);tx.globalCompositeOperation='source-atop';tx.fillStyle='#ffffff';tx.fillRect(0,0,14,18);(S.w[dir]=S.w[dir]||[])[f]=t;return o};
 for(const d of['down','up','side'])S[d]=[mk1(d,0),mk1(d,1),mk1(d,2)];return SP[op.id]=S}
const ATL={img:null,ready:false};
function atlasSprites(bid){const ix=ATLAS_IDS.indexOf(bid);if(ix<0||!ATL.ready)return null;const k='@'+bid;if(SP[k])return SP[k];
 const S={w:{}},rows={down:0,side:3,up:6};
 for(const d in rows){S[d]=[];S.w[d]=[];for(let f=0;f<3;f++){const c=mkc(14,18),x=c.getContext('2d');x.drawImage(ATL.img,ix*14,(rows[d]+f)*18,14,18,0,0,14,18);S[d][f]=c;
  const t=mkc(14,18),tx=t.getContext('2d');tx.drawImage(c,0,0);tx.globalCompositeOperation='source-atop';tx.fillStyle='#ffffff';tx.fillRect(0,0,14,18);S.w[d][f]=t}}
 return SP[k]=S}
function spritesFor(op,pl){const a=atlasSprites(op.bid||String(op.id).split('_')[0]);return a?(window.CXR?CXR.recolor(a,op,pl):a):spritesOld(op)}
if(typeof ATLAS_URL!=='undefined'){const im=new Image();im.onload=()=>{ATL.img=im;ATL.ready=true;for(const k in SP)delete SP[k];for(const k in SYMC)delete SYMC[k];try{refreshOps()}catch(e){}try{if($('scrMain').style.display!=='none')renderMain()}catch(e){}};im.src=ATLAS_URL}
const HOSTOP={id:'host',c:['#e07b1a','#3a2a1a','#ffffff']};
const GL={lmg:10,ar2:8,bar:10,snp:13,asg:9,mp:5,rev:5,ar:9,smg:7,sg:9,dmr:11,pst:5};for(const k in WP)if(WP[k].a&&!GL[k])GL[k]=GL[WP[k].a];
function drawGun(e,x,y){const L=GL[e.wp[e.sel]]||6,ca=Math.cos(e.a),sa=Math.sin(e.a),bx=x+ca*3,by=y-2+sa*3;for(let i=0;i<L;i++){g.fillStyle=(!e.bot&&window.CXR&&CXR.gunCol(i,L))||(i>L-3?'#2d2e33':'#15161a');g.fillRect(Math.round(bx+ca*i)-1,Math.round(by+sa*i)-1,2,2)}g.fillStyle='#5a606a';g.fillRect(Math.round(bx+ca*2)-1,Math.round(by+sa*2)-1,1,1);
 if(e.fl>0){const tx=Math.round(bx+ca*(L+1)),ty=Math.round(by+sa*(L+1));const fc=(!e.bot&&window.CXR&&CXR.flash())||['#fff3b0','#ffb030'];g.fillStyle=fc[1];g.fillRect(tx-2,ty-2,4,4);g.fillStyle=fc[0];g.fillRect(tx-1,ty-1,2,2)}}
/* sideways lean: the sprite is drawn one pixel row at a time; legs stay planted and the torso + head curve out to dx (smooth S-curve through the waist) */
function leanBlit(img,dx,dy,fl){const oy=Math.round(dy*.8);for(const[r0,r1,k]of[[0,12,.85],[12,18,.3]]){const ox=Math.round(dx*k)*(fl?-1:1);g.drawImage(img,0,r0,14,r1-r0,-7+ox,-12+r0+oy,14,r1-r0)}}
function drawEnt(e){const dir=Math.sin(e.a)>.65?'down':Math.sin(e.a)<-.65?'up':'side',fl=dir==='side'&&Math.cos(e.a)<0,S=spritesFor(e.op,!e.bot),f=e.mv>.1?1+(Math.floor(e.ph||0)%2):0,x=Math.round(e.x),y=Math.round(e.y);
 /* lean: feet, shadow and ring stay planted; legs stay planted and the torso bends out (sideways: row-by-row S-curve; up/down: shift + slight stretch) so the head ends up exactly where the eye / hitbox is (ex,ey) */
 const lean=e.ex!==undefined&&Math.abs(e.ln||0)>.05,dx=lean?e.ex-e.x:0,dy=lean?e.ey-e.y:0,
  bx=x,by=y,cx=Math.round(x+dx*.85),cy=Math.round(y+dy*.85),hx=Math.round(x+dx),hy=Math.round(y+dy);
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y+5,6,3,0,0,7);g.fill();
 if(lean){g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(Math.round(x+dx*.6),Math.round(y+dy*.6)+5,6,3,0,0,7);g.fill()}
 if(e.bot||!window.CXR||!CXR.ring(g,x,y,e.side)){g.strokeStyle=e.side==='A'?'rgba(255,155,58,.85)':'rgba(74,168,255,.85)';g.lineWidth=1;g.beginPath();g.ellipse(x,y+5,7.5,3.8,0,0,7);g.stroke()}
 if(dir==='up')drawHand(e,cx,cy);
 g.save();g.translate(bx,by);if(fl)g.scale(-1,1);
 if(lean){leanBlit(S[dir][f],dx,dy,fl);if(e.hurtT>0){g.globalAlpha=.65;leanBlit(S.w[dir][f],dx,dy,fl);g.globalAlpha=1}}
 else{g.drawImage(S[dir][f],-7,-12);if(e.hurtT>0){g.globalAlpha=.65;g.drawImage(S.w[dir][f],-7,-12);g.globalAlpha=1}}g.restore();if(!e.bot&&window.CXR&&e.alive){CXR.hat(g,e,hx,hy,dir,fl);CXR.plate(g,e,lean?hx:bx,lean?hy:by)}
 if(dir!=='up')drawHand(e,cx,cy);
 if(e.op.id==='montagne'){g.save();g.translate(cx+Math.cos(e.a)*11,cy-2+Math.sin(e.a)*11);g.rotate(e.a);g.fillStyle='#050608';g.fillRect(-2,-10,5,20);g.fillStyle='#8fa3bf';g.fillRect(-1,-9,3,18);g.fillStyle='#cfe4ff';g.fillRect(-1,-9,1,18);g.fillStyle='#2a3445';g.fillRect(0,-4,1,8);g.restore()}}
function drawDead(e){const S=spritesFor(e.op);g.save();g.translate(Math.round(e.x),Math.round(e.y)+3);g.rotate(PI/2);g.globalAlpha=.75;g.drawImage(S.down[0],-7,-9);g.restore();g.globalAlpha=1}
// ---------- state ----------
let G=null,keys={},mouse={x:0,y:0,down:false},cam={x:0,y:0},dk=mkc(VW,VH),dkg=dk.getContext('2d'),fcache={},uiSel={mapPick:0,mode:'bomb',side:'A',op:0};
const field=(goal,reinf)=>{const key=goal+'_'+reinf+'_'+mver;if(fcache[key])return fcache[key];const f=new Float32Array(W*H).fill(1e4);const q=[goal];f[goal]=0;let h=0;
 while(h<q.length){const i=q[h++],x=i%W,y=i/W|0;for(const[dx,dy]of D4){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const t=map[ny][nx];let c=1;if(t===2||t===6||t===7||t===10)continue;if(reinf===2&&(t===3||t===4||t===9))continue;if(t===3)c=5;if(t===9)c=3;if(t===4){if(!reinf)continue;c=14}const ni=ny*W+nx;if(f[i]+c<f[ni]){f[ni]=f[i]+c;q.push(ni)}}
  const p=STP[i];if(p!==undefined&&f[i]+2<f[p]){f[p]=f[i]+2;q.push(p)}}
 if(Object.keys(fcache).length>30)fcache={};return fcache[key]=f};
function los(x1,y1,x2,y2){const d=dst(x1,y1,x2,y2),n=Math.ceil(d/4);for(let i=1;i<n;i++){const t=tileAt(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n);if(solid(t))return false}return true}
function inSmoke(x,y){return G.smokes.some(s=>dst(s.x,s.y,x,y)<s.r)}
function roomName(x,y){const tx=x/T|0,ty=y/T|0;for(const r of ROOMS)if(tx>=r[0]&&tx<=r[2]&&ty>=r[1]&&ty<=r[3])return r[4];return tx>=BX0&&tx<=BX1&&ty>=BY0&&ty<=BY1?'CORRIDOR':'OUTSIDE'}
const outB=e=>{const o=e.y>=OY*T?OY:0,tx=e.x/T|0,ty=(e.y/T|0)-o;if(tx>=BX0&&tx<=BX1&&ty>=BY0&&ty<=BY1)return false;return !ROOMS.some(r=>inRoom(e,r))};
const inRoom=(e,r)=>{const o=r[5]?OY:0,tx=e.x/T|0,ty=(e.y/T|0)-o;return tx>=r[0]&&tx<=r[2]&&ty>=r[1]&&ty<=r[3]};
// ---------- fx ----------
function boom(x,y,n,c){if(n>=12&&G)G.shake=Math.max(G.shake||0,n/3);for(let i=0;i<n;i++){const a=Math.random()*7,s=.5+Math.random()*2;G&&G.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:20+Math.random()*20,c})}}
// ---------- entities ----------
function mkEnt(side,op,bot,x,y,nm){const e={side,op,bot,x,y,a:side==='A'?-PI/2:PI/2,hp:op.hp,mhp:op.hp,wp:[bot&&op.pw&&op.id!=='montagne'?op.pw[Math.random()*op.pw.length|0]:op.w,bot&&op.sw?op.sw[Math.random()*op.sw.length|0]:(op.sec||(op.sw&&op.sw[0])||'pst')],sel:0,ammo:{},cd:0,rl:0,gn:op.gn,alive:1,blind:0,stun:0,slow:0,tag:0,g2:null,g2n:0,g2cd:0,gcd:0,pulse:0,pcd:0,bt:0,nm:nm||op.n,mv:0,wander:null,wt:0,pl:0,site:Math.random()<.5?0:1};for(const w of e.wp)e.ammo[w]=WP[w].mag;return e}
function moveEnt(e,dx,dy,r){r=r||5;const ok=(x,y)=>!(blk(tileAt(x-r,y-r))||blk(tileAt(x+r,y-r))||blk(tileAt(x-r,y+r))||blk(tileAt(x+r,y+r)));if(ok(e.x+dx,e.y))e.x+=dx;if(ok(e.x,e.y+dy))e.y+=dy}
function hurt(e,d,ang,src){if(!e.alive)return;if(e.op.id==='montagne'&&ang!==undefined&&Math.abs(adiff(ang+PI,e.a))<1)d*=.1;const _fo=src&&src.side&&src!==e&&src.side!==e.side;if(_fo)src.dd=(src.dd||0)+Math.max(0,Math.min(d,e.hp));e.hp-=d;e.hurtT=8;G.decals.push({x:e.x+(Math.random()-.5)*8,y:e.y+4+(Math.random()-.5)*6,c:'#6a0d12',s:2});if(e.hp<=0){if(_fo)src.kl=(src.kl||0)+1;if(_fo&&!src.bot&&window.CXR)CXR.kill(G,e.x,e.y);e.alive=0;for(let i=0;i<10;i++)G.decals.push({x:e.x+(Math.random()-.5)*14,y:e.y+3+(Math.random()-.5)*10,c:Math.random()<.6?'#6a0d12':'#8e1219',s:2+(Math.random()*2|0)});if(G.hostage.carrier===e)G.hostage.carrier=null;G.feed.push({t:360,s:(src?src.nm:'TRAP')+' > '+e.nm,c:src&&src.side==='A'?'#ff5a60':'#c4c8d0'});boom(e.x,e.y,14,'#a01818');sfx(90,.4,'sawtooth',.06)}}
function fire(e){const w=WP[e.wp[e.sel]];if(e.cd>0||e.rl>0||e.stun>0)return;if(e.op.id==='montagne'&&e.sel===0&&false)return;
 if(e.ammo[e.wp[e.sel]]<=0){reload(e);return}e.ammo[e.wp[e.sel]]--;e.cd=w.cd;e.fl=3;const mv=e.mv>.1?1.5:1;
 for(let i=0;i<w.pel;i++){const a=e.a+(Math.random()-.5)*2*w.spr*mv*(e.bot?1.6:1)*(e.blind>0?4:1);trace(e,a,w.dmg*(e.bot?(e.side==='D'?.9:.55):1),w.rng)}
 boom(EX(e)+Math.cos(e.a)*10,EY(e)+Math.sin(e.a)*10,2,'#ffd27a');if(e===G.me||dst(e.x,e.y,G.me.x,G.me.y)<200)sfx(WP[e.wp[e.sel]].a==='sg'?150:260,.08,'square',.03)}
function reload(e){const k=e.wp[e.sel];if(e.rl>0||e.ammo[k]>=WP[k].mag)return;e.rl=WP[k].rl;e.ammo[k]=WP[k].mag}
function trace(e,a,dmg,rng){let x=EX(e)+Math.cos(a)*8,y=EY(e)+Math.sin(a)*8,lt=-1,hitx=x,hity=y;const cx=Math.cos(a)*3,cy=Math.sin(a)*3;
 for(let d=0;d<rng;d+=3){x+=cx;y+=cy;const tx=x/T|0,ty=y/T|0,t=tileAt(x,y);if(t===2||t===4){break}
  if(t===3||t===9){const k=ty*W+tx;if(k!==lt){wallDmg(tx,ty,dmg*1.1);dmg*=t===9?.8:.55;lt=k;if(dmg<4)break}}
  let hit=false;for(const o of G.ents){if(o.alive&&o.side!==e.side&&G.phase!=='prep'&&(dst(o.x,o.y,x,y)<6||(o.ex!==undefined&&Math.abs(o.ln||0)>.3&&dst(o.ex,o.ey,x,y)<5))){hurt(o,dmg,a,e);hit=true;break}}
  const H_=G.hostage;if(!hit&&G.mode==='hostage'&&H_.hp>0&&!H_.carrier&&dst(H_.x,H_.y,x,y)<6){H_.hp-=dmg*.25;H_.by=e.side;hit=true}
  if(!hit&&e.side==='A')for(const c of G.cams)if(c.alive&&dst(c.x,c.y,x,y)<5){c.hp-=dmg;if(c.hp<=0){c.alive=0;boom(c.x,c.y,10,'#8fa3bf');sfx(200,.2,'square',.05)}hit=true;break}
  if(!hit&&e.side==='D'&&G.drones)for(const d of G.drones)if(d.alive&&dst(d.x,d.y,x,y)<6){hurtDrone(d,dmg,e);hit=true;break}
  if(!hit&&window.R6A&&R6A.bhit(x,y,dmg,e))hit=true;
  if(hit){hitx=x;hity=y;break}hitx=x;hity=y}
 G.tr.push({x1:EX(e)+Math.cos(a)*8,y1:EY(e)+Math.sin(a)*8,x2:hitx,y2:hity,t:3,pl:!e.bot})}
function rayHit(e,max){let x=e.x,y=e.y;for(let d=0;d<max;d+=2){x+=Math.cos(e.a)*2;y+=Math.sin(e.a)*2;const t=tileAt(x,y);if(solid(t))return{x,y,tx:x/T|0,ty:y/T|0,t}}return{x,y,t:0}}
function aimPt(e,max){let x=e.x,y=e.y;for(let d=0;d<max;d+=2){const nx=x+Math.cos(e.a)*2,ny=y+Math.sin(e.a)*2;if(solid(tileAt(nx,ny)))break;x=nx;y=ny}return{x,y}}
function gadgetOld(e){if(e.gcd>0||!e.alive)return;const o=e.op.gd;if(!o)return;if(o!=='pulse'&&o!=='hammer'&&e.gn<=0)return;e.gcd=40;let used=1;
 if(o==='hammer'){const r=rayHit(e,26);if(r.t===3||r.t===9){setTile(r.tx,r.ty,r.t===9?5:1);boom(r.x,r.y,14,'#c8b896');sfx(110,.3,'sawtooth',.07)}used=0}
 else if(o==='emp'){const p=aimPt(e,130);G.traps=G.traps.filter(t=>dst(t.x,t.y,p.x,p.y)>55);G.ring.push({x:p.x,y:p.y,r:2,c:'#7ed0ff'});sfx(500,.3,'sine',.06)}
 else if(o==='ash'){const r=rayHit(e,270);if(r.t===3||r.t===9){setTile(r.tx,r.ty,r.t===9?5:1);boom(r.x,r.y,24,'#ffb050');G.ring.push({x:r.x,y:r.y,r:2,c:'#ffb050'});sfx(80,.4,'sawtooth',.08)}else used=0}
 else if(o==='therm'){const r=rayHit(e,28);if(r.t===4){G.charges.push({tx:r.tx,ty:r.ty,t:180,vert:solid(tileAt(r.tx*T-8,r.ty*T+8))&&solid(tileAt(r.tx*T+24,r.ty*T+8))?0:1})}else used=0}
 else if(o==='flash'){for(const d of G.ents)if(d.alive&&d.side==='D'&&dst(e.x,e.y,d.x,d.y)<130&&Math.abs(adiff(Math.atan2(d.y-e.y,d.x-e.x),e.a))<.6&&los(e.x,e.y,d.x,d.y))d.blind=180;G.ring.push({x:e.x+Math.cos(e.a)*20,y:e.y+Math.sin(e.a)*20,r:2,c:'#fff'});sfx(1200,.15,'sine',.05)}
 else if(o==='smoke'){const p=aimPt(e,140);G.smokes.push({x:p.x,y:p.y,t:700,r:34});sfx(200,.4,'sine',.04)}
 else if(o==='kap'){const p=aimPt(e,50);G.traps.push({x:p.x,y:p.y,k:'kap'})}
 else if(o==='mat'){G.traps.push({x:e.x,y:e.y,k:'mat'})}
 else if(o==='castle'){const r=rayHit(e,28);if(r.t===3)setTile(r.tx,r.ty,4);else used=0}
 else if(o==='pulse'){if(e.pcd>0)return;e.pulse=420;e.pcd=900;used=0}
 else if(o==='doc'){e.hp=Math.min(e.mhp,e.hp+60);const a=G.ents.find(x=>x!==e&&x.alive&&x.side===e.side&&dst(x.x,x.y,e.x,e.y)<60);if(a)a.hp=Math.min(a.mhp,a.hp+60);G.ring.push({x:e.x,y:e.y,r:2,c:'#6aff9a'})}
 if(used)e.gn--}
const G2={A:['frag','flash'],D:['wire','nitro']},G2N={frag:'FRAG GRENADE',flash:'FLASHBANG',wire:'BARBED WIRE',nitro:'NITRO CELL'},G2S={frag:'FRAG',flash:'FLASH',wire:'WIRE',nitro:'NITRO'},G2T={frag:'Thrown. Explodes after a short fuse. Hurts defenders and breaks soft walls.',flash:'Thrown. Blinds defenders who can see the blast.',wire:'Placed. Slows and cuts attackers who cross it.',nitro:'Placed. When all are placed, press G again to detonate. Bots self-detonate.'};
function explode(x,y,r,dmg,src){if(src&&src.side==='D'&&G.drones)for(const d of G.drones)if(d.alive&&dst(d.x,d.y,x,y)<r)hurtDrone(d,dmg*.6,src);G.ring.push({x,y,r:2,c:'#ffb050'});boom(x,y,26,'#ffb050');sfx(70,.45,'sawtooth',.09);
 for(const o of G.ents)if(o.alive&&o.side!==src.side){const d=dst(o.x,o.y,x,y);if(d<r&&los(x,y,o.x,o.y))hurt(o,dmg*(1-d/r*.6),undefined,src)}
 const tr=Math.ceil(r/T);for(let ty=(y/T|0)-tr;ty<=(y/T|0)+tr;ty++)for(let tx=(x/T|0)-tr;tx<=(x/T|0)+tr;tx++)if(tx>0&&ty>0&&tx<W-1&&ty<H-1&&(map[ty][tx]===3||map[ty][tx]===9)){const d=dst(tx*T+8,ty*T+8,x,y);if(d<r)wallDmg(tx,ty,d<r*.6?999:60)}}
function gadget2Old(e){if(!e.alive||e.g2cd>0||!e.g2)return;e.g2cd=30;const k=e.g2;
 if(k==='frag'||k==='flash'){if(e.g2n<=0)return;const p=aimPt(e,120);G.nades.push({x:p.x,y:p.y,t:k==='frag'?70:55,k,own:e});e.g2n--}
 else if(k==='wire'){if(e.g2n<=0)return;const p=aimPt(e,50);G.traps.push({x:p.x,y:p.y,k:'wire',own:e});e.g2n--}
 else if(k==='nitro'){if(e.g2n>0){const p=aimPt(e,50);G.traps.push({x:p.x,y:p.y,k:'nitro',own:e});e.g2n--}else{for(let i=G.traps.length-1;i>=0;i--){const t=G.traps[i];if(t.k==='nitro'&&t.own===e){G.traps.splice(i,1);explode(t.x,t.y,46,85,e)}}}}}
function trapSpecial(t,i){if(t.k==='wire'){for(const e of G.ents)if(e.alive&&e.side==='A'&&dst(e.x,e.y,t.x,t.y)<10){e.slow=90;if(G.t%20===0)hurt(e,4,undefined,null)}}
 else if(t.own&&t.own.bot&&t.own.alive&&G.ents.some(e=>e.alive&&e.side==='A'&&dst(e.x,e.y,t.x,t.y)<38)){G.traps.splice(i,1);explode(t.x,t.y,46,85,t.own)}}
// ---------- round setup ----------
let score=[0,0],rnd=1;
function pick(list,n,ex){const a=list.filter(o=>!ex||o.id!==ex.bid).sort(()=>Math.random()-.5);return a.slice(0,n)}
function doorPair(tx,ty){for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(map[ty+dy]&&map[ty+dy][tx+dx]===5)return[tx+dx,ty+dy];return null}
const clearOf=t=>!G.ents.some(e=>e.alive&&Math.abs(e.x-(t[0]*T+8))<13&&Math.abs(e.y-(t[1]*T+8))<13);
function putBarr(tx,ty,own){if(!map[ty]||map[ty][tx]!==5)return false;if(own&&G.barr>=BARR){G.msg='NO BARRICADES LEFT';return false}const p=doorPair(tx,ty);if(!clearOf([tx,ty])||(p&&!clearOf(p))){if(own)G.msg='SOMEONE IS IN THE DOORWAY';return false}setTile(tx,ty,9);if(p)setTile(p[0],p[1],9);if(own)G.barr++;sfx(220,.12,'square',.05);boom(tx*T+8,ty*T+8,6,'#b27a42');return true}
function buildBarrOld(){const me=G&&G.me;if(!me||!me.alive||me.side!=='D'||G.phase==='end'||G.bcd>0)return;let f=null;for(let d=6;d<=36&&!f;d+=3){const x=me.x+Math.cos(me.a)*d,y=me.y+Math.sin(me.a)*d,tx=x/T|0,ty=y/T|0;if(map[ty]&&map[ty][tx]===5)f=[tx,ty]}if(!f){G.msg='FACE A DOORWAY TO BARRICADE IT';return}if(putBarr(f[0],f[1],1))G.bcd=G.phase==='prep'?10:120}
function bqOne(){const d=G.bq&&G.bq.pop();if(d)putBarr(d[0],d[1],0)}
function rqOne(){const w=G.rq.pop();if(w&&map[w[1]][w[0]]===3){setTile(w[0],w[1],4);G.reinf++;sfx(300,.1,'square',.05)}}
function newRound(){setMap(uiSel.mapIdx||0,(uiSel.side==='D'&&uiSel.dsite>=0)?uiSel.dsite:null);buildMap();resolveSpawns();fcache={};const mode=uiSel.mode,side=uiSel.side,me=getOp(side,uiSel.op);
 G={mode,side,phase:'prep',t:2700,rq:[],cams:CAMTILES.map(c=>({x:c[0]*T+8,y:(c[1]+1)*T+3,wy:c[1]*T,a:PI/2,hp:40,alive:1})),cv:-1,pings:[],ents:[],decals:[],nades:[],shake:0,traps:[],smokes:[],charges:[],fx:[],tr:[],ring:[],feed:[],reinf:0,drones:[],dc:-1,bomb:{prog:0,act:0,x:SITES[0][0],y:SITES[0][1]},hostage:{x:HOST[0],y:HOST[1],hp:100,carrier:null},sec:0,msg:'',endT:0,res:null};
 const at=side==='A'?[me,...pick(OPS.A,4,me)]:pick(OPS.A,5),df=side==='D'?[me,...pick(OPS.D,4,me)]:pick(OPS.D,5);
 at.forEach((o,i)=>{const q=spawnFor(i);G.ents.push(mkEnt('A',o,!(side==='A'&&i===0),q[0],q[1],side==='A'&&i===0?'YOU':undefined))});
 const OBJ=mode==='hostage'?HOST:SITES[mode==='bomb'&&Math.random()<.5?1:0],oyf=OBJ[1]>=OY*T?OY:0;G.asite=Math.random()<.5?0:1;at.forEach((e,i)=>{});for(const e of G.ents){if(e.side==='A'){e.site=G.asite;e.dl=Math.random()*400+120}}
 const sp=spots(mode);
 df.forEach((o,i)=>{const e=mkEnt('D',o,!(side==='D'&&i===0),sp[i][0]*T+8,sp[i][1]*T+8,side==='D'&&i===0?'YOU':undefined);e.post={x:e.x,y:e.y};e.role=i%2?'roam':'anchor';G.ents.push(e)});
 G.me=G.ents.find(e=>!e.bot);mkDrones();G.dc=side==='A'?0:-1;for(const e of G.ents){const L=G2[e.side];e.g2=e.bot?L[Math.random()*2|0]:(uiSel.g2[e.op.bid]||L[0]);e.g2n=2}
 // bot defenders reinforce + place gadgets
 const softs=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map[y][x]===3&&(x===BX0||x===BX1||y===BY0||y===BY1||dst(x*T+8,y*T+8,OBJ[0],OBJ[1])<230))softs.push([x,y]);
 softs.sort((p,q)=>dst(p[0]*T+8,p[1]*T+8,OBJ[0],OBJ[1])-dst(q[0]*T+8,q[1]*T+8,OBJ[0],OBJ[1]));G.rq=[];
 const doors=(oyf?DOORSU:DOORS).map(d=>[d[0],d[1]+oyf,d[2]]).sort((p,q)=>dst(p[0]*T,p[1]*T,OBJ[0],OBJ[1])-dst(q[0]*T,q[1]*T,OBJ[0],OBJ[1])).slice(0,16);G.barr=0;G.bcd=0;G.bq=[];
 planSetup(softs.slice(0,side==='A'?REINF:REINF-4),doors.slice(0,side==='A'?6:3),doors);
 G.msg=side==='A'?'PREP: DRIVE DRONE 1 (WASD), CLICK TAGS, C = NEXT / TEAMMATE CAMS':'PREP: REINFORCE WALLS ('+REINF+') AND BARRICADE DOORS';
 document.getElementById('over').style.display='none'}
// ---------- bots ----------
function botAI(e){if(e.say&&e.say.t>0)e.say.t--;if(e.rx&&--e.rx.t<=0)e.rx=null;const foes=G.ents.filter(o=>o.alive&&o.side!==e.side);let tgt=null,bd=1e9;
 for(const o of foes){const d=dst(e.x,e.y,EX(o),EY(o));const known=e.side==='A'&&o.tag>0&&d<150;if(d<(WP[e.op.w].a==='sg'?170:240)&&d<bd&&los(e.x,e.y,EX(o),EY(o))&&(!inSmoke(o.x,o.y)||d<36)){tgt=o;bd=d}else if(known&&d<bd&&d<130){tgt=null}}
 const sp=PACE*e.op.sp*(e.slow>0?.4:1)*(e.hostageCarry?.8:1);
 if(tgt&&e.side==='D')G.alert={x:tgt.x,y:tgt.y,t:480};
 if(tgt){const aim=Math.atan2(EY(tgt)-e.y,EX(tgt)-e.x);e.a=turn(e.a,aim,[.07,.11,.16][SET.diff]);if(Math.abs(adiff(aim,e.a))<.3&&e.blind<=0&&(e.reactT=(e.reactT||0)+1)>(e.side==='D'?8:22)*[1.8,1,.6][SET.diff])fire(e);
  if(e.ammo[e.wp[e.sel]]<=0)reload(e);if(e.op.gd==='flash'&&bd<100&&e.gn>0)gadget(e);if(e.g2n>0&&e.g2cd<=0&&bd>50&&bd<115&&Math.random()<.02)gadget2(e);
  const s2=(Math.sin(G.t/40+e.site*3)>0?1:-1);if(e.side==='D'){moveEnt(e,Math.cos(aim+PI/2)*s2*sp*.5,Math.sin(aim+PI/2)*s2*sp*.5)}else if(bd>70)attNav(e,sp*.6,true);e.mv=.5;return}
 e.reactT=0;
 if(e.side==='D'&&botDrone(e,150))return;
 if(e.side==='A'){if(14400-G.t<e.dl){e.mv=0;return}if(rxMove(e,sp))return;attNav(e,sp,false);return}
 // defender idle
 if(G.mode==='bomb'&&G.bomb.prog>20){const bx=G.bomb.x,by=G.bomb.y;if(dst(e.x,e.y,bx,by)>36)navTo(e,bx,by,sp);return}
 if(rxMove(e,sp))return;
 if(e.op.gd==='pulse'&&e.pcd<=0)gadget(e);
 if(G.alert&&e.role==='roam'&&(G.alert.y>=OY*T)===(e.y>=OY*T)&&dst(e.x,e.y,G.alert.x,G.alert.y)>30){navTo(e,G.alert.x,G.alert.y,sp*.9);return}
 if(e.op.gd==='smoke'&&e.gn>0&&G.t%600===0&&G.phase==='act')gadget(e);
 if(dst(e.x,e.y,e.post.x,e.post.y)>70){if(field((e.post.y/T|0)*W+(e.post.x/T|0),2)[(e.y/T|0)*W+(e.x/T|0)]>=1e4)e.post={x:e.x,y:e.y};else{navTo(e,e.post.x,e.post.y,sp*.8);return}}
 e.wt--;if(!e.wander||e.wt<=0){e.wander={x:e.post.x+(Math.random()-.5)*70,y:e.post.y+(Math.random()-.5)*50};e.wt=120+Math.random()*180}
 const d=dst(e.x,e.y,e.wander.x,e.wander.y);if(d>4){const a=Math.atan2(e.wander.y-e.y,e.wander.x-e.x);moveEnt(e,Math.cos(a)*sp*.4,Math.sin(a)*sp*.4);e.a=turn(e.a,a,.05);e.mv=.3}else e.mv=0;
 if(Math.random()<.01)e.a+=Math.random()-.5}
function navTo(e,gx,gy,sp){const goal=(gy/T|0)*W+(gx/T|0);const dsd=e.side==='D';let f=field(goal,dsd?2:0),tx=e.x/T|0,ty=e.y/T|0,r=0;if(!dsd&&f[ty*W+tx]>=1e4){f=field(goal,1);r=1}if(f[ty*W+tx]>=1e4)return;
 let best=null,bv=f[ty*W+tx];for(const[dx,dy]of D4){const nx=tx+dx,ny=ty+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const v=f[ny*W+nx];if(v<bv){bv=v;best=[nx,ny]}}
 if(!best){const a=Math.atan2(gy-e.y,gx-e.x);if(dst(e.x,e.y,gx,gy)>3)moveEnt(e,Math.cos(a)*sp,Math.sin(a)*sp);return}
 const t=map[best[1]][best[0]],cx=best[0]*T+8,cy=best[1]*T+8,a=Math.atan2(cy-e.y,cx-e.x);
 if(t===3||t===4||t===9){if(t===9&&e.side==='D'){e.mv=0;return}e.a=turn(e.a,a,.2);if(dst(e.x,e.y,cx,cy)<21){if(t===3||t===9){e.bt++;if(t===9)e.cwo=4;if(e.bt>(t===9?90:50)){if(t===9)breakBarr(best[0],best[1]);else setTile(best[0],best[1],1);boom(cx,cy,12,'#c8b896');sfx(110,.3,'sawtooth',.06);e.bt=0}}else if(e.op.id==='thermite'&&!G.charges.some(c=>c.tx===best[0]&&c.ty===best[1])){G.charges.push({tx:best[0],ty:best[1],t:180,vert:0})}return}}
 else e.bt=0;
 moveEnt(e,Math.cos(a)*sp,Math.sin(a)*sp);e.a=turn(e.a,a,.15);e.mv=.6}
function attNav(e,sp,fight){const m=G.mode;let gx,gy;
 if(m==='bomb'){const s=SITES[e.site];gx=s[0];gy=s[1]}
 else if(m==='secure'){gx=SITES[0][0];gy=SITES[0][1]}
 else{const H_=G.hostage;if(H_.carrier){if(H_.carrier===e){gx=EXT[0];gy=EXT[1]}else{gx=H_.carrier.x;gy=H_.carrier.y}}else{gx=H_.x;gy=H_.y}}
 if(!fight&&rapBot(e,gx,gy,sp))return;const d=dst(e.x,e.y,gx,gy);
 if(m==='bomb'&&d<20&&!fight){G.bomb.act=1;G.bomb.x=gx;G.bomb.y=gy;e.mv=0;return}
 if(m==='hostage'&&!G.hostage.carrier&&d<14&&!fight){G.hostage.carrier=e;return}
 if(d>(m==='secure'?10:6)||m==='hostage'&&G.hostage.carrier===e)navTo(e,gx,gy,sp)}
// ---------- update ----------
function startAct(){for(const e of G.ents){e.tk=null;e.work=null;e.tasks=[];if(e.side==='D'&&e.alive&&e.post){e.x=e.post.x;e.y=e.post.y;e.ln=0;e.ex=undefined;e.ey=undefined;e.mv=0;e.faced=0;e.a=PI/2;for(const k of e.wp)if(k&&WP[k]&&e.ammo)e.ammo[k]=WP[k].mag;e.rl=0;e.cd=0}}G.rf=null;G.prog=null;G.phase='act';G.t=14400;G.msg=G.mode==='bomb'?'DEFUSE THE BOMB - HOLD E':'ACTION PHASE';for(const e of G.ents)if(e.side==='D'&&e.alive)e.tagT=0;sfx(700,.3,'square',.05)}
function update(){const me=G.me;
 if(G.phase==='end'){G.endT--;if(G.endT<=0&&!G.shown)showOver();updFx();return}
 tickX(me);
 if(!me.alive||DRN()||G.cv>=0){me.ex=undefined;me.ey=undefined;me.ln=0}
 if(G.cv>=0){const c=G.cams[G.cv];if(!c.alive||c.off>0||!me.alive)G.cv=-1;else{me.stun=Math.max(me.stun,3);if(mouse.down&&!inExit())tagNear(c,230,1)}}
 if(G.dc>=0){const d=G.drones[G.dc];if(!me.alive||!d||!d.alive||G.phase==='end')G.dc=-1;else me.stun=Math.max(me.stun,3)}
 updDrones();
 if(G.phase==='act'&&G.t%12===0)for(const c of G.cams)if(c.alive&&!(c.off>0)){const sn=G.ents.find(e=>e.alive&&e.side==='A'&&dst(c.x,c.y,e.x,e.y)<220&&los(c.x,c.y,e.x,e.y));if(sn){G.alert={x:sn.x,y:sn.y,t:480};break}}
 G.t--;if(G.bcd>0)G.bcd--;if(G.phase==='prep'&&G.bq.length&&++G.bqp>=BARR_T*2.2){G.bqp=0;bqOne()}if(G.alert&&--G.alert.t<=0)G.alert=null;if(G.phase==='prep'&&G.rq.length&&++G.rqp>=REINF_T){G.rqp=0;rqOne()}if(G.phase==='prep'&&(G.t<=0||(keys.enter&&G.t<2650)))startAct();
 if(G.phase==='act'&&G.t<=0){endRound('D',G.mode==='bomb'?'TIME EXPIRED - BOMB NOT DEFUSED':'TIME EXPIRED')}
 // player
 if(me.alive){let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0);const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
  const wx=mouse.x+cam.x,wy=mouse.y+cam.y;
  if(DRN()){const dd=G.drones[G.dc];if(dd.ctrl===me)driveDrone(dd,dx,dy)}
  else{if(G.phase==='act'||me.side==='D'){if(me.stam===undefined)me.stam=1;const mvg=!!(keys.w||keys.a||keys.s||keys.d),spr=!!(keys.shift&&mvg&&!me.lock&&me.rps!=='hang'&&me.stam>(me.tired?.3:0)&&!mouse.down&&!G.arm&&G.hostage.carrier!==me&&me.stun<=0&&me.slow<=0);
   if(spr){me.stam=Math.max(0,me.stam-1/SPR_T);if(me.stam<=0)me.tired=1}else{me.stam=Math.min(1,me.stam+1/SPR_R);if(me.stam>=.3)me.tired=0}me.spr=spr;
   const sp=PACE*me.op.sp*(spr?SPRINT:keys.alt?.5:1)*(me.slow>0?.4:1)*(me.stun>0?0:1)*(G.hostage.carrier===me?.8:1);if(!me.lock)moveEnt(me,dx*sp,dy*sp);me.mv=me.lock?0:Math.hypot(dx,dy)*(spr?1.25:keys.alt?.4:1)}
   me.a=Math.atan2(wy-EY(me),wx-EX(me));leanUpd(me);if(mouse.down&&(G.phase==='act'||(G.phase==='prep'&&me.side==='D'))&&!me.nofire&&!G.prog)fire(me)}
  if(keys.e&&G.phase==='act'&&!DRN())interact(me)}
 else if(keys.enter)for(let i=0;i<3;i++){}
 for(const e of G.ents){if(!e.alive)continue;
  if(e.side==='D'&&G.phase!=='end'){if(outB(e)){if(!e.outs){e.outs=1;if(G.me.side==='A'){botsReact(e.x,e.y,'enemy');G.feed.push({t:240,s:e.nm+' OUTSIDE',c:'#ff8a8a'});G.ring.push({x:e.x,y:e.y,r:2,c:'#ff4a4a'});sfx(900,.1,'sine',.05)}}e.tag=Math.max(e.tag,90)}else e.outs=0}
  e.cd>0&&e.cd--;e.rl>0&&e.rl--;e.blind>0&&e.blind--;e.stun>0&&e.stun--;e.slow>0&&e.slow--;e.tag>0&&e.tag--;e.gcd>0&&e.gcd--;e.pulse>0&&e.pulse--;e.pcd>0&&e.pcd--;e.hurtT>0&&e.hurtT--;e.fl>0&&e.fl--;e.g2cd>0&&e.g2cd--;e.cwo>0&&e.cwo--;e.ph=(e.ph||0)+(e.mv>.1?.17:0);
  if(e.bot&&e.side==='A'&&botDroning(e)){e.mv=0}
  else if(e.bot&&(G.phase==='act'||(G.phase==='prep'&&e.side==='D'))&&e.stun<=0){if(G.phase==='prep'){e.mv=0;botPrep(e)}else{e.mv=0;botAI(e)}}
  stairs(e);if(e.hostageCarry)e.hostageCarry=0}
 if(G.hostage.carrier&&G.hostage.carrier.alive){const c=G.hostage.carrier;G.hostage.x=c.x-Math.cos(c.a)*5;G.hostage.y=c.y-Math.sin(c.a)*5;c.hostageCarry=1}
 // traps
 for(let i=G.traps.length-1;i>=0;i--){const t=G.traps[i];if(t.k==='wire'||t.k==='nitro'){trapSpecial(t,i);continue}for(const e of G.ents)if(e.alive&&e.side==='A'&&dst(e.x,e.y,t.x,t.y)<9){if(t.k==='kap'){hurt(e,95,undefined,null);boom(t.x,t.y,18,'#ff8030');G.ring.push({x:t.x,y:t.y,r:2,c:'#ff8030'});sfx(70,.4,'sawtooth',.08)}else{hurt(e,35,undefined,null);e.stun=150;boom(t.x,t.y,6,'#888')}G.traps.splice(i,1);break}}
 for(let i=G.smokes.length-1;i>=0;i--){const s=G.smokes[i];s.t--;for(const e of G.ents)if(e.alive&&e.side==='A'&&dst(e.x,e.y,s.x,s.y)<s.r&&G.t%12===0&&s.gas)hurt(e,3,undefined,null);if(s.t<=0)G.smokes.splice(i,1)}
 for(const s of G.smokes)s.gas=G.ents.some(e=>e.op.gd==='smoke'&&e.side==='D')&&G.mode!=='x';
 for(let i=G.charges.length-1;i>=0;i--){const c=G.charges[i];c.t--;if(c.t<=0){for(let k=-1;k<=1;k++){const x=c.tx+(c.vert?0:k),y=c.ty+(c.vert?k:0);if(x>0&&y>0&&x<W-1&&y<H-1&&(map[y][x]===4||map[y][x]===3||map[y][x]===9)){setTile(x,y,map[y][x]===9?5:1);boom(x*T+8,y*T+8,14,'#ff9a30')}}G.ring.push({x:c.tx*T+8,y:c.ty*T+8,r:2,c:'#ff9a30'});sfx(60,.5,'sawtooth',.09);G.charges.splice(i,1)}}
 // objectives
 updNades();if(window.R6A)R6A.tick();
 if(G.phase==='act')objectives();
 updFx()}
function botIdlePrep(e){if(e.faced)return;let bd=1e9,ba=e.a;const of=e.y>=OY*T?OY:0;for(const d of(of?DOORSU:DOORS)){const dx=d[0]*T+8,dy=(d[1]+of)*T+8,dd=dst(e.x,e.y,dx,dy);if(dd<bd&&dd>20){bd=dd;ba=Math.atan2(dy-e.y,dx-e.x)}}e.a=ba;e.faced=1}
const dSee=d=>{const me=G.me;if(d.own.side===me.side)return true;const vp=G.cv>=0?G.cams[G.cv]:eyeOf(me),q=dst(vp.x,vp.y,d.x,d.y);return q<250&&los(vp.x,vp.y,d.x,d.y)&&!inSmoke(d.x,d.y)};
const DRN=()=>G.me.side==='A'&&G.phase!=='end'&&G.dc>=0&&!!G.drones[G.dc]&&G.drones[G.dc].alive,CD=()=>G.drones[G.dc];
const EX=e=>e.ex===undefined?e.x:e.ex,EY=e=>e.ey===undefined?e.y:e.ey,eyeOf=e=>e.ex===undefined?e:{x:e.ex,y:e.ey},LEAN_D=9;
function leanUpd(e){let w=(keys.v?1:0)-(keys.z?1:0);if(!e.alive||e.lock||e.stun>0||e.spr||e.rps||G.phase==='end'||DRN()||G.cv>=0)w=0;
 e.ln=(e.ln||0)+(w-(e.ln||0))*.3;if(!w&&Math.abs(e.ln)<.03)e.ln=0;
 const px=Math.cos(e.a+PI/2),py=Math.sin(e.a+PI/2),L=e.ln*LEAN_D;e.ex=e.x;e.ey=e.y;
 if(L)for(const k of[1,.75,.5,.25]){const x=e.x+px*L*k,y=e.y+py*L*k;if(!blk(tileAt(x,y))&&!solid(tileAt(x,y))&&los(e.x,e.y,x,y)){e.ex=x;e.ey=y;break}}}
// bots hear callouts and each decides for itself whether to respond
const SAYY=['ON IT','COPY','ROGER','MOVING'],SAYN=['HOLDING','STAYING','COVERING'];
function botsReact(x,y,kind){const me=G.me;if(G.phase==='end'||solid(tileAt(x,y)))return;
 for(const e of G.ents){if(e===me||!e.alive||!e.bot||e.side!==me.side||e.reactT>0)continue;
  const d=dst(e.x,e.y,x,y),roam=e.side==='D'&&e.role!=='roam',p=(kind==='enemy'?.65:.45)*(roam?.4:1)*(d<300?1:.55)*(e.rx?.5:1);
  if(Math.random()<p){e.rx={x,y,t:600,k:kind};e.say={s:SAYY[Math.random()*SAYY.length|0],t:110}}
  else if(Math.random()<.35)e.say={s:SAYN[Math.random()*SAYN.length|0],t:90}}}
function rxMove(e,sp){const r=e.rx;if(!r)return false;if(!r.arr&&dst(e.x,e.y,r.x,r.y)>22){navTo(e,r.x,r.y,sp*.9);return true}
 if(!r.arr){r.arr=1;r.t=Math.min(r.t,160)}e.mv=0;e.a+=Math.sin(G.t/25)*.04;return true}
function tagE(b){if(b&&b.tag<100){botsReact(b.x,b.y,'enemy');b.tag=900;G.ring.push({x:b.x,y:b.y,r:2,c:'#ff4a4a'});G.feed.push({t:240,s:'TAGGED '+b.nm,c:'#ff8a8a'});sfx(900,.1,'sine',.05)}}
function tagNear(dr,rng,sm){rng=rng||150;const me=G.me,wx=mouse.x+cam.x,wy=mouse.y+cam.y;let b=null,bd=1e9,cb=null,cd=30;
 for(const e of G.ents)if(e.alive&&e.side!==me.side){const d=dst(dr.x,dr.y,e.x,e.y);if(d<rng&&los(dr.x,dr.y,e.x,e.y)&&(!sm||!inSmoke(e.x,e.y)||d<30)){if(d<bd){b=e;bd=d}const c=dst(wx,wy,e.x,e.y);if(c<cd){cb=e;cd=c}}}
 tagE(cb||b)}
// pings: right click from a drone/cam, V anywhere. Tags a visible threat under the cursor, otherwise marks the location.
const HZL={wire:'WIRE',nitro:'C4',kap:'KAPKAN',mat:'MAT'},HZK={cam:'CAMERA',jam:'JAMMER',ads:'ADS',mag:'MAG',elec:'ELECTRIC',mine:'MINE',ban:'BANDIT'};
const hzLabel=d=>d.k==='trap'?(HZL[d.o.k]||'TRAP'):(HZK[d.k]||'HAZARD');
function pingHaz(){const me=G.me;if(me.side!=='A'||!window.R6A||!R6A.devs)return null;const vp=G.cv>=0?G.cams[G.cv]:DRN()?CD():eyeOf(me),R=G.cv>=0?230:DRN()?150:130,wx=mouse.x+cam.x,wy=mouse.y+cam.y;let L;try{L=R6A.devs()}catch(e){return null}
 let b=null,bd=16;for(const d of L){const q=dst(wx,wy,d.x,d.y);if(q<bd&&dst(vp.x,vp.y,d.x,d.y)<R&&(dst(vp.x,vp.y,d.x,d.y)<40||los(vp.x,vp.y,d.x,d.y))&&!inSmoke(d.x,d.y)){b=d;bd=q}}return b}
function pingEnemy(){const me=G.me,wx=mouse.x+cam.x,wy=mouse.y+cam.y;let hit=null,hd=24;for(const e of G.ents)if(e.alive&&e.side!==me.side&&visible(e)===true){const d=dst(wx,wy,e.x,e.y);if(d<hd){hit=e;hd=d}}return hit}
const pingHover=()=>mouse.y<=VH2&&!inExit()&&!!(pingEnemy()||pingHaz());
function drawHaz(){if(!G.hz||!G.hz.length||G.me.side!=='A'||!window.R6A||!R6A.devs)return;let L;try{L=R6A.devs()}catch(e){return}
 for(const h of G.hz){if(!L.some(d=>d.o===h.o))continue;const a=Math.min(1,h.t/60);g.globalAlpha=a;g.strokeStyle='#ff4a4a';g.lineWidth=1;g.strokeRect(Math.round(h.x)-6.5,Math.round(h.y)-6.5,13,13);g.fillStyle='#ff4a4a';g.fillRect(Math.round(h.x)-1,Math.round(h.y)-1,2,2);T8(h.l,h.x,h.y-17,'#ff7a7a','center');g.globalAlpha=1}}
function doPing(vp){const me=G.me;if(!me.alive||G.phase==='end'||mouse.y>VH2)return;const wx=mouse.x+cam.x,wy=mouse.y+cam.y;if(wx<0||wy<0||wx>=W*T||wy>=H*T)return;
 let hit=null,hd=24;for(const e of G.ents)if(e.alive&&e.side!==me.side&&visible(e)===true){const d=dst(wx,wy,e.x,e.y);if(d<hd){hit=e;hd=d}}
 if(hit){tagE(hit);G.pings.push({x:hit.x,y:hit.y,t:420,k:'enemy',c:'#ff4a4a',l:'ENEMY'})}else{const hz=pingHaz();if(hz){const l=hzLabel(hz);G.pings.push({x:hz.x,y:hz.y,t:540,k:'haz',c:'#ff9a30',l});(G.hz=G.hz||[]).push({o:hz.o,x:hz.x,y:hz.y,t:900,l});botsReact(hz.x,hz.y,'loc')}else{G.pings.push({x:wx,y:wy,t:540,k:'loc',c:'#ffd27a',l:'PING'});botsReact(wx,wy,'loc')}}
 while(G.pings.length>4)G.pings.shift();sfx(1200,.08,'sine',.04);G.ring.push({x:G.pings[G.pings.length-1].x,y:G.pings[G.pings.length-1].y,r:2,c:hit?'#ff4a4a':'#ffd27a'})}
const pingView=()=>doPing(G.cv>=0?G.cams[G.cv]:DRN()?CD():G.me);
function exitView(){if(G.cv>=0||DRN()){G.cv=-1;G.dc=-1;G.msg='VIEW CLOSED'}}
const EXB={x:VW/2-34,y:VH-122,w:68,h:14},inExit=()=>mouse.x>=EXB.x&&mouse.x<=EXB.x+EXB.w&&mouse.y>=EXB.y&&mouse.y<=EXB.y+EXB.h;
function drawPings(){const me=G.me,fx=G.cv>=0?G.cams[G.cv]:DRN()?CD():me,fl=fx.y>=OY*T;
 for(const p of G.pings){const a=Math.min(1,p.t/60),pr=(G.t%40)/40;g.globalAlpha=a;g.strokeStyle=p.c;g.lineWidth=1;g.beginPath();g.arc(p.x,p.y,4+pr*10,0,7);g.stroke();
  g.fillStyle='#000';g.fillRect(p.x-5,p.y-19,10,12);g.fillStyle=p.c;g.beginPath();g.moveTo(p.x,p.y-18);g.lineTo(p.x+4,p.y-13);g.lineTo(p.x,p.y-8);g.lineTo(p.x-4,p.y-13);g.fill();T8(p.l,p.x,p.y-28,p.c,'center');g.globalAlpha=1}}
function drawPingEdges(){const me=G.me,fx=G.cv>=0?G.cams[G.cv]:DRN()?CD():me,fl=fx.y>=OY*T;
 for(const p of G.pings){if((p.y>=OY*T)!==fl)continue;const sx=p.x-cam.x,sy=p.y-cam.y;if(sx>=0&&sx<=VW&&sy>=0&&sy<=VH2)continue;const cx=cl(sx,8,VW-8),cy=cl(sy,24,VH2-8);g.globalAlpha=Math.min(1,p.t/60);g.fillStyle='#000';g.fillRect(cx-5,cy-5,10,10);g.fillStyle=p.c;g.beginPath();g.moveTo(cx,cy-4);g.lineTo(cx+4,cy);g.lineTo(cx,cy+4);g.lineTo(cx-4,cy);g.fill();g.globalAlpha=1}}
function drawExitBtn(){const h=inExit();g.fillStyle=h?'#ef3a42':'rgba(8,10,14,.9)';g.fillRect(EXB.x,EXB.y,EXB.w,EXB.h);g.strokeStyle='#ef3a42';g.lineWidth=1;g.strokeRect(EXB.x+.5,EXB.y+.5,EXB.w-1,EXB.h-1);T8('EXIT VIEW',EXB.x+EXB.w/2,EXB.y+3,'#fff','center')}
function interact(me){if(G.mode==='bomb'&&me.side==='A'){const b=G.bomb;for(const q of SITES)if(dst(me.x,me.y,q[0],q[1])<22){b.act=1;b.x=q[0];b.y=q[1];me.mv=0;break}}
 if(G.mode==='hostage'&&me.side==='A'&&!G.hostage.carrier&&dst(me.x,me.y,G.hostage.x,G.hostage.y)<16)G.hostage.carrier=me}
function objectives(){const al=s=>G.ents.filter(e=>e.alive&&e.side===s);const A=al('A'),D=al('D');
 if(G.mode==='bomb'){const b=G.bomb;
  if(b.act){b.prog++;if(b.prog%45===1)sfx(900,.04,'square',.03)}else if(b.prog>0)b.prog=Math.max(0,b.prog-2);b.act=0;
  if(b.prog>=DEFUSE){b.prog=DEFUSE;endRound('A','BOMB DEFUSED');return}
  if(!D.length){endRound('A','DEFENDERS ELIMINATED');return}if(!A.length){endRound('D','ATTACKERS ELIMINATED');return}}
 else if(G.mode==='secure'){const r=ROOMS[SECR];const ai=A.some(e=>inRoom(e,r)),di=D.some(e=>inRoom(e,r));if(ai&&!di)G.sec++;else if(!ai&&!di)G.sec=Math.max(0,G.sec-1);G.contest=ai&&di;if(G.sec>=600){endRound('A','AREA SECURED');return}
  if(!D.length){endRound('A','DEFENDERS ELIMINATED');return}if(!A.length){endRound('D','ATTACKERS ELIMINATED');return}}
 else{const h=G.hostage;if(h.hp<=0){endRound(h.by==='A'?'D':'A','HOSTAGE KILLED BY '+(h.by==='A'?'ATTACKERS':'DEFENDERS'));return}
  if(h.carrier&&dst(h.x,h.y,EXT[0],EXT[1])<30){endRound('A','HOSTAGE EXTRACTED');return}
  if(!D.length){endRound('A','DEFENDERS ELIMINATED');return}if(!A.length){endRound('D','ATTACKERS ELIMINATED');return}}}
let MS={};function msAcc(w){const ci={A:0,D:0};for(const e of G.ents){const i=ci[e.side]++,k=(e.side===G.side?'T':'E')+i,r=MS[k]||(MS[k]={you:!e.bot,team:e.side===G.side,op:e.op.n,sc:0,kl:0,dd:0});r.op=e.op.n;r.kl+=e.kl||0;r.dd+=Math.round(e.dd||0);r.sc+=(e.kl||0)*100+(e.dd||0)*.5+(e.alive?40:0)+(e.side===w?30:0)}}
function endRound(w,why){if(G.phase==='end')return;msAcc(w);try{window.R6Acct&&R6Acct.round(G,w)}catch(e){}G.phase='end';G.endT=150;G.res={w,why};score[w==='A'?0:1]++;G.msg=why;sfx(w===G.side?800:200,.6,'square',.06)}
function showOver(){G.shown=1;const won=G.res.w===G.side,mw=score[G.side==='A'?0:1]>=3,ml=score[G.side==='A'?1:0]>=3,ov=document.getElementById('over');
 try{if(window.ECO){if((mw||ml)&&!G.paid){G.paid=1;try{window.R6Acct&&R6Acct.match(mw)}catch(_){}ECO.matchEnd({won:mw,rows:Object.values(MS),my:score[G.side==='A'?0:1],their:score[G.side==='A'?1:0]})}else if(!(mw||ml))ECO.clearRewards()}}catch(_){}
 document.getElementById('ot').textContent=mw?'MATCH WON':ml?'MATCH LOST':(won?'ROUND WON':'ROUND LOST');
 document.getElementById('ot').style.color=won?'#6aff9a':'#ff5a4a';document.getElementById('os').textContent=G.res.why+'  |  ATK '+score[0]+' - '+score[1]+' DEF  |  BEST OF 5, FIRST TO 3';
 const b=document.getElementById('ob');b.textContent=(mw||ml)?'MAIN MENU':'NEXT ROUND: PICK OPERATOR ('+(G.side==='A'?'DEFENCE':'ATTACK')+')';b.onclick=()=>{if(mw||ml){G=null;score=[0,0];ov.style.display='none';toMenu()}else{rnd++;uiSel.side=uiSel.side==='A'?'D':'A';uiSel.op=Math.max(0,OPS[uiSel.side].findIndex(o=>(LD[o.id]||{}).f));score.reverse();G=null;uiSel.between=1;ov.style.display='none';$('menu').style.display='block';showScr('ops');musicStart()}};ov.style.display='flex'}
function updFx(){for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];if(f.sh)CXR.fxStep(f);f.x+=f.vx;f.y+=f.vy;f.vx*=f.sh?.985:.94;f.vy*=f.sh?.985:.94;if(--f.t<=0)G.fx.splice(i,1)}
 for(let i=G.tr.length-1;i>=0;i--)if(--G.tr[i].t<=0)G.tr.splice(i,1);for(let i=G.ring.length-1;i>=0;i--){G.ring[i].r+=3;if(G.ring[i].r>60)G.ring.splice(i,1)}
 for(let i=G.feed.length-1;i>=0;i--)if(--G.feed[i].t<=0)G.feed.splice(i,1);for(let i=G.pings.length-1;i>=0;i--)if(--G.pings[i].t<=0)G.pings.splice(i,1);if(G.hz)for(let i=G.hz.length-1;i>=0;i--)if(--G.hz[i].t<=0)G.hz.splice(i,1)}
// ---------- render ----------
function visible(e){const me=G.me;if(e.side===me.side||!me.alive)return true;
 if(DRN()){const d=CD();return e.tag>0||(dst(d.x,d.y,e.x,e.y)<150&&los(d.x,d.y,e.x,e.y))}
 if(e.tag>0)return true;
 if(me.side==='D'&&e.side==='A'&&G.ents.some(p=>p.side==='D'&&p.alive&&p.pulse>0&&dst(p.x,p.y,e.x,e.y)<110))return 'pulse';
 const vp=G.cv>=0?G.cams[G.cv]:eyeOf(me),d=dst(vp.x,vp.y,e.x,e.y);return d<250&&los(vp.x,vp.y,e.x,e.y)&&(!inSmoke(e.x,e.y)||d<30)}
const VH2=VH-26;
const TFONT='8px Silkscreen,monospace';let TBON=false,TBH=false;const TB=[];
function Tw(s){g.font=TFONT;return g.measureText(String(s)).width}
function fitStr(s,mw){s=String(s);if(!mw||Tw(s)<=mw)return s;while(s.length>1&&Tw(s+'.')>mw)s=s.slice(0,-1);return s.trimEnd()+'.'}
function wrapW(m,mw){const L=[];let c='';for(const t of String(m).split(' ')){const n=c?c+' '+t:t;if(!c||Tw(n)<=mw)c=n;else{L.push(c);c=t}}if(c)L.push(c);return L}
function T8(s,x,y,col,al,mw){s=fitStr(s,mw);g.font=TFONT;g.textBaseline='top';al=al||'left';g.textAlign=al;g.fillStyle='#000';g.fillText(s,x+1,y+1);g.fillStyle=col||'#e8e2cf';g.fillText(s,x,y);
 if(TBON&&TBH){const w=g.measureText(s).width;TB.push({s,x0:al==='center'?x-w/2:al==='right'?x-w:x,x1:al==='center'?x+w/2:al==='right'?x:x+w,y0:y,y1:y+8})}}
function wLbl(pre,n,mw){n=String(n).toUpperCase();if(Tw(pre+n)>mw){const q=n.split(' ');if(q.length>1&&/^[.\d]/.test(q[q.length-1]))n=q.slice(0,-1).join(' ')}return pre+n}
let LS=0;function lrow(h){LS-=h+1;return LS}
function render(){const me=G.me;TBH=false;g.fillStyle='#07090d';g.fillRect(0,0,VW,VH);
 const fx=G.cv>=0?G.cams[G.cv]:DRN()?CD():eyeOf(me);cam.x=cl(fx.x-VW/2,0,W*T-VW)|0;cam.y=cl(fx.y-VH2/2,0,H*T-VH2)|0;
 let sx_=0,sy_=0;if(G.shake>.3){sx_=Math.round((Math.random()-.5)*G.shake*SET.shake);sy_=Math.round((Math.random()-.5)*G.shake*SET.shake);G.shake*=.88}else G.shake=0;
 g.save();g.beginPath();g.rect(0,0,VW,VH2);g.clip();g.translate(-cam.x+sx_,-cam.y+sy_);g.drawImage(mapC,0,0);
 for(const d of G.decals){g.fillStyle=d.c;g.fillRect(d.x,d.y,d.s,d.s)}
 for(const c of G.cams){if(me.side==='A'&&!(dst(fx.x,fx.y,c.x,c.y)<((G.cv>=0||DRN())?150:130)&&los(fx.x,fx.y,c.x,c.y)))continue;const cx=Math.round(c.x),wy=c.wy;if(c.alive){const sw=Math.sin(G.t/40)*1.2|0;g.fillStyle='#0b0d11';g.fillRect(cx-3,wy+9,6,2);g.fillRect(cx-1,wy+11,2,2);g.fillRect(cx-4,wy+13,8,5);g.fillStyle='#5b6472';g.fillRect(cx-3,wy+13,6,3);g.fillStyle='#8a94a4';g.fillRect(cx-3,wy+13,6,1);g.fillStyle='#0b0d11';g.fillRect(cx-2+sw,wy+16,3,2);g.fillStyle='#8fd0ff';g.fillRect(cx-1+sw,wy+16,1,1);if(Math.sin(G.t/9)>0){g.fillStyle='#ff3a3a';g.fillRect(cx+2,wy+14,1,1)}}else{g.fillStyle='#0b0d11';g.fillRect(cx-3,wy+9,6,2);g.fillStyle='#3a3f48';g.fillRect(cx-3,wy+12,3,3);if(Math.sin(G.t/5)>0){g.fillStyle='#ffb62e';g.fillRect(cx+1,wy+13,1,1)}}}
 if(G.mode==='bomb'){for(const s of SITES){g.strokeStyle='#ffb62e';g.lineWidth=1;g.setLineDash([3,3]);g.strokeRect(s[0]-20,s[1]-20,40,40);g.setLineDash([]);T8(s[2],s[0],s[1]-4,'#ffb62e','center')}
  for(const q of SITES){const df=G.bomb.prog>0&&G.bomb.x===q[0]&&G.bomb.y===q[1];g.fillStyle='#111';g.fillRect(q[0]-6,q[1]-5,12,10);g.fillStyle=df?'#3dff7a':(G.t%60<30?'#ff3030':'#802020');g.fillRect(q[0]-5,q[1]-4,10,8);g.fillStyle='#fff';g.fillRect(q[0]-3,q[1]-2,6,2)}}
 else if(G.mode==='secure'){const r=ROOMS[SECR];g.strokeStyle=G.contest?'#ff4a4a':'#ff5a60';g.lineWidth=1;g.setLineDash([4,4]);g.strokeRect(r[0]*T+.5,(r[1]+(r[5]?OY:0))*T+.5,(r[2]-r[0]+1)*T-1,(r[3]-r[1]+1)*T-1);g.setLineDash([])}
 else{const h=G.hostage;if(h.hp>0){const S=spritesFor(HOSTOP);g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(h.x,h.y+5,6,3,0,0,7);g.fill();g.drawImage(S.down[0],Math.round(h.x)-7,Math.round(h.y)-12);g.strokeStyle='#ffb62e';g.beginPath();g.ellipse(h.x,h.y+5,8,4,0,0,7);g.stroke()}
  g.strokeStyle='#6aff9a';g.setLineDash([3,3]);g.beginPath();g.arc(EXT[0],EXT[1],28,0,7);g.stroke();g.setLineDash([]);T8('EXTRACT',EXT[0],EXT[1]-4,'#6aff9a','center')}
 for(const t of G.traps){if(me.side==='D'||dst(fx.x,fx.y,t.x,t.y)<((G.cv>=0||DRN())?60:26)){if(t.k==='wire'){g.strokeStyle='#cfd6de';g.lineWidth=1;g.beginPath();g.moveTo(t.x-9,t.y);for(let i=-9;i<9;i+=3)g.lineTo(t.x+i+1.5,t.y+(i%2?-3:3));g.stroke()}else if(t.k==='nitro'){g.fillStyle='#111';g.fillRect(t.x-3,t.y-4,6,9);g.fillStyle='#e8e8e8';g.fillRect(t.x-2,t.y-3,4,7);g.fillStyle='#d62a2a';g.fillRect(t.x-2,t.y-1,4,2)}else if(t.k==='kap'){g.fillStyle='#111';g.fillRect(t.x-4,t.y-3,8,6);g.fillStyle='#ff3a3a';g.fillRect(t.x-3,t.y-2,6,4);g.fillStyle='#ffd27a';g.fillRect(t.x-1,t.y-1,2,2)}else{g.fillStyle='#111';g.fillRect(t.x-6,t.y-2,12,4);g.fillStyle='#9aa4b0';g.fillRect(t.x-5,t.y-1,10,2);g.fillStyle='#fff';for(let i=-4;i<5;i+=2)g.fillRect(t.x+i,t.y-2,1,1)}}}
 for(const n of G.nades)drawNade(n);
 if(window.R6A)R6A.draw(g,(G.cv>=0||DRN())?Object.assign(Object.create(me),{x:fx.x,y:fx.y}):me);for(const c of G.charges){g.fillStyle='#111';g.fillRect(c.tx*T+2,c.ty*T+2,12,12);g.fillStyle=c.t%10<5?'#ff9a30':'#fff3b0';g.fillRect(c.tx*T+3,c.ty*T+3,10,10)}
 const marks=[];
 for(const e of G.ents)if(!e.alive)drawDead(e);
 for(const e of [...G.ents].sort((a,b)=>a.y-b.y)){if(!e.alive)continue;const v=visible(e);if(!v)continue;if(v==='pulse'){marks.push([e,'#ff4a6a']);continue}
  drawEnt(e);
  if(e.say&&e.say.t>0)T8(e.say.s,e.x,e.y-30,'#9fe8ff','center');
  if(e===me){g.fillStyle='#ffe14a';g.beginPath();g.moveTo(e.x,e.y-17);g.lineTo(e.x+3,e.y-21);g.lineTo(e.x-3,e.y-21);g.fill()}
  else{g.fillStyle='#000c';g.fillRect(Math.round(e.x)-8,Math.round(e.y)-18,16,3);g.fillStyle=e.side===me.side?'#6aff9a':'#ff4a4a';g.fillRect(Math.round(e.x)-7,Math.round(e.y)-17,Math.round(14*Math.max(0,e.hp/e.mhp)),1)}
  if(e.blind>0)T8('*',e.x,e.y-26,'#fff','center');if(e.stun>0)T8('X',e.x,e.y-26,'#ff4a4a','center');
  if(e.tag>0&&e.side!==me.side)marks.push([e,'#ff4a4a'])}
 for(const m of marks){const e=m[0];g.fillStyle='#000';g.fillRect(e.x-5,e.y-21,10,11);g.fillStyle=m[1];g.beginPath();g.moveTo(e.x,e.y-20);g.lineTo(e.x+4,e.y-15);g.lineTo(e.x,e.y-10);g.lineTo(e.x-4,e.y-15);g.fill()}
 for(const s of G.smokes){g.fillStyle=s.gas?'rgba(120,220,80,.55)':'rgba(190,190,190,.7)';for(let i=0;i<8;i++){const a=i*.8+G.t/50;g.beginPath();g.arc(s.x+Math.cos(a)*s.r*.5,s.y+Math.sin(a)*s.r*.5,s.r*.55,0,7);g.fill()}}
 g.lineWidth=1;for(const t of G.tr){if(t.pl&&window.CXR&&CXR.trace(g,t))continue;g.strokeStyle='#fff3b0';g.globalAlpha=t.t/3;g.beginPath();g.moveTo(Math.round(t.x1)+.5,Math.round(t.y1)+.5);g.lineTo(Math.round(t.x2)+.5,Math.round(t.y2)+.5);g.stroke()}g.globalAlpha=1;
 for(const f of G.fx){if(f.sh&&window.CXR)CXR.fx(g,f);else{g.fillStyle=f.c;g.fillRect(f.x|0,f.y|0,2,2)}}for(const r of G.ring){g.strokeStyle=r.c;g.globalAlpha=1-r.r/60;g.beginPath();g.arc(r.x,r.y,r.r,0,7);g.stroke()}g.globalAlpha=1;
 for(const d of G.drones)if(d.alive&&dSee(d))drawDrone(d);
 drawWorldExtra();drawPings();drawHaz();
 if(G.phase==='prep'&&me.side==='D'){const tx=(mouse.x+cam.x)/T|0,ty=(mouse.y+cam.y)/T|0;if(tx>=0&&ty>=0&&tx<W&&ty<H&&map[ty][tx]===3){g.strokeStyle=G.reinf<REINF?'#ffe14a':'#f44';g.lineWidth=1;g.strokeRect(tx*T+.5,ty*T+.5,T-1,T-1)}else if(tx>=0&&ty>=0&&tx<W&&ty<H&&map[ty][tx]===5){g.strokeStyle=G.barr<BARR?'#ffcf6a':'#f44';g.lineWidth=1;for(const q of[[tx,ty],doorPair(tx,ty)])if(q)g.strokeRect(q[0]*T+.5,q[1]*T+.5,T-1,T-1)}}
 g.restore();
 const ox=(G.cv>=0?G.cams[G.cv]:DRN()?CD():eyeOf(me)),R=G.cv>=0?230:DRN()?150:270;
 if(SET.fog&&(me.alive||G.phase==='prep')){dkg.globalCompositeOperation='source-over';dkg.clearRect(0,0,VW,VH);dkg.fillStyle='rgba(5,9,18,.66)';dkg.fillRect(0,0,VW,VH);dkg.globalCompositeOperation='destination-out';dkg.fillStyle='#000';dkg.beginPath();
  const sx=ox.x-cam.x+sx_,sy=ox.y-cam.y+sy_;for(let i=0;i<=200;i++){const a=i/200*2*PI,ca=Math.cos(a),sa=Math.sin(a);let d=0;for(;d<R;d+=3){if(solid(tileAt(ox.x+ca*d,ox.y+sa*d)))break}d=Math.min(R,d+3);i?dkg.lineTo(sx+ca*d,sy+sa*d):dkg.moveTo(sx+ca*d,sy+sa*d)}dkg.fill();
  dkg.globalCompositeOperation='source-over';const gr=dkg.createRadialGradient(sx,sy,R*.35,sx,sy,R);gr.addColorStop(0,'rgba(5,9,18,0)');gr.addColorStop(1,'rgba(5,9,18,.5)');dkg.fillStyle=gr;dkg.fillRect(0,0,VW,VH);
  g.save();g.beginPath();g.rect(0,0,VW,VH2);g.clip();g.drawImage(dk,0,0);g.restore()}
 xhair();hud(me);hudExtra(me)}
function hud(me){TBH=true;const al=G.ents.filter(e=>e.alive);const bar=(x,y,w,h,v,c,b)=>{g.fillStyle=b||'#000';g.fillRect(x-1,y-1,w+2,h+2);g.fillStyle=c;g.fillRect(x,y,Math.round(w*cl(v,0,1)),h)};
 // top panel: timer + score on one row, mode on the next (measured, never overlaps)
 LS=VH2-1;
 const secs=Math.max(0,Math.ceil(G.t/60)),mm=(secs/60|0)+':'+String(secs%60).padStart(2,'0'),sA='ATK '+score[0],sD=score[1]+' DEF',sM=MODES[G.mode]+' R'+rnd+'/5';
 const pw=Math.ceil(Math.max(2*Math.max(Tw(sA),Tw(sD))+Tw(mm)+30,Tw(sM)+16,128)),px0=Math.round(VW/2-pw/2),hw=pw>>1;
 g.fillStyle='rgba(8,10,14,.9)';g.fillRect(px0,0,pw,25);g.fillStyle='#ef3a42';g.fillRect(px0,25,hw,2);g.fillStyle='#c4c8d0';g.fillRect(px0+hw,25,pw-hw,2);
 T8(sA,px0+7,3,'#ff5a60');T8(mm,VW/2,3,G.phase==='prep'?'#ff5a60':'#ffb62e','center');T8(sD,px0+pw-7,3,'#c4c8d0','right');T8(sM,VW/2,14,'#8fa3bf','center',pw-8);
 // message: wrapped by real text width, kept clear of the kill feed (left) and minimap (right)
 const mLo=SET.feed?152:6,mHi=SET.mini?VW-152:VW-6,mw=Math.max(110,Math.min(300,2*Math.min(VW/2-mLo,mHi-VW/2)));
 const ML=G.msg?wrapW(G.msg,mw-8):[];ML.forEach((t,i)=>{const tw=Math.min(mw,Tw(t)+8);g.fillStyle='rgba(8,10,14,.8)';g.fillRect(Math.round(VW/2-tw/2),28+i*11,Math.ceil(tw),11);T8(t,VW/2,29+i*11,'#e8e2cf','center',mw-8)});
 const sby=ML.length?28+ML.length*11+3:31;
 if(G.mode==='bomb'&&G.bomb.prog>0){bar(VW/2-30,sby,60,4,G.bomb.prog/DEFUSE,'#6aff9a');T8('DEFUSING',VW/2,sby+7,'#fff','center')}
 if(G.mode==='secure'){bar(VW/2-30,sby,60,4,G.sec/600,G.contest?'#ff4a4a':'#ff5a60');T8(G.contest?'CONTESTED':'SECURING',VW/2,sby+7,'#fff','center')}
 if(G.mode==='hostage'){bar(VW/2-30,sby,60,4,G.hostage.hp/100,'#ffb62e');T8(G.hostage.carrier?'HOSTAGE CARRIED':'HOSTAGE',VW/2,sby+7,'#fff','center')}
 if(me.alive&&G.cv<0){if(me.side==='D')T8('C: CAMERAS',6,lrow(10),'#8fa3bf');if(G.side==='D'&&G.phase!=='end')T8('B: BARRICADE '+(BARR-G.barr)+' LEFT',6,lrow(10),'#ffcf6a','left',140)}
 // killfeed
 let y=4;if(SET.feed)for(const f of G.feed.slice(-5)){const fs=fitStr(f.s,138),w=Math.ceil(Tw(fs))+6;g.fillStyle='rgba(8,10,14,.8)';g.fillRect(4,y-1,w,11);T8(fs,7,y+1,f.c);y+=12}
 // minimap
 if(SET.mini){const fl=me.y>=OY*T?OY:0,ox0=BX0-1,oy0=fl+BY0-1,tw=BX1-BX0+3,th=BY1-BY0+3+(fl?0:5),ms=Math.min(132/tw,78/th),mx=VW-146,my=4,P=(x,y)=>[mx+5+(x/T-ox0)*ms,my+4+(y/T-oy0)*ms],on=y=>fl?y>=OY*T:y<OY*T;
 g.fillStyle='rgba(8,10,14,.92)';g.fillRect(mx,my,142,86);g.fillStyle=me.side==='A'?'#ef3a42':'#c4c8d0';g.fillRect(mx,my,142,2);g.save();g.beginPath();g.rect(mx+5,my+4,132,78);g.clip();g.drawImage(mapC,ox0*T,oy0*T,tw*T,th*T,mx+5,my+4,tw*ms,th*ms);g.fillStyle='rgba(8,12,22,.35)';g.fillRect(mx+5,my+4,132,78);
 {const[cx,cy]=P(cam.x,cam.y);g.strokeStyle='#fff';g.lineWidth=1;g.strokeRect(cx+.5,cy+.5,VW/T*ms,VH2/T*ms)}
 for(const e of G.ents)if(e.alive&&on(e.y)&&(e.side===me.side||visible(e))){const[px,py]=P(e.x,e.y);g.fillStyle=e===me?'#fff':e.side==='A'?'#ff5a60':'#c4c8d0';g.fillRect(px-1,py-1,3,3)}
 for(const d of G.drones)if(d.alive&&on(d.y)&&dSee(d)){const[px,py]=P(d.x,d.y);g.fillStyle=d.own.side===me.side?'#7ed0ff':'#ff5a60';g.fillRect(px-1,py-1,3,3)}
 for(const p of G.pings)if(on(p.y)){const[px,py]=P(p.x,p.y);g.fillStyle=p.c;g.fillRect(px-2,py-2,5,5)}
 if(me.side==='D')for(const c of G.cams)if(c.alive&&on(c.y)){const[px,py]=P(c.x,c.y);g.fillStyle='#ff4a4a';g.fillRect(px-1,py-1,2,2)}
 if(G.mode==='bomb')for(const q of SITES)if(on(q[1])){const[px,py]=P(q[0],q[1]);T8(q[2],px,py-4,'#ffb62e','center')}
 for(const st of STAIRS)for(const q of st)if(on(q[1]*T)){const[px,py]=P(q[0]*T+8,q[1]*T+8);g.fillStyle='#6aff9a';g.fillRect(px-1,py-1,3,3)}
 g.restore();T8(fl?'FLOOR 2':'FLOOR 1',mx+4,my+88,'#8fa3bf')}
 if(G.cv>=0){g.strokeStyle='#ff4a4a';g.strokeRect(2.5,2.5,VW-5,VH2-5);T8('CAM '+(G.cv+1)+'/'+G.cams.length+'   CLICK: TAG   RIGHT CLICK: PING   C: NEXT',VW/2,VH2-12,'#ff4a4a','center',VW-16)}
 if(G.cv>=0||DRN())drawExitBtn();
 drawPingEdges();
 // bottom bar
 g.fillStyle='rgba(8,10,14,.95)';g.fillRect(0,VH2,VW,26);g.fillStyle=me.side==='A'?'#ef3a42':'#c4c8d0';g.fillRect(0,VH2,VW,1);
 const left=al.filter(e=>e.side!==me.side).length,k=me.wp[me.sel],lt=left+' LEFT',rT='R'+rnd,rW=Math.ceil(Tw(rT));
 T8(rT,6,VH2+4,'#e0453a');T8(lt,152,VH2+4,'#8fe08f','right');T8(me.op.n,6+rW+8,VH2+4,'#8fa3bf','left',152-Math.ceil(Tw(lt))-8-(6+rW+8));
 bar(6,VH2+14,120,5,me.hp/me.mhp,me.hp/me.mhp>.35?'#4ec45a':'#e0453a','#1a2a1c');bar(6,VH2+21,120,2,me.ammo[k]/WP[k].mag,'#e8e2cf','#1c1f26');
 T8(Math.max(0,Math.ceil(me.hp))+'',152,VH2+13,'#e8e2cf','right');
 const BXS=[158,238,318,398],BW=77,IW=BW-8;
 {const x2=BXS[0];g.fillStyle='#14181f';g.fillRect(x2,VH2+3,BW,20);const ok=me.g2n>0||me.g2==='nitro';T8('G '+(me.g2==='nitro'&&me.g2n<=0?'DETONATE':G2S[me.g2]||'-'),x2+4,VH2+6,ok?'#e8e2cf':'#666b75','left',IW);T8('x'+me.g2n,x2+4,VH2+15,'#8fa3bf','left',IW)}
 {const gx=BXS[1];g.fillStyle='#14181f';g.fillRect(gx,VH2+3,BW,20);const gok=me.gn>0||me.op.gd==='pulse'||me.op.gd==='hammer',cnt=(me.op.gd&&me.op.gn>0&&me.op.gn<90)?'x'+me.gn:'',cw=cnt?Math.ceil(Tw(cnt))+4:0;
  T8(me.op.gd?'Q '+(window.R6A&&R6A.label(me)||{hammer:'HAMMER',emp:'EMP',ash:'BREACH',therm:'THERMITE',flash:'FLASH',smoke:'GAS',kap:'MINE',mat:'MAT',castle:'ARMOR',pulse:'PULSE',doc:'STIM'}[me.op.gd]):'NO GADGET',gx+4,VH2+6,gok?'#ffb62e':'#666b75','left',IW-cw);if(cnt)T8(cnt,gx+BW-4,VH2+6,'#e8e2cf','right');
  if(G.side==='D'&&G.phase==='prep')T8('REINF '+G.reinf+'/'+REINF,gx+4,VH2+15,'#ffe14a','left',IW)}
 for(let i=0;i<2;i++){const w=me.wp[i],x=BXS[2+i],sel=me.sel===i;g.fillStyle=sel?'#1d2633':'#14181f';g.fillRect(x,VH2+3,BW,20);if(sel){g.fillStyle=me.side==='A'?'#ef3a42':'#c4c8d0';g.fillRect(x,VH2+3,BW,1)}if(window.CXR&&CXR.gunCol(0,19)){const N=19,sw=Math.floor(BW/N);for(let q=0;q<N;q++){g.fillStyle=CXR.gunCol(q,N);g.globalAlpha=sel?1:.55;g.fillRect(x+q*sw+((BW-N*sw)>>1),VH2+3,sw,2)}g.globalAlpha=1}T8(wLbl((i+1)+' ',WP[w].n,IW),x+4,VH2+6,sel?'#fff':'#8fa3bf','left',IW);T8(sel&&me.rl>0?'RELOADING':me.ammo[w]+'/'+WP[w].mag,x+4,VH2+15,sel?'#ffd27a':'#666b75','left',IW)}
 if(me.blind>0){g.fillStyle='rgba(255,255,255,'+Math.min(1,me.blind/90)+')';g.fillRect(0,0,VW,VH)}
 if(!me.alive&&G.phase!=='end')T8('ELIMINATED - HOLD ENTER TO FAST FORWARD',VW/2,VH2-18,'#ff4a4a','center',VW-16);
 if(SET.hurt&&me.hurtT>0){g.strokeStyle='rgba(255,0,0,.45)';g.lineWidth=5;g.strokeRect(0,0,VW,VH2)}
 if(G.phase==='end'){g.fillStyle='rgba(0,0,0,.55)';g.fillRect(0,VH2/2-18,VW,36);T8(G.res.why,VW/2,VH2/2-8,G.res.w===G.side?'#6aff9a':'#ff4a4a','center',VW-16)}}
// ---------- input ----------
addEventListener('keydown',e=>{const k=tk(e.key.toLowerCase());keys[k]=true;if(k==='escape'&&G&&G.bm&&!PAUSED){G.bm=0;return}if((k==='escape'||k==='p')&&G&&$('menu').style.display==='none'&&$('over').style.display==='none'){setPause(!PAUSED);return}if(!G||document.getElementById('menu').style.display!=='none')return;
 if(k==='c'&&G.me.side==='D'&&G.me.alive){const n=G.cams.length;let i=G.cv;do{i++}while(i<n&&!G.cams[i].alive);G.cv=i>=n?-1:i}if(k==='c'&&!e.repeat&&G.me.side==='A'&&G.me.alive&&G.phase!=='end'&&!G.arm)cycleDrone();if(k==='backspace'&&!e.repeat){e.preventDefault();exitView()}if(k==='t'&&!e.repeat&&!PAUSED&&G.me.alive)doPing(G.cv>=0?G.cams[G.cv]:DRN()?CD():G.me);if(k==='r')reload(G.me);if(k==='g')armG(G.me,'g2');if(k==='1'&&G.me.op.id!=='montagne')G.me.sel=0;if(k==='2')G.me.sel=1;if(k==='q')armG(G.me,'q');if(k===' '||k==='tab')e.preventDefault();
 if(k==='m'&&!e.repeat&&G.me&&!PAUSED){G.bm=G.bm?0:1;G.bmf=G.me.y>=OY*T?1:0}if(k==='tab'&&G.bm)G.bmf^=1;
 if(G.me.op.id==='montagne')G.me.sel=1});
addEventListener('keyup',e=>{keys[tk(e.key.toLowerCase())]=false});
function mpos(e){const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*VW;mouse.y=(e.clientY-r.top)/r.height*VH}
cv.addEventListener('mousemove',mpos);cv.addEventListener('mousedown',e=>{mpos(e);if(e.button!==0)return;if(G&&(G.cv>=0||DRN())&&inExit()){exitView();mouse.down=false;return}mouse.down=true});
addEventListener('mouseup',()=>mouse.down=false);cv.addEventListener('contextmenu',e=>e.preventDefault());
// ---------- menu ----------
const $=id=>document.getElementById(id);
const PRIMS={A:['ar','ar2','bar','smg','sg','asg','dmr','lmg','snp'],D:['smg','sg','asg','ar','ar2','bar','dmr','lmg','snp']},SECS=['pst','mp','rev'];
const ROLE={sledge:'BREACHER',thatcher:'SUPPORT',ash:'FRAGGER',thermite:'HARD BREACH',montagne:'SHIELD',blitz:'ENTRY',rook:'ARMOR',smoke:'AREA DENIAL',kapkan:'TRAP',castle:'ANCHOR',pulse:'INTEL',doc:'SUPPORT',frost:'TRAP'};
const MD={bomb:['BOMB','Defuse the bomb on site A or B (hold E). Defenders guard the bombs and win on time or by eliminating the attackers.'],secure:['SECURE AREA','Hold the first bomb-site room of the defended pair with no defender inside until the bar fills.'],hostage:['HOSTAGE','Carry the hostage to extraction. Shoot the hostage and your team loses the round.']};
const SW={suit:['#2f5d8a','#355c3d','#a33a2b','#6c4a2b','#3d4a66','#2a2f3a','#5a6b3a','#4a3a5a','#7a3a2a','#8a7a2a','#2a5a6a','#3a6a4a'],helm:['#1c1c22','#2a1a1a','#3a3a44','#4a4030','#101820','#5a2a2a','#7a7a82','#e8e8e8'],acc:['#e0a030','#7ed0ff','#ffd27a','#ff7a1a','#ffffff','#9aff4a','#ff4a6a','#bfe6ff']};
uiSel={mapPick:0,mode:'bomb',side:'A',op:0,spawn:0,dsite:-1,prim:{},sec:{},g2:{},cust:{}};
function getOp(side,i){const b=OPS[side][i],cu=uiSel.cust[b.id],pp=uiSel.prim[b.id],ss=uiSel.sec[b.id];return{...b,c:cu?cu.slice():b.c,bid:b.id,sec:b.sw.includes(ss)?ss:b.sw[0],id:cu?b.id+'_'+cu.join('').replace(/#/g,''):b.id,w:b.id==='montagne'?b.w:(b.pw.includes(pp)?pp:b.w)}}

// ---------- operator classes, symbols, saved loadouts ----------
const SUBS={A:{BREACHER:'sledge ash thermite fuze buck hibana maverick ace flores ram',ENTRY:'twitch ying nokk capitao zofia',SHIELD:'montagne blitz blackbeard osa',INTEL:'iq jackal dokkaebi lion iana zero grim deimos solidsnake brava',SUPPORT:'striker thatcher finka rauora sens',FLANK:'nomad amaru gridlock',MARKSMAN:'glaz kali'},D:{ANCHOR:'castle rook tachanka mira goyo azami aruni sentry clash',ROAMER:'caveira vigil alibi oryx ela',INTEL:'pulse valkyrie echo maestro mozzie solis skopos',TRAP:'kapkan frost lesion smoke melusi thorn denari fenrir tubarao',COUNTER:'mute bandit kaid jager wamai warden noor',SUPPORT:'doc thunderbird'}};
const SYM={sledge:'hammer:hex',thatcher:'bolt:circle',ash:'flame:diamond',thermite:'flame:hex',montagne:'shield:hex',blitz:'shield:diamond',striker:'cube:square',twitch:'bolt:diamond',glaz:'target:circle',fuze:'bomb:hex',iq:'wifi:square',buck:'key:square',blackbeard:'shield:circle',capitao:'arrow:diamond',hibana:'mine:hex',jackal:'eye:diamond',ying:'sun:hex',zofia:'star:hex',dokkaebi:'mask:diamond',lion:'eye:circle',finka:'cross:diamond',maverick:'flame:circle',nomad:'wing:diamond',gridlock:'spike:hex',nokk:'mask:hex',amaru:'hook:hex',kali:'target:diamond',iana:'drone:circle',ace:'gear:hex',zero:'cam:hex',flores:'bomb:diamond',osa:'shield:square',sens:'ring:hex',grim:'claw:hex',brava:'lock:hex',ram:'gear:circle',deimos:'skull:hex',rauora:'cube:hex',solidsnake:'pulse:square',sentry:'shield:octa',mute:'wifi:octa',tachanka:'gun:octa',jager:'target:octa',bandit:'bolt:octa',valkyrie:'cam:octa',caveira:'skull:octa',echo:'drone:octa',mira:'cube:octa',lesion:'mine:octa',ela:'mine:tri',vigil:'eye:tri',maestro:'cam:tri',alibi:'mask:tri',clash:'shield:tri',kaid:'bolt:tri',mozzie:'wing:tri',warden:'eye:octa',goyo:'flame:tri',wamai:'ring:tri',oryx:'arrow:tri',melusi:'ring:octa',aruni:'gate:tri',thunderbird:'bird:tri',thorn:'leaf:tri',azami:'gate:octa',solis:'pulse:tri',fenrir:'fang:tri',tubarao:'snow:tri',skopos:'moon:tri',denari:'mine:square',noor:'spike:tri',rook:'cross:octa',doc:'cross:circle',smoke:'cloud:octa',kapkan:'mine:circle',castle:'gate:circle',pulse:'pulse:circle',frost:'snow:octa'};
const ci=(x,y,r)=>`M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0z`;
const GLY={hammer:'M3 3h12v6H3zM7 9h3v13H7z',bolt:'M14 2L5 14h6l-1 8 9-13h-6z',flame:'M12 2c1 5 6 7 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 2 3-5z',eye:'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z'+ci(12,12,3.5),shield:'M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z',cross:'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z',skull:'M12 2a8 8 0 0 0-8 8c0 3 1 4 3 5v5h3v-2h4v2h3v-5c2-1 3-2 3-5a8 8 0 0 0-8-8z'+ci(8.5,10,2)+ci(15.5,10,2),star:'M12 2l3 7 7 .5-5.5 4.5 2 7.5L12 17.5 5.5 21.5l2-7.5L2 9.5 9 9z',crown:'M2 18l2-11 5 5 3-8 3 8 5-5 2 11z',drone:'M3 3h5v2H5v3H3zM16 3h5v5h-2V5h-3zM3 16h2v3h3v2H3zM19 16h2v5h-5v-2h3zM9 9h6v6H9z',pulse:'M1 11h5l2-6 4 13 3-8 1 1h7v2h-8l-1-1-2 6-4-11-1 3H1z',target:ci(12,12,10)+ci(12,12,7)+ci(12,12,3),claw:'M4 3h4l-2 18H3zM10 3h4l-1 18H9zM16 3h4l-2 18h-3z',wing:'M2 6c6 0 9 3 10 8 1-5 4-8 10-8-1 8-5 12-10 14C7 18 3 14 2 6z',mine:ci(12,12,6)+'M11 1h2v5h-2zM11 18h2v5h-2zM1 11h5v2H1zM18 11h5v2h-5z',snow:'M11 1h2v22h-2zM1 11h22v2H1zM4 4l1.4-1.4 16 16L20 20zM20 4l-1.4-1.4-16 16L4 20z',cloud:'M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z',key:ci(7,12,5)+ci(7,12,2)+'M12 11h10v2h-3v3h-2v-3h-5z',gear:ci(12,12,6)+ci(12,12,2.5)+'M10 1h4v4h-4zM10 19h4v4h-4zM1 10h4v4H1zM19 10h4v4h-4z',fang:'M3 3h18l-6 9-3 10-3-10z',leaf:'M3 21C3 10 10 3 21 3c0 11-7 18-18 18z',moon:'M16 3a9 9 0 1 0 5 14 7 7 0 0 1-5-14z',sun:ci(12,12,5)+'M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4z',hook:'M11 2h2v11a5 5 0 1 1-5-5h2v2H8a3 3 0 1 0 3 3z',lock:'M6 10V7a6 6 0 0 1 12 0v3h2v12H4V10zM8.5 10h7V7a3.5 3.5 0 0 0-7 0z',wifi:ci(12,19,2)+'M4 11a11 11 0 0 1 16 0l-2 2a8 8 0 0 0-12 0zM8 15a6 6 0 0 1 8 0l-2 2a3 3 0 0 0-4 0z',bomb:ci(11,14,8)+'M16 3l3-1 2 3-3 1-3 3-2-2z',gun:'M2 8h15l2-2h3v6h-5v3h-3v-3H9l-1 8H4l1-8H2z',ring:ci(12,12,10)+ci(12,12,8)+ci(12,12,5)+ci(12,12,3),cube:'M12 2l9 5v10l-9 5-9-5V7zM12 8l-4 2 4 2 4-2z',arrow:'M12 2l9 10h-6v10H9V12H3z',cam:'M2 6h14v12H2zM16 10l6-3v10l-6-3z',mask:'M3 5h18v7c0 5-4 8-9 8s-9-3-9-8z'+ci(7.5,10,2)+ci(16.5,10,2),bird:'M2 8c5 0 8 2 10 6 2-4 5-6 10-6-3 3-4 6-4 9l-6-3-6 3c0-3-1-6-4-9z',gate:'M3 3h4v18H3zM17 3h4v18h-4zM8 6h8v3H8zM8 12h8v3H8z',spike:'M12 1l3 8 8 3-8 3-3 8-3-8-8-3 8-3z'};
const FR={hex:[[12,1],[22,6.5],[22,17.5],[12,23],[2,17.5],[2,6.5]],diamond:[[12,1],[23,12],[12,23],[1,12]],square:[[2,2],[22,2],[22,22],[2,22]],octa:[[8,1.5],[16,1.5],[22.5,8],[22.5,16],[16,22.5],[8,22.5],[1.5,16],[1.5,8]],tri:[[12,1.5],[23,21.5],[1,21.5]]};
/* Operator emblems: icons/ops/<id>.png (cut from the supplied sub-icon sheet). Faces are only a fallback while an image is still loading. */
const EMB={};let embT=0;
function embImg(id){let i=EMB[id];if(!i){i=EMB[id]=new Image();i.onload=()=>{clearTimeout(embT);embT=setTimeout(()=>{for(const k in SYMC)delete SYMC[k];try{refreshOps()}catch(e){}},80)};i.src=(window.R6EMB&&window.R6EMB[id])||'icons/ops/'+id+'.png'}return i}
const embReady=id=>{const i=embImg(id);return i.complete&&i.naturalWidth>0?i:null};
function symbol(sd,id,px){const c=mkc(px,px),x=c.getContext('2d'),ac=sd==='A'?'#ef3a42':'#c4c8d0';
 x.fillStyle='#0b1018';x.fillRect(0,0,px,px);const gr=x.createLinearGradient(0,0,0,px);gr.addColorStop(0,ac+'44');gr.addColorStop(1,ac+'00');x.fillStyle=gr;x.fillRect(0,0,px,px);
 const E=embReady(id);
 if(E){const pad=Math.round(px*.07),w=px-pad*2;x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(E,pad,pad,w,w)}
 else{x.imageSmoothingEnabled=false;const S=atlasSprites(id),sc=Math.max(1,Math.floor((px-6)/14));
  if(S){const w=14*sc,h=14*sc;x.drawImage(S.down[0],0,0,14,14,Math.round((px-w)/2),px-h-3,w,h)}}
 x.imageSmoothingEnabled=false;x.strokeStyle=ac;x.lineWidth=Math.max(2,px/28);x.strokeRect(x.lineWidth/2,x.lineWidth/2,px-x.lineWidth,px-x.lineWidth);x.fillStyle=ac;x.fillRect(0,0,Math.round(px/5),Math.round(px/14));x.fillRect(0,0,Math.round(px/14),Math.round(px/5));return c}
const SYMC={};const symURL=(sd,id,px)=>{const k=sd+id+px;if(SYMC[k])return SYMC[k];const u=symbol(sd,id,px*2).toDataURL();if(embReady(id))SYMC[k]=u;return u};
for(const id in SYM)embImg(id);
const SUBOF={};for(const sd in SUBS)for(const k in SUBS[sd])SUBS[sd][k].split(' ').forEach(id=>SUBOF[id]=k);
let LD={};try{LD=JSON.parse(localStorage.getItem('r6s_ld')||'{}')}catch(e){}
const persist=()=>{try{localStorage.setItem('r6s_ld',JSON.stringify(LD))}catch(e){}try{window.R6Acct&&R6Acct.dirty()}catch(e){}};
// account sync hook (account.js): read and replace the cloud-saved data
window.R6Data={get:()=>({settings:SET,binds:BIND,loadouts:LD}),apply(d){if(d.settings&&typeof d.settings==='object')Object.assign(SET,d.settings);SET.fog=1;if(d.binds&&typeof d.binds==='object'){Object.assign(BIND,d.binds);rkm()}if(d.loadouts&&typeof d.loadouts==='object')LD=d.loadouts;saveS();persist();try{renderSet();renderBinds();refreshOps();MUS.m&&(MUS.m.gain.value=.55*Math.max(.02,SET.mu*SET.vol))}catch(e){}}};
for(const id in LD){const l=LD[id];if(l.p)uiSel.prim[id]=l.p;if(l.s)uiSel.sec[id]=l.s;if(l.g)uiSel.g2[id]=l.g;if(l.c)uiSel.cust[id]=l.c}
const curLd=id=>({p:uiSel.prim[id]||null,s:uiSel.sec[id]||null,g:uiSel.g2[id]||null,c:uiSel.cust[id]||null});
function act(a,v,i,side,idx){const b=OPS[side][idx],id=b.id;if(a==='prim')uiSel.prim[id]=v;else if(a==='sec')uiSel.sec[id]=v;else if(a==='g2')uiSel.g2[id]=v;else if(a==='sw'){const cu=(uiSel.cust[id]||b.c).slice();cu[+i]=v;uiSel.cust[id]=cu}else if(a==='save'){LD[id]={...curLd(id),f:(LD[id]||{}).f||0};persist()}else if(a==='clear'){delete uiSel.prim[id];delete uiSel.sec[id];delete uiSel.g2[id];delete uiSel.cust[id];if((LD[id]||{}).f)LD[id]={f:1};else delete LD[id];persist()}else if(a==='fav'){LD[id]=LD[id]||{};LD[id].f=LD[id].f?0:1;persist()}}
function gridHTML(side,sel,att,val){const groups=Object.keys(SUBS[side]).map(k=>({k,ids:SUBS[side][k].split(' ')})).sort((a,b)=>b.ids.length-a.ids.length);let h='<div class="ogx">';for(const g of groups){const n=Math.min(10,g.ids.length);h+=`<div class="ogr" style="grid-column:span ${n}"><div class="sub">${g.k}<em>${g.ids.length}</em></div><div class="og" style="--n:${n}">`+g.ids.map(id=>{const i=OPS[side].findIndex(o=>o.id===id),o=OPS[side][i],l=LD[id]||{};return`<button class="ot ${sel===i?'on':''}" ${att}="${val(side,i)}" title="${o.n}"><img src="${symURL(side,id,64)}" alt=""><b>${o.n}</b>${l.f?'<i class="fv">&#9733;</i>':''}${'p' in l?'<i class="sv"></i>':''}</button>`}).join('')+'</div></div>'}return h+'</div>'}

/* fit the operator tile grid to the space it is given (no scrolling), then size the labels to the tiles */
function fitOps(){const z=(window.R6Fit&&R6Fit.zoom)||1;for(const id of['mopGrid','opList']){const c=$(id);if(!c||!c.offsetParent)continue;const g=c.querySelector('.ogx');if(!g)continue;
 g.style.width='';const cs=getComputedStyle(c),padV=(parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom))*z;
 const rows=new Set([...g.querySelectorAll('.ogr')].map(e=>Math.round(e.getBoundingClientRect().top))).size||1;
 let w=g.getBoundingClientRect().width/z;const maxW=w;
 for(let k=0;k<6;k++){g.style.width=w+'px';const over=g.getBoundingClientRect().height-(c.getBoundingClientRect().height-padV);if(over<=0.5)break;w=Math.max(300,w-10*(over/z)/rows-.5);if(w<=300)break}
 g.style.width=Math.min(w,maxW)+'px';c.style.setProperty('--tw',((Math.min(w,maxW)-72)/10)+'px')}}
window.fitOps=fitOps;
function renderOpsTab(){const sd=uiSel.msd||'A',ix=uiSel.mop||0;$('menu').className=sd;document.querySelectorAll('[data-ot]').forEach(b=>b.classList.toggle('on',b.dataset.ot===sd));$('mopGrid').innerHTML=gridHTML(sd,ix,'data-og',(q,i)=>q+':'+i);$('mopDet').innerHTML=detailHTML(sd,ix);$('mpvName').textContent=OPS[sd][ix].n;fitOps()}
function refreshOps(){renderOpsTab();if($('scrOps').style.display!=='none')renderOps()}
document.addEventListener('click',e=>{const ot=e.target.closest('[data-ot]'),og=e.target.closest('[data-og]'),x=e.target.closest('[data-x]');if(ot){uiSel.msd=ot.dataset.ot;uiSel.mop=0;renderOpsTab();sfx(760,.05,'square',.02)}if(og){const[s,i]=og.dataset.og.split(':');uiSel.msd=s;uiSel.mop=+i;renderOpsTab();sfx(760,.05,'square',.02)}if(x){act(x.dataset.x,x.dataset.v,x.dataset.i,x.dataset.sd,+x.dataset.ix);sfx(760,.05,'square',.02);refreshOps()}});

let opIv;function opTimer(on){clearInterval(opIv);if(!on)return;let n=60;$('opT').textContent='LOADOUT '+n;opIv=setInterval(()=>{n--;$('opT').textContent='LOADOUT '+Math.max(0,n);if(n<=0){clearInterval(opIv);$('deploy').click()}},1000)}
function showScr(n){opTimer(n==='ops');$('scrMain').style.display=n==='main'?'flex':'none';$('scrOps').style.display=n==='ops'?'flex':'none';$('menu').className=uiSel.side;if(n==='main')renderMain();else renderOps()}
function thumb(c,m){const x=c.getContext('2d'),tw=m.cw.reduce((a,b)=>a+b+1,0),th=m.rh.reduce((a,b)=>a+b+1,0),k=Math.min(148/tw,84/th),ox=(160-tw*k)/2,oy=(96-th*k)/2;x.fillStyle='#0b0e13';x.fillRect(0,0,160,96);let yy=oy;m.rh.forEach((h,j)=>{let xx=ox;m.cw.forEach((w,i)=>{x.fillStyle=(i+j)&1?'#2a3444':'#223041';x.fillRect(Math.round(xx),Math.round(yy),Math.round(w*k)-1,Math.round(h*k)-1);xx+=(w+1)*k});yy+=(h+1)*k});x.strokeStyle='#8a97ab';x.strokeRect(ox-1.5,oy-1.5,tw*k+2,th*k+2)}
const nRooms=m=>Object.keys(m.f[0].l).length+Object.keys(m.f[1].l).length;
function renderMaps(){const pk=uiSel.mapPick==null?'rand':uiSel.mapPick;
 $('maps').innerHTML=`<button class="mcard ${pk==='rand'?'on':''}" data-mp="rand"><div class="rnd">?</div><h4>RANDOM</h4><small>Different every match</small></button>`+MAPS.map((m,i)=>`<button class="mcard ${pk==i?'on':''}" data-mp="${i}"><img src="maps/${m.id}.png" alt="${m.n}" draggable="false"><h4>${m.n}</h4><small>${m.loc} // ${nRooms(m)} ROOMS</small></button>`).join('');
 $('selmap').innerHTML=(pk==='rand'?'<div class="rnd">?</div>':`<img src="maps/${MAPS[pk].id}.png" alt="">`)+`<h4>${pk==='rand'?'RANDOM':MAPS[pk].n}</h4><button class="ghost" data-tab="maps">CHANGE MAP</button>`}
const SD=[['AUDIO'],['vol','MASTER VOLUME','r'],['mu','MUSIC VOLUME','r'],['sv','SFX VOLUME','r'],['mus','MENU MUSIC','t'],['DISPLAY'],['xs','CROSSHAIR','o',['OFF','CROSS','DOT','RING']],['xc','CROSSHAIR COLOUR','o',['WHITE','GREEN','ORANGE','CYAN']],['shake','SCREEN SHAKE','r'],['hurt','DAMAGE FLASH','t'],['mini','MINIMAP','t'],['feed','KILL FEED','t'],['fps','FPS COUNTER','t'],['GAMEPLAY'],['diff','BOT DIFFICULTY','o',['EASY','NORMAL','HARD']]];
function setHTML(){let out='',open=false;const cls={AUDIO:'sg-a',DISPLAY:'sg-d',GAMEPLAY:'sg-g'};
 for(const d of SD){if(d.length===1){if(open)out+='</div>';out+=`<div class="sg ${cls[d[0]]||''}"><div class="sec">${d[0]}</div>`;open=true;continue}
  const[k,n,t,o]=d;let c;if(t==='r'){const sc=k==='shake'?50:100;c=`<input type="range" min="0" max="100" value="${Math.round(SET[k]*sc)}" data-rng="${k}"><b class="val">${Math.round(SET[k]*sc)}</b>`}else if(t==='t')c=`<button class="sw2 ${(k==='mus'?MUS.on:SET[k])?'on':''}" data-set="${k}"><i></i></button>`;else c='<div class="chips">'+o.map((x,i)=>`<button class="chip ${SET[k]===i?'on':''}" data-opt="${k}:${i}">${x}</button>`).join('')+'</div>';out+=`<div class="row"><span>${n}</span><div class="rc">${c}</div></div>`}
 if(open)out+='</div>';return out+'<button class="ghost sg-r" data-sreset="1" style="margin-top:14px">RESET SETTINGS</button>'}
function renderSet(){$('setMain').innerHTML=$('setPause').innerHTML=setHTML()}
function toggleMusic(){MUS.on=!MUS.on;$('mus2').textContent='MUSIC: '+(MUS.on?'ON':'OFF');if(MUS.on)musicStart();else musicStop()}
const AN={up:'MOVE UP',down:'MOVE DOWN',left:'MOVE LEFT',right:'MOVE RIGHT',sprint:'SPRINT (HOLD)',walk:'SLOW WALK (HOLD)',map:'ENLARGE MAP (TOGGLE)',use:'DEFUSE / GRAB',barr:'BUILD BARRICADE / REINFORCE (HOLD)',crow:'CROWBAR (HOLD)',rap:'RAPPEL / KICK WINDOW (HOLD)',reload:'RELOAD',w1:'PRIMARY WEAPON',w2:'SECONDARY WEAPON',gad:'OPERATOR GADGET',gad2:'SECONDARY GADGET',cam:'CAMERAS',lnl:'LEAN LEFT (HOLD)',lnr:'LEAN RIGHT (HOLD)',ping:'PING / TAG',pause:'PAUSE',ff:'FAST FORWARD (SPECTATE)'};
const kn=k=>k===' '?'SPACE':k.toUpperCase();
function renderBinds(){$('binds').innerHTML='<div class="lbl">KEY BINDINGS &mdash; CLICK A KEY TO REMAP</div>'+Object.keys(AN).map(a=>`<div class="row"><span>${AN[a]}</span><button class="kb ${REB===a?'wait':''}" data-bind="${a}">${REB===a?'PRESS A KEY...':kn(BIND[a])}</button></div>`).join('')+'<button class="ghost" data-breset="1" style="margin-top:14px">RESET CONTROLS</button>';$('kchips').innerHTML=Object.keys(AN).filter(a=>a!=='pause'&&a!=='ff').map(a=>`<span class="kc" id="kc-${a}">${AN[a].split(' ')[0]} <b>${kn(BIND[a])}</b></span>`).join('')}
const lit=a=>{const e=$('kc-'+a);if(e){e.classList.add('hit');setTimeout(()=>e.classList.remove('hit'),350)}};
document.addEventListener('click',e=>{const t=e.target.closest('[data-tab]'),q=e.target.closest('[data-set]'),o=e.target.closest('[data-opt]'),b=e.target.closest('[data-bind]');
 if(t){document.querySelectorAll('#tabs button:not(.gear)').forEach(x=>x.classList.toggle('on',x.dataset.tab===t.dataset.tab));document.querySelectorAll('.tp').forEach(p=>p.hidden=p.id!=='tp-'+t.dataset.tab);if(t.dataset.tab==='set')renderSet();if(t.dataset.tab==='ctl')renderBinds();if(t.dataset.tab==='ops')renderOpsTab();sfx(620,.04,'square',.02)}
 if(q){const k=q.dataset.set;if(k==='mus')toggleMusic();else SET[k]=SET[k]?0:1;saveS();renderSet()}
 if(o){const[k,i]=o.dataset.opt.split(':');SET[k]=+i;saveS();renderSet()}
 if(e.target.closest('[data-sreset]')){Object.assign(SET,SDF);saveS();renderSet()}
 if(e.target.closest('[data-breset]')){Object.assign(BIND,DEFB);rkm();saveS();REB=null;renderBinds()}
 if(b){REB=b.dataset.bind;renderBinds()}});
document.addEventListener('keydown',e=>{if(!REB)return;e.preventDefault();e.stopImmediatePropagation();const k=e.key.toLowerCase();if(k!=='escape'||REB==='pause'){const old=BIND[REB],clash=Object.keys(BIND).find(a=>a!==REB&&BIND[a]===k);if(clash)BIND[clash]=old;BIND[REB]=k;rkm();saveS()}REB=null;renderBinds()},true);
document.addEventListener('input',e=>{const r=e.target.dataset.rng;if(r){SET[r]=e.target.value/(r==='shake'?50:100);e.target.nextElementSibling.textContent=e.target.value;saveS();if(MUS.m)MUS.m.gain.value=.55*Math.max(.02,SET.mu*SET.vol)}});
function setPause(on){PAUSED=on;$('pause').style.display=on?'flex':'none';if(on)renderSet()}
$('pRes').onclick=()=>setPause(false);let pqT=0;$('pQuit').onclick=()=>{if(!pqT){$('pQuit').textContent='CLICK AGAIN TO EXIT';pqT=setTimeout(()=>{pqT=0;$('pQuit').textContent='EXIT MATCH'},2500);return}clearTimeout(pqT);pqT=0;$('pQuit').textContent='EXIT MATCH';setPause(false);$('over').style.display='none';toMenu(false)};
$('gmenu').onclick=()=>{if(G&&$('menu').style.display==='none')setPause(!PAUSED)};
$('mus2').onclick=toggleMusic;renderSet();
function xhair(){cv.style.cursor=SET.xs?'none':'crosshair';const me=G.me;if(SET.xs&&me.alive&&!PAUSED){const x=Math.round(mouse.x),y=Math.round(mouse.y),c=['#ffffff','#4aff7a','#ef3a42','#3fe0ff'][SET.xc];if(window.CXR&&CXR.xhair(g,x,y)){}else{g.fillStyle=c;if(SET.xs===1){g.fillRect(x-6,y,4,1);g.fillRect(x+3,y,4,1);g.fillRect(x,y-6,1,4);g.fillRect(x,y+3,1,4)}else if(SET.xs===2)g.fillRect(x-1,y-1,3,3);else{g.strokeStyle=c;g.beginPath();g.arc(x+.5,y+.5,5,0,7);g.stroke()}}}if(me.alive&&!PAUSED&&(G.cv>=0||DRN())&&pingHover()){const x=Math.round(mouse.x),y=Math.round(mouse.y);g.fillStyle='#ff4a4a';for(const sx of[-1,1])for(const sy of[-1,1]){g.fillRect(x+sx*9-(sx<0?0:2),y+sy*9,3,1);g.fillRect(x+sx*9,y+sy*9-(sy<0?0:2),1,3)}}
 if(SET.fps)T8(Math.round(FPS)+' FPS',VW-6,VH2-12,'#8fa3bf','right')}
// ---------- test range ----------
const RG={x:160,y:100,a:0,mag:30,rl:0,sel:0,b:[],tg:[],m:{x:200,y:100}};for(let i=0;i<4;i++)RG.tg.push({x:40+Math.random()*240,y:30+Math.random()*130,h:0});
const rc=$('rng'),rx=rc.getContext('2d');rc.addEventListener('mousemove',e=>{const r=rc.getBoundingClientRect();RG.m.x=(e.clientX-r.left)/r.width*320;RG.m.y=(e.clientY-r.top)/r.height*190});
rc.addEventListener('mousedown',()=>{if(RG.rl>0||RG.mag<=0)return;RG.mag--;RG.b.push({x:RG.x,y:RG.y,vx:Math.cos(RG.a)*6,vy:Math.sin(RG.a)*6,t:50});sfx(300,.05,'square',.02)});
addEventListener('keydown',e=>{if($('tp-ctl').hidden||$('scrMain').style.display==='none'||REB)return;const k=tk(e.key.toLowerCase()),A=Object.keys(DEFB).find(a=>DEFB[a]===k);if(!A)return;lit(A);if(k===' '||k==='tab')e.preventDefault();if(A==='reload'){RG.rl=60;RG.mag=30}if(A==='w1')RG.sel=0;if(A==='w2')RG.sel=1;if(A==='gad'||A==='gad2')RG.ring=18});
setInterval(()=>{if($('tp-ctl').hidden||$('scrMain').style.display==='none')return;const sp=keys.shift?2.1:keys.alt?.7:1.6;let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0);if(dx||dy){const l=Math.hypot(dx,dy);RG.x=cl(RG.x+dx/l*sp,8,312);RG.y=cl(RG.y+dy/l*sp,8,182);['up','down','left','right'].forEach(a=>{if(keys[DEFB[a]])lit(a)});if(keys.shift)lit('sprint');if(keys.alt)lit('walk')}if(keys.e)lit('use');
 RG.a=Math.atan2(RG.m.y-RG.y,RG.m.x-RG.x);if(RG.rl>0)RG.rl--;RG.b.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.t--;for(const t of RG.tg)if(Math.hypot(t.x-b.x,t.y-b.y)<9){t.h=12;b.t=0;t.x=30+Math.random()*260;t.y=25+Math.random()*140}});RG.b=RG.b.filter(b=>b.t>0);
 rx.fillStyle='#0c1118';rx.fillRect(0,0,320,190);rx.strokeStyle='#1c2531';for(let i=0;i<320;i+=16){rx.beginPath();rx.moveTo(i+.5,0);rx.lineTo(i+.5,190);rx.stroke()}for(let i=0;i<190;i+=16){rx.beginPath();rx.moveTo(0,i+.5);rx.lineTo(320,i+.5);rx.stroke()}
 for(const t of RG.tg){if(t.h>0)t.h--;rx.fillStyle=t.h?'#fff':'#c9402a';rx.beginPath();rx.arc(t.x,t.y,7,0,7);rx.fill();rx.fillStyle='#0c1118';rx.beginPath();rx.arc(t.x,t.y,3,0,7);rx.fill()}
 rx.fillStyle='#ffe9a0';RG.b.forEach(b=>rx.fillRect(b.x,b.y,2,2));if(RG.ring){rx.strokeStyle='#ef3a42';rx.beginPath();rx.arc(RG.x,RG.y,26-RG.ring,0,7);rx.stroke();RG.ring--}
 rx.fillStyle='#ef3a42';rx.beginPath();rx.arc(RG.x,RG.y,7,0,7);rx.fill();rx.strokeStyle='#fff';rx.beginPath();rx.moveTo(RG.x,RG.y);rx.lineTo(RG.x+Math.cos(RG.a)*14,RG.y+Math.sin(RG.a)*14);rx.stroke();
 rx.fillStyle='#8a97ab';rx.font='9px monospace';rx.fillText((RG.sel?'SECONDARY ':'PRIMARY ')+(RG.rl?'RELOADING':RG.mag+'/30'),6,12)},16);
// ---------- hero ----------
let hT=0,hOp=(Math.random()*39)|0;setInterval(()=>{if($('tp-play').hidden||$('scrMain').style.display==='none')return;hT++;if(hT%70===0)hOp=(hOp+1)%OPS[uiSel.side||'A'].length;const c=$('hero'),x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,240,280);const sd=uiSel.side||'A',acc=sd==='A'?'#ef3a42':'#c4c8d0',gr=x.createRadialGradient(120,190,10,120,190,105);gr.addColorStop(0,acc+'55');gr.addColorStop(1,acc+'00');x.fillStyle=gr;x.fillRect(0,0,240,280);const S=spritesFor(getOp(sd,hOp%OPS[sd].length)),by=Math.round(Math.sin(hT/4)*2);x.drawImage(S.down[0],57,50+by,126,162)},110);
document.addEventListener('click',e=>{const t=e.target.closest('[data-mp]');if(t){uiSel.mapPick=t.dataset.mp;renderMaps()}});
function renderMain(){renderMaps();$('modes').innerHTML=Object.keys(MD).map(k=>`<button class="card ${uiSel.mode===k?'on':''}" data-m="${k}"><h3>${MD[k][0]}</h3><p>${MD[k][1]}</p></button>`).join('');
 $('sides').innerHTML='<div class="ctl"><b>SIDE IS RANDOM.</b> You are assigned attack or defence when you open operator selection.</div>'}
function renderOps(){const side=uiSel.side;$('menu').className=side;$('opsHead').textContent=MODES[uiSel.mode]+'  //  '+(side==='A'?'ATTACKERS':'DEFENDERS')+'  //  '+MAPS[uiSel.mapIdx||0].n;
 $('opList').innerHTML=gridHTML(side,uiSel.op,'data-o',(q,i)=>i);renderDetail();fitOps()}
function detailHTML(side,idx){const b=OPS[side][idx],op=getOp(side,idx),w=WP[op.w],g2=uiSel.g2[b.id]||G2[side][0];
 const dots=(n)=>[1,2,3].map(i=>`<i class="${i<=n?'f':''}"></i>`).join(''),bar=(n,v)=>`<div class="st"><span>${n}</span><i><b style="width:${Math.round(cl(v,0,1)*100)}%"></b></i></div>`,arm=b.hp<=100?1:b.hp<=130?2:3,spd=b.sp<=.9?1:b.sp<=1.1?2:3;
 const mi=uiSel.mapIdx||0,md=MAPS[mi];let dep=`<div class="depl"><img class="mapic" src="maps/${md.id}.png" alt=""><div><div class="lbl">${md.n} // ${md.loc}</div>`;
 if(side==='A')dep+=`<div class="lbl">SPAWN POINT</div><div class="chips">`+md.spawns.map((q,k)=>`<button class="chip ${(uiSel.spawn||0)===k?'on':''}" data-dp="spawn:${k}">${q[0]}</button>`).join('')+`</div>`;
 else dep+=`<div class="lbl">DEFEND SITE (YOU SPAWN THERE)</div><div class="chips">`+md.pairs.map((q,k)=>`<button class="chip ${uiSel.dsite===k?'on':''}" data-dp="site:${k}">${pairFloor(mi,k)} ${pairLabel(mi,k)}</button>`).join('')+`<button class="chip ${uiSel.dsite>=0?'':'on'}" data-dp="site:-1">RANDOM</button></div>`;
 dep+=`</div></div>`;
 let h=dep+'<div class="dgA">'+`<div class="dn">${b.n}</div><div class="rs"><span class="sd">${side==='A'?'ATTACK':'DEFENCE'} // ${SUBOF[b.id]}</span><span>ARMOR <span class="dots">${dots(arm)}</span></span><span>SPEED <span class="dots">${dots(spd)}</span></span></div>`+`<div class="gad"><div class="gi">${(b.gd||'--').slice(0,3).toUpperCase()}</div><div><div class="gn">${ROLE[b.id]||b.r}</div><div class="gt">${b.t}</div></div></div>`;
 h+=`<div class="lbl">SECONDARY GADGET</div><div class="chips">`+G2[side].map(k=>`<button class="chip ${g2===k?'on':''}" data-x="g2" data-sd="${side}" data-ix="${idx}" data-v="${k}">${G2N[k]}</button>`).join('')+`</div><div class="gt">${G2T[g2]}</div>`;
 h+='</div><div class="dgB">';
 h+=`<div class="lbl">PRIMARY WEAPON</div><div class="chips">`+(b.id==='montagne'?'<span class="chip on">SHIELD + PISTOL</span>':b.pw.map(k=>`<button class="chip ${op.w===k?'on':''}" data-x="prim" data-sd="${side}" data-ix="${idx}" data-v="${k}">${WP[k].n.toUpperCase()}</button>`).join(''))+`</div>`+bar('DAMAGE',w.dmg*w.pel/70)+bar('FIRE RATE',5/w.cd)+bar('RANGE',w.rng/300);
 h+=`<div class="lbl">SECONDARY WEAPON</div><div class="chips">`+b.sw.map(k=>`<button class="chip ${op.sec===k?'on':''}" data-x="sec" data-sd="${side}" data-ix="${idx}" data-v="${k}">${WP[k].n.toUpperCase()}</button>`).join('')+`</div>`;
   const sv=LD[b.id],cur=JSON.stringify(curLd(b.id)),svd=sv&&'p' in sv?JSON.stringify({p:sv.p,s:sv.s,g:sv.g,c:sv.c}):null,st=svd===null?(cur==='{"p":null,"s":null,"g":null,"c":null}'?'DEFAULT':'NOT SAVED'):(svd===cur?'SAVED':'UNSAVED CHANGES'),X=`data-sd="${side}" data-ix="${idx}"`,cc=uiSel.cust[b.id]||b.c;
 h=h.replace('<div class="dgA">','<div class="dgA"><img class="bigsym" src="'+symURL(side,b.id,56)+'" alt="">');
  h+=`<div class="lbl">SAVED PREFERENCES // ${st}</div><div class="chips"><button class="chip on" data-x="save" ${X}>SAVE LOADOUT</button><button class="chip" data-x="clear" ${X}>RESET TO DEFAULT</button><button class="chip ${sv&&sv.f?'on':''}" data-x="fav" ${X}>&#9733; FAVOURITE</button></div><div class="gt">Saved loadouts load every time you open the game. A favourite is selected first when operator selection opens on its side.</div>`;
 return h+'</div>'}
function renderDetail(){$('detail').innerHTML=detailHTML(uiSel.side,uiSel.op)}
let pvT=0;function drawPv(){if($('scrOps').style.display==='none')return;pvT++;const c=$('pv'),x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,240,280);
 const side=uiSel.side,op=getOp(side,uiSel.op),acc=side==='A'?'#ef3a42':'#c4c8d0',gr=x.createRadialGradient(120,200,10,120,200,130);gr.addColorStop(0,acc+'66');gr.addColorStop(1,acc+'00');x.fillStyle=gr;x.fillRect(0,0,240,280);
 x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.ellipse(120,214,52,14,0,0,7);x.fill();x.strokeStyle=acc;x.lineWidth=2;x.beginPath();x.ellipse(120,214,58,17,0,0,7);x.stroke();
 const ph=(pvT>>4)&3,d=['down','side','up','side'][ph],flip=ph===3,S=spritesFor(op,true),by=Math.round(Math.sin(pvT/5)*2);
 x.save();x.translate(120,172+by);if(flip)x.scale(-1,1);x.drawImage(S[d][0],-63,-108,126,162);
 if(d==='side'){const L=(GL[op.w]||6)*7;x.fillStyle='#15161a';x.fillRect(20,-12,L,12);x.fillStyle='#5a606a';x.fillRect(28,-12,12,4)}x.restore();
 $('pvName').textContent=op.n+'  /  '+WP[op.w].n.toUpperCase()}
setInterval(drawPv,110);
let mpT=0;setInterval(()=>{if($('tp-ops').hidden||$('scrMain').style.display==='none')return;mpT++;const c=$('mpv'),x=c.getContext('2d'),sd=uiSel.msd||'A',op=getOp(sd,uiSel.mop||0),ac=sd==='A'?'#ef3a42':'#c4c8d0';x.imageSmoothingEnabled=false;x.clearRect(0,0,240,280);const gr=x.createRadialGradient(120,200,10,120,200,130);gr.addColorStop(0,ac+'66');gr.addColorStop(1,ac+'00');x.fillStyle=gr;x.fillRect(0,0,240,280);x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.ellipse(120,214,52,14,0,0,7);x.fill();x.strokeStyle=ac;x.lineWidth=2;x.beginPath();x.ellipse(120,214,58,17,0,0,7);x.stroke();x.drawImage(spritesFor(op).down[0],57,52+Math.round(Math.sin(mpT/5)*2),126,162)},110);
document.addEventListener('click',e=>{const t=e.target.closest('[data-a],[data-m],[data-s],[data-o]');if(!t)return;sfx(760,.05,'square',.02);const b=OPS[uiSel.side][uiSel.op];
 if(t.dataset.m){uiSel.mode=t.dataset.m;renderMain()}else if(t.dataset.s){uiSel.side=t.dataset.s;uiSel.op=0;$('menu').className=uiSel.side;renderMain()}else if(t.dataset.o){uiSel.op=+t.dataset.o;renderOps()}
 else if(t.dataset.a==='prim'){uiSel.prim[b.id]=t.dataset.v;renderOps()}else if(t.dataset.a==='sec'){uiSel.sec[b.id]=t.dataset.v;renderOps()}else if(t.dataset.a==='g2'){uiSel.g2[b.id]=t.dataset.v;renderDetail()}
 else if(t.dataset.a==='sw'){const cu=(uiSel.cust[b.id]||b.c).slice();cu[+t.dataset.i]=t.dataset.v;uiSel.cust[b.id]=cu;renderOps()}else if(t.dataset.a==='reset'){delete uiSel.cust[b.id];renderOps()}});
$('toOps').onclick=()=>{uiSel.between=0;uiSel.spawn=0;uiSel.dsite=-1;uiSel.mapIdx=(uiSel.mapPick==null||uiSel.mapPick==='rand')?Math.random()*MAPS.length|0:+uiSel.mapPick;uiSel.side=Math.random()<.5?'A':'D';uiSel.op=Math.max(0,OPS[uiSel.side].findIndex(o=>(LD[o.id]||{}).f));sfx(500,.1,'square',.03);showScr('ops')};$('back').onclick=()=>{if(uiSel.between){G=null;toMenu()}else showScr('main')};
const _sh=showScr;showScr=function(n){_sh(n);$('back').innerHTML=uiSel.between&&n==='ops'?'&#9666; QUIT MATCH':'&#9666; BACK'};
function continueMatch(){$('menu').style.display='none';$('load').style.display='none';musicStop();uiSel.between=0;newRound()}
function startMatch(){MS={};uiSel.between=0;score=[0,0];rnd=1;$('menu').style.display='none';$('load').style.display='none';musicStop();newRound()}
$('deploy').onclick=startMatch;
const TIPS=['Hold Z or V to lean left or right and peek around corners. You see and shoot from your head, but enemies can see and hit it too.','Press T (or right click from a drone or cam) to ping. Your bots decide for themselves whether to respond.','Green arrows are stairs between the two floors. Each map has four bomb-site pairs; defenders pick which pair they defend.','Attackers: you get 2 ground drones that last the whole round. Press C to drive one, C again for the next, or hit EXIT VIEW (or Backspace). Click tags defenders, right click pings a spot (T pings from anywhere). Defenders will shoot them.','Drones roll on the floor: they cannot fly through windows, but they can drive up and down the green stair tiles. Mark defenders in prep, then keep scouting.','Defenders: click soft walls in prep to reinforce them. Nine per team.','Reinforced steel only opens to Thermite. Plan your entry around it.','Attackers: hold E next to a bomb on site A or B to defuse it. Progress drains if you let go or get pushed off.','Defenders: stand in front of a doorway and press B (or click it in prep) to barricade it. Barricades block movement and sight but can be shot, blasted or smashed.','Pulse sees heartbeats through walls. Flank carefully.','Shoot soft walls to open sightlines. Drywall cracks before it breaks.'];
function showLoading(cb,fast){const L=$('load');L.style.display='flex';const mdat=MAPS[uiSel.mapIdx||0];$('limg').src='maps/'+mdat.id+'.png';$('lmap').textContent=mdat.n;$('lloc').textContent=mdat.loc;$('lrnd').textContent=(fast||rnd>1?'ROUND '+rnd+' OF 5':'ROUND 1 OF 5')+'  //  ATK '+(uiSel.side==='A'?score[0]:score[1])+' - '+(uiSel.side==='A'?score[1]:score[0])+' DEF';
 $('lspawn').textContent=uiSel.side==='A'?'SPAWN: '+mdat.spawns[uiSel.spawn||0][0]:'DEFENDING: '+pairLabel(uiSel.mapIdx||0,uiSel.dsite>=0?uiSel.dsite:0)+(uiSel.dsite>=0?'':' (RANDOM SITE)');$('lmode').textContent=MODES[uiSel.mode]+'  //  '+(uiSel.side==='A'?'YOU ATTACK':'YOU DEFEND');
 const fill=(el,sd)=>el.innerHTML=[0,1,2,3,4].map(i=>'<div>'+(sd===uiSel.side&&i===0?'YOU // '+OPS[sd][uiSel.op].n:'AI OPERATOR')+'</div>').join('');fill($('lnA'),'A');fill($('lnD'),'D');
 $('ltip').innerHTML='<b>TIP</b>'+TIPS[Math.random()*TIPS.length|0];let p=0;const iv=setInterval(()=>{p=Math.min(100,p+(fast?14:4)+Math.random()*(fast?10:9));$('lbar').style.width=p+'%';$('lpc').textContent=Math.round(p)+'%';if(p>=100){clearInterval(iv);setTimeout(()=>{L.style.display='none';cb()},250)}},120)}
$('deploy').onclick=()=>{opTimer(0);$('menu').style.display='none';showLoading(uiSel.between?continueMatch:startMatch,!!uiSel.between)};

function toMenu(ops){G=null;score=[0,0];rnd=1;uiSel.between=0;$('menu').style.display='block';showScr(ops?'ops':'main');musicStart()}

addEventListener('pointerdown',()=>{if(!G)musicStart()});addEventListener('keydown',()=>{if(!G)musicStart()});
showScr('main');try{document.fonts.load('8px Silkscreen')}catch(e){}

// ---------- drones v2 (ground, 2 per attacker, whole round) + bot setup like a player ----------
const DR_R=6,DR_SP=1.5,DR_HP=40,FLYD={twitch:'SHOCK DRONE',brava:'KLUDGE DRONE'};
function mkDrone(e,n,fly,force){const hp=fly?25:DR_HP,d={x:e.x,y:e.y,a:e.a||-PI/2,hp,mhp:hp,alive:1,fly:fly?1:0,roll:0,cd:0,n,hit:0,own:e,ctrl:e};if(fly)d.nm=FLYD[e.op.bid];
 const a=e.a||0;let ok=false;for(const[ox,oy]of[[Math.cos(a)*10,Math.sin(a)*10],[0,-10],[0,10],[10,0],[-10,0],[7,7],[-7,-7],[0,0]])if(dOK(d,e.x+ox,e.y+oy)){d.x=e.x+ox;d.y=e.y+oy;ok=true;break}
 return ok||force?d:null}
// every attacker (you and the bots) starts with drone 1 only; drone 2 is stowed (e.dr2) and deployed later from the operator, action phase only
function mkDrones(){for(const e of G.ents){if(e.side!=='A')continue;e.dr2=1;G.drones.push(mkDrone(e,1,0,1));if(!e.bot&&FLYD[e.op.bid])G.drones.push(mkDrone(e,3,1,1))}}
function deployDrone2(e){if(!e.dr2||!e.alive||G.phase!=='act')return null;const d=mkDrone(e,2,0);if(!d)return null;e.dr2=0;G.drones.push(d);G.ring.push({x:d.x,y:d.y,r:2,c:'#6aff9a'});sfx(520,.12,'triangle',.05);return d}
// ownership vs control: d.own never changes, d.ctrl is who can drive it. A future takeover ability only has to call droneTake().
function droneTake(d,e){if(!d||!d.alive)return;if(G.drones[G.dc]===d&&d.ctrl===G.me&&e!==G.me)G.dc=-1;d.ctrl=e}
function dOK(d,x,y){const r=DR_R;for(const[ox,oy]of[[-r,-r],[r,-r],[-r,r],[r,r]]){const X=x+ox,Y=y+oy,t=tileAt(X,Y);
  if(d.fly){if(solid(t)){const tx=X/T|0,ty=Y/T|0;if(!(t===3&&(tx===BX0||tx===BX1||ty===BY0||ty===BY1)))return false}}else if(blk(t))return false}return true}
function driveDrone(d,dx,dy){if(d.ctrl!==G.me)return;const s=DR_SP*(keys.alt?.5:1)*(d.fly?1.15:1);
 if(dx||dy){d.a=turn(d.a,Math.atan2(dy,dx),.25);if(dOK(d,d.x+dx*s,d.y)){d.x+=dx*s;d.roll+=Math.abs(dx*s)}if(dOK(d,d.x,d.y+dy*s)){d.y+=dy*s;d.roll+=Math.abs(dy*s)}}
 if((keys[' ']||mouse.down)&&!inExit()){tagNear(d);if(d.fly)dronePower(d)}}
function droneStairs(d){if(tileAt(d.x,d.y)===8){if(!d.onst){const q=STP[(d.y/T|0)*W+(d.x/T|0)];if(q!==undefined){d.x=(q%W)*T+8;d.y=((q/W)|0)*T+8;d.onst=1;G.ring.push({x:d.x,y:d.y,r:2,c:'#6aff9a'});if(G.drones[G.dc]===d){sfx(440,.12,'triangle',.04);G.msg='DRONE '+d.n+': '+(d.y>=OY*T?'FLOOR 2':'FLOOR 1')}}}}else d.onst=0}
function updDrones(){for(const d of G.drones){if(!d.alive)continue;d.cd>0&&d.cd--;d.hit>0&&d.hit--;droneStairs(d)}}
function hurtDrone(d,dmg,src){if(!d.alive)return;d.hp-=dmg;d.hit=6;boom(d.x,d.y,3,'#8fa3bf');
 if(d.hp<=0){d.alive=0;boom(d.x,d.y,16,'#8fa3bf');G.ring.push({x:d.x,y:d.y,r:2,c:'#ff8030'});sfx(200,.25,'square',.06);G.feed.push({t:360,s:(src?src.nm:'ENEMY')+' x DRONE '+d.n,c:'#c4c8d0'});
  if(G.drones[G.dc]===d){G.dc=-1;G.msg='DRONE '+d.n+' DESTROYED'}}}
function viewSlots(){const me=G.me,S=[],own=n=>G.drones.find(d=>d.own===me&&d.n===n);
 const d1=own(1);if(d1&&d1.alive)S.push(d1);
 const d2=own(2);if(d2){if(d2.alive)S.push(d2)}else if(me.dr2)S.push('st');
 const d3=own(3);if(d3&&d3.alive)S.push(d3);
 for(const d of G.drones)if(d.alive&&d.own!==me&&d.own.side===me.side)S.push(d);
 return S}
function cycleDrone(){const me=G.me,S=viewSlots();if(!S.length){G.msg='NO DRONES LEFT';return}
 const cur=G.dc>=0?G.drones[G.dc]:null;let i=cur?S.indexOf(cur):-1,note='';
 for(;;){i++;if(i>=S.length){G.dc=-1;G.msg=note||'DRONE VIEW OFF';return}
  const s=S[i];
  if(s==='st'){if(G.phase!=='act'){note='DRONE 2: ACTION PHASE ONLY';continue}const d=deployDrone2(me);if(!d){note='NO ROOM TO DEPLOY DRONE 2';continue}G.dc=G.drones.indexOf(d);G.msg='DRONE 2 DEPLOYED';return}
  G.dc=G.drones.indexOf(s);G.msg=s.own===me?'DRONE '+s.n+(s.fly?' ('+s.nm+')':''):s.own.nm+' DRONE '+s.n+(s.ctrl===me?'':' (VIEW ONLY)');return}}
function dronePower(d){const me=G.me;if(d.cd>0)return;const id=me.op.bid;
 if(id==='twitch'){let b=null,bd=28;for(const e of G.ents)if(e.alive&&e.side==='D'){const q=dst(d.x,d.y,e.x,e.y);if(q<bd&&los(d.x,d.y,e.x,e.y)){b=e;bd=q}}
  const n0=G.traps.length;G.traps=G.traps.filter(t=>dst(t.x,t.y,d.x,d.y)>28);if(b)hurt(b,20,undefined,me);
  if(b||G.traps.length<n0){d.cd=150;G.ring.push({x:d.x,y:d.y,r:2,c:'#7ed0ff'});sfx(1100,.1,'sawtooth',.05)}}
 else if(id==='brava'){const n0=G.traps.length;G.traps=G.traps.filter(t=>dst(t.x,t.y,d.x,d.y)>45);
  if(G.traps.length<n0){d.cd=120;G.ring.push({x:d.x,y:d.y,r:2,c:'#ffb050'});sfx(600,.15,'sine',.05)}}}
function drawDrone(d){const x=d.x,y=d.y,b=Math.sin(G.t/5)>0,act=CD()===d&&DRN();
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y+3,9,4,0,0,7);g.fill();
 g.save();g.translate(x,y);g.rotate(d.a);
 if(window.CXR&&CXR.droneArt&&CXR.droneArt(g,d,b)){}else if(d.fly){g.fillStyle='#050608';g.fillRect(-6,-6,12,12);g.fillStyle='#39414e';g.fillRect(-4,-4,8,8);g.fillStyle='#7ed0ff';g.fillRect(-2,-2,4,4);for(const[a,c]of[[-6,-6],[3,-6],[-6,3],[3,3]]){g.fillStyle=b?'#8fa3bf':'#59616d';g.fillRect(a,c,3,3)}}
 else{g.fillStyle='#3c4a3a';g.fillRect(-3,-5,6,10);g.fillStyle='#2b352b';g.fillRect(-3,-5,2,10);
  for(const sy of[-8,5]){g.fillStyle=d.hit>0?'#fff':'#171c19';g.fillRect(-4,sy,8,3);g.fillStyle='#4a574d';for(let i=0;i<4;i++){const px=((i*2+(d.roll*.5|0))%8)-4;g.fillRect(px,sy,1,3)}}
  for(let i=0;i<6;i++){g.fillStyle=(b||i%2)?'#ff3a3a':'#a01818';g.fillRect(0,-4+i*1.5+(i>2?1:0),1,1)}}
 g.restore();
 T8(d.own===G.me?String(d.n):d.own.nm+' '+d.n,x,y-17,act?'#ef3a42':'#9aa4b0','center');if(act){g.strokeStyle='#ef3a42';g.lineWidth=1;g.strokeRect(Math.round(x)-9.5,Math.round(y)-9.5,19,19)}}
// ---- attacker bots use their drones like a player: stand still, drive, tag defenders ----
function autoDrive(d,gx,gy){const f=field((gy/T|0)*W+(gx/T|0),2),tx=d.x/T|0,ty=d.y/T|0,cur=f[ty*W+tx];
 if(cur===undefined||cur>=1e4)return -1;if(dst(d.x,d.y,gx,gy)<10)return 1;
 let best=null,bv=cur;for(const[dx,dy]of D4){const nx=tx+dx,ny=ty+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const v=f[ny*W+nx];if(v<bv){bv=v;best=[nx,ny]}}
 let ax=best?best[0]*T+8:gx,ay=best?best[1]*T+8:gy;if(d.ctr>0){d.ctr--;ax=tx*T+8;ay=ty*T+8}
 const a=Math.atan2(ay-d.y,ax-d.x),sp=DR_SP*.9,dx=Math.cos(a)*sp,dy=Math.sin(a)*sp;let mv=0;d.a=turn(d.a,a,.25);
 if(dOK(d,d.x+dx,d.y)){d.x+=dx;mv+=Math.abs(dx)}if(dOK(d,d.x,d.y+dy)){d.y+=dy;mv+=Math.abs(dy)}d.roll+=mv;
 if(mv<.05){if(++d.stk>30){d.ctr=14;d.stk=0}}else d.stk=0;return 0}
function botDroneTag(d){let b=null,bd=1e9;for(const o of G.ents)if(o.alive&&o.side==='D'&&o.tag<100){const q=dst(d.x,d.y,o.x,o.y);if(q<150&&q<bd&&los(d.x,d.y,o.x,o.y)&&!inSmoke(o.x,o.y)){b=o;bd=q}}
 if(!b){d.tg=0;return}if(++d.tg<[4,3,2][SET.diff])return;d.tg=0;
 if(d.own.side===G.me.side)tagE(b);else{b.tag=900;if(b===G.me)G.msg='TAGGED BY ENEMY DRONE'}}
function botDroning(e){if(!e.alive||e.stun>0||e.hurtT>0)return false;const act=G.phase==='act';
 if(act&&(14400-G.t>=e.dl||G.ents.some(o=>o.alive&&o.side==='D'&&dst(e.x,e.y,o.x,o.y)<200&&los(e.x,e.y,o.x,o.y))))return false;
 let d=null;
 if(act&&e.dr2&&14400-G.t>25)deployDrone2(e);
 if(act)d=G.drones.find(q=>q.own===e&&q.ctrl===e&&q.n===2&&q.alive);
 if(!d)d=G.drones.find(q=>q.own===e&&q.ctrl===e&&q.n===1&&q.alive);
 if(!d)return false;
 if(d.gx===undefined){const i=G.ents.indexOf(e),site=(e.site+(d.n===2?1:0)+(i%2))%2,P=G.mode==='bomb'?SITES[site]:G.mode==='hostage'?HOST:SITES[0];d.gx=P[0];d.gy=P[1];d.stk=0;d.tg=0}
 // careful driving: keep out of shooting range of a defender that can see the drone, tag from there
 let nb=1e9;for(const o of G.ents)if(o.alive&&o.side==='D'){const q=dst(d.x,d.y,o.x,o.y);if(q<nb&&los(d.x,d.y,o.x,o.y)&&!inSmoke(o.x,o.y))nb=q}
 const lim=act?162:134;
 if(nb<lim){const bx=-Math.cos(d.a)*DR_SP*.9,by=-Math.sin(d.a)*DR_SP*.9;if(dOK(d,d.x+bx,d.y))d.x+=bx;if(dOK(d,d.x,d.y+by))d.y+=by;d.roll+=1;if(G.t%15===0)botDroneTag(d);return true}
 const r=autoDrive(d,d.gx,d.gy);
 if(r!==0&&G.t%90===0){const a=Math.random()*7,k=20+Math.random()*50,nx=d.gx+Math.cos(a)*k,ny=d.gy+Math.sin(a)*k;if(!blk(tileAt(nx,ny))&&!solid(tileAt(nx,ny))){d.gx=nx;d.gy=ny}}
 if(G.t%15===0)botDroneTag(d);
 return true}
function botDrone(e,rng){if(!G.drones.length)return false;let b=null,bd=1e9;
 for(const d of G.drones)if(d.alive){const q=dst(e.x,e.y,d.x,d.y);if(q<rng&&q<bd&&los(e.x,e.y,d.x,d.y)&&!inSmoke(d.x,d.y)){b=d;bd=q}}
 if(!b){e.dre=0;return false}
 const aim=Math.atan2(b.y-e.y,b.x-e.x);e.a=turn(e.a,aim,[.07,.11,.16][SET.diff]);
 if(Math.abs(adiff(aim,e.a))<.25&&e.blind<=0&&(e.dre=(e.dre||0)+1)>45*[1.6,1,.6][SET.diff]){if(e.ammo[e.wp[e.sel]]<=0)reload(e);else fire(e)}
 e.mv=.2;return true}
function planSetup(walls,bdoors,doors){const bots=G.ents.filter(e=>e.side==='D'&&e.bot);if(!bots.length)return;
 for(const e of bots){e.tasks=[];e.tk=null;e.work=null;e.faced=0}
 const cap=Math.ceil((walls.length+bdoors.length)/bots.length)+1;
 const give=(t)=>{let b=null,bs=1e9;for(const e of bots){if(e.tasks.length>=cap)continue;const q=dst(e.post.x,e.post.y,t.tx*T+8,t.ty*T+8)+((t.ty>=OY)!==(e.post.y>=OY*T)?600:0);if(q<bs){bs=q;b=e}}(b||bots[0]).tasks.push(t)};
 for(const w of walls)give({k:'r',tx:w[0],ty:w[1]});
 for(const d of bdoors)give({k:'b',tx:d[0],ty:d[1]});
 const near=e=>doors.slice().sort((p,q)=>dst(e.post.x,e.post.y,p[0]*T+8,p[1]*T+8)-dst(e.post.x,e.post.y,q[0]*T+8,q[1]*T+8)).slice(0,5);
 for(const e of bots){const own=(e.op.gd==='kap'||e.op.gd==='mat')?e.op.gd:null,nd=near(e);
  if(own)for(let i=0;i<e.gn;i++){const d=nd[Math.random()*nd.length|0];e.tasks.push({k:'t',t:own,tx:d[0],ty:d[1]})}
  if(e.g2==='wire'||e.g2==='nitro')for(let i=0;i<e.g2n;i++){const d=nd[Math.random()*nd.length|0];e.tasks.push({k:'t',t:e.g2,g2:1,tx:d[0],ty:d[1]})}}}
const inBld=(x,y)=>x>BX0&&x<BX1&&((y>BY0&&y<BY1)||(y>OY+BY0&&y<OY+BY1));
function standFor(e,t){const tiles=[[t.tx,t.ty]];if(t.k!=='r'){const p=doorPair(t.tx,t.ty);if(p)tiles.push(p)}
 const ex=e.x/T|0,ey=e.y/T|0;let best=null,bv=1e9;
 for(const[bx,by]of tiles)for(const[dx,dy]of D4){const nx=bx+dx,ny=by+dy;if(!map[ny]||tiles.some(q=>q[0]===nx&&q[1]===ny))continue;const m=map[ny][nx];if(blk(m)||m===8||m===5)continue;
  const c=field(ny*W+nx,2)[ey*W+ex];if(c>=1e4)continue;let v=c+(inBld(nx,ny)?0:600);if(t.k==='b'){const pc=field((e.post.y/T|0)*W+(e.post.x/T|0),2)[ny*W+nx];v+=pc>=1e4?900:pc*.8}if(v<bv){bv=v;best={x:nx*T+8,y:ny*T+8}}}
 return best}
function botPrep(e){if(botDrone(e,125))return;
 if(!e.tk&&e.tasks&&e.tasks.length){let bi=0,bd=1e9;e.tasks.forEach((t,i)=>{const q=dst(e.x,e.y,t.tx*T+8,t.ty*T+8)+((t.ty>=OY)!==(e.y>=OY*T)?500:0)+(t.k==='b'?4000:0);if(q<bd){bd=q;bi=i}});
  const t=e.tasks.splice(bi,1)[0],s2=standFor(e,t);if(!s2)return;e.tk={...t,sx:s2.x,sy:s2.y,p:0,age:0,tries:0,at:0,lx:e.x,ly:e.y,ls:0,fb:1e9,sl:0}}
 const tk=e.tk,sp=PACE*e.op.sp;
 if(!tk){e.work=null;if(dst(e.x,e.y,e.post.x,e.post.y)>14){navTo(e,e.post.x,e.post.y,sp*.8);e.faced=0}else botIdlePrep(e);return}
 tk.age++;if(tk.age>1800){e.tk=null;e.work=null;return}
 if(!tk.at){if(dst(e.x,e.y,tk.sx,tk.sy)>5){navTo(e,tk.sx,tk.sy,sp*.9);e.work=null;
   if(++tk.ls>=120){const cur=field((tk.sy/T|0)*W+(tk.sx/T|0),2)[(e.y/T|0)*W+(e.x/T|0)];if(dst(e.x,e.y,tk.lx,tk.ly)<3||cur>=tk.fb-1&&++tk.sl>=3){e.tk=null;return}if(cur<tk.fb){tk.fb=cur;tk.sl=0}tk.lx=e.x;tk.ly=e.y;tk.ls=0}return}tk.at=1}
 const need=tk.k==='r'?REINF_T:tk.k==='b'?BARR_T:34,tx=tk.tx*T+8,ty=tk.ty*T+8;
 e.a=turn(e.a,Math.atan2(ty-e.y,tx-e.x),.3);e.mv=0;tk.p++;e.work={k:tk.k,tx:tk.tx,ty:tk.ty,v:tk.p/need};
 if(tk.p%13===1&&dst(e.x,e.y,G.me.x,G.me.y)<220){sfx(tk.k==='r'?170:210,.05,'square',.03);boom(tx,ty,2,'#b8b8b8')}
 if(tk.p>=need){const m=map[tk.ty][tk.tx];
  if(tk.k==='r'){if(m===3&&G.reinf<REINF){setTile(tk.tx,tk.ty,4);G.reinf++;sfx(300,.1,'square',.04);boom(tx,ty,8,'#aab4c0')}}
  else if(tk.k==='b'){if(m!==5){e.tk=null;e.work=null;return}if(!putBarr(tk.tx,tk.ty,0)){tk.p=need-30;if(++tk.tries>4){e.tk=null;e.work=null}return}}
  else if(m===5){const px=tx+(Math.random()-.5)*8,py=ty+(Math.random()-.5)*8;G.traps.push(tk.g2?{x:px,y:py,k:tk.t,own:e}:{x:px,y:py,k:tk.t});if(tk.g2)e.g2n--;else e.gn--;sfx(260,.06,'square',.04);boom(px,py,4,'#8fa3bf')}
  e.tk=null;e.work=null;e.faced=0}}
// ---------- loop ----------
let last=performance.now(),acc=0;
function loop(t){requestAnimationFrame(loop);const dt=Math.min(100,t-last);last=t;FPS+=(1000/Math.max(1,dt)-FPS)*.05;const gm=$('gmenu');if(gm){const v=(G&&$('menu').style.display==='none'&&$('load').style.display!=='flex'&&!PAUSED)?'block':'none';if(gm.style.display!==v)gm.style.display=v;if(v==='block'){const r=cv.getBoundingClientRect();gm.style.right=Math.round(innerWidth-r.right+8)+'px';gm.style.top=Math.round(r.top+r.height*.37)+'px'}}
 if(!G){g.fillStyle='#0a0d13';g.fillRect(0,0,VW,VH);return}
 if(PAUSED){render();return}acc+=dt;const steps=(!G.me.alive&&keys.enter)?4:1;while(acc>=1000/60){acc-=1000/60;for(let i=0;i<steps;i++)update()}render()}
requestAnimationFrame(loop);
window.__t={start:(m,s,o)=>{Object.assign(uiSel,{mode:m,side:s,op:o});score=[0,0];document.getElementById('menu').style.display='none';newRound()},get G(){return G},get MS(){return MS},resetMS(){MS={}},msAcc,update:()=>update(),render:()=>render()};

(()=>{const inPopup=window.top!==window;
 if(inPopup){const st=document.createElement('style');st.textContent='#fsBtn{flex:none!important;align-self:center;width:30px;height:28px;margin:0 0 4px 8px!important;padding:0!important;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4)!important;border:1px solid #3a3a42!important;border-radius:2px;color:#cfd0d6!important;cursor:pointer}#fsBtn:hover{border-color:#e5303a!important;color:#e5303a!important;background:rgba(229,48,58,.12)!important}#fsBtn svg{width:16px;height:16px;display:block}html[data-lw] #tabs{padding-right:12px!important}html[data-lw] #tabs button{padding-left:5px;padding-right:5px;letter-spacing:1px}#tabs .hex{margin-right:2px!important}';document.head.appendChild(st);
  const b=document.createElement('button');b.id='fsBtn';b.title='Open the game fullscreen in a new tab';b.setAttribute('aria-label','Fullscreen');b.innerHTML='<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M2 7V2h5M11 2h5v5M16 11v5h-5M7 16H2v-5"/></svg>';b.onclick=()=>parent.postMessage({r6:'fullscreen'},'*');document.getElementById('tabs').appendChild(b)}
 else{const b=document.createElement('button');b.textContent='\u26F6';b.title='Fullscreen';b.style.cssText='position:fixed;left:8px;bottom:8px;z-index:9;background:#0008;color:#fff;border:1px solid #fff5;padding:4px 9px;cursor:pointer;font-size:16px';b.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();document.body.appendChild(b);
  if(/[?&]fs=1/.test(location.search)){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,.82);color:#fff;font:12px Silkscreen,monospace;letter-spacing:4px;cursor:pointer';o.textContent='CLICK ANYWHERE TO ENTER FULLSCREEN';const go=()=>{o.remove();try{document.documentElement.requestFullscreen()}catch(e){}};o.addEventListener('click',go,{once:true});addEventListener('keydown',function f(e){removeEventListener('keydown',f);if(o.isConnected)go()});document.body.appendChild(o)}}})();
r6xInit();
document.addEventListener('click',e=>{const t=e.target.closest('[data-dp]');if(!t)return;const[k,v]=t.dataset.dp.split(':');if(k==='spawn')uiSel.spawn=+v;else uiSel.dsite=+v;sfx(760,.05,'square',.02);renderDetail()});

document.addEventListener('click',e=>{if(e.target.closest('#tabs,#toOps,#back'))setTimeout(fitOps,0);},true);
