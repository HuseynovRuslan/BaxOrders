"""Extract the new workbook's two sheets to CSV, and say how far they disagree with each other.

Read-only on the workbook. The point of the second half is to prove which sheet is authoritative rather than
assume it: the owner's own description of row № 3569 matches one of them and not the other.
"""

import os
import sys

# Where the working files live. Pass it as the first argument, or set BAXORDERS_RECONCILE_DIR; the default is
# the directory this is run from, so the tool carries no machine of its own in it.
SP = (sys.argv[1] if len(sys.argv) > 1 and os.path.isdir(sys.argv[1])
      else os.environ.get("BAXORDERS_RECONCILE_DIR", os.getcwd()))
import csv
import unicodedata
from decimal import Decimal, InvalidOperation

import openpyxl

BOOK = os.environ.get("BAXORDERS_WORKBOOK", os.path.join(SP, "working-copy.xlsx"))

FIELDS = ["sheet_row", "seq", "main_category", "middle_category", "sub_category", "product",
          "spec_value", "spec_unit", "model_code", "quantity", "order_unit", "unit_price",
          "line_total", "supplier", "location", "request_date", "responsible", "line_type"]


def norm(v):
    if v is None:
        return ""
    return " ".join(unicodedata.normalize("NFC", str(v)).split())


def num(v):
    if v is None or str(v).strip() == "":
        return None
    try:
        return Decimal(str(v).replace(",", ".").strip()).normalize()
    except InvalidOperation:
        return None


def read(sheet_name):
    wb = openpyxl.load_workbook(BOOK, data_only=True, read_only=True)
    ws = wb[sheet_name]
    rows = []
    for i, row in enumerate(ws.iter_rows(min_row=4, min_col=2, max_col=18, values_only=True), start=4):
        cells = list(row) + [None] * 18
        seq, main, mid, sub, product, spec, unit, model, qty, ou, price, total, supplier, location, date, resp, nov = cells[:17]
        if seq is None and product is None:
            continue
        rows.append(dict(
            sheet_row=i,
            seq="" if seq is None else str(seq).strip(),
            main_category=norm(main), middle_category=norm(mid), sub_category=norm(sub),
            product=norm(product), spec_value=norm(spec), spec_unit=norm(unit), model_code=norm(model),
            quantity="" if num(qty) is None else str(num(qty)),
            order_unit=norm(ou),
            unit_price="" if num(price) is None else str(num(price)),
            line_total="" if num(total) is None else str(num(total)),
            supplier=norm(supplier), location=norm(location),
            request_date=date.date().isoformat() if hasattr(date, "date") else norm(date),
            responsible=norm(resp),
            line_type=norm(nov),
        ))
    wb.close()
    return rows


sheets = {}
for name in ("Əsas", "Aylıq"):
    rows = read(name)
    sheets[name] = rows
    path = f"{SP}\\new-{'esas' if name == 'Əsas' else 'ayliq'}.csv"
    with open(path, "w", encoding="utf-8-sig", newline="") as h:
        w = csv.DictWriter(h, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    numbered = [r for r in rows if r["seq"]]
    unnumbered = [r for r in rows if not r["seq"]]
    seqs = [r["seq"] for r in numbered]
    print(f"{name}: {len(rows)} data rows  ({len(numbered)} numbered, {len(unnumbered)} without №)  "
          f"distinct №: {len(set(seqs))}  -> {path}")
    if unnumbered:
        for r in unnumbered:
            print(f"    no № : sheet {r['sheet_row']} {r['product']!r} {r['quantity']} x {r['unit_price']} "
                  f"= {r['line_total']} · {r['supplier']!r} · {r['location']!r} · {r['request_date']} · "
                  f"{r['responsible']!r} · {r['line_type']!r}")

# --- the two sheets, compared on the rows they share by № ------------------------------------------------
a = {r["seq"]: r for r in sheets["Əsas"] if r["seq"]}
b = {r["seq"]: r for r in sheets["Aylıq"] if r["seq"]}
shared = sorted(set(a) & set(b), key=lambda s: int(s) if s.isdigit() else 0)
print(f"\n№ in both sheets: {len(shared)}   only in Əsas: {sorted(set(a)-set(b))[:10]}   "
      f"only in Aylıq: {sorted(set(b)-set(a))[:10]}")

compare = [f for f in FIELDS if f not in ("sheet_row", "seq", "line_type")]
counts = {f: 0 for f in compare}
for s in shared:
    for f in compare:
        if a[s][f] != b[s][f]:
            counts[f] += 1
print("\nrows where Əsas and Aylıq disagree, by field:")
for f, c in sorted(counts.items(), key=lambda kv: -kv[1]):
    if c:
        print(f"   {f:18} {c}")
print("   (fields not listed agree on every shared row)")
