const m=require('../manifest.json');
const bad=[];if(m.manifest_version!==3)bad.push('manifest_version must be 3');if(!/^\d+\.\d+\.\d+$/.test(m.version))bad.push('version must be x.y.z');
if(m.host_permissions&&m.host_permissions.length)console.log('note: host_permissions present: '+m.host_permissions.join(','));
const fs=require('fs');for(const f of['game.html','popup.html','popup.js','game.js','seasons.js','season-ui.js','updater.js','catalog.js','shop.js','cosmetics.js','locker.js'])if(!fs.existsSync(__dirname+'/../'+f))bad.push('missing '+f);
const html=fs.readFileSync(__dirname+'/../game.html','utf8');for(const f of['seasons.js','season-ui.js','updater.js'])if(!html.includes('src="'+f+'"'))bad.push('game.html does not load '+f);
if(bad.length){console.error(bad.join('\n'));process.exit(1)}console.log('manifest ok, version '+m.version);
