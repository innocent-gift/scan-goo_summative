/**
 * seed.js — Run once to populate the database with initial data
 *
 * Usage:
 *   node seed.js
 *
 * This will:
 *  1. Clear all existing products
 *  2. Insert the 8 default SCANGOO products
 *  3. Create a default admin account (if it doesn't exist)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Connect ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  seed();
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});

// ── Models (inline to keep seed.js standalone) ────────────────────────────────
const Product = require('./models/Product');
const User    = require('./models/User');

// ── Seed data ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id:'P001', name:'Indomie Noodles',     emoji:'🍜', price:350,  weight:0.075, barcode:'6001254001234', ageRestricted:false, category:'Food'      },
  { id:'P002', name:'Milk 1L',             emoji:'🥛', price:800,  weight:1.0,   barcode:'6001254002345', ageRestricted:false, category:'Dairy'     },
  { id:'P003', name:'Mineral Water 500ml', emoji:'💧', price:300,  weight:0.5,   barcode:'6001254003456', ageRestricted:false, category:'Beverages' },
  { id:'P004', name:'Primus Beer 500ml',   emoji:'🍺', price:1200, weight:0.5,   barcode:'6001254004567', ageRestricted:true,  category:'Beverages' },
  { id:'P005', name:'Bread (White Loaf)',  emoji:'🍞', price:1000, weight:0.4,   barcode:'6001254005678', ageRestricted:false, category:'Bakery'    },
  { id:'P006', name:'Cooking Oil 500ml',   emoji:'🫙', price:2500, weight:0.5,   barcode:'6001254006789', ageRestricted:false, category:'Pantry'    },
  { id:'P007', name:'Sugar 1kg',           emoji:'🧂', price:900,  weight:1.0,   barcode:'6001254007890', ageRestricted:false, category:'Pantry'    },
  { id:'P008', name:'Eggs (Tray 12)',      emoji:'🥚', price:2400, weight:0.7,   barcode:'6001254008901', ageRestricted:false, category:'Dairy'     },
];

const ADMIN = {
  name: 'SCANGOO Admin',
  email: 'admin@scangoo.rw',
  password: 'Admin@1234',   // ← Change this after first login!
  role: 'admin',
  avatar: 'SA',
  avatarColor: '#00C566',
};

async function seed() {
  try {
    // ── Products ─────────────────────────────────────────────────────────────
    console.log('\n📦 Seeding products...');
    await Product.deleteMany({});
    const inserted = await Product.insertMany(PRODUCTS);
    console.log(`   ✓ ${inserted.length} products inserted`);

    // ── Admin user ───────────────────────────────────────────────────────────
    console.log('\n👤 Seeding admin user...');
    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log('   ℹ️  Admin already exists — skipping');
    } else {
      await User.create(ADMIN);
      console.log(`   ✓ Admin created: ${ADMIN.email} / ${ADMIN.password}`);
      console.log('   ⚠️  IMPORTANT: Change the admin password after first login!');
    }

    console.log('\n🎉 Seed complete!\n');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    mongoose.disconnect();
  }
}
