import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { api } from '../lib/api';

function PasswordInput({ value, onChange, placeholder, show, onToggle, hasError, inputClass }) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="current-password"
        className={`w-full rounded-2xl px-4 py-3.5 pr-12 text-base outline-none border-2 transition-all ${hasError ? 'border-red-400 bg-red-50 text-red-700 placeholder-red-300' : inputClass}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function Login() {
  const { dark } = useTheme();
  const { login } = useRole();

  // Kirish formasi
  const [loginVal, setLoginVal]     = useState('');
  const [parol,    setParol]        = useState('');
  const [korinsin, setKorinsin]     = useState(false);
  const [xato,     setXato]         = useState('');
  const [loading,  setLoading]      = useState(false);
  const [muvaffaqiyat, setMuvaffaqiyat] = useState('');

  // Parol o'zgartirish
  const [showParolOyna, setShowParolOyna] = useState(false);
  const [pLogin,    setPLogin]    = useState('');
  const [eskiParol, setEskiParol] = useState('');
  const [yangiPar,  setYangiPar]  = useState('');
  const [tasdiq,    setTasdiq]    = useState('');
  const [pShow1,    setPShow1]    = useState(false);
  const [pShow2,    setPShow2]    = useState(false);
  const [pXato,     setPXato]     = useState('');
  const [pLoading,  setPLoading]  = useState(false);

  const loginRef = useRef(null);
  useEffect(() => { loginRef.current?.focus(); }, []);

  const handleKirish = async () => {
    if (!loginVal.trim() || !parol) return;
    setLoading(true);
    setXato('');
    setMuvaffaqiyat('');
    try {
      await login(loginVal.trim(), parol);
    } catch {
      setXato("Login yoki parol noto'g'ri");
      setParol('');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleKirish(); };

  const handleParolOzgartirish = async () => {
    if (!pLogin.trim() || !eskiParol || !yangiPar || !tasdiq) {
      setPXato("Barcha maydonlarni to'ldiring");
      return;
    }
    if (yangiPar !== tasdiq) {
      setPXato('Yangi parollar mos emas');
      return;
    }
    if (yangiPar.length < 6) {
      setPXato("Yangi parol kamida 6 belgi bo'lishi kerak");
      return;
    }
    setPLoading(true);
    setPXato('');
    try {
      await api.post('/auth/change-password', {
        login:      pLogin.trim(),
        eskiParol,
        yangiParol: yangiPar,
      });

      setShowParolOyna(false);
      setPLogin(''); setEskiParol(''); setYangiPar(''); setTasdiq('');
      setMuvaffaqiyat("Parol muvaffaqiyatli o'zgartirildi!");
    } catch (err) {
      setPXato(err.message || 'Xatolik yuz berdi');
    } finally {
      setPLoading(false);
    }
  };

  const bg    = dark ? 'bg-black'   : 'bg-gray-50';
  const card  = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const text  = dark ? 'text-white' : 'text-gray-900';
  const sub   = dark ? 'text-gray-500' : 'text-gray-400';
  const inputCls = dark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600 focus:border-blue-500'
    : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400';
  const inputErr = 'border-red-400 bg-red-50 text-red-700 placeholder-red-300';

  return (
    <div className={`min-h-screen flex flex-col justify-center p-6 ${bg}`}>

      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🧹</div>
        <h1 className={`text-2xl font-extrabold ${text}`}>Demo gilam yuvish</h1>
        <p className={`text-sm mt-1.5 ${sub}`}>Davom etish uchun kiring</p>
      </div>

      <div className={`rounded-3xl border p-6 shadow-sm ${card}`}>

        {muvaffaqiyat && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-xl text-sm font-semibold text-center">
            ✅ {muvaffaqiyat}
          </div>
        )}

        {/* Login */}
        <div className="mb-4">
          <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${sub}`}>Login</label>
          <input
            ref={loginRef}
            type="text"
            value={loginVal}
            onChange={e => { setLoginVal(e.target.value); setXato(''); setMuvaffaqiyat(''); }}
            onKeyDown={handleKey}
            placeholder="Login"
            autoComplete="username"
            className={`w-full rounded-2xl px-4 py-3.5 text-base outline-none border-2 transition-all ${xato ? inputErr : inputCls}`}
          />
        </div>

        {/* Parol */}
        <div className="mb-5">
          <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${sub}`}>Parol</label>
          <PasswordInput
            value={parol}
            onChange={e => { setParol(e.target.value); setXato(''); }}
            placeholder="Parol"
            show={korinsin}
            onToggle={() => setKorinsin(v => !v)}
            hasError={!!xato}
            inputClass={inputCls}
          />
          {xato && <p className="text-xs text-red-500 font-semibold mt-2">⚠️ {xato}</p>}
        </div>

        {/* Kirish tugmasi */}
        <button
          onClick={handleKirish}
          disabled={loading || !loginVal.trim() || !parol}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Kirilmoqda...
            </>
          ) : 'Kirish →'}
        </button>

        {/* Parol o'zgartirish toggle */}
        <button
          onClick={() => { setShowParolOyna(v => !v); setPXato(''); }}
          className={`w-full mt-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Key size={15} />
          Parolni o'zgartirish
          {showParolOyna ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Parol o'zgartirish formasi */}
        {showParolOyna && (
          <div className={`mt-3 pt-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <h3 className={`text-sm font-bold mb-4 ${text}`}>Parolni o'zgartirish</h3>

            <div className="space-y-3">
              {/* Login */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${sub}`}>Login</label>
                <input
                  type="text"
                  value={pLogin}
                  onChange={e => { setPLogin(e.target.value); setPXato(''); }}
                  placeholder="Login"
                  autoComplete="username"
                  className={`w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition-all ${pXato ? inputErr : inputCls}`}
                />
              </div>

              {/* Eski parol */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${sub}`}>Eski parol</label>
                <PasswordInput
                  value={eskiParol}
                  onChange={e => { setEskiParol(e.target.value); setPXato(''); }}
                  placeholder="Eski parol"
                  show={pShow1}
                  onToggle={() => setPShow1(v => !v)}
                  hasError={!!pXato}
                  inputClass={inputCls}
                />
              </div>

              {/* Yangi parol */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${sub}`}>Yangi parol</label>
                <PasswordInput
                  value={yangiPar}
                  onChange={e => { setYangiPar(e.target.value); setPXato(''); }}
                  placeholder="Yangi parol (kamida 6 belgi)"
                  show={pShow2}
                  onToggle={() => setPShow2(v => !v)}
                  hasError={!!pXato}
                  inputClass={inputCls}
                />
              </div>

              {/* Tasdiqlash */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${sub}`}>Tasdiqlash</label>
                <input
                  type="password"
                  value={tasdiq}
                  onChange={e => { setTasdiq(e.target.value); setPXato(''); }}
                  placeholder="Yangi parolni qayta kiriting"
                  autoComplete="new-password"
                  className={`w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition-all ${pXato ? inputErr : inputCls}`}
                />
              </div>

              {pXato && <p className="text-xs text-red-500 font-semibold">⚠️ {pXato}</p>}

              <button
                onClick={handleParolOzgartirish}
                disabled={pLoading || !pLogin.trim() || !eskiParol || !yangiPar || !tasdiq}
                className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-extrabold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {pLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saqlanmoqda...
                  </>
                ) : "Parolni o'zgartirish"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
