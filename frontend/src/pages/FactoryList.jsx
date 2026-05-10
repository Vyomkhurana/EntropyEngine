import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";
import { formatBusinessCurrency } from "../utils/currency";

export default function FactoryList() {
  const { factories, loading } = useFactories();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F172A" }}>Factories</h1>
        <p className="text-base" style={{ color: "#64748B" }}>Connected client factories and their performance metrics</p>
      </div>

      {loading ? (
        <div style={{ color: "#64748B" }}>Loading factories…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {factories.map((factory, index) => (
            <motion.button
              key={factory.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/factory/${factory.id}`)}
              className="text-left rounded-lg border p-6 hover:border-slate-300 transition-all duration-200 group cursor-pointer"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
            >
              {/* Factory Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold" style={{ color: "#0F172A" }}>{factory.name}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border" style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0", color: "#64748B" }}>
                    {factory.status}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#64748B" }}>{factory.location}</p>
              </div>

              {/* Key Metrics - Clean Grid */}
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: "#E2E8F0" }}>
                <MetricRow label="Efficiency" value={`${factory.efficiency_pct}%`} accent="text-cyan-600" />
                <MetricRow label="Monthly Savings ($)" value={formatBusinessCurrency(factory.monthly_savings)} accent="text-green-600" />
                <MetricRow label="Our Revenue ($)" value={formatBusinessCurrency(factory.our_revenue)} accent="text-blue-600" />
                <MetricRow label="CO2 Reduced" value={`${factory.co2_tons} tons`} accent="text-orange-600" />
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
      <span className="text-sm" style={{ color: "#64748B" }}>{label}</span>
      <span className={`font-semibold text-sm ${accent}`}>{value}</span>
    </div>
  );
}
