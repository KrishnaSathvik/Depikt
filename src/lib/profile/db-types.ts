// Row shape for the profiles table (supabase/migrations/20260912100000_*).
// src/integrations/supabase/types.ts won't know about it until the
// migration is applied and types are regenerated -- same loosely-typed
// client escape hatch as generation/billing (see
// src/lib/generation/db-types.ts).

export type { UntypedSupabaseClient } from "@/lib/generation/db-types";
export { asGenerationClient as asProfileClient } from "@/lib/generation/db-types";

export interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_seed: string;
  avatar_variant: string;
  created_at: string;
  updated_at: string;
}
