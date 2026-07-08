// Socket.io orqali jonli yangilanish — tenant bo'yicha ajratilgan (room'lar).
// Har tenant o'z room'ida — bir mijozning o'zgarishi boshqasiga ketmaydi.

let io = null;

export function setIo(instance) {
  io = instance;
}

// Faqat shu tenantning ulangan mijozlariga signal
export function emitOrdersChanged(tenantId) {
  if (io && tenantId) io.to(String(tenantId)).emit('orders:changed');
}
