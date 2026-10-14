/**
 * Production Security & Rate Limiting Middleware
 * Zero external dependencies (uses native Node memory & HTTP primitives)
 */

// Simple in-memory rate limiter using sliding token bucket
function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 100, message = 'Too many requests, please try again later.' }) {
  const ipRequests = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipRequests.entries()) {
      if (now - data.resetTime > windowMs) {
        ipRequests.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref(); // .unref() so interval doesn't hold process open during tests

  return (req, res, next) => {
    // In local development or testing, relax constraints
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let tracker = ipRequests.get(ip);
    if (!tracker || now > tracker.resetTime) {
      tracker = {
        count: 1,
        resetTime: now + windowMs
      };
      ipRequests.set(ip, tracker);
    } else {
      tracker.count++;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - tracker.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(tracker.resetTime / 1000));

    if (tracker.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((tracker.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
}

// Security headers middleware (equivalent to helmet)
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// Structured request logger middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
}

module.exports = {
  createRateLimiter,
  securityHeaders,
  requestLogger
};
