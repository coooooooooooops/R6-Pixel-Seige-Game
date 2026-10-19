const M=require(require('path').join(__dirname,'..','maps.js'));let bad=0;const E=(m,x)=>{console.log('!!',m.n,x);bad++};
for(const m of M){
 for(let fl=0;fl<2;fl++){const f=m.f[fl],g=f.g;
  if(g.length!==m.rh.length)E(m,'f'+fl+' rows '+g.length+' vs rh '+m.rh.length);
  g.forEach((r,j)=>{if(r.length!==m.cw.length)E(m,'f'+fl+' row'+j+' len '+r.length+' vs '+m.cw.length)});
  const bb={};g.forEach((r,j)=>[...r].forEach((c,i)=>{(bb[c]=bb[c]||{x0:i,x1:i,y0:j,y1:j,n:0});const b=bb[c];b.x0=Math.min(b.x0,i);b.x1=Math.max(b.x1,i);b.y0=Math.min(b.y0,j);b.y1=Math.max(b.y1,j);b.n++}));
  const names=new Set();
  for(const c in bb){const b=bb[c];if((b.x1-b.x0+1)*(b.y1-b.y0+1)!==b.n)E(m,'f'+fl+" '"+c+"' not rectangle");if(!f.l[c])E(m,'f'+fl+" '"+c+"' no legend");else{if(names.has(f.l[c].replace(/^~/,'')))E(m,'dup name '+f.l[c]);names.add(f.l[c].replace(/^~/,''))}}
  for(const c in f.l)if(!bb[c])E(m,'f'+fl+" legend '"+c+"' unused");
  m['_n'+fl]=names}
 const has=(fl,n)=>m['_n'+fl].has(n);
 m.pairs.forEach(p=>p.forEach(([fl,n])=>{if(!has(fl,n))E(m,'pair room missing '+fl+' '+n)}));
 m.host.forEach(([fl,n])=>{if(!has(fl,n))E(m,'host missing '+n)});
 m.stairs.forEach(([a,b])=>{if(!has(0,a))E(m,'stair0 '+a);if(!has(1,b))E(m,'stair1 '+b)});
 m.ent.forEach(n=>{if(!has(0,n))E(m,'ent '+n)});
 if(m.pairs.length!==4)E(m,'pairs!=4');
 const W=m.cw.reduce((a,b)=>a+b+1,0),H=m.rh.reduce((a,b)=>a+b+1,0);
 console.log(m.n.padEnd(18),'interior',W,'x',H,'rooms',m._n0.size+'+'+m._n1.size)}
console.log(bad?bad+' PROBLEMS':'ALL MAPS VALID, '+M.length+' maps');
