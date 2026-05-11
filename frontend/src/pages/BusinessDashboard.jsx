import React, { useMemo } from "react";
import { useSimulation } from "../context/SimulationContext";
import LiveChart from "../components/LiveChart";

export default function BusinessDashboard() {
  const sim = useSimulation();
  const simBusiness = sim?.business || {};
  const liveFactories = sim?.factories || {};
  const liveFactoryList = Object.values(liveFactories);
  const metrics = sim?.optimizationMetrics || {};
  const safety = sim?.safetyState?.level || "NORMAL";
  const aiMode = Boolean(sim?.aiEnabled);
  const confidence = { confidence: sim?.confidence ?? 0 };
  const viewportFactories = liveFactoryList.length > 0
    ? liveFactoryList.map((f) => ({
        id: f.id,
        name: f.name,
        location: f.location || "Industrial Zone",
        monthly_revenue_usd: f.monthly_revenue_usd || 0,
        monthly_savings_usd: f.monthly_savings_usd || 0,
        potential_savings_usd: f.potential_savings_usd || 0,
        efficiency_improvement_pct: Math.max(0, (f.efficiency || 76) - 76),
      }))
    : [];

  // Derived metrics
  const totalRevenue = simBusiness.annualRevenueUsd || 0;
  const mrr = simBusiness.mrrUsd || 0;
  const totalProfit = totalRevenue * 0.35;
  const co2Avoided = simBusiness.co2AvoidedTons || 0;
  const numFactories = liveFactoryList.length;
  const energyGenerated = Math.max(0, (metrics.power_output || 0) * 730);
  const baseEfficiency = Math.max(0, Math.min(100, metrics.efficiency_pct || 0));
  const optimizationGainPct = aiMode ? Math.max(0, baseEfficiency - 76) : 0;
  const monthlyAiSavings = aiMode ? (simBusiness.monthlySavingsUsd || 0) : 0;
  const potentialMonthlySavings = simBusiness.potentialMonthlySavingsUsd || 0;
  const baselineMonthlyValue = simBusiness.baselineMonthlyValueUsd || 0;
  const safeRevenue = Math.max(1, totalRevenue);
  
  // Unit Economics
  const avgRevenuePerFactory = numFactories > 0 ? totalRevenue / numFactories : 0;
  const avgSavingsPerFactory = viewportFactories.length > 0 ? viewportFactories.reduce((s, f) => s + (f.monthly_savings_usd || 0), 0) / viewportFactories.length : 0;
  const revenuePerTonCO2 = co2Avoided > 0 ? totalRevenue / co2Avoided : 0;
  
  // Top performers
  const topFactory = viewportFactories.length > 0 ? [...viewportFactories].sort((a, b) => (b.monthly_revenue_usd || 0) - (a.monthly_revenue_usd || 0))[0] : null;
  const mostEfficient = viewportFactories.length > 0 ? [...viewportFactories].sort((a, b) => (b.efficiency_improvement_pct || 0) - (a.efficiency_improvement_pct || 0))[0] : null;
  
  // Revenue breakdown
  const perfRevenue = totalRevenue * 0.6;
  const saasRevenue = totalRevenue * 0.25;
  const enterpriseRevenue = totalRevenue * 0.15;
  const monthlyRevenueStream = mrr || totalRevenue / 12;
  const monthlyProfit = monthlyRevenueStream * 0.35;
  
  // Growth projection
  const scaleTarget = Math.max(numFactories, 1) * 2;
  const projectedRevenue = totalRevenue * (scaleTarget / Math.max(1, numFactories));
  const projectedProfit = totalProfit * (scaleTarget / Math.max(1, numFactories));
  const projectedCO2 = co2Avoided * (scaleTarget / Math.max(1, numFactories));
  const adjustedGrossMargin = Number.isFinite((monthlyProfit / Math.max(1, monthlyRevenueStream)) * 100)
    ? Math.max(52, Math.min(78, (monthlyProfit / Math.max(1, monthlyRevenueStream)) * 100))
    : 66;
  const systemUptime = 99.8;
  const safetyComplianceScore = 100;
  const aiConfidenceScore = Math.min(100, 65 + (aiMode ? 25 : 0) + (confidence?.confidence || 0) / 2);
  const operationalHealthScore = Math.min(100, baseEfficiency + 8);
  const anomalyCount = aiMode ? 0 : 1;
  const insights = [
    aiMode && `AI optimization is delivering ${optimizationGainPct.toFixed(1)}% efficiency gain over baseline`,
    !aiMode && `Manual baseline mode active: no AI savings are counted until optimization is enabled`,
    topFactory && `${topFactory.name} contributes ${Math.max(0, Math.round((topFactory.monthly_revenue_usd || 0) / Math.max(1, monthlyRevenueStream) * 100))}% of monthly value`,
    `Potential monthly savings if optimized: $${potentialMonthlySavings.toFixed(0)}`,
    `Baseline monthly operating value: $${baselineMonthlyValue.toFixed(0)}`,
  ].filter(Boolean);

  const revenue = useMemo(() => {
    const monthly = mrr;
    return Array.from({ length: 12 }, (_, idx) => ({
      tick: idx,
      revenue: monthly * (0.92 + idx * 0.01),
    }));
  }, [mrr]);

  const sparkTrend = useMemo(() => [
    Math.max(0, baseEfficiency - 2.5),
    Math.max(0, baseEfficiency - 2.2),
    Math.max(0, baseEfficiency - 2.0),
    Math.max(0, baseEfficiency - 1.6),
    Math.max(0, baseEfficiency - 1.2),
    Math.max(0, baseEfficiency - 0.8),
    Math.max(0, baseEfficiency - 0.5),
    Math.max(0, baseEfficiency - 0.2),
    baseEfficiency,
  ], [baseEfficiency]);
  const growthTrend = useMemo(() => [
    Math.max(0, mrr * 0.90),
    Math.max(0, mrr * 0.92),
    Math.max(0, mrr * 0.94),
    Math.max(0, mrr * 0.96),
    Math.max(0, mrr * 0.98),
    Math.max(0, mrr),
  ], [mrr]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px] space-y-6 lg:space-y-8">
        
        {/* EXECUTIVE HEADER */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 text-4xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Business Intelligence</h1>
            <p className="text-sm leading-6" style={{ color: "#475569" }}>AI-driven industrial revenue optimization platform</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">USD ($)</span>
          </div>
        </div>

        <div className="rounded-lg border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{color: "#0F172A"}}>Executive Insights</h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight, i) => (
              <div key={i} className="min-h-[40px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5" style={{color: "#475569"}}>
                <span style={{color: "#2563EB"}}>→</span> {insight}
              </div>
            ))}
          </div>
        </div>

        {/* HERO KPI SECTION */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KPICard label="Annual Revenue" value={`$${(totalRevenue/1000).toFixed(1)}K`} change={`${((mrr / Math.max(1, baselineMonthlyValue * 0.28)) * 100).toFixed(0)}% of baseline`} tone="blue" trend={sparkTrend} />
          <KPICard label="MRR" value={`$${(mrr/1000).toFixed(1)}K`} change={`$${monthlyAiSavings.toFixed(0)} AI savings`} tone="green" trend={growthTrend} />
          <KPICard label="Gross Profit" value={`$${(totalProfit/1000).toFixed(1)}K`} change={`${((totalProfit / Math.max(1, totalRevenue)) * 100).toFixed(0)}% margin`} tone="blue" trend={sparkTrend} />
          <KPICard label="CO₂ Avoided" value={`${co2Avoided.toFixed(0)}T`} change={`$${(simBusiness.co2ValueUsd || 0).toFixed(0)} value`} tone="cyan" trend={growthTrend} />
          <KPICard label="Optimization" value={aiMode ? `${optimizationGainPct.toFixed(1)}%` : "Paused"} change={aiMode ? "AI active" : "manual baseline"} tone="emerald" trend={sparkTrend} />
        </div>

        {/* TWIN VISUALIZATION: REVENUE + OPERATIONS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Revenue Trend - Large */}
          <div className="lg:col-span-2 rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Revenue Trajectory</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">12-month performance</span>
            </div>
            <div style={{ height: 260 }}>
              {revenue.length > 0 ? (
                <LiveChart data={revenue} lines={[{ key: 'revenue', color: '#2563EB', name: 'Monthly Revenue' }]} label="$" unit="$" height={240} />
              ) : <div className="w-full h-full flex items-center justify-center" style={{color: "#94A3B8"}}>Loading chart...</div>}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Revenue Mix</h2>
            <div className="mb-4 flex items-center justify-center" style={{ height: 260 }}>
              <DonutChart slices={[
                {label: 'Performance', value: perfRevenue, color: '#2563EB'},
                {label: 'SaaS', value: saasRevenue, color: '#16A34A'},
                {label: 'Enterprise', value: enterpriseRevenue, color: '#F97316'},
              ]} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span style={{color: "#475569"}}>Performance</span><strong style={{color: "#0F172A"}}>${(perfRevenue/1000).toFixed(0)}K</strong></div>
              <div className="flex items-center justify-between"><span style={{color: "#475569"}}>SaaS</span><strong style={{color: "#0F172A"}}>${(saasRevenue/1000).toFixed(0)}K</strong></div>
              <div className="flex items-center justify-between"><span style={{color: "#475569"}}>Enterprise</span><strong style={{color: "#0F172A"}}>${(enterpriseRevenue/1000).toFixed(0)}K</strong></div>
            </div>
          </div>
        </div>

        {/* FACTORY PERFORMANCE CARDS */}
        <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Connected Factories</h2>
            <a href="/factories" className="text-sm" style={{color: "#2563EB"}}>View all {numFactories} →</a>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {viewportFactories.slice(0, 3).map((f, idx) => (
              <FactoryCard key={f.id} factory={f} rank={idx+1} />
            ))}
          </div>
        </div>

        {/* INTELLIGENCE LAYER: Operations + Impact */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Real-time Operations */}
          <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Current Operations</h2>
            <div className="space-y-3">
              <OpMetric label="Power Output" value={`${(metrics.power_output || 0).toFixed(1)} kW`} max={220} current={metrics.power_output || 0} color="#2563EB" />
              <OpMetric label="Efficiency" value={`${(metrics.efficiency_pct || 75).toFixed(1)}%`} max={100} current={metrics.efficiency_pct || 75} color="#16A34A" />
              <OpMetric label="Temperature" value={`${(metrics.temperature || 500).toFixed(0)}°C`} max={600} current={metrics.temperature || 500} color="#F97316" />
              <OpMetric label="Pressure" value={`${(metrics.pressure || 6).toFixed(2)} bar`} max={8.5} current={metrics.pressure || 6} color="#DC2626" />
            </div>
          </div>

          {/* Business Impact Summary */}
          <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Business Impact</h2>
            <div className="space-y-3">
              <BusinessMetric label="Monthly AI Savings" value={`$${monthlyAiSavings.toFixed(0)}`} subtext={aiMode ? "realized vs manual baseline" : "AI paused: no savings counted"} />
              <BusinessMetric label="Potential if Optimized" value={`$${potentialMonthlySavings.toFixed(0)}`} subtext="forecast only" />
              <BusinessMetric label="CO₂ Reduction Value" value={`$${(simBusiness.co2ValueUsd || 0).toFixed(0)}`} subtext="operating-state derived" />
              <BusinessMetric label="Payback Period" value={aiMode && simBusiness.paybackMonths > 0 ? `${simBusiness.paybackMonths.toFixed(0)} months` : "N/A"} subtext={aiMode ? "time to break even" : "requires AI gains"} />
            </div>
          </div>
        </div>

        {/* UNIT ECONOMICS + INSIGHTS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Unit Economics */}
          <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Unit Economics</h2>
            <div className="space-y-2.5">
              <EconMetric label="Avg Revenue/Factory" value={`$${(avgRevenuePerFactory/1000).toFixed(1)}K`} />
              <EconMetric label="Avg Savings/Factory" value={`$${avgSavingsPerFactory.toFixed(0)}`} />
              <EconMetric label="Revenue per Ton CO₂" value={`$${revenuePerTonCO2.toFixed(0)}`} />
              <EconMetric label="Gross Margin" value={`${((totalProfit/safeRevenue)*100).toFixed(0)}%`} />
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Strategic Recommendations</h2>
            <div className="space-y-2.5">
              {aiMode && topFactory && <ActionItem text={`Scale from ${topFactory.name} model (${(topFactory.monthly_revenue_usd).toFixed(0)}/mo)`} color="blue" />}
              {aiMode && mostEfficient && <ActionItem text={`Apply ${mostEfficient.name} optimization pattern to underperformers`} color="green" />}
              <ActionItem text={`Potential monthly gain if AI enabled: $${potentialMonthlySavings.toFixed(0)}`} color="blue" />
              <ActionItem text={`${(projectedCO2).toFixed(0)}T CO₂ impact at ${scaleTarget} factories`} color="cyan" />
            </div>
          </div>
        </div>

        {/* GROWTH PROJECTION */}
        <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>Scale Simulation</h2>
              <p className="text-sm" style={{ color: "#475569" }}>Scaling from {numFactories} to {scaleTarget} factories</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight" style={{color: "#2563EB"}}>${(projectedRevenue/1000).toFixed(0)}K</div>
              <p className="text-xs mt-1" style={{color: "#475569"}}>projected annual revenue</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
            <div><span className="text-xs" style={{color: "#475569"}}>Current Annual:</span> <strong style={{color: "#0F172A", fontSize: "14px"}}>${(totalRevenue/1000).toFixed(0)}K</strong></div>
            <div><span className="text-xs" style={{color: "#475569"}}>Profit Potential:</span> <strong style={{color: "#0F172A", fontSize: "14px"}}>${(projectedProfit/1000).toFixed(0)}K</strong></div>
            <div><span className="text-xs" style={{color: "#475569"}}>CO₂ Impact:</span> <strong style={{color: "#0F172A", fontSize: "14px"}}>{projectedCO2.toFixed(0)} tons</strong></div>
          </div>
        </div>

        {/* AI OPTIMIZATION STATUS */}
        <div className="rounded-lg border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest" style={{ color: "#0F172A" }}>AI Optimization Status</h2>
              <p className="text-sm" style={{ color: "#475569" }}>Real-time control system achieving optimal efficiency</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight" style={{color: aiMode ? '#16A34A' : '#64748B'}}>
                {aiMode ? 'ACTIVE' : 'MANUAL'}
              </div>
              <p className="text-xs mt-1" style={{color: "#475569"}}>{aiMode ? `${(confidence.confidence || 0).toFixed(0)}% confidence` : "AI paused"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-4">
            <div><span className="text-xs" style={{color: "#475569"}}>Current Efficiency:</span> <strong style={{color: "#0F172A", fontSize: "14px"}}>{(metrics.efficiency_pct || 0).toFixed(1)}%</strong></div>
            <div><span className="text-xs" style={{color: "#475569"}}>Optimization Gain:</span> <strong style={{color: aiMode ? "#16A34A" : "#64748B", fontSize: "14px"}}>{aiMode ? `+${optimizationGainPct.toFixed(1)}%` : "0.0%"}</strong></div>
            <div><span className="text-xs" style={{color: "#475569"}}>Safety Status:</span> <strong style={{color: safety === 'NORMAL' ? '#16A34A' : '#DC2626', fontSize: "14px"}}>{safety}</strong></div>
            <div><span className="text-xs" style={{color: "#475569"}}>Uptime:</span> <strong style={{color: "#0F172A", fontSize: "14px"}}>{systemUptime.toFixed(1)}%</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EnterpriseMetric label="System Uptime" value={`${systemUptime.toFixed(1)}%`} detail="service reliability" tone="blue" />
          <EnterpriseMetric label="Safety Compliance" value={`${safetyComplianceScore.toFixed(0)}%`} detail="critical thresholds met" tone="green" />
          <EnterpriseMetric label="Operational Health" value={`${operationalHealthScore.toFixed(0)}%`} detail="plant stability score" tone="blue" />
          <EnterpriseMetric label="Anomalies Detected" value={`${anomalyCount}`} detail="last 24 hours" tone="amber" />
        </div>
      </div>
    </div>
  );
}

