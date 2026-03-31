import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Get the D1 database binding from Cloudflare context.
 * Must be called within a request context (Server Component, API Route, Server Action).
 */
export function getDB() {
  const { env } = getCloudflareContext();
  return env.DB;
}
