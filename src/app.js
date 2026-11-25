const express = require('express');
const redis = require('./config/redis');
const apiRoutes = require('./routes/api.routes');
const authRoutes = require('./routes/auth.routes');
const authenticate = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const pong = await redis.ping();
    res.json({ status: 'ok', redis: pong });
  } catch {
    res.status(503).json({ status: 'degraded', redis: 'down' });
  }
});

app.use('/api', authenticate, rateLimiter, apiRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// 404 + error handlers
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;