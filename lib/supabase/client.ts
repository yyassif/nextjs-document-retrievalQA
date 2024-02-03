import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient<SupaTypes>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
