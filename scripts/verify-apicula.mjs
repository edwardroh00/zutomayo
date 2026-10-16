// Read a saved official-page snapshot; do not fetch or invent schedule data here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source='https://zutomayo.net/apicula/',checkedAt='2026-10-16';
const html=fs.readFileSync('.research/apicula/index.html','utf8');
const text=s=>s.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const rows=[...html.matchAll(/<div class="z-apc__srow">([\s\S]*?)<\/div>/g)].map(([,row])=>{
 const date=row.match(/<strong>(\d{2})\.(\d{2})<\/strong>/),venue=row.match(/<a class="z-apc__venue" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/),region=row.match(/<span class="z-apc__pref">([^<]+)<\/span>/),time=row.match(/OPEN (\d{2}:\d{2}) \/ START (\d{2}:\d{2})/);
 assert(date&&venue&&region&&time,'Incomplete official schedule row');
 return {date:`2027-${date[1]}-${date[2]}`,venue:text(venue[2]),venueOfficialUrl:venue[1],region:region[1],open:time[1],start:time[2]};
});
assert.equal(rows.length,36);assert.equal(new Set(rows.map(e=>e.date)).size,36);
const path='data/lives.json',catalog=JSON.parse(fs.readFileSync(path)),tour=catalog.events.filter(e=>e.groupId==='hall-tour-2027');
assert.equal(tour.length,rows.length);const differences=[];
for(const e of tour){const official=rows.find(r=>r.date===e.date);assert(official,`Missing date ${e.date}`);for(const key of ['venue','region','open','start'])if(text(e[key])!==official[key])differences.push({date:e.date,field:key,before:e[key],after:official[key]});}
assert.equal(differences.length,0,JSON.stringify(differences));
for(const e of tour){const official=rows.find(r=>r.date===e.date);Object.assign(e,{officialSource:source,sourceUrls:[source,official.venueOfficialUrl],venueOfficialUrl:official.venueOfficialUrl,metadataStatus:'official_checked',scheduleSource:'공식 투어 페이지 · 날짜·공연장·지역·입장·시작 시간 대조 완료',checked_at:checkedAt,scheduleEvidence:'official_web_cross_checked'});}
catalog.coverage.upcoming={...catalog.coverage.upcoming,source,officialWebVerified:true,checked_at:checkedAt,verifiedFields:['date','venue','region','open','start']};
const group=catalog.groups.find(g=>g.id==='hall-tour-2027');group.officialSource=source;
fs.writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');
const evidence={source,checkedAt,title:text(html.match(/<title>([\s\S]*?)<\/title>/)[1]),count:rows.length,matchedFields:['date','venue','region','open','start'],differences,rows};
fs.writeFileSync('project_memory/APICULA_2027_EVIDENCE.json',JSON.stringify(evidence,null,2)+'\n');
console.log('All 36 shows match the official page: date, venue, region, opening time and start time.');
