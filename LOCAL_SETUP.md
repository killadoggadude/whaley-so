# 🚀 Local Development Setup

## Two Simple Steps to Run Your App

### Step 1: Start the Web Server
Open **Terminal 1** and run:
```bash
cd "/Users/tobiasfendt/Desktop/AI OFM/claude/AI OFM TOOL/web"
npm install
npm run dev
```

Keep this terminal open!

---

### Step 2: Start the Queue Processor
Open a **second terminal** and run:
```bash
cd "/Users/tobiasfendt/Desktop/AI OFM/claude/AI OFM TOOL"
node dev-cron.js
```

This runs the queue processor every 10 seconds (for testing).

---

## Open Your Browser

Visit: http://localhost:3000

---

## What This Does

**Terminal 1:** Runs your Next.js web application (the UI, pages, etc.)

**Terminal 2:** Processes queued jobs (video generation, retries, etc.) automatically

---

## Stopping Everything

When you're done, press `Ctrl+C` in **both** terminals.

---

## Testing the Cost Estimator

1. Sign up / login to your app
2. Go to **Dashboard** → **Tools** → **Talking Head**
3. Complete the steps:
   - Step 4 (Voice): See TTS cost based on character count
   - Step 6 (Generate): See video cost based on duration × resolution

You should see green dollar signs showing estimated costs!

---

## Troubleshooting

**"Port 3000 is already in use"**
```bash
# Kill anything using port 3000
lsof -ti:3000 | xargs kill -9
```

**"Module not found" errors**
```bash
cd web && npm install
```

**Queue not processing**
Both terminals must be open:
- Terminal 1: `npm run dev`
- Terminal 2: `node dev-cron.js`

---

## Later: Deploying to Vercel (When You're Ready)

1. Install Vercel: `npm install -g vercel`
2. Deploy: `cd web && vercel` (follow prompts)
3. Add CRON_SECRET in Vercel Dashboard Settings

The cron job (`vercel.json.example`) will work automatically!

---

**That's it!** Everything is set up and ready to run locally. 🎉