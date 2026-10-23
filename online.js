/* R6 Pixel Siege - ONLINE tab (lobby). Transport: p2p.js (WebRTC data channels).
   Two ways in, same lobby:
     1. ROOM CODE    - 5 letters, signalled over public MQTT brokers (fast, easy, optional password).
     2. SECURE INVITE - long copy/paste codes, no server at all (host makes an invite per player, player sends a reply back).
   Host is authoritative for the lobby (names, mode, map, lock, password, kick, chat). Match sync is NOT built yet:
   START GAME launches the host's own match and tells everyone. window.R6Online exposes the live Net for the next stage. */
(function(){
const NS='r6-pixel-siege',MAXP=9,SEATS=MAXP+1,HELLO_MS=8000;
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
const sfxo=(a,b)=>{try{if(typeof sfx==='function')sfx(a,b||.04,'square',.02)}catch(e){}};
const tabs=$('tabs'),tb=document.createElement('button');tb.dataset.tab='net';tb.textContent='ONLINE';tabs.insertBefore(tb,tabs.querySelector('.gear'));

/* ---------- styles (theme: black / red / dark grey, same tokens as the rest of the menu) ---------- */
const css=document.createElement('style');css.textContent=`
#tabs [data-tab=net].live::after{content:"";display:inline-block;width:7px;height:7px;margin-left:8px;background:#5dff8c;box-shadow:0 0 8px #5dff8c;vertical-align:middle}
#tp-net{padding-top:8px}
#scrMain:has(#tp-net:not([hidden])) .foot{display:none}
#lBack{margin-left:34px}
.ol{display:flex;flex-direction:column;gap:14px;max-width:1040px;width:100%;margin:0 auto;min-height:0}
.ol *{box-sizing:border-box}
.ol [hidden]{display:none!important}
.ol h2{margin:0;font:400 22px Silkscreen,monospace;letter-spacing:4px;color:#fff}
.ol .sub{color:var(--dim);font-size:14px;letter-spacing:1px;font-weight:500;margin-top:4px}
.ol .pan{background:rgba(6,6,8,.72);border:1px solid #232328;padding:14px 16px}
.ol .lb{font:400 11px Silkscreen,monospace;letter-spacing:3px;color:var(--dim);margin:0 0 8px;display:flex;align-items:center;gap:10px}
.ol .lb::before{content:"";width:10px;height:2px;background:var(--red)}
.ol .lb em{margin-left:auto;font-style:normal;color:#9a9ca4;letter-spacing:2px}
.ol input[type=text],.ol input[type=password],.ol textarea{width:100%;background:#050506;color:#fff;border:1px solid #3a3a42;padding:9px 11px;font:500 14px Rajdhani,sans-serif;letter-spacing:1px;outline:none;border-radius:0}
.ol input:focus,.ol textarea:focus{border-color:var(--red)}
.ol textarea{resize:none;height:84px;font:11px/1.35 ui-monospace,Menlo,monospace;letter-spacing:0;word-break:break-all}
.ol .btn{font:400 12px Silkscreen,monospace;letter-spacing:2px;color:#d6d8de;background:rgba(0,0,0,.45);border:1px solid #4a4a52;padding:9px 14px;cursor:pointer;transition:border-color .15s,color .15s,background .15s;white-space:nowrap}
.ol .btn:hover:not(:disabled){border-color:var(--red);color:#fff;background:rgba(229,48,58,.14)}
.ol .btn:disabled{opacity:.4;cursor:default}
.ol .btn.go{color:#fff;border:none;background:linear-gradient(180deg,#f0383f,#c2202a);box-shadow:inset 0 -4px 0 #7a1118;padding:12px 26px;font-size:14px;letter-spacing:3px;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
.ol .btn.go:hover:not(:disabled){background:linear-gradient(180deg,#ff4a51,#d42630)}
.ol .btn.go:disabled{background:#3a2a2c;box-shadow:inset 0 -4px 0 #231a1b;color:#8b7d7e;opacity:1}
.ol .btn.sm{padding:5px 9px;font-size:10px}
.ol .foot2{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #232328;padding-top:12px}
.ol .msg{font-size:14px;font-weight:500;letter-spacing:.5px;color:#aeb1b9;display:flex;gap:9px;align-items:center;min-height:20px}
.ol .msg i{flex:0 0 9px;height:9px;background:#6a6d75}
.ol .msg.ok i{background:#5dff8c}.ol .msg.bad i{background:var(--red)}.ol .msg.wait i{background:#ffb62e;animation:olp 1s infinite}
@keyframes olp{50%{opacity:.25}}
.ol details{border:1px solid #2d2d33;background:rgba(0,0,0,.35)}
.ol summary{list-style:none;cursor:pointer;padding:10px 12px;font-size:14px;font-weight:600;letter-spacing:1px;color:#d6d8de;display:flex;gap:10px;align-items:center}
.ol summary::-webkit-details-marker{display:none}
.ol summary::before{content:"\\25B6";color:var(--red);font-size:10px;transition:transform .15s}
.ol details[open] summary::before{transform:rotate(90deg)}
.ol details>div{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px}
.ol .note{font-size:12.5px;color:var(--dim);line-height:1.4;font-weight:500}
.ol .row2{display:flex;gap:8px;align-items:center}
.ol .home{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ol .big{text-align:left;cursor:pointer;color:var(--fg);padding:22px 22px 20px;background:rgba(6,6,8,.72);border:1px solid #232328;border-left:3px solid var(--red);transition:transform .2s,background .2s,border-color .2s;display:flex;flex-direction:column;gap:8px;min-height:150px}
.ol .big:hover{transform:translateY(-3px);background:rgba(229,48,58,.1);border-color:#4a4a52;border-left-color:var(--red)}
.ol .big b{font:400 20px Silkscreen,monospace;letter-spacing:3px;color:#fff}
.ol .big span{font-size:14.5px;font-weight:500;color:#aeb1b9;line-height:1.4}
.ol .big u{margin-top:auto;text-decoration:none;font:400 10px Silkscreen,monospace;letter-spacing:2px;color:var(--red)}
.ol .namer{display:flex;gap:10px;align-items:center}.ol .namer input{max-width:240px}
.ol .cg{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}.ol .cg label{font-size:12px;letter-spacing:2px;color:var(--dim);display:flex;flex-direction:column;gap:4px;font-weight:600}
.ol .chk{display:flex;gap:8px;align-items:center;font-size:13px;color:#cfd2d8;font-weight:600;cursor:pointer}.ol .chk input{accent-color:#e5303a;width:15px;height:15px}
.ol .joinbox{max-width:620px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:14px}
.ol .codein{display:flex;gap:10px;justify-content:center}
.ol .codein input{width:64px;height:76px;text-align:center;font:400 34px Silkscreen,monospace;color:#fff;background:#050506;border:2px solid #3a3a42;padding:0;text-transform:uppercase}
.ol .codein input:focus{border-color:var(--red);box-shadow:0 0 14px rgba(229,48,58,.35)}
.ol .codein input.f{border-color:#6a6a72}
.ol .lob{display:grid;grid-template-columns:268px minmax(0,1fr);gap:16px;min-height:0}
.ol .lcol{display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0}
.ol .modes{display:flex;flex-direction:column;gap:6px}
.ol .mode{text-align:left;cursor:pointer;color:var(--fg);background:rgba(255,255,255,.03);border:1px solid #2d2d33;border-left:3px solid #2d2d33;padding:9px 12px;transition:background .15s,border-color .15s}
.ol .mode b{display:block;font:400 12px Silkscreen,monospace;letter-spacing:2px}
.ol .mode small{display:block;margin-top:3px;font-size:12px;color:var(--dim);font-weight:500;line-height:1.3}
.ol .mode.on{border-left-color:var(--red);background:rgba(229,48,58,.12)}
.ol .mode:disabled{cursor:default}.ol .mode:hover:not(:disabled):not(.on){background:rgba(255,255,255,.07)}
.ol .code{display:flex;gap:6px;align-items:center}
.ol .code span{width:38px;height:46px;display:grid;place-items:center;font:400 22px Silkscreen,monospace;color:#ffb62e;background:#050506;border:2px solid #5a4620;box-shadow:inset 0 0 0 2px #0c0c0e}
.ol .code.off span{color:#55575e;border-color:#2d2d33}
.ol .maps{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity}
.ol .mp{flex:0 0 96px;scroll-snap-align:start;cursor:pointer;background:rgba(255,255,255,.03);border:1px solid #2d2d33;padding:4px;display:flex;flex-direction:column;gap:4px;color:var(--fg);transition:border-color .15s,background .15s}
.ol .mp img,.ol .mp .rn{width:100%;height:46px;object-fit:cover;image-rendering:pixelated;background:#0b0e13;display:grid;place-items:center;font:400 20px Silkscreen,monospace;color:#8b8d95}
.ol .mp b{font:400 9px Silkscreen,monospace;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
.ol .mp.on{border-color:var(--red);background:rgba(229,48,58,.14)}
.ol .mp:disabled{cursor:default}.ol .mp:disabled:not(.on){opacity:.55}
.ol .seats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ol .seat{display:flex;align-items:center;gap:10px;height:42px;padding:0 10px;background:rgba(255,255,255,.04);border:1px solid #2d2d33;min-width:0}
.ol .seat .av{flex:0 0 26px;height:26px;display:grid;place-items:center;background:#a3161d;color:#fff;font:400 12px Silkscreen,monospace}
.ol .seat .nm{flex:1;min-width:0;font-size:15px;font-weight:600;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
.ol .seat .tg{font:400 9px Silkscreen,monospace;letter-spacing:1px;color:#ffb62e}
.ol .seat .pg{font-size:12px;color:var(--dim);font-weight:600;min-width:34px;text-align:right}
.ol .seat.me{border-color:#5a2a2e;background:rgba(229,48,58,.08)}
.ol .seat.open{border-style:dashed;color:#55575e;font-size:13px;letter-spacing:2px;justify-content:center;background:transparent}
.ol .seat .kx{flex:0 0 22px;height:22px;padding:0;display:grid;place-items:center;line-height:1}
.ol .chat{display:flex;flex-direction:column;gap:8px;min-height:0}
.ol .log{height:112px;overflow-y:auto;background:#050506;border:1px solid #232328;padding:8px 10px;font-size:14px;font-weight:500;line-height:1.35;color:#cfd2d8;word-break:break-word}
.ol .log b{color:#fff}.ol .log .s{color:#8b8d95}
.ol .pend{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid #2d2d33;background:rgba(0,0,0,.4)}
.ol .pend .st{font:400 10px Silkscreen,monospace;letter-spacing:2px;color:#ffb62e}
.ol .tgl{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600;letter-spacing:1px;color:#d6d8de}
.ol .olsw{width:42px;height:22px;border:1px solid #4a4a52;background:#050506;position:relative;cursor:pointer;padding:0}.ol .olsw i{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#6a6d75;transition:left .15s,background .15s}.ol .olsw.on{border-color:var(--red)}.ol .olsw.on i{left:23px;background:var(--red)}
#olMod[hidden]{display:none}
#olMod{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.74);display:grid;place-items:center;padding:20px}
.olcard{width:min(580px,100%);max-width:580px;margin:0;max-height:100%;overflow:auto;background:#0b0b0d;border:1px solid #3a3a42;border-top:3px solid var(--red);padding:18px;gap:12px;animation:olin .18s ease both}
@keyframes olin{from{opacity:0;transform:translateY(10px)}}
@media(max-width:900px){.ol .lob,.ol .home{grid-template-columns:1fr}.ol .seats{grid-template-columns:1fr}.ol .codein input{width:54px;height:64px;font-size:28px}}
@media(max-height:790px){.ol .seat{height:34px}.ol .lcol{gap:10px}.ol .log{height:84px}}
@media(max-height:760px){.ol{gap:10px}.ol .log{height:84px}.ol .big{min-height:120px;padding:16px 18px}.ol .seat{height:38px}}
`;document.head.appendChild(css);

/* ---------- markup ---------- */
const p=document.createElement('div');p.className='tp';p.id='tp-net';p.hidden=true;
p.innerHTML=`<div class="ol" id="ol">
<section id="olHome"><div style="display:flex;flex-direction:column;gap:14px">
 <div><h2>ONLINE</h2><div class="sub">Play with friends. Pick the easy way in, or the secure one.</div></div>
 <div class="home">
  <button class="big" id="goHost"><b>HOST A GAME</b><span>Open a lobby. Friends join with a 5-letter room code, or you can send each one a private invite code.</span><u>CREATE LOBBY &#9656;</u></button>
  <button class="big" id="goJoin"><b>JOIN A GAME</b><span>Type the host's 5-letter code, or paste a private invite if you were sent one.</span><u>ENTER CODE &#9656;</u></button>
 </div>
 <div class="pan namer"><span class="lb" style="margin:0">YOUR NAME</span><input type="text" id="olName" maxlength="14" autocomplete="off" spellcheck="false"><span class="note" style="margin-left:6px">Shown to everyone in the lobby.</span></div>
 <details id="olConn"><summary>Connection settings</summary><div>
  <div class="note">Most home networks connect directly. Strict networks (school, work, some mobile data) need a TURN relay. Leave this empty if you are unsure.</div>
  <div class="cg">
   <label>CUSTOM BROKER (wss:// or ws://)<input type="text" id="cBroker" placeholder="default: public brokers" spellcheck="false"></label>
   <label>TURN HOST<input type="text" id="cTurn" placeholder="turn.example.com" spellcheck="false"></label>
   <label>TURN USERNAME<input type="text" id="cUser" spellcheck="false" autocomplete="off"></label>
   <label>TURN CREDENTIAL<input type="password" id="cCred" autocomplete="off"></label>
  </div>
  <label class="chk"><input type="checkbox" id="cRelay">Relay only (hides your IP from other players, slower)</label>
  <div class="row2"><button class="btn" id="cSave">SAVE</button><button class="btn" id="cTest">TEST CONNECTION</button><span class="note" id="cOut"></span></div>
 </div></details>
</div></section>

<section id="olJoin" hidden><div class="joinbox">
 <div><h2>JOIN A GAME</h2></div>
 <div class="pan"><div class="lb">ROOM CODE</div><div class="codein" id="jCode"></div>
  <div class="msg" id="jMsg" style="margin-top:12px;justify-content:center"><i></i><span>Ask the host for their five-letter code.</span></div></div>
 <div class="pan"><div class="lb">PASSWORD <em>ONLY IF THE HOST SET ONE</em></div><input type="password" id="jPw" maxlength="24" autocomplete="off" placeholder="Leave empty if there is none"></div>
 <details id="jInv"><summary>No room code? Paste an invite</summary><div>
  <div class="note">The host makes a private invite code for you. Paste it here, press CREATE REPLY, and send the reply back to the host. No servers involved.</div>
  <textarea id="jOffer" placeholder="Paste the host's invite code here" spellcheck="false"></textarea>
  <div class="row2"><button class="btn" id="jMake">CREATE REPLY</button><button class="btn" id="jPaste">PASTE</button></div>
  <div id="jRep" hidden><div class="lb" style="margin:4px 0 0">YOUR REPLY - SEND THIS TO THE HOST</div><textarea id="jReply" readonly></textarea>
  <div class="row2" style="margin-top:6px"><button class="btn" id="jCopy">COPY REPLY</button><span class="note">Connects as soon as the host pastes it.</span></div></div>
 </div></details>
 <div class="foot2"><button class="btn" id="jBack">&#9666; BACK</button><button class="btn go" id="jGo" disabled>JOIN</button></div>
</div></section>

<section id="olLob" hidden><div style="display:flex;flex-direction:column;gap:12px">
 <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:14px"><div><h2 id="lTitle">HOST A GAME</h2><div class="sub" id="lSub"></div></div><div class="msg" id="lMsg"><i></i><span></span></div></div>
 <div class="lob">
  <div class="lcol">
   <div><div class="lb">GAME MODE</div><div class="modes" id="lModes"></div></div>
   <div class="pan"><div class="lb">ROOM CODE</div><div class="code" id="lCode"></div>
    <div class="row2" style="margin-top:10px"><button class="btn sm" id="lCopy">COPY CODE</button></div><button class="btn sm" id="lInvBtn" style="width:100%;margin-top:8px">INVITE BY CODE (NO SERVER)</button><div class="note" id="lCodeNote" style="margin-top:6px"></div></div>
   <div class="pan" id="lSet"><div class="lb">LOBBY SETTINGS</div>
    <div class="tgl"><span>LOCK ROOM</span><button class="olsw" id="lLock" title="Nobody new can join"><i></i></button></div>
    <div style="margin-top:10px"><input type="password" id="lPw" maxlength="24" autocomplete="off" placeholder="Password (optional)"><div class="note" style="margin-top:5px" id="lPwN">Applies to people who join after you set it.</div></div></div>
  </div>
  <div class="lcol">
   <div><div class="lb">MAP</div><div class="maps" id="lMaps"></div></div>
   <div><div class="lb">PLAYERS <em id="lCnt"></em></div><div class="seats" id="lSeats"></div></div>
   <div class="chat"><div class="log" id="lLog"></div><div class="row2"><input type="text" id="lMsgIn" maxlength="120" placeholder="Say something" autocomplete="off"><button class="btn" id="lSend">SEND</button></div></div>
  </div>
 </div>
 <div class="foot2"><button class="btn" id="lBack">&#9666; LEAVE</button><div class="row2"><span class="note" id="lHint"></span><button class="btn go" id="lGo">START GAME</button></div></div>
</div></section></div>`;
$('scrMain').insertBefore(p,$('scrMain').querySelector('.foot'));
const modal=document.createElement('div');modal.id='olMod';modal.className='olmod';modal.hidden=true;
modal.innerHTML=`<div class="ol olcard"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="font-size:16px">INVITE BY CODE</h2><button class="btn sm" id="mClose">CLOSE</button></div>
<div class="note">No room code or server needed. Make an invite, send it to one player, then paste the reply they send back. Make one invite per player.</div>
<div id="lPend"></div><div class="row2"><button class="btn" id="lNew">NEW INVITE</button></div></div>`;
$('menu').appendChild(modal);
const q=s=>p.querySelector(s)||modal.querySelector(s),V={home:q('#olHome'),join:q('#olJoin'),lob:q('#olLob')};
const show=v=>{for(const k in V)V[k].hidden=k!==v;p.dataset.v=v};
[p,modal].forEach(n=>{n.addEventListener('keydown',e=>e.stopPropagation());n.addEventListener('keyup',e=>e.stopPropagation())});
const setMod=on=>{modal.hidden=!on;if(on)sfxo(560)};q('#mClose').onclick=()=>setMod(false);modal.addEventListener('mousedown',e=>{if(e.target===modal)setMod(false)});modal.addEventListener('keydown',e=>{if(e.key==='Escape')setMod(false)});q('#lInvBtn').onclick=()=>setMod(true);

/* ---------- helpers ---------- */
const clean=s=>String(s==null?'':s).replace(/[^\w .\-]/g,'').trim().slice(0,14).toUpperCase();
const myName=()=>clean(q('#olName').value)||'PLAYER';
q('#olName').value=clean(ls('r6s_name'))||'PLAYER'+(Math.random()*900+100|0);
q('#olName').onchange=()=>{q('#olName').value=myName();ls('r6s_name',myName())};
const uid=()=>{let u=ls('r6s_uid');if(!u){u=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());ls('r6s_uid',u)}return u};
const copy=async(t,btn)=>{try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(_){}a.remove()}
 if(btn){const o=btn.textContent;btn.textContent='COPIED';setTimeout(()=>btn.textContent=o,1200)}sfxo(700)};
