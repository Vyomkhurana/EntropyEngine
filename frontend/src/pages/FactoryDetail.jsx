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
      value: base > 0 ? Math.max(0, base * (0.18 + index * 0.01)) : 0,
    }));
  }, [factory, history]);

  if (loading) {
    return <div className="text-slate-400">Loading factory detail…</div>;
  }

  if (!factory) {
    return <div className="text-slate-400">Factory not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Factory Detail</div>
          <h1 className="text-3xl font-semibold text-white mt-2">{factory.name}</h1>
          <p className="text-slate-400 mt-2">{factory.location} · {factory.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <KPICard label="Power Output" value={metrics.power_output} unit="kW" icon={IconBolt} color="blue" sub="Live operational metric" />
        <KPICard label="Temperature" value={metrics.temperature} unit="°C" icon={IconThermometer} color="orange" />
        <KPICard label="Pressure" value={metrics.pressure} unit="bar" icon={IconGauge} color="cyan" />
        <KPICard label="Valve Position" value={metrics.valve_position} unit="%" icon={IconValve} color="emerald" />
        <KPICard label="Efficiency" value={factory.efficiency_pct} unit="%" color="purple" sub="Factory efficiency" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div className="glass-card p-5 xl:col-span-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <FactoryScene metrics={metrics} aiActive={effectiveAI} />
        </motion.div>

        <div className="space-y-4">
          <div className="glass-card p-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Factory Economics</div>
            <EconomicsRow label="Savings generated" value={`₹${Number(factory.monthly_savings).toLocaleString("en-IN")}`} />
            <EconomicsRow label="Our revenue (20%)" value={`₹${Number(factory.our_revenue).toLocaleString("en-IN")}`} />
            <EconomicsRow label="CO2 reduction" value={`${factory.co2_tons} tons`} />
            <EconomicsRow label="ROI" value={`${factory.roi_pct}%`} />
          </div>

          <AIToggle enabled={effectiveAI} onToggle={() => {}} />
          <SafetyIndicator
            level={safety}
            overrides={safetyStat?.stats?.total_overrides ?? 0}
            pressureHeadroom={8.0 - (metrics.pressure ?? 5)}
            tempHeadroom={590 - (metrics.temperature ?? 450)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div className="glass-card p-5 xl:col-span-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <LiveChart
            data={history}
            lines={[
              { key: "power_output", color: THEME.chart.power, name: "Power" },
              { key: "predicted_power", color: THEME.chart.predicted, name: "AI Predicted" },
            ]}
            label="Factory Power Trend"
            unit="kW"
            area
          />
        </motion.div>

        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">AI Insights</div>
          <div className="mt-4 space-y-3">
            {insights.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-950/40 border border-slate-800/80 p-3 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <LiveChart
            data={revenueTrend}
            lines={[{ key: "value", color: "#22c55e", name: "Savings Based Revenue" }]}
            label="Savings Revenue Trend"
            unit="₹"
            area
            xKey="tick"
          />
        </motion.div>

        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <ComparisonPanel comparison={comparison} />
        </motion.div>
      </div>
    </div>
  );
}

function EconomicsRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
