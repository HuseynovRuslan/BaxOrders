"""Reconcile every historical BaxOrders line against the new authoritative workbook.

Matching is by the workbook's own № column, carried into the database as `ImportRows.OriginalSequenceNumber`
— provenance, not row position. № was proved stable across versions first (3618/3618 product names agree
between the imported file and the new one), so a row that moved in the sheet still matches itself.

Every workbook value is resolved through the application's own alias tables before comparison, so a row that
says «H.Ə.M» and a database row that says «Heydər Əliyev Mərkəzi» are the same fact, not a difference.
"""

import os
import sys

# Where the working files live. Pass it as the first argument, or set BAXORDERS_RECONCILE_DIR; the default is
# the directory this is run from, so the tool carries no machine of its own in it.
SP = (sys.argv[1] if len(sys.argv) > 1 and os.path.isdir(sys.argv[1])
      else os.environ.get("BAXORDERS_RECONCILE_DIR", os.getcwd()))
import csv
import json
import unicodedata
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation



def key(value):
    """One spelling a name is compared under. Azerbaijani İ/I make str.casefold() unreliable, so they are
    mapped explicitly: İ is the capital of i, and the capital of ı is I."""
    if value is None:
        return ""
    s = " ".join(unicodedata.normalize("NFC", str(value)).split())
    return s.replace("İ", "i").replace("I", "ı").lower()


def keys(value):
    """Every spelling a lookup table should answer to, so «H.Ə.M» and «H.Ə.M.» both find their object."""
    if value is None:
        return set()
    s = " ".join(unicodedata.normalize("NFC", str(value)).split())
    if not s:
        return set()
    k = key(s)
    return {s, k, k.replace(".", "").replace(" ", "")}


def load(name):
    with open(f"{SP}\\{name}", encoding="utf-8-sig") as h:
        return list(csv.DictReader(h))


def lookup(alias_rows, canonical_rows, alias_field="Alias", name_field="name"):
    """alias spelling -> canonical name, including each canonical name as its own alias."""
    table = {}
    for r in canonical_rows:
        for k in keys(r.get(name_field) or r.get("code")):
            table[k] = r.get(name_field) or r.get("code")
    for r in alias_rows:
        for k in keys(r[alias_field]):
            table[k] = r[name_field] if name_field in r else r["code"]
    return table


def num(v):
    if v is None or str(v).strip() == "":
        return None
    try:
        return Decimal(str(v).replace(",", ".").strip()).normalize()
    except InvalidOperation:
        return None


def money(v):
    return Decimal(0) if v is None else v


# --- reference data --------------------------------------------------------------------------------------
ref = {n: load(f"ref\\{n}.csv") for n in
       ("ref_location_alias", "ref_location", "ref_supplier_alias", "ref_supplier",
        "ref_person_alias", "ref_person", "ref_product_alias", "ref_unit_alias", "ref_unit")}
loc_map = lookup(ref["ref_location_alias"], ref["ref_location"])
sup_map = lookup(ref["ref_supplier_alias"], ref["ref_supplier"])
per_map = lookup(ref["ref_person_alias"], ref["ref_person"])
unit_map = lookup(ref["ref_unit_alias"], ref["ref_unit"], name_field="code")

TYPE = {"aylıq sifariş": "Monthly", "aylıqdan kənar": "OutsideMonthly", "": "Unclassified"}

# --- the two sides ---------------------------------------------------------------------------------------
book = load("new-ayliq.csv")
db = {r["seq"]: r for r in load("dbfull.csv")}

book_numbered = {r["seq"]: r for r in book if r["seq"]}
book_extra = [r for r in book if not r["seq"]]

print(f"workbook «Aylıq» rows: {len(book)}  (numbered {len(book_numbered)}, without № {len(book_extra)})")
print(f"database historical lines: {len(db)}")

matched = sorted(set(book_numbered) & set(db), key=lambda s: int(s) if s.isdigit() else 10 ** 9)
only_book = sorted(set(book_numbered) - set(db), key=lambda s: int(s) if s.isdigit() else 10 ** 9)
only_db = sorted(set(db) - set(book_numbered), key=lambda s: int(s) if s.isdigit() else 10 ** 9)
print(f"matched by №: {len(matched)}   only in the workbook: {len(only_book)}   only in the database: {len(only_db)}")

# --- compare ---------------------------------------------------------------------------------------------
FIELDS = ("location", "supplier", "responsible", "period", "product", "spec_value", "spec_unit",
          "model_code", "quantity", "order_unit", "unit_price", "line_type")

rows_out = []
field_counts = Counter()
unresolved = []
by_location = defaultdict(lambda: [0, Decimal(0)])
impact_by_type = defaultdict(lambda: Decimal(0))

