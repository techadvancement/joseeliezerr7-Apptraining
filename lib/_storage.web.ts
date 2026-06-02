import type { SupportedStorage } from '@supabase/supabase-js';

// Use localStorage directly on web. AsyncStorage's web backend also wraps
// localStorage, but its Promise-wrapped API had subtle timing issues with
// Supabase v2 session persistence (sessions appeared to vanish on reload).
// Synchronous access matches what supabase-js expects on the web.
function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__sb_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

const ls = safeLocalStorage();
const memory = new Map<string, string>();

export const storage: SupportedStorage = {
  getItem(key) {
    if (ls) {
      try { return ls.getItem(key); } catch { return memory.get(key) ?? null; }
    }
    return memory.get(key) ?? null;
  },
  setItem(key, value) {
    if (ls) {
      try { ls.setItem(key, value); return; } catch { /* fall through */ }
    }
    memory.set(key, value);
  },
  removeItem(key) {
    if (ls) {
      try { ls.removeItem(key); return; } catch { /* fall through */ }
    }
    memory.delete(key);
  },
};
