import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
  );
}

/**
 * Fixed-window counter in Postgres. Returns true while the caller is under
 * `limit` hits per `windowSeconds`. One upsert per call; old windows are
 * pruned opportunistically.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db().execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, ${windowStart.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count
  `);
  if (Math.random() < 0.02) {
    await db().execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  }
  return Number(rows[0]?.count ?? 0) <= limit;
}
