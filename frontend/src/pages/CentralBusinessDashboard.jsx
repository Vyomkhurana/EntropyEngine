import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";
import { fetchRevenue } from "../services/api";
import LiveChart from "../components/LiveChart";
import KPICard from "../components/KPICard";
import HeroMetric from "../components/HeroMetric";

export default function CentralBusinessDashboard() {
  const { overview, factories } = useFactories();
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    let active = true;
    fetchRevenue(12).then((data) => {
      if (active) {
        setRevenue(
          data.map((item, index) => ({
            tick: index + 1,
            month: item.month,
            revenue: item.revenue,
          }))
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const savingsTrend = useMemo(() => {
    return (overview?.savings_trend ?? []).map((item, index) => ({
      tick: index + 1,
      month: item.month,
      savings: item.value,
    }));
  }, [overview]);

  const split = overview?.revenue_split ?? {};
  const totalImpactSummary = `${overview?.total_factories ?? factories.length} factories connected, ${overview?.co2_reduced_tons ?? 0} tons CO2 avoided`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Business Overview</h1>
        <p className="text-slate-400 text-base">Company-wide revenue and sustainability metrics across all connected factories</p>
      </div>

      {/* Hero Metric - Total Revenue */}
      <HeroMetric
        label="Total Revenue"
        value={overview?.total_revenue ?? 0}
        unit="₹"
        subtext={totalImpactSummary}
      />

      {/* Key Metrics Row - Business Focus */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">Business Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Monthly Revenue" value={overview?.monthly_revenue} unit="₹/mo" color="emerald" sub="Current MRR" />
          <KPICard label="Revenue (20%)" value={overview?.monthly_revenue} unit="₹" color="blue" sub="Our portion of savings" />
          <KPICard label="Factories Active" value={overview?.total_factories ?? factories.length} color="cyan" sub="Connected clients" />
          <KPICard label="Avg Efficiency" value={87} unit="%" color="purple" sub="Across fleet" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-6">Revenue Trend (12 months)</h2>
            <LiveChart
              data={revenue}
              lines={[{ key: "revenue", color: "#3b82f6", name: "Revenue" }]}
              label=""
              unit="₹"
              area
              height={280}
              xKey="month"
            />
          </div>
        </motion.div>

        {/* Sidebar - Savings & Split */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          {/* CO2 & Energy Summary */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">Sustainability Impact</h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">CO2 Avoided</div>
                <div className="text-2xl font-bold text-green-500">{overview?.co2_reduced_tons ?? 0}</div>
                <div className="text-xs text-slate-500">metric tons</div>
              </div>
              <div className="border-t border-slate-800 pt-4">
                <div className="text-xs text-slate-500 mb-1">Energy Saved</div>
                <div className="text-2xl font-bold text-blue-500">{Number(overview?.total_energy_saved_kwh ?? 0).toLocaleString()}</div>
                <div className="text-xs text-slate-500">kWh monthly</div>
              </div>
            </div>
          </div>

          {/* Revenue Split */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">Revenue Mix</h2>
            <div className="space-y-3">
              <RevenueSplit label="Performance" value={split.performance_based} color="text-cyan-500" />
              <RevenueSplit label="SaaS" value={split.saaS} color="text-emerald-500" />
              <RevenueSplit label="Enterprise" value={split.enterprise} color="text-orange-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Savings Trend */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-6">Energy Savings Trend</h2>
          <LiveChart
            data={savingsTrend}
            lines={[{ key: "savings", color: "#10b981", name: "Savings" }]}
            label=""
            unit="kWh"
            area
            height={240}
            xKey="month"
          />
        </div>
      </motion.div>
    </div>
  );
}

function RevenueSplit({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`font-semibold ${color}`}>₹{Number(value ?? 0).toLocaleString("en-IN")}</span>
    </div>
  );
}
