import { api } from '../lib/api';

export async function getMessages() {
  try { return await api.get('/chat'); } catch { return []; }
}

export async function sendMessage(matn) {
  return api.post('/chat', { matn });
}

export async function editMessage(id, matn) {
  return api.patch(`/chat/${id}`, { matn });
}

export async function deleteMessage(id) {
  return api.del(`/chat/${id}`);
}
