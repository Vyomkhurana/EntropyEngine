import { motion } from "framer-motion";

/**
 * StatCard - Clean secondary stat card (removes glow, uses proper hierarchy)
 * Sizes: "sm" (small), "md" (medium - default), "lg" (large)
 */
export default function StatCard({ 
  label, 
  value, 
  unit, 
  icon: Icon, 
  size = "md",
  accent = "blue",
  subtext 
}) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const textSizes = {
    sm: { label: "text-xs", value: "text-lg", unit: "text-xs" },
    md: { label: "text-xs", value: "text-2xl", unit: "text-sm" },
    lg: { label: "text-sm", value: "text-4xl", unit: "text-base" },
  };

  const accentColors = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400" },
    green: { bg: "bg-green-500/10", text: "text-green-400", icon: "text-green-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", icon: "text-purple-400" },
  };

  const colors = accentColors[accent] || accentColors.blue;
  const sizes = textSizes[size];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`rounded-lg border border-gray-700 bg-gray-800/40 backdrop-blur-sm hover:border-gray-600 transition-colors ${sizeClasses[size]}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className={`${sizes.label} font-medium uppercase tracking-widest text-gray-500`}>
            {label}
          </p>
        </div>
        {Icon && (
          <div className={`w-8 h-8 rounded-md ${colors.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${colors.icon}`} />
          </div>
        )}
      </div>

      <motion.div
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-baseline gap-2">
          <span className={`${sizes.value} font-bold text-white`}>
            {typeof value === "number" ? value.toFixed(1) : value}
          </span>
          <span className={`${sizes.unit} text-gray-500`}>
            {unit}
          </span>
        </div>
      </motion.div>

      {subtext && (
        <p className="text-xs text-gray-600 mt-2">
          {subtext}
        </p>
      )}
    </motion.div>
  );
}
