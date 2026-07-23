// Buyurtmaning mijoz ma'lumotlari tahrirlanganda — o'zgarishlar tarixi.
// Natija `buyurtmalar.tahrirlar` (jsonb) ustuniga yoziladi va
// buyurtma oynasida izohlar tagida ko'rsatiladi.

const MAYDONLAR = [
  { key: 'mijozIsmi', label: 'Mijoz ismi' },
  { key: 'telefon',   label: 'Telefon' },
  { key: 'manzil',    label: 'Manzil' },
];

export function tahrirDiff(order, data, muallif) {
  const vaqt = new Date().toISOString();

  const tahrirlar = MAYDONLAR
    .filter(m => m.key in data && (data[m.key] || '') !== (order[m.key] || ''))
    .map(m => ({
      maydon:  m.label,
      eski:    order[m.key] || '—',
      yangi:   data[m.key]  || '—',
      vaqt,
      muallif,
    }));

  // Qo'shimcha telefonlar — massiv, shuning uchun alohida solishtiramiz
  if ('qoshimchaTelefonlar' in data) {
    const eski  = (order.qoshimchaTelefonlar || []).join(', ');
    const yangi = (data.qoshimchaTelefonlar  || []).join(', ');
    if (eski !== yangi) {
      tahrirlar.push({
        maydon: "Qo'shimcha telefon",
        eski: eski || '—',
        yangi: yangi || '—',
        vaqt,
        muallif,
      });
    }
  }

  return tahrirlar;
}
