import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(join(__dirname, '..', 'schema.sql'), 'utf8');
  console.log('[migrate] schema.sql qo\'llanmoqda...');
  await pool.query(sql);
  console.log('✅ Migratsiya tugadi.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migratsiya xatosi:', err.message);
  process.exit(1);
});
