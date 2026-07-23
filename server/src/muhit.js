// Muhit himoyasi — lokal ishga tushirilgan server HAQIQIY Telegram botiga
// tegib ketmasligi uchun.
//
// Muammo (real hodisa): lokal bazaga prod nusxasi ko'chirilganda haqiqiy bot
// tokeni ham ko'chgan. Lokal server ishga tushganda:
//   • configureBot haqiqiy botning menyu tugmasini localhost'ga o'zgartirib qo'ygan
//   • notify haqiqiy xodimlarga haqiqiy xabar yuborishi mumkin edi
//
// Shuning uchun WEB_BASE localhost bo'lsa — Telegram'ga chiquvchi barcha
// murojaatlar to'xtatiladi. Ataylab yoqish kerak bo'lsa: TELEGRAM_MAJBURIY=1

const WEB_BASE = process.env.WEB_BASE || '';
const LOKAL = /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(WEB_BASE) || WEB_BASE === '';
const MAJBURIY = process.env.TELEGRAM_MAJBURIY === '1';

export const TELEGRAM_OCHIQ = MAJBURIY || !LOKAL;

// Chaqiruvchi joyda tekshirish uchun — sababni ham logga yozadi
export function telegramTogri(nima = 'amal') {
  if (TELEGRAM_OCHIQ) return true;
  console.warn(
    `[MUHIT] Telegram '${nima}' to'xtatildi — lokal muhit (WEB_BASE=${WEB_BASE || 'bo\'sh'}). ` +
    `Haqiqiy botga tegmaslik uchun. Kerak bo'lsa: TELEGRAM_MAJBURIY=1`
  );
  return false;
}

if (!TELEGRAM_OCHIQ) {
  console.warn(`[MUHIT] ⚠ Lokal rejim — Telegram xabarlari va bot sozlamalari O'CHIQ (WEB_BASE=${WEB_BASE || 'bo\'sh'})`);
}
