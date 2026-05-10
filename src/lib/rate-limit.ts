type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

declare global {
  var rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = global.rateLimitStore ?? new Map<string, RateLimitEntry>();

if (!global.rateLimitStore) {
  global.rateLimitStore = store;
}

function now() {
  return Date.now();
}

function cleanupExpiredEntries(currentTime: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= currentTime) {
      store.delete(key);
    }
  }
}

export function getClientIdentifier(
  forwardedFor: string | null | undefined,
  fallback = "unknown",
) {
  if (!forwardedFor) {
    return fallback;
  }

  return forwardedFor
    .split(",")[0]
    ?.trim()
    .slice(0, 120) || fallback;
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const currentTime = now();
  cleanupExpiredEntries(currentTime);

  const entry = store.get(key);

  if (!entry || entry.resetAt <= currentTime) {
    store.set(key, {
      count: 1,
      resetAt: currentTime + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((entry.resetAt - currentTime) / 1000),
      ),
    };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
