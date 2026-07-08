// Telegram Mini App yordamchilari.
// Telegram ichida ochilmagan bo'lsa (oddiy brauzer) — barcha funksiyalar
// xavfsiz "no-op" bo'ladi va isTelegram() false qaytaradi.

const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

export function isTelegram() {
  return Boolean(tg && tg.initData);
}

// Backend'ga tekshirish uchun yuboriladigan xom initData (imzolangan qator)
export function getInitData() {
  return tg?.initData || '';
}

// Mini App'ni to'liq ekranga yoyish + tayyor signal
export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
  } catch {
    /* e'tiborsiz */
  }
}

// Telegram foydalanuvchisi (imzosiz — faqat UI uchun, ishonch backend'da)
export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}
