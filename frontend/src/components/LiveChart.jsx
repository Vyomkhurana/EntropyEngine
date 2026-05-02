import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";
import { THEME } from "../constants/theme";

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-xs">
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke || p.color }} className="font-semibold">
          {p.name}: {Number(p.value).toFixed(1)} {unit}
        </p>
      ))}
    </div>
  );
}

export default function LiveChart({
  data,
  lines = [],
  label,
  unit = "",
  height = 200,
  area = false,
  xKey = "tick",
}) {
  const ChartComp = area ? AreaChart : LineChart;
  const LineComp  = area ? Area : Line;

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComp data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={THEME.chart.grid} 
            opacity={0.15}
          />
          <XAxis
            dataKey={xKey}
            stroke={THEME.colors.textDim}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke={THEME.colors.textDim} 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {lines.map(({ key, color, name }) =>
            area ? (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                fill={color}
                fillOpacity={0.12}
                strokeWidth={2.5}
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
                strokeWidth={2.5}
                dot={false}
                name={name || key}
                animationDuration={300}
              />
            )
          )}
        </ChartComp>
      </ResponsiveContainer>
    </>
  );
}
