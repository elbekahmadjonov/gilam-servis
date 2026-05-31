import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';

const PAROL = '1';

const ROLES = [
  {
    key: 'Admin',
    label: 'Admin',
    emoji: '👨‍💼',
    desc: 'Barcha buyurtmalar, statistika va sozlamalar',
  },
  {
    key: 'Dostavchik',
    label: 'Dostavchik',
    emoji: '🚚',
    desc: 'Buyurtmalarni olib ketish va yetkazish',
  },
  {
    key: 'Ishchi',
    label: 'Ishchi',
    emoji: '🧹',
    desc: 'Gilam yuvish va qadoqlash',
  },
];

export default function RoleSelect() {
  const { dark } = useTheme();
  const { login } = useRole();

  const [selectedRole, setSelectedRole] = useState(null);
  const [parol,        setParol]        = useState('');
  const [korinsin,     setKorinsin]     = useState(false);
  const [xato,         setXato]         = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedRole) setTimeout(() => inputRef.current?.focus(), 80);
  }, [selectedRole]);

  const handleRolTanlash = (roleKey) => {
    setSelectedRole(roleKey);
    setParol('');
    setXato('');
  };

  const handleKirish = () => {
    if (parol === PAROL) {
      login(selectedRole);
    } else {
      setXato('Parol noto\'g\'ri. Qayta urinib ko\'ring.');
      setParol('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleKirish();
    if (e.key === 'Escape') { setSelectedRole(null); setXato(''); }
  };

  const bg       = dark ? 'bg-black'   : 'bg-gray-50';
  const cardBg   = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const textMain = dark ? 'text-white' : 'text-gray-900';
  const textSub  = dark ? 'text-gray-500' : 'text-gray-400';

  const selected = ROLES.find(r => r.key === selectedRole);

  return (
    <div className={`min-h-screen flex flex-col justify-center p-6 ${bg}`}>

      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🧹</div>
        <h1 className={`text-2xl font-extrabold ${textMain}`}>
          <span className="text-blue-600">Gilam</span>{' '}
          <span className={textMain}>Servis</span>
        </h1>
        <p className={`text-sm mt-1.5 ${textSub}`}>
          {selectedRole ? 'Parolni kiriting' : 'Rolni tanlang'}
        </p>
      </div>

      {!selectedRole ? (
        <div className="space-y-3">
          {ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => handleRolTanlash(r.key)}
              className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left border-2 transition-all active:scale-[0.98] ${cardBg} hover:border-blue-300`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                {r.emoji}
              </div>
              <div className="flex-1">
                <div className={`font-bold text-base ${textMain}`}>{r.label}</div>
                <div className={`text-xs mt-0.5 ${textSub}`}>{r.desc}</div>
              </div>
              <ChevronRight size={18} className={textSub} />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${cardBg} border-blue-400`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              {selected?.emoji}
            </div>
            <div className="flex-1">
              <div className={`font-bold ${textMain}`}>{selected?.label}</div>
              <div className={`text-xs ${textSub}`}>{selected?.desc}</div>
            </div>
            <button
              onClick={() => { setSelectedRole(null); setXato(''); }}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
            >
              O'zgartirish
            </button>
          </div>

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${textSub}`}>
              Parol
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={korinsin ? 'text' : 'password'}
                value={parol}
                onChange={e => { setParol(e.target.value); setXato(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Parolni kiriting..."
                className={`w-full rounded-2xl px-4 py-3.5 pr-12 text-base outline-none border-2 transition-all ${
                  xato
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : dark
                      ? 'bg-gray-900 text-white placeholder-gray-600 border-gray-700 focus:border-blue-500'
                      : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-blue-400'
                }`}
              />
              <button
                onClick={() => setKorinsin(v => !v)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg ${
                  dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {korinsin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {xato && (
              <p className="text-xs text-red-500 font-medium mt-2">⚠️ {xato}</p>
            )}
          </div>

          <button
            onClick={handleKirish}
            disabled={!parol}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base transition-all active:scale-[0.98] disabled:opacity-40"
          >
            Kirish →
          </button>

          <div className="flex gap-2">
            {ROLES.filter(r => r.key !== selectedRole).map(r => (
              <button
                key={r.key}
                onClick={() => handleRolTanlash(r.key)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  dark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
