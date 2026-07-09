import { useState } from 'react';
import { PackageOpen, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import { formatVaqt, formatSum } from '../utils/formatlash';

// Otkaz (bekor qilingan) buyurtmalar — Tarix bo'limidek faqat ko'rish rejimi.
export default function Cancelled({ orders }) {
  const { dark } = useTheme();
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState(null);

  const all = orders
    .filter(o => o.status === 'otkaz')
    .sort((a, b) => new Date(b.yangilanganVaqt) - new Date(a.yangilanganVaqt));

  const list = filterDate
    ? all.filter(o => {
        const d = new Date(o.yangilanganVaqt);
        const t = new Date(filterDate);
        return d.getFullYear() === t.getFullYear() &&
               d.getMonth()    === t.getMonth()    &&
               d.getDate()     === t.getDate();
      })
    : all;

  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSec = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className={`text-sm font-semibold flex-shrink-0 ${textSec}`}>
          {list.length} / {all.length} ta
        </span>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className={`text-sm rounded-xl px-3 py-1.5 outline-none border-2 flex-1 transition-all ${
            filterDate
              ? 'border-blue-500 ' + (dark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-800')
              : dark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
          }`}
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold flex-shrink-0 ${dark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
          >
            ✕ Barchasi
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <PackageOpen size={48} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${textSec}`}>Otkaz buyurtmalar yo'q</p>
        </div>
      ) : (
        list.map(order => (
          <div
            key={order.id}
            onClick={() => setSelected(order)}
            className={`rounded-2xl p-4 mb-3 border shadow-sm cursor-pointer transition-all active:scale-[0.99] ${
              dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${textPrimary}`}>#{order.id}</span>
                <StatusBadge status={order.status} />
              </div>
              <span className={`text-xs ${textSec}`}>{formatVaqt(order.yangilanganVaqt)}</span>
            </div>
            <p className={`text-sm font-medium ${textPrimary}`}>{order.mijozIsmi}</p>
            <p className={`text-xs mt-0.5 ${textSec}`}>{order.telefon}</p>
            {order.manzil && (
              <p className={`text-xs mt-0.5 truncate ${textSec}`}>📍 {order.manzil}</p>
            )}
            {order.otkazSababi && (
              <p className={`text-xs mt-1.5 ${textSec}`}>Sabab: <span className={textPrimary}>{order.otkazSababi}</span></p>
            )}
          </div>
        ))
      )}

      {/* Faqat ko'rish rejimi */}
      {selected && (
        <OtkazDetailModal order={selected} dark={dark} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function OtkazDetailModal({ order, dark, onClose }) {
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSec = dark ? 'text-gray-400' : 'text-gray-500';
  const border = dark ? 'border-gray-800' : 'border-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl ${dark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary}`}>Buyurtma #{order.id}</h2>
            <span className={`text-xs ${textSec}`}>Faqat ko'rish rejimi</span>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4 pb-6">
          <Section title="MIJOZ MA'LUMOTLARI" dark={dark}>
            <InfoRow label="Status" dark={dark}><StatusBadge status={order.status} size="lg" /></InfoRow>
            <InfoRow label="Mijoz" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.mijozIsmi || '—'}</span></InfoRow>
            <InfoRow label="Telefon" dark={dark}><a href={`tel:${order.telefon}`} className="text-blue-500 text-sm">{order.telefon}</a></InfoRow>
            <InfoRow label="Manzil" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.manzil || '—'}</span></InfoRow>
            {order.otkazSababi && <InfoRow label="Otkaz sababi" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.otkazSababi}</span></InfoRow>}
            <InfoRow label="Yaratilgan" dark={dark}><span className={`text-xs ${textSec}`}>{formatVaqt(order.yaratilganVaqt)}</span></InfoRow>
            <InfoRow label="Bekor qilingan" dark={dark}><span className={`text-xs ${textSec}`}>{formatVaqt(order.yangilanganVaqt)}</span></InfoRow>
          </Section>

          {order.tovarlar && (order.tovarlar.gilamSoni > 0 || order.tovarlar.odealSoni > 0 || order.tovarlar.korpaSoni > 0 || order.tovarlar.korpachaSoni > 0 || order.tovarlar.pardaBor) && (
            <Section title="TOVARLAR" dark={dark}>
              {order.tovarlar.gilamSoni > 0 && <InfoRow label="Gilam" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.gilamSoni} dona</span></InfoRow>}
              {order.tovarlar.odealSoni > 0 && <InfoRow label="Odeal" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.odealSoni} dona</span></InfoRow>}
              {order.tovarlar.korpaSoni > 0 && <InfoRow label="Ko'rpa" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.korpaSoni} dona</span></InfoRow>}
              {order.tovarlar.korpachaSoni > 0 && <InfoRow label="Ko'rpacha" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.korpachaSoni} dona</span></InfoRow>}
              {order.tovarlar.pardaBor && <InfoRow label="Parda" dark={dark}><span className={`text-sm ${textPrimary}`}>Bor</span></InfoRow>}
            </Section>
          )}

          {order.umumiyHisob > 0 && (
            <Section title="HISOB" dark={dark}>
              <InfoRow label="Jami hisob" dark={dark}><span className={`text-sm font-bold ${textPrimary}`}>{formatSum(order.umumiyHisob)} so'm</span></InfoRow>
              {order.yakuniySumma > 0 && <InfoRow label="Yakuniy" dark={dark}><span className="text-sm font-extrabold text-green-600">{formatSum(order.yakuniySumma)} so'm</span></InfoRow>}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, dark, children }) {
  const textSec = dark ? 'text-gray-500' : 'text-gray-400';
  return (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSec}`}>{title}</h3>
      <div className={`rounded-2xl border overflow-hidden ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, dark, children }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b last:border-0 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
      <span className={`text-xs font-semibold ${dark ? 'text-gray-500' : 'text-gray-400'} w-24 flex-shrink-0`}>{label}</span>
      <div className="flex-1 text-right">{children}</div>
    </div>
  );
}
