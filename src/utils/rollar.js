// rollar.js — Rol-asosli ruxsatlar

export const ROLLAR = ['Admin', 'Dostavchik', 'Ishchi'];

// Har rol uchun ko'rinadigan tab yo'llari
export const ALLOWED_TABS = {
  Admin:      ['/', '/qarz', '/tarix', '/otkaz', '/mijozlar', '/statistika'],
  Dostavchik: ['/', '/qarz', '/tarix', '/otkaz'],
  Ishchi:     ['/', '/tarix', '/otkaz'],
};

// Har rol uchun faol bo'lgan statuslar (tugmalar ishlaydi)
export const ALLOWED_STATUSES = {
  Admin:      ['yangi', 'jarayonda', 'qadoqlash', 'dostavka'],
  Dostavchik: ['yangi', 'dostavka'],
  Ishchi:     ['jarayonda', 'qadoqlash'],
};

const RUXSATLAR = {
  Admin:      ['create', 'edit', 'delete', 'cancel', 'assign', 'price', 'payment', 'deliver', 'view_all', 'accept', 'wash', 'pack'],
  Dostavchik: ['deliver', 'add_comment', 'accept'],
  Ishchi:     ['wash', 'pack', 'add_comment', 'price'],
};

export function canPerform(role, action) {
  if (!role) return false;
  return (RUXSATLAR[role] || []).includes(action);
}

export function allowedTabs(role) {
  return ALLOWED_TABS[role] || ['/'];
}

export function allowedStatuses(role) {
  return ALLOWED_STATUSES[role] || [];
}

export function canActOnStatus(role, status) {
  return (ALLOWED_STATUSES[role] || []).includes(status);
}
