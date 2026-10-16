"use strict";

const guide = {
  selectedDay: 10,
  eventYear: 2026,
  storageKey: "nara-field-guide-checklist-v1",
};
const dayButtons = document.querySelectorAll("[data-day]");
dayButtons.forEach((button) => {
  button.addEventListener("click", () => {
    guide.selectedDay = Number(button.dataset.day);
    dayButtons.forEach((tab) => {
      const active = Number(tab.dataset.day) === guide.selectedDay;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    document.querySelector("#selected-date").textContent = `10.${guide.selectedDay}`;
    document.querySelector("#day-label").textContent = guide.selectedDay === 10 ? "DAY 01 · SATURDAY" : "DAY 02 · SUNDAY";
  });
});

function updateCountdown() {
  const starts = ["2026-10-10T17:30:00+09:00", "2026-10-11T17:30:00+09:00"];
  const now = Date.now();
  const next = starts.map((date) => new Date(date).getTime()).find((time) => time > now);
  const countdown = document.querySelector("#countdown");
  if (!next) {
    countdown.textContent = "공연일 경과";
    return;
  }
  const minutes = Math.floor((next - now) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  countdown.textContent = days > 0 ? `D−${days} · ${hours}H` : `${hours}H ${minutes % 60}M`;
}
updateCountdown();
setInterval(updateCountdown, 60000);

const items = [...document.querySelectorAll("[data-item]")];
let savedItems = {};
try {
  const saved = JSON.parse(localStorage.getItem(guide.storageKey) || "{}");
  if (saved && typeof saved === "object" && !Array.isArray(saved)) savedItems = saved;
} catch {
  document.querySelector("#storage-note").hidden = false;
}
function updateProgress() {
  document.querySelector("#checklist-progress").textContent = `${items.filter((item) => item.checked).length} / ${items.length}`;
}
items.forEach((item) => {
  item.checked = savedItems[item.dataset.item] === true;
  item.addEventListener("change", () => {
    updateProgress();
    const state = Object.fromEntries(items.map((checkbox) => [checkbox.dataset.item, checkbox.checked]));
    try {
      localStorage.setItem(guide.storageKey, JSON.stringify(state));
    } catch {
      document.querySelector("#storage-note").hidden = false;
    }
  });
});
updateProgress();

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}

document.querySelector("#calendar-button").addEventListener("click", () => {
  const day = guide.selectedDay;
  const date = `${guide.eventYear}10${day}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // Two point events preserve the published times without inventing an end time.
  const event = (kind, time, summary) => [
    "BEGIN:VEVENT",
    `UID:nara-${date}-${kind}@nara-field-guide.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${date}T${time}Z`,
    `SUMMARY:${summary}`,
    "LOCATION:平城宮跡歴史公園 中央区朝堂院 特設野外会場",
    "DESCRIPTION:일본·한국 시간 기준. 최신 운영 정보는 공식 공지 확인.",
    "URL:https://zutomayo.net/bunka-denrai/",
    "END:VEVENT",
  ];
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nara Field Guide//KO", "CALSCALE:GREGORIAN",
    ...event("open", "063000", "즛토마요 文禍伝雷 · 입장 15:30"),
    ...event("start", "083000", "즛토마요 文禍伝雷 · 개연 17:30"), "END:VCALENDAR", ""];
  // RFC 5545 requires content lines to be folded at 75 UTF-8 octets.
  const encoder = new TextEncoder();
  const fold = (line) => {
    let output = "", length = 0;
    for (const character of line) {
      const bytes = encoder.encode(character).length;
      if (length + bytes > 75) { output += "\r\n "; length = 1; }
      output += character;
      length += bytes;
    }
    return output;
  };
  const blob = new Blob([lines.map(fold).join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zutomayo-nara-2026-10-${day}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast(`10월 ${day}일 일정 파일을 저장했습니다. 캘린더에서 열어 주세요.`);
});
