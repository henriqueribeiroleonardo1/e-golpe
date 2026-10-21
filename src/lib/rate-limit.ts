export interface RateLimiter {
  /** Registra uma tentativa. Devolve quantos segundos esperar, ou 0 se pode seguir. */
  hit(key: string): number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

const MAX_TRACKED_KEYS = 10_000;

/** Janela fixa em memória. Simples e suficiente para uma única instância. */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimitOptions): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  const sweep = (time: number) => {
    for (const [key, window] of windows) if (window.resetAt <= time) windows.delete(key);
  };

  return {
    hit(key) {
      const time = now();
      if (windows.size > MAX_TRACKED_KEYS) sweep(time);

      const window = windows.get(key);
      if (!window || window.resetAt <= time) {
        windows.set(key, { count: 1, resetAt: time + windowMs });
        return 0;
      }

      window.count += 1;
      return window.count > limit ? Math.ceil((window.resetAt - time) / 1000) : 0;
    },
  };
}
