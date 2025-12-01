# Pre-Deployment Checklist

Use this checklist before deploying Forecaster Arena to production.

## Pre-Deployment

### Environment Variables
- [ ] `OPENROUTER_API_KEY` is set and valid
- [ ] `CRON_SECRET` is set (NOT 'dev-secret')
- [ ] `ADMIN_PASSWORD` is set (NOT 'admin')
- [ ] `NEXT_PUBLIC_SITE_URL` is set to production URL
- [ ] `NODE_ENV` is set to 'production'
- [ ] `DATABASE_PATH` is set (if custom location)
- [ ] `BACKUP_PATH` is set (if custom location)

### Security
- [ ] Default secrets are NOT being used (check console warnings)
- [ ] `.env.local` is NOT committed to git
- [ ] Database file permissions are set (600 or 640)
- [ ] Backup directory permissions are set
- [ ] SSL certificate is configured (Let's Encrypt)

### Database
- [ ] Database schema is up to date
- [ ] All indexes are created
- [ ] No orphaned records exist
- [ ] Backup endpoint tested (`/api/cron/backup`)
- [ ] Backup retention policy configured

### Build & Dependencies
- [ ] `npm install` completes successfully
- [ ] `npm run build` completes without errors
- [ ] `tsc --noEmit` passes (no type errors)
- [ ] `npm run lint` passes (no linting errors)
- [ ] All dependencies are up to date

### Code Quality
- [ ] All API endpoints have error handling
- [ ] All database queries use parameterized statements
- [ ] No hardcoded secrets in code
- [ ] Health check endpoint works (`/api/health`)

## Deployment Steps

### 1. Server Setup
- [ ] SSH access to DigitalOcean droplet
- [ ] Node.js 20+ installed
- [ ] Git installed
- [ ] PM2 installed globally
- [ ] Nginx installed

### 2. Application Setup
- [ ] Repository cloned
- [ ] `.env.local` created with production values
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build`)
- [ ] Database initialized (first run creates it)

### 3. Process Management
- [ ] PM2 ecosystem file created (`ecosystem.config.js`)
- [ ] Application started with PM2
- [ ] PM2 startup script installed (`pm2 startup`)
- [ ] PM2 logs configured

### 4. Reverse Proxy
- [ ] Nginx server block configured
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] HTTP redirects to HTTPS
- [ ] Nginx reloaded

### 5. Cron Jobs
- [ ] Crontab configured with all jobs
- [ ] `CRON_SECRET` used in cron commands
- [ ] Cron logs configured
- [ ] Server timezone set to UTC

### 6. Monitoring
- [ ] Health check endpoint accessible
- [ ] System logs directory created
- [ ] Log rotation configured
- [ ] Uptime monitoring setup (optional)

## Post-Deployment Verification

### Functionality Tests
- [ ] Homepage loads correctly
- [ ] All navigation links work
- [ ] Models page displays all 7 models
- [ ] Cohorts page loads
- [ ] Markets page loads and filters work
- [ ] Market detail pages load
- [ ] Admin dashboard accessible

### API Tests
- [ ] `/api/health` returns 200 OK
- [ ] `/api/leaderboard` returns data
- [ ] `/api/models` returns all models
- [ ] `/api/markets` returns markets
- [ ] `/api/admin/stats` requires authentication

### Cron Job Tests
- [ ] `/api/cron/sync-markets` works (with auth)
- [ ] `/api/cron/backup` creates backup
- [ ] Cron jobs scheduled correctly
- [ ] Cron logs are being written

### Security Tests
- [ ] Cron endpoints reject requests without auth
- [ ] Admin endpoints require login
- [ ] SSL certificate valid
- [ ] No default secrets in use

## First Week Monitoring

### Daily Checks
- [ ] Application is running (PM2 status)
- [ ] No error spikes in logs
- [ ] Database size is reasonable
- [ ] Backup created successfully

### Weekly Checks
- [ ] Market sync runs successfully
- [ ] Decision run executes (if Sunday)
- [ ] New cohort created (if Sunday)
- [ ] Snapshots taken daily
- [ ] Resolutions checked hourly

## Troubleshooting

### Common Issues

**Application won't start**
- Check PM2 logs: `pm2 logs forecaster-arena`
- Verify environment variables are set
- Check database file permissions

**Cron jobs not running**
- Verify crontab: `crontab -l`
- Check cron logs in `/home/forecaster/logs/`
- Verify `CRON_SECRET` matches in cron and app

**Database errors**
- Check database file exists and is readable
- Verify database schema is up to date
- Check for disk space issues

**Nginx errors**
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify SSL certificate is valid
- Check Nginx config: `sudo nginx -t`

## Rollback Procedure

If deployment fails:

1. Stop PM2: `pm2 stop forecaster-arena`
2. Restore previous version: `git checkout <previous-commit>`
3. Rebuild: `npm run build`
4. Restart: `pm2 restart forecaster-arena`
5. Restore database backup if needed

## Support Contacts

- GitHub Issues: https://github.com/setrf/forecasterarena/issues
- Documentation: `docs/DEPLOYMENT.md`

