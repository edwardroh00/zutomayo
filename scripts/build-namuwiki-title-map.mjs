// Preserve NamuWiki spelling; never modify the verified Japanese/English names.
import {readFile,writeFile} from 'node:fs/promises';
const evidence=JSON.parse(await readFile('.research/namuwiki/collected-title-evidence.json','utf8'));
const catalog=JSON.parse(await readFile('project_memory/SONG_TITLES.json','utf8'));
const mainURL='https://namu.wiki/w/'+encodeURIComponent('계속 한밤중이면 좋을 텐데./디스코그래피');
const norm=s=>s.normalize('NFC');
const map={checked_at:'2026-10-14',source:'나무위키',selection_policy:'개별 곡 문서의 제목 표기 우선, 없으면 디스코그래피 전곡 목록. 원문 띄어쓰기와 표기를 유지. 영문 원제만 있는 항목은 그대로 사용.',official_status:'community_reference_not_official',attribution:'나무위키 각 문서, CC BY-NC-SA 2.0 KR',titles:[]};
for(const s of catalog.originals){
 const e=evidence.find(x=>x.id===s.id);if(!e)throw Error(`Missing evidence ${s.id}`);
 const line=e.article_title_lines?.find(x=>norm(x).startsWith(norm(s.title_ja)));
 const main=e.main_row?.text.split('\n');
 const mainKo=main?.[1]?.split('|')[0].trim()||(main?.[0]?.trim()===s.title_ja?s.title_ja:null);
 const articleKo=line?norm(line).slice(norm(s.title_ja).length).split('|')[0].trim():null;
 const ko=articleKo||mainKo;if(!ko)throw Error(`Missing Korean reference ${s.title_ja}`);
 const source=articleKo?e.article_source:e.main_source;
 map.titles.push({id:s.id,title_ja:s.title_ja,title_ko:ko,title_ko_status:'namuwiki_reference',source,source_excerpt:articleKo?line:e.main_row.text,source_section:articleKo?'개별 곡 문서 제목':'디스코그래피 전곡 목록',aliases:mainKo&&mainKo!==ko?[{title:mainKo,source:e.main_source,source_excerpt:e.main_row.text}]:[],shared_latin_spelling:!/\p{Script=Hangul}/u.test(ko)});
}
const main=await readFile('.research/namuwiki/discography-original.html','utf8');
const yushin=await readFile('.research/namuwiki/yushinron.html','utf8');
if(!main.includes('프론트 메모리(feat. ACA네)')||!main.includes('푸르게 푸르게 빛나는(feat. ACA네)')||!yushin.includes('유심론'))throw Error('Supplementary NamuWiki evidence missing');
map.titles.push(
 {id:'yushinron',title_ja:'有心論',title_ko:'유심론',title_ko_status:'namuwiki_reference',source:evidence.find(x=>x.id==='yushinron').article_source,source_excerpt:'有心論 / 유심론',source_section:'원곡 문서 제목',aliases:[]},
 {id:'character',title_ja:'Character',title_ko:'Character',title_ko_status:'namuwiki_reference',source:mainURL,source_excerpt:'Character',source_section:'디스코그래피 참여 작품',aliases:[],shared_latin_spelling:true},
 {id:'front-memory',title_ja:'フロントメモリー (feat. ACAね)',title_ko:'프론트 메모리(feat. ACA네)',title_ko_status:'namuwiki_reference',source:mainURL,source_excerpt:'フロントメモリー(feat.ACAね) / 프론트 메모리(feat. ACA네)',source_section:'디스코그래피 참여 작품',aliases:[]},
 {id:'aoku-aoku-hikaru',title_ja:'青く青く光る',title_ko:'푸르게 푸르게 빛나는(feat. ACA네)',title_ko_status:'namuwiki_reference',source:mainURL,source_excerpt:'青く青く光る(feat. ACAね) / 푸르게 푸르게 빛나는(feat. ACA네)',source_section:'디스코그래피 참여 작품',aliases:[]}
);
await writeFile('project_memory/NAMUWIKI_KOREAN_TITLES.json',JSON.stringify(map,null,2)+'\n');
console.log(JSON.stringify({originals:map.titles.filter(x=>catalog.originals.some(y=>y.id===x.id)).length,entries:map.titles.length,aliases:map.titles.filter(x=>x.aliases.length).map(x=>({ja:x.title_ja,selected:x.title_ko,alternatives:x.aliases.map(a=>a.title)})),shared_latin:map.titles.filter(x=>x.shared_latin_spelling).map(x=>x.title_ko)},null,2));
