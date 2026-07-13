import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import { formatVaqt } from '../utils/formatlash';
import { OrderDetail } from './History';

// Otkaz (bekor qilingan) buyurtmalar — Tarixdek, faqat ko'rish.
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

  // Detal — sahifa ichida (Mijozlardek)
  if (selected) {
    return <OrderDetail order={selected} dark={dark} onBack={() => setSelected(null)} />;
  }

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
            className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold flex-shrink-0 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
          >
            ✕
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
          <button
            key={order.id}
            onClick={() => setSelected(order)}
            className={`w-full text-left rounded-2xl p-4 mb-3 border shadow-sm transition-all active:scale-[0.99] ${
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
            {order.manzil && <p className={`text-xs mt-0.5 truncate ${textSec}`}>📍 {order.manzil}</p>}
            {order.otkazSababi && (
              <p className={`text-xs mt-1.5 ${textSec}`}>Sabab: <span className={textPrimary}>{order.otkazSababi}</span></p>
            )}
          </button>
        ))
      )}
    </div>
  );
}
