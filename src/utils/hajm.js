// Bitta buyurtmadagi mahsulotlarning umumiy hajmi.
// Narxlash tafsilotida har mahsulot alohida yozilgan bo'ladi (Gilam 1 — 12 m²,
// Gilam 2 — 15 m²), bu esa ularning yig'indisini beradi (27 m²).

const son = (v) => Number(v) || 0;

export function buyurtmaHajmi(order = {}) {
  const n = order.narxlar || {};
  const t = order.tovarlar || {};

  const gilamM2 = (n.gilamlar || []).reduce((s, g) => s + son(g.yuza), 0);

  // Massiv bo'lmasa — eski formatdagi yakka maydonga tushamiz
  const korpachaMetr = (n.korpachalar || []).reduce((s, k) => s + son(k.metr), 0)
    || son(n.korpacha?.metr);
  const pardaKg = (n.pardalar || []).reduce((s, p) => s + son(p.kg), 0)
    || son(n.parda?.kg);

  const yumal = (x) => Math.round(x * 100) / 100;

  return {
    gilamM2:      yumal(gilamM2),
    korpachaMetr: yumal(korpachaMetr),
    pardaKg:      yumal(pardaKg),
    gilamSoni:    son(t.gilamSoni) || (n.gilamlar || []).length,
    odealSoni:    son(t.odealSoni),
    korpaSoni:    son(t.korpaSoni),
  };
}

// Ko'rsatish uchun qatorlar — faqat mavjud (noldan katta) mahsulotlar.
// [{ label: 'Gilam', qiymat: "27 m²", izoh: '2 dona' }, ...]
export function hajmQatorlari(order = {}) {
  const h = buyurtmaHajmi(order);
  const qatorlar = [];

  if (h.gilamM2 > 0) {
    qatorlar.push({
      label: 'Gilam — umumiy yuza',
      qiymat: `${h.gilamM2} m²`,
      izoh: h.gilamSoni > 0 ? `${h.gilamSoni} dona` : '',
    });
  }
  if (h.korpachaMetr > 0) {
    qatorlar.push({
      label: "Ko'rpacha — umumiy uzunlik",
      qiymat: `${h.korpachaMetr} m`,
      izoh: '',
    });
  }
  if (h.pardaKg > 0) {
    qatorlar.push({
      label: 'Parda — umumiy og\'irlik',
      qiymat: `${h.pardaKg} kg`,
      izoh: '',
    });
  }
  return qatorlar;
}
