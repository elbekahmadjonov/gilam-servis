import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const EMAIL_DOMAIN   = '@gilamservis.uz';
const SESSION_TIMEOUT = 15000; // 15 soniya — undan keyin xato

function capitalizeRole(rol) {
  if (!rol) return null;
  return rol.charAt(0).toUpperCase() + rol.slice(1);
}

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [xodim,     setXodim]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [authError, setAuthError] = useState(null);
  const timerRef = useRef(null);

  const loadXodim = async (userId) => {
    const { data, error } = await supabase
      .from('xodimlar')
      .select('id, ism, login, rol')
      .eq('id', userId)
      .single();
    if (error || !data) {
      console.warn('[Auth] loadXodim topilmadi:', error?.message);
      return null;
    }
    return { ...data, rol: capitalizeRole(data.rol) };
  };

  // ── Sessiyani yuklash (timeout + debug log) ──────────
  const initSession = useCallback(async () => {
    clearTimeout(timerRef.current);
    setLoading(true);
    setAuthError(null);

    // 15 soniyadan javob kelmasa — xato holati
    timerRef.current = setTimeout(() => {
      console.warn('[Auth] ⏱ getSession 15s timeout — loading to\'xtatildi');
      setLoading(false);
      setAuthError('Supabase ulanishi vaqt tugadi. Internetni tekshiring.');
    }, SESSION_TIMEOUT);

    try {
      console.log('[Auth] getSession so\'rovi yuborildi...');
      const { data: { session }, error } = await supabase.auth.getSession();
      clearTimeout(timerRef.current);

      // USB debugging uchun
      console.log('[Auth] getSession natija:',
        session
          ? `user=${session.user.id.slice(0, 8)}... email=${session.user.email}`
          : 'sessiya yo\'q',
        error ? `XATO: ${error.message}` : 'OK'
      );

      if (error) {
        setAuthError(`Sessiya xatosi: ${error.message}`);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const x = await loadXodim(session.user.id);
        console.log('[Auth] xodim:', x ? `ism=${x.ism}, rol=${x.rol}` : 'DB da topilmadi');
        setXodim(x);
      }
    } catch (err) {
      clearTimeout(timerRef.current);
      console.error('[Auth] getSession istisno:', err);
      setAuthError(`Ulanish xatosi: ${err.message || 'noma\'lum'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Ilk yuklash ───────────────────────────────────────
  useEffect(() => {
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event);
        if (event === 'SIGNED_OUT' || !session) {
          setXodim(null);
        } else if (session?.user) {
          const x = await loadXodim(session.user.id);
          setXodim(x);
        }
      }
    );

    return () => {
      clearTimeout(timerRef.current);
      subscription.unsubscribe();
    };
  }, [initSession]);

  // ── Login ─────────────────────────────────────────────
  const login = async (loginStr, parol) => {
    const email = loginStr.trim() + EMAIL_DOMAIN;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: parol });
    if (error) throw error;
    const x = await loadXodim(data.user.id);
    if (!x) throw new Error('Xodim topilmadi');
    setXodim(x);
    setAuthError(null);
    return x;
  };

  // ── Logout ────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setXodim(null);
  };

  return (
    <RoleContext.Provider value={{
      role:      xodim?.rol || null,
      xodim,
      login,
      logout,
      loading,
      authError,
      retryInit: initSession,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
