export function CrisisBanner() {
  return (
    <aside
      className="border-b border-line bg-teal-950 px-4 py-2.5 text-center text-sm text-teal-50"
      role="note"
    >
      <span className="font-semibold text-amber-500">
        Training simulator only, not a crisis service.
      </span>{" "}
      <span className="text-teal-100/85">
        If you&apos;re in crisis, call or text{" "}
        <a
          className="font-semibold text-white underline decoration-amber-500/60 underline-offset-2 hover:decoration-amber-500"
          href="https://988lifeline.org"
          target="_blank"
          rel="noreferrer"
        >
          988
        </a>{" "}
        or chat at 988lifeline.org.
      </span>
    </aside>
  );
}
