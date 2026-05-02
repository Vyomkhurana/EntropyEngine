import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";

export default function FactoryList() {
  const { factories, loading } = useFactories();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Factory List</div>
        <h1 className="text-3xl font-semibold text-white mt-2">Connected factory clients</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">Click a factory card to open its detailed operational view.</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading factories…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {factories.map((factory, index) => (
            <motion.button
              key={factory.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => navigate(`/factory/${factory.id}`)}
              className="text-left glass-card p-5 hover:border-blue-400/40 hover:bg-slate-900/80 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-semibold text-lg">{factory.name}</div>
                  <div className="text-slate-500 text-sm mt-1">{factory.location}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] bg-slate-800/80 border border-slate-700 text-slate-300">
                  {factory.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Efficiency" value={`${factory.efficiency_pct}%`} accent="text-cyan-300" />
                <Metric label="Savings" value={`₹${Number(factory.monthly_savings).toLocaleString("en-IN")}`} accent="text-emerald-300" />
                <Metric label="Our Revenue" value={`₹${Number(factory.our_revenue).toLocaleString("en-IN")}`} accent="text-blue-300" />
                <Metric label="CO2" value={`${factory.co2_tons} tons`} accent="text-orange-300" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-2xl bg-slate-950/40 border border-slate-800/80 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={`mt-1 font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
