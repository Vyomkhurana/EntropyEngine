import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FactoryScene from "../three/FactoryScene";
import { LogoMark } from "../components/Icons";

export default function LandingPage({ connected, metrics, aiActive }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-navy-950">
      <div className="absolute inset-0 opacity-30">
        <FactoryScene metrics={metrics} aiActive={aiActive} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/90 via-navy-950/40 to-navy-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/60 via-transparent to-navy-950/60" />
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <LogoMark size={80} className="shadow-2xl shadow-blue-500/20" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-black tracking-tight"
        >
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">ENTROPY</span>
          <br />
          <span className="text-white">ENGINE</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-slate-400 text-lg md:text-xl mt-4 max-w-2xl leading-relaxed"
        >
          AI-powered industrial intelligence for a central business dashboard, connected factories, and sustainability-led revenue.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-2.5 mt-8"
        >
          {[
            "Central Dashboard",
            "Factory Roster",
            "Revenue + CO2",
            "Live Optimization",
          ].map((tag) => (
            <span key={tag} className="px-4 py-1.5 rounded-full text-[11px] font-medium bg-slate-800/70 border border-slate-700/50 text-slate-300 tracking-wide">
              {tag}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-10 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold text-base shadow-2xl shadow-blue-500/25"
          >
            Launch Dashboard
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex items-center gap-2"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
          <span className="text-[11px] text-slate-500">
            {connected ? "Backend connected · Simulation running" : "Connecting to backend..."}
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-950 to-transparent" />
    </div>
  );
}
