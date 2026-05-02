import React, { useEffect, useState } from "react";
import { useFactories } from "../context/FactoriesContext";
import LiveChart from "../components/LiveChart";
import KPICard from "../components/KPICard";

export default function BusinessDashboard() {
  const { overview, factories, loading, fetchRevenue } = useFactories();
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchRevenue(12).then((d) => { if (mounted) setRevenue(d.map((p, idx) => ({ ...p, tick: idx, revenue: p.revenue }))); });
    return () => (mounted = false);
  }, [fetchRevenue]);

  if (loading) return <div className="p-6">Loading business data…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard label="Total Revenue" value={overview?.total_revenue} unit="₹" color="blue" />
        <KPICard label="MRR" value={overview?.mrr} unit="₹/mo" color="emerald" />
        <KPICard label="Factories" value={overview?.total_factories} color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LiveChart
            data={revenue}
            lines={[{ key: "revenue", color: "#3b82f6", name: "Revenue" }]}
            label="Revenue"
            unit="₹"
            area
            height={220}
          />
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm text-slate-400 font-semibold mb-3">Top Factories</h3>
          <ul className="space-y-2">
            {factories?.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-[12px] text-slate-500">{f.location}</div>
                </div>
                <div className="text-sm font-mono-num">₹{f.our_revenue}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RevenuePlaceholder() {
  // Tiny placeholder to avoid adding new chart libs here.
  return <div className="h-48 flex items-center justify-center text-slate-500">Revenue chart (demo)</div>;
}
