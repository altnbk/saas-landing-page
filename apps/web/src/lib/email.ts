/**
 * Email service using Resend
 * Sends notifications for deployment events
 */

import { Resend } from 'resend';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM_EMAIL = import.meta.env.FROM_EMAIL || 'noreply@example.com';

if (!RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set - emails will not be sent');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface SendDeploymentEmailParams {
  to: string;
  organizationName: string;
  deploymentId: string;
  status: 'started' | 'success' | 'failed';
  pagesUrl?: string;
  repoUrl?: string;
  errorMessage?: string;
}

/**
 * Generate HTML email content for deployment notifications
 */
function generateEmailHTML(params: SendDeploymentEmailParams): string {
  const { organizationName, deploymentId, status, pagesUrl, repoUrl, errorMessage } = params;

  const statusColors = {
    started: '#3b82f6',
    success: '#10b981',
    failed: '#ef4444',
  };

  const statusText = {
    started: 'Deployment Started',
    success: 'Deployment Successful',
    failed: 'Deployment Failed',
  };

  const color = statusColors[status];
  const title = statusText[status];

  let content = '';

  if (status === 'started') {
    content = `
      <p>Your landing page deployment has been initiated and is now in progress.</p>
      <p><strong>Organization:</strong> ${organizationName}</p>
      <p>We'll send you another email once the deployment is complete.</p>
    `;
  } else if (status === 'success') {
    content = `
      <p>Great news! Your landing page has been successfully deployed.</p>
      <p><strong>Organization:</strong> ${organizationName}</p>
      ${pagesUrl ? `<p><strong>Live URL:</strong> <a href="${pagesUrl}" style="color: #3b82f6;">${pagesUrl}</a></p>` : ''}
      ${repoUrl ? `<p><strong>GitHub Repository:</strong> <a href="${repoUrl}" style="color: #3b82f6;">${repoUrl}</a></p>` : ''}
      <p>Your landing page is now live and ready to share!</p>
    `;
  } else if (status === 'failed') {
    content = `
      <p>Unfortunately, there was an issue deploying your landing page.</p>
      <p><strong>Organization:</strong> ${organizationName}</p>
      ${errorMessage ? `<p><strong>Error:</strong> ${errorMessage}</p>` : ''}
      <p>Please check the deployment details in your dashboard or contact support if the issue persists.</p>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Landing Page Generator</h1>
        </div>

        <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 30px;">
          <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px; color: ${color};">${title}</h2>
          </div>

          ${content}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Deployment ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${deploymentId}</code>
            </p>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${import.meta.env.PUBLIC_APP_URL}/dashboard/deployments/${deploymentId}"
               style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
              View Deployment Details
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>You're receiving this email because you created a deployment on Landing Page Generator.</p>
          <p style="margin-top: 10px;">&copy; 2026 Landing Page Generator</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate plain text email content
 */
function generateEmailText(params: SendDeploymentEmailParams): string {
  const { organizationName, deploymentId, status, pagesUrl, repoUrl, errorMessage } = params;

  let content = '';

  if (status === 'started') {
    content = `
Your landing page deployment has been initiated and is now in progress.

Organization: ${organizationName}
Deployment ID: ${deploymentId}

We'll send you another email once the deployment is complete.
    `;
  } else if (status === 'success') {
    content = `
Great news! Your landing page has been successfully deployed.

Organization: ${organizationName}
Deployment ID: ${deploymentId}
${pagesUrl ? `Live URL: ${pagesUrl}` : ''}
${repoUrl ? `GitHub Repository: ${repoUrl}` : ''}

Your landing page is now live and ready to share!
    `;
  } else if (status === 'failed') {
    content = `
Unfortunately, there was an issue deploying your landing page.

Organization: ${organizationName}
Deployment ID: ${deploymentId}
${errorMessage ? `Error: ${errorMessage}` : ''}

Please check the deployment details in your dashboard or contact support if the issue persists.
    `;
  }

  return content.trim();
}

/**
 * Send a deployment notification email
 */
export async function sendDeploymentEmail(params: SendDeploymentEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not initialized - skipping email');
    return false;
  }

  try {
    const subject = {
      started: `Deployment Started: ${params.organizationName}`,
      success: `Deployment Successful: ${params.organizationName}`,
      failed: `Deployment Failed: ${params.organizationName}`,
    }[params.status];

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject,
      html: generateEmailHTML(params),
      text: generateEmailText(params),
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send deployment started email
 */
export async function sendDeploymentStartedEmail(
  to: string,
  organizationName: string,
  deploymentId: string,
  repoUrl: string
): Promise<boolean> {
  return sendDeploymentEmail({
    to,
    organizationName,
    deploymentId,
    status: 'started',
    repoUrl,
  });
}

/**
 * Send deployment success email
 */
export async function sendDeploymentSuccessEmail(
  to: string,
  organizationName: string,
  deploymentId: string,
  pagesUrl: string,
  repoUrl: string
): Promise<boolean> {
  return sendDeploymentEmail({
    to,
    organizationName,
    deploymentId,
    status: 'success',
    pagesUrl,
    repoUrl,
  });
}

/**
 * Send deployment failed email
 */
export async function sendDeploymentFailedEmail(
  to: string,
  organizationName: string,
  deploymentId: string,
  errorMessage: string
): Promise<boolean> {
  return sendDeploymentEmail({
    to,
    organizationName,
    deploymentId,
    status: 'failed',
    errorMessage,
  });
}
