// Buyurtma tahrirlanganda tovarlar soni kamaysa — narxlar (o'lcham/narx)
// massivlarini ham qisqartiramiz. Aks holda o'chirilgan gilamning o'lchami
// bazada qolib, narxlash oynasida va statistikada hisoblanib ketadi.
//
// Qirqish OXIRIDAN boshlanadi: 3 ta gilamdan 2 tasi qolsa — 3-chisi o'chadi.

// Eski formatdagi (massivsiz) buyurtmalar uchun zaxira
function legacyOdeal(n)    { return n.odeal?.narx    > 0 ? [{ narx: n.odeal.narx, jami: n.odeal.narx }] : []; }
function legacyKorpa(n)    { return n.korpa?.narx    > 0 ? [{ narx: n.korpa.narx, jami: n.korpa.narx }] : []; }
function legacyParda(n)    { return n.parda?.jami    > 0 ? [{ ...n.parda }] : []; }
function legacyKorpacha(n) { return n.korpacha?.jami > 0 ? [{ ...n.korpacha }] : []; }

const kes = (arr, soni) => (arr || []).slice(0, Math.max(0, soni || 0));

export function syncNarxlar(narxlar = {}, tovarlar = {}) {
  const n = narxlar || {};

  const gilamlar    = kes(n.gilamlar, tovarlar.gilamSoni);
  const odeallar    = kes(n.odeallar    ?? legacyOdeal(n),    tovarlar.odealSoni);
  const korpalar    = kes(n.korpalar    ?? legacyKorpa(n),    tovarlar.korpaSoni);
  const korpachalar = kes(n.korpachalar ?? legacyKorpacha(n), tovarlar.korpachaSoni);
  const pardalar    = tovarlar.pardaBor ? (n.pardalar ?? legacyParda(n)) : [];

  const yangi = {
    ...n,
    gilamlar, odeallar, korpalar, korpachalar, pardalar,
    // eski moslik maydonlari
    odeal:    { narx: odeallar[0]?.narx || 0 },
    korpa:    { narx: korpalar[0]?.narx || 0 },
    parda:    pardalar[0]
      ? { kg: pardalar[0].kg || 0, narxKg: pardalar[0].narxKg || 0, jami: pardalar[0].jami || 0 }
      : { kg: 0, narxKg: 0, jami: 0 },
    korpacha: korpachalar[0]
      ? { metr: korpachalar[0].metr || 0, narxMetr: korpachalar[0].narxMetr || 0, jami: korpachalar[0].jami || 0 }
      : { metr: 0, narxMetr: 0, jami: 0 },
  };

  const umumiyHisob = [...gilamlar, ...odeallar, ...korpalar, ...korpachalar, ...pardalar]
    .reduce((s, x) => s + (x.jami || 0), 0);

  return { narxlar: yangi, umumiyHisob };
}

// Teskari yo'nalish: narxlash oynasida element o'chirilsa (masalan 3 ta gilamdan
// bittasi olib tashlansa) — tovarlar sanog'i ham shunga moslashadi.
export function tovarlarNarxdan(tovarlar = {}, narxlar = {}) {
  return {
    ...tovarlar,
    gilamSoni:    (narxlar.gilamlar    || []).length,
    odealSoni:    (narxlar.odeallar    || []).length,
    korpaSoni:    (narxlar.korpalar    || []).length,
    korpachaSoni: (narxlar.korpachalar || []).length,
    pardaBor:     (narxlar.pardalar    || []).length > 0,
  };
}

// Tovarlar soni o'zgarganmi?
export function tovarlarOzgardi(eski = {}, yangi = {}) {
  return ['gilamSoni', 'odealSoni', 'korpaSoni', 'korpachaSoni', 'pardaBor']
    .some(k => (eski[k] || 0) !== (yangi[k] || 0));
}
