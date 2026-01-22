/**
 * API endpoint to trigger GitHub repository creation for a deployment
 */

import type { APIRoute } from 'astro';
import { getSupabaseClient, getSupabaseAdmin } from '../../../../lib/supabase';
import { createLandingPageRepo } from '../../../../lib/github';
import { createPagesProject, getLatestDeployment } from '../../../../lib/cloudflare';
import { sendDeploymentStartedEmail, sendDeploymentSuccessEmail, sendDeploymentFailedEmail } from '../../../../lib/email';

export const POST: APIRoute = async ({ params, cookies, request }) => {
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

    // Check if already processed
    if (deployment.status !== 'queued') {
      return new Response(
        JSON.stringify({ error: 'Deployment already processed', status: deployment.status }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Update status to creating_repo
    await supabaseAdmin
      .from('deployments')
      .update({ status: 'creating_repo', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Log: Starting GitHub repo creation
    await supabaseAdmin.from('deployment_logs').insert({
      deployment_id: id,
      level: 'info',
      message: 'Starting GitHub repository creation',
    });

    // Create GitHub repository
    let repoResult;
    try {
      repoResult = await createLandingPageRepo({
        organizationName: deployment.organization_name,
        signerName: deployment.signer_name,
        signerEmail: deployment.signer_email,
      });

      // Log: Repository created
      await supabaseAdmin.from('deployment_logs').insert({
        deployment_id: id,
        level: 'info',
        message: `GitHub repository created: ${repoResult.repoName}`,
        metadata: { repo_url: repoResult.htmlUrl },
      });

      // Send deployment started email
      if (userEmail) {
        await sendDeploymentStartedEmail(
          userEmail,
          deployment.organization_name,
          id,
          repoResult.htmlUrl
        );
      }

      // Update deployment with GitHub info
      await supabaseAdmin
        .from('deployments')
        .update({
          github_repo_url: repoResult.htmlUrl,
          status: 'creating_pages',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Step 2: Create Cloudflare Pages project
      let pagesProject;
      let pagesUrl;
      try {
        // Log: Starting Cloudflare Pages creation
        await supabaseAdmin.from('deployment_logs').insert({
          deployment_id: id,
          level: 'info',
          message: 'Creating Cloudflare Pages project',
        });

        pagesProject = await createPagesProject({
          projectName: repoResult.repoName,
          repoName: repoResult.repoName,
          repoOwner: import.meta.env.GITHUB_TEMPLATE_OWNER,
        });

        pagesUrl = `https://${pagesProject.subdomain}.pages.dev`;

        // Log: Pages project created
        await supabaseAdmin.from('deployment_logs').insert({
          deployment_id: id,
          level: 'info',
          message: `Cloudflare Pages project created: ${pagesProject.name}`,
          metadata: { pages_url: pagesUrl },
        });

        // Update deployment with Pages info and set status to deploying
        await supabaseAdmin
          .from('deployments')
          .update({
            pages_url: pagesUrl,
            status: 'deploying',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        // Wait a bit for initial deployment to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check for deployment
        const latestDeployment = await getLatestDeployment(pagesProject.name);

        if (latestDeployment) {
          await supabaseAdmin.from('deployment_logs').insert({
            deployment_id: id,
            level: 'info',
            message: `Deployment started. Status: ${latestDeployment.latest_stage.status}`,
            metadata: { deployment_id: latestDeployment.id },
          });

          await supabaseAdmin
            .from('deployments')
            .update({
              pages_deployment_id: latestDeployment.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          // Check if deployment is already complete
          if (latestDeployment.latest_stage.status === 'success') {
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
            if (userEmail) {
              await sendDeploymentSuccessEmail(
                userEmail,
                deployment.organization_name,
                id,
                pagesUrl,
                repoResult.htmlUrl
              );
            }
          }
        }

      } catch (cfError: any) {
        // Log Cloudflare error
        await supabaseAdmin.from('deployment_logs').insert({
          deployment_id: id,
          level: 'error',
          message: `Failed to create Cloudflare Pages project: ${cfError.message}`,
        });

        // Update deployment status to failed
        await supabaseAdmin
          .from('deployments')
          .update({
            status: 'failed',
            error_message: `Cloudflare error: ${cfError.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        // Send failure email
        if (userEmail) {
          await sendDeploymentFailedEmail(
            userEmail,
            deployment.organization_name,
            id,
            `Cloudflare error: ${cfError.message}`
          );
        }

        return new Response(
          JSON.stringify({
            error: 'GitHub repository created but Cloudflare Pages setup failed',
            details: cfError.message,
            repoUrl: repoResult.htmlUrl
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          repoUrl: repoResult.htmlUrl,
          repoName: repoResult.repoName,
          pagesUrl: pagesUrl,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      // Log error
      await supabaseAdmin.from('deployment_logs').insert({
        deployment_id: id,
        level: 'error',
        message: `Failed to create GitHub repository: ${error.message}`,
      });

      // Update deployment status to failed
      await supabaseAdmin
        .from('deployments')
        .update({
          status: 'failed',
          error_message: `GitHub error: ${error.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Send failure email
      if (userEmail) {
        await sendDeploymentFailedEmail(
          userEmail,
          deployment.organization_name,
          id,
          `GitHub error: ${error.message}`
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create GitHub repository', details: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
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
