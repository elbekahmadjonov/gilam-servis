import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant } from '../auth.js';
import { requireTenantActive } from '../tenant.js';
import { emitChat, emitChatTahrir, emitChatOchirildi } from '../realtime.js';
import { notifyChat } from '../notify.js';

const router = Router();
router.use(requireAuth, requireTenant, requireTenantActive);

// ── GET /api/chat ── oxirgi 100 xabar (eskidan yangiga) ──
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.matn, c.vaqt, c.muallif_id,
              x.ism AS muallif_ism, x.login AS muallif_login, x.rol AS muallif_rol
       FROM chat_xabarlar c LEFT JOIN xodimlar x ON x.id = c.muallif_id
       WHERE c.tenant_id = $1 ORDER BY c.vaqt DESC LIMIT 100`,
      [req.user.tenant_id]
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error('[chat/list]', err.message);
    res.status(500).json({ error: 'Chatni yuklab bo\'lmadi' });
  }
});

// ── POST /api/chat ── { matn } ──
router.post('/', async (req, res) => {
  try {
    const matn = (req.body?.matn || '').trim();
    if (!matn) return res.status(400).json({ error: 'Bo\'sh xabar' });
    if (matn.length > 2000) return res.status(400).json({ error: 'Xabar juda uzun' });

    const who = await query('SELECT ism, login, rol FROM xodimlar WHERE id = $1', [req.user.id]);
    const ism = who.rows[0]?.ism || who.rows[0]?.login || 'Xodim';

    const { rows } = await query(
      `INSERT INTO chat_xabarlar (tenant_id, muallif_id, matn)
       VALUES ($1, $2, $3) RETURNING id, matn, vaqt, muallif_id`,
      [req.user.tenant_id, req.user.id, matn]
    );
    const xabar = {
      ...rows[0],
      muallif_ism:   ism,
      muallif_login: who.rows[0]?.login || '',
      muallif_rol:   who.rows[0]?.rol || '',
    };

    // Jonli — tenant room'iga
    emitChat(req.user.tenant_id, xabar);
    // Push — boshqa a'zolarga (Telegramdek bildirishnoma)
    notifyChat(req.user.tenant_id, req.user.id, ism, matn).catch(() => {});

    res.status(201).json(xabar);
  } catch (err) {
    console.error('[chat/send]', err.message);
    res.status(500).json({ error: 'Xabar yuborilmadi' });
  }
});

// ── PATCH /api/chat/:id ── xabarni tahrirlash (faqat muallif) ──
router.patch('/:id', async (req, res) => {
  try {
    const matn = (req.body?.matn || '').trim();
    if (!matn) return res.status(400).json({ error: 'Bo\'sh xabar' });
    if (matn.length > 2000) return res.status(400).json({ error: 'Xabar juda uzun' });

    const { rows } = await query(
      `UPDATE chat_xabarlar SET matn = $1, tahrirlangan = true
       WHERE id = $2 AND tenant_id = $3 AND muallif_id = $4
       RETURNING id, matn, tahrirlangan`,
      [matn, req.params.id, req.user.tenant_id, req.user.id]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Bu xabarni tahrirlab bo\'lmaydi' });

    emitChatTahrir(req.user.tenant_id, rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('[chat/edit]', err.message);
    res.status(500).json({ error: 'Tahrirlab bo\'lmadi' });
  }
});

// ── DELETE /api/chat/:id ── xabarni o'chirish (faqat muallif) ──
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM chat_xabarlar WHERE id = $1 AND tenant_id = $2 AND muallif_id = $3',
      [req.params.id, req.user.tenant_id, req.user.id]
    );
    if (!rowCount) return res.status(403).json({ error: 'Bu xabarni o\'chirib bo\'lmaydi' });

    emitChatOchirildi(req.user.tenant_id, Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[chat/delete]', err.message);
    res.status(500).json({ error: 'O\'chirib bo\'lmadi' });
  }
});

export default router;