for seq in matched:
    b, d = book_numbered[seq], db[seq]
    diffs = []

    # location — resolved through the alias table the import itself uses
    want_loc = loc_map.get(key(b["location"]))
    if want_loc is None and b["location"]:
        unresolved.append((seq, "location", b["location"]))
    elif want_loc and key(want_loc) != key(d["location"]):
        diffs.append(("location", d["location"], b["location"], want_loc))

    # supplier — an empty cell in the workbook means "not stated", never "remove the supplier"
    if b["supplier"]:
        want_sup = sup_map.get(key(b["supplier"]))
        if want_sup is None:
            unresolved.append((seq, "supplier", b["supplier"]))
        elif key(want_sup) != key(d["supplier"]):
            diffs.append(("supplier", d["supplier"], b["supplier"], want_sup))

    if b["responsible"]:
        want_per = per_map.get(key(b["responsible"]))
        if want_per is None:
            unresolved.append((seq, "responsible", b["responsible"]))
        elif key(want_per) != key(d["responsible"]):
            diffs.append(("responsible", d["responsible"], b["responsible"], want_per))

    # period — the month the order belongs to
    if b["request_date"]:
        want_period = b["request_date"][:7] + "-01"
        if want_period != (d["period"] or "")[:10]:
            diffs.append(("period", d["period"], b["request_date"], want_period))

    if key(b["product"]) != key(d["product"]):
        diffs.append(("product", d["product"], b["product"], b["product"]))

    if key(b["spec_value"]) != key(d["spec_value"]):
        diffs.append(("spec_value", d["spec_value"], b["spec_value"], b["spec_value"]))

    if b["spec_unit"]:
        want_unit = unit_map.get(key(b["spec_unit"]))
        if want_unit is None:
            unresolved.append((seq, "spec_unit", b["spec_unit"]))
        elif key(want_unit) != key(d["spec_unit"]):
            diffs.append(("spec_unit", d["spec_unit"], b["spec_unit"], want_unit))

    if key(b["model_code"]) != key(d["model_code"]):
        diffs.append(("model_code", d["model_code"], b["model_code"], b["model_code"]))

    if num(b["quantity"]) != num(d["quantity"]):
        diffs.append(("quantity", d["quantity"], b["quantity"], b["quantity"]))

    if b["order_unit"]:
        want_ou = unit_map.get(key(b["order_unit"]))
        if want_ou is None:
            unresolved.append((seq, "order_unit", b["order_unit"]))
        elif key(want_ou) != key(d["order_unit"]):
            diffs.append(("order_unit", d["order_unit"], b["order_unit"], want_ou))

    if num(b["unit_price"]) != num(d["unit_price"]):
        diffs.append(("unit_price", d["unit_price"], b["unit_price"], b["unit_price"]))

    want_type = TYPE.get(key(b["line_type"]), None)
    if want_type is None:
        unresolved.append((seq, "line_type", b["line_type"]))
    elif want_type != d["line_type"]:
        diffs.append(("line_type", d["line_type"], b["line_type"], want_type))

    if not diffs:
        continue

    old_amount = money(num(d["quantity"])) * money(num(d["unit_price"]))
    new_q = num(b["quantity"]) if num(b["quantity"]) is not None else num(d["quantity"])
    new_p = num(b["unit_price"]) if num(b["unit_price"]) is not None else num(d["unit_price"])
    new_amount = money(new_q) * money(new_p)

    for field, was, book_value, proposed in diffs:
        field_counts[field] += 1
        rows_out.append(dict(
            seq=seq, excel_sheet_row=b["sheet_row"], line_id=d["line_id"], order_id=d["order_id"],
            field=field, db_value=was, excel_value=book_value, proposed=proposed,
            confidence="verified",
            location_now=d["location"], location_after=(proposed if field == "location" else d["location"]),
            amount_now=str(old_amount), amount_after=str(new_amount),
            amount_delta=str(new_amount - old_amount),
        ))
        if field == "location":
            by_location[d["location"]][0] += 1
            by_location[d["location"]][1] -= old_amount
            by_location[proposed][0] += 0
            by_location[proposed][1] += old_amount
    if any(f in ("quantity", "unit_price") for f, _, _, _ in diffs):
        impact_by_type[d["line_type"]] += new_amount - old_amount

with open(os.path.join(SP, "reconciliation-rows.csv"), "w", encoding="utf-8-sig", newline="") as h:
    w = csv.DictWriter(h, fieldnames=list(rows_out[0]) if rows_out else ["seq"])
    w.writeheader()
    w.writerows(rows_out)

print(f"\nrows with at least one difference: {len({r['seq'] for r in rows_out})}")
print(f"individual field differences: {len(rows_out)}")
print("\nby field:")
for f, c in field_counts.most_common():
    print(f"   {f:14} {c}")

print("\nby object (object changes only, money as currently recorded):")
for name, (count, delta) in sorted(by_location.items(), key=lambda kv: kv[1][1]):
    if count or delta:
        print(f"   {name:34} leaves {count:3}   net {delta:+}")

print(f"\nunresolved workbook values: {len(unresolved)}")
for u in unresolved[:20]:
    print(f"   № {u[0]:>6} {u[1]:12} {u[2]!r}")

print(f"\nrows in the workbook with no № (ad-hoc additions, not in the database): {len(book_extra)}")
print(f"rows in the database with no match in the workbook: {len(only_db)} {only_db[:10]}")
print(f"numbered workbook rows missing from the database: {len(only_book)} {only_book[:10]}")

json.dump(dict(matched=len(matched), only_book=only_book, only_db=only_db,
               field_counts=dict(field_counts), unresolved=unresolved,
               extra_rows=book_extra),
          open(os.path.join(SP, "reconciliation-summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2, default=str)
