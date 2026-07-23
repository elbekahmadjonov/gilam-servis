// Mijozlar ro'yxatini CSV ga chiqarish — korxona statistikasi uchun.
// Excel uz/ru lokalida vergul ajratgich ishlamaydi, shuning uchun ';' va BOM.

const AJRATGICH = ';';

const USTUNLAR = [
  'Mijoz',
  'Telefon',
  "Qo'shimcha telefonlar",
  'Manzil',
  'Buyurtmalar soni',
  'Tugallangan',
  'Bekor qilingan',
  'Jarayonda',
  'Jami summa',
  "To'langan",
  'Qarz',
  "O'rtacha chek",
  'Gilam (m2)',
  'Gilam (dona)',
  "Ko'rpacha (m)",
  'Parda (kg)',
  'Odeal (dona)',
  "Ko'rpa (dona)",
  'Birinchi buyurtma',
  'Oxirgi buyurtma',
];

function csvQiymat(v) {
  const s = String(v ?? '');
  // Ajratgich, qo'shtirnoq yoki yangi qator bo'lsa — qo'shtirnoqqa olamiz
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const sana = (d) => (d ? new Date(d).toLocaleDateString('uz-UZ') : '');
const yumal = (n) => Math.round((n || 0) * 100) / 100;

// Bitta mijozning buyurtmalaridan ko'rsatkichlar
function mijozQator(c) {
  const b = c.buyurtmalar || [];

  const jamiSumma = b.reduce((s, o) => s + (o.yakuniySumma || 0), 0);
  const qarz      = b.reduce((s, o) => s + (o.qarz || 0), 0);
  const tugadi    = b.filter(o => o.status === 'tugadi').length;

  const hajm = { gilamM2: 0, gilamSoni: 0, korpachaM: 0, pardaKg: 0, odeal: 0, korpa: 0 };
  b.forEach(o => {
    const n = o.narxlar || {};
    const t = o.tovarlar || {};
    hajm.gilamM2   += (n.gilamlar || []).reduce((s, g) => s + (Number(g.yuza) || 0), 0);
    hajm.korpachaM += (n.korpachalar || []).reduce((s, k) => s + (Number(k.metr) || 0), 0)
                      || (Number(n.korpacha?.metr) || 0);
    hajm.pardaKg   += (n.pardalar || []).reduce((s, p) => s + (Number(p.kg) || 0), 0)
                      || (Number(n.parda?.kg) || 0);
    hajm.gilamSoni += Number(t.gilamSoni) || 0;
    hajm.odeal     += Number(t.odealSoni) || 0;
    hajm.korpa     += Number(t.korpaSoni) || 0;
  });

  // Barcha qo'shimcha nomerlar va manzillar (takrorsiz)
  const qoshimcha = [...new Set(b.flatMap(o => o.qoshimchaTelefonlar || []))];
  const manzil = b.map(o => o.manzil).filter(Boolean).pop() || '';

  const sanalar = b.map(o => o.yaratilganVaqt).filter(Boolean).sort();

  return [
    c.ismi,
    c.telefon,
    qoshimcha.join(' / '),
    manzil,
    b.length,
    tugadi,
    b.filter(o => o.status === 'otkaz').length,
    b.filter(o => !['tugadi', 'otkaz'].includes(o.status)).length,
    jamiSumma,
    jamiSumma - qarz,
    qarz,
    tugadi ? Math.round(jamiSumma / tugadi) : 0,
    yumal(hajm.gilamM2),
    hajm.gilamSoni,
    yumal(hajm.korpachaM),
    yumal(hajm.pardaKg),
    hajm.odeal,
    hajm.korpa,
    sana(sanalar[0]),
    sana(sanalar[sanalar.length - 1]),
  ];
}

export function mijozlarCSV(customers = []) {
  const satrlar = customers.map(mijozQator);

  // Jami — oxirgi qator (faqat son ustunlari; sana ustunlari bo'sh)
  const jami = ['JAMI', '', '', ''];
  for (let i = 4; i < USTUNLAR.length - 2; i++) {
    jami.push(yumal(satrlar.reduce((s, r) => s + (Number(r[i]) || 0), 0)));
  }
  jami.push('', '');

  const qatorlar = [USTUNLAR, ...satrlar, jami];
  return '﻿' + qatorlar.map(r => r.map(csvQiymat).join(AJRATGICH)).join('\r\n');
}

// Faylni yuklab olish (brauzer / WebView)
export function csvYuklab(matn, faylNomi) {
  const blob = new Blob([matn], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = faylNomi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
