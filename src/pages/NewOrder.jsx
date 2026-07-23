import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import * as orderService from '../services/orders';

export default function NewOrder({ onCreated }) {
  const { dark } = useTheme();
  const { role } = useRole();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    telefon:  '',
    manzil:   '',
    mijozIsmi: '',
    izoh:     '',
  });
  // Qo'shimcha telefon raqamlari — "+" tugmasi bilan qo'shiladi
  const [qoshimcha, setQoshimcha] = useState([]);
  const [saving, setSaving] = useState(false);
  const [xato,   setXato]   = useState('');

  const inputCls = `w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all ${
    dark
      ? 'bg-gray-900 text-white placeholder-gray-600 border border-gray-800 focus:border-blue-600'
      : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-blue-400'
  }`;
  const labelCls = `text-xs font-bold uppercase tracking-wider mb-1.5 block ${dark ? 'text-gray-500' : 'text-gray-400'}`;

  const handleSubmit = async () => {
    if (!form.telefon.trim() && !form.mijozIsmi.trim()) return;
    setSaving(true);
    setXato('');
    try {
      await orderService.create({
        ...form,
        qoshimchaTelefonlar: qoshimcha.map(t => t.trim()).filter(Boolean),
        muallif: role,
      });
      if (onCreated) onCreated();
      navigate('/');
    } catch (err) {
      console.error('Yaratish xatosi:', err);
      setXato('Saqlashda xatolik yuz berdi. Internet aloqasini tekshiring.');
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className={`rounded-2xl p-1 ${dark ? 'bg-gray-900' : 'bg-white'} shadow-sm`}>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelCls}>📞 Telefon</label>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="+998 XX XXX XX XX"
                value={form.telefon}
                onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
                className={`${inputCls} flex-1`}
              />
              {/* Qo'shimcha nomer uchun joy ochadi */}
              <button
                type="button"
                onClick={() => setQoshimcha(list => [...list, ''])}
                title="Qo'shimcha nomer qo'shish"
                className={`w-12 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all ${
                  dark ? 'bg-gray-800 text-blue-400 border border-gray-700' : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Qo'shimcha nomerlar */}
            {qoshimcha.map((tel, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <input
                  type="tel"
                  placeholder={`Qo'shimcha nomer ${i + 1}`}
                  value={tel}
                  onChange={e => setQoshimcha(list => list.map((t, j) => (j === i ? e.target.value : t)))}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => setQoshimcha(list => list.filter((_, j) => j !== i))}
                  title="O'chirish"
                  className={`w-12 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all ${
                    dark ? 'bg-gray-800 text-red-400 border border-gray-700' : 'bg-red-50 text-red-500 border border-red-100'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <div>
            <label className={labelCls}>📍 Manzil</label>
            <input
              type="text"
              placeholder="Ko'cha, uy raqami..."
              value={form.manzil}
              onChange={e => setForm(f => ({ ...f, manzil: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>👤 Mijoz ismi</label>
            <input
              type="text"
              placeholder="F.I.O."
              value={form.mijozIsmi}
              onChange={e => setForm(f => ({ ...f, mijozIsmi: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>💬 Izoh (ixtiyoriy)</label>
            <textarea
              placeholder="Qo'shimcha ma'lumot..."
              rows={3}
              value={form.izoh}
              onChange={e => setForm(f => ({ ...f, izoh: e.target.value }))}
              className={`${inputCls} resize-none`}
            />
          </div>
          {xato && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
              ⚠️ {xato}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          disabled={saving}
          className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
        >
          Bekor
        </button>
        <button
          onClick={handleSubmit}
          disabled={(!form.telefon.trim() && !form.mijozIsmi.trim()) || saving}
          className="flex-1 py-3.5 rounded-2xl bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            '✓ Saqlash'
          )}
        </button>
      </div>
    </div>
  );
}
