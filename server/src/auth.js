import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-almashtiring';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

// Tenant xodimi uchun token — tenant_id butun scope'ning asosi
export function signToken(xodim) {
  return jwt.sign(
    { id: xodim.id, rol: xodim.rol, login: xodim.login, tenant_id: xodim.tenant_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// SuperAdmin (platforma egasi) uchun token — tenant'siz, super:true bayrog'i bilan
export function signSuperToken(sa) {
  return jwt.sign(
    { id: sa.id, login: sa.login, super: true },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Express middleware — Authorization: Bearer <token> ni tekshiradi
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati tugagan' });
  }
}

// Faqat tenant xodimlari uchun (super token bilan tenant endpointlariga kirmasin)
export function requireTenant(req, res, next) {
  if (!req.user?.tenant_id || req.user.super) {
    return res.status(403).json({ error: 'Tenant konteksti talab qilinadi' });
  }
  next();
}

// RBAC — faqat berilgan rollarga ruxsat (masalan requireRole('Admin'))
export function requireRole(...rollar) {
  return (req, res, next) => {
    if (!rollar.includes(req.user?.rol)) {
      return res.status(403).json({ error: 'Bu amal uchun ruxsat yo\'q' });
    }
    next();
  };
}

// Faqat SuperAdmin
export function requireSuperAdmin(req, res, next) {
  if (!req.user?.super) {
    return res.status(403).json({ error: 'SuperAdmin huquqi talab qilinadi' });
  }
  next();
}
