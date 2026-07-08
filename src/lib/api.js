// API klienti — Supabase o'rniga o'z backendimizga so'rovlar.
// JWT token localStorage'da saqlanadi va har so'rovga qo'shiladi.

import { getTenantSlug } from './tenant';

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'gilam_token';
const TIMEOUT_MS = 10000;

let token = localStorage.getItem(TOKEN_KEY) || null;

export function getToken() {
  return token;
}

export function setToken(newToken) {
  token = newToken;
  if (newToken) localStorage.setItem(TOKEN_KEY, newToken);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(getTenantSlug() ? { 'X-Tenant': getTenantSlug() } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      // 401 — token eskirgan/yaroqsiz: tozalaymiz
      if (res.status === 401) setToken(null);
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("So'rov vaqti tugadi (10s)");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get:   (path)       => request('GET', path),
  post:  (path, body) => request('POST', path, body),
  put:   (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del:   (path, body) => request('DELETE', path, body),
};
