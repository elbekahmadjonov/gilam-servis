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

// Aniqlangan slug'ni qaytaradi (va yangi topilsa localStorage'ga yozadi).
// Hech narsa topilmasa 'default' — mavjud gilam.qariya.uz (slug'siz) shu tenant.
export function getTenantSlug() {
  const found = (fromUrl() || fromTelegram() || '').trim();
  if (found) {
    localStorage.setItem(KEY, found);
    return found;
  }
  return localStorage.getItem(KEY) || 'default';
}

export function setTenantSlug(slug) {
  if (slug) localStorage.setItem(KEY, slug);
  else localStorage.removeItem(KEY);
}
