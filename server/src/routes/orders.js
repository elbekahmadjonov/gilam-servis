import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireTenant, requireRole } from '../auth.js';
import { requireTenantActive, buyurtmaLimitOshdi } from '../tenant.js';
import { emitOrdersChanged } from '../realtime.js';
import { notifyOrderStatus } from '../notify.js';
import { normalizeBuyurtmaTel } from '../telefon.js';

const router = Router();
// Barcha buyurtma endpointlari: auth + tenant konteksti + tenant faolligi
router.use(requireAuth, requireTenant, requireTenantActive);

// camelCase (frontend) → snake_case (DB) ustun mapping (yozish uchun)
const COL_MAP = {
  mijozIsmi:    'mijoz_ismi',
  telefon:      'telefon',
  qoshimchaTelefonlar: 'qoshimcha_telefonlar',
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
  tahrirlar:    'tahrirlar',
};
const JSONB_COLS = new Set([
  'bosqich', 'tovarlar', 'narxlar', 'tolov', 'ijrochilar', 'tahrirlar', 'qoshimcha_telefonlar',
]);

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

    // Telefonlar bir xil ko'rinishga keltiriladi: +998912345678
    // (bitta maydonda bir nechta nomer bo'lsa — qolganlari qo'shimchaga o'tadi)
    const { telefon, qoshimchaTelefonlar: qoshimchaTel } =
      normalizeBuyurtmaTel(d.telefon, d.qoshimchaTelefonlar);

    // Korxonaga xos raqam beriladi (har korxona o'z hisobini yuritadi).
    // Bir vaqtda ikkita buyurtma kelsa bir xil raqam olmasligi uchun —
    // tranzaksiya ichida shu tenantga maslahat qulfi (advisory lock) qo'yamiz.
    const client = await pool.connect();
    let newRow;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `buyurtma_raqam:${req.user.tenant_id}`,
      ]);
      const { rows } = await client.query(
        `INSERT INTO buyurtmalar
          (tenant_id, mijoz_ismi, telefon, qoshimcha_telefonlar, manzil, izoh, status, bosqich,
           tovarlar, narxlar, umumiy_hisob, chegirma, yakuniy_summa, tolov, qarz, otkaz_sababi,
           yaratgan_id, raqam)
         VALUES ($1,$2,$3,$4,$5,$6,'yangi',$7,$8,$9,0,0,0,$10,0,'',$11,
                 COALESCE((SELECT MAX(raqam) FROM buyurtmalar WHERE tenant_id = $1), 0) + 1)
         RETURNING *`,
        [
          req.user.tenant_id,
          d.mijozIsmi || '', telefon, JSON.stringify(qoshimchaTel),
          d.manzil || '', d.izoh || '',
          JSON.stringify(bosqich), JSON.stringify(tovarlar), JSON.stringify(narxlar),
          JSON.stringify(tolov), req.user.id,
        ]
      );
      await client.query('COMMIT');
      newRow = rows[0];
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }

    // Boshlang'ich harakat (xato bo'lsa e'tiborsiz)
    await query(
      'INSERT INTO harakatlar (buyurtma_id, tenant_id, amal, muallif_id) VALUES ($1, $2, $3, $4)',
      [newRow.id, req.user.tenant_id, 'Buyurtma yaratildi', req.user.id]
    ).catch(() => {});

    emitOrdersChanged(req.user.tenant_id);
    // Yangi buyurtma → zayavka bildirishnomasi (Owner + Dostavchik)
    notifyOrderStatus(req.user.tenant_id, newRow.id, 'yangi').catch(() => {});
    res.status(201).json(newRow);
  } catch (err) {
    console.error('[orders/create]', err.message);
    res.status(500).json({ error: 'Buyurtma yaratib bo\'lmadi' });
  }
});

// ── PATCH /api/orders/:id ─────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const changes = { ...(req.body || {}) };

    // Telefon tahrirlansa — bir xil ko'rinishga keltiramiz (+998912345678)
    if ('telefon' in changes || 'qoshimchaTelefonlar' in changes) {
      const norm = normalizeBuyurtmaTel(changes.telefon, changes.qoshimchaTelefonlar);
      if ('telefon' in changes) changes.telefon = norm.telefon;
      // Asosiy maydonga bir nechta nomer yozilgan bo'lsa — qolganlari yo'qolmasin
      if ('qoshimchaTelefonlar' in changes || norm.qoshimchaTelefonlar.length) {
        changes.qoshimchaTelefonlar = norm.qoshimchaTelefonlar;
      }
    }

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

    // Buyurtma "tugadi"ga o'tsa — tugatilgan vaqtni birinchi marta yozamiz
    // (COALESCE — allaqachon yozilgan bo'lsa o'zgarmaydi)
    if (changes.status === 'tugadi') {
      sets.push('tugatilgan_vaqt = COALESCE(tugatilgan_vaqt, now())');
    }
    // "qadoqlash" (pardozda)ga o'tsa — yuvilgan vaqtni birinchi marta yozamiz
    if (changes.status === 'qadoqlash') {
      sets.push('yuvilgan_vaqt = COALESCE(yuvilgan_vaqt, now())');
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
    // Status o'zgargan bo'lsa — rol-asosli bildirishnoma
    if ('status' in changes) {
      notifyOrderStatus(req.user.tenant_id, req.params.id, changes.status).catch(() => {});
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[orders/update]', err.message);
    res.status(500).json({ error: 'Buyurtmani yangilab bo\'lmadi' });
  }
});

// ── POST /api/orders/:id/izoh ──── (matn va/yoki rasm) ──
router.post('/:id/izoh', async (req, res) => {
  try {
    const { matn, rasm } = req.body || {};
    if (!matn && !rasm) {
      return res.status(400).json({ error: 'Matn yoki rasm talab qilinadi' });
    }
    const { rowCount } = await query(
      `INSERT INTO izohlar (buyurtma_id, tenant_id, matn, rasm, muallif_id)
       SELECT b.id, b.tenant_id, $2, $3, $4 FROM buyurtmalar b
       WHERE b.id = $1 AND b.tenant_id = $5`,
      [req.params.id, matn || '', rasm || null, req.user.id, req.user.tenant_id]
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

// ── DELETE /api/orders/:id ─── (faqat Owner; izoh va harakatlar cascade) ──
router.delete('/:id', requireRole('Owner'), async (req, res) => {
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
