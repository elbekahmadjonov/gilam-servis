import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant, requireRole } from '../auth.js';
import { requireTenantActive, buyurtmaLimitOshdi } from '../tenant.js';
import { emitOrdersChanged } from '../realtime.js';

const router = Router();
// Barcha buyurtma endpointlari: auth + tenant konteksti + tenant faolligi
router.use(requireAuth, requireTenant, requireTenantActive);

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
  ijrochilar:   'ijrochilar',
};
const JSONB_COLS = new Set(['bosqich', 'tovarlar', 'narxlar', 'tolov', 'ijrochilar']);

// jsonb ustunlar uchun obyektni string qilamiz (node-pg talabi)
function encode(col, val) {
  return JSONB_COLS.has(col) && val != null && typeof val === 'object'
    ? JSON.stringify(val)
    : val;
}

// yuvuvchi (ism, rol) bilan buyurtma tanlash
const LIST_SELECT = `
  SELECT b.*,
    CASE WHEN x.id IS NULL THEN NULL
         ELSE json_build_object('ism', x.ism, 'rol', x.rol) END AS yuvuvchi
  FROM buyurtmalar b
  LEFT JOIN xodimlar x ON x.id = b.yuvuvchi_id
`;

// ── GET /api/orders ─────────────── (faqat shu tenant) ──
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `${LIST_SELECT} WHERE b.tenant_id = $1 ORDER BY b.id DESC`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[orders/list]', err.message);
    res.status(500).json({ error: 'Buyurtmalarni yuklab bo\'lmadi' });
  }
});

// ── GET /api/orders/:id  (izohlar + harakatlar bilan) ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `${LIST_SELECT} WHERE b.id = $1 AND b.tenant_id = $2`,
      [req.params.id, req.user.tenant_id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    const authorJoin = `
      CASE WHEN x.id IS NULL THEN NULL
           ELSE json_build_object('ism', x.ism, 'rol', x.rol) END AS muallif`;

    const [izohRes, harakatRes] = await Promise.all([
      query(
        `SELECT i.*, ${authorJoin}
         FROM izohlar i LEFT JOIN xodimlar x ON x.id = i.muallif_id
         WHERE i.buyurtma_id = $1 AND i.tenant_id = $2 ORDER BY i.vaqt ASC`,
        [req.params.id, req.user.tenant_id]
      ),
      query(
        `SELECT h.*, ${authorJoin}
         FROM harakatlar h LEFT JOIN xodimlar x ON x.id = h.muallif_id
         WHERE h.buyurtma_id = $1 AND h.tenant_id = $2 ORDER BY h.vaqt ASC`,
        [req.params.id, req.user.tenant_id]
      ),
    ]);

    res.json({ ...order, izohlar: izohRes.rows, harakatlar: harakatRes.rows });
  } catch (err) {
    console.error('[orders/get]', err.message);
    res.status(500).json({ error: 'Buyurtmani yuklab bo\'lmadi' });
  }
});

// ── POST /api/orders ──────────── (reja limiti tekshiriladi) ──
router.post('/', async (req, res) => {
  try {
    if (await buyurtmaLimitOshdi(req.tenant)) {
      return res.status(403).json({ error: 'limit_reached' });
    }
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
        (tenant_id, mijoz_ismi, telefon, manzil, izoh, status, bosqich, tovarlar, narxlar,
         umumiy_hisob, chegirma, yakuniy_summa, tolov, qarz, otkaz_sababi, yaratgan_id)
       VALUES ($1,$2,$3,$4,$5,'yangi',$6,$7,$8,0,0,0,$9,0,'',$10)
       RETURNING *`,
      [
        req.user.tenant_id,
        d.mijozIsmi || '', d.telefon || '', d.manzil || '', d.izoh || '',
        JSON.stringify(bosqich), JSON.stringify(tovarlar), JSON.stringify(narxlar),
        JSON.stringify(tolov), req.user.id,
      ]
    );
    const newRow = rows[0];

    // Boshlang'ich harakat (xato bo'lsa e'tiborsiz)
    await query(
      'INSERT INTO harakatlar (buyurtma_id, tenant_id, amal, muallif_id) VALUES ($1, $2, $3, $4)',
      [newRow.id, req.user.tenant_id, 'Buyurtma yaratildi', req.user.id]
    ).catch(() => {});

    emitOrdersChanged(req.user.tenant_id);
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

    params.push(req.params.id);          // $i
    params.push(req.user.tenant_id);     // $i+1
    const { rowCount } = await query(
      `UPDATE buyurtmalar SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1}`,
      params
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    emitOrdersChanged(req.user.tenant_id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[orders/update]', err.message);
    res.status(500).json({ error: 'Buyurtmani yangilab bo\'lmadi' });
  }
});

// ── POST /api/orders/:id/izoh ──── (buyurtma tenant'ga tegishli bo'lsa) ──
router.post('/:id/izoh', async (req, res) => {
  try {
    const { matn } = req.body || {};
    const { rowCount } = await query(
      `INSERT INTO izohlar (buyurtma_id, tenant_id, matn, muallif_id)
       SELECT b.id, b.tenant_id, $2, $3 FROM buyurtmalar b
       WHERE b.id = $1 AND b.tenant_id = $4`,
      [req.params.id, matn || '', req.user.id, req.user.tenant_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Buyurtma topilmadi' });
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
    const { rowCount } = await query(
      `INSERT INTO harakatlar (buyurtma_id, tenant_id, amal, muallif_id)
       SELECT b.id, b.tenant_id, $2, $3 FROM buyurtmalar b
       WHERE b.id = $1 AND b.tenant_id = $4`,
      [req.params.id, amal || '', req.user.id, req.user.tenant_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[orders/harakat]', err.message);
    res.status(500).json({ error: 'Harakat qo\'shib bo\'lmadi' });
  }
});

// ── DELETE /api/orders/:id ──────── (faqat Admin) ──────
router.delete('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM buyurtmalar WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    emitOrdersChanged(req.user.tenant_id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[orders/delete]', err.message);
    res.status(500).json({ error: 'Buyurtmani o\'chirib bo\'lmadi' });
  }
});

export default router;
