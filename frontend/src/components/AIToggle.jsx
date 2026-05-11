import { motion } from "framer-motion";

export default function AIToggle({ enabled, onToggle }) {
  const handleToggle = async () => {
    try {
      const next = !enabled;
      onToggle(next);
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  };

  return (
    <motion.div
      className="flex items-center gap-4 p-4 rounded-lg border"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
      layout
    >
      <div className="flex-1">
        <p className="font-semibold text-sm tracking-tight" style={{ color: "#0F172A" }}>AI Optimization</p>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "#64748B" }}>
          {enabled ? "PINN + MPC actively controlling plant" : "Manual baseline — AI standing by"}
        </p>
      </div>

      <button onClick={handleToggle} className="relative w-14 h-7 rounded-full cursor-pointer flex-shrink-0 transition-colors duration-200"
        style={{ background: enabled ? "#16A34A" : "#E2E8F0" }}
      >
        <motion.div
          className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg"
          animate={{ left: enabled ? 30 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>

      <motion.span
        key={String(enabled)}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs font-bold tracking-wider min-w-[52px] text-right"
        style={{ color: enabled ? "#16A34A" : "#64748B" }}
      >
        {enabled ? "ACTIVE" : "OFF"}
      </motion.span>
    </motion.div>
  );
}
