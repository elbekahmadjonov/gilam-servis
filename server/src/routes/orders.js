import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { emitOrdersChanged } from '../realtime.js';

const router = Router();
router.use(requireAuth); // barcha buyurtma endpointlari avtorizatsiya talab qiladi

// camelCase (frontend) → snake_case (DB) ustun mapping (yozish uchun)
const COL_MAP = {
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
const JSONB_COLS = new Set(['bosqich', 'tovarlar', 'narxlar', 'tolov']);

// jsonb ustunlar uchun obyektni string qilamiz (node-pg talabi)
function encode(col, val) {
  return JSONB_COLS.has(col) && val != null && typeof val === 'object'
    ? JSON.stringify(val)
    : val;
}

// yuvuvchi (ism, rol) bilan buyurtma tanlash — Supabase select join o'rniga
const LIST_SELECT = `
  SELECT b.*,
    CASE WHEN x.id IS NULL THEN NULL
         ELSE json_build_object('ism', x.ism, 'rol', x.rol) END AS yuvuvchi
  FROM buyurtmalar b
  LEFT JOIN xodimlar x ON x.id = b.yuvuvchi_id
`;

// ── GET /api/orders ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(`${LIST_SELECT} ORDER BY b.id DESC`);
    res.json(rows);
  } catch (err) {
    console.error('[orders/list]', err.message);
    res.status(500).json({ error: 'Buyurtmalarni yuklab bo\'lmadi' });
  }
});

// ── GET /api/orders/:id  (izohlar + harakatlar bilan) ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`${LIST_SELECT} WHERE b.id = $1`, [req.params.id]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    const authorJoin = `
      CASE WHEN x.id IS NULL THEN NULL
           ELSE json_build_object('ism', x.ism, 'rol', x.rol) END AS muallif`;

    const [izohRes, harakatRes] = await Promise.all([
      query(
        `SELECT i.*, ${authorJoin}
         FROM izohlar i LEFT JOIN xodimlar x ON x.id = i.muallif_id
         WHERE i.buyurtma_id = $1 ORDER BY i.vaqt ASC`,
        [req.params.id]
      ),
      query(
        `SELECT h.*, ${authorJoin}
         FROM harakatlar h LEFT JOIN xodimlar x ON x.id = h.muallif_id
         WHERE h.buyurtma_id = $1 ORDER BY h.vaqt ASC`,
        [req.params.id]
      ),
    ]);

    res.json({ ...order, izohlar: izohRes.rows, harakatlar: harakatRes.rows });
  } catch (err) {
    console.error('[orders/get]', err.message);
    res.status(500).json({ error: 'Buyurtmani yuklab bo\'lmadi' });
  }
});

// ── POST /api/orders ──────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const d = req.body || {};
    const bosqich = {
      oldim: false, qabulQildim: false, yuvyapman: false, yakunladi: false,
      qadoqlayapman: false, qadoqlandi: false, olibKetdim: false, yetkazildi: false,
    };
    const tovarlar = { gilamSoni: 0, odealSoni: 0, korpaSoni: 0, korpachaSoni: 0, pardaBor: false };
    const narxlar = {
      gilamlar: [], odeal: { narx: 0 }, korpa: { narx: 0 },
      parda: { kg: 0, narxKg: 0, jami: 0 },
      korpacha: { metr: 0, narxMetr: 0, jami: 0 },
    };
    const tolov = { turi: null, naqd: 0, karta: 0 };

    const { rows } = await query(
      `INSERT INTO buyurtmalar
        (mijoz_ismi, telefon, manzil, izoh, status, bosqich, tovarlar, narxlar,
         umumiy_hisob, chegirma, yakuniy_summa, tolov, qarz, otkaz_sababi, yaratgan_id)
       VALUES ($1,$2,$3,$4,'yangi',$5,$6,$7,0,0,0,$8,0,'',$9)
       RETURNING *`,
      [
        d.mijozIsmi || '', d.telefon || '', d.manzil || '', d.izoh || '',
        JSON.stringify(bosqich), JSON.stringify(tovarlar), JSON.stringify(narxlar),
        JSON.stringify(tolov), req.user.id,
      ]
    );
    const newRow = rows[0];

    // Boshlang'ich harakat (xato bo'lsa e'tiborsiz)
    await query(
      'INSERT INTO harakatlar (buyurtma_id, amal, muallif_id) VALUES ($1, $2, $3)',
      [newRow.id, 'Buyurtma yaratildi', req.user.id]
    ).catch(() => {});

    emitOrdersChanged();
    res.status(201).json(newRow);
  } catch (err) {
    console.error('[orders/create]', err.message);
    res.status(500).json({ error: 'Buyurtma yaratib bo\'lmadi' });
  }
});

// ── PATCH /api/orders/:id ─────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const changes = req.body || {};
    const sets = [];
    const params = [];
    let i = 1;

    for (const [appKey, col] of Object.entries(COL_MAP)) {
      if (appKey in changes) {
        sets.push(`${col} = $${i++}`);
        params.push(encode(col, changes[appKey]));
      }
    }

    // "yuvuvchi" flagi — joriy foydalanuvchini yuvuvchi qilib belgilaydi
    if ('yuvuvchi' in changes) {
      sets.push(`yuvuvchi_id = $${i++}`);
      params.push(req.user.id);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'O\'zgartirish uchun maydon yo\'q' });
    }

    params.push(req.params.id);
    const { rowCount } = await query(
      `UPDATE buyurtmalar SET ${sets.join(', ')} WHERE id = $${i}`,
      params
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    emitOrdersChanged();
    res.json({ ok: true });
  } catch (err) {
    console.error('[orders/update]', err.message);
    res.status(500).json({ error: 'Buyurtmani yangilab bo\'lmadi' });
  }
});

// ── POST /api/orders/:id/izoh ─────────────────────────
router.post('/:id/izoh', async (req, res) => {
  try {
    const { matn } = req.body || {};
    await query(
      'INSERT INTO izohlar (buyurtma_id, matn, muallif_id) VALUES ($1, $2, $3)',
      [req.params.id, matn || '', req.user.id]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[orders/izoh]', err.message);
    res.status(500).json({ error: 'Izoh qo\'shib bo\'lmadi' });
  }
});

// ── POST /api/orders/:id/harakat ──────────────────────
router.post('/:id/harakat', async (req, res) => {
  try {
    const { amal } = req.body || {};
    await query(
      'INSERT INTO harakatlar (buyurtma_id, amal, muallif_id) VALUES ($1, $2, $3)',
      [req.params.id, amal || '', req.user.id]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[orders/harakat]', err.message);
    res.status(500).json({ error: 'Harakat qo\'shib bo\'lmadi' });
  }
});

// ── DELETE /api/orders/:id ────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM buyurtmalar WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    emitOrdersChanged();
    res.json({ ok: true });
  } catch (err) {
    console.error('[orders/delete]', err.message);
    res.status(500).json({ error: 'Buyurtmani o\'chirib bo\'lmadi' });
  }
});

export default router;
