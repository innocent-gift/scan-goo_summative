require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User    = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  seed();
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});

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

async function seed() {
  try {
    console.log('\n📦 Seeding products...');
    await Product.deleteMany({});
    const inserted = await Product.insertMany(PRODUCTS);
    console.log(`   ✓ ${inserted.length} products inserted`);

    console.log('\n👤 Seeding users...');

    // Admin
    const existingAdmin = await User.findOne({ email: 'admin@scangoo.rw' });
    if (existingAdmin) {
      console.log('   ℹ️  Admin already exists — skipping');
    } else {
      await User.create({ name:'SCANGOO Admin', email:'admin@scangoo.rw', password:'Admin@1234', role:'admin', avatar:'SA', avatarColor:'#00C566' });
      console.log('   ✓ Admin created: admin@scangoo.rw / Admin@1234');
    }

    // Super Admin
    const existingSuper = await User.findOne({ email: 'innocent@scangoo.rw' });
    if (existingSuper) {
      console.log('   ℹ️  Super admin already exists — skipping');
    } else {
      await User.create({ name:'Nkurunziza Innocent', email:'innocent@scangoo.rw', password:'SuperAdmin@1234', role:'superadmin', avatar:'NI', avatarColor:'#7B5EA7' });
      console.log('   ✓ Super admin created: innocent@scangoo.rw / SuperAdmin@1234');
    }

    console.log('\n🎉 Seed complete!\n');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    mongoose.disconnect();
  }
}
