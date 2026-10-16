// Apply the user's NamuWiki exception for Korean display titles only.
import {readFile,writeFile} from 'node:fs/promises';
const base='project_memory';
const catalog=JSON.parse(await readFile(`${base}/SONG_TITLES.json`,'utf8'));
const map=JSON.parse(await readFile(`${base}/NAMUWIKI_KOREAN_TITLES.json`,'utf8'));
const evidence=JSON.parse(await readFile(`${base}/SONG_TITLE_EVIDENCE.json`,'utf8'));
if(!catalog.supplementary.some(x=>x.id==='aoku-aoku-hikaru'))catalog.supplementary.push({id:'aoku-aoku-hikaru',kind:'acane_feature',title_ja:'青く青く光る',title_en:null,title_en_type:'official_unverified',sources:['https://ultrapanic.com/','https://open.spotify.com/intl-de/track/7tIogxMoaDHGfLKIlkUlqk'],note:'Lanndo의 ULTRAPANIC 수록곡. ACAね와 ぬゆり 참여를 공식 앨범 사이트와 유통 메타데이터로 확인. 이번 나무위키 대조에서 발견해 참여곡 목록에 보완. 별도의 공식 영문 제목은 미확인.',checked_at:'2026-10-14'});
for(const s of [...catalog.originals,...catalog.supplementary]){
 const m=map.titles.find(x=>x.id===s.id);
 s.title_ko_official=null;s.title_ko_official_status='official_unverified';
 s.title_ko=m?.title_ko||null;s.title_ko_status=m?'namuwiki_reference':'namuwiki_unverified';
 s.title_ko_source=m?.source||null;s.title_ko_source_excerpt=m?.source_excerpt||null;
 s.title_ko_aliases=m?.aliases||[];s.title_ko_checked_at='2026-10-14';
}
if(catalog.originals.some(x=>!x.title_ko))throw Error('Missing original Korean reference');
catalog.schema_version=2;catalog.supplementary_count=catalog.supplementary.length;
catalog.scope=`ZUTOMAYO 공개 원곡 71곡(동일 곡 버전 중복 제거) + 공식 확인 커버·참여·매시업·발표곡 ${catalog.supplementary_count}건. 비공개 곡, 즉흥 연주, 모든 라이브/인스트/shorts의 완전 목록을 의미하지 않음.`;
catalog.korean_title_policy='사용자 요청에 따라 한글 표시 제목은 나무위키 표기를 그대로 채택. 개별 곡 문서 제목 우선, 없으면 디스코그래피 전곡 목록. 영문으로만 표기된 항목은 그대로 유지. 공식 한국어 곡명으로 인증하지 않으며 title_ko_official은 별도로 미확인 상태를 유지. 나무위키에서 확인되지 않은 항목은 임의 번역하지 않음.';
catalog.source_policy='일본어·영문 제목과 기타 정보는 공식 출처 우선; 한글 표시 제목은 사용자가 허용한 나무위키 출처 예외. DB는 탐색·교차 확인용.';
evidence.namuwiki_korean_title_reference={checked_at:'2026-10-14',map_file:'NAMUWIKI_KOREAN_TITLES.json',original_count:71,additional_count:map.titles.length-71,policy:map.selection_policy,attribution:map.attribution,unverified_supplementary:catalog.supplementary.filter(x=>!x.title_ko).map(x=>x.title_ja)};
evidence.additional_official_participation_source={url:'https://ultrapanic.com/',excerpt:'Lanndo feat.ACAね(ずっと真夜中でいいのに。),ぬゆり「青く青く光る」Music Video公開！',checked_at:'2026-10-14'};
await writeFile(`${base}/SONG_TITLES.json`,JSON.stringify(catalog,null,2)+'\n');
await writeFile(`${base}/SONG_TITLE_EVIDENCE.json`,JSON.stringify(evidence,null,2)+'\n');
const esc=s=>(s||'표기 미확인').replace(/\|/g,'\\|');
let md=`# 즛토마요 곡명 프로젝트 메모리\n\n확인일: **2026-10-14 (한국 시간)**\n\n공개 원곡 71곡의 일본어·영문 공식 제목과 나무위키 한글 표시 제목을 저장했다. 공식 확인 커버·참여곡·매시업·발표곡 ${catalog.supplementary_count}건은 별도 분류한다. 같은 곡의 라이브·인스트·어쿠스틱·재편집 버전은 새 원곡으로 세지 않는다.\n\n## 읽기 및 사용 원칙\n\n- **한글 표시 제목은 사용자 요청에 따라 나무위키 표기를 그대로 사용한다.** 개별 곡 문서의 제목을 우선하고, 개별 문서에서 찾지 못하면 디스코그래피 전곡 목록을 사용한다. 띄어쓰기를 임의로 고치지 않는다.\n- 나무위키 표기를 공식 한국어 제목으로 인증하지 않는다. JSON의 title_ko는 프로젝트 표시용, title_ko_official은 공식 현지화 확인용 별도 필드다.\n- 나무위키에 영문으로만 쓰인 곡(Dear. Mr「F」, Ham, JK BOMBER, MILABO, TAIDADA, Blues in the Closet, lowmotion algae 등)은 그대로 유지한다.\n- 일본어 원제·영문/로마자 제목과 공식 별칭은 이전 공식 근거를 유지한다. 예: お勉強しといてよ = 공식 MV STUDY ME / 음원 Obenkyou Shitoiteyo.\n- 한글 이름으로 요청된 곡은 이 목록에서 일본어·영문 제목과 매칭한다. 나무위키 내부의 다른 한글 표기는 JSON 별칭에도 보존한다.\n- 상세 매칭과 출처는 [SONG_TITLES.json](./SONG_TITLES.json), 한글 원문 발췌는 [NAMUWIKI_KOREAN_TITLES.json](./NAMUWIKI_KOREAN_TITLES.json), 공식 제목 근거는 [SONG_TITLE_EVIDENCE.json](./SONG_TITLE_EVIDENCE.json)에 있다.\n\n## 원곡 71곡\n\n정렬은 DB 탐색 목록의 최신순이며, 발매일 검증표를 의미하지 않는다. 한글 칸은 나무위키의 표시 이름, 영문 칸에는 공식 로마자 표기도 포함한다.\n\n| # | 한글 표시 제목 · 나무위키 | 공식 일본어 원제 | 공식 영문/로마자 제목 | 제목 근거 |\n|---:|---|---|---|---|\n`;
for(const s of catalog.originals)md+=`| ${s.no} | ${esc(s.title_ko)} | ${esc(s.title_ja)} | ${esc(s.title_en)} | [한글 출처](${s.title_ko_source}) · [공식 영상](${s.official_video.url})${s.en_source!==s.official_video.url?` · [영문 유통](${s.en_source})`:''} |\n`;
const labels={released_cover:'발매 커버',acane_collaboration:'ACAね 공동 참여',acane_feature:'ACAね 피처링',official_mashup:'공식 매시업',official_short_cover:'공식 shorts 커버',announced_original:'발표된 신곡'};
md+='\n## 추가 곡 및 참여 작품\n\n나무위키에서 해당 제목을 확인하지 못한 항목은 미확인으로 남겼다. 매시업의 한글 제목을 원곡 이름으로부터 조합해 만들지 않는다.\n\n| 구분 | 한글 표시 제목 · 나무위키 | 공식 원제 | 공식 영문/로마자 제목 | 근거 및 메모 |\n|---|---|---|---|---|\n';
for(const s of catalog.supplementary)md+=`| ${labels[s.kind]} | ${esc(s.title_ko)} | ${esc(s.title_ja)} | ${esc(s.title_en)} | ${s.title_ko_source?`[한글 출처](${s.title_ko_source}) · `:''}[공식 근거](${s.sources[0]}) · ${s.note} |\n`;
md+='\n## 출처별 표기 차이\n\n- 馴れ合いサーブ의 개별 곡 문서 제목은 **짜고 치는 서브**, 디스코그래피 전곡 목록은 **친숙한 서브**로 다르다. 표시 제목은 개별 문서를 따르고 다른 표기도 별칭으로 보존한다.\n- 消えてしまいそうです는 개별 문서의 **사라져 버릴 것 같아요**를 사용하며, 목록의 **사라져버릴 것 같아요**도 별칭으로 보존한다.\n- 나무위키 전곡 목록에 またね幻가 まてね幻, ろんりねす가 るんりねす로 적힌 부분이 있다. 한글 표시만 참고하고 일본어·영문 공식 제목은 바꾸지 않는다.\n- DB의 アンチモン 영문 antinomy는 공식 antimony와 달라 공식 표기를 사용한다. クリームで会いにいけますか의 일본어 표기도 공식 원문을 유지한다.\n- 暗く黒く의 MV DARKEN / 음원 Darken, ミラーチューン의 MV MIRROR TUNE / 음원 Mirror Tune 등 공식 별칭은 JSON에 보존한다.\n\n## 출처\n\n- 나무위키 [디스코그래피](https://namu.wiki/w/계속%20한밤중이면%20좋을%20텐데./디스코그래피)와 곡별 문서: 한글 표시 제목. 각 행에 실제 열람한 문서 링크와 확인일을 기록했다. 제목 표기 발췌의 원 출처는 나무위키이며 문서의 [CC BY-NC-SA 2.0 KR](https://creativecommons.org/licenses/by-nc-sa/2.0/kr/) 표기를 함께 기록한다.\n- [공식 RELEASE](https://zutomayo.net/release/), 공식 YouTube, Apple Music 일본·미국·한국 및 벅스 공식 유통 표기: 일본어·영문 제목과 공식 별칭.\n- [zutomayo-DB](https://zutomayo-db.pages.dev/songs/): 곡 목록 발견과 교차 확인.\n- [Lanndo ULTRAPANIC 공식 사이트](https://ultrapanic.com/): 이번 대조에서 발견한 ACAね 참여곡 青く青く光る 보완 근거.\n\n공식 한글 현지화 곡명은 기존 조사 출처에서 미확인이며, 이번 나무위키 표시 제목 채택과 별개다. 나무위키에 없는 한글 이름은 임의로 만들지 않는다. 가사 전문은 프로젝트 메모리에 저장하지 않는다.\n';
await writeFile(`${base}/SONG_TITLES.md`,md);
console.log(JSON.stringify({originals:catalog.originals.length,namuwiki_originals:catalog.originals.filter(s=>s.title_ko).length,supplementary:catalog.supplementary_count,namuwiki_supplementary:catalog.supplementary.filter(s=>s.title_ko).length,unverified_supplementary:catalog.supplementary.filter(s=>!s.title_ko).map(s=>s.title_ja)},null,2));
