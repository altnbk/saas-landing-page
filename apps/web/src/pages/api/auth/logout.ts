import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();

  // Clear cookies
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });

  return redirect('/login');
};
