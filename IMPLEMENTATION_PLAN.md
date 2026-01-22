# Implementation Plan: SaaS Landing Page Generator

## Overview
Build an MVP SaaS that allows users to create and deploy custom landing pages through an automated pipeline. Users authenticate via Supabase magic link, submit a form, and receive a deployed landing page on Cloudflare Pages with a unique URL.

## Tech Stack
- **Frontend**: Astro (server output mode for SSR)
- **Backend**: Supabase (Auth, Postgres, Edge Functions)
- **Deployments**: GitHub API + Cloudflare Pages API
- **Email**: Resend (simpler for MVP)
- **Package Manager**: pnpm
- **Repository Structure**: Monorepo (shared types/utils)

## Architecture

```
saas-landing-page/
├── apps/
│   └── web/              # Main Astro application
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.astro          # Landing page
│       │   │   ├── login.astro          # Login page
│       │   │   ├── auth/
│       │   │   │   └── callback.astro   # Auth callback
│       │   │   └── dashboard/
│       │   │       ├── index.astro      # Dashboard home
│       │   │       └── deployments/
│       │   │           └── [id].astro   # Deployment details
│       │   ├── components/
│       │   ├── layouts/
│       │   ├── middleware/              # Auth middleware
│       │   ├── lib/
│       │   │   ├── supabase.ts          # Supabase client
│       │   │   ├── github.ts            # GitHub API wrapper
│       │   │   ├── cloudflare.ts        # Cloudflare API wrapper
│       │   │   └── email.ts             # Resend email service
│       │   └── env.d.ts
│       └── public/
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── landing-template/ # Template for generated landing pages
│       └── index.html    # Template with placeholders
├── supabase/
│   ├── migrations/       # SQL migrations
│   └── functions/        # Edge functions (deployment worker)
├── .env.example
├── pnpm-workspace.yaml
├── IMPLEMENTATION_PLAN.md
└── STATUS.md
```

## Data Model

### Tables

**profiles**
- `id` (uuid, PK, references auth.users)
- `email` (text, not null)
- `full_name` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**deployments**
- `id` (uuid, PK, default uuid_generate_v4())
- `user_id` (uuid, FK -> profiles.id)
- `organization_name` (text, not null)
- `signer_name` (text, not null)
- `signer_email` (text, not null)
- `status` (text, not null) - 'queued', 'creating_repo', 'creating_pages', 'deploying', 'live', 'failed'
- `github_repo_url` (text)
- `pages_url` (text)
- `pages_deployment_id` (text)
- `error_message` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**deployment_logs**
- `id` (uuid, PK, default uuid_generate_v4())
- `deployment_id` (uuid, FK -> deployments.id, cascade delete)
- `level` (text, not null) - 'info', 'warning', 'error'
- `message` (text, not null)
- `metadata` (jsonb)
- `created_at` (timestamptz)

### RLS Policies
- Profiles: Users can only read/update their own profile
- Deployments: Users can only read/create their own deployments
- Deployment logs: Users can only read logs for their own deployments

## Deployment Pipeline

1. **User submits form** → Create deployment record (status: 'queued')
2. **Trigger Edge Function** → Process deployment asynchronously
3. **Create GitHub repo** → From template, unique name (status: 'creating_repo')
4. **Generate landing page** → Replace placeholders with user data
5. **Commit to repo** → Push generated files
6. **Create Cloudflare Pages project** → Connect to GitHub repo (status: 'creating_pages')
7. **Monitor deployment** → Poll Cloudflare API (status: 'deploying')
8. **Mark complete** → Update status to 'live' or 'failed'
9. **Send email notifications** → At each major step

## Milestones

### M1: Astro App + Supabase Auth + Dashboard Skeleton
**Goal**: Working authentication flow and basic dashboard layout

