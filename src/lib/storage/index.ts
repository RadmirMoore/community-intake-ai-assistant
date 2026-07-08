import { LocalSubmissionStore } from "@/lib/storage/local-store";
import { SupabaseSubmissionStore } from "@/lib/storage/supabase-store";
import type { SubmissionStore } from "@/lib/storage/store";

let cached: SubmissionStore | null = null;

/**
 * Returns the active store. If Supabase env vars are present we use Postgres;
 * otherwise we transparently fall back to the local JSON store so the app works
 * with zero configuration. The choice is cached for the lifetime of the process.
 */
export function getStore(): SubmissionStore {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cached =
    url && serviceRoleKey
      ? new SupabaseSubmissionStore(url, serviceRoleKey)
      : new LocalSubmissionStore();

  return cached;
}

export type { SubmissionStore } from "@/lib/storage/store";

/** Test-only: clears the cached backend choice so tests can flip env vars between cases. */
export function __resetStoreForTests(): void {
  cached = null;
}
