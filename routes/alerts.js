const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET /api/alerts ─────────────────────────────────────────────────────────
// Returns the latest 20 alerts for the admin dashboard
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const alerts = await Alert.find({ resolved: false })
      .sort({ createdAt: -1 })
      .limit(20);

    // Add "time ago" label for the frontend
    const alertsWithTime = alerts.map((a) => ({
      _id: a._id,
      icon: a.icon,
      title: a.title,
      detail: a.detail,
      sessionId: a.sessionId,
      shopperName: a.shopperName,
      time: timeAgo(a.createdAt),
    }));

    res.json({ success: true, alerts: alertsWithTime });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch alerts.' });
  }
});

// ─── PATCH /api/alerts/:id/resolve ───────────────────────────────────────────
// Mark an alert as resolved (removes it from the dashboard)
router.patch('/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.json({ success: true, message: 'Alert resolved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert.' });
  }
});

// Helper used by this file
function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

module.exports = router;
