export const CHANNELS = {preorder:'온라인 선행주문·배송',pickup:'방문수령',popup:'팝업 구매',venue:'현장구매'};
export const STATUSES = {planned:'구매 예정',ordered:'주문·결제 완료',received:'수령 완료',cancelled:'취소'};
export const STORAGE_KEY='nara-field-guide-cart-v1';
export function priceFor(g,channel){return g.channelPrices?.[channel]??g.price;}
function validDate(value){if(value==='')return true;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;const d=new Date(`${value}:00+09:00`);if(!Number.isFinite(+d))return false;return new Date(+d+9*3600000).toISOString().slice(0,16)===value;}
export function validateRecord(input,catalog){
 if(!input||typeof input!=='object')throw Error('기록 형식이 올바르지 않습니다.');
 const g=catalog.find(x=>x.id===input.productId);if(!g)throw Error('현재 도감에 없는 상품이 포함되어 있습니다.');
 if(!g.channels.includes(input.channel))throw Error('이 상품에서 확인되지 않은 구매 경로입니다.');
 if(!Object.hasOwn(STATUSES,input.status))throw Error('기록 상태가 올바르지 않습니다.');
 if(!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>Math.min(99,g.maxQuantity||99))throw Error(`수량은 1–${Math.min(99,g.maxQuantity||99)}개로 입력하세요.`);
 if(!Number.isInteger(input.unitPrice)||input.unitPrice<0||input.unitPrice>10000000)throw Error('단가는 0–10,000,000엔 정수로 입력하세요.');
 if(typeof input.option!=='string'||input.option.length>80||typeof input.memo!=='string'||input.memo.length>300)throw Error('옵션이나 메모가 너무 길거나 형식이 다릅니다.');
 for(const key of ['orderAt','pickupAt','receivedAt'])if(!validDate(input[key]))throw Error('날짜와 시간을 확인하세요.');
 if(['ordered','received'].includes(input.status)&&!input.orderAt)throw Error('주문·구매 일시를 입력하세요.');
 if(input.status==='received'&&!input.receivedAt)throw Error('실제 수령 일시를 입력하세요.');
 if(input.orderAt&&input.receivedAt&&input.receivedAt<input.orderAt)throw Error('실제 수령 일시는 주문 일시 이후여야 합니다.');
 if(typeof input.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(input.id))throw Error('기록 ID 형식이 올바르지 않습니다.');
 if(typeof input.createdAt!=='string'||!Number.isFinite(Date.parse(input.createdAt)))throw Error('기록 생성 일시를 확인하세요.');
 return {id:input.id,productId:g.id,channel:input.channel,option:input.option,quantity:input.quantity,unitPrice:input.unitPrice,status:input.status,orderAt:input.orderAt,pickupAt:input.pickupAt,receivedAt:input.receivedAt,memo:input.memo,createdAt:input.createdAt};
}
export function parseBackup(raw,catalog){const data=JSON.parse(raw);if(data?.schema!=='nara-cart'||data?.version!==1||!Array.isArray(data.records)||data.records.length>2000)throw Error('이 가이드의 v1 백업 파일을 선택하세요.');const records=data.records.map(x=>validateRecord(x,catalog));if(new Set(records.map(x=>x.id)).size!==records.length)throw Error('백업에 중복 기록 ID가 있습니다.');return records;}
export function mergeRecords(existing,incoming){const seen=new Set(existing.map(x=>x.id));return [...existing,...incoming.filter(x=>!seen.has(x.id))];}
export function summary(records){return Object.fromEntries(Object.keys(CHANNELS).map(c=>{const active=records.filter(x=>x.channel===c&&x.status!=='cancelled');return [c,{lines:active.length,quantity:active.reduce((s,r)=>s+r.quantity,0),total:active.reduce((s,r)=>s+r.quantity*r.unitPrice,0),ordered:active.filter(r=>r.status==='ordered').length,received:active.filter(r=>r.status==='received').length}];}));}
