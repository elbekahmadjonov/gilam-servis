import type { CapacitorConfig } from '@capacitor/cli';

// Har korxonaga alohida APK yig'ish uchun — build paytida beriladi:
//   APK_ID=uz.pokiza.yuvish  APK_NOMI=Pokiza  npx cap sync android
// Berilmasa — asosiy (Musaffo) ilovasi yig'iladi.
const config: CapacitorConfig = {
  appId:   process.env.APK_ID   || 'uz.gilam.yuvish',
  appName: process.env.APK_NOMI || 'Musaffo',
  webDir:  'dist',
  server: {
    // HTTPS sxemasi — geolokatsiya API faqat HTTPS da ishlaydi
    androidScheme: 'https',
    // Lokal sinov: http:// LAN backend'iga ulanish uchun cleartext
    cleartext: true,
  },
  android: {
    // Splash screen oq fon
    backgroundColor: '#ffffff',
    // https sahifadan http (LAN) API'ga so'rov yuborishga ruxsat (mixed content)
    allowMixedContent: true,
  },
};

export default config;
