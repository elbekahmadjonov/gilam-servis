import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { RoleProvider, useRole } from './context/RoleContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { socket, connectSocket, disconnectSocket } from './lib/socket';
import Header from './components/Header';
import Footer from './components/Footer';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Debt from './pages/Debt';
import History from './pages/History';
import Cancelled from './pages/Cancelled';
import Customers from './pages/Customers';
import Statistics from './pages/Statistics';
import Hisob from './pages/Hisob';
import Login from './pages/Login';
import OrderModal from './components/OrderModal';
import { getAll, search, hasCachedOrders, invalidateCache } from './services/orders';
import { loadTemplates } from './services/templates';

// ── 10 soniyalik timeout ────────────────────────────────
async function withTimeout(promise, ms = 10000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// ── Ulanish holati banneri ──────────────────────────────
function ConnectionBanner({ online, justReconnected }) {
  if (justReconnected) {
    return (
      <div className="fixed top-0 inset-x-0 z-[200] max-w-[480px] mx-auto pointer-events-none">
        <div className="bg-green-500 text-white text-center text-sm font-semibold py-2 shadow-lg">
          ✅ Internet tiklandi — ulandi
        </div>
      </div>
    );
  }
  if (!online) {
    return (
      <div className="fixed top-0 inset-x-0 z-[200] max-w-[480px] mx-auto pointer-events-none">
        <div className="bg-yellow-500 text-white text-center text-sm font-semibold py-2 shadow-lg animate-pulse">
          ⚠️ Ulanish yo'q — qayta ulanmoqda...
        </div>
      </div>
    );
  }
  return null;
}

// ── Sessiya yuklanmoqda (yoki xato) ────────────────────
function LoadingScreen({ authError, onRetry }) {
  const { dark } = useTheme();

  if (authError) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 gap-4 ${dark ? 'bg-black' : 'bg-gray-50'}`}>
        <div className="text-5xl">⚠️</div>
        <p className={`text-sm font-semibold text-center max-w-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
          {authError}
        </p>
        <button
          onClick={onRetry}
          className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl active:scale-95 transition-all shadow-md"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="text-center">
        <div className="text-4xl mb-3">🧹</div>
        <div className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          Yuklanmoqda...
        </div>
      </div>
    </div>
  );
}

// ── Tenant to'xtatilgan / muddati tugagan ekrani ───────
function BlockedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4 bg-gray-50 dark:bg-black">
      <div className="text-5xl">⛔</div>
      <p className="text-base font-extrabold text-center text-gray-800 dark:text-gray-200">
        Obuna faol emas
      </p>
      <p className="text-sm text-center max-w-xs text-gray-500 dark:text-gray-400">
        Ushbu xizmat vaqtincha to'xtatilgan yoki obuna muddati tugagan.
        Iltimos, administrator bilan bog'laning.
      </p>
    </div>
  );
}

