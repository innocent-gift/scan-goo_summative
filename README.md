# SCANGOO — Full Stack Deployment Guide

## Architecture Overview

```
Frontend (HTML)          Backend (Node/Express)      Database
─────────────────        ──────────────────────      ──────────────
Netlify / GitHub Pages → Render.com (free)       →  MongoDB Atlas (free)
```

All three platforms have **free tiers** that are sufficient for SCANGOO.

---

## Step 1 — Set Up MongoDB Atlas (Free Database)

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Click **"Build a Database"** → choose **M0 (Free)**
3. Choose a cloud provider (any) and region close to Rwanda (e.g. Europe West)
4. Set a **username** and **password** — save these
5. In **Network Access**, click **"Add IP Address"** → choose **"Allow Access from Anywhere"** (`0.0.0.0/0`)
   - This is required for Render to connect
6. In **Database**, click **"Connect"** → **"Drivers"** → copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with your actual password
   - Add the database name: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/scangoo`

---

## Step 2 — Deploy the Backend to Render

1. Push the `scangoo-backend/` folder to a **GitHub repository**
   ```bash
   cd scangoo-backend
   git init
   git add .
   git commit -m "Initial backend"
   git remote add origin https://github.com/YOUR_USERNAME/scangoo-backend.git
   git push -u origin main
   ```

2. Go to [https://render.com](https://render.com) and create a free account

3. Click **"New"** → **"Web Service"** → Connect your GitHub repo

4. Configure the service:
   - **Name**: `scangoo-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. Add **Environment Variables** (click "Environment"):
   ```
   MONGO_URI     = mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/scangoo
   JWT_SECRET    = paste_a_long_random_string_here
   JWT_EXPIRES_IN = 7d
   CLIENT_URL    = https://your-frontend.netlify.app
   NODE_ENV      = production
   ```

6. Click **"Create Web Service"** — Render will build and deploy automatically

7. Your API URL will be: `https://scangoo-api.onrender.com`
   - Test it: open that URL in the browser — you should see `{"service":"SCANGOO API","status":"online"}`

> ⚠️ **Note**: Render's free tier sleeps after 15 minutes of inactivity. The first request after sleeping takes ~30 seconds. This is fine for demos. Consider a free cron service like cron-job.org to ping `/health` every 10 minutes if you want it always awake.

---

## Step 3 — Seed the Database

After the backend is running on Render, seed it once with the default products and admin account.

**Option A — Run locally** (fastest):
```bash
cd scangoo-backend
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET in .env
npm install
node seed.js
```

**Option B — Run on Render**:
In the Render dashboard → your service → "Shell" tab → run:
```bash
node seed.js
```

The seed script creates:
- ✅ 8 default products (Indomie, Milk, Water, Beer, Bread, Oil, Sugar, Eggs)
- ✅ Admin account: `admin@scangoo.rw` / `Admin@1234`

> ⚠️ **Change the admin password** after your first login!

---

## Step 4 — Update Frontend Config

Open `SCANGOO_App_v2_backend.html` and update line 4 of the script:

```javascript
const API_BASE = 'https://scangoo-api.onrender.com'; // ← Your Render URL
```

---

## Step 5 — Deploy Frontend to Netlify

**Option A — Drag & Drop (simplest)**:
1. Go to [https://netlify.com](https://netlify.com)
2. Drag your `SCANGOO_App_v2_backend.html` file onto the Netlify deploy box
3. Done! You get a URL like `https://scangoo-abc123.netlify.app`

**Option B — GitHub (recommended for updates)**:
1. Put the HTML file in a GitHub repo
2. Connect the repo to Netlify → it auto-deploys on every push

**Option C — GitHub Pages (also free)**:
1. Put the HTML in a repo, rename it to `index.html`
2. Go to repo Settings → Pages → Source: main branch
3. Your site is at `https://YOUR_USERNAME.github.io/REPO_NAME`

---

## Step 6 — Update CORS

Go back to Render → Environment Variables and update:
```
CLIENT_URL = https://your-actual-netlify-url.netlify.app
```

Redeploy the backend (or it auto-redeploys on save).

---

## API Reference

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{name, email, phone, password}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Login |
| GET | `/api/auth/me` | — | Current user |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | All products |
| GET | `/api/products/barcode/:barcode` | Lookup by barcode |

### Sessions (Shopping Cart)
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/sessions/start` | — | Start/resume session |
| GET | `/api/sessions/mine` | — | Get active session |
| POST | `/api/sessions/:id/scan` | `{productId}` | Add item to cart |
| PATCH | `/api/sessions/:id/item` | `{productId, delta}` | Change qty (+1/-1) |
| DELETE | `/api/sessions/:id/cart` | — | Clear cart |
| POST | `/api/sessions/:id/checkout` | `{method, phone}` | Initiate payment |
| POST | `/api/sessions/:id/confirm` | — | Confirm payment |
| GET | `/api/sessions/:id/receipt` | — | Get receipt |
| GET | `/api/sessions/history` | — | Purchase history |

### Admin (admin role required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/admin/live` | All active sessions |
| GET | `/api/sessions/admin/completed` | Today's completed sessions |
| GET | `/api/sessions/admin/kpis` | Dashboard KPI numbers |
| GET | `/api/sessions/admin/inventory` | Product sales data |
| GET | `/api/alerts` | Latest alerts |
| PATCH | `/api/alerts/:id/resolve` | Dismiss alert |

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@scangoo.rw` | `Admin@1234` |
| Shopper | Register a new account | — |

---

## Project Structure

```
scangoo-backend/
├── server.js          ← Entry point
├── seed.js            ← Database seeder (run once)
├── package.json
├── .env.example       ← Copy to .env and fill in values
├── .gitignore
├── config/
│   └── db.js          ← MongoDB connection
├── middleware/
│   └── auth.js        ← JWT protect + adminOnly guards
├── models/
│   ├── User.js        ← Shoppers and admins
│   ├── Product.js     ← Store inventory
│   ├── Session.js     ← Shopping sessions + cart
│   └── Alert.js       ← Admin alerts (auto-expire after 24h)
└── routes/
    ├── auth.js        ← /api/auth/*
    ├── products.js    ← /api/products/*
    ├── sessions.js    ← /api/sessions/*
    └── alerts.js      ← /api/alerts/*

SCANGOO_App_v2_backend.html  ← Frontend (no changes to HTML/CSS)
```

---

## Free Tier Limits (what to know)

| Platform | Limit | Notes |
|----------|-------|-------|
| MongoDB Atlas M0 | 512 MB storage | More than enough for thousands of sessions |
| Render Free | 750 hrs/month, sleeps after 15min | Fine for demos; use cron-job.org to keep awake |
| Netlify Free | 100 GB bandwidth, 300 build mins | Generous for a single-page app |
| GitHub Pages | Unlimited static hosting | No build minutes needed for plain HTML |
