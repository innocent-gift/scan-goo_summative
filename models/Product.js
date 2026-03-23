const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      default: '📦',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Weight in kilograms',
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined barcodes
      trim: true,
    },
    ageRestricted: {
      type: Boolean,
      default: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      default: 'General',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast barcode lookups (scanner feature)
productSchema.index({ barcode: 1 });
productSchema.index({ id: 1 });

module.exports = mongoose.model('Product', productSchema);
