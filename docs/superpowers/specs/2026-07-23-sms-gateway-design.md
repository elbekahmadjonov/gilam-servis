# SMS Gateway — dizayn hujjati

Sana: 2026-07-23

## Maqsad

"Gilam Yuvish" ilovasiga SMS yuborish imkoniyatini qo'shish. Buyurtma "dostavka"
statusiga o'tganda mijozga avtomatik SMS yuboriladi. SMS pullik API orqali emas,
tenant o'zining SIM kartali Android telefoni orqali yuboradi (haqiqiy SMS
provayder kerak emas).

## Kontekst — mavjud stack bilan farq

Boshlang'ich talab (spec) Supabase, alohida Express server (port 3001) va
umumiy (bitta) gateway'ni nazarda tutgan edi. Loyihaning haqiqiy holati:

- Sof PostgreSQL + Express monolit (`gilam-app/server`), Supabase yo'q.
- Ko'p-mijozli (multi-tenant) — har `tenant_id` bilan ajratiladi
  (`tenants`, `xodimlar`, `buyurtmalar` va h.k.).
- JWT-asosli auth (`server/src/auth.js`), rol tizimi
  (`Owner/Admin/Dostavchik/Ishchi`, `src/utils/rollar.js`).
- Status o'zgarganda bildirishnoma yuborish patterni allaqachon bor:
  `server/src/notify.js` → `notifyOrderStatus(tenantId, orderId, status)`,
  buyurtma "dostavka"ga o'tganda chaqiriladi (socket + Telegram bot).
- Ilova allaqachon Capacitor Android proyekti (`gilam-app/android`), bir nechta
  brend uchun alohida APK yig'iladi (`APK_ID`/`APK_NOMI` env orqali).

Shu sabablarga ko'ra dizayn quyidagicha moslashtirildi (foydalanuvchi bilan
kelishilgan):

- Alohida server emas — mavjud `server/src`ga yangi route sifatida qo'shiladi.
- Supabase emas — mavjud `schema.sql`ga yangi jadval/ustunlar.
- Har tenant o'z telefonini ulaydi (bitta umumiy gateway emas).
- SMS shabloni serverda, tenant bo'yicha saqlanadi (localStorage emas).
- SMS bo'limi faqat **Owner** rolida ko'rinadi.
- Buyurtma "dostavka"ga o'tganda SMS avtomatik navbatga qo'yiladi, shu bilan
  birga SMS sahifasida qo'lda yuborish/qayta yuborish ham bo'ladi.
- Gateway telefon uchun alohida, minimal Capacitor ilovasi (asosiy ishchi
  ilovadan mustaqil), 6 xonali kod orqali ulanadi.

## Ma'lumotlar bazasi

`server/schema.sql`ga qo'shiladi (idempotent, mavjud patternga mos):

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_shablon text DEFAULT
  'Hurmatli {ism}, buyurtma #{id} tayyor. Yetkazib berishga chiqamiz.';

CREATE TABLE IF NOT EXISTS sms_telefon (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  kod             text,
  kod_muddati     timestamptz,
  token           text UNIQUE,
  qurilma_nomi    text NOT NULL DEFAULT '',
  sim_operator    text NOT NULL DEFAULT '',
  ulangan         boolean NOT NULL DEFAULT false,
  ulangan_vaqt    timestamptz,
  oxirgi_faollik  timestamptz
);

