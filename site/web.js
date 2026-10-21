/* R6 Pixel Siege - site/web.js
   Only loaded by the website (tools/build-site.js adds it to index.html). Never part of the extension.
   Adds: a download button in the menu bar, a dismissible "get the extension" card, and the install-instructions popup that
   appears the moment the zip starts downloading. The game itself is the same code the extension runs. */
(()=>{
const ZIP='R6-Pixel-Siege.zip';
const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform));
const chromium=!!(navigator.userAgentData&&navigator.userAgentData.brands&&navigator.userAgentData.brands.some(b=>/Chrom|Edge|Brave|Opera/i.test(b.brand)))||/Chrome\//.test(navigator.userAgent);
let ver='';fetch('version.json',{cache:'no-store'}).then(r=>r.json()).then(j=>{ver=j.version||'';const v=document.getElementById('r6wVer');if(v&&ver)v.textContent='v'+ver}).catch(()=>{});
const st=document.createElement('style');st.textContent=`
#r6wBtn{flex:none;align-self:center;width:30px;height:28px;margin:0 0 4px 10px;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(229,48,58,.14);border:1px solid #e5303a;border-radius:2px;color:#ff6a72;cursor:pointer}
#r6wBtn:hover{background:#e5303a;color:#fff}#r6wBtn svg{width:16px;height:16px;display:block}
#r6wCard{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:70;display:flex;align-items:center;gap:14px;max-width:min(560px,calc(100vw - 20px));padding:10px 12px 10px 16px;background:rgba(10,13,18,.96);border:1px solid #2d2d33;border-left:3px solid #e5303a;color:#e9edf2;font:600 14px Rajdhani,sans-serif;letter-spacing:.5px;box-shadow:0 6px 30px #000a}
#r6wCard b{font-family:Silkscreen,monospace;font-weight:400;letter-spacing:2px;color:#ff6a72;display:block;font-size:11px;margin-bottom:2px}
#r6wCard .go{background:#e5303a;color:#fff;border:0;padding:9px 14px;font:700 13px Rajdhani,sans-serif;letter-spacing:2px;cursor:pointer;white-space:nowrap}
#r6wCard .go:hover{background:#ff4a54}#r6wCard .x{background:none;border:0;color:#8b8d95;font-size:20px;cursor:pointer;padding:0 4px}#r6wCard .x:hover{color:#fff}
#r6wMod{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(3,5,8,.82);padding:14px;box-sizing:border-box}
#r6wMod.on{display:flex}
#r6wBox{width:min(640px,100%);max-height:100%;overflow:auto;background:#0d1117;border:1px solid #2d2d33;border-top:3px solid #e5303a;color:#e9edf2;font:600 16px/1.35 Rajdhani,sans-serif;padding:22px 26px;box-shadow:0 10px 60px #000}
#r6wBox h2{margin:0 0 4px;font:400 20px Silkscreen,monospace;letter-spacing:3px}#r6wBox h2 i{font-style:normal;color:#e5303a}
#r6wBox .sub{color:#8b8d95;letter-spacing:1px;margin-bottom:14px;font-size:14px}
#r6wBox ol{margin:0 0 14px;padding:0;list-style:none;counter-reset:s}
#r6wBox li{counter-increment:s;position:relative;padding:8px 0 8px 40px;border-bottom:1px solid #1b212b}
#r6wBox li::before{content:counter(s);position:absolute;left:0;top:7px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:#e5303a;color:#fff;font:400 13px Silkscreen,monospace}
#r6wBox code{background:#171d27;border:1px solid #2d2d33;padding:1px 6px;color:#ffd24a;font-family:Silkscreen,monospace;font-size:12px}
#r6wBox .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
#r6wBox button,#r6wBox a.b{background:#171d27;border:1px solid #3a3a42;color:#e9edf2;padding:8px 14px;font:700 13px Rajdhani,sans-serif;letter-spacing:2px;cursor:pointer;text-decoration:none}
#r6wBox button:hover,#r6wBox a.b:hover{border-color:#e5303a;color:#ff6a72}#r6wBox a.b.pri,#r6wBox button.pri{background:#e5303a;border-color:#e5303a;color:#fff}#r6wBox a.b.pri:hover{background:#ff4a54;color:#fff}
#r6wBox .note{margin-top:12px;color:#8b8d95;font-size:14px;letter-spacing:.5px}#r6wBox .warn{color:#ffb050}
`;document.head.appendChild(st);

const ICON='<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M9 2v9M5 8l4 4 4-4M3 15h12"/></svg>';
function download(){
 if(mobile){openModal(false);return}
 const a=document.createElement('a');a.href=ZIP;a.download=ZIP;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
 openModal(true)}

