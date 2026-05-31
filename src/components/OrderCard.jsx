import { useRef } from 'react';
import { Phone, MapPin, User, Copy, Camera, Image, PhoneCall } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatVaqt } from '../utils/formatlash';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useRole } from '../context/RoleContext';
import { compressImage } from '../utils/imageUtils';
import * as orderService from '../services/orders';

export default function OrderCard({ order, onDetail, onRefresh }) {
  const { dark } = useTheme();
  const { showToast } = useToast();
  const { role } = useRole();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

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

  const handleImageFile = async (e, source) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Rasm saqlanmoqda...', 'info', 1500);
      const base64 = await compressImage(file, 1200, 0.7);
      orderService.addIzohRasm(order.id, base64, role, source);
      if (onRefresh) onRefresh();
      showToast('Rasm izoh sifatida saqlandi!', 'success');
    } catch (err) {
      showToast('Rasmni saqlashda xato', 'error');
    }
    // Reset input to allow same file re-selection
    e.target.value = '';
  };

  return (
    <div
      className={`rounded-2xl p-4 mb-3 shadow-sm border transition-all active:scale-[0.99] cursor-pointer ${
        dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
      }`}
      onClick={() => onDetail(order)}
    >
      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleImageFile(e, 'kamera')}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageFile(e, 'galereya')}
      />

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
          <button
            onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
            className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-all active:scale-90"
            title="Kamera"
          >
            <Camera size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); galleryRef.current?.click(); }}
            className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-200 transition-all active:scale-90"
            title="Galereya"
          >
            <Image size={15} />
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
