import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchState, fetchFactories, fetchFactory, toggleAI as toggleAIRequest } from '../services/api';

const SimulationContext = createContext(null);
const GLOBAL_AI_KEY = 'entropy-global-ai-enabled';

function toFactoryMap(factories, metrics, aiEnabled, safetyLevel) {
  const map = {};
  (factories || []).forEach((f) => {
    map[String(f.id)] = {
      id: String(f.id),
      name: f.name || `Plant ${f.id}`,
      location: f.location || 'Industrial Zone',
      aiEnabled,
      power: metrics.power_output || 0,
      efficiency: metrics.efficiency_pct || 0,
      temperature: metrics.temperature || 0,
      pressure: metrics.pressure || 0,
      valve: metrics.valve_position || 0,
      monthly_savings_usd: f.monthly_savings_usd || 0,
      monthly_revenue_usd: f.monthly_revenue_usd || 0,
      potential_savings_usd: 0,
      baseline_monthly_value_usd: 0,
      optimized_monthly_value_usd: 0,
      alerts: safetyLevel === 'CRITICAL'
        ? [{ level: 'critical', message: 'Safety limits are active. Optimization constrained.' }]
        : safetyLevel === 'WARNING'
          ? [{ level: 'amber', message: 'Safety warning: monitor pressure and temperature.' }]
          : [],
      recommendations: [],
      lastUpdate: Date.now(),
    };
  });
  return map;
}

function mapBusiness(rawBusiness, metrics, aiEnabled) {
  const powerKw = Number(metrics?.power_output || 0);
  const efficiencyPct = Number(metrics?.efficiency_pct || 0);
  const baselineEfficiency = 76;
  const gridCostPerKwh = 0.12;
  const hoursPerMonth = 24 * 30;

  const telemetryMonthlySavings = Math.max(0, powerKw * gridCostPerKwh * hoursPerMonth);
  const efficiencyBonus = Math.max(0, efficiencyPct - baselineEfficiency) * 350;
  const monthlySavings = aiEnabled
    ? Math.max(rawBusiness.monthly_savings_usd || 0, telemetryMonthlySavings + efficiencyBonus)
    : 0;
  const potentialSavings = Math.max(
    rawBusiness.potential_monthly_savings_usd || 0,
    telemetryMonthlySavings * 1.35 + Math.max(0, (92 - efficiencyPct) * 300)
  );
  const realizedRevenue = Math.max(
    rawBusiness.total_hourly_revenue_usd ? rawBusiness.total_hourly_revenue_usd * hoursPerMonth : 0,
    telemetryMonthlySavings * 0.28
  );
  return {
    monthlySavingsUsd: monthlySavings,
    potentialMonthlySavingsUsd: potentialSavings,
    baselineMonthlyValueUsd: Math.max(0, realizedRevenue - monthlySavings),
    optimizedMonthlyValueUsd: realizedRevenue + potentialSavings,
    mrrUsd: realizedRevenue,
    annualRevenueUsd: Math.max(0, (realizedRevenue + potentialSavings) * 12),
    co2AvoidedTons: rawBusiness.co2_avoided_tons || 0,
    co2ValueUsd: rawBusiness.co2_value_usd || 0,
    roiPct: aiEnabled ? Math.max(rawBusiness.roi_pct || 0, (potentialSavings * 12 / 500000) * 100) : 0,
    paybackMonths: aiEnabled ? Math.max(0, rawBusiness.payback_months || 0) : 0,
    totalPowerKw: rawBusiness.power_generated_kw || 0,
    forecastP10MonthlySavingsUsd: rawBusiness.forecast_p10_monthly_savings_usd || 0,
    forecastP50MonthlySavingsUsd: rawBusiness.forecast_p50_monthly_savings_usd || 0,
    forecastP90MonthlySavingsUsd: rawBusiness.forecast_p90_monthly_savings_usd || 0,
    savings: monthlySavings,
  };
}

