import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatSum } from '../utils/formatlash';
import MoneyInput from './MoneyInput';

export default function TolovOyna({ order, dark, onClose, onSave }) {
  const [chegirma, setChegirma] = useState(order.chegirma || 0);
  const [tolovTuri, setTolovTuri] = useState(order.tolov?.turi || 'naqd');
  const [naqdSum, setNaqdSum] = useState('');
  const [kartaSum, setKartaSum] = useState('');
  const [qarzBormi, setQarzBormi] = useState(false);
  const [qarzMiqdor, setQarzMiqdor] = useState('');

  const yakuniy = Math.max(0, (order.umumiyHisob || 0) - (parseFloat(chegirma) || 0));

  const aralashXato = () => {
    if (tolovTuri !== 'aralash') return false;
    const naqd = parseFloat(naqdSum) || 0;
    const karta = parseFloat(kartaSum) || 0;
    return Math.abs(naqd + karta - yakuniy) > 1;
  };

  const handleSave = () => {
    const tolov = {
      turi: tolovTuri,
      naqd: tolovTuri === 'naqd' ? yakuniy : (tolovTuri === 'aralash' ? parseFloat(naqdSum) || 0 : 0),
      karta: tolovTuri === 'karta' ? yakuniy : (tolovTuri === 'aralash' ? parseFloat(kartaSum) || 0 : 0),
    };
    onSave({
      chegirma: parseFloat(chegirma) || 0,
      yakuniySumma: yakuniy,
      tolov,
      qarz: qarzBormi ? (parseFloat(qarzMiqdor) || 0) : 0,
    });
  };

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none ${
    dark ? 'bg-gray-800 text-white placeholder-gray-600 border border-gray-700' : 'bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-300'
  }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-t-3xl max-h-[90vh] flex flex-col ${dark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="flex justify-center pt-3"><div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} /></div>

        <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>To'lov — #{order.raqam}</h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">

          {/* Umumiy hisob */}
          <div className={`p-4 rounded-2xl ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Umumiy hisob</span>
              <span className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{formatSum(order.umumiyHisob)} so'm</span>
            </div>
          </div>

          {/* Chegirma */}
          <div>
            <label className={`text-sm font-semibold mb-1.5 block ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Chegirma (so'm)</label>
            <MoneyInput value={chegirma} onChange={setChegirma} className={inputCls} />
          </div>

          {/* Yakuniy summa */}
          <div className={`p-4 rounded-2xl ${dark ? 'bg-blue-950 border border-blue-900' : 'bg-blue-50 border border-blue-100'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-semibold ${dark ? 'text-blue-300' : 'text-blue-600'}`}>Yakuniy summa</span>
              <span className={`text-2xl font-extrabold ${dark ? 'text-white' : 'text-blue-700'}`}>{formatSum(yakuniy)} so'm</span>
            </div>
          </div>

          {/* To'lov turi */}
          <div>
            <label className={`text-sm font-semibold mb-2 block ${dark ? 'text-gray-300' : 'text-gray-700'}`}>To'lov turi</label>
            <div className="grid grid-cols-3 gap-2">
              {['naqd', 'karta', 'aralash'].map(t => (
                <button
                  key={t}
                  onClick={() => setTolovTuri(t)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tolovTuri === t
                      ? 'bg-blue-600 text-white'
                      : dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t === 'naqd' ? '💵 Naqd' : t === 'karta' ? '💳 Karta' : '🔀 Aralash'}
                </button>
              ))}
            </div>
          </div>

          {/* Aralash to'lov */}
          {tolovTuri === 'aralash' && (
            <div className="space-y-3">
              <div>
                <label className={`text-xs mb-1 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Naqd (so'm)</label>
                <MoneyInput value={naqdSum} onChange={setNaqdSum} className={inputCls} />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Karta (so'm)</label>
                <MoneyInput value={kartaSum} onChange={setKartaSum} className={inputCls} />
              </div>
              {aralashXato() && (
                <div className="text-xs text-red-500 font-medium p-2 bg-red-50 rounded-xl">
                  ⚠️ Naqd + Karta yig'indisi yakuniy summaga teng bo'lishi kerak!
                  <br />Farq: {formatSum(Math.abs((parseFloat(naqdSum) || 0) + (parseFloat(kartaSum) || 0) - yakuniy))} so'm
                </div>
              )}
            </div>
          )}

          {/* Qarz checkbox */}
          <div>
            <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div
                onClick={() => setQarzBormi(q => !q)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  qarzBormi ? 'bg-red-500 border-red-500' : dark ? 'border-gray-600' : 'border-gray-300'
                }`}
              >
                {qarzBormi && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>💸 Qarz bormi?</span>
            </label>
            {qarzBormi && (
              <div className="mt-2">
                <MoneyInput value={qarzMiqdor} onChange={setQarzMiqdor} placeholder="Qancha qarz? (so'm)" className={inputCls} />
              </div>
            )}
          </div>
        </div>

        <div className={`flex gap-3 p-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Bekor
          </button>
          <button
            onClick={handleSave}
            disabled={tolovTuri === 'aralash' && aralashXato()}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
          >
            ✓ Yakunlash
          </button>
        </div>
      </div>
    </div>
  );
}
