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
      value: base > 0 ? convertFromINR(Math.max(0, base * (0.18 + index * 0.01))) : 0,
    }));
  }, [factory, history]);

  if (loading) {
    return <div style={{ color: "#64748B" }}>Loading factory detail…</div>;
  }

  if (!factory) {
    return <div style={{ color: "#64748B" }}>Factory not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1" style={{ color: "#0F172A" }}>{factory.name}</h1>
        <p style={{ color: "#64748B" }}>{factory.location} · <span>{factory.status}</span></p>
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
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#64748B" }}>Operational Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Power Output" value={metrics.power_output} unit="kW" icon={IconBolt} color="blue" />
          <KPICard label="Temperature" value={metrics.temperature} unit="°C" icon={IconThermometer} color="orange" />
          <KPICard label="Pressure" value={metrics.pressure} unit="bar" icon={IconGauge} color="cyan" />
          <KPICard label="Valve Position" value={metrics.valve_position} unit="%" icon={IconValve} color="emerald" />
          <KPICard label="Efficiency" value={factory.efficiency_pct} unit="%" color="purple" />
        </div>
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
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: "#0F172A" }}>Economics</h2>
            <div className="space-y-4">
              <EconomicsRow label="Monthly Savings Generated" value={formatBusinessCurrency(factory.monthly_savings)} accent="text-green-600" />
              <EconomicsRow label="Our Revenue (20% share)" value={formatBusinessCurrency(factory.our_revenue)} accent="text-blue-600" />
              <EconomicsRow label="CO2 Reduction Monthly" value={`${factory.co2_tons} metric tons`} accent="text-orange-600" />
              <EconomicsRow label="ROI" value={`${factory.roi_pct}%`} accent="text-green-600" />
            </div>
          </div>

          {/* Power Trend Chart */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: "#0F172A" }}>Power Trend (120 ticks)</h2>
            <LiveChart
              data={history}
              lines={[
                { key: "power_output", color: THEME.chart.power, name: "Power" },
                { key: "predicted_power", color: THEME.chart.predicted, name: "AI Predicted" },
              ]}
              label=""
              unit="kW"
              area
              height={280}
            />
          </div>

          {/* Revenue Trend Chart */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: "#0F172A" }}>Revenue Trend ($)</h2>
            <LiveChart
              data={revenueTrend}
              lines={[{ key: "value", color: "#2563EB", name: "$ Revenue" }]}
              label=""
              unit="$"
              area
              height={240}
              xKey="tick"
            />
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
      <span className="text-sm" style={{ color: "#64748B" }}>{label}</span>
      <span className={`font-semibold ${accent}`}>{value}</span>
    </div>
  );
}
