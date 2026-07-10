// Socket.io orqali jonli yangilanish — tenant bo'yicha ajratilgan (room'lar).
// Har tenant o'z room'ida — bir mijozning o'zgarishi boshqasiga ketmaydi.

let io = null;

export function setIo(instance) {
  io = instance;
}

export function getIo() {
  return io;
}

// Faqat shu tenantning ulangan mijozlariga signal
export function emitOrdersChanged(tenantId) {
  if (io && tenantId) io.to(String(tenantId)).emit('orders:changed');
}

// Yangi chat xabari — shu tenant room'iga
export function emitChat(tenantId, xabar) {
  if (io && tenantId) io.to(String(tenantId)).emit('chat:yangi', xabar);
}

// Chat xabari tahrirlandi
export function emitChatTahrir(tenantId, xabar) {
  if (io && tenantId) io.to(String(tenantId)).emit('chat:tahrir', xabar);
}

// Chat xabari o'chirildi
export function emitChatOchirildi(tenantId, id) {
  if (io && tenantId) io.to(String(tenantId)).emit('chat:ochirildi', { id });
}
