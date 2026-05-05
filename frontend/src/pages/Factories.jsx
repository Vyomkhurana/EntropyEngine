import React, { useState } from "react";
import { useFactories } from "../context/FactoriesContext";
import FactoryDetail from "./FactoryDetail";
import { formatBusinessCurrency } from "../utils/currency";

export default function Factories() {
  const { factories, loading, reload } = useFactories();
  const [selected, setSelected] = useState(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Factories</h2>
          <div>
            <button className="btn mr-2" onClick={() => { setSelected(null); reload(); }}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <div className="p-4">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factories.map((f) => (
              <div key={f.id} className="glass-card p-4 cursor-pointer" onClick={() => setSelected(f.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-[12px]" style={{ color: "#64748B" }}>{f.location}</div>
                  </div>
                  <div className="text-sm font-mono-num">{formatBusinessCurrency(f.our_revenue)}</div>
                </div>
                <div className="mt-3 text-[13px]" style={{ color: "#64748B" }}>CO₂: {f.co2_tons} t · Efficiency: {f.efficiency_pct}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside>
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Factory Detail</h3>
          {selected ? <FactoryDetail factoryId={selected} /> : <div className="text-sm" style={{ color: "#64748B" }}>Select a factory to view details</div>}
        </div>
      </aside>
    </div>
  );
}
