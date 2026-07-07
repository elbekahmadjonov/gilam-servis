-- ================================================================
-- Gilam Servis — tozalash skripti
-- AVVAL shu faylni ishga tushiring, KEYIN schema.sql ni
-- ================================================================


-- ── 1. REALTIME'dan olib tashlash ─────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.buyurtmalar;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ── 2. TRIGGER'LAR ────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_buyurtmalar_yangilangan  ON public.buyurtmalar;
DROP TRIGGER IF EXISTS on_auth_user_created          ON auth.users;


-- ── 3. FUNKSIYALAR ────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.set_yangilangan_vaqt() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()      CASCADE;


-- ── 4. JADVALLAR (FK tartibiga ko'ra) ────────────────────────

DROP TABLE IF EXISTS public.izohlar           CASCADE;
DROP TABLE IF EXISTS public.harakatlar        CASCADE;
DROP TABLE IF EXISTS public.narx_shablonlari  CASCADE;
DROP TABLE IF EXISTS public.buyurtmalar       CASCADE;
DROP TABLE IF EXISTS public.xodimlar          CASCADE;


-- ── 5. QOLGAN NARSALAR (agar qo'lda yaratilgan bo'lsa) ────────

-- Agar qo'lda policy yaratgan bo'lsangiz — CASCADE bilan tushgan bo'ladi.
-- Agar qo'shimcha funksiya/trigger bo'lsa, quyiga qo'shing:
-- DROP FUNCTION IF EXISTS public.boshqa_funksiya() CASCADE;


-- ================================================================
-- TAYYOR. Endi schema.sql ni ishga tushiring.
-- ================================================================
