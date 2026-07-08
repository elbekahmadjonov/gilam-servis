import crypto from 'node:crypto';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
// initData eskirgan deb hisoblanadigan muddat (soniya). 0 => tekshirilmaydi.
const MAX_AGE_SEC = Number(process.env.TELEGRAM_MAX_AGE_SEC || 86400); // 24 soat

/**
 * Telegram Mini App initData (query-string) ni tekshiradi.
 * Telegram algoritmi:
 *   secret = HMAC_SHA256(key="WebAppData", data=bot_token)
 *   hash   = HMAC_SHA256(key=secret,       data=data_check_string)
 * data_check_string = "hash"dan tashqari barcha key=value juftliklari,
 *   kalit bo'yicha alifbo tartibida, "\n" bilan birlashtirilgan.
 *
 * @returns {object|null} tekshiruvdan o'tsa Telegram user obyekti, aks holda null
 */
export function validateInitData(initData) {
  if (!BOT_TOKEN || !initData || typeof initData !== 'string') return null;

  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash) return null;

  // data_check_string
  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  // Doimiy vaqtli taqqoslash (timing attack'dan himoya)
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  // Muddatni tekshirish
  if (MAX_AGE_SEC > 0) {
    const authDate = Number(params.get('auth_date') || 0);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!authDate || nowSec - authDate > MAX_AGE_SEC) return null;
  }

  // user JSON'ni ajratamiz
  try {
    const userRaw = params.get('user');
    if (!userRaw) return null;
    const user = JSON.parse(userRaw);
    if (!user?.id) return null;
    return user; // { id, first_name, last_name, username, ... }
  } catch {
    return null;
  }
}
