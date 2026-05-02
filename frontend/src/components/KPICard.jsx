import { motion } from "framer-motion";
import { IconAlertTriangle } from "./Icons";

const COLOR_MAP = {
  blue:    { text: "text-blue-500",    iconBg: "bg-blue-500/10", iconText: "text-blue-500" },
  orange:  { text: "text-orange-500",  iconBg: "bg-orange-500/10", iconText: "text-orange-500" },
  cyan:    { text: "text-cyan-500",    iconBg: "bg-cyan-500/10", iconText: "text-cyan-500" },
  emerald: { text: "text-emerald-500", iconBg: "bg-emerald-500/10", iconText: "text-emerald-500" },
  purple:  { text: "text-purple-500",  iconBg: "bg-purple-500/10", iconText: "text-purple-500" },
};

export default function KPICard({ label, value, unit, icon: Icon, color = "blue", alert, sub }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <motion.div
      className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-5 hover:border-slate-700 transition-colors duration-200"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center ${c.iconText}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <motion.div
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-baseline gap-2"
      >
        <span className={`text-3xl font-bold ${c.text}`}>
          {typeof value === "number" ? value.toFixed(1) : value ?? "—"}
        </span>
        <span className="text-slate-500 text-sm">{unit}</span>
      </motion.div>

      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}

      {alert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center gap-1.5 text-xs text-orange-500 font-medium"
        >
          <IconAlertTriangle className="w-3 h-3" />
          <span>{alert}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
