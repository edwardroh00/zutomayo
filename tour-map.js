import {ko,bilingual} from './korean.js';
import {TOUR_ID} from './tour-planner.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map=null,remembered=null,selectedVenue=null,signature='',markers=new Map();
export function disposeTourMap(){if(map){remembered={center:map.getCenter(),zoom:map.getZoom()};map.remove();map=null;}markers.clear();}
export function mountTourMap(events,profile,filters,venues){
 const host=document.querySelector('#tour-map');if(!host)return;
 const status=document.querySelector('#tour-map-status');
 if(!globalThis.L){status.textContent='지도를 불러오지 못했어요. 목록에서 일정을 확인할 수 있습니다.';return;}
 const all=events.filter(e=>e.groupId===TOUR_ID).sort((a,b)=>a.date.localeCompare(b.date)),plans=profile.tourPlans||[];
 const shown=all.filter(e=>(!filters.tourMonth||e.date.slice(5,7)===filters.tourMonth)&&(!filters.tourCity||e.city===filters.tourCity)&&(!filters.tourChecked||plans.some(p=>p.eventId===e.id)));
 const groups=[...new Map(shown.map(e=>[e.venue,shown.filter(x=>x.venue===e.venue)])).entries()];
 const located=groups.map(([name,shows])=>({location:venues.find(v=>v.venue===name),shows})).filter(v=>v.location);
 const nextSignature=[filters.tourMonth,filters.tourCity,filters.tourChecked].join('|'),sameFilters=signature===nextSignature;signature=nextSignature;
 map=L.map(host,{scrollWheelZoom:false}).setView([37,137],5);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
 let failures=0;tiles.on('tileerror',()=>{if(++failures>2)status.textContent='배경 지도를 불러오지 못했어요. 핀과 공연 일정은 계속 확인할 수 있습니다.';});
 status.textContent=`${located.length}개 공연장 · ${shown.length}회 공연 / 핀을 누르면 일정이 열립니다.`;
 for(const {location:v,shows} of located){
  const number=[...new Set(all.map(e=>e.venue))].indexOf(v.venue)+1,booked=shows.some(e=>plans.some(p=>p.eventId===e.id&&p.ticketBooked)),chosen=shows.some(e=>plans.some(p=>p.eventId===e.id));
  const icon=L.divIcon({className:'tour-map-pin '+(booked?'booked':chosen?'chosen':'unselected'),html:`<span><b>${number}</b></span>`,iconSize:[32,38],iconAnchor:[16,38],popupAnchor:[0,-34]});
  const marker=L.marker([v.lat,v.lng],{icon,title:ko(v.city)+' · '+ko(v.venue),alt:v.city+' 공연장 위치',keyboard:true}).addTo(map);
  marker.bindPopup(`<div class="tour-map-popup"><p class="eyebrow">${esc(ko(v.city))} · ${bilingual(v.region)}</p><h3 lang="ja">${bilingual(v.venue)}</h3>${shows.map(e=>{const p=plans.find(p=>p.eventId===e.id);return `<div class="map-show"><b>${e.date.replaceAll('-','.')} (${new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date(e.date+'T12:00:00+09:00'))})</b><p>입장 ${e.open} · 시작 ${e.start}</p><div class="tour-checks"><label><input type="checkbox" data-tour-event="${e.id}" data-tour-field="selected" ${p?'checked':''} aria-label="${e.date} ${esc(e.city)} 갈 공연 체크">갈 공연</label><label><input type="checkbox" data-tour-event="${e.id}" data-tour-field="ticketBooked" ${p?.ticketBooked?'checked':''} aria-label="${e.date} ${esc(e.city)} 티켓 확보">티켓 확보</label></div></div>`;}).join('')}<a class="map-external" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.venue+' '+v.region)}" target="_blank" rel="noopener">구글지도에서 사진·리뷰 보기 ↗</a><a class="map-source" href="${esc(v.source)}" target="_blank" rel="noopener">위치 출처 ↗</a></div>`,{maxWidth:310,minWidth:230});
  marker.on('popupopen',()=>{selectedVenue=v.venue;const select=document.querySelector('#map-venue');if(select)select.value=v.venue;});
  markers.set(v.venue,marker);
 }
 const fit=()=>{if(located.length)map.fitBounds(L.latLngBounds(located.map(v=>[v.location.lat,v.location.lng])),{padding:[35,35],maxZoom:13});};
 if(sameFilters&&remembered)map.setView(remembered.center,remembered.zoom);else fit();
 const select=document.querySelector('#map-venue');select.innerHTML='<option value="">핀으로 이동할 공연장 선택</option>'+located.map(({location:v})=>`<option value="${esc(v.venue)}">${esc(ko(v.city))} · ${esc(ko(v.venue))}</option>`).join('');
 select.addEventListener('change',()=>{const marker=markers.get(select.value);if(marker){map.setView(marker.getLatLng(),13);marker.openPopup();}});
 document.querySelector('#map-fit').addEventListener('click',()=>{map.closePopup();selectedVenue=null;select.value='';fit();});
 if(sameFilters&&selectedVenue&&markers.has(selectedVenue)){markers.get(selectedVenue).openPopup();select.value=selectedVenue;}
}
