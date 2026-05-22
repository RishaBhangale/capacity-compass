"""
Excel → DuckDB ingestion engine.

Reads NW_MetaEx_Report.xlsx and loads every relevant sheet
into a local DuckDB database (cache.duckdb).

Can be called:
  - At server startup
  - Via the /api/refresh-cache webhook
"""

import logging
import os
from pathlib import Path

import duckdb
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_XLSX = os.getenv(
    "XLSX_PATH",
    str(Path(__file__).resolve().parent.parent / "NW_MetaEx_Report.xlsx"),
)
DEFAULT_DB = os.getenv(
    "DUCKDB_PATH",
    str(Path(__file__).resolve().parent / "cache.duckdb"),
)

# Sheets we care about and the DuckDB table names they map to.
SHEET_TABLE_MAP: dict[str, str] = {
    "Model_Tables":          "model_tables",
    "Model_Columns":         "model_columns",
    "Model_Measures":        "model_measures",
    "Model_Relationships":   "model_relationships",
    "Calc_Dependencies":     "calc_dependencies",
    "PQ_Sources":            "pq_sources",
    "PQ_Steps":              "pq_steps",
    "PQ_Summary":            "pq_summary",
    "PQ_Report_Summary":     "pq_report_summary",
    "Report_Usage":          "report_usage",
    "Summary":               "field_summary",
    "Gap_Unused_Fields":     "unused_fields",
    "Gap_Orphan_References": "orphan_references",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ingest(xlsx_path: str = DEFAULT_XLSX, db_path: str = DEFAULT_DB) -> dict:
    """
    Read *xlsx_path* and write every mapped sheet into *db_path*.

    Returns a dict of ``{table_name: row_count}`` for each table
    that was successfully loaded.  Missing / empty sheets are
    skipped gracefully and logged as warnings.
    """
    xlsx = Path(xlsx_path)
    if not xlsx.exists():
        raise FileNotFoundError(f"Excel file not found: {xlsx}")

    results: dict[str, int] = {}

    # Use a fresh connection; if the file already exists it will be
    # overwritten table-by-table.
    con = duckdb.connect(db_path)

    try:
        for sheet_name, table_name in SHEET_TABLE_MAP.items():
            try:
                df = pd.read_excel(xlsx_path, sheet_name=sheet_name)
            except Exception as exc:
                logger.warning("Sheet '%s' could not be read: %s", sheet_name, exc)
                results[table_name] = 0
                continue

            if df.empty:
                logger.warning("Sheet '%s' is empty — skipping.", sheet_name)
                results[table_name] = 0
                continue

            # Normalise column names: strip whitespace, replace spaces
            # with underscores, lowercase.
            df.columns = [
                c.strip().replace(" ", "_").replace("—", "_").lower()
                for c in df.columns
            ]

            # --- Post-processing for model_relationships ---
            # The Excel stores FromTable/ToTable as null and encodes
            # the table name inside the column reference:
            #   fromcolumn = "Dim Date'.DateID"  →  from_table_parsed = "Dim Date"
            #   tocolumn   = "Dim Date.DateID"   →  to_table_parsed   = "Dim Date"
            if table_name == "model_relationships":
                def _extract_table(col_ref):
                    """Parse table name from 'Table'.Column or Table.Column format."""
                    if not isinstance(col_ref, str):
                        return None
                    # Format: Table'.Column  (single-quote before the dot)
                    if "'." in col_ref:
                        return col_ref.split("'.")[0].strip("'").strip()
                    # Format: Table.Column
                    if "." in col_ref:
                        return col_ref.rsplit(".", 1)[0].strip("'").strip()
                    return None

                def _extract_column(col_ref):
                    """Parse column name from 'Table'.Column or Table.Column format."""
                    if not isinstance(col_ref, str):
                        return col_ref
                    if "'." in col_ref:
                        return col_ref.split("'.")[-1].strip()
                    if "." in col_ref:
                        return col_ref.rsplit(".", 1)[-1].strip()
                    return col_ref

                # Create parsed columns
                df["from_table_parsed"] = df["fromcolumn"].apply(_extract_table)
                df["to_table_parsed"]   = df["tocolumn"].apply(_extract_table)
                df["from_col_parsed"]   = df["fromcolumn"].apply(_extract_column)
                df["to_col_parsed"]     = df["tocolumn"].apply(_extract_column)

                # Use parsed values where the original FromTable/ToTable is null
                if "fromtable" in df.columns:
                    df["fromtable"] = df["fromtable"].fillna(df["from_table_parsed"])
                else:
                    df["fromtable"] = df["from_table_parsed"]

                if "totable" in df.columns:
                    df["totable"] = df["totable"].fillna(df["to_table_parsed"])
                else:
                    df["totable"] = df["to_table_parsed"]

                # Replace raw column refs with clean column names
                df["fromcolumn"] = df["from_col_parsed"]
                df["tocolumn"]   = df["to_col_parsed"]

                # Drop temporary columns
                df.drop(columns=["from_table_parsed", "to_table_parsed",
                                 "from_col_parsed", "to_col_parsed"], inplace=True)

            con.execute(f"DROP TABLE IF EXISTS {table_name}")
            con.execute(
                f"CREATE TABLE {table_name} AS SELECT * FROM df"
            )
            results[table_name] = len(df)
            logger.info(
                "Loaded sheet '%s' → table '%s' (%d rows)",
                sheet_name, table_name, len(df),
            )
    finally:
        con.close()

    return results


# ---------------------------------------------------------------------------
# CLI entry point (for manual testing)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = ingest()
    print("\n✅  Ingestion complete:")
    for tbl, cnt in result.items():
        print(f"   {tbl:30s}  {cnt:>6,} rows")
