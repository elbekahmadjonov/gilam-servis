// push.js — bildirishnomalar: FCM push (native) + local notification (ochiq ilova).
import { Capacitor } from '@capacitor/core';
import { api } from './api';

// FCM (Firebase) push — google-services.json qo'shilgandan keyin true qilinadi.
// false bo'lsa: PushNotifications.register() chaqirilmaydi (Firebase'siz crash bo'lmaydi).
// Local notification (socket orqali) baribir ishlaydi.
const FCM_ENABLED = false;

let currentToken = null;

// Local (tizim) bildirishnoma — ilova ochiq bo'lganda ko'rsatiladi.
export async function showLocalNotif(title, body) {
  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 2000000000),
          title,
          body,
          channelId: 'gilam',
        }],
      });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn('[notif] showLocalNotif xato:', e?.message || e);
  }
}

// Ilk sozlash: ruxsat + FCM token'ni backendga saqlash.
export async function initPush() {
  if (!Capacitor.isNativePlatform()) {
    // Web: local notification uchun ruxsat
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* skip */ }
    }
    return;
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.requestPermissions().catch(() => {});
    await LocalNotifications.createChannel({
      id: 'gilam', name: 'Gilam Servis', description: 'Buyurtma va chat xabarlari',
      importance: 5, visibility: 1,
    }).catch(() => {});
  } catch { /* skip */ }

  // FCM push — faqat Firebase sozlangach (aks holda register() crash beradi)
  if (!FCM_ENABLED) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (t) => {
      currentToken = t.value;
      try { await api.post('/devices', { token: t.value }); } catch { /* skip */ }
    });
    PushNotifications.addListener('registrationError', (e) =>
      console.warn('[push] registratsiya xatosi:', e?.error || e));

    // Foreground'da kelgan push — socket allaqachon ko'rsatadi (dublikatdan qochamiz).
    // Bu yerda faqat log.
    PushNotifications.addListener('pushNotificationReceived', () => {});
  } catch (e) {
    console.warn('[push] init xato:', e?.message || e);
  }
}

// Logout'da tokenni backenddan olib tashlash.
export async function removePushToken() {
  if (!currentToken) return;
  try { await api.del('/devices', { token: currentToken }); } catch { /* skip */ }
  currentToken = null;
}
