import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useSimulation } from "../context/SimulationContext";
import { fetchFactory } from "../services/api";
import { THEME } from "../constants/theme";
import KPICard from "../components/KPICard";
import LiveChart from "../components/LiveChart";
import AIToggle from "../components/AIToggle";
import SafetyIndicator from "../components/SafetyIndicator";
import ComparisonPanel from "../components/ComparisonPanel";
import FactoryScene from "../three/FactoryScene";
import { IconBolt, IconThermometer, IconGauge, IconValve } from "../components/Icons";
import { convertFromINR, formatBusinessCurrency } from "../utils/currency";

const USD_ELECTRICITY_RATE = 0.12;
const TARGET_EFFICIENCY = 92;

export default function FactoryDetail() {
  const { id } = useParams();
  const [factory, setFactory] = useState(null);
  const [loading, setLoading] = useState(true);

  const { getFactory, toggleAI, aiEnabled, safetyState, optimizationMetrics, business } = useSimulation();
  const sim = getFactory(id);
  const safety = safetyState?.level ?? "NORMAL";
  const effectiveAI = aiEnabled;
  const safetyStat = { stats: { total_overrides: safetyState?.protected ? 1 : 0 } };
  const simMetrics = optimizationMetrics;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFactory(id)
      .then((data) => {
        if (active) setFactory(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const insights = effectiveAI
    ? (sim?.recommendations || []).map((r) => `${r.text} (confidence ${r.confidence || 80}%)`).slice(0, 4)
    : [];
  const revenueTrend = useMemo(() => {
    const baselineValue = business?.baselineMonthlyValueUsd || 0;
    const realizedSavings = effectiveAI ? (business?.monthlySavingsUsd || 0) : 0;
    const potentialSavings = business?.potentialMonthlySavingsUsd || 0;
    return Array.from({ length: 12 }, (_, index) => ({
      tick: index + 1,
      month: index + 1,
      current: Math.max(0, (baselineValue + realizedSavings) * (0.92 + index * 0.01)),
      optimized: Math.max(0, (baselineValue + realizedSavings + potentialSavings) * (0.92 + index * 0.01)),
    }));
  }, [effectiveAI, business]);

  const powerTrend = useMemo(() => {
    const baselinePower = Math.max(0, simMetrics.power_output - (effectiveAI ? Math.max(0, simMetrics.power_output * 0.06) : 0));
    const optimizedPower = Math.max(simMetrics.power_output, baselinePower + Math.max(0, (business?.potentialMonthlySavingsUsd || 0) / 3500));
    return Array.from({ length: 120 }, (_, index) => {
      const wave = Math.sin(index / 12) * 2.4;
      const drift = Math.max(0, index - 90) * 0.06;
      const current = Math.max(0, simMetrics.power_output + wave - drift);
      return {
        tick: index,
        power_output: current,
        predicted_power: Math.max(0, current + (effectiveAI ? 1.4 : 0.2)),
        optimized_power: optimizedPower,
        loss_point: index === 24 || index === 72 ? Math.max(0, baselinePower - 3) : null,
      };
    });
  }, [effectiveAI, business?.potentialMonthlySavingsUsd, simMetrics.power_output]);

  const monthlySavingsUsd = effectiveAI ? (business?.monthlySavingsUsd || 0) : 0;
  const currentRevenueUsd = business?.mrrUsd || 0;
  const potentialSavingsUsd = business?.potentialMonthlySavingsUsd || 0;
  const lostOpportunityUsd = potentialSavingsUsd;
  const profitImpactUsd = Math.max(0, monthlySavingsUsd - lostOpportunityUsd * 0.35);
  const status = simMetrics.efficiency_pct >= 90 && String(factory?.status || "").toLowerCase() !== "warning"
    ? "Optimized"
    : simMetrics.efficiency_pct >= 80
      ? "Needs Attention"
      : "Critical";
  const aiStatus = effectiveAI ? "AI enabled" : "AI paused";
  const powerCostPerDay = (simMetrics.power_output || 210) * 24 * USD_ELECTRICITY_RATE;
  const efficiencyLossPct = Math.max(0, TARGET_EFFICIENCY - (simMetrics.efficiency_pct || 76));
  const operationalRiskPct = Math.min(100, Math.max(5, 100 - (simMetrics.efficiency_pct || 76)));
  const optimizedPower = Math.max(0, simMetrics.power_output + Math.max(0, potentialSavingsUsd / 3500));
  const optimizedRevenueUsd = currentRevenueUsd + potentialSavingsUsd;

  const recommendationCards = effectiveAI ? [
    {
      title: "Raise boiler efficiency",
      impact: formatBusinessCurrency(potentialSavingsUsd * 0.35),
      confidence: 82,
      detail: "Trim thermal losses and improve steam utilization.",
    },
    {
      title: "Stabilize pressure band",
      impact: formatBusinessCurrency(Math.max(0, potentialSavingsUsd * 0.24)),
      confidence: 79,
      detail: "Reduce operational waste and protect output consistency.",
    },
    {
      title: "Shift to optimized load",
      impact: formatBusinessCurrency(Math.max(0, potentialSavingsUsd * 0.18)),
      confidence: 84,
      detail: "Move into the high-yield operating window faster.",
    },
  ] : [];

  const alerts = [
    simMetrics.efficiency_pct < 80 && {
      tone: "red",
      title: "Low efficiency threshold breached",
      detail: `Estimated monthly loss ${formatBusinessCurrency(lostOpportunityUsd)}`,
    },
    ((sim?.alerts || []).length > 0 ? false : (simMetrics.temperature || 0) > 540) && {
      tone: "amber",
      title: "Temperature above preferred range",
      detail: `Potential financial drag ${formatBusinessCurrency(potentialSavingsUsd * 0.08)}`,
    },
    ((sim?.alerts || []).length > 0 ? false : (simMetrics.pressure || 0) > 6.8) && {
      tone: "amber",
      title: "Pressure volatility detected",
      detail: `Risk-adjusted loss ${formatBusinessCurrency(potentialSavingsUsd * 0.05)}`,
    },
    ...(sim?.alerts || []).map((a) => ({ tone: a.level === "critical" ? "red" : "amber", title: a.level === "critical" ? "Critical safety protection" : "Safety warning", detail: a.message })),
  ].filter(Boolean);

  if (loading) {
    return <div style={{ color: "#64748B" }}>Loading factory detail…</div>;
  }

  if (!factory) {
    return <div style={{ color: "#64748B" }}>Factory not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <h1 className="text-4xl font-bold mb-1" style={{ color: "#0F172A" }}>{factory.name}</h1>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">USD ($)</span>
        </div>
      </div>
      <div>
        <p style={{ color: "#475569" }}>{factory.location} · <span>{factory.status}</span></p>
      </div>

      {/* Business Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Factory Status" value={status} subtext={simMetrics.efficiency_pct >= 90 ? "Optimized for profit" : "Needs business attention"} tone={status === "Optimized" ? "green" : status === "Needs Attention" ? "amber" : "red"} />
        <SummaryCard label="Monthly Profit Impact" value={formatBusinessCurrency(profitImpactUsd)} subtext={effectiveAI ? "AI-derived impact" : "Manual baseline (no AI gains)"} tone="green" />
        <SummaryCard label="Lost Opportunity" value={formatBusinessCurrency(lostOpportunityUsd)} subtext="Delta to optimized operation" tone="red" />
        <SummaryCard label="AI Status" value={aiStatus} subtext={effectiveAI ? "Recommendations are live" : "Operating in manual mode"} tone={effectiveAI ? "green" : "amber"} />
      </div>

      {/* Hero: 3D Factory Scene */}
      <motion.div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="h-[500px]">
          <FactoryScene metrics={simMetrics} aiActive={effectiveAI} />
        </div>
      </motion.div>

      {/* Live Operational Metrics */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#0F172A" }}>Operational Performance to Money</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Power" value={powerCostPerDay} unit="/day" icon={IconBolt} color="blue" />
          <KPICard label="Temperature" value={efficiencyLossPct} unit="% loss" icon={IconThermometer} color="orange" />
          <KPICard label="Pressure" value={operationalRiskPct} unit="% risk" icon={IconGauge} color="cyan" />
          <KPICard label="Valve Position" value={simMetrics.valve_position} unit="%" icon={IconValve} color="emerald" />
          <KPICard label="Efficiency" value={simMetrics.efficiency_pct} unit="%" color="purple" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FinancialCard label="Savings Generated ($)" value={formatBusinessCurrency(monthlySavingsUsd)} tone="green" />
        <FinancialCard label="Our Revenue ($)" value={formatBusinessCurrency(currentRevenueUsd)} tone="blue" />
        <FinancialCard label="Potential if Optimized ($)" value={formatBusinessCurrency(optimizedRevenueUsd)} tone="green" />
        <FinancialCard label="Lost Opportunity ($)" value={formatBusinessCurrency(lostOpportunityUsd)} tone="red" />
      </div>

      {/* Main Content: Economics + AI + Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Economics Section - Takes 2 columns */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Economics Card */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Financial Impact</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Business view</span>
            </div>
            <div className="space-y-4">
              <EconomicsRow label="Savings generated ($)" value={formatBusinessCurrency(monthlySavingsUsd)} accent="text-green-600" />
              <EconomicsRow label="Our revenue ($)" value={formatBusinessCurrency(currentRevenueUsd)} accent="text-blue-600" />
              <EconomicsRow label="Potential if optimized ($)" value={formatBusinessCurrency(optimizedRevenueUsd)} accent="text-green-600" />
              <EconomicsRow label="Lost opportunity ($)" value={formatBusinessCurrency(lostOpportunityUsd)} accent="text-red-600" />
            </div>
          </div>

          {effectiveAI && <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>AI Recommended Actions</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Apply Optimization</span>
            </div>
            <div className="space-y-3">
              {recommendationCards.map((action) => (
                <div key={action.title} className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{action.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{action.detail}</div>
                      <div className="text-[12px] mt-2 text-slate-700">Expected impact: <strong className="text-slate-900">{action.impact}</strong> · Confidence {action.confidence}%</div>
                    </div>
                    <button className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#2563EB" }}>Apply Optimization</button>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {/* Power Trend Chart */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#0F172A" }}>Smart Graph</h2>
            <p className="text-[13px] mb-4" style={{ color: "#475569" }}>Current vs AI optimized, with inefficiency points and prediction trend</p>
            <LiveChart
              data={powerTrend}
              lines={[
                { key: "power_output", color: THEME.chart.power, name: "Current" },
                { key: "predicted_power", color: THEME.chart.predicted, name: effectiveAI ? "AI Forecast" : "Forecast" },
                { key: "optimized_power", color: "#16A34A", name: effectiveAI ? "AI Optimized" : "Potential" },
              ]}
              label=""
              unit="kW"
              area
              height={280}
              annotations={[
                { x: 24, y: powerTrend[24]?.loss_point || 0, label: "Inefficiency", color: "#F97316" },
                { x: 72, y: powerTrend[72]?.loss_point || 0, label: "Loss point", color: "#DC2626" },
              ]}
            />
          </div>

          {/* Revenue Trend Chart */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: "#0F172A" }}>Revenue Trend ($)</h2>
            <LiveChart
              data={revenueTrend}
              lines={[{ key: "current", color: "#2563EB", name: "Current" }, { key: "optimized", color: "#16A34A", name: "AI Optimized" }]}
              label=""
              unit="$"
              area
              height={240}
              xKey="tick"
            />
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#0F172A" }}>Before vs After</h2>
            <ComparisonPanel comparison={{
              baseline_avg_power: simMetrics.power_output || 0,
              ai_avg_power: optimizedPower,
              improvement_pct: effectiveAI && simMetrics.power_output ? ((optimizedPower - simMetrics.power_output) / Math.max(1, simMetrics.power_output)) * 100 : 0,
              baseline_samples: powerTrend.length,
              ai_samples: powerTrend.length,
            }} />
            <div className={`mt-4 rounded-lg border p-4 text-sm ${effectiveAI ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              {effectiveAI
                ? <>Estimated remaining savings from AI optimization: <strong>{formatBusinessCurrency(lostOpportunityUsd)}</strong></>
                : <>AI is paused. Potential if optimized: <strong>{formatBusinessCurrency(potentialSavingsUsd)}</strong></>}
            </div>
          </div>
        </motion.div>

        {/* Sidebar: AI + Safety + Insights */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* AI Toggle */}
          <AIToggle enabled={effectiveAI} onToggle={(next) => toggleAI(next)} />

          {/* Safety Card */}
          <SafetyIndicator
            level={safety}
            overrides={safetyStat?.stats?.total_overrides ?? 0}
            pressureHeadroom={8.0 - (simMetrics.pressure ?? 5)}
            tempHeadroom={590 - (simMetrics.temperature ?? 450)}
          />

          <div className="rounded-lg border p-6" style={{ borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#0F172A" }}>Alert System</h2>
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert) => (
                <div key={alert.title} className="rounded-xl border p-4" style={{ borderColor: alert.tone === "red" ? "#FCA5A5" : "#FCD34D", backgroundColor: alert.tone === "red" ? "#FEF2F2" : "#FFFBEB" }}>
                  <div className="font-semibold text-slate-900">{alert.title}</div>
                  <div className="text-sm mt-1" style={{ color: "#475569" }}>{alert.detail}</div>
                </div>
              )) : (
                <div className="text-sm" style={{ color: "#475569" }}>No active alerts. Financial impact is within expected range.</div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="rounded-lg border p-6" style={{ borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" }}>
              <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#64748B" }}>AI Insights</h2>
              <div className="space-y-2">
                {insights.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison */}
          <ComparisonPanel comparison={{
            baseline_avg_power: simMetrics.power_output || 0,
            ai_avg_power: optimizedPower,
            improvement_pct: effectiveAI && simMetrics.power_output ? ((optimizedPower - simMetrics.power_output) / Math.max(1, simMetrics.power_output)) * 100 : 0,
            baseline_samples: powerTrend.length,
            ai_samples: powerTrend.length,
          }} />
        </motion.div>
      </div>
    </div>
  );
}

function EconomicsRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-4 pb-4 last:border-0 last:pb-0" style={{ borderBottomColor: "#E2E8F0", borderBottomWidth: "1px" }}>
      <span className="text-sm" style={{ color: "#475569" }}>{label}</span>
      <span className={`font-semibold ${accent}`}>{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, subtext, tone = "blue" }) {
  const tones = {
    green: { border: "#BBF7D0", bg: "#F0FDF4", fg: "#166534" },
    amber: { border: "#FDE68A", bg: "#FFFBEB", fg: "#B45309" },
    red: { border: "#FECACA", bg: "#FEF2F2", fg: "#B91C1C" },
    blue: { border: "#BFDBFE", bg: "#EFF6FF", fg: "#1D4ED8" },
  }[tone];

  return (
    <div className="rounded-xl border p-5 shadow-sm" style={{ backgroundColor: "#FFFFFF", borderColor: tones.border }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div>
      <div className="text-2xl font-bold mt-2" style={{ color: tones.fg }}>{value}</div>
      <div className="text-[12px] mt-2" style={{ color: "#475569" }}>{subtext}</div>
    </div>
  );
}

function FinancialCard({ label, value, tone = "blue" }) {
  const tones = {
    green: { border: "#BBF7D0", bg: "#F0FDF4", fg: "#166534" },
    red: { border: "#FECACA", bg: "#FEF2F2", fg: "#B91C1C" },
    blue: { border: "#BFDBFE", bg: "#EFF6FF", fg: "#1D4ED8" },
  }[tone];

  return (
    <div className="rounded-xl border p-5 shadow-sm" style={{ backgroundColor: tones.bg, borderColor: tones.border }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div>
      <div className="text-2xl font-bold mt-2" style={{ color: tones.fg }}>{value}</div>
    </div>
  );
}
