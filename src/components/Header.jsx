import { useRef, useEffect } from 'react';
import { Moon, Sun, LogOut, Search, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import StatusBadge from './StatusBadge';
import LangToggle from './LangToggle';

// searchResults — App.jsx dan filtrlangan orders massivi
export default function Header({ searchQuery, onSearchChange, onNewOrder, onSelectOrder, searchResults = [] }) {
  const { dark, toggleDark } = useTheme();
  const { logout } = useRole();
  const inputRef = useRef(null);

  const results     = searchQuery.trim().length >= 1 ? searchResults.slice(0, 8) : [];
  const showDropdown = searchQuery.trim().length >= 1;

  const handleSelect = (order) => {
    onSearchChange('');
    if (onSelectOrder) onSelectOrder(order);
  };

  useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.closest('.search-wrap')?.contains(e.target)) {
        // dropdown yopilmaydi — foydalanuvchi o'zi yopadi
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`sticky top-0 z-40 ${dark ? 'bg-black border-gray-800' : 'bg-white border-gray-100'} border-b shadow-sm`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-blue-600">Gilam</span>{' '}
          <span className={dark ? 'text-white' : 'text-gray-900'}>Servis</span>
        </span>
        <div className="flex items-center gap-2">
          <LangToggle dark={dark} />
          <button
            onClick={toggleDark}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              dark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="AMOLED rejim"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={logout}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              dark ? 'bg-gray-800 text-red-400 hover:bg-gray-700' : 'bg-gray-100 text-red-500 hover:bg-red-50'
            }`}
            title="Chiqish"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Search + New button */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="relative flex-1 search-wrap">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Qidirish (ID, ism, telefon...)"
            className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none transition-all ${
              dark
                ? 'bg-gray-900 text-white placeholder-gray-600 border border-gray-800 focus:border-blue-600'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400 border border-transparent focus:border-blue-300 focus:bg-white'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center ${
                dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-500'
              }`}
            >
              <X size={10} strokeWidth={3} />
            </button>
          )}

          {/* Search Dropdown */}
          {showDropdown && (
            <div className={`absolute top-full left-0 right-0 mt-1 rounded-2xl shadow-xl border overflow-hidden z-50 ${
              dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
            }`}>
              {results.length === 0 ? (
                <div className={`px-4 py-4 text-center text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Natija topilmadi
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {results.map(order => (
                    <button
                      key={order.id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(order); }}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all active:scale-[0.99] border-b last:border-0 ${
                        dark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`font-bold text-sm w-10 flex-shrink-0 ${dark ? 'text-white' : 'text-gray-900'}`}>
                        #{order.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                          {order.mijozIsmi || '—'}
                        </p>
                        <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {order.telefon || '—'}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onNewOrder}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold whitespace-nowrap transition-all active:scale-95"
        >
          <span className="text-base leading-none">+</span>
          <span>Yangi</span>
        </button>
      </div>
    </div>
  );
}
