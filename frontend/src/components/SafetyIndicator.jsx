import { motion } from "framer-motion";
import { IconShieldCheck, IconAlertTriangle } from "./Icons";

const LEVEL_CONFIG = {
  NORMAL:   {
    accent: "#16A34A",
    bg: "#F0FDF4",
    border: "#86EFAC",
    dot: "#16A34A",
    label: "ALL CLEAR",
    IconComp: IconShieldCheck,
  },
  WARNING:  {
    accent: "#D97706",
    bg: "#FFFBEB",
    border: "#FCD34D",
    dot: "#D97706",
    label: "WARNING",
    IconComp: IconAlertTriangle,
  },
  CRITICAL: {
    accent: "#DC2626",
    bg: "#FEF2F2",
    border: "#FCA5A5",
    dot: "#DC2626",
    label: "CRITICAL",
    IconComp: IconAlertTriangle,
  },
};

export default function SafetyIndicator({ level = "NORMAL", overrides = 0, pressureHeadroom, tempHeadroom }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.NORMAL;
  const Icon = cfg.IconComp;

  return (
    <motion.div
      className="p-4 border rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_24px_rgba(15,23,42,0.08)]"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
      animate={level === "CRITICAL" ? { scale: [1, 1.01, 1] } : {}}
      transition={level === "CRITICAL" ? { repeat: Infinity, duration: 0.8 } : {}}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: cfg.accent }} />
        <p className="text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: cfg.accent }}>
          Safety — {cfg.label}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <MetricRow label="Pressure Headroom" value={pressureHeadroom != null ? `${pressureHeadroom.toFixed(2)} bar` : "—"} />
        <MetricRow label="Temp Headroom" value={tempHeadroom != null ? `${tempHeadroom.toFixed(0)} °C` : "—"} />
        <div>
          <p className="font-semibold" style={{ color: "#475569" }}>Safety Overrides</p>
          <p className="font-mono-num font-bold text-base" style={{ color: overrides > 0 ? "#D97706" : "#16A34A" }}>
            {overrides}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div>
      <p className="font-semibold" style={{ color: "#475569" }}>{label}</p>
      <p className="font-mono-num font-extrabold text-sm" style={{ color: "#0F172A" }}>{value}</p>
    </div>
  );
}
