# Hosting Recommendations

## Best Options for Next.js Apps

### 1️⃣ Vercel (Recommended - Easiest) ⭐⭐⭐⭐⭐

**Pros:**
- Zero-config deployment (works perfectly with Next.js)
- Built-in cron jobs (free tier available)
- Great for local development push-to-deploy workflow
- Free SSL certificate
- Fast edge network

**Cost:** Free for personal use, then ~$20/month for production

**Setup for later:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd web && vercel
```

The cron job I created (`vercel.json`) will work automatically!

---

### 2️⃣ Railway (Great Alternative) ⭐⭐⭐⭐

**Pros:**
- Easy setup like Vercel
- Supports multiple services (db + frontend)
- Good documentation

**Cost:** Free tier available, ~$5/month

**Setup:**
- Install Railway CLI: `npm i -g railway`
- Run: `railway login` and `railway init`
- Cron jobs need manual setup via commands

---

### 3️⃣ Render (Similar to Railway) ⭐⭐⭐⭐

**Pros:**
- Free tier available
- Good for small apps

**Cost:** Free tier with limited uptime

---

### 4️⃣ Self-Hosted (e.g., AWS, DigitalOcean, VPS)

**Pros:**
- Full control
- Cheaper at scale
- No platform lock-in

**Cons:** More complex - requires Linux knowledge
- Setup server
- Configure Nginx
- Set up SSL certificates
- Manual cron setup via `crontab`

---

## My Recommendation: Start with Vercel

**Why:**
1. **Easiest to deploy** - Just run `npm run build` + `vercel`
2. **Zero cron setup** - The `vercel.json` file I created handles it
3. **Good free tier** for testing
4. **Best Next.js support** (since Vercel created Next.js!)

---

## For Now: Local Development

Your app works 100% locally with these tools:

1. **Start development server:**
   ```bash
   cd web && npm run dev
   ```

2. **Run local queue processor:**
   ```bash
   node dev-cron.js
   ```
   (Keeps processing jobs every 10 seconds - great for testing!)

3. **Test the app:**
   - Open http://localhost:3000
   - Sign up/login
   - Go to Dashboard → Tools → Talking Head
   - See cost estimation working!

---

## When You're Ready to Deploy

### Quick Start with Vercel (5 minutes):

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd web
   vercel
   ```
   Follow prompts, done!

3. **Add CRON_SECRET to Vercel:**
   - Go to app.vercel.com → Your Project → Settings → Environment Variables
   - Add `CRON_SECRET` with value: `41d62ef11a12e5eb4e8b7b38c9ec0de5de66e2d5f992a2baa5dc7480c7a6ee75`

4. **Done!** The cron job I made runs automatically every 2 minutes.

---

## Files I Created for You

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel cron config (works automatically when deployed) |
| `.github/workflows/queue-processor.yml` | GitHub Actions cron (alternative option) |
| `dev-cron.js` | Local cron runner for testing (run with: `node dev-cron.js`) |
| `web/package.json` | Already has everything needed |

---

Want me to test the local queue processor now to make sure everything works?