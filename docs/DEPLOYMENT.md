# Deployment Guide

Step-by-step guide for deploying Forecaster Arena to a DigitalOcean VPS.

---

## Prerequisites

- DigitalOcean account
- Domain name (optional but recommended)
- OpenRouter API key

---

## 1. Create Droplet

1. Log into DigitalOcean
2. Create → Droplets
3. Choose:
   - **Image**: Ubuntu 24.04 LTS
   - **Size**: Basic, 2GB RAM / 1 CPU minimum
   - **Datacenter**: Choose closest to you
   - **Authentication**: SSH keys (recommended)

---

## 2. Initial Server Setup

SSH into your droplet:

```bash
ssh root@your-droplet-ip
```

Update packages:

```bash
apt update && apt upgrade -y
```

Install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Install required packages:

```bash
apt install -y git build-essential
```

Create app user:

```bash
adduser --disabled-password forecaster
usermod -aG sudo forecaster
```

---

## 3. Clone and Setup Project

Switch to app user:

```bash
su - forecaster
```

Clone repository:

```bash
git clone https://github.com/yourusername/forecasterarena.git
cd forecasterarena
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env.local
nano .env.local
```

Fill in your values:

```env
OPENROUTER_API_KEY=sk-or-...
CRON_SECRET=your-random-secret
ADMIN_PASSWORD=your-secure-password
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Build the application:

```bash
npm run build
```

---

## 4. Setup PM2 Process Manager

Install PM2:

```bash
sudo npm install -g pm2
```

Create ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'forecaster-arena',
    script: 'npm',
    args: 'start',
    cwd: '/home/forecaster/forecasterarena',
    env: {
      NODE_ENV: 'production',
      PORT: 3010
    }
  }]
};
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 5. Setup Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx
```

Create site configuration:

```bash
sudo nano /etc/nginx/sites-available/forecaster
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/forecaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Setup SSL with Let's Encrypt

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Get certificate:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 7. Setup Cron Jobs

Edit crontab:

```bash
crontab -e
```

Add these entries:

```cron
# Forecaster Arena Cron Jobs
# All times in UTC

# Sync markets from Polymarket - Every 5 minutes
*/5 * * * * curl -s -X POST http://localhost:3010/api/cron/sync-markets -H "Authorization: Bearer YOUR_CRON_SECRET" >> /home/forecaster/logs/sync.log 2>&1

# Run agent decisions every Sunday at 00:00 UTC
0 0 * * 0 curl -s -X POST http://localhost:3010/api/cron/run-decisions -H "Authorization: Bearer YOUR_CRON_SECRET" >> /home/forecaster/logs/decisions.log 2>&1

# Start new cohort every Sunday at 00:05 UTC (runs after decisions)
5 0 * * 0 curl -s -X POST http://localhost:3010/api/cron/start-cohort -H "Authorization: Bearer YOUR_CRON_SECRET" >> /home/forecaster/logs/cohort.log 2>&1

# Check market resolutions every hour
0 * * * * curl -s -X POST http://localhost:3010/api/cron/check-resolutions -H "Authorization: Bearer YOUR_CRON_SECRET" >> /home/forecaster/logs/resolutions.log 2>&1

# Take portfolio snapshots every 10 minutes
*/10 * * * * curl -s -X POST http://localhost:3010/api/cron/take-snapshots -H "Authorization: Bearer YOUR_CRON_SECRET" >> /home/forecaster/logs/snapshots.log 2>&1

# Database backup - Daily at 02:00 UTC
0 2 * * * curl -s -X POST http://localhost:3010/api/cron/backup -H "Authorization: Bearer YOUR_CRON_SECRET" >> /home/forecaster/logs/backup.log 2>&1
```

Create logs directory:

```bash
mkdir -p /home/forecaster/logs
```

---

## 8. Firewall Configuration

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 9. Monitoring

View PM2 logs:

```bash
pm2 logs
```

View Nginx logs:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Check application status:

```bash
pm2 status
```

---

## 10. Updates

To deploy updates:

```bash
cd /home/forecaster/forecasterarena
git pull
npm install
npm run build
pm2 restart forecaster-arena
```

---

## Troubleshooting

### Application won't start

Check PM2 logs:
```bash
pm2 logs forecaster-arena --lines 100
```

### Database issues

Check file permissions:
```bash
ls -la data/
```

### API errors

Check environment variables:
```bash
cat .env.local
```

### Nginx 502 errors

Verify app is running:
```bash
pm2 status
curl http://localhost:3010
```