const setMsg=(el,kind,txt)=>{el.className='msg '+(kind||'');el.querySelector('span').textContent=txt};
const modeName=k=>(MD[k]||[k])[0],mapName=m=>m==='rand'?'RANDOM':(MAPS[+m]?MAPS[+m].n:'RANDOM');

/* ---------- connection settings ---------- */
const cfg=()=>{try{return JSON.parse(ls('r6s_net')||'{}')}catch(e){return{}}};
const cfgIce=c=>{const o={};if(c.turn)o.turn=[{host:c.turn,username:c.user||'',credential:c.cred||''}];if(c.relay)o.relayOnly=true;return o};
(()=>{const c=cfg();q('#cBroker').value=c.broker||'';q('#cTurn').value=c.turn||'';q('#cUser').value=c.user||'';q('#cCred').value=c.cred||'';q('#cRelay').checked=!!c.relay})();
const readCfg=()=>({broker:q('#cBroker').value.trim(),turn:q('#cTurn').value.trim(),user:q('#cUser').value.trim(),cred:q('#cCred').value,relay:q('#cRelay').checked});
q('#cSave').onclick=()=>{ls('r6s_net',JSON.stringify(readCfg()));q('#cOut').textContent='Saved. Applies to the next lobby you open or join.'};
q('#cTest').onclick=async()=>{const o=q('#cOut');o.textContent='Testing...';try{const r=await P2P.probeIce(cfgIce(readCfg()));o.textContent=`Found ${r.host} local, ${r.srflx} public${r.relay?', '+r.relay+' relay (TURN works)':', no relay'}. `+(r.srflx||r.relay?'Direct play should work.':'No public address found: this network may block play.')}catch(e){o.textContent='Test failed: '+(e&&e.message||e)}};

