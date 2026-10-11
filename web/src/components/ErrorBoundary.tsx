import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui";

type Props = {
  children: ReactNode;
  /** Optional label for logs / UI ("Call screen", etc.). */
  label?: string;
};

type State = {
  error: Error | null;
};

/** Keeps a render throw from blanking the whole app during a live demo. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="mx-auto max-w-lg space-y-3 px-4 py-10"
        role="alert"
        data-slot="error-boundary"
      >
        <h2 className="font-display text-2xl font-semibold text-teal-900">
          Something went wrong
        </h2>
        <p className="text-sm text-ink-muted">
          The {this.props.label ?? "screen"} hit an unexpected error. Your call
          may still be on the server — try reloading, or go back to practice.
        </p>
        <p className="rounded-md border border-line bg-surface-muted px-3 py-2 font-mono text-xs text-ink">
          {this.state.error.message || "Unknown render error"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
          <Button variant="accent" onClick={() => window.location.assign("/")}>
            Back to practice
          </Button>
        </div>
      </div>
    );
  }
}
