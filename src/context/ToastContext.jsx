import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 2500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-0 right-0 z-[200] max-w-[480px] mx-auto px-4 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}

function Toast({ toast }) {
  const colors = {
    info:    'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error:   'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
  };
  const icons = {
    info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️',
  };
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-[fadeIn_0.2s_ease] ${colors[toast.type] || colors.info}`}>
      <span>{icons[toast.type] || icons.info}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}
