# Troubleshooting Guide

Comprehensive guide for diagnosing and fixing common issues in Forecaster Arena.

---

## Quick Diagnostics

### Health Check
```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T20:18:53.198Z",
  "checks": {
    "database": { "status": "ok" },
    "environment": { "status": "ok" },
    "data_integrity": { "status": "ok" }
  }
}
```

If status is `"error"`, check the `checks` object for specific failures.

### Application Status
```bash
pm2 status
pm2 logs forecaster-arena --lines 50
```

### Database Status
```bash
sqlite3 data/forecaster.db "SELECT COUNT(*) FROM system_logs ORDER BY created_at DESC LIMIT 1;"
```

---

## Common Issues

### 1. Application Won't Start

**Symptoms:**
- PM2 shows `errored` or `stopped` status
- 502 Bad Gateway from Nginx
- Health check returns 503

**Diagnosis:**
```bash
# Check PM2 logs
pm2 logs forecaster-arena --lines 100

# Check for port conflicts
lsof -i :3000

# Verify environment variables
pm2 env forecaster-arena | grep -E "OPENROUTER|CRON_SECRET|ADMIN_PASSWORD"
```

**Common Causes & Fixes:**

1. **Missing Environment Variables**
   - Error: `OPENROUTER_API_KEY is not set`
   - Fix: Add to `.env.local` and restart PM2

2. **Database Permission Issues**
   - Error: `EACCES: permission denied`
   - Fix: `chmod 600 data/forecaster.db` or `chmod 640 data/forecaster.db`

3. **Port Already in Use**
   - Error: `EADDRINUSE: address already in use`
   - Fix: `pm2 delete forecaster-arena` then restart, or change PORT in `.env.local`

4. **Build Errors**
   - Error: TypeScript or build errors
   - Fix: `npm run build` locally first, check for errors

---

### 2. Cron Jobs Not Running

**Symptoms:**
- Markets not syncing
- No decisions being made on Sunday
- No snapshots being taken

**Diagnosis:**
```bash
# Check crontab
crontab -l

# Check cron logs
tail -f /home/forecaster/logs/sync.log
tail -f /home/forecaster/logs/decisions.log

# Test cron endpoint manually
curl -X POST http://localhost:3000/api/cron/sync-markets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Common Causes & Fixes:**

1. **Wrong CRON_SECRET**
   - Symptom: 401 Unauthorized in cron logs
   - Fix: Verify `CRON_SECRET` in `.env.local` matches crontab

2. **Cron Not Scheduled**
   - Symptom: No cron entries
   - Fix: Add cron jobs (see `docs/DEPLOYMENT_CHECKLIST.md`)

3. **Timezone Issues**
   - Symptom: Jobs run at wrong time
   - Fix: `sudo timedatectl set-timezone UTC`

4. **Cron User Permissions**
   - Symptom: Permission denied errors
   - Fix: Ensure cron runs as `forecaster` user, not root

---

### 3. Database Issues

**Symptoms:**
- Database locked errors
- Corrupted database
- Missing data

**Diagnosis:**
```bash
# Check database integrity
sqlite3 data/forecaster.db "PRAGMA integrity_check;"

# Check database size
ls -lh data/forecaster.db

# Check for locks
lsof data/forecaster.db
```

**Common Causes & Fixes:**

1. **Database Locked**
   - Error: `database is locked`
   - Fix: Check for multiple processes accessing DB, restart app

2. **Corrupted Database**
   - Error: `database disk image is malformed`
   - Fix: Restore from backup (see Backup/Restore section)

3. **Disk Space Full**
   - Error: `no space left on device`
   - Fix: `df -h` to check disk space, clean up old backups

4. **Permission Denied**
   - Error: `EACCES: permission denied`
   - Fix: `chmod 600 data/forecaster.db` and `chown forecaster:forecaster data/forecaster.db`

---

### 4. API Errors

**Symptoms:**
- 500 Internal Server Error
- API endpoints return errors
- Health check fails

**Diagnosis:**
```bash
# Check application logs
pm2 logs forecaster-arena --err

# Check system logs in database
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs WHERE severity='error' ORDER BY created_at DESC LIMIT 10;"

