import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant, requireRole } from '../auth.js';
import { requireTenantActive } from '../tenant.js';

const router = Router();
// O'qish — barcha tenant xodimlari (statistika hammaga ko'rinadi).
// Yozish/o'chirish — faqat Owner.
router.use(requireAuth, requireTenant, requireTenantActive);

const OY_RE = /^\d{4}-\d{2}$/;
const oyBoshi = (oy) => `${oy}-01`;

// ── GET /api/oyliklar/xodimlar ── oylik yozish uchun xodimlar ro'yxati ──
router.get('/xodimlar', async (req, res) => {
  try {
    // Owner — korxona egasi, unga oylik yozilmaydi
    const { rows } = await query(
      `SELECT id, ism, rol FROM xodimlar
       WHERE tenant_id = $1 AND rol <> 'Owner' ORDER BY rol, ism`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[oyliklar/xodimlar]', err.message);
    res.status(500).json({ error: 'Xodimlarni yuklab bo\'lmadi' });
  }
});

// ── GET /api/oyliklar ── barcha to'lov yozuvlari (xodim ismi bilan) ──
// Har yozuv — alohida to'lov. Xodimning oylik jami = shu yozuvlar yig'indisi.
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT o.id, o.xodim_id, to_char(o.oy, 'YYYY-MM') AS oy, o.summa, o.izoh,
              o.created_at, x.ism AS xodim_ismi, x.rol AS xodim_roli
       FROM oyliklar o
       LEFT JOIN xodimlar x ON x.id = o.xodim_id
       WHERE o.tenant_id = $1
       ORDER BY o.oy DESC, o.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[oyliklar/list]', err.message);
    res.status(500).json({ error: 'Oyliklarni yuklab bo\'lmadi' });
  }
});

// ── PUT /api/oyliklar ── xodimga TO'LOV QO'SHISH (faqat Owner) ──
// Kirish: { xodimId, oy: 'YYYY-MM', summa, izoh }
// Har chaqiruv YANGI yozuv qo'shadi — eskisini almashtirmaydi.
// Xodimning o'sha oydagi oyligi = barcha yozuvlar yig'indisi.
router.put('/', requireRole('Owner'), async (req, res) => {
  try {
    const { xodimId, oy, summa = 0, izoh = '' } = req.body || {};
    if (!xodimId) return res.status(400).json({ error: 'Xodim tanlanmagan' });
    if (!OY_RE.test(String(oy))) {
      return res.status(400).json({ error: 'oy YYYY-MM formatida bo\'lishi kerak' });
    }
    const miqdor = Math.max(0, Math.round(Number(summa) || 0));
    if (miqdor <= 0) return res.status(400).json({ error: 'Summa 0 dan katta bo\'lishi kerak' });

    const { rows } = await query(
      `INSERT INTO oyliklar (tenant_id, xodim_id, oy, summa, izoh)
       SELECT $1, x.id, $3, $4, $5 FROM xodimlar x
       WHERE x.id = $2 AND x.tenant_id = $1
       RETURNING id, xodim_id, to_char(oy, 'YYYY-MM') AS oy, summa, izoh, created_at`,
      [req.user.tenant_id, xodimId, oyBoshi(oy), miqdor, String(izoh || '')]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Xodim topilmadi' });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[oyliklar/upsert]', err.message);
    res.status(500).json({ error: 'Oylikni saqlab bo\'lmadi' });
  }
});

// ── DELETE /api/oyliklar/:id ── (faqat Owner) ──
router.delete('/:id', requireRole('Owner'), async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM oyliklar WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Oylik topilmadi' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[oyliklar/delete]', err.message);
    res.status(500).json({ error: 'Oylikni o\'chirib bo\'lmadi' });
  }
});

export default router;
