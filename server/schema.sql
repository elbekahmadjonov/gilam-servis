-- ================================================================
-- Gilam Servis — o'z VPS'ida hostlanadigan PostgreSQL sxemasi
-- Supabase auth.users / RLS / GRANT'larsiz — sof PostgreSQL.
-- Ishga tushirish:  psql "$DATABASE_URL" -f schema.sql
--                   yoki:  npm run migrate
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() uchun


-- ── 1. XODIMLAR ───────────────────────────────────────────────
-- Supabase auth.users o'rniga endi o'z jadvalimiz (parol_hash bilan).

CREATE TABLE IF NOT EXISTS xodimlar (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  ism          text         NOT NULL DEFAULT '',
  login        text         NOT NULL UNIQUE,
  parol_hash   text         NOT NULL,
  rol          text         NOT NULL DEFAULT 'Ishchi',
  telefon      text                  DEFAULT '',
  telegram_id  bigint       UNIQUE,   -- Telegram Mini App avtomatik kirish uchun
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- Mavjud bazaga (allaqachon migratsiya qilingan) ustunni qo'shish
ALTER TABLE xodimlar ADD COLUMN IF NOT EXISTS telegram_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS idx_xodimlar_telegram_id
  ON xodimlar(telegram_id) WHERE telegram_id IS NOT NULL;


-- ── 2. BUYURTMALAR ────────────────────────────────────────────

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


-- ── 3. IZOHLAR ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS izohlar (
  id           bigserial    PRIMARY KEY,
  buyurtma_id  bigint       NOT NULL REFERENCES buyurtmalar(id) ON DELETE CASCADE,
  matn         text         NOT NULL DEFAULT '',
  muallif_id   uuid         REFERENCES xodimlar(id) ON DELETE SET NULL,
  vaqt         timestamptz  NOT NULL DEFAULT now()
);


-- ── 4. HARAKATLAR (faoliyat tarixi) ──────────────────────────

CREATE TABLE IF NOT EXISTS harakatlar (
  id           bigserial    PRIMARY KEY,
  buyurtma_id  bigint       NOT NULL REFERENCES buyurtmalar(id) ON DELETE CASCADE,
  amal         text         NOT NULL DEFAULT '',
  muallif_id   uuid         REFERENCES xodimlar(id) ON DELETE SET NULL,
  vaqt         timestamptz  NOT NULL DEFAULT now()
);


-- ── 5. NARX SHABLONLARI ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS narx_shablonlari (
  id              bigserial     PRIMARY KEY,
  nomi            text          NOT NULL DEFAULT '',
  narx            numeric(14,0) NOT NULL DEFAULT 0,
  turi            text                   DEFAULT '',
  yaratilgan_vaqt timestamptz   NOT NULL DEFAULT now()
);


-- ── 6. STATUS CHEKLOVI ────────────────────────────────────────

ALTER TABLE buyurtmalar DROP CONSTRAINT IF EXISTS buyurtmalar_status_check;
ALTER TABLE buyurtmalar
  ADD CONSTRAINT buyurtmalar_status_check
  CHECK (status IN ('yangi', 'jarayonda', 'qadoqlash', 'dostavka', 'tugadi', 'otkaz'));


-- ── 7. INDEKSLAR ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_status           ON buyurtmalar(status);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yuvuvchi_id       ON buyurtmalar(yuvuvchi_id);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yaratilgan_vaqt   ON buyurtmalar(yaratilgan_vaqt DESC);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yangilangan_vaqt  ON buyurtmalar(yangilangan_vaqt DESC);
CREATE INDEX IF NOT EXISTS idx_izohlar_buyurtma_id           ON izohlar(buyurtma_id);
CREATE INDEX IF NOT EXISTS idx_harakatlar_buyurtma_id        ON harakatlar(buyurtma_id);


-- ── 8. AUTO-TRIGGER: yangilangan_vaqt ────────────────────────

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

-- ================================================================
-- TAYYOR. Admin xodim yaratish uchun:  npm run seed
-- ================================================================
