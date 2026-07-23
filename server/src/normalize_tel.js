// Bazadagi mavjud telefon raqamlarini bir xil ko'rinishga keltiradi (+998912345678).
//
//   npm run tel          → QURUQ SINOV: nima o'zgarishini ko'rsatadi, bazaga yozmaydi
//   npm run tel -- --apply → haqiqiy yozish
//
// Asosiy maydonda bir nechta nomer bo'lsa (masalan "+998...#+998...") —
// birinchisi asosiy bo'lib qoladi, qolganlari qoshimcha_telefonlar'ga o'tadi.
// Tanib bo'lmagan raqamlar O'ZGARTIRILMAYDI — ular ro'yxat oxirida ko'rsatiladi.

import 'dotenv/config';
import { pool, query } from './db.js';
import { normalizeBuyurtmaTel, normalizeTel } from './telefon.js';

const APPLY = process.argv.includes('--apply');

function tengmi(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const { rows } = await query(
    `SELECT id, telefon, qoshimcha_telefonlar, tahrirlar FROM buyurtmalar ORDER BY id`
  );

  const ozgaradi = [];
  const shubhali = [];

  for (const r of rows) {
    const eskiTel = r.telefon || '';
    const eskiQosh = Array.isArray(r.qoshimcha_telefonlar) ? r.qoshimcha_telefonlar : [];

    const yangi = normalizeBuyurtmaTel(eskiTel, eskiQosh);

    // Tanib bo'lmadimi?
    const barchasi = [yangi.telefon, ...yangi.qoshimchaTelefonlar];
    if (barchasi.some(t => t && !normalizeTel(t).ok)) {
      shubhali.push({ id: r.id, tel: eskiTel });
      continue;
    }

    if (yangi.telefon !== eskiTel || !tengmi(yangi.qoshimchaTelefonlar, eskiQosh)) {
      ozgaradi.push({
        id: r.id, eskiTel, eskiQosh, ...yangi,
        tahrirlar: Array.isArray(r.tahrirlar) ? r.tahrirlar : [],
      });
    }
  }

  console.log(`Jami buyurtma: ${rows.length}`);
  console.log(`O'zgaradi:     ${ozgaradi.length}`);
  console.log(`Tanilmadi:     ${shubhali.length}\n`);

  for (const o of ozgaradi) {
    const qosh = o.qoshimchaTelefonlar.length ? `  [qo'shimcha: ${o.qoshimchaTelefonlar.join(', ')}]` : '';
    console.log(`  #${o.id}  ${o.eskiTel}  →  ${o.telefon}${qosh}`);
  }

  if (shubhali.length) {
    console.log('\nTanib bo\'lmadi (o\'zgarishsiz qoldi, qo\'lda tuzating):');
    shubhali.forEach(s => console.log(`  #${s.id}  ${s.tel}`));
  }

  if (!APPLY) {
    console.log('\n QURUQ SINOV — bazaga hech nima yozilmadi.');
    console.log('   Yozish uchun:  npm run tel -- --apply');
    await pool.end();
    return;
  }

  const vaqt = new Date().toISOString();

  for (const o of ozgaradi) {
    // Tahrir tarixiga yozamiz — buyurtma ostida "TAHRIRLANGAN MA'LUMOTLAR"da ko'rinadi
    const yangiTahrirlar = [...o.tahrirlar];

    if (o.telefon !== o.eskiTel) {
      yangiTahrirlar.push({
        maydon: 'Telefon',
        eski: o.eskiTel || '—',
        yangi: o.telefon || '—',
        vaqt,
        muallif: 'Tizim (raqam formati)',
      });
    }
    if (!tengmi(o.qoshimchaTelefonlar, o.eskiQosh)) {
      yangiTahrirlar.push({
        maydon: "Qo'shimcha telefon",
        eski: (o.eskiQosh || []).join(', ') || '—',
        yangi: o.qoshimchaTelefonlar.join(', ') || '—',
        vaqt,
        muallif: 'Tizim (raqam formati)',
      });
    }

    await query(
      `UPDATE buyurtmalar
       SET telefon = $1, qoshimcha_telefonlar = $2, tahrirlar = $3
       WHERE id = $4`,
      [o.telefon, JSON.stringify(o.qoshimchaTelefonlar), JSON.stringify(yangiTahrirlar), o.id]
    );

    // Harakatlar tarixiga ham qo'shamiz (kim/nima qilgani ko'rinsin)
    await query(
      `INSERT INTO harakatlar (buyurtma_id, tenant_id, amal)
       SELECT id, tenant_id, $2 FROM buyurtmalar WHERE id = $1`,
      [o.id, 'Telefon raqami bir xil ko\'rinishga keltirildi']
    ).catch(() => {});
  }
  console.log(`\n ${ozgaradi.length} ta buyurtma yangilandi (tahrir tarixi bilan).`);
  await pool.end();
}

main().catch(err => {
  console.error('Xato:', err.message);
  process.exit(1);
});