// ─────── COMPONENTS ───────

function KPICard({ label, value, change, tone, trend }) {
  const toneColors = {
    blue: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
    green: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    emerald: { bg: '#F0FDF4', border: '#86EFAC', text: '#16A34A' },
    cyan: { bg: '#F0FDFA', border: '#A5F3FC', text: '#0E7490' },
  };
  const colors = toneColors[tone] || toneColors.blue;
  const positive = String(change).includes("+") || String(change).includes("active");
  return (
    <div className="flex h-full flex-col justify-between rounded-lg border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: colors.bg, borderColor: colors.border, minHeight: 150 }}>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest" style={{color: "#475569"}}>{label}</div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="text-[28px] font-bold leading-none tracking-tight" style={{color: colors.text}}>{value}</div>
          <div className={`text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-slate-500'}`}>{change}</div>
        </div>
      </div>
      <Sparkline data={trend || [68, 70, 72, 71, 74, 76, 78, 77, 79, 81, 83, 84]} stroke={colors.text} />
    </div>
  );
}

function FactoryCard({ factory, rank }) {
  return (
    <div className="flex h-full flex-col rounded-lg border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", minHeight: 168 }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight" style={{color: "#0F172A"}}>{factory.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.14em]" style={{color: "#64748B"}}>{factory.location}</div>
        </div>
        <div className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold" style={{backgroundColor: "#E2E8F0", color: "#0F172A"}}>#{rank}</div>
      </div>
      <div className="mt-auto space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-baseline justify-between gap-3 text-sm"><span style={{color: "#475569"}}>Revenue</span><strong className="text-[15px]" style={{color: "#16A34A"}}>${(factory.monthly_revenue_usd || 0).toFixed(0)}</strong></div>
        <div className="flex items-baseline justify-between gap-3 text-sm"><span style={{color: "#475569"}}>Efficiency</span><strong className="text-[15px]" style={{color: "#2563EB"}}>{(factory.efficiency_improvement_pct || 0).toFixed(0)}%</strong></div>
        <div className="flex items-baseline justify-between gap-3 text-sm"><span style={{color: "#475569"}}>Savings</span><strong className="text-[15px]" style={{color: "#0891B2"}}>${(factory.monthly_savings_usd || 0).toFixed(0)}</strong></div>
      </div>
    </div>
  );
}

