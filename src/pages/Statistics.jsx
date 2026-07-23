import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { computeStats, sumXarajatlar } from '../services/orders';
import { getXarajatlar } from '../services/xarajatlar';
import { getOyliklar, oyKaliti, oyNomi, oyBoyichaGuruh } from '../services/oyliklar';
import { formatSum } from '../utils/formatlash';

const PERIODS = [
  { key: 'kun',   label: 'Bugun' },
  { key: 'hafta', label: 'Hafta' },
  { key: 'oy',    label: 'Oy' },
  { key: 'sana',  label: 'Sana' },
];

const XARAJAT_LABELS = [
  { key: 'gaz',    label: 'Gaz' },
  { key: 'svet',   label: 'Svet' },
  { key: 'obed',   label: 'Obed' },
  { key: 'ishchi', label: 'Kunlik ishchilar' },
  { key: 'boshqa', label: 'Boshqa rasxod' },
];

export default function Statistics({ orders = [], role }) {
  const { dark } = useTheme();
  const [period, setPeriod] = useState('kun');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  // "Sana" bo'limida kun yoki oy tanlash mumkin — qaysi biri oxirgi tanlangan bo'lsa o'sha ishlaydi
  const [selectedMonth, setSelectedMonth] = useState(() => oyKaliti());
  const [sanaTuri, setSanaTuri] = useState('kun');   // 'kun' | 'oy'
  const [xarajatlar, setXarajatlar] = useState([]);
  const [oyliklar, setOyliklar] = useState([]);

  // Hisob-kitob (daromad/xarajat/sof foyda) statistikada hammaga ko'rinadi.
  // (Xarajat KIRITISH esa faqat Owner uchun — Hisob sahifasida.)
  useEffect(() => {
    getXarajatlar().then(setXarajatlar);
    getOyliklar().then(setOyliklar);
  }, []);

  // "Sana" bo'limida oy tanlansa — davr 'tanlanganOy' bo'ladi
  const oySortda = period === 'sana' && sanaTuri === 'oy';
  const amaldagiDavr = oySortda ? 'tanlanganOy' : period;
  const amaldagiSana = oySortda ? selectedMonth : (period === 'sana' ? selectedDate : null);

  const stats = computeStats(orders, amaldagiDavr, amaldagiSana);
  const xarajat = sumXarajatlar(xarajatlar, amaldagiDavr, amaldagiSana);

  // Oyliklar oy bo'yicha hisoblanganda ko'rinadi:
  //  • "Oy" sorti      → joriy kalendar oyi
  //  • "Sana → oy"     → tanlangan oy
  const joriyOy = oyKaliti();
  const hisobOyi = period === 'oy' ? joriyOy : (oySortda ? selectedMonth : null);
  const shuOyOyliklar = hisobOyi ? oyliklar.filter(o => o.oy === hisobOyi) : [];
  const jamiOylik = shuOyOyliklar.reduce((s, o) => s + o.summa, 0);

  const jamiXarajat = xarajat.jami + jamiOylik;
  const sofFoyda = stats.daromad - jamiXarajat;

  const periodLabel = period === 'kun'
    ? 'bugun'
    : period === 'hafta'
    ? 'bu hafta'
    : period === 'oy'
    ? oyNomi(joriyOy)
    : oySortda
    ? oyNomi(selectedMonth)
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

      {/* Sana / oy tanlash — qaysi biri oxirgi tanlangan bo'lsa o'sha ishlaydi */}
      {period === 'sana' && (
        <div className={`rounded-2xl p-3 border ${card} shadow-sm space-y-3`}>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>Sanani tanlang</span>
              {sanaTuri === 'kun' && <span className="text-blue-500 normal-case">✓ faol</span>}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setSanaTuri('kun'); }}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border-2 transition-all ${
                sanaTuri === 'kun'
                  ? 'border-blue-500 ' + (dark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-800')
                  : dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              } focus:border-blue-500`}
            />
          </div>

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>Oyni tanlang</span>
              {sanaTuri === 'oy' && <span className="text-blue-500 normal-case">✓ faol</span>}
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setSanaTuri('oy'); }}
              max={oyKaliti()}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border-2 transition-all ${
                sanaTuri === 'oy'
                  ? 'border-blue-500 ' + (dark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-800')
                  : dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              } focus:border-blue-500`}
            />
            <p className={`text-xs mt-1.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              Tanlangan oyning to'liq statistikasi (oyliklar bilan) chiqadi
            </p>
          </div>
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

      {/* Daromad tafsiloti — xarajatlar (hammaga) */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Daromad tafsiloti — {periodLabel}
          </h3>
          <Row dark={dark} label="Daromad" value={`+${formatSum(stats.daromad)}`} valueColor="text-green-500" />
          {XARAJAT_LABELS.map(x => (
            <Row key={x.key} dark={dark} label={x.label} value={`−${formatSum(xarajat[x.key])}`} valueColor="text-red-400" indent />
          ))}

          {/* Oyliklar — faqat "Oy" sortida */}
          {hisobOyi && shuOyOyliklar.length > 0 && (
            <>
              <div className={`mt-2 pt-2 border-t text-xs font-bold uppercase tracking-wider ${
                dark ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'
              }`}>
                Xodimlar oyligi
              </div>
              {/* Bir xodimga bir necha to'lov bo'lishi mumkin — guruhlab ko'rsatamiz */}
              {oyBoyichaGuruh(oyliklar, hisobOyi).map(g => (
                <Row key={g.xodimId} dark={dark}
                  label={`${g.ism} (${g.rol})${g.soni > 1 ? ` · ${g.soni} ta` : ''}`}
                  value={`−${formatSum(g.summa)}`} valueColor="text-red-400" indent />
              ))}
              <Row dark={dark} label="Jami oyliklar" value={`−${formatSum(jamiOylik)}`} valueColor="text-red-500" />
            </>
          )}

          <Row dark={dark} label="Jami xarajat" value={`−${formatSum(jamiXarajat)}`} valueColor="text-red-500" bold />
          <div className={`mt-2 pt-2 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <Row dark={dark} label="Sof foyda" value={`${formatSum(sofFoyda)} so'm`}
              valueColor={sofFoyda >= 0 ? 'text-blue-500' : 'text-orange-500'} bold big />
          </div>
        </div>

      {/* Kutilayotgan daromad — AYNI PAYTDAGI holat, davrga bog'liq emas */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          Kutilayotgan daromad
        </h3>
        <p className={`text-xs mb-3 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          Hozir jarayonda turgan buyurtmalar (ayni paytdagi holat)
        </p>

        <Row dark={dark} label={`Pardozda (${stats.kutilayotgan.pardozda.soni} ta)`}
          value={`${formatSum(stats.kutilayotgan.pardozda.summa)} so'm`}
          valueColor="text-violet-500" />
        <Row dark={dark} label={`Dostavka (${stats.kutilayotgan.dostavka.soni} ta)`}
          value={`${formatSum(stats.kutilayotgan.dostavka.summa)} so'm`}
          valueColor="text-blue-500" />

        <div className={`mt-2 pt-2 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <Row dark={dark} label={`Jami kutilmoqda (${stats.kutilayotgan.jamiSoni} ta)`}
            value={`${formatSum(stats.kutilayotgan.jamiSumma)} so'm`}
            valueColor="text-amber-500" bold big />
        </div>
      </div>

      {/* Qarz tafsiloti — umumiy qarz alohida ko'rsatiladi (hammaga) */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          Qarz tafsiloti
        </h3>
        <Row dark={dark} label="Umumiy qarz (barcha vaqt)" value={`${formatSum(stats.jamilarQarz)} so'm`} valueColor="text-red-500" bold />
      </div>

      {/* Yuvilgan mahsulot hajmi (pardozdaga o'tgan buyurtmalar) */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          🫧 YUVILGAN MAHSULOT HAJMI — {periodLabel}
          <span className={`ml-2 normal-case font-semibold ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            ({stats.yuvilganHajm.soni} ta buyurtma)
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <HajmCard dark={dark} label="Gilam" value={`${formatSum(stats.yuvilganHajm.gilamM2)} m²`} sub={`${stats.yuvilganHajm.gilamSoni} dona`} accent="text-cyan-500" />
          <HajmCard dark={dark} label="Ko'rpacha" value={`${formatSum(stats.yuvilganHajm.korpachaMetr)} m`} accent="text-violet-500" />
          <HajmCard dark={dark} label="Parda" value={`${formatSum(stats.yuvilganHajm.pardaKg)} kg`} accent="text-teal-500" />
          <HajmCard dark={dark} label="Odeal" value={`${stats.yuvilganHajm.odealSoni} dona`} accent="text-amber-500" />
          <HajmCard dark={dark} label="Ko'rpa" value={`${stats.yuvilganHajm.korpaSoni} dona`} accent="text-pink-500" />
        </div>
      </div>

      {/* Tugallangan buyurtmalar mahsulot hajmi (davr bo'yicha) */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          ✅ TUGALLANGAN MAHSULOT HAJMI — {periodLabel}
          <span className={`ml-2 normal-case font-semibold ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            ({stats.hajm.soni} ta buyurtma)
          </span>
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
