/**
 * GitHub API service for repository management
 */

import { Octokit } from '@octokit/rest';
import { renderTemplate, generateRepoName } from './template-renderer';
import fs from 'fs/promises';
import path from 'path';

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_TEMPLATE_OWNER;

if (!GITHUB_TOKEN || !GITHUB_OWNER) {
  throw new Error('Missing required GitHub environment variables');
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export interface CreateRepoParams {
  organizationName: string;
  signerName: string;
  signerEmail: string;
}

export interface CreateRepoResult {
  repoUrl: string;
  repoName: string;
  htmlUrl: string;
}

/**
 * Create a new GitHub repository with landing page content
 */
export async function createLandingPageRepo(
  params: CreateRepoParams
): Promise<CreateRepoResult> {
  const repoName = generateRepoName(params.organizationName);

  try {
    // Step 1: Create the repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: `Landing page for ${params.organizationName}`,
      private: false,
      auto_init: false,
    });

    // Step 2: Read the template file
    const templatePath = path.join(
      process.cwd(),
      '..',
      '..',
      'packages',
      'landing-template',
      'index.html'
    );
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Step 3: Render the template with user data (XSS-safe)
    const renderedContent = renderTemplate(templateContent, {
      organizationName: params.organizationName,
      signerName: params.signerName,
      signerEmail: params.signerEmail,
    });

    // Step 4: Create README.md
    const readmeContent = `# ${params.organizationName}

Landing page for ${params.organizationName}.

**Contact:** ${params.signerName} (${params.signerEmail})

---

This landing page was automatically generated using Landing Page Generator.
`;

    // Step 5: Commit files to the repository
    // We'll use the Git Data API to create a tree and commit

    // Get the default branch's SHA (we need to create initial commit)
    // Since auto_init is false, we need to create the first commit manually

    // Create blobs for each file
    const [indexBlob, readmeBlob] = await Promise.all([
      octokit.git.createBlob({
        owner: GITHUB_OWNER,
        repo: repoName,
        content: Buffer.from(renderedContent).toString('base64'),
        encoding: 'base64',
      }),
      octokit.git.createBlob({
        owner: GITHUB_OWNER,
        repo: repoName,
        content: Buffer.from(readmeContent).toString('base64'),
        encoding: 'base64',
      }),
    ]);

    // Create a tree with the files
    const { data: tree } = await octokit.git.createTree({
      owner: GITHUB_OWNER,
      repo: repoName,
      tree: [
        {
          path: 'index.html',
          mode: '100644',
          type: 'blob',
          sha: indexBlob.data.sha,
        },
        {
          path: 'README.md',
          mode: '100644',
          type: 'blob',
          sha: readmeBlob.data.sha,
        },
      ],
    });

    // Create the commit
    const { data: commit } = await octokit.git.createCommit({
      owner: GITHUB_OWNER,
      repo: repoName,
      message: 'Initial commit: Add landing page',
      tree: tree.sha,
      parents: [],
    });

    // Update the reference to point to the new commit (create main branch)
    await octokit.git.createRef({
      owner: GITHUB_OWNER,
      repo: repoName,
      ref: 'refs/heads/main',
      sha: commit.sha,
    });

    return {
      repoUrl: repo.url,
      repoName: repo.name,
      htmlUrl: repo.html_url,
    };
  } catch (error: any) {
    console.error('GitHub API Error:', error);
    throw new Error(`Failed to create repository: ${error.message}`);
  }
}

/**
 * Check if a repository exists
 */
export async function checkRepoExists(repoName: string): Promise<boolean> {
  try {
    await octokit.repos.get({
      owner: GITHUB_OWNER,
      repo: repoName,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Delete a repository (cleanup/testing)
 */
export async function deleteRepo(repoName: string): Promise<void> {
  try {
    await octokit.repos.delete({
      owner: GITHUB_OWNER,
      repo: repoName,
    });
  } catch (error: any) {
    console.error('Failed to delete repository:', error);
    throw new Error(`Failed to delete repository: ${error.message}`);
  }
}
