// Read-only snapshot of public official sources. Never reads account or email data.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('.research',{recursive:true});
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#039;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/<[^>]+>/g,'').trim();
async function html(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);return r.text();}
async function collection(url){let products=[];let pages=0;while(url){const h=await html(url);await writeFile(`.research/list-${pages}-${url.includes('PREMIUM')?'premium':'event'}.html`,h);for(const m of h.matchAll(/<li class="ogs-v2-top-list-item">([\s\S]*?)<\/a>\s*<\/li>/g)){const b=m[1],id=b.match(/product\/detail\/([^"?]+)/)?.[1],name=decode(b.match(/top-list-text-title">([\s\S]*?)<\/p>/)?.[1]||'');if(!id)continue;products.push({id,name,price:Number(decode(b.match(/data-ge-price>([\s\S]*?)<\/p>/)?.[1]||'').replace(/[^0-9]/g,'')),images:[...b.matchAll(/src="([^"]+\/product\/[^\"]+)"/g)].map(x=>x[1]),badges:[...b.matchAll(/<span[^>]*ogs-label-badge[^>]*>([\s\S]*?)<\/span>/g)].map(x=>decode(x[1])),url:`https://zutomayomart.net/v2/product/detail/${id}`});}const next=h.match(/<a href="([^"]+)" rel="next"/);url=next?new URL(decode(next[1]),'https://zutomayomart.net').href:null;pages++;if(pages>150)throw Error('pagination safety limit');}return products;}
if(process.argv.includes('--extra')){
 const all=await collection('https://zutomayomart.net/product/list');await writeFile('.research/all-catalog.json',JSON.stringify(all,null,2));
 for(const [k,u] of Object.entries({piaDetail:'https://t.pia.jp/pia/ticketInformation.do?lotRlsCd=08933',martforlive:'https://zutomayo.net/martforlive/'}))await writeFile(`.research/${k}.html`,await html(u));
 console.log(JSON.stringify({all:all.length}));process.exit(0);
}
const goods=await collection('https://zutomayomart.net/product/list?tag_codes=ZMT-T-048');
await writeFile('.research/catalog.json',JSON.stringify(goods,null,2));
const premium=await collection('https://zutomayomart.net/product/list?tag_codes=ztmy-PREMIUM-limited_2026');
await writeFile('.research/premium.json',JSON.stringify(premium,null,2));
for(const [key,url] of Object.entries({main:'https://zutomayo.net/bunka-denrai/',popup:'https://zutomayo.net/mart_nara202610/',pickup:'https://zutomayo.net/bunka_denrai_Item_netorder/',matsuri:'https://zutomayo.net/special/bunka-denrai/matsuri-area/',album:'https://zutomayo.net/news/652/',pia:'https://w.pia.jp/t/zutomayo-lzl-bunkadenrai/'})){try{await writeFile(`.research/${key}.html`,await html(url));}catch(e){console.log(key,e.message);}}
let pos=0;await Promise.all(Array.from({length:5},async()=>{while(pos<goods.length){const g=goods[pos++];try{await writeFile(`.research/${g.id}.html`,await html(g.url));}catch(e){console.log(g.id,e.message);}}}));
console.log(JSON.stringify({products:goods.length,premium:premium.length,details:pos}));
