export const PROFILE_KEY='ztmy-my-room-profile-v1';
export const COLLECTION_STATES={owned:'보유 중',wishlist:'위시리스트',awaiting:'주문·배송 중',archived:'양도·보관 종료'};
export const MEASURES={length:'총장',width:'가슴 단면',shoulder:'어깨',sleeve:'소매',yuki:'화장(목뒤~소매)'};
export const uid=()=>globalThis.crypto.randomUUID();
export const isRecordableEvent=event=>Boolean(event)&&!['cancelled','postponed'].includes(event.eventStatus)&&(event.eventStatus!=='scheduled'||event.date<=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date()));
export const canAttendEvent=(event,mode)=>isRecordableEvent(event)&&(!event.allowedModes||event.allowedModes.includes(mode));
export function filterLiveEvents(events,{search='',tour='',year='',category='',status='',visited=false},attendances=[],mode='venue'){
 const query=search.normalize('NFKC').toLowerCase().trim();
 return events.filter(e=>(!tour||e.tour===tour||e.groupId===tour)&&(!year||e.date.startsWith(year+'-'))&&(!category||(e.category||(e.personal?'special':''))===category)&&(!status||(status==='held'?isRecordableEvent(e):e.eventStatus===status))&&[e.name,e.tour,e.venue,e.city,e.region,e.country,e.date,e.session,e.performer,...(e.aliases||[])].join(' ').normalize('NFKC').toLowerCase().includes(query)&&(!visited||attendances.some(a=>a.eventId===e.id&&a.mode===mode))).sort((a,b)=>b.date.localeCompare(a.date)||String(a.session||'').localeCompare(String(b.session||''))||a.id.localeCompare(b.id));
}
export function emptyProfile(){return {id:uid(),name:'나의 밤',attendances:[],collection:[],customEvents:[],favorites:[],tourPlans:[]};}
const clean=(v,n)=>typeof v==='string'&&v.length<=n;
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;}
export function validateProfile(p,songs,events,goods){
 if(!p||!clean(p.id,100)||!clean(p.name,60)||!p.name.trim())throw Error('프로필 이름을 확인하세요.');
 for(const k of ['attendances','collection','customEvents','favorites'])if(!Array.isArray(p[k])||p[k].length>5000)throw Error('기록 형식이나 개수가 올바르지 않습니다.');
 const tourPlans=p.tourPlans??[];
 if(!Array.isArray(tourPlans)||tourPlans.length>5000||new Set(tourPlans.map(x=>x?.eventId)).size!==tourPlans.length||tourPlans.some(x=>!x||!events.some(e=>e.id===x.eventId&&e.groupId==='hall-tour-2027')||typeof x.ticketBooked!=='boolean'))throw Error('투어 체크 기록을 확인하세요.');
 const songIds=new Set(songs.map(x=>x.id));
 const unique=(a,key)=>{if(new Set(a.map(x=>x[key])).size!==a.length)throw Error('중복된 기록 ID가 있습니다.');};
 unique(p.customEvents,'id');unique(p.collection,'id');unique(p.attendances,'id');
 for(const e of p.customEvents){if(!clean(e.id,100)||!e.id.startsWith('custom-')||!clean(e.name,180)||!e.name.trim()||!validDate(e.date)||!clean(e.venue,200)||!clean(e.city,100)||!Array.isArray(e.setlist)||e.setlist.length>200||!['complete','partial','unknown'].includes(e.setlistStatus))throw Error('직접 등록한 공연 정보를 확인하세요.');unique(e.setlist,'id');for(const entry of e.setlist)if(!clean(entry.id,100)||!clean(entry.rawTitle,300)||!Array.isArray(entry.songIds)||entry.songIds.some(x=>!songIds.has(x)))throw Error('공연의 곡 연결을 확인하세요.');}
 const allEvents=[...events,...p.customEvents];
 for(const a of p.attendances){const e=allEvents.find(x=>x.id===a.eventId);if(!canAttendEvent(e,a.mode)||!clean(a.id,200)||a.id!==`${a.eventId}@${a.mode}`||!['venue','online'].includes(a.mode)||!['full','partial'].includes(a.coverage)||!clean(a.seat,100)||!clean(a.memo,1000)||!Array.isArray(a.heardEntryIds)||new Set(a.heardEntryIds).size!==a.heardEntryIds.length||a.heardEntryIds.some(id=>!e.setlist.some(x=>x.id===id)))throw Error('관람 기록과 세트리스트를 확인하세요.');}
 for(const r of p.collection){if(!clean(r.id,100)||!clean(r.name,180)||!r.name.trim()||(r.productId&&!goods.some(g=>g.id===r.productId))||!Object.hasOwn(COLLECTION_STATES,r.state)||!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>999||!clean(r.size,60)||!clean(r.color,100)||!clean(r.memo,1000)||!clean(r.fit,80)||!clean(r.acquiredAt,10)||(r.acquiredAt&&!validDate(r.acquiredAt))||!r.measures||Object.entries(r.measures).some(([key,v])=>!Object.hasOwn(MEASURES,key)||(v!==null&&(!Number.isFinite(v)||v<=0||v>300))))throw Error('굿즈의 보유·사이즈 기록을 확인하세요.');}
 if(new Set(p.favorites).size!==p.favorites.length||p.favorites.some(id=>!songIds.has(id)))throw Error('즐겨찾기 곡을 확인하세요.');
 // Reconstruct only known fields; backup data cannot add executable properties.
 return {id:p.id,name:p.name.trim(),attendances:p.attendances.map(a=>({id:a.id,eventId:a.eventId,mode:a.mode,coverage:a.coverage,heardEntryIds:[...a.heardEntryIds],seat:a.seat,memo:a.memo})),collection:p.collection.map(r=>({id:r.id,productId:r.productId||null,name:r.name,state:r.state,quantity:r.quantity,size:r.size,color:r.color,fit:r.fit,acquiredAt:r.acquiredAt,memo:r.memo,measures:Object.fromEntries(Object.keys(MEASURES).map(k=>[k,r.measures[k]??null]))})),customEvents:p.customEvents.map(e=>({id:e.id,date:e.date,name:e.name,tour:'직접 등록',venue:e.venue,city:e.city,country:'',sourceUrls:[],setlistStatus:e.setlistStatus,setlist:e.setlist.map(x=>({id:x.id,rawTitle:x.rawTitle,songIds:[...x.songIds],kind:x.songIds.length>1?'medley':'song',encore:false})),personal:true})),favorites:[...p.favorites],tourPlans:tourPlans.map(x=>({eventId:x.eventId,ticketBooked:x.ticketBooked}))};
}
export function calculateStats(profile,songs,events,mode='venue'){
 const all=[...events,...profile.customEvents],attendances=profile.attendances.filter(x=>{const event=all.find(e=>e.id===x.eventId);return x.mode===mode&&(!event||canAttendEvent(event,mode));}),rows=new Map(songs.map(s=>[s.id,{...s,count:0,concertCount:0,first:null,last:null,eventIds:[]}]))
 let uncertain=0;
 for(const a of attendances){const event=all.find(e=>e.id===a.eventId);if(!event){uncertain++;continue;}const heard=new Set(a.heardEntryIds);if(event.setlistStatus!=='complete'||event.setlist.some(e=>(!e.songIds.length&&e.kind!=='cover')||e.occurrenceStatus==='conflicting'))uncertain++;
  const inEvent=new Set();for(const entry of event.setlist){if(!heard.has(entry.id))continue;for(const id of new Set(entry.songIds)){const row=rows.get(id);if(!row)continue;row.count+=Number.isInteger(entry.occurrences)&&entry.occurrences>0?entry.occurrences:1;inEvent.add(id);if(!row.first||event.date<row.first.date)row.first=event;if(!row.last||event.date>row.last.date)row.last=event;}}
  for(const id of inEvent){rows.get(id).concertCount++;rows.get(id).eventIds.push(event.id);}
 }
 const list=[...rows.values()],heard=list.filter(s=>s.count>0),ranked=[...heard].sort((a,b)=>b.count-a.count||a.ko.localeCompare(b.ko,'ko')),owned=profile.collection.filter(r=>r.state==='owned');
 return {mode,attendances,rows:list,heard,unheard:list.filter(s=>!s.count),ranked,uncertain,coverage:songs.length?Math.round(heard.length/songs.length*100):0,ownedUnits:owned.reduce((n,r)=>n+r.quantity,0),ownedKinds:new Set(owned.map(r=>r.productId||r.name)).size,wishlist:profile.collection.filter(r=>r.state==='wishlist').length};
}
export function exportBackup(profile){return {schema:'ztmy-room',version:1,exportedAt:new Date().toISOString(),profile};}
export function parseBackup(text,songs,events,goods){const b=JSON.parse(text);if(b.schema!=='ztmy-room'||b.version!==1)throw Error('MY ROOM 백업 파일을 선택하세요.');return validateProfile(b.profile,songs,events,goods);}
export function importLegacyCart(records,profile,goods){
 const added=[];for(const r of records){if(r.status==='cancelled'||!goods.some(g=>g.id===r.productId)||profile.collection.some(g=>g.id==='legacy-'+r.id))continue;const g=goods.find(g=>g.id===r.productId);added.push({id:'legacy-'+r.id,productId:g.id,name:g.ko,state:r.status==='received'?'owned':r.status==='ordered'?'awaiting':'wishlist',quantity:r.quantity,size:r.option||'',color:'',fit:'',acquiredAt:r.receivedAt?.slice(0,10)||'',memo:r.memo||'',measures:Object.fromEntries(Object.keys(MEASURES).map(k=>[k,null]))});}return {...profile,collection:[...profile.collection,...added]};
}
export function matchSong(title,songs){const key=s=>s.normalize('NFC').toLowerCase().replace(/[\s・.「」"'’()_-]/g,'');const target=key(title);const hits=songs.filter(s=>[s.ko,s.ja,s.en,...s.aliases].some(n=>key(n)===target));return hits.length===1?hits[0]:null;}
