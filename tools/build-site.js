/* Builds the website for Cloudflare Pages: `node tools/build-site.js`  ->  dist/
   dist/ = the game as a normal web page (index.html) + the extension zip people download from the page.
   Cloudflare Pages settings: Build command `node tools/build-site.js`, Build output directory `dist`. No dependencies. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'dist');
// files that are NOT part of the extension (and so not in the zip or the site)
const SKIP=/^(\.git|\.github|tools|build|content|site|dist|node_modules)(\/|$)|^(README\.md|HANDOFF\.md|SITE\.md|\.gitignore|\.DS_Store|Thumbs\.db|supabase_setup\.sql)$|\.zip$|\.py$/;
function walk(dir,rel=''){let out=[];for(const n of fs.readdirSync(path.join(dir,rel)).sort()){const r=rel?rel+'/'+n:n;if(SKIP.test(r))continue;
 const st=fs.statSync(path.join(dir,r));if(st.isDirectory())out=out.concat(walk(dir,r));else out.push(r)}return out}
const files=walk(ROOT);
const man=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8'));
const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function zip(list){const d=new Date(),dt=((d.getFullYear()-1980)<<9|(d.getMonth()+1)<<5|d.getDate())&0xFFFF,tm=(d.getHours()<<11|d.getMinutes()<<5|(d.getSeconds()>>1))&0xFFFF;
 const loc=[],cen=[];let off=0;
 for(const f of list){const data=fs.readFileSync(path.join(ROOT,f)),name=Buffer.from(f),c=crc(data),def=zlib.deflateRawSync(data,{level:9}),useDef=def.length<data.length,body=useDef?def:data,meth=useDef?8:0;
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x0800,6);h.writeUInt16LE(meth,8);h.writeUInt16LE(tm,10);h.writeUInt16LE(dt,12);h.writeUInt32LE(c,14);h.writeUInt32LE(body.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);h.writeUInt16LE(0,28);
  loc.push(h,name,body);
  const e=Buffer.alloc(46);e.writeUInt32LE(0x02014b50,0);e.writeUInt16LE(0x031E,4);e.writeUInt16LE(20,6);e.writeUInt16LE(0x0800,8);e.writeUInt16LE(meth,10);e.writeUInt16LE(tm,12);e.writeUInt16LE(dt,14);e.writeUInt32LE(c,16);e.writeUInt32LE(body.length,20);e.writeUInt32LE(data.length,24);e.writeUInt16LE(name.length,28);e.writeUInt32LE((0o100644<<16)>>>0,38);e.writeUInt32LE(off,42);
  cen.push(e,name);off+=30+name.length+body.length}
 const cs=cen.reduce((a,b)=>a+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(list.length,8);end.writeUInt16LE(list.length,10);end.writeUInt32LE(cs,12);end.writeUInt32LE(off,16);
 return Buffer.concat([...loc,...cen,end])}
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
for(const f of files){const to=path.join(OUT,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(ROOT,f),to)}
// the extension zip people download (same file set the GitHub release uses)
const ext=files.filter(f=>!/^popup\./.test(f)||true);
fs.writeFileSync(path.join(OUT,'R6-Pixel-Siege.zip'),zip(ext));
// the web page: the same game.html, flagged as "running on the web" + the download prompt
let html=fs.readFileSync(path.join(ROOT,'game.html'),'utf8');
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><script>window.R6_WEB=1</script><link rel="icon" href="icons/48.png"><meta name="description" content="R6 Pixel Siege: a 2D pixel-art tactical breach and clear shooter. Play free in your browser, host or join online rooms, or install the Chrome extension.">');
html=html.replace(/<title>[^<]*<\/title>/,'<title>R6 Pixel Siege</title>');
if(!/<\/body>/i.test(html))html+='</body>';
html=html.replace(/<\/body>/i,'<script src="web.js"></script></body>');
fs.writeFileSync(path.join(OUT,'index.html'),html);
fs.copyFileSync(path.join(ROOT,'site','web.js'),path.join(OUT,'web.js'));
fs.copyFileSync(path.join(ROOT,'site','_headers'),path.join(OUT,'_headers'));
fs.writeFileSync(path.join(OUT,'version.json'),JSON.stringify({version:man.version,built:new Date().toISOString(),files:ext.length}));
console.log('site built: '+files.length+' files, extension zip v'+man.version+' ('+(fs.statSync(path.join(OUT,'R6-Pixel-Siege.zip')).size/1024|0)+' KB) -> dist/');
