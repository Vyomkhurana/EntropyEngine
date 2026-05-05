import React, { useEffect, useState, useMemo } from "react";
import { useFactories } from "../context/FactoriesContext";
import LiveChart from "../components/LiveChart";
import { CURRENCY_OPTIONS, convertFromINR, formatBusinessCurrency } from "../utils/currency";

export default function BusinessDashboard() {
  const { overview, factories, loading, fetchRevenue } = useFactories();
  const [revenue, setRevenue] = useState([]);
  const currency = "USD";
  const currencyLabel = CURRENCY_OPTIONS[currency].label;

  useEffect(() => {
    let mounted = true;
    fetchRevenue(12).then((d) => {
      if (mounted) {
        setRevenue(d.map((p, idx) => ({
          ...p,
          tick: idx,
          revenue: convertFromINR(p.revenue ?? p.value ?? 0, currency),
        })));
      }
    });
    return () => (mounted = false);
  }, [fetchRevenue, currency]);

  // Collapsible sections state must be declared unconditionally to preserve hooks order
  const [showUnit, setShowUnit] = useState(false);
  const [showSustain, setShowSustain] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // NOTE: we intentionally render the executive layout even while loading
  // to allow quick visual preview. Loading states are shown inline.

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
      detail: `Potential +${formatBusinessCurrency((topFactory.our_revenue || 0) * 3, currency)} / month`,
      badge: "Scale",
      tone: "blue",
    },
    opportunityFactory && {
      title: `Improve efficiency in ${opportunityFactory.name}`,
      detail: `Unlock ${formatBusinessCurrency(Math.max(0, Math.round(averageRevenuePerFactory - (opportunityFactory.our_revenue || 0))), currency)} additional revenue`,
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

  // Modern investor-ready layout
  const top3 = sortedFactories.slice(0, 3);
  const topActions = recommendedActions.slice(0, 3);

  const revenueSparks = useMemo(() => (revenue || []).map(r => r.revenue || r.value || 0).slice(-12), [revenue]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-end">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
          {currencyLabel}
        </span>
      </div>

      {/* HERO KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIHero label="$ Revenue" value={formatBusinessCurrency(totalRevenue, currency)} data={revenueSparks} color="#2563EB" />
        <KPIHero label="Monthly Revenue ($)" value={formatBusinessCurrency(mrr, currency)} data={revenueSparks} color="#16A34A" />
        <KPIHero label="Profit ($)" value={formatBusinessCurrency(profit, currency)} data={revenueSparks} color="#16A34A" />
        <KPIHero label="Growth" value={`+${growthPercent}%`} data={revenueSparks} color="#16A34A" note={bestRegion ? `${bestRegion.region} driving revenue` : undefined} />
      </div>

      {/* MAIN VISUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-900">Revenue Trend</h3>
            <div className="text-sm text-slate-700">Monthly • last 12 months</div>
          </div>
          <div style={{ height: 320 }}>
            <LiveChart data={revenue} lines={[{ key: 'revenue', color: '#2563EB', name: '$ Revenue' }]} label="$ Revenue" unit="$" area height={300} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
          <h4 className="text-lg font-semibold mb-4 text-slate-900">Revenue Breakdown</h4>
          <div className="flex items-center justify-center">
            <DonutChart slices={[{ label: 'Performance', value: performanceRevenue, color: '#2563EB' }, { label: 'SaaS', value: saasRevenue, color: '#16A34A' }, { label: 'Enterprise', value: enterpriseRevenue, color: '#F97316' }]} />
          </div>
          <div className="mt-4 text-sm text-slate-700">
            <div className="flex justify-between"><span>Performance</span><strong className="text-slate-900">{formatBusinessCurrency(performanceRevenue, currency)}</strong></div>
            <div className="flex justify-between"><span>SaaS</span><strong className="text-slate-900">{formatBusinessCurrency(saasRevenue, currency)}</strong></div>
            <div className="flex justify-between"><span>Enterprise</span><strong className="text-slate-900">{formatBusinessCurrency(enterpriseRevenue, currency)}</strong></div>
          </div>
        </div>
      </div>

      {/* FACTORY PERFORMANCE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Top Factories</h3>
          <a href="/factories" className="text-sm text-slate-700">View all</a>
        </div>
        <div className="flex gap-4 overflow-x-auto py-2">
          {top3.map(f => (
            <div key={f.id} className="min-w-[260px] p-3 rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{f.name}</div>
                  <div className="text-xs text-slate-700">{f.location}</div>
                </div>
                <div className="text-sm font-bold text-green-600">{formatBusinessCurrency(f.our_revenue || 0, currency)}</div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-slate-700 flex justify-between"><span>Efficiency</span><span className="text-slate-900">{(f.efficiency_pct||0).toFixed(1)}%</span></div>
                <ProgressBar percent={Math.min(100, f.efficiency_pct||0)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIONS + PROJECTION + INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
            <h3 className="text-lg font-semibold mb-3 text-slate-900">Recommended Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topActions.map(a => <ActionCard key={a.title} title={a.title} detail={a.detail} tone={a.tone} />)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
            <div>
              <div className="text-sm text-slate-700">Growth Projection</div>
              <div className="text-2xl font-bold text-slate-900">Scale {numFactories} → {scaleTargetFactories} • {formatBusinessCurrency(projectedRevenue, currency)}</div>
              <div className="text-sm text-slate-700 mt-1">Projected Profit {formatBusinessCurrency(projectedProfit, currency)}</div>
            </div>
            <div className="w-40">
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, (numFactories/scaleTargetFactories)*100)}%`, background: 'linear-gradient(90deg,#16A34A,#2563EB)', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
            <h4 className="text-lg font-semibold mb-2 text-slate-900">Key Insights</h4>
            <ul className="text-sm text-slate-700 space-y-2">
              <li>Revenue grew <strong>18%</strong> this month — performance traction</li>
              <li><strong>{topFactory?.name}</strong> is top performer — consider expansion</li>
              <li>Opportunity: Improve efficiency in <strong>{opportunityFactory?.name || 'lower-performing sites'}</strong></li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
            <h4 className="text-sm font-semibold mb-2 text-slate-900">Sustainability</h4>
            <div className="text-sm text-slate-700">{totalCO2Saved.toFixed(1)} tons CO₂ reduced — {formatBusinessCurrency(revenuePerTonCO2, currency)} revenue/ton</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== COMPONENT: COLLAPSIBLE CARD =====
function CollapsibleCard({ title, children, open = false, onToggle }) {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">{title}</div>
        <button className="text-xs text-slate-500" onClick={onToggle}>{open ? "Collapse" : "View Details"}</button>
      </div>
      {open && <div>{children}</div>}
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
function RevenueSourceCard({ title, amount, percent, description, color, currency = "USD" }) {
  return (
    <div className="p-5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold" style={{ color: "#0F172A" }}>{title}</h4>
        <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: color + "20", color }}>
          {percent}%
        </div>
      </div>
      <div className="text-2xl font-bold mb-2" style={{ color }}>
        {formatBusinessCurrency(amount, currency)}
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

// ===== HELPER: KPI HERO =====
function KPIHero({ label, value, data = [], color = '#2563EB', note }) {
  return (
    <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_24px_rgba(15,23,42,0.05)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_28px_rgba(15,23,42,0.08)]">
      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-2xl font-bold text-slate-900" style={{ color }}>{value}</div>
        <div className="w-20 h-8"><Sparkline data={data} color={color} /></div>
      </div>
      {note && <div className="text-[12px] text-slate-700 mt-2">{note}</div>}
    </div>
  );
}

// ===== SPARKLINE =====
function Sparkline({ data = [], color = '#16A34A', width = 80, height = 28 }) {
  if (!data || data.length === 0) return <svg width={width} height={height} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = max === min ? height/2 : 2 + ((max - d) / (max - min)) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===== DONUT CHART =====
function DonutChart({ slices = [], size = 140, stroke = 26 }) {
  const total = slices.reduce((s, x) => s + (x.value || 0), 0) || 1;
  let start = -90;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => {
        const angle = (s.value / total) * 360;
        const large = angle > 180 ? 1 : 0;
        const radius = (size - stroke) / 2;
        const cx = size/2;
        const cy = size/2;
        const aStart = (Math.PI/180) * start;
        const aEnd = (Math.PI/180) * (start + angle);
        const x1 = cx + radius * Math.cos(aStart);
        const y1 = cy + radius * Math.sin(aStart);
        const x2 = cx + radius * Math.cos(aEnd);
        const y2 = cy + radius * Math.sin(aEnd);
        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
        start += angle;
        return <path key={s.label} d={path} stroke={s.color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />;
      })}
      <circle cx={size/2} cy={size/2} r={(size-stroke)/2 - 6} fill="#fff" />
    </svg>
  );
}

// ===== PROGRESS BAR =====
function ProgressBar({ percent = 0 }) {
  const tone = percent >= 85 ? '#16A34A' : percent >= 70 ? '#F97316' : '#DC2626';
  return (
    <div className="h-3 bg-slate-200 rounded-full mt-1 overflow-hidden">
      <div style={{ width: `${percent}%`, height: '100%', background: tone }} />
    </div>
  );
}

// ===== ACTION CARD =====
function ActionCard({ title, detail, tone = 'blue' }) {
  const bg = tone === 'amber' ? '#FFF7ED' : (tone === 'green' ? '#F0FDF4' : '#EFF6FF');
  const border = tone === 'amber' ? '#FDBA74' : (tone === 'green' ? '#86EFAC' : '#93C5FD');
  return (
    <div className="p-4 rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-700 mt-1">{detail}</div>
    </div>
  );
}
