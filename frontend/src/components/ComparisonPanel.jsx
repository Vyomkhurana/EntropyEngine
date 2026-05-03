import { motion } from "framer-motion";
import { IconArrowRight, IconActivity } from "./Icons";

export default function ComparisonPanel({ comparison }) {
  if (!comparison) return null;

  const { baseline_avg_power, ai_avg_power, improvement_pct, baseline_samples, ai_samples } = comparison;
  const isPositive = improvement_pct > 0;

  return (
    <div className="p-6 rounded-lg border" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
      <div className="flex items-center gap-2 mb-5">
        <IconActivity className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
        <h2 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>
          AI Impact Analysis
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-4 items-center">
        {/* Baseline */}
        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0" }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>Baseline</p>
          <motion.p
            key={baseline_avg_power}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold font-mono-num"
            style={{ color: "#0F172A" }}
          >
            {baseline_avg_power?.toFixed(1) ?? "—"}
          </motion.p>
          <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>kW avg</p>
          <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>{baseline_samples} samples</p>
        </div>

        {/* Arrow + Improvement */}
        <div className="flex flex-col items-center justify-center">
          <motion.div
            animate={{ x: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <IconArrowRight className="w-6 h-6" style={{ color: "#64748B" }} />
          </motion.div>
          <motion.p
            key={improvement_pct}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold font-mono-num mt-1.5"
            style={{ color: isPositive ? "#16A34A" : improvement_pct < 0 ? "#DC2626" : "#64748B" }}
          >
            {isPositive ? "+" : ""}{improvement_pct?.toFixed(1) ?? 0}%
          </motion.p>
          <p className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>improvement</p>
        </div>

        {/* AI Optimized */}
        <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: isPositive ? "#F0FDF4" : "#F1F5F9", borderColor: isPositive ? "#16A34A" : "#E2E8F0" }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#16A34A" }}>AI Optimized</p>
          <motion.p
            key={ai_avg_power}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold font-mono-num"
            style={{ color: "#16A34A" }}
          >
            {ai_avg_power?.toFixed(1) ?? "—"}
          </motion.p>
          <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>kW avg</p>
          <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>{ai_samples} samples</p>
        </div>
      </div>
    </div>
  );
}
