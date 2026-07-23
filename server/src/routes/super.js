import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, signSuperToken, requireAuth, requireSuperAdmin } from '../auth.js';
import { getTenantById, xodimLimitOshdi } from '../tenant.js';
import { telegramTogri } from '../muhit.js';

const ROLLAR = ['Owner', 'Admin', 'Dostavchik', 'Ishchi'];

const router = Router();

// Web client bazasi (bot menyu tugmasi shu URL'ni ochadi)
const WEB_BASE = process.env.WEB_BASE || 'https://gilam.qariya.uz';

// ── POST /api/super/login ─────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { login, parol } = req.body || {};
    if (!login || !parol) return res.status(400).json({ error: 'Login va parol talab qilinadi' });

    const { rows } = await query(
      'SELECT id, ism, login, parol_hash FROM super_admins WHERE login = $1',
      [String(login).trim()]
    );
    const sa = rows[0];
    if (!sa || !(await bcrypt.compare(parol, sa.parol_hash))) {
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    }
    const safe = { id: sa.id, ism: sa.ism, login: sa.login };
    return res.json({ token: signSuperToken(safe), admin: safe });
  } catch (err) {
    console.error('[super/login]', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
});

// Bundan keyingi barcha endpointlar SuperAdmin talab qiladi
router.use(requireAuth, requireSuperAdmin);

// ── GET /api/super/me ─────────────────────────────────
router.get('/me', async (req, res) => {
  const { rows } = await query('SELECT id, ism, login FROM super_admins WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Topilmadi' });
  res.json(rows[0]);
});

// ── GET /api/super/tenants ── xodim/buyurtma soni bilan ──
router.get('/tenants', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT t.*,
        (SELECT count(*)::int FROM xodimlar   x WHERE x.tenant_id = t.id) AS xodim_soni,
        (SELECT count(*)::int FROM buyurtmalar b WHERE b.tenant_id = t.id) AS buyurtma_soni
      FROM tenants t
      ORDER BY t.created_at DESC
    `);
    // bot_token'ni maskalab yuboramiz (xavfsizlik)
    res.json(rows.map(maskBot));
  } catch (err) {
    console.error('[super/tenants]', err.message);
    res.status(500).json({ error: 'Mijozlarni yuklab bo\'lmadi' });
  }
});

// ── POST /api/super/tenants ── yangi mijoz + admin + bot ──
router.post('/tenants', async (req, res) => {
  const client = await (await import('../db.js')).pool.connect();
  try {
    const {
      nomi, slug, bot_token, reja = 'free',
      limit_buyurtma = null, limit_xodim = null, expires_at = null,
      admin_login = 'admin', admin_parol = 'admin123', admin_ism = 'Administrator',
    } = req.body || {};

    if (!nomi || !slug) return res.status(400).json({ error: 'nomi va slug talab qilinadi' });
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'slug faqat kichik harf, raqam va tire bo\'lishi mumkin' });
    }

    await client.query('BEGIN');
    const t = await client.query(
      `INSERT INTO tenants (nomi, slug, bot_token, reja, limit_buyurtma, limit_xodim, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nomi, slug, bot_token || '', reja, limit_buyurtma, limit_xodim, expires_at]
    );
    const tenant = t.rows[0];

    const hash = await bcrypt.hash(admin_parol, 10);
    await client.query(
      'INSERT INTO xodimlar (tenant_id, ism, login, parol_hash, rol) VALUES ($1,$2,$3,$4,$5)',
      [tenant.id, admin_ism, admin_login, hash, 'Admin']
    );
    await client.query('COMMIT');

    // Bot menyu tugmasini avtomatik sozlash (xato bo'lsa e'tiborsiz — keyin qo'lda)
    let botInfo = null;
    if (bot_token) botInfo = await configureBot(bot_token, slug).catch(() => null);
    if (botInfo?.username) {
      await query('UPDATE tenants SET bot_username = $1 WHERE id = $2', [botInfo.username, tenant.id]);
      tenant.bot_username = botInfo.username;
    }

    res.status(201).json({ tenant: maskBot(tenant), bot: botInfo });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Bu slug allaqachon band' });
    console.error('[super/tenants/create]', err.message);
    res.status(500).json({ error: 'Mijoz yaratib bo\'lmadi' });
  } finally {
    client.release();
  }
});

