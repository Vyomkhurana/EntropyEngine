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
    IDLE:     "text-gray-500",
    ACTIVE:   "text-blue-400",
    FALLBACK: "text-amber-400",
  };

  const safetyColor = {
    NORMAL:   "text-green-400",
    WARNING:  "text-amber-400",
    CRITICAL: "text-red-400",
  };

  const safetyDot = {
    NORMAL:   "bg-green-400",
    WARNING:  "bg-amber-400",
    CRITICAL: "bg-red-400",
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <LogoMark size={28} />
        <div className="leading-tight">
          <h1 className="text-sm font-bold text-white tracking-tight">
            ENTROPY <span className="text-blue-400">ENGINE</span>
          </h1>
          <p className="text-xs text-gray-600 tracking-widest uppercase">Industrial AI</p>
        </div>
      </div>

      {/* Center: Status indicators */}
      <div className="flex items-center gap-2">
        <StatusPill label="AI" value={aiState} color={stateColor[aiState]} />
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-800/40 border border-gray-700">
          <span className={`w-1.5 h-1.5 rounded-full ${safetyDot[safety]}`} />
          <span className="text-xs text-gray-600 uppercase">Safety</span>
          <span className={`text-xs font-bold ${safetyColor[safety]}`}>{safety}</span>
        </div>
        <StatusPill
          label="Conf"
          value={`${(conf * 100).toFixed(0)}%`}
          color={conf > 0.5 ? "text-green-400" : conf > 0.3 ? "text-amber-400" : "text-gray-500"}
        />
        <StatusPill label="Tick" value={tick} color="text-gray-400" />
      </div>

      {/* Right: Connection status */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 font-mono">{formatUptime(uptime)}</span>
        <div className="flex items-center gap-1.5">
          <motion.div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="text-xs text-gray-600">{connected ? "Live" : "Offline"}</span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-800/40 border border-gray-700">
      <span className="text-xs text-gray-600 uppercase">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}
