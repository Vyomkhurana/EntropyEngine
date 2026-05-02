import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";
import { fetchRevenue } from "../services/api";
import { THEME } from "../constants/theme";
import LiveChart from "../components/LiveChart";
import HeroCard from "../components/HeroCard";
import StatCard from "../components/StatCard";
import SectionHeader from "../components/SectionHeader";
import { IconDollar, IconLeaf, IconBolt, IconBarChart } from "../components/Icons";

export default function CentralBusinessDashboard() {
  const { overview, factories } = useFactories();
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    let active = true;
    fetchRevenue(12).then((data) => {
      if (active) {
        setRevenue(
          data.map((item) => ({
            month: item.month,
            revenue: item.revenue,
          }))
        );
      }
    });
    return () => { active = false; };
  }, []);

  const savingsTrend = useMemo(() => {
    return (overview?.savings_trend ?? []).map((item) => ({
      month: item.month,
      savings: item.value,
    }));
  }, [overview]);

  const totalRevenue = overview?.total_revenue ?? 0;
  const monthlyRevenue = overview?.monthly_revenue ?? 0;
  const co2Reduced = overview?.co2_reduced_tons ?? 0;
  const energySaved = overview?.total_energy_saved_kwh ?? 0;
  const totalFactories = overview?.total_factories ?? factories.length;
  const avgEfficiency = 87;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="pt-2">
        <h1 className="text-4xl font-bold text-white mb-2">Business Overview</h1>
        <p className="text-gray-400 text-base">
          Company-wide metrics across {totalFactories} connected factories
        </p>
      </div>

      {/* HERO SECTION - Total Business Impact */}
      <HeroCard
        title="Total Business Impact"
        value={totalRevenue}
        unit="₹"
        trend="+18% this month"
        trendLabel="vs. last month"
        subtext={`${totalFactories} factories · ${co2Reduced} tons CO2 avoided · ${(energySaved / 1000).toFixed(0)}k kWh saved`}
        icon={IconDollar}
      />

      {/* BUSINESS SECTION */}
      <div>
        <SectionHeader 
          title="Revenue & Growth" 
          subtitle="Financial performance across all operations"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            label="Monthly Revenue"
            value={monthlyRevenue}
            unit="₹"
            accent="green"
            size="lg"
            subtext="Current MRR"
          />
          <StatCard
            label="Our Revenue Share"
            value={monthlyRevenue * 0.2}
            unit="₹"
            accent="blue"
            size="lg"
            subtext="20% of customer savings"
          />
        </div>

        {/* Revenue Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6 rounded-lg border border-gray-700 bg-gray-800/40 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-widest">
            Revenue Trend (12 months)
          </h3>
          <LiveChart
            data={revenue}
            lines={[{ key: "revenue", color: THEME.chart.power, name: "Revenue" }]}
            label=""
            unit="₹"
            area
            height={280}
            xKey="month"
          />
        </motion.div>
      </div>

      {/* SUSTAINABILITY SECTION */}
      <div>
        <SectionHeader 
          title="Sustainability Impact" 
          subtitle="Environmental benefits and energy efficiency"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            label="CO2 Reduced"
            value={co2Reduced}
            unit="metric tons"
            accent="green"
            size="lg"
            icon={IconLeaf}
            subtext="Monthly avoided emissions"
          />
          <StatCard
            label="Energy Saved"
            value={energySaved}
            unit="kWh"
            accent="blue"
            size="lg"
            icon={IconBolt}
            subtext="Monthly aggregate"
          />
        </div>

        {/* Savings Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 rounded-lg border border-gray-700 bg-gray-800/40 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-widest">
            Savings Trend (12 months)
          </h3>
          <LiveChart
            data={savingsTrend}
            lines={[{ key: "savings", color: THEME.chart.valve, name: "Savings" }]}
            label=""
            unit="kWh"
            area
            height={280}
            xKey="month"
          />
        </motion.div>
      </div>

      {/* OPERATIONS SECTION */}
      <div>
        <SectionHeader 
          title="Operations & Fleet" 
          subtitle="Factory performance and efficiency metrics"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Factories Connected"
            value={totalFactories}
            unit="active"
            accent="purple"
            size="md"
            icon={IconBarChart}
          />
          <StatCard
            label="Average Efficiency"
            value={avgEfficiency}
            unit="%"
            accent="blue"
            size="md"
          />
          <StatCard
            label="System Uptime"
            value={99.8}
            unit="%"
            accent="green"
            size="md"
          />
        </div>
      </div>
    </div>
  );
}
