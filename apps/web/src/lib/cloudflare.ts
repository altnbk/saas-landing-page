/**
 * Cloudflare Pages API service
 * Handles creation and deployment of Pages projects
 */

const CLOUDFLARE_API_TOKEN = import.meta.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = import.meta.env.CLOUDFLARE_ACCOUNT_ID;

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
  throw new Error('Missing required Cloudflare environment variables');
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareAPIResponse<T = any> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

export interface CreatePagesProjectParams {
  projectName: string;
  repoName: string;
  repoOwner: string;
}

export interface PagesProject {
  name: string;
  subdomain: string;
  domains: string[];
  source?: {
    type: string;
    config: {
      owner: string;
      repo_name: string;
      production_branch: string;
    };
  };
  deployment_configs: {
    production: {
      compatibility_date?: string;
    };
  };
}

export interface PagesDeployment {
  id: string;
  url: string;
  environment: string;
  deployment_trigger: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
    };
  };
  stages: Array<{
    name: string;
    status: string;
    started_on: string | null;
    ended_on: string | null;
  }>;
  build_config: {
    build_command: string;
    destination_dir: string;
  };
  created_on: string;
  latest_stage: {
    name: string;
    status: string;
  };
}

/**
 * Make a request to Cloudflare API
 */
async function cfRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<CloudflareAPIResponse<T>> {
  const url = `${CF_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMessage = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
    throw new Error(`Cloudflare API error: ${errorMessage}`);
  }

  return data;
}

/**
 * Create a new Pages project connected to a GitHub repository
 */
export async function createPagesProject(
  params: CreatePagesProjectParams
): Promise<PagesProject> {
  try {
    // Cloudflare Pages project names must be lowercase alphanumeric with hyphens
    const projectName = params.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const body = {
      name: projectName,
      production_branch: 'main',
      source: {
        type: 'github',
        config: {
          owner: params.repoOwner,
          repo_name: params.repoName,
          production_branch: 'main',
          deployments_enabled: true,
          pr_comments_enabled: false,
        },
      },
      build_config: {
        build_command: '',
        destination_dir: '/',
        root_dir: '/',
      },
      deployment_configs: {
        production: {
          compatibility_date: '2024-01-01',
        },
      },
    };

    const response = await cfRequest<PagesProject>(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return response.result;
  } catch (error: any) {
    console.error('Cloudflare Pages creation error:', error);
    throw new Error(`Failed to create Pages project: ${error.message}`);
  }
}

/**
 * Get a Pages project by name
 */
export async function getPagesProject(projectName: string): Promise<PagesProject | null> {
  try {
    const response = await cfRequest<PagesProject>(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}`
    );
    return response.result;
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get the latest deployment for a Pages project
 */
export async function getLatestDeployment(
  projectName: string
): Promise<PagesDeployment | null> {
  try {
    const response = await cfRequest<{ deployments: PagesDeployment[] }>(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`
    );

    const deployments = response.result.deployments;
    if (!deployments || deployments.length === 0) {
      return null;
    }

    // Return the most recent deployment
    return deployments[0];
  } catch (error: any) {
    console.error('Failed to get latest deployment:', error);
    return null;
  }
}

/**
 * Check deployment status
 */
export async function getDeploymentStatus(
  projectName: string,
  deploymentId: string
): Promise<PagesDeployment | null> {
  try {
    const response = await cfRequest<PagesDeployment>(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments/${deploymentId}`
    );
    return response.result;
  } catch (error: any) {
    console.error('Failed to get deployment status:', error);
    return null;
  }
}

/**
 * Wait for deployment to complete (with timeout)
 */
export async function waitForDeployment(
  projectName: string,
  deploymentId: string,
  maxAttempts: number = 30,
  delayMs: number = 5000
): Promise<{ status: string; url?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const deployment = await getDeploymentStatus(projectName, deploymentId);

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const status = deployment.latest_stage.status;

    if (status === 'success') {
      return {
        status: 'live',
        url: deployment.url,
      };
    }

    if (status === 'failure' || status === 'canceled') {
      return {
        status: 'failed',
      };
    }

    // Still in progress (idle, active, etc.)
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Timeout
  return {
    status: 'deploying',
  };
}

/**
 * Delete a Pages project (cleanup/testing)
 */
export async function deletePagesProject(projectName: string): Promise<void> {
  try {
    await cfRequest(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}`,
      {
        method: 'DELETE',
      }
    );
  } catch (error: any) {
    console.error('Failed to delete Pages project:', error);
    throw new Error(`Failed to delete Pages project: ${error.message}`);
  }
}
