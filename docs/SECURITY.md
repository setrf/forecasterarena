# Security Documentation

This document outlines the security measures, best practices, and known considerations for Forecaster Arena.

---

## Security Overview

Forecaster Arena is a research benchmark platform that:
- Does NOT handle real money (paper trading only)
- Does NOT collect user data beyond admin authentication
- Does NOT expose sensitive user information
- Does handle API keys and authentication secrets

---

## Secret Management

### Environment Variables

All secrets are stored in `.env.local` which:
- ✅ Is gitignored (`.env*.local` in `.gitignore`)
- ✅ Has restricted permissions (`600` - owner read/write only)
- ✅ Is never committed to version control
- ✅ Uses placeholder values in `.env.example`

**Required Secrets**:

| Secret | Purpose | Generation |
|--------|---------|------------|
| `OPENROUTER_API_KEY` | LLM API access | From https://openrouter.ai/settings/keys |
| `CRON_SECRET` | Cron endpoint authentication | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Admin dashboard access | Strong password (12+ chars) |

### Cron Secret Handling

**Current Implementation**:
- CRON_SECRET is stored in both:
  1. `/opt/forecasterarena/.env.local` (permissions: 600, owner: www-data)
  2. `/etc/cron.d/forecasterarena` (permissions: 644, owner: root)

**Security Considerations**:

⚠️ **Known Issue**: The crontab file at `/etc/cron.d/forecasterarena` has 644 permissions, making the CRON_SECRET readable by all users on the system.

**Risk Assessment**:
- **Impact**: Low-Medium (allows unauthorized triggering of cron endpoints)
- **Likelihood**: Low (requires local system access)
- **Mitigation**: Single-user system, no sensitive data exposure

**Recommended Improvements**:

1. **Option 1: Restrict crontab permissions** (Simple)
   ```bash
   sudo chmod 600 /etc/cron.d/forecasterarena
   ```
   Note: Some cron implementations require 644 permissions

2. **Option 2: Use wrapper script** (More secure)
   ```bash
   # Create /usr/local/bin/forecaster-cron.sh
   #!/bin/bash
   source /opt/forecasterarena/.env.local
   curl -s -X POST "$1" -H "Authorization: Bearer $CRON_SECRET"

   # Crontab entry becomes:
   */5 * * * * root /usr/local/bin/forecaster-cron.sh http://localhost:3010/api/cron/sync-markets
   ```

3. **Option 3: IP-based authentication** (Most secure)
   - Allow cron endpoints only from localhost
   - Verify `X-Forwarded-For` or remote address in API routes

---

## API Authentication

### Cron Endpoints

All `/api/cron/*` endpoints require:

```http
Authorization: Bearer {CRON_SECRET}
```

**Implementation**:
- Constant-time comparison (prevents timing attacks)
- Returns 401 if missing or invalid
- Logs failed authentication attempts

