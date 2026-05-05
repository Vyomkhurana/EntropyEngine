import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMetrics, useHistory, useComparison } from "../hooks/useMetrics";
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
  const { state, connected } = useMetrics(1000);
  const history = useHistory(2000, 120);
  const comparison = useComparison(3000);
  const [factory, setFactory] = useState(null);
  const [loading, setLoading] = useState(true);

  const metrics = state?.metrics || {};
  const safety = state?.safety_level ?? "NORMAL";
  const effectiveAI = state?.ai_mode ?? false;
  const safetyStat = state?.confidence || {};

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

  const insights = factory?.ai_insights ?? [];
  const revenueTrend = useMemo(() => {
    const base = factory?.monthly_savings ?? 0;
    return history.slice(-12).map((item, index) => ({
      tick: index + 1,
      month: item.tick,
      current: base > 0 ? convertFromINR(Math.max(0, base * (0.18 + index * 0.01))) : 0,
      optimized: base > 0 ? convertFromINR(Math.max(0, base * (0.18 + index * 0.01) * 1.18)) : 0,
    }));
  }, [factory, history]);

  const currentRevenueUsd = convertFromINR(factory?.our_revenue || 0);
  const monthlySavingsUsd = convertFromINR(factory?.monthly_savings || 0);
  const potentialSavingsUsd = convertFromINR((factory?.monthly_savings || 0) * (TARGET_EFFICIENCY / Math.max(1, factory?.efficiency_pct || 1)));
  const lostOpportunityUsd = Math.max(0, potentialSavingsUsd - monthlySavingsUsd);
  const profitImpactUsd = Math.max(0, monthlySavingsUsd - lostOpportunityUsd * 0.35);
  const status = factory?.efficiency_pct >= 90 && String(factory?.status || "").toLowerCase() !== "warning"
    ? "Optimized"
    : factory?.efficiency_pct >= 80
      ? "Needs Attention"
      : "Critical";
  const aiStatus = effectiveAI ? "AI enabled" : "AI paused";
  const powerCostPerDay = (metrics.power_output || 0) * 24 * USD_ELECTRICITY_RATE;
  const efficiencyLossPct = Math.max(0, TARGET_EFFICIENCY - (factory?.efficiency_pct || 0));
  const operationalRiskPct = Math.min(100, Math.max(5, 100 - (factory?.efficiency_pct || 0)));
  const optimizedPower = Math.max(0, (metrics.power_output || 0) * (1 + Math.min(0.12, efficiencyLossPct / 100)));
  const optimizedRevenueUsd = monthlySavingsUsd + lostOpportunityUsd;

  const recommendationCards = [
    {
      title: "Raise boiler efficiency",
      impact: formatBusinessCurrency(lostOpportunityUsd * 0.45),
      confidence: 94,
      detail: "Trim thermal losses and improve steam utilization.",
    },
    {
      title: "Stabilize pressure band",
      impact: formatBusinessCurrency(Math.max(0, lostOpportunityUsd * 0.25)),
      confidence: 88,
      detail: "Reduce operational waste and protect output consistency.",
    },
    {
      title: "Shift to optimized load",
      impact: formatBusinessCurrency(Math.max(0, lostOpportunityUsd * 0.3)),
      confidence: 91,
      detail: "Move into the high-yield operating window faster.",
    },
  ];

  const alerts = [
    factory?.efficiency_pct < 80 && {
      tone: "red",
      title: "Low efficiency threshold breached",
      detail: `Estimated monthly loss ${formatBusinessCurrency(lostOpportunityUsd)}`,
    },
    (metrics.temperature || 0) > 540 && {
      tone: "amber",
      title: "Temperature above preferred range",
      detail: `Potential financial drag ${formatBusinessCurrency(potentialSavingsUsd * 0.08)}`,
    },
    (metrics.pressure || 0) > 6.8 && {
      tone: "amber",
      title: "Pressure volatility detected",
      detail: `Risk-adjusted loss ${formatBusinessCurrency(potentialSavingsUsd * 0.05)}`,
    },
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
        <SummaryCard label="Factory Status" value={status} subtext={factory.efficiency_pct >= 90 ? "Optimized for profit" : "Needs business attention"} tone={status === "Optimized" ? "green" : status === "Needs Attention" ? "amber" : "red"} />
        <SummaryCard label="Monthly Profit Impact" value={formatBusinessCurrency(profitImpactUsd)} subtext="Net contribution after losses" tone="green" />
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
          <FactoryScene metrics={metrics} aiActive={effectiveAI} />
        </div>
      </motion.div>

      {/* Live Operational Metrics */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#0F172A" }}>Operational Performance to Money</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Power" value={powerCostPerDay} unit="/day" icon={IconBolt} color="blue" />
          <KPICard label="Temperature" value={efficiencyLossPct} unit="% loss" icon={IconThermometer} color="orange" />
          <KPICard label="Pressure" value={operationalRiskPct} unit="% risk" icon={IconGauge} color="cyan" />
          <KPICard label="Valve Position" value={metrics.valve_position} unit="%" icon={IconValve} color="emerald" />
          <KPICard label="Efficiency" value={factory.efficiency_pct} unit="%" color="purple" />
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
              <EconomicsRow label="Savings generated ($)" value={formatBusinessCurrency(factory.monthly_savings)} accent="text-green-600" />
              <EconomicsRow label="Our revenue ($)" value={formatBusinessCurrency(factory.our_revenue)} accent="text-blue-600" />
              <EconomicsRow label="Potential if optimized ($)" value={formatBusinessCurrency(optimizedRevenueUsd)} accent="text-green-600" />
              <EconomicsRow label="Lost opportunity ($)" value={formatBusinessCurrency(lostOpportunityUsd)} accent="text-red-600" />
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
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
          </div>

          {/* Power Trend Chart */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#0F172A" }}>Smart Graph</h2>
            <p className="text-[13px] mb-4" style={{ color: "#475569" }}>Current vs AI optimized, with inefficiency points and prediction trend</p>
            <LiveChart
              data={history.map((item, index) => ({
                ...item,
                optimized_power: Math.max(item.power_output || 0, item.predicted_power || 0) * 1.05,
                loss_point: index === 24 || index === 72 ? (item.power_output || 0) * 0.88 : null,
              }))}
              lines={[
                { key: "power_output", color: THEME.chart.power, name: "Current" },
                { key: "predicted_power", color: THEME.chart.predicted, name: "AI Forecast" },
                { key: "optimized_power", color: "#16A34A", name: "AI Optimized" },
              ]}
              label=""
              unit="kW"
              area
              height={280}
              annotations={[
                { x: 24, y: (history[24]?.power_output || 0) * 0.88, label: "Inefficiency", color: "#F97316" },
                { x: 72, y: (history[72]?.power_output || 0) * 0.88, label: "Loss point", color: "#DC2626" },
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
              baseline_avg_power: metrics.power_output || 0,
              ai_avg_power: optimizedPower,
              improvement_pct: metrics.power_output ? ((optimizedPower - metrics.power_output) / Math.max(1, metrics.power_output)) * 100 : 0,
              baseline_samples: history.length,
              ai_samples: history.length,
            }} />
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Estimated savings from AI optimization: <strong>{formatBusinessCurrency(lostOpportunityUsd)}</strong>
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
          <AIToggle enabled={effectiveAI} onToggle={() => {}} />

          {/* Safety Card */}
          <SafetyIndicator
            level={safety}
            overrides={safetyStat?.stats?.total_overrides ?? 0}
            pressureHeadroom={8.0 - (metrics.pressure ?? 5)}
            tempHeadroom={590 - (metrics.temperature ?? 450)}
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
          <ComparisonPanel comparison={comparison} />
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
