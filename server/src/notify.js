// notify.js — status o'zgarishida rol-asosli bildirishnoma (socket + FCM push).
import { query } from './db.js';
import { sendPush } from './fcm.js';
import { getIo } from './realtime.js';

// Qaysi status qaysi rollarga xabar beradi.
//  - zayavka (yangi) va dostavka  → Owner + Dostavchik (ishchiga emas)
//  - yuvilmoqda (jarayonda) va pardozda (qadoqlash) → Ishchi
const STATUS_ROLLAR = {
  yangi:     ['Owner', 'Dostavchik'],
  dostavka:  ['Owner', 'Dostavchik'],
  jarayonda: ['Ishchi'],
  qadoqlash: ['Ishchi'],
};

// Har status uchun sarlavha + fe'l (aqlli matn uchun)
const STATUS_MATN = {
  yangi:     { title: '🆕 Yangi zayavka',    verb: 'zayavkaga tushdi' },
  dostavka:  { title: '🚚 Dostavka',         verb: 'dostavkaga tayyor' },
  jarayonda: { title: '🫧 Yuvishga tayyor',  verb: 'yuvishga tayyor' },
  qadoqlash: { title: '📦 Pardozga tayyor',  verb: 'pardozga tayyor' },
};

async function invalidTokenlarniTozala(tokens) {
  if (tokens?.length) {
    await query('DELETE FROM qurilma_tokenlar WHERE token = ANY($1)', [tokens]).catch(() => {});
  }
}

// Buyurtma status'ga o'tganda chaqiriladi.
export async function notifyOrderStatus(tenantId, orderId, status) {
  const rollar = STATUS_ROLLAR[status];
  const m = STATUS_MATN[status];
  if (!rollar || !m) return;

  // Shu statusdagi jami buyurtma soni — jamlangan matn uchun
  let boshqa = 0;
  try {
    const { rows } = await query(
      'SELECT count(*)::int AS n FROM buyurtmalar WHERE tenant_id = $1 AND status = $2',
      [tenantId, status]
    );
    boshqa = Math.max(0, (rows[0]?.n || 1) - 1);
  } catch { /* e'tiborsiz */ }

  const body = boshqa > 0
    ? `#${orderId} va yana ${boshqa} ta buyurtma ${m.verb}`
    : `#${orderId} buyurtma ${m.verb}`;

  // 1) Socket — ilova ochiq foydalanuvchilar (client o'z roli bo'yicha filtrlaydi)
  const io = getIo();
  if (io) {
    io.to(String(tenantId)).emit('bildirishnoma', {
      rollar, title: m.title, body, status, orderId,
    });
  }

  // 2) FCM push — shu tenant + kerakli rollardagi qurilmalar
  try {
    const { rows } = await query(
      'SELECT token FROM qurilma_tokenlar WHERE tenant_id = $1 AND rol = ANY($2)',
      [tenantId, rollar]
    );
    const tokens = rows.map(r => r.token);
    if (tokens.length) {
      const res = await sendPush(tokens, m.title, body, { type: 'order', status, orderId: String(orderId) });
      await invalidTokenlarniTozala(res.invalid);
    }
  } catch (e) {
    console.warn('[notify] push xato:', e.message);
  }
}

// Chat xabari kelganda — barcha tenant a'zolariga (yuboruvchidan tashqari) push.
export async function notifyChat(tenantId, muallifId, muallifIsmi, matn) {
  const io = getIo();
  const qisqa = matn.length > 80 ? matn.slice(0, 80) + '…' : matn;
  const title = `💬 ${muallifIsmi || 'Xodim'}`;

  try {
    const { rows } = await query(
      'SELECT token FROM qurilma_tokenlar WHERE tenant_id = $1 AND (xodim_id IS DISTINCT FROM $2)',
      [tenantId, muallifId]
    );
    const tokens = rows.map(r => r.token);
    if (tokens.length) {
      const res = await sendPush(tokens, title, qisqa, { type: 'chat' });
      await invalidTokenlarniTozala(res.invalid);
    }
  } catch (e) {
    console.warn('[notify] chat push xato:', e.message);
  }
  // Socket 'chat:yangi' alohida emitChat orqali yuboriladi (route ichida)
  return io;
}
