import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api, setToken, getToken } from '../lib/api';
import { disconnectSocket } from '../lib/socket';
import { isTelegram, getInitData, initTelegram } from '../lib/telegram';

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

  // ── Sessiyani yuklash (saqlangan token orqali) ───────
  const initSession = useCallback(async () => {
    clearTimeout(timerRef.current);
    setLoading(true);
    setAuthError(null);

    // Token yo'q — lekin Telegram ichida bo'lsak, avtomatik kirishga urinamiz
    if (!getToken()) {
      if (isTelegram()) {
        try {
          const { token, xodim: x } = await api.post('/auth/telegram', {
            initData: getInitData(),
          });
          setToken(token);
          setXodim({ ...x, rol: capitalizeRole(x.rol) });
          setLoading(false);
          return;
        } catch {
          // 403 not_linked yoki xato — login/parol sahifasiga o'tamiz
        }
      }
      setXodim(null);
      setLoading(false);
      return;
    }

    // 15 soniyadan javob kelmasa — xato holati
    timerRef.current = setTimeout(() => {
      console.warn('[Auth] ⏱ /me 15s timeout — loading to\'xtatildi');
      setLoading(false);
      setAuthError('Server ulanishi vaqt tugadi. Internetni tekshiring.');
    }, SESSION_TIMEOUT);

    try {
      const data = await api.get('/auth/me');
      clearTimeout(timerRef.current);
      setXodim({ ...data, rol: capitalizeRole(data.rol) });
    } catch (err) {
      clearTimeout(timerRef.current);
      // Token yaroqsiz bo'lsa api.js uni allaqachon tozalagan
      console.warn('[Auth] /me xato:', err.message);
      setXodim(null);
      // 401 emas, tarmoq xatosi bo'lsa — foydalanuvchiga ko'rsatamiz
      if (getToken()) setAuthError(`Ulanish xatosi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Ilk yuklash ───────────────────────────────────────
  useEffect(() => {
    initTelegram();  // Mini App'ni yoyish + ready signal
    initSession();
    return () => clearTimeout(timerRef.current);
  }, [initSession]);

  // ── Login ─────────────────────────────────────────────
  // Telegram ichida bo'lsak initData ham yuboriladi — backend shu xodimni
  // Telegram akkauntiga bog'laydi (keyingi safar avtomatik kirish uchun).
  const login = async (loginStr, parol) => {
    const { token, xodim: x } = await api.post('/auth/login', {
      login: loginStr.trim(),
      parol,
      ...(isTelegram() ? { initData: getInitData() } : {}),
    });
    setToken(token);
    const shaped = { ...x, rol: capitalizeRole(x.rol) };
    setXodim(shaped);
    setAuthError(null);
    return shaped;
  };

  // ── Logout ────────────────────────────────────────────
  const logout = async () => {
    setToken(null);
    disconnectSocket();
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
