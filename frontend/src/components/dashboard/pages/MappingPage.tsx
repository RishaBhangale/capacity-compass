import { useState, useMemo } from "react";
import { Card, DataTable, HBar, KPI, Slicer } from "../primitives";
import { Donut } from "../Donut";
import {
  useKPIs,
  useAdoptionByTable,
  useFolderCoverage,
  useFieldSummary,
  usePQSources,
  fmt,
} from "@/hooks/useGovernanceData";

function LoadingCard() {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-400">
      Loading…
    </div>
  );
}

export function MappingPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: k, isLoading: kLoading } = useKPIs();
  const { data: adoptionByTable } = useAdoptionByTable(10);
  const { data: folderCoverage } = useFolderCoverage();
  const { data: fieldSummary } = useFieldSummary(500); // fetch more for seamless client-side filtering
  const { data: pqSources } = usePQSources();

  // Folder coverage data
  const folderData = useMemo(() => {
    return (folderCoverage ?? []).length > 0
      ? folderCoverage!
      : [
          {
            label: "(no folder)",
            value: typeof k?.total_measures === "number" ? k.total_measures : 0,
          },
        ];
  }, [folderCoverage, k?.total_measures]);

  // Check if folder coverage is empty/all "(no folder)"
  const allNoFolder = useMemo(() => {
    return folderData.every((f) => f.label === "(no folder)");
  }, [folderData]);

  // Dynamic interactive client-side filtering over field inventory list
  const filteredInventoryRows = useMemo(() => {
    const rawRows = (fieldSummary ?? []).map((f) => {
      const tier =
        f.neverused === "Yes"
          ? "Unused"
          : f.totalallrefs >= 5
            ? "High"
            : f.totalallrefs >= 1
              ? "Medium"
              : "Low";
      return {
        table: f.table,
        field: f.field,
        type: f.fieldtype === "Measure" ? "Measure" : "Column (data)",
        tier,
        folder: f.displayfolder ?? "—",
        rrefs: f.totalreportrefs,
        arefs: f.totalallrefs,
        never: f.neverused,
      };
    });

    return rawRows.filter((row) => {
      if (selectedTable && selectedTable !== "(All)" && row.table !== selectedTable) {
        return false;
      }
      if (selectedTier && selectedTier !== "(All)" && row.tier !== selectedTier) {
        return false;
      }
      if (selectedType && selectedType !== "(All)" && row.type !== selectedType) {
        return false;
      }
      return true;
    });
  }, [fieldSummary, selectedTable, selectedTier, selectedType]);

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

  // Adoption tier donut
  const unusedN = typeof k.unused_fields === "number" ? k.unused_fields : 0;
  const medN = typeof k.medium_adoption === "number" ? k.medium_adoption : 0;
  const highN = typeof k.high_adoption === "number" ? k.high_adoption : 0;
  const lowN = typeof k.low_adoption === "number" ? k.low_adoption : 0;
  const adoptionDonut = [
    { name: "Unused", value: unusedN, color: "#b91c1c" },
    { name: "Medium", value: medN, color: "#b45309" },
    { name: "High", value: highN, color: "#1d4ed8" },
    { name: "Low", value: lowN, color: "#15803d" },
  ].filter((d) => d.value > 0);

  // PQ Sources table
  const sourceRows = (pqSources ?? []).slice(0, 20).map((s) => ({
    table: s.tablename,
    conn: s.connector,
    steps: s.stepcount,
  }));

  // Slicer items derived from real data
  const tableItems = ["(All)", ...(adoptionByTable ?? []).slice(0, 10).map((a) => a.label)];
  const tierItems = ["(All)", "High", "Medium", "Low", "Unused"];
  const typeItems = ["(All)", "Measure", "Column (data)"];

  return (
    <div className="space-y-3">
      {/* Primary KPI metrics row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPI label="High Adoption" value={fmt(k.high_adoption)} color="text-green-700" />
        <KPI label="Medium Adoption" value={fmt(k.medium_adoption)} color="text-amber-700" />
        <KPI label="Low Adoption" value={fmt(k.low_adoption)} color="text-red-700" />
        <KPI label="Unused Fields" value={fmt(k.unused_fields)} color="text-red-700" />
        <KPI
          label="Measures With Folder"
          value={fmt(k.measures_with_folder)}
          color="text-indigo-700"
        />
        <KPI
          label="Avg Fields / Table"
          value={fmt(k.avg_fields_per_table)}
          color="text-amber-700"
        />
      </div>

      {/* Balanced layout distribution (HBar: 5/12, Donut: 3/12, Sources Table: 4/12) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Card title="Fields by Adoption Tier per Table" className="lg:col-span-5">
          {adoptionByTable && adoptionByTable.length > 0 ? (
            <div className="max-h-64 overflow-auto">
              <HBar color="bg-amber-400/70" labelWidth="w-32" data={adoptionByTable} />
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
        <Card title="Adoption Tier Distribution" className="lg:col-span-3">
          {adoptionDonut.length > 0 ? (
            <Donut data={adoptionDonut} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
        <Card title="Data Sources" className="lg:col-span-4">
          {sourceRows.length > 0 ? (
            <DataTable
              columns={[
                { key: "table", label: "Table" },
                { key: "conn", label: "Connector" },
                { key: "steps", label: "Steps", className: "text-right" },
              ]}
              rows={sourceRows}
              maxH="max-h-64"
            />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">N/A</div>
          )}
        </Card>
      </div>

      {/* Full-width display folder coverage card to prevent visual misdirection */}
      <Card title="Measure Display Folder Coverage">
        <div className="flex flex-col md:flex-row h-full items-center justify-between gap-6 py-2">
          <div className="w-full md:w-1/2">
            <HBar color="bg-indigo-400/70" labelWidth="w-24" data={folderData} />
          </div>
          {allNoFolder && (
            <div className="w-full md:w-1/2 rounded-lg bg-amber-50/70 border border-amber-200/80 p-3.5 text-[11.5px] text-amber-800 leading-relaxed shadow-sm">
              <span className="font-semibold text-amber-900">💡 Recommendation:</span> Measures are
              currently unorganized. Group your calculations into display folders in Power BI
              Desktop to improve categorisation and report builder discoverability.
            </div>
          )}
        </div>
      </Card>

      {/* Grid with stateful slicers on left and controlled table on right to prevent misdirection */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Slicer
            title="Table"
            items={tableItems}
            selected={selectedTable ? [selectedTable] : ["(All)"]}
            onSelect={(item) => setSelectedTable(item === "(All)" ? null : item)}
          />
          <Slicer
            title="Adoption Tier"
            items={tierItems}
            selected={selectedTier ? [selectedTier] : ["(All)"]}
            onSelect={(item) => setSelectedTier(item === "(All)" ? null : item)}
          />
          <Slicer
            title="Field Type"
            items={typeItems}
            selected={selectedType ? [selectedType] : ["(All)"]}
            onSelect={(item) => setSelectedType(item === "(All)" ? null : item)}
          />
          {(selectedTable || selectedTier || selectedType) && (
            <button
              onClick={() => {
                setSelectedTable(null);
                setSelectedTier(null);
                setSelectedType(null);
              }}
              className="w-full text-center text-[11px] text-amber-800 hover:text-amber-950 font-medium py-1.5 border border-amber-200 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-50 rounded transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="lg:col-span-10">
          <Card title="Complete Field Inventory — Table · Field · Type · Adoption Tier · Usage Counts">
            {filteredInventoryRows.length > 0 ? (
              <DataTable
                columns={[
                  { key: "table", label: "Table" },
                  { key: "field", label: "Field" },
                  { key: "type", label: "Field Type" },
                  { key: "tier", label: "Adoption Tier" },
                  { key: "folder", label: "Display Folder" },
                  { key: "rrefs", label: "Report Refs", className: "text-right" },
                  { key: "arefs", label: "All Refs", className: "text-right" },
                  { key: "never", label: "Never Used" },
                ]}
                rows={filteredInventoryRows}
                maxH="max-h-96"
              />
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-md">
                No fields match the selected filter configuration.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
