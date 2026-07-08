// Super Admin API klienti — mijoz api'sidan alohida token (gilam_super_token).

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'gilam_super_token';
const TIMEOUT_MS = 15000;

let token = localStorage.getItem(TOKEN_KEY) || null;

export const getSuperToken = () => token;
export function setSuperToken(t) {
  token = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + '/super' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      if (res.status === 401) setSuperToken(null);
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error("So'rov vaqti tugadi");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const superApi = {
  get:   (p)    => request('GET', p),
  post:  (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del:   (p)    => request('DELETE', p),
};
