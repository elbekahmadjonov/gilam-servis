import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Supabase kalitlari topilmadi!\n' +
    '   .env faylida VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni o\'rnating.'
  );
}

// Mobil brauzerlarda localStorage ba'zan bloklanadi (private mode va boshqalar).
// storage: undefined — Supabase o'zi eng mos variantni tanlaydi.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey:      'gilam-servis-auth',
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false, // SPA — URL da token yo'q
  },
  global: {
    headers: { 'x-app-version': '1.0' },
  },
});