// ── PATCH /api/super/tenants/:id ──────────────────────
router.patch('/tenants/:id', async (req, res) => {
  try {
    const ALLOWED = ['nomi', 'bot_token', 'status', 'reja', 'limit_buyurtma', 'limit_xodim', 'expires_at'];
    const sets = [];
    const params = [];
    let i = 1;
    for (const key of ALLOWED) {
      if (key in (req.body || {})) {
        sets.push(`${key} = $${i++}`);
        params.push(req.body[key]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'O\'zgartirish yo\'q' });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mijoz topilmadi' });

    // bot_token yangilangan bo'lsa menyu tugmasini qayta sozlaymiz
    if ('bot_token' in req.body && req.body.bot_token) {
      configureBot(req.body.bot_token, rows[0].slug).catch(() => {});
    }
    res.json(maskBot(rows[0]));
  } catch (err) {
    console.error('[super/tenants/update]', err.message);
    res.status(500).json({ error: 'Yangilab bo\'lmadi' });
  }
});

// ── DELETE /api/super/tenants/:id ──── (CASCADE) ───────
router.delete('/tenants/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM tenants WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Mijoz topilmadi' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[super/tenants/delete]', err.message);
    res.status(500).json({ error: 'O\'chirib bo\'lmadi' });
  }
});