const mod=document.createElement('div');mod.id='r6wMod';
mod.innerHTML=`<div id="r6wBox" role="dialog" aria-modal="true" aria-label="Install the extension">
<h2>INSTALL <i>R6 PIXEL SIEGE</i></h2><div class="sub" id="r6wSub"></div>
<ol>
<li><b>Unzip</b> the file that just downloaded (<code>${ZIP}</code>). Keep the folder somewhere permanent, like Documents. Do not delete it.</li>
<li>Open a new tab and go to <code>chrome://extensions</code> <span class="row" style="display:inline-flex;margin:0 0 0 6px"><button id="r6wCopy">COPY LINK</button></span><br><span style="color:#8b8d95;font-size:14px">(Edge: <code>edge://extensions</code>, Brave: <code>brave://extensions</code>. Browsers do not let websites open this page for you.)</span></li>
<li>Turn on <b>Developer mode</b> (the switch at the top right).</li>
<li>Click <b>Load unpacked</b> and choose the unzipped folder (the one that contains <code>manifest.json</code>).</li>
<li>Click the puzzle-piece icon in the toolbar and pin <b>R6 Pixel Siege</b>. Click it to play in the popup, or hit the corner button to open it full screen.</li>
</ol>
<div class="row"><a class="b pri" id="r6wAgain" href="${ZIP}" download>DOWNLOAD AGAIN</a><button id="r6wClose">CLOSE</button></div>
<div class="note">Rooms work between the website and the extension: a code from one joins on the other. Your account and unlocks follow you when you sign in. After the first install the extension updates itself from its own <b>UPDATE NOW</b> button. <span id="r6wVer" style="color:#ffd24a"></span></div>
</div>`;document.body.appendChild(mod);
function openModal(started){
 const sub=document.getElementById('r6wSub');
 sub.innerHTML=mobile?'<span class="warn">Extensions need Chrome, Edge or Brave on a computer. Open this page on your computer to install it. You can keep playing right here on your phone.</span>'
  :(started?'Your download has started. Follow these steps to finish (takes about a minute).':'Follow these steps to finish.')+(chromium?'':' <span class="warn">This browser cannot load Chrome extensions. Use Chrome, Edge or Brave.</span>');
 document.getElementById('r6wAgain').style.display=mobile?'none':'';
 mod.classList.add('on');document.getElementById('r6wClose').focus()}
const close=()=>{mod.classList.remove('on');dismissCard()};
mod.addEventListener('click',e=>{if(e.target===mod)close()});
document.getElementById('r6wClose').onclick=close;
addEventListener('keydown',e=>{if(e.key==='Escape'&&mod.classList.contains('on')){e.stopPropagation();close()}},true);
document.getElementById('r6wCopy').onclick=function(){const t=/Edg\//.test(navigator.userAgent)?'edge://extensions':/Brave/.test(navigator.userAgent)||(navigator.brave)?'brave://extensions':'chrome://extensions';
 const done=()=>{this.textContent='COPIED '+t};try{navigator.clipboard.writeText(t).then(done,()=>{done()})}catch(e){done()}};

// permanent icon button in the menu tab bar
const tabs=document.getElementById('tabs');
if(tabs){const b=document.createElement('button');b.id='r6wBtn';b.type='button';b.title='Download the extension';b.setAttribute('aria-label','Download the extension');b.innerHTML=ICON;b.onclick=download;
 const cr=document.getElementById('crBadge');if(cr)tabs.insertBefore(b,cr);else tabs.appendChild(b)}

// dismissible card (shown on the menu only, until closed once)
let card=null;const KEY='r6w_card_dismissed';
function dismissCard(){try{localStorage.setItem(KEY,'1')}catch(e){}if(card){card.remove();card=null}}
let dismissed=false;try{dismissed=!!localStorage.getItem(KEY)}catch(e){}
if(!dismissed&&!mobile){card=document.createElement('div');card.id='r6wCard';card.innerHTML='<div><b>PLAY FROM YOUR TOOLBAR</b>Get the free Chrome extension: popup play, full screen, one-click updates.</div><button class="go" type="button">DOWNLOAD EXTENSION</button><button class="x" type="button" aria-label="Dismiss">&times;</button>';
 card.querySelector('.go').onclick=download;card.querySelector('.x').onclick=dismissCard;document.body.appendChild(card);
 const menu=document.getElementById('menu');
 setInterval(()=>{if(card)card.style.display=(menu&&menu.offsetParent!==null&&!mod.classList.contains('on'))?'flex':'none'},400)}
window.R6Web={download,openModal};
})();
