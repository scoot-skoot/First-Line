import { Link } from "react-router-dom";
import { DistressCurveMark, Panel } from "../ui";

export function FeaturePlaceholder({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Panel className="animate-fade-up text-center">
        <DistressCurveMark className="mx-auto h-5 w-16" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-teal-900">
          {title}
        </h1>
        <p className="mt-3 text-ink-muted">{blurb}</p>
        <Link
          to="/"
          className="mt-6 inline-flex text-sm font-semibold text-teal-800 hover:underline"
        >
          ← Back to practice calls
        </Link>
      </Panel>
    </div>
  );
}
