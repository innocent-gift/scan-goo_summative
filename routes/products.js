const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET /api/products ────────────────────────────────────────────────────────
// Returns all in-stock products (used to populate scanner demo grid)
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ inStock: true }).sort({ id: 1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// ─── GET /api/products/barcode/:barcode ───────────────────────────────────────
// Lookup a product by barcode (called when real scanner reads a barcode)
router.get('/barcode/:barcode', protect, async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode, inStock: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this barcode.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Barcode lookup failed.' });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id.toUpperCase() });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

// ─── POST /api/products  (admin only) ────────────────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Product ID or barcode already exists.' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/products/:id  (admin only) ─────────────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: req.params.id.toUpperCase() },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
