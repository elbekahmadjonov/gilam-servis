import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { formatSum } from '../utils/formatlash';
import { getTemplates, addTemplate, removeTemplate, loadTemplates } from '../services/templates';

// ============================================================
// Yordamchi komponentlar — TASHQARIDA (keyboard bug oldini olish)
// ============================================================

function SectionTitle({ dark, children }) {
  return (
    <div className={`text-xs font-bold uppercase tracking-wider pt-2 pb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
      {children}
    </div>
  );
}

function CardWrap({ dark, children }) {
  return (
    <div className={`mb-3 p-3 rounded-2xl border ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
      {children}
    </div>
  );
}

function ItemHeader({ dark, num, label, canRemove, onRemove }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className={`text-xs font-bold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
        {label} {num}
      </span>
      {canRemove && (
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-lg bg-red-100 text-red-500 flex items-center justify-center active:scale-90"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function AddBtn({ dark, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-1.5 mb-3 transition-all active:scale-[0.98] ${
        dark ? 'border-blue-800 text-blue-400 hover:border-blue-600' : 'border-blue-200 text-blue-500 hover:border-blue-400'
      }`}
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function FieldLabel({ dark, required, children }) {
  return (
    <label className={`text-xs mb-1 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

// ── Narx chiplari + "+ Qo'shish" tugmasi ──
// chips     : number[]   — saqlangan narxlar
// currentValue: string  — joriy input qiymati
// onAdd     : () => void — "+ Qo'shish" bosilganda
// onChipClick : (val: number) => void — chip bosilganda narx maydoniga qo'yish
// onChipDelete: (val: number) => void — ✕ bosilganda chipni o'chirish
function PriceChips({ dark, chips = [], currentValue, onAdd, onChipClick, onChipDelete }) {
  const hasValue = parseFloat(currentValue) > 0;
  const currentNum = parseFloat(currentValue);
  const alreadyExists = chips.some(v => v === currentNum);
  const canAdd = hasValue && !alreadyExists;

  if (chips.length === 0 && !hasValue) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {chips.map(val => (
        <div
          key={val}
          className={`flex items-center rounded-full text-xs font-semibold overflow-hidden ${
            dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {/* Chip matniga bosish — narx maydoniga qo'yadi */}
          <button
            onClick={() => onChipClick(val)}
            className="pl-3 pr-1.5 py-1 active:opacity-70 transition-opacity"
            title="Narxni qo'llash"
          >
            {formatSum(val)}
          </button>
          {/* ✕ — faqat chipni o'chiradi, narx maydoniga tegmaydi */}
          <button
            onClick={e => { e.stopPropagation(); onChipDelete(val); }}
            className={`pr-2 py-1 transition-colors ${
              dark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
            }`}
            title="Chipni o'chirish"
          >
            ✕
          </button>
        </div>
      ))}

      {/* "+ Qo'shish" — joriy narxni chip qilib qo'shadi */}
      <button
        onClick={canAdd ? onAdd : undefined}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-2 border-dashed transition-all ${
          canAdd
            ? dark
              ? 'border-blue-600 text-blue-400 hover:border-blue-500 active:scale-95'
              : 'border-blue-400 text-blue-500 hover:border-blue-500 active:scale-95'
            : dark
              ? 'border-gray-700 text-gray-600 cursor-not-allowed'
              : 'border-gray-200 text-gray-300 cursor-not-allowed'
        }`}
        title={alreadyExists ? 'Bu narx allaqachon mavjud' : canAdd ? "Shablon sifatida qo'shish" : 'Narx kiriting'}
      >
        <Plus size={11} /> Qo'shish
      </button>
    </div>
  );
}

// ============================================================
// Boshlang'ich qiymatlar
// ============================================================
const emptyGilam    = () => ({ eni: '', boyi: '', yuza: 0, narxM2: '', jami: 0 });
const emptyOdeal    = () => ({ narx: '', jami: 0 });
const emptyKorpa    = () => ({ narx: '', jami: 0 });
const emptyParda    = () => ({ kg: '', narxKg: '', jami: 0 });
const emptyKorpacha = () => ({ metr: '', narxMetr: '', jami: 0 });

function initArr(existing, soni, emptyFn) {
  if (existing?.length > 0) return existing.map(e => ({ ...e }));
  return Array.from({ length: Math.max(soni || 0, 0) }, emptyFn);
}

function fmt(v) { return parseFloat(v) || 0; }

// ============================================================
// Asosiy komponent
// ============================================================
export default function NarxlashOyna({ order, dark, onClose, onSave }) {
  const t = order.tovarlar || {};
  const n = order.narxlar   || {};

  const [gilamlar,    setGilamlar]    = useState(() => initArr(n.gilamlar,    t.gilamSoni,    emptyGilam));
  const [odeallar,    setOdeallar]    = useState(() => initArr(n.odeallar,    t.odealSoni,    emptyOdeal));
  const [korpalar,    setKorpalar]    = useState(() => initArr(n.korpalar,    t.korpaSoni,    emptyKorpa));
  const [pardalar,    setPardalar]    = useState(() => initArr(n.pardalar,    t.pardaBor ? 1 : 0, emptyParda));
  const [korpachalar, setKorpachalar] = useState(() => initArr(n.korpachalar, t.korpachaSoni, emptyKorpacha));
  const [xatoList,    setXatoList]    = useState([]);

  // Har tur uchun chiplar ro'yxati (number[])
  const readAll = () => ({
    gilam:    getTemplates('gilam'),
    odeal:    getTemplates('odeal'),
    korpa:    getTemplates('korpa'),
    parda:    getTemplates('parda'),
    korpacha: getTemplates('korpacha'),
  });
  const [templates, setTemplates] = useState(readAll);

  // Oyna ochilganda shablonlarni serverdan yangilaymiz (kesh eskirsa)
  useEffect(() => {
    loadTemplates().then(() => setTemplates(readAll()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chip qo'shish (+ Qo'shish bosilganda)
  const addChip = (type, value) => {
    addTemplate(type, value);
    setTemplates(prev => ({ ...prev, [type]: getTemplates(type) }));
  };

  // Chip o'chirish (✕ bosilganda)
  const removeChip = (type, value) => {
    removeTemplate(type, value);
    setTemplates(prev => ({ ...prev, [type]: getTemplates(type) }));
  };

  // ── Gilam update ──
  const upGilam = (i, field, val) => {
    setGilamlar(arr =>
      arr.map((g, idx) => {
        if (idx !== i) return g;
        const u = { ...g, [field]: val };
        u.yuza = Math.round(fmt(u.eni) * fmt(u.boyi) * 100) / 100;
        u.jami = u.yuza * fmt(u.narxM2);
        return u;
      })
    );
  };

  // ── Generic update ──
  const upArr = (setter, i, field, val, calcJami) => {
    setter(arr =>
      arr.map((item, idx) => {
        if (idx !== i) return item;
        const u = { ...item, [field]: val };
        u.jami = calcJami(u);
        return u;
      })
    );
  };

  // ── Jami ──
  const umumiy = () => {
    let s = 0;
    gilamlar.forEach(g    => { s += g.jami    || 0; });
    odeallar.forEach(o    => { s += o.jami    || 0; });
    korpalar.forEach(k    => { s += k.jami    || 0; });
    pardalar.forEach(p    => { s += p.jami    || 0; });
    korpachalar.forEach(k => { s += k.jami    || 0; });
    return s;
  };

  // ── Validatsiya ──
  const validate = () => {
    const e = [];
    gilamlar.forEach((g, i) => {
      if (fmt(g.eni)    <= 0) e.push(`Gilam ${i+1}: eni`);
      if (fmt(g.boyi)   <= 0) e.push(`Gilam ${i+1}: bo'yi`);
      if (fmt(g.narxM2) <= 0) e.push(`Gilam ${i+1}: narx`);
    });
    odeallar.forEach((o, i)    => { if (fmt(o.narx)    <= 0) e.push(`Odeal ${i+1}: narx`); });
    korpalar.forEach((k, i)    => { if (fmt(k.narx)    <= 0) e.push(`Ko'rpa ${i+1}: narx`); });
    pardalar.forEach((p, i)    => {
      if (fmt(p.kg)    <= 0) e.push(`Parda ${i+1}: og'irlik`);
      if (fmt(p.narxKg)<= 0) e.push(`Parda ${i+1}: narx`);
    });
    korpachalar.forEach((k, i) => {
      if (fmt(k.metr)    <= 0) e.push(`Ko'rpacha ${i+1}: uzunlik`);
      if (fmt(k.narxMetr)<= 0) e.push(`Ko'rpacha ${i+1}: narx`);
    });
    return e;
  };

  const handleSave = () => {
    const errors = validate();
    if (errors.length > 0) { setXatoList(errors); return; }
    setXatoList([]);
    const narxlar = {
      gilamlar: gilamlar.map(g => ({ eni: fmt(g.eni), boyi: fmt(g.boyi), yuza: g.yuza, narxM2: fmt(g.narxM2), jami: g.jami || 0 })),
      odeallar: odeallar.map(o => ({ narx: fmt(o.narx), jami: o.jami || 0 })),
      korpalar: korpalar.map(k => ({ narx: fmt(k.narx), jami: k.jami || 0 })),
      pardalar: pardalar.map(p => ({ kg: fmt(p.kg), narxKg: fmt(p.narxKg), jami: p.jami || 0 })),
      korpachalar: korpachalar.map(k => ({ metr: fmt(k.metr), narxMetr: fmt(k.narxMetr), jami: k.jami || 0 })),
      // eski moslik
      odeal:    { narx: odeallar[0]    ? fmt(odeallar[0].narx)       : 0 },
      korpa:    { narx: korpalar[0]    ? fmt(korpalar[0].narx)       : 0 },
      parda:    { kg: pardalar[0]      ? fmt(pardalar[0].kg)         : 0, narxKg: pardalar[0] ? fmt(pardalar[0].narxKg) : 0, jami: pardalar[0]?.jami || 0 },
      korpacha: { metr: korpachalar[0] ? fmt(korpachalar[0].metr)    : 0, narxMetr: korpachalar[0] ? fmt(korpachalar[0].narxMetr) : 0, jami: korpachalar[0]?.jami || 0 },
    };
    onSave(narxlar, umumiy());
  };

  // ── CSS ──
  const inputBase = dark
    ? 'bg-gray-800 text-white placeholder-gray-600 border-gray-700 focus:border-blue-500'
    : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-blue-400';
  const inputCls    = `w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors ${inputBase}`;
  const inputErrCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none border border-red-400 transition-colors ${
    dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
  }`;
  const isErr = (key) => xatoList.some(x => x.startsWith(key));

  return (
    <div className="fixed inset-0 z-[60] flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-t-3xl max-h-[92vh] flex flex-col ${dark ? 'bg-gray-950' : 'bg-white'}`}>

        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            🫧 Narxlash — #{order.id}
          </h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={16} />
          </button>
        </div>

        {/* Xatolar */}
        {xatoList.length > 0 && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs font-bold text-red-600 mb-1">⚠️ Quyidagi maydonlarni to'ldiring:</p>
            {xatoList.map((x, i) => <p key={i} className="text-xs text-red-500">• {x}</p>)}
          </div>
        )}

        <div className="overflow-y-auto p-4 flex-1">

          {/* ═══════ GILAMLAR ═══════ */}
          {gilamlar.length > 0 && (
            <div>
              <SectionTitle dark={dark}>🏔 Gilamlar ({gilamlar.length}/{t.gilamSoni || gilamlar.length})</SectionTitle>

              {gilamlar.map((g, i) => (
                <CardWrap key={i} dark={dark}>
                  <ItemHeader dark={dark} num={i + 1} label="Gilam"
                    canRemove={gilamlar.length > 1}
                    onRemove={() => setGilamlar(arr => arr.filter((_, j) => j !== i))}
                  />
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <FieldLabel dark={dark} required>Eni (m)</FieldLabel>
                      <input type="number" inputMode="decimal" placeholder="0.00" value={g.eni}
                        onChange={e => upGilam(i, 'eni', e.target.value)}
                        className={isErr(`Gilam ${i+1}: eni`) ? inputErrCls : inputCls}
                      />
                    </div>
                    <div>
                      <FieldLabel dark={dark} required>Bo'yi (m)</FieldLabel>
                      <input type="number" inputMode="decimal" placeholder="0.00" value={g.boyi}
                        onChange={e => upGilam(i, 'boyi', e.target.value)}
                        className={isErr(`Gilam ${i+1}: bo'yi`) ? inputErrCls : inputCls}
                      />
                    </div>
                  </div>
                  <div className={`text-xs mb-2 px-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Yuza: <span className="font-bold text-blue-500">{g.yuza} m²</span>
                  </div>
                  <div>
                    <FieldLabel dark={dark} required>Narxi (so'm/m²)</FieldLabel>
                    <input type="number" inputMode="numeric" placeholder="0" value={g.narxM2}
                      onChange={e => upGilam(i, 'narxM2', e.target.value)}
                      className={isErr(`Gilam ${i+1}: narx`) ? inputErrCls : inputCls}
                    />
                    {/* Chip row — faqat gilam turi uchun */}
                    <PriceChips
                      dark={dark}
                      chips={templates.gilam}
                      currentValue={g.narxM2}
                      onAdd={() => addChip('gilam', g.narxM2)}
                      onChipClick={val => upGilam(i, 'narxM2', String(val))}
                      onChipDelete={val => removeChip('gilam', val)}
                    />
                  </div>
                  <div className={`mt-2 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: <span className="text-green-500">{formatSum(g.jami)} so'm</span>
                  </div>
                </CardWrap>
              ))}

              {gilamlar.length < (t.gilamSoni || 0) && (
                <AddBtn dark={dark} label="+ Gilam qo'shish"
                  onClick={() => setGilamlar(arr => [...arr, emptyGilam()])} />
              )}
            </div>
          )}

          {/* ═══════ ODEALLAR ═══════ */}
          {odeallar.length > 0 && (
            <div>
              <SectionTitle dark={dark}>🛏 Odeallar ({odeallar.length}/{t.odealSoni || odeallar.length})</SectionTitle>

              {odeallar.map((o, i) => (
                <CardWrap key={i} dark={dark}>
                  <ItemHeader dark={dark} num={i + 1} label="Odeal"
                    canRemove={odeallar.length > 1}
                    onRemove={() => setOdeallar(arr => arr.filter((_, j) => j !== i))}
                  />
                  <FieldLabel dark={dark} required>Narxi (so'm)</FieldLabel>
                  <input type="number" inputMode="numeric" placeholder="0" value={o.narx}
                    onChange={e => upArr(setOdeallar, i, 'narx', e.target.value, u => fmt(u.narx))}
                    className={isErr(`Odeal ${i+1}`) ? inputErrCls : inputCls}
                  />
                  <PriceChips
                    dark={dark}
                    chips={templates.odeal}
                    currentValue={o.narx}
                    onAdd={() => addChip('odeal', o.narx)}
                    onChipClick={val => upArr(setOdeallar, i, 'narx', String(val), u => fmt(u.narx))}
                    onChipDelete={val => removeChip('odeal', val)}
                  />
                  <div className={`mt-2 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: <span className="text-green-500">{formatSum(o.jami)} so'm</span>
                  </div>
                </CardWrap>
              ))}

              {odeallar.length < (t.odealSoni || 0) && (
                <AddBtn dark={dark} label="+ Odeal qo'shish"
                  onClick={() => setOdeallar(arr => [...arr, emptyOdeal()])} />
              )}
            </div>
          )}

          {/* ═══════ KO'RPALAR ═══════ */}
          {korpalar.length > 0 && (
            <div>
              <SectionTitle dark={dark}>🥬 Ko'rpalar ({korpalar.length}/{t.korpaSoni || korpalar.length})</SectionTitle>

              {korpalar.map((k, i) => (
                <CardWrap key={i} dark={dark}>
                  <ItemHeader dark={dark} num={i + 1} label="Ko'rpa"
                    canRemove={korpalar.length > 1}
                    onRemove={() => setKorpalar(arr => arr.filter((_, j) => j !== i))}
                  />
                  <FieldLabel dark={dark} required>Narxi (so'm)</FieldLabel>
                  <input type="number" inputMode="numeric" placeholder="0" value={k.narx}
                    onChange={e => upArr(setKorpalar, i, 'narx', e.target.value, u => fmt(u.narx))}
                    className={isErr(`Ko'rpa ${i+1}`) ? inputErrCls : inputCls}
                  />
                  <PriceChips
                    dark={dark}
                    chips={templates.korpa}
                    currentValue={k.narx}
                    onAdd={() => addChip('korpa', k.narx)}
                    onChipClick={val => upArr(setKorpalar, i, 'narx', String(val), u => fmt(u.narx))}
                    onChipDelete={val => removeChip('korpa', val)}
                  />
                  <div className={`mt-2 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: <span className="text-green-500">{formatSum(k.jami)} so'm</span>
                  </div>
                </CardWrap>
              ))}

              {korpalar.length < (t.korpaSoni || 0) && (
                <AddBtn dark={dark} label="+ Ko'rpa qo'shish"
                  onClick={() => setKorpalar(arr => [...arr, emptyKorpa()])} />
              )}
            </div>
          )}

          {/* ═══════ PARDALAR ═══════ */}
          {pardalar.length > 0 && (
            <div>
              <SectionTitle dark={dark}>🪟 Pardalar ({pardalar.length})</SectionTitle>

              {pardalar.map((p, i) => (
                <CardWrap key={i} dark={dark}>
                  <ItemHeader dark={dark} num={i + 1} label="Parda"
                    canRemove={pardalar.length > 1}
                    onRemove={() => setPardalar(arr => arr.filter((_, j) => j !== i))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel dark={dark} required>Og'irlik (kg)</FieldLabel>
                      <input type="number" inputMode="decimal" placeholder="0" value={p.kg}
                        onChange={e => upArr(setPardalar, i, 'kg', e.target.value,
                          u => fmt(u.kg) * fmt(u.narxKg))}
                        className={isErr(`Parda ${i+1}: og'irlik`) ? inputErrCls : inputCls}
                      />
                    </div>
                    <div>
                      <FieldLabel dark={dark} required>Narx (so'm/kg)</FieldLabel>
                      <input type="number" inputMode="numeric" placeholder="0" value={p.narxKg}
                        onChange={e => upArr(setPardalar, i, 'narxKg', e.target.value,
                          u => fmt(u.kg) * fmt(u.narxKg))}
                        className={isErr(`Parda ${i+1}: narx`) ? inputErrCls : inputCls}
                      />
                    </div>
                  </div>
                  {/* Parda narx chiplari — narxKg uchun */}
                  <PriceChips
                    dark={dark}
                    chips={templates.parda}
                    currentValue={p.narxKg}
                    onAdd={() => addChip('parda', p.narxKg)}
                    onChipClick={val => upArr(setPardalar, i, 'narxKg', String(val), u => fmt(u.kg) * fmt(u.narxKg))}
                    onChipDelete={val => removeChip('parda', val)}
                  />
                  <div className={`mt-2 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: <span className="text-green-500">{formatSum(p.jami)} so'm</span>
                  </div>
                </CardWrap>
              ))}

              <AddBtn dark={dark} label="+ Parda qo'shish"
                onClick={() => setPardalar(arr => [...arr, emptyParda()])} />
            </div>
          )}

          {/* ═══════ KO'RPACHALAR ═══════ */}
          {korpachalar.length > 0 && (
            <div>
              <SectionTitle dark={dark}>📏 Ko'rpachalar ({korpachalar.length}/{t.korpachaSoni || korpachalar.length})</SectionTitle>

              {korpachalar.map((k, i) => (
                <CardWrap key={i} dark={dark}>
                  <ItemHeader dark={dark} num={i + 1} label="Ko'rpacha"
                    canRemove={korpachalar.length > 1}
                    onRemove={() => setKorpachalar(arr => arr.filter((_, j) => j !== i))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel dark={dark} required>Uzunlik (metr)</FieldLabel>
                      <input type="number" inputMode="decimal" placeholder="0" value={k.metr}
                        onChange={e => upArr(setKorpachalar, i, 'metr', e.target.value,
                          u => fmt(u.metr) * fmt(u.narxMetr))}
                        className={isErr(`Ko'rpacha ${i+1}: uzunlik`) ? inputErrCls : inputCls}
                      />
                    </div>
                    <div>
                      <FieldLabel dark={dark} required>Narx (so'm/m)</FieldLabel>
                      <input type="number" inputMode="numeric" placeholder="0" value={k.narxMetr}
                        onChange={e => upArr(setKorpachalar, i, 'narxMetr', e.target.value,
                          u => fmt(u.metr) * fmt(u.narxMetr))}
                        className={isErr(`Ko'rpacha ${i+1}: narx`) ? inputErrCls : inputCls}
                      />
                    </div>
                  </div>
                  {/* Ko'rpacha narx chiplari — narxMetr uchun */}
                  <PriceChips
                    dark={dark}
                    chips={templates.korpacha}
                    currentValue={k.narxMetr}
                    onAdd={() => addChip('korpacha', k.narxMetr)}
                    onChipClick={val => upArr(setKorpachalar, i, 'narxMetr', String(val), u => fmt(u.metr) * fmt(u.narxMetr))}
                    onChipDelete={val => removeChip('korpacha', val)}
                  />
                  <div className={`mt-2 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    Jami: <span className="text-green-500">{formatSum(k.jami)} so'm</span>
                  </div>
                </CardWrap>
              ))}

              {korpachalar.length < (t.korpachaSoni || 0) && (
                <AddBtn dark={dark} label="+ Ko'rpacha qo'shish"
                  onClick={() => setKorpachalar(arr => [...arr, emptyKorpacha()])} />
              )}
            </div>
          )}

          {/* UMUMIY HISOB */}
          <div className={`rounded-2xl p-4 mt-2 ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-blue-50 border border-blue-100'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark ? 'text-gray-500' : 'text-blue-400'}`}>
              UMUMIY HISOB
            </div>
            <div className={`text-3xl font-extrabold ${dark ? 'text-white' : 'text-blue-700'}`}>
              {formatSum(umumiy())} so'm
            </div>
          </div>
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Bekor
          </button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold active:scale-95 transition-all">
            ✓ Yakunlash
          </button>
        </div>
      </div>
    </div>
  );
}
