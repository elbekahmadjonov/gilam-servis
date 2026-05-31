import { supabase } from '../lib/supabaseClient';

// ── Har bir Supabase so'roviga 10s timeout ────────────
const TIMEOUT_MS = 10000;

async function run(query) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error("So'rov vaqti tugadi (10s)")),
      TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([query, timeout]);
  } finally {
    clearTimeout(timerId);
  }
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

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

// ── App (camelCase) → DB (snake_case) ───────────────
function appToDb(changes) {
  const db = {};
  const map = {
    mijozIsmi:    'mijoz_ismi',
    telefon:      'telefon',
    manzil:       'manzil',
    izoh:         'izoh',
    status:       'status',
    bosqich:      'bosqich',
    tovarlar:     'tovarlar',
    narxlar:      'narxlar',
    umumiyHisob:  'umumiy_hisob',
    chegirma:     'chegirma',
    yakuniySumma: 'yakuniy_summa',
    tolov:        'tolov',
    qarz:         'qarz',
    otkazSababi:  'otkaz_sababi',
    lat:          'lat',
    lng:          'lng',
    yuvuvchiId:   'yuvuvchi_id',
  };
  for (const [appKey, dbKey] of Object.entries(map)) {
    if (appKey in changes) db[dbKey] = changes[appKey];
  }
  return db;
}

function capitalize(s) {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const LIST_SELECT = '*, yuvuvchi:xodimlar!yuvuvchi_id(ism, rol)';

// ── Ro'yxat ───────────────────────────────────────────
export async function getAll() {
  console.log('[orders] getAll...');
  const { data, error } = await run(
    supabase.from('buyurtmalar').select(LIST_SELECT).order('id', { ascending: false })
  );
  if (error) {
    console.error('[orders] getAll xato:', error.message);
    return [];
  }
  console.log('[orders] getAll:', data?.length ?? 0, 'ta');
  return (data || []).map(row => dbToApp(row));
}

// ── Bitta buyurtma (izohlar + harakatlar parallel) ───
export async function getById(id) {
  const { data: row, error } = await run(
    supabase.from('buyurtmalar').select(LIST_SELECT).eq('id', id).single()
  );
  if (error) return null;

  // Izohlar va harakatlar parallel yuklanadi
  const [izohRes, harakatRes] = await Promise.all([
    run(
      supabase.from('izohlar')
        .select('*, muallif:xodimlar!muallif_id(ism, rol)')
        .eq('buyurtma_id', id)
        .order('vaqt', { ascending: true })
    ),
    run(
      supabase.from('harakatlar')
        .select('*, muallif:xodimlar!muallif_id(ism, rol)')
        .eq('buyurtma_id', id)
        .order('vaqt', { ascending: true })
    ),
  ]);

  return dbToApp(row, izohRes.data || [], harakatRes.data || []);
}

// ── Yaratish ─────────────────────────────────────────
export async function create(data) {
  const userId = await getCurrentUserId();

  const { data: newRow, error } = await run(
    supabase.from('buyurtmalar').insert({
      mijoz_ismi:    data.mijozIsmi  || '',
      telefon:       data.telefon    || '',
      manzil:        data.manzil     || '',
      izoh:          data.izoh       || '',
      status:        'yangi',
      bosqich:       { oldim: false, qabulQildim: false, yuvyapman: false,
                       yakunladi: false, qadoqlayapman: false, qadoqlandi: false,
                       olibKetdim: false, yetkazildi: false },
      tovarlar:      { gilamSoni: 0, odealSoni: 0, korpaSoni: 0, korpachaSoni: 0, pardaBor: false },
      narxlar:       { gilamlar: [], odeal: { narx: 0 }, korpa: { narx: 0 },
                       parda: { kg: 0, narxKg: 0, jami: 0 },
                       korpacha: { metr: 0, narxMetr: 0, jami: 0 } },
      umumiy_hisob:  0,
      chegirma:      0,
      yakuniy_summa: 0,
      tolov:         { turi: null, naqd: 0, karta: 0 },
      qarz:          0,
      otkaz_sababi:  '',
      yaratgan_id:   userId,
    }).select().single()
  );

  if (error) throw error;

  // Boshlang'ich harakat (xato bo'lsa — e'tiborsiz)
  await run(
    supabase.from('harakatlar').insert({
      buyurtma_id: newRow.id,
      amal:        'Buyurtma yaratildi',
      muallif_id:  userId,
    })
  ).catch(() => {});

  return dbToApp(newRow);
}

// ── Yangilash ─────────────────────────────────────────
export async function update(id, changes) {
  const dbChanges = appToDb(changes);
  dbChanges.yangilangan_vaqt = new Date().toISOString();

  if ('yuvuvchi' in changes) {
    const userId = await getCurrentUserId();
    dbChanges.yuvuvchi_id = userId;
  }

  const { error } = await run(
    supabase.from('buyurtmalar').update(dbChanges).eq('id', id)
  );
  if (error) throw error;
}

// ── Izoh qo'shish ─────────────────────────────────────
export async function addIzoh(orderId, matn) {
  const userId = await getCurrentUserId();
  const { error } = await run(
    supabase.from('izohlar').insert({ buyurtma_id: orderId, matn, muallif_id: userId })
  );
  if (error) throw error;
}

// ── Harakat qo'shish (tarix) ─────────────────────────
export async function addHarakat(orderId, amal) {
  const userId = await getCurrentUserId();
  const { error } = await run(
    supabase.from('harakatlar').insert({ buyurtma_id: orderId, amal, muallif_id: userId })
  );
  if (error) throw error;
}

// ── O'chirish ─────────────────────────────────────────
export async function remove(id) {
  const { error } = await run(
    supabase.from('buyurtmalar').delete().eq('id', id)
  );
  if (error) throw error;
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
  console.warn('addIzohRasm: Storage hali sozlanmagan.');
}
