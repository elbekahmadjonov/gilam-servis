import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// 1) SuperAdmin (platforma egasi) yaratadi.
// 2) "default" tenant uchun boshlang'ich Admin xodim yaratadi (orqaga moslik).
const SUPER_LOGIN = process.env.SUPER_LOGIN || 'super';
const SUPER_PAROL = process.env.SUPER_PAROL || 'super123';
const SUPER_ISM   = process.env.SUPER_ISM   || 'Super Admin';

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PAROL = process.env.ADMIN_PAROL || 'admin123';
const ADMIN_ISM   = process.env.ADMIN_ISM   || 'Administrator';

async function main() {
  // ── SuperAdmin ──
  const s = await pool.query('SELECT id FROM super_admins WHERE login = $1', [SUPER_LOGIN]);
  if (s.rows[0]) {
    console.log(`ℹ️  SuperAdmin '${SUPER_LOGIN}' allaqachon mavjud.`);
  } else {
    const hash = await bcrypt.hash(SUPER_PAROL, 10);
    await pool.query(
      'INSERT INTO super_admins (ism, login, parol_hash) VALUES ($1, $2, $3)',
      [SUPER_ISM, SUPER_LOGIN, hash]
    );
    console.log(`✅ SuperAdmin yaratildi:  login='${SUPER_LOGIN}'  parol='${SUPER_PAROL}'`);
  }

  // ── Default tenant admin ──
  const t = await pool.query("SELECT id FROM tenants WHERE slug = 'default'");
  const tenantId = t.rows[0]?.id;
  if (!tenantId) {
    console.warn('⚠️  default tenant topilmadi — avval `npm run migrate` bajaring.');
  } else {
    const a = await pool.query(
      'SELECT id FROM xodimlar WHERE tenant_id = $1 AND login = $2',
      [tenantId, ADMIN_LOGIN]
    );
    if (a.rows[0]) {
      console.log(`ℹ️  default tenant admini '${ADMIN_LOGIN}' allaqachon mavjud.`);
    } else {
      const hash = await bcrypt.hash(ADMIN_PAROL, 10);
      await pool.query(
        'INSERT INTO xodimlar (tenant_id, ism, login, parol_hash, rol) VALUES ($1, $2, $3, $4, $5)',
        [tenantId, ADMIN_ISM, ADMIN_LOGIN, hash, 'Admin']
      );
      console.log(`✅ Default tenant admini:  login='${ADMIN_LOGIN}'  parol='${ADMIN_PAROL}'`);
    }
  }

  console.log('   ⚠️  Birinchi kirishdan keyin parollarni o\'zgartiring!');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed xatosi:', err.message);
  process.exit(1);
});
