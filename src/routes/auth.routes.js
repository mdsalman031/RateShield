const router = require('express').Router();
const jwt = require('jsonwebtoken');

// Demo only: no password check. Anyone can request a token for any userId.
router.post('/token', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const token = jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  res.json({ token });
});

module.exports = router;