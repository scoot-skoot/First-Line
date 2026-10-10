export function CrisisBanner() {
  return (
    <aside
      className="border-b border-line bg-console-950/90 px-4 py-2.5 text-center text-sm text-ink backdrop-blur"
      role="note"
    >
      <span className="font-medium text-signal">Training simulator only, not a crisis service.</span>{" "}
      <span className="text-ink-muted">
        If you or someone you know is struggling, call or text{" "}
        <a
          className="font-semibold text-ink underline decoration-signal/50 underline-offset-2 hover:text-signal"
          href="https://988lifeline.org"
          target="_blank"
          rel="noreferrer"
        >
          988
        </a>{" "}
        or chat at 988lifeline.org. In an emergency, call 911.
      </span>
    </aside>
  );
}
