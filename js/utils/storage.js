import { SESSION_STORAGE_KEY } from '../config.js';

function memoryStore() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

export function resolveStorage(custom) {
  if (custom) return custom;
  if (typeof sessionStorage !== 'undefined') return sessionStorage;
  return memoryStore();
}

export function createSessionStore(storage) {
  const store = resolveStorage(storage);

  function read() {
    try {
      const raw = store.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.token !== 'string' || typeof parsed.user !== 'object' || !parsed.user) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function write(session) {
    store.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  function clear() {
    store.removeItem(SESSION_STORAGE_KEY);
  }

  return { read, write, clear };
}
