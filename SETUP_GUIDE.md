# Setup Guide

Congratulations! Your SaaS Landing Page Generator MVP is complete. Follow this guide to get it running.

## What Was Built

A complete SaaS application that:
1. Authenticates users with Supabase magic links (passwordless)
2. Accepts form submissions (organization name, signer info)
3. Automatically creates GitHub repositories with custom landing pages
4. Deploys those pages to Cloudflare Pages
5. Shows real-time deployment status
6. Sends email notifications at each stage

## Prerequisites

You'll need accounts for:
- **Supabase** (database + authentication)
- **GitHub** (repository hosting)
- **Cloudflare** (Pages deployment)
- **Resend** (email delivery)

## Step-by-Step Setup

### 1. Create Your Accounts

#### Supabase
1. Go to https://supabase.com and create a free account
2. Create a new project
3. Note your project URL and anon key from Settings > API

#### GitHub
1. Go to GitHub Settings > Developer Settings > Personal Access Tokens
2. Create a new token (classic) with `repo` scope
3. Save the token securely

#### Cloudflare
1. Sign up at https://cloudflare.com
2. Go to Account > API Tokens
3. Create a token with "Cloudflare Pages - Edit" permissions
4. Note your Account ID (visible in the URL or on the Pages dashboard)

#### Resend
1. Sign up at https://resend.com
2. Create an API key
3. Verify your sending domain (or use the test domain for development)

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your credentials:
```bash
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GitHub
GITHUB_TOKEN=ghp_your_token_here
GITHUB_TEMPLATE_OWNER=your-github-username
GITHUB_TEMPLATE_REPO=landing-template

# Cloudflare
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id

# Resend
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=noreply@yourdomain.com

# App
PUBLIC_APP_URL=http://localhost:4321
```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - First: `supabase/migrations/001_initial_schema.sql`
   - Second: `supabase/migrations/002_rls_policies.sql`

See `supabase/README.md` for detailed instructions.

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:4321

## Testing the Flow

1. **Sign Up**: Go to `/login` and enter your email
2. **Check Email**: Click the magic link in your email
3. **Create Deployment**: Fill out the form on the dashboard
4. **Watch Progress**: The page will auto-refresh as deployment progresses
5. **Check Emails**: You'll receive 3 emails:
   - Deployment started
   - Deployment succeeded (with live URL)
   - Or deployment failed (with error details)

## Project Structure

```
saas-landing-page/
├── apps/web/               # Main Astro application
│   ├── src/
│   │   ├── pages/         # Routes (index, login, dashboard, API)
│   │   ├── layouts/       # Page layouts
│   │   ├── middleware/    # Auth middleware
│   │   └── lib/           # Services (GitHub, Cloudflare, Email)
├── packages/
│   ├── types/             # Shared TypeScript types
│   └── landing-template/  # HTML template for landing pages
├── supabase/
│   └── migrations/        # Database migrations
├── .env.example           # Environment variable template
├── IMPLEMENTATION_PLAN.md # Detailed technical plan
└── STATUS.md             # Project status and progress
```

## Key Files to Understand

- **`apps/web/src/lib/github.ts`** - GitHub API integration
- **`apps/web/src/lib/cloudflare.ts`** - Cloudflare Pages API
- **`apps/web/src/lib/email.ts`** - Resend email service
- **`apps/web/src/lib/template-renderer.ts`** - XSS-safe template rendering
- **`packages/landing-template/index.html`** - Landing page template
- **`supabase/migrations/`** - Database schema and RLS policies

## Security Features

✅ **No secrets in code** - All credentials in environment variables
✅ **Row Level Security** - Users can only access their own data
✅ **Server-side auth** - Protected routes verified on the server
✅ **XSS protection** - All user inputs HTML-escaped
✅ **SQL injection prevention** - Parameterized queries via Supabase

## Troubleshooting

### Magic Link Not Working
- Check your Supabase email settings
- Verify `PUBLIC_APP_URL` matches your callback URL
- Check spam folder

### GitHub Repo Creation Fails
- Verify your `GITHUB_TOKEN` has `repo` scope
- Check that `GITHUB_TEMPLATE_OWNER` is correct
- Ensure you have permission to create repos

### Cloudflare Deployment Fails
- Verify your API token has Pages Edit permissions
- Check that `CLOUDFLARE_ACCOUNT_ID` is correct
- Ensure the GitHub integration is authorized in Cloudflare

### Emails Not Sending
- Verify `RESEND_API_KEY` is valid
- Check that `FROM_EMAIL` is verified in Resend
- Look at server logs for Resend errors

## Production Deployment

To deploy to production:

1. **Deploy Astro App**: Deploy to Vercel, Cloudflare Pages, or similar
2. **Update Environment Variables**: Set all production values
3. **Update Callback URLs**: Update Supabase auth settings
4. **Set Up Domains**: Configure your custom domain
5. **Monitor Logs**: Watch for errors in production

## What's Next?

Potential improvements:
- Add custom template selection
- Implement usage limits per user
- Add analytics dashboard
- Support custom domains for landing pages
- Add payment integration
- Implement team collaboration features

## Need Help?

- Check `IMPLEMENTATION_PLAN.md` for technical details
- Review `STATUS.md` for what's been completed
- Read `supabase/README.md` for database setup
- Check `packages/landing-template/README.md` for template info

## Success Criteria ✅

All requirements met:
- [x] Users can log in via Supabase magic link
- [x] Users can submit deployment forms
- [x] System creates GitHub repos from templates
- [x] Landing pages deploy to Cloudflare Pages
- [x] Deployment status tracked in database
- [x] Status shown in dashboard with real-time updates
- [x] Email notifications sent for all events
- [x] All secrets in environment variables
- [x] Row Level Security enforced
- [x] XSS protection implemented

Your MVP is ready to use! 🎉
