import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Login'da foydalanuvchi faqat "admin" yozadi.
// Orqafonda shu domenga qo'shiladi: admin → admin@gilamservis.uz
const EMAIL_DOMAIN = '@gilamservis.uz';

// DB'dan rol: 'admin' → 'Admin' (ALLOWED_TABS kalitlari bilan mos)
function capitalizeRole(rol) {
  if (!rol) return null;
  return rol.charAt(0).toUpperCase() + rol.slice(1);
}

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  // xodim = { id, ism, login, rol } yoki null
  const [xodim,   setXodim]   = useState(null);
  const [loading, setLoading] = useState(true);  // sessiya tekshirilgunga qadar true

  // xodimlar jadvalidan ma'lumot ol
  const loadXodim = async (userId) => {
    const { data, error } = await supabase
      .from('xodimlar')
      .select('id, ism, login, rol')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return { ...data, rol: capitalizeRole(data.rol) };
  };

  // ── Sessiyani tekshir (F5 da login'da qolish) ───────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const x = await loadXodim(session.user.id);
        setXodim(x);
      }
      setLoading(false);
    });

    // Auth holati o'zgarishlarini kuzat (signIn / signOut)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setXodim(null);
        } else if (session?.user) {
          const x = await loadXodim(session.user.id);
          setXodim(x);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Login ────────────────────────────────────────────
  const login = async (loginStr, parol) => {
    const email = loginStr.trim() + EMAIL_DOMAIN;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parol,
    });
    if (error) throw error;
    const x = await loadXodim(data.user.id);
    if (!x) throw new Error('Xodim topilmadi');
    setXodim(x);
    return x;
  };

  // ── Logout ───────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setXodim(null);
  };

  return (
    <RoleContext.Provider value={{
      role:    xodim?.rol  || null,   // 'Admin' | 'Ishchi' | 'Dostavchik' | null
      xodim,                           // { id, ism, login, rol }
      login,
      logout,
      loading,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
