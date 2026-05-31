import { useLocation, useNavigate } from 'react-router-dom';
import { Tablet, HandCoins, Clock, XCircle, Users, BarChart3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { allowedTabs } from '../utils/rollar';

const ALL_TABS = [
  { path: '/',           label: 'Buyurtmalar', icon: Tablet    },
  { path: '/qarz',       label: 'Qarz',        icon: HandCoins },
  { path: '/tarix',      label: 'Tarix',        icon: Clock     },
  { path: '/otkaz',      label: 'Otkaz',        icon: XCircle   },
  { path: '/mijozlar',   label: 'Mijozlar',     icon: Users     },
  { path: '/statistika', label: 'Statistika',   icon: BarChart3 },
];

export default function Footer({ orders = [] }) {
  const { dark } = useTheme();
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const otkazSoni = orders.filter(o => o.status === 'otkaz').length;
  const visiblePaths = allowedTabs(role);
  const tabs = ALL_TABS
    .filter(t => visiblePaths.includes(t.path))
    .map(t => ({
      ...t,
      badge: t.path === '/otkaz' ? otkazSoni : 0,
    }));

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 max-w-[480px] mx-auto ${
        dark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
      } border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all active:scale-95 relative ${
                isActive ? 'text-blue-600' : dark ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
