import { defineMiddleware } from 'astro:middleware';
import { getSupabaseClient } from '../lib/supabase';

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route));

  if (isProtectedRoute) {
    // Check for access token in cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken) {
      // No token, redirect to login
      return redirect('/login');
    }

    // Verify the session is valid
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (error || !session) {
      // Invalid session, redirect to login
      return redirect('/login');
    }

    // Session is valid, continue
  }

  return next();
});
