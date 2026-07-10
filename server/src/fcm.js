// fcm.js — FCM push (firebase-admin). Sozlanmagan bo'lsa — no-op (lokal).
// Sozlash: FIREBASE_SERVICE_ACCOUNT=<service-account.json yo'li>
import fs from 'node:fs';

let messaging = null;

try {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saPath && fs.existsSync(saPath)) {
    const admin = (await import('firebase-admin')).default;
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))),
    });
    messaging = admin.messaging();
    console.log('[fcm] Firebase Admin ishga tushdi');
  } else {
    console.log('[fcm] FIREBASE_SERVICE_ACCOUNT yo\'q — push o\'chirilgan (lokal rejim)');
  }
} catch (e) {
  console.warn('[fcm] init xato:', e.message);
}

export function fcmReady() { return Boolean(messaging); }

// tokens: string[], data: {...} — yaroqsiz tokenlar ro'yxatini qaytaradi (tozalash uchun)
export async function sendPush(tokens, title, body, data = {}) {
  if (!messaging || !tokens?.length) return { sent: 0, invalid: [] };
  const message = {
    tokens: tokens.slice(0, 500),
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: { priority: 'high', notification: { sound: 'default', channelId: 'gilam' } },
  };
  try {
    const res = await messaging.sendEachForMulticast(message);
    const invalid = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalid.push(message.tokens[i]);
        }
      }
    });
    return { sent: res.successCount, invalid };
  } catch (e) {
    console.warn('[fcm] send xato:', e.message);
    return { sent: 0, invalid: [] };
  }
}
