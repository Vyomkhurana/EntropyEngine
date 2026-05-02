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

  // Calculate derived metrics
  const totalRevenue = overview?.total_revenue || 0;
  const mrr = overview?.mrr || 0;
  const totalCosts = totalRevenue * 0.35; // Assume 35% cost ratio
  const profit = totalRevenue - totalCosts;
  const numFactories = factories?.length || 0;
  const revenuePerFactory = numFactories > 0 ? totalRevenue / numFactories : 0;
  const avgSavingsPerFactory = factories?.length > 0 
    ? factories.reduce((sum, f) => sum + (f.monthly_savings || 0), 0) / factories.length 
    : 0;
  const totalCO2Saved = factories?.reduce((sum, f) => sum + (f.co2_tons || 0), 0) || 0;
  const growthPercent = 18; // Mock growth data
  
  // Revenue breakdown (mock)
  const performanceRevenue = totalRevenue * 0.60; // 60% from performance model
  const saasRevenue = totalRevenue * 0.25; // 25% from SaaS
  const enterpriseRevenue = totalRevenue * 0.15; // 15% from enterprise

  // Top performer
  const topFactory = factories?.reduce((best, f) => 
    (f.our_revenue > (best?.our_revenue || 0)) ? f : best, null);

  return (
    <div className="space-y-8">
      {/* ===== BUSINESS SUMMARY ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Business Summary
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Revenue, profitability, and growth at a glance
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock 
            label="Total Revenue" 
            value={`₹${(totalRevenue / 100000).toFixed(2)}L`} 
            subtext="All time" 
            accent="blue"
          />
          <MetricBlock 
            label="Monthly Revenue (MRR)" 
            value={`₹${(mrr / 1000).toFixed(1)}K`} 
            subtext="/month" 
            accent="emerald"
          />
          <MetricBlock 
            label="Profit" 
            value={`₹${(profit / 100000).toFixed(2)}L`} 
            subtext="35% margin" 
            accent="blue"
          />
          <MetricBlock 
            label="Growth" 
            value={`+${growthPercent}%`} 
            subtext="MoM" 
            accent="green"
          />
        </div>
      </div>

      {/* ===== CONNECTED FACTORIES SNAPSHOT ===== */}
      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
              Connected Factories
            </h2>
            <p className="text-[13px]" style={{ color: "#64748B" }}>
              The active sites currently driving revenue and savings
            </p>
          </div>
          <div className="text-[12px] font-medium" style={{ color: "#16A34A" }}>
            {numFactories} live sites
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {factories?.slice(0, 5).map((factory, index) => (
            <div key={factory.id} className="p-4 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
                    Plant {index + 1}
                  </div>
                  <div className="font-semibold" style={{ color: "#0F172A" }}>
                    {factory.name}
                  </div>
                  <div className="text-[12px]" style={{ color: "#64748B" }}>
                    {factory.location}
                  </div>
                </div>
                <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: index === 0 ? "#F0FDF4" : "#F8FAFC", color: index === 0 ? "#16A34A" : "#64748B", border: "1px solid #E2E8F0" }}>
                  {index === 0 ? "Top" : "Live"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: "#64748B" }}>Revenue</span>
                  <span className="font-semibold" style={{ color: "#16A34A" }}>₹{(factory.our_revenue || 0).toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: "#64748B" }}>Efficiency</span>
                  <span className="font-semibold" style={{ color: "#0F172A" }}>{(factory.efficiency_pct || 0).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: "#64748B" }}>Savings</span>
                  <span className="font-semibold" style={{ color: "#2563EB" }}>₹{(factory.monthly_savings || 0).toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== REVENUE BREAKDOWN ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Revenue Sources
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Where our ₹{(totalRevenue / 100000).toFixed(1)}L annual revenue comes from
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RevenueSourceCard 
            title="Performance Revenue" 
            amount={performanceRevenue}
            percent={60}
            description="20% energy savings model"
            color="#2563EB"
          />
          <RevenueSourceCard 
            title="SaaS Subscription" 
            amount={saasRevenue}
            percent={25}
            description="Monthly platform fees"
            color="#16A34A"
          />
          <RevenueSourceCard 
            title="Enterprise Licensing" 
            amount={enterpriseRevenue}
            percent={15}
            description="Custom implementations"
            color="#7C3AED"
          />
        </div>
      </div>

      {/* ===== MAIN CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LiveChart
            data={revenue}
            lines={[{ key: "revenue", color: "#16A34A", name: "Revenue" }]}
            label="Revenue Trend"
            unit="₹"
            area
            height={220}
          />
        </div>

        {/* TOP FACTORY PERFORMER */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#0F172A" }}>Top Performer</h3>
          {topFactory ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: "#FCD34D", color: "#000" }}>
                  ⭐ TOP
                </div>
                <div>
                  <div className="font-semibold" style={{ color: "#0F172A" }}>{topFactory.name}</div>
                  <div className="text-[12px]" style={{ color: "#64748B" }}>{topFactory.location}</div>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "#64748B" }}>Revenue Generated</span>
                  <span className="font-semibold" style={{ color: "#16A34A" }}>₹{(topFactory.our_revenue || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "#64748B" }}>Efficiency</span>
                  <span className="font-semibold" style={{ color: "#0F172A" }}>{(topFactory.efficiency_pct || 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "#64748B" }}>Monthly Savings</span>
                  <span className="font-semibold" style={{ color: "#2563EB" }}>₹{(topFactory.monthly_savings || 0).toFixed(0)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#64748B" }}>No factories yet</div>
          )}
        </div>
      </div>

      {/* ===== UNIT ECONOMICS ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Unit Economics
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Per-factory performance and efficiency metrics
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock 
            label="Avg Revenue/Factory" 
            value={`₹${(revenuePerFactory / 1000).toFixed(1)}K`} 
            subtext={`across ${numFactories} sites`}
            accent="blue"
          />
          <MetricBlock 
            label="Avg Savings/Factory" 
            value={`₹${(avgSavingsPerFactory / 1000).toFixed(1)}K`} 
            subtext="monthly" 
            accent="emerald"
          />
          <MetricBlock 
            label="Customer Acquisition Cost" 
            value="₹45K" 
            subtext="per factory" 
            accent="orange"
          />
          <MetricBlock 
            label="Payback Period" 
            value="3.2 mo" 
            subtext="avg ROI" 
            accent="green"
          />
        </div>
      </div>

      {/* ===== TOP FACTORIES TABLE ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Factory Ranking
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Performance across all operational sites
          </p>
        </div>
        <div className="p-6 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div className="space-y-3">
            {factories?.slice(0, 5).map((f, idx) => (
              <div key={f.id} className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold" 
                    style={{ 
                      backgroundColor: idx === 0 ? "#FCD34D" : "#F3F4F6",
                      color: idx === 0 ? "#000" : "#0F172A"
                    }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: "#0F172A" }}>{f.name}</div>
                    <div className="text-[12px]" style={{ color: "#64748B" }}>{f.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[12px]" style={{ color: "#64748B" }}>Revenue</div>
                    <div className="font-semibold" style={{ color: "#16A34A" }}>₹{(f.our_revenue || 0).toFixed(0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px]" style={{ color: "#64748B" }}>Efficiency</div>
                    <div className="font-semibold" style={{ color: "#0F172A" }}>{(f.efficiency_pct || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SUSTAINABILITY + BUSINESS IMPACT ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Sustainability Impact = Revenue
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            How environmental impact drives business value
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SustainabilityCard 
            icon="🌱"
            title="CO₂ Reduced" 
            value={`${totalCO2Saved.toFixed(1)} tons`}
            subtitle="equivalent to 500+ trees"
          />
          <SustainabilityCard 
            icon="⚡"
            title="Energy Saved" 
            value="2.4M kWh"
            subtitle="annual consumption"
          />
          <SustainabilityCard 
            icon="💚"
            title="Revenue from Impact" 
            value={`₹${(totalRevenue * 0.6 / 100000).toFixed(2)}L`}
            subtitle="performance model revenue"
          />
        </div>
      </div>

      {/* ===== GROWTH INSIGHTS ===== */}
      <div className="p-6 rounded-lg" style={{ backgroundColor: "#F0FDF4", border: "1px solid #DCFCE7" }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "#166534" }}>📈 Key Insights</h3>
        <div className="space-y-2 text-[13px]" style={{ color: "#166534" }}>
          <div>✓ Revenue grew <span className="font-semibold">18% this month</span> — strong performance model traction</div>
          <div>✓ <span className="font-semibold">{topFactory?.name}</span> contributes <span className="font-semibold">22% of total profit</span> — top investment opportunity</div>
          <div>✓ Energy savings increased by <span className="font-semibold">12%</span> — better AI optimization</div>
          <div>✓ Average efficiency across fleet: <span className="font-semibold">85.5%</span> — industry-leading</div>
        </div>
      </div>
    </div>
  );
}

