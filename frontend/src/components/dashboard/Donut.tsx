import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function Donut({
  data,
  size = 140,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-4 w-full py-1">
      <div style={{ width: size, height: size }} className="shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={size * 0.32}
              outerRadius={size * 0.46}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-slate-700">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span>
              {d.name} <span className="text-slate-500">({d.value})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
