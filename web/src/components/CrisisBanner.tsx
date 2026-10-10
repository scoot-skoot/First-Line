export function CrisisBanner() {
  return (
    <aside
      className="border-b border-line bg-teal-50/90 px-4 py-2.5 text-center text-sm text-ink-700 backdrop-blur"
      role="note"
    >
      <span className="font-semibold text-teal-700">
        Training simulator only, not a crisis service.
      </span>{" "}
      <span>
        If you or someone you know is struggling, call or text{" "}
        <a
          className="font-semibold text-teal-700 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-600"
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
