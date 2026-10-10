/** Format an error for one-line smoke output: never truncate the body. */
export function formatError(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return err.replace(/\s+/g, " ").trim();

  const e = err as {
    message?: string;
    body?: unknown;
    statusCode?: number;
    status?: number;
    code?: string;
    error?: unknown;
    rawResponse?: { body?: unknown };
  };

  const parts: string[] = [];
  if (e.statusCode != null || e.status != null) {
    parts.push(`status=${e.statusCode ?? e.status}`);
  }
  if (e.code) parts.push(`code=${e.code}`);
  if (e.message) parts.push(String(e.message));

  const body = e.body ?? e.error ?? e.rawResponse?.body;
  if (body != null) {
    const bodyStr =
      typeof body === "string" ? body : JSON.stringify(body);
    parts.push(`body=${bodyStr.replace(/\s+/g, " ").trim()}`);
  }

  // Prefer own enumerable props dump if we still have little detail
  if (parts.length === 0 || (parts.length === 1 && e.message && !body)) {
    try {
      const dump = JSON.stringify(err, Object.getOwnPropertyNames(err as object));
      if (dump && dump !== "{}") {
        return dump.replace(/\s+/g, " ").trim();
      }
    } catch {
      /* ignore */
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim() || String(err);
}

export function printResult(
  name: string,
  ok: boolean,
  detail: string,
  ms: number,
): void {
  const tag = ok ? "[OK]" : "[FAIL]";
  const extra = detail ? ` ${detail}` : "";
  // One line only — collapse newlines inside detail
  const line = `${tag} ${name}${extra} (${ms}ms)`.replace(/\r?\n/g, " ");
  console.log(line);
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const t0 = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t0 };
}
