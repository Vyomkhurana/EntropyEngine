import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Dashboard", desc: "Business overview" },
  { to: "/factories", label: "Factories", desc: "Connected clients" },
  { to: "/analytics", label: "Analytics", desc: "Coming soon" },
];

export default function Sidebar() {
  return (
    <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-56px)] lg:sticky lg:top-[56px]" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
      <div className="flex flex-col w-full p-6 gap-6">
        {/* Branding */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#0F172A" }}>Entropy Engine</h2>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "#64748B" }}>
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
                    ? "border-green-600 text-green-700"
                    : "text-slate-600 hover:text-slate-800",
                ].join(" ")
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? "#F0FDF4" : "#FFFFFF",
                borderColor: isActive ? "#16A34A" : "#E2E8F0",
              })}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{item.desc}</div>
            </NavLink>
          ))}
        </nav>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-auto pt-6 border-t"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#64748B" }}>Navigation Flow</div>
          <div className="space-y-2 text-xs" style={{ color: "#64748B" }}>
            <div className="flex items-center gap-2"><span style={{ color: "#64748B" }}>1</span> Landing</div>
            <div className="flex items-center gap-2"><span style={{ color: "#64748B" }}>2</span> Dashboard</div>
            <div className="flex items-center gap-2"><span style={{ color: "#64748B" }}>3</span> Factories</div>
            <div className="flex items-center gap-2"><span style={{ color: "#64748B" }}>4</span> Factory Detail</div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}
