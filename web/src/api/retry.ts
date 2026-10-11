/** Retry a fetch when the API isn't up yet (e.g. Vite loads before Express). */
export async function withStartupRetry<T>(
  run: () => Promise<T>,
  opts?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 6;
  const delayMs = opts?.delayMs ?? 350;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (err) {
      last = err;
      if (!isRetryableStartupError(err) || i === attempts - 1) throw err;
      await sleep(delayMs * (i + 1));
    }
  }
  throw last;
}

function isRetryableStartupError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // HTTP responses from a live server — don't retry auth/validation.
  if ("status" in err && typeof (err as { status?: number }).status === "number") {
    const status = (err as { status: number }).status;
    return status === 502 || status === 503 || status === 504;
  }
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("network request failed") ||
    err.name === "TypeError"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
