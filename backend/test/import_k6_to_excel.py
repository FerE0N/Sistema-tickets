
import argparse
import json
import os
from datetime import datetime
import math
import pandas as pd
from openpyxl import load_workbook
from openpyxl.chart import LineChart, BarChart, Reference

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

    http_reqs_count = safe_get(metrics, ["http_reqs", "count"], 0)
    http_req_failed_rate = safe_get(metrics, ["http_req_failed", "rate"], None)
    checks_fails = safe_get(metrics, ["checks", "fails"], None)
    checks_rate = safe_get(metrics, ["checks", "rate"], None)

    def _num_or_none(x):
        # openpyxl charts need numbers or None
        if x is None:
            return None
        if isinstance(x, (int, float)):
            return x
        try:
            return float(x)
        except Exception:
            return None

    row = {
        "Fecha": datetime.now().strftime("%Y-%m-%d"),
        "Hora": datetime.now().strftime("%H:%M:%S"),
        "Base_URL": "",
        "Endpoints": "",
        "VUs": "",
        "Duration": "",
        "Total_Requests": _num_or_none(http_reqs_count),
        "HTTP_2xx_3xx_rate": (
            _num_or_none(checks_rate) if checks_rate is not None
            else (_num_or_none(1 - http_req_failed_rate) if http_req_failed_rate is not None else None)
        ),
        "p50_ms": _num_or_none(percentiles.get("p(50)")),
        "p90_ms": _num_or_none(percentiles.get("p(90)")),
        "p95_ms": _num_or_none(percentiles.get("p(95)")),
        "p99_ms": _num_or_none(percentiles.get("p(99)")),
        "avg_ms": _num_or_none(http_req.get("avg")),
        "min_ms": _num_or_none(http_req.get("min")),
        "max_ms": _num_or_none(http_req.get("max")),
        "Errores": (
            _num_or_none(checks_fails) if checks_fails is not None else (
                int(round(http_req_failed_rate * http_reqs_count)) if (http_req_failed_rate is not None and http_reqs_count) else None
            )
        ),
        "Archivo_JSON": os.path.basename(json_path),
        "Notas": ""
    }

    return row

def write_charts(excel_path):
    wb = load_workbook(excel_path)
    if "Resumen_Graficos" in wb.sheetnames:
        del wb["Resumen_Graficos"]
    ws = wb.create_sheet("Resumen_Graficos")

    # Leer datos de Resultados_k6
    df = pd.read_excel(excel_path, sheet_name="Resultados_k6")

    # Escribir tabla base en hoja de gráficos (para que los charts se actualicen)
    for c, col in enumerate(df.columns, 1):
        ws.cell(row=1, column=c, value=col)
    for r, row_vals in enumerate(df.values.tolist(), 2):
        for c, val in enumerate(row_vals, 1):
            ws.cell(row=r, column=c, value=None if (isinstance(val, float) and (pd.isna(val))) else val)

    max_row = len(df) + 1

    # Gráfico de líneas: p95 y p99
    line_chart = LineChart()
    line_chart.title = "Tendencia p95 y p99 (ms)"
    line_chart.y_axis.title = "Tiempo (ms)"
    line_chart.x_axis.title = "Corridas"

    # Ejes X: usar el índice (fila) como categorías
    # Usamos la columna 1 (Fecha) como labels si existe
    cats = Reference(ws, min_col=1, min_row=2, max_row=max_row)

    def add_series_if_exists(col_name):
        if col_name in df.columns:
            col_idx = df.columns.get_loc(col_name) + 1
            data = Reference(ws, min_col=col_idx, min_row=1, max_row=max_row)
            line_chart.add_data(data, titles_from_data=True)

    add_series_if_exists("p95_ms")
    add_series_if_exists("p99_ms")
    line_chart.set_categories(cats)
    ws.add_chart(line_chart, "J2")

    # Gráfico de barras: tasa de éxito
    bar_chart = BarChart()
    bar_chart.title = "Tasa de éxito (HTTP_2xx_3xx_rate)"
    bar_chart.y_axis.title = "Rate"
    bar_chart.x_axis.title = "Corridas"

    if "HTTP_2xx_3xx_rate" in df.columns:
        rate_col = df.columns.get_loc("HTTP_2xx_3xx_rate") + 1
        data = Reference(ws, min_col=rate_col, min_row=1, max_row=max_row)
        bar_chart.add_data(data, titles_from_data=True)
        bar_chart.set_categories(cats)
        ws.add_chart(bar_chart, "J20")

    wb.save(excel_path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", required=True)
    ap.add_argument("--excel", required=True)
    ap.add_argument("--base_url", default="")
    ap.add_argument("--endpoints", default="")
    ap.add_argument("--vus", default="")
    ap.add_argument("--duration", default="")
    args = ap.parse_args()

    row = parse_k6_summary(args.json)
    row["Base_URL"] = args.base_url
    row["Endpoints"] = args.endpoints
    row["VUs"] = args.vus
    row["Duration"] = args.duration

    # Append o crear hoja Resultados_k6
    try:
        existing = pd.read_excel(args.excel, sheet_name="Resultados_k6")
        out = pd.concat([existing, pd.DataFrame([row])], ignore_index=True)
    except Exception:
        out = pd.DataFrame([row])

    with pd.ExcelWriter(args.excel, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        out.to_excel(writer, sheet_name="Resultados_k6", index=False)

    # Crear/actualizar gráficos
    write_charts(args.excel)

    print(f"Importado {args.json} → {args.excel} (con gráficos en hoja 'Resumen_Graficos')")

if __name__ == "__main__":
    main()