// ── POST /api/super/tenants/:id/impersonate ────────────
// Shu tenantning bir Admin'i sifatida tenant-scoped token qaytaradi
router.post('/tenants/:id/impersonate', async (req, res) => {
  try {
    const t = await query('SELECT id, slug FROM tenants WHERE id = $1', [req.params.id]);
    if (!t.rows[0]) return res.status(404).json({ error: 'Mijoz topilmadi' });

    const x = await query(
      `SELECT id, ism, login, rol FROM xodimlar
       WHERE tenant_id = $1 AND rol = 'Admin' ORDER BY created_at ASC LIMIT 1`,
      [req.params.id]
    );
    if (!x.rows[0]) return res.status(404).json({ error: 'Bu mijozda Admin yo\'q' });

    const safe = { ...x.rows[0], tenant_id: req.params.id };
    res.json({ token: signToken(safe), xodim: safe, slug: t.rows[0].slug });
  } catch (err) {
    console.error('[super/impersonate]', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── GET /api/super/tenants/:id/xodimlar ── ro'yxat ────
router.get('/tenants/:id/xodimlar', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, ism, login, rol, telefon,
              (telegram_id IS NOT NULL) AS telegram_bogli
       FROM xodimlar WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[super/xodimlar/list]', err.message);
    res.status(500).json({ error: 'Xodimlarni yuklab bo\'lmadi' });
  }
});

// ── POST /api/super/tenants/:id/xodimlar ── qo'shish ──
// Kirish: { ism, login, parol, rol, telefon? }
router.post('/tenants/:id/xodimlar', async (req, res) => {
  try {
    const { ism = '', login, parol, rol = 'Ishchi', telefon = '' } = req.body || {};
    if (!login || !parol) return res.status(400).json({ error: 'Login va parol talab qilinadi' });
    if (String(parol).length < 4) return res.status(400).json({ error: 'Parol kamida 4 belgi bo\'lishi kerak' });
    if (!ROLLAR.includes(rol)) return res.status(400).json({ error: 'Rol noto\'g\'ri' });

    const tenant = await getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Mijoz topilmadi' });
    if (await xodimLimitOshdi(tenant)) {
      return res.status(403).json({ error: 'Xodim limiti to\'lgan' });
    }

    const hash = await bcrypt.hash(parol, 10);
    const { rows } = await query(
      `INSERT INTO xodimlar (tenant_id, ism, login, parol_hash, rol, telefon)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, ism, login, rol, telefon`,
      [tenant.id, ism || login, String(login).trim(), hash, rol, telefon]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu login shu mijozda band' });
    console.error('[super/xodimlar/create]', err.message);
    res.status(500).json({ error: 'Xodim qo\'shib bo\'lmadi' });
  }
});

// ── PATCH /api/super/tenants/:id/xodimlar/:xid ── (ism/rol/telefon/parol) ──
router.patch('/tenants/:id/xodimlar/:xid', async (req, res) => {
  try {
    const { ism, rol, telefon, parol } = req.body || {};
    const sets = []; const params = []; let i = 1;
    if (ism != null)     { sets.push(`ism = $${i++}`);     params.push(ism); }
    if (telefon != null) { sets.push(`telefon = $${i++}`); params.push(telefon); }
    if (rol != null) {
      if (!ROLLAR.includes(rol)) return res.status(400).json({ error: 'Rol noto\'g\'ri' });
      sets.push(`rol = $${i++}`); params.push(rol);
    }
    if (parol) {
      if (String(parol).length < 4) return res.status(400).json({ error: 'Parol kamida 4 belgi bo\'lishi kerak' });
      sets.push(`parol_hash = $${i++}`); params.push(await bcrypt.hash(parol, 10));
    }
    if (!sets.length) return res.status(400).json({ error: 'O\'zgartirish yo\'q' });

    params.push(req.params.xid, req.params.id);
    const { rows } = await query(
      `UPDATE xodimlar SET ${sets.join(', ')}
       WHERE id = $${i++} AND tenant_id = $${i}
       RETURNING id, ism, login, rol, telefon`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Xodim topilmadi' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[super/xodimlar/update]', err.message);
    res.status(500).json({ error: 'Yangilab bo\'lmadi' });
  }
});

// ── DELETE /api/super/tenants/:id/xodimlar/:xid ───────
router.delete('/tenants/:id/xodimlar/:xid', async (req, res) => {
  try {
    const target = await query(
      'SELECT rol FROM xodimlar WHERE id = $1 AND tenant_id = $2',
      [req.params.xid, req.params.id]
    );
    if (!target.rows[0]) return res.status(404).json({ error: 'Xodim topilmadi' });

    // Oxirgi adminni o'chirishga yo'l qo'ymaymiz (mijoz boshqaruvsiz qolmasin)
    if (target.rows[0].rol === 'Admin') {
      const adm = await query(
        `SELECT count(*)::int AS n FROM xodimlar WHERE tenant_id = $1 AND rol = 'Admin'`,
        [req.params.id]
      );
      if (adm.rows[0].n <= 1) {
        return res.status(400).json({ error: 'Yagona adminni o\'chirib bo\'lmaydi' });
      }
    }

    await query('DELETE FROM xodimlar WHERE id = $1 AND tenant_id = $2',
      [req.params.xid, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[super/xodimlar/delete]', err.message);
    res.status(500).json({ error: 'O\'chirib bo\'lmadi' });
  }
});

// ── GET /api/super/stats ── global panel ──────────────
router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        (SELECT count(*)::int FROM tenants)                              AS jami_mijoz,
        (SELECT count(*)::int FROM tenants WHERE status='active')        AS faol_mijoz,
        (SELECT count(*)::int FROM buyurtmalar)                          AS jami_buyurtma,
        (SELECT count(*)::int FROM buyurtmalar WHERE status='tugadi')    AS tugagan_buyurtma,
        (SELECT COALESCE(sum(yakuniy_summa),0)::bigint FROM buyurtmalar WHERE status='tugadi') AS jami_daromad,
        (SELECT count(*)::int FROM xodimlar)                             AS jami_xodim
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[super/stats]', err.message);
    res.status(500).json({ error: 'Statistikani yuklab bo\'lmadi' });
  }
});

// ── Yordamchilar ──────────────────────────────────────

// bot_token'ni javobda maskalash (frontendga to'liq token ketmaydi)
function maskBot(t) {
  if (!t) return t;
  const { bot_token, ...rest } = t;
  return { ...rest, bot_token_bor: Boolean(bot_token) };
}

// Bot menyu tugmasini Mini App'ga sozlaydi + username oladi
async function configureBot(botToken, slug) {
  // HIMOYA: lokal muhitda haqiqiy botning menyu tugmasini localhost'ga
  // o'zgartirib qo'ymaslik uchun (bir marta shunday hodisa bo'lgan).
  if (!telegramTogri('bot menyusini sozlash')) return null;

  const url = `${WEB_BASE}/?t=${encodeURIComponent(slug)}`;
  // getMe → username
  const me = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then((r) => r.json());
  // Menyu tugmasi
  await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: { type: 'web_app', text: 'Ochish', web_app: { url } },
    }),
  });
  return { username: me?.result?.username || null, url };
}

export default router;
