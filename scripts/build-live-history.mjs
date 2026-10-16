import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const load=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const raw=await load('.research/history/db-catalog.json');
const evidence=await load('project_memory/LIVE_HISTORY_EVIDENCE.json');
const previous=await load('data/lives.json');
const titles=await load('project_memory/SONG_TITLES.json');
const originalIds=new Set(titles.originals.map(s=>s.id));
const supplementary=new Map(titles.supplementary.map(s=>[s.id,s]));
const canonical=url=>url?new URL(url,'https://zutomayo-db.pages.dev').href.replace(/\/?$/,'/'):null;
const unique=a=>[...new Set(a.filter(Boolean))];
const idFor=key=>'history-'+createHash('sha256').update(key).digest('hex').slice(0,16);
const oldBySource=new Map(previous.events.flatMap(e=>(e.sourceUrls||[]).filter(u=>u.startsWith('https://zutomayo-db.pages.dev/lives/')&&!u.endsWith('/intense2/')).map(u=>[canonical(u),e])));
const aliases={intense2:['좀크라','좀크','ZOMCRA','Zombie Crab Labo'],pegasus:['애페가','페가수스','Pegasus'],technopoor:['테크노푸어','Technopoor'],murakumonotsurugi:['무라쿠모','Murakumo'],hisohiso_tour:['히소히소','Hisohiso'],karakaraboo:['카라카라부','Karakaraboo'],yakiyakiyankeetour:['야키야키','Yaki Yaki'],cosmic_dorodango_tour:['코즈믹','Cosmic'],gensodorodango:['원소','Genso']};
const groups=new Map(evidence.groups.map(g=>[g.dbPath||g.id,g]));
const events=[];const represented=new Set();
const isOnline=mode=>mode&&mode!=='venue';
function location(o,r={}){
 const region=o.region||o.city||r.region||null;
 const explicit=o.city||null;
 const foreign=[['SEOUL','서울','대한민국'],['ソウル','서울','대한민국'],['仁川','인천','대한민국'],['TAIPEI','타이베이','대만'],['新北市','신베이','대만'],['台中市','타이중','대만'],['SINGAPORE','싱가포르','싱가포르'],['BANGKOK','방콕','태국'],['HONG KONG','홍콩','홍콩'],['SHANGHAI','상하이','중국'],['上海','상하이','중국'],['南宁市','난닝','중국']].find(([key])=>String(region).toUpperCase().includes(key.toUpperCase()));
 if(foreign)return {city:foreign[1],region,country:foreign[2]};
 return {city:explicit,region,country:isOnline(o.performanceMode)?null:'일본'};
}
function entries(r,id){return r.setlist.map((s,i)=>{
 const songIds=s.sourceSongIds.filter(x=>originalIds.has(x)),supplementarySongIds=s.sourceSongIds.filter(x=>supplementary.has(x));
 const temporary=/未発表|仮登録|一旦|修正予定/.test(s.notes),kind=songIds.length>1?'medley':songIds.length?'song':temporary?'unreleased':supplementarySongIds.length?'participation':/Cover|カバー/i.test(s.rawTitle)?'cover':'unknown';
 return {id:`${id}-s${i+1}`,rawTitle:s.rawTitle,songIds,supplementarySongIds,sourceSongIds:s.sourceSongIds,kind,encore:s.encore,sourcePosition:s.sourcePosition,sourceNumber:s.sourceNumber,notes:s.notes,occurrences:1,mappingStatus:songIds.length?'matched':temporary?'unverified_original':kind==='cover'||kind==='participation'?'outside_original_catalog':'unmatched'};
});}
function make(o,g,r=null){
 const key=r?.detailUrl||[g.id,o.date,o.session||'',o.venue||'',o.performanceMode||'venue'].join('|');
 let old=r?.detailUrl?oldBySource.get(canonical(r.detailUrl)):null;
 if(r?.groupPath==='/lives/tours/intense2'&&!r.detailUrl)old=previous.events.find(e=>e.id==='2026-03-28-shanghai');
 const id=old?.id||idFor(key),status=o.eventStatus||'held',mode=o.performanceMode||'venue';
 const setlist=old?.setlist|| (r?entries(r,id):(o.reportedSetlist||[]).map((s,i)=>{const song=titles.originals.find(t=>t.title_ja===s.titleJa);if(!song)throw Error('Unknown reported song '+s.titleJa);return {id:`${id}-s${i+1}`,rawTitle:s.rawTitle,songIds:[song.id],kind:'song',encore:false,sourcePosition:i+1,notes:'',occurrences:1,mappingStatus:'matched'};}));
 const notes=unique([...(old?.verificationNotes||[]),...(g.notes||[]),o.notes,o.sourceNote,r?'공연일·공연장은 공식 과거 일정표와 대조. 세트리스트는 해당 날짜 팬 DB 자료이며 공식 인증 아님.':'공식 공지에서 확인한 일정. 세트리스트가 없으면 곡 청취 여부를 추정하지 않음.']);
 const groupId=g.dbPath==='/lives/tours/intense2'?'zombie-crab-labo-2026':g.id||g.dbPath;
 const category=isOnline(mode)?'online':r?.type==='Fes'?'festival':r?.type==='Tour'?'tour':'special';
 let event={...old,id,date:o.date,name:old?.name||g.name,tour:old?.tour||g.name,groupId,tourId:old?.tourId||(category==='tour'?groupId:null),category,performer:/スパイシーズ|ACAね & Open Reel/.test((g.notes||[]).join(' '))?'ACAね & Open Reel Ensemble':'ZUTOMAYO',performanceMode:mode,allowedModes:isOnline(mode)?['online']:['venue','online'],dateKind:isOnline(mode)?'broadcast':'performance',...location(o,r||{}),venue:old?.venue||o.venue||r?.venue||'미확인',session:o.session||r?.detailPath?.match(/_(1st|2nd)$/)?.[1]||null,start:o.start||null,time:o.time||null,eventStatus:status,metadataStatus:'official_checked',officialSource:o.officialSource||g.officialSource,sourceUrls:unique([o.officialSource,g.officialSource,g.archiveUrl,o.statusSource,o.supplementaryEvidenceUrl,...(o.sourceUrls||[]),...(old?.sourceUrls||[]),r?.groupUrl,r?.detailUrl,o.streamUrl]),setlistSource:old?.setlistSource||r?.detailUrl||null,setlistSourceLabel:old?.setlistSourceLabel||(setlist.length?'zutomayo-DB · 팬 자료':'세트리스트 미확인'),setlistEvidence:old?.setlistEvidence||(setlist.length?'fan_single_source':'unavailable'),setlistStatus:old?.setlistStatus||(setlist.length?(setlist.some(s=>s.mappingStatus==='unverified_original'||s.kind==='unknown')?'partial':'complete'):'unknown'),sourceSongRows:old?.sourceSongRows||r?.sourceSongRows||0,setlist,sourceMemos:old?.sourceMemos||r?.sourceMemos||[],checked_at:'2026-10-15',aliases:unique([...(old?.aliases||[]),r?.subtitle,...Object.entries(aliases).filter(([key])=>(g.dbPath||'').includes(key)).flatMap(([,v])=>v)]),verificationNotes:notes};
 // Existing profile identifiers and setlist entry identifiers remain stable.
 if(old){event.city=old.city;event.country=old.country;}
 for(const k of ['broadcastDate','performanceDate','rescheduledTo','thenRescheduledTo','metadataStatus','performer','setlistStatus','setlistSource','setlistEvidence','setlistSourceLabel','setlistOrderStatus'])if(o[k]!==undefined)event[k]=o[k];
 if(!isOnline(mode))event.performanceDate=o.date;
 if(isOnline(mode)&&event.performanceDate===undefined)event.performanceDate=null;
 if(o.session&&o.start)event.time=`${o.session} · START ${o.start}`;
 if(status==='cancelled'||status==='postponed'){
  if(setlist.length){event.disputedSetlist={source:r?.detailUrl,sourceSongRows:r?.sourceSongRows,rawEntries:r?.setlist,reason:'공식 연기 공지와 개최/곡 목록이 충돌하므로 개인 집계에서 제외'};event.verificationNotes.push('팬 자료의 개최·세트리스트 표기는 공식 연기/취소 공지와 충돌. 대체일과 중복 집계하지 않음.');}
  event.setlist=[];event.setlistStatus='not_applicable';event.setlistEvidence='not_applicable';event.setlistSourceLabel=status==='cancelled'?'공식 취소 공지':'공식 연기 공지';
 }
 return event;
}
for(const r of raw.events){
 const g=groups.get(r.groupPath);if(!g)throw Error('Missing official group '+r.groupPath);
 const session=r.detailPath?.match(/_(1st|2nd)$/)?.[1];
 let candidates=g.events.filter(e=>e.date===r.date&&(!session||e.session===session));
 if(candidates.length>1)candidates=candidates.filter(e=>r.sourceStatus==='中止'?e.eventStatus==='cancelled':e.eventStatus!=='cancelled');
 if(candidates.length!==1)throw Error(`Official date/session mismatch ${r.groupPath} ${r.date} ${session||''}: ${candidates.length}`);
 const o=candidates[0];represented.add(o);events.push(make(o,g,r));
}
for(const g of evidence.groups)for(const o of g.events)if(!represented.has(o))events.push(make(o,g));
for(const o of evidence.extraEvents){
 const g=o.dbPath?groups.get(o.dbPath):{id:o.groupId,name:o.name,officialSource:o.officialSource,notes:[]};
 if(!g)throw Error('Missing extra group '+o.dbPath);
 events.push(make(o,g));
}
const idSet=new Set(events.map(e=>e.id));if(idSet.size!==events.length)throw Error('Duplicate event ids');
for(const event of events)if(event.category==='online'&&event.performanceDate){const source=events.find(e=>e.category!=='online'&&e.date===event.performanceDate&&e.eventStatus==='held');if(source)event.sourcePerformanceId=source.id;}
for(const old of previous.events){if(!events.some(e=>e.id===old.id))throw Error('Would remove earlier event '+old.id);}
events.sort((a,b)=>b.date.localeCompare(a.date)||String(a.session).localeCompare(String(b.session))||a.id.localeCompare(b.id));
const allGroups=[...new Map(events.map(e=>[e.groupId,{id:e.groupId,name:e.tour,category:e.category,officialSource:e.officialSource}])).values()].map(g=>{const items=events.filter(e=>e.groupId===g.id);return {...g,eventCount:items.length,heldCount:items.filter(e=>e.eventStatus==='held').length,cancelledCount:items.filter(e=>e.eventStatus==='cancelled').length,postponedCount:items.filter(e=>e.eventStatus==='postponed').length};});
for(const check of evidence.secondaryAudit?.confirmedEventUrls||[]){
 if(check.dateStatus==='secondary_reported_not_official_recording_date')continue;
 const candidates=events.filter(e=>e.date===check.date&&e.category!=='online');
 if(candidates.length!==1)continue;
 const event=candidates[0];event.sourceUrls=unique([...event.sourceUrls,check.url]);
 event.additionalSourceChecks=[{url:check.url,checked_at:'2026-10-15',scope:'공연 페이지·일자 참고. 곡별 전수 대조 완료를 의미하지 않음.',status:check.dateStatus||'metadata_reference'}];
}
const summary={entries:events.length,venue:events.filter(e=>e.eventStatus==='held'&&e.category!=='online').length,online:events.filter(e=>e.eventStatus==='held'&&e.category==='online').length,cancelled:events.filter(e=>e.eventStatus==='cancelled').length,postponed:events.filter(e=>e.eventStatus==='postponed').length,setlistKnown:events.filter(e=>e.setlist.length).length,setlistUnknown:events.filter(e=>e.eventStatus==='held'&&!e.setlist.length).length};
const coverage={checked_at:'2026-10-15',from:events.at(-1).date,to:events[0].date,officialArchiveGroups:evidence.groups.length,dbGroups:raw.groups.length,dbRows:raw.events.length,officialIndex:evidence.indexUrl,dbIndex:evidence.dbIndexUrl,excluded:evidence.excluded,scope:evidence.scope,policy:'공개 공식 이력과 보조 DB에 확인된 역대 일정. 방송일은 녹화일과 구분. 모든 무대의 완전한 세트리스트를 공식 인증하는 목록은 아님.'};
await writeFile(new URL('../data/lives.json',import.meta.url),JSON.stringify({schemaVersion:1,updatedAt:'2026-10-15',scope:evidence.scope,summary,coverage,groups:allGroups,tours:allGroups.filter(g=>g.category==='tour'),completenessPolicy:previous.completenessPolicy,events},null,2)+'\n');
console.log(JSON.stringify({summary,groups:allGroups.length,unmatched:events.filter(e=>e.metadataStatus!=='official_checked').length}));
