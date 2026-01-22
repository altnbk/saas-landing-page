-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (handled by trigger)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Deployments policies
-- Users can view their own deployments
CREATE POLICY "Users can view own deployments"
  ON deployments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own deployments
CREATE POLICY "Users can create own deployments"
  ON deployments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own deployments
CREATE POLICY "Users can update own deployments"
  ON deployments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Deployment logs policies
-- Users can view logs for their own deployments
CREATE POLICY "Users can view logs for own deployments"
  ON deployment_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deployments
      WHERE deployments.id = deployment_logs.deployment_id
      AND deployments.user_id = auth.uid()
    )
  );

-- Service role can insert logs (for backend operations)
CREATE POLICY "Service role can insert logs"
  ON deployment_logs FOR INSERT
  WITH CHECK (true);

-- Service role can update logs
CREATE POLICY "Service role can update logs"
  ON deployment_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);
