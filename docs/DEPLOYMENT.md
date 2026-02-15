# Deployment Guide - Realtime Messenger

This guide covers deploying the Realtime Messenger application to various hosting platforms, with a focus on free and low-cost options.

## Table of Contents

- [Architecture Requirements](#architecture-requirements)
- [Deployment Options](#deployment-options)
  - [1. Railway (Recommended - Free Tier)](#1-railway-recommended---free-tier)
  - [2. Render (Free Tier)](#2-render-free-tier)
  - [3. Fly.io (Free Tier)](#3-flyio-free-tier)
  - [4. Vercel (Free - Frontend Only)](#4-vercel-free---frontend-only)
  - [5. Self-Hosting (VPS)](#5-self-hosting-vps)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Cost Comparison](#cost-comparison)
- [Troubleshooting](#troubleshooting)

---

## Architecture Requirements

The Realtime Messenger app requires:

- **Node.js** runtime (v18+)
- **WebSocket** support (persistent connections)
- **HTTP/HTTPS** server
- **PostgreSQL** database (optional - currently unused but available for future features)
- **SSL/TLS** for production (required for microphone access in browsers)

---

## Deployment Options

### 1. Railway (Recommended - Free Tier)

Railway offers a generous free tier ($5 credit/month) perfect for this application.

#### Cost: **$0-5/month**
- Free: $5 credit/month (hobby projects)
- Paid: $5/month after credit used

#### Pros:
- Simple deployment from GitHub
- Automatic HTTPS
- WebSocket support
- PostgreSQL included
- Great for hobby projects

#### Cons:
- Limited free tier
- Credit-based billing

#### Deployment Steps:

1. **Create Account**
   ```
   Visit: https://railway.app
   Sign up with GitHub
   ```

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select `Realtime-Messenger` repo

3. **Configure Build Settings**

   Railway auto-detects Node.js. Add these settings:

   **Build Command:**
   ```bash
   npm install && npm run build
   ```

   **Start Command:**
   ```bash
   npm start
   ```

4. **Add Environment Variables**

   In Railway Dashboard → Variables:
   ```env
   NODE_ENV=production
   PORT=5000
   ```

5. **Generate Domain**
   - Go to Settings → Domains
   - Click "Generate Domain"
   - Railway provides: `your-app.up.railway.app`

6. **Deploy**
   - Railway automatically deploys on git push
   - Monitor logs in Dashboard

#### Adding PostgreSQL (Optional):

```bash
# In Railway Dashboard:
1. Click "New" → "Database" → "PostgreSQL"
2. Railway auto-creates DATABASE_URL
3. No manual configuration needed
```

---

### 2. Render (Free Tier)

Render offers a completely free tier (with limitations).

#### Cost: **$0/month (Free)**
- Free tier available indefinitely
- Paid: $7/month for always-on service

#### Pros:
- True free tier (no credit card required)
- Automatic HTTPS
- Good for hobby projects
- PostgreSQL free tier

#### Cons:
- Free tier spins down after 15 min inactivity
- Cold start can take 30-60 seconds
- Limited to 750 hours/month on free tier

#### Deployment Steps:

1. **Create Account**
   ```
   Visit: https://render.com
   Sign up with GitHub
   ```

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select `Realtime-Messenger`

3. **Configure Service**

   **Name:** `realtime-messenger`

   **Environment:** `Node`

   **Build Command:**
   ```bash
   npm install && npm run build
   ```

   **Start Command:**
   ```bash
   npm start
   ```

   **Plan:** Free

4. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=5000
   ```

5. **Create render.yaml (Optional)**

   Create `render.yaml` in project root for easier deployment:

   ```yaml
   services:
     - type: web
       name: realtime-messenger
       env: node
       plan: free
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 5000
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Render provides: `https://realtime-messenger.onrender.com`

#### Important Note:
Free tier sleeps after 15 min. First request after sleep takes ~30s to wake up.

---

### 3. Fly.io (Free Tier)

Fly.io provides free tier with good performance for hobby projects.

#### Cost: **$0-5/month**
- Free: 3 shared-cpu VMs, 3GB storage
- Paid: ~$2/month for better performance

#### Pros:
- Generous free tier
- Global edge network
- Good WebSocket support
- Fast deployment
- PostgreSQL available

#### Cons:
- Requires credit card (even for free tier)
- CLI-based deployment (not GUI)

#### Deployment Steps:

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Initialize App**
   ```bash
   cd /path/to/Realtime-Messenger
   fly launch
   ```

   Answer prompts:
   - App name: `realtime-messenger` (or your choice)
   - Region: Choose closest to users
   - PostgreSQL: No (unless needed)
   - Deploy now: No (configure first)

4. **Configure fly.toml**

   Fly generates `fly.toml`. Update it:

   ```toml
   app = "realtime-messenger"
   primary_region = "iad"

   [build]
     [build.args]
       NODE_ENV = "production"

   [env]
     PORT = "8080"
     NODE_ENV = "production"

   [http_service]
     internal_port = 8080
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Open App**
   ```bash
   fly open
   ```

   URL: `https://realtime-messenger.fly.dev`

7. **View Logs**
   ```bash
   fly logs
   ```

---

### 4. Vercel (Free - Frontend Only)

Vercel is excellent for the frontend but **cannot host WebSocket server**.

#### Cost: **$0/month (Free) + separate backend**

#### Use Case:
Deploy frontend on Vercel, backend elsewhere (Railway/Render).

#### Pros:
- Excellent frontend performance
- Automatic deployments
- Global CDN
- Great DX

#### Cons:
- Cannot run WebSocket server
- Requires separate backend deployment

#### Deployment Steps:

1. **Deploy Backend First**
   - Use Railway/Render/Fly.io for backend
   - Get backend URL: `https://api.your-domain.com`

2. **Update WebSocket URL**

   In `client/src/hooks/use-webrtc.ts`:
   ```typescript
   const wsUrl = `wss://api.your-domain.com/ws`; // Change from window.location.host
   ```

3. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

4. **Configure**
   - Framework: Vite
   - Build: `npm run build`
   - Output: `dist`

**Not Recommended** unless you need global CDN for static assets.

---

### 5. Self-Hosting (VPS)

For complete control, deploy to a VPS.

#### Cost: **$5-10/month**
- DigitalOcean: $6/month (1GB RAM)
- Linode: $5/month (1GB RAM)
- Vultr: $6/month (1GB RAM)
- Hetzner: €4.5/month (~$5, Europe-based)

#### Pros:
- Full control
- No platform limitations
- Cheapest long-term option
- Can run multiple apps

#### Cons:
- Manual setup
- Requires Linux knowledge
- You manage security updates
- Need to configure SSL

#### Deployment Steps:

1. **Get VPS**
   - Recommended: DigitalOcean, Hetzner
   - OS: Ubuntu 22.04 LTS
   - Size: 1GB RAM minimum

2. **Initial Setup**
   ```bash
   # SSH into server
   ssh root@your-server-ip

   # Update system
   apt update && apt upgrade -y

   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs

   # Install PM2 (process manager)
   npm install -g pm2

   # Install Nginx (reverse proxy)
   apt install -y nginx

   # Install Certbot (SSL)
   apt install -y certbot python3-certbot-nginx
   ```

3. **Deploy App**
   ```bash
   # Clone repo
   cd /var/www
   git clone https://github.com/yourusername/Realtime-Messenger.git
   cd Realtime-Messenger

   # Install dependencies
   npm install

   # Build
   npm run build

   # Start with PM2
   pm2 start npm --name "realtime-messenger" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```bash
   nano /etc/nginx/sites-available/realtime-messenger
   ```

   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /ws {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

   Enable site:
   ```bash
   ln -s /etc/nginx/sites-available/realtime-messenger /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

5. **Setup SSL (Free with Let's Encrypt)**
   ```bash
   certbot --nginx -d your-domain.com
   ```

6. **Configure Firewall**
   ```bash
   ufw allow OpenSSH
   ufw allow 'Nginx Full'
   ufw enable
   ```

7. **Auto-deploy on git push (Optional)**
   ```bash
   # Create deploy script
   nano /var/www/Realtime-Messenger/deploy.sh
   ```

   ```bash
   #!/bin/bash
   cd /var/www/Realtime-Messenger
   git pull
   npm install
   npm run build
   pm2 restart realtime-messenger
   ```

   ```bash
   chmod +x deploy.sh
   ```

---

## Environment Variables

Required environment variables for production:

```env
# Required
NODE_ENV=production
PORT=5000

# Optional (if using database in future)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## Post-Deployment

### Testing WebSocket Connection

1. **Open Browser Console**
   ```javascript
   const ws = new WebSocket('wss://your-domain.com/ws');
   ws.onopen = () => console.log('Connected!');
   ws.onerror = (err) => console.error('Error:', err);
   ```

2. **Test Microphone Access**
   - Ensure site uses HTTPS (required for `getUserMedia`)
   - Browser will prompt for microphone permission

### Monitoring

**Railway/Render:**
- Built-in logs and metrics in dashboard

**Fly.io:**
```bash
fly logs
fly status
```

**VPS:**
```bash
pm2 logs realtime-messenger
pm2 monit
```

---

## Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Railway** | $5 credit/mo | $5/mo after | Easy deployment, hobby projects |
| **Render** | Free (sleeps) | $7/mo | True free tier, low traffic |
| **Fly.io** | 3 VMs free | ~$2/mo | Global edge, always-on free |
| **VPS** | N/A | $5-10/mo | Full control, multiple apps |

### Recommendations by Use Case:

- **Hobby/Learning:** Render (free)
- **Portfolio Project:** Railway ($5 credit/mo)
- **Always-On Free:** Fly.io (3 free VMs)
- **Production:** VPS ($5/mo) or Railway ($5/mo)
- **Multiple Projects:** VPS ($10/mo for 2GB RAM)

---

## Troubleshooting

### WebSocket Connection Failed

**Issue:** Client can't connect to WebSocket

**Solutions:**
1. Ensure HTTPS is enabled (WSS protocol)
2. Check firewall allows WebSocket (port 80/443)
3. Verify Nginx/proxy WebSocket upgrade headers
4. Check server logs for connection errors

### Microphone Access Denied

**Issue:** Browser won't access microphone

**Solutions:**
1. Ensure site uses HTTPS (not HTTP)
2. Check browser permissions
3. Test in different browser
4. Check CORS headers if frontend/backend separate

### App Crashes After Deploy

**Issue:** App starts then crashes

**Solutions:**
1. Check logs: `pm2 logs` or platform dashboard
2. Verify Node.js version (v18+)
3. Check `npm run build` completes successfully
4. Ensure all dependencies installed
5. Check PORT environment variable

### Cold Starts (Render Free Tier)

**Issue:** App slow to respond after inactivity

**Solutions:**
1. Upgrade to paid tier ($7/mo)
2. Use cron job to ping every 14 min (keeps alive)
3. Switch to Fly.io (better free tier)

**Ping script (cron):**
```bash
# Ping every 14 minutes
*/14 * * * * curl https://your-app.onrender.com > /dev/null 2>&1
```

### Database Connection Issues

**Issue:** Can't connect to PostgreSQL

**Solutions:**
1. Check DATABASE_URL format
2. Ensure database is in same region (Railway/Render)
3. Verify database service is running
4. Check connection string has correct credentials

---

## Security Checklist

Before going to production:

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables set (not hardcoded)
- [ ] CORS configured if needed
- [ ] Rate limiting enabled (already in code)
- [ ] Input validation working (already in code)
- [ ] WebSocket authentication (add if needed)
- [ ] Database backups configured (if using DB)
- [ ] Firewall rules set (VPS only)
- [ ] Update dependencies (`npm audit fix`)

---

## Quick Start: Railway (Easiest)

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Go to railway.app
# 3. New Project → Deploy from GitHub
# 4. Select repository
# 5. Add environment variables:
#    NODE_ENV=production
#    PORT=5000
# 6. Deploy!

# Your app will be live at:
# https://your-app.up.railway.app
```

---

## Need Help?

- Railway: https://railway.app/help
- Render: https://render.com/docs
- Fly.io: https://fly.io/docs
- DigitalOcean: https://docs.digitalocean.com

---

**Recommended Path for Beginners:**

1. Start with **Render Free Tier** (no credit card)
2. If you need always-on, upgrade to **Railway** ($5/mo)
3. For production, consider **VPS** ($5-10/mo)

Happy deploying! 🚀
