const router = require('express').Router();

router.get('/products', (req, res) => {
  res.json([
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Phone', price: 599 },
  ]);
});

router.get('/orders', (req, res) => {
  res.json([
    { id: 101, productId: 1, status: 'shipped' },
    { id: 102, productId: 2, status: 'pending' },
  ]);
});

module.exports = router;