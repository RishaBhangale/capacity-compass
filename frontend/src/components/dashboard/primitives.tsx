import { Check } from "lucide-react";
import { ReactNode } from "react";

export function KPI({
  label,
  value,
  color = "text-slate-800",
}: {
  label: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {title && (
        <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
          {title}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function HBar({
  data,
  color,
  trackColor = "bg-slate-100",
  labelWidth = "w-40",
  max,
}: {
  data: { label: string; value: number }[];
  color: string; // tailwind bg class
  trackColor?: string;
  labelWidth?: string;
  max?: number;
}) {
  const m = max ?? Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <div className={`${labelWidth} shrink-0 truncate text-right text-slate-600`}>
            {d.label}
          </div>
          <div className={`relative h-3 flex-1 rounded-sm ${trackColor}`}>
            <div
              className={`absolute inset-y-0 left-0 rounded-sm ${color}`}
              style={{ width: `${(d.value / m) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Slicer({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: string[];
  selected: string[];
  onSelect?: (item: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white select-none shadow-sm">
      <div className="bg-[#0d1b2e] px-3 py-1.5 text-xs font-semibold text-white">{title}</div>
      <ul className="p-1 text-xs">
        {items.map((it) => {
          const isSel = selected.includes(it);
          return (
            <li
              key={it}
              onClick={() => onSelect?.(it)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-1 transition-colors hover:bg-slate-100/80 ${
                isSel
                  ? "font-semibold text-slate-900 bg-slate-50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isSel ? (
                <Check className="size-3 text-slate-700 shrink-0" strokeWidth={3} />
              ) : (
                <span className="inline-block size-3 shrink-0" />
              )}
              <span className="truncate" title={it}>
                {it}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  maxH = "max-h-64",
}: {
  columns: { key: keyof T & string; label: string; className?: string }[];
  rows: T[];
  maxH?: string;
}) {
  return (
    <div className={`overflow-auto rounded-md border border-slate-200 ${maxH}`}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#0d1b2e] text-white">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 text-left font-semibold ${c.className ?? ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-1.5 text-slate-700 ${c.className ?? ""}`}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
