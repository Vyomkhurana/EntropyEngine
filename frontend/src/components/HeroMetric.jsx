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
      className="rounded-lg border p-8"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" }}
    >
      {/* Label */}
      <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748B" }}>
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
        <span className="text-5xl font-bold tracking-tight" style={{ color: "#0F172A" }}>
          {typeof value === "number" ? value.toFixed(0) : value ?? "—"}
        </span>
        <span className="text-lg" style={{ color: "#64748B" }}>{unit}</span>
      </motion.div>

      {/* Subtext */}
      {subtext && (
        <div className="mt-3 text-sm" style={{ color: "#64748B" }}>
          {subtext}
        </div>
      )}
    </motion.div>
  );
}
