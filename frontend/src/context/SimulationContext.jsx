import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchState, fetchFactories, fetchFactory, toggleAI as toggleAIRequest } from '../services/api';

const SimulationContext = createContext(null);
const GLOBAL_AI_KEY = 'entropy-global-ai-enabled';

function toFactoryMap(factories, metrics, aiEnabled, safetyLevel) {
  const map = {};
  // simple deterministic noise generator for per-factory variability
  const seeded = (id, seed = 997) => {
    const s = String(id) + String(seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return Math.abs(h % 1000) / 1000;
  };
  (factories || []).forEach((f) => {
    const id = String(f.id);
    const noise = seeded(id);
    // produce small but deterministic variations per factory
    const powerBase = (metrics.power_output || 200) * (0.9 + noise * 0.2); // ~180-240kW
    const efficiencyBase = Math.round((76 + noise * 8) * 10) / 10; // ~76-84
    const uptimeBase = Math.round((0.985 + noise * 0.01) * 1000) / 1000; // ~98.5%+
    const healthBase = Math.round((0.8 + noise * 0.18) * 100) / 1; // ~80-98

    map[id] = {
      id,
      name: f.name || `Plant ${id}`,
      location: f.location || 'Industrial Zone',
      aiEnabled,
      // sensible telemetry fallbacks with per-factory variance
      power: Math.round(powerBase * 10) / 10,
      efficiency: Math.min(88, Math.max(75, efficiencyBase)),
      temperature: metrics.temperature || 500,
      pressure: metrics.pressure || 6,
      valve: metrics.valve_position || 72,
      // business fields (may be replaced when detailed factory fetch returns)
      monthly_savings_usd: f.monthly_savings_usd || 0,
      monthly_revenue_usd: f.monthly_revenue_usd || Math.round(powerBase * 24 * 30 * 0.12),
      potential_savings_usd: 0,
      baseline_monthly_value_usd: 0,
      optimized_monthly_value_usd: 0,
      stability_score: healthBase / 100,
      prev_thermal_loss: Number(f.prev_thermal_loss || 0.02),
      ai_effectiveness: 0.5 + noise * 0.5,
      predicted_efficiency_gain: 0.02 + noise * 0.06,
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
  const [factoriesAi, setFactoriesAi] = useState({});
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

        // recommendations will be populated from business aggregation below
        setRecommendations([]);
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
    // default to a realistic baseline if telemetry is missing
    efficiency_pct: metrics.efficiency_pct ?? 76,
    power_output: metrics.power_output ?? 200,
    turbine_rpm: metrics.turbine_rpm || 0,
    heat_recovery: metrics.heat_recovered_kwh || 0,
    energy_loss_pct: metrics.energy_loss_pct || 0,
    co2_emissions: metrics.co2_avoided_tons || 0,
  }), [metrics]);

  // placeholder; will be updated by business calc below
  const [optimizationGain, setOptimizationGain] = useState(0);

  const safetyState = useMemo(() => ({
    level: safetyLevel,
    protected: safetyLevel === 'CRITICAL',
  }), [safetyLevel]);

  // Compute all business metrics from live factory state (no hardcoded numbers)
  const aiProgressRef = React.useRef({});
  const business = useMemo(() => {
    try {
      const hoursPerMonth = 24 * 30;
      const electricityRate = 0.12; // USD/kWh (configurable later)

      const factoryEntries = Object.values(factories || {});
      if (factoryEntries.length === 0) return mapBusiness(businessRaw, metrics, aiEnabled);

      let agg = {
        totalMonthlyRevenue: 0,
        totalProjectedRevenue: 0,
        totalAiSavings: 0,
        totalLossOpportunity: 0,
        totalCo2Avoided: 0,
        totalPotentialCo2: 0,
        totalAnomalies: 0,
        plantHealthAvg: 0,
        factories: {},
      };

      factoryEntries.forEach((f) => {
        const id = String(f.id || f.name || Math.random());
        // Operational inputs (safe parsing)
        const powerKw = Number(f.power || f.power_output || metrics.power_output || 200);
        const thermalLoss = Number(f.thermal_loss_index || f.energy_loss_pct || f.prev_thermal_loss || 0) || 0;
        const pressure = Number(f.pressure || metrics.pressure || 6);
        const valve = Number(f.valve || f.valve_position || metrics.valve_position || 72);
        const uptimePct = Number(f.uptime_pct || 0.995);
        const stabilityScore = Number(f.stability_score || 0.85);
        const aiEffect = Number(f.ai_effectiveness || 0.5);
        const predictedGain = Number((f.predicted_efficiency_gain || 0));

        // component scores (0..1)
        const nominalPower = 200;
        const powerScore = Math.max(0, 1 - Math.min(1, Math.abs(powerKw - nominalPower) / nominalPower));
        const tempScore = Math.max(0, 1 - Math.min(1, thermalLoss / 0.25));
        const pressureScore = Math.max(0, 1 - Math.min(1, Math.abs(pressure - 6) / 3));
        const valveScore = Math.max(0, 1 - Math.min(1, Math.abs(valve - 72) / 50));

        // weighted efficiency (0..100) and factor uptime/stability
        const weighted = (powerScore * 0.4) + (tempScore * 0.2) + (pressureScore * 0.2) + (valveScore * 0.2);
        let efficiencyPct = Math.round(Math.max(0, Math.min(100, weighted * 100 * uptimePct)) * 10) / 10;

        // AI progress smoothing (persisted across polls)
        const prevProg = aiProgressRef.current[id] || 0;
        const factoryAiOn = aiEnabled && Boolean(f.aiEnabled || factoriesAi[String(id)]);
        let prog = prevProg;
        if (aiEnabled && factoryAiOn) prog = Math.min(1, prevProg + 0.03);
        else prog = Math.max(0, prevProg - 0.01);
        aiProgressRef.current[id] = prog;

        // simulate telemetry improvements proportional to progress and ai effectiveness
        const adjustedThermalLoss = Math.max(0, thermalLoss - (prog * aiEffect * 0.6 * thermalLoss));
        const pressureAdj = pressure + (factoryAiOn ? (-(pressure - 6) * prog * 0.4) : 0);
        const valveAdj = valve + (factoryAiOn ? ((72 - valve) * prog * 0.5) : 0);

        const adjTempScore = Math.max(0, 1 - Math.min(1, adjustedThermalLoss / 0.25));
        const adjPressureScore = Math.max(0, 1 - Math.min(1, Math.abs(pressureAdj - 6) / 3));
        const adjValveScore = Math.max(0, 1 - Math.min(1, Math.abs(valveAdj - 72) / 50));
        const adjWeighted = (powerScore * 0.4) + (adjTempScore * 0.2) + (adjPressureScore * 0.2) + (adjValveScore * 0.2);
        const adjustedEfficiency = Math.round(Math.max(0, Math.min(100, adjWeighted * 100 * uptimePct)) * 10) / 10;

        const optimizedEfficiency = Math.min(95, adjustedEfficiency * (1 + predictedGain));

        // Monthly revenue derives from power × hours × rate × uptime × efficiency
        const monthlyRevenue = powerKw * hoursPerMonth * electricityRate * uptimePct * (efficiencyPct / 100);
        const projectedRevenue = monthlyRevenue * (optimizedEfficiency / Math.max(0.0001, efficiencyPct || 0.0001));
        const lossOpportunity = Math.max(0, projectedRevenue - monthlyRevenue);

        // Savings components (realized scale with progress when AI active)
        const prevThermal = Number(f.prev_thermal_loss || 0);
        const thermalSaved = Math.max(0, prevThermal - adjustedThermalLoss);
        const thermalSavingsUsd = monthlyRevenue * thermalSaved * 2.5; // heuristic multiplier
        const fuelUsagePct = Number(f.energy_loss_pct || f.fuel_waste_pct || 0) || 0;
        const fuelSavingsUsd = monthlyRevenue * Math.max(0, (0.15 - fuelUsagePct / 100)) * 0.6;
        const efficiencyGainUsd = monthlyRevenue * Math.max(0, (optimizedEfficiency - efficiencyPct) / 100);
        const rawSavings = thermalSavingsUsd + fuelSavingsUsd + efficiencyGainUsd;
        const monthlyAiSavings = factoryAiOn ? rawSavings * Math.min(1, prog * aiEffect) : 0;

        const co2Avoided = factoryAiOn ? (monthlyRevenue / 1000) * 0.4 * Math.max(0, (0.15 - fuelUsagePct / 100)) : null;
        const potentialCo2 = (monthlyRevenue / 1000) * 0.4 * Math.max(0, (0.15 - fuelUsagePct / 100));

        const plantHealth = Math.round(Math.min(97, Math.max(50, (stabilityScore * 0.7 + (1 - adjustedThermalLoss) * 0.3) * 100)));
        const anomalies = Array.isArray(f.alerts) ? f.alerts.length : 0;

        agg.totalMonthlyRevenue += monthlyRevenue;
        agg.totalProjectedRevenue += projectedRevenue;
        agg.totalAiSavings += monthlyAiSavings;
        agg.totalLossOpportunity += lossOpportunity;
        agg.totalCo2Avoided += (co2Avoided || 0);
        agg.totalPotentialCo2 += potentialCo2;
        agg.totalAnomalies += anomalies;
        agg.plantHealthAvg += plantHealth;

        const potentialCo2PerFactory = co2Avoided === null ? Math.round(potentialCo2 * 100) / 100 : Math.round((co2Avoided) * 100) / 100;
        agg.factories[id] = {
          id,
          name: f.name || `Plant ${id}`,
          powerKw: Math.round(powerKw * 10) / 10,
          efficiencyPct: Math.round(efficiencyPct * 10) / 10,
          optimizedEfficiencyPct: Math.round(optimizedEfficiency * 10) / 10,
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          projectedRevenue: Math.round(projectedRevenue * 100) / 100,
          monthlyAiSavings: Math.round(monthlyAiSavings * 100) / 100,
          lossOpportunity: Math.round(lossOpportunity * 100) / 100,
          co2Avoided: co2Avoided === null ? null : Math.round(co2Avoided * 100) / 100,
          potentialCo2: potentialCo2PerFactory,
          plantHealth,
          uptimePct: Math.round(uptimePct * 1000) / 10,
          anomalyCount: anomalies,
          aiEnabled: factoryAiOn,
          aiProgress: Math.round(prog * 100) / 100,
        };
      });

      agg.plantHealthAvg = Math.round((agg.plantHealthAvg / Object.keys(agg.factories).length) || 0);
      const effList = Object.values(agg.factories).map((x) => x.efficiencyPct || 0);
      const plantEfficiencyAvg = effList.length > 0 ? Math.round((effList.reduce((s, v) => s + v, 0) / effList.length) * 10) / 10 : 0;

      const optimizationGainPct = agg.totalProjectedRevenue > 0 ? Math.round(((agg.totalProjectedRevenue - agg.totalMonthlyRevenue) / Math.max(1, agg.totalMonthlyRevenue)) * 10000) / 100 : 0;

      // update optimization gain state for UI (0 when global AI is off)
      setOptimizationGain(aiEnabled ? optimizationGainPct : 0);

      return {
        totalMonthlyRevenue: Math.round(agg.totalMonthlyRevenue * 100) / 100,
        totalProjectedRevenue: Math.round(agg.totalProjectedRevenue * 100) / 100,
        totalAiSavings: Math.round(agg.totalAiSavings * 100) / 100,
        totalLossOpportunity: Math.round(agg.totalLossOpportunity * 100) / 100,
        totalCo2Avoided: Math.round(agg.totalCo2Avoided * 100) / 100,
        totalPotentialCo2: Math.round((agg.totalPotentialCo2 || 0) * 100) / 100,
        totalAnomalies: agg.totalAnomalies,
        plantHealthAvg: agg.plantHealthAvg,
        plantEfficiencyAvg,
        optimizationGainPct,
        factories: agg.factories,
      };
    } catch (e) {
      return mapBusiness(businessRaw, metrics, aiEnabled);
    }
  }, [factories, factoriesAi, businessRaw, metrics, aiEnabled]);

  // generate recommendations from live business telemetry (forecast or live)
  useEffect(() => {
    try {
      const recs = [];
      const factEntries = Object.values(business.factories || {});
      factEntries.forEach((f) => {
        if (!f) return;
        // recommendation if lossOpportunity is meaningful
        if (f.lossOpportunity > Math.max(500, f.monthlyRevenue * 0.015)) {
          recs.push({
            factoryId: f.id,
            title: 'Reduce thermal losses',
            detail: 'Tune insulation and heat recovery to reclaim operating value.',
            expectedSavings: Math.round(f.lossOpportunity * 0.45),
            confidence: Math.min(95, Math.round((f.plantHealth < 80 ? 60 : 75) + (f.efficiencyPct - 76))),
            forecast: !f.aiEnabled,
          });
        }
        // recommendation if efficiency below target
        if (f.efficiencyPct < 82) {
          recs.push({
            factoryId: f.id,
            title: 'Increase operational stability',
            detail: 'Stabilize pressure and reduce valve oscillations to lift yield.',
            expectedSavings: Math.round(f.lossOpportunity * 0.3),
            confidence: Math.min(90, Math.round(60 + (82 - f.efficiencyPct))),
            forecast: !f.aiEnabled,
          });
        }
      });
      setRecommendations(recs.slice(0, 12));
    } catch (e) {
      // ignore
    }
  }, [business]);

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

  const toggleAIFor = (factoryId, next) => {
    const id = String(factoryId);
    const requested = Boolean(next);
    setFactoriesAi((m) => ({ ...(m || {}), [id]: requested }));
    setFactories((prev) => {
      const out = { ...(prev || {}) };
      if (!out[id]) return out;
      out[id] = { ...out[id], aiEnabled: requested && aiEnabled };
      return out;
    });
  };
  const getFactory = (id) => factories[String(id)] || null;

  const aiStatus = aiEnabled ? 'Optimization Active' : 'Manual Baseline';

  return (
    <SimulationContext.Provider
      value={{
        aiEnabled,
        aiStatus,
        confidence,
        optimizationGain,
        safetyState,
        recommendations,
        optimizationMetrics: { ...optimizationMetrics, efficiency_pct: (business?.plantEfficiencyAvg || optimizationMetrics.efficiency_pct) },
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
