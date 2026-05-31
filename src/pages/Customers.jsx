import { useState } from 'react';
import { Users, X, Phone, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getCustomers } from '../services/customers';
import StatusBadge from '../components/StatusBadge';
import { formatSum, formatVaqt } from '../utils/formatlash';

export default function Customers({ orders = [] }) {
  const { dark } = useTheme();
  const [selected, setSelected] = useState(null);

  const customers = getCustomers(orders);

  if (selected) {
    return (
      <div className="p-4">
        <button
          onClick={() => setSelected(null)}
          className={`flex items-center gap-2 mb-4 text-sm font-semibold ${dark ? 'text-blue-400' : 'text-blue-600'}`}
        >
          ← Ortga
        </button>
        <div className={`rounded-2xl p-4 mb-4 ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'} shadow-sm`}>
          <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>{selected.ismi}</h2>
          <a href={`tel:${selected.telefon}`} className="text-blue-500 text-sm flex items-center gap-1.5">
            <Phone size={14} /> {selected.telefon}
          </a>
          {selected.jamilarQarz > 0 && (
            <div className="mt-2 text-red-500 text-sm font-semibold">Qarz: {formatSum(selected.jamilarQarz)} so'm</div>
          )}
        </div>

        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          BARCHA BUYURTMALAR ({selected.buyurtmalar.length})
        </h3>
        {selected.buyurtmalar.map(o => (
          <div key={o.id} className={`rounded-2xl p-3 mb-2 border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>#{o.id}</span>
                <StatusBadge status={o.status} />
              </div>
              <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{formatVaqt(o.yaratilganVaqt)}</span>
            </div>
            {o.yakuniySumma > 0 && (
              <div className={`mt-1.5 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Summa: <span className="font-semibold text-green-500">{formatSum(o.yakuniySumma)} so'm</span>
              </div>
            )}
            {o.manzil && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                <MapPin size={11} /> {o.manzil}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Users size={48} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Mijozlar yo'q</p>
        </div>
      ) : (
        customers.map(c => (
          <button
            key={c.telefon}
            onClick={() => setSelected(c)}
            className={`w-full rounded-2xl p-4 mb-3 border text-left shadow-sm transition-all active:scale-[0.99] ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{c.ismi}</p>
                <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{c.telefon}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {c.buyurtmalar.length} ta
                </span>
                {c.jamilarQarz > 0 && (
                  <p className="text-red-500 text-xs font-semibold mt-1">{formatSum(c.jamilarQarz)} so'm qarz</p>
                )}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
