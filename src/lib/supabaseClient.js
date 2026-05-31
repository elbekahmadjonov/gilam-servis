// supabaseClient.js — Supabase bağlantısı
// URL va key .env faylidan o'qiladi (VITE_ prefiksi orqali)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Supabase kalitlari topilmadi!\n' +
    '   .env faylida VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni o\'rnating.\n' +
    '   .env.example faylini namuna sifatida koʻring.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
