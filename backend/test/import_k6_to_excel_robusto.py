
import argparse
import json
import os
from datetime import datetime
import math
import pandas as pd

def safe_get(d, path, default=None):
    cur = d
    try:
        for p in path:
            if cur is None:
                return default
            cur = cur.get(p)
        return cur if cur is not None else default
    except Exception:
        return default

def parse_k6_summary(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    metrics = data.get("metrics", {})
    http_req = metrics.get("http_req_duration", {})
    percentiles = http_req.get("percentiles", {}) or {}

    # Raw numbers we might need
    http_reqs_count = safe_get(metrics, ["http_reqs", "count"], 0)
    http_req_failed_rate = safe_get(metrics, ["http_req_failed", "rate"], None)
    checks_passes = safe_get(metrics, ["checks", "passes"], None)
    checks_fails = safe_get(metrics, ["checks", "fails"], None)
    checks_rate = safe_get(metrics, ["checks", "rate"], None)

    # Build row with robust fallbacks
    row = {
        "Fecha": datetime.now().strftime("%Y-%m-%d"),
        "Hora": datetime.now().strftime("%H:%M:%S"),
        "Base_URL": "",
        "Endpoints": "",
        "VUs": "",
        "Duration": "",
        "Total_Requests": http_reqs_count,
        # Prefer checks.rate if present, else 1 - http_req_failed.rate, else N/A
        "HTTP_2xx_3xx_rate": (
            checks_rate if checks_rate is not None
            else (1 - http_req_failed_rate if http_req_failed_rate is not None else "N/A")
        ),
        "p50_ms": percentiles.get("p(50)", "N/A"),
        "p90_ms": percentiles.get("p(90)", "N/A"),
        "p95_ms": percentiles.get("p(95)", "N/A"),
        "p99_ms": percentiles.get("p(99)", "N/A"),
        "avg_ms": http_req.get("avg", "N/A"),
        "min_ms": http_req.get("min", "N/A"),
        "max_ms": http_req.get("max", "N/A"),
        # Errores: prefer checks.fails; else derive from http_req_failed.rate*count
        "Errores": (
            checks_fails if checks_fails is not None else (
                int(round(http_req_failed_rate * http_reqs_count)) if (http_req_failed_rate is not None and http_reqs_count) else "N/A"
            )
        ),
        "Archivo_JSON": os.path.basename(json_path),
        "Notas": ""
    }

    # Per-endpoint trends (duration_*)
    per_endpoint = []
    for name, m in metrics.items():
        if name.startswith("duration_"):
            p = m.get("percentiles", {}) or {}
            per_endpoint.append({
                "Métrica": name,
                "avg_ms": m.get("avg", "N/A"),
                "p95_ms": p.get("p(95)", "N/A"),
                "p99_ms": p.get("p(99)", "N/A"),
                "count": m.get("count", "N/A"),
            })

    return row, per_endpoint

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", required=True, help="Ruta al JSON exportado por k6 (--summary-export)")
    ap.add_argument("--excel", required=True, help="Ruta del Excel de resultados")
    ap.add_argument("--base_url", default="", help="Base URL usada")
    ap.add_argument("--endpoints", default="", help="Lista de endpoints probados")
    ap.add_argument("--vus", default="", help="Usuarios virtuales")
    ap.add_argument("--duration", default="", help="Duración de la prueba")
    args = ap.parse_args()

    row, per_endpoint = parse_k6_summary(args.json)
    row["Base_URL"] = args.base_url
    row["Endpoints"] = args.endpoints
    row["VUs"] = args.vus
    row["Duration"] = args.duration

    df_row = pd.DataFrame([row])

    # Append/update Resultados_k6
    try:
        existing = pd.read_excel(args.excel, sheet_name="Resultados_k6")
        out = pd.concat([existing, df_row], ignore_index=True)
    except Exception:
        out = df_row

    with pd.ExcelWriter(args.excel, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        out.to_excel(writer, sheet_name="Resultados_k6", index=False)

        # Per-endpoint sheet
        if per_endpoint:
            df_pe = pd.DataFrame(per_endpoint)
            df_pe["Archivo_JSON"] = row["Archivo_JSON"]
            df_pe["Base_URL"] = row["Base_URL"]
            df_pe["Endpoints"] = row["Endpoints"]
            df_pe["VUs"] = row["VUs"]
            df_pe["Duration"] = row["Duration"]
            df_pe["Fecha"] = row["Fecha"]
            df_pe["Hora"] = row["Hora"]
            df_pe.to_excel(writer, sheet_name="Resultados_k6_por_endpoint", index=False)

    print(f"Importado {args.json} → {args.excel}")

if __name__ == "__main__":
    main()
