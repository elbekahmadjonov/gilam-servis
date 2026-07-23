import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TahrirOyna({ order, dark, onClose, onSave }) {
  const [form, setForm] = useState({
    mijozIsmi: order.mijozIsmi || '',
    telefon: order.telefon || '',
    manzil: order.manzil || '',
    izoh: order.izoh || '',
  });
  const [qoshimcha, setQoshimcha] = useState(() => [...(order.qoshimchaTelefonlar || [])]);
  const [tovarlar, setTovarlar] = useState({
    gilamSoni: order.tovarlar?.gilamSoni || 0,
    odealSoni: order.tovarlar?.odealSoni || 0,
    korpaSoni: order.tovarlar?.korpaSoni || 0,
    korpachaSoni: order.tovarlar?.korpachaSoni || 0,
    pardaBor: order.tovarlar?.pardaBor || false,
  });

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${
    dark
      ? 'bg-gray-800 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-600'
      : 'bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-400'
  }`;
  const labelCls = `text-xs font-bold uppercase tracking-wider mb-1.5 block ${dark ? 'text-gray-500' : 'text-gray-400'}`;

  const handleSave = () => {
    onSave({
      ...form,
      qoshimchaTelefonlar: qoshimcha.map(t => t.trim()).filter(Boolean),
      tovarlar,
    });
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-t-3xl max-h-[92vh] flex flex-col ${dark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="flex justify-center pt-3">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            ✏️ Tahrirlash — #{order.raqam}
          </h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">

          {/* Mijoz ma'lumotlari */}
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              MIJOZ MA'LUMOTLARI
            </h4>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Mijoz ismi</label>
                <input
                  type="text"
                  value={form.mijozIsmi}
                  onChange={e => setForm(f => ({ ...f, mijozIsmi: e.target.value }))}
                  placeholder="F.I.O."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Telefon</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={form.telefon}
                    onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
                    placeholder="+998 XX XXX XX XX"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setQoshimcha(list => [...list, ''])}
                    title="Qo'shimcha nomer qo'shish"
                    className={`w-11 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all ${
                      dark ? 'bg-gray-800 text-blue-400 border border-gray-700' : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                {qoshimcha.map((tel, i) => (
                  <div key={i} className="flex gap-2 mt-2">
                    <input
                      type="tel"
                      value={tel}
                      onChange={e => setQoshimcha(list => list.map((t, j) => (j === i ? e.target.value : t)))}
                      placeholder={`Qo'shimcha nomer ${i + 1}`}
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setQoshimcha(list => list.filter((_, j) => j !== i))}
                      className={`w-11 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all ${
                        dark ? 'bg-gray-800 text-red-400 border border-gray-700' : 'bg-red-50 text-red-500 border border-red-100'
                      }`}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <label className={labelCls}>Manzil</label>
                <input
                  type="text"
                  value={form.manzil}
                  onChange={e => setForm(f => ({ ...f, manzil: e.target.value }))}
                  placeholder="Ko'cha, uy raqami..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Izoh</label>
                <textarea
                  value={form.izoh}
                  onChange={e => setForm(f => ({ ...f, izoh: e.target.value }))}
                  placeholder="Qo'shimcha ma'lumot..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Tovarlar soni */}
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              OLINGAN TOVARLAR SONI
            </h4>
            <div className="space-y-3">
              <NumberInput label="🏔 Gilam (dona)" value={tovarlar.gilamSoni} dark={dark}
                onChange={v => setTovarlar(t => ({ ...t, gilamSoni: v }))} />
              <NumberInput label="🛏 Odeal (dona)" value={tovarlar.odealSoni} dark={dark}
                onChange={v => setTovarlar(t => ({ ...t, odealSoni: v }))} />
              <NumberInput label="🥬 Ko'rpa (dona)" value={tovarlar.korpaSoni} dark={dark}
                onChange={v => setTovarlar(t => ({ ...t, korpaSoni: v }))} />
              <NumberInput label="📏 Ko'rpacha (dona)" value={tovarlar.korpachaSoni} dark={dark}
                onChange={v => setTovarlar(t => ({ ...t, korpachaSoni: v }))} />

              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div
                  onClick={() => setTovarlar(t => ({ ...t, pardaBor: !t.pardaBor }))}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    tovarlar.pardaBor ? 'bg-blue-600 border-blue-600' : dark ? 'border-gray-600' : 'border-gray-300'
                  }`}
                >
                  {tovarlar.pardaBor && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>🪟 Parda bor</span>
              </label>
            </div>
          </div>
        </div>

        <div className={`flex gap-3 p-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Bekor
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-95 transition-all"
          >
            ✓ Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, dark }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-xl ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ${dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
        >−</button>
        <span className={`w-8 text-center font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-lg font-bold"
        >+</button>
      </div>
    </div>
  );
}
