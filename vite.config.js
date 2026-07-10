import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker'ni o'chiruvchi rejim — keshlash muammosini oldini oladi.
      // Capacitor (APK) ichida SW eski versiyani keshlab qolardi; bu uni tozalaydi.
      selfDestroying: true,
      registerType: 'autoUpdate',
      manifest: false,
    }),
  ],
})
