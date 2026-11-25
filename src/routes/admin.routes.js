const router = require('express').Router();
const { getPolicies, setPolicies } = require('../utils/policies');

// Simple MVP admin auth: shared secret in a header
function adminAuth(req, res, next) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function isValidPolicy(p) {
  return (
    p &&
    Number.isFinite(p.capacity) && p.capacity > 0 &&
    Number.isFinite(p.refillRate) && p.refillRate > 0
  );
}

router.use(adminAuth);

router.get('/policies', async (req, res) => {
  res.json(await getPolicies());
});

router.put('/policies', async (req, res) => {
  const { default: def, endpoints = {}, users = {} } = req.body;

  if (!isValidPolicy(def)) {
    return res.status(400).json({ error: 'Invalid "default" policy' });
  }
  for (const [name, p] of [...Object.entries(endpoints), ...Object.entries(users)]) {
    if (!isValidPolicy(p)) {
      return res.status(400).json({ error: `Invalid policy for "${name}"` });
    }
  }

  const policies = { default: def, endpoints, users };
  await setPolicies(policies);
  res.json({ message: 'Policies updated', policies });
});

module.exports = router;