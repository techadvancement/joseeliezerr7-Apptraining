type Entry<T> = { data: T; ts: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 60_000;

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const data = await loader();
      store.set(key, { data, ts: Date.now() });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export function invalidate(prefix: string): void {
  for (const k of Array.from(store.keys())) {
    if (k === prefix || k.startsWith(prefix + ':')) store.delete(k);
  }
}

export function clearCache(): void {
  store.clear();
  inflight.clear();
}