**Tasks**:
- [ ] Initialize Astro project with server output
- [ ] Set up pnpm workspace (monorepo structure)
- [ ] Add Supabase client library
- [ ] Create environment variables structure (.env.example)
- [ ] Implement magic link login page
- [ ] Implement auth callback handler
- [ ] Create auth middleware for protected routes
- [ ] Build dashboard layout with navigation
- [ ] Add logout functionality

**Deliverable**: User can log in with magic link and see empty dashboard

**Files**:
- `apps/web/` - Astro app structure
- `apps/web/src/middleware/auth.ts` - Server-side auth protection
- `apps/web/src/pages/login.astro`
- `apps/web/src/pages/dashboard/index.astro`
- `.env.example`

---

### M2: DB Schema + RLS + Form Submission
**Goal**: Users can submit deployment forms, data is saved securely

**Tasks**:
- [ ] Write SQL migrations for profiles, deployments, deployment_logs
- [ ] Implement RLS policies
- [ ] Create shared types package
- [ ] Build deployment creation form UI
- [ ] Implement form submission API endpoint
- [ ] Show deployments list in dashboard
- [ ] Add deployment detail page with logs
- [ ] Implement input sanitization (XSS prevention)

**Deliverable**: Users can submit forms, see their deployments in dashboard

**Files**:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `packages/types/src/index.ts`
- `apps/web/src/pages/dashboard/index.astro` - Form + list
- `apps/web/src/pages/dashboard/deployments/[id].astro`

---

### M3: GitHub Integration
**Goal**: Automatically create GitHub repositories from template

**Tasks**:
- [ ] Set up Octokit (GitHub API client)
- [ ] Create landing page template package
- [ ] Implement template rendering with user data (safe escaping)
- [ ] Build GitHub service: create repo, commit files
- [ ] Test repo creation flow
- [ ] Update deployment status tracking

**Deliverable**: Form submission creates a new GitHub repo with landing page

**Files**:
- `apps/web/src/lib/github.ts`
- `packages/landing-template/` - Template files
- `apps/web/src/lib/template-renderer.ts`

---

### M4: Cloudflare Pages Integration
**Goal**: Deploy created repos to Cloudflare Pages

**Tasks**:
- [ ] Set up Cloudflare API client
- [ ] Implement Pages project creation
- [ ] Link GitHub repo to Pages project
- [ ] Trigger initial deployment
- [ ] Store Pages URL in database

**Deliverable**: Repos are automatically deployed to Cloudflare Pages

**Files**:
- `apps/web/src/lib/cloudflare.ts`
- Updated deployment workflow

---

### M5: Background Worker + Status Polling
**Goal**: Async deployment processing with real-time status updates

**Tasks**:
- [ ] Create Supabase Edge Function for deployment worker
- [ ] Implement deployment orchestration logic
- [ ] Add Cloudflare deployment status polling
- [ ] Write logs to deployment_logs table
- [ ] Add UI polling/refresh for deployment status
- [ ] Handle error cases and retries

**Deliverable**: Deployments process asynchronously with status updates

**Files**:
- `supabase/functions/deploy-site/index.ts`
- Updated dashboard with polling

---

### M6: Email Notifications
**Goal**: Send email updates at key deployment stages

**Tasks**:
- [ ] Set up Resend client
- [ ] Create email templates (deployment started, succeeded, failed)
- [ ] Integrate email sending into deployment workflow
- [ ] Add email preferences (optional)
- [ ] Test email delivery

**Deliverable**: Users receive email notifications for their deployments

**Files**:
- `apps/web/src/lib/email.ts`
- Email templates (HTML)

---

## Security Considerations

### Secrets Management
- **Never commit**: Supabase keys, GitHub tokens, Cloudflare tokens, Resend keys
- **Environment variables**: All secrets in .env (gitignored)
- **Example file**: .env.example with placeholder values
- **Server-side only**: API keys never exposed to client

### Authentication
- **Magic links**: Supabase handles token generation/validation
- **Server-side checks**: Middleware validates session on protected routes
- **HTTP-only cookies**: Session stored securely

