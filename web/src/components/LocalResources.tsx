const RESOURCES = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call/text 988 · chat at 988lifeline.org",
    href: "https://988lifeline.org",
  },
  {
    name: "Crisis Text Line",
    detail: "Text HOME to 741741",
    href: "https://www.crisistextline.org",
  },
  {
    name: "SAMHSA locator",
    detail: "Find local treatment & support",
    href: "https://findtreatment.gov",
  },
  {
    name: "IAASP safe messaging",
    detail: "Guidance for talking about suicide safely",
    href: "https://suicidepreventionmessaging.org/safety",
  },
];

export function LocalResources() {
  return (
    <section className="rounded-2xl border border-line bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-ink-900">Local & national resources</h3>
      <ul className="mt-3 space-y-2.5">
        {RESOURCES.map((r) => (
          <li key={r.name}>
            <a
              href={r.href}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl px-1 py-1 hover:bg-teal-50"
            >
              <span className="block text-sm font-medium text-teal-700">{r.name}</span>
              <span className="block text-xs text-ink-500">{r.detail}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
