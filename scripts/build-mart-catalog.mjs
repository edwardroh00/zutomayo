import {readFile,writeFile} from 'node:fs/promises';
import {checkedAt} from './collect-mart.mjs';
import {ko} from '../korean.js';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const list=await read('.research/mart/list.json'),details=await read('.research/mart/details.json'),catalog=await read('data/goods.json'),archive=await read('data/goods-archive.json'),charts=await read('data/size-charts.json');
if(list.evidence.errors.length||details.errors.some(e=>list.products.some(g=>g.id===e.id)))throw Error('Resolve listed-product collection errors before rebuilding the catalog.');
const unique=a=>[...new Set(a)];
const productLabels={
 'UPCH-29382':'구사레 · 초회 한정 라이브반','UPCH-29455':'침향학 · 초회 한정 디럭스 블루레이반','UPCH-29456':'침향학 · 초회 한정 라이브 DVD반','UPCH-29480':'허가의 일념을 해마에 맡긴다 · 초회 한정반','UPJH-20030':'사라져 버릴 것 같아요 · 12인치 아날로그 싱글',
 'UPJH-20083-4':'잠잠화 · 아날로그 레코드 재판','UPJH-20085-6':'침향학 · 아날로그 레코드 재판','UPJH-20087-8':'구사레 · 아날로그 레코드 재판','UPXH-29051':'클리닝 라보 · 온레오치도 · 초회 한정 블루레이','UPXH-29067':'사랑의 페가수스 · 러브의 향신룡 · 초회 한정반',
 'ZMY027':'팩토리 PVC 태그','ZMY041-ET':'카라카라부 기념 영상 (ZMY041-ET)','ZMY042-ET':'카라카라부 기념 영상 (ZMY042-ET)','ZMY053':'프리미엄 훈장 (2021년 모델)',
 'ZMY074':'러버 키링 (카세트테이프)','ZMY075':'러버 키링 (게임 카트리지)','ZMY076':'러버 키링 (다마고 게임)','ZMY110':'무라쿠모 모즈 코트','ZMY115':'무라쿠모 인센스 스틱 · 키토와 제작','ZMY138':'진저 스트링스 달력 2023~2024','ZMY154':'삼색 경단 키링','ZMY168':'접이식 사다리','ZMY176':'뮤직비디오 아크릴 키링 (랜덤)','ZMY182':'토성 벽시계','ZMY190':'키토와 인센스 스틱 · 침향학','ZMY195':'매거진 랙','ZMY231':'프리미엄 훈장 (2022~2023년 모델)',
 'ZMY273':'키링 (레코드 플레이어)','ZMY274':'키링 (아날로그 TV)','ZMY285':'생강차·틴 케이스','ZMY286':'사랑의 페가수스 × 사쿠마 드롭스','ZMY301':'스파이시즈 타월','ZMY313':'라이스 더 샤모지','ZMY323':'뮤직비디오 아크릴 키링 2 (랜덤)','ZMY387':'스틸 젓가락','ZMY388':'본격 중화 라멘 그릇','ZMY413':'모스 레가토 향수 50ml · 키토와 제작','ZMY414':'모스 레가토 향수 15ml · 키토와 제작','ZMY428':'프리미엄 훈장 (2023~2024년 모델)','ZMY524':'진저 스트링스 월간 달력 2025.4~2026.3','ZMY528':'뮤직비디오 아크릴 키링 3 (랜덤)','ZMY536':'즈토라오 라면 · 등지방 간장 맛','ZMY537':'즈토라오 라면 12개 세트 · 등지방 간장 맛','ZMY546':'모스 레가토 핸드크림 · 키토와 제작','ZMY607':'프리미엄 훈장 (2024~2025년 모델)','ZMY760':'팝업 퍼레이드 악마 니라짱 · 잔기 (주문 제작)'
};
const labels={
 'ZMT-T-048':'문과전뢰 · 나라 (2026)','ZMT-T-046':'즛토마요 사운즈','ZMT-T-043':'좀비 크랩 라보 (2026)','ZMT-T-041':'코즈믹 도로단고 투어 (2025)',
 'ZMT-T-039':'야키야키 양키 투어 속편 · 명교는 우둔한 듯이 (2025)','ZMT-T-038':'야키야키 양키 투어 2 (2024~2025)','ZMT-T-036':'사랑의 페가수스 · 러브의 향신룡 (2024)',
 'ZMT-T-034':'5 스페셜 팝업 스토어','ZMT-T-031':'카페 · 사랑의 페가수스 (2023~2024)','ZMT-T-029':'5주년 팝업 스토어','ZMT-T-028':'원소 도로단고 투어 (2023)',
 'ZMT-T-015':'테크노푸아 · 무라쿠모의 검 (2023)','ZMT-T-012':'게임 센터 투어 · 테크노푸아 (2022~2023)','ZMT-T-008':'즛토마요 팩토리 (2022)','ZMT-T-007':'카라카라부 투어 (2021)',
 'ZMT-T-044':'컬래버레이션','ztmy-PREMIUM-limited_2026':'프리미엄 회원 굿즈 (2026)',
 'ZMT-T-017':'즛토마요 × 바디송','ZMT-T-018':'에이투지 뮤지엄 × 즛토마요','ZMT-T-032':'스파이시즈','ZMT-T-033':'나나나나 × 즛토마요','ZMT-T-035':'즛토마요 × 마스',
 'ZMT-T-037':'여름 페스티벌 굿즈 (2024)','ZMT-T-042':'오모테 엑스포 · 명교는 우둔한 듯이 (2025)','ZMT-T-047':'여름 페스티벌 굿즈 (2026)'
};
const translations=[
 ['SHAMOJI\'S RING LIGHT','샤모지 링 라이트'],['FIGHT THE SHAMOJI','파이트 더 샤모지'],['Limited Color','한정 색상'],['Long Sleeve','긴팔'],['LONG SLEEVE','긴팔'],['Full-zip','풀집'],['Half-zip','하프집'],['LongTee','긴팔 티셔츠'],['Long Tee','긴팔 티셔츠'],['Tee','티셔츠'],['TEE','티셔츠'],['T-SHIRT','티셔츠'],['T-shirt','티셔츠'],['Sweatshirt','스웨트셔츠'],['Sweat Shirt','스웨트셔츠'],['Hoodie','후디'],['Jacket','재킷'],['Shirts','셔츠'],['Shirt','셔츠'],['Pants','팬츠'],['Sweat','스웨트'],['Knit','니트'],['Sweater','스웨터'],['Polo','폴로'],['Velour','벨루어'],['Nylon','나일론'],['Denim','데님'],['Coach','코치'],['Boa','보아'],['Pullover','풀오버'],['Vest','베스트'],['Cardigan','카디건'],['Blouson','블루종'],['Cropped','크롭'],['Reversible','리버서블'],['Layered','레이어드'],['Henley Neck','헨리넥'],['Pocket','포켓'],['4Pocket','4포켓'],
 ['Shopping Bag','쇼핑백'],['Tote Bag','토트백'],['Shoulder Bag','숄더백'],['Boston Bag','보스턴백'],['Drawstring Bag','복주머니'],['Bag','가방'],['Pouch','파우치'],['Backpack','백팩'],['Cap','캡'],['CAP','캡'],['Hat','모자'],['Socks','양말'],['Sandal','샌들'],['SANDALS','샌들'],['Shoe','신발'],['Scarf','스카프'],['Earmuff','귀마개'],['Necklace','목걸이'],['Bracelet','팔찌'],['Brooch','브로치'],['Ring','반지'],['RING','반지'],['Belt','벨트'],['Tie','타이'],['Keychain','키링'],['KEYCHAIN','키링'],['Carabiner','카라비너'],['Strap','스트랩'],['Charm','참'],['Holder','홀더'],['Case','케이스'],['Sticker','스티커'],['STICKER','스티커'],['Postcard','엽서'],['Poster','포스터'],['POSTER','포스터'],['Towel','타월'],['TOWEL','타월'],['BANDANA','반다나'],['Bandana','반다나'],['Blanket','담요'],['Cushion','쿠션'],['NUI','인형'],['Doll','인형'],['Gacha','가챠'],['GACHA','가챠'],['Mirror','거울'],['Bottle','보틀'],['Mug','머그'],['Glass','유리컵'],['Lantern','랜턴'],['UCHIWA','부채'],['Rug','러그'],['RUG','러그'],['Container','수납함'],['CONTAINER','수납함'],['BOX','상자'],['Box','상자'],['Badge','배지'],['PINS','핀 배지'],['Pin','핀'],['Battery','배터리'],['Mobile','휴대용'],['Truck','트럭'],['Miniature','미니어처'],['Photo','사진'],['PHOTO','사진'],['Set','세트'],['SET','세트'],['BASIC PACK','베이직 팩'],['STARTER','스타터'],['CARD','카드'],
 ['Dark Brown','다크 브라운'],['Vintage Black','빈티지 블랙'],['Light Blue','라이트 블루'],['Off White','오프화이트'],['Black','블랙'],['White','화이트'],['Purple','퍼플'],['Gray','그레이'],['Grey','그레이'],['Green','그린'],['Blue','블루'],['Yellow','옐로'],['Pink','핑크'],['Red','레드'],['Brown','브라운'],['Navy','네이비'],['Ivory','아이보리'],['Beige','베이지'],['Burgundy','버건디'],['Orange','오렌지'],['Silver','실버'],['Gold','골드'],['Yomogi','쑥색'],['Vintage','빈티지'],['Metallic','메탈릭'],['Metal','메탈'],['Wooden','우드'],['Acrylic','아크릴'],['Logo','로고'],['LOGO','로고'],['Thunder','선더'],['THUNDER','선더'],['mini','미니'],['BIG','빅'],['Big','빅'],['Tour','투어'],['STAFF','스태프'],['UNIGURI','우니구리'],['NIRACHAN','니라짱'],['NIRA','니라'],['BUNKADENRAI','분카 덴라이'],['ZUTOMAYO','즛토마요'],['ZTMY','즛토마요']
];
function title(name){let s=name;for(const [from,to] of translations){const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');s=s.replace(new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`,'gi'),to);}return s;}
function category(g){const tags=new Set(g.tags.map(t=>t.code));if(tags.has('ZMT-T-010'))return '음반·영상';if(tags.has('ZMT-T-014'))return '카드';if(tags.has('ZMT-T-019')||tags.has('ZMT-T-023')||tags.has('ZMT-T-020'))return '의류';if(/\bNUI\b|Cushion|Doll|ぬいぐるみ/i.test(g.name))return '인형';if(/Bag|Pouch|Cap|Sandal|Necklace|Brooch|Bracelet|Socks|Earmuff|Hat/i.test(g.name))return '패션·가방';return '소품';}
const prior=new Map(catalog.goods.map(g=>[g.id,g])),listById=new Map(list.products.map(g=>[g.id,g])),detailById=new Map(details.products.map(g=>[g.id,g]));
for(const g of list.products)if(!detailById.has(g.id))throw Error(`No detail: ${g.id}`);
const legacyGuideIds=catalog.legacyGuideIds||catalog.goods.map(g=>g.id);
const collectionByCode=new Map();
for(const d of details.products){
 const old=prior.get(d.id),listed=listById.get(d.id),tags=d.tags;
 const collections=tags.filter(t=>labels[t.code]).map(t=>({id:t.code,name:labels[t.code],original:t.name,url:t.url}));
 for(const c of collections)collectionByCode.set(c.id,c);
 const g=old||{id:d.id,name:d.name,ko:title(d.name),price:d.price,images:d.images,url:d.url,options:d.options,channels:[],limitedColor:d.badges.includes('Limited Color'),premium:tags.some(t=>t.code?.includes('PREMIUM')),category:category(d),collection:collections[0]?.name||ko(d.caption)||'공식몰 기타 굿즈',note:'',maxQuantity:d.maxQuantity||99,sourceUrls:[d.url]};
 if(!legacyGuideIds.includes(g.id))g.ko=productLabels[g.id]||title(d.name);
 g.images=d.images.length?d.images:g.images;g.options=unique([...(g.options||[]),...d.options]);g.sizeText=d.sizeText||g.sizeText;
 g.sourceUrls=unique([...g.sourceUrls,d.url]);g.sourceCheckedAt=checkedAt;g.martCollections=collections;
 g.mart={listed:!!listed,price:d.price,taxIncluded:d.taxIncluded,saleStatus:d.saleStatus,saleStatusEvidence:d.saleStatusEvidence,badges:listed?.badges||d.badges,sourceCheckedAt:checkedAt,tags:tags.map(t=>({code:t.code,name:t.name})),caption:d.caption,detailStatus:d.detailStatus};
 g.translationStatus=g.ko===g.name?'original_retained':'editorial_translation';
 prior.set(g.id,g);
 if(d.sizes.some(s=>Object.keys(s.measures).length)){
  const chart={productId:d.id,unit:'cm',approximate:true,sourceUrl:d.url,sourceCheckedAt:checkedAt,extractedAt:checkedAt,sizes:d.sizes.filter(s=>Object.keys(s.measures).length)};
  const index=charts.charts.findIndex(c=>c.productId===d.id);if(index>=0)charts.charts[index]=chart;else charts.charts.push(chart);
 }
}
for(const a of archive.goods){const c={id:`archive-${a.publishedAt.slice(0,4)}-${a.url.split('/').filter(Boolean).at(-1)}`,name:a.collection,original:a.collectionOriginal,url:a.url};collectionByCode.set(c.id,c);prior.set(a.id,{...a,images:[],channels:[],limitedColor:false,premium:false,maxQuantity:99,sourceUrls:[a.url],sourceCheckedAt:checkedAt,priceKind:'historical',archive:true,note:[a.note,'당시 공식 공지의 기록입니다. 개별 상품 사진은 미확인입니다.'].filter(Boolean).join(' '),martCollections:[c],translationStatus:'editorial_translation'});}
const goods=[...prior.values()],statusCounts=Object.fromEntries(unique(details.products.map(g=>g.saleStatus)).map(s=>[s,details.products.filter(g=>g.saleStatus===s).length]));
const collections=[...collectionByCode.values()].map(c=>({...c,count:goods.filter(g=>g.martCollections?.some(x=>x.id===c.id)).length}));
const coverage={checkedAt,source:'https://zutomayomart.net/product/list',listedProducts:list.products.length,verifiedDetails:details.products.length,listPages:list.evidence.listPages.length,sectionCount:list.evidence.sections.length,archiveProducts:archive.goods.length,previousProducts:legacyGuideIds.length,addedProducts:goods.length-legacyGuideIds.length,statusCounts,collections,archiveGaps:archive.gaps,scope:'공식몰 전체 목록·공개 분류·공개 링크에서 확인한 상품입니다. 2021년 이전 구 공식몰은 일부 링크가 종료되어 공식 뉴스로 확인한 항목만 추가했습니다. 모든 시기의 전체 굿즈 역사를 완성한 목록은 아닙니다.'};
await writeFile('data/goods.json',JSON.stringify({...catalog,updatedAt:checkedAt,legacyGuideIds,coverage,goods},null,2)+'\n');
await writeFile('data/size-charts.json',JSON.stringify({...charts,updatedAt:checkedAt},null,2)+'\n');
await writeFile('project_memory/MART_CATALOG_EVIDENCE.json',JSON.stringify({checkedAt,requestedUrl:'https://zutomayomart.com/',officialShop:'https://zutomayomart.net/',officialEntry:'https://zutomayo.net/',officialRedirect:'https://official-goods-store.jp/zutomayo/',...coverage,listEvidence:list.evidence,detailEvidence:details.products.map(g=>({id:g.id,url:g.url,sha256:g.detailSha256,status:g.detailStatus})),errors:details.errors},null,2)+'\n');
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const columns=['품번','한국어 표시명','원문 상품명','가격(JPY)','가격 기준','투어·컬렉션','분류','옵션','판매 상태','확인일','공식 링크','사진 링크'];
const rows=goods.map(g=>[g.id,g.ko,g.name,g.mart?.price??g.price,g.archive?'당시 공식 공지':g.mart?'공식몰 확인일 가격':'기존 공식 자료',g.martCollections?.map(c=>c.name).join(' | ')||g.collection,g.category,g.options.join(' | '),g.mart?.saleStatus||(g.archive?'historical':'unverified'),g.sourceCheckedAt||'',g.url,g.images.join(' | ')]);
await writeFile('data/goods-catalog.csv','\uFEFF'+[columns,...rows].map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n');
console.log(JSON.stringify({goods:goods.length,coverage,charts:charts.charts.length,untranslatedNew:goods.filter(g=>!legacyGuideIds.includes(g.id)&&g.translationStatus==='original_retained').map(g=>({id:g.id,name:g.name}))},null,2));
