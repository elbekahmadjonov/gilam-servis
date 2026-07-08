import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { validateInitData } from '../telegram.js';
import { getTenantBySlug, isTenantActive } from '../tenant.js';

const router = Router();

// Slug'ni body yoki X-Tenant header'dan oladi
function slugFrom(req) {
  return req.body?.slug || req.headers['x-tenant'] || '';
}

// ── POST /api/auth/login ──────────────────────────────
// Kirish: { login, parol, slug, initData? }  →  { token, xodim }
router.post('/login', async (req, res) => {
  try {
    const { login, parol, initData } = req.body || {};
    if (!login || !parol) {
      return res.status(400).json({ error: 'Login va parol talab qilinadi' });
    }
    const tenant = await getTenantBySlug(slugFrom(req));
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    if (!isTenantActive(tenant)) return res.status(403).json({ error: 'tenant_suspended' });

    const { rows } = await query(
      'SELECT id, ism, login, parol_hash, rol FROM xodimlar WHERE tenant_id = $1 AND login = $2',
      [tenant.id, String(login).trim()]
    );
    const xodim = rows[0];
    if (!xodim || !(await bcrypt.compare(parol, xodim.parol_hash))) {
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    }

    // Telegram akkauntini shu xodimga bog'lash ("oxirgi kirgan g'olib").
    // Login/parol bilan kirgan xodim Telegram'ni o'ziga oladi — shu bilan
    // bitta telefondan boshqa xodimga o'tish mumkin bo'ladi.
    if (initData && tenant.bot_token) {
      const tgUser = validateInitData(initData, tenant.bot_token);
      if (tgUser?.id) {
        try {
          // Avval shu telegram_id boshqa xodimga bog'langan bo'lsa — uzamiz
          await query(
            `UPDATE xodimlar SET telegram_id = NULL
             WHERE telegram_id = $1 AND tenant_id = $2 AND id <> $3`,
            [tgUser.id, tenant.id, xodim.id]
          );
          // So'ng shu xodimga bog'laymiz
          await query(
            'UPDATE xodimlar SET telegram_id = $1 WHERE id = $2',
            [tgUser.id, xodim.id]
          );
        } catch (e) {
          console.warn('[auth/login] telegram bog\'lash:', e.message);
        }
      }
    }

    const safe = { id: xodim.id, ism: xodim.ism, login: xodim.login, rol: xodim.rol, tenant_id: tenant.id };
    return res.json({ token: signToken(safe), xodim: safe });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── POST /api/auth/telegram ───────────────────────────
// Kirish: { initData, slug }  →  { token, xodim }
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body || {};
    const tenant = await getTenantBySlug(slugFrom(req));
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    if (!isTenantActive(tenant)) return res.status(403).json({ error: 'tenant_suspended' });

    const tgUser = validateInitData(initData, tenant.bot_token);
    if (!tgUser?.id) {
      return res.status(401).json({ error: 'Telegram maʼlumoti yaroqsiz' });
    }

    const { rows } = await query(
      'SELECT id, ism, login, rol FROM xodimlar WHERE tenant_id = $1 AND telegram_id = $2',
      [tenant.id, tgUser.id]
    );
    const xodim = rows[0];
    if (!xodim) {
      // Hali bog'lanmagan — frontend login/parol so'raydi (u yerda bog'lanadi)
      return res.status(403).json({ error: 'not_linked', telegramId: tgUser.id });
    }

    const safe = { id: xodim.id, ism: xodim.ism, login: xodim.login, rol: xodim.rol, tenant_id: tenant.id };
    return res.json({ token: signToken(safe), xodim: safe });
  } catch (err) {
    console.error('[auth/telegram]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── GET /api/auth/me ──────── (token'dagi tenant bo'yicha scoped) ──
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, ism, login, rol, telefon FROM xodimlar WHERE id = $1 AND tenant_id = $2',
      [req.user.id, req.user.tenant_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Xodim topilmadi' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[auth/me]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── POST /api/auth/change-password ────────────────────
// Kirish: { login, eskiParol, yangiParol, slug }  (tokensiz, login sahifasidan)
router.post('/change-password', async (req, res) => {
  try {
    const { login, eskiParol, yangiParol } = req.body || {};
    if (!login || !eskiParol || !yangiParol) {
      return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi kerak" });
    }
    if (String(yangiParol).length < 6) {
      return res.status(400).json({ error: 'Yangi parol kamida 6 belgi bo\'lishi kerak' });
    }
    const tenant = await getTenantBySlug(slugFrom(req));
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });

    const { rows } = await query(
      'SELECT id, parol_hash FROM xodimlar WHERE tenant_id = $1 AND login = $2',
      [tenant.id, String(login).trim()]
    );
    const xodim = rows[0];
    if (!xodim || !(await bcrypt.compare(eskiParol, xodim.parol_hash))) {
      return res.status(401).json({ error: "Eski parol noto'g'ri" });
    }

    const hash = await bcrypt.hash(yangiParol, 10);
    await query('UPDATE xodimlar SET parol_hash = $1 WHERE id = $2', [hash, xodim.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[auth/change-password]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
