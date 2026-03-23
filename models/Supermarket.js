const mongoose = require('mongoose');
const supermarketSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: '' },
  address:   { type: String, default: '' },
  city:      { type: String, default: '' },
  logo:      { type: String, default: '🏪' },
  status:    { type: String, enum: ['active','suspended','pending'], default: 'pending' },
  adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  plan:      { type: String, enum: ['free','basic','premium'], default: 'free' },
}, { timestamps: true });
module.exports = mongoose.model('Supermarket', supermarketSchema);
