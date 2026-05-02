import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Dashboard", desc: "Business overview" },
  { to: "/factories", label: "Factories", desc: "Connected clients" },
  { to: "/analytics", label: "Analytics", desc: "Coming soon" },
];

export default function Sidebar() {
  return (
    <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/50 bg-slate-950/50 backdrop-blur-sm lg:min-h-[calc(100vh-56px)] lg:sticky lg:top-[56px]">
      <div className="flex flex-col w-full p-6 gap-6">
        {/* Branding */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Entropy Engine</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Industrial AI optimization platform for multi-factory operations.
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
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                    : "bg-slate-900/30 border-slate-800/40 text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 hover:border-slate-700/60",
                ].join(" ")
              }
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
            </NavLink>
          ))}
        </nav>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-auto pt-6 border-t border-slate-800/30"
        >
          <div className="text-xs uppercase tracking-widest text-slate-600 mb-3">Navigation Flow</div>
          <div className="space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2"><span className="text-slate-600">1</span> Landing</div>
            <div className="flex items-center gap-2"><span className="text-slate-600">2</span> Dashboard</div>
            <div className="flex items-center gap-2"><span className="text-slate-600">3</span> Factories</div>
            <div className="flex items-center gap-2"><span className="text-slate-600">4</span> Factory Detail</div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}
