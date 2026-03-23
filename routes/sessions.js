const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Product = require('../models/Product');
const Alert = require('../models/Alert');
const { protect, adminOnly } = require('../middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generate a unique session ID  e.g. SESS-AB12CD
const makeSessionId = () =>
  'SESS-' + Math.random().toString(36).substr(2, 6).toUpperCase();

// Generate a unique transaction ID  e.g. TXN-A1B2C3D4
const makeTxnId = () =>
  'TXN-' + Math.random().toString(36).substr(2, 8).toUpperCase();

// Time-ago helper for alert display
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

// ─── POST /api/sessions/start ─────────────────────────────────────────────────
// Creates (or re-activates) the shopper's session when they open the app.
// Idempotent — calling multiple times returns the same active session.
router.post('/start', protect, async (req, res) => {
  try {
    const user = req.user;

    // Check if there's already an active/idle session for this user
    let session = await Session.findOne({
      userId: user._id,
      status: { $in: ['active', 'idle'] },
    });

    if (!session) {
      session = await Session.create({
        sessionId: makeSessionId(),
        userId: user._id,
        shopperName: user.name,
        shopperAvatar: user.avatar,
        shopperColor: user.avatarColor || '#00C566',
        items: [],
        status: 'active',
      });
    }

    res.status(201).json({ success: true, session });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ success: false, message: 'Could not start session.' });
  }
});

// ─── GET /api/sessions/mine ───────────────────────────────────────────────────
// Returns the current user's active session
router.get('/mine', protect, async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'idle', 'paying'] },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found.' });
    }
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch session.' });
  }
});

// ─── POST /api/sessions/:sessionId/scan ───────────────────────────────────────
// Body: { productId }  OR  { barcode }
// Adds a product to the cart. If already present, increments qty.
router.post('/:sessionId/scan', protect, async (req, res) => {
  try {
    const { productId, barcode } = req.body;

    // Fetch product by ID or barcode
    let product;
    if (productId) {
      product = await Product.findOne({ id: productId.toUpperCase(), inStock: true });
    } else if (barcode) {
      product = await Product.findOne({ barcode, inStock: true });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or out of stock.' });
    }

    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
      status: { $in: ['active', 'idle'] },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Add or increment the item
    const existing = session.items.find((i) => i.productId === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      session.items.push({
        productId: product.id,
        productSnapshot: {
          id: product.id,
          name: product.name,
          emoji: product.emoji,
          price: product.price,
          weight: product.weight,
          barcode: product.barcode,
          ageRestricted: product.ageRestricted,
        },
        qty: 1,
      });
    }

    session.status = 'active';
    session.recomputeTotals();
    await session.save();

    // ── Alerts ────────────────────────────────────────────────────────────────
    // Age-restricted item alert
    if (product.ageRestricted) {
      await Alert.create({
        icon: product.emoji,
        title: `${product.name} — Age-restricted item`,
        detail: `${req.user.name} scanned an 18+ item`,
        sessionId: session.sessionId,
        shopperName: req.user.name,
      });
    }

    // Price mismatch demo alert (Milk)
    if (product.id === 'P002') {
      await Alert.create({
        icon: product.emoji,
        title: `${product.name} — Price mismatch`,
        detail: `Shelf: 800 RWF → System: ${product.price} RWF`,
        sessionId: session.sessionId,
        shopperName: req.user.name,
      });
    }

    res.json({ success: true, session });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ success: false, message: 'Scan failed.' });
  }
});

// ─── PATCH /api/sessions/:sessionId/item ──────────────────────────────────────
// Body: { productId, delta }  delta = +1 or -1
// Adjust quantity of an item. Removes item if qty reaches 0.
router.patch('/:sessionId/item', protect, async (req, res) => {
  try {
    const { productId, delta } = req.body;

    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
      status: { $in: ['active', 'idle'] },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const idx = session.items.findIndex((i) => i.productId === productId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Item not in cart.' });
    }

    session.items[idx].qty += delta;
    if (session.items[idx].qty <= 0) {
      session.items.splice(idx, 1);
    }

    session.status = session.items.length > 0 ? 'active' : 'idle';
    session.recomputeTotals();
    await session.save();

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update item.' });
  }
});

// ─── DELETE /api/sessions/:sessionId/cart ─────────────────────────────────────
// Clears all items from the cart
router.delete('/:sessionId/cart', protect, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    session.items = [];
    session.status = 'idle';
    session.recomputeTotals();
    await session.save();

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
});

