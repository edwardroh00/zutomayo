// Public-source title metadata only. Raw pages stay in ignored .research/.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='.research/song-titles'; await mkdir(dir,{recursive:true});
const decode=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#039;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g,' ').trim();
async function get(name,url){let h;try{h=await readFile(`${dir}/${name}.html`,'utf8')}catch{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${r.status} ${url}`);h=await r.text();await writeFile(`${dir}/${name}.html`,h)}return h;}
async function pool(items,fn,n=5){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const x=items[i++];try{await fn(x)}catch(e){console.log('ERROR',x.slug||x,e.message)}}}));}
const list=await get('db-list','https://zutomayo-db.pages.dev/songs/');
const songs=[...list.matchAll(/href="(\/songs\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({slug:m[1].split('/').filter(Boolean).at(-1),ja_db:decode(m[2]),db_url:new URL(m[1],'https://zutomayo-db.pages.dev').href}));
await pool(songs,async s=>{const h=await get(`db-${s.slug}`,s.db_url);s.en_db=decode(h.match(/英語タイトル<\/th>\s*<td[^>]*>(.*?)<\/td>/s)?.[1]||'');s.links=[...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:decode(m[1]),text:decode(m[2])})).filter(x=>/youtube|youtu\.be|\/youtube\//.test(x.url));});
await writeFile(`${dir}/db-songs.json`,JSON.stringify(songs,null,2));
const release=await get('release','https://zutomayo.net/release/');
const paths=[...new Set([...release.matchAll(/href="([^" ]*\/release\/\d+\/)"/g)].map(m=>m[1]))];
const releases=[];await pool(paths,async p=>{const url=new URL(p,'https://zutomayo.net').href;const h=await get(`release-${p.split('/').filter(Boolean).at(-1)}`,url);releases.push({url,text:decode(h),links:[...h.matchAll(/href="([^"]+)"/g)].map(m=>decode(m[1])).filter(u=>/lnk\.to|apple|spotify/.test(u))});});
await writeFile(`${dir}/official-releases.json`,JSON.stringify(releases,null,2));
for(const [n,u] of [['bugs-albums','https://music.bugs.co.kr/artist/7314686/albums?type=RELEASE'],['bugs-keisoudo','https://music.bugs.co.kr/album/40039431'],['itunes-us','https://itunes.apple.com/lookup?id=1428083875&entity=song&limit=200&country=US'],['itunes-jp','https://itunes.apple.com/lookup?id=1428083875&entity=song&limit=200&country=JP'],['itunes-kr','https://itunes.apple.com/lookup?id=1428083875&entity=song&limit=200&country=KR']]){try{const h=await get(n,u);console.log(n,h.length)}catch(e){console.log('ERROR',n,e.message)}}
console.log(JSON.stringify({songs:songs.length,releases:releases.length,sample:songs.slice(0,2)},null,2));
if(process.argv.includes('--verify')){
 const jp=JSON.parse(await readFile(`${dir}/itunes-jp.html`,'utf8')).results;
 const core=/^(潜潜話|ぐされ|沈香学|形藻土|今は今で誓いは笑みで - EP|正しい偽りからの起床 - EP|伸び仕草懲りて暇乞い - EP|朗らかな皮膚とて不服 - EP|虚仮の一念海馬に託す - EP|あかねさす頃 - Single|イチジク煙 - Single|クリームで会いにいけますか - Single)$/;
 const ids=[...new Set(jp.filter(t=>core.test(t.collectionName||'')).map(t=>t.collectionId))];
 await pool(ids,async id=>{for(const country of ['JP','US','KR']){await get(`apple-album-${id}-${country}`,`https://itunes.apple.com/lookup?id=${id}&entity=song&country=${country}`)}});
 const videos=[];
 await pool(songs,async s=>{
  const link=s.links.find(x=>/^(MV|OST|Lyric)/.test(x.text)&&/\/youtube\/[\w-]{11}$/.test(x.url));if(!link)return;
  const id=link.url.split('/').at(-1),url=`https://www.youtube.com/watch?v=${id}&hl=ko&gl=KR`;
  let meta;try{meta=JSON.parse(await readFile(`${dir}/video-${id}.json`,'utf8'))}catch{
   const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const h=await r.text();const match=h.match(/var ytInitialPlayerResponse = (.*?);<\/script>/s);if(!match)throw Error(`player metadata missing ${id}`);
   const p=JSON.parse(match[1]);meta={id,url,title:p.videoDetails?.title,author:p.videoDetails?.author,channelId:p.videoDetails?.channelId,description:p.videoDetails?.shortDescription,captions:p.captions?.playerCaptionsTracklistRenderer?.captionTracks?.map(t=>({languageCode:t.languageCode,name:t.name,kind:t.kind})),playability:p.playabilityStatus?.status};await writeFile(`${dir}/video-${id}.json`,JSON.stringify(meta,null,2));
  }videos.push({slug:s.slug,...meta});
 },4);
 await writeFile(`${dir}/official-videos.json`,JSON.stringify(videos,null,2));
 console.log(JSON.stringify({albums:ids.length,videos:videos.length,koreanTitles:videos.filter(x=>/[가-힣]/.test(x.title||'')).map(x=>({slug:x.slug,title:x.title})),wrongChannels:videos.filter(x=>x.channelId&&x.channelId!=='UCv6P5nsS9rP4tDtFlqLU_QQ').map(x=>({slug:x.slug,author:x.author}))},null,2));
}
if(process.argv.includes('--supplement')){
 const extraVideos={nareai:'bIW0n36TUSQ',superficial:'cWK45FChXdk',saturn:'Ni5jPjvGxtw',matane:'6PpOOKEGX-4',yushinron:'EgzDEQA7qGo',character:'XH-gOoeoZD8',kururiCover:'Kk20yekpc4U'};
 for(const [name,id] of Object.entries(extraVideos)){
  const url=`https://www.youtube.com/watch?v=${id}&hl=ko&gl=KR`;const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const h=await r.text();const m=h.match(/var ytInitialPlayerResponse = (.*?);<\/script>/s);if(!m){console.log('ERROR',name);continue}const p=JSON.parse(m[1]);const meta={id,url,title:p.videoDetails?.title,author:p.videoDetails?.author,channelId:p.videoDetails?.channelId,description:p.videoDetails?.shortDescription,playability:p.playabilityStatus?.status};await writeFile(`${dir}/video-${id}.json`,JSON.stringify(meta,null,2));console.log(name,meta.title);
 }
 for(const [name,url] of [['sega-mashup-jp','https://www.sega.jp/topics/detail/260202_3/'],['sega-mashup-en','https://asia.sega.com/p3r/en/news/260202/'],['itunes-front-us','https://itunes.apple.com/search?term=Shinsei+Kamatte+Chan+Front+Memory&entity=song&country=US&limit=30'],['itunes-front-jp','https://itunes.apple.com/search?term=Shinsei+Kamatte+Chan+Front+Memory&entity=song&country=JP&limit=30']]){try{console.log(name,(await get(name,url)).length)}catch(e){console.log('ERROR',name,e.message)}}
}
