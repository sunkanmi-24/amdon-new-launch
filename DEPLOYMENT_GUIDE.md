# AMDON Portal — Deployment Guide

## What Was Fixed

| # | File | Bug | Fix Applied |
|---|------|-----|-------------|
| 1 | `routes/auth.js` | `forgot-password`: `safeResponse` declared outside `try` block (syntax error) + sent as `{safeResponse}` (double-wrapped JSON) | Moved inside handler, unwrapped to `res.json(safeResponse)` |
| 2 | `routes/auth.js` | `verify-email`: `markCodeUsed()` never called — OTP codes could be reused indefinitely | Added `await markCodeUsed(record.id)` after successful update |
| 3 | `routes/auth.js` | `resend-verification`: Validation errors silently ignored — invalid emails still processed | Added `validationResult` guard at top of handler |
| 4 | `routes/admin.js` | `generateMemberId` required inline inside route handler on every call | Moved to top-level import |
| 5 | `pages/AdminLoginPage.tsx` | Only checked for HTTP 403 — a 404 or 500 from server would pass as successful login | Added `!res.ok` guard to catch all non-success responses |
| 6 | `amdon-backened/.env.example` | Missing `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` — email service would silently fail | Added all 4 email env vars to example |
| 7 | **Supabase** | `yearly_dues`, `registration_payments`, `member_reports` tables not created | Run `supabase_migration_v2.sql` (step 2 below) |

---

## Prerequisites

- Node.js 18+
- A [Vercel](https://vercel.com) account (free tier works)
- A [Supabase](https://supabase.com) project (free tier works)
- An SMTP email provider (Gmail App Password, Brevo, Resend, etc.)

---

## Step 1 — Set Up Supabase

### 1a. Get your credentials

In your Supabase project dashboard:
- Go to **Settings → API**
- Copy **Project URL** → this is your `SUPABASE_URL`
- Copy **service_role secret** → this is your `SUPABASE_SERVICE_ROLE_KEY`
  ⚠️ Never expose the service role key in frontend code

### 1b. Run the migration

1. Go to **Supabase → SQL Editor**
2. Click **New query**
3. Open `supabase_migration_v2.sql` from this project folder
4. Paste the entire contents into the SQL editor
5. Click **Run**
6. You should see output confirming the 3 tables exist (`registration_payments`, `yearly_dues`, `member_reports`)

> If you get an error about `update_updated_at_column()` not existing, your base schema hasn't been applied yet. Run your original base migration first, then re-run `supabase_migration_v2.sql`.

---

## Step 2 — Deploy the Backend

### 2a. Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### 2b. Set up environment variables

Navigate to the backend folder:
```bash
cd amdon-backened
```

Copy the example and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_SECRET=choose_a_long_random_secret_here
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16_char_app_password
```

> **Gmail tip:** Go to Google Account → Security → 2-Step Verification → App passwords → generate one for "Mail"

### 2c. Deploy to Vercel

```bash
vercel --prod
```

On first run, Vercel will ask:
- **Set up and deploy?** → Yes
- **Which scope?** → your account
- **Link to existing project?** → No (create new)
- **Project name?** → `amdon-backened` (or anything you like)
- **Directory?** → `./` (current directory)
- **Override settings?** → No

After deployment, Vercel gives you a URL like:
```
https://amdon-backened-xxxx.vercel.app
```

### 2d. Add env vars in Vercel dashboard

Vercel doesn't read your local `.env` in production. Add them manually:

1. Go to [vercel.com](https://vercel.com) → your backend project → **Settings → Environment Variables**
2. Add each variable from your `.env` file
3. Set environment to **Production** (and Preview if needed)
4. **Redeploy** after adding variables:
   ```bash
   vercel --prod
   ```

### 2e. Test the backend

```bash
curl https://amdon-backened-xxxx.vercel.app/api/health
```

Should return:
```json
{"status":"ok","service":"AMDON Registration Portal API","timestamp":"..."}
```

---

## Step 3 — Deploy the Frontend

### 3a. Set your API URL

In the project root (next to `package.json`), create a `.env` file:
```bash
# In the amdon_fixed root folder (not amdon-backened)
echo "VITE_API_URL=https://amdon-backened-xxxx.vercel.app/api" > .env
```

Replace `amdon-backened-xxxx` with your actual backend Vercel URL from Step 2c.

### 3b. Install dependencies

```bash
npm install
```

### 3c. Deploy to Vercel

```bash
vercel --prod
```

Same prompts as before — create a new project for the frontend.

After deployment you get:
```
https://amdon-frontend-xxxx.vercel.app
```

### 3d. Update backend FRONTEND_URL

Go back to your **backend** project on Vercel → Settings → Environment Variables:
- Update `FRONTEND_URL` to your actual frontend URL
- Redeploy backend: `vercel --prod` (from `amdon-backened/`)

---

## Step 4 — Create Your First Admin Account

Once both are deployed, create an admin account via the API:

```bash
curl -X POST https://amdon-backened-xxxx.vercel.app/api/auth/admin/create \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"email":"admin@yourdomain.com","password":"YourStrongPassword123!"}'
```

Expected response:
```json
{"success":true,"message":"Admin account created"}
```

Then log in at:
```
https://your-frontend.vercel.app/admin/login
```

---

## Step 5 — Verify Everything Works

Visit these URLs in order:

| URL | Expected |
|-----|----------|
| `/` | Landing page loads |
| `/register` | Registration form works |
| `/login` | Member login works |
| `/admin/login` | Admin login with secret works |
| `/admin` → Dashboard | Stats load (no 404 errors in console) |
| `/admin` → Yearly Dues | Table loads (this was the original bug) |
| `/admin` → Reg. Payments | Payments table loads |

Open browser **DevTools → Console** and **DevTools → Network** while navigating — there should be no red 4xx/5xx errors.

---

## Troubleshooting

### "Route GET /api/admin/payments/yearly-dues not found"
→ Backend wasn't redeployed after code changes. Run `vercel --prod` from `amdon-backened/`.

### "Failed to fetch yearly dues" (500 error)
→ `supabase_migration_v2.sql` hasn't been run. Go to Supabase SQL Editor and run it.

### "Admin access denied" (403 on admin routes)
→ `ADMIN_SECRET` env var on Vercel doesn't match what you're entering in the login form. Check Vercel → Settings → Environment Variables.

### Emails not sending
→ Check `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` are all set in Vercel env vars. For Gmail, use an App Password (not your regular password).

### CORS errors in browser console
→ Make sure `FRONTEND_URL` in your backend Vercel env exactly matches your frontend URL (including `https://`, no trailing slash).

### "Invalid or expired token" on member dashboard
→ The Supabase access token has expired. The frontend should call `/api/auth/login` again to get a fresh token.
