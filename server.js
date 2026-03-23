require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const connectDB = require('./config/db');

connectDB();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ service: 'SCANGOO API', status: 'online', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/alerts',   require('./routes/alerts'));

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 SCANGOO API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}\n`);
});