# Test health endpoint
curl https://yourdomain.com/api/health | jq
```

**Common Causes & Fixes:**

1. **Database Connection Failed**
   - Error: `SQLITE_CANTOPEN`
   - Fix: Check database path, permissions, disk space

2. **Missing Environment Variables**
   - Error: `OPENROUTER_API_KEY is not set`
   - Fix: Add to `.env.local`, restart PM2

3. **External API Failures**
   - Error: `Polymarket API error` or `OpenRouter API error`
   - Fix: Check API status, verify API keys, check rate limits

---

### 5. Nginx Errors

**Symptoms:**
- 502 Bad Gateway
- SSL certificate errors
- Connection refused

**Diagnosis:**
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Check if app is running
curl http://localhost:3000/api/health
```

**Common Causes & Fixes:**

1. **App Not Running**
   - Error: `502 Bad Gateway`
   - Fix: `pm2 restart forecaster-arena`

2. **SSL Certificate Expired**
   - Error: `SSL certificate problem`
   - Fix: `sudo certbot renew`

3. **Nginx Config Error**
   - Error: `nginx: configuration file test failed`
   - Fix: Check `/etc/nginx/sites-available/forecasterarena` syntax

---

### 6. Market Sync Issues

**Symptoms:**
- Markets not updating
- Old market data
- Missing markets

**Diagnosis:**
```bash
# Check last sync time
sqlite3 data/forecaster.db \
  "SELECT MAX(last_updated_at) FROM markets;"

# Check sync logs
tail -f /home/forecaster/logs/sync.log

# Manually trigger sync
curl -X POST http://localhost:3000/api/cron/sync-markets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Common Causes & Fixes:**

1. **Polymarket API Down**
   - Error: `Polymarket API error: 503`
   - Fix: Wait and retry, check Polymarket status

2. **Rate Limiting**
   - Error: `429 Too Many Requests`
   - Fix: Add delays between requests in `lib/polymarket/client.ts`

3. **Network Issues**
   - Error: `ECONNREFUSED` or timeout
   - Fix: Check server internet connection, firewall rules

---

### 7. Decision Making Issues

**Symptoms:**
- No decisions on Sunday
- LLM errors in decisions
- Missing decisions

**Diagnosis:**
```bash
# Check recent decisions
sqlite3 data/forecaster.db \
  "SELECT COUNT(*) FROM decisions WHERE decision_timestamp > datetime('now', '-7 days');"

# Check for errors
sqlite3 data/forecaster.db \
  "SELECT * FROM decisions WHERE action='ERROR' ORDER BY decision_timestamp DESC LIMIT 10;"

# Check OpenRouter API key
grep OPENROUTER_API_KEY .env.local
```

**Common Causes & Fixes:**

1. **OpenRouter API Key Invalid**
   - Error: `401 Unauthorized` in decision logs
   - Fix: Verify API key, check OpenRouter dashboard

2. **Model ID Changed**
   - Error: `Model not found` or `400 Bad Request`
   - Fix: Check `lib/constants.ts` for correct model IDs

3. **Rate Limiting**
   - Error: `429 Too Many Requests`
   - Fix: Add delays between LLM calls, check OpenRouter limits

4. **Malformed Responses**
   - Error: Decisions marked as `ERROR`
   - Fix: Check `decisions` table for `error_message`, review prompts

---

## Backup & Restore

### Creating a Backup

**Manual Backup:**
```bash
curl -X POST http://localhost:3000/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Manual File Copy:**
```bash
cp data/forecaster.db backups/forecaster-manual-$(date +%Y%m%d-%H%M%S).db
```

### Restoring from Backup

**Step 1: Stop Application**
```bash
pm2 stop forecaster-arena
```

**Step 2: Backup Current Database**
```bash
cp data/forecaster.db data/forecaster.db.broken-$(date +%Y%m%d-%H%M%S)
```

**Step 3: Restore Backup**
```bash
cp backups/forecaster-YYYY-MM-DDTHH-MM-SS.db data/forecaster.db
chmod 600 data/forecaster.db
chown forecaster:forecaster data/forecaster.db
```

**Step 4: Verify Integrity**
```bash
sqlite3 data/forecaster.db "PRAGMA integrity_check;"
```

