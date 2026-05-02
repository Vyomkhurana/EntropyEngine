import { motion } from "framer-motion";
import { LogoMark } from "./Icons";

export default function StatusBar({ state, connected }) {
  const aiState   = state?.ai_state ?? "IDLE";
  const safety    = state?.safety_level ?? "NORMAL";
  const tick      = state?.tick_count ?? 0;
  const uptime    = state?.uptime ?? 0;
  const conf      = state?.confidence?.confidence ?? 0;

  const formatUptime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}m ${sec}s`;
  };

  const stateColor = {
    IDLE:     "text-slate-400",
    ACTIVE:   "text-green-600",
    FALLBACK: "text-amber-600",
  };

  const safetyColor = {
    NORMAL:   "text-green-600",
    WARNING:  "text-amber-600",
    CRITICAL: "text-red-600",
  };

  const safetyDot = {
    NORMAL:   "bg-green-600",
    WARNING:  "bg-amber-600",
    CRITICAL: "bg-red-600",
  };

  return (
    <div className="flex items-center justify-between px-6 py-2.5 border-b sticky top-0 z-50" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <LogoMark size={30} />
        <div className="leading-tight">
          <h1 className="text-[13px] font-bold tracking-tight" style={{ color: "#0F172A" }}>
            ENTROPY <span style={{ color: "#16A34A" }}>ENGINE</span>
          </h1>
          <p className="text-[9px] tracking-wide uppercase" style={{ color: "#64748B" }}>Industrial AI Optimizer</p>
        </div>
      </div>

      {/* Center: Status pills */}
      <div className="flex items-center gap-2">
        <StatusPill label="AI" value={aiState} color={stateColor[aiState]} />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${safetyDot[safety]}`} />
          <span className="text-[10px] uppercase" style={{ color: "#64748B" }}>Safety</span>
          <span className={`text-xs font-bold font-mono-num ${safetyColor[safety]}`}>{safety}</span>
        </div>
        <StatusPill
          label="Conf"
          value={`${(conf * 100).toFixed(0)}%`}
          color={conf > 0.5 ? "text-green-600" : conf > 0.3 ? "text-amber-600" : "text-slate-400"}
        />
        <StatusPill label="Tick" value={tick} color="text-slate-400" />
      </div>

      {/* Right: Connection + uptime */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono-num" style={{ color: "#64748B" }}>{formatUptime(uptime)}</span>
        <div className="flex items-center gap-1.5">
          <motion.div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-600" : "bg-red-600"}`}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="text-[10px]" style={{ color: "#64748B" }}>{connected ? "Live" : "Offline"}</span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }}>
      <span className="text-[10px] uppercase" style={{ color: "#64748B" }}>{label}</span>
      <span className={`text-xs font-bold font-mono-num ${color}`}>{value}</span>
    </div>
  );
}
