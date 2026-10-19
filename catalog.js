/* R6 Pixel Siege - cosmetic catalog (data only).
   item = {id,n,t,r,p:[palette],s:style key,pk:1 if pack-only}
   types: sk operator skin | hd headgear | wp weapon skin | tr tracer | kf kill effect
          np nameplate | rg ground ring | xh crosshair | mf muzzle flash
   rarity: c common, r rare, e epic, l legendary, m mythic (pack-only) */
(()=>{
const CAT=[],slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const add=(t,r,n,s,p,pk)=>{const id=t+'_'+slug(n);if(CAT.some(c=>c.id===id))return;CAT.push({id,n,t,r,s:s||'',p,pk:pk?1:0})};
const hsl=(h,s,l)=>{h=((h%360)+360)%360/360;const f=(p,q,t)=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p},q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,c=[f(p,q,h+1/3),f(p,q,h),f(p,q,h-1/3)];return'#'+c.map(v=>('0'+Math.round(v*255).toString(16)).slice(-2)).join('')};
/* ---------- operator skins: [suit, helmet, accent] ---------- */
const SK=[
['c','Midnight Ops','#1b2230','#10141c','#3a7bd5'],['c','Desert Sand','#b89a62','#8a7040','#f0d9a0'],['c','Urban Grey','#4a4f58','#2c3036','#c4c8d0'],['c','Forest Green','#2f4a2c','#1d2f1b','#9ad06a'],['c','Navy Blue','#1c2f5a','#101c38','#7ea8ff'],['c','Olive Drab','#4a5230','#2a301a','#c8d070'],['c','Charcoal','#2a2c30','#16171a','#8a909a'],['c','Coyote','#8a6a40','#4a3820','#e0c090'],['c','Slate Rain','#3a4a5a','#202a34','#8ab0d0'],['c','Brick','#7a3a2a','#3a1a14','#e09a7a'],
['r','Arctic Fox','#dfe8f0','#aebccb','#5ac8fa'],['r','Crimson Tide','#7a1620','#3d0b10','#ff5a60'],['r','Jungle Cat','#2a5a2f','#a8741c','#ffd24a'],['r','Sunset','#c4562a','#5a2a4a','#ffb62e'],['r','Hazard','#e0b020','#1a1a1a','#ffe14a'],['r','Tiger Stripe','#c47a1a','#1a1208','#ffd070'],['r','Ocean Depth','#0a4a6a','#04202e','#4adaff'],['r','Cherry Pop','#b0204a','#4a0a1e','#ff8ab0'],['r','Moss','#3a5a2a','#1a2a10','#a0e070'],['r','Copper','#a8602a','#3a2010','#ffc080'],
['e','Neon Tokyo','#2a1050','#12082a','#ff3df0'],['e','Toxic','#1c3a1c','#0c1f0c','#7aff2a'],['e','Void Walker','#120a24','#05020c','#9a4aff'],['e','Glacier','#9ad0f0','#3a6a9a','#ffffff'],['e','Sakura','#f0a8c0','#8a4a6a','#ffe0ec'],['e','Cyber Punk','#10122a','#05060f','#00ffd0'],['e','Magma','#4a1008','#1a0402','#ff6a1a'],['e','Storm Front','#2a3a5a','#101828','#ffe14a'],['e','Thorn Rose','#2a0a1a','#10040a','#ff3a6a'],['e','Acid Rain','#103a30','#041a14','#c0ff2a'],
['l','Gold Rush','#d4a020','#7a5a10','#fff0a0'],['l','Ghost Protocol','#e8ecf2','#6a7280','#00e5ff'],['l','Ember Lord','#3a0c08','#150504','#ff7a1a'],['l','Royal Guard','#4a1a7a','#20083a','#ffd24a'],['l','Platinum','#c8d0dc','#5a6270','#ffffff'],['l','Obsidian King','#0a0a10','#000000','#ffc933'],['l','Aurora','#1a4a5a','#0a1a30','#7affd0'],
['m','Prism','#ff4a4a','#4a4aff','#4aff6a'],['m','Dark Matter','#06020e','#000000','#ff3d6e'],['m','Solar Flare','#ff9a1a','#7a1a00','#fff0a0'],['m','Quantum','#0a1a3a','#00060f','#00ffff']];
SK.forEach(([r,n,a,b,c])=>add('sk',r,n,'',[a,b,c],r==='m'));
const HUES=[['Ruby',0],['Ember',18],['Amber',38],['Citrine',54],['Lime',90],['Jade',150],['Teal',175],['Azure',205],['Sapphire',225],['Violet',270],['Orchid',300],['Rose',335]];
for(const[n,h]of HUES){
 add('sk','c',n+' Tactical','',[hsl(h,.32,.32),hsl(h,.3,.17),hsl(h,.45,.62)]);
 add('sk','r',n+' Gloss','',[hsl(h,.6,.42),hsl(h,.55,.2),hsl(h,.75,.72)]);
 add('sk','e',n+' Neon','',[hsl(h,.9,.48),hsl(h+20,.8,.14),hsl(h+180,.95,.65)]);
 add('sk','l',n+' Prism','',[hsl(h,.8,.55),hsl(h+40,.85,.2),hsl(h+160,.95,.75)])}
/* ---------- headgear: shape key in cosmetics.js; p=[main,accent] ---------- */
const HD=[
['cap','Cap',[['c','Field','#6a7a4a','#3a4a2a'],['c','Red','#c0392b','#ffffff'],['r','Night','#14161c','#5ac8fa'],['e','Chrome','#c8d0dc','#3a3f4a']]],
['beanie','Beanie',[['c','Grey','#6a6f78','#e0e0e0'],['c','Crimson','#a82a2a','#ffd0d0'],['r','Neon','#2a2a30','#7aff2a'],['r','Frost','#9ad8ff','#ffffff']]],
['band','Headband',[['c','Ninja','#1a1a20','#e0453a'],['c','Sweat','#f0f0ea','#3aa0ff'],['r','Rising Sun','#f4f4f0','#d02a2a'],['e','Golden','#ffc933','#fff0a0']]],
['bucket','Bucket Hat',[['c','Jungle','#6a7a4a','#3a4a2a'],['c','Sand','#c8b080','#8a7040'],['r','Pastel','#f0a8c0','#ffe0ec'],['r','Camo','#4a6a3a','#2a3a22']]],
['cowboy','Cowboy Hat',[['c','Tan','#b08040','#6a4a1a'],['r','Black','#1a1a1e','#c0a050'],['e','Silver Spur','#c8d0dc','#5a6270'],['l','Outlaw Gold','#ffc933','#7a5a10']]],
['chef','Chef Hat',[['c','Classic','#f4f4f0','#c8c8c0'],['r','Head','#f4f4f0','#d02a2a'],['e','Pastel','#ffe0ec','#f0a8c0']]],
['party','Party Hat',[['c','Pink','#ff5ad0','#ffe14a'],['c','Blue','#3aa0ff','#ff5a60'],['r','Rainbow','#ff4a4a','#4aff6a'],['e','Disco','#c8d0dc','#ff3df0']]],
['tophat','Top Hat',[['r','Gentleman','#14141a','#c0392b'],['e','Magician','#1a0a2a','#ffe14a'],['l','Diamond','#e8ecf2','#5ac8fa']]],
['wizard','Wizard Hat',[['r','Apprentice','#3a4a9a','#ffe14a'],['e','Archmage','#4a1a7a','#ffd24a'],['l','Starweaver','#0a0a30','#ffffff']]],
['pirate','Pirate Hat',[['r','Buccaneer','#1a1a20','#ffe0a0'],['e','Captain','#4a1010','#ffc933'],['l','Ghost Ship','#aab8c8','#00e5ff']]],
['viking','Viking Helm',[['r','Raider','#6a6f78','#e0d8c0'],['e','Berserker','#4a2a1a','#c0392b'],['l','Valhalla','#c8d0dc','#ffc933']]],
['kabuto','Samurai Kabuto',[['e','Ronin','#2a2a34','#c0392b'],['e','Shogun','#1a1a20','#ffc933'],['l','Oni','#4a0a0a','#ffe14a']]],
['cat','Cat Ears',[['c','Black','#2a2a30','#ff8ab0'],['r','Calico','#e0a060','#ffffff'],['e','Neon','#1a1a2a','#00ffd0'],['e','Sakura','#f0a8c0','#ffffff']]],
['bunny','Bunny Ears',[['c','White','#f4f4f0','#ff8ab0'],['r','Midnight','#2a2a40','#9a4aff'],['e','Gold','#ffc933','#fff0a0']]],
['horns','Horns',[['r','Bone','#c8c0a8','#6a2a2a'],['e','Demon','#4a0a0a','#ff3a3a'],['l','Inferno','#2a0a08','#ff7a1a']]],
['halo','Halo',[['r','Soft','#ffe680','#fffbe0'],['e','Azure','#7ad8ff','#ffffff'],['l','Radiant','#ffc933','#ffffff']]],
['crown','Crown',[['r','Bronze','#c08040','#ffe0a0'],['e','Silver','#c8d0dc','#5ac8fa'],['l','Gold','#ffc933','#ff4a6a'],['l','Ruby','#ffc933','#ff2a4a']]],
['prop','Propeller Cap',[['c','Classic','#3aa0ff','#ff4a4a'],['r','Lime','#7aff2a','#ff3df0']]],
['antenna','Antenna',[['c','Probe','#8a909a','#ff4a4a'],['r','Alien','#7aff2a','#c0ff80'],['e','Satellite','#c8d0dc','#00ffd0']]],
['headset','Headset',[['c','Comms','#20242c','#5ac8fa'],['r','Streamer','#20242c','#ff3df0'],['e','Pro Gamer','#14141a','#00ffd0']]],
['pumpkin','Pumpkin Helm',[['r','Jack','#e07a1a','#2a1a08'],['e','Haunted','#7a2a9a','#7aff2a']]],
['mohawk','Mohawk',[['c','Punk','#ff3d6e','#ff3d6e'],['r','Toxic','#7aff2a','#7aff2a'],['e','Electric','#00e5ff','#ffffff']]],
['afro','Afro',[['c','Classic','#2a1a10','#2a1a10'],['r','Disco','#ff8a1a','#ffe14a'],['e','Cotton Candy','#ff8ac8','#8ad8ff']]],
['flame','Flame Head',[['e','Blaze','#ff6a1a','#ffe14a'],['l','Phoenix','#ff3a1a','#ffd24a'],['e','Azure','#2a6aff','#aaf0ff']]],
['sombrero','Sombrero',[['r','Fiesta','#e0b050','#d02a2a'],['e','Mariachi','#14141a','#ffc933']]],
['santa','Winter Hat',[['c','Santa','#d02a2a','#ffffff'],['r','Elf','#2a7a3a','#ffd24a']]],
['laurel','Laurel',[['r','Victory','#3a8a3a','#7ac07a'],['l','Golden','#ffc933','#fff0a0']]],
['cone','Traffic Cone',[['c','Caution','#ff7a1a','#ffffff'],['r','Hi-Vis','#d0f020','#ffffff']]],
['pot','Cooking Pot',[['c','Steel','#8a909a','#c8d0dc'],['r','Copper','#c07040','#ffc080']]],
['mushroom','Mushroom',[['r','Red Cap','#d02a2a','#ffffff'],['e','Glow Cap','#00ffd0','#ffffff']]],
['ufo','UFO',[['e','Saucer','#8a909a','#7aff2a'],['l','Mothership','#c8d0dc','#ff3df0']]],
['bow','Big Bow',[['c','Pink','#ff8ab0','#ffe0ec'],['r','Black','#1a1a20','#ff3d6e'],['e','Galaxy','#4a1a7a','#00e5ff']]],
['spike','Spike Helm',[['r','Punisher','#3a3f4a','#c8d0dc'],['e','Warlord','#1a1a20','#ff4a4a']]],
['leaf','Sprout',[['c','Seedling','#4aff6a','#2a8a3a'],['r','Autumn','#e07a1a','#ffc933']]],
['ghost','Ghost Sheet',[['r','Boo','#f4f4f0','#14141a'],['e','Spectre','#a8e8ff','#14141a']]],
];
HD.forEach(([s,lab,list])=>list.forEach(([r,adj,m,a])=>add('hd',r,adj+' '+lab,s,[m,a])));
add('hd','m','Glitch Crown','crown',['#00ffd0','#ff3df0'],1);add('hd','m','Event Horizon','halo',['#9a4aff','#000000'],1);add('hd','m','Supernova Helm','flame',['#ffffff','#ffd24a'],1);
/* ---------- weapon skins: s=pattern, p=[body,accent,(third)] ---------- */
const WPAT=[
['solid','Plated',[['c','Steel','#8a909a','#c8d0dc'],['c','Carbon','#1c1f26','#3a404c'],['r','Chrome','#c8d0dc','#ffffff'],['l','Gold','#e0a820','#fff0a0'],['e','Rose Gold','#d08a7a','#ffe0d0']]],
['stripe','Stripe',[['c','Hazard','#e0b020','#1a1a1a'],['c','Police','#2a3a8a','#d02a2a'],['r','Candy','#ff8ac8','#ffffff'],['r','Racing','#d02a2a','#f0f0f0'],['e','Neon','#14081f','#ff3df0']]],
['dots','Polka',[['c','Pearl','#e8ecf2','#b8c0cc'],['r','Bubblegum','#ff8ac8','#ffd0ec'],['r','Mint','#8affd0','#3aa07a'],['e','Galaxy','#0a0a30','#ffffff']]],
['camo','Camo',[['c','Woodland','#4a6a3a','#2a3a22'],['c','Desert','#b89a62','#7a6030'],['r','Arctic','#dfe8f0','#8a9ab0'],['r','Digital','#3a4a5a','#1a2430'],['e','Hot Pink','#ff3d9a','#4a0a2a'],['l','Gilded','#d4a020','#4a3a08']]],
['grad','Fade',[['r','Sunset','#ff6a1a','#9a1aff'],['r','Ocean','#1a6aff','#00ffd0'],['e','Aurora','#00ffd0','#9a4aff'],['e','Lava','#ff2a1a','#ffe14a'],['l','Cosmic','#1a0a4a','#ff3df0']]],
['spark','Spark',[['e','Glitch','#1a1a24','#00ffd0'],['e','Static','#20242c','#ffe14a'],['l','Plasma','#1a0a3a','#ff3df0'],['l','Lightning','#14181f','#7ad8ff']]],
['chev','Chevron',[['c','Tactical','#3a404c','#e0b020'],['r','Viper','#1a3a1a','#7aff2a'],['r','Crimson','#3a0c10','#ff4a4a'],['e','Royal','#2a1050','#ffd24a']]],
['check','Checker',[['c','Mono','#1c1f26','#e8ecf2'],['r','Sakura','#f0a8c0','#8a4a6a'],['r','Mojito','#2a7a4a','#c0ff80'],['e','Cyber','#0a0a1a','#00ffd0']]],
['flame','Flame',[['e','Lava Flow','#2a0c08','#ff6a1a'],['l','Dragon Fire','#1a0404','#ffd24a'],['e','Cold Fire','#0a1a3a','#7ad8ff']]],
['scale','Scale',[['e','Dragon','#1a4a2a','#ffb62e'],['l','Leviathan','#0a3a5a','#7affd0'],['r','Serpent','#2a5a2a','#c0e070']]],
];
WPAT.forEach(([s,lab,list])=>list.forEach(([r,adj,a,b])=>add('wp',r,adj+' '+lab,s,[a,b])));
add('wp','m','Starlight','spark',['#0a0a30','#ffffff'],1);add('wp','m','Singularity','grad',['#000000','#ffffff'],1);add('wp','m','Prismatic Edge','stripe',['#ff4a4a','#4aff6a'],1);
/* ---------- bullet tracers: s=pattern ---------- */
const TR=[
['solid',[['c','Laser Green','#7aff6a'],['c','Plasma Blue','#4ac0ff'],['c','Hot Pink','#ff5a9a'],['r','Ember','#ff7a1a'],['r','Ice Shard','#bfeaff'],['e','Void Purple','#a04aff'],['l','Gold Dust','#ffd24a']]],
['dash',[['c','Morse','#ffe14a'],['r','Pulse','#00ffd0'],['r','Rapid','#ff5a60'],['e','Beat','#ff3df0']]],
['dbl',[['r','Twin Blue','#4ac0ff'],['r','Twin Red','#ff4a4a'],['e','Twin Violet','#c07aff'],['l','Twin Gold','#ffd24a']]],
['zig',[['r','Spark','#ffe14a'],['e','Arc','#7ad8ff'],['e','Toxic Arc','#7aff2a'],['l','Storm','#ffffff']]],
['rain',[['e','Pixel Rain','#ff4a4a','#ffe14a','#4aff6a','#4ac0ff'],['l','Spectrum','#ff4a9a','#ffd24a','#4affd0','#9a4aff']]],
['fade',[['c','Ghost','#e8f4ff'],['r','Blood','#c0141c'],['e','Nebula','#9a4aff','#ff3df0']]],
];
TR.forEach(([s,list])=>list.forEach(([r,n,...p])=>add('tr',r,n,s,p)));
add('tr','m','Supernova','rain',['#ffffff','#ffd24a','#ff3d6e'],1);add('tr','m','Wormhole','zig',['#9a4aff','#000000'],1);
/* ---------- kill effects: s=style ---------- */
const KF=[
['burst',[['c','Pixel Burst','#ff5a60','#ffe14a'],['c','Blue Burst','#3aa0ff','#bfeaff'],['r','Toxic Burst','#7aff2a','#1c3a1c']]],
['confetti',[['c','Confetti','#ff4a9a','#4ac0ff','#ffe14a','#7aff6a'],['r','Party','#ff4a4a','#ffd24a','#4aff6a','#9a4aff']]],
['petals',[['r','Sakura','#f0a8c0','#ffe0ec'],['e','Maple','#e0501a','#ffb62e']]],
['hearts',[['r','Hearts','#ff3a6a','#ff8ab0'],['e','Black Hearts','#14141a','#ff3d6e']]],
['coins',[['r','Coins','#ffd24a','#fff0a0'],['l','Gold Rain','#ffc933','#ffffff']]],
['bolt',[['e','Lightning','#ffe14a','#ffffff'],['e','Blue Bolt','#4ac0ff','#ffffff']]],
['glitch',[['e','Glitch Out','#00ffd0','#ff3df0'],['l','Corrupt','#ff3df0','#14141a']]],
['ghost',[['l','Ghost Rise','#e8f4ff','#7ad8ff'],['e','Spirit','#a8e8ff','#ffffff']]],
['stars',[['r','Stardust','#fff0a0','#ffffff'],['e','Nova','#ff9a1a','#ffe14a']]],
['snow',[['r','Snowfall','#ffffff','#bfeaff'],['e','Blizzard','#7ad8ff','#ffffff']]],
['flame',[['e','Cremate','#ff6a1a','#ffe14a'],['l','Hellfire','#ff2a1a','#ffd24a']]],
['bubble',[['c','Bubbles','#8ad8ff','#ffffff'],['r','Soap','#ff8ac8','#8ad8ff']]],
['skull',[['e','Skulls','#e8ecf2','#14141a'],['l','Grim','#c0141c','#14141a']]],
['ring',[['c','Shockwave','#ffffff','#8fa3bf'],['r','Sonic','#00ffd0','#ffffff']]],
];
KF.forEach(([s,list])=>list.forEach(([r,n,...p])=>add('kf',r,n,s,p)));
add('kf','m','Black Hole','hole',['#9a4aff','#000000','#ffffff'],1);add('kf','m','Big Bang','stars',['#ffffff','#ffd24a','#ff3d6e'],1);
/* ---------- nameplates ---------- */
const NPC={c:['#8fa3bf','#e0453a','#3aa0ff','#7aff6a','#ffb62e','#c8d0dc'],r:['#7aff6a','#ffb62e','#3aa0ff','#ff5a60','#00ffd0'],e:['#ff3df0','#9a4aff','#00e5ff','#ff7a1a'],l:['#ffd24a','#ff5a60','#7affd0']};
const NP={c:['Rookie','Breacher','Anchor','Recruit','Trooper','Operator','Grunt','Cadet','Scout','Ranger','Roamer','Support'],
 r:['Sharpshooter','Clutch King','Veteran','Fragger','Headhunter','Sentinel','Tactician','Wolf','Falcon','Cobra','Viper','Hacker'],
 e:['Ace','Shadow','Phantom','Reaper','Spectre','Titan','Samurai','Ninja','Hero','Vanguard','Unstoppable','Untouchable'],
 l:['Legend','Siege God','Flawless','Warlord','Phoenix','Dragon','Overlord','Immortal','King of the Hill']};
for(const r of['c','r','e','l'])NP[r].forEach((n,i)=>{const cols=NPC[r];add('np',r,n,'',[cols[i%cols.length],cols[(i+1)%cols.length]])});
add('np','m','MVP Prime','',['#ff3d6e','#ffd24a'],1);add('np','m','Zero Point','',['#00ffff','#ffffff'],1);
/* ---------- ground rings: s=pattern ---------- */
const RG=[
['solid',[['c','Orange','#ff9b3a'],['c','Sky','#4aa8ff'],['c','Lime','#7aff6a'],['c','White','#ffffff'],['r','Crimson','#ff3a4a'],['r','Violet','#b455ff'],['e','Gold','#ffd24a']]],
['dash',[['c','Dashed Cyan','#00e5ff'],['r','Dashed Pink','#ff5ad0'],['r','Dashed Gold','#ffc933'],['e','Dashed Plasma','#9a4aff']]],
['dbl',[['r','Twin Green','#4aff7a'],['r','Twin Red','#ff4a4a'],['e','Twin Sky','#7ad8ff'],['l','Twin Gold','#ffd24a']]],
['pulse',[['r','Heartbeat','#ff3a6a'],['e','Radar','#00ffd0'],['e','Sonar','#4ac0ff'],['l','Nova Pulse','#ffd24a']]],
['dots',[['c','Studs','#e8ecf2'],['r','Fairy','#ff8ad8'],['e','Fireflies','#d0ff4a'],['l','Stars','#fff0a0']]],
['spin',[['e','Orbit','#00e5ff'],['e','Comet','#ff7a1a'],['l','Eclipse','#ffffff'],['l','Rainbow Orbit','#ff4a4a','#ffe14a','#4aff6a','#4ac0ff']]],
];
RG.forEach(([s,list])=>list.forEach(([r,n,...p])=>add('rg',r,n+' Ring',s,p)));
add('rg','m','Event Horizon Ring','spin',['#9a4aff','#000000'],1);add('rg','m','Supernova Ring','pulse',['#ffffff','#ffd24a'],1);
/* ---------- crosshairs: s=shape ---------- */
const XH=[
['cross',[['c','Classic Lime','#4aff7a'],['r','Hot Pink','#ff5ad0'],['e','Neon Cyan','#00ffd0']]],
['dot',[['c','Red Dot','#ff4a4a'],['r','Gold Dot','#ffd24a'],['e','Void Dot','#b455ff']]],
['ring',[['c','Clean Ring','#ffffff'],['r','Orange Ring','#ff9b3a'],['e','Plasma Ring','#00e5ff']]],
['heart',[['r','Heart','#ff3a6a'],['e','Neon Heart','#ff3df0']]],
['diamond',[['r','Diamond','#7ad8ff'],['e','Gem','#00ffd0'],['l','Royal Gem','#ffd24a']]],
['brackets',[['c','Brackets','#e8ecf2'],['r','Tactical','#ffb62e'],['e','Targeting','#ff4a4a']]],
['x',[['c','Cross-X','#ff4a4a'],['r','Pixel X','#3aa0ff'],['e','Hex X','#9a4aff']]],
['tri',[['r','Delta','#7aff6a'],['e','Warning','#ffe14a']]],
['spin',[['e','Spinner','#00ffd0'],['l','Gyro','#ffd24a']]],
['plus',[['c','Plus','#ffffff'],['r','Medic','#4aff7a'],['e','Rescue','#ff4a4a']]],
['star',[['e','Star','#ffe14a'],['l','Supernova','#ffffff']]],
];
XH.forEach(([s,list])=>list.forEach(([r,n,...p])=>add('xh',r,n,s,p)));
add('xh','m','Singularity','spin',['#9a4aff','#ffffff'],1);
/* ---------- muzzle flashes: p=[core,outer] ---------- */
const MF=[['c','Classic','#fff3b0','#ffb030'],['c','Cool','#e8f8ff','#4ac0ff'],['c','Green Tip','#e8ffd0','#4aff7a'],['r','Magenta','#ffe0ff','#ff3df0'],['r','Crimson','#ffe0e0','#ff3a4a'],['r','Violet','#f0e0ff','#9a4aff'],['r','Mint','#e0fff0','#00ffd0'],['e','Solar','#ffffff','#ffd24a'],['e','Plasma','#d0f8ff','#00e5ff'],['e','Toxic','#f0ffd0','#7aff2a'],['l','Gold Burst','#ffffff','#ffc933'],['l','Hellfire','#ffe0a0','#ff2a1a'],['e','Pink Pop','#fff0f8','#ff8ac8'],['r','Orange','#fff0d0','#ff7a1a'],['c','White','#ffffff','#c8d0dc']];
MF.forEach(([r,n,a,b])=>add('mf',r,n+' Flash','',[a,b]));
add('mf','m','Quasar Flash','',['#ffffff','#ff3d6e'],1);
window.R6CAT=CAT;
})();
