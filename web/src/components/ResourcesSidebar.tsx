const RESOURCES = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988 · chat at 988lifeline.org",
    href: "https://988lifeline.org",
  },
  {
    name: "Crisis Text Line",
    detail: "Text HOME to 741741",
    href: "https://www.crisistextline.org",
  },
  {
    name: "Find local help",
    detail: "SAMHSA behavioral health treatment locator",
    href: "https://findtreatment.samhsa.gov",
  },
  {
    name: "IASP resources",
    detail: "International Association for Suicide Prevention",
    href: "https://www.iasp.info/suicidalthoughts/",
  },
];

export function ResourcesSidebar() {
  return (
    <ul className="space-y-2">
      {RESOURCES.map((r) => (
        <li key={r.name}>
          <a
            href={r.href}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-line bg-surface px-3 py-2 transition hover:border-teal-700/30 hover:bg-teal-50"
          >
            <span className="block text-sm font-medium text-ink">{r.name}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">{r.detail}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
