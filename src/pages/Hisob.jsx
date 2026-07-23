import { useState, useEffect, useCallback } from 'react';
import { Calendar, Wallet, Flame, Zap, UtensilsCrossed, Users, MoreHorizontal, Check, Trash2, BadgeDollarSign } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { computeStats } from '../services/orders';
import { getXarajatlar, saveXarajat } from '../services/xarajatlar';
import {
  getXodimlar, getOyliklar, saveOylik, removeOylik, oyKaliti, oyNomi,
  xodimTolovlari, oyBoyichaGuruh,
} from '../services/oyliklar';
import { formatSum, formatVaqt } from '../utils/formatlash';
import MoneyInput from '../components/MoneyInput';

const bugun = () => new Date().toISOString().split('T')[0];

const XARAJAT_MAYDONLAR = [
  { key: 'gaz',    label: 'Gaz',              icon: Flame,            color: 'text-orange-500' },
  { key: 'svet',   label: 'Svet',             icon: Zap,              color: 'text-yellow-500' },
  { key: 'obed',   label: 'Obed',             icon: UtensilsCrossed,  color: 'text-amber-500'  },
  { key: 'ishchi', label: 'Kunlik ishchilar', icon: Users,            color: 'text-violet-500' },
  { key: 'boshqa', label: 'Boshqa rasxod',    icon: MoreHorizontal,   color: 'text-gray-500'   },
];

// Maydon kalitlari — bitta manbadan (yangi xarajat qo'shilsa shu yerga qo'shiladi)
const XKEYS = XARAJAT_MAYDONLAR.map(x => x.key);
const BOSH_FORMA = () => ({ ...Object.fromEntries(XKEYS.map(k => [k, ''])), izoh: '' });

