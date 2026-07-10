import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'uz.gilam.yuvish',
  appName: 'Musaffo',
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
