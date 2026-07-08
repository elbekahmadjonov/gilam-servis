// templates.js — Narx shablonlari (endi tenant-scoped backend API).
// Komponentlar sinxron ishlashda davom etishi uchun in-memory kesh ishlatiladi:
//   loadTemplates() bir marta serverdan yuklaydi (kesh),
//   getTemplates(type) keshdan sinxron o'qiydi,
//   add/remove optimistik (kesh darhol yangilanadi) + API'ga yoziladi.

import { api } from '../lib/api';

let cache = {};      // { turi: number[] }
let loaded = false;

// Serverdan barcha shablonlarni yuklaydi (guruhlangan)
export async function loadTemplates() {
  try {
    cache = (await api.get('/templates')) || {};
    loaded = true;
  } catch (err) {
    console.warn('[templates] yuklab bo\'lmadi:', err.message);
  }
  return cache;
}

export function templatesLoaded() {
  return loaded;
}

export function getTemplates(type) {
  return Array.isArray(cache[type]) ? cache[type] : [];
}

export function getAllTemplates() {
  return cache;
}

// Narx qo'shish — optimistik kesh + server
export function addTemplate(type, narx) {
  const val = parseFloat(narx);
  if (!val || val <= 0) return;
  const arr = Array.isArray(cache[type]) ? cache[type] : [];
  if (!arr.includes(val)) {
    cache = { ...cache, [type]: [...arr, val].sort((a, b) => a - b) };
    api.post('/templates', { turi: type, narx: val }).catch((e) =>
      console.warn('[templates] qo\'shish xato:', e.message)
    );
  }
}

// Narx o'chirish — optimistik kesh + server
export function removeTemplate(type, narx) {
  const val = parseFloat(narx);
  const arr = Array.isArray(cache[type]) ? cache[type] : [];
  cache = { ...cache, [type]: arr.filter((v) => v !== val) };
  api.del('/templates', { turi: type, narx: val }).catch(() => {});
}
