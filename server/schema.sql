-- ================================================================
-- Gilam Servis — ko'p-mijozli (multi-tenant) PostgreSQL sxemasi
-- Sof PostgreSQL (Supabase'siz). Har bir mijoz (biznes) = tenant.
--
-- IDEMPOTENT: ham yangi o'rnatishda, ham mavjud (bir-mijozli) bazada
-- xavfsiz ishlaydi — mavjud data avtomatik "default" tenant'ga o'tadi.
--
-- Ishga tushirish:  npm run migrate
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() uchun


-- ── 1. TENANTS (mijozlar / bizneslar) ────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  nomi           text         NOT NULL DEFAULT '',
  slug           text         NOT NULL UNIQUE,
  bot_token      text                  DEFAULT '',
  bot_username   text                  DEFAULT '',
  status         text         NOT NULL DEFAULT 'active',
  reja           text         NOT NULL DEFAULT 'free',
  limit_buyurtma int                   DEFAULT NULL,   -- NULL = cheksiz
  limit_xodim    int                   DEFAULT NULL,   -- NULL = cheksiz
  expires_at     timestamptz           DEFAULT NULL,   -- NULL = muddatsiz
  created_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
  CHECK (status IN ('active', 'suspended'));

-- Har doim bitta "default" tenant bo'lsin (mavjud data shunga bog'lanadi)
INSERT INTO tenants (nomi, slug)
  VALUES ('Default', 'default')
  ON CONFLICT (slug) DO NOTHING;


-- ── 2. SUPER ADMINLAR (platforma egalari — tenantdan tashqari) ──

CREATE TABLE IF NOT EXISTS super_admins (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  ism         text         NOT NULL DEFAULT '',
  login       text         NOT NULL UNIQUE,
  parol_hash  text         NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now()
);


