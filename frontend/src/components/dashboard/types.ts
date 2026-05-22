export type PageKey = "exec" | "lineage" | "usage" | "mapping";

export interface PageTheme {
  key: PageKey;
  num: string;
  label: string;
  title: string;
  subtitle: string;
  accent: string; // hex
  accentClass: string; // tailwind bg class
  accentTextClass: string;
}

export const PAGES: PageTheme[] = [
  {
    key: "exec",
    num: "01",
    label: "Executive Summary",
    title: "Executive Summary",
    subtitle: "Governance health, model coverage, and adoption overview",
    accent: "#1d4ed8",
    accentClass: "bg-blue-700",
    accentTextClass: "text-blue-700",
  },
  {
    key: "lineage",
    num: "02",
    label: "Lineage & Dependencies",
    title: "Lineage & Dependencies",
    subtitle:
      "Relationship topology, orphaned references, cross-filter directions, unused model assets",
    accent: "#3730a3",
    accentClass: "bg-indigo-800",
    accentTextClass: "text-indigo-800",
  },
  {
    key: "usage",
    num: "03",
    label: "Usage Analytics",
    title: "Usage Analytics",
    subtitle:
      "Report consumption patterns, page usage, visual type distribution, and field-level interactions",
    accent: "#0f766e",
    accentClass: "bg-teal-700",
    accentTextClass: "text-teal-700",
  },
  {
    key: "mapping",
    num: "04",
    label: "Model–Report Mapping",
    title: "Model–Report Mapping",
    subtitle: "Field inventory, adoption tiers, data source coverage, and measure classification",
    accent: "#b45309",
    accentClass: "bg-amber-700",
    accentTextClass: "text-amber-700",
  },
];
