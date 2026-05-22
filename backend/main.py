"""
FieldTrace Governance API
=========================

FastAPI backend that serves governance metrics from a cached DuckDB
database.  The cache is populated from ``NW_MetaEx_Report.xlsx``
at startup and can be refreshed at any time via the
``POST /api/refresh-cache`` webhook.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ingest import ingest, DEFAULT_XLSX, DEFAULT_DB
import db

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("fieldtrace")


# ---------------------------------------------------------------------------
# Lifespan — ingest on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Ingesting Excel → DuckDB on startup …")
    try:
        result = ingest()
        logger.info("Ingestion result: %s", result)
    except FileNotFoundError:
        logger.warning(
            "Excel file not found at '%s' — API will return empty data. "
            "POST /api/refresh-cache once the file is available.",
            DEFAULT_XLSX,
        )
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FieldTrace Governance API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],              # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _safe(value: Any, default: Any = "N/A"):
    """Return *default* when *value* is None."""
    return value if value is not None else default


def _pct(numerator, denominator) -> str:
    """Compute a percentage string, returning 'N/A' on failure."""
    try:
        if denominator and denominator > 0:
            return f"{round(numerator / denominator * 100, 1)}%"
    except Exception:
        pass
    return "N/A"


# ===================================================================
# ENDPOINTS
# ===================================================================

# ----- Refresh cache ------------------------------------------------
@app.post("/api/refresh-cache")
def refresh_cache():
    """
    Reload the DuckDB cache from the latest Excel file.
    Called by Azure Pipeline after generating a new report.
    """
    try:
        result = ingest()
        return {"status": "ok", "tables": result}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ----- Health -------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "db": DEFAULT_DB, "xlsx": DEFAULT_XLSX}


# ----- KPIs (aggregated metrics for all pages) ----------------------
@app.get("/api/kpis")
def kpis():
    """
    Return pre-computed KPIs used across all four dashboard pages.
    Every value that cannot be computed returns ``"N/A"``.
    """
    # --- counts from field_summary ---
    total_fields       = db.scalar("SELECT COUNT(*) FROM field_summary")
    total_measures     = db.scalar("SELECT COUNT(*) FROM field_summary WHERE fieldtype = 'Measure'")
    total_columns      = db.scalar("SELECT COUNT(*) FROM field_summary WHERE fieldtype LIKE 'Column%'")
    never_used         = db.scalar("SELECT COUNT(*) FROM field_summary WHERE neverused = 'Yes'")
    used_anywhere      = db.scalar("SELECT COUNT(*) FROM field_summary WHERE usedanywhere = 'Yes'")
    unique_fields_used = db.scalar("SELECT COUNT(DISTINCT fullname) FROM field_summary WHERE totalallrefs > 0")

    # --- tables ---
    visible_tables = db.scalar("SELECT COUNT(*) FROM model_tables WHERE ishidden = 'No'")
    total_tables   = db.scalar("SELECT COUNT(*) FROM model_tables")

    # --- relationships ---
    total_rels     = db.scalar("SELECT COUNT(*) FROM model_relationships")
    active_rels    = db.scalar("SELECT COUNT(*) FROM model_relationships WHERE isactive = 'Yes'")
    inactive_rels  = db.scalar("SELECT COUNT(*) FROM model_relationships WHERE isactive != 'Yes'")
    one_dir        = db.scalar("SELECT COUNT(*) FROM model_relationships WHERE crossfilterdir = 'oneDirection'")
    both_dir       = db.scalar("SELECT COUNT(*) FROM model_relationships WHERE crossfilterdir = 'bothDirections'")

    # --- report ---
    total_refs     = db.scalar("SELECT COUNT(*) FROM report_usage")
    report_pages   = db.scalar("SELECT COUNT(DISTINCT page) FROM report_usage")
    slicer_usage   = db.scalar("SELECT COUNT(*) FROM report_usage WHERE usagecontext = 'Slicer'")
    visual_field   = db.scalar("SELECT COUNT(*) FROM report_usage WHERE usagecontext = 'Visual Field'")
    cond_format    = db.scalar("SELECT COUNT(*) FROM report_usage WHERE usagecontext = 'Conditional Format'")
    hidden_visuals = db.scalar("SELECT COUNT(*) FROM report_usage WHERE ishiddenvisual = 'Yes'")

    # --- orphans ---
    orphan_count   = db.scalar("SELECT COUNT(*) FROM orphan_references")

    # --- pq sources ---
    connector_breakdown = db.query(
        "SELECT connector, COUNT(*) AS cnt FROM pq_sources GROUP BY connector ORDER BY cnt DESC"
    )

    # --- derived metrics ---
    avg_fields_per_page = "N/A"
    if total_refs is not None and report_pages and report_pages > 0:
        avg_fields_per_page = round(total_refs / report_pages, 1)

    avg_fields_per_table = "N/A"
    if total_fields is not None and visible_tables and visible_tables > 0:
        avg_fields_per_table = round(total_fields / visible_tables, 1)

    # --- adoption tiers ---
    high_adoption   = db.scalar("SELECT COUNT(*) FROM field_summary WHERE totalallrefs >= 5 AND usedanywhere = 'Yes'")
    medium_adoption = db.scalar("SELECT COUNT(*) FROM field_summary WHERE totalallrefs BETWEEN 1 AND 4 AND usedanywhere = 'Yes'")
    low_adoption    = db.scalar("SELECT COUNT(*) FROM field_summary WHERE totalallrefs = 0 AND usedanywhere = 'Yes'")
    measures_with_folder = db.scalar("SELECT COUNT(*) FROM field_summary WHERE fieldtype = 'Measure' AND displayfolder IS NOT NULL AND displayfolder != ''")

    # --- tables with/without usage ---
    tables_with_usage = db.scalar(
        "SELECT COUNT(DISTINCT \"table\") FROM field_summary WHERE usedanywhere = 'Yes'"
    )
    tables_no_usage = None
    if visible_tables is not None and tables_with_usage is not None:
        tables_no_usage = visible_tables - tables_with_usage

    # --- model health & governance risk (simplified scores) ---
    model_health = "N/A"
    governance_risk = "N/A"
    if total_fields and total_fields > 0 and used_anywhere is not None and never_used is not None:
        used_ratio = used_anywhere / total_fields
        model_health = round(used_ratio * 100)
        governance_risk = round((1 - used_ratio) * 100)

    return {
        # Executive Summary
        "visible_tables":       _safe(visible_tables),
        "total_measures":       _safe(total_measures),
        "total_relationships":  _safe(total_rels),
        "report_pages":         _safe(report_pages),
        "never_used":           _safe(never_used),
        "orphan_count":         _safe(orphan_count),
        "model_health":         _safe(model_health),
        "governance_risk":      _safe(governance_risk),
        "active_fields":        _safe(used_anywhere),
        "unique_fields_used":   _safe(unique_fields_used),
        "total_columns":        _safe(total_columns),

        # Lineage
        "active_relationships": _safe(active_rels),
        "inactive_relationships": _safe(inactive_rels),
        "one_direction":        _safe(one_dir),
        "both_direction":       _safe(both_dir),
        "tables_with_usage":    _safe(tables_with_usage),
        "tables_no_usage":      _safe(tables_no_usage),

        # Usage
        "total_refs":           _safe(total_refs),
        "slicer_usage":         _safe(slicer_usage),
        "visual_field_usage":   _safe(visual_field),
        "cond_format_usage":    _safe(cond_format),
        "hidden_visuals":       _safe(hidden_visuals),
        "avg_fields_per_page":  _safe(avg_fields_per_page),

        # Mapping
        "high_adoption":        _safe(high_adoption),
        "medium_adoption":      _safe(medium_adoption),
        "low_adoption":         _safe(low_adoption),
        "unused_fields":        _safe(never_used),
        "measures_with_folder": _safe(measures_with_folder),
        "avg_fields_per_table": _safe(avg_fields_per_table),

        # Connector breakdown (for donut)
        "connectors":           connector_breakdown,
    }


# ----- Top pages by field references --------------------------------
@app.get("/api/top-pages")
def top_pages(limit: int = 10):
    return db.query(
        f"SELECT page AS label, COUNT(*) AS value FROM report_usage "
        f"GROUP BY page ORDER BY value DESC LIMIT {limit}"
    )


# ----- Top tables driving visuals -----------------------------------
@app.get("/api/top-tables")
def top_tables(limit: int = 10):
    return db.query(
        f"SELECT \"table\" AS label, COUNT(*) AS value FROM report_usage "
        f"GROUP BY \"table\" ORDER BY value DESC LIMIT {limit}"
    )


# ----- Field summary (full table) ----------------------------------
@app.get("/api/field-summary")
def field_summary(
    table: str | None = None,
    field_type: str | None = None,
    never_used: str | None = None,
    limit: int = 500,
):
    conditions = []
    if table:
        conditions.append(f"\"table\" = '{table}'")
    if field_type:
        conditions.append(f"fieldtype = '{field_type}'")
    if never_used:
        conditions.append(f"neverused = '{never_used}'")

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    return db.query(
        f"SELECT * FROM field_summary{where} ORDER BY totalallrefs DESC LIMIT {limit}"
    )


# ----- Relationships ------------------------------------------------
@app.get("/api/relationships")
def relationships(
    cross_filter: str | None = None,
    is_active: str | None = None,
):
    conditions = []
    if cross_filter:
        conditions.append(f"crossfilterdir = '{cross_filter}'")
    if is_active:
        conditions.append(f"isactive = '{is_active}'")

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    return db.query(
        f"SELECT name, fromtable AS from_table, fromcolumn AS from_column, "
        f"totable AS to_table, tocolumn AS to_column, "
        f"fromcardinality || '→' || tocardinality AS cardinality, "
        f"crossfilterdir, isactive "
        f"FROM model_relationships{where}"
    )


# ----- Relationship matrix (from-table × direction) -----------------
@app.get("/api/relationship-matrix")
def relationship_matrix():
    return db.query(
        "SELECT COALESCE(fromtable, 'Unknown') AS from_table, "
        "SUM(CASE WHEN crossfilterdir = 'oneDirection' THEN 1 ELSE 0 END) AS one_direction, "
        "SUM(CASE WHEN crossfilterdir = 'bothDirections' THEN 1 ELSE 0 END) AS both_directions, "
        "COUNT(*) AS total "
        "FROM model_relationships "
        "GROUP BY from_table "
        "ORDER BY total DESC "
        "LIMIT 10"
    )


# ----- Orphan references -------------------------------------------
@app.get("/api/orphans")
def orphans():
    return db.query("SELECT * FROM orphan_references")


# ----- Orphans aggregated by table ----------------------------------
@app.get("/api/orphans-by-table")
def orphans_by_table(limit: int = 10):
    return db.query(
        f"SELECT \"table\" AS label, COUNT(*) AS value FROM orphan_references "
        f"GROUP BY \"table\" ORDER BY value DESC LIMIT {limit}"
    )


# ----- Report usage (full table) -----------------------------------
@app.get("/api/report-usage")
def report_usage(
    page: str | None = None,
    visual_type: str | None = None,
    usage_context: str | None = None,
    limit: int = 500,
):
    conditions = []
    if page:
        conditions.append(f"page = '{page}'")
    if visual_type:
        conditions.append(f"visualtype = '{visual_type}'")
    if usage_context:
        conditions.append(f"usagecontext = '{usage_context}'")

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    return db.query(
        f"SELECT * FROM report_usage{where} LIMIT {limit}"
    )


# ----- Visual type distribution ------------------------------------
@app.get("/api/visual-types")
def visual_types():
    return db.query(
        "SELECT visualtype AS label, COUNT(*) AS value FROM report_usage "
        "GROUP BY visualtype ORDER BY value DESC"
    )


# ----- Usage context breakdown -------------------------------------
@app.get("/api/usage-contexts")
def usage_contexts():
    return db.query(
        "SELECT usagecontext AS label, COUNT(*) AS value FROM report_usage "
        "GROUP BY usagecontext ORDER BY value DESC"
    )


# ----- Field refs per page (for column chart) ----------------------
@app.get("/api/refs-per-page")
def refs_per_page():
    return db.query(
        "SELECT page AS label, COUNT(*) AS value FROM report_usage "
        "GROUP BY page ORDER BY value DESC"
    )


# ----- PQ Sources --------------------------------------------------
@app.get("/api/pq-sources")
def pq_sources():
    return db.query("SELECT * FROM pq_sources")


# ----- Unused fields per table -------------------------------------
@app.get("/api/unused-by-table")
def unused_by_table(limit: int = 10):
    return db.query(
        f"SELECT \"table\" AS label, COUNT(*) AS value FROM unused_fields "
        f"GROUP BY \"table\" ORDER BY value DESC LIMIT {limit}"
    )


# ----- Measures (model_measures) -----------------------------------
@app.get("/api/measures")
def measures():
    return db.query("SELECT * FROM model_measures")


# ----- Adoption by table -------------------------------------------
@app.get("/api/adoption-by-table")
def adoption_by_table(limit: int = 10):
    return db.query(
        f"SELECT \"table\" AS label, COUNT(*) AS value FROM field_summary "
        f"GROUP BY \"table\" ORDER BY value DESC LIMIT {limit}"
    )


# ----- Display folder coverage -------------------------------------
@app.get("/api/folder-coverage")
def folder_coverage():
    return db.query(
        "SELECT COALESCE(NULLIF(CAST(displayfolder AS VARCHAR), ''), '(no folder)') AS label, "
        "COUNT(*) AS value "
        "FROM field_summary "
        "WHERE fieldtype = 'Measure' "
        "GROUP BY label "
        "ORDER BY value DESC"
    )


# ----- Model Tables -------------------------------------------------
@app.get("/api/tables")
def tables():
    return db.query("SELECT * FROM model_tables ORDER BY \"table\"")
