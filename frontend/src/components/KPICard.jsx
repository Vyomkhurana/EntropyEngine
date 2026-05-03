import { motion } from "framer-motion";
import { IconAlertTriangle } from "./Icons";

const COLOR_MAP = {
  blue:    { text: "text-blue-600",    iconBg: "bg-blue-50", iconText: "text-blue-600" },
  orange:  { text: "text-orange-600",  iconBg: "bg-orange-50", iconText: "text-orange-600" },
  cyan:    { text: "text-cyan-600",    iconBg: "bg-cyan-50", iconText: "text-cyan-600" },
  emerald: { text: "text-green-600", iconBg: "bg-green-50", iconText: "text-green-600" },
  purple:  { text: "text-purple-600",  iconBg: "bg-purple-50", iconText: "text-purple-600" },
};

export default function KPICard({ label, value, unit, icon: Icon, color = "blue", alert, sub }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <motion.div
      className="rounded-lg border p-5 transition-colors duration-200"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>{label}</span>
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
        <span className="text-sm" style={{ color: "#64748B" }}>{unit}</span>
      </motion.div>

      {sub && <p className="mt-2 text-xs" style={{ color: "#64748B" }}>{sub}</p>}

      {alert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-orange-600"
        >
          <IconAlertTriangle className="w-3 h-3" />
          <span>{alert}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
