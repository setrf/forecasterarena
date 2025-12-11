# Operations Runbook

Day-to-day operational procedures for running Forecaster Arena in production.

---

## Daily Operations

### Morning Checks

**1. Health Check**
```bash
curl https://yourdomain.com/api/health | jq
```

Expected: `"status": "ok"`

**2. Application Status**
```bash
pm2 status
```

Expected: `online` status for `forecaster-arena`

**3. Recent Errors**
```bash
sqlite3 data/forecaster.db \
  "SELECT COUNT(*) FROM system_logs WHERE severity='error' AND created_at > datetime('now', '-24 hours');"
```

Expected: 0 or very few errors

**4. Last Market Sync**
```bash
sqlite3 data/forecaster.db \
  "SELECT MAX(last_updated_at) FROM markets;"
```

Expected: Within last 10 minutes (markets sync every 5 minutes)

---

## Weekly Operations

### Sunday Morning (After Decision Run)

**1. Verify Decision Run**
```bash
# Check decisions made this week
sqlite3 data/forecaster.db \
  "SELECT COUNT(*) FROM decisions WHERE decision_timestamp > datetime('now', '-24 hours');"
```

Expected: 7 decisions (one per model) if new cohort started

**2. Check New Cohort**
```bash
sqlite3 data/forecaster.db \
  "SELECT * FROM cohorts ORDER BY started_at DESC LIMIT 1;"
```

**3. Verify Snapshots**
```bash
sqlite3 data/forecaster.db \
  "SELECT COUNT(*) FROM portfolio_snapshots WHERE snapshot_date = date('now');"
```

Expected: 7 snapshots (one per agent in active cohorts)

**4. Review API Costs**
```bash
sqlite3 data/forecaster.db \
  "SELECT SUM(api_cost_usd) FROM decisions WHERE decision_timestamp > datetime('now', '-7 days');"
```

---

## Cron Job Schedule

### Market Sync
**Schedule**: Every 5 minutes (`*/5 * * * *`)
**Endpoint**: `/api/cron/sync-markets`
**Log**: `/home/forecaster/logs/sync.log`

**Verification:**
```bash
tail -f /home/forecaster/logs/sync.log
```

### Start New Cohort
**Schedule**: Sunday 00:00 UTC (`0 0 * * 0`)
**Endpoint**: `/api/cron/start-cohort`
**Log**: `/home/forecaster/logs/cohort.log`

**Verification:**
```bash
# Check if new cohort was created
sqlite3 data/forecaster.db \
  "SELECT * FROM cohorts ORDER BY started_at DESC LIMIT 1;"
```

### Run Decisions
**Schedule**: Sunday 00:05 UTC (`5 0 * * 0`)
**Endpoint**: `/api/cron/run-decisions`
**Log**: `/home/forecaster/logs/decisions.log`

**Verification:**
```bash
# Check decisions were made
sqlite3 data/forecaster.db \
  "SELECT COUNT(*) FROM decisions WHERE decision_timestamp > datetime('now', '-1 hour');"
```

### Check Resolutions
**Schedule**: Every hour (`0 * * * *`)
**Endpoint**: `/api/cron/check-resolutions`
**Log**: `/home/forecaster/logs/resolutions.log`

**Verification:**
```bash
# Check recently resolved markets
sqlite3 data/forecaster.db \
  "SELECT * FROM markets WHERE status='resolved' AND resolved_at > datetime('now', '-24 hours');"
```

### Take Snapshots
**Schedule**: Every 10 minutes (`*/10 * * * *`)
**Endpoint**: `/api/cron/take-snapshots`
**Log**: `/home/forecaster/logs/snapshots.log`

**Verification:**
```bash
# Check today's snapshots
sqlite3 data/forecaster.db \
  "SELECT COUNT(*) FROM portfolio_snapshots WHERE snapshot_timestamp > datetime('now', '-1 hour');"

# Spot-check one agent's latest MTM (closed-but-unresolved markets use prior value if price feeds are 0/1)
sqlite3 data/forecaster.db \
  "SELECT snapshot_timestamp, total_value, positions_value FROM portfolio_snapshots WHERE agent_id = (SELECT id FROM agents LIMIT 1) ORDER BY snapshot_timestamp DESC LIMIT 3;"
```

