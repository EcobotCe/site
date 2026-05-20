# 🚨 INSTRUCTIONS - Delete & Recreate Railway Deployment

## The Problem:
- Express.js is NOT running on Railway
- /health returns "OK" (static response) instead of JSON
- /subscribe returns 404 (endpoint doesn't exist)
- Multiple deployment attempts failed

## Solution: Complete Reset

### STEP 1: Go to Railway Dashboard
1. Open: https://railway.app/dashboard
2. Look for your "site" or "web" project

### STEP 2: Delete the Broken Deployment
1. Click on the "web" service (the one that's broken)
2. Look for ⚙️ **Settings** (gear icon, bottom left or top right)
3. Scroll ALL the way down
4. Click the RED button: **"Delete Service"** or **"Remove from project"**
5. Confirm when asked

### STEP 3: Delete Database Connection (if you want fresh start)
Optional - Only if database is having issues:
1. In the project, find "postgres" or "database" service
2. Click Settings
3. Delete it (can recreate if needed)

### STEP 4: Reconnect GitHub & Redeploy
1. Back at main project page
2. Click **"+ New"** button (or **"Create"**)
3. Select **"GitHub Repo"**
4. Search for: **EcobotCe/site**
5. Click to connect
6. Railway will automatically build & deploy (~5-10 minutes)

### STEP 5: Add Environment Variables
After deployment starts, add these variables:

**Variable Name → Value**
```
DATABASE_URL → postgres://postgres:wmAlrWAIJVwlEQcmERVdDcKwKiOfHoFp@postgres.railway.internal:5432/railway
EMAIL_USER → pjt.ecobot@gmail.com
EMAIL_PASS → eomc rfio evjt kllq
TAGO_TOKEN_1 → b8880259-b7b8-4317-add7-f8499b2b331c
TAGO_TOKEN_2 → 2fcbccc4-3614-43a6-81c9-270f56c3c109
CORS_ORIGINS → https://web-production-7eff7up.railway.app
NODE_ENV → production
PORT → (leave empty - Railway sets automatically)
```

### STEP 6: Wait for Deployment
Watch the "Deployments" section - should show:
- ✅ Build: Success
- ✅ Deploy: Success
- 🟢 Status: "Running"

### STEP 7: Test the Application

**Test 1 - Health Check:**
```
Open in browser: https://web-production-7eff7up.railway.app/health
Should return JSON:
{
  "status": "ok",
  "timestamp": "2026-05-20T21:48:45.434Z",
  "database": "connected",
  "server": "Express.js 4.18.2 - NOVO",
  "ambiente": "production"
}
```

**Test 2 - Email Subscription:**
```
Open: https://web-production-7eff7up.railway.app/
Fill in your email
Click Subscribe
Should see: "Inscrito com sucesso!"
```

### STEP 8: Verify Email in Database
1. In Railway dashboard, click the postgres service
2. Click the database icon 📊
3. Look for "subscribers" table
4. Your email should be there!

---

## ⚡ Quick Links:
- Dashboard: https://railway.app/dashboard
- Your Project: https://railway.app/project/8d8f28d5-f51e-4c92-8f7c-abc123456789
- Repo: https://github.com/EcobotCe/site

---

## If it STILL doesn't work:
Let me know and I'll investigate the Railway logs directly.

**Start with STEP 1 now!**
