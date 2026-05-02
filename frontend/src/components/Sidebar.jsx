import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Dashboard", desc: "Overview" },
  { to: "/factories", label: "Factories", desc: "Clients" },
  { to: "/analytics", label: "Analytics", desc: "Insights" },
];

export default function Sidebar() {
  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-700 bg-gray-900/50 backdrop-blur-sm lg:min-h-[calc(100vh-56px)] lg:sticky lg:top-[56px]">
      <div className="flex flex-col w-full p-6 gap-8">
        {/* Branding */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Entropy Engine
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Industrial AI optimization platform
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "block rounded-lg px-4 py-3 border transition-all duration-200",
                  isActive
                    ? "bg-blue-500/10 border-blue-500 text-blue-300"
                    : "bg-gray-800/40 border-gray-700 text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 hover:border-gray-600",
                ].join(" ")
              }
            >
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{item.desc}</div>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-auto pt-6 border-t border-gray-700/50"
        >
          <div className="text-xs uppercase tracking-widest text-gray-600 mb-3">
            Navigation
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <div>1. Landing</div>
            <div>2. Dashboard</div>
            <div>3. Factories</div>
            <div>4. Factory Detail</div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}