/* ---------- state ---------- */
let net=null,role=null,joining=false,gotHi=false,code='',mode='bomb',map=0,locked=false,pw='',seats={},pend=null,helloT={},lastChat=0,joinCode_='';
let lob={mode:'bomb',map:0,locked:false,pw:0,seats:[],you:''};
const seatList=()=>{if(role==='host'){const a=[{id:'host',n:myName(),host:1}];Object.keys(seats).filter(i=>seats[i].ok).sort((x,y)=>+x.slice(1)-+y.slice(1)).forEach(i=>a.push({id:i,n:seats[i].n}));return a}return lob.seats};
const log=(who,s,sys)=>{const L=q('#lLog'),d=document.createElement('div');if(sys){d.className='s';d.textContent='* '+s}else{const b=document.createElement('b');b.textContent=who+': ';d.append(b,document.createTextNode(s))}L.appendChild(d);while(L.children.length>120)L.firstChild.remove();L.scrollTop=1e9};
const live=()=>{tb.classList.toggle('live',!!role&&(role==='host'||gotHi))};
function mk(){if(net){try{net.destroy()}catch(e){}}
 const c=cfg();net=P2P.create({ns:NS,maxPeers:MAXP,uid:uid(),brokers:c.broker?[c.broker]:undefined,ice:cfgIce(c)});
 net.on('open',onOpen);net.on('close',onClose);net.on('message',onMsg);net.on('rtt',()=>paintSeats());
 net.on('status',s=>{if(role==='host')return;if(!gotHi&&p.dataset.v==='join'&&joining)setMsg(q('#jMsg'),'wait',s)});
 window.R6Online.net=net;return net}
