import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant, requireRole } from '../auth.js';
import { requireTenantActive } from '../tenant.js';

const router = Router();
// O'qish — barcha tenant xodimlari (statistika hammaga ko'rinadi).
// Yozish (PUT) esa faqat Owner uchun (pastda requireRole bilan).
router.use(requireAuth, requireTenant, requireTenantActive);

// ── GET /api/xarajatlar ── shu tenantning barcha kunlik xarajatlari ──
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, to_char(sana, 'YYYY-MM-DD') AS sana, gaz, obed, ishchi, boshqa, izoh
       FROM xarajatlar WHERE tenant_id = $1 ORDER BY sana DESC`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[xarajatlar/list]', err.message);
    res.status(500).json({ error: 'Xarajatlarni yuklab bo\'lmadi' });
  }
});

// ── PUT /api/xarajatlar ── kunlik xarajatni saqlash (faqat Owner) ──
// Kirish: { sana: 'YYYY-MM-DD', gaz, obed, ishchi, boshqa, izoh }
router.put('/', requireRole('Owner'), async (req, res) => {
  try {
    const { sana, gaz = 0, obed = 0, ishchi = 0, boshqa = 0, izoh = '' } = req.body || {};
    if (!sana || !/^\d{4}-\d{2}-\d{2}$/.test(String(sana))) {
      return res.status(400).json({ error: 'sana YYYY-MM-DD formatida bo\'lishi kerak' });
    }
    const num = (v) => Math.max(0, Math.round(Number(v) || 0));
    const { rows } = await query(
      `INSERT INTO xarajatlar (tenant_id, sana, gaz, obed, ishchi, boshqa, izoh)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, sana) DO UPDATE
         SET gaz = EXCLUDED.gaz, obed = EXCLUDED.obed, ishchi = EXCLUDED.ishchi,
             boshqa = EXCLUDED.boshqa, izoh = EXCLUDED.izoh
       RETURNING id, to_char(sana, 'YYYY-MM-DD') AS sana, gaz, obed, ishchi, boshqa, izoh`,
      [req.user.tenant_id, sana, num(gaz), num(obed), num(ishchi), num(boshqa), String(izoh || '')]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[xarajatlar/upsert]', err.message);
    res.status(500).json({ error: 'Xarajatni saqlab bo\'lmadi' });
  }
});

export default router;
