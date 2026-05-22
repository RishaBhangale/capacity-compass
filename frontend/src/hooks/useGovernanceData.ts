/**
 * TanStack Query hooks for the FieldTrace Governance API.
 *
 * Every hook returns { data, isLoading, isError } and gracefully
 * handles missing data by returning safe defaults.
 */

import { useQuery } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── generic fetcher ───────────────────────────────────────────────
async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ─── types ─────────────────────────────────────────────────────────
export interface KPIs {
  visible_tables: number | string;
  total_measures: number | string;
  total_relationships: number | string;
  report_pages: number | string;
  never_used: number | string;
  orphan_count: number | string;
  model_health: number | string;
  governance_risk: number | string;
  active_fields: number | string;
  unique_fields_used: number | string;
  total_columns: number | string;

  active_relationships: number | string;
  inactive_relationships: number | string;
  one_direction: number | string;
  both_direction: number | string;
  tables_with_usage: number | string;
  tables_no_usage: number | string;

  total_refs: number | string;
  slicer_usage: number | string;
  visual_field_usage: number | string;
  cond_format_usage: number | string;
  hidden_visuals: number | string;
  avg_fields_per_page: number | string;

  high_adoption: number | string;
  medium_adoption: number | string;
  low_adoption: number | string;
  unused_fields: number | string;
  measures_with_folder: number | string;
  avg_fields_per_table: number | string;

  connectors: { connector: string | null; cnt: number }[];
}

export interface LabelValue {
  label: string;
  value: number;
}

export interface RelationshipRow {
  name: string;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  cardinality: string;
  crossfilterdir: string;
  isactive: string;
}

export interface RelMatrixRow {
  from_table: string;
  one_direction: number;
  both_directions: number;
  total: number;
}

export interface OrphanRow {
  table: string;
  field: string;
  fullname: string;
  seeninreport: string;
  seenonpage: string;
  usagecontext: string;
  note: string;
}

export interface ReportUsageRow {
  report: string;
  page: string;
  visual: string;
  visualtype: string;
  table: string;
  field: string;
  fullname: string;
  usagecontext: string;
  ishiddenvisual: string;
}

export interface FieldSummaryRow {
  table: string;
  field: string;
  fullname: string;
  fieldtype: string;
  ishidden: string;
  displayfolder: string | null;
  description: string | null;
  totalreportrefs: number;
  totalallrefs: number;
  usagecontexts: string | null;
  usedanywhere: string;
  neverused: string;
}

export interface PQSourceRow {
  semanticmodel: string;
  tablename: string;
  connector: string;
  stepcount: number;
}

// ─── hooks ─────────────────────────────────────────────────────────
const STALE = 5 * 60 * 1000; // 5 min

export function useKPIs() {
  return useQuery<KPIs>({
    queryKey: ["kpis"],
    queryFn: () => fetchJson("/api/kpis"),
    staleTime: STALE,
  });
}

export function useTopPages(limit = 10) {
  return useQuery<LabelValue[]>({
    queryKey: ["top-pages", limit],
    queryFn: () => fetchJson(`/api/top-pages?limit=${limit}`),
    staleTime: STALE,
  });
}

export function useTopTables(limit = 10) {
  return useQuery<LabelValue[]>({
    queryKey: ["top-tables", limit],
    queryFn: () => fetchJson(`/api/top-tables?limit=${limit}`),
    staleTime: STALE,
  });
}

export function useRelationships(crossFilter?: string | null, isActive?: string | null) {
  const params = new URLSearchParams();
  if (crossFilter) params.append("cross_filter", crossFilter);
  if (isActive) {
    // Standardize "Yes" / "No" to matching database representation
    params.append("is_active", isActive);
  }
  const queryStr = params.toString() ? `?${params.toString()}` : "";
  return useQuery<RelationshipRow[]>({
    queryKey: ["relationships", crossFilter, isActive],
    queryFn: () => fetchJson(`/api/relationships${queryStr}`),
    staleTime: STALE,
  });
}

export function useRelationshipMatrix() {
  return useQuery<RelMatrixRow[]>({
    queryKey: ["relationship-matrix"],
    queryFn: () => fetchJson("/api/relationship-matrix"),
    staleTime: STALE,
  });
}

export function useOrphans() {
  return useQuery<OrphanRow[]>({
    queryKey: ["orphans"],
    queryFn: () => fetchJson("/api/orphans"),
    staleTime: STALE,
  });
}

export function useOrphansByTable(limit = 10) {
  return useQuery<LabelValue[]>({
    queryKey: ["orphans-by-table", limit],
    queryFn: () => fetchJson(`/api/orphans-by-table?limit=${limit}`),
    staleTime: STALE,
  });
}

export function useReportUsage(
  limit = 500,
  visualType?: string | null,
  usageContext?: string | null,
) {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  if (visualType) params.append("visual_type", visualType);
  if (usageContext) params.append("usage_context", usageContext);
  const queryStr = params.toString() ? `?${params.toString()}` : "";
  return useQuery<ReportUsageRow[]>({
    queryKey: ["report-usage", limit, visualType, usageContext],
    queryFn: () => fetchJson(`/api/report-usage${queryStr}`),
    staleTime: STALE,
  });
}

export function useVisualTypes() {
  return useQuery<LabelValue[]>({
    queryKey: ["visual-types"],
    queryFn: () => fetchJson("/api/visual-types"),
    staleTime: STALE,
  });
}

export function useUsageContexts() {
  return useQuery<LabelValue[]>({
    queryKey: ["usage-contexts"],
    queryFn: () => fetchJson("/api/usage-contexts"),
    staleTime: STALE,
  });
}

export function useRefsPerPage() {
  return useQuery<LabelValue[]>({
    queryKey: ["refs-per-page"],
    queryFn: () => fetchJson("/api/refs-per-page"),
    staleTime: STALE,
  });
}

export function useFieldSummary(limit = 500) {
  return useQuery<FieldSummaryRow[]>({
    queryKey: ["field-summary", limit],
    queryFn: () => fetchJson(`/api/field-summary?limit=${limit}`),
    staleTime: STALE,
  });
}

export function useUnusedByTable(limit = 10) {
  return useQuery<LabelValue[]>({
    queryKey: ["unused-by-table", limit],
    queryFn: () => fetchJson(`/api/unused-by-table?limit=${limit}`),
    staleTime: STALE,
  });
}

export function useAdoptionByTable(limit = 10) {
  return useQuery<LabelValue[]>({
    queryKey: ["adoption-by-table", limit],
    queryFn: () => fetchJson(`/api/adoption-by-table?limit=${limit}`),
    staleTime: STALE,
  });
}

export function useFolderCoverage() {
  return useQuery<LabelValue[]>({
    queryKey: ["folder-coverage"],
    queryFn: () => fetchJson("/api/folder-coverage"),
    staleTime: STALE,
  });
}

export function usePQSources() {
  return useQuery<PQSourceRow[]>({
    queryKey: ["pq-sources"],
    queryFn: () => fetchJson("/api/pq-sources"),
    staleTime: STALE,
  });
}

// ─── formatting helpers ────────────────────────────────────────────
/** Format a KPI value for display — "N/A" passthrough, numbers get commas. */
export function fmt(v: number | string | undefined | null): string {
  if (v === undefined || v === null) return "N/A";
  if (v === "N/A") return "N/A";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}
