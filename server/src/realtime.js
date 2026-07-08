// Socket.io orqali jonli yangilanish — Supabase realtime o'rniga.
// Har qanday buyurtma o'zgarishida barcha ulangan mijozlarga xabar beramiz.

let io = null;

export function setIo(instance) {
  io = instance;
}

// Buyurtmalar o'zgarganda frontendlarga signal (payload shart emas —
// frontend keshni tozalab, ro'yxatni qayta yuklaydi).
export function emitOrdersChanged() {
  if (io) io.emit('orders:changed');
}
