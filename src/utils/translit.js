// Lotin (o'zbek) → Kiril transliteratsiya + DOM ustida jonli qo'llash.
// Manba matn hamma joyda lotinda yozilgan; kiril rejim yoqilganda
// DOM matn tugunlari kirilga o'giriladi (React yangilaganda qayta o'giriladi).

const APOS = "['‘’ʻʼ`]"; // ' ‘ ’ ʻ ʼ `

// Digraflar — bir belgidan oldin (tartib muhim)
const DIGRAPHS = [
  [new RegExp(`O${APOS}`, 'g'), 'Ў'], [new RegExp(`o${APOS}`, 'g'), 'ў'],
  [new RegExp(`G${APOS}`, 'g'), 'Ғ'], [new RegExp(`g${APOS}`, 'g'), 'ғ'],
  [/SH/g, 'Ш'], [/Sh/g, 'Ш'], [/sh/g, 'ш'],
  [/CH/g, 'Ч'], [/Ch/g, 'Ч'], [/ch/g, 'ч'],
  [/YO/g, 'Ё'], [/Yo/g, 'Ё'], [/yo/g, 'ё'],
  [/YU/g, 'Ю'], [/Yu/g, 'Ю'], [/yu/g, 'ю'],
  [/YA/g, 'Я'], [/Ya/g, 'Я'], [/ya/g, 'я'],
  [/YE/g, 'Е'], [/Ye/g, 'Е'], [/ye/g, 'е'],
  [/TS/g, 'Ц'], [/Ts/g, 'Ц'], [/ts/g, 'ц'],
];

const SINGLE = {
  a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и',
  j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р',
  s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з',
  A: 'А', B: 'Б', C: 'С', D: 'Д', E: 'Е', F: 'Ф', G: 'Г', H: 'Ҳ', I: 'И',
  J: 'Ж', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', Q: 'Қ', R: 'Р',
  S: 'С', T: 'Т', U: 'У', V: 'В', W: 'В', X: 'Х', Y: 'Й', Z: 'З',
};

export function lotinToKiril(text) {
  if (!text) return text;
  // Lotin harflari yo'q bo'lsa — tegmaymiz (idempotent)
  if (!/[A-Za-z]/.test(text)) return text;
  let s = text;
  for (const [re, ch] of DIGRAPHS) s = s.replace(re, ch);
  let out = '';
  for (const c of s) out += SINGLE[c] ?? c;
  return out;
}

// ── DOM ustida jonli qo'llash ─────────────────────────
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'SELECT', 'CODE']);

function walk(node) {
  if (node.nodeType === 3) { // text node
    const conv = lotinToKiril(node.nodeValue);
    if (conv !== node.nodeValue) node.nodeValue = conv;
    return;
  }
  if (node.nodeType === 1 && !SKIP_TAGS.has(node.tagName)) {
    for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
  }
}

let observer = null;

export function startTranslit() {
  if (typeof document === 'undefined' || observer) return;
  const root = document.body;
  walk(root); // boshlang'ich o'tish

  observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') {
        walk(m.target);
      } else {
        m.addedNodes.forEach(walk);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}

export const LANG_KEY = 'gilam_lang';
export function isKiril() {
  try { return localStorage.getItem(LANG_KEY) === 'kiril'; } catch { return false; }
}
