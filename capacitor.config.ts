import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'uz.gilam.yuvish',
  appName: 'Gilam Yuvish',
  webDir:  'dist',
  server: {
    // HTTPS sxemasi — geolokatsiya API faqat HTTPS da ishlaydi
    androidScheme: 'https',
  },
  android: {
    // Splash screen oq fon
    backgroundColor: '#ffffff',
  },
};

export default config;
