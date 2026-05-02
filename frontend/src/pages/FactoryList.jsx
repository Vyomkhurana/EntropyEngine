import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";

export default function FactoryList() {
  const { factories, loading } = useFactories();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Factories</h1>
        <p className="text-slate-400 text-base">Connected client factories and their performance metrics</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading factories…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {factories.map((factory, index) => (
            <motion.button
              key={factory.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/factory/${factory.id}`)}
              className="text-left rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6 hover:border-slate-700 hover:bg-slate-900/70 transition-all duration-200 group cursor-pointer"
            >
              {/* Factory Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{factory.name}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-slate-800/60 border border-slate-700 text-slate-300">
                    {factory.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{factory.location}</p>
              </div>

              {/* Key Metrics - Clean Grid */}
              <div className="space-y-3 pt-4 border-t border-slate-800/50">
                <MetricRow label="Efficiency" value={`${factory.efficiency_pct}%`} accent="text-cyan-500" />
                <MetricRow label="Monthly Savings" value={`₹${Number(factory.monthly_savings).toLocaleString("en-IN")}`} accent="text-green-500" />
                <MetricRow label="Our Revenue" value={`₹${Number(factory.our_revenue).toLocaleString("en-IN")}`} accent="text-blue-500" />
                <MetricRow label="CO2 Reduced" value={`${factory.co2_tons} tons`} accent="text-orange-500" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-semibold text-sm ${accent}`}>{value}</span>
    </div>
  );
}