// ─── POST /api/sessions/:sessionId/checkout ───────────────────────────────────
// Body: { method, phone }  method = 'momo' | 'airtel' | 'cash'
// Marks the session as paying, returns a txnId for the receipt.
router.post('/:sessionId/checkout', protect, async (req, res) => {
  try {
    const { method, phone } = req.body;
    const methodLabels = { momo: 'MTN MoMo', airtel: 'Airtel Money', cash: 'Cash' };

    if (!['momo', 'airtel', 'cash'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
      status: { $in: ['active', 'idle'] },
    });

    if (!session || session.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot checkout an empty cart.' });
    }

    const total = session.items.reduce(
      (s, i) => s + i.productSnapshot.price * i.qty,
      0
    );
    const txnId = makeTxnId();

    session.status = 'paying';
    session.payment = {
      method,
      methodLabel: methodLabels[method] || method,
      phone: phone || '',
      txnId,
      total,
    };
    await session.save();

    // Simulate async payment confirmation (in production: webhook from MoMo API)
    // We return immediately so the frontend can show its processing screen.
    res.json({
      success: true,
      txnId,
      total,
      methodLabel: methodLabels[method],
      message: 'Payment initiated. Call /confirm to complete.',
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, message: 'Checkout failed.' });
  }
});

// ─── POST /api/sessions/:sessionId/confirm ────────────────────────────────────
// Called after the payment processing delay (simulates payment gateway callback)
router.post('/:sessionId/confirm', protect, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
      status: 'paying',
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or not in paying state.' });
    }

    session.status = 'completed';
    session.payment.paidAt = new Date();
    session.completedAt = new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Payment confirmed.',
      session,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Confirmation failed.' });
  }
});

// ─── GET /api/sessions/:sessionId/receipt ─────────────────────────────────────
// Returns receipt data for a completed session
router.get('/:sessionId/receipt', protect, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
      status: 'completed',
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch receipt.' });
  }
});

// ─── GET /api/sessions/history ────────────────────────────────────────────────
// Returns the current user's completed sessions (home screen history)
router.get('/history', protect, async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      status: 'completed',
    })
      .sort({ completedAt: -1 })
      .limit(10);

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET /api/sessions/admin/live ────────────────────────────────────────────
// Returns all active/idle/paying sessions for the admin dashboard
router.get('/admin/live', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await Session.find({
      status: { $in: ['active', 'idle', 'paying'] },
    }).sort({ startedAt: -1 });

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch live sessions.' });
  }
});

// ─── GET /api/sessions/admin/completed ───────────────────────────────────────
// Returns today's completed sessions + totals
router.get('/admin/completed', protect, adminOnly, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      status: 'completed',
      completedAt: { $gte: startOfDay },
    }).sort({ completedAt: -1 });

    const totalRevenue = sessions.reduce((s, sess) => s + (sess.payment.total || 0), 0);

    res.json({ success: true, sessions, totalRevenue });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch completed sessions.' });
  }
});

// ─── GET /api/sessions/admin/kpis ────────────────────────────────────────────
// Returns dashboard KPI numbers in one call
router.get('/admin/kpis', protect, adminOnly, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [liveSessions, todayCompleted] = await Promise.all([
      Session.find({ status: { $in: ['active', 'idle', 'paying'] } }),
      Session.find({ status: 'completed', completedAt: { $gte: startOfDay } }),
    ]);

    const activeCount = liveSessions.filter(
      (s) => s.status === 'active' || s.status === 'paying'
    ).length;
    const totalItemsInCarts = liveSessions.reduce((s, sess) => s + sess.totalItems, 0);
    const liveValue = liveSessions.reduce((s, sess) => s + sess.totalPrice, 0);
    const todayRevenue = todayCompleted.reduce((s, sess) => s + (sess.payment.total || 0), 0);

    res.json({
      success: true,
      kpis: {
        activeShoppers: activeCount,
        totalItemsInCarts,
        liveValue,
        todayRevenue,
        completedToday: todayCompleted.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch KPIs.' });
  }
});

// ─── GET /api/sessions/admin/inventory ───────────────────────────────────────
// Returns aggregated product sales data for the Inventory panel
router.get('/admin/inventory', protect, adminOnly, async (req, res) => {
  try {
    // Aggregate across all sessions (active + completed today)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      $or: [
        { status: { $in: ['active', 'idle', 'paying'] } },
        { status: 'completed', completedAt: { $gte: startOfDay } },
      ],
    });

    const tally = {};
    sessions.forEach((sess) => {
      sess.items.forEach((item) => {
        const pid = item.productId;
        if (!tally[pid]) {
          tally[pid] = {
            product: item.productSnapshot,
            qty: 0,
            revenue: 0,
          };
        }
        tally[pid].qty += item.qty;
        tally[pid].revenue += item.productSnapshot.price * item.qty;
      });
    });

    const sorted = Object.values(tally).sort((a, b) => b.qty - a.qty);
    res.json({ success: true, inventory: sorted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory data.' });
  }
});

module.exports = router;
