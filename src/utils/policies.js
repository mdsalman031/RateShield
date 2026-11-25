const redis = require('../config/redis');

const POLICY_KEY = 'rateshield:policies';

const DEFAULT_POLICIES = {
  default: { capacity: 10, refillRate: 1 },        // 10 burst, 1 req/sec
  endpoints: {
    '/api/products': { capacity: 5, refillRate: 1 },
    '/api/orders': { capacity: 3, refillRate: 0.5 },
  },
  users: {},  // optional per-user overrides: { "alice": { capacity: 50, refillRate: 10 } }
};

async function getPolicies() {
  const raw = await redis.get(POLICY_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_POLICIES;
}

async function setPolicies(policies) {
  await redis.set(POLICY_KEY, JSON.stringify(policies));
}

// Priority: user override > endpoint policy > global default
async function resolvePolicy(userId, endpoint) {
  const p = await getPolicies();
  return p.users?.[userId] || p.endpoints?.[endpoint] || p.default;
}

module.exports = { getPolicies, setPolicies, resolvePolicy, DEFAULT_POLICIES };