export function SimulationProvider({ children }) {
  const [aiEnabled, setAiEnabled] = useState(() => {
    try {
      return localStorage.getItem(GLOBAL_AI_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [metrics, setMetrics] = useState({});
  const [businessRaw, setBusinessRaw] = useState({});
  const [factories, setFactories] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [safetyLevel, setSafetyLevel] = useState('NORMAL');

  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_AI_KEY, String(aiEnabled));
    } catch {
      // ignore storage errors
    }
  }, [aiEnabled]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [state, list] = await Promise.all([fetchState(), fetchFactories()]);
        if (!active) return;

        const backendAiMode = Boolean(state?.ai_mode);
        const safety = state?.safety_level || 'NORMAL';
        const metricState = state?.metrics || {};
        const normalizedFactories = Array.isArray(list) ? list : [];

        const persistedAiMode = (() => {
          try {
            return localStorage.getItem(GLOBAL_AI_KEY) === 'true';
          } catch {
            return backendAiMode;
          }
        })();

        const effectiveAiMode = persistedAiMode || backendAiMode;

        if (persistedAiMode && !backendAiMode) {
          try {
            await toggleAIRequest(true);
          } catch {
            // Keep local intent; next poll will retry.
          }
        }

        setAiEnabled(effectiveAiMode);
        if (persistedAiMode !== backendAiMode) {
          setTimeout(() => {
            if (!active) return;
            setAiEnabled(persistedAiMode || backendAiMode);
          }, 0);
        }
        setMetrics(metricState);
        setBusinessRaw(state?.business || {});
        const confidencePct = Number(state?.confidence?.confidence || 0);
        setConfidence(confidencePct);
        setSafetyLevel(safety);

        const map = toFactoryMap(normalizedFactories, metricState, effectiveAiMode, safety);

        const detailResults = await Promise.all(
          normalizedFactories.map(async (factory) => {
            try {
              const detail = await fetchFactory(factory.id);
              return { id: String(factory.id), detail };
            } catch {
              return { id: String(factory.id), detail: null };
            }
          })
        );

        detailResults.forEach(({ id, detail }) => {
          if (!map[id]) return;
          if (detail) {
            map[id] = {
              ...map[id],
              monthly_savings_usd: effectiveAiMode ? (detail.monthly_savings_usd || 0) : 0,
              monthly_revenue_usd: detail.monthly_revenue_usd || 0,
              potential_savings_usd: state?.business?.potential_monthly_savings_usd || 0,
              baseline_monthly_value_usd: Math.max(0, (detail.monthly_revenue_usd || 0) / 0.28),
              optimized_monthly_value_usd: Math.max(0, (detail.monthly_revenue_usd || 0) / 0.28 + (detail.monthly_savings_usd || 0)),
              recommendations: effectiveAiMode
                ? (detail.ai_insights || []).map((text) => ({
                    text,
                    expectedSavings: 0,
                    expectedGain: 0,
                    confidence: Math.round(confidencePct || 0),
                  }))
                : [],
            };
          }
        });

        setFactories(map);

        const allRecommendations = Object.values(map)
          .flatMap((f) => f.recommendations || [])
          .slice(0, 8);
        setRecommendations(effectiveAiMode ? allRecommendations : []);
      } catch {
        if (!active) return;
      }
    };

    load();
    const poll = setInterval(load, 1000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, []);

  const optimizationMetrics = useMemo(() => ({
    temperature: metrics.temperature || 0,
    pressure: metrics.pressure || 0,
    flow: metrics.flow_rate || 0,
    valve: metrics.valve_position || 0,
    efficiency_pct: metrics.efficiency_pct || 0,
    power_output: metrics.power_output || 0,
    turbine_rpm: metrics.turbine_rpm || 0,
    heat_recovery: metrics.heat_recovered_kwh || 0,
    energy_loss_pct: metrics.energy_loss_pct || 0,
    co2_emissions: metrics.co2_avoided_tons || 0,
  }), [metrics]);

  const optimizationGain = useMemo(
    () => (aiEnabled ? Math.max(0, (optimizationMetrics.efficiency_pct || 0) - 76) : 0),
    [aiEnabled, optimizationMetrics.efficiency_pct]
  );

  const safetyState = useMemo(() => ({
    level: safetyLevel,
    protected: safetyLevel === 'CRITICAL',
  }), [safetyLevel]);

  const business = useMemo(() => mapBusiness(businessRaw, metrics, aiEnabled), [businessRaw, metrics, aiEnabled]);

  const toggleAI = async (next) => {
    const requested = Boolean(next);
    const previous = aiEnabled;
    setAiEnabled(requested);
    try {
      await toggleAIRequest(requested);
      if (!requested) {
        setRecommendations([]);
      }
    } catch {
      setAiEnabled(previous);
    }
  };

  const toggleAIFor = (_factoryId, next) => toggleAI(next);
  const getFactory = (id) => factories[String(id)] || null;

  const aiStatus = aiEnabled ? 'Optimization Active' : 'AI Paused';

  return (
    <SimulationContext.Provider
      value={{
        aiEnabled,
        aiStatus,
        confidence,
        optimizationGain,
        safetyState,
        recommendations,
        optimizationMetrics,
        factories,
        getFactory,
        toggleAI,
        toggleAIFor,
        business,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider');
  return ctx;
}

export default SimulationContext;
