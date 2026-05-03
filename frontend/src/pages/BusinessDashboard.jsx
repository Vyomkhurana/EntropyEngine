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
  const grossMarginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const ltv = mrr * 12 * 0.65;
  const revenuePerTonCO2 = totalCO2Saved > 0 ? totalRevenue / totalCO2Saved : 0;
  const scaleTargetFactories = 20;
  const projectedScale = numFactories > 0 ? scaleTargetFactories / numFactories : 4;
  const projectedRevenue = totalRevenue * projectedScale;
  const projectedProfit = profit * projectedScale;
  const projectedCO2 = totalCO2Saved * projectedScale;
  const averageRevenuePerFactory = numFactories > 0 ? totalRevenue / numFactories : 0;
  const opportunityFactory = factories?.length
    ? [...factories].sort((a, b) => (a.efficiency_pct || 0) - (b.efficiency_pct || 0))[0]
    : null;
  const opportunityRegion = factories?.length
    ? Object.values(
        factories.reduce((acc, factory) => {
          const region = (factory.location || "Unknown").split(",")[0];
          if (!acc[region]) {
            acc[region] = { region, totalRevenue: 0, efficiencyTotal: 0, count: 0 };
          }
          acc[region].totalRevenue += factory.our_revenue || 0;
          acc[region].efficiencyTotal += factory.efficiency_pct || 0;
          acc[region].count += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.totalRevenue - a.totalRevenue)[0]
    : null;
  const bestRegion = factories?.length
    ? Object.values(
        factories.reduce((acc, factory) => {
          const region = (factory.location || "Unknown").split(",")[0];
          if (!acc[region]) {
            acc[region] = { region, totalRevenue: 0, efficiencyTotal: 0, count: 0 };
          }
          acc[region].totalRevenue += factory.our_revenue || 0;
          acc[region].efficiencyTotal += factory.efficiency_pct || 0;
          acc[region].count += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.totalRevenue - a.totalRevenue)[0]
    : null;
  const efficiencyRegion = factories?.length
    ? Object.values(
        factories.reduce((acc, factory) => {
          const region = (factory.location || "Unknown").split(",")[0];
          if (!acc[region]) {
            acc[region] = { region, totalRevenue: 0, efficiencyTotal: 0, count: 0 };
          }
          acc[region].totalRevenue += factory.our_revenue || 0;
          acc[region].efficiencyTotal += factory.efficiency_pct || 0;
          acc[region].count += 1;
          return acc;
        }, {})
      ).sort((a, b) => (b.efficiencyTotal / b.count) - (a.efficiencyTotal / a.count))[0]
    : null;
  
  // Revenue breakdown (mock)
  const performanceRevenue = totalRevenue * 0.60; // 60% from performance model
  const saasRevenue = totalRevenue * 0.25; // 25% from SaaS
  const enterpriseRevenue = totalRevenue * 0.15; // 15% from enterprise

  // Top performer
  const topFactory = factories?.reduce((best, f) => 
    (f.our_revenue > (best?.our_revenue || 0)) ? f : best, null);
  const sortedFactories = factories ? [...factories].sort((a, b) => (b.our_revenue || 0) - (a.our_revenue || 0)) : [];
  const recommendedActions = [
    topFactory && {
      title: `Expand to 3 more factories like ${topFactory.name}`,
      detail: `Potential +₹${((topFactory.our_revenue || 0) * 3).toLocaleString("en-IN")} / month`,
      badge: "Scale",
      tone: "blue",
    },
    opportunityFactory && {
      title: `Improve efficiency in ${opportunityFactory.name}`,
      detail: `Unlock ₹${Math.max(0, Math.round(averageRevenuePerFactory - (opportunityFactory.our_revenue || 0))).toLocaleString("en-IN")} additional revenue`,
      badge: "Opportunity",
      tone: "amber",
    },
    bestRegion && {
      title: `${bestRegion.region} region has the highest ROI`,
      detail: `Prioritize expansion in ${bestRegion.region} for faster payback`,
      badge: "Priority",
      tone: "green",
    },
  ].filter(Boolean);

  const profitDrivers = [
    { label: "Efficiency improvements", value: 42, color: "#16A34A", description: "Savings captured from better plant performance" },
    { label: "AI optimization", value: 33, color: "#2563EB", description: "Revenue from automated control gains" },
    { label: "Subscriptions", value: 25, color: "#7C3AED", description: "Recurring SaaS platform income" },
  ];

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
                <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: getFactoryTone(factory, index).bg, color: getFactoryTone(factory, index).fg, border: "1px solid #E2E8F0" }}>
                  {getFactoryTone(factory, index).label}
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

      {/* ===== DECISION PANEL ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Recommended Actions
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Founder-grade decisions for the next growth move
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedActions.map((action) => (
            <div key={action.title} className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: badgeTone(action.tone).fg }}>
                  {action.badge}
                </span>
                <div className="px-2 py-1 rounded text-[11px] font-bold" style={{ backgroundColor: badgeTone(action.tone).bg, color: badgeTone(action.tone).fg }}>
                  Action
                </div>
              </div>
              <div className="font-semibold mb-2" style={{ color: "#0F172A" }}>
                {action.title}
              </div>
              <div className="text-[13px]" style={{ color: "#64748B" }}>
                {action.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== GROWTH PROJECTION ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Growth Projection
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            If we scale from {numFactories} factories to {scaleTargetFactories}, here is the business outcome
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock label="Current Factories" value={`${numFactories}`} subtext="live sites" accent="blue" />
          <MetricBlock label="Projected Revenue" value={`₹${(projectedRevenue / 100000).toFixed(2)}L`} subtext={`at ${scaleTargetFactories} factories`} accent="emerald" />
          <MetricBlock label="Projected Profit" value={`₹${(projectedProfit / 100000).toFixed(2)}L`} subtext="scaled model" accent="green" />
          <MetricBlock label="Projected CO₂ Reduction" value={`${projectedCO2.toFixed(1)} tons`} subtext="expansion impact" accent="cyan" />
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

      {/* ===== PROFIT DRIVERS ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            What drives our revenue?
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Less data, more meaning: the three sources behind the business model
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profitDrivers.map((driver) => (
            <div key={driver.label} className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold" style={{ color: "#0F172A" }}>{driver.label}</h4>
                <span className="text-[11px] font-bold" style={{ color: driver.color }}>{driver.value}%</span>
              </div>
              <div className="h-2 rounded-full mb-3" style={{ backgroundColor: "#E2E8F0" }}>
                <div className="h-2 rounded-full" style={{ width: `${driver.value}%`, backgroundColor: driver.color }} />
              </div>
              <div className="text-[13px]" style={{ color: "#64748B" }}>{driver.description}</div>
            </div>
          ))}
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

      {/* ===== STARTUP METRICS ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Startup Metrics
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Founder and investor numbers that matter
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock label="LTV" value={`₹${(ltv / 1000).toFixed(1)}K`} subtext="annualized customer value" accent="blue" />
          <MetricBlock label="CAC" value="₹45K" subtext="cost to acquire one factory" accent="orange" />
          <MetricBlock label="Payback Period" value="3.2 mo" subtext="time to recover CAC" accent="green" />
          <MetricBlock label="Gross Margin" value={`${grossMarginPct.toFixed(0)}%`} subtext="profit quality" accent="emerald" />
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
            {sortedFactories.slice(0, 5).map((f, idx) => (
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
                    <div className="flex items-center gap-2">
                      <div className="font-medium" style={{ color: "#0F172A" }}>{f.name}</div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: getFactoryTone(f, idx).bg, color: getFactoryTone(f, idx).fg }}>
                        {getFactoryTone(f, idx).label}
                      </span>
                    </div>
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

      {/* ===== REGION-WISE INSIGHT ===== */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
            Region-wise Insight
          </h2>
          <p className="text-[13px]" style={{ color: "#64748B" }}>
            Where to scale next based on ROI and efficiency signals
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>Best ROI</div>
            <div className="text-lg font-semibold" style={{ color: "#0F172A" }}>{bestRegion ? `${bestRegion.region} → highest ROI` : "Mumbai → highest ROI"}</div>
          </div>
          <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>Most Efficient</div>
            <div className="text-lg font-semibold" style={{ color: "#0F172A" }}>{efficiencyRegion ? `${efficiencyRegion.region} → highest efficiency` : "Chennai → high efficiency"}</div>
          </div>
          <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>Opportunity</div>
            <div className="text-lg font-semibold" style={{ color: "#0F172A" }}>{opportunityRegion ? `${opportunityRegion.region} → expansion candidate` : "Bengaluru → improvement opportunity"}</div>
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
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <div className="text-[13px]" style={{ color: "#0F172A" }}>
            For every 1 ton CO₂ reduced → <span className="font-semibold" style={{ color: "#16A34A" }}>₹{revenuePerTonCO2.toFixed(0)}</span> revenue generated
          </div>
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

function badgeTone(tone) {
  const map = {
    blue: { bg: "#EFF6FF", fg: "#2563EB" },
    green: { bg: "#F0FDF4", fg: "#16A34A" },
    amber: { bg: "#FFFBEB", fg: "#D97706" },
    red: { bg: "#FEF2F2", fg: "#DC2626" },
  };
  return map[tone] || map.blue;
}

function getFactoryTone(factory, index) {
  const revenue = factory?.our_revenue || 0;
  const efficiency = factory?.efficiency_pct || 0;
  if (index === 0) return { ...badgeTone("blue"), label: "Top Performer" };
  if (efficiency < 80) return { ...badgeTone("amber"), label: "Optimization Opportunity" };
  if (revenue >= 70000) return { ...badgeTone("green"), label: "High Profit" };
  if (efficiency >= 90) return { ...badgeTone("green"), label: "High Efficiency" };
  return { ...badgeTone("blue"), label: "Live" };
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
