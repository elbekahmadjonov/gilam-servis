import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getAll, update } from '../services/orders';
import { formatSum } from '../utils/formatlash';

export default function Debt({ orders, onRefresh }) {
  const { dark } = useTheme();
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const debtOrders = orders.filter(o => o.qarz > 0);

  const handlePay = (order) => {
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0 || amount > order.qarz) return;
    update(order.id, { qarz: order.qarz - amount });
    onRefresh();
    setPayingId(null);
    setPayAmount('');
  };

  const totalDebt = debtOrders.reduce((s, o) => s + o.qarz, 0);

  return (
    <div className="p-4">
      {debtOrders.length > 0 && (
        <div className={`rounded-2xl p-4 mb-4 ${dark ? 'bg-red-950 border border-red-900' : 'bg-red-50 border border-red-100'}`}>
          <div className={`text-xs font-bold uppercase ${dark ? 'text-red-400' : 'text-red-400'} mb-1`}>UMUMIY QARZ</div>
          <div className={`text-2xl font-extrabold ${dark ? 'text-white' : 'text-red-700'}`}>{formatSum(totalDebt)} so'm</div>
        </div>
      )}

      {debtOrders.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 ${dark ? 'text-gray-600' : 'text-gray-300'}`}>
          <PackageOpen size={48} className="mb-3" />
          <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Qarzdor mijozlar yo'q</p>
        </div>
      ) : (
        debtOrders.map(order => (
          <div key={order.id} className={`rounded-2xl p-4 mb-3 border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>#{order.raqam} — {order.mijozIsmi}</span>
                <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{order.telefon}</p>
              </div>
              <span className="text-red-500 font-extrabold text-base">{formatSum(order.qarz)} so'm</span>
            </div>

            {payingId === order.id ? (
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  placeholder="To'lash miqdori..."
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none ${dark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}
                />
                <button onClick={() => handlePay(order)} className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold active:scale-95">
                  To'lash
                </button>
                <button onClick={() => setPayingId(null)} className={`px-3 py-2 rounded-xl text-sm ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setPayingId(order.id); setPayAmount(''); }}
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold active:scale-95 transition-all"
                >
                  💰 To'lash
                </button>
                <button
                  onClick={() => { update(order.id, { qarz: 0 }); onRefresh(); }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-all"
                >
                  ✓ To'liq yopish
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
