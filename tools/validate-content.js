#!/usr/bin/env node
/* Validates content/content.json with the SAME code the game uses (seasons.js), so a pack that passes here loads in the game.
   Usage: node tools/validate-content.js [path/to/content.json]      Exit code 1 on any error. Zero dependencies. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),file=path.resolve(process.argv[2]||path.join(root,'content','content.json'));
global.window={};
for(const f of['catalog.js','seasons.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
const S=window.R6S;if(!S){console.error('could not load seasons.js');process.exit(1)}
let pack;try{pack=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){console.error('JSON error in '+file+': '+e.message);process.exit(1)}
const v=S.validatePack(pack);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
console.log('content: '+path.relative(process.cwd(),file)+'  rev='+(pack.rev||'(none)')+'  app='+manifest.version+(v.app?' (pack advertises '+v.app.version+')':''));
console.log('items accepted: '+v.items.length+' / '+((pack.items||[]).length)+'   seasons: '+v.seasons.length);
const byType={};v.items.forEach(i=>byType[i.t]=(byType[i.t]||0)+1);if(v.items.length)console.log('  by type: '+Object.entries(byType).map(([k,n])=>k+':'+n).join('  '));
/* apply and show the affected season tracks */
const res=S.applyContent(pack);
const yms=new Set(v.seasons.map(s=>s.ym));
for(const it of v.items)if(it.se){const m=Object.keys(S.GRP).find(g=>g===it.se);if(m){const mm=m.slice(1),d=new Date(),y=d.getFullYear()+(+mm<d.getMonth()+1?1:0);yms.add(y+'-'+mm)}}
for(const ym of [...yms].sort()){const s=S.seasonKey(ym); console.log('\nseason '+ym+'  '+s.name+'  ('+s.items.length+' items)');
 s.tiers.forEach((t,i)=>{if(t.k==='it'){const c=s.items.find(x=>x.id===t.id);console.log('  T'+String(i+1).padStart(2)+'  '+c.t.toUpperCase()+' '+c.r.toUpperCase()+'  '+c.n+(S.RS.ids.has(c.id)?'   <- from pack':''))}});
 for(const n of s.tiers.notes||[])console.log('  note: '+n)}
if(v.warnings.length){console.log('\nwarnings:');v.warnings.forEach(w=>console.log('  - '+w))}
if(v.errors.length){console.log('\nERRORS:');v.errors.forEach(e=>console.log('  x '+e));console.log('\nFAILED: '+v.errors.length+' problem(s). The game would skip those entries.');process.exit(1)}
console.log('\nOK: content pack is valid.');
