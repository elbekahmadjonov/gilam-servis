import { Phone, MapPin, User, Copy, PhoneCall } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatVaqt } from '../utils/formatlash';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function OrderCard({ order, onDetail }) {
  const { dark } = useTheme();
  const { showToast } = useToast();

  const handleCall = (e) => {
    e.stopPropagation();
    window.location.href = `tel:${order.telefon}`;
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    const text = order.manzil || `${order.mijozIsmi} - ${order.telefon}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Manzil nusxalandi!', 'success');
    } catch {
      showToast('Nusxalab bo\'lmadi', 'error');
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 mb-3 shadow-sm border transition-all active:scale-[0.99] cursor-pointer ${
        dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
      }`}
      onClick={() => onDetail(order)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>#{order.id}</span>
          <StatusBadge status={order.status} />
        </div>
        <span className={`text-xs flex items-center gap-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          {formatVaqt(order.yaratilganVaqt)}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 mb-3">
        <div className={`flex items-center gap-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          <MapPin size={14} className="text-blue-500 flex-shrink-0" />
          <span className="truncate">{order.manzil || '—'}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          <User size={14} className="text-purple-500 flex-shrink-0" />
          <span>{order.mijozIsmi || '—'}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          <Phone size={14} className="text-green-500 flex-shrink-0" />
          <span>{order.telefon || '—'}</span>
        </div>
      </div>

      {/* Action row */}
      <div
        className={`flex items-center justify-between pt-2.5 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleCall}
            className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-all active:scale-90"
            title="Qo'ng'iroq"
          >
            <PhoneCall size={15} />
          </button>
          <button
            onClick={handleCopy}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              dark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Manzilni nusxalash"
          >
            <Copy size={15} />
          </button>
        </div>
        <button
          onClick={() => onDetail(order)}
          className="text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors"
        >
          Batafsil ›
        </button>
      </div>
    </div>
  );
}
