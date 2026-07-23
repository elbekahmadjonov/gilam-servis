import { useState } from 'react';
import { PackageOpen, Edit2, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import TahrirOyna from '../components/TahrirOyna';
import TasdiqOyna from '../components/TasdiqOyna';
import { formatVaqt } from '../utils/formatlash';
import { tahrirDiff } from '../utils/tahrir';
import { syncNarxlar, tovarlarOzgardi } from '../utils/narxSync';
import { normalizeBuyurtmaTel } from '../utils/telefon';
import * as orderService from '../services/orders';
import { OrderDetail } from './History';

// Otkaz (bekor qilingan) buyurtmalar — Tarixdek ko'rinish.
// Owner va Admin tahrirlashi va bazadan butunlay o'chirishi mumkin.
export default function Cancelled({ orders, onRefresh }) {
  const { dark } = useTheme();
  const { role, xodim } = useRole();
  const { showToast } = useToast();
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [showTahrir, setShowTahrir] = useState(false);
  const [showOchirish, setShowOchirish] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  const tahrirlay  = role === 'Owner' || role === 'Admin';
  const ochiraOlad = role === 'Owner';   // o'chirish — faqat Owner

  const all = orders
    .filter(o => o.status === 'otkaz')
    .sort((a, b) => new Date(b.yangilanganVaqt) - new Date(a.yangilanganVaqt));

  const list = filterDate
    ? all.filter(o => {
        const d = new Date(o.yangilanganVaqt);
        const t = new Date(filterDate);
        return d.getFullYear() === t.getFullYear() &&
               d.getMonth()    === t.getMonth()    &&
               d.getDate()     === t.getDate();
      })
    : all;

  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSec = dark ? 'text-gray-400' : 'text-gray-500';

  const handleTahrir = async (data) => {
    setSaqlanmoqda(true);
    try {
      const muallif = xodim?.ism || role;
      const tel = normalizeBuyurtmaTel(data.telefon, data.qoshimchaTelefonlar);
      const toza = { ...data, telefon: tel.telefon, qoshimchaTelefonlar: tel.qoshimchaTelefonlar };

      const yangiTahrirlar = tahrirDiff(selected, toza, muallif);
      const changes = {
        mijozIsmi: toza.mijozIsmi, telefon: toza.telefon,
        qoshimchaTelefonlar: toza.qoshimchaTelefonlar,
        manzil: toza.manzil, izoh: toza.izoh, tovarlar: toza.tovarlar,
      };
      if (yangiTahrirlar.length) {
        changes.tahrirlar = [...(selected.tahrirlar || []), ...yangiTahrirlar];
      }
      // Tovarlar soni kamaysa — narxlardagi ortiqcha o'lchamlar ham o'chadi
      if (tovarlarOzgardi(selected.tovarlar, data.tovarlar)) {
        const { narxlar, umumiyHisob } = syncNarxlar(selected.narxlar, data.tovarlar);
        changes.narxlar      = narxlar;
        changes.umumiyHisob  = umumiyHisob;
        changes.yakuniySumma = Math.max(0, umumiyHisob - (selected.chegirma || 0));
      }
      await orderService.update(selected.id, changes);
      await orderService.addHarakat(selected.id, `Tahrirlandi — ${role}`).catch(() => {});
      setShowTahrir(false);
      setSelected({ ...selected, ...changes });
      showToast('Saqlandi!', 'success');
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Saqlab bo\'lmadi', 'error');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  const handleOchirish = async () => {
    setSaqlanmoqda(true);
    try {
      await orderService.remove(selected.id);
      setShowOchirish(false);
      setSelected(null);
      showToast('Buyurtma o\'chirildi', 'success');
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'O\'chirib bo\'lmadi', 'error');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  // Detal — sahifa ichida (Mijozlardek)
  if (selected) {
    return (
      <>
        <OrderDetail
          order={selected}
          dark={dark}
          onBack={() => setSelected(null)}
          actions={(tahrirlay || ochiraOlad) ? (
            <>
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
            </>
          ) : null}
        />

        {showTahrir && (
          <TahrirOyna
            order={selected}
            dark={dark}
            onClose={() => setShowTahrir(false)}
            onSave={handleTahrir}
          />
        )}

        {showOchirish && (
          <TasdiqOyna
            dark={dark}
            title="Buyurtmani o'chirish"
            matn={`#${selected.raqam} — ${selected.mijozIsmi || 'mijoz'} buyurtmasi bazadan butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
            tasdiqMatn="Ha, o'chirilsin"
            band={saqlanmoqda}
            onClose={() => setShowOchirish(false)}
            onConfirm={handleOchirish}
          />
        )}
      </>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className={`text-sm font-semibold flex-shrink-0 ${textSec}`}>
          {list.length} / {all.length} ta
        </span>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className={`text-sm rounded-xl px-3 py-1.5 outline-none border-2 flex-1 transition-all ${
            filterDate
              ? 'border-blue-500 ' + (dark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-800')
              : dark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
          }`}
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold flex-shrink-0 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
          >
            ✕
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <PackageOpen size={48} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${textSec}`}>Otkaz buyurtmalar yo'q</p>
        </div>
      ) : (
        list.map(order => (
          <button
            key={order.id}
            onClick={() => setSelected(order)}
            className={`w-full text-left rounded-2xl p-4 mb-3 border shadow-sm transition-all active:scale-[0.99] ${
              dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${textPrimary}`}>#{order.raqam}</span>
                <StatusBadge status={order.status} />
              </div>
              <span className={`text-xs ${textSec}`}>{formatVaqt(order.yangilanganVaqt)}</span>
            </div>
            <p className={`text-sm font-medium ${textPrimary}`}>{order.mijozIsmi}</p>
            <p className={`text-xs mt-0.5 ${textSec}`}>{order.telefon}</p>
            {order.manzil && <p className={`text-xs mt-0.5 truncate ${textSec}`}>📍 {order.manzil}</p>}
            {order.otkazSababi && (
              <p className={`text-xs mt-1.5 ${textSec}`}>Sabab: <span className={textPrimary}>{order.otkazSababi}</span></p>
            )}
          </button>
        ))
      )}
    </div>
  );
}
