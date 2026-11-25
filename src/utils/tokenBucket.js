const redis = require('../config/redis');

// ---------- in-memory version (for learning/tests) ----------
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;       // max tokens
    this.refillRate = refillRate;   // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRate);
    this.lastRefill = now;
  }

  consume(count = 1) {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return { allowed: true, remaining: Math.floor(this.tokens), retryAfter: 0 };
    }
    const retryAfter = Math.ceil((count - this.tokens) / this.refillRate);
    return { allowed: false, remaining: Math.floor(this.tokens), retryAfter };
  }
}

// ---------- atomic Redis version ----------
// Uses Redis TIME so every gateway instance shares one clock (no clock skew).
const LUA_TOKEN_BUCKET = `
local key        = KEYS[1]
local capacity   = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])   -- tokens per second
local requested  = tonumber(ARGV[3])

local t   = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)  -- ms

local data   = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last   = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  last   = now
end

local elapsed = math.max(0, now - last) / 1000
tokens = math.min(capacity, tokens + elapsed * refillRate)

local allowed    = 0
local retryAfter = 0

if tokens >= requested then
  tokens  = tokens - requested
  allowed = 1
else
  retryAfter = math.ceil((requested - tokens) / refillRate)
end

redis.call('HSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
-- Expire idle buckets (time to fully refill, x2, minimum 60s)
redis.call('EXPIRE', key, math.max(60, math.ceil(capacity / refillRate) * 2))

return { allowed, tostring(tokens), retryAfter }
`;

redis.defineCommand('tokenBucket', { numberOfKeys: 1, lua: LUA_TOKEN_BUCKET });

async function consumeToken(userId, endpoint, { capacity, refillRate }) {
  const key = `rl:${userId}:${endpoint}`;
  const [allowed, tokens, retryAfter] = await redis.tokenBucket(key, capacity, refillRate, 1);
  return {
    allowed: allowed === 1,
    remaining: Math.floor(parseFloat(tokens)),
    retryAfter: Number(retryAfter),
  };
}

module.exports = { TokenBucket, consumeToken };