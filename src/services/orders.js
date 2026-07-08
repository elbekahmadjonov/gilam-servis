import { api } from '../lib/api';

// ── Memory cache — tarmoq pingini yashiradi ───────────
let ordersCache = null;
let lastFetch   = 0;
const CACHE_TTL = 60000; // 60 soniya

export function hasCachedOrders() { return ordersCache !== null; }
export function invalidateCache() { ordersCache = null; lastFetch = 0; }

// ── DB (snake_case) → App (camelCase) ───────────────
function dbToApp(row, izohlar = [], harakatlar = []) {
  return {
    id:               row.id,
    mijozIsmi:        row.mijoz_ismi   || '',
    telefon:          row.telefon      || '',
    manzil:           row.manzil       || '',
    izoh:             row.izoh         || '',
    status:           row.status       || 'yangi',
    bosqich:          row.bosqich      || {},
    tovarlar:         row.tovarlar     || {},
    narxlar:          row.narxlar      || {},
    umumiyHisob:      Number(row.umumiy_hisob)  || 0,
    chegirma:         Number(row.chegirma)       || 0,
    yakuniySumma:     Number(row.yakuniy_summa)  || 0,
    tolov:            row.tolov        || {},
    qarz:             Number(row.qarz)           || 0,
    otkazSababi:      row.otkaz_sababi || '',
    lat:              row.lat  != null ? row.lat  : null,
    lng:              row.lng  != null ? row.lng  : null,
    yuvuvchi:         row.yuvuvchi?.ism
                        || (row.yuvuvchi?.rol ? capitalize(row.yuvuvchi.rol) : null),
    yuvuvchiId:       row.yuvuvchi_id  || null,
    yaratilganVaqt:   row.yaratilgan_vaqt,
    yangilanganVaqt:  row.yangilangan_vaqt,
    izohlar:    izohlar.map(iz => ({
      tur:     'matn',
      matn:    iz.matn || '',
      vaqt:    iz.vaqt,
      muallif: iz.muallif?.ism || iz.muallif?.rol
                 ? (iz.muallif.ism || capitalize(iz.muallif.rol))
                 : "Noma'lum",
    })),
    harakatlar: harakatlar.map(h => ({
      amal:    h.amal,
      vaqt:    h.vaqt,
      muallif: h.muallif?.ism || h.muallif?.rol
                 ? (h.muallif.ism || capitalize(h.muallif.rol))
                 : 'Tizim',
    })),
  };
}

function capitalize(s) {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Ro'yxat (kesh bilan) ─────────────────────────────
export async function getAll() {
  // Kesh yangi bo'lsa — darhol qaytar (0 ms)
  if (ordersCache && Date.now() - lastFetch < CACHE_TTL) {
    return ordersCache;
  }
  try {
    const data = await api.get('/orders');
    ordersCache = (data || []).map(row => dbToApp(row));
    lastFetch   = Date.now();
    return ordersCache;
  } catch (err) {
    console.error('[orders] getAll xato:', err.message);
    return ordersCache || []; // xato bo'lsa eski keshni qaytar
  }
}

// ── Bitta buyurtma (izohlar + harakatlar backend'da qo'shilgan) ──
export async function getById(id) {
  try {
    const res = await api.get(`/orders/${id}`);
    return dbToApp(res, res.izohlar || [], res.harakatlar || []);
  } catch {
    return null;
  }
}

// ── Yaratish ─────────────────────────────────────────
export async function create(data) {
  const newRow = await api.post('/orders', {
    mijozIsmi: data.mijozIsmi || '',
    telefon:   data.telefon   || '',
    manzil:    data.manzil    || '',
    izoh:      data.izoh      || '',
  });
  invalidateCache();
  return dbToApp(newRow);
}

// ── Yangilash ─────────────────────────────────────────
// changes camelCase yuboriladi; backend snake_case'ga o'giradi.
// "yuvuvchi" kaliti bo'lsa — backend joriy foydalanuvchini yuvuvchi qiladi.
export async function update(id, changes) {
  await api.patch(`/orders/${id}`, changes);
  invalidateCache();
}

// ── Izoh qo'shish ─────────────────────────────────────
export async function addIzoh(orderId, matn) {
  await api.post(`/orders/${orderId}/izoh`, { matn });
}

// ── Harakat qo'shish (tarix) ─────────────────────────
export async function addHarakat(orderId, amal) {
  await api.post(`/orders/${orderId}/harakat`, { amal });
}

// ── O'chirish ─────────────────────────────────────────
export async function remove(id) {
  await api.del(`/orders/${id}`);
  invalidateCache();
}

// ── Qidiruv (sinxron) ────────────────────────────────
export function search(query, orders = []) {
  if (!query?.trim()) return orders;
  const q = query.toLowerCase();
  return orders.filter(o =>
    String(o.id).includes(q) ||
    (o.mijozIsmi || '').toLowerCase().includes(q) ||
    (o.telefon   || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
  );
}

// ── Statistika (sinxron) ─────────────────────────────
export function computeStats(orders = [], period = 'kun', specificDate = null) {
  const now    = new Date();
  const tugadi = orders.filter(o => o.status === 'tugadi');

  let filtered = tugadi;
  if (period === 'kun') {
    filtered = tugadi.filter(o =>
      new Date(o.yangilanganVaqt).toDateString() === now.toDateString()
    );
  } else if (period === 'hafta') {
    const weekAgo = new Date(now - 7 * 86400000);
    filtered = tugadi.filter(o => new Date(o.yangilanganVaqt) >= weekAgo);
  } else if (period === 'oy') {
    filtered = tugadi.filter(o => {
      const d = new Date(o.yangilanganVaqt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else if (period === 'sana' && specificDate) {
    const target = new Date(specificDate);
    filtered = tugadi.filter(o => {
      const d = new Date(o.yangilanganVaqt);
      return d.getFullYear() === target.getFullYear() &&
             d.getMonth()    === target.getMonth()    &&
             d.getDate()     === target.getDate();
    });
  }

  const statusCounts = {};
  ['yangi', 'jarayonda', 'qadoqlash', 'dostavka', 'tugadi', 'otkaz'].forEach(s => {
    statusCounts[s] = orders.filter(o => o.status === s).length;
  });

  return {
    statusCounts,
    daromad:      filtered.reduce((s, o) => s + (o.yakuniySumma || 0), 0),
    jamilarQarz:  orders.reduce((s, o) => s + (o.qarz || 0), 0),
    periodTushum: filtered.length,
  };
}

export const getStats = computeStats;

export async function addIzohRasm() {
  console.warn('addIzohRasm: rasm yuklash hali sozlanmagan.');
}
