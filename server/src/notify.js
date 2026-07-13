// notify.js — status o'zgarishida rol-asosli bildirishnoma.
// Yetkazish: Telegram bot (xodim mini-app'ga kirganda telegram_id bog'lanadi) + socket (ilova ochiq).
import { query } from './db.js';
import { getIo } from './realtime.js';

// Qaysi status qaysi rollarga xabar beradi.
//  - zayavka (yangi) va dostavka  → Owner + Dostavchik
//  - yuvilmoqda (jarayonda)       → Ishchi
//  - pardozda (qadoqlash)         → xabar YO'Q
const STATUS_ROLLAR = {
  yangi:     ['Owner', 'Dostavchik'],
  dostavka:  ['Owner', 'Dostavchik'],
  jarayonda: ['Ishchi'],
};

function vaqtMatn(d = new Date()) {
  const soat = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${soat} · Bugun`;
}

// Telegram bot orqali bitta xabar
async function sendBot(botToken, chatId, text) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const j = await r.json();
    if (!j.ok) console.warn('[bot] javob:', j.description);
    return Boolean(j.ok);
  } catch (e) {
    console.warn('[bot] yuborish xato:', e.message);
    return false;
  }
}

// Rolga mos xabar shabloni — buyurtma ma'lumotidan to'ldiriladi
function shablon(status, order, boshqa) {
  const vaqt = vaqtMatn();

  if (status === 'yangi') {
    const qoshimcha = boshqa > 0 ? `\nva qabul qilinmagan ${boshqa} ta buyurtma` : '';
    return `🆕 Yangi buyurtma #${order.id}\n` +
           `📍 ${order.manzil || '—'}\n` +
           `👤 ${order.mijoz_ismi || '—'}\n` +
           `📞 ${order.telefon || '—'}${qoshimcha}\n` +
           `⏰ Vaqt: ${vaqt}\n` +
           `Ilova orqali qabul qiling 👉`;
  }

  if (status === 'dostavka') {
    const qoshimcha = boshqa > 0 ? ` va ${boshqa} ta buyurtma` : '';
    return `🚚 Olib ketishga tayyor!\n` +
           `🔢 #${order.id}${qoshimcha}\n` +
           `olib ketishga tayyor\n` +
           `⏰ Vaqt: ${vaqt}\n` +
           `Ilova orqali qabul qiling 👉`;
  }

  if (status === 'jarayonda') {
    const t = order.tovarlar || {};
    const qatorlar = [];
    if (t.gilamSoni    > 0) qatorlar.push(`- Gilam — ${t.gilamSoni} dona`);
    if (t.odealSoni    > 0) qatorlar.push(`- Odeal — ${t.odealSoni} dona`);
    if (t.korpaSoni    > 0) qatorlar.push(`- Ko'rpa — ${t.korpaSoni} dona`);
    if (t.korpachaSoni > 0) qatorlar.push(`- Ko'rpacha — ${t.korpachaSoni} dona`);
    if (t.pardaBor)         qatorlar.push(`- Parda — bor`);
    const tovarlar = qatorlar.length ? `\n📦 Tovarlar:\n${qatorlar.join('\n')}` : '';
    return `🧺 Yuvishga tayyor #${order.id}${tovarlar}\n⏰ ${vaqt}`;
  }

  return null;
}

// Buyurtma status'ga o'tganda chaqiriladi.
export async function notifyOrderStatus(tenantId, orderId, status) {
  const rollar = STATUS_ROLLAR[status];
  if (!rollar) return;   // pardozda va boshqalar — xabar yo'q

  try {
    // Buyurtma ma'lumoti (shablon uchun)
    const { rows: orows } = await query(
      'SELECT id, mijoz_ismi, telefon, manzil, tovarlar FROM buyurtmalar WHERE id = $1 AND tenant_id = $2',
      [orderId, tenantId]
    );
    const order = orows[0];
    if (!order) return;

    // Shu statusdagi boshqa buyurtmalar soni
    const { rows: crows } = await query(
      'SELECT count(*)::int AS n FROM buyurtmalar WHERE tenant_id = $1 AND status = $2',
      [tenantId, status]
    );
    const boshqa = Math.max(0, (crows[0]?.n || 1) - 1);

    const text = shablon(status, order, boshqa);
    if (!text) return;

    // 1) Socket — ilova ochiq foydalanuvchilar (client o'z roli bo'yicha filtrlaydi)
    const io = getIo();
    if (io) {
      io.to(String(tenantId)).emit('bildirishnoma', {
        rollar, title: 'Musaffo', body: text, status, orderId,
      });
    }

    // 2) Telegram bot — shu rollardagi, botga bog'langan xodimlarga
    const { rows: trows } = await query('SELECT bot_token FROM tenants WHERE id = $1', [tenantId]);
    const botToken = trows[0]?.bot_token;
    if (!botToken) {
      console.warn('[NOTIFY] tenant bot_token yo\'q — Telegram xabar yuborilmadi');
      return;
    }

    const { rows: xodimlar } = await query(
      `SELECT ism, login, rol, telegram_id FROM xodimlar
       WHERE tenant_id = $1 AND rol = ANY($2) AND telegram_id IS NOT NULL`,
      [tenantId, rollar]
    );
    console.log(`[NOTIFY] status='${status}' rollar=[${rollar}] botga bog'langan xodim=${xodimlar.length}`);

    for (const x of xodimlar) {
      const ok = await sendBot(botToken, x.telegram_id, text);
      console.log(`[NOTIFY]   -> ${x.rol} ${x.ism || x.login}: ${ok ? 'YUBORILDI' : 'XATO'}`);
    }
  } catch (e) {
    console.warn('[NOTIFY] xato:', e.message);
  }
}
