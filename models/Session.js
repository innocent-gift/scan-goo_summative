const mongoose = require('mongoose');

// Embedded cart item sub-schema
const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productSnapshot: {
      // Snapshot at time of scan — price may change later
      id: String,
      name: String,
      emoji: String,
      price: Number,
      weight: Number,
      barcode: String,
      ageRestricted: Boolean,
    },
    qty: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Shopper display info (denormalized for fast admin reads)
    shopperName: { type: String, default: '' },
    shopperAvatar: { type: String, default: '' },
    shopperColor: { type: String, default: '#00C566' },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ['active', 'idle', 'paying', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },

    // Payment details (populated on completion)
    payment: {
      method: { type: String, enum: ['momo', 'airtel', 'cash', ''] , default: '' },
      methodLabel: { type: String, default: '' },
      phone: { type: String, default: '' },
      txnId: { type: String, default: '' },
      total: { type: Number, default: 0 },
      paidAt: { type: Date },
    },

    // Computed totals (updated on every cart change)
    totalPrice: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Virtual: compute totals from items array
sessionSchema.methods.recomputeTotals = function () {
  this.totalPrice = this.items.reduce(
    (s, i) => s + i.productSnapshot.price * i.qty,
    0
  );
  this.totalWeight = this.items.reduce(
    (s, i) => s + i.productSnapshot.weight * i.qty,
    0
  );
  this.totalItems = this.items.reduce((s, i) => s + i.qty, 0);
};

module.exports = mongoose.model('Session', sessionSchema);
