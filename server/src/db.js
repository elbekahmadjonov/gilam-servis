import pg from 'pg';

const { Pool } = pg;

// numeric(14,0) ustunlarini string emas, number sifatida qaytarish (OID 1700 = numeric)
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[db] kutilmagan pool xatosi:', err.message);
});

export const query = (text, params) => pool.query(text, params);