**Step 5: Restart Application**
```bash
pm2 start forecaster-arena
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Application Health**
   - Health check endpoint status
   - PM2 process status
   - Response times

2. **Database Health**
   - Database size
   - Table row counts
   - Integrity checks

3. **Cron Jobs**
   - Last execution time
   - Success/failure rates
   - Execution duration

4. **API Usage**
   - OpenRouter API costs
   - Request success rates
   - Rate limit status

### Setting Up Alerts

**Health Check Monitoring:**
```bash
# Add to cron (every 5 minutes)
*/5 * * * * curl -f https://yourdomain.com/api/health || echo "Health check failed" | mail -s "Alert" admin@example.com
```

**PM2 Monitoring:**
```bash
# PM2 monitoring (built-in)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Recovery Procedures

### Complete System Recovery

**If everything fails:**

1. **Stop all services**
   ```bash
   pm2 stop all
   ```

2. **Restore database from backup**
   ```bash
   # Find latest backup
   ls -lt backups/ | head -2
   
   # Restore
   cp backups/forecaster-LATEST.db data/forecaster.db
   ```

3. **Verify environment**
   ```bash
   cat .env.local
   ```

4. **Rebuild application**
   ```bash
   npm run build
   ```

5. **Restart services**
   ```bash
   pm2 restart forecaster-arena
   ```

### Database Corruption Recovery

**If database is corrupted:**

1. **Check integrity**
   ```bash
   sqlite3 data/forecaster.db "PRAGMA integrity_check;"
   ```

2. **If corrupted, restore from backup**
   ```bash
   pm2 stop forecaster-arena
   cp backups/forecaster-LATEST.db data/forecaster.db
   pm2 start forecaster-arena
   ```

3. **If no backup, attempt repair**
   ```bash
   sqlite3 data/forecaster.db ".recover" | sqlite3 data/forecaster-recovered.db
   mv data/forecaster-recovered.db data/forecaster.db
   ```

---

## Performance Issues

### Slow API Responses

**Diagnosis:**
```bash
# Check database size
du -h data/forecaster.db

# Check query performance
sqlite3 data/forecaster.db "EXPLAIN QUERY PLAN SELECT * FROM decisions WHERE agent_id='...';"
```

**Fixes:**
- Ensure all indexes exist (check `lib/db/schema.ts`)
- Vacuum database: `sqlite3 data/forecaster.db "VACUUM;"`
- Check for N+1 queries in code

### High Memory Usage

**Diagnosis:**
```bash
pm2 monit
free -h
```

**Fixes:**
- Restart PM2: `pm2 restart forecaster-arena`
- Check for memory leaks in logs
- Increase server RAM if needed

---

## Log Analysis

### Viewing System Logs

**Recent Errors:**
```bash
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs WHERE severity='error' ORDER BY created_at DESC LIMIT 20;"
```

**All Logs by Type:**
```bash
sqlite3 data/forecaster.db \
  "SELECT event_type, COUNT(*) as count FROM system_logs GROUP BY event_type ORDER BY count DESC;"
```

**PM2 Logs:**
```bash
pm2 logs forecaster-arena --lines 100 --err
```

---

## Getting Help

### Information to Collect

When reporting issues, include:

1. **Error Messages**
   - PM2 logs: `pm2 logs forecaster-arena --lines 100`
   - System logs: `sqlite3 data/forecaster.db "SELECT * FROM system_logs WHERE severity='error' ORDER BY created_at DESC LIMIT 10;"`

2. **System Status**
   - Health check: `curl https://yourdomain.com/api/health`
   - PM2 status: `pm2 status`
   - Database size: `ls -lh data/forecaster.db`

3. **Configuration**
   - Environment variables (without secrets): `env | grep -E "NODE_ENV|DATABASE_PATH|BACKUP_PATH"`
   - Cron jobs: `crontab -l`

### Support Channels

- GitHub Issues: https://github.com/setrf/forecasterarena/issues
- Documentation: `docs/` directory
- Health Check: `/api/health` endpoint

---

## Prevention

### Regular Maintenance

**Weekly:**
- Check backup directory size
- Review error logs
- Verify cron jobs are running

**Monthly:**
- Review database size
- Check disk space
- Review API costs
- Test backup restoration

**Quarterly:**
- Review and update dependencies
- Security audit
- Performance optimization review

