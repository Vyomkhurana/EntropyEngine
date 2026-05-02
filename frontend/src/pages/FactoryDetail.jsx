import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMetrics, useHistory, useComparison } from "../hooks/useMetrics";
import { fetchFactory } from "../services/api";
import { THEME } from "../constants/theme";
import StatCard from "../components/StatCard";
import SectionHeader from "../components/SectionHeader";
import LiveChart from "../components/LiveChart";
import AIToggle from "../components/AIToggle";
import SafetyIndicator from "../components/SafetyIndicator";
import ComparisonPanel from "../components/ComparisonPanel";
import FactoryScene from "../three/FactoryScene";
import { IconBolt, IconThermometer, IconGauge, IconValve } from "../components/Icons";

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
      month: `M${index + 1}`,
      value: base > 0 ? Math.max(0, base * (0.18 + index * 0.01)) : 0,
    }));
  }, [factory, history]);

  if (loading) {
    return <div className="text-gray-400">Loading factory detail…</div>;
  }

  if (!factory) {
    return <div className="text-gray-400">Factory not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-4xl font-bold text-white mb-1">{factory.name}</h1>
        <p className="text-gray-500 text-sm">
          {factory.location} • {factory.status}
        </p>
      </div>

      {/* HERO: 3D Factory Scene */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-lg border border-gray-700 bg-gray-800/40 overflow-hidden h-[500px]"
      >
        <FactoryScene metrics={metrics} aiActive={effectiveAI} />
      </motion.div>

      {/* Operational Metrics */}
      <div>
        <SectionHeader 
          title="Live Operational Metrics" 
          subtitle="Real-time performance indicators"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Power Output"
            value={metrics.power_output}
            unit="kW"
            icon={IconBolt}
            accent="blue"
            size="sm"
          />
          <StatCard
            label="Temperature"
            value={metrics.temperature}
            unit="°C"
            icon={IconThermometer}
            accent="amber"
            size="sm"
          />
          <StatCard
            label="Pressure"
            value={metrics.pressure}
            unit="bar"
            icon={IconGauge}
            accent="blue"
            size="sm"
          />
          <StatCard
            label="Valve Position"
            value={metrics.valve_position}
            unit="%"
            icon={IconValve}
            accent="green"
            size="sm"
          />
          <StatCard
            label="Efficiency"
            value={factory.efficiency_pct}
            unit="%"
            accent="purple"
            size="sm"
          />
        </div>
      </div>

      {/* Main Content: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Economics + Charts (2 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Economics Card */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6">
            <SectionHeader title="Financial Performance" />
            <div className="space-y-4">
              <EconomicsRow 
                label="Monthly Savings" 
                value={`₹${Number(factory.monthly_savings).toLocaleString("en-IN")}`} 
                accent="text-green-400"
              />
              <EconomicsRow 
                label="Our Revenue (20%)" 
                value={`₹${Number(factory.our_revenue).toLocaleString("en-IN")}`} 
                accent="text-blue-400"
              />
              <EconomicsRow 
                label="CO2 Reduction" 
                value={`${factory.co2_tons} tons/month`} 
                accent="text-amber-400"
              />
              <EconomicsRow 
                label="ROI" 
                value={`${factory.roi_pct}%`} 
                accent="text-green-400"
              />
            </div>
          </div>

          {/* Power Trend Chart */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-widest">
              Power Output Trend
            </h3>
            <LiveChart
              data={history}
              lines={[
                { key: "power_output", color: THEME.chart.power, name: "Actual Power" },
                { key: "predicted_power", color: THEME.chart.predicted, name: "AI Predicted" },
              ]}
              label=""
              unit="kW"
              area
              height={260}
              xKey="tick"
            />
          </div>

          {/* Revenue Trend Chart */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-widest">
              Revenue Trend (12 months)
            </h3>
            <LiveChart
              data={revenueTrend}
              lines={[{ key: "value", color: THEME.chart.success, name: "Revenue" }]}
              label=""
              unit="₹"
              area
              height={260}
              xKey="month"
            />
          </div>
        </motion.div>

        {/* RIGHT: AI/Safety/Insights (1 col) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          {/* AI Toggle */}
          <AIToggle enabled={effectiveAI} onToggle={() => {}} />

          {/* Safety Indicator */}
          <SafetyIndicator
            level={safety}
            overrides={safetyStat?.stats?.total_overrides ?? 0}
            pressureHeadroom={8.0 - (metrics.pressure ?? 5)}
            tempHeadroom={590 - (metrics.temperature ?? 450)}
          />

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-widest">
                AI Insights
              </h3>
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="text-sm text-gray-400 leading-relaxed">
                    <span className="text-gray-600">•</span> {insight}
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
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-700/50 last:border-0 last:pb-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`font-semibold ${accent}`}>{value}</span>
    </div>
  );
}
