import { useState } from "react";
import { Card, DataTable, HBar, KPI, Slicer } from "../primitives";
import { Donut } from "../Donut";
import {
  useKPIs,
  useVisualTypes,
  useTopTables,
  useUsageContexts,
  useRefsPerPage,
  useReportUsage,
  fmt,
} from "@/hooks/useGovernanceData";

function LoadingCard() {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-400">
      Loading…
    </div>
  );
}

// Colors for the usage context donut
const CTX_COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be185d"];

export function UsagePage() {
  const [visualType, setVisualType] = useState<string | null>(null);
  const [usageContext, setUsageContext] = useState<string | null>(null);

  const { data: k, isLoading: kLoading } = useKPIs();
  const { data: visualTypes } = useVisualTypes();
  const { data: topTables } = useTopTables(10);
  const { data: ctxRaw } = useUsageContexts();
  const { data: refsPerPage } = useRefsPerPage();
  const { data: usageRows } = useReportUsage(100, visualType, usageContext);

  if (kLoading || !k) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Filter visual types — exclude bookmark JSON files
  const filteredVisualTypes = (visualTypes ?? []).filter(
    (v) => !v.label.endsWith(".bookmark.json"),
  );

  // Build usage context donut
  const ctxDonut = (ctxRaw ?? []).map((c, i) => ({
    name: c.label,
    value: c.value,
    color: CTX_COLORS[i % CTX_COLORS.length],
  }));

  // Build column chart heights from refs-per-page data
  const maxRef = Math.max(...(refsPerPage ?? []).map((r) => r.value), 1);
  const colHeights = (refsPerPage ?? []).map((r) =>
    Math.max(Math.round((r.value / maxRef) * 100), 3),
  );

  // Slicer items from real data
  const vtItems = ["(All)", ...filteredVisualTypes.slice(0, 8).map((v) => v.label)];
  const ctxItems = ["(All)", ...(ctxRaw ?? []).map((c) => c.label)];

  // Usage detail rows
  const detailRows = (usageRows ?? []).slice(0, 50).map((r) => ({
    page: r.page,
    table: r.table,
    field: r.field,
    vtype: r.visualtype,
    ctx: r.usagecontext,
  }));

  return (
    <div className="space-y-3">
      {/* Primary KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPI label="Total Field Refs" value={fmt(k.total_refs)} />
        <KPI label="Unique Fields Used" value={fmt(k.unique_fields_used)} color="text-blue-700" />
        <KPI label="Slicer Usage" value={fmt(k.slicer_usage)} color="text-indigo-700" />
        <KPI label="Visual Field Usage" value={fmt(k.visual_field_usage)} color="text-teal-700" />
        <KPI label="Avg Fields / Page" value={fmt(k.avg_fields_per_page)} color="text-amber-700" />
        <KPI label="Hidden Visual Fields" value={fmt(k.hidden_visuals)} color="text-slate-700" />
      </div>

      {/* Main distribution charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Visual Type Distribution">
          {filteredVisualTypes.length > 0 ? (
            <HBar color="bg-teal-400/70" labelWidth="w-20" data={filteredVisualTypes.slice(0, 8)} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
        <Card title="Top Tables Driving Visuals">
          {topTables && topTables.length > 0 ? (
            <HBar color="bg-blue-400/70" labelWidth="w-28" data={topTables.slice(0, 8)} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
        <Card title="Usage Context Breakdown">
          {ctxDonut.length > 0 ? (
            <Donut data={ctxDonut} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
      </div>

      {/* Full-width references chart to prevent squishing and distinguish from filters */}
      <Card title={`Field References Across All ${refsPerPage?.length ?? 0} Report Pages`}>
        {colHeights.length > 0 ? (
          <div className="flex h-48 items-end gap-1 px-2 pt-4">
            {colHeights.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-teal-500/70 hover:bg-teal-600 transition-colors"
                style={{ height: `${h}%` }}
                title={`${refsPerPage?.[i]?.label ?? ""}: ${refsPerPage?.[i]?.value ?? 0} references`}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">N/A</div>
        )}
      </Card>

      {/* Grid with stateful slicers on left and controlled table on right to prevent misdirection */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
        <div className="lg:col-span-1 flex flex-col gap-3">
          <Slicer
            title="Visual Type"
            items={vtItems}
            selected={visualType ? [visualType] : ["(All)"]}
            onSelect={(item) => setVisualType(item === "(All)" ? null : item)}
          />
          <Slicer
            title="Usage Context"
            items={ctxItems}
            selected={usageContext ? [usageContext] : ["(All)"]}
            onSelect={(item) => setUsageContext(item === "(All)" ? null : item)}
          />
          {(visualType || usageContext) && (
            <button
              onClick={() => {
                setVisualType(null);
                setUsageContext(null);
              }}
              className="w-full text-center text-[11px] text-teal-700 hover:text-teal-950 font-medium py-1.5 border border-teal-200 hover:border-teal-400 bg-teal-50/50 hover:bg-teal-50 rounded transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="lg:col-span-5">
          <Card title="Usage Detail — Page × Table × Field × Visual Type × Context">
            {detailRows.length > 0 ? (
              <DataTable
                columns={[
                  { key: "page", label: "Page" },
                  { key: "table", label: "Table" },
                  { key: "field", label: "Field" },
                  { key: "vtype", label: "Visual Type" },
                  { key: "ctx", label: "Usage Context" },
                ]}
                rows={detailRows}
                maxH="max-h-80"
              />
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-md">
                No report usage records match the selected filters.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
