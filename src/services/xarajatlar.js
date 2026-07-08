import { api } from '../lib/api';

// Barcha kunlik xarajatlar (faqat Owner uchun ruxsat bor)
export async function getXarajatlar() {
  try {
    const rows = await api.get('/xarajatlar');
    return (rows || []).map(r => ({
      sana:   r.sana,
      gaz:    Number(r.gaz)    || 0,
      obed:   Number(r.obed)   || 0,
      ishchi: Number(r.ishchi) || 0,
      boshqa: Number(r.boshqa) || 0,
      izoh:   r.izoh || '',
    }));
  } catch (err) {
    console.error('[xarajatlar] getAll:', err.message);
    return [];
  }
}

// Bitta kunlik xarajatni saqlash (upsert)
export async function saveXarajat(sana, data) {
  return api.put('/xarajatlar', { sana, ...data });
}
