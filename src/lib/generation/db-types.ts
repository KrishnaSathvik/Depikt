// Local type overlay for the generation tables/RPCs.
//
// src/integrations/supabase/types.ts is auto-generated from the live
// Supabase schema (CLAUDE.md: "don't edit manually") and cannot know about
// generation_jobs, generation_sessions, image_versions, or the RPCs added
// in supabase/migrations/20260910{12,13,14}0000_*.sql until those
// migrations are applied to the linked project and types are regenerated.
//
// A hand-written structural overlay was tried first and abandoned: mixing
// a real generated Database type with hand-added table/function shapes via
// intersection defeats postgrest-js's generic inference (it collapses to
// `never` rather than merging), so every call site errors regardless of
// how carefully the added shapes are written. Fighting that generic
// machinery isn't worth it for a schema that's intentionally temporary.
//
// So this file does the narrower, honest thing: one named, loosely-typed
// escape hatch, used only by the generation server modules, with each
// query call typed at its call site via an explicit row-shape generic
// (still real type-checking of the *application* code — the reads/writes
// this file's callers construct — just not routed through the generated
// Database contract). Delete asGenerationClient once types.ts is
// regenerated post-migration and switch callers back to the real
// SupabaseClient<Database>; that's a mechanical, localized change.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch, see file comment above
export type UntypedSupabaseClient = SupabaseClient<any, any, any>;

export function asGenerationClient(supabase: SupabaseClient<Database>): UntypedSupabaseClient {
  return supabase as unknown as UntypedSupabaseClient;
}
