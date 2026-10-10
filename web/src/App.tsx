import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { CrisisBanner } from "./components/CrisisBanner";
import { FeaturePlaceholder } from "./pages/FeaturePlaceholder";
import { Call } from "./pages/Call";
import { Debrief } from "./pages/Debrief";
import { Home } from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <CrisisBanner />
        <AppHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/call/:id" element={<Call />} />
            <Route path="/debrief/:id" element={<Debrief />} />
            <Route
              path="/readiness"
              element={
                <FeaturePlaceholder
                  title="Readiness"
                  blurb="Track how ready you feel before and after practice shifts. This page is owned by the features agent — styling hooks live in web/src/ui/."
                />
              }
            />
            <Route
              path="/build-a-caller"
              element={
                <FeaturePlaceholder
                  title="Build-a-Caller"
                  blurb="Design practice callers for your next shift. This page is owned by the features agent — import tokens and components from web/src/ui/."
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
