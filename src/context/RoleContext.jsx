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
  const [blocked,   setBlocked]   = useState(false); // tenant suspended/muddati tugagan
  const timerRef = useRef(null);

  // Telegram ichida avtomatik kirishga urinadi. Muvaffaqiyatli bo'lsa true.
  const telegramAutoLogin = useCallback(async () => {
    if (!isTelegram()) return false;
    try {
      const { token, xodim: x } = await api.post('/auth/telegram', {
        initData: getInitData(),
      });
      setToken(token);
      setXodim({ ...x, rol: capitalizeRole(x.rol) });
      return true;
    } catch (err) {
      if (err.message === 'tenant_suspended') { setBlocked(true); return true; }
      // 403 not_linked yoki xato — login/parol sahifasiga o'tamiz
      return false;
    }
  }, []);

  // ── Sessiyani yuklash (saqlangan token orqali) ───────
  const initSession = useCallback(async () => {
    clearTimeout(timerRef.current);
    setLoading(true);
    setAuthError(null);

    // Impersonation: SuperAdmin panelidan #imp=<token> bilan kelinganda
    try {
      const m = window.location.hash.match(/imp=([^&]+)/);
      if (m) {
        setToken(decodeURIComponent(m[1]));
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch { /* e'tiborsiz */ }

    // 1) Saqlangan token bor — sessiyani tekshiramiz (bir marta login qilingach eslab qolish)
    if (getToken()) {
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
        setLoading(false);
        return; // ✓ eslab qolindi — qaytadan login shart emas
      } catch (err) {
        clearTimeout(timerRef.current);
        if (err.message === 'tenant_suspended') { setBlocked(true); setLoading(false); return; }

        // Sessiya eskirganmi (401 — api.js tokenni tozalagan) yoki xodim topilmadimi?
        const staleSession = !getToken() || /topilmadi|not.?found|yaroqsiz|invalid/i.test(err.message);
        if (!staleSession) {
          // Tarmoq/timeout xatosi — tokenni saqlaymiz, "Qayta urinish" ko'rsatamiz
          console.warn('[Auth] /me tarmoq xatosi:', err.message);
          setXodim(null);
          setAuthError(`Ulanish xatosi: ${err.message}`);
          setLoading(false);
          return;
        }
        // Eskirgan token — tozalab, pastdagi qaytadan kirish oqimiga tushamiz
        console.warn('[Auth] /me eskirgan sessiya, token tozalandi:', err.message);
        setToken(null);
      }
    }

    // 2) Token yo'q (yoki eskirdi) — Telegram ichida bo'lsak avtomatik kiramiz
    if (await telegramAutoLogin()) { setLoading(false); return; }

    // 3) Aks holda — login/parol sahifasi
    setXodim(null);
    setLoading(false);
  }, [telegramAutoLogin]);

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
    let res;
    try {
      res = await api.post('/auth/login', {
        login: loginStr.trim(),
        parol,
        ...(isTelegram() ? { initData: getInitData() } : {}),
      });
    } catch (err) {
      if (err.message === 'tenant_suspended') { setBlocked(true); }
      throw err;
    }
    setToken(res.token);
    const shaped = { ...res.xodim, rol: capitalizeRole(res.xodim.rol) };
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
      blocked,
      retryInit: initSession,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
