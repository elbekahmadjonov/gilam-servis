import { useState, useEffect, useCallback } from 'react';
import { Calendar, Wallet, Flame, UtensilsCrossed, Users, MoreHorizontal, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { computeStats } from '../services/orders';
import { getXarajatlar, saveXarajat } from '../services/xarajatlar';
import { formatSum } from '../utils/formatlash';
import MoneyInput from '../components/MoneyInput';

const bugun = () => new Date().toISOString().split('T')[0];

const XARAJAT_MAYDONLAR = [
  { key: 'gaz',    label: 'Gaz',              icon: Flame,            color: 'text-orange-500' },
  { key: 'obed',   label: 'Obed',             icon: UtensilsCrossed,  color: 'text-amber-500'  },
  { key: 'ishchi', label: 'Kunlik ishchilar', icon: Users,            color: 'text-violet-500' },
  { key: 'boshqa', label: 'Boshqa rasxod',    icon: MoreHorizontal,   color: 'text-gray-500'   },
];

export default function Hisob({ orders = [] }) {
  const { dark } = useTheme();
  const { showToast } = useToast();

  const [xarajatlar, setXarajatlar] = useState([]);
  const [sana, setSana]   = useState(bugun);
  const [form, setForm]   = useState({ gaz: '', obed: '', ishchi: '', boshqa: '', izoh: '' });
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  const yukla = useCallback(() => {
    getXarajatlar().then(setXarajatlar);
  }, []);
  useEffect(() => { yukla(); }, [yukla]);

  // Sana o'zgarganda o'sha kundagi mavjud xarajatni formaga qo'yamiz
  useEffect(() => {
    const mavjud = xarajatlar.find(x => x.sana === sana);
    setForm(mavjud
      ? { gaz: String(mavjud.gaz || ''), obed: String(mavjud.obed || ''), ishchi: String(mavjud.ishchi || ''), boshqa: String(mavjud.boshqa || ''), izoh: mavjud.izoh || '' }
      : { gaz: '', obed: '', ishchi: '', boshqa: '', izoh: '' });
  }, [sana, xarajatlar]);

  const daromad = computeStats(orders, 'sana', sana).daromad;
  const jamiXarajat = ['gaz', 'obed', 'ishchi', 'boshqa']
    .reduce((s, k) => s + (Number(form[k]) || 0), 0);
  const sofFoyda = daromad - jamiXarajat;

  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saqla = async () => {
    setSaqlanmoqda(true);
    try {
      await saveXarajat(sana, {
        gaz:    Number(form.gaz)    || 0,
        obed:   Number(form.obed)   || 0,
        ishchi: Number(form.ishchi) || 0,
        boshqa: Number(form.boshqa) || 0,
        izoh:   form.izoh || '',
      });
      showToast('Xarajat saqlandi', 'success');
      yukla();
    } catch (e) {
      showToast('Xato: ' + e.message, 'error');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${
    dark ? 'bg-gray-800 text-white placeholder-gray-600 border-gray-700 focus:border-blue-500'
         : 'bg-gray-50 text-gray-800 placeholder-gray-400 border-gray-200 focus:border-blue-400'
  }`;

  return (
    <div className="p-4 space-y-4">
      {/* Sana tanlash */}
      <div className={`rounded-2xl p-3 border ${card} shadow-sm`}>
        <label className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Calendar size={13} /> Sanani tanlang
        </label>
        <input
          type="date"
          value={sana}
          onChange={e => setSana(e.target.value)}
          max={bugun()}
          className={inputCls}
        />
      </div>

      {/* Kunlik daromad */}
      <div className={`rounded-2xl p-4 border ${dark ? 'bg-green-950 border-green-900' : 'bg-green-50 border-green-100'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${dark ? 'text-green-300' : 'text-green-600'}`}>Kunlik daromad</span>
          <span className={`text-2xl font-extrabold ${dark ? 'text-white' : 'text-green-700'}`}>{formatSum(daromad)} so'm</span>
        </div>
      </div>

      {/* Xarajat maydonlari */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm space-y-3`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          Sarf-harajatlar (so'm)
        </h3>
        {XARAJAT_MAYDONLAR.map(({ key, label, icon: Icon, color }) => (
          <div key={key}>
            <label className={`text-sm font-medium mb-1 flex items-center gap-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              <Icon size={15} className={color} /> {label}
            </label>
            <MoneyInput value={form[key]} onChange={v => up(key, v)} className={inputCls} />
          </div>
        ))}
        <div>
          <label className={`text-sm font-medium mb-1 block ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Izoh (ixtiyoriy)</label>
          <input type="text" value={form.izoh} onChange={e => up('izoh', e.target.value)}
            placeholder="Qo'shimcha izoh..." className={inputCls} />
        </div>
      </div>

      {/* Jami xarajat + sof foyda */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl p-4 border ${dark ? 'bg-red-950 border-red-900' : 'bg-red-50 border-red-100'}`}>
          <div className={`text-xs font-semibold mb-1 ${dark ? 'text-red-300' : 'text-red-500'}`}>Jami xarajat</div>
          <div className="text-lg font-extrabold text-red-500">{formatSum(jamiXarajat)}</div>
        </div>
        <div className={`rounded-2xl p-4 border ${sofFoyda >= 0
          ? (dark ? 'bg-blue-950 border-blue-900' : 'bg-blue-50 border-blue-100')
          : (dark ? 'bg-orange-950 border-orange-900' : 'bg-orange-50 border-orange-100')}`}>
          <div className={`text-xs font-semibold mb-1 ${dark ? 'text-blue-300' : 'text-blue-500'}`}>Sof foyda</div>
          <div className={`text-lg font-extrabold ${sofFoyda >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>{formatSum(sofFoyda)}</div>
        </div>
      </div>

      {/* Saqlash */}
      <button onClick={saqla} disabled={saqlanmoqda}
        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
        <Check size={18} />{saqlanmoqda ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>

      {/* Oxirgi kunlar ro'yxati */}
      {xarajatlar.length > 0 && (
        <div className={`rounded-2xl border ${card} shadow-sm overflow-hidden`}>
          <div className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${dark ? 'text-gray-500 border-b border-gray-800' : 'text-gray-400 border-b border-gray-100'}`}>
            Oxirgi kunlar
          </div>
          {xarajatlar.slice(0, 15).map(x => {
            const jami = (x.gaz || 0) + (x.obed || 0) + (x.ishchi || 0) + (x.boshqa || 0);
            return (
              <button key={x.sana} onClick={() => setSana(x.sana)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-0 transition-colors ${
                  dark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-50 hover:bg-gray-50'
                } ${x.sana === sana ? (dark ? 'bg-gray-800' : 'bg-blue-50') : ''}`}>
                <div className="flex items-center gap-2">
                  <Wallet size={15} className="text-gray-400" />
                  <span className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {new Date(x.sana + 'T00:00:00').toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-500">−{formatSum(jami)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
