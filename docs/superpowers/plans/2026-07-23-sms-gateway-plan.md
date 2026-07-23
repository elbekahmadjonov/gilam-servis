# SMS Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an SMS section to the Gilam Servis app so that when an order reaches "dostavka" status, the customer automatically gets an SMS, sent through the tenant's own SIM-card Android phone (no paid SMS API), paired either by typing a 6-digit code or by scanning a QR code.

**Architecture:** Backend adds two tables (`sms_telefon`, `sms_queue`) and one tenant column (`sms_shablon`) to the existing Postgres schema, plus a new `/api/sms/*` route mounted in the existing Express monolith (no separate server/port). The main React app gets an Owner-only "SMS" page to manage pairing, the message template, and the delivery queue. A second, independent minimal web app (`gilam-app/sms-gateway/`) runs on the SIM-card phone; it pairs via typed code or QR scan (using the phone's camera through the browser's own `getUserMedia` + `jsQR` — no native plugin needed for scanning), polls the queue, and sends the actual SMS through one small custom Capacitor native plugin (the only part of this feature that requires native Android code, because no browser can send an SMS on its own).

**Tech Stack:** Node.js/Express, PostgreSQL (`pg`), React 19 + Vite (existing `gilam-app`), a second small Vite vanilla-JS project (`sms-gateway`) wrapped later in Capacitor for Android, `qrcode` (QR generation, main app) and `jsqr` (QR scanning, gateway app).

## Global Constraints

- No Supabase, no new server process. All backend changes go into the existing `gilam-app/server` (Express monolith, `server/schema.sql` applied via `npm run migrate`).
- Follow existing conventions exactly: Uzbek identifiers/messages, `try/catch` in every route handler returning `res.status(...).json({ error: '...' })` on failure (see `server/src/routes/orders.js` for the reference style), JWT auth via `requireAuth`/`requireTenant`/`requireRole` from `server/src/auth.js`.
- SMS page and its API are visible/usable only by the `Owner` role (`src/utils/rollar.js`), not Admin/Dostavchik/Ishchi.
- Template placeholders are `{ism}` and `{id}` only — no `{telefon}` placeholder (no such setting exists elsewhere in the app).
- This repository has **no automated test framework** (no Jest/Vitest/Mocha anywhere in the project). Verification in this plan is real, executable manual verification: starting the actual local server/dev servers and hitting them with `curl` and small `node` scripts against the actual local Postgres database — not unit tests.
- Local Postgres is already running and reachable at `postgres://postgres:postgres@localhost:5432/gilam` (verified reachable during planning) and already contains **real business data** (tenant `slug='default'`, real employee logins, i.e. not a synthetic dev DB). Every verification step that creates temporary rows (test employee, test order, test phone pairing) MUST delete/reset them at the end of that same task — leave the DB exactly as clean as you found it.
- The actual git repository for this project is nested at `gilam-app/.git` (branch `main`), separate from the outer Documents-level repository. All commits in this plan are made with cwd inside `gilam-app/`.
- Compiling the gateway Android APK (native plugin, camera/SMS permissions at the OS level) is **out of scope for automated verification** here — there is no `ANDROID_HOME` configured in this environment. Native plugin source is written completely and correctly, but the actual `npx cap add android` / Android Studio build is a manual step for the user, called out explicitly in Task 13.
- Server dev command: `npm run dev` in `gilam-app/server` (nodemon-less `node --watch`, port from `server/.env` → `3000`). Client dev command: `npm run dev` in `gilam-app/` (Vite, port `5173`). Gateway dev command: `npm run dev` in `gilam-app/sms-gateway/` (Vite, auto-picks a free port).

---

## File Structure Overview

**Backend (modify/create in `gilam-app/server/`):**
- Modify `schema.sql` — new tables + tenant column.
- Create `src/smsGateway.js` — code/token generation, template rendering, `enqueueSms()`, `requireGateway` middleware.
- Create `src/routes/sms.js` — all `/api/sms/*` endpoints.
- Modify `src/index.js` — mount the new route.
- Modify `src/routes/orders.js` — call `enqueueSms()` when status becomes `dostavka`.

**Frontend (modify/create in `gilam-app/`):**
- Modify `src/lib/api.js` — export `getApiBase()`.
- Create `src/services/sms.js` — API wrapper functions.
- Create `src/pages/Sms.jsx` — the SMS page.
- Modify `src/utils/rollar.js`, `src/components/Footer.jsx`, `src/App.jsx` — wire the new Owner-only tab/route.
- Modify `package.json` — add `qrcode` dependency.

**Gateway app (new folder `gilam-app/sms-gateway/`):**
- Create `package.json`, `index.html`, `style.css`, `main.js` — full pairing (typed code or QR scan) + polling + confirm logic, testable in an ordinary browser.
- Create `capacitor.config.ts`, `android-plugin/SmsGatewayPlugin.java` (source to paste into the generated native project) — the one native-only piece (real SMS sending), documented as a manual build step.

---

## Task 1: Database schema — `sms_telefon`, `sms_queue`, `tenants.sms_shablon`

**Files:**
- Modify: `gilam-app/server/schema.sql`

**Interfaces:**
- Produces: table `sms_telefon(id, tenant_id, kod, kod_muddati, token, qurilma_nomi, sim_operator, ulangan, ulangan_vaqt, oxirgi_faollik)`, table `sms_queue(id, tenant_id, buyurtma_id, telefon, xabar, status, xato_sababi, yaratilgan_vaqt, yuborilgan_vaqt)`, column `tenants.sms_shablon`. Later tasks (2, 3, 4) query/insert/update these exact table and column names.

- [ ] **Step 1: Append the new section to `schema.sql`**

Open `gilam-app/server/schema.sql` and add this new section right before the final `-- TAYYOR.` comment at the end of the file:

```sql
-- ================================================================
-- 14. SMS GATEWAY — buyurtma "dostavka"ga o'tganda mijozga SMS
-- Tenant'ning o'z SIM kartali Android telefoni orqali (pullik SMS
-- API kerak emas). Bitta tenant — bitta telefon.
-- ================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_shablon text NOT NULL DEFAULT
  'Hurmatli {ism}, buyurtma #{id} tayyor. Yetkazib berishga chiqamiz.';

CREATE TABLE IF NOT EXISTS sms_telefon (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid         NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  kod             text,
  kod_muddati     timestamptz,
  token           text UNIQUE,
  qurilma_nomi    text         NOT NULL DEFAULT '',
  sim_operator    text         NOT NULL DEFAULT '',
  ulangan         boolean      NOT NULL DEFAULT false,
  ulangan_vaqt    timestamptz,
  oxirgi_faollik  timestamptz
);

CREATE TABLE IF NOT EXISTS sms_queue (
  id               bigserial     PRIMARY KEY,
  tenant_id        uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  buyurtma_id      bigint        REFERENCES buyurtmalar(id) ON DELETE SET NULL,
  telefon          text          NOT NULL,
  xabar            text          NOT NULL,
  status           text          NOT NULL DEFAULT 'kutmoqda',
  xato_sababi      text,
  yaratilgan_vaqt  timestamptz   NOT NULL DEFAULT now(),
  yuborilgan_vaqt  timestamptz
);

ALTER TABLE sms_queue DROP CONSTRAINT IF EXISTS sms_queue_status_check;
ALTER TABLE sms_queue ADD CONSTRAINT sms_queue_status_check
  CHECK (status IN ('kutmoqda', 'yuborildi', 'xato'));

CREATE INDEX IF NOT EXISTS idx_sms_queue_tenant_status ON sms_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_buyurtma ON sms_queue(buyurtma_id);
```

- [ ] **Step 2: Apply the migration against the local database**

Run (from `gilam-app/server/`):
```bash
cd "gilam-app/server"
npm run migrate
```
Expected output ends with:
```
[migrate] schema.sql qo'llanmoqda...
✅ Migratsiya tugadi.
```

- [ ] **Step 3: Verify the new tables/column exist**

