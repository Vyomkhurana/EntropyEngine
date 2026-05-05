import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";
import { THEME } from "../constants/theme";

function CustomTooltip({ active, payload, label, unit, name }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs rounded-lg shadow-lg" style={{ backgroundColor: THEME.chart.tooltip, border: `1px solid ${THEME.colors.border}` }}>
      <p className="mb-1" style={{ color: THEME.colors.text }}>Tick {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke || p.color }}>
          {p.name}: <span className="font-mono-num font-semibold">{Number(p.value).toFixed(2)}</span> {unit}
        </p>
      ))}
    </div>
  );
}

export default function LiveChart({
  data,
  lines = [],        // [{ key, color, name }]
  label,
  unit = "",
  height = 180,
  area = false,
  xKey = "tick",
}) {
  const ChartComp = area ? AreaChart : LineChart;
  const LineComp  = area ? Area : Line;

  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_26px_rgba(15,23,42,0.05)]">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: THEME.colors.text }}>
        {label}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComp data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.chart.grid} opacity={0.55} />
          <XAxis
            dataKey={xKey}
            stroke={THEME.colors.textMuted}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke={THEME.colors.textMuted} fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {lines.map(({ key, color, name }) =>
            area ? (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={3.5}
                dot={false}
                name={name || key}
                animationDuration={300}
              />
            ) : (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={3.5}
                dot={false}
                name={name || key}
                animationDuration={300}
              />
            )
          )}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  );
}