// ===== COMPONENT: METRIC BLOCK =====
function MetricBlock({ label, value, subtext, accent = "blue" }) {
  const accentColor = {
    blue: "#2563EB",
    emerald: "#16A34A",
    cyan: "#06B6D4",
    orange: "#EA580C",
    green: "#16A34A"
  }[accent];

  return (
    <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#64748B" }}>
        {label}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: accentColor }}>
        {value}
      </div>
      <div className="text-[12px]" style={{ color: "#64748B" }}>
        {subtext}
      </div>
    </div>
  );
}

// ===== COMPONENT: REVENUE SOURCE CARD =====
function RevenueSourceCard({ title, amount, percent, description, color }) {
  return (
    <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold" style={{ color: "#0F172A" }}>{title}</h4>
        <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: color + "20", color }}>
          {percent}%
        </div>
      </div>
      <div className="text-2xl font-bold mb-2" style={{ color }}>
        ₹{(amount / 100000).toFixed(2)}L
      </div>
      <div className="text-[12px]" style={{ color: "#64748B" }}>
        {description}
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: "#E2E8F0" }}>
        <div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
}

// ===== COMPONENT: SUSTAINABILITY CARD =====
function SustainabilityCard({ icon, title, value, subtitle }) {
  return (
    <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
        {title}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: "#16A34A" }}>
        {value}
      </div>
      <div className="text-[12px]" style={{ color: "#64748B" }}>
        {subtitle}
      </div>
    </div>
  );
}
