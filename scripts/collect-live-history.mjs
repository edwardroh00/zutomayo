import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

// Cache public pages only. Personal attendance and credentials never enter this crawl.
const root=new URL('../.research/history/',import.meta.url), db='https://zutomayo-db.pages.dev';
await mkdir(root,{recursive:true});
const refresh=process.argv.includes('--refresh');
async function html(url,key){const file=new URL(key+'.html',root);if(!refresh){try{return await readFile(file,'utf8');}catch{}}
 const r=await fetch(url);if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);const text=await r.text();await writeFile(file,text);return text;}
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const rows=h=>[...h.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map(m=>({attrs:m[1],cells:[...m[2].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(c=>({attrs:c[1],html:c[2],text:clean(c[2])}))})).filter(r=>r.cells.length);
const jpDate=s=>{const m=s.match(/(\d{4})年(\d+)月(\d+)日/);if(!m)throw Error('Missing calendar date: '+s);return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;};
const canonical=s=>new URL(s,db).href.replace(/\/?$/,'/');
const index=await html(db+'/lives/','index-0');
const groups=rows(index.match(/<table[\s\S]*?<\/table>/)?.[0]||'').map(r=>({type:r.cells[0].text,name:r.cells[1].text,path:r.cells[1].html.match(/href="([^"]+)"/)?.[1],expectedCount:parseInt(r.cells[3].text)}));
if(groups.length<53||groups.some(g=>!g.path))throw Error('Live index structure changed; review before writing');
async function pool(items,fn,n=4){let cursor=0;const result=new Array(items.length);await Promise.all(Array.from({length:n},async()=>{while(cursor<items.length){const i=cursor++;result[i]=await fn(items[i],i);}}));return result;}
const all=[];
await pool(groups,async g=>{
 const h=await html(canonical(g.path),'group-'+path.posix.basename(g.path));
 g.name=clean(h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]||g.name);
 g.subtitle=clean(h.match(/<p class="page-header-subtitle">([\s\S]*?)<\/p>/)?.[1]);
 g.officialUrl=h.match(/<a href="([^"]+)"[^>]*class="official-link"/)?.[1]||null;
 const table=h.match(/<table[^>]*class="data-table"[\s\S]*?<\/table>/)?.[0];
 const dates=table?rows(table).map(({cells:c})=>{
  if(c.length!==7)throw Error('Schedule columns changed: '+g.path);
  return {date:jpDate(c[1].text),sourceDate:c[1].text,detailPath:c[1].html.match(/href="([^"]+)"/)?.[1]||c[5].html.match(/href="([^"]+)"/)?.[1]||null,time:c[2].text,region:c[3].text,venue:c[4].text,expectedSongs:parseInt(c[5].text)||0,sourceStatus:c[6].text};
 }):(()=>{const header=clean(h.match(/<p class="page-header-date">([\s\S]*?)<\/p>/)?.[1]);return [{date:jpDate(header),sourceDate:header,detailPath:g.path,time:'',region:'',venue:header.split('@').slice(1).join('@').trim(),expectedSongs:null,sourceStatus:/status-canceled|status-cancelled/.test(h)?'中止':'終了'}];})();
 if(dates.length!==g.expectedCount)throw Error(`${g.path}: ${dates.length} rows vs ${g.expectedCount}`);
 all.push(...dates.map(e=>({...e,groupPath:g.path,type:g.type,name:g.name,subtitle:g.subtitle,groupUrl:canonical(g.path),officialUrl:g.officialUrl})));
});
const raw=await pool(all,async e=>{
 if(!e.detailPath)return {...e,detailUrl:null,setlist:[],sourceMemos:[],sourceSongRows:0};
 const url=canonical(e.detailPath),h=await html(url,'detail-'+e.detailPath.split('/').filter(Boolean).join('--'));
 const table=h.match(/<table[^>]*class="setlist-table"[^>]*>([\s\S]*?)<\/table>/)?.[1];
 const setlist=[],sourceMemos=[];let encore=false;
 for(const {attrs,cells:c} of rows(table||'')){
  if(c.length<4)continue;
  const number=c[0].text,rawTitle=c[1].text,notes=c[3].text;
  if(/row-encore/.test(attrs)||/encore|アンコール/i.test(rawTitle)||number==='EN')encore=true;
  if(!/^\d+$/.test(number)&&number!=='EN'){sourceMemos.push({rawTitle,notes});continue;}
  const sourceSongIds=[...c[1].html.matchAll(/href="\/songs\/([^"/]+)\/?"/g)].map(x=>x[1]);
  setlist.push({rawTitle,sourceSongIds,sourceNumber:number,sourcePosition:setlist.length+1,notes,encore,rowClass:attrs.match(/class="([^"]*)"/)?.[1]||''});
 }
 if(e.expectedSongs!==null&&setlist.length!==e.expectedSongs)throw Error(`${url}: ${setlist.length} setlist rows vs ${e.expectedSongs}; review required`);
 return {...e,detailUrl:url,setlist,sourceMemos,sourceSongRows:setlist.length};
});
raw.sort((a,b)=>a.date.localeCompare(b.date)||String(a.detailUrl).localeCompare(String(b.detailUrl)));
await writeFile(new URL('db-catalog.json',root),JSON.stringify({checked_at:'2026-10-15',indexUrl:db+'/lives/',groups,events:raw},null,2)+'\n');
console.log(JSON.stringify({groups:groups.length,events:raw.length,setlistRows:raw.reduce((n,e)=>n+e.setlist.length,0),noSetlist:raw.filter(e=>!e.setlist.length).map(e=>({date:e.date,name:e.name,status:e.sourceStatus})),unlinked:raw.flatMap(e=>e.setlist.filter(s=>!s.sourceSongIds.length).map(s=>({date:e.date,title:s.rawTitle,notes:s.notes})))},null,2));