window.R6Online={net:null,get role(){return role},get you(){return lob.you},seats:()=>seatList(),get lobby(){return{mode:role==='host'?mode:lob.mode,map:role==='host'?map:lob.map}},onStart:null};

/* ---------- lobby painting ---------- */
function paintModes(){const host=role==='host',cur=host?mode:lob.mode;q('#lModes').innerHTML=Object.keys(MD).map(k=>`<button class="mode ${cur===k?'on':''}" data-md="${k}" ${host?'':'disabled'}><b>${MD[k][0]}</b><small>${MD[k][1].split('. ')[0].replace(/\.$/,'')}.</small></button>`).join('')}
function paintMaps(){const host=role==='host',cur=String(host?map:lob.map);q('#lMaps').innerHTML=`<button class="mp ${cur==='rand'?'on':''}" data-olm="rand" ${host?'':'disabled'}><div class="rn">?</div><b>RANDOM</b></button>`+MAPS.map((m,i)=>`<button class="mp ${cur===String(i)?'on':''}" data-olm="${i}" ${host?'':'disabled'}><img src="maps/${m.id}.png" alt="" draggable="false"><b>${m.n}</b></button>`).join('')}
function paintSeats(){const l=seatList(),host=role==='host',el=q('#lSeats');let h='';
 for(let i=0;i<SEATS;i++){const s=l[i];if(!s){h+='<div class="seat open">OPEN</div>';continue}
  const isMe=s.id===(host?'host':lob.you),r=host&&s.id!=='host'&&net?net.rtt(s.id):-1;
  h+=`<div class="seat ${isMe?'me':''}"><span class="av"></span><span class="nm"></span>${s.host?'<span class="tg">HOST</span>':isMe?'<span class="tg">YOU</span>':''}${host&&s.id!=='host'?`<span class="pg">${r>=0?r+'ms':''}</span><button class="btn sm kx" data-kick="${s.id}" title="Remove player">&times;</button>`:''}</div>`}
 el.innerHTML=h;el.querySelectorAll('.seat:not(.open)').forEach((d,i)=>{d.querySelector('.nm').textContent=l[i].n;d.querySelector('.av').textContent=(l[i].n||'?')[0]});q('#lCnt').textContent=l.length+' / '+SEATS}
