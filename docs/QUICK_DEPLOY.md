# Quick Deploy Guide - 5 Minutes to Production

The fastest ways to deploy Realtime Messenger to the internet.

## Option 1: Railway (Easiest - 2 minutes) ⭐

**Cost:** $0 (first month with $5 credit)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Done! Railway auto-deploys

**Environment variables:** Automatically set by Railway

**Your app:** `https://your-app.up.railway.app`

---

## Option 2: Render (100% Free - 3 minutes)

**Cost:** $0 forever (with cold starts)

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Configure:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - **Plan:** Free
5. Deploy!

**Your app:** `https://realtime-messenger.onrender.com`

**Note:** Free tier sleeps after 15 min inactivity (30s wake-up time)

---

## Option 3: Fly.io (Free Tier - 5 minutes)

**Cost:** $0 (3 free VMs)

```bash
# Install Fly CLI
brew install flyctl  # macOS
# or
curl -L https://fly.io/install.sh | sh  # Linux

# Login
fly auth login

# Deploy
cd /path/to/Realtime-Messenger
fly launch
# Follow prompts, choose region, deploy

# Your app is live!
fly open
```

**Your app:** `https://realtime-messenger.fly.dev`

---

## Comparison

| Platform | Cost | Speed | Always-On | Best For |
|----------|------|-------|-----------|----------|
| Railway | $5 credit/mo | ⚡⚡⚡ | ✅ Yes | Easiest setup |
| Render | $0 | ⚡⚡ | ❌ Sleeps | Free forever |
| Fly.io | $0 | ⚡⚡⚡ | ✅ Yes | Tech-savvy users |

---

## After Deployment

1. **Test WebSocket:**
   - Open your app
   - Enter room name & username
   - Try voice chat

2. **Share the link:**
   - Send URL to friends
   - They can join your room instantly

3. **Monitor:**
   - Railway: Built-in dashboard
   - Render: Logs in dashboard
   - Fly.io: `fly logs`

---

## Having Issues?

See the [full deployment guide](./DEPLOYMENT.md) for:
- Detailed setup instructions
- VPS deployment
- SSL configuration
- Troubleshooting
- Production checklist

---

**Fastest Option:** Railway → 2 clicks, done ✨
