import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CrisisBanner } from "./components/CrisisBanner";
import { Call } from "./pages/Call";
import { Debrief } from "./pages/Debrief";
import { Home } from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <CrisisBanner />
        <header className="border-b border-line/80 px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <a href="/" className="font-semibold tracking-tight text-ink">
              SteadyLine
              <span className="ml-2 font-mono text-xs font-normal uppercase tracking-wider text-ink-muted">
                Training simulator only
              </span>
            </a>
            <a
              href="https://988lifeline.org"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-signal hover:underline"
            >
              988 resources
            </a>
          </div>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/call/:id" element={<Call />} />
            <Route path="/debrief/:id" element={<Debrief />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
