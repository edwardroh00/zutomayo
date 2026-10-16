import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Public factual metadata only. Personal attendance is never seeded here.
const checkedAt = '2026-10-14';
const db = 'https://zutomayo-db.pages.dev';
const intense = 'ZUTOMAYO INTENSE II「坐・ZOMBIE CRAB LABO」';
const nara = '特別公演祭 LEGACY ZOMBIE LABO「文禍伝雷」奈良・平城京';
const config = [
  ['2026-10-10', nara, '平城宮跡歴史公園 中央区朝堂院 特設野外会場', '나라', '일본', '/lives/events/bunka_denrai/2026_10_10/', 'https://zutomayo.net/bunka-denrai/', 'https://www.setlist.fm/setlist/zutomayo/2026/heijou-kyuu-shiseki-rekishi-kouen-nara-japan-5372ff3d.html', 24],
  ['2026-10-11', nara, '平城宮跡歴史公園 中央区朝堂院 特設野外会場', '나라', '일본', '/lives/events/bunka_denrai/2026_10_11/', 'https://zutomayo.net/bunka-denrai/', 'https://www.setlist.fm/setlist/zutomayo/2026/heijou-kyuu-shiseki-rekishi-kouen-nara-japan-5b72ff3c.html', 24],
  ['2026-09-19', 'ROCK IN JAPAN FESTIVAL 2026', '千葉市蘇我スポーツ公園 · LOTUS STAGE', '지바', '일본', '/lives/feses/rock_in_japan_festival_2026/', 'https://rockinon.com/quick/rijf2026/detail/215863?rtw=', 'https://www.setlist.fm/setlist/zutomayo/2026/soga-sports-kouen-lotus-stage-chiba-japan-2b728816.html', 12],
  ['2026-09-06', 'SOUND PLANET FESTIVAL', 'PARADISE CITY · Culture Park', '인천', '대한민국', '/lives/feses/sound_planet_festival_2026/', 'https://zutomayo.net/live/55/', 'https://www.setlist.fm/setlist/zutomayo/2026/paradise-city-culture-park-incheon-south-korea-53772799.html', 15],
  ['2026-08-22', 'WILD BUNCH FEST. 2026', '山口きらら博記念公園 · Pirates Stage', '야마구치', '일본', '/lives/feses/wild_bunch_fest_2026/', 'https://zutomayo.net/live/54/', 'https://www.setlist.fm/setlist/zutomayo/2026/yamaguchi-kirara-haku-kinen-kouen-pirates-stage-yamaguchi-japan-4b72175e.html', 12],
  ['2026-08-02', 'OSAKA GIGANTIC MUSIC FESTIVAL 2026 -THANKS 10TH GIGA-', '大阪舞洲スポーツアイランド · SUN STAGE', '오사카', '일본', '/lives/feses/osaka_gigantic_music_festival_2026/', 'https://zutomayo.net/live/53/', 'https://www.setlist.fm/setlist/zutomayo/2026/maishima-sun-stage-osaka-japan-4b75fb22.html', 10],
  ['2026-03-14', intense, 'KOREA UNIVERSITY TIGER DOME · 고려대학교 화정체육관', '서울', '대한민국', '/lives/tours/intense2/2026_03_14/', 'https://zutomayo.net/intense2/', 'https://www.setlist.fm/setlist/zutomayo/2026/korea-university-hwajeong-gymnasium-seoul-south-korea-434c03df.html', 23],
  ['2026-03-15', intense, 'KOREA UNIVERSITY TIGER DOME · 고려대학교 화정체육관', '서울', '대한민국', '/lives/tours/intense2/2026_03_15/', 'https://zutomayo.net/intense2/', 'https://www.setlist.fm/setlist/zutomayo/2026/korea-university-hwajeong-gymnasium-seoul-south-korea-634d5ecf.html', 23],
  ['2026-02-28', intense, '日本武道館', '도쿄', '일본', '/lives/tours/intense2/2026_02_28/', 'https://zutomayo.net/intense2/', null, 23],
  ['2026-03-01', intense, '日本武道館', '도쿄', '일본', '/lives/tours/intense2/2026_03_01/', 'https://zutomayo.net/intense2/', null, 23],
  ['2024-06-15', 'ZUTOMAYO INTENSE IN SEOUL', 'YES24 LIVEHALL', '서울', '대한민국', '/lives/events/zutomayo_intense_in_seoul/2024_06_15/', 'https://zutomayo.net/news/397/', null, 17],
  ['2024-06-16', 'ZUTOMAYO INTENSE IN SEOUL', 'YES24 LIVEHALL', '서울', '대한민국', '/lives/events/zutomayo_intense_in_seoul/2024_06_16/', 'https://zutomayo.net/news/397/', null, 17],
];
const songs = JSON.parse(await readFile(new URL('../project_memory/SONG_TITLES.json', import.meta.url), 'utf8'));
const allSongs = [...songs.originals, ...songs.supplementary];
const byId = new Map(allSongs.map(song => [song.id, song]));
const clean = value => value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
async function getHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}
function parseSetlist(html, eventId) {
  const table = html.match(/<table[^>]*class="setlist-table"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  if (!table) return { setlist: [], sourceRows: 0, memos: [] };
  const setlist = [], memos = [];
  let encore = false, sourceRows = 0;
  for (const match of table.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)) {
    const [, attrs, row] = match;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(cell => cell[1]);
    if (cells.length < 4) continue;
    const number = clean(cells[0]), rawTitle = clean(cells[1]), notes = clean(cells[3]);
    if (/encore|アンコール/i.test(rawTitle) || /row-encore/.test(attrs) || number === 'EN') encore = true;
    if (!/^\d+$/.test(number) && number !== 'EN') { memos.push({ rawTitle, notes }); continue; }
    sourceRows++;
    const sourceSongIds = [...cells[1].matchAll(/href="\/songs\/([^"/]+)\/?"/g)].map(song => song[1]);
    const songIds = sourceSongIds.filter(id => byId.has(id));
    const kind = /Cover/i.test(rawTitle) ? 'cover' : 'song';
    setlist.push({ id: `${eventId}-s${sourceRows}`, rawTitle, songIds, kind, encore, sourcePosition: sourceRows, sourceNumber: number, notes, occurrences: 1, mappingStatus: songIds.length ? 'matched' : 'unmatched' });
  }
  return { setlist, sourceRows, memos };
}
const events = [];
const previous = JSON.parse(await readFile(new URL('../data/lives.json', import.meta.url),'utf8'));
for (const [date, name, venue, city, country, path, officialUrl, crossUrl, expected] of config) {
  const id = `${date}-${path.includes('bunka_denrai') ? 'nara' : path.includes('intense2') ? (city === '서울' ? 'seoul' : 'tokyo') : path.includes('zutomayo_intense_in_seoul') ? 'seoul' : path.split('/').filter(Boolean).at(-1)}`;
  const { setlist, sourceRows, memos } = parseSetlist(await getHtml(db + path), id);
  if (sourceRows !== expected) throw new Error(`${id}: ${sourceRows} source rows, expected ${expected}; review before publishing`);
  if (setlist.some(entry => entry.mappingStatus === 'unmatched' && entry.kind !== 'cover')) throw new Error(`${id}: unmatched original title`);
  const verificationNotes = ['공연 일자·장소는 공식 자료, 세트리스트는 별도 출처로 구분. 완전 표시는 출처에 수록된 전체 목록 기준이며 공식 인증을 의미하지 않음.'];
  if (name === nara) {
    const first = setlist.findIndex(entry => entry.songIds.includes('samayoi-yoi-ondo'));
    const next = setlist[first + 1];
    if (next?.songIds.includes('kikai-abura')) {
      setlist[first] = { ...setlist[first], rawTitle: `${setlist[first].rawTitle} / ${next.rawTitle}`, songIds: [...setlist[first].songIds, ...next.songIds], kind: 'medley', sourcePositions: [setlist[first].sourcePosition, next.sourcePosition], notes: '彷徨い機械油音頭 · DB에서 구성곡을 분리 표기, setlist.fm은 메들리 한 항목으로 표기' };
      setlist.splice(first + 1, 1);
    }
    const ultra = setlist.find(entry => entry.songIds.includes('ultra-tamashii'));
    ultra.reportedOccurrences = 2;
    ultra.occurrenceStatus = 'conflicting';
    ultra.notes = 'DB: x2 / setlist.fm: 단일 항목. 집계는 확인 가능한 1회 기준; 반복 여부 별도 확인 필요.';
    const neko = setlist.find(entry => entry.songIds.includes('neko-reset'));
    neko.medleyGroup = 'neko-sentokun';
    const cover = setlist.find(entry => entry.kind === 'cover');
    cover.medleyGroup = 'neko-sentokun';
    cover.notes = '猫リセット와 메들리. 곡명 목록에 없는 커버이므로 원곡 달성률에서 제외.';
    verificationNotes.push('입장곡 蘭陵王 및 MC·이동은 개인 원곡 통계에서 제외. ultra魂 반복 횟수는 출처 간 불일치.');
  }
  if (date === '2026-03-14') {
    const humanoid = setlist.find(entry => entry.songIds.includes('humanoid'));
    humanoid.notes = 'setlist.fm: shortened / DB: 별도 short 표기 없음. 곡 연결은 확정, 길이·편곡 표기 차이 보존.';
  }
  const officialSetlist = date === '2026-09-19';
  if (officialSetlist) {
    const primaryTitles = ['眩しいDNAだけ', 'シェードの埃は延長', '間人間', '綺麗キラー', 'TAIDADA', 'よもすがら', '海⾺成⻑痛', '不死⾝の訓練', 'メディアノーチェ', '秒針を噛む', 'あいつら全員同窓会', '暗く黒く'];
    setlist.forEach((entry, index) => {
      entry.dbRawTitle = entry.rawTitle;
      entry.rawTitle = primaryTitles[index];
    });
    verificationNotes.push('주최사 원문은 綺麗キラー로 표기. 공식 곡명 목록과 팬 DB의 綺羅キラー에 매칭하며 원문 오기를 보존.');
  }
  const setlistSource = officialSetlist ? officialUrl : db + path;
  events.push({ id, date, name, tour: name === intense || name === nara ? name : null, venue, city, country, sourceUrls: [...new Set([officialUrl, db + path, crossUrl].filter(Boolean))], officialSource: officialUrl, eventStatus: 'held', metadataStatus: 'official_checked', setlistSource, setlistSourceLabel: officialSetlist ? '주최사 공개 세트리스트' : 'zutomayo-DB · 팬 자료', setlistEvidence: officialSetlist ? 'organizer_published' : crossUrl ? 'fan_cross_checked' : 'fan_single_source', setlistStatus: 'complete', sourceSongRows: sourceRows, setlist, sourceMemos: memos, checked_at: checkedAt, verificationNotes });
  console.log(`${id}: ${sourceRows} source rows, ${setlist.length} entries`);
}
// Refreshing the first batch must not erase subsequently verified tour dates or stable IDs.
const merged = new Map(previous.events.map(e=>[e.id,e]));
for(const event of events)merged.set(event.id,{...merged.get(event.id),...event});
const published = [...merged.values()].sort((a, b) => b.date.localeCompare(a.date));
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/lives.json', import.meta.url), JSON.stringify({ ...previous, schemaVersion: 1, updatedAt: previous.updatedAt > checkedAt ? previous.updatedAt : checkedAt, completenessPolicy: 'setlistStatus complete는 출처가 전체 목록으로 게시한 경우. 팬 자료의 완전성과 반복 횟수는 공식 인증과 구분.', events: published }, null, 2) + '\n', 'utf8');
