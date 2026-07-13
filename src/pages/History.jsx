import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import { formatVaqt, formatSum } from '../utils/formatlash';

const IJRO_LABELS = [
  { key: 'zayavka',    label: 'Zayavka' },
  { key: 'yuvilmoqda', label: 'Yuvilmoqda' },
  { key: 'pardozda',   label: 'Pardozda' },
  { key: 'dastavka',   label: 'Dastavka' },
];

// Buyurtmada ishtirok etgan barcha xodim nomlari (ijrochilar qiymatlari)
function ishtirokchilar(order) {
  return Object.values(order.ijrochilar || {}).filter(Boolean);
}

export default function History({ orders }) {
  const { dark } = useTheme();
  const [filterDate, setFilterDate] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [selected, setSelected] = useState(null);

  const allFinished = orders
    .filter(o => o.status === 'tugadi')
    .sort((a, b) => new Date(b.tugatilganVaqt || b.yangilanganVaqt) - new Date(a.tugatilganVaqt || a.yangilanganVaqt));

  // Barcha ijrochilar ro'yxati — filtr uchun
  const allPersons = [...new Set(allFinished.flatMap(ishtirokchilar))].sort();

  const finished = allFinished
    .filter(o => {
      if (!filterDate) return true;
      const d = new Date(o.tugatilganVaqt || o.yangilanganVaqt);
      const t = new Date(filterDate);
      return d.getFullYear() === t.getFullYear() &&
             d.getMonth()    === t.getMonth()    &&
             d.getDate()     === t.getDate();
    })
    .filter(o => !filterPerson || ishtirokchilar(o).includes(filterPerson));

  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSec = dark ? 'text-gray-400' : 'text-gray-500';

  // ── Detal (Mijozlar sahifasidek — sahifa ichida, modal emas) ──
  if (selected) {
    return <OrderDetail order={selected} dark={dark} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className={`text-sm font-semibold flex-shrink-0 ${textSec}`}>
          {finished.length} / {allFinished.length} ta
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

      {/* Xodim bo'yicha filtr */}
      {allPersons.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-semibold flex-shrink-0 ${textSec}`}>👤 Xodim:</span>
          <select
            value={filterPerson}
            onChange={e => setFilterPerson(e.target.value)}
            className={`text-sm rounded-xl px-3 py-1.5 outline-none border-2 flex-1 transition-all ${
              filterPerson
                ? 'border-blue-500 ' + (dark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-800')
                : dark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <option value="">Barchasi</option>
            {allPersons.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {filterPerson && (
            <button
              onClick={() => setFilterPerson('')}
              className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold flex-shrink-0 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {finished.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <PackageOpen size={48} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${textSec}`}>Tarix bo'sh</p>
        </div>
      ) : (
        finished.map(order => (
          <button
            key={order.id}
            onClick={() => setSelected(order)}
            className={`w-full text-left rounded-2xl p-4 mb-3 border shadow-sm transition-all active:scale-[0.99] ${
              dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${textPrimary}`}>#{order.id}</span>
                <StatusBadge status={order.status} />
              </div>
              <span className={`text-xs ${textSec}`}>{formatVaqt(order.tugatilganVaqt || order.yangilanganVaqt)}</span>
            </div>
            <p className={`text-sm font-medium ${textPrimary}`}>{order.mijozIsmi}</p>
            <p className={`text-xs mt-0.5 ${textSec}`}>{order.telefon}</p>
            {order.manzil && <p className={`text-xs mt-0.5 truncate ${textSec}`}>📍 {order.manzil}</p>}
            {order.yakuniySumma > 0 && (
              <div className={`flex items-center justify-between mt-2 pt-2 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                <span className={`text-xs font-medium ${textSec}`}>
                  {order.tolov?.turi === 'naqd' ? '💵 Naqd' : order.tolov?.turi === 'karta' ? '💳 Karta' : order.tolov?.turi === 'aralash' ? '🔀 Aralash' : '—'}
                </span>
                <span className="text-green-500 font-bold text-sm">{formatSum(order.yakuniySumma)} so'm</span>
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );
}

// ── Buyurtma detali — sahifa ichida (Mijozlardek) ──
export function OrderDetail({ order, dark, onBack }) {
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSec = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="p-4">
      <button
        onClick={onBack}
        className={`flex items-center gap-2 mb-4 text-sm font-semibold ${dark ? 'text-blue-400' : 'text-blue-600'}`}
      >
        ← Ortga
      </button>

      <div className={`rounded-2xl p-4 mb-4 ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'} shadow-sm`}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className={`text-lg font-bold ${textPrimary}`}>Buyurtma #{order.id}</h2>
          <StatusBadge status={order.status} />
        </div>
        <span className={`text-xs ${textSec}`}>Faqat ko'rish rejimi</span>
      </div>

      <Section title="MIJOZ MA'LUMOTLARI" dark={dark}>
        <InfoRow label="Mijoz" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.mijozIsmi || '—'}</span></InfoRow>
        <InfoRow label="Telefon" dark={dark}><a href={`tel:${order.telefon}`} className="text-blue-500 text-sm">{order.telefon}</a></InfoRow>
        <InfoRow label="Manzil" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.manzil || '—'}</span></InfoRow>
        {order.otkazSababi && <InfoRow label="Otkaz sababi" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.otkazSababi}</span></InfoRow>}
        <InfoRow label="Yaratilgan" dark={dark}><span className={`text-xs ${textSec}`}>{formatVaqt(order.yaratilganVaqt)}</span></InfoRow>
        <InfoRow label="Yakunlangan" dark={dark}><span className={`text-xs ${textSec}`}>{formatVaqt(order.tugatilganVaqt || order.yangilanganVaqt)}</span></InfoRow>
      </Section>

      <div className="mt-4">
        <Section title="IJROCHILAR (kim bajardi)" dark={dark}>
          {IJRO_LABELS.map(({ key, label }) => (
            <InfoRow key={key} label={label} dark={dark}>
              {order.ijrochilar?.[key]
                ? <span className={`text-sm font-medium ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{order.ijrochilar[key]}</span>
                : <span className={`text-sm ${textSec}`}>—</span>}
            </InfoRow>
          ))}
        </Section>
      </div>

      {order.tovarlar && (order.tovarlar.gilamSoni > 0 || order.tovarlar.odealSoni > 0 || order.tovarlar.korpaSoni > 0 || order.tovarlar.korpachaSoni > 0 || order.tovarlar.pardaBor) && (
        <div className="mt-4">
          <Section title="TOVARLAR" dark={dark}>
            {order.tovarlar.gilamSoni > 0 && <InfoRow label="Gilam" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.gilamSoni} dona</span></InfoRow>}
            {order.tovarlar.odealSoni > 0 && <InfoRow label="Odeal" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.odealSoni} dona</span></InfoRow>}
            {order.tovarlar.korpaSoni > 0 && <InfoRow label="Ko'rpa" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.korpaSoni} dona</span></InfoRow>}
            {order.tovarlar.korpachaSoni > 0 && <InfoRow label="Ko'rpacha" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tovarlar.korpachaSoni} dona</span></InfoRow>}
            {order.tovarlar.pardaBor && <InfoRow label="Parda" dark={dark}><span className={`text-sm ${textPrimary}`}>Bor</span></InfoRow>}
          </Section>
        </div>
      )}

      {order.narxlar?.gilamlar?.length > 0 && (
        <div className="mt-4">
          <Section title="NARXLASH TAFSILOTI" dark={dark}>
            {order.narxlar.gilamlar.map((g, i) => g.jami > 0 && (
              <InfoRow key={i} label={`Gilam ${i + 1}`} dark={dark}>
                <span className={`text-xs ${textPrimary}`}>{g.yuza}m² × {formatSum(g.narxM2)} = <span className="font-bold text-green-500">{formatSum(g.jami)}</span> so'm</span>
              </InfoRow>
            ))}
          </Section>
        </div>
      )}

      {order.umumiyHisob > 0 && (
        <div className="mt-4 mb-4">
          <Section title="TO'LOV" dark={dark}>
            <InfoRow label="Jami hisob" dark={dark}><span className={`text-sm font-bold ${textPrimary}`}>{formatSum(order.umumiyHisob)} so'm</span></InfoRow>
            {order.chegirma > 0 && <InfoRow label="Chegirma" dark={dark}><span className="text-sm text-red-500">-{formatSum(order.chegirma)} so'm</span></InfoRow>}
            <InfoRow label="Yakuniy" dark={dark}><span className="text-sm font-extrabold text-green-600">{formatSum(order.yakuniySumma)} so'm</span></InfoRow>
            <InfoRow label="To'lov turi" dark={dark}><span className={`text-sm ${textPrimary}`}>{order.tolov?.turi || '—'}</span></InfoRow>
            {order.qarz > 0 && <InfoRow label="Qarz" dark={dark}><span className="text-sm font-bold text-red-500">{formatSum(order.qarz)} so'm</span></InfoRow>}
          </Section>
        </div>
      )}
    </div>
  );
}

export function Section({ title, dark, children }) {
  const textSec = dark ? 'text-gray-500' : 'text-gray-400';
  return (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSec}`}>{title}</h3>
      <div className={`rounded-2xl border overflow-hidden ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
        {children}
      </div>
    </div>
  );
}

export function InfoRow({ label, dark, children }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b last:border-0 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
      <span className={`text-xs font-semibold ${dark ? 'text-gray-500' : 'text-gray-400'} w-24 flex-shrink-0`}>{label}</span>
      <div className="flex-1 text-right">{children}</div>
    </div>
  );
}