function OpMetric({ label, value, max, current, color }) {
  const pct = (current / max) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm" style={{color: "#475569"}}>{label}</span>
        <span className="text-sm font-semibold tracking-tight" style={{color: "#0F172A"}}>{value}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div style={{width: `${Math.min(100, pct)}%`, backgroundColor: color, height: '100%'}} />
      </div>
    </div>
  );
}

function BusinessMetric({ label, value, subtext }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium" style={{color: "#475569"}}>{label}</div>
        <div className="mt-1 text-xs leading-5" style={{color: "#94A3B8"}}>{subtext}</div>
      </div>
      <div className="text-lg font-bold tracking-tight" style={{color: "#0F172A"}}>{value}</div>
    </div>
  );
}

function EconMetric({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200 last:border-0">
      <span className="text-sm" style={{color: "#475569"}}>{label}</span>
      <strong className="text-sm font-semibold tracking-tight" style={{color: "#2563EB"}}>{value}</strong>
    </div>
  );
}

function ActionItem({ text, color }) {
  const colors = {
    blue: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
    green: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    cyan: { bg: '#F0FDFA', border: '#A5F3FC', text: '#0E7490' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="flex items-start gap-3 rounded-lg border px-3 py-3 text-sm leading-6 transition-colors duration-200" style={{backgroundColor: c.bg, borderColor: c.border, color: c.text}}>
      <span>{text}</span>
    </div>
  );
}

function EnterpriseMetric({ label, value, detail, tone }) {
  const toneColors = {
    blue: { bg: '#FFFFFF', border: '#E2E8F0', value: '#1E40AF' },
    green: { bg: '#FFFFFF', border: '#E2E8F0', value: '#15803D' },
    amber: { bg: '#FFFFFF', border: '#E2E8F0', value: '#B45309' },
  };
  const colors = toneColors[tone] || toneColors.blue;
  return (
    <div className="rounded-lg border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <div className="text-[11px] font-semibold uppercase tracking-widest" style={{color: '#64748B'}}>{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight" style={{color: colors.value}}>{value}</div>
      <div className="mt-1 text-xs leading-5" style={{color: '#94A3B8'}}>{detail}</div>
    </div>
  );
}

function Sparkline({ data, stroke }) {
  const width = 120;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / Math.max(1, max - min)) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-7 w-full">
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" points={points} opacity="0.8" />
    </svg>
  );
}

function DonutChart({ slices }) {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      {slices.map((s, i) => {
        const total = slices.reduce((sum, x) => sum + x.value, 0);
        const pct = s.value / total;
        const startAngle = slices.slice(0, i).reduce((sum, x) => sum + (x.value / total) * 360, 0);
        const endAngle = startAngle + pct * 360;
        const x1 = 50 + 35 * Math.cos((startAngle - 90) * Math.PI / 180);
        const y1 = 50 + 35 * Math.sin((startAngle - 90) * Math.PI / 180);
        const x2 = 50 + 35 * Math.cos((endAngle - 90) * Math.PI / 180);
        const y2 = 50 + 35 * Math.sin((endAngle - 90) * Math.PI / 180);
        const largeArc = pct > 0.5 ? 1 : 0;
        return (
          <path key={i} d={`M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={s.color} opacity="0.85" />
        );
      })}
    </svg>
  );
}

