import React, { useState, useEffect } from "react";
import { formatBusinessCurrency } from "../utils/currency";

/**
 * Real-Time Business Metrics Display
 * Shows live power generation, revenue accrual, efficiency, and CO2 reduction
 * Updates every tick from WebSocket telemetry stream
 */
export default function RealTimeMetrics({ telemetryData, currency = "USD" }) {
  const [accumulatedRevenue, setAccumulatedRevenue] = useState(0);
  const [accumulatedCO2, setAccumulatedCO2] = useState(0);
  const [averageEfficiency, setAverageEfficiency] = useState(0);

  // Update accumulated values from telemetry
  useEffect(() => {
    if (!telemetryData) return;

    const business = telemetryData.business || {};
    
    // Accumulate revenue
    if (business.total_hourly_revenue_usd) {
      setAccumulatedRevenue(prev => prev + business.total_hourly_revenue_usd);
    }

    // Accumulate CO2
    if (business.co2_avoided_tons) {
      setAccumulatedCO2(business.co2_avoided_tons);
    }

    // Track efficiency
    if (business.efficiency_pct) {
      setAverageEfficiency(business.efficiency_pct);
    }
  }, [telemetryData]);

  const business = telemetryData?.business || {};
  const metrics = telemetryData?.metrics || {};
  const ai = telemetryData?.ai || {};

  const powerGenerated = metrics.power_output || 0;
  const efficiency = business.efficiency_pct || 0;
  const savings = business.monthly_savings_usd || 0;
  const revenue = business.total_hourly_revenue_usd || 0;
  const operationalHealth = business.operational_health_pct || 0;
  const temperature = metrics.temperature || 0;
  const pressure = metrics.pressure || 0;
  const rpm = metrics.turbine_rpm || 0;

  return (
    <div className="space-y-4">
      {/* Real-Time Ticker Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Power Generation Ticker */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Live Power</div>
          <div className="mt-1 text-2xl font-bold text-blue-900 font-mono">
            {powerGenerated.toFixed(1)} <span className="text-base">kW</span>
          </div>
          <div className="mt-2 text-xs text-blue-700">
            <span className="font-semibold">{formatBusinessCurrency(revenue, currency)}</span> this hour
          </div>
        </div>

        {/* Efficiency Ticker */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wider">Efficiency</div>
          <div className="mt-1 text-2xl font-bold text-green-900 font-mono">
            {efficiency.toFixed(1)} <span className="text-base">%</span>
          </div>
          <div className="mt-2 text-xs text-green-700">
            Health: <span className="font-semibold">{operationalHealth.toFixed(0)}%</span>
          </div>
        </div>

        {/* CO2 Avoidance Ticker */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">CO₂ Avoided</div>
          <div className="mt-1 text-2xl font-bold text-amber-900 font-mono">
            {business.co2_avoided_tons?.toFixed(3) || "0.000"} <span className="text-base">t</span>
          </div>
          <div className="mt-2 text-xs text-amber-700">
            Value: <span className="font-semibold">{formatBusinessCurrency(business.co2_value_usd || 0, currency)}</span>
          </div>
        </div>

        {/* Monthly Savings Ticker */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Monthly Savings</div>
          <div className="mt-1 text-2xl font-bold text-purple-900 font-mono">
            {formatBusinessCurrency(savings, currency)}
          </div>
          <div className="mt-2 text-xs text-purple-700">
            ROI: <span className="font-semibold">{business.roi_pct?.toFixed(1) || "0"}%</span>
          </div>
        </div>
      </div>

      {/* Operational Status Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Temperature Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase">Temperature</span>
            <span className="text-xs font-mono text-slate-500">°C</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{temperature.toFixed(1)}°</div>
          <div className="mt-1 w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full" 
              style={{ width: `${Math.min((temperature - 400) / 200 * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Pressure Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase">Pressure</span>
            <span className="text-xs font-mono text-slate-500">bar</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{pressure.toFixed(2)}</div>
          <div className="mt-1 w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${Math.min((pressure / 8.5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* RPM Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase">Turbine RPM</span>
            <span className="text-xs font-mono text-slate-500">rpm</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{rpm.toFixed(0)}</div>
          <div className="mt-1 w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full" 
              style={{ width: `${Math.min((rpm / 5200) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Status */}
      {ai && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700 uppercase">AI Optimization Status</div>
              <div className="mt-1 text-sm text-slate-600">
                Mode: <span className="font-semibold">{ai.mode || "OFF"}</span> | 
                Confidence: <span className="font-semibold">{(ai.confidence?.overall || 0).toFixed(0)}%</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              ai.mode === "on" 
                ? "bg-green-100 text-green-700 border border-green-300" 
                : "bg-slate-200 text-slate-700 border border-slate-300"
            }`}>
              {ai.mode === "on" ? "🟢 ACTIVE" : "⚪ INACTIVE"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
