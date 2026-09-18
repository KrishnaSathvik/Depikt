import type { UntypedSupabaseClient } from "../db-types.ts";
import type { GroundingCache } from "./service.ts";

export function createGroundingCache(db: UntypedSupabaseClient, userId: string): GroundingCache {
  return {
    async get(key) {
      const { data, error } = await db
        .from("generation_grounding_cache")
        .select("snapshot")
        .eq("user_id", userId)
        .eq("query_hash", key)
        .maybeSingle();
      if (error) throw new Error("Could not load research cache");
      return data?.snapshot ?? null;
    },
    async set(key, value) {
      const { error } = await db
        .from("generation_grounding_cache")
        .upsert(
          { user_id: userId, query_hash: key, snapshot: value },
          { onConflict: "user_id,query_hash" },
        );
      if (error) throw new Error("Could not save research cache");
    },
  };
}
