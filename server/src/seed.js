import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// Boshlang'ich admin xodim yaratadi (yoki mavjud bo'lsa o'tkazib yuboradi).
// Login/parolni ADMIN_LOGIN / ADMIN_PAROL env orqali o'zgartirish mumkin.
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PAROL = process.env.ADMIN_PAROL || 'admin123';
const ADMIN_ISM   = process.env.ADMIN_ISM   || 'Administrator';

async function main() {
  const { rows } = await pool.query('SELECT id FROM xodimlar WHERE login = $1', [ADMIN_LOGIN]);
  if (rows[0]) {
    console.log(`ℹ️  '${ADMIN_LOGIN}' xodimi allaqachon mavjud — o'tkazib yuborildi.`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PAROL, 10);
    await pool.query(
      'INSERT INTO xodimlar (ism, login, parol_hash, rol) VALUES ($1, $2, $3, $4)',
      [ADMIN_ISM, ADMIN_LOGIN, hash, 'Admin']
    );
    console.log(`✅ Admin yaratildi:  login='${ADMIN_LOGIN}'  parol='${ADMIN_PAROL}'`);
    console.log('   ⚠️  Birinchi kirishdan keyin parolni o\'zgartiring!');
  }
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed xatosi:', err.message);
  process.exit(1);
});