### Backup
**Schedule**: Saturday 23:00 UTC (`0 23 * * 6`)
**Endpoint**: `/api/cron/backup`
**Log**: `/home/forecaster/logs/backup.log`

**Verification:**
```bash
# List backups
ls -lth backups/ | head -10
```

---

## Monitoring Queries

### System Health

**Database Size:**
```sql
SELECT 
  page_count * page_size / 1024 / 1024 as size_mb
FROM pragma_page_count(), pragma_page_size();
```

**Table Row Counts:**
```sql
SELECT 
  'cohorts' as table_name, COUNT(*) as count FROM cohorts
UNION ALL
SELECT 'agents', COUNT(*) FROM agents
UNION ALL
SELECT 'markets', COUNT(*) FROM markets
UNION ALL
SELECT 'positions', COUNT(*) FROM positions
UNION ALL
SELECT 'trades', COUNT(*) FROM trades
UNION ALL
SELECT 'decisions', COUNT(*) FROM decisions
UNION ALL
SELECT 'snapshots', COUNT(*) FROM portfolio_snapshots
UNION ALL
SELECT 'logs', COUNT(*) FROM system_logs;
```

**Recent Activity:**
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM system_logs
WHERE created_at > datetime('now', '-7 days')
GROUP BY event_type
ORDER BY count DESC;
```

### Performance Metrics

**Average Decision Time:**
```sql
SELECT 
  AVG(response_time_ms) as avg_ms,
  MAX(response_time_ms) as max_ms
FROM decisions
WHERE decision_timestamp > datetime('now', '-7 days');
```

**API Costs (Last 7 Days):**
```sql
SELECT 
  m.display_name,
  SUM(d.api_cost_usd) as total_cost,
  COUNT(d.id) as decision_count,
  AVG(d.api_cost_usd) as avg_cost
FROM decisions d
JOIN agents a ON d.agent_id = a.id
JOIN models m ON a.model_id = m.id
WHERE d.decision_timestamp > datetime('now', '-7 days')
GROUP BY m.display_name
ORDER BY total_cost DESC;
```

**Market Resolution Rate:**
```sql
SELECT 
  COUNT(*) as total_markets,
  SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
  ROUND(100.0 * SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*), 2) as resolution_rate
FROM markets;
```

---

## Manual Operations

### Manually Trigger Market Sync

```bash
curl -X POST http://localhost:3000/api/cron/sync-markets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Manually Create Backup

```bash
curl -X POST http://localhost:3000/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Manually Run Decisions (Testing)

```bash
curl -X POST http://localhost:3000/api/cron/run-decisions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Warning**: Only run this manually for testing. Normal schedule is Sunday 00:05 UTC.

### Check Specific Agent Performance

```bash
# Get agent ID
sqlite3 data/forecaster.db \
  "SELECT a.id, m.display_name FROM agents a JOIN models m ON a.model_id = m.id WHERE a.cohort_id = 'COHORT_ID';"

# Get agent stats
sqlite3 data/forecaster.db \
  "SELECT * FROM agents WHERE id = 'AGENT_ID';"
```

---

## Database Maintenance

### Vacuum Database

**When**: Monthly or when database grows large

```bash
pm2 stop forecaster-arena
sqlite3 data/forecaster.db "VACUUM;"
pm2 start forecaster-arena
```

### Analyze Tables (Update Statistics)

```bash
sqlite3 data/forecaster.db "ANALYZE;"
```

### Check Database Integrity

```bash
sqlite3 data/forecaster.db "PRAGMA integrity_check;"
```

Expected: `ok`

---

## Backup Management

### List Backups

```bash
ls -lth backups/
```

### Backup Retention Policy

- **Automatic**: Keeps last 10 backups minimum
- **Automatic**: Deletes backups older than 30 days
- **Manual**: Can keep specific backups by renaming them

### Verify Backup Integrity

```bash
sqlite3 backups/forecaster-YYYY-MM-DDTHH-MM-SS.db "PRAGMA integrity_check;"
```

---

## Log Management

### View Recent System Logs

```bash
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50;"
```

### Filter by Severity

