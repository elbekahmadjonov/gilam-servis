// customers.js — Mijozlar (orders massividan hisoblash)
// Endi orders parametr sifatida beriladi (Supabase dan yuklangan)

export function getCustomers(orders = []) {
  const map = {};

  orders.forEach(o => {
    const phone = o.telefon || '';
    if (!phone) return;
    if (!map[phone]) {
      map[phone] = {
        telefon:      phone,
        ismi:         o.mijozIsmi || 'Noma\'lum',
        buyurtmalar:  [],
        jamilarQarz:  0,
      };
    }
    map[phone].buyurtmalar.push(o);
    map[phone].jamilarQarz += o.qarz || 0;
    if (o.mijozIsmi) map[phone].ismi = o.mijozIsmi;
  });

  return Object.values(map).sort((a, b) =>
    b.buyurtmalar.length - a.buyurtmalar.length
  );
}

export function getCustomerByPhone(phone, orders = []) {
  return getCustomers(orders).find(c => c.telefon === phone) || null;
}
