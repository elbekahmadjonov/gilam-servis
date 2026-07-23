// Telefon raqamlarini bir xil ko'rinishga keltirish.
// Na'muna: +998912345678  (+998 va 9 ta raqam)
//
// Bazadagi haqiqiy ko'rinishlar:
//   +998906992960              → to'g'ri
//   906992960                  → +998 yo'q
//   +998 91-182-77-33          → bo'sh joy va chiziqcha
//   +99893-408-42-00           → chiziqcha
//   +998930575761#+998771948894→ bitta maydonda ikkita nomer
//   +998 91 182 77 33#911772332→ ikkinchisida +998 yo'q

// Bir maydonda bir nechta nomer bo'lishi mumkin — shu belgilar ajratadi
const AJRATGICH = /[#,;/\n]+/;

// Bitta raqamni normallashtirish.
// Qaytaradi: { ok, tel }  — ok=false bo'lsa tel = tozalangan asl matn
export function normalizeTel(raw) {
  const asl = String(raw ?? '').trim();
  if (!asl) return { ok: false, tel: '' };

  let raqam = asl.replace(/\D/g, '');   // faqat raqamlar

  // 8 90 123 45 67 (eski ichki format) → 90...
  if (raqam.length === 10 && raqam.startsWith('8')) raqam = raqam.slice(1);

  // 00998... → 998...
  if (raqam.startsWith('00998')) raqam = raqam.slice(2);

  if (raqam.length === 9) {
    // Operator kodisiz: 906992960
    return { ok: true, tel: `+998${raqam}` };
  }
  if (raqam.length === 12 && raqam.startsWith('998')) {
    return { ok: true, tel: `+${raqam}` };
  }
  // 998 bilan boshlanib uzunroq bo'lsa — oxirgi 9 ta raqamni olamiz
  if (raqam.length > 12 && raqam.startsWith('998')) {
    return { ok: true, tel: `+998${raqam.slice(-9)}` };
  }

  // Tanib bo'lmadi — asl holida qoldiramiz (qo'lda tuzatiladi)
  return { ok: false, tel: asl };
}

// Bir maydondagi matndan barcha nomerlarni ajratib, normallashtiradi.
// '+998930575761#+998771948894' → ['+998930575761', '+998771948894']
export function parseTelefonlar(raw) {
  return String(raw ?? '')
    .split(AJRATGICH)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => normalizeTel(s).tel)
    .filter(Boolean);
}

// Buyurtmaning telefon maydonlarini normallashtiradi.
// Asosiy maydonda bir nechta nomer bo'lsa — birinchisi asosiy,
// qolganlari qo'shimchaga qo'shiladi. Takrorlanganlar tashlanadi.
export function normalizeBuyurtmaTel(telefon, qoshimcha = []) {
  const hammasi = [
    ...parseTelefonlar(telefon),
    ...(qoshimcha || []).flatMap(t => parseTelefonlar(t)),
  ];
  const uniq = [...new Set(hammasi)];
  return { telefon: uniq[0] || '', qoshimchaTelefonlar: uniq.slice(1) };
}
