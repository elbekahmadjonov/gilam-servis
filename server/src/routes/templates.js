import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant } from '../auth.js';
import { requireTenantActive } from '../tenant.js';

const router = Router();
router.use(requireAuth, requireTenant, requireTenantActive);

// ── GET /api/templates ── tur bo'yicha guruhlangan narxlar ──
// Qaytaradi: { gilam: [1000, 2000], odeal: [...], ... }
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT turi, narx FROM narx_shablonlari WHERE tenant_id = $1 ORDER BY narx ASC',
      [req.user.tenant_id]
    );
    const grouped = {};
    for (const r of rows) {
      (grouped[r.turi] ||= []).push(Number(r.narx));
    }
    res.json(grouped);
  } catch (err) {
    console.error('[templates/list]', err.message);
    res.status(500).json({ error: 'Shablonlarni yuklab bo\'lmadi' });
  }
});

// ── POST /api/templates ── { turi, narx } (takror bo'lsa qo'shmaydi) ──
router.post('/', async (req, res) => {
  try {
    const { turi, narx } = req.body || {};
    const val = Number(narx);
    if (!turi || !val || val <= 0) {
      return res.status(400).json({ error: 'turi va musbat narx talab qilinadi' });
    }
    await query(
      `INSERT INTO narx_shablonlari (tenant_id, turi, narx)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM narx_shablonlari WHERE tenant_id = $1 AND turi = $2 AND narx = $3)`,
      [req.user.tenant_id, turi, val]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[templates/create]', err.message);
    res.status(500).json({ error: 'Shablon qo\'shib bo\'lmadi' });
  }
});

// ── DELETE /api/templates ── { turi, narx } ──
router.delete('/', async (req, res) => {
  try {
    const { turi, narx } = req.body || {};
    await query(
      'DELETE FROM narx_shablonlari WHERE tenant_id = $1 AND turi = $2 AND narx = $3',
      [req.user.tenant_id, turi, Number(narx)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[templates/delete]', err.message);
    res.status(500).json({ error: 'Shablon o\'chirib bo\'lmadi' });
  }
});

export default router;
