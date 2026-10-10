import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CrisisBanner } from "./components/CrisisBanner";
import { BuildCaller } from "./pages/BuildCaller";
import { Call } from "./pages/Call";
import { Debrief } from "./pages/Debrief";
import { Home } from "./pages/Home";
import { Readiness } from "./pages/Readiness";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <CrisisBanner />
        <header className="border-b border-line/80 bg-white/60 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <a href="/" className="font-display text-lg font-semibold tracking-tight text-ink-900">
              SteadyLine
              <span className="ml-2 font-sans text-xs font-medium uppercase tracking-wider text-ink-400">
                Training simulator only
              </span>
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/build" className="text-ink-500 hover:text-teal-700">
                Build a caller
              </a>
              <a
                href="https://988lifeline.org"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-teal-700 hover:underline"
              >
                988 resources
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/call/:id" element={<Call />} />
            <Route path="/debrief/:id" element={<Debrief />} />
            <Route path="/build" element={<BuildCaller />} />
            <Route path="/readiness/:traineeId" element={<Readiness />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
