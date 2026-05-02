import { motion } from "framer-motion";

/**
 * Hero Metric - Primary focus metric with minimal, premium design
 * Used for main KPI on dashboard (e.g., Total Revenue)
 */
export default function HeroMetric({ label, value, unit, subtext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8"
    >
      {/* Label */}
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        {label}
      </div>

      {/* Main Value */}
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-baseline gap-2"
      >
        <span className="text-5xl font-bold text-white tracking-tight">
          {typeof value === "number" ? value.toFixed(0) : value ?? "—"}
        </span>
        <span className="text-lg text-slate-400">{unit}</span>
      </motion.div>

      {/* Subtext */}
      {subtext && (
        <div className="mt-3 text-sm text-slate-400">
          {subtext}
        </div>
      )}
    </motion.div>
  );
}
