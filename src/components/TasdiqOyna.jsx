import { AlertTriangle } from 'lucide-react';

// Qaytarib bo'lmaydigan amallar uchun tasdiq oynasi (o'chirish va h.k.)
export default function TasdiqOyna({ dark, title, matn, tasdiqMatn = 'Tasdiqlash', band, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5 max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={band ? undefined : onClose} />
      <div className={`relative w-full rounded-3xl p-5 ${dark ? 'bg-gray-950' : 'bg-white'} shadow-xl`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-red-950' : 'bg-red-50'}`}>
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        </div>

        <p className={`text-sm leading-relaxed mb-5 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{matn}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={band}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 ${
              dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Bekor
          </button>
          <button
            onClick={onConfirm}
            disabled={band}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
          >
            {band ? 'O\'chirilmoqda...' : tasdiqMatn}
          </button>
        </div>
      </div>
    </div>
  );
}
