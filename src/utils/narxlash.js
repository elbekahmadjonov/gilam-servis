// narxlash.js — Narx hisoblash yordamchi funksiyalari

export function hisoblaNarx(narxlar, tovarlar) {
  let jami = 0;

  // Gilamlar
  if (narxlar.gilamlar) {
    narxlar.gilamlar.forEach(g => {
      jami += g.yuza * g.narxM2;
    });
  }

  // Odeal
  if (tovarlar?.odealSoni > 0 && narxlar.odeal?.narx) {
    jami += narxlar.odeal.narx * tovarlar.odealSoni;
  }

  // Ko'rpa
  if (tovarlar?.korpaSoni > 0 && narxlar.korpa?.narx) {
    jami += narxlar.korpa.narx * tovarlar.korpaSoni;
  }

  // Parda
  if (tovarlar?.pardaBor && narxlar.parda?.jami) {
    jami += narxlar.parda.jami;
  }

  // Ko'rpacha
  if (tovarlar?.korpachaSoni > 0 && narxlar.korpacha?.jami) {
    jami += narxlar.korpacha.jami;
  }

  return jami;
}

export function formatSum(sum) {
  if (!sum && sum !== 0) return '0';
  return Number(sum).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
