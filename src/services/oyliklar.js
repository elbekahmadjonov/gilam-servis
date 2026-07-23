import { api } from '../lib/api';

// Xodimlar ro'yxati (oylik yozish uchun)
export async function getXodimlar() {
  try {
    const rows = await api.get('/oyliklar/xodimlar');
    return (rows || []).map(r => ({ id: r.id, ism: r.ism || '—', rol: r.rol || '' }));
  } catch (err) {
    console.error('[oyliklar] xodimlar:', err.message);
    return [];
  }
}

// Barcha oyliklar
export async function getOyliklar() {
  try {
    const rows = await api.get('/oyliklar');
    return (rows || []).map(r => ({
      id:      r.id,
      xodimId: r.xodim_id,
      ism:     r.xodim_ismi || '—',
      rol:     r.xodim_roli || '',
      oy:      r.oy,                     // 'YYYY-MM'
      summa:   Number(r.summa) || 0,
      izoh:    r.izoh || '',
      vaqt:    r.created_at || null,
    }));
  } catch (err) {
    console.error('[oyliklar] getAll:', err.message);
    return [];
  }
}

// Xodimga TO'LOV QO'SHISH — yangi yozuv yaratadi (eskisini almashtirmaydi)
export async function saveOylik(xodimId, oy, summa, izoh = '') {
  return api.put('/oyliklar', { xodimId, oy, summa, izoh });
}

// Bitta xodimning shu oydagi to'lovlari (yangisidan eskisiga)
export function xodimTolovlari(oyliklar = [], xodimId, oy) {
  return oyliklar
    .filter(o => o.xodimId === xodimId && o.oy === oy)
    .sort((a, b) => new Date(b.vaqt || 0) - new Date(a.vaqt || 0));
}

// Bitta xodimning shu oydagi jami oyligi
export function xodimOyligi(oyliklar = [], xodimId, oy) {
  return xodimTolovlari(oyliklar, xodimId, oy).reduce((s, o) => s + o.summa, 0);
}

// Oy bo'yicha xodimlarga guruhlash — [{ xodimId, ism, rol, summa, soni }]
export function oyBoyichaGuruh(oyliklar = [], oy) {
  const map = new Map();
  oyliklar.filter(o => o.oy === oy).forEach(o => {
    const y = map.get(o.xodimId) || { xodimId: o.xodimId, ism: o.ism, rol: o.rol, summa: 0, soni: 0 };
    y.summa += o.summa;
    y.soni  += 1;
    map.set(o.xodimId, y);
  });
  return [...map.values()].sort((a, b) => a.ism.localeCompare(b.ism));
}

export async function removeOylik(id) {
  return api.del(`/oyliklar/${id}`);
}

// 'YYYY-MM' — berilgan sana (yoki bugun) uchun
export function oyKaliti(d = new Date()) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

// Oy nomi: '2026-07' → 'Iyul 2026'
const OY_NOMLARI = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export function oyNomi(oy) {
  const [y, m] = String(oy).split('-');
  return `${OY_NOMLARI[Number(m) - 1] || oy} ${y}`;
}

// Bir oydagi oyliklar yig'indisi
export function sumOyliklar(oyliklar = [], oy) {
  return oyliklar.filter(o => o.oy === oy).reduce((s, o) => s + (o.summa || 0), 0);
}
