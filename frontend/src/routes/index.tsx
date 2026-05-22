import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FieldTrace - Impact and Lineage Analyzer" },
      {
        name: "description",
        content:
          "FieldTrace: Power BI impact analysis, relationship lineage, report usage analytics, and model-report mapping.",
      },
    ],
  }),
  component: Dashboard,
});
