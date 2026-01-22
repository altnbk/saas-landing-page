# Supabase Configuration

This directory contains database migrations and edge functions for the SaaS Landing Page Generator.

## Database Setup

### Running Migrations

You'll need to run these SQL migrations in your Supabase project dashboard or via the Supabase CLI.

#### Option 1: Via Supabase Dashboard (Easiest for MVP)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each migration file in order:
   - First: `migrations/001_initial_schema.sql`
   - Second: `migrations/002_rls_policies.sql`

#### Option 2: Via Supabase CLI

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Push migrations:
```bash
supabase db push
```

## Database Schema

### Tables

**profiles**
- Stores user profile information
- Automatically created when a user signs up (via trigger)
- RLS: Users can only view/update their own profile

**deployments**
- Stores deployment requests and status
- Linked to user via `user_id`
- RLS: Users can only view/create/update their own deployments

**deployment_logs**
- Stores logs for each deployment
- Linked to deployment via `deployment_id`
- RLS: Users can only view logs for their own deployments

## Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only access their own data
- Service role can perform admin operations
- Proper isolation between users

## Edge Functions

Edge functions will be added in Milestone 5 for background deployment processing.

## Testing the Schema

After running migrations, test the setup:

1. Sign up a new user via the app
2. Check that a profile is automatically created
3. Create a deployment via the dashboard
4. Verify the deployment appears in the database
5. Confirm RLS is working (user can only see their own data)
