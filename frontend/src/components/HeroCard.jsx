import { motion } from "framer-motion";

/**
 * HeroCard - Premium large stat component
 * Displays the main business metric with supporting context
 */
export default function HeroCard({ title, value, unit, subtext, trend, trendLabel, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8 md:p-10"
    >
      {/* Header with title and icon */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">
            {title}
          </h2>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
      </div>

      {/* Main value */}
      <motion.div
        key={value}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-bold text-white leading-none">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </span>
          <span className="text-xl text-gray-400">{unit}</span>
        </div>
      </motion.div>

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-green-400">{trend}</span>
          {trendLabel && <span className="text-sm text-gray-500">{trendLabel}</span>}
        </div>
      )}

      {/* Supporting context */}
      {subtext && (
        <div className="text-sm text-gray-400 leading-relaxed">
          {subtext}
        </div>
      )}
    </motion.div>
  );
}
