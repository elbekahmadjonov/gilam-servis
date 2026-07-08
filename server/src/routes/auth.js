import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { validateInitData } from '../telegram.js';

const router = Router();

// ── POST /api/auth/login ──────────────────────────────
// Kirish: { login, parol, initData? }  →  { token, xodim }
// initData berilsa va yaroqli bo'lsa — Telegram akkaunti shu xodimga
// bog'lanadi (keyingi ochilishlarda avtomatik kirish uchun).
router.post('/login', async (req, res) => {
  try {
    const { login, parol, initData } = req.body || {};
    if (!login || !parol) {
      return res.status(400).json({ error: 'Login va parol talab qilinadi' });
    }

    const { rows } = await query(
      'SELECT id, ism, login, parol_hash, rol FROM xodimlar WHERE login = $1',
      [String(login).trim()]
    );
    const xodim = rows[0];
    if (!xodim) {
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    }

    const ok = await bcrypt.compare(parol, xodim.parol_hash);
    if (!ok) {
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    }

    // Birinchi login'da Telegram akkauntini bog'lash
    if (initData) {
      const tgUser = validateInitData(initData);
      if (tgUser?.id) {
        // Bu Telegram ID boshqa xodimga bog'lanmagan bo'lsa — biriktiramiz
        await query(
          `UPDATE xodimlar SET telegram_id = $1
           WHERE id = $2
             AND NOT EXISTS (SELECT 1 FROM xodimlar WHERE telegram_id = $1 AND id <> $2)`,
          [tgUser.id, xodim.id]
        ).catch((e) => console.warn('[auth/login] telegram bog\'lash:', e.message));
      }
    }

    const safe = { id: xodim.id, ism: xodim.ism, login: xodim.login, rol: xodim.rol };
    return res.json({ token: signToken(safe), xodim: safe });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── POST /api/auth/telegram ───────────────────────────
// Kirish: { initData }  →  { token, xodim }
// Telegram Mini App ochilganda avtomatik chaqiriladi.
// initData yaroqli va Telegram ID biror xodimga bog'langan bo'lsa — kiritadi.
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body || {};
    const tgUser = validateInitData(initData);
    if (!tgUser?.id) {
      return res.status(401).json({ error: 'Telegram maʼlumoti yaroqsiz' });
    }

    const { rows } = await query(
      'SELECT id, ism, login, rol FROM xodimlar WHERE telegram_id = $1',
      [tgUser.id]
    );
    const xodim = rows[0];
    if (!xodim) {
      // Hali bog'lanmagan — frontend login/parol so'raydi (u yerda bog'lanadi)
      return res.status(403).json({ error: 'not_linked', telegramId: tgUser.id });
    }

    const safe = { id: xodim.id, ism: xodim.ism, login: xodim.login, rol: xodim.rol };
    return res.json({ token: signToken(safe), xodim: safe });
  } catch (err) {
    console.error('[auth/telegram]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, ism, login, rol, telefon FROM xodimlar WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Xodim topilmadi' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[auth/me]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── POST /api/auth/change-password ────────────────────
// Kirish: { login, eskiParol, yangiParol }  (login sahifasidan, tokensiz)
router.post('/change-password', async (req, res) => {
  try {
    const { login, eskiParol, yangiParol } = req.body || {};
    if (!login || !eskiParol || !yangiParol) {
      return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi kerak" });
    }
    if (String(yangiParol).length < 6) {
      return res.status(400).json({ error: 'Yangi parol kamida 6 belgi bo\'lishi kerak' });
    }

    const { rows } = await query(
      'SELECT id, parol_hash FROM xodimlar WHERE login = $1',
      [String(login).trim()]
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
