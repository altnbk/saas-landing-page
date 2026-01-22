// Database types matching the SQL schema

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export type DeploymentStatus =
  | 'queued'
  | 'creating_repo'
  | 'creating_pages'
  | 'deploying'
  | 'live'
  | 'failed';

export interface Deployment {
  id: string;
  user_id: string;
  organization_name: string;
  signer_name: string;
  signer_email: string;
  status: DeploymentStatus;
  github_repo_url?: string;
  pages_url?: string;
  pages_deployment_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type LogLevel = 'info' | 'warning' | 'error';

export interface DeploymentLog {
  id: string;
  deployment_id: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Form submission types
export interface DeploymentFormData {
  organization_name: string;
  signer_name: string;
  signer_email: string;
}

// Extended deployment type with logs
export interface DeploymentWithLogs extends Deployment {
  logs?: DeploymentLog[];
}