function paintCode(){const off=!code,c=(code||'-----').split('');q('#lCode').className='code'+(off?' off':'');q('#lCode').innerHTML=c.map(x=>`<span>${x}</span>`).join('');q('#lCopy').disabled=off;
 q('#lCodeNote').textContent=off?(role==='host'?'Room codes unavailable. Use INVITE BY CODE.':'Joined by invite.'):''}
function paintAll(){const host=role==='host';q('#lTitle').textContent=host?'HOST A GAME':'LOBBY';q('#lSub').textContent=host?'You control the mode, map and who joins.':'The host controls the mode and map.';
 q('#lSet').hidden=!host;q('#lInvBtn').hidden=!host;q('#lGo').hidden=!host;q('#lHint').textContent=host?'Match sync is not built yet: this starts your own match.':'Waiting for the host to start.';q('#lBack').innerHTML=host?'&#9666; CLOSE LOBBY':'&#9666; LEAVE';
 q('#lLock').classList.toggle('on',locked);paintModes();paintMaps();paintSeats();paintCode();live()}

/* ---------- host side ---------- */
const lobbyMsg=to=>({t:'lobby',you:to,seats:seatList().map(s=>[s.id,s.n]),mode,map,locked,pw:pw?1:0});
function pushLobby(){if(role!=='host'||!net)return;for(const id of Object.keys(seats))if(seats[id].ok)net.send(id,lobbyMsg(id));paintAll()}
function sysAll(s){log('',s,1);if(net)for(const id of Object.keys(seats))if(seats[id].ok)net.send(id,{t:'sys',s})}
async function openHost(){mk();role='host';gotHi=true;mode=uiSel.mode||'bomb';map=uiSel.mapPick==null?'rand':uiSel.mapPick;locked=false;pw='';seats={};code='';pend=null;q('#lLog').innerHTML='';q('#lPw').value='';q('#lPwN').textContent='Applies to people who join after you set it.';q('#lPend').innerHTML='';q('#lNew').disabled=false;setMod(false);
 show('lob');paintAll();setMsg(q('#lMsg'),'wait','Opening room...');
 try{code=await net.host();if(role!=='host')return;setMsg(q('#lMsg'),'ok','Room open. Friends can join with this code.')}
 catch(e){if(e&&e.code==='cancelled')return;code='';setMsg(q('#lMsg'),'bad','Room code servers unreachable. Invites still work.');log('','Could not reach the room code servers. Use INVITE BY CODE instead.',1)}
 paintAll();sfxo(520,.08)}
