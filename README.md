# 🧹 Gilam Yuvish Servisi — Mobil Ilova

Gilam yuvish xizmati uchun ichki boshqaruv tizimi. Buyurtmani qabul qilishdan to'lov bilan yakunlashgacha kuzatadi.

## 🚀 Ishga tushirish

```bash
npm install
npm run dev
```

Brauzerda: `http://localhost:5173`

## 👥 Rollar

| Rol | Vakolat |
|-----|---------|
| **Admin** | Barcha funksiyalar: yaratish, tahrirlash, bekor qilish, statistika |
| **Dostavchik** | Buyurtmalarni olib ketish va yetkazish |
| **Ishchi** | Yuvish va qadoqlash jarayonlari |

> MVP versiyada parolsiz kirish — faqat rol tanlash.

## 📱 Sahifalar

- **Buyurtmalar** — Yangi/Jarayonda/Qadoqlash/Dostavka statuslari
- **Qarz** — Qarzdor mijozlar, qarzni yopish
- **Tarix** — Yakunlangan buyurtmalar
- **Otkaz** — Bekor qilingan buyurtmalar
- **Mijozlar** — Telefon bo'yicha mijozlar
- **Statistika** — Daromad va holat diagrammasi

## 🔄 Buyurtma jarayoni

```
YANGI → (Oldim → Qabul qilish → tovar kiritish)
      ↓
JARAYONDA → (Yuvyapman → Yuvish → narxlash)
      ↓
QADOQLASH → (Qadoqlayapman → Qadoqlandi)
      ↓
DOSTAVKA → (Olib ketdim → Yetkazildi → to'lov)
      ↓
TUGADI ✅
```

## 💾 Ma'lumotlar

`localStorage` da saqlanadi. Barcha CRUD operatsiyalari `src/services/orders.js` da. Kelajakda REST API ga oson almashtiriladi.

## 🎨 Mavzular

Header da oy ikonkasi → **AMOLED qora tema** (qop-qora fon).

## 📦 Texnologiyalar

- React + Vite
- Tailwind CSS v4
- React Router DOM
- Lucide React (ikonkalar)
- localStorage (ma'lumotlar bazasi)
