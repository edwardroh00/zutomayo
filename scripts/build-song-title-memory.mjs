// Build project memory from saved public evidence; does not invent translations.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const dir='.research/song-titles',out='project_memory';
const read=async n=>JSON.parse(await readFile(`${dir}/${n}`,'utf8'));
const db=await read('db-songs.json'),releases=await read('official-releases.json');
const videos=await read('official-videos.json');
const apple={};for(const c of ['jp','us','kr'])apple[c]=(await read(`itunes-${c}.html`)).results.filter(t=>t.wrapperType==='track');
const channel='UCv6P5nsS9rP4tDtFlqLU_QQ';
const extraIds={nareai:'bIW0n36TUSQ',superficial:'cWK45FChXdk',saturn:'Ni5jPjvGxtw',matane:'6PpOOKEGX-4',yushinron:'EgzDEQA7qGo',character:'XH-gOoeoZD8',kururiCover:'Kk20yekpc4U'};
const extras={};for(const [key,id] of Object.entries(extraIds)){extras[key]=await read(`video-${id}.json`);if(extras[key].channelId!==channel)throw Error(`Wrong official channel: ${key}`);}
const overrides={'nareai-serve':extras.nareai,'uwabe-no-watashi-jishin-nandayo':extras.superficial,saturn:extras.saturn,'matane-maboroshi':extras.matane};
// Slugs may vary in the DB; use verified Japanese titles for these replacements.
const overrideJa={'馴れ合いサーブ':extras.nareai,'上辺の私自身なんだよ':extras.superficial,'サターン':extras.saturn,'またね幻':extras.matane};
const canonicalJa={'クリームで会いに行けますか':'クリームで会いにいけますか'};
const norm=s=>(s||'').normalize('NFC');
const romanized=new Set(['akanesasu','yomosugara','Hanaichi Monnme','Nareai Serve','Neko Reset','Kisumi at Midnight','Inemuri Enseitai','Yasashiku Last Smile','Konnakoto Soudou','Haze Haseru Haterumade','Kettobashita Moufu','Samayoi Yoi Ondo','Minority Myakuraku','Matane Maboroshi','Kansaete Kuyashiiwa','Kan Saete Kuyashiiwa','Seigi','Mabushii DNA Dake','Kimigaite Mizuninaru','Uni To Kuri','Nouriueno Cracker','Byoushinwo Kamu','Obenkyou Shitoiteyo']);
const getEn=v=>v?.title?.match(/ZUTOMAYO\s*[–—-]\s*([^）)]+)[）)]/)?.[1]?.trim();
const originals=db.map((s,index)=>{
 const ja=canonicalJa[s.ja_db]||norm(s.ja_db),v=overrideJa[s.ja_db]||overrides[s.slug]||videos.find(x=>x.slug===s.slug);
 if(!v||v.channelId!==channel)throw Error(`Missing verified official video ${ja}`);
 const jaCandidates=apple.jp.filter(t=>norm(t.trackName)===ja||norm(t.trackName)===`${ja} (feat. Mori Calliope)`||(ja==='Dear. Mr「F」'&&t.trackName==='Dear Mr「F」'));
 const pairs=jaCandidates.flatMap(j=>[...apple.us,...apple.kr].filter(t=>t.trackId===j.trackId&&!/[ぁ-ゖァ-ヺ一-龥]/.test(t.trackName)).map(e=>({ja:j.trackName,en:e.trackName,url:e.trackViewUrl,track_id:e.trackId}))).filter((p,i,a)=>a.findIndex(x=>x.url===p.url)===i);
 let en=getEn(v),enSource=en?v.url:null;
 if(!en){if(!pairs.length)throw Error(`No official English metadata ${ja}`);en=pairs[0].en;enSource=pairs[0].url;}
 const matchingReleases=releases.filter(r=>norm(r.text).includes(ja));
 if(!matchingReleases.length&&!norm(v.title).includes(ja))throw Error(`Japanese source missing ${ja}`);
 const kr=jaCandidates.flatMap(j=>apple.kr.filter(t=>t.trackId===j.trackId).map(e=>({title:e.trackName,url:e.trackViewUrl,track_id:e.trackId})));
 const englishAliases=[...new Set(pairs.map(p=>p.en).filter(x=>x!==en))];
 const notes=[];
 if(s.en_db!==en)notes.push(`DB 영문 표기 ${s.en_db}; 공식 기준 ${en}`);
 if(s.ja_db!==ja)notes.push(`DB 일본어 표기 ${s.ja_db}; 공식 기준 ${ja}`);
 if(ja==='綺羅キラー')notes.push('feat. Mori Calliope 표기는 피처링 크레딧으로 별도 보존');
 if(ja==='お勉強しといてよ')notes.push('공식 MV 영문 STUDY ME, 공식 음원 로마자 Obenkyou Shitoiteyo를 모두 보존');
 if(ja==='はゔぁ')notes.push('일부 공식 재발매 페이지의 はヴぁ 표기도 존재; 원발매 및 공식 Audio Track의 はゔぁ를 기준으로 사용');
 return {id:s.slug,no:index+1,kind:'original',title_ja:ja,title_ko:null,title_ko_status:'official_unverified',title_en:en,title_en_type:romanized.has(en)?'official_latin_or_romanized':'official_english_or_shared_latin',title_en_aliases:englishAliases,ja_sources:matchingReleases.map(r=>r.url).concat(v.url),en_source:enSource,official_video:{id:v.id,title:v.title,url:v.url,channel_id:v.channelId},official_apple_pairs:pairs,korea_storefront_titles:kr,db_reference:{url:s.db_url,title_ja:s.ja_db,title_en:s.en_db},notes,checked_at:'2026-10-14'};
});
if(originals.length!==71||new Set(originals.map(x=>x.title_ja)).size!==71)throw Error('Original catalog count mismatch');
const supplementary=[
 {id:'yushinron',kind:'released_cover',title_ja:'有心論',title_en:'Yushinron',title_en_type:'official_latin_or_romanized',sources:['https://zutomayo.net/news/547/',extras.yushinron.url],note:'RADWIMPS 트리뷰트 수록 커버. 71곡 원곡 목록과 별도.'},
 {id:'character',kind:'acane_collaboration',title_ja:'Character',title_en:'Character',title_en_type:'shared_latin_original',sources:[extras.character.url,'https://music.apple.com/us/album/character-single/1568991497'],note:'ACAね × Rin音, Prod by Yaffle. 일본 발매 원제도 Character이며 캐릭터라는 한글 제목을 만들지 않음.'},
 {id:'front-memory',kind:'acane_feature',title_ja:'フロントメモリー (feat. ACAね)',title_en:null,title_en_type:'official_unverified',sources:['https://www.universal-music.co.jp/zutomayo/news/2023-08-23/','https://music.apple.com/jp/album/1701175550?i=1701175553'],note:'神聖かまってちゃん의 2023년 재녹음 피처링. 해당 녹음의 영문 표기를 직접 확인하지 못하여 비워 둠. 레이블 공지의 MV 링크가 馴れ合いサーブ로 연결되는 오류가 있어 그 링크는 곡명 근거로 쓰지 않음.'},
 {id:'hippocampal-pain-mashup',kind:'official_mashup',title_ja:'海馬成長痛 × Mass Destruction -Reload-',title_en:null,title_en_type:'official_unverified',sources:['https://www.sega.jp/topics/detail/260202_3/'],note:'SEGA/ATLUS 공식 타이업 매시업. 일본어 공지로 확인; 이번 조사에서 영어·한국어 공식 타이틀 원문을 직접 확보하지 못함.'},
 {id:'kohakuiro-no-machi-cover',kind:'official_short_cover',title_ja:'琥珀色の街、上海蟹の朝',title_en:null,title_en_type:'official_unverified',sources:[extras.kururiCover.url],note:'くるり 곡의 공식 채널 shorts 커버. 독립 정규 발매곡이나 ZUTOMAYO 작곡 원곡으로 계산하지 않음.'},
 {id:'almond-mondo',kind:'announced_original',title_ja:'アーモンド問答',title_en:null,title_en_type:'official_unverified',sources:['https://zutomayo.net/news/650/'],note:'2026-09-21 공식 타이업 발표. 2026-10-14 확인 자료에서는 독립 음원 발매 및 영문·한글 제목을 확인하지 못함; 발표된 곡명으로만 저장.'}
].map(x=>({...x,title_ko:null,title_ko_status:'official_unverified',checked_at:'2026-10-14'}));
const evidence={checked_at:'2026-10-14',youtube_request_language:'ko',youtube_request_country:'KR',channel_id:channel,official_video_titles:[...videos,...Object.values(extras)].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).map(v=>({id:v.id,url:v.url,title:v.title,channel_id:v.channelId})),apple_jp_us_pairs:originals.flatMap(x=>x.official_apple_pairs),apple_kr_metadata_sample:{source:'https://itunes.apple.com/lookup?id=1428083875&entity=song&limit=200&country=KR',count:apple.kr.length,hangul_title_count:apple.kr.filter(t=>/[가-힣]/.test(t.trackName)).length},korean_check_limits:'공식 유튜브 제목·설명과 Apple Music 한국 메타데이터 및 벅스 유통 표기를 조사. 자막 본문의 번역, 팬 번역, 웹사이트 자동 번역은 공식 현지화 곡명으로 취급하지 않음. 공식 한국어 제목이 없다고 단정하는 자료가 아니라, 조사한 출처에서 확인되지 않았다는 기록.',db_discrepancies:originals.filter(x=>x.notes.length).map(x=>({id:x.id,ja:x.title_ja,en:x.title_en,notes:x.notes}))};
const catalog={schema_version:1,checked_at:'2026-10-14',scope:'ZUTOMAYO 공개 원곡 71곡(동일 곡 버전 중복 제거) + 공식 확인 커버·참여·매시업·발표곡 6건. 비공개 곡, 즉흥 연주, 모든 라이브/인스트/shorts의 완전 목록을 의미하지 않음.',source_policy:'공식 사이트·레이블·공식 채널과 공식 유통 메타데이터를 우선. DB는 목록 발견과 교차 확인용.',korean_title_policy:'공식 한글 현지화 곡명은 이번 조사에서 미확인. null을 번역으로 채우지 말 것. 한국 서비스가 영문으로 제공하는 표기는 한글 제목으로 바꾸지 말 것.',original_count:originals.length,supplementary_count:supplementary.length,originals,supplementary};
await mkdir(out,{recursive:true});
await writeFile(`${out}/SONG_TITLES.json`,JSON.stringify(catalog,null,2)+'\n');
await writeFile(`${out}/SONG_TITLE_EVIDENCE.json`,JSON.stringify(evidence,null,2)+'\n');
const esc=s=>(s||'공식 표기 미확인').replace(/\|/g,'\\|');
let md='# 즛토마요 공식 곡명 프로젝트 메모리\n\n확인일: **2026-10-14 (한국 시간)**\n\n공개 원곡 71곡을 곡 단위로 대조했고, 공식 확인 커버·참여곡·매시업·발표곡 6건을 별도로 기록했다. 같은 곡의 라이브·인스트·어쿠스틱·재편집 버전은 새 원곡으로 세지 않는다. 비공개 곡이나 모든 즉흥/shorts 커버까지 완전 수록했다고 주장하지 않는다.\n\n## 읽기 및 사용 원칙\n\n- 일본어 원제와 공식 영문 제목은 아래 근거를 사용한다. 원제가 라틴 문자이면 그대로 보존한다.\n- **공식 한글 현지화 곡명은 이번에 조사한 출처에서 확인하지 못했다.** 한글 칸을 팬 번역·기계 번역·임의 음차로 채우지 않는다. 미확인은 공식 한글 제목이 존재하지 않는다는 단정이 아니다.\n- 공식 MV 영문명과 음원 서비스의 로마자 이름은 함께 존재할 수 있다. 예: お勉強しといてよ = 공식 MV STUDY ME / 음원 Obenkyou Shitoiteyo. 영문 번역과 로마자 표기를 혼동하지 않는다.\n- 대소문자·띄어쓰기·문장부호가 공식 채널과 유통 서비스에서 다르면 기준 표기와 공식 별칭을 함께 보존한다.\n- 확인 이후 신곡, 곡명 변경, 새 한국어 현지화가 나오면 공식 원문을 확인하고 이 목록을 갱신한다.\n- 상세 필드·공식 별칭·한국 음원 서비스 실제 표기·출처는 [SONG_TITLES.json](./SONG_TITLES.json), 원문 표기 대조는 [SONG_TITLE_EVIDENCE.json](./SONG_TITLE_EVIDENCE.json)에 있다.\n\n## 공식 원곡 71곡\n\n정렬은 DB 탐색 목록의 최신순이며, 발매일 검증표를 의미하지 않는다. 영문 칸에는 공식 로마자 표기도 포함한다.\n\n| # | 공식 한글 제목 | 공식 일본어 원제 | 공식 영문/로마자 제목 | 공식 제목 근거 |\n|---:|---|---|---|---|\n';
for(const x of originals)md+=`| ${x.no} | 공식 표기 미확인 | ${esc(x.title_ja)} | ${esc(x.title_en)} | [공식 영상](${x.official_video.url})${x.en_source!==x.official_video.url?` · [영문 유통](${x.en_source})`:''} |\n`;
md+='\n## 공식 확인 추가 곡 및 참여 작품\n\n아래 항목은 원곡 71곡과 별도 분류하며, 공개/발매 상태와 아티스트 명의를 혼동하지 않는다.\n\n| 구분 | 공식 한글 제목 | 공식 원제 | 공식 영문/로마자 제목 | 근거 및 메모 |\n|---|---|---|---|---|\n';
const labels={released_cover:'발매 커버',acane_collaboration:'ACAね 공동 참여',acane_feature:'ACAね 피처링',official_mashup:'공식 매시업',official_short_cover:'공식 shorts 커버',announced_original:'발표된 신곡'};
for(const x of supplementary)md+=`| ${labels[x.kind]} | 공식 표기 미확인 | ${esc(x.title_ja)} | ${esc(x.title_en)} | [공식 근거](${x.sources[0]}) · ${x.note} |\n`;
md+='\n## 표기 대조에서 확인한 차이\n\n- DB의 アンチモン 영문 **antinomy**는 공식 영상의 **antimony**와 다르므로 공식 표기를 사용한다.\n- DB의 クリームで会いに行けますか는 공식 원문의 **クリームで会いにいけますか**로 저장한다.\n- 暗く黒く의 공식 MV는 DARKEN, 음원은 Darken을 사용한다. ミラーチューン은 MV MIRROR TUNE / 음원 Mirror Tune, MILABO는 MV MILABO / 음원 Milabo 등 공식 별칭을 JSON에 보존한다.\n- 正しくなれない의 Can’t Be Right와 Can\'t Be Right는 공식 출처별 아포스트로피 차이를 보존한다.\n\n## 확인한 출처와 한계\n\n1. [공식 RELEASE](https://zutomayo.net/release/) 및 링크된 17개 발매 페이지: 일본어 제목과 수록곡 대조.\n2. [공식 YouTube](https://www.youtube.com/channel/UCv6P5nsS9rP4tDtFlqLU_QQ): 곡별 공개 MV/Audio Track의 실제 제목과 채널 ID 대조. 한국어 요청에서도 현지화 한글 제목은 확인되지 않았다.\n3. [Apple Music 한국](https://music.apple.com/kr/artist/zutomayo/1428083875), 일본·미국의 공식 유통 메타데이터: 같은 track ID의 일본어·영문명 매칭 및 실제 한국 서비스 표기 확인.\n4. [벅스 ZUTOMAYO](https://music.bugs.co.kr/artist/7314686)와 [KEISOUDO](https://music.bugs.co.kr/album/40039431): 유니버설뮤직코리아 유통 및 영문 표기 교차 확인.\n5. [zutomayo-DB 곡 목록](https://zutomayo-db.pages.dev/songs/): 71곡 탐색 목록과 영문 별칭의 보조 비교. 공식 제목의 최종 근거로 단독 사용하지 않았다.\n\n공식 영상의 한국어 자막은 번역 가사가 있을 수 있지만, 자막 제공만으로 독립된 공식 한국어 곡명이 확정되지는 않는다. 검색 결과의 한국어 팬 제목과 공식 사이트 자동 번역도 공식 곡명 근거로 채택하지 않았다. 이 기록은 제목 확인을 위한 메모리이며 가사 전문을 저장하지 않는다.\n';
await writeFile(`${out}/SONG_TITLES.md`,md);
console.log(JSON.stringify({originals:originals.length,supplementary:supplementary.length,official_ja_confirmed:originals.filter(x=>x.title_ja).length,official_en_confirmed:originals.filter(x=>x.title_en).length,official_ko_confirmed:originals.filter(x=>x.title_ko).length,unresolved_supplementary_en:supplementary.filter(x=>!x.title_en).map(x=>x.title_ja)},null,2));

// Preserve the later user instruction allowing NamuWiki Korean display titles.
await import('./apply-namuwiki-title-memory.mjs');
