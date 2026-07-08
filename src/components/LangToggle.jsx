import { LANG_KEY, isKiril } from '../utils/translit';

// Lotin ↔ Kiril almashtirish tugmasi. Bosilganda tilni saqlab, sahifani
// qayta yuklaydi (translit engine main.jsx da ishga tushadi).
export default function LangToggle({ dark }) {
  const kiril = isKiril();
  const toggle = () => {
    try { localStorage.setItem(LANG_KEY, kiril ? 'lotin' : 'kiril'); } catch { /* skip */ }
    window.location.reload();
  };
  return (
    <button
      onClick={toggle}
      title={kiril ? "Lotinga o'tish" : "Kirilga o'tish"}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        dark ? 'bg-gray-800 text-blue-300 hover:bg-gray-700' : 'bg-gray-100 text-blue-600 hover:bg-gray-200'
      }`}
    >
      {kiril ? 'Лт' : 'Aa'}
    </button>
  );
}
