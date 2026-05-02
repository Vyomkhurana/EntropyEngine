import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/factories", label: "Factories" },
  { to: "/analytics", label: "Analytics" },
];

export default function Sidebar() {
  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/70 bg-navy-950/90 backdrop-blur-xl lg:min-h-[calc(100vh-56px)] lg:sticky lg:top-[56px]">
      <div className="flex flex-col w-full p-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Company Control</div>
          <div className="mt-2 text-lg font-semibold text-white">Entropy Engine</div>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Central business intelligence for multi-factory performance, revenue, and sustainability.
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "block rounded-2xl px-4 py-3 border transition-all duration-200",
                  isActive
                    ? "bg-blue-500/10 border-blue-400/40 text-blue-200 shadow-lg shadow-blue-500/10"
                    : "bg-slate-900/40 border-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800/70 hover:border-slate-700",
                ].join(" ")
              }
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {item.to === "/dashboard" && "Company overview"}
                {item.to === "/factories" && "Client factory roster"}
                {item.to === "/analytics" && "Trends and KPIs"}
              </div>
            </NavLink>
          ))}
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-card p-4 mt-auto"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Flow</div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div>1. Launch Dashboard</div>
            <div>2. Central Business Dashboard</div>
            <div>3. Factory List</div>
            <div>4. Individual Factory Detail</div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}
