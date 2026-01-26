# Known Issues & Limitations

This document outlines known issues and workarounds for the SaaS Landing Page Generator MVP.

## Critical: Cloudflare Pages GitHub Integration

### Issue
The Cloudflare Pages API integration has a critical prerequisite that prevents fully automated deployments without manual setup.

### Root Cause
Cloudflare requires explicit GitHub authorization at the account level before API-created Pages projects can connect to GitHub repositories. This authorization cannot be done via API - it must be done through the Cloudflare web UI.

### Impact
- Pages projects are created but without GitHub connection
- No automatic builds are triggered
- Landing page URLs return DNS or 522 errors
- Users must manually connect repos in Cloudflare UI

### Workaround
**Before using the app for the first time:**

1. Log into Cloudflare Dashboard
2. Go to Workers & Pages → Create Application
3. Select Pages → Connect to Git
4. Authorize GitHub when prompted
5. Complete the OAuth flow
6. You can cancel the project creation afterward

After this one-time setup, the app's API calls will successfully create Pages projects with GitHub connections.

### Code Implementation
The code now includes:
- Fallback logic: If GitHub source fails, creates project without source
- Warning logs when fallback occurs
- Documentation in code comments
- Setup guide instructions

See `apps/web/src/lib/cloudflare.ts` lines 106-150 for implementation details.

### Long-term Solution
Options for improvement:
1. **Manual connection step in UI**: Add a step in the app where users click through to Cloudflare to authorize
2. **Direct upload deployment**: Use Cloudflare's direct upload API instead of GitHub integration (bypasses GitHub entirely)
3. **Documentation**: Make GitHub authorization a clearer prerequisite in onboarding

## Email Failures Are Now Non-Blocking

### Issue (Fixed)
Previously, Resend API errors (e.g., invalid API key) would cause the entire deployment pipeline to fail.

### Fix
All email calls are now wrapped in try-catch blocks. Email failures are logged but don't propagate errors.

Location:
- `apps/web/src/pages/api/deployments/[id]/trigger-github.ts`
- `apps/web/src/pages/api/deployments/[id]/status.ts`

### Impact
Deployments now succeed even if email notifications fail. Errors are logged to console for debugging.

## URL Generation Bug (Fixed)

### Issue (Fixed)
Cloudflare's subdomain field sometimes includes `.pages.dev` suffix, causing double concatenation like `landing-xxx.pages.dev.pages.dev`.

### Fix
URL generation now strips `.pages.dev` from subdomain before concatenating:

```typescript
const subdomain = pagesProject.subdomain.replace(/\.pages\.dev$/, '');
pagesUrl = `https://${subdomain}.pages.dev`;
```

Location: `apps/web/src/pages/api/deployments/[id]/trigger-github.ts` line 153

## Status Polling Limitations

### Current Behavior
The app polls internal database status flags, not actual Cloudflare build status.

### Why This Matters
If Cloudflare deployment fails silently or gets stuck, the app status might not reflect reality.

### Improvement Needed
- Poll Cloudflare deployments API directly
- Compare Cloudflare build status with database status
- Update database when mismatches are detected

This is implemented in the status.ts endpoint but only called when user views the page. A background job would be better.

## Template Limitations

### Current State
Single HTML template at `packages/landing-template/index.html`.

### Limitations
- No template selection
- Limited customization options
- All pages look the same

### Future Improvements
- Multiple template options
- Color/font customization
- Custom CSS upload
- Component-based templates

## Security Notes

### XSS Protection
✅ All user inputs are HTML-escaped before rendering in templates

### RLS Policies
✅ Row Level Security enforced on all tables

### Secrets
✅ All credentials in environment variables, never in code

### Known Gaps
- No rate limiting on deployment creation
- No usage quotas per user
- No CSRF protection on forms (Astro auto-handles via SameSite cookies)

## Performance Considerations

### Current Limitations
1. **Synchronous GitHub repo creation**: Blocks HTTP response
2. **No queue system**: All operations in request/response cycle
3. **No retry logic**: Failed deployments require manual retry
4. **Cold starts**: First request after idle may be slow

### Recommended Improvements
1. Move to background job queue (e.g., Bull, BullMQ)
2. Add retry logic with exponential backoff
3. Implement webhook listeners for Cloudflare build events
4. Add deployment timeout handling

## Scalability Notes

### Current Design
MVP designed for low-volume usage (1-10 deployments per hour).

### Bottlenecks at Scale
1. **Database connections**: Supabase has connection limits
2. **API rate limits**: GitHub (5000/hr), Cloudflare (varies)
3. **Cold starts**: Serverless architecture has latency spikes
4. **No caching**: Every status check hits database + API

### Scale Recommendations
1. Add Redis for caching deployment status
2. Implement connection pooling
3. Add circuit breakers for external APIs
4. Consider background workers for deployments

## Testing Coverage

### What's Tested
- ✅ Manual end-to-end testing of full flow
- ✅ XSS escaping verified

### What's Not Tested
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E automation
- ❌ No load testing

### Recommendation
Add testing before scaling beyond MVP.

## Browser Compatibility

### Tested
- Chrome/Edge (latest)
- Firefox (latest)

### Not Tested
- Safari
- Mobile browsers
- Older browsers (IE11, etc.)

The app uses modern JavaScript (async/await, fetch) and should work in all modern browsers.

## Monitoring & Observability

### Current State
- Console logging only
- No error tracking
- No metrics/analytics
- No alerting

### Recommendations
1. Add Sentry or similar for error tracking
2. Add analytics for deployment success rates
3. Add alerts for failed deployments
4. Monitor API rate limit usage

## Known Edge Cases

### Multiple Simultaneous Deployments
Not tested. Possible race conditions if same user creates multiple deployments quickly.

### Very Long Organization Names
Template limits name length, but form doesn't validate max length.

### Special Characters in Names
HTML escaping handles XSS, but some special chars might break URLs.

### Repository Name Conflicts
Timestamp suffix makes collisions unlikely but not impossible.

## Support & Debugging

### Logs to Check
1. Browser console (client-side errors)
2. Server console (API errors)
3. Supabase logs (database errors)
4. Cloudflare logs (deployment errors)

### Common Debug Steps
1. Check all environment variables are set
2. Verify GitHub authorization status
3. Verify Cloudflare GitHub connection
4. Check Supabase RLS policies
5. Verify API tokens have correct permissions

## Reporting Issues

If you encounter issues:
1. Check this document for known issues
2. Check SETUP_GUIDE.md for prerequisites
3. Review server logs for specific errors
4. Check Cloudflare/GitHub/Supabase dashboards

For the MVP, manual debugging is expected. Production deployments should add proper error tracking.