-- ── 3. XODIMLAR ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS xodimlar (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  ism          text         NOT NULL DEFAULT '',
  login        text         NOT NULL,
  parol_hash   text         NOT NULL,
  rol          text         NOT NULL DEFAULT 'Ishchi',
  telefon      text                  DEFAULT '',
  telegram_id  bigint,
  created_at   timestamptz  NOT NULL DEFAULT now()
);
-- tenant_id (mavjud bazaga qo'shish)
ALTER TABLE xodimlar ADD COLUMN IF NOT EXISTS telegram_id bigint;
ALTER TABLE xodimlar ADD COLUMN IF NOT EXISTS tenant_id uuid;


-- ── 4. BUYURTMALAR ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyurtmalar (
  id               bigserial      PRIMARY KEY,
  mijoz_ismi       text           NOT NULL DEFAULT '',
  telefon          text                    DEFAULT '',
  manzil           text                    DEFAULT '',
  izoh             text                    DEFAULT '',
  status           text           NOT NULL DEFAULT 'yangi',
  bosqich          jsonb          NOT NULL DEFAULT '{}',
  tovarlar         jsonb          NOT NULL DEFAULT '{}',
  narxlar          jsonb          NOT NULL DEFAULT '{}',
  umumiy_hisob     numeric(14,0)  NOT NULL DEFAULT 0,
  chegirma         numeric(14,0)  NOT NULL DEFAULT 0,
  yakuniy_summa    numeric(14,0)  NOT NULL DEFAULT 0,
  tolov            jsonb          NOT NULL DEFAULT '{}',
  qarz             numeric(14,0)  NOT NULL DEFAULT 0,
  otkaz_sababi     text                    DEFAULT '',
  lat              float8,
  lng              float8,
  yuvuvchi_id      uuid           REFERENCES xodimlar(id) ON DELETE SET NULL,
  yaratgan_id      uuid           REFERENCES xodimlar(id) ON DELETE SET NULL,
  yaratilgan_vaqt  timestamptz    NOT NULL DEFAULT now(),
  yangilangan_vaqt timestamptz    NOT NULL DEFAULT now()
);
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS tenant_id uuid;
-- Har bir status bosqichini kim bajarganligi: { zayavka, yuvilmoqda, pardozda, dastavka }
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS ijrochilar jsonb NOT NULL DEFAULT '{}';
-- Buyurtma tugagan (to'lov qilingan) aniq vaqt — statistika shu bo'yicha
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS tugatilgan_vaqt timestamptz;
-- Tahrir tarixi: ism/telefon/manzil o'zgarishlari [{maydon,eski,yangi,vaqt,muallif}]
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS tahrirlar jsonb NOT NULL DEFAULT '[]';
-- Buyurtma yuvilib bo'lgan (pardozda statusiga o'tgan) vaqt — yuvilgan hajm statistikasi uchun
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS yuvilgan_vaqt timestamptz;
-- Mijozning qo'shimcha telefon raqamlari ["+998...", ...]
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS qoshimcha_telefonlar jsonb NOT NULL DEFAULT '[]';

-- ── KORXONAGA XOS BUYURTMA RAQAMI ──
-- `id` — global kalit (izohlar/harakatlar unga bog'langan), o'zgarmaydi.
-- `raqam` — ekranda ko'rsatiladigan, HAR KORXONA uchun alohida sanaladigan raqam.
ALTER TABLE buyurtmalar ADD COLUMN IF NOT EXISTS raqam bigint;

-- Backfill (faqat bir marta, raqam bo'sh bo'lganlarga):
--  • 'default' (Musaffo) — eski raqamlar saqlanadi: raqam = id
--    (xodimlar yodda saqlagan raqamlar buzilmasin)
--  • boshqa korxonalar   — 1 dan qayta sanaladi
UPDATE buyurtmalar b SET raqam = b.id
  FROM tenants t
 WHERE t.id = b.tenant_id AND t.slug = 'default' AND b.raqam IS NULL;

UPDATE buyurtmalar b SET raqam = s.n
  FROM (
    SELECT b2.id, row_number() OVER (PARTITION BY b2.tenant_id ORDER BY b2.id) AS n
      FROM buyurtmalar b2
      JOIN tenants t2 ON t2.id = b2.tenant_id
     WHERE t2.slug <> 'default'
  ) s
 WHERE s.id = b.id AND b.raqam IS NULL;

-- Bir korxonada raqam takrorlanmasin (bir vaqtda kelgan buyurtmalardan himoya)
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyurtmalar_tenant_raqam
  ON buyurtmalar(tenant_id, raqam);
-- Mavjud tugagan buyurtmalarni backfill (yangilangan vaqtni taxminiy sana sifatida)
UPDATE buyurtmalar SET tugatilgan_vaqt = yangilangan_vaqt
  WHERE status = 'tugadi' AND tugatilgan_vaqt IS NULL;
-- Hozir pardozda turgan buyurtmalar: oxirgi yangilanish = pardozdaga o'tgan vaqt
UPDATE buyurtmalar SET yuvilgan_vaqt = yangilangan_vaqt
  WHERE status = 'qadoqlash' AND yuvilgan_vaqt IS NULL;


-- ── 5. IZOHLAR ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS izohlar (
  id           bigserial    PRIMARY KEY,
  buyurtma_id  bigint       NOT NULL REFERENCES buyurtmalar(id) ON DELETE CASCADE,
  matn         text         NOT NULL DEFAULT '',
  muallif_id   uuid         REFERENCES xodimlar(id) ON DELETE SET NULL,
  vaqt         timestamptz  NOT NULL DEFAULT now()
);
ALTER TABLE izohlar ADD COLUMN IF NOT EXISTS tenant_id uuid;
-- Rasmli izoh (base64 data URL saqlanadi)
ALTER TABLE izohlar ADD COLUMN IF NOT EXISTS rasm text;


-- ── 6. HARAKATLAR (faoliyat tarixi) ──────────────────────────

CREATE TABLE IF NOT EXISTS harakatlar (
  id           bigserial    PRIMARY KEY,
  buyurtma_id  bigint       NOT NULL REFERENCES buyurtmalar(id) ON DELETE CASCADE,
  amal         text         NOT NULL DEFAULT '',
  muallif_id   uuid         REFERENCES xodimlar(id) ON DELETE SET NULL,
  vaqt         timestamptz  NOT NULL DEFAULT now()
);
ALTER TABLE harakatlar ADD COLUMN IF NOT EXISTS tenant_id uuid;


-- ── 7. NARX SHABLONLARI ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS narx_shablonlari (
  id              bigserial     PRIMARY KEY,
  nomi            text          NOT NULL DEFAULT '',
  narx            numeric(14,0) NOT NULL DEFAULT 0,
  turi            text                   DEFAULT '',
  yaratilgan_vaqt timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE narx_shablonlari ADD COLUMN IF NOT EXISTS tenant_id uuid;


-- ── 7b. CHAT (olib tashlandi) ────────────────────────────────
-- Chat bo'limi ilovadan olib tashlandi — jadval va ma'lumotlari o'chiriladi.
-- Faqat chat jadvali tushadi, boshqa jadvallarga ta'sir qilmaydi.

DROP TABLE IF EXISTS chat_xabarlar;


-- ── 7c. QURILMA TOKENLARI (FCM push bildirishnomalar) ────────

CREATE TABLE IF NOT EXISTS qurilma_tokenlar (
  token       text         PRIMARY KEY,
  xodim_id    uuid         REFERENCES xodimlar(id) ON DELETE CASCADE,
  tenant_id   uuid         REFERENCES tenants(id) ON DELETE CASCADE,
  rol         text,
  yangilangan timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_token_tenant_rol ON qurilma_tokenlar(tenant_id, rol);


-- ================================================================
-- 8. BACKFILL — mavjud (tenant_id IS NULL) satrlarni default'ga
-- ================================================================

DO $$
DECLARE def_id uuid;
BEGIN
  SELECT id INTO def_id FROM tenants WHERE slug = 'default';

  UPDATE xodimlar         SET tenant_id = def_id WHERE tenant_id IS NULL;
  UPDATE buyurtmalar      SET tenant_id = def_id WHERE tenant_id IS NULL;
  UPDATE narx_shablonlari SET tenant_id = def_id WHERE tenant_id IS NULL;

  -- izohlar/harakatlar — buyurtma orqali (denormalizatsiya)
  UPDATE izohlar i    SET tenant_id = b.tenant_id
    FROM buyurtmalar b WHERE i.buyurtma_id = b.id AND i.tenant_id IS NULL;
  UPDATE harakatlar h SET tenant_id = b.tenant_id
    FROM buyurtmalar b WHERE h.buyurtma_id = b.id AND h.tenant_id IS NULL;
END $$;


-- ================================================================
-- 9. CHEKLOVLAR — tenant_id NOT NULL + FK + kompozit UNIQUE
-- ================================================================

-- Eski global UNIQUE(login) / UNIQUE(telegram_id) ni olib tashlaymiz
ALTER TABLE xodimlar DROP CONSTRAINT IF EXISTS xodimlar_login_key;
ALTER TABLE xodimlar DROP CONSTRAINT IF EXISTS xodimlar_telegram_id_key;
DROP INDEX IF EXISTS idx_xodimlar_telegram_id;

-- tenant_id NOT NULL
ALTER TABLE xodimlar         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE buyurtmalar      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE narx_shablonlari ALTER COLUMN tenant_id SET NOT NULL;

-- FK'lar (drop-then-add — idempotent)
ALTER TABLE xodimlar         DROP CONSTRAINT IF EXISTS xodimlar_tenant_fk;
ALTER TABLE xodimlar         ADD  CONSTRAINT xodimlar_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE buyurtmalar      DROP CONSTRAINT IF EXISTS buyurtmalar_tenant_fk;
ALTER TABLE buyurtmalar      ADD  CONSTRAINT buyurtmalar_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE narx_shablonlari DROP CONSTRAINT IF EXISTS narx_shablonlari_tenant_fk;
ALTER TABLE narx_shablonlari ADD  CONSTRAINT narx_shablonlari_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Kompozit UNIQUE: har tenant ichida login noyob
ALTER TABLE xodimlar DROP CONSTRAINT IF EXISTS xodimlar_tenant_login_key;
ALTER TABLE xodimlar ADD  CONSTRAINT xodimlar_tenant_login_key UNIQUE (tenant_id, login);

-- Kompozit partial UNIQUE: tenant ichida telegram_id noyob (NULL bundan mustasno)
CREATE UNIQUE INDEX IF NOT EXISTS idx_xodimlar_tenant_telegram
  ON xodimlar(tenant_id, telegram_id) WHERE telegram_id IS NOT NULL;


-- ── 10. STATUS CHEKLOVI ───────────────────────────────────────

ALTER TABLE buyurtmalar DROP CONSTRAINT IF EXISTS buyurtmalar_status_check;
ALTER TABLE buyurtmalar
  ADD CONSTRAINT buyurtmalar_status_check
  CHECK (status IN ('yangi', 'jarayonda', 'qadoqlash', 'dostavka', 'tugadi', 'otkaz'));


-- ── 11. INDEKSLAR (tenant bo'yicha) ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_tenant_status
  ON buyurtmalar(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_tenant_yangilangan
  ON buyurtmalar(tenant_id, yangilangan_vaqt DESC);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yuvuvchi_id
  ON buyurtmalar(yuvuvchi_id);
CREATE INDEX IF NOT EXISTS idx_xodimlar_tenant
  ON xodimlar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_izohlar_buyurtma_id
  ON izohlar(buyurtma_id);
CREATE INDEX IF NOT EXISTS idx_harakatlar_buyurtma_id
  ON harakatlar(buyurtma_id);
CREATE INDEX IF NOT EXISTS idx_narx_shablonlari_tenant
  ON narx_shablonlari(tenant_id);


-- ── 12. AUTO-TRIGGER: yangilangan_vaqt ───────────────────────

CREATE OR REPLACE FUNCTION set_yangilangan_vaqt()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.yangilangan_vaqt = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyurtmalar_yangilangan ON buyurtmalar;
CREATE TRIGGER trg_buyurtmalar_yangilangan
  BEFORE UPDATE ON buyurtmalar
  FOR EACH ROW EXECUTE FUNCTION set_yangilangan_vaqt();


-- ── 13. XARAJATLAR (kunlik sarf-harajatlar — Owner uchun) ─────
-- Har tenant + sana uchun bitta satr (upsert).

CREATE TABLE IF NOT EXISTS xarajatlar (
  id          bigserial     PRIMARY KEY,
  tenant_id   uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sana        date          NOT NULL,
  gaz         numeric(14,0) NOT NULL DEFAULT 0,
  obed        numeric(14,0) NOT NULL DEFAULT 0,
  ishchi      numeric(14,0) NOT NULL DEFAULT 0,
  boshqa      numeric(14,0) NOT NULL DEFAULT 0,
  izoh        text                    DEFAULT '',
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- Svet (elektr) xarajati — keyinroq qo'shilgan
ALTER TABLE xarajatlar ADD COLUMN IF NOT EXISTS svet numeric(14,0) NOT NULL DEFAULT 0;

ALTER TABLE xarajatlar DROP CONSTRAINT IF EXISTS xarajatlar_tenant_sana_key;
ALTER TABLE xarajatlar ADD  CONSTRAINT xarajatlar_tenant_sana_key UNIQUE (tenant_id, sana);

CREATE INDEX IF NOT EXISTS idx_xarajatlar_tenant_sana ON xarajatlar(tenant_id, sana);


-- ── OYLIKLAR (xodim maoshi — kunlik xarajatlardan alohida) ──
-- Har xodimga har oy uchun bitta yozuv. `oy` — oyning 1-kuni (2026-07-01).
CREATE TABLE IF NOT EXISTS oyliklar (
  id          bigserial     PRIMARY KEY,
  tenant_id   uuid          NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  xodim_id    uuid          NOT NULL REFERENCES xodimlar(id) ON DELETE CASCADE,
  oy          date          NOT NULL,
  summa       numeric(14,0) NOT NULL DEFAULT 0,
  izoh        text                    DEFAULT '',
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- Har to'lov ALOHIDA yozuv (log) bo'ladi: bitta xodimga bir oyda bir necha marta
-- to'lash mumkin (avans, qo'shimcha va h.k.), oylik = shu yozuvlar yig'indisi.
-- Shuning uchun (tenant, xodim, oy) noyobligi OLIB TASHLANDI. Mavjud yozuvlar
-- o'z holicha qoladi — har biri bitta to'lov sifatida hisoblanadi.
ALTER TABLE oyliklar DROP CONSTRAINT IF EXISTS oyliklar_tenant_xodim_oy_key;

CREATE INDEX IF NOT EXISTS idx_oyliklar_tenant_oy ON oyliklar(tenant_id, oy);
CREATE INDEX IF NOT EXISTS idx_oyliklar_xodim_oy  ON oyliklar(tenant_id, xodim_id, oy);


-- ================================================================
-- TAYYOR. SuperAdmin va default admin yaratish:  npm run seed
-- ================================================================
