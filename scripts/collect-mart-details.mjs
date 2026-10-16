import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BASE,checkedAt,clean} from './collect-mart.mjs';

const dir='.research/mart';
const unique=a=>[...new Set(a)];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export function parseDetail(html,g){
 const h=html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');
 const name=clean(h.match(/<h1[^>]*ogs-v2-product-title[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
 if(!name)throw Error('No product title (unavailable or changed markup)');
 const info=h.match(/id="product_detail_info"[^>]*>([\s\S]*?)(?:<div id="ogs-design-component-product-detail"|<\/div>)/)?.[1]||'';
 const text=clean(info).replace(/\n\s+/g,'\n');
 const sub=h.split('product-detail-sub-info')[1]?.split('product-detail-info')[0]||'';
 const subText=clean(sub);
 const priceText=clean(h.match(/class="[^"]*ogs-v2-product-price\s[^\"]*"[^>]*data-ge-price[^>]*>([\s\S]*?)<\/p>/)?.[1]);
 const price=priceText.match(/¥\s*([\d,]+)/);
 const tags=[...h.matchAll(/<a class="ogs-taginput-tagbutton" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(m=>({code:new URL(clean(m[1]),BASE).searchParams.get('tag_codes'),name:clean(m[2]).replace(/^#/,''),url:new URL(clean(m[1]),BASE).href}));
 const sizes=[];
 const sizeText=text.split(/サイズ\s*[（(]約[)）]|【サイズ】|サイズ\s*[：:]/)[1]?.split(/素材|製造国|注文点数|特典|Model|モデル/)[0]?.trim()||'';
 for(const m of sizeText.normalize('NFKC').matchAll(/(?:^|\n)\s*(Short|XXXL|XXL|XL|XS|S|M|L|FREE|F|\d+(?:\.\d+)?cm)\s*[：:]\s*([^\n]+)/g)){
  const measures={};for(const [ja,key] of [['着丈','length'],['身丈','length'],['身幅','width'],['肩幅','shoulder'],['袖丈','sleeve'],['裄丈','yuki']]){const v=m[2].match(new RegExp(ja+'\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:cm|㎝)'));if(v)measures[key]=+v[1];}
  sizes.push({size:m[1],measures});
 }
 const options=unique([...sizes.map(s=>s.size),...[...sub.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)].map(m=>clean(m[1])).filter(s=>s&&!/選択|受取|配送/.test(s))]);
 let status='unknown',evidence=[];
 if(g.badges?.includes('販売期間外')){status='out_of_period';evidence.push('販売期間外');}
 else if(/現在販売しておりません/.test(subText)){status='not_on_sale';evidence.push('現在販売しておりません');}
 else if(/SOLD\s*OUT|売り切れ|在庫切れ/.test(subText)&&!/カートに入れる/.test(subText)){status='sold_out';evidence.push(subText.match(/SOLD\s*OUT|売り切れ|在庫切れ/)[0]);}
 else if(/カートに入れる/.test(subText)){status='order_button_present';evidence.push('カートに入れる');}
 const linkedProductIds=unique([...info.matchAll(/href="(?:https:\/\/zutomayomart\.net)?\/v2\/product\/detail\/([^"?#/]+)/g)].map(x=>x[1])).filter(id=>id!==g.id);
 return {...g,name,subtitle:clean(h.match(/class="ogs-v2-product-caption-meta[^\"]*">([\s\S]*?)<\/p>/)?.[1]),caption:clean(h.match(/class="ogs-v2-product-caption\s[^\"]*">([\s\S]*?)<\/p>/)?.[1]),price:price?Number(price[1].replaceAll(',','')):g.price,currency:'JPY',taxIncluded:/TAX IN/.test(priceText),images:unique([...h.matchAll(/(?:src|href|data-thumb)="(https:\/\/assets\.official-goods-store\.jp\/product\/[^"?]+)[^"]*"/g)].map(x=>x[1]).filter(u=>u.includes('/product/'+g.id+'/'))),tags,options,sizeText,sizes,material:text.split(/(?:^|\n)素材\s*\n/)[1]?.split(/\n\s*\n|製造国|注文点数/)[0]?.trim()||'',manufacturedIn:text.split(/(?:^|\n)製造国\s*\n/)[1]?.split('\n')[0]?.trim()||'',maxQuantity:Number(text.match(/お1人様\s*(\d+)点まで/)?.[1])||null,saleStatus:status,saleStatusEvidence:evidence,linkedProductIds,sourceCheckedAt:checkedAt,detailStatus:'verified',detailSha256:createHash('sha256').update(html).digest('hex')};
}
async function main(){
 await mkdir(dir,{recursive:true});
 const initial=JSON.parse(await readFile(`${dir}/all-products.json`,'utf8'));
 const prior=JSON.parse(await readFile('data/goods.json','utf8')).goods;
 const map=new Map(initial.map(g=>[g.id,g]));
 for(const g of prior)if(/^https:\/\/zutomayomart\.net\/v2\/product\/detail\//.test(g.url)&&g.id===g.url.split('/').at(-1)&&!map.has(g.id))map.set(g.id,{id:g.id,name:g.name,price:g.price,images:g.images,badges:[],url:g.url,listSource:null,discovery:'existing_official_reference'});
 let cursor=0,lastRequest=0;const queue=[...map.values()],results=[],errors=[];
 async function html(g){const file=`${dir}/detail-${g.id}.html`;if(!process.argv.includes('--refresh'))try{return await readFile(file,'utf8');}catch{}
  const wait=Math.max(0,lastRequest+350-Date.now());lastRequest=Date.now()+wait;await delay(wait);
  const res=await fetch(g.url,{signal:AbortSignal.timeout(45000)});if(!res.ok)throw Error(`HTTP ${res.status}`);if(new URL(res.url).hostname!=='zutomayomart.net')throw Error('Unexpected redirect');const h=await res.text();await writeFile(file,h);return h;
 }
 await Promise.all(Array.from({length:2},async()=>{while(cursor<queue.length){const g=queue[cursor++];try{const result=parseDetail(await html(g),g);results.push(result);for(const id of result.linkedProductIds)if(!map.has(id)){if(map.size>=1200)throw Error('Published-link safety limit');const linked={id,url:`${BASE}/v2/product/detail/${id}`,badges:[],discovery:'linked_from_product',discoveredOn:g.url};map.set(id,linked);queue.push(linked);}}catch(e){errors.push({id:g.id,url:g.url,error:e.message});}
  if((results.length+errors.length)%50===0)console.log(JSON.stringify({phase:'details',done:results.length,errors:errors.length,total:queue.length}));
 }}));
 results.sort((a,b)=>a.id.localeCompare(b.id));
 await writeFile(`${dir}/details.json`,JSON.stringify({checkedAt,products:results,errors},null,2)+'\n');
 console.log(JSON.stringify({phase:'details-complete',products:results.length,errors}));
}
if(process.argv[1]?.endsWith('collect-mart-details.mjs'))await main();
