/**
 * Build a pg Pool config that won't fight Tiger/Neon `?sslmode=require`.
 *
 * node-pg treats `sslmode=require` in the URL as verify-full; that overrides
 * an explicit `ssl: { rejectUnauthorized: false }` and fails on hosted DBs
 * with a self-signed chain. Strip SSL query params and set ssl ourselves.
 */
export function pgPoolConfig(databaseUrl: string): {
  connectionString: string;
  ssl: { rejectUnauthorized: false } | undefined;
} {
  const connectionString = stripSslQueryParams(databaseUrl);
  return {
    connectionString,
    ssl: isLocalDatabaseHost(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
  };
}

/** Remove ssl / sslmode / sslrootcert / … query params from a connection URL. */
export function stripSslQueryParams(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl);
    for (const key of [...u.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("ssl")) {
        u.searchParams.delete(key);
      }
    }
    // Avoid a trailing "?" with an empty query.
    u.search = u.searchParams.toString();
    return u.toString();
  } catch {
    return databaseUrl
      .replace(/([?&])ssl[^=&]*=[^&]*/gi, "$1")
      .replace(/[?&]$/, "")
      .replace(/\?&/, "?");
  }
}

export function isLocalDatabaseHost(databaseUrl: string): boolean {
  try {
    const host = new URL(databaseUrl).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(databaseUrl);
  }
}

/** True when DATABASE_URL still looks like server/.env.example. */
export function isPlaceholderDatabaseUrl(databaseUrl: string): boolean {
  const trimmed = databaseUrl.trim();
  if (!trimmed) return true;
  if (/user:password@host\b/i.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return (
      u.hostname === "host" ||
      (u.username === "user" && u.password === "password")
    );
  } catch {
    return false;
  }
}
