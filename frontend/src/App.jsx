import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useMetrics } from "./hooks/useMetrics";
import { FactoriesProvider } from "./context/FactoriesContext";
import LandingPage from "./pages/LandingPage";
import CentralBusinessDashboard from "./pages/CentralBusinessDashboard";
import FactoryList from "./pages/FactoryList";
import FactoryDetail from "./pages/FactoryDetail";
import Analytics from "./pages/Analytics";
import MainLayout from "./layouts/MainLayout";

export default function App() {
  const { state, connected } = useMetrics(1000);
  const [aiEnabled, setAiEnabled] = useState(false);

  const metrics = state?.metrics || {};
  const effectiveAI = state?.ai_mode ?? aiEnabled;

  return (
    <FactoriesProvider>
      <Routes>
        <Route path="/" element={<LandingPage connected={connected} metrics={metrics} aiActive={effectiveAI} />} />
        <Route element={<MainLayout state={state} connected={connected} />}>
          <Route path="/dashboard" element={<CentralBusinessDashboard />} />
          <Route path="/factories" element={<FactoryList />} />
          <Route path="/factory/:id" element={<FactoryDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FactoriesProvider>
  );
}
