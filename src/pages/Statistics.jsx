import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { computeStats } from '../services/orders';
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

export default function Statistics({ orders = [] }) {
  const { dark } = useTheme();
  const [period, setPeriod] = useState('kun');
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );

  const stats = computeStats(orders, period, period === 'sana' ? selectedDate : null);
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

  return (
    <div className="p-4 space-y-4">

      {/* Period tabs */}
      <div className={`flex rounded-2xl p-1 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 ${
              period === p.key
                ? 'bg-blue-600 text-white shadow-sm'
                : dark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {p.key === 'sana' && <Calendar size={13} />}
            {p.label}
          </button>
        ))}
      </div>

      {/* Sana tanlash */}
      {period === 'sana' && (
        <div className={`rounded-2xl p-3 ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'} shadow-sm`}>
          <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Sanani tanlang
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border-2 transition-all ${
              dark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            } focus:border-blue-500`}
          />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          dark={dark}
          label="Daromad"
          value={`${formatSum(stats.daromad)} so'm`}
          sub={`${stats.periodTushum} ta tugagan — ${periodLabel}`}
          color="text-green-500"
          bgColor={dark ? 'bg-green-950' : 'bg-green-50'}
        />
        <StatCard
          dark={dark}
          label="Umumiy qarz"
          value={`${formatSum(stats.jamilarQarz)} so'm`}
          sub="Barcha vaqtlar"
          color="text-red-500"
          bgColor={dark ? 'bg-red-950' : 'bg-red-50'}
        />
      </div>

      {/* Bar chart */}
      <div className={`rounded-2xl p-4 ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'} shadow-sm`}>
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
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: cfg.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status counts grid */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(STATUS_LABELS).map(([key, cfg]) => (
          <div
            key={key}
            className={`rounded-xl p-3 text-center ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'} shadow-sm`}
          >
            <div className="text-2xl font-extrabold" style={{ color: cfg.color }}>
              {stats.statusCounts[key] || 0}
            </div>
            <div className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{cfg.label}</div>
          </div>
        ))}
      </div>

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
