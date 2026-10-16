import {readFile, writeFile, mkdir} from 'node:fs/promises';

// Add each verified date separately. Never clone another night's setlist.
const checkedAt = '2026-10-15';
const official = 'https://zutomayo.net/intense2/';
const db = 'https://zutomayo-db.pages.dev';
const tourId = 'zombie-crab-labo-2026';
const name = 'ZUTOMAYO INTENSE II「坐・ZOMBIE CRAB LABO」';
const config = [
  ['2026-03-28','fukuoka','후쿠오카','일본','マリンメッセ福岡B館'],
  ['2026-03-29','fukuoka','후쿠오카','일본','マリンメッセ福岡B館'],
  ['2026-04-04','yokohama','요코하마','일본','横浜アリーナ'],
  ['2026-04-05','yokohama','요코하마','일본','横浜アリーナ'],
  ['2026-04-17','singapore','싱가포르','싱가포르','The Star Theatre'],
  ['2026-04-24','osaka','오사카','일본','大阪城ホール'],
  ['2026-04-25','osaka','오사카','일본','大阪城ホール'],
  ['2026-05-02','bangkok','방콕','태국','Union Hall'],
  ['2026-05-16','taipei','타이베이','대만','New Taipei City Exhibition hall'],
  ['2026-05-17','taipei','타이베이','대만','New Taipei City Exhibition hall'],
  ['2026-06-02','yokohama','요코하마','일본','Kアリーナ横浜'],
  ['2026-06-03','yokohama','요코하마','일본','Kアリーナ横浜'],
  ['2026-06-06','hong-kong','홍콩','홍콩','AsiaWorld-Expo, Hall 10'],
  ['2026-06-17','kobe','고베','일본','GLION ARENA KOBE'],
  ['2026-06-18','kobe','고베','일본','GLION ARENA KOBE'],
];
const catalogPath = new URL('../data/lives.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const evidence = JSON.parse(await readFile(new URL('../project_memory/ZOMCRA_2026_EVIDENCE.json',import.meta.url),'utf8'));
const titles = JSON.parse(await readFile(new URL('../project_memory/SONG_TITLES.json', import.meta.url),'utf8'));
const known = new Set(titles.originals.map(x => x.id));
const clean = v => v.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const research = new URL('../.research/zomcra/', import.meta.url);
await mkdir(research,{recursive:true});
const additions = await Promise.all(config.map(async ([date,slug,city,country,venue]) => {
  const id = `${date}-${slug}`, url = `${db}/lives/tours/intense2/${date.replaceAll('-','_')}/`;
  const response = await fetch(url);
  if(!response.ok)throw Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  await writeFile(new URL(`${date}.html`,research),html);
  const table = html.match(/<table[^>]*class="setlist-table"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  if(!table)throw Error(`${id}: missing setlist table`);
  const setlist = [], sourceMemos = [];
  let encore = false;
  for(const match of table.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)){
    const cells = [...match[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>x[1]);
    if(cells.length<4)continue;
    const number=clean(cells[0]), rawTitle=clean(cells[1]), notes=clean(cells[3]);
    if(/encore|アンコール/i.test(rawTitle)||/row-encore/.test(match[1])||number==='EN')encore=true;
    if(!/^\d+$/.test(number)&&number!=='EN'){sourceMemos.push({rawTitle,notes});continue;}
    const songIds=[...cells[1].matchAll(/href="\/songs\/([^"/]+)\/?"/g)].map(x=>x[1]);
    if(!songIds.length||songIds.some(x=>!known.has(x)))throw Error(`${id}: unknown song ${rawTitle}`);
    const position=setlist.length+1;
    setlist.push({id:`${id}-s${position}`,rawTitle,songIds,kind:songIds.length>1?'medley':'song',encore,sourcePosition:position,sourceNumber:number,notes,occurrences:1,mappingStatus:'matched'});
  }
  if(setlist.length!==23)throw Error(`${id}: expected 23 rows; received ${setlist.length}, review required`);
  const check=evidence.checks.find(c=>c.date===date);
  if(!check)throw Error(`${id}: cross-check record missing`);
  const verificationNotes=['일정·공연장은 공식 투어 일정과 대조. 각 날짜의 세트리스트는 해당 공연 팬 DB에서 개별 수집했으며 공식 확정 자료가 아님.','첫 3곡 short ver. 및 10번 곡의 어쿠스틱·편곡 주석은 DB 원문 보존. setlist.fm의 주석 생략을 원곡 불일치로 취급하지 않음.'];
  if(check.note)verificationNotes.push(check.note);
  if(check.status==='matched')verificationNotes.push('setlist.fm의 23곡·순서를 공식 제목/별칭으로 매칭해 팬 DB와 교차 확인.');
  return {id,date,name,tour:name,tourId,aliases:['좀크라','좀크','ZOMCRA','Zombie Crab Labo'],venue,city,country,eventStatus:'held',metadataStatus:'official_checked',officialSource:official,sourceUrls:[official,url,check.url,...(check.extraOfficialSource?[check.extraOfficialSource]:[])],setlistSource:url,setlistSourceLabel:check.status==='empty'?'zutomayo-DB · 단일 팬 자료':'팬 자료 2곳 대조',setlistEvidence:check.status==='empty'?'fan_single_source':'fan_cross_checked',setlistOrderStatus:check.status==='order_conflict'?'conflicting':check.status==='empty'?'single_source':'cross_checked',setlistCrossCheck:{...check,checked_at:checkedAt},setlistStatus:'complete',sourceSongRows:setlist.length,setlist,sourceMemos,checked_at:checkedAt,verificationNotes};
}));
const cancelUrl='https://zutomayo.net/news/562/';
additions.push({id:'2026-03-28-shanghai',date:'2026-03-28',name,tour:name,tourId,aliases:['좀크라','좀크','ZOMCRA','Zombie Crab Labo'],city:'상하이',country:'중국',venue:'공식 공지에 공연장 미기재',eventStatus:'cancelled',metadataStatus:'official_checked',officialSource:cancelUrl,sourceUrls:[official,cancelUrl,`${db}/lives/tours/intense2/`],setlistStatus:'not_applicable',setlistSourceLabel:'공식 취소 공지',setlistEvidence:'not_applicable',setlist:[],sourceSongRows:0,checked_at:checkedAt,verificationNotes:['2025-12-27 공식 취소 공지. 같은 날짜의 후쿠오카 추가 공연과 별도 일정이며 관람·곡 통계에서 제외.']});
const merged=new Map(catalog.events.map(e=>[e.id,e]));
for(const event of additions)merged.set(event.id,{...merged.get(event.id),...event});
catalog.events=[...merged.values()].map(e=>e.tour===name?{...e,tourId,aliases:['좀크라','좀크','ZOMCRA','Zombie Crab Labo']}:e).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
catalog.updatedAt=checkedAt;
if(!catalog.coverage)catalog.scope='좀크라 2026 투어 전 일정: 개최 19회·취소 1건. 나라·서울 2024·일부 페스티벌 포함. 아티스트 전체 공연 목록은 아님. 개인 기록 제외.';
const tours=new Map((catalog.tours||[]).map(t=>[t.id,t]));
tours.set(tourId,{...tours.get(tourId),id:tourId,name,aliases:['좀크라','좀크','ZOMCRA','Zombie Crab Labo'],officialSource:official,scheduleStatus:'complete',heldCount:19,cancelledCount:1,checked_at:checkedAt});
catalog.tours=[...tours.values()];
const tour=catalog.events.filter(e=>e.tourId===tourId);
if(tour.filter(e=>e.eventStatus==='held').length!==19||tour.filter(e=>e.eventStatus==='cancelled').length!==1)throw Error('Tour schedule is incomplete');
await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(`Saved ${catalog.events.length} entries, including 19 held ZOMCRA shows and 1 cancellation.`);
