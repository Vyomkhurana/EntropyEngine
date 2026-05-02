import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";
import { fetchRevenue } from "../services/api";
import LiveChart from "../components/LiveChart";
import KPICard from "../components/KPICard";

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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Central Business Dashboard</div>
          <h1 className="text-3xl font-semibold text-white mt-2">Company-wide revenue and sustainability view</h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            This screen represents the company, not a single factory. It combines revenue, savings, carbon impact, and connected factory count.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard label="Total Revenue" value={overview?.total_revenue} unit="₹" color="blue" sub="All revenue streams" />
        <KPICard label="Monthly Revenue" value={overview?.monthly_revenue} unit="₹/mo" color="emerald" sub="Current MRR" />
        <KPICard label="Factories Connected" value={overview?.total_factories ?? factories.length} color="cyan" sub="Active client factories" />
        <KPICard label="CO2 Reduced" value={overview?.co2_reduced_tons} unit="tons" color="purple" sub="Estimated avoided emissions" />
        <KPICard label="Energy Saved" value={overview?.total_energy_saved_kwh} unit="kWh" color="orange" sub="Monthly aggregate savings" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-5 xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
              <p className="text-sm text-slate-500">Monthly revenue across the business</p>
            </div>
          </div>
          <LiveChart
            data={revenue}
            lines={[{ key: "revenue", color: "#38bdf8", name: "Revenue" }]}
            label="Revenue Trend"
            unit="₹"
            area
            height={220}
            xKey="month"
          />
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="glass-card p-5"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Revenue Split</div>
            <div className="mt-4 space-y-4">
              <SplitRow label="Performance (20%)" value={split.performance_based} accent="text-cyan-300" />
              <SplitRow label="SaaS" value={split.saaS} accent="text-emerald-300" />
              <SplitRow label="Enterprise" value={split.enterprise} accent="text-orange-300" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-5"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Savings Trend</div>
            <div className="mt-3 text-sm text-slate-400">Monthly energy savings across connected factories</div>
            <div className="mt-4">
              <LiveChart
                data={savingsTrend}
                lines={[{ key: "savings", color: "#22c55e", name: "Savings" }]}
                label="Savings Trend"
                unit="kWh"
                area
                height={180}
                xKey="month"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SplitRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${accent}`}>₹{Number(value ?? 0).toLocaleString("en-IN")}</span>
    </div>
  );
}
