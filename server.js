/**
 * SCANGOO Backend — server.js
 * ─────────────────────────────────────────────────────────────────
 * Stack : Node.js + Express + MongoDB (Mongoose)
 * Auth  : JWT (Bearer token)
 * Host  : Render.com (free tier)  |  DB: MongoDB Atlas (free tier)
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const connectDB = require('./config/db');

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow requests from your frontend (Netlify URL, GitHub Pages, or localhost)
const allowedOrigins = [
  process.env.CLIENT_URL,          // e.g. https://scangoo.netlify.app
  'http://localhost:3000',
  'http://127.0.0.1:5500',         // VS Code Live Server default
  'http://localhost:5500',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health-check (Render pings this to keep the service alive) ────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'SCANGOO API',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/alerts',   require('./routes/alerts'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 SCANGOO API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}\n`);
});
