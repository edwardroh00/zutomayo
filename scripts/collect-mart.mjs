// Public official shop only. Follow published links; never enumerate hidden product IDs.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const BASE='https://zutomayomart.net';
export const checkedAt='2026-10-17';
const dir='.research/mart';
export const clean=s=>(s||'').replace(/<br\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp|yen|times|Ntilde);/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&yen;':'¥','&times;':'×','&Ntilde;':'Ñ'}[x])).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n)).replace(/[\t\r ]+/g,' ').trim();
const unique=a=>[...new Set(a)];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let lastRequest=0;
async function page(url,key){
 const file=`${dir}/${key}.html`;
 if(!process.argv.includes('--refresh'))try{return await readFile(file,'utf8');}catch{}
 await delay(Math.max(0,350-(Date.now()-lastRequest)));lastRequest=Date.now();
 const res=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!res.ok)throw Error(`HTTP ${res.status}: ${url}`);
 if(new URL(res.url).hostname!=='zutomayomart.net')throw Error(`Unexpected redirect: ${res.url}`);
 const h=await res.text();await writeFile(file,h);return h;
}
export function parseList(h,url){
 return [...h.matchAll(/<li class="ogs-v2-top-list-item">([\s\S]*?)<\/a>\s*<\/li>/g)].map(m=>{
  const b=m[1],id=b.match(/product\/detail\/([^"?]+)/)?.[1];
  if(!id)throw Error(`Product ID missing: ${url}`);
  const priceText=clean(b.match(/data-ge-price>([\s\S]*?)<\/p>/)?.[1]);
  return {id,name:clean(b.match(/top-list-text-title">([\s\S]*?)<\/p>/)?.[1]),price:priceText?Number(priceText.replace(/[^0-9]/g,'')):null,priceText,images:unique([...b.matchAll(/src="(https:\/\/assets\.official-goods-store\.jp\/product\/[^"?]+)[^"]*"/g)].map(x=>x[1])),badges:unique([...b.matchAll(/<span[^>]*ogs-label-badge[^>]*>([\s\S]*?)<\/span>/g)].map(x=>clean(x[1]))),labelImages:unique([...b.matchAll(/src="(https:\/\/assets\.official-goods-store\.jp\/label\/[^"?]+)[^"]*"/g)].map(x=>x[1])),url:`${BASE}/v2/product/detail/${id}`,listSource:url};
 });
}
async function crawl(start,key){
 const seen=new Set(),items=new Map(),pages=[];let url=start;
 while(url){
  if(seen.has(url)||pages.length>=150)throw Error(`Pagination loop: ${url}`);seen.add(url);
  const h=await page(url,`${key}-${pages.length+1}`),rows=parseList(h,url);
  if(!rows.length&&pages.length===0)throw Error(`No products: ${url}`);
  pages.push({url,count:rows.length,sha256:createHash('sha256').update(h).digest('hex')});
  rows.forEach(g=>items.set(g.id,g));
  const next=h.match(/<a[^>]*href="([^"]+)"[^>]*rel="next"/);
  url=next?new URL(clean(next[1]),BASE).href:null;
  if(url&&new URL(url).hostname!=='zutomayomart.net')throw Error('Off-site pagination');
 }
 return {items:[...items.values()],pages};
}
async function main(){
 await mkdir(dir,{recursive:true});
 const list=await crawl(`${BASE}/product/list`,'all');
 await writeFile(`${dir}/all-products.json`,JSON.stringify(list.items,null,2)+'\n');
 const h=await readFile(`${dir}/all-1.html`,'utf8');
 const sections=[...new Map([...h.matchAll(/<a\s+[^>]*href="(\/product\/list\?tag_codes=[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>[clean(m[1]),{url:new URL(clean(m[1]),BASE).href,name:clean(m[2]),code:new URL(clean(m[1]),BASE).searchParams.get('tag_codes')}])).values()];
 const products=new Map(list.items.map(g=>[g.id,{...g,sections:[]}])),evidence={checkedAt,listPages:list.pages,sections:[],errors:[]};
 console.log(JSON.stringify({phase:'all-list',pages:list.pages.length,products:products.size,sections:sections.length}));
 for(const section of sections){
  try{const r=await crawl(section.url,section.code);for(const g of r.items){if(!products.has(g.id))products.set(g.id,{...g,sections:[]});products.get(g.id).sections.push(section);}
   evidence.sections.push({...section,pages:r.pages,products:r.items.map(g=>g.id)});
   console.log(JSON.stringify({phase:'section',name:section.name,products:r.items.length,total:products.size}));
  }catch(e){evidence.errors.push({url:section.url,error:e.message});console.log(e.message);}
 }
 await writeFile(`${dir}/list.json`,JSON.stringify({checkedAt,source:`${BASE}/product/list`,products:[...products.values()],evidence},null,2)+'\n');
 console.log(JSON.stringify({phase:'list-complete',products:products.size,errors:evidence.errors.length}));
}
if(process.argv[1]?.endsWith('collect-mart.mjs'))await main();
