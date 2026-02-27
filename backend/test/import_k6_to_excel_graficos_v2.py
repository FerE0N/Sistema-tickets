
import argparse
import json
import os
from datetime import datetime
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

def num(x):
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(x)
    except Exception:
        return None

def pick_http_duration(metrics):
    # Prefer filtered metric if present
    http_req_er = metrics.get("http_req_duration{expected_response:true}")
    if http_req_er:
        return http_req_er
    return metrics.get("http_req_duration", {})

def parse_k6_summary(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    metrics = data.get("metrics", {})
    http_req = pick_http_duration(metrics)
    percentiles = http_req.get("percentiles", {}) or {}

    http_reqs_count = num(safe_get(metrics, ["http_reqs", "count"], 0))
    http_req_failed_rate = num(safe_get(metrics, ["http_req_failed", "rate"], None))
    checks_fails = num(safe_get(metrics, ["checks", "fails"], None))
    checks_rate = num(safe_get(metrics, ["checks", "rate"], None))

    row = {
        "Fecha": datetime.now().strftime("%Y-%m-%d"),
        "Hora": datetime.now().strftime("%H:%M:%S"),
        "Base_URL": "",
        "Endpoints": "",
        "VUs": "",
        "Duration": "",
        "Total_Requests": http_reqs_count,
        "HTTP_2xx_3xx_rate": checks_rate if checks_rate is not None else (1 - http_req_failed_rate if http_req_failed_rate is not None else None),
        "p50_ms": num(percentiles.get("p(50)") if "p(50)" in percentiles else http_req.get("med")),
        "p90_ms": num(percentiles.get("p(90)")),
        "p95_ms": num(percentiles.get("p(95)")),
        "p99_ms": num(percentiles.get("p(99)")),
        "avg_ms": num(http_req.get("avg")),
        "min_ms": num(http_req.get("min")),
        "max_ms": num(http_req.get("max")),
        "Errores": checks_fails if checks_fails is not None else (int(round((http_req_failed_rate or 0) * (http_reqs_count or 0))) if http_reqs_count is not None else None),
        "Archivo_JSON": os.path.basename(json_path),
        "Notas": ""
    }

    # Per-endpoint trends: duration__<sanitized_ep>
    per_endpoint = []
    for name, m in metrics.items():
        if name.startswith("duration_"):
            p = m.get("percentiles", {}) or {}
            per_endpoint.append({
                "Métrica": name,
                "avg_ms": num(m.get("avg")),
                "p90_ms": num(p.get("p(90)")) if p else num(m.get("p(90)")),
                "p95_ms": num(p.get("p(95)")) if p else num(m.get("p(95)")),
                "p99_ms": num(p.get("p(99)")) if p else None,
                "count": num(m.get("count")),
            })

    return row, per_endpoint

def write_charts(excel_path):
    wb = load_workbook(excel_path)
    if "Resumen_Graficos" in wb.sheetnames:
        del wb["Resumen_Graficos"]
    ws = wb.create_sheet("Resumen_Graficos")

    df = pd.read_excel(excel_path, sheet_name="Resultados_k6")

    # dump data
    for c, col in enumerate(df.columns, 1):
        ws.cell(row=1, column=c, value=col)
    for r, row_vals in enumerate(df.values.tolist(), 2):
        for c, val in enumerate(row_vals, 1):
            ws.cell(row=r, column=c, value=val)

    max_row = len(df) + 1
    cats = Reference(ws, min_col=1, min_row=2, max_row=max_row)

    # line p95/p99
    line = LineChart()
    line.title = "Tendencia p95 y p99 (ms)"
    line.y_axis.title = "ms"
    line.x_axis.title = "Corridas"

    for label in ["p95_ms", "p99_ms"]:
        if label in df.columns:
            idx = df.columns.get_loc(label) + 1
            data = Reference(ws, min_col=idx, min_row=1, max_row=max_row)
            line.add_data(data, titles_from_data=True)
    line.set_categories(cats)
    ws.add_chart(line, "J2")

    # bar success rate
    if "HTTP_2xx_3xx_rate" in df.columns:
        bar = BarChart()
        bar.title = "Tasa de éxito (HTTP 2xx/3xx)"
        bar.y_axis.title = "Rate"
        bar.x_axis.title = "Corridas"
        idx = df.columns.get_loc("HTTP_2xx_3xx_rate") + 1
        data = Reference(ws, min_col=idx, min_row=1, max_row=max_row)
        bar.add_data(data, titles_from_data=True)
        bar.set_categories(cats)
        ws.add_chart(bar, "J20")

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

    row, per_ep = parse_k6_summary(args.json)
    row["Base_URL"] = args.base_url
    row["Endpoints"] = args.endpoints
    row["VUs"] = args.vus
    row["Duration"] = args.duration

    try:
        existing = pd.read_excel(args.excel, sheet_name="Resultados_k6")
        out = pd.concat([existing, pd.DataFrame([row])], ignore_index=True)
    except Exception:
        out = pd.DataFrame([row])

    # write sheets
    with pd.ExcelWriter(args.excel, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        out.to_excel(writer, sheet_name="Resultados_k6", index=False)
        if per_ep:
            dfp = pd.DataFrame(per_ep)
            dfp.to_excel(writer, sheet_name="Resultados_k6_por_endpoint", index=False)

    write_charts(args.excel)
    print(f"Importado {args.json} → {args.excel} (preferencia por http_req_duration{{expected_response:true}} y gráficos)")

if __name__ == "__main__":
    main()
