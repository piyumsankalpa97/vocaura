import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../env";

/**
 * Creates a Supabase client with the admin secret key.
 * Bypasses Row Level Security (RLS).
 * MUST only be used in server environments for authorized administrative operations.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = getServerEnv();

  if (!SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required to initialize the admin client.",
    );
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
