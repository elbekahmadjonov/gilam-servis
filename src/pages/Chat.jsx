import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { socket } from '../lib/socket';
import { getMessages, sendMessage, editMessage, deleteMessage } from '../services/chat';

const ROL_RANG = {
  Owner:      'text-indigo-500',
  Admin:      'text-blue-500',
  Dostavchik: 'text-amber-500',
  Ishchi:     'text-emerald-500',
};

function soat(iso) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return ''; }
}

export default function Chat() {
  const { dark } = useTheme();
  const { xodim } = useRole();
  const [xabarlar, setXabarlar] = useState([]);
  const [matn, setMatn] = useState('');
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [menuFor, setMenuFor] = useState(null);   // uzoq bosilgan xabar
  const [editing, setEditing] = useState(null);   // tahrirlanayotgan xabar
  const oxiriRef = useRef(null);
  const inputRef = useRef(null);
  const holdTimer = useRef(null);
  const meId = xodim?.id;

  const pastga = useCallback((smooth = true) => {
    oxiriRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    let tirik = true;
    getMessages().then(list => {
      if (!tirik) return;
      setXabarlar(list);
      setTimeout(() => pastga(false), 50);
    });

    // O'z xabarini socketdan qabul qilmaymiz (optimistik + POST javobi bilan qo'shilgan)
    const onYangi = (x) => {
      if (x.muallif_id === meId) return;
      setXabarlar(prev => prev.some(p => p.id === x.id) ? prev : [...prev, x]);
    };
    const onTahrir = (x) => {
      setXabarlar(prev => prev.map(p => p.id === x.id ? { ...p, matn: x.matn, tahrirlangan: true } : p));
    };
    const onOchirildi = ({ id }) => {
      setXabarlar(prev => prev.filter(p => p.id !== id));
    };
    socket.on('chat:yangi', onYangi);
    socket.on('chat:tahrir', onTahrir);
    socket.on('chat:ochirildi', onOchirildi);
    return () => {
      tirik = false;
      socket.off('chat:yangi', onYangi);
      socket.off('chat:tahrir', onTahrir);
      socket.off('chat:ochirildi', onOchirildi);
    };
  }, [pastga, meId]);

  useEffect(() => { pastga(); }, [xabarlar, pastga]);

  const yubor = async () => {
    const t = matn.trim();
    if (!t || yuborilmoqda) return;

    // Tahrirlash rejimi
    if (editing) {
      const id = editing.id;
      setEditing(null);
      setMatn('');
      setXabarlar(prev => prev.map(p => p.id === id ? { ...p, matn: t, tahrirlangan: true } : p));
      try { await editMessage(id, t); }
      catch { /* xato — keyingi yuklashda tuzaladi */ }
      return;
    }

    // Yangi xabar
    setMatn('');
    setYuborilmoqda(true);
    const temp = {
      id: 'temp-' + Date.now(), matn: t, vaqt: new Date().toISOString(),
      muallif_id: meId, muallif_ism: xodim?.ism || 'Men', muallif_rol: xodim?.rol,
    };
    setXabarlar(prev => [...prev, temp]);
    try {
      const saqlangan = await sendMessage(t);
      setXabarlar(prev => prev.map(p => p.id === temp.id ? saqlangan : p));
    } catch {
      setXabarlar(prev => prev.filter(p => p.id !== temp.id));
      setMatn(t);
    } finally {
      setYuborilmoqda(false);
    }
  };

  // Uzoq bosish (Telegramdek) — faqat o'z xabari
  const bosishBoshi = (x) => {
    if (x.muallif_id !== meId || String(x.id).startsWith('temp-')) return;
    holdTimer.current = setTimeout(() => setMenuFor(x), 450);
  };
  const bosishTugadi = () => { clearTimeout(holdTimer.current); };

  const tahrirBoshla = () => {
    setEditing(menuFor);
    setMatn(menuFor.matn);
    setMenuFor(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const ochir = async () => {
    const id = menuFor.id;
    setMenuFor(null);
    setXabarlar(prev => prev.filter(p => p.id !== id));
    try { await deleteMessage(id); } catch { /* xato */ }
  };

  const textSec = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Xabarlar */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {xabarlar.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${textSec}`}>
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Hali xabar yo'q. Birinchi bo'lib yozing!</p>
          </div>
        ) : xabarlar.map((x, i) => {
          const meniki = x.muallif_id === meId;
          const oldingi = xabarlar[i - 1];
          const yangiMuallif = !oldingi || oldingi.muallif_id !== x.muallif_id;
          return (
            <div key={x.id} className={`flex ${meniki ? 'justify-end' : 'justify-start'}`}>
              <div
                onTouchStart={() => bosishBoshi(x)}
                onTouchEnd={bosishTugadi}
                onTouchMove={bosishTugadi}
                onContextMenu={(e) => { if (meniki && !String(x.id).startsWith('temp-')) { e.preventDefault(); setMenuFor(x); } }}
                className={`max-w-[78%] rounded-2xl px-3 py-2 select-none ${
                  meniki
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : dark ? 'bg-gray-800 text-gray-100 rounded-bl-md' : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                }`}
              >
                {!meniki && yangiMuallif && (
                  <div className={`text-xs font-bold mb-0.5 ${ROL_RANG[x.muallif_rol] || 'text-gray-500'}`}>
                    {x.muallif_ism || x.muallif_login || 'Xodim'}
                  </div>
                )}
                <div className="text-sm break-words whitespace-pre-wrap">{x.matn}</div>
                <div className={`text-[10px] mt-0.5 text-right ${meniki ? 'text-blue-100' : textSec}`}>
                  {x.tahrirlangan && <span className="italic mr-1">tahrirlangan</span>}
                  {soat(x.vaqt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={oxiriRef} />
      </div>

      {/* Tahrirlash paneli */}
      {editing && (
        <div className={`flex items-center gap-2 px-3 py-1.5 text-xs border-t ${dark ? 'border-gray-800 bg-gray-900 text-gray-300' : 'border-gray-200 bg-blue-50 text-gray-600'}`}>
          <Pencil size={13} className="text-blue-500" />
          <span className="flex-1 truncate">Tahrirlash: {editing.matn}</span>
          <button onClick={() => { setEditing(null); setMatn(''); }} className="text-red-500"><X size={15} /></button>
        </div>
      )}

      {/* Yozish */}
      <div className={`flex items-center gap-2 p-2.5 border-t ${dark ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'}`}>
        <input
          ref={inputRef}
          type="text"
          value={matn}
          onChange={e => setMatn(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && yubor()}
          placeholder={editing ? 'Tahrirlang...' : 'Xabar yozing...'}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm outline-none ${
            dark ? 'bg-gray-900 text-white placeholder-gray-600 border border-gray-800' : 'bg-gray-100 text-gray-800 placeholder-gray-400'
          }`}
        />
        <button
          onClick={yubor}
          disabled={!matn.trim() || yuborilmoqda}
          className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 flex-shrink-0"
        >
          {editing ? <Check size={18} /> : <Send size={18} />}
        </button>
      </div>

      {/* Uzoq bosish menyusi (Telegramdek) */}
      {menuFor && (
        <div className="fixed inset-0 z-[60] flex items-end max-w-[480px] mx-auto" onClick={() => setMenuFor(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className={`relative w-full rounded-t-3xl p-2 ${dark ? 'bg-gray-950' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-1 pb-2"><div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} /></div>
            <button onClick={tahrirBoshla}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold ${dark ? 'text-white hover:bg-gray-900' : 'text-gray-800 hover:bg-gray-50'}`}>
              <Pencil size={18} className="text-blue-500" /> Tahrirlash
            </button>
            <button onClick={ochir}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
              <Trash2 size={18} /> O'chirish
            </button>
            <button onClick={() => setMenuFor(null)}
              className={`w-full px-4 py-3.5 rounded-xl text-sm font-semibold mt-1 ${dark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              Bekor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