```bash
node -e "
import('pg').then(async ({default: pg}) => {
  const client = new pg.Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/gilam' });
  await client.connect();
  const cols = await client.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='tenants' AND column_name='sms_shablon'\");
  const t1 = await client.query(\"SELECT to_regclass('public.sms_telefon') AS t\");
  const t2 = await client.query(\"SELECT to_regclass('public.sms_queue') AS t\");
  console.log('tenants.sms_shablon:', cols.rows.length === 1 ? 'OK' : 'MISSING');
  console.log('sms_telefon table:', t1.rows[0].t ? 'OK' : 'MISSING');
  console.log('sms_queue table:', t2.rows[0].t ? 'OK' : 'MISSING');
  await client.end();
});
"
```
Expected: all three lines print `OK`.

- [ ] **Step 4: Commit**

```bash
cd "gilam-app"
git add server/schema.sql
git commit -m "feat(sms): sms_telefon va sms_queue jadvallari, tenants.sms_shablon ustuni"
```

---

## Task 2: `smsGateway.js` — code/token helpers, template rendering, `enqueueSms`, gateway auth

**Files:**
- Create: `gilam-app/server/src/smsGateway.js`

**Interfaces:**
- Consumes: `query` from `./db.js` (existing, `query(text, params) → Promise<{rows}>`).
- Produces: `generateKod() → string` (6 digits), `generateToken() → string` (48-hex-char random), `renderShablon(shablon, order) → string`, `enqueueSms(tenantId, order) → Promise<void>` where `order` has `{id, raqam, mijoz_ismi, telefon}`, `requireGateway(req, res, next)` Express middleware that sets `req.gatewayPhone = {id, tenant_id}`. Task 3 imports all five from this file.

- [ ] **Step 1: Write `smsGateway.js`**

```js
// smsGateway.js — SMS gateway (SIM kartali telefon) uchun yordamchi funksiyalar:
// ulanish kodi/tokeni, shablon to'ldirish, navbatga qo'yish, gateway auth.
import crypto from 'node:crypto';
import { query } from './db.js';

const KOD_MUDDATI_DAQIQA = 10;

export function generateKod() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Shablondagi {ism} va {id} o'rniga buyurtma ma'lumotini qo'yadi
export function renderShablon(shablon, order) {
  return String(shablon || '')
    .replaceAll('{ism}', order.mijoz_ismi || '')
    .replaceAll('{id}', String(order.raqam ?? order.id));
}

export function kodMuddatiVaqti() {
  return new Date(Date.now() + KOD_MUDDATI_DAQIQA * 60 * 1000);
}

// Buyurtma "dostavka"ga o'tganda chaqiriladi. Tenant uchun shablon va
// ulangan telefon bo'lsagina navbatga qo'shadi. Bir buyurtma uchun
// faol (kutmoqda/yuborildi) qator bo'lsa — qayta qo'shmaydi.
export async function enqueueSms(tenantId, order) {
  if (!order?.telefon) return;

  const { rows: trows } = await query(
    'SELECT sms_shablon FROM tenants WHERE id = $1', [tenantId]
  );
  const shablon = trows[0]?.sms_shablon;
  if (!shablon) return;

  const { rows: prows } = await query(
    'SELECT ulangan FROM sms_telefon WHERE tenant_id = $1', [tenantId]
  );
  if (!prows[0]?.ulangan) return;

  const { rows: existing } = await query(
    `SELECT id FROM sms_queue
     WHERE buyurtma_id = $1 AND status IN ('kutmoqda', 'yuborildi')`,
    [order.id]
  );
  if (existing.length > 0) return;

  await query(
    `INSERT INTO sms_queue (tenant_id, buyurtma_id, telefon, xabar)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, order.id, order.telefon, renderShablon(shablon, order)]
  );
}

