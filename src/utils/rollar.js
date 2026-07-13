// rollar.js — Rol-asosli ruxsatlar

export const ROLLAR = ['Owner', 'Admin', 'Dostavchik', 'Ishchi'];

// Har rol uchun ko'rinadigan tab yo'llari.
// Owner = Admin bilan bir xil, ustiga faqat unda ko'rinadigan "/hisob".
export const ALLOWED_TABS = {
  Owner:      ['/', '/qarz', '/tarix', '/otkaz', '/mijozlar', '/statistika', '/hisob'],
  Admin:      ['/', '/qarz', '/tarix', '/otkaz', '/mijozlar', '/statistika'],
  Dostavchik: ['/', '/qarz', '/tarix', '/otkaz', '/statistika'],
  Ishchi:     ['/', '/tarix', '/otkaz', '/statistika'],
};

// Har rol uchun faol bo'lgan statuslar (tugmalar ishlaydi)
export const ALLOWED_STATUSES = {
  Owner:      ['yangi', 'jarayonda', 'qadoqlash', 'dostavka'],
  Admin:      ['yangi', 'jarayonda', 'qadoqlash', 'dostavka'],
  Dostavchik: ['yangi', 'dostavka'],
  Ishchi:     ['jarayonda', 'qadoqlash'],
};

const RUXSATLAR = {
  Owner:      ['create', 'edit', 'delete', 'cancel', 'assign', 'price', 'payment', 'deliver', 'view_all', 'accept', 'wash', 'pack', 'hisob'],
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
