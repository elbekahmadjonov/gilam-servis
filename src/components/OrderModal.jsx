import { useState, useEffect, useRef } from 'react';
import { X, Send, History, Edit2, XCircle, CheckCircle, Lock, MapPin, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { formatVaqt, formatSum } from '../utils/formatlash';
import { canActOnStatus } from '../utils/rollar';
import * as orderService from '../services/orders';
import TovarKiritish from './TovarKiritish';
import NarxlashOyna from './NarxlashOyna';
import TolovOyna from './TolovOyna';
import TahrirOyna from './TahrirOyna';

export default function OrderModal({ order: initialOrder, onClose, onRefresh }) {
  const { dark } = useTheme();
  const { role, xodim } = useRole();
  const { showToast } = useToast();

  // Joriy xodim nomi — status bosqichini kim bajarganini yozish uchun
  const ijrochiNomi = xodim?.ism || xodim?.login || role || 'Noma\'lum';

  const [order,         setOrder]         = useState(initialOrder);
  const [izohMatn,      setIzohMatn]      = useState('');
  const [showTovarOyna, setShowTovarOyna] = useState(false);
  const [showNarxOyna,  setShowNarxOyna]  = useState(false);
  const [showTolovOyna, setShowTolovOyna] = useState(false);
  const [showTarix,     setShowTarix]     = useState(false);
  const [showBekor,     setShowBekor]     = useState(false);
  const [showTahrir,    setShowTahrir]    = useState(false);
  const [bekorSabab,    setBekorSabab]    = useState('');
  const [bigImg,        setBigImg]        = useState(null);
  const [saving,        setSaving]        = useState(false);

  // Modal ochilgandagi boshlang'ich status
  const initialStatusRef = useRef(initialOrder.status);

  // Status o'zgarganda modal yopiladi, ro'yxat to'liq yangilanadi
  useEffect(() => {
    if (order.status !== initialStatusRef.current) {
      if (onRefresh) onRefresh(null); // null → to'liq refresh + kesh tozalash
      onClose();
    }
  }, [order.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modal ichida buyurtmani yangilash ────────────
  const refresh = async () => {
    const updated = await orderService.getById(order.id);
    if (updated) {
      setOrder(updated);
      // updated orderни uzat → App.jsx faqat shu elementni yangilaydi
      if (onRefresh) onRefresh(updated);
    } else {
      if (onRefresh) onRefresh(); // fallback: to'liq yangilash
    }
  };

  const doUpdate = async (changes, amal) => {
    const snapshot = order;
    // Optimistik yangilanish — status o'zgarsa useEffect modal yopadi
    setOrder(prev => ({ ...prev, ...changes }));
    setSaving(true);
    try {
      await orderService.update(snapshot.id, changes);
      if (amal) await orderService.addHarakat(snapshot.id, amal, role);
      await refresh();
    } catch (err) {
      setOrder(snapshot);
      console.error('Yangilash xatosi:', err);
      showToast('Saqlashda xatolik yuz berdi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBosqich = async (bosqichKey, amal) => {
    if (!canActOnStatus(role, order.status)) {
      showToast('Bu amal sizning rolingizda mavjud emas', 'error');
      return;
    }
    const changes = { bosqich: { ...order.bosqich, [bosqichKey]: true } };
    // "Oldim" bosilganda joriy xodimni yuvuvchi sifatida saqlash
    if (bosqichKey === 'oldim' && xodim?.id) {
      changes.yuvuvchiId = xodim.id;
    }
    await doUpdate(changes, amal);
  };

  const handleBekorBosqich = async (bosqichKey) => {
    await doUpdate(
      { bosqich: { ...order.bosqich, [bosqichKey]: false } },
      `${bosqichKey} bekor qilindi`
    );
  };

  const handleIzohYuborish = async () => {
    if (!izohMatn.trim()) return;
    const matn = izohMatn.trim();
    const snapshot = order;
    // Optimistik: izohni darhol ko'rsatish
    const tempIzoh = { tur: 'matn', matn, vaqt: new Date().toISOString(), muallif: xodim?.ism || role || 'Men' };
    setOrder(prev => ({ ...prev, izohlar: [...(prev.izohlar || []), tempIzoh] }));
    setIzohMatn('');
    setSaving(true);
    try {
      await orderService.addIzoh(snapshot.id, matn, role);
      await refresh();
    } catch {
      setOrder(snapshot);
      setIzohMatn(matn);
      showToast('Izoh yuborishda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBekorQilish = async () => {
    if (!bekorSabab.trim()) return;
    setShowBekor(false);
    await doUpdate(
      { status: 'otkaz', otkazSababi: bekorSabab },
      `Bekor qilindi: ${bekorSabab}`
    );
  };

  const handleTahrir = async (data) => {
    await doUpdate(
      { mijozIsmi: data.mijozIsmi, telefon: data.telefon,
        manzil: data.manzil, izoh: data.izoh, tovarlar: data.tovarlar },
      `Tahrirlandi — ${role}`
    );
    setShowTahrir(false);
    showToast('Saqlandi!', 'success');
  };

  const textPrimary = dark ? 'text-white'    : 'text-gray-900';
  const textSec     = dark ? 'text-gray-400' : 'text-gray-500';
  const border      = dark ? 'border-gray-800' : 'border-gray-100';
  const canAct      = canActOnStatus(role, order.status);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end max-w-[480px] mx-auto">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <div className={`relative w-full rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl ${dark ? 'bg-gray-950' : 'bg-white'}`}>
          <div className="flex justify-center pt-3 pb-1">
            <div className={`w-10 h-1 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>

          <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
            <h2 className={`text-lg font-bold ${textPrimary}`}>Buyurtma #{order.id}</h2>
            <div className="flex items-center gap-2">
              {saving && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 pb-4">

            {/* Info jadval */}
            <div className={`mx-4 mt-4 rounded-2xl border ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'} overflow-hidden`}>
              <InfoRow label="Status" dark={dark}><StatusBadge status={order.status} size="lg" /></InfoRow>
              {order.yuvuvchi && (
                <InfoRow label={order.status === 'yangi' ? 'Oluvchi' : 'Yuvuvchi'} dark={dark}>
                  <span className={`text-sm font-medium ${textPrimary}`}>↻ {order.yuvuvchi}</span>
                </InfoRow>
              )}
              <InfoRow label="Telefon" dark={dark}>
                <a href={`tel:${order.telefon}`} className="text-blue-500 text-sm font-medium">{order.telefon}</a>
              </InfoRow>
              <InfoRow label="Manzil" dark={dark}>
                <span className={`text-sm ${textPrimary}`}>{order.manzil || '—'}</span>
              </InfoRow>
              <InfoRow label="Joylashuv" dark={dark}>
                {order.lat && order.lng ? (
                  <a
                    href={`https://www.google.com/maps?q=${order.lat},${order.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 text-sm font-medium"
                  >
                    <MapPin size={13} /> Xaritada ochish
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className={`text-xs ${textSec}`}>Belgilanmagan</span>
                )}
              </InfoRow>
              <InfoRow label="Mijoz" dark={dark}>
                <span className={`text-sm ${textPrimary}`}>{order.mijozIsmi || '—'}</span>
              </InfoRow>
              {order.izoh && (
                <InfoRow label="Izoh" dark={dark}>
                  <span className={`text-sm italic ${textSec}`}>{order.izoh}</span>
                </InfoRow>
              )}
            </div>

            {/* Xarita bloki */}
            {order.lat && order.lng && (
              <GeoMapBlock lat={order.lat} lng={order.lng} dark={dark} />
            )}

            {/* Buyurtma tafsilotlari */}
            {order.tovarlar && (
              order.tovarlar.gilamSoni > 0 || order.tovarlar.odealSoni > 0 ||
              order.tovarlar.korpaSoni > 0 || order.tovarlar.korpachaSoni > 0 ||
              order.tovarlar.pardaBor
            ) && (
              <TafsilotlarSection order={order} dark={dark} />
            )}

            {/* Status bosqichlari */}
            <div className="mx-4 mt-4">
              <StatusBosqichlar
                order={order}
                dark={dark}
                role={role}
                xodim={xodim}
                canAct={canAct}
                saving={saving}
                onBosqich={handleBosqich}
                onBekorBosqich={handleBekorBosqich}
                onStatusChange={doUpdate}
                onOpenTovar={() => setShowTovarOyna(true)}
                onOpenNarx={() => setShowNarxOyna(true)}
                onOpenTolov={() => setShowTolovOyna(true)}
                showToast={showToast}
              />
            </div>

            {/* Izohlar */}
            <div className="mx-4 mt-4">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSec}`}>💬 IZOHLAR</h3>
              <div className={`rounded-2xl border ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'} overflow-hidden`}>
                {(!order.izohlar || order.izohlar.length === 0) ? (
                  <div className={`py-6 text-center text-sm ${textSec}`}>Izohlar yo'q</div>
                ) : (
                  <div className="p-3 space-y-2">
                    {order.izohlar.map((iz, i) => (
                      <div key={i} className={`rounded-xl p-3 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{iz.muallif}</span>
                          <span className={`text-xs ${textSec}`}>{formatVaqt(iz.vaqt)}</span>
                        </div>
                        {iz.tur === 'rasm' ? (
                          <img
                            src={iz.rasm}
                            alt="rasm"
                            className="w-full max-h-48 object-cover rounded-lg cursor-pointer"
                            onClick={() => setBigImg(iz.rasm)}
                          />
                        ) : (
                          <p className={`text-sm ${textPrimary}`}>{iz.matn}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className={`flex items-center gap-2 p-3 border-t ${border}`}>
                  <input
                    type="text"
                    value={izohMatn}
                    onChange={e => setIzohMatn(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleIzohYuborish()}
                    placeholder="Izoh yozing..."
                    className={`flex-1 text-sm rounded-xl px-3 py-2 outline-none ${
                      dark ? 'bg-gray-800 text-white placeholder-gray-600' : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-200'
                    }`}
                  />
                  <button
                    onClick={handleIzohYuborish}
                    disabled={saving || !izohMatn.trim()}
                    className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all disabled:opacity-50"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Tugmalar */}
            <div className="mx-4 mt-4 flex gap-2">
              <button
                onClick={() => setShowBekor(true)}
                disabled={order.status === 'tugadi' || order.status === 'otkaz' || saving}
                className="flex-1 py-2.5 rounded-xl bg-red-100 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
              >
                <XCircle size={16} /> Bekor
              </button>
              <button
                onClick={() => {
                  if (order.status === 'tugadi') {
                    showToast('Yakunlangan buyurtmani tahrirlash mumkin emas', 'warning');
                    return;
                  }
                  setShowTahrir(true);
                }}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-100 text-amber-700 text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
              >
                <Edit2 size={16} /> Tahrir
              </button>
              <button
                onClick={() => setShowTarix(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
              >
                <History size={16} /> Tarix
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Katta rasm */}
      {bigImg && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 max-w-[480px] mx-auto"
          onClick={() => setBigImg(null)}
        >
          <img src={bigImg} alt="katta" className="w-full max-h-screen object-contain" />
        </div>
      )}

      {/* Tarix */}
      {showTarix && <TarixModal order={order} dark={dark} onClose={() => setShowTarix(false)} />}

      {/* Bekor qilish */}
      {showBekor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center max-w-[480px] mx-auto px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBekor(false)} />
          <div className={`relative w-full rounded-2xl p-5 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>Bekor qilish sababi</h3>
            <textarea
              value={bekorSabab}
              onChange={e => setBekorSabab(e.target.value)}
              placeholder="Sabab yozing..."
              rows={3}
              className={`w-full rounded-xl p-3 text-sm outline-none resize-none ${dark ? 'bg-gray-800 text-white placeholder-gray-600' : 'bg-gray-100 text-gray-800 placeholder-gray-400'}`}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowBekor(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                Yopish
              </button>
              <button
                onClick={handleBekorQilish}
                disabled={!bekorSabab.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tahrirlash */}
      {showTahrir && (
        <TahrirOyna order={order} dark={dark} onClose={() => setShowTahrir(false)} onSave={handleTahrir} />
      )}

      {/* Tovar kiritish */}
      {showTovarOyna && (
        <TovarKiritish
          order={order} dark={dark} role={role}
          onClose={() => setShowTovarOyna(false)}
          onSave={async (tovarlar, lat, lng) => {
            const changes = {
              tovarlar, status: 'jarayonda', yuvuvchi: role,
              ijrochilar: { ...order.ijrochilar, zayavka: ijrochiNomi },
            };
            if (lat != null && lng != null) {
              changes.lat = lat;
              changes.lng = lng;
            }
            await doUpdate(changes, 'Qabul qilindi → Jarayonda');
            setShowTovarOyna(false);
          }}
        />
      )}

      {/* Narxlash */}
      {showNarxOyna && (
        <NarxlashOyna
          order={order} dark={dark}
          onClose={() => setShowNarxOyna(false)}
          onSave={async (narxlar, umumiyHisob) => {
            await doUpdate({
              narxlar,
              umumiyHisob,
              yakuniySumma: umumiyHisob,
              status: 'qadoqlash',
              bosqich: { ...order.bosqich, yakunladi: true },
              ijrochilar: { ...order.ijrochilar, yuvilmoqda: ijrochiNomi },
            }, 'Yuvish yakunlandi → Qadoqlash');
            setShowNarxOyna(false);
          }}
        />
      )}

      {/* To'lov */}
      {showTolovOyna && (
        <TolovOyna
          order={order} dark={dark}
          onClose={() => setShowTolovOyna(false)}
          onSave={async (tolovMa) => {
            setShowTolovOyna(false);
            await doUpdate({
              ...tolovMa,
              status: 'tugadi',
              bosqich: { ...order.bosqich, yetkazildi: true },
              ijrochilar: { ...order.ijrochilar, dastavka: ijrochiNomi },
            }, 'Yetkazildi → Tugadi');
          }}
        />
      )}
    </>
  );
}

// ── Yordamchi komponentlar ───────────────────────────

// ── Xarita bloki (OpenStreetMap iframe) ─────────────────
function GeoMapBlock({ lat, lng, dark }) {
  const delta  = 0.003;
  const bbox   = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const gmUrl  = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="mx-4 mt-3">
      <div className={`rounded-2xl overflow-hidden border ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
        <iframe
          title="Joylashuv xaritasi"
          src={mapUrl}
          width="100%"
          height="180"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <a
          href={gmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-t transition-all ${
            dark
              ? 'bg-gray-900 border-gray-800 text-blue-400 hover:bg-gray-800'
              : 'bg-white border-gray-100 text-blue-600 hover:bg-blue-50'
          }`}
        >
          <MapPin size={15} />
          Google Maps'da ochish (navigatsiya)
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

function InfoRow({ label, dark, children }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b last:border-0 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
      <span className={`text-xs font-semibold ${dark ? 'text-gray-500' : 'text-gray-400'} w-24 flex-shrink-0`}>{label}</span>
      <div className="flex-1 text-right">{children}</div>
    </div>
  );
}

function TafsilotlarSection({ order, dark }) {
  const t = order.tovarlar || {};
  const n = order.narxlar  || {};
  const narxlangan = order.umumiyHisob > 0;

  const textPrimary = dark ? 'text-white'    : 'text-gray-900';
  const textSec     = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted   = dark ? 'text-gray-500' : 'text-gray-400';
  const cardBg      = dark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100';
  const divider     = dark ? 'border-gray-800' : 'border-gray-100';

  const ItemCard = ({ icon, title, badge, lines, sum }) => (
    <div className={`rounded-xl border mb-2 overflow-hidden ${dark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-white'}`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${divider}`}>
        <span className={`text-xs font-bold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{icon} {title}</span>
        {badge && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            {badge}
          </span>
        )}
      </div>
      {lines && lines.length > 0 && (
        <div className="px-3 py-1.5 space-y-0.5">
          {lines.map((l, i) => <div key={i} className={`text-xs ${textMuted}`}>{l}</div>)}
        </div>
      )}
      {sum !== undefined && (
        <div className={`px-3 py-2 flex items-center justify-between border-t ${divider}`}>
          <span className={`text-xs ${textMuted}`}>Summa</span>
          <span className={`text-sm font-extrabold ${sum > 0 ? 'text-green-500' : textSec}`}>
            {sum > 0 ? `${formatSum(sum)} so'm` : '—'}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-4 mt-4">
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSec}`}>BUYURTMA TAFSILOTLARI</h3>
      <div className={`rounded-2xl border p-3 ${cardBg}`}>
        {t.gilamSoni > 0 && (
          n.gilamlar?.length > 0
            ? n.gilamlar.map((g, i) => (
                <ItemCard key={i} icon="🏔" title={`Gilam ${i+1}`}
                  lines={[`O'lcham: ${g.eni||'—'} × ${g.boyi||'—'} m`, `Yuza: ${g.yuza||0} m²`, `Narx: ${formatSum(g.narxM2||0)} so'm/m²`]}
                  sum={g.jami||0} />
              ))
            : <ItemCard icon="🏔" title="Gilam" badge={`${t.gilamSoni} dona`} lines={['Narx kiritilmagan']} />
        )}
        {t.odealSoni > 0 && (
          n.odeallar?.length > 0
            ? n.odeallar.map((o, i) => (
                <ItemCard key={i} icon="🛏" title={`Odeal ${i+1}`}
                  lines={[`Narx: ${formatSum(o.narx||0)} so'm`]} sum={o.jami||0} />
              ))
            : <ItemCard icon="🛏" title="Odeal" badge={`${t.odealSoni} dona`} lines={['Narx kiritilmagan']} />
        )}
        {t.korpaSoni > 0 && (
          n.korpalar?.length > 0
            ? n.korpalar.map((k, i) => (
                <ItemCard key={i} icon="🥬" title={`Ko'rpa ${i+1}`}
                  lines={[`Narx: ${formatSum(k.narx||0)} so'm`]} sum={k.jami||0} />
              ))
            : <ItemCard icon="🥬" title="Ko'rpa" badge={`${t.korpaSoni} dona`} lines={['Narx kiritilmagan']} />
        )}
        {t.korpachaSoni > 0 && (
          n.korpachalar?.length > 0
            ? n.korpachalar.map((k, i) => (
                <ItemCard key={i} icon="📏" title={`Ko'rpacha ${i+1}`}
                  lines={[`Uzunlik: ${k.metr||0} metr`, `Narx: ${formatSum(k.narxMetr||0)} so'm/metr`]}
                  sum={k.jami||0} />
              ))
            : <ItemCard icon="📏" title="Ko'rpacha" badge={`${t.korpachaSoni} dona`} lines={['Narx kiritilmagan']} />
        )}
        {t.pardaBor && (
          n.pardalar?.length > 0
            ? n.pardalar.map((p, i) => (
                <ItemCard key={i} icon="🪟" title={`Parda ${i+1}`}
                  lines={[`Og'irlik: ${p.kg||0} kg`, `Narx: ${formatSum(p.narxKg||0)} so'm/kg`]}
                  sum={p.jami||0} />
              ))
            : <ItemCard icon="🪟" title="Parda" lines={['Narx kiritilmagan']} />
        )}
        {narxlangan && (
          <div className={`rounded-xl border overflow-hidden mt-1 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`flex justify-between items-center px-3 py-2 border-b ${divider}`}>
              <span className={`text-xs font-semibold ${textMuted}`}>Jami hisob</span>
              <span className={`text-sm font-bold ${textPrimary}`}>{formatSum(order.umumiyHisob)} so'm</span>
            </div>
            {order.chegirma > 0 && (
              <div className={`flex justify-between items-center px-3 py-2 border-b ${divider}`}>
                <span className={`text-xs font-semibold ${textMuted}`}>Chegirma</span>
                <span className="text-sm font-semibold text-red-500">− {formatSum(order.chegirma)} so'm</span>
              </div>
            )}
            <div className={`flex justify-between items-center px-3 py-2.5 ${dark ? 'bg-green-950/40' : 'bg-green-50'}`}>
              <span className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-green-400' : 'text-green-700'}`}>Yakuniy summa</span>
              <span className="text-base font-extrabold text-green-500">{formatSum(order.yakuniySumma || order.umumiyHisob)} so'm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TarixModal({ order, dark, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full rounded-t-3xl max-h-[70vh] flex flex-col ${dark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
          <h3 className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Buyurtma tarixi</h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2">
          {(!order.harakatlar || order.harakatlar.length === 0) ? (
            <p className={`text-center text-sm py-8 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Tarix yo'q</p>
          ) : (
            [...order.harakatlar].reverse().map((h, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>{h.amal}</p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{h.muallif} · {formatVaqt(h.vaqt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBosqichlar({ order, dark, role, xodim, canAct, saving, onBosqich, onBekorBosqich, onStatusChange, onOpenTovar, onOpenNarx, onOpenTolov, showToast }) {
  const noAccess = () => showToast('Bu amal sizning rolingizda mavjud emas', 'error');
  const ijrochiNomi = xodim?.ism || xodim?.login || role || 'Noma\'lum';

  const BannerTasdiq = ({ label, onBekor }) => (
    <div className="flex items-center justify-between p-3 bg-green-100 rounded-xl mb-2">
      <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
        <CheckCircle size={16} />
        <span>{label} — Siz</span>
      </div>
      {onBekor && (
        <button onClick={canAct ? onBekor : noAccess} className="text-xs text-red-500 font-medium">
          ✕ Bekor
        </button>
      )}
    </div>
  );

  const ActionBtn = ({ onClick, className, children, disabled }) => (
    <button
      onClick={canAct ? onClick : noAccess}
      disabled={disabled || saving}
      className={`w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition-all ${
        (!canAct || saving) ? 'opacity-50 grayscale cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );

  if (order.status === 'yangi') {
    // Boshqa xodim olganmi?
    const takenByOther = order.bosqich?.oldim &&
      order.yuvuvchiId &&
      xodim?.id &&
      order.yuvuvchiId !== xodim.id;

    if (takenByOther) {
      return (
        <div className={`p-4 rounded-xl border text-center ${dark ? 'bg-orange-950/30 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
          <div className="text-2xl mb-1">🔒</div>
          <p className={`text-sm font-bold ${dark ? 'text-orange-300' : 'text-orange-700'}`}>
            Bu buyurtma {order.yuvuvchi || 'boshqa xodim'} tomonidan olingan
          </p>
          <p className={`text-xs mt-1 ${dark ? 'text-orange-500' : 'text-orange-500'}`}>
            Qabul qilish mumkin emas
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {order.bosqich.oldim ? (
          <BannerTasdiq label="Oldim" onBekor={() => onBekorBosqich('oldim')} />
        ) : (
          <ActionBtn onClick={() => onBosqich('oldim', 'Oldim — boshladi')} className="bg-red-500 text-white">
            ✋🙋 Oldim
          </ActionBtn>
        )}
        {order.bosqich.oldim ? (
          order.bosqich.qabulQildim ? (
            <BannerTasdiq label="Qabul qilindi" />
          ) : (
            <ActionBtn onClick={onOpenTovar} className="bg-green-600 text-white">
              🔒 Qabul qilish
            </ActionBtn>
          )
        ) : (
          <button disabled className="w-full py-3 rounded-xl bg-green-100 text-green-400 font-bold text-sm flex items-center justify-center gap-2 opacity-60">
            <Lock size={15} /> Qabul qilish
          </button>
        )}
      </div>
    );
  }

  if (order.status === 'jarayonda') {
    return (
      <div className="space-y-2">
        {order.bosqich.yuvyapman ? (
          <BannerTasdiq label="Yuvyapman" onBekor={() => onBekorBosqich('yuvyapman')} />
        ) : (
          <ActionBtn
            onClick={async () => {
              await onBosqich('yuvyapman', 'Yuvyapman — boshladi');
              await onStatusChange({ yuvuvchi: role }, null);
            }}
            className="bg-green-100 text-green-700"
          >
            🫧 Yuvyapman
          </ActionBtn>
        )}
        {order.bosqich.yuvyapman && (
          <ActionBtn onClick={onOpenNarx} className="bg-green-600 text-white">
            🫧 Yuvish (narxlash)
          </ActionBtn>
        )}
      </div>
    );
  }

  if (order.status === 'qadoqlash') {
    return (
      <div className="space-y-2">
        {order.bosqich.qadoqlayapman ? (
          <BannerTasdiq label="Qadoqlayapman" onBekor={() => onBekorBosqich('qadoqlayapman')} />
        ) : (
          <ActionBtn onClick={() => onBosqich('qadoqlayapman', 'Qadoqlayapman — boshladi')} className="bg-purple-100 text-purple-700">
            📦 Qadoqlayapman
          </ActionBtn>
        )}
        {order.bosqich.qadoqlayapman && (
          <ActionBtn
            onClick={async () => {
              await onBosqich('qadoqlandi', 'Qadoqlandi');
              await onStatusChange({
                status: 'dostavka',
                ijrochilar: { ...order.ijrochilar, pardozda: ijrochiNomi },
              }, 'Qadoqlandi → Dostavka');
            }}
            className="bg-purple-600 text-white"
          >
            ✅ Qadoqlandi
          </ActionBtn>
        )}
      </div>
    );
  }

  if (order.status === 'dostavka') {
    return (
      <div className="space-y-2">
        {order.bosqich.olibKetdim ? (
          <BannerTasdiq label="Olib ketdim" onBekor={() => onBekorBosqich('olibKetdim')} />
        ) : (
          <ActionBtn onClick={() => onBosqich('olibKetdim', 'Olib ketdim — dostavka boshlandi')} className="bg-blue-100 text-blue-700">
            🚚 Olib ketdim
          </ActionBtn>
        )}
        {order.bosqich.olibKetdim && (
          <ActionBtn onClick={onOpenTolov} className="bg-blue-600 text-white">
            ✅ Yetkazildi (to'lov)
          </ActionBtn>
        )}
      </div>
    );
  }

  if (order.status === 'tugadi') {
    return (
      <div className="p-4 bg-green-50 rounded-xl text-center text-green-700 font-semibold text-sm">
        ✅ Buyurtma muvaffaqiyatli yakunlandi
        {order.tolov?.turi && (
          <p className="text-xs text-green-600 mt-1 font-normal">
            To'lov: {order.tolov.turi} — {formatSum(order.yakuniySumma)} so'm
          </p>
        )}
      </div>
    );
  }

  if (order.status === 'otkaz') {
    return (
      <div className="p-4 bg-red-50 rounded-xl text-center text-red-600 font-semibold text-sm">
        ✕ Buyurtma bekor qilindi
        {order.otkazSababi && (
          <p className="text-xs text-red-500 mt-1 font-normal">Sabab: {order.otkazSababi}</p>
        )}
      </div>
    );
  }

  return null;
}