CREATE TABLE IF NOT EXISTS sms_queue (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  buyurtma_id      bigint REFERENCES buyurtmalar(id) ON DELETE SET NULL,
  telefon          text NOT NULL,
  xabar            text NOT NULL,
  status           text NOT NULL DEFAULT 'kutmoqda'
                     CHECK (status IN ('kutmoqda','yuborildi','xato')),
  xato_sababi      text,
  yaratilgan_vaqt  timestamptz NOT NULL DEFAULT now(),
  yuborilgan_vaqt  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_sms_queue_tenant_status ON sms_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_buyurtma ON sms_queue(buyurtma_id);
```

Bitta tenant — bitta telefon (`UNIQUE(tenant_id)` on `sms_telefon`). Qayta
ulash eski qatorni yangilaydi (upsert), yangi qator yaratmaydi.

Shablon o'zgaruvchilari: faqat `{ism}` (mijoz_ismi) va `{id}` (buyurtma raqami,
`COALESCE(raqam, id)`). Spec'dagi `{telefon}` o'chirildi — ilovada "xizmat
telefoni" degan alohida sozlama yo'q; Admin/Owner xizmat raqamini shablon
matniga to'g'ridan-to'g'ri yozadi (spec'ning o'z namunaviy matni ham shunday
qilgan).

## Backend

### Yangi fayllar

- `server/src/smsGateway.js` — gateway token generatsiya/tekshirish,
  `enqueueSms(tenantId, order)` funksiyasi (shablonni to'ldirib
  `sms_queue`ga qo'shadi, agar allaqachon faol qator bo'lsa qo'shmaydi).
- `server/src/routes/sms.js` — quyidagi endpointlar.

### Endpointlar (`/api/sms`, `index.js`da mount qilinadi)

**Owner-only** (`requireAuth, requireTenant, requireRole('Owner')`):

| Metod | Yo'l | Vazifa |
|---|---|---|
| GET | `/template` | joriy SMS shablonini qaytaradi |
| PUT | `/template` | shablonni yangilaydi |
| GET | `/phone` | telefon holati (ulangan/ulanmagan, qurilma, operator, oxirgi faollik) |
| POST | `/phone/code` | 6 xonali ulanish kodi yaratadi (10 daqiqa amal qiladi) |
| DELETE | `/phone` | uzish — token bekor qilinadi, `ulangan=false` |
| GET | `/queue` | "dostavka" statusidagi buyurtmalar + har birining SMS holati (join `sms_queue`) |
| POST | `/send` | `{buyurtma_id}` — bitta buyurtmani navbatga qo'yadi/qayta yuboradi |
| POST | `/send-all` | "Yuborilmagan"/"Xato" holatdagi barcha dostavka buyurtmalarini navbatga qo'yadi |

**Gateway-only** (alohida `requireGateway` middleware — oddiy random token,
DB'dan tekshiriladi, JWT emas, chunki "Uzish" bosilganda darhol bekor
qilinishi kerak):

| Metod | Yo'l | Vazifa |
|---|---|---|
| POST | `/gateway/connect` | `{kod, qurilma_nomi, sim_operator}` → kodni tekshiradi → doimiy token qaytaradi |
| GET | `/gateway/queue` | `kutmoqda` holatidagi SMS'larni qaytaradi, `oxirgi_faollik`ni yangilaydi |
| POST | `/gateway/confirm` | `{id, status, xato_sababi}` — natijani yozadi |

### Avtomatik navbatga qo'yish

`server/src/routes/orders.js`da `notifyOrderStatus(tenantId, orderId, 'dostavka')`
chaqirilgan joyning yonida `enqueueSms(tenantId, order)` ham chaqiriladi.
Agar tenant uchun shablon yo'q yoki telefon ulanmagan bo'lsa — jimgina
o'tkazib yuboriladi (xatolik chiqarmaydi, log yoziladi, xuddi `notify.js`dagi
bot_token yo'q holati kabi).

## Frontend

- `src/services/sms.js` — `api.js` orqali yuqoridagi endpointlarni chaqiruvchi
  funksiyalar (`getPhoneStatus`, `requestConnectCode`, `disconnectPhone`,
  `getTemplate`, `saveTemplate`, `getSmsQueue`, `sendOne`, `sendAll`).
- `src/pages/Sms.jsx` — uch blok:
  1. Telefon holati kartasi + "Ulanish kodi" / "Uzish" tugmasi + kod modali.
  2. Shablon matni (`textarea`) + "Saqlash".
  3. "Dostavka" buyurtmalari ro'yxati, har birida holat belgisi
     (Yuborilmagan / Yuborildi / Xato) va "SMS yuborish" tugmasi,
     tepada "Hammaga yuborish".
  Mavjud sahifalar uslubiga mos (`Debt.jsx` naqshi), `PullToRefresh` bilan
  o'ralgan, 8 soniyalik intervalda avtomatik yangilanadi.
- `src/utils/rollar.js` — `ALLOWED_TABS.Owner`ga `/sms` qo'shiladi (faqat Owner).
- `src/components/Footer.jsx` — yangi tab (`MessageSquare` ikonkasi, `lucide-react`).
- `src/App.jsx` — `{role === 'Owner' && <Route path="/sms" element={<Sms/>} />}`,
  xuddi `/hisob` route'i kabi.

## Gateway ilova (alohida, minimal Capacitor loyihasi)

Yangi papka: `gilam-app/sms-gateway/` — asosiy ishchi ilovadan mustaqil,
o'z `package.json`, `index.html`, minimal vanilla JS UI, o'z
`capacitor.config.ts`.

UI: kod kiritish maydoni + "Ulash" tugmasi + holat matni ("Ulangan" /
"Ulanmagan"). Ulangandan keyin fonda har 5 soniyada
`GET /api/sms/gateway/queue`ni so'raydi, yangi SMS bo'lsa native plugin
orqali yuboradi, keyin `POST /api/sms/gateway/confirm` bilan xabar beradi.
Token qurilmada `localStorage`da saqlanadi (qayta ochilganda kod qayta
kiritilmasin uchun).

Custom native Capacitor plugin (`SmsGatewayPlugin.java`, Android):
`android.telephony.SmsManager` orqali haqiqiy SMS yuboradi.
`AndroidManifest.xml`ga `SEND_SMS` ruxsati qo'shiladi, runtime permission
so'rovi ilova ochilganda amalga oshiriladi.

**Cheklov:** bu native plugin va Android loyihasi kodi to'liq yoziladi, lekin
ushbu muhitda Android SDK yo'qligi sababli **APK'ga kompilyatsiya qilib
sinab bo'lmaydi**. Foydalanuvchi buni Android Studio'da build qilib sinashi
kerak bo'ladi.

## Xatolarni boshqarish

- Telefon ulanmagan/shablon yo'q holatda avtomatik navbatga qo'yish jimgina
  o'tkazib yuboriladi (funksionallik cheklanadi, lekin buyurtma oqimi
  buzilmaydi).
- Gateway SMS yuborishda xato qaytarsa (`SmsManager` xatosi) —
  `POST /gateway/confirm` bilan `status='xato'` va sabab yoziladi, sahifada
  ko'rinadi, "Qayta yuborish" bilan qayta navbatga qo'yiladi.
- Bir buyurtma uchun bir vaqtda faqat bitta faol (`kutmoqda`/`yuborildi`)
  `sms_queue` qatori bo'ladi — avtomatik va qo'lda navbatga qo'yish
  takrorlanmaydi.
- Ulanish kodi 10 daqiqadan keyin eskiradi; muddati o'tgan kod bilan
  `gateway/connect` so'rovi rad etiladi.

## Testlash rejasi

- Backend: `npm run migrate` bilan yangi jadval/ustunlarni qo'llash,
  keyin endpointlarni curl orqali qo'lda tekshirish (agar lokal
  `DATABASE_URL` mavjud bo'lsa).
- Frontend: dev serverda (`npm run dev`) Owner sifatida kirib, SMS sahifasini
  qo'lda tekshirish — kod yaratish, shablon saqlash, ro'yxat ko'rinishi.
- Gateway ilova/native plugin: kod yoziladi, lekin qurilmada/emulyatorda
  sinalmaydi (Android SDK yo'q) — buni implementatsiya oxirida alohida
  eslatib o'tiladi.

## Qamrov chegarasi (scope)

Ushbu spec faqat shu SMS funksiyasini qamrab oladi. Kelajakda mumkin bo'lgan
kengaytmalar (bir nechta telefon/tenant, SMS tarixi arxivi, boshqa
statuslar uchun ham SMS) qamrovga kiritilmagan — kerak bo'lsa alohida
so'rov sifatida ko'rib chiqiladi.