function onOpen(id){if(role==='host'){seats[id]={ok:false,n:''};if(pend&&pend.id===id)setTimeout(clearPend,600);helloT[id]=setTimeout(()=>{if(seats[id]&&!seats[id].ok)net.kick(id,'no hello')},HELLO_MS)}
 else if(id==='host'){net.send('host',{t:'hi',n:myName(),pw:q('#jPw').value})}}
function onClose(id,why){if(role==='host'){clearTimeout(helloT[id]);const s=seats[id];delete seats[id];if(pend&&pend.id===id)clearPend();if(s&&s.ok){sysAll(s.n+' left');pushLobby()}else paintSeats()}
 else if(id==='host'&&role==='client'){const was=gotHi;leave(true);if(was)notice('The host closed the lobby ('+(why||'disconnected')+').',1);else notice(why==='kicked'?'The host removed you.':'Connection failed.',1)}}
function onMsg(id,m){if(!m||typeof m!=='object')return;
 if(role==='host'){const s=seats[id];if(!s)return;
  if(m.t==='hi'&&!s.ok){if(pw&&String(m.pw||'')!==pw){net.send(id,{t:'deny',why:'Wrong password.'});setTimeout(()=>net.kick(id,'bad password'),250);return}
   let n=clean(m.n)||'PLAYER',base=n,k=2;const used=()=>seatList().some(x=>x.n===n);while(used())n=(base.slice(0,11)+' '+(k++)).trim();
   s.ok=true;s.n=n;clearTimeout(helloT[id]);sysAll(n+' joined');pushLobby();sfxo(640)}
  else if(s.ok&&m.t==='chat'){const t=Date.now();if(t-(s.last||0)<350)return;s.last=t;const x=String(m.s||'').slice(0,120).trim();if(!x)return;log(s.n,x);for(const o of Object.keys(seats))if(seats[o].ok&&o!==id)net.send(o,{t:'chat',n:s.n,s:x})}}
 else if(id==='host'&&role==='client'){
  if(m.t==='lobby'){const first=!gotHi;gotHi=true;lob={mode:m.mode,map:m.map,locked:!!m.locked,pw:m.pw,you:String(m.you||''),seats:(Array.isArray(m.seats)?m.seats:[]).slice(0,SEATS).map(a=>({id:String(a[0]),n:clean(a[1])||'PLAYER',host:a[0]==='host'?1:0}))};
   if(first){joining=false;q('#lLog').innerHTML='';code=joinCode_;show('lob');log('','Joined the lobby.',1)}
   setMsg(q('#lMsg'),'ok','Connected to host');paintAll();if(first)sfxo(640)}
  else if(m.t==='chat')log(clean(m.n),String(m.s||'').slice(0,120));
  else if(m.t==='sys')log('',String(m.s||'').slice(0,120),1);
  else if(m.t==='deny'){const w=String(m.why||'Refused.').slice(0,80);leave(true);notice(w,1)}
  else if(m.t==='start'){const s='Host started '+modeName(m.mode)+' on '+mapName(m.map)+'. Live match sync is not built yet, so stay here for the next one.';log('',s,1);setMsg(q('#lMsg'),'wait','Match started by host');if(typeof window.R6Online.onStart==='function')window.R6Online.onStart(m)}}}