// ── Asosiy ilova ────────────────────────────────────────
function AppContent() {
  const { role, loading, authError, blocked, retryInit } = useRole();
  const { dark } = useTheme();

  const [orders,          setOrders]          = useState([]);
  const [ordersLoading,   setOrdersLoading]   = useState(false);
  const [ordersError,     setOrdersError]     = useState(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [selectedOrder,   setSelectedOrder]   = useState(null);
  const [online,          setOnline]          = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  const navigate        = useNavigate();
  const channelRef      = useRef(null);
  const reconnTimerRef  = useRef(null);

  // ── Ma'lumot yuklash: kesh → server, 1 marta avtomatik retry ──
  const refresh = useCallback(async () => {
    try {
      const all = await withTimeout(getAll());
      setOrders(all);
      setOrdersError(null);
    } catch {
      try {
        const all = await withTimeout(getAll());
        setOrders(all);
        setOrdersError(null);
      } catch {
        setOrdersError('Ulanish xatosi, qayta urining');
      }
    }
  }, []);

  // ── Bitta buyurtmani local yangilash (tarmoq so'rovsiz) ──
  const refreshOrder = useCallback((updatedOrder) => {
    if (updatedOrder?.id) {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    } else {
      invalidateCache();
      refresh();
    }
  }, [refresh]);

  // ── Realtime (Socket.io) kanalini (qayta) sozlash ────
  const setupChannel = useCallback(() => {
    const onChange = () => {
      invalidateCache(); // real-time o'zgarish — keshni tozala
      refresh();
    };
    try {
      // Eski listener bo'lsa olib tashlaymiz (takrorlanmasligi uchun)
      socket.off('orders:changed', channelRef.current);
      channelRef.current = onChange;
      socket.on('orders:changed', onChange);
      connectSocket();
    } catch (err) {
      console.warn('Real-time ulanmadi:', err);
    }
  }, [refresh]);

  // ── Ilk yuklash + realtime ────────────────────────────
  useEffect(() => {
    if (!role) return;

    // Kesh mavjud bo'lsa — spinner ko'rsatma (ma'lumot darhol chiqadi)
    if (!hasCachedOrders()) setOrdersLoading(true);
    refresh().finally(() => setOrdersLoading(false));
    loadTemplates();   // narx shablonlarini tenant bo'yicha yuklaymiz
    setupChannel();

    return () => {
      if (channelRef.current) {
        socket.off('orders:changed', channelRef.current);
        channelRef.current = null;
      }
      disconnectSocket();
    };
  }, [role, refresh, setupChannel]);

  // ── Internet holati kuzatish + avtomatik qayta ulanish ─
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setJustReconnected(true);

      // Ma'lumotlarni yangilash + realtime qayta ulash
      refresh();
      if (channelRef.current !== null) {
        // Foydalanuvchi login qilgan edi — kanalni yangilash
        setupChannel();
      }

      // "Ulandi" banneri 3 soniyadan keyin yo'qoladi
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = setTimeout(() => setJustReconnected(false), 3000);
    };

    const goOffline = () => {
      setOnline(false);
      setJustReconnected(false);
      clearTimeout(reconnTimerRef.current);
    };

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
      clearTimeout(reconnTimerRef.current);
    };
  }, [refresh, setupChannel]);

  if (blocked)              return <BlockedScreen />;
  if (loading || authError) return <LoadingScreen authError={authError} onRetry={retryInit} />;
  if (!role)                return <Login />;

  const searchResults = search(searchQuery, orders);

  const handleSelectOrder = (order) => {
    setSearchQuery('');
    setSelectedOrder(order);
  };

  return (
    <div className={`flex flex-col min-h-screen ${dark ? 'bg-black' : 'bg-[#f1f2f6]'}`}>

      <ConnectionBanner online={online} justReconnected={justReconnected} />

      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewOrder={() => navigate('/yangi')}
        onSelectOrder={handleSelectOrder}
        searchResults={searchResults}
      />

      <main className="flex-1 pb-20">

        {/* Tarmoq xatosi banneri */}
        {ordersError && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
            <span className="text-sm text-red-600 flex-1">⚠️ {ordersError}</span>
            <button
              onClick={() => { setOrdersError(null); invalidateCache(); setOrdersLoading(true); refresh().finally(() => setOrdersLoading(false)); }}
              className="text-xs font-bold text-red-600 px-3 py-1.5 rounded-lg bg-red-100 active:scale-95 transition-all flex-shrink-0"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Yuklanmoqda — yupqa chiziq */}
        {ordersLoading && (
          <div className="h-0.5 bg-blue-500 animate-pulse w-full" />
        )}

        <Routes>
          <Route path="/" element={
            <Orders orders={orders} onDetail={setSelectedOrder} onRefresh={refresh} loading={ordersLoading} />
          } />
          <Route path="/yangi" element={
            <NewOrder onCreated={() => { refresh(); navigate('/'); }} />
          } />
          <Route path="/qarz"       element={<Debt       orders={orders} onRefresh={refresh} />} />
          <Route path="/tarix"      element={<History    orders={orders} />} />
          <Route path="/otkaz"      element={<Cancelled  orders={orders} />} />
          <Route path="/mijozlar"   element={<Customers  orders={orders} />} />
          <Route path="/statistika" element={<Statistics orders={orders} role={role} />} />
          {role === 'Owner' && (
            <Route path="/hisob"    element={<Hisob      orders={orders} />} />
          )}
        </Routes>
      </main>

      <Footer orders={orders} />

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={refreshOrder}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <RoleProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </RoleProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
