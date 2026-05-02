import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFactories } from "../context/FactoriesContext";

export default function FactoryList() {
  const { factories, loading } = useFactories();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 pt-2">
        <h1 className="text-4xl font-bold text-white mb-2">Factories</h1>
        <p className="text-gray-400 text-base">
          View and manage all connected factory clients
        </p>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading factories…</div>
      ) : (
        <div className="space-y-3">
          {factories.map((factory, index) => (
            <motion.button
              key={factory.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/factory/${factory.id}`)}
              className="w-full text-left rounded-lg border border-gray-700 bg-gray-800/40 hover:bg-gray-800/60 hover:border-gray-600 transition-all duration-200 p-6 group"
            >
              <div className="grid grid-cols-12 gap-6 items-center">
                {/* Factory Name & Location */}
                <div className="col-span-12 sm:col-span-4">
                  <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">
                    {factory.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {factory.location}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="col-span-12 sm:col-span-2">
                  <div className="inline-flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      factory.status === "Optimized" ? "bg-green-500" : 
                      factory.status === "Warning" ? "bg-amber-500" : 
                      "bg-blue-500"
                    }`} />
                    <span className="text-xs font-medium text-gray-300">
                      {factory.status}
                    </span>
                  </div>
                </div>

                {/* Key Metrics - Efficiency */}
                <div className="col-span-6 sm:col-span-2">
                  <div className="text-xs text-gray-600 mb-1 uppercase tracking-widest">Efficiency</div>
                  <div className="text-lg font-bold text-blue-400">
                    {factory.efficiency_pct}%
                  </div>
                </div>

                {/* Key Metrics - Revenue */}
                <div className="col-span-6 sm:col-span-2">
                  <div className="text-xs text-gray-600 mb-1 uppercase tracking-widest">Our Revenue</div>
                  <div className="text-lg font-bold text-green-400">
                    ₹{(factory.our_revenue / 1000).toFixed(0)}k
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="col-span-12 sm:col-span-2 text-right">
                  <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