/* ---------- guest side ---------- */
function notice(txt,bad){show('join');setMsg(q('#jMsg'),bad?'bad':'',txt)}
async function joinCode(){const c=jin.map(i=>i.value).join('').toUpperCase();if(c.length<5||joining)return;
 mk();role='client';joining=true;gotHi=false;joinCode_=c;q('#jGo').disabled=true;setMsg(q('#jMsg'),'wait','Looking for room '+c+'...');
 try{await net.join(c);setMsg(q('#jMsg'),'wait','Connected. Entering the lobby...');setTimeout(()=>{if(role==='client'&&!gotHi&&joining){leave(true);notice('The host did not answer. Try again.',1)}},HELLO_MS)}
 catch(e){if(e&&e.code==='cancelled')return;leave(true);notice(e&&e.message||'Could not join.',1)}}
q('#jGo').onclick=joinCode;
function leave(quiet){setMod(false);joining=false;gotHi=false;if(net){try{net.close()}catch(e){}}role=null;seats={};lob={mode:'bomb',map:0,locked:false,pw:0,seats:[],you:''};pend=null;code='';joinCode_='';live();if(!quiet)show('home');joinCheck()}

/* ---------- join screen widgets ---------- */
const jc=q('#jCode');for(let i=0;i<5;i++){const e=document.createElement('input');e.type='text';e.maxLength=1;e.autocomplete='off';e.spellcheck=false;e.setAttribute('aria-label','Room code letter '+(i+1));jc.appendChild(e)}
const jin=[...jc.children],ALPHA=/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;
function joinCheck(){const n=jin.filter(i=>i.value).length;jin.forEach(i=>i.classList.toggle('f',!!i.value));q('#jGo').disabled=n<5||joining}
const fill=(s,at)=>{s=String(s).toUpperCase().replace(ALPHA,'').slice(0,5-at);for(let k=0;k<s.length;k++)jin[at+k].value=s[k];jin[Math.min(4,at+s.length)].focus();joinCheck()};
jin.forEach((e,i)=>{e.oninput=()=>{const v=e.value.toUpperCase().replace(ALPHA,'');e.value='';if(v)fill(v,i);joinCheck()};
 e.onkeydown=ev=>{if(ev.key==='Backspace'&&!e.value&&i>0){jin[i-1].value='';jin[i-1].focus();joinCheck();ev.preventDefault()}else if(ev.key==='ArrowLeft'&&i>0)jin[i-1].focus();else if(ev.key==='ArrowRight'&&i<4)jin[i+1].focus();else if(ev.key==='Enter')joinCode()};
 e.onpaste=ev=>{ev.preventDefault();fill((ev.clipboardData||window.clipboardData).getData('text'),0)};e.onfocus=()=>e.select()});
q('#jPw').onkeydown=ev=>{if(ev.key==='Enter')joinCode()};
q('#jMake').onclick=async()=>{const t=q('#jOffer').value.trim();if(!t)return setMsg(q('#jMsg'),'bad','Paste the host\'s invite code first.');
 try{mk();role='client';joining=true;gotHi=false;joinCode_='';setMsg(q('#jMsg'),'wait','Making your reply...');q('#jMake').disabled=true;
  const r=await net.joinManual(t);q('#jReply').value=r;q('#jRep').hidden=false;setMsg(q('#jMsg'),'wait','Send the reply to the host. This connects as soon as they paste it.');copy(r)}
 catch(e){leave(true);setMsg(q('#jMsg'),'bad',(e&&e.message)||'That invite code did not work.')}finally{q('#jMake').disabled=false}};