export default function Hisob({ orders = [] }) {
  const { dark } = useTheme();
  const { showToast } = useToast();

  const [bolim, setBolim] = useState('kunlik');   // 'kunlik' | 'oylik'
  const [xarajatlar, setXarajatlar] = useState([]);
  const [sana, setSana]   = useState(bugun);
  const [form, setForm]   = useState(BOSH_FORMA);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  const yukla = useCallback(() => {
    getXarajatlar().then(setXarajatlar);
  }, []);
  useEffect(() => { yukla(); }, [yukla]);

  // Sana o'zgarganda o'sha kundagi mavjud xarajatni formaga qo'yamiz
  useEffect(() => {
    const mavjud = xarajatlar.find(x => x.sana === sana);
    setForm(mavjud
      ? { ...Object.fromEntries(XKEYS.map(k => [k, String(mavjud[k] || '')])), izoh: mavjud.izoh || '' }
      : BOSH_FORMA());
  }, [sana, xarajatlar]);

  const daromad = computeStats(orders, 'sana', sana).daromad;
  const jamiXarajat = XKEYS.reduce((s, k) => s + (Number(form[k]) || 0), 0);
  const sofFoyda = daromad - jamiXarajat;

  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saqla = async () => {
    setSaqlanmoqda(true);
    try {
      await saveXarajat(sana, {
        ...Object.fromEntries(XKEYS.map(k => [k, Number(form[k]) || 0])),
        izoh: form.izoh || '',
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

  const bolimTabs = (
    <div className={`flex rounded-2xl p-1 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {[{ key: 'kunlik', label: 'Kunlik xarajat' }, { key: 'oylik', label: 'Oyliklar' }].map(b => (
        <button
          key={b.key}
          onClick={() => setBolim(b.key)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            bolim === b.key ? 'bg-blue-600 text-white shadow-sm' : dark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );

  if (bolim === 'oylik') {
    return (
      <div className="p-4 space-y-4">
        {bolimTabs}
        <OylikBolimi dark={dark} card={card} inputCls={inputCls} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {bolimTabs}

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
            const jami = XKEYS.reduce((sum, k) => sum + (x[k] || 0), 0);
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

// ── Oyliklar: xodim tanlanadi → o'sha oy uchun maosh yoziladi ──
// Kunlik xarajatlardan alohida saqlanadi; statistikada faqat "Oy" sortida ko'rinadi.
function OylikBolimi({ dark, card, inputCls, showToast }) {
  const [xodimlar, setXodimlar]   = useState([]);
  const [oyliklar, setOyliklar]   = useState([]);
  const [oy, setOy]               = useState(() => oyKaliti());
  const [xodimId, setXodimId]     = useState(null);
  const [summa, setSumma]         = useState('');
  const [izoh, setIzoh]           = useState('');
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  const yukla = useCallback(() => { getOyliklar().then(setOyliklar); }, []);
  useEffect(() => { getXodimlar().then(setXodimlar); yukla(); }, [yukla]);

  // Xodim yoki oy o'zgarsa — forma bo'shatiladi (yangi to'lov kiritish uchun)
  useEffect(() => {
    setSumma('');
    setIzoh('');
  }, [xodimId, oy]);

  const shuOy = oyliklar.filter(o => o.oy === oy);
  const jamiOylik = shuOy.reduce((s, o) => s + o.summa, 0);
  const tanlangan = xodimlar.find(x => x.id === xodimId);

  // Tanlangan xodimning shu oydagi to'lovlari va jami summasi
  const tolovlar = xodimId ? xodimTolovlari(oyliklar, xodimId, oy) : [];
  const xodimJami = tolovlar.reduce((s, o) => s + o.summa, 0);
  const yangiSumma = Number(summa) || 0;

  const saqla = async () => {
    if (!xodimId || yangiSumma <= 0) return;
    setSaqlanmoqda(true);
    try {
      await saveOylik(xodimId, oy, yangiSumma, izoh);
      showToast(`+${formatSum(yangiSumma)} qo'shildi`, 'success');
      setSumma('');
      setIzoh('');
      yukla();
    } catch (e) {
      showToast('Xato: ' + e.message, 'error');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  const ochir = async (id) => {
    try {
      await removeOylik(id);
      showToast('To\'lov o\'chirildi', 'success');
      yukla();
    } catch (e) {
      showToast('Xato: ' + e.message, 'error');
    }
  };

  const textSec = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <>
      {/* Oy tanlash */}
      <div className={`rounded-2xl p-3 border ${card} shadow-sm`}>
        <label className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${textSec}`}>
          <Calendar size={13} /> Oyni tanlang
        </label>
        <input type="month" value={oy} onChange={e => setOy(e.target.value)} className={inputCls} />
      </div>

      {/* Xodim tanlash */}
      <div className={`rounded-2xl p-4 border ${card} shadow-sm`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${textSec}`}>
          Xodimni tanlang
        </h3>
        {xodimlar.length === 0 ? (
          <p className={`text-sm ${textSec}`}>Xodimlar yo'q</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {xodimlar.map(x => {
              const yozilgan = oyliklar.find(o => o.xodimId === x.id && o.oy === oy);
              const faol = xodimId === x.id;
              return (
                <button
                  key={x.id}
                  onClick={() => setXodimId(x.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    faol
                      ? 'bg-blue-600 text-white'
                      : dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {x.ism}
                  <span className={`ml-1.5 text-xs font-normal ${faol ? 'text-blue-100' : textSec}`}>
                    {x.rol}
                  </span>
                  {yozilgan && <span className="ml-1.5 text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* To'lov qo'shish — tanlangan xodim uchun */}
      {xodimId && (
        <div className={`rounded-2xl p-4 border ${card} shadow-sm space-y-3`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textSec}`}>
            {tanlangan?.ism} — {oyNomi(oy)}
          </h3>

          {/* Shu oyda allaqachon yozilgan summa */}
          <div className={`rounded-xl p-3 ${dark ? 'bg-gray-800' : 'bg-emerald-50'}`}>
            <div className={`text-xs font-semibold mb-0.5 ${dark ? 'text-gray-400' : 'text-emerald-700'}`}>
              Bu oyda yozilgan
            </div>
            <div className={`text-xl font-extrabold ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {formatSum(xodimJami)} so'm
            </div>
            <div className={`text-xs mt-0.5 ${textSec}`}>
              {tolovlar.length} ta to'lov
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium mb-1 flex items-center gap-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              <BadgeDollarSign size={15} className="text-emerald-500" /> Qo'shiladigan summa (so'm)
            </label>
            <MoneyInput value={summa} onChange={setSumma} className={inputCls} />
          </div>
          <div>
            <label className={`text-sm font-medium mb-1 block ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              Izoh (ixtiyoriy)
            </label>
            <input type="text" value={izoh} onChange={e => setIzoh(e.target.value)}
              placeholder="Avans, bonus..." className={inputCls} />
          </div>

          {/* Qo'shilgandan keyingi jami */}
          {yangiSumma > 0 && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${dark ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <span className={dark ? 'text-gray-400' : 'text-blue-700'}>Qo'shilgandan keyin</span>
              <span className={`font-extrabold ${dark ? 'text-blue-400' : 'text-blue-700'}`}>
                {formatSum(xodimJami + yangiSumma)} so'm
              </span>
            </div>
          )}

          <button onClick={saqla} disabled={saqlanmoqda || yangiSumma <= 0}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
            <Check size={18} />{saqlanmoqda ? 'Saqlanmoqda...' : "To'lov qo'shish"}
          </button>
        </div>
      )}

      {/* Tanlangan xodimning to'lov tarixi */}
      {xodimId && (
        <div className={`rounded-2xl border ${card} shadow-sm overflow-hidden`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${textSec}`}>
              {tanlangan?.ism} — to'lovlar tarixi
            </span>
            <span className="text-sm font-extrabold text-red-500">−{formatSum(xodimJami)}</span>
          </div>
          {tolovlar.length === 0 ? (
            <p className={`px-4 py-5 text-sm text-center ${textSec}`}>
              Bu oyda to'lov yozilmagan
            </p>
          ) : (
            tolovlar.map(o => (
              <div key={o.id}
                className={`flex items-center justify-between px-4 py-3 border-b last:border-0 ${dark ? 'border-gray-800' : 'border-gray-50'}`}>
                <div className="flex items-center gap-2 flex-1">
                  <Wallet size={15} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <div className={`text-sm font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {formatSum(o.summa)} so'm
                    </div>
                    <div className={`text-xs ${textSec}`}>
                      {o.vaqt ? formatVaqt(o.vaqt) : ''}{o.izoh ? ` · ${o.izoh}` : ''}
                    </div>
                  </div>
                </div>
                <button onClick={() => ochir(o.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-gray-800 text-red-400' : 'bg-red-50 text-red-500'}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Shu oydagi barcha xodimlar — umumiy ko'rinish */}
      <div className={`rounded-2xl border ${card} shadow-sm overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${textSec}`}>
            {oyNomi(oy)} — barcha oyliklar
          </span>
          <span className="text-sm font-extrabold text-red-500">−{formatSum(jamiOylik)}</span>
        </div>
        {shuOy.length === 0 ? (
          <p className={`px-4 py-5 text-sm text-center ${textSec}`}>Bu oyga oylik yozilmagan</p>
        ) : (
          oyBoyichaGuruh(oyliklar, oy).map(g => (
            <button key={g.xodimId} onClick={() => setXodimId(g.xodimId)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-0 transition-colors ${
                dark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-50 hover:bg-gray-50'
              } ${g.xodimId === xodimId ? (dark ? 'bg-gray-800' : 'bg-blue-50') : ''}`}>
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-gray-400" />
                <div>
                  <div className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{g.ism}</div>
                  <div className={`text-xs ${textSec}`}>{g.rol} · {g.soni} ta to'lov</div>
                </div>
              </div>
              <span className="text-sm font-bold text-red-500">−{formatSum(g.summa)}</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}
