import { createClient } from "@supabase/supabase-js";

// Browser/client-side Supabase client. Env vars set in .env.local (see .env.example).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-key-not-set",
);
