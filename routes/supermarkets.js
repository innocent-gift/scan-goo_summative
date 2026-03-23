const express = require('express');
const router = express.Router();
const Supermarket = require('../models/Supermarket');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Super admin access required.' });
};

router.get('/', protect, superAdminOnly, async (req, res) => {
  try {
    const supermarkets = await Supermarket.find().populate('adminUser','name email');
    res.json({ success: true, supermarkets });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/stats', protect, superAdminOnly, async (req, res) => {
  try {
    const total     = await Supermarket.countDocuments();
    const active    = await Supermarket.countDocuments({ status:'active' });
    const suspended = await Supermarket.countDocuments({ status:'suspended' });
    const pending   = await Supermarket.countDocuments({ status:'pending' });
    res.json({ success: true, stats: { total, active, suspended, pending } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { name, email, phone, address, city, plan } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required.' });
    const supermarket = await Supermarket.create({ name, email, phone, address, city, plan });
    res.status(201).json({ success: true, supermarket });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already exists.' });
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/status', protect, superAdminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const supermarket = await Supermarket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!supermarket) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, supermarket });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    await Supermarket.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
