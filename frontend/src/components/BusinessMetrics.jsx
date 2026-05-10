import { motion } from "framer-motion";
import { IconBolt, IconLeaf, IconDollar, IconBarChart } from "./Icons";
import { formatBusinessCurrency } from "../utils/currency";

function getBusinessMetrics(aiPower, baselinePower) {
  const extra = aiPower - baselinePower;
  if (extra <= 0) return { energySaved: 0, co2Reduced: 0, monthlySavings: 0, annualSavings: 0 };
  return {
    energySaved:    Math.round(extra),                              // kWh/hr
    co2Reduced:     Math.round(extra * 0.4),                        // kg/hr
    monthlySavings: Math.round(extra * 8 * 30 * 7.2),              // ₹/month
    annualSavings:  Math.round(extra * 8 * 365 * 7.2),             // ₹/year
  };
}

const ITEMS = [
  { key: "energySaved",    label: "Energy Recovered", unit: "kWh/hr", Icon: IconBolt,    accent: "text-blue-400",   iconBg: "bg-blue-500/15" },
  { key: "co2Reduced",     label: "CO₂ Reduced",      unit: "kg/hr",  Icon: IconLeaf,    accent: "text-emerald-400", iconBg: "bg-emerald-500/15" },
  { key: "monthlySavings", label: "Monthly Savings ($)",  Icon: IconDollar,  accent: "text-cyan-400",   iconBg: "bg-cyan-500/15" },
  { key: "annualSavings",  label: "Annual Impact ($)",    Icon: IconBarChart, accent: "text-purple-400",  iconBg: "bg-purple-500/15" },
];

export default function BusinessMetrics({ comparison }) {
  if (!comparison) return null;

  const bm = getBusinessMetrics(comparison.ai_avg_power || 0, comparison.baseline_avg_power || 0);

  return (
    <div className="glass-card p-6">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest mb-5" style={{ color: "#64748B" }}>
        Business Impact
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {ITEMS.map((item, i) => {
          const val = bm[item.key];
          const display = item.key === "monthlySavings" || item.key === "annualSavings"
            ? formatBusinessCurrency(val)
            : val.toLocaleString();

          return (
            <motion.div
              key={item.key}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "#F8FAFC" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center ${item.accent} flex-shrink-0 mt-0.5`}>
                <item.Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold font-mono-num ${item.accent} leading-tight`}>
                  {display}
                </p>
                {item.unit && <p className="text-[10px]" style={{ color: "#64748B" }}>{item.unit}</p>}
                <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>{item.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
