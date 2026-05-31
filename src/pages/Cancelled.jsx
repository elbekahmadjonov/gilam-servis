import { PackageOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { formatVaqt } from '../utils/formatlash';

export default function Cancelled({ orders }) {
  const { dark } = useTheme();
  const cancelled = orders.filter(o => o.status === 'otkaz');

  return (
    <div className="p-4">
      <div className={`flex items-center gap-2 mb-4`}>
        <span className={`text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Bekor qilingan buyurtmalar</span>
        {cancelled.length > 0 && (
          <span className="min-w-[22px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {cancelled.length}
          </span>
        )}
      </div>

      {cancelled.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <PackageOpen size={48} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Bekor qilingan buyurtmalar yo'q</p>
        </div>
      ) : (
        cancelled.map(order => (
          <div key={order.id} className={`rounded-2xl p-4 mb-3 border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>#{order.id}</span>
              <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{formatVaqt(order.yangilanganVaqt)}</span>
            </div>
            <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{order.mijozIsmi}</p>
            <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{order.telefon}</p>
            {order.otkazSababi && (
              <div className={`mt-2 p-2.5 rounded-xl text-xs ${dark ? 'bg-red-950/50 text-red-400' : 'bg-red-50 text-red-500'}`}>
                Sabab: {order.otkazSababi}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
