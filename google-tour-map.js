import {TOUR_ID} from './tour-planner.js';
import {ko,bilingual} from './korean.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentVenue='';
export function mountGoogleTourMap(events,profile,filters){
 const host=document.querySelector('#google-tour-map');if(!host)return;
 const plans=profile.tourPlans||[],shown=events.filter(e=>e.groupId===TOUR_ID&&(!filters.tourMonth||e.date.slice(5,7)===filters.tourMonth)&&(!filters.tourCity||e.city===filters.tourCity)&&(!filters.tourChecked||plans.some(p=>p.eventId===e.id))).sort((a,b)=>a.date.localeCompare(b.date));
 const venues=[...new Set(shown.map(e=>e.venue))];
 if(!venues.includes(currentVenue))currentVenue=venues[0]||'';
 if(!currentVenue){host.innerHTML='<div class="empty-wide">선택한 조건의 공연장이 없어요. 필터를 바꾸거나 갈 공연을 체크해 주세요.</div>';return;}
 host.innerHTML=`<div class="map-controls"><select id="google-map-venue" aria-label="구글지도에서 공연장 선택">${venues.map(v=>{const e=shown.find(e=>e.venue===v);return `<option value="${esc(v)}" ${currentVenue===v?'selected':''}>${esc(ko(e.city))} · ${esc(ko(v))}</option>`;}).join('')}</select><span class="muted">${venues.length}개 공연장</span></div><div id="google-place-content"></div>`;
 const show=()=>{
  const shows=shown.filter(e=>e.venue===currentVenue),e=shows[0],query=encodeURIComponent(currentVenue+' '+e.region),placeUrl='https://www.google.com/maps/search/?api=1&query='+query,directions='https://www.google.com/maps/dir/?api=1&destination='+query;
  document.querySelector('#google-place-content').innerHTML=`<div class="google-place-heading"><p class="eyebrow">${bilingual(e.region)}</p><h2>${bilingual(currentVenue)}</h2></div><iframe class="google-venue-frame" title="${esc(ko(currentVenue))} 구글지도" src="https://maps.google.com/maps?q=${query}&z=15&hl=ko&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><div class="google-place-actions"><a class="button dark" href="${placeUrl}" target="_blank" rel="noopener">공연장 사진·리뷰 보기 ↗</a><a class="button outline" href="${directions}" target="_blank" rel="noopener">구글지도 길찾기 ↗</a></div><p class="source-note">구글지도에 등록된 사진에서 객석·무대·내부를 확인할 수 있어요. 제공되는 사진은 공연장마다 다릅니다.</p><div class="google-show-grid">${shows.map(e=>{const p=plans.find(p=>p.eventId===e.id);return `<article class="google-show"><h3>${e.date.replaceAll('-','.')} (${new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date(e.date+'T12:00:00+09:00'))})</h3><p>입장 ${e.open} · 시작 ${e.start}</p><div class="tour-checks"><label><input type="checkbox" data-tour-event="${e.id}" data-tour-field="selected" ${p?'checked':''} aria-label="${e.date} ${esc(ko(e.city))} 갈 공연 체크">갈 공연</label><label><input type="checkbox" data-tour-event="${e.id}" data-tour-field="ticketBooked" ${p?.ticketBooked?'checked':''} aria-label="${e.date} ${esc(ko(e.city))} 티켓 확보">티켓 확보</label></div></article>`;}).join('')}</div>`;
 };
 document.querySelector('#google-map-venue').addEventListener('change',e=>{currentVenue=e.target.value;show();});show();
}
