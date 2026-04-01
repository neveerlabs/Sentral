const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/auth');

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.post('/checkout', isAuthenticated, async (req, res) => {
  const { items, payment_method } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }
  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required' });
  }

  const pool = req.app.get('db');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let total = 0;
    for (const item of items) {
      const itemPrice = item.discount ? (item.price * (100 - item.discount) / 100) : item.price;
      total += itemPrice * item.quantity;
    }

    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, payment_method, status) VALUES (?, ?, ?, ?)',
      [req.user.id, total, payment_method, 'pending']
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      const subtotal = (item.discount ? (item.price * (100 - item.discount) / 100) : item.price) * item.quantity;
      await connection.query(
        `INSERT INTO order_items 
         (order_id, product_id, name, price, discount, quantity, subtotal, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.price, item.discount || null, item.quantity, subtotal, item.image_url]
      );
    }

    await connection.commit();
    res.json({ success: true, orderId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Checkout failed' });
  } finally {
    connection.release();
  }
});

router.put('/:id/status', isAdmin, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const allowedStatus = ['pending', 'processing', 'shipped', 'cancelled', 'delivered'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const pool = req.app.get('db');
  try {
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.get('/admin', isAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const [orders] = await pool.query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC
    `);
    const orderIds = orders.map(o => o.id);
    let items = [];
    if (orderIds.length) {
      [items] = await pool.query(`
        SELECT * FROM order_items WHERE order_id IN (?)
      `, [orderIds]);
    }
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: items.filter(item => item.order_id === order.id)
    }));
    res.json(ordersWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/my', isAuthenticated, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const [orders] = await pool.query(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC
    `, [req.user.id]);
    const orderIds = orders.map(o => o.id);
    let items = [];
    if (orderIds.length) {
      [items] = await pool.query(`
        SELECT * FROM order_items WHERE order_id IN (?)
      `, [orderIds]);
    }
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: items.filter(item => item.order_id === order.id)
    }));
    res.json(ordersWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your orders' });
  }
});

module.exports = router;