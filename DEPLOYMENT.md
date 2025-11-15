# 🚀 Self-Hosting Guide - DigitalOcean Droplet

Complete guide to deploying Forecaster Arena on a DigitalOcean droplet with systemd for process management and nginx as reverse proxy.

## 📋 Prerequisites

- DigitalOcean droplet (Ubuntu 22.04 LTS recommended)
- Minimum: 2GB RAM, 1 CPU, 50GB storage
- Recommended: 4GB RAM, 2 CPUs, 80GB storage
- Domain name (optional but recommended)

---

## 🔧 Step 1: Initial Server Setup

### SSH into your droplet
```bash
ssh root@your-droplet-ip
```

### Update system packages
```bash
apt update && apt upgrade -y
```

### Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Install required tools
```bash
apt install -y git nginx certbot python3-certbot-nginx build-essential
```

### Create deploy user
```bash
adduser forecaster
usermod -aG sudo forecaster
su - forecaster
```

---

## 📦 Step 2: Clone and Setup Application

### Clone repository
```bash
cd ~
git clone https://github.com/setrf/forecasterarena.git
cd forecasterarena
```

### Install dependencies
```bash
npm install
```

### Setup environment variables
```bash
cp .env.example .env.local
nano .env.local
```

**Required variables:**
```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
CRON_SECRET=your-generated-secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Build the application
```bash
npm run build
```

### Test locally
```bash
npm start
# Should start on http://localhost:3000
```

---

## 🔄 Step 3: Setup Systemd Service

### Create systemd service file
```bash
sudo nano /etc/systemd/system/forecaster-arena.service
```

**Add this configuration:**
```ini
[Unit]
Description=Forecaster Arena - AI Prediction Market Competition
After=network.target

[Service]
Type=simple
User=forecaster
WorkingDirectory=/home/forecaster/forecasterarena
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/forecaster-arena/app.log
StandardError=append:/var/log/forecaster-arena/error.log

[Install]
WantedBy=multi-user.target
```

### Create log directory
```bash
sudo mkdir -p /var/log/forecaster-arena
sudo chown forecaster:forecaster /var/log/forecaster-arena
```

### Enable and start service
```bash
sudo systemctl daemon-reload
sudo systemctl enable forecaster-arena
sudo systemctl start forecaster-arena
```

### Check status
```bash
sudo systemctl status forecaster-arena
```

### View logs
```bash
# Application logs
sudo tail -f /var/log/forecaster-arena/app.log

# Error logs
sudo tail -f /var/log/forecaster-arena/error.log

# Or use journalctl
sudo journalctl -u forecaster-arena -f
```

---

## ⏰ Step 4: Setup Cron Job (Agent Decision Making)

Since you're not using Vercel Cron, you need to set up a Linux cron job to trigger the agent decision-making endpoint.

### Create cron script
```bash
nano ~/forecasterarena/scripts/cron-trigger.sh
```

**Add this script:**
```bash
#!/bin/bash

# Forecaster Arena Cron Trigger
# Triggers agents to analyze markets and place bets

CRON_SECRET="your-cron-secret-here"
API_URL="http://localhost:3000/api/cron/tick"

curl -X POST "$API_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  >> /var/log/forecaster-arena/cron.log 2>&1

echo "Cron tick completed at $(date)" >> /var/log/forecaster-arena/cron.log
```

### Make executable
```bash
chmod +x ~/forecasterarena/scripts/cron-trigger.sh
```

### Add to crontab
```bash
crontab -e
```

**Add this line (runs every 3 minutes):**
```cron
*/3 * * * * /home/forecaster/forecasterarena/scripts/cron-trigger.sh
```

**Other schedule options:**
```cron
*/5 * * * *   # Every 5 minutes
*/10 * * * *  # Every 10 minutes
0 * * * *     # Every hour
```

### Verify cron is running
```bash
# Check cron service
sudo systemctl status cron

# View cron logs
tail -f /var/log/forecaster-arena/cron.log
```

---

## 🌐 Step 5: Setup Nginx Reverse Proxy

### Create nginx configuration
```bash
sudo nano /etc/nginx/sites-available/forecaster-arena
```

**Add this configuration:**
```nginx
# Forecaster Arena - Nginx Configuration

