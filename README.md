# SaaS Landing Page Generator

Automated landing page generation and deployment platform built with Astro, Supabase, and Cloudflare Pages.

## Features

- 🔐 Passwordless authentication with Supabase magic links
- 📝 Simple form-based landing page creation
- 🚀 Automated deployment to Cloudflare Pages
- 📧 Email notifications for deployment status
- 📊 Dashboard for tracking deployments

## Tech Stack

- **Frontend**: Astro (SSR mode)
- **Backend**: Supabase (Auth + Postgres + Edge Functions)
- **Deployment**: GitHub API + Cloudflare Pages
- **Email**: Resend
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account
- GitHub personal access token
- Cloudflare account
- Resend account

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies:

```bash
pnpm install
```

4. Start the development server:

```bash
pnpm dev
```

5. Visit `http://localhost:4321`

## Project Structure

```
saas-landing-page/
├── apps/
│   └── web/                 # Main Astro application
├── packages/
│   ├── types/              # Shared TypeScript types
│   └── landing-template/   # Landing page templates
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── IMPLEMENTATION_PLAN.md  # Detailed implementation plan
└── STATUS.md              # Current project status
```

## Development Progress

See [STATUS.md](STATUS.md) for current progress and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full roadmap.

## Security

- All secrets are stored in environment variables
- Row-level security (RLS) enabled on all database tables
- Server-side authentication checks
- XSS prevention with HTML escaping

## License

MIT