// Gateway (telefon) so'rovlarini tekshiradi — Authorization: Bearer <token>,
// sms_telefon.token bilan solishtiradi (xodim JWT emas, oddiy random token —
// "Uzish" bosilganda token NULL qilinib darhol bekor bo'ladi).
export async function requireGateway(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Gateway token talab qilinadi' });

    const { rows } = await query(
      'SELECT id, tenant_id FROM sms_telefon WHERE token = $1 AND ulangan = true',
      [token]
    );
    const telefon = rows[0];
    if (!telefon) return res.status(401).json({ error: 'Gateway token yaroqsiz' });

    req.gatewayPhone = telefon;
    next();
  } catch (err) {
    console.error('[sms/requireGateway]', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
}
```

- [ ] **Step 2: Verify `enqueueSms` and `renderShablon` against the local DB**

This uses the real `default` tenant. It temporarily sets a template + fake "connected" phone, inserts a throwaway test order, checks the queue row appears with correctly substituted text, then cleans everything up.

```bash
cd "gilam-app/server"
node -e "
import('./src/smsGateway.js').then(async ({ enqueueSms, renderShablon }) => {
  const { query, pool } = await import('./src/db.js');
  process.env.DATABASE_URL ||= 'postgres://postgres:postgres@localhost:5432/gilam';

  const { rows: [tenant] } = await query(\"SELECT id FROM tenants WHERE slug='default'\");

  // vaqtinchalik shablon + 'ulangan' telefon holatini o'rnatamiz
  const { rows: [oldTenant] } = await query('SELECT sms_shablon FROM tenants WHERE id=\$1', [tenant.id]);
  await query(\"UPDATE tenants SET sms_shablon='Salom {ism}, #{id} tayyor' WHERE id=\$1\", [tenant.id]);
  await query(
    \`INSERT INTO sms_telefon (tenant_id, ulangan) VALUES (\$1, true)
     ON CONFLICT (tenant_id) DO UPDATE SET ulangan = true\`,
    [tenant.id]
  );

  console.log('renderShablon:', renderShablon('Salom {ism}, #{id} tayyor', { mijoz_ismi: 'Aziz', raqam: 42, id: 1 }));

  const fakeOrder = { id: -1, raqam: 42, mijoz_ismi: 'Test Mijoz', telefon: '+998900000000' };
  await enqueueSms(tenant.id, fakeOrder);
  const { rows } = await query(\"SELECT xabar, status FROM sms_queue WHERE buyurtma_id=-1\");
  console.log('queue row:', rows[0]);

  // ikkinchi marta chaqirsak — takrorlanmasligi kerak
  await enqueueSms(tenant.id, fakeOrder);
  const { rows: rows2 } = await query(\"SELECT count(*)::int AS n FROM sms_queue WHERE buyurtma_id=-1\");
  console.log('takrorlanmadi (n===1 bo\'lishi kerak):', rows2[0].n);

  // tozalash
  await query(\"DELETE FROM sms_queue WHERE buyurtma_id=-1\");
  await query('UPDATE tenants SET sms_shablon=\$1 WHERE id=\$2', [oldTenant.sms_shablon, tenant.id]);
  await query(\"UPDATE sms_telefon SET ulangan=false WHERE tenant_id=\$1\", [tenant.id]);
  await pool.end();
});
"
```
Expected output:
```
renderShablon: Salom Aziz, #42 tayyor
queue row: { xabar: 'Salom Test Mijoz, #42 tayyor', status: 'kutmoqda' }
takrorlanmadi (n===1 bo'lishi kerak): 1
```

- [ ] **Step 3: Commit**

```bash
git add src/smsGateway.js
git commit -m "feat(sms): smsGateway.js — kod/token, shablon render, enqueueSms, gateway auth"
```

---

## Task 3: `routes/sms.js` — Owner endpoints + gateway endpoints

**Files:**
- Create: `gilam-app/server/src/routes/sms.js`

**Interfaces:**
- Consumes: `query` from `../db.js`; `requireAuth, requireTenant, requireRole` from `../auth.js`; `generateKod, generateToken, kodMuddatiVaqti, renderShablon, requireGateway` from `../smsGateway.js` (all as defined in Task 2).
- Produces: default-exported Express `Router` with routes `GET/PUT /template`, `GET/POST/DELETE /phone`, `GET /queue`, `POST /send`, `POST /send-all`, `POST /gateway/connect`, `GET /gateway/queue`, `POST /gateway/confirm`. Task 4 imports this router and mounts it at `/api/sms`.

- [ ] **Step 1: Write `routes/sms.js`**

```js
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireTenant, requireRole } from '../auth.js';
import {
  generateKod, generateToken, kodMuddatiVaqti, renderShablon, requireGateway,
} from '../smsGateway.js';

const router = Router();

// ── Owner-only ─────────────────────────────────────────
const owner = Router();
owner.use(requireAuth, requireTenant, requireRole('Owner'));

owner.get('/template', async (req, res) => {
  try {
    const { rows } = await query('SELECT sms_shablon FROM tenants WHERE id = $1', [req.user.tenant_id]);
    res.json({ shablon: rows[0]?.sms_shablon || '' });
  } catch (err) {
    console.error('[sms/template/get]', err.message);
    res.status(500).json({ error: "Shablonni yuklab bo'lmadi" });
  }
});

owner.put('/template', async (req, res) => {
  try {
    const { shablon } = req.body || {};
    if (!shablon || !String(shablon).trim()) {
      return res.status(400).json({ error: 'Shablon matni talab qilinadi' });
    }
    await query('UPDATE tenants SET sms_shablon = $1 WHERE id = $2', [shablon, req.user.tenant_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[sms/template/put]', err.message);
    res.status(500).json({ error: "Shablonni saqlab bo'lmadi" });
  }
});

owner.get('/phone', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ulangan, qurilma_nomi, sim_operator, ulangan_vaqt, oxirgi_faollik
       FROM sms_telefon WHERE tenant_id = $1`,
      [req.user.tenant_id]
    );
    res.json(rows[0] || { ulangan: false });
  } catch (err) {
    console.error('[sms/phone/get]', err.message);
    res.status(500).json({ error: "Telefon holatini yuklab bo'lmadi" });
  }
});

owner.post('/phone/code', async (req, res) => {
  try {
    const kod = generateKod();
    const muddat = kodMuddatiVaqti();
    await query(
      `INSERT INTO sms_telefon (tenant_id, kod, kod_muddati, ulangan)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (tenant_id) DO UPDATE
         SET kod = $2, kod_muddati = $3, ulangan = false, token = NULL`,
      [req.user.tenant_id, kod, muddat]
    );
    const apiUrl = `${req.protocol}://${req.get('host')}/api`;
    res.json({ kod, apiUrl });
  } catch (err) {
    console.error('[sms/phone/code]', err.message);
    res.status(500).json({ error: "Kod yaratib bo'lmadi" });
  }
});

owner.delete('/phone', async (req, res) => {
  try {
    await query(
      `UPDATE sms_telefon SET ulangan = false, token = NULL, kod = NULL, kod_muddati = NULL
       WHERE tenant_id = $1`,
      [req.user.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[sms/phone/delete]', err.message);
    res.status(500).json({ error: "Uzib bo'lmadi" });
  }
});

owner.get('/queue', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.id AS buyurtma_id, COALESCE(b.raqam, b.id) AS raqam,
              b.mijoz_ismi, b.telefon,
              s.id AS sms_id, s.status AS sms_status, s.xato_sababi
       FROM buyurtmalar b
       LEFT JOIN LATERAL (
         SELECT id, status, xato_sababi FROM sms_queue
         WHERE buyurtma_id = b.id ORDER BY yaratilgan_vaqt DESC LIMIT 1
       ) s ON true
       WHERE b.tenant_id = $1 AND b.status = 'dostavka'
       ORDER BY b.id DESC`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[sms/queue]', err.message);
    res.status(500).json({ error: "Ro'yxatni yuklab bo'lmadi" });
  }
});

owner.post('/send', async (req, res) => {
  try {
    const { buyurtma_id } = req.body || {};
    const { rows } = await query(
      `SELECT id, COALESCE(raqam, id) AS raqam, mijoz_ismi, telefon
       FROM buyurtmalar WHERE id = $1 AND tenant_id = $2 AND status = 'dostavka'`,
      [buyurtma_id, req.user.tenant_id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    if (!order.telefon) return res.status(400).json({ error: "Buyurtmada telefon raqami yo'q" });

    const { rows: trows } = await query('SELECT sms_shablon FROM tenants WHERE id = $1', [req.user.tenant_id]);
    const shablon = trows[0]?.sms_shablon;
    if (!shablon) return res.status(400).json({ error: 'SMS shabloni sozlanmagan' });

    const { rows: activeRows } = await query(
      `SELECT id FROM sms_queue WHERE buyurtma_id = $1 AND status IN ('kutmoqda','yuborildi')`,
      [order.id]
    );
    if (activeRows.length > 0) return res.json({ ok: true });

    await query(
      `INSERT INTO sms_queue (tenant_id, buyurtma_id, telefon, xabar)
       VALUES ($1, $2, $3, $4)`,
      [req.user.tenant_id, order.id, order.telefon, renderShablon(shablon, order)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[sms/send]', err.message);
    res.status(500).json({ error: "Navbatga qo'yib bo'lmadi" });
  }
});

owner.post('/send-all', async (req, res) => {
  try {
    const { rows: trows } = await query('SELECT sms_shablon FROM tenants WHERE id = $1', [req.user.tenant_id]);
    const shablon = trows[0]?.sms_shablon;
    if (!shablon) return res.status(400).json({ error: 'SMS shabloni sozlanmagan' });

    const { rows: orders } = await query(
      `SELECT b.id, COALESCE(b.raqam, b.id) AS raqam, b.mijoz_ismi, b.telefon
       FROM buyurtmalar b
       WHERE b.tenant_id = $1 AND b.status = 'dostavka' AND b.telefon <> ''
         AND NOT EXISTS (
           SELECT 1 FROM sms_queue s
           WHERE s.buyurtma_id = b.id AND s.status IN ('kutmoqda','yuborildi')
         )`,
      [req.user.tenant_id]
    );

    for (const order of orders) {
      await query(
        `INSERT INTO sms_queue (tenant_id, buyurtma_id, telefon, xabar) VALUES ($1,$2,$3,$4)`,
        [req.user.tenant_id, order.id, order.telefon, renderShablon(shablon, order)]
      );
    }
    res.json({ ok: true, soni: orders.length });
  } catch (err) {
    console.error('[sms/send-all]', err.message);
    res.status(500).json({ error: "Navbatga qo'yib bo'lmadi" });
  }
});

router.use(owner);

// ── Gateway-only (telefon), xodim JWT emas ─────────────
const gateway = Router();

gateway.post('/gateway/connect', async (req, res) => {
  try {
    const { kod, qurilma_nomi, sim_operator } = req.body || {};
    if (!kod) return res.status(400).json({ error: 'Kod talab qilinadi' });

    const { rows } = await query(
      `SELECT tenant_id FROM sms_telefon WHERE kod = $1 AND kod_muddati > now()`,
      [String(kod).trim()]
    );
    const row = rows[0];
    if (!row) return res.status(400).json({ error: "Kod yaroqsiz yoki muddati tugagan" });

    const token = generateToken();
    await query(
      `UPDATE sms_telefon
       SET token = $1, ulangan = true, ulangan_vaqt = now(), oxirgi_faollik = now(),
           qurilma_nomi = $2, sim_operator = $3, kod = NULL, kod_muddati = NULL
       WHERE tenant_id = $4`,
      [token, qurilma_nomi || '', sim_operator || '', row.tenant_id]
    );
    res.json({ token });
  } catch (err) {
    console.error('[sms/gateway/connect]', err.message);
    res.status(500).json({ error: "Ulanib bo'lmadi" });
  }
});

gateway.get('/gateway/queue', requireGateway, async (req, res) => {
  try {
    await query('UPDATE sms_telefon SET oxirgi_faollik = now() WHERE id = $1', [req.gatewayPhone.id]);
    const { rows } = await query(
      `SELECT id, telefon, xabar FROM sms_queue
       WHERE tenant_id = $1 AND status = 'kutmoqda'
       ORDER BY yaratilgan_vaqt ASC LIMIT 20`,
      [req.gatewayPhone.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[sms/gateway/queue]', err.message);
    res.status(500).json({ error: "Navbatni yuklab bo'lmadi" });
  }
});

gateway.post('/gateway/confirm', requireGateway, async (req, res) => {
  try {
    const { id, status, xato_sababi } = req.body || {};
    if (!['yuborildi', 'xato'].includes(status)) {
      return res.status(400).json({ error: "Noto'g'ri status" });
    }
    const { rowCount } = await query(
      `UPDATE sms_queue
       SET status = $1, xato_sababi = $2,
           yuborilgan_vaqt = CASE WHEN $1 = 'yuborildi' THEN now() ELSE yuborilgan_vaqt END
       WHERE id = $3 AND tenant_id = $4`,
      [status, xato_sababi || null, id, req.gatewayPhone.tenant_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[sms/gateway/confirm]', err.message);
    res.status(500).json({ error: "Yangilab bo'lmadi" });
  }
});

router.use(gateway);

export default router;
```

- [ ] **Step 2: Sanity-check the file loads without syntax errors**

```bash
cd "gilam-app/server"
node --check src/routes/sms.js
```
Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add src/routes/sms.js
git commit -m "feat(sms): /api/sms Owner va gateway endpointlari"
```

---

## Task 4: Mount the route + auto-enqueue on "dostavka"

**Files:**
- Modify: `gilam-app/server/src/index.js`
- Modify: `gilam-app/server/src/routes/orders.js`

**Interfaces:**
- Consumes: default export from `./routes/sms.js` (Task 3); `enqueueSms` from `../smsGateway.js` (Task 2).

- [ ] **Step 1: Mount the router in `index.js`**

In `gilam-app/server/src/index.js`, add the import next to the other route imports (after line 16, `import deviceRoutes from './routes/devices.js';`):

```js
import smsRoutes from './routes/sms.js';
```

And add the mount line next to the other `app.use('/api/...')` lines (after line 43, `app.use('/api/devices', deviceRoutes);`):

```js
app.use('/api/sms', smsRoutes);
```

- [ ] **Step 2: Auto-enqueue in `routes/orders.js`**

Add the import at the top of `gilam-app/server/src/routes/orders.js` (after line 7, `import { normalizeBuyurtmaTel } from '../telefon.js';`):

```js
import { enqueueSms } from '../smsGateway.js';
```

Replace the status-change block inside the `PATCH /:id` handler (currently):

```js
    // Status o'zgargan bo'lsa — rol-asosli bildirishnoma
    if ('status' in changes) {
      notifyOrderStatus(req.user.tenant_id, req.params.id, changes.status).catch(() => {});
    }
```

with:

```js
    // Status o'zgargan bo'lsa — rol-asosli bildirishnoma
    if ('status' in changes) {
      notifyOrderStatus(req.user.tenant_id, req.params.id, changes.status).catch(() => {});
      // "dostavka"ga o'tganda — mijozga SMS navbatga qo'yiladi (agar ulangan bo'lsa)
      if (changes.status === 'dostavka') {
        query(
          `SELECT id, COALESCE(raqam, id) AS raqam, mijoz_ismi, telefon
           FROM buyurtmalar WHERE id = $1 AND tenant_id = $2`,
          [req.params.id, req.user.tenant_id]
        ).then(({ rows }) => rows[0] && enqueueSms(req.user.tenant_id, rows[0]))
         .catch((e) => console.warn('[orders/enqueueSms]', e.message));
      }
    }
```

- [ ] **Step 3: Verify both files still parse**

```bash
cd "gilam-app/server"
node --check src/index.js
node --check src/routes/orders.js
```
Expected: no output from either command.

- [ ] **Step 4: Commit**

```bash
git add src/index.js src/routes/orders.js
git commit -m "feat(sms): /api/sms marshrutini ulash, dostavkaga o'tganda avtomatik SMS navbat"
```

---

## Task 5: End-to-end backend verification (curl, real local server)

**Files:** none (verification only).

**Interfaces:** Exercises every endpoint from Task 3 end-to-end against the real local Postgres + a running local server.

- [ ] **Step 1: Start the backend server in the background**

```bash
cd "gilam-app/server"
npm run dev > /tmp/gilam-server.log 2>&1 &
sleep 2
curl -s http://localhost:3000/api/health
```
Expected: `{"ok":true}`

- [ ] **Step 2: Create a temporary Owner test account (cleaned up in Step 8)**

```bash
cd "gilam-app/server"
node -e "
import('bcryptjs').then(async ({default: bcrypt}) => {
  const { query, pool } = await import('./src/db.js');
  const hash = await bcrypt.hash('test12345', 10);
  const { rows: [tenant] } = await query(\"SELECT id FROM tenants WHERE slug='default'\");
  const { rows: [xodim] } = await query(
    \`INSERT INTO xodimlar (tenant_id, ism, login, parol_hash, rol)
     VALUES (\$1, 'SMS Test Owner', 'sms_test_owner', \$2, 'Owner')
     RETURNING id\`,
    [tenant.id, hash]
  );
  console.log('xodim_id=' + xodim.id);
  await pool.end();
});
"
```
Note the printed `xodim_id` for cleanup later.

- [ ] **Step 3: Log in as the temp Owner and capture the token**

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"sms_test_owner","parol":"test12345","slug":"default"}')
TOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "$RESPONSE")
echo "TOKEN=${TOKEN:0:20}..."
```
Expected: a non-empty token prefix printed (JWT starts with `eyJ`).

- [ ] **Step 4: Set the SMS template and request a pairing code**

```bash
curl -s -X PUT http://localhost:3000/api/sms/template \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"shablon":"Hurmatli {ism}, buyurtma #{id} tayyor."}'

CODE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sms/phone/code -H "Authorization: Bearer $TOKEN")
echo "$CODE_RESPONSE"
KOD=$(node -e "console.log(JSON.parse(process.argv[1]).kod)" "$CODE_RESPONSE")
echo "KOD=$KOD"
```
Expected: `{"ok":true}` then a JSON object like `{"kod":"482913","apiUrl":"http://localhost:3000/api"}`.

- [ ] **Step 5: Pair the "gateway" (simulating the phone) and confirm phone status**

```bash
GATEWAY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sms/gateway/connect \
  -H "Content-Type: application/json" \
  -d "{\"kod\":\"$KOD\",\"qurilma_nomi\":\"Test Redmi\",\"sim_operator\":\"Ucell\"}")
echo "$GATEWAY_RESPONSE"
GTOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "$GATEWAY_RESPONSE")

curl -s http://localhost:3000/api/sms/phone -H "Authorization: Bearer $TOKEN"
```
Expected: `gateway/connect` returns `{"token":"<hex>"}`; `/api/sms/phone` returns `{"ulangan":true,"qurilma_nomi":"Test Redmi","sim_operator":"Ucell",...}`.

- [ ] **Step 6: Create a test order and move it to "dostavka" — verify auto-enqueue**

```bash
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mijozIsmi":"SMS Test Mijoz","telefon":"+998901112233","manzil":"Test"}')
ORDER_ID=$(node -e "console.log(JSON.parse(process.argv[1]).id)" "$ORDER_RESPONSE")
echo "ORDER_ID=$ORDER_ID"

curl -s -X PATCH http://localhost:3000/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"dostavka"}'

sleep 1
curl -s http://localhost:3000/api/sms/queue -H "Authorization: Bearer $TOKEN"
```
Expected: the queue list includes an entry for `ORDER_ID` with `"sms_status":"kutmoqda"` and the message text containing "SMS Test Mijoz".

- [ ] **Step 7: Gateway fetches the queue and confirms delivery — verify status flips**

```bash
QUEUE_RESPONSE=$(curl -s http://localhost:3000/api/sms/gateway/queue -H "Authorization: Bearer $GTOKEN")
echo "$QUEUE_RESPONSE"
SMS_ID=$(node -e "console.log(JSON.parse(process.argv[1])[0].id)" "$QUEUE_RESPONSE")

curl -s -X POST http://localhost:3000/api/sms/gateway/confirm \
  -H "Authorization: Bearer $GTOKEN" -H "Content-Type: application/json" \
  -d "{\"id\":$SMS_ID,\"status\":\"yuborildi\"}"

curl -s http://localhost:3000/api/sms/queue -H "Authorization: Bearer $TOKEN"
```
Expected: `gateway/queue` returns one item; `confirm` returns `{"ok":true}`; the final `/api/sms/queue` call shows `"sms_status":"yuborildi"` for that order.

- [ ] **Step 8: Clean up — disconnect phone, delete test order, delete test employee, stop server**

```bash
curl -s -X DELETE http://localhost:3000/api/sms/phone -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE http://localhost:3000/api/orders/$ORDER_ID -H "Authorization: Bearer $TOKEN"

node -e "
import('./src/db.js').then(async ({ query, pool }) => {
  await query(\"DELETE FROM xodimlar WHERE login='sms_test_owner'\");
  await query(\"DELETE FROM sms_queue WHERE telefon='+998901112233'\");
  await pool.end();
});
"

kill %1 2>/dev/null || true
```

- [ ] **Step 9: No commit for this task** (verification only, nothing to stage — the working tree should be clean of test data at this point: `git status --short` should show no unexpected changes).

---

## Task 6: `api.js` — export `getApiBase()`

**Files:**
- Modify: `gilam-app/src/lib/api.js`

**Interfaces:**
- Produces: `getApiBase() → string` (the same `BASE` the client already sends requests to). Task 8 (`Sms.jsx`) uses this to build the QR payload.

- [ ] **Step 1: Add the export**

In `gilam-app/src/lib/api.js`, after the line `const BASE = import.meta.env.VITE_API_URL || '/api';`, add:

```js
export function getApiBase() {
  return BASE;
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd "gilam-app"
node --check src/lib/api.js
```
Note: this file uses `import.meta.env` (Vite-only syntax), so `node --check` will actually fail on that line — that's expected and unrelated to this change. Instead verify with the project's own linter:
```bash
npx eslint src/lib/api.js
```
Expected: no errors reported for `api.js`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat(sms): api.js'da getApiBase() eksport qilindi"
```

---

## Task 7: `services/sms.js` — API wrapper

**Files:**
- Create: `gilam-app/src/services/sms.js`

**Interfaces:**
- Consumes: `api` from `../lib/api.js` (existing `{get, post, put, patch, del}`).
- Produces: `getTemplate, saveTemplate, getPhoneStatus, requestConnectCode, disconnectPhone, getSmsQueue, sendOne, sendAll` — all imported by `Sms.jsx` in Task 8.

- [ ] **Step 1: Write the file**

```js
import { api } from '../lib/api';

export const getTemplate        = () => api.get('/sms/template');
export const saveTemplate       = (shablon) => api.put('/sms/template', { shablon });
export const getPhoneStatus     = () => api.get('/sms/phone');
export const requestConnectCode = () => api.post('/sms/phone/code');
export const disconnectPhone    = () => api.del('/sms/phone');
export const getSmsQueue        = () => api.get('/sms/queue');
export const sendOne            = (buyurtmaId) => api.post('/sms/send', { buyurtma_id: buyurtmaId });
export const sendAll            = () => api.post('/sms/send-all');
```

- [ ] **Step 2: Lint check**

```bash
cd "gilam-app"
npx eslint src/services/sms.js
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/sms.js
git commit -m "feat(sms): services/sms.js — API wrapper"
```

---

## Task 8: `pages/Sms.jsx` + `qrcode` dependency

**Files:**
- Modify: `gilam-app/package.json` (add `qrcode` dependency)
- Create: `gilam-app/src/pages/Sms.jsx`

**Interfaces:**
- Consumes: everything from `../services/sms.js` (Task 7), `getApiBase` is NOT needed here directly (the server itself returns `apiUrl` in the `/phone/code` response — see Task 3), `useTheme` from `../context/ThemeContext` (existing).
- Produces: default-exported `Sms` React component. Task 9 imports it into `App.jsx`.

- [ ] **Step 1: Add the `qrcode` dependency**

In `gilam-app/package.json`, add to `"dependencies"` (alphabetically, after `"lucide-react"`):

```json
    "qrcode": "^1.5.4",
```

Then install:
```bash
cd "gilam-app"
npm install
```
Expected: `qrcode` appears in `node_modules/qrcode` and `package-lock.json`/`pnpm-lock.yaml` updates.

- [ ] **Step 2: Write `src/pages/Sms.jsx`**

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, QrCode, Send, Unplug } from 'lucide-react';
import QRCode from 'qrcode';
import { useTheme } from '../context/ThemeContext';
import {
  getTemplate, saveTemplate, getPhoneStatus, requestConnectCode,
  disconnectPhone, getSmsQueue, sendOne, sendAll,
} from '../services/sms';

const POLL_MS = 8000;

export default function Sms() {
  const { dark } = useTheme();

  const [phone, setPhone] = useState({ ulangan: false });
  const [queue, setQueue] = useState([]);
  const [shablon, setShablon] = useState('');
  const [shablonSaving, setShablonSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [kod, setKod] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [p, q] = await Promise.all([getPhoneStatus(), getSmsQueue()]);
      setPhone(p);
      setQueue(q);
    } catch (err) {
      console.error('[Sms] refresh:', err.message);
    }
  }, []);

  useEffect(() => {
    getTemplate().then((r) => setShablon(r?.shablon || '')).catch(() => {});
    refresh();
    pollRef.current = setInterval(refresh, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const openCodeModal = async () => {
    try {
      const { kod: yangiKod, apiUrl } = await requestConnectCode();
      setKod(yangiKod);
      const dataUrl = await QRCode.toDataURL(JSON.stringify({ url: apiUrl, kod: yangiKod }));
      setQrDataUrl(dataUrl);
      setModalOpen(true);
    } catch (err) {
      console.error('[Sms] kod:', err.message);
    }
  };

  const handleDisconnect = async () => {
    await disconnectPhone();
    refresh();
  };

  const handleSaveTemplate = async () => {
    setShablonSaving(true);
    try {
      await saveTemplate(shablon);
    } finally {
      setShablonSaving(false);
    }
  };

  const handleSendOne = async (buyurtmaId) => {
    setSendingId(buyurtmaId);
    try {
      await sendOne(buyurtmaId);
      await refresh();
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    await sendAll();
    await refresh();
  };

  const cardCls = `rounded-2xl p-4 mb-4 border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`;

  return (
    <div className="p-4">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className={phone.ulangan ? 'text-green-500' : 'text-gray-400'} />
            <div>
              <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                {phone.ulangan ? `Ulangan — ${phone.qurilma_nomi || 'Telefon'}` : 'Ulanmagan'}
              </div>
              {phone.ulangan && phone.sim_operator && (
                <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>SIM: {phone.sim_operator}</div>
              )}
            </div>
          </div>
          {phone.ulangan ? (
            <button onClick={handleDisconnect} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-100 text-red-600 text-xs font-bold active:scale-95">
              <Unplug size={14} /> Uzish
            </button>
          ) : (
            <button onClick={openCodeModal} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold active:scale-95">
              <QrCode size={14} /> Ulanish kodi
            </button>
          )}
        </div>
      </div>

      <div className={cardCls}>
        <div className={`text-xs font-bold uppercase mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>SMS xabari</div>
        <textarea
          value={shablon}
          onChange={(e) => setShablon(e.target.value)}
          rows={4}
          className={`w-full rounded-xl p-3 text-sm outline-none ${dark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}
        />
        <button
          onClick={handleSaveTemplate}
          disabled={shablonSaving}
          className="mt-2 w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold active:scale-95 disabled:opacity-50"
        >
          {shablonSaving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-bold uppercase ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Dostavka buyurtmalari</div>
        <button onClick={handleSendAll} className="text-xs font-bold text-blue-600 flex items-center gap-1">
          <Send size={12} /> Hammaga yuborish
        </button>
      </div>

      {queue.length === 0 ? (
        <div className={`text-center py-8 text-sm ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Dostavkada buyurtma yo'q</div>
      ) : (
        queue.map((o) => (
          <div key={o.buyurtma_id} className={`${cardCls} flex items-center justify-between`}>
            <div>
              <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>#{o.raqam} {o.mijoz_ismi}</div>
              <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{o.telefon}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${
                o.sms_status === 'yuborildi' ? 'text-green-500'
                  : o.sms_status === 'xato' ? 'text-red-500' : 'text-gray-400'
              }`}
              >
                {o.sms_status === 'yuborildi' ? '✓ Yuborildi' : o.sms_status === 'xato' ? '✗ Xato' : '● Yuborilmagan'}
              </span>
              {o.sms_status !== 'yuborildi' && (
                <button
                  onClick={() => handleSendOne(o.buyurtma_id)}
                  disabled={sendingId === o.buyurtma_id}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold active:scale-95 disabled:opacity-50"
                >
                  SMS
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6" onClick={() => setModalOpen(false)}>
          <div
            className={`rounded-2xl p-6 max-w-xs w-full text-center ${dark ? 'bg-gray-900' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-sm font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>
              Gateway ilovada skanerlang
            </p>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto mb-3 rounded-xl" />}
            <p className={`text-xs mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Yoki kodni qo'lda kiriting:</p>
            <div className={`text-2xl font-extrabold tracking-widest mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>{kod}</div>
            <button onClick={() => setModalOpen(false)} className={`w-full py-2 rounded-xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Lint check**

```bash
cd "gilam-app"
npx eslint src/pages/Sms.jsx
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json pnpm-lock.yaml src/pages/Sms.jsx
git commit -m "feat(sms): Sms.jsx sahifasi — telefon ulanish, shablon, dostavka navbati"
```

---

## Task 9: Wire the tab/route (Owner only)

**Files:**
- Modify: `gilam-app/src/utils/rollar.js`
- Modify: `gilam-app/src/components/Footer.jsx`
- Modify: `gilam-app/src/App.jsx`

**Interfaces:**
- Consumes: `Sms` default export from `../pages/Sms.jsx` (Task 8).

- [ ] **Step 1: Add `/sms` to Owner's allowed tabs**

In `gilam-app/src/utils/rollar.js`, change:
```js
  Owner:      ['/', '/qarz', '/tarix', '/otkaz', '/mijozlar', '/statistika', '/hisob'],
```
to:
```js
  Owner:      ['/', '/qarz', '/tarix', '/otkaz', '/mijozlar', '/statistika', '/hisob', '/sms'],
```

- [ ] **Step 2: Add the footer tab**

In `gilam-app/src/components/Footer.jsx`, change the import line:
```js
import { Tablet, HandCoins, Clock, Ban, Wallet, Users, BarChart3 } from 'lucide-react';
```
to:
```js
import { Tablet, HandCoins, Clock, Ban, Wallet, Users, BarChart3, MessageSquare } from 'lucide-react';
```

And add a new entry to `ALL_TABS` (after the `/hisob` entry):
```js
  { path: '/',           label: 'Buyurtmalar', icon: Tablet    },
  { path: '/qarz',       label: 'Qarz',        icon: HandCoins },
  { path: '/tarix',      label: 'Tarix',        icon: Clock     },
  { path: '/otkaz',      label: 'Otkaz',        icon: Ban       },
  { path: '/mijozlar',   label: 'Mijozlar',     icon: Users     },
  { path: '/statistika', label: 'Statistika',   icon: BarChart3 },
  { path: '/hisob',      label: 'Hisob',        icon: Wallet    },
  { path: '/sms',        label: 'SMS',          icon: MessageSquare },
```

- [ ] **Step 3: Add the route**

In `gilam-app/src/App.jsx`, add the import (after `import Hisob from './pages/Hisob';`):
```js
import Sms from './pages/Sms';
```

And add the route (after the existing Owner-only `/hisob` route):
```jsx
            {role === 'Owner' && (
              <Route path="/hisob"    element={<Hisob      orders={orders} />} />
            )}
            {role === 'Owner' && (
              <Route path="/sms"      element={<Sms />} />
            )}
```

- [ ] **Step 4: Lint check on all three files**

```bash
cd "gilam-app"
npx eslint src/utils/rollar.js src/components/Footer.jsx src/App.jsx
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/rollar.js src/components/Footer.jsx src/App.jsx
git commit -m "feat(sms): SMS bo'limi footer/route'ga ulandi (faqat Owner)"
```

---

## Task 10: Frontend build verification

**Files:** none (verification only).

- [ ] **Step 1: Full lint pass**

```bash
cd "gilam-app"
npm run lint
```
Expected: exits with no errors (warnings, if any pre-existed, are unrelated to this change — confirm no new errors mention `Sms.jsx`, `rollar.js`, `Footer.jsx`, `App.jsx`, `services/sms.js`, or `lib/api.js`).

- [ ] **Step 2: Production build**

```bash
npm run build
```
Expected: ends with a `dist/` build summary and exit code 0 (no TypeScript/JSX/import errors).

- [ ] **Step 3: Confirm the dev server serves the app (network-level sanity check)**

```bash
npm run dev > /tmp/gilam-client.log 2>&1 &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
kill %1 2>/dev/null || true
```
Expected: `200`.

Note: full interactive verification (log in as Owner, click the new SMS tab, request a code, see the QR render) requires a real browser session, which isn't available as an automated step here. Backend correctness for every one of these actions was already proven end-to-end with real HTTP calls in Task 5; this task confirms the frontend code compiles cleanly and the page is reachable. If a browser is available when this plan is executed, do a manual click-through as a bonus check (login as `sms_test_owner`/`test12345` if recreated temporarily, or any real Owner account) and note the result — but its absence does not block completion of this task.

- [ ] **Step 4: No commit for this task** (verification only).

---

## Task 11: Gateway app scaffold

**Files:**
- Create: `gilam-app/sms-gateway/package.json`
- Create: `gilam-app/sms-gateway/index.html`
- Create: `gilam-app/sms-gateway/style.css`

**Interfaces:**
- Produces: a runnable Vite project skeleton. Task 12 fills in `main.js`, which `index.html` already references.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "sms-gateway",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor/android": "^8.3.4",
    "@capacitor/cli": "^8.3.4",
    "@capacitor/core": "^8.3.4",
    "jsqr": "^1.4.0"
  },
  "devDependencies": {
    "vite": "^8.0.12"
  }
}
```

- [ ] **Step 2: `index.html`**

```html
<!doctype html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SMS Gateway</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <div id="app">
      <h1>SMS Gateway</h1>

      <div id="holat" class="holat holat-ulanmagan">Ulanmagan</div>

      <div id="ulanish-blok">
        <button id="skan-btn">📷 QR skanerlash</button>
        <video id="video" playsinline style="display:none; width:100%; border-radius:12px;"></video>
        <canvas id="canvas" style="display:none;"></canvas>

        <p class="yoki">yoki qo'lda kiriting:</p>
        <input id="url-input" placeholder="Server manzili (masalan http://192.168.1.5:3000/api)" />
        <input id="kod-input" placeholder="6 xonali kod" maxlength="6" />
        <button id="ulash-btn">Ulash</button>
      </div>

      <div id="ulangan-blok" style="display:none;">
        <p id="qurilma-info"></p>
        <button id="uzish-btn">Uzish</button>
        <div id="log"></div>
      </div>
    </div>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: `style.css`**

```css
body { font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 20px; }
.holat { padding: 10px; border-radius: 10px; margin-bottom: 16px; font-weight: 600; text-align: center; }
.holat-ulangan { background: #dcfce7; color: #166534; }
.holat-ulanmagan { background: #fee2e2; color: #991b1b; }
input, button { display: block; width: 100%; box-sizing: border-box; padding: 10px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ccc; font-size: 16px; }
button { background: #2563eb; color: white; border: none; font-weight: 600; cursor: pointer; }
.yoki { text-align: center; color: #888; font-size: 13px; }
#log { font-size: 12px; color: #666; margin-top: 10px; white-space: pre-wrap; }
```

- [ ] **Step 4: Install dependencies**

```bash
cd "gilam-app/sms-gateway"
npm install
```
Expected: `node_modules/` created, `package-lock.json` generated, no errors. (Task 12 adds `main.js` before this can actually run `npm run dev` successfully — Vite will 404 on the missing module until then, which is expected at this point.)

- [ ] **Step 5: Commit**

```bash
cd "gilam-app"
git add sms-gateway/package.json sms-gateway/package-lock.json sms-gateway/index.html sms-gateway/style.css
git commit -m "feat(sms-gateway): loyiha skeleti (Vite, index.html, style.css)"
```

---

## Task 12: Gateway app logic — pairing (code + QR scan), polling, confirm

**Files:**
- Create: `gilam-app/sms-gateway/main.js`

**Interfaces:**
- Consumes: DOM elements defined in `index.html` (Task 11) by id; `jsqr` npm package; `@capacitor/core`'s `registerPlugin`/`Capacitor` (used only when actually running inside the native wrapper from Task 13 — in a plain browser `Capacitor.isNativePlatform()` is `false` so the native call path is never taken).
- Produces: a working pairing + polling + confirm flow that talks to the exact `/api/sms/gateway/*` endpoints built in Task 3, already proven correct in Task 5.

- [ ] **Step 1: Write `main.js`**

```js
import jsQR from 'jsqr';
import { registerPlugin, Capacitor } from '@capacitor/core';

const SmsGatewayNative = registerPlugin('SmsGateway');

const holatEl = document.getElementById('holat');
const ulanishBlok = document.getElementById('ulanish-blok');
const ulanganBlok = document.getElementById('ulangan-blok');
const qurilmaInfo = document.getElementById('qurilma-info');
const logEl = document.getElementById('log');
const skanBtn = document.getElementById('skan-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const urlInput = document.getElementById('url-input');
const kodInput = document.getElementById('kod-input');
const ulashBtn = document.getElementById('ulash-btn');
const uzishBtn = document.getElementById('uzish-btn');

const STORAGE_KEY = 'sms_gateway_ulanish';
const POLL_MS = 5000;
let pollTimer = null;

function log(msg) {
  logEl.textContent = `${new Date().toLocaleTimeString()} — ${msg}\n` + logEl.textContent;
}

function saqlanganniOlish() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

function saqlash(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ulanganKorinish(data) {
  holatEl.textContent = 'Ulangan';
  holatEl.className = 'holat holat-ulangan';
  ulanishBlok.style.display = 'none';
  ulanganBlok.style.display = 'block';
  qurilmaInfo.textContent = data.url;
}

function ulanmaganKorinish() {
  holatEl.textContent = 'Ulanmagan';
  holatEl.className = 'holat holat-ulanmagan';
  ulanishBlok.style.display = 'block';
  ulanganBlok.style.display = 'none';
  if (pollTimer) clearInterval(pollTimer);
}

// Capacitor ichida — haqiqiy SmsManager. Oddiy brauzerda
// (Capacitor.isNativePlatform() === false) — simulyatsiya, lokal sinov uchun.
async function smsYubor(telefon, xabar) {
  if (Capacitor.isNativePlatform()) {
    return SmsGatewayNative.sendSms({ telefon, xabar });
  }
  console.warn('[gateway] SIMULATSIYA REJIMI — haqiqiy SMS yuborilmadi (brauzer)');
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true };
}

async function smsniYuborVaTasdiqla(saved, item) {
  let status = 'yuborildi';
  let xatoSababi = null;
  try {
    const natija = await smsYubor(item.telefon, item.xabar);
    if (!natija?.ok) throw new Error(natija?.error || "noma'lum xato");
    log(`SMS yuborildi: ${item.telefon}`);
  } catch (err) {
    status = 'xato';
    xatoSababi = err.message;
    log(`SMS xatosi (${item.telefon}): ${err.message}`);
  }

  try {
    await fetch(`${saved.url}/sms/gateway/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saved.token}` },
      body: JSON.stringify({ id: item.id, status, xato_sababi: xatoSababi }),
    });
  } catch (err) {
    log(`Tasdiqlash xatosi: ${err.message}`);
  }
}

async function navbatniOl(saved) {
  try {
    const res = await fetch(`${saved.url}/sms/gateway/queue`, {
      headers: { Authorization: `Bearer ${saved.token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    for (const item of items) {
      await smsniYuborVaTasdiqla(saved, item);
    }
  } catch (err) {
    log(`Navbat xatosi: ${err.message}`);
  }
}

function boshlaPolling(saved) {
  if (pollTimer) clearInterval(pollTimer);
  navbatniOl(saved);
  pollTimer = setInterval(() => navbatniOl(saved), POLL_MS);
}

async function ulash(url, kod) {
  try {
    const res = await fetch(`${url}/sms/gateway/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kod,
        qurilma_nomi: navigator.userAgent.includes('Android') ? 'Android telefon' : 'Brauzer',
        sim_operator: '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    const pairing = { url, token: data.token };
    saqlash(pairing);
    ulanganKorinish(pairing);
    log('Muvaffaqiyatli ulandi');
    boshlaPolling(pairing);
  } catch (err) {
    log(`Xato: ${err.message}`);
  }
}

ulashBtn.addEventListener('click', () => {
  const url = urlInput.value.trim().replace(/\/$/, '');
  const kod = kodInput.value.trim();
  if (!url || !kod) return log('Server manzili va kod talab qilinadi');
  ulash(url, kod);
});

uzishBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  ulanmaganKorinish();
});

// ── QR skanerlash (getUserMedia + jsQR — native plugin shart emas) ──
let skanStream = null;
let skanRAF = null;

async function skanBoshla() {
  try {
    skanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = skanStream;
    video.style.display = 'block';
    await video.play();
    skanFrame();
  } catch (err) {
    log(`Kamera xatosi: ${err.message}`);
  }
}

function skanToxtat() {
  if (skanRAF) cancelAnimationFrame(skanRAF);
  if (skanStream) skanStream.getTracks().forEach((t) => t.stop());
  video.style.display = 'none';
}

function skanFrame() {
  const ctx = canvas.getContext('2d');
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const natija = jsQR(imageData.data, imageData.width, imageData.height);
    if (natija) {
      skanToxtat();
      try {
        const { url, kod } = JSON.parse(natija.data);
        urlInput.value = url;
        kodInput.value = kod;
        ulash(url, kod);
      } catch {
        log('QR mazmuni tushunarsiz');
      }
      return;
    }
  }
  skanRAF = requestAnimationFrame(skanFrame);
}

skanBtn.addEventListener('click', skanBoshla);

// ── Ilova ochilganda — saqlangan ulanish bo'lsa avtomatik davom etamiz ──
const saqlanganUlanish = saqlanganniOlish();
if (saqlanganUlanish?.token) {
  ulanganKorinish(saqlanganUlanish);
  boshlaPolling(saqlanganUlanish);
} else {
  ulanmaganKorinish();
}
```

- [ ] **Step 2: Build verification (catches syntax/import errors without needing a browser)**

```bash
cd "gilam-app/sms-gateway"
npm run build
```
Expected: Vite bundles successfully into `dist/`, exit code 0. This proves `main.js` has no syntax errors and both `jsqr` and `@capacitor/core` resolve correctly — the one thing it does *not* prove is real camera/SMS behavior, which needs a physical phone (see Task 13).

- [ ] **Step 3: End-to-end pairing/polling verification against the real local backend**

This proves the exact fetch calls in `main.js` work against the real server (started the same way as Task 5), without needing a browser: run the dev server, then drive it with a headless `fetch` from Node using the same code paths.

```bash
cd "gilam-app/server"
npm run dev > /tmp/gilam-server.log 2>&1 &
sleep 2

# Yangi kod so'raymiz — bu safar Owner login orqali emas, to'g'ridan-to'g'ri DB orqali (tezroq)
node -e "
import('./src/db.js').then(async ({ query, pool }) => {
  const { rows: [tenant] } = await query(\"SELECT id FROM tenants WHERE slug='default'\");
  const kod = '135790';
  const muddat = new Date(Date.now() + 10*60*1000);
  await query(
    \`INSERT INTO sms_telefon (tenant_id, kod, kod_muddati, ulangan) VALUES (\$1,\$2,\$3,false)
     ON CONFLICT (tenant_id) DO UPDATE SET kod=\$2, kod_muddati=\$3, ulangan=false, token=NULL\`,
    [tenant.id, kod, muddat]
  );
  console.log('KOD=' + kod);
  await pool.end();
});
"

curl -s -X POST http://localhost:3000/api/sms/gateway/connect \
  -H "Content-Type: application/json" \
  -d '{"kod":"135790","qurilma_nomi":"Test","sim_operator":"Test"}'

node -e "
import('./src/db.js').then(async ({ query, pool }) => {
  const { rows: [tenant] } = await query(\"SELECT id FROM tenants WHERE slug='default'\");
  await query('UPDATE sms_telefon SET ulangan=false, token=NULL WHERE tenant_id=\$1', [tenant.id]);
  await pool.end();
});
"
kill %1 2>/dev/null || true
```
Expected: `gateway/connect` returns `{"token":"<64-char hex>"}` — the exact same call `ulash()` in `main.js` makes.

- [ ] **Step 4: Commit**

```bash
cd "gilam-app"
git add sms-gateway/main.js
git commit -m "feat(sms-gateway): ulanish (kod/QR), navbat polling, tasdiqlash oqimi"
```

---

## Task 13: Native Android plugin (manual build step for the user)

**Files:**
- Create: `gilam-app/sms-gateway/capacitor.config.ts`
- Create: `gilam-app/sms-gateway/android-plugin/SmsGatewayPlugin.java` (source to copy into the native project once generated)
- Create: `gilam-app/sms-gateway/android-plugin/README.md` (exact manual steps)

**Interfaces:**
- Produces: the Capacitor JS side already calls `registerPlugin('SmsGateway')` with a `sendSms({telefon, xabar}) → Promise<{ok}>` method (Task 12) — this plugin is the native implementation matching that exact contract.

- [ ] **Step 1: `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.gilam.smsgateway',
  appName: 'SMS Gateway',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
```

- [ ] **Step 2: `android-plugin/SmsGatewayPlugin.java`**

```java
package uz.gilam.smsgateway;

import android.telephony.SmsManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsGateway",
    permissions = {
        @Permission(strings = { android.Manifest.permission.SEND_SMS }, alias = "sms")
    }
)
public class SmsGatewayPlugin extends Plugin {

    @PluginMethod
    public void sendSms(PluginCall call) {
        String telefon = call.getString("telefon");
        String xabar = call.getString("xabar");
        if (telefon == null || xabar == null) {
            call.reject("telefon va xabar talab qilinadi");
            return;
        }

        if (getPermissionState("sms") != PermissionState.GRANTED) {
            saveCall(call);
            requestPermissionForAlias("sms", call, "smsPermsCallback");
            return;
        }

        doSend(call, telefon, xabar);
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        String telefon = call.getString("telefon");
        String xabar = call.getString("xabar");
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            doSend(call, telefon, xabar);
        } else {
            call.reject("SMS yuborish ruxsati berilmadi");
        }
    }

    private void doSend(PluginCall call, String telefon, String xabar) {
        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(telefon, null, xabar, null, null);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SMS yuborilmadi: " + e.getMessage());
        }
    }
}
```

- [ ] **Step 3: `android-plugin/README.md` — exact manual steps for the user**

```markdown
# Gateway ilovasini Android APK'ga aylantirish (qo'lda, Android Studio bilan)

Bu muhitda Android SDK yo'q, shuning uchun quyidagi qadamlarni o'zingiz
kompyuteringizda (Android SDK + Java o'rnatilgan) bajarishingiz kerak.

1. `cd sms-gateway && npm run build` — `dist/` papkasini yaratadi.
2. `npx cap add android` — `android/` native loyihasini yaratadi.
3. `npx cap sync android` — web build'ni va pluginlarni sinxronlaydi.
4. `SmsGatewayPlugin.java` faylini
   `android/app/src/main/java/uz/gilam/smsgateway/SmsGatewayPlugin.java`
   manziliga nusxalang (papkani shu paket nomi bilan yarating).
5. `android/app/src/main/java/uz/gilam/smsgateway/MainActivity.java` faylini
   quyidagicha tahrirlang (pluginni ro'yxatdan o'tkazish uchun):

   ```java
   package uz.gilam.smsgateway;

   import com.getcapacitor.BridgeActivity;

   public class MainActivity extends BridgeActivity {
       @Override
       public void onCreate(android.os.Bundle savedInstanceState) {
           registerPlugin(SmsGatewayPlugin.class);
           super.onCreate(savedInstanceState);
       }
   }
   ```

6. `android/app/src/main/AndroidManifest.xml` ichiga, `<manifest>` teganing
   ichiga (boshqa `<uses-permission>` qatorlari yoniga) qo'shing:

   ```xml
   <uses-permission android:name="android.permission.SEND_SMS" />
   <uses-permission android:name="android.permission.CAMERA" />
   ```

7. Android Studio'da `android/` papkasini oching, qurilmani ulang (yoki
   emulyator), Run tugmasini bosing. Ilova birinchi ochilganda SMS va
   kamera ruxsatlarini so'raydi — ikkalasiga ham ruxsat bering.
8. Sinash: Owner ilovasida SMS sahifasidan "Ulanish kodi"ni oching, shu
   telefonda QR skanerlang (yoki kodni qo'lda kiriting). Ulangandan so'ng,
   bir buyurtmani "dostavka"ga o'tkazib, real SMS kelishini tekshiring.
```

- [ ] **Step 4: Commit**

```bash
cd "gilam-app"
git add sms-gateway/capacitor.config.ts sms-gateway/android-plugin/
git commit -m "feat(sms-gateway): native SmsManager plugin manbasi + qo'lda build ko'rsatmasi"
```

---

## Self-Review Notes (completed during planning)

- **Spec coverage:** schema (Task 1), template storage/rendering (Tasks 2, 3, 8), phone pairing by code and QR (Tasks 3, 8, 12), auto-enqueue on `dostavka` (Task 4), manual send/send-all (Tasks 3, 8), Owner-only visibility (Task 9), gateway polling/confirm (Tasks 3, 12), native SMS send (Task 13), local-only testing emphasis (Tasks 5, 10, 12) — all spec sections from `docs/superpowers/specs/2026-07-23-sms-gateway-design.md` are covered.
- **Type/name consistency checked:** `enqueueSms(tenantId, order)` (Task 2) is called identically in Task 4's `orders.js` edit; `renderShablon(shablon, order)` (Task 2) is used with the same signature in Task 3's `/send` and `/send-all` handlers; the JSON field names returned by `/api/sms/queue` (`buyurtma_id, raqam, mijoz_ismi, telefon, sms_id, sms_status, xato_sababi`, Task 3) match exactly what `Sms.jsx` reads (Task 8); the QR/gateway-connect payload shape `{url, kod}` is produced identically by `Sms.jsx` (Task 8, via the server's `apiUrl`+`kod` response) and consumed identically by `main.js`'s `skanFrame()` (Task 12).
- **No placeholders remain** — every step above contains complete, runnable code or exact commands with expected output.
