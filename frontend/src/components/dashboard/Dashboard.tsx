import { useState } from "react";
import { PAGES, PageKey } from "./types";
import { ExecPage } from "./pages/ExecPage";
import { LineagePage } from "./pages/LineagePage";
import { UsagePage } from "./pages/UsagePage";
import { MappingPage } from "./pages/MappingPage";

export function Dashboard() {
  const [active, setActive] = useState<PageKey>("exec");
  const page = PAGES.find((p) => p.key === active)!;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PAGES.map((p) => {
          const isActive = p.key === active;
          return (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                isActive
                  ? "text-white"
                  : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
              }`}
              style={isActive ? { backgroundColor: p.accent } : undefined}
            >
              {p.num} {p.label}
            </button>
          );
        })}
      </div>

      {/* Main container */}
      <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
        {/* Sidebar */}
        <aside className="flex w-56 shrink-0 flex-col bg-[#0d1b2e] text-white">
          <div className="px-5 py-5">
            <div className="text-sm font-bold text-white tracking-wide">FieldTrace</div>
            <div className="text-[10px] text-slate-400 font-medium">Impact & Lineage Analyzer</div>
          </div>
          <div className="mx-5 border-t border-white/10" />
          <nav className="mt-2 flex-1">
            {PAGES.map((p) => {
              const isActive = p.key === active;
              return (
                <button
                  key={p.key}
                  onClick={() => setActive(p.key)}
                  className="block w-full px-5 py-3 text-left transition hover:bg-white/5"
                  style={isActive ? { backgroundColor: p.accent } : undefined}
                >
                  <div className="text-[11px] font-semibold text-slate-300">{p.num}</div>
                  <div className="text-xs font-medium">{p.label}</div>
                </button>
              );
            })}
          </nav>
          <div className="px-5 py-4 text-[10px] leading-relaxed text-slate-400">
            <div>Source:</div>
            <div>NW_MetaEx_</div>
            <div>Report.xlsx</div>
            <div className="mt-3">FieldTrace</div>
            <div>Semantic Model</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-start justify-between border-l-[3px] bg-[#0d1b2e] px-5 py-4 text-white"
            style={{ borderLeftColor: page.accent }}
          >
            <div>
              <h1 className="text-lg font-semibold">{page.title}</h1>
              <p className="text-xs text-slate-300">{page.subtitle}</p>
            </div>
            <div className="text-[10px] text-slate-400">FieldTrace · Impact & Lineage Analyzer</div>
          </div>

          {/* Canvas */}
          <div className="max-h-[calc(100vh-180px)] overflow-auto bg-slate-50 p-4">
            {active === "exec" && <ExecPage />}
            {active === "lineage" && <LineagePage />}
            {active === "usage" && <UsagePage />}
            {active === "mapping" && <MappingPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