q('#jCopy').onclick=e=>copy(q('#jReply').value,e.target);
q('#jPaste').onclick=async()=>{try{q('#jOffer').value=(await navigator.clipboard.readText()).trim()}catch(e){setMsg(q('#jMsg'),'bad','Your browser blocked paste. Press Ctrl+V in the box instead.')}};
q('#jBack').onclick=()=>{leave();sfxo(480)};

/* ---------- home ---------- */
q('#goHost').onclick=()=>{q('#olName').onchange();openHost();sfxo(560)};
q('#goJoin').onclick=()=>{q('#olName').onchange();jin.forEach(i=>i.value='');q('#jReply').value='';q('#jRep').hidden=true;q('#jOffer').value='';q('#jInv').open=false;setMsg(q('#jMsg'),'','Ask the host for their five-letter code.');show('join');joinCheck();jin[0].focus();sfxo(560)};

/* ---------- lobby actions ---------- */
p.addEventListener('click',e=>{const md=e.target.closest('[data-md]'),mp=e.target.closest('[data-olm]'),kk=e.target.closest('[data-kick]');if(role!=='host')return;
 if(md){mode=md.dataset.md;uiSel.mode=mode;pushLobby();sfxo(760)}
 if(mp){map=mp.dataset.olm==='rand'?'rand':+mp.dataset.olm;uiSel.mapPick=map;pushLobby();sfxo(760)}
 if(kk&&seats[kk.dataset.kick])net.kick(kk.dataset.kick,'removed by host')});
q('#lLock').onclick=()=>{if(role!=='host')return;locked=!locked;net.setAccepting(!locked);q('#lLock').classList.toggle('on',locked);sysAll(locked?'Room locked':'Room unlocked');sfxo(700)};
q('#lPw').oninput=()=>{pw=q('#lPw').value.slice(0,24);q('#lPwN').textContent=pw?'Password set. New joiners must type it.':'No password. Anyone with the code can join.'};
q('#lCopy').onclick=e=>copy(code,e.target);
q('#lBack').onclick=()=>{leave();sfxo(480)};
const send=()=>{const s=q('#lMsgIn').value.trim().slice(0,120);if(!s||!role)return;q('#lMsgIn').value='';
 if(role==='host'){log(myName(),s);for(const id of Object.keys(seats))if(seats[id].ok)net.send(id,{t:'chat',n:myName(),s})}else{if(Date.now()-lastChat<350)return;lastChat=Date.now();net.send('host',{t:'chat',s});log(myName(),s)}};
q('#lSend').onclick=send;q('#lMsgIn').onkeydown=e=>{if(e.key==='Enter')send()};
q('#lGo').onclick=()=>{if(role!=='host')return;if(net)for(const id of Object.keys(seats))if(seats[id].ok)net.send(id,{t:'start',mode,map});
 uiSel.mode=mode;uiSel.mapPick=map;
 if(typeof window.R6Online.onStart==='function')window.R6Online.onStart({t:'start',mode,map});
 try{renderMain();document.querySelectorAll('#tabs button:not(.gear)').forEach(x=>x.classList.toggle('on',x.dataset.tab==='play'));document.querySelectorAll('.tp').forEach(x=>x.hidden=x.id!=='tp-play');$('toOps').click()}catch(err){log('','Could not start: '+err.message,1)}};

/* ---------- secure invites (host) ---------- */
function clearPend(){pend=null;q('#lPend').innerHTML='';q('#lNew').disabled=false}
q('#lNew').onclick=async()=>{if(role!=='host'||!net)return;q('#lNew').disabled=true;const box=q('#lPend');
 box.innerHTML='<div class="pend"><div class="st">MAKING INVITE...</div></div>';
 try{const r=await net.hostManual();pend=r;
  box.innerHTML=`<div class="pend"><div class="st">1. SEND THIS INVITE TO ONE PLAYER</div><textarea readonly id="pOffer"></textarea><div class="row2"><button class="btn sm" id="pCopy">COPY INVITE</button></div>
   <div class="st" style="margin-top:4px">2. PASTE THEIR REPLY</div><textarea id="pReply" placeholder="Paste the reply code here" spellcheck="false"></textarea>
   <div class="row2"><button class="btn sm" id="pAcc">CONNECT</button><button class="btn sm" id="pCan">CANCEL</button><span class="note" id="pSt"></span></div></div>`;
  q('#pOffer').value=r.code;q('#pCopy').onclick=e=>copy(r.code,e.target);
  q('#pCan').onclick=()=>{try{net.cancelManual(r.id)}catch(e){}clearPend()};
  q('#pAcc').onclick=async()=>{const t=q('#pReply').value.trim();if(!t){q('#pSt').textContent='Paste their reply first.';return}q('#pSt').textContent='Connecting...';
   try{await net.acceptAnswer(r.id,t);q('#pSt').textContent='Waiting for them to appear...'}catch(e){q('#pSt').textContent=(e&&e.message)||'That reply did not work.'}}}
 catch(e){box.innerHTML='';q('#lNew').disabled=false;log('','Could not make an invite: '+(e&&e.message||e),1)}};

show('home');
setInterval(()=>{if(role==='host'&&p.dataset.v==='lob')paintSeats()},3000);
})();
