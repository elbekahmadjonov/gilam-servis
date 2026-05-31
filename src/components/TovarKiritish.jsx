import { useState } from 'react';
import { X, MapPin, Loader } from 'lucide-react';

export default function TovarKiritish({ order, dark, onClose, onSave }) {
  const [tovarlar, setTovarlar] = useState({
    gilamSoni:    order.tovarlar?.gilamSoni    || 0,
    odealSoni:    order.tovarlar?.odealSoni    || 0,
    korpaSoni:    order.tovarlar?.korpaSoni    || 0,
    korpachaSoni: order.tovarlar?.korpachaSoni || 0,
    pardaBor:     order.tovarlar?.pardaBor     || false,
  });

  // geo.status: 'idle' | 'loading' | 'saved' | 'denied' | 'error'
  const [geo, setGeo] = useState({ lat: null, lng: null, status: 'idle' });

  const getGeo = () => {
    if (!navigator.geolocation) {
      setGeo(g => ({ ...g, status: 'error' }));
      return;
    }
    setGeo(g => ({ ...g, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat:    pos.coords.latitude,
          lng:    pos.coords.longitude,
          status: 'saved',
        });
      },
      (err) => {
        setGeo(g => ({
          ...g,
          status: err.code === 1 ? 'denied' : 'error',
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const card  = dark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
  const text  = dark ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className="fixed inset-0 z-[60] flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-t-3xl max-h-[90vh] flex flex-col ${dark ? 'bg-gray-950' : 'bg-white'}`}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>

        <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Tovarlarni kiriting</h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <NumberInput label="🏔 Gilam (dona)"     value={tovarlar.gilamSoni}    dark={dark} onChange={v => setTovarlar(t => ({ ...t, gilamSoni: v }))} />
          <NumberInput label="🛏 Odeal (dona)"     value={tovarlar.odealSoni}    dark={dark} onChange={v => setTovarlar(t => ({ ...t, odealSoni: v }))} />
          <NumberInput label="🥬 Ko'rpa (dona)"    value={tovarlar.korpaSoni}    dark={dark} onChange={v => setTovarlar(t => ({ ...t, korpaSoni: v }))} />
          <NumberInput label="📏 Ko'rpacha (dona)" value={tovarlar.korpachaSoni} dark={dark} onChange={v => setTovarlar(t => ({ ...t, korpachaSoni: v }))} />

          {/* Parda checkbox */}
          <div>
            <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div
                onClick={() => setTovarlar(t => ({ ...t, pardaBor: !t.pardaBor }))}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  tovarlar.pardaBor ? 'bg-blue-600 border-blue-600' : dark ? 'border-gray-600' : 'border-gray-300'
                }`}
              >
                {tovarlar.pardaBor && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className={`text-sm font-medium ${text}`}>🪟 Parda bor</span>
            </label>
          </div>

          {/* ── Geolokatsiya bloki ── */}
          <div className={`rounded-xl border p-3 ${card}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              📍 Mijoz joylashuvi
            </p>

            {geo.status === 'idle' && (
              <button
                onClick={getGeo}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  dark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                <MapPin size={16} className="text-blue-500" />
                Joylashuvni belgilash
              </button>
            )}

            {geo.status === 'loading' && (
              <div className={`flex items-center justify-center gap-2 py-2.5 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Loader size={15} className="animate-spin text-blue-500" />
                Joylashuv olinmoqda...
              </div>
            )}

            {geo.status === 'saved' && (
              <button
                onClick={getGeo}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-green-100 text-green-700 active:scale-95 transition-all"
              >
                <MapPin size={16} />
                ✓ Joylashuv saqlandi — yangilash
              </button>
            )}

            {geo.status === 'denied' && (
              <div className="space-y-2">
                <p className="text-xs text-red-500 font-medium">
                  ⚠️ Joylashuvga ruxsat berilmagan. Telefon sozlamasidan brauzerga joylashuv ruxsatini bering.
                </p>
                <button onClick={getGeo} className={`w-full py-2 rounded-xl text-xs font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  Qayta urinish
                </button>
              </div>
            )}

            {geo.status === 'error' && (
              <div className="space-y-2">
                <p className="text-xs text-orange-500 font-medium">
                  ⚠️ Joylashuvni olishning iloji bo'lmadi. HTTPS talab qilinishi mumkin (lokal tarmoqda cheklov bor).
                </p>
                <button onClick={getGeo} className={`w-full py-2 rounded-xl text-xs font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  Qayta urinish
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`flex gap-3 p-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Bekor
          </button>
          <button
            onClick={() => onSave(tovarlar, geo.lat, geo.lng)}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold active:scale-95 transition-all"
          >
            ✓ Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, dark }) {
  return (
    <div>
      <label className={`text-sm font-semibold mb-2 block ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${dark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
        >−</button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className={`flex-1 text-center text-lg font-bold py-2 rounded-xl outline-none ${dark ? 'bg-gray-900 text-white border border-gray-700' : 'bg-gray-50 text-gray-900 border border-gray-200'}`}
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold transition-all active:scale-90"
        >+</button>
      </div>
    </div>
  );
}