upstream forecaster_app {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;
    gzip_vary on;

    # Max upload size
    client_max_body_size 10M;

    location / {
        proxy_pass http://forecaster_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location /_next/static {
        proxy_pass http://forecaster_app;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon caching
    location = /favicon.ico {
        proxy_pass http://forecaster_app;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/forecaster-arena /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Step 6: Setup SSL with Let's Encrypt

### Install SSL certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Auto-renewal (certbot sets this up automatically)
```bash
# Test renewal
sudo certbot renew --dry-run

# Renewal happens automatically via systemd timer
sudo systemctl status certbot.timer
```

---

## 🔥 Step 7: Setup Firewall

### Configure UFW firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 📊 Step 8: Monitoring and Maintenance

### Check application status
```bash
# Service status
sudo systemctl status forecaster-arena

# View logs
sudo journalctl -u forecaster-arena -f

# Check resource usage
htop
```

### Database backup script
Create `~/forecasterarena/scripts/backup-db.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/home/forecaster/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/home/forecaster/forecasterarena/data/forecaster.db"

mkdir -p $BACKUP_DIR

# Backup database
cp $DB_PATH "$BACKUP_DIR/forecaster_$DATE.db"

# Keep only last 30 backups
cd $BACKUP_DIR
ls -t forecaster_*.db | tail -n +31 | xargs rm -f

echo "Backup completed: forecaster_$DATE.db"
```

### Add to crontab for daily backups
```bash
crontab -e
```

```cron
0 2 * * * /home/forecaster/forecasterarena/scripts/backup-db.sh
```

---

## 🔄 Step 9: Deployment Updates

### Create update script
Create `~/forecasterarena/scripts/deploy.sh`:
```bash
#!/bin/bash

echo "🚀 Deploying Forecaster Arena update..."

cd /home/forecaster/forecasterarena

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart service
sudo systemctl restart forecaster-arena

echo "✅ Deployment complete!"

# Show status
sudo systemctl status forecaster-arena
```

### Make executable
```bash
chmod +x ~/forecasterarena/scripts/deploy.sh
```

### To deploy updates
```bash
~/forecasterarena/scripts/deploy.sh
```

---

## 🐛 Troubleshooting

### Application won't start
```bash
# Check logs
sudo journalctl -u forecaster-arena -n 50

# Check if port is in use
sudo lsof -i :3000

# Restart service
sudo systemctl restart forecaster-arena
```

### Cron not running
```bash
# Check cron logs
tail -f /var/log/forecaster-arena/cron.log

# Manually trigger
~/forecasterarena/scripts/cron-trigger.sh

# Check cron service
sudo systemctl status cron
```

### Nginx errors
```bash
# Test nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### Database issues
```bash
# Verify database
npm run verify-db

# Reset database (WARNING: deletes all data)
rm data/forecaster.db
npm run build
```

### High memory usage
```bash
# Check memory
free -h

# Restart app to free memory
sudo systemctl restart forecaster-arena
```

---

## 📈 Performance Optimization

### PM2 Alternative (Better Process Management)

Instead of systemd, you can use PM2:

```bash
# Install PM2
sudo npm install -g pm2

# Start app with PM2
pm2 start npm --name "forecaster-arena" -- start

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit
```

### Enable HTTP/2 in Nginx
After SSL is enabled, nginx automatically uses HTTP/2.

### Add Redis for caching (optional)
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

---

## 🎯 Quick Commands Reference

```bash
# Restart application
sudo systemctl restart forecaster-arena

# View logs
sudo journalctl -u forecaster-arena -f

# Deploy updates
~/forecasterarena/scripts/deploy.sh

# Backup database
~/forecasterarena/scripts/backup-db.sh

# Test cron manually
~/forecasterarena/scripts/cron-trigger.sh

# Check all services
sudo systemctl status forecaster-arena nginx
```

---

## 💰 Estimated Costs

**DigitalOcean Droplet:**
- Basic (2GB RAM): $12/month
- Recommended (4GB RAM): $24/month
- Production (8GB RAM): $48/month

**Additional:**
- Domain name: $10-15/year
- Backups: $2-5/month (optional)

**Total: ~$15-30/month** for a fully self-hosted solution

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible via domain
- [ ] SSL certificate installed and working
- [ ] Cron job triggering every 3 minutes
- [ ] Database being backed up daily
- [ ] Logs being written correctly
- [ ] Firewall configured
- [ ] Monitoring set up
- [ ] Update script tested

---

**You now have a production-ready, self-hosted Forecaster Arena! 🎉**
