// Only public application files go to the hosted Site; never package personal records.
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.'),target=path.join(root,'sites','ztmy-room');
const manifest=JSON.parse(await readFile(path.join(target,'.openai','hosting.json'),'utf8'));
if(!manifest.project_id||manifest.static?.directory!=='dist')throw Error('Use the registered MY ROOM Site manifest.');
const files=['index.html','nara.html','my-room.css','my-room.js','fan-model.js','styles.css','app.js','planner.js','cart-model.js','festival-data.js','data/goods.json','data/goods-catalog.csv','data/songs.json','data/lives.json','data/size-charts.json','data/activity-slots.json','assets/favicon.svg'];
files.push('tour-planner.js','tour-map.js','google-tour-map.js','korean.js','data/tour-venues.json','assets/hall-tour-2027.png','vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css','vendor/leaflet/LICENSE');
for(const file of files){const dest=path.join(target,'dist',file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,file),dest);}
const catalog=JSON.parse(await readFile(path.join(root,'data/lives.json'),'utf8'));
const held=catalog.events.filter(e=>e.eventStatus==='held').length,cancelled=catalog.events.filter(e=>e.eventStatus==='cancelled').length,postponed=catalog.events.filter(e=>e.eventStatus==='postponed').length;
await writeFile(path.join(target,'README.md'),`# ZUTOMAYO MY ROOM\n\nOwner-private fan archive. Static application in dist/. Personal records stay in the visitor browser and JSON backups, never in source or deployment archives.\n\nShared public data: 71 original songs, ${catalog.events.length} historical schedule records (${held} physical/online, ${cancelled} cancelled, ${postponed} postponed), ${JSON.parse(await readFile(path.join(root,'data/goods.json'),'utf8')).goods.length} goods, ${JSON.parse(await readFile(path.join(root,'data/size-charts.json'),'utf8')).charts.length} official size charts. Sources and check dates are carried by the data files and UI.\n`);
await writeFile(path.join(target,'.gitignore'),'.sites-runtime/\nnode_modules/\n.env\n.env.*\n*.log\n');
console.log(JSON.stringify({project_id:manifest.project_id,public_files:files.length,static_directory:path.join(target,'dist')}));
