import { query } from './db.js';

// Slug bo'yicha tenant yuklash (login/telegram uchun)
export async function getTenantBySlug(slug) {
  if (!slug) return null;
  const { rows } = await query(
    'SELECT * FROM tenants WHERE slug = $1',
    [String(slug).trim()]
  );
  return rows[0] || null;
}

export async function getTenantById(id) {
  if (!id) return null;
  const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [id]);
  return rows[0] || null;
}

// Tenant faol va muddati o'tmaganini tekshiradi
export function isTenantActive(tenant) {
  if (!tenant) return false;
  if (tenant.status !== 'active') return false;
  if (tenant.expires_at && new Date(tenant.expires_at) < new Date()) return false;
  return true;
}

// Middleware — token'dagi tenant_id bo'yicha tenantni yuklab, faolligini tekshiradi.
// req.tenant ga qo'yadi. To'xtatilgan/muddati o'tgan bo'lsa 403 tenant_suspended.
export async function requireTenantActive(req, res, next) {
  try {
    const tenant = await getTenantById(req.user?.tenant_id);
    if (!tenant) {
      return res.status(403).json({ error: 'tenant_not_found' });
    }
    if (!isTenantActive(tenant)) {
      return res.status(403).json({ error: 'tenant_suspended' });
    }
    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('[tenant] requireTenantActive:', err.message);
    return res.status(500).json({ error: 'Server xatosi' });
  }
}

// Reja limitlari (NULL = cheksiz). Oshsa true qaytaradi (= bloklash kerak).
export async function buyurtmaLimitOshdi(tenant) {
  if (!tenant?.limit_buyurtma) return false; // NULL/0 = cheksiz
  const { rows } = await query(
    'SELECT count(*)::int AS n FROM buyurtmalar WHERE tenant_id = $1',
    [tenant.id]
  );
  return rows[0].n >= tenant.limit_buyurtma;
}

export async function xodimLimitOshdi(tenant) {
  if (!tenant?.limit_xodim) return false;
  const { rows } = await query(
    'SELECT count(*)::int AS n FROM xodimlar WHERE tenant_id = $1',
    [tenant.id]
  );
  return rows[0].n >= tenant.limit_xodim;
}
