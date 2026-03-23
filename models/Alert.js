const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    icon: { type: String, default: '⚠️' },
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    sessionId: { type: String, default: '' },
    shopperName: { type: String, default: '' },
    resolved: { type: Boolean, default: false },
  },
  {
    timestamps: true, // createdAt gives us the time for "2m ago" display
  }
);

// Keep only recent alerts — TTL index auto-deletes after 24h
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Alert', alertSchema);
