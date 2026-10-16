import {readFile,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('data/goods.json','utf8'));const charts=[];
for(const g of catalog.goods){let h;try{h=await readFile(`.research/${g.id}.html`,'utf8')}catch{continue}const text=h.replace(/<br\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ');const sizes=[];
 for(const m of text.matchAll(/(?:^|\n)\s*(XXXL|XXL|XL|XS|S|M|L|FREE|F)\s*[：:]\s*([^\n]+)/g)){const values={};for(const [ja,key] of [['着丈','length'],['身丈','length'],['身幅','width'],['肩幅','shoulder'],['袖丈','sleeve'],['裄丈','yuki']]){const hit=m[2].match(new RegExp(ja+'\\s*(\\d+(?:\\.\\d+)?)\\s*cm'));if(hit)values[key]=+hit[1];}if(Object.keys(values).length)sizes.push({size:m[1],measures:values});}
 if(sizes.length)charts.push({productId:g.id,unit:'cm',approximate:true,sourceUrl:g.url,sourceCheckedAt:catalog.updatedAt,extractedAt:'2026-10-14',sizes});
}
await writeFile('data/size-charts.json',JSON.stringify({updatedAt:'2026-10-14',charts},null,2)+'\n');console.log(JSON.stringify({products:charts.length,sizes:charts.reduce((n,c)=>n+c.sizes.length,0)}));
