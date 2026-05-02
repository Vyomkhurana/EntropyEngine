import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchFactories, fetchFactory, fetchBusinessOverview, fetchRevenue } from "../services/api";

const FactoriesContext = createContext(null);

export function FactoriesProvider({ children }) {
  const [factories, setFactories] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadFactories() {
    setLoading(true);
    try {
      const data = await fetchFactories();
      setFactories(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverview() {
    const data = await fetchBusinessOverview();
    setOverview(data);
  }

  useEffect(() => {
    loadFactories();
    loadOverview();
    // lightweight polling for demo
    const t = setInterval(loadOverview, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <FactoriesContext.Provider value={{ factories, overview, loading, reload: loadFactories, fetchFactory, fetchRevenue }}>
      {children}
    </FactoriesContext.Provider>
  );
}

export function useFactories() {
  const ctx = useContext(FactoriesContext);
  if (!ctx) throw new Error("useFactories must be used inside FactoriesProvider");
  return ctx;
}

export default FactoriesContext;
