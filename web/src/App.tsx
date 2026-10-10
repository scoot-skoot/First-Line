import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { CrisisBanner } from "./components/CrisisBanner";
import { BuildCallerPage } from "./features/build-a-caller/BuildCallerPage";
import { ReadinessPage } from "./features/readiness/ReadinessPage";
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
            <Route path="/readiness" element={<ReadinessPage />} />
            <Route path="/build-a-caller" element={<BuildCallerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
