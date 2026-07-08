# 🧹 Gilam Yuvish Servisi — Mobil Ilova

Gilam yuvish xizmati uchun ichki boshqaruv tizimi. Buyurtmani qabul qilishdan to'lov bilan yakunlashgacha kuzatadi.

**To'liq o'z serveringizda (self-hosted)** ishlaydi — Supabase yoki boshqa tashqi xizmatga bog'liq emas.

## 📦 Texnologiyalar

**Frontend**
- React 19 + Vite 8
- Tailwind CSS v4
- React Router DOM 7
- Lucide React (ikonkalar)
- Socket.io-client (jonli yangilanish)
- Capacitor 8 (Android APK) + PWA

**Backend (`server/`)**
- Node.js + Express
- PostgreSQL (`pg`)
- JWT auth (`jsonwebtoken`) + bcrypt
- Socket.io (realtime)

## 🚀 Ishga tushirish — Docker (tavsiya etiladi)

Butun stack (PostgreSQL + backend + nginx) bitta buyruq bilan:

```bash
cp .env.docker.example .env      # qiymatlarni to'ldiring (JWT_SECRET majburiy!)
docker compose up -d --build
docker compose exec api npm run migrate   # birinchi marta — jadvallarni yaratadi
docker compose exec api npm run seed       # admin xodim yaratadi
```

Ilova: `http://<server-ip>:${WEB_PORT}` (standart 80).
Boshlang'ich admin: `.env` dagi `ADMIN_LOGIN` / `ADMIN_PAROL`.

> `JWT_SECRET` uchun: `openssl rand -hex 32`

## 🛠 Ishga tushirish — lokal (Docker'siz)

Postgres alohida o'rnatilgan bo'lishi kerak.

```bash
# 1) Backend
cd server
cp .env.example .env             # DATABASE_URL, JWT_SECRET ni to'ldiring
npm install
npm run migrate && npm run seed
npm run dev                      # http://localhost:3000

# 2) Frontend (boshqa terminalda, ildiz papkada)
npm install
npm run dev                      # http://localhost:5173  (/api → :3000 proxy kerak)
```

## 🔑 Autentifikatsiya

- Login + parol (bcrypt bilan xeshlangan) → JWT token (localStorage'da).
- Xodimlar `xodimlar` jadvalida. Yangi xodim `npm run seed` yoki to'g'ridan-to'g'ri SQL orqali qo'shiladi.

## 👥 Rollar

| Rol | Vakolat |
|-----|---------|
| **Admin** | Barcha funksiyalar: yaratish, tahrirlash, bekor qilish, statistika |
| **Dostavchik** | Buyurtmalarni olib ketish va yetkazish |
| **Ishchi** | Yuvish va qadoqlash jarayonlari |

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

## 🌐 API endpointlari

| Metod | Yo'l | Tavsif |
|-------|------|--------|
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Joriy xodim |
| POST | `/api/auth/change-password` | Parolni o'zgartirish |
| GET | `/api/orders` | Buyurtmalar ro'yxati |
| GET | `/api/orders/:id` | Bitta buyurtma (izohlar + harakatlar) |
| POST | `/api/orders` | Yangi buyurtma |
| PATCH | `/api/orders/:id` | Buyurtmani yangilash |
| POST | `/api/orders/:id/izoh` | Izoh qo'shish |
| POST | `/api/orders/:id/harakat` | Harakat (tarix) qo'shish |
| DELETE | `/api/orders/:id` | Buyurtmani o'chirish |

Realtime: Socket.io `orders:changed` eventi — buyurtma o'zgarganda barcha mijozlar yangilanadi.

## 🎨 Mavzular

Header'da oy ikonkasi → **AMOLED qora tema** (qop-qora fon).