```bash
# Errors only
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs WHERE severity='error' ORDER BY created_at DESC LIMIT 20;"

# Warnings
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs WHERE severity='warning' ORDER BY created_at DESC LIMIT 20;"
```

### Filter by Event Type

```bash
# Market sync events
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs WHERE event_type LIKE '%market_sync%' ORDER BY created_at DESC LIMIT 20;"

# Decision events
sqlite3 data/forecaster.db \
  "SELECT * FROM system_logs WHERE event_type LIKE '%decision%' ORDER BY created_at DESC LIMIT 20;"
```

**Note**: All logs are preserved (no automatic deletion) for audit trail.

---

## Emergency Procedures

### Application Completely Down

1. **Check PM2**
   ```bash
   pm2 status
   pm2 logs forecaster-arena --lines 100
   ```

2. **Restart Application**
   ```bash
   pm2 restart forecaster-arena
   ```

3. **If Still Failing**
   ```bash
   pm2 delete forecaster-arena
   cd /home/forecaster/forecasterarena
   npm run build
   pm2 start npm --name forecaster-arena -- start
   pm2 save
   ```

### Database Corruption

1. **Stop Application**
   ```bash
   pm2 stop forecaster-arena
   ```

2. **Restore Latest Backup**
   ```bash
   LATEST_BACKUP=$(ls -t backups/*.db | head -1)
   cp "$LATEST_BACKUP" data/forecaster.db
   chmod 600 data/forecaster.db
   ```

3. **Verify Integrity**
   ```bash
   sqlite3 data/forecaster.db "PRAGMA integrity_check;"
   ```

4. **Restart Application**
   ```bash
   pm2 start forecaster-arena
   ```

### Cron Jobs Not Running

1. **Check Crontab**
   ```bash
   crontab -l
   ```

2. **Verify CRON_SECRET**
   ```bash
   grep CRON_SECRET .env.local
   # Compare with crontab entries
   ```

3. **Test Manually**
   ```bash
   curl -X POST http://localhost:3000/api/cron/sync-markets \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. **Check Cron Service**
   ```bash
   sudo systemctl status cron
   ```

---

## Performance Tuning

### Database Optimization

**When Database Grows Large (>100MB):**

1. **Vacuum**
   ```bash
   sqlite3 data/forecaster.db "VACUUM;"
   ```

2. **Analyze**
   ```bash
   sqlite3 data/forecaster.db "ANALYZE;"
   ```

3. **Check Index Usage**
   ```sql
   SELECT * FROM sqlite_master WHERE type='index';
   ```

### Application Optimization

**If Response Times Are Slow:**

1. **Check Database Size**
   ```bash
   du -h data/forecaster.db
   ```

2. **Review Query Performance**
   - Check for missing indexes
   - Review N+1 query patterns
   - Add pagination where needed

3. **Consider Caching**
   - Cache static data (models list)
   - Cache leaderboard data (refresh every 5 minutes)

---

## Security Checklist

### Weekly Security Review

- [ ] No default secrets in use (check console warnings)
- [ ] SSL certificate valid (not expired)
- [ ] Database file permissions correct (600 or 640)
- [ ] Backup directory permissions correct
- [ ] No unauthorized access in system logs
- [ ] API keys not exposed in logs

### Monthly Security Review

- [ ] Review system logs for suspicious activity
- [ ] Check for failed login attempts
- [ ] Verify backup security
- [ ] Review dependency updates for security patches

---

## Useful Commands Reference

### Application
```bash
pm2 status                    # Check status
pm2 logs forecaster-arena     # View logs
pm2 restart forecaster-arena # Restart app
pm2 monit                     # Monitor resources
```

### Database
```bash
sqlite3 data/forecaster.db   # Open database shell
sqlite3 data/forecaster.db ".tables"  # List tables
sqlite3 data/forecaster.db ".schema"  # Show schema
```

### System
```bash
df -h                         # Check disk space
free -h                       # Check memory
top                           # Monitor processes
```

### Network
```bash
curl http://localhost:3000/api/health  # Test locally
curl https://yourdomain.com/api/health # Test externally
```

---

## Contact & Support

- **GitHub Issues**: https://github.com/setrf/forecasterarena/issues
- **Documentation**: `docs/` directory
- **Health Check**: `/api/health` endpoint
