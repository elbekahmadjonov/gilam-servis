// templates.js — Narx shablonlari (localStorage)
// Har mahsulot turi uchun narx chiplari ro'yxati saqlanadi

const KEY = 'gilam_price_templates_v2';

function getAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function saveAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Berilgan tur uchun saqlangan narxlar ro'yxatini qaytaradi
 * type: 'gilam' | 'odeal' | 'korpa' | 'parda' | 'korpacha'
 * @returns {number[]}
 */
export function getTemplates(type) {
  const all = getAll();
  return Array.isArray(all[type]) ? all[type] : [];
}

/**
 * Narxni chip sifatida qo'shadi (takroriy bo'lsa qo'shilmaydi)
 */
export function addTemplate(type, narx) {
  const val = parseFloat(narx);
  if (!val || val <= 0) return;
  const all = getAll();
  const arr = Array.isArray(all[type]) ? all[type] : [];
  if (!arr.includes(val)) {
    all[type] = [...arr, val];
    saveAll(all);
  }
}

/**
 * Berilgan narxni chip ro'yxatidan o'chiradi
 */
export function removeTemplate(type, narx) {
  const val = parseFloat(narx);
  const all = getAll();
  const arr = Array.isArray(all[type]) ? all[type] : [];
  all[type] = arr.filter(v => v !== val);
  saveAll(all);
}

// Barcha shablonlarni olish (tashqi foydalanish uchun)
export function getAllTemplates() {
  return getAll();
}
