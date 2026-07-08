import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { computeStats, sumXarajatlar } from '../services/orders';
import { getXarajatlar } from '../services/xarajatlar';
import { formatSum } from '../utils/formatlash';

const STATUS_LABELS = {
  yangi:     { label: 'Zayavka',    color: '#16a34a' },
  jarayonda: { label: 'Yuvilmoqda', color: '#ea580c' },
  qadoqlash: { label: 'Pardozda',   color: '#7c3aed' },
  dostavka:  { label: 'Dastavka',   color: '#2563eb' },
  tugadi:    { label: 'Tugadi',     color: '#6b7280' },
  otkaz:     { label: 'Otkaz',      color: '#dc2626' },
};

const PERIODS = [
  { key: 'kun',   label: 'Bugun' },
  { key: 'hafta', label: 'Hafta' },
  { key: 'oy',    label: 'Oy' },
  { key: 'sana',  label: 'Sana' },
];

const XARAJAT_LABELS = [
  { key: 'gaz',    label: 'Gaz' },
  { key: 'obed',   label: 'Obed' },
  { key: 'ishchi', label: 'Kunlik ishchilar' },
  { key: 'boshqa', label: 'Boshqa rasxod' },
];

export default function Statistics({ orders = [], role }) {
  const { dark } = useTheme();
  const [period, setPeriod] = useState('kun');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [xarajatlar, setXarajatlar] = useState([]);

  const isOwner = role === 'Owner';

  // Xarajatlarni faqat Owner ko'radi (API ham Owner bilan cheklangan)
  useEffect(() => {
    if (isOwner) getXarajatlar().then(setXarajatlar);
  }, [isOwner]);

  const stats = computeStats(orders, period, period === 'sana' ? selectedDate : null);
  const xarajat = sumXarajatlar(xarajatlar, period, period === 'sana' ? selectedDate : null);
  const sofFoyda = stats.daromad - xarajat.jami;
  const maxCount = Math.max(...Object.values(stats.statusCounts), 1);

  const periodLabel = period === 'kun'
    ? 'bugun'
    : period === 'hafta'
    ? 'bu hafta'
    : period === 'oy'
    ? 'bu oy'
    : selectedDate
      ? new Date(selectedDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'tanlangan sana';

  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';

  return (
    <div className="p-4 space-y-4">

      {/* Period tabs */}
      <div className={`flex rounded-2xl p-1 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 ${
              period === p.key ? 'bg-blue-600 text-white shadow-sm' : dark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {p.key === 'sana' && <Calendar size={13} />}
            {p.label}
          </button>
        ))}
      </div>

      {/* Sana tanlash */}
      {period === 'sana' && (
        <div className={`rounded-2xl p-3 border ${card} shadow-sm`}>
          <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Sanani tanlang
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border-2 transition-all ${
              dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
            } focus:border-blue-500`}
          />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard dark={dark} label="Daromad" value={`${formatSum(stats.daromad)} so'm`}
          sub={`${stats.periodTushum} ta tugagan — ${periodLabel}`}
          color="text-green-500" bgColor={dark ? 'bg-green-950' : 'bg-green-50'} />
        <StatCard dark={dark} label="Umumiy qarz" value={`${formatSum(stats.jamilarQarz)} so'm`}
          sub="Barcha vaqtlar" color="text-red-500" bgColor={dark ? 'bg-red-950' : 'bg-red-50'} />
      </div>

      {/* Daromad tafsiloti — xarajatlar (faqat Owner) */}
      {isOwner && (
        <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Daromad tafsiloti — {periodLabel}
          </h3>
          <Row dark={dark} label="Daromad" value={`+${formatSum(stats.daromad)}`} valueColor="text-green-500" />
          {XARAJAT_LABELS.map(x => (
            <Row key={x.key} dark={dark} label={x.label} value={`−${formatSum(xarajat[x.key])}`} valueColor="text-red-400" indent />
          ))}
          <Row dark={dark} label="Jami xarajat" value={`−${formatSum(xarajat.jami)}`} valueColor="text-red-500" bold />
          <div className={`mt-2 pt-2 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <Row dark={dark} label="Sof foyda" value={`${formatSum(sofFoyda)} so'm`}
              valueColor={sofFoyda >= 0 ? 'text-blue-500' : 'text-orange-500'} bold big />
          </div>
        </div>
      )}

      {/* Qarz tafsiloti (faqat Owner) — umumiy qarz alohida ko'rsatiladi */}
      {isOwner && (
        <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Qarz tafsiloti
          </h3>
          <Row dark={dark} label="Umumiy qarz (barcha vaqt)" value={`${formatSum(stats.jamilarQarz)} so'm`} valueColor="text-red-500" bold />
        </div>
      )}

      {/* Bar chart */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          STATUS BO'YICHA (hozirgi)
        </h3>
        <div className="space-y-3">
          {Object.entries(STATUS_LABELS).map(([key, cfg]) => {
            const count = stats.statusCounts[key] || 0;
            const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{cfg.label}</span>
                  <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{count}</span>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: cfg.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status counts grid */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(STATUS_LABELS).map(([key, cfg]) => (
          <div key={key} className={`rounded-xl p-3 text-center border ${card} shadow-sm`}>
            <div className="text-2xl font-extrabold" style={{ color: cfg.color }}>
              {stats.statusCounts[key] || 0}
            </div>
            <div className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Mahsulot hajmi statistikasi (davr bo'yicha) */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          MAHSULOT HAJMI — {periodLabel}
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <HajmCard dark={dark} label="Gilam" value={`${formatSum(stats.hajm.gilamM2)} m²`} sub={`${stats.hajm.gilamSoni} dona`} accent="text-blue-500" />
          <HajmCard dark={dark} label="Ko'rpacha" value={`${formatSum(stats.hajm.korpachaMetr)} m`} accent="text-violet-500" />
          <HajmCard dark={dark} label="Parda" value={`${formatSum(stats.hajm.pardaKg)} kg`} accent="text-teal-500" />
          <HajmCard dark={dark} label="Odeal" value={`${stats.hajm.odealSoni} dona`} accent="text-amber-500" />
          <HajmCard dark={dark} label="Ko'rpa" value={`${stats.hajm.korpaSoni} dona`} accent="text-pink-500" />
        </div>
      </div>

    </div>
  );
}

function Row({ dark, label, value, valueColor, bold, big, indent }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`${big ? 'text-sm font-bold' : 'text-sm'} ${indent ? 'pl-3' : ''} ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      <span className={`${big ? 'text-lg' : 'text-sm'} ${bold ? 'font-extrabold' : 'font-semibold'} ${valueColor}`}>{value}</span>
    </div>
  );
}

function HajmCard({ dark, label, value, sub, accent }) {
  return (
    <div className={`rounded-xl p-3 ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-lg font-extrabold ${accent}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{sub}</div>}
    </div>
  );
}

function StatCard({ label, value, sub, color, bgColor, dark }) {
  return (
    <div className={`rounded-2xl p-4 ${bgColor} border ${dark ? 'border-gray-800' : 'border-transparent'}`}>
      <div className={`text-xs font-semibold mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-lg font-extrabold leading-tight ${color}`}>{value}</div>
      <div className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{sub}</div>
    </div>
  );
}
