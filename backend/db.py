"""
DuckDB query helper.

Provides a thin wrapper around the cached DuckDB file so that
route handlers never need to deal with connections directly.
"""

import logging
import os
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)

DEFAULT_DB = os.getenv(
    "DUCKDB_PATH",
    str(Path(__file__).resolve().parent / "cache.duckdb"),
)


def _connect(db_path: str = DEFAULT_DB) -> duckdb.DuckDBPyConnection:
    """Return a read-only connection to the cache database."""
    return duckdb.connect(db_path, read_only=True)


def query(sql: str, params: list | None = None, db_path: str = DEFAULT_DB) -> list[dict]:
    """
    Run *sql* against the cache and return a list of dicts.

    If the table does not exist (data was never ingested or the
    sheet was missing), returns an empty list instead of raising.
    """
    con = _connect(db_path)
    try:
        result = con.execute(sql, params or [])
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    except duckdb.CatalogException:
        logger.warning("Table not found for query: %s", sql[:120])
        return []
    except Exception as exc:
        logger.error("Query failed: %s — %s", sql[:120], exc)
        return []
    finally:
        con.close()


def scalar(sql: str, db_path: str = DEFAULT_DB):
    """
    Run *sql* and return the single scalar value, or ``None``
    if the query returns nothing or the table is missing.
    """
    con = _connect(db_path)
    try:
        result = con.execute(sql).fetchone()
        return result[0] if result else None
    except duckdb.CatalogException:
        return None
    except Exception as exc:
        logger.error("Scalar query failed: %s — %s", sql[:120], exc)
        return None
    finally:
        con.close()


def table_exists(table_name: str, db_path: str = DEFAULT_DB) -> bool:
    """Check whether *table_name* exists in the cache."""
    con = _connect(db_path)
    try:
        tables = [
            r[0]
            for r in con.execute(
                "SELECT table_name FROM information_schema.tables"
            ).fetchall()
        ]
        return table_name in tables
    except Exception:
        return False
    finally:
        con.close()
