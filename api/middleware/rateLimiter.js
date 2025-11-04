const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter for API requests
const apiLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
});

// Rate limiter for slurp requests (more restrictive)
const slurpLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 3, // 3 slurp attempts
  duration: 300, // per 5 minutes
});

const rateLimiter = async (req, res, next) => {
  try {
    // Apply different rate limits based on endpoint
    if (req.path.includes('/slurp')) {
      await slurpLimiter.consume(req.ip);
    } else {
      await apiLimiter.consume(req.ip);
    }
    next();
  } catch (rateLimitError) {
    const secs = Math.round(rateLimitError.msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs
    });
  }
};

module.exports = {
  rateLimiter,
  apiLimiter,
  slurpLimiter
};