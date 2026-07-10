import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant } from '../auth.js';

const router = Router();
router.use(requireAuth, requireTenant);

// ── POST /api/devices ── FCM qurilma tokenini ro'yxatdan o'tkazish ──
router.post('/', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token talab qilinadi' });
    await query(
      `INSERT INTO qurilma_tokenlar (token, xodim_id, tenant_id, rol, yangilangan)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (token) DO UPDATE
         SET xodim_id = $2, tenant_id = $3, rol = $4, yangilangan = now()`,
      [token, req.user.id, req.user.tenant_id, req.user.rol]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[devices/register]', err.message);
    res.status(500).json({ error: 'Token saqlanmadi' });
  }
});

// ── DELETE /api/devices ── logout'da tokenni o'chirish ──
router.delete('/', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (token) await query('DELETE FROM qurilma_tokenlar WHERE token = $1', [token]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[devices/delete]', err.message);
    res.status(500).json({ error: 'O\'chirilmadi' });
  }
});

export default router;
