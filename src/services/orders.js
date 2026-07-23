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
    raqam:            row.raqam ?? row.id,   // korxonaga xos ko'rsatiladigan raqam
    mijozIsmi:        row.mijoz_ismi   || '',
    telefon:          row.telefon      || '',
    qoshimchaTelefonlar: row.qoshimcha_telefonlar || [],
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
    ijrochilar:       row.ijrochilar   || {},
    tahrirlar:        row.tahrirlar    || [],
    tugatilganVaqt:   row.tugatilgan_vaqt || null,
    yuvilganVaqt:     row.yuvilgan_vaqt   || null,
    yaratilganVaqt:   row.yaratilgan_vaqt,
    yangilanganVaqt:  row.yangilangan_vaqt,
    izohlar:    izohlar.map(iz => {
      const muallif = iz.muallif?.ism || iz.muallif?.rol
        ? (iz.muallif.ism || capitalize(iz.muallif.rol))
        : "Noma'lum";
      return iz.rasm
        ? { tur: 'rasm', rasm: iz.rasm, matn: iz.matn || '', vaqt: iz.vaqt, muallif }
        : { tur: 'matn', matn: iz.matn || '', vaqt: iz.vaqt, muallif };
    }),
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
    qoshimchaTelefonlar: data.qoshimchaTelefonlar || [],
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
  const qRaqam = q.replace(/\s/g, '');
  const telMos = (tel) => (tel || '').replace(/\s/g, '').includes(qRaqam);
  return orders.filter(o =>
    String(o.raqam ?? o.id).includes(q) ||
    (o.mijozIsmi || '').toLowerCase().includes(q) ||
    telMos(o.telefon) ||
    (o.qoshimchaTelefonlar || []).some(telMos)
  );
}

// Berilgan sana davrga (period) kiradimi?
function sanaDavrda(dateVal, period, now, specificDate) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (period === 'kun') {
    return d.toDateString() === now.toDateString();
  } else if (period === 'hafta') {
    return d >= new Date(now - 7 * 86400000);
  } else if (period === 'oy') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } else if (period === 'sana' && specificDate) {
    const t = new Date(specificDate);
    return d.getFullYear() === t.getFullYear() &&
           d.getMonth()    === t.getMonth()    &&
           d.getDate()     === t.getDate();
  } else if (period === 'tanlanganOy' && specificDate) {
    // specificDate — 'YYYY-MM' ko'rinishida (oy tanlagichdan)
    const [y, m] = String(specificDate).split('-').map(Number);
    return d.getFullYear() === y && d.getMonth() === m - 1;
  }
  return true;
}

// Buyurtma tugagan (to'lov qilingan) sana — statistika shu bo'yicha.
// tugatilganVaqt bo'lmasa (eski data) — yangilanganVaqt taxminiy.
function tugaganSana(o) {
  return o.tugatilganVaqt || o.yangilanganVaqt;
}

// Bir buyurtmadagi mahsulot hajmlari (m², metr, dona, kg)
function orderHajmi(o) {
  const n = o.narxlar  || {};
  const t = o.tovarlar || {};
  const gilamM2 = (n.gilamlar || []).reduce((s, g) => s + (Number(g.yuza) || 0), 0);
  const korpachaMetr = (n.korpachalar || []).reduce((s, k) => s + (Number(k.metr) || 0), 0)
    || (Number(n.korpacha?.metr) || 0);
  const pardaKg = (n.pardalar || []).reduce((s, p) => s + (Number(p.kg) || 0), 0)
    || (Number(n.parda?.kg) || 0);
  return {
    gilamM2,
    korpachaMetr,
    pardaKg,
    gilamSoni:  Number(t.gilamSoni)  || (n.gilamlar?.length || 0),
    odealSoni:  Number(t.odealSoni)  || 0,
    korpaSoni:  Number(t.korpaSoni)  || 0,
  };
}

