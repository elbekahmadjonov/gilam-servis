-- ================================================================
-- Gilam Servis — yangi Supabase loyiha uchun to'liq SQL skript
-- SQL Editor'da bir marta ishga tushiring
-- ================================================================


-- ── 1. JADVALLAR ─────────────────────────────────────────────

-- Xodimlar (auth.users bilan bog'langan)
CREATE TABLE IF NOT EXISTS public.xodimlar (
  id          uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ism         text         NOT NULL DEFAULT '',
  login       text                  DEFAULT '',
  rol         text         NOT NULL DEFAULT 'Ishchi',
  telefon     text                  DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Buyurtmalar (asosiy jadval)
CREATE TABLE IF NOT EXISTS public.buyurtmalar (
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
  yuvuvchi_id      uuid           REFERENCES public.xodimlar(id) ON DELETE SET NULL,
  yaratgan_id      uuid           REFERENCES public.xodimlar(id) ON DELETE SET NULL,
  yaratilgan_vaqt  timestamptz    NOT NULL DEFAULT now(),
  yangilangan_vaqt timestamptz    NOT NULL DEFAULT now()
);

-- Izohlar
CREATE TABLE IF NOT EXISTS public.izohlar (
  id           bigserial    PRIMARY KEY,
  buyurtma_id  bigint       NOT NULL REFERENCES public.buyurtmalar(id) ON DELETE CASCADE,
  matn         text         NOT NULL DEFAULT '',
  muallif_id   uuid         REFERENCES public.xodimlar(id) ON DELETE SET NULL,
  vaqt         timestamptz  NOT NULL DEFAULT now()
);

-- Harakatlar (faoliyat tarixi)
CREATE TABLE IF NOT EXISTS public.harakatlar (
  id           bigserial    PRIMARY KEY,
  buyurtma_id  bigint       NOT NULL REFERENCES public.buyurtmalar(id) ON DELETE CASCADE,
  amal         text         NOT NULL DEFAULT '',
  muallif_id   uuid         REFERENCES public.xodimlar(id) ON DELETE SET NULL,
  vaqt         timestamptz  NOT NULL DEFAULT now()
);

-- Narx shablonlari
CREATE TABLE IF NOT EXISTS public.narx_shablonlari (
  id              bigserial     PRIMARY KEY,
  nomi            text          NOT NULL DEFAULT '',
  narx            numeric(14,0) NOT NULL DEFAULT 0,
  turi            text                   DEFAULT '',
  yaratilgan_vaqt timestamptz   NOT NULL DEFAULT now()
);


-- ── 2. STATUS CHEKLOVI ────────────────────────────────────────

ALTER TABLE public.buyurtmalar
  DROP CONSTRAINT IF EXISTS buyurtmalar_status_check;

ALTER TABLE public.buyurtmalar
  ADD CONSTRAINT buyurtmalar_status_check
  CHECK (status IN ('yangi', 'jarayonda', 'qadoqlash', 'dostavka', 'tugadi', 'otkaz'));


-- ── 3. INDEKSLAR ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_status
  ON public.buyurtmalar(status);

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yuvuvchi_id
  ON public.buyurtmalar(yuvuvchi_id);

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yaratilgan_vaqt
  ON public.buyurtmalar(yaratilgan_vaqt DESC);

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_yangilangan_vaqt
  ON public.buyurtmalar(yangilangan_vaqt DESC);

CREATE INDEX IF NOT EXISTS idx_izohlar_buyurtma_id
  ON public.izohlar(buyurtma_id);

CREATE INDEX IF NOT EXISTS idx_harakatlar_buyurtma_id
  ON public.harakatlar(buyurtma_id);


-- ── 4. AUTO-TRIGGER: yangilangan_vaqt ────────────────────────

CREATE OR REPLACE FUNCTION public.set_yangilangan_vaqt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.yangilangan_vaqt = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyurtmalar_yangilangan ON public.buyurtmalar;
CREATE TRIGGER trg_buyurtmalar_yangilangan
  BEFORE UPDATE ON public.buyurtmalar
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yangilangan_vaqt();


-- ── 5. AUTO-TRIGGER: auth.users → xodimlar ───────────────────
-- Supabase Auth'da yangi foydalanuvchi yaratilganda
-- avtomatik xodimlar jadvaliga qo'shiladi.
-- ism va rol raw_user_meta_data orqali beriladi.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.xodimlar (id, ism, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'ism',  split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol',  'Ishchi')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 6. RLS YOQISH ─────────────────────────────────────────────

ALTER TABLE public.xodimlar         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyurtmalar       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.izohlar           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harakatlar        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narx_shablonlari  ENABLE ROW LEVEL SECURITY;


-- ── 7. RLS SIYOSATLARI ────────────────────────────────────────
-- Barcha authenticated foydalanuvchilar to'liq huquqqa ega

-- xodimlar
DROP POLICY IF EXISTS authenticated_all ON public.xodimlar;
CREATE POLICY authenticated_all ON public.xodimlar
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- buyurtmalar
DROP POLICY IF EXISTS authenticated_all ON public.buyurtmalar;
CREATE POLICY authenticated_all ON public.buyurtmalar
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- izohlar
DROP POLICY IF EXISTS authenticated_all ON public.izohlar;
CREATE POLICY authenticated_all ON public.izohlar
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- harakatlar
DROP POLICY IF EXISTS authenticated_all ON public.harakatlar;
CREATE POLICY authenticated_all ON public.harakatlar
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- narx_shablonlari
DROP POLICY IF EXISTS authenticated_all ON public.narx_shablonlari;
CREATE POLICY authenticated_all ON public.narx_shablonlari
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ── 8. GRANT'LAR — jadvallar ──────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.xodimlar          TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.buyurtmalar       TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.izohlar           TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.harakatlar        TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.narx_shablonlari  TO authenticated, anon;


-- ── 9. GRANT'LAR — sequence'lar ───────────────────────────────

GRANT USAGE, SELECT
  ON SEQUENCE public.buyurtmalar_id_seq       TO authenticated, anon;

GRANT USAGE, SELECT
  ON SEQUENCE public.izohlar_id_seq           TO authenticated, anon;

GRANT USAGE, SELECT
  ON SEQUENCE public.harakatlar_id_seq        TO authenticated, anon;

GRANT USAGE, SELECT
  ON SEQUENCE public.narx_shablonlari_id_seq  TO authenticated, anon;


-- ── 10. REALTIME ──────────────────────────────────────────────
-- Faqat buyurtmalar jadvalida realtime kerak

ALTER PUBLICATION supabase_realtime ADD TABLE public.buyurtmalar;


-- ================================================================
-- TAYYOR. Yangi xodim qo'shish uchun:
--   Supabase → Authentication → Users → "Invite user"
--   yoki:
--   SELECT auth.sign_up('ism@gilamservis.uz', 'parol',
--     '{"ism":"Ism Familiya","rol":"Ishchi"}'::jsonb);
-- ================================================================
