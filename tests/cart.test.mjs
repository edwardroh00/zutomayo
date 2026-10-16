import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateRecord,parseBackup,mergeRecords,summary,priceFor} from '../cart-model.js';
const {goods}=JSON.parse(await readFile(new URL('../data/goods.json',import.meta.url),'utf8'));
const base={id:'test-1',productId:'ZMY798',channel:'pickup',option:'M',quantity:1,unitPrice:16500,status:'planned',orderAt:'',pickupAt:'',receivedAt:'',memo:'',createdAt:'2026-10-03T08:00:00Z'};
test('same product remains distinct by channel, size and order date; cancelled excluded',()=>{
 const rs=['preorder','pickup','popup','venue'].map((channel,i)=>validateRecord({...base,id:`record-${i}`,channel,option:i%2?'L':'M',status:'ordered',orderAt:`2026-10-0${i+1}T12:00`},goods));
 const extra=validateRecord({...base,id:'size-and-date',option:'XL',status:'ordered',orderAt:'2026-10-04T13:00',quantity:2},goods);
 const cancelled=validateRecord({...base,id:'cancelled',quantity:2,status:'cancelled'},goods);
 const merged=mergeRecords(rs,[extra,cancelled]);assert.equal(merged.length,6);assert.equal(summary(merged).pickup.total,49500);assert.equal(summary(merged).preorder.total,16500);assert.equal(summary(merged).pickup.quantity,3);
});
test('backup roundtrip preserves dates, actual paid price, status and memo',()=>{
 const r=validateRecord({...base,status:'received',orderAt:'2026-10-03T20:00',receivedAt:'2026-10-10T10:30',unitPrice:15000,memo:'개인 구매 기록'},goods);
 const backup=JSON.stringify({schema:'nara-cart',version:1,records:[r]});assert.deepEqual(parseBackup(backup,goods),[r]);assert.equal(mergeRecords([r],parseBackup(backup,goods)).length,1);
});
test('rejects unsupported channels, invalid quantities, dates and malformed backups',()=>{
 for(const patch of [{productId:'missing'},{channel:'other'},{quantity:0},{quantity:1.5},{quantity:100},{unitPrice:-1},{status:'ordered'},{status:'received',orderAt:'2026-10-03T20:00'},{orderAt:'2026-02-30T12:00'},{status:'received',orderAt:'2026-10-10T10:00',receivedAt:'2026-10-03T10:00'},{memo:[]},{id:'<script>'}])assert.throws(()=>validateRecord({...base,...patch},goods));
 assert.throws(()=>parseBackup('{bad',goods));assert.throws(()=>parseBackup(JSON.stringify({schema:'nara-cart',version:2,records:[]}),goods));assert.throws(()=>parseBackup(JSON.stringify({schema:'nara-cart',version:1,records:[base,base]}),goods));
});
test('membership album uses channel-specific tax-included prices and one-item limit',()=>{
 const g=goods.find(x=>x.id==='UPCH-29308');assert.equal(priceFor(g,'pickup'),3565);assert.equal(priceFor(g,'venue'),3600);assert.equal(g.premium,true);assert.throws(()=>validateRecord({...base,productId:g.id,quantity:2},goods));
});
test('limited colours exclude venue/pickup; catalogue sources and all prices are complete',()=>{
 assert.equal(new Set(goods.map(g=>g.id)).size,goods.length);assert.equal(goods.length,234);
 for(const g of goods){assert.ok(g.channels.length>0);assert.ok(Number.isInteger(g.price)&&g.price>0);assert.ok(g.sourceUrls.length>0);if(g.limitedColor){assert.ok(!g.channels.includes('venue'));assert.ok(!g.channels.includes('pickup'));}for(const image of g.images)assert.equal(new URL(image).protocol,'https:');}
 for(const id of ['ZMY796','ZMY798'])assert.equal(goods.find(g=>g.id===id).images.length,12);
});
