const { consumeToken } = require('../utils/tokenBucket');
const { resolvePolicy } = require('../utils/policies');

async function rateLimiter(req, res, next) {
  try {
    const userId = req.user.id;
    const endpoint = `${req.baseUrl}${req.path}`;   // e.g. /api/products
    const policy = await resolvePolicy(userId, endpoint);

    const result = await consumeToken(userId, endpoint, policy);

    res.set('X-RateLimit-Limit', String(policy.capacity));
    res.set('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter));
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfterSeconds: result.retryAfter,
      });
    }
    next();
  } catch (err) {
    // Fail-open: if Redis is down, don't take the whole API down with it.
    console.error('Rate limiter error:', err.message);
    next();
  }
}

module.exports = rateLimiter;