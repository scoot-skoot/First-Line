export function printResult(
  name: string,
  ok: boolean,
  detail: string,
  ms: number,
): void {
  const tag = ok ? "[OK]" : "[FAIL]";
  const extra = detail ? ` ${detail}` : "";
  console.log(`${tag} ${name}${extra} (${ms}ms)`);
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const t0 = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t0 };
}

/** Full error body/message for smoke FAIL lines (no truncation, no secrets). */
export function formatError(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return err;

  const e = err as {
    message?: unknown;
    body?: unknown;
    response?: { data?: unknown; body?: unknown; statusText?: string };
    cause?: unknown;
    error?: unknown;
    statusCode?: number;
    status?: number;
    code?: string;
  };

  const parts: string[] = [];

  if (typeof e.message === "string" && e.message.trim()) {
    parts.push(e.message);
  }

  const body =
    e.body ??
    e.response?.data ??
    e.response?.body ??
    (typeof e.error === "object" ? e.error : undefined);

  if (body != null) {
    try {
      const text =
        typeof body === "string" ? body : JSON.stringify(body, null, 0);
      if (text && text !== "{}" && !parts.includes(text)) {
        parts.push(text);
      }
    } catch {
      parts.push(String(body));
    }
  }

  if (e.cause != null) {
    const causeText = formatError(e.cause);
    if (causeText && !parts.some((p) => p.includes(causeText))) {
      parts.push(`cause: ${causeText}`);
    }
  }

  if (typeof e.code === "string" && e.code) {
    parts.push(`code=${e.code}`);
  }
  if (typeof e.statusCode === "number") {
    parts.push(`status=${e.statusCode}`);
  } else if (typeof e.status === "number") {
    parts.push(`status=${e.status}`);
  }

  if (parts.length === 0) {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return parts.join(" | ");
}