### Authorization
- **RLS enabled**: All tables have row-level security
- **User isolation**: Users can only access their own data
- **SQL injection**: Use parameterized queries (Supabase client handles this)

### XSS Prevention
- **Template escaping**: HTML-escape all user inputs in landing pages
- **CSP headers**: Content Security Policy headers
- **Astro auto-escaping**: Leverage Astro's built-in XSS protection

### API Rate Limiting
- **GitHub API**: Respect rate limits, handle 429 responses
- **Cloudflare API**: Use appropriate retry logic
- **Deployment throttling**: Limit deployments per user (future)

## Risk Analysis

### High Priority Risks

1. **GitHub API rate limits**
   - Mitigation: Use authenticated requests (5000/hour vs 60/hour)
   - Monitor rate limit headers
   - Queue deployments if necessary

2. **Cloudflare Pages deployment failures**
   - Mitigation: Comprehensive error handling
   - Retry logic with exponential backoff
   - Clear error messages to users

3. **Template injection vulnerabilities**
   - Mitigation: Strict HTML escaping for all user inputs
   - Use tested escaping libraries
   - Security review of template rendering

4. **Secret leakage**
   - Mitigation: .gitignore for .env files
   - Code review checklist
   - Never log sensitive values

### Medium Priority Risks

5. **Email deliverability**
   - Mitigation: Use Resend's verified domain
   - SPF/DKIM setup
   - Monitor bounce rates

6. **Supabase Edge Function cold starts**
   - Mitigation: Accept slight delay for MVP
   - Consider polling instead of webhooks initially

7. **Database connection limits**
   - Mitigation: Use Supabase connection pooling
   - Proper cleanup of connections

## Environment Variables Required

```bash
# Supabase
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub
GITHUB_TOKEN=              # Personal access token with repo scope
GITHUB_TEMPLATE_OWNER=     # Your GitHub username
GITHUB_TEMPLATE_REPO=      # Template repo name (optional)

# Cloudflare
CLOUDFLARE_API_TOKEN=      # API token with Pages write access
CLOUDFLARE_ACCOUNT_ID=     # Cloudflare account ID

# Resend
RESEND_API_KEY=            # Resend API key
FROM_EMAIL=                # Verified sender email

# App
PUBLIC_APP_URL=            # App base URL (for callbacks)
```

## Testing Strategy

### Manual Testing (MVP)
- Auth flow: magic link → callback → dashboard
- Form submission: validation, submission, DB record
- GitHub: repo creation, file commits
- Cloudflare: project creation, deployment
- Email: notifications sent and received
- Error handling: network failures, API errors

### Future Automated Testing
- Unit tests for service functions
- Integration tests for deployment pipeline
- E2E tests for critical user flows

## Deployment Strategy

### Development
- Local Supabase (optional, or use hosted)
- Local Astro dev server
- ngrok/Cloudflare Tunnel for webhook testing

### Production
- Astro app: Deploy to Vercel/Cloudflare Pages
- Supabase: Hosted project
- Edge Functions: Deploy via Supabase CLI
- GitHub: Create template repo in your account
- Cloudflare: Link account

## Success Criteria

- [ ] User can sign up/login with magic link
- [ ] User can submit deployment form
- [ ] System creates GitHub repo from template
- [ ] System deploys to Cloudflare Pages
- [ ] User sees deployment status in real-time
- [ ] User receives email notifications
- [ ] Landing page is live at unique URL
- [ ] Landing page correctly displays user data (escaped)
- [ ] No security vulnerabilities (XSS, SQL injection)
- [ ] No secrets in repository

## Timeline Estimate

This is an MVP with focused scope. Implementation is milestone-based, not time-based. Each milestone builds on the previous one.

## Next Steps

1. Create STATUS.md to track progress
2. Initialize pnpm workspace
3. Begin Milestone 1 implementation
