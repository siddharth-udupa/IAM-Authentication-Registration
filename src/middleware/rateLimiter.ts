import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum allowed requests within windowMs
  lockoutMs: number; // Lockout duration in milliseconds when limit is hit
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  requests: number[];
  lockoutUntil: number | null;
}

const stores = new Map<string, Map<string, ClientRecord>>();

/**
 * Creates an Express rate limiter middleware with automatic lockout duration enforcement.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const storeId = `${options.windowMs}_${options.max}_${options.lockoutMs}`;
  if (!stores.has(storeId)) {
    stores.set(storeId, new Map<string, ClientRecord>());
  }
  const store = stores.get(storeId)!;

  // Cleanup old records periodically to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.lockoutUntil && record.lockoutUntil < now) {
        record.lockoutUntil = null;
      }
      record.requests = record.requests.filter((time) => now - time < options.windowMs);
      if (record.requests.length === 0 && !record.lockoutUntil) {
        store.delete(key);
      }
    }
  }, 60000);

  return (req: Request, res: Response, next: NextFunction): any => {
    const now = Date.now();

    // Determine client identifier key (IP + target identity if available)
    let clientIp = req.ip || req.socket.remoteAddress || "unknown_ip";
    if (req.headers["x-forwarded-for"]) {
      const forwarded = req.headers["x-forwarded-for"];
      clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
    }

    const target = req.body?.email || req.body?.phone || req.body?.target || "";
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : `${clientIp}:${req.path.toLowerCase()}:${target.toLowerCase()}`;

    let record = store.get(key);
    if (!record) {
      record = { requests: [], lockoutUntil: null };
      store.set(key, record);
    }

    // 1. Check if client is currently in lockout state
    if (record.lockoutUntil && record.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      res.setHeader("Retry-After", remainingSeconds);

      return res.status(429).json({
        error:
          options.message ||
          `Rate limit exceeded. You are locked out from sending requests for ${remainingMinutes} minute(s). Please try again later.`,
        locked: true,
        remainingSeconds,
      });
    }

    // Lockout expired -> reset lockout state
    if (record.lockoutUntil && record.lockoutUntil <= now) {
      record.lockoutUntil = null;
      record.requests = [];
    }

    // 2. Filter requests within current windowMs
    record.requests = record.requests.filter((time) => now - time < options.windowMs);

    // Add current request timestamp
    record.requests.push(now);

    // 3. Check if request count exceeds max limit
    if (record.requests.length > options.max) {
      record.lockoutUntil = now + options.lockoutMs;
      const remainingSeconds = Math.ceil(options.lockoutMs / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      res.setHeader("Retry-After", remainingSeconds);

      return res.status(429).json({
        error:
          options.message ||
          `Rate limit exceeded. You are locked out from sending requests for ${remainingMinutes} minute(s). Please try again later.`,
        locked: true,
        remainingSeconds,
      });
    }

    // Set rate limit response headers
    res.setHeader("X-RateLimit-Limit", options.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - record.requests.length));

    return next();
  };
}

// Pre-configured Rate Limiters for System Routes
export const signupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5, // Max 5 signup requests per IP/Email
  lockoutMs: 15 * 60 * 1000, // 15 mins lockout
  message: "Too many sign-up attempts. You are temporarily locked out from creating accounts.",
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5, // Max 5 login attempts per IP/Email
  lockoutMs: 15 * 60 * 1000, // 15 mins lockout
  message: "Too many login attempts. You are temporarily locked out from signing in.",
});

export const otpResendRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 3, // Max 3 OTP resends
  lockoutMs: 10 * 60 * 1000, // 10 mins lockout
  message: "Too many OTP resend requests. You are temporarily locked out from requesting new codes.",
});

export const otpVerifyRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 5, // Max 5 verification requests
  lockoutMs: 10 * 60 * 1000, // 10 mins lockout
  message: "Too many OTP verification attempts. You are temporarily locked out.",
});
