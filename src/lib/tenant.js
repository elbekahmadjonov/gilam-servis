// Tenant (mijoz) slug'ini aniqlaydi va saqlaydi.
// Manba tartibi: URL ?t=<slug>  →  Telegram start_param  →  localStorage.
// Bot menyu tugmasi "gilam.qariya.uz/?t=<slug>" ni ochadi.

const KEY = 'gilam_tenant';

function fromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('t') || '';
  } catch {
    return '';
  }
}

function fromTelegram() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
  } catch {
    return '';
  }
}

// Botning imzosidan aniqlangan slug — eng ishonchli manba.
// Telegram initData'ni bot tokeni imzolaydi, shuning uchun server qaysi bot
// ochilganini aniq biladi. Bu manzildagi ?t= va xotiradagi eski qiymatdan ustun.
let botdanSlug = null;

export function setResolvedSlug(slug) {
  if (!slug) return;
  botdanSlug = slug;
  try { localStorage.setItem(KEY, slug); } catch { /* skip */ }
}

// APK ichiga tikilgan korxona (build paytida VITE_TENANT_SLUG bilan beriladi).
// Har korxonaga alohida APK yig'ilganda ishlatiladi — u yerda ?t= ham,
// Telegram start_param ham bo'lmaydi.
const TIKILGAN = (import.meta.env?.VITE_TENANT_SLUG || '').trim();

// Aniqlangan slug'ni qaytaradi (va yangi topilsa localStorage'ga yozadi).
// Tartib: bot imzosi → manzil ?t= → Telegram start_param → tikilgan → xotira → 'default'.
export function getTenantSlug() {
  if (botdanSlug) return botdanSlug;
  const found = (fromUrl() || fromTelegram() || '').trim();
  if (found) {
    localStorage.setItem(KEY, found);
    return found;
  }
  // Tikilgan slug xotiradan ustun — APK aynan o'z korxonasiga bog'lanadi
  if (TIKILGAN) return TIKILGAN;
  return localStorage.getItem(KEY) || 'default';
}

export function setTenantSlug(slug) {
  if (slug) localStorage.setItem(KEY, slug);
  else localStorage.removeItem(KEY);
}
