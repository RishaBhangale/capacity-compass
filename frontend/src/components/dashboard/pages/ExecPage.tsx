import { Card, HBar, KPI } from "../primitives";
import { Donut } from "../Donut";
import {
  useKPIs,
  useTopPages,
  useTopTables,
  useUsageContexts,
  fmt,
} from "@/hooks/useGovernanceData";

function LoadingCard() {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-400">
      Loading…
    </div>
  );
}

// Donut colour palette
const CONNECTOR_COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be185d", "#0369a1"];

export function ExecPage() {
  const { data: k, isLoading: kLoading } = useKPIs();
  const { data: topPages } = useTopPages(10);
  const { data: topTables } = useTopTables(10);
  const { data: ctxData } = useUsageContexts();

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

  // Build connector donut data
  const connectorDonut = (k.connectors ?? [])
    .filter((c) => c.connector !== null)
    .map((c, i) => ({
      name: c.connector!,
      value: c.cnt,
      color: CONNECTOR_COLORS[i % CONNECTOR_COLORS.length],
    }));

  // Build adoption donut
  const usedCount = typeof k.active_fields === "number" ? k.active_fields : 0;
  const unusedCount = typeof k.never_used === "number" ? k.never_used : 0;
  const adoptionDonut = [
    { name: `Unused`, value: unusedCount, color: "#b91c1c" },
    { name: `Used`, value: usedCount, color: "#15803d" },
  ];

  // Field type split
  const colCount = typeof k.total_columns === "number" ? k.total_columns : 0;
  const measCount = typeof k.total_measures === "number" ? k.total_measures : 0;
  const typeDonut = [
    { name: "Columns", value: colCount, color: "#1d4ed8" },
    { name: "Measures", value: measCount, color: "#0f766e" },
  ];

  return (
    <div className="space-y-3">
      {/* 10 KPIs grouped into a perfectly balanced, uniform grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <KPI label="Visible Tables" value={fmt(k.visible_tables)} color="text-[#0d1b2e]" />
        <KPI label="Total Measures" value={fmt(k.total_measures)} color="text-blue-700" />
        <KPI label="Relationships" value={fmt(k.total_relationships)} color="text-indigo-700" />
        <KPI label="Report Pages" value={fmt(k.report_pages)} color="text-teal-700" />
        <KPI label="Active Fields" value={fmt(k.active_fields)} color="text-green-700" />

        <KPI label="Unique Fields Used" value={fmt(k.unique_fields_used)} color="text-blue-700" />
        <KPI label="Never Used Fields" value={fmt(k.never_used)} color="text-red-700" />
        <KPI label="Orphaned References" value={fmt(k.orphan_count)} color="text-red-700" />
        <KPI label="Model Health Score" value={fmt(k.model_health)} color="text-teal-700" />
        <KPI label="Governance Risk" value={fmt(k.governance_risk)} color="text-red-700" />
      </div>

      {/* Row containing all three circular donut metrics side-by-side */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Data Sources by Connector">
          {connectorDonut.length > 0 ? (
            <Donut data={connectorDonut} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
        <Card title="Field Adoption — Used vs Unused">
          <Donut data={adoptionDonut} />
        </Card>
        <Card title="Field Type Split">
          <Donut data={typeDonut} />
        </Card>
      </div>

      {/* Row containing two main horizontal bar charts side-by-side */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Top 10 Pages by Field References">
          {topPages && topPages.length > 0 ? (
            <HBar color="bg-blue-400/70" data={topPages} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
        <Card title="Top 10 Tables Driving Report Visuals">
          {topTables && topTables.length > 0 ? (
            <HBar color="bg-indigo-400/70" data={topTables} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
      </div>

      {/* Full-width bar chart at bottom */}
      <Card title="Field Usage by Context">
        {ctxData && ctxData.length > 0 ? (
          <HBar color="bg-teal-500/60" labelWidth="w-28" data={ctxData} />
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">N/A</div>
        )}
      </Card>
    </div>
  );
}