// ── Statistika (sinxron) ─────────────────────────────
export function computeStats(orders = [], period = 'kun', specificDate = null) {
  const now = new Date();

  // Shu davrda TUGAGAN (to'lov qilingan) buyurtmalar — tugatilgan sana bo'yicha.
  // Daromad va hajm shu buyurtmalardan hisoblanadi.
  const tugadiDavr = orders.filter(
    o => o.status === 'tugadi' && sanaDavrda(tugaganSana(o), period, now, specificDate)
  );

  const statusCounts = {};
  ['yangi', 'jarayonda', 'qadoqlash', 'dostavka', 'tugadi', 'otkaz'].forEach(s => {
    statusCounts[s] = orders.filter(o => o.status === s).length;
  });

  // Shu davrda YUVILGAN (pardozda statusiga o'tgan) buyurtmalar — yuvilgan sana bo'yicha
  const yuvilganDavr = orders.filter(
    o => o.yuvilganVaqt && sanaDavrda(o.yuvilganVaqt, period, now, specificDate)
  );

  const yigHajm = (list) => {
    const h = { gilamM2: 0, korpachaMetr: 0, pardaKg: 0, gilamSoni: 0, odealSoni: 0, korpaSoni: 0 };
    list.forEach(o => {
      const x = orderHajmi(o);
      h.gilamM2      += x.gilamM2;
      h.korpachaMetr += x.korpachaMetr;
      h.pardaKg      += x.pardaKg;
      h.gilamSoni    += x.gilamSoni;
      h.odealSoni    += x.odealSoni;
      h.korpaSoni    += x.korpaSoni;
    });
    h.gilamM2      = Math.round(h.gilamM2 * 100) / 100;
    h.korpachaMetr = Math.round(h.korpachaMetr * 100) / 100;
    h.pardaKg      = Math.round(h.pardaKg * 100) / 100;
    return h;
  };

  // Yuvilgan mahsulot hajmi (shu davrda pardozdaga o'tganlar)
  const yuvilganHajm = yigHajm(yuvilganDavr);
  yuvilganHajm.soni = yuvilganDavr.length;

  // Mahsulot hajmlari (shu davrda tugagan buyurtmalar bo'yicha)
  const hajm = { gilamM2: 0, korpachaMetr: 0, pardaKg: 0, gilamSoni: 0, odealSoni: 0, korpaSoni: 0 };
  tugadiDavr.forEach(o => {
    const h = orderHajmi(o);
    hajm.gilamM2      += h.gilamM2;
    hajm.korpachaMetr += h.korpachaMetr;
    hajm.pardaKg      += h.pardaKg;
    hajm.gilamSoni    += h.gilamSoni;
    hajm.odealSoni    += h.odealSoni;
    hajm.korpaSoni    += h.korpaSoni;
  });
  hajm.gilamM2      = Math.round(hajm.gilamM2 * 100) / 100;
  hajm.korpachaMetr = Math.round(hajm.korpachaMetr * 100) / 100;
  hajm.pardaKg      = Math.round(hajm.pardaKg * 100) / 100;

  hajm.soni = tugadiDavr.length;

  // Kutilayotgan daromad — AYNI PAYTDAGI holat (davrga bog'liq emas).
  // Hali tugamagan, lekin narxlangan buyurtmalar: pardozda va dostavka.
  const kutilgan = (status) => {
    const list = orders.filter(o => o.status === status);
    return {
      soni:  list.length,
      summa: list.reduce((s, o) => s + (o.yakuniySumma || o.umumiyHisob || 0), 0),
    };
  };
  const pardozda = kutilgan('qadoqlash');
  const dostavka = kutilgan('dostavka');
  const kutilayotgan = {
    pardozda,
    dostavka,
    jamiSumma: pardozda.summa + dostavka.summa,
    jamiSoni:  pardozda.soni  + dostavka.soni,
  };

  return {
    statusCounts,
    daromad:      tugadiDavr.reduce((s, o) => s + (o.yakuniySumma || 0), 0),
    jamilarQarz:  orders.reduce((s, o) => s + (o.qarz || 0), 0),
    periodTushum: tugadiDavr.length,
    hajm,          // tugallangan buyurtmalar hajmi
    yuvilganHajm,  // yuvilgan (pardozdaga o'tgan) buyurtmalar hajmi
    kutilayotgan,  // ayni paytda pardozda + dostavkada turgan summa
  };
}

// Xarajatlarni davr bo'yicha yig'ish (Statistika/Hisob uchun)
export function sumXarajatlar(xarajatlar = [], period = 'kun', specificDate = null) {
  const now = new Date();
  const inDavr = (sana) => {
    const d = new Date(sana + 'T00:00:00');
    if (period === 'kun')   return d.toDateString() === now.toDateString();
    if (period === 'hafta') return d >= new Date(now - 7 * 86400000);
    if (period === 'oy')    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'sana' && specificDate) {
      const t = new Date(specificDate);
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }
    if (period === 'tanlanganOy' && specificDate) {
      const [y, m] = String(specificDate).split('-').map(Number);
      return d.getFullYear() === y && d.getMonth() === m - 1;
    }
    return true;
  };
  const acc = { gaz: 0, svet: 0, obed: 0, ishchi: 0, boshqa: 0 };
  xarajatlar.filter(x => inDavr(x.sana)).forEach(x => {
    acc.gaz    += Number(x.gaz)    || 0;
    acc.svet   += Number(x.svet)   || 0;
    acc.obed   += Number(x.obed)   || 0;
    acc.ishchi += Number(x.ishchi) || 0;
    acc.boshqa += Number(x.boshqa) || 0;
  });
  acc.jami = acc.gaz + acc.svet + acc.obed + acc.ishchi + acc.boshqa;
  return acc;
}

export const getStats = computeStats;

// Rasmli izoh qo'shish — base64 data URL serverga saqlanadi
export async function addIzohRasm(orderId, base64, _role, source) {
  const matn = source === 'kamera' ? '📷 Kamera' : source === 'galereya' ? '🖼 Galereya' : '';
  await api.post(`/orders/${orderId}/izoh`, { rasm: base64, matn });
  invalidateCache();
}
