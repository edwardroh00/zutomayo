import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDetail} from '../scripts/collect-mart-details.mjs';
import {emptyProfile,validateProfile,exportBackup,parseBackup} from '../fan-model.js';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const catalog=await read('../data/goods.json'),evidence=await read('../project_memory/MART_CATALOG_EVIDENCE.json'),sizes=await read('../data/size-charts.json');

test('all paginated official products are included exactly once with verified detail provenance',()=>{
 const ids=new Set(catalog.goods.map(g=>g.id));assert.equal(ids.size,catalog.goods.length);
 const listed=new Set(evidence.listEvidence.sections.flatMap(s=>s.products));
 assert.equal(catalog.coverage.listedProducts,898);assert.equal(catalog.coverage.listPages,75);
 assert.equal(listed.size,898);assert.equal(evidence.detailEvidence.length,898);
 for(const d of evidence.detailEvidence){assert(ids.has(d.id));assert.equal(d.status,'verified');assert.match(d.sha256,/^[a-f\d]{64}$/);const g=catalog.goods.find(g=>g.id===d.id);assert.equal(g.mart.detailStatus,'verified');assert(g.sourceUrls.includes(d.url));assert.equal(g.sourceCheckedAt,'2026-10-17');}
 for(const id of catalog.legacyGuideIds)assert(ids.has(id));assert.equal(catalog.legacyGuideIds.length,234);
 assert.equal(catalog.coverage.archiveProducts,10);assert.equal(catalog.coverage.addedProducts,679);
 const kkb=catalog.coverage.collections.find(c=>c.id==='ZMT-T-007');assert.equal(kkb.count,21);
 for(const c of catalog.coverage.collections)assert.equal(c.count,catalog.goods.filter(g=>g.martCollections?.some(x=>x.id===c.id)).length);
 for(const g of catalog.goods){assert(Array.isArray(g.options));assert(Array.isArray(g.images));for(const u of g.images)assert.match(u,/^https:\/\//);if(!catalog.legacyGuideIds.includes(g.id))assert.deepEqual(g.channels,[]);}
});

test('sale state comes from product purchase controls, not generic sold-out explanations or ready-to-ship tags',()=>{
 const html='<h1 class="ogs-v2-product-title">Test Tee</h1><div class="product-detail-sub-info">SOLD OUT</div><div class="product-detail-info"><div id="product_detail_info">カートに入れる の使い方<br>サイズ(約)<br>Ｌ：着丈：７０cm × 身幅 ６０cm<br>素材<br>綿<br><div id="ogs-design-component-product-detail"></div></div>';
 const d=parseDetail(html,{id:'TEST',badges:[],url:'https://zutomayomart.net/v2/product/detail/TEST'});
 assert.equal(d.saleStatus,'sold_out');assert.deepEqual(d.sizes,[{size:'L',measures:{length:70,width:60}}]);
 assert.equal(parseDetail(html,{id:'TEST',badges:['販売期間外']}).saleStatus,'out_of_period');
 const actual=catalog.goods.find(g=>g.id==='ZMY002');assert.equal(actual.mart.saleStatus,'sold_out');assert(actual.mart.tags.some(t=>t.code==='ZMT-T-002'));
 const coat=sizes.charts.find(c=>c.productId==='ZMY110');assert.equal(coat.sizes.find(s=>s.size==='L').measures.length,100);
});

test('historical unknown prices stay unknown and old/new collection records survive backup validation',async()=>{
 const songs=(await read('../data/songs.json')).songs,events=(await read('../data/lives.json')).events;
 assert.equal(catalog.goods.find(g=>g.id==='ARCHIVE-2020-UNIGURI-BLACK').price,null);
 const profile=emptyProfile();profile.collection=[{id:'old-owned',productId:'ZMY798',name:'기존 재킷',state:'owned',quantity:1,size:'L',color:'퍼플',fit:'편함',acquiredAt:'2026-10-10',memo:'기존 기록',measures:{}},{id:'historic-owned',productId:'ARCHIVE-2019-HISO-TOWEL',name:'옛 타월',state:'owned',quantity:1,size:'',color:'',fit:'',acquiredAt:'',memo:'추억',measures:{}}];
 const valid=validateProfile(profile,songs,events,catalog.goods);
 assert.deepEqual(parseBackup(JSON.stringify(exportBackup(valid)),songs,events,catalog.goods),valid);
});
