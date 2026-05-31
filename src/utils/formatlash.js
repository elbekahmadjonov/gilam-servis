// formatlash.js — Vaqt va sana formatlash

export function formatVaqt(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();

  const pad = n => String(n).padStart(2, '0');
  const soat = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (d.toDateString() === now.toDateString()) {
    return `${soat} · Bugun`;
  }

  const yesterday = new Date(now - 86400000);
  if (d.toDateString() === yesterday.toDateString()) {
    return `${soat} · Kecha`;
  }

  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${soat}`;
}

export function formatSana(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatSum(num) {
  if (!num && num !== 0) return '0';
  return Number(num)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
