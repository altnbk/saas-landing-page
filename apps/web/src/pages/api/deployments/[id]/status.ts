/**
 * API endpoint to check and update deployment status
 * This polls Cloudflare for the deployment status and updates the database
 */

import type { APIRoute } from 'astro';
import { getSupabaseClient, getSupabaseAdmin } from '../../../../lib/supabase';
import { getDeploymentStatus } from '../../../../lib/cloudflare';
import { sendDeploymentSuccessEmail, sendDeploymentFailedEmail } from '../../../../lib/email';

export const GET: APIRoute = async ({ params, cookies }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Deployment ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify user authentication
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use admin client for database operations
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch the deployment (verify ownership)
    const { data: deployment, error: fetchError } = await supabaseAdmin
      .from('deployments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !deployment) {
      return new Response(JSON.stringify({ error: 'Deployment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email || '';

    // If deployment is already in a final state, just return current status
    if (deployment.status === 'live' || deployment.status === 'failed') {
      return new Response(
        JSON.stringify({
          status: deployment.status,
          pagesUrl: deployment.pages_url,
          errorMessage: deployment.error_message,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // If we have a Pages deployment ID, check its status
    if (deployment.pages_deployment_id && deployment.github_repo_url) {
      try {
        // Extract project name from repo URL or use stored name
        const repoName = deployment.github_repo_url.split('/').pop() || '';
        const projectName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        const cfDeployment = await getDeploymentStatus(
          projectName,
          deployment.pages_deployment_id
        );

        if (cfDeployment) {
          const cfStatus = cfDeployment.latest_stage.status;

          if (cfStatus === 'success' && deployment.status !== 'live') {
            // Deployment succeeded
            await supabaseAdmin
              .from('deployments')
              .update({
                status: 'live',
                updated_at: new Date().toISOString(),
              })
              .eq('id', id);

            await supabaseAdmin.from('deployment_logs').insert({
              deployment_id: id,
              level: 'info',
              message: 'Deployment completed successfully!',
            });

            // Send success email
            if (userEmail && deployment.pages_url && deployment.github_repo_url) {
              await sendDeploymentSuccessEmail(
                userEmail,
                deployment.organization_name,
                id,
                deployment.pages_url,
                deployment.github_repo_url
              );
            }

            return new Response(
              JSON.stringify({
                status: 'live',
                pagesUrl: deployment.pages_url,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          } else if (
            (cfStatus === 'failure' || cfStatus === 'canceled') &&
            deployment.status !== 'failed'
          ) {
            // Deployment failed
            await supabaseAdmin
              .from('deployments')
              .update({
                status: 'failed',
                error_message: 'Cloudflare deployment failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', id);

            await supabaseAdmin.from('deployment_logs').insert({
              deployment_id: id,
              level: 'error',
              message: 'Deployment failed on Cloudflare Pages',
            });

            // Send failure email
            if (userEmail) {
              await sendDeploymentFailedEmail(
                userEmail,
                deployment.organization_name,
                id,
                'Cloudflare deployment failed'
              );
            }

            return new Response(
              JSON.stringify({
                status: 'failed',
                errorMessage: 'Cloudflare deployment failed',
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } catch (error: any) {
        console.error('Error checking Cloudflare status:', error);
        // Don't fail the request, just return current status
      }
    }

    // Return current status
    return new Response(
      JSON.stringify({
        status: deployment.status,
        pagesUrl: deployment.pages_url,
        errorMessage: deployment.error_message,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
