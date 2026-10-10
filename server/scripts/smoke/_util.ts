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
