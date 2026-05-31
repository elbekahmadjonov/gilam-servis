import { useState, useEffect } from 'react';
import { Tablet, RefreshCw, Package, Truck, PackageOpen } from 'lucide-react';
import OrderCard from '../components/OrderCard';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { allowedStatuses } from '../utils/rollar';

const ALL_STATUS_CARDS = [
  { key: 'yangi',     label: 'Zayavka',    icon: Tablet,    color: 'text-green-600',  ring: 'ring-green-500',  bg: 'bg-green-50',  darkBg: 'bg-green-950/40' },
  { key: 'jarayonda', label: 'Yuvilmoqda', icon: RefreshCw, color: 'text-orange-600', ring: 'ring-orange-500', bg: 'bg-orange-50', darkBg: 'bg-orange-950/40' },
  { key: 'qadoqlash', label: 'Pardozda',   icon: Package,   color: 'text-purple-600', ring: 'ring-purple-500', bg: 'bg-purple-50', darkBg: 'bg-purple-950/40' },
  { key: 'dostavka',  label: 'Dastavka',   icon: Truck,     color: 'text-blue-600',   ring: 'ring-blue-500',   bg: 'bg-blue-50',   darkBg: 'bg-blue-950/40' },
];

export default function Orders({ orders, onDetail, onRefresh }) {
  const { dark } = useTheme();
  const { role } = useRole();

  const roleStatuses = allowedStatuses(role);
  // Admin va boshqa rol uchun ko'rinadigan status kartochkalar
  const visibleCards = role === 'Admin'
    ? ALL_STATUS_CARDS
    : ALL_STATUS_CARDS.filter(s => roleStatuses.includes(s.key));

  const [activeStatus, setActiveStatus] = useState(() =>
    visibleCards[0]?.key || 'yangi'
  );

  // If active status not in visible, reset
  useEffect(() => {
    if (!visibleCards.find(c => c.key === activeStatus)) {
      setActiveStatus(visibleCards[0]?.key || 'yangi');
    }
  }, [role]);

  const counts = {};
  ALL_STATUS_CARDS.forEach(s => { counts[s.key] = orders.filter(o => o.status === s.key).length; });

  const filteredOrders = orders.filter(o => o.status === activeStatus);
  const activeCfg = ALL_STATUS_CARDS.find(s => s.key === activeStatus);

  const dotColor = {
    yangi: 'bg-green-500',
    jarayonda: 'bg-orange-500',
    qadoqlash: 'bg-purple-500',
    dostavka: 'bg-blue-500',
  };

  // Ishchi uchun barcha statuslarni ko'rish, ammo faqat o'z statuslari uchun tugmalar
  // (barcha statusdagi buyurtmalar ro'yxatda ko'rinadi)
  const allVisibleOrders = role === 'Admin'
    ? orders.filter(o => o.status === activeStatus)
    : orders.filter(o => o.status === activeStatus);

  return (
    <div className="p-4">
      {/* Status cards */}
      <div className={`grid gap-3 mb-5 ${visibleCards.length === 2 ? 'grid-cols-2' : visibleCards.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {visibleCards.map(s => {
          const Icon = s.icon;
          const isActive = activeStatus === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveStatus(s.key)}
              className={`rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-95 border-2 ${
                isActive
                  ? `${s.ring} ${dark ? s.darkBg : s.bg} border-current`
                  : `border-transparent ${dark ? 'bg-gray-900' : 'bg-white'} shadow-sm`
              }`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${dark ? s.darkBg : s.bg}`}>
                <Icon size={22} className={s.color} />
              </div>
              <div className="text-left">
                <div className={`text-2xl font-extrabold leading-none ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {counts[s.key]}
                </div>
                <div className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Section title */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className={`w-2 h-2 rounded-full ${dotColor[activeStatus] || 'bg-gray-400'}`} />
          {activeCfg?.label} buyurtmalar
          <span className={`px-2 py-0.5 rounded-full text-xs ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {allVisibleOrders.length}
          </span>
        </div>
      </div>

      {/* Orders list */}
      {allVisibleOrders.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16`}>
          <PackageOpen size={48} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Buyurtmalar yo'q</p>
        </div>
      ) : (
        allVisibleOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onDetail={onDetail}
            onRefresh={onRefresh}
          />
        ))
      )}
    </div>
  );
}
