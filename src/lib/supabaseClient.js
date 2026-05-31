import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase kalitlari topilmadi! .env faylini tekshiring.');
}

// Har bir HTTP so'rovga 10 soniya AbortController timeout
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey:         'gilam-servis-auth',
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
  realtime: {
    timeout: 30000, // Realtime WebSocket 30s timeout
  },
  global: {
    headers: { 'x-app-version': '1.0' },
    fetch:   fetchWithTimeout,
  },
});