**Code Reference**: Each cron route validates via:
```typescript
const authHeader = req.headers.get('authorization');
const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
if (authHeader !== expectedAuth) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Admin Dashboard

Admin endpoints (`/api/admin/*`) use:
- Password-based authentication
- HTTP-only session cookies
- Constant-time password comparison

**Session Security**:
- Cookie: `forecaster-admin-session`
- Attributes: `HttpOnly`, `Secure` (in production), `SameSite=Strict`
- Expiration: Session-based (cleared on browser close)

---

## Production Security Checklist

### Before Deployment

- [ ] Generate strong `CRON_SECRET`: `openssl rand -hex 32`
- [ ] Set strong `ADMIN_PASSWORD` (12+ characters, mixed case, numbers, symbols)
- [ ] Obtain valid `OPENROUTER_API_KEY`
- [ ] Set `NODE_ENV=production`
- [ ] Verify `.env.local` has 600 permissions
- [ ] Verify `.env.local` is gitignored
- [ ] Consider restricting `/etc/cron.d/forecasterarena` permissions

### After Deployment

- [ ] Verify no default secrets in use (check console warnings)
- [ ] Test cron endpoints return 401 without valid auth
- [ ] Test admin login with correct and incorrect passwords
- [ ] Verify API keys are not exposed in logs
- [ ] Check file permissions on database and backups

### Regular Maintenance

- [ ] Rotate `CRON_SECRET` if exposed (update both .env.local and crontab)
- [ ] Rotate `ADMIN_PASSWORD` periodically
- [ ] Monitor API costs and usage patterns
- [ ] Review system logs for suspicious activity

---

## Known Security Limitations

### 1. Single-User System Design

**Limitation**: Designed for single-server deployment, not multi-tenant.

**Implications**:
- No user isolation between agents (intentional - they're all part of the benchmark)
- Admin dashboard has single password (not multi-user)
- Cron jobs run as root or www-data

**Acceptable because**:
- Research platform, not production service
- No real money or sensitive user data
- Single administrator expected

### 2. SQLite Database

**Limitation**: Database file must be readable by web server user.

**Implications**:
- File permissions allow www-data to read/write
- No row-level security or access control
- Backups are plain copies (not encrypted)

**Acceptable because**:
- All data is public (will be published in research)
- No PII or financial data
- Single-server deployment

### 3. Cron Authentication

**Limitation**: CRON_SECRET visible in crontab file.

**Implications**:
- Any user on system can read secret
- Secret must match between crontab and app
- Changing secret requires updating both files

**Mitigation**:
- Single-user or trusted server environment
- File permissions restrict .env.local
- Consider wrapper script (see recommendations above)

---

## Vulnerability Disclosure

If you discover a security vulnerability, please:

1. **Do NOT** open a public GitHub issue
2. Email: [security contact - add if available]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)

We will respond within 48 hours and work on a fix.

---

## Security Best Practices for Developers

### Code Guidelines

1. **Never commit secrets**
   - Use environment variables
   - Check `.gitignore` includes `.env*.local`
   - Use `.env.example` for documentation only

2. **Validate all inputs**
   - Use TypeScript for type safety
   - Validate API request bodies
   - Sanitize SQL queries (use parameterized queries)

3. **Handle errors securely**
   - Don't expose stack traces in production
   - Log errors server-side
   - Return generic error messages to clients

4. **Use constant-time comparisons**
   - For password/secret comparison
   - Prevents timing attacks
   - Example: `secureCompare(a, b)` not `a === b`

### Dependencies

- Keep dependencies updated: `npm audit`
- Review dependency changes before updating
- Pin critical dependency versions
- Use `npm ci` in production (not `npm install`)

### Database

- All queries use parameterized statements
- Foreign key constraints enforced
- Transactions for multi-step operations
- Regular backups (automated via cron)

---

## Compliance Considerations

### GDPR / Privacy

**Data Collected**:
- Admin session cookies (temporary, not PII)
- LLM decision logs (prompts and responses - no PII)
- Market data from Polymarket (public information)
- System logs (API calls, errors - no PII)

**Data NOT Collected**:
- User personal information
- User financial information
- User behavioral tracking
- Third-party analytics

**Conclusion**: Minimal privacy concerns. All data is either public or operational.

### API Terms of Service

**OpenRouter**:
- Respect rate limits
- Use API key securely
- Monitor costs
- Attribution in research publications

**Polymarket**:
- Public API, no authentication required
- Respect rate limits (500 req/hour)
- No data scraping beyond stated purpose
- Market data used for research only

---

## Incident Response Plan

### If CRON_SECRET is Exposed

1. Generate new secret: `openssl rand -hex 32`
2. Update `.env.local`
3. Update `/etc/cron.d/forecasterarena`
4. Restart application: `sudo systemctl restart forecaster-arena` (or `pm2 restart`)
5. Monitor logs for unauthorized cron calls
6. Review recent cron job executions

### If ADMIN_PASSWORD is Exposed

1. Change password in `.env.local`
2. Restart application
3. Clear all admin sessions
4. Review admin dashboard access logs

### If OPENROUTER_API_KEY is Exposed

1. Revoke key at https://openrouter.ai/settings/keys
2. Generate new key
3. Update `.env.local`
4. Restart application
5. Monitor API usage for suspicious activity
6. Review recent API costs

### If Database is Compromised

1. Stop application immediately
2. Assess extent of compromise
3. Restore from known-good backup
4. Review all recent changes
5. Check for data exfiltration
6. Rotate all secrets
7. Document incident for analysis

---

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2024 | Internal | Default secrets, timing attacks | Fixed |
| - | - | Crontab permissions | Documented |

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#security)

---

**Last Updated**: 2025-12-11
**Version**: 1.0
