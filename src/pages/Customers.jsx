import { useState } from 'react';
import { Users, Phone, MapPin, Edit2, Trash2, X, Download } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { getCustomers } from '../services/customers';
import * as orderService from '../services/orders';
import StatusBadge from '../components/StatusBadge';
import TasdiqOyna from '../components/TasdiqOyna';
import { formatSum, formatVaqt } from '../utils/formatlash';
import { tahrirDiff } from '../utils/tahrir';
import { normalizeBuyurtmaTel } from '../utils/telefon';
import { mijozlarCSV, csvYuklab } from '../utils/csvExport';

export default function Customers({ orders = [], onRefresh }) {
  const { dark } = useTheme();
  const { role, xodim } = useRole();
  const { showToast } = useToast();
  const [selected, setSelected] = useState(null);
  const [showTahrir, setShowTahrir] = useState(false);
  const [showOchirish, setShowOchirish] = useState(false);
  const [band, setBand] = useState(false);

  const tahrirlay  = role === 'Owner' || role === 'Admin';
  const ochiraOlad = role === 'Owner';   // o'chirish — faqat Owner
  const customers = getCustomers(orders);

  // Mijoz tahriri — ism/telefon uning BARCHA buyurtmalarida yangilanadi
  const handleTahrir = async (data) => {
    setBand(true);
    try {
      const muallif = xodim?.ism || role;
      const { telefon } = normalizeBuyurtmaTel(data.telefon, []);
      for (const o of selected.buyurtmalar) {
        const changes = { mijozIsmi: data.ismi, telefon };
        const yangi = tahrirDiff(o, { mijozIsmi: data.ismi, telefon }, muallif);
        if (yangi.length) changes.tahrirlar = [...(o.tahrirlar || []), ...yangi];
        await orderService.update(o.id, changes);
      }
      setShowTahrir(false);
      setSelected(null);
      showToast('Mijoz ma\'lumotlari yangilandi', 'success');
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Saqlab bo\'lmadi', 'error');
    } finally {
      setBand(false);
    }
  };

  // Mijozni o'chirish — uning barcha buyurtmalari bazadan o'chiriladi
  const handleOchirish = async () => {
    setBand(true);
    try {
      for (const o of selected.buyurtmalar) {
        await orderService.remove(o.id);
      }
      setShowOchirish(false);
      setSelected(null);
      showToast('Mijoz o\'chirildi', 'success');
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'O\'chirib bo\'lmadi', 'error');
    } finally {
      setBand(false);
    }
  };

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

          {(tahrirlay || ochiraOlad) && (
            <div className="flex gap-2 mt-3">
              {tahrirlay && (
                <button
                  onClick={() => setShowTahrir(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                    dark ? 'bg-gray-800 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <Edit2 size={15} /> Tahrir
                </button>
              )}
              {ochiraOlad && (
                <button
                  onClick={() => setShowOchirish(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                    dark ? 'bg-gray-800 text-red-400' : 'bg-red-100 text-red-600'
                  }`}
                >
                  <Trash2 size={15} /> O'chirish
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          BARCHA BUYURTMALAR ({selected.buyurtmalar.length})
        </h3>
        {selected.buyurtmalar.map(o => (
          <div key={o.id} className={`rounded-2xl p-3 mb-2 border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>#{o.raqam}</span>
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

        {showTahrir && (
          <MijozTahrirOyna
            mijoz={selected}
            dark={dark}
            band={band}
            onClose={() => setShowTahrir(false)}
            onSave={handleTahrir}
          />
        )}

        {showOchirish && (
          <TasdiqOyna
            dark={dark}
            title="Mijozni o'chirish"
            matn={`${selected.ismi} va uning ${selected.buyurtmalar.length} ta buyurtmasi bazadan butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
            tasdiqMatn="Ha, o'chirilsin"
            band={band}
            onClose={() => setShowOchirish(false)}
            onConfirm={handleOchirish}
          />
        )}
      </div>
    );
  }

  const eksport = () => {
    try {
      const sana = new Date().toISOString().split('T')[0];
      csvYuklab(mijozlarCSV(customers), `mijozlar-${sana}.csv`);
      showToast(`${customers.length} ta mijoz eksport qilindi`, 'success');
    } catch (err) {
      showToast('Eksport xatosi: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4">
      {customers.length > 0 && (
        <div className="flex items-center justify-between mb-3 gap-3">
          <span className={`text-sm font-semibold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {customers.length} ta mijoz
          </span>
          <button
            onClick={eksport}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all ${
              dark ? 'bg-gray-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <Download size={15} /> CSV
          </button>
        </div>
      )}

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

// Mijoz ismi/telefonini tahrirlash — barcha buyurtmalariga qo'llanadi
function MijozTahrirOyna({ mijoz, dark, band, onClose, onSave }) {
  const [ismi, setIsmi] = useState(mijoz.ismi || '');
  const [telefon, setTelefon] = useState(mijoz.telefon || '');

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${
    dark
      ? 'bg-gray-800 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-600'
      : 'bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-400'
  }`;
  const labelCls = `text-xs font-bold uppercase tracking-wider mb-1.5 block ${dark ? 'text-gray-500' : 'text-gray-400'}`;

  const saqla = () => {
    if (!telefon.trim()) return;
    onSave({ ismi: ismi.trim(), telefon: telefon.trim() });
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={band ? undefined : onClose} />
      <div className={`relative w-full rounded-t-3xl ${dark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="flex justify-center pt-3">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>✏️ Mijozni tahrirlash</h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className={labelCls}>Mijoz ismi</label>
            <input type="text" value={ismi} onChange={e => setIsmi(e.target.value)} placeholder="F.I.O." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefon</label>
            <input type="tel" value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="+998 XX XXX XX XX" className={inputCls} />
          </div>
          <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            O'zgarish mijozning {mijoz.buyurtmalar.length} ta buyurtmasiga qo'llanadi.
          </p>
        </div>

        <div className={`flex gap-3 p-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={onClose} disabled={band} className={`flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Bekor
          </button>
          <button onClick={saqla} disabled={band} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50">
            {band ? 'Saqlanmoqda...' : '✓ Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
