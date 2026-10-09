"""Turn the reconciliation into an idempotent correction script, and into the reports the owner reads.

Only the fields that are a fact about an order line are applied: where the money went, when, to which object,
under whose name, of which kind. The catalogue's own naming is left alone — renaming a product moves every
line of that product, including ones the workbook never touched, and that is a catalogue decision rather than
a correction to history.

Every statement asserts the value it is replacing, so running the script twice changes nothing the second time.
"""

import os
import sys

# Where the working files live. Pass it as the first argument, or set BAXORDERS_RECONCILE_DIR; the default is
# the directory this is run from, so the tool carries no machine of its own in it.
SP = (sys.argv[1] if len(sys.argv) > 1 and os.path.isdir(sys.argv[1])
      else os.environ.get("BAXORDERS_RECONCILE_DIR", os.getcwd()))
import csv
from decimal import Decimal

ACTOR = os.environ.get("BAXORDERS_ACTOR_ID", "")  # the AspNetUsers row the audit trail is written under
ACTOR_NAME = "Administrator (Excel ilə uzlaşdırma 2026-10-09)"
BOOK_SHA = os.environ.get("BAXORDERS_WORKBOOK_SHA256", "")  # recorded in the script it writes

APPLY = {"location", "line_type", "quantity", "unit_price", "responsible", "supplier"}
CATALOGUE = {"product", "model_code", "spec_unit", "spec_value"}

# The audit table has its own vocabulary and two check constraints: the five Item*Changed actions require a
# Field, every other action requires Field to be NULL, and every event must name both the line and its variant.
# Moving a line to another object has no action of its own in the application, so it gets one with no Field.
ACTIONS = {
    "quantity": ("ItemQuantityChanged", "Quantity"),
    "unit_price": ("ItemPriceChanged", "UnitPrice"),
    "supplier": ("ItemSupplierChanged", "Supplier"),
    "line_type": ("ItemOrderLineTypeChanged", "OrderLineType"),
    "responsible": ("ItemResponsiblePersonChanged", "ResponsiblePerson"),
    "location": ("ItemMovedToAnotherLocation", None),
}


def q(value):
    return "NULL" if value is None or value == "" else "'" + str(value).replace("'", "''") + "'"


def audit(field, old, new, guard):
    """One audit row per correction, and only one: the NOT EXISTS makes a second run write nothing, the same
    way the UPDATE above it matches nothing once the value has already been corrected."""
    action, name = ACTIONS[field]
    return (
        'INSERT INTO "OrderRequestEditEvents" ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId",'
        '"Field","OldValue","NewValue","ActorUserId","ActorDisplayName","OccurredAtUtc")'
        f' SELECT i."OrderRequestId", {q(action)}, i."Id", i."ProductVariantId", '
        f'{q(name) if name else "NULL"}, {q(old)}, {q(new)}, \'{ACTOR}\', {q(ACTOR_NAME)}, now()'
        f' FROM "OrderRequestItems" i{guard}'
        f' AND NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e WHERE e."OrderRequestItemId" = i."Id"'
        f' AND e."Action" = {q(action)} AND e."OldValue" IS NOT DISTINCT FROM {q(old)}'
        f' AND e."NewValue" IS NOT DISTINCT FROM {q(new)});'
    )


rows = list(csv.DictReader(open(os.path.join(SP, "reconciliation-rows.csv"), encoding="utf-8-sig")))
book = {r["seq"]: r for r in csv.DictReader(open(os.path.join(SP, "new-ayliq.csv"), encoding="utf-8-sig")) if r["seq"]}

apply_rows, isolated = [], []
for r in rows:
    field = r["field"]
    if field in CATALOGUE:
        isolated.append({**r, "reason": "catalogue identity — renaming a product moves every line of it"})
    elif field == "unit_price" and r["excel_value"] == "":
        isolated.append({**r, "reason": "the workbook cell is empty; an empty cell is not an instruction to erase a price"})
    elif field in APPLY:
        apply_rows.append(r)
    else:
        isolated.append({**r, "reason": "unclassified"})

out = []
w = out.append
w("-- BaxOrders — tarixi məlumatın yeni Excel ilə uzlaşdırılması, 2026-10-09")
w(f"-- Mənbə: Sifarisler_uzre_bolgu.xlsx  «Aylıq» vərəqi  sha256 {BOOK_SHA}")
w("--")
w("-- Hər UPDATE dəyişdirdiyi dəyəri WHERE-də təsdiq edir: skript ikinci dəfə işlədiləndə heç nə dəyişmir.")
w("-- Hamısı bir tranzaksiyadadır; yoxlama uyğun gəlməsə, hər şey geri qaytarılır.")
w("")
w("\\set ON_ERROR_STOP on")
w("BEGIN;")
w("")
w("CREATE TEMP TABLE before_state ON COMMIT DROP AS")
w('SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount,')
w("       count(*) FILTER (WHERE \"OrderLineType\" = 'Monthly') AS monthly,")
w("       count(*) FILTER (WHERE \"OrderLineType\" = 'OutsideMonthly') AS outside")
w('  FROM "OrderRequestItems";')
w("")

counts = {k: 0 for k in APPLY}
for r in apply_rows:
    seq, line, field = r["seq"], r["line_id"], r["field"]
    b = book[seq]
    counts[field] += 1
    w(f'-- № {seq} · sətir {line} · {field}: {r["db_value"]!r} -> {r["proposed"]!r}')

    if field == "location":
        period = b["request_date"][:7] + "-01"
        w('UPDATE "OrderRequestItems" SET "OrderRequestId" = (SELECT r."Id" FROM "OrderRequests" r'
          f' JOIN "Locations" l ON l."Id" = r."LocationId" WHERE l."Name" = {q(r["proposed"])}'
          f" AND r.\"RequestPeriod\" = DATE '{period}')")
        w(f'  WHERE "Id" = {line} AND "OrderRequestId" = {r["order_id"]};')
        w(audit(field, r["db_value"], r["proposed"],
                f' WHERE i."Id" = {line} AND i."OrderRequestId" <> {r["order_id"]}'))

    elif field == "line_type":
        w(f'UPDATE "OrderRequestItems" SET "OrderLineType" = {q(r["proposed"])}'
          f' WHERE "Id" = {line} AND "OrderLineType" = {q(r["db_value"])};')
        w(audit(field, r["db_value"], r["proposed"],
                f' WHERE i."Id" = {line} AND i."OrderLineType" = {q(r["proposed"])}'))

    elif field == "quantity":
        w(f'UPDATE "OrderRequestItems" SET "Quantity" = {Decimal(r["proposed"])}'
          f' WHERE "Id" = {line} AND "Quantity" = {Decimal(r["db_value"])};')
        w(audit(field, r["db_value"], r["proposed"],
                f' WHERE i."Id" = {line} AND i."Quantity" = {Decimal(r["proposed"])}'))

    elif field == "unit_price":
        test = '"UnitPrice" IS NULL' if r["db_value"] == "" else f'"UnitPrice" = {Decimal(r["db_value"])}'
        w(f'UPDATE "OrderRequestItems" SET "UnitPrice" = {Decimal(r["proposed"])}'
          f' WHERE "Id" = {line} AND {test};')
        w(audit(field, r["db_value"], r["proposed"],
                f' WHERE i."Id" = {line} AND i."UnitPrice" = {Decimal(r["proposed"])}'))

    elif field == "responsible":
        w('UPDATE "OrderRequestItems" SET "ResponsiblePersonId" ='
          f' (SELECT "Id" FROM "ResponsiblePeople" WHERE "Name" = {q(r["proposed"])})'
          f' WHERE "Id" = {line} AND "ResponsiblePersonId" ='
          f' (SELECT "Id" FROM "ResponsiblePeople" WHERE "Name" = {q(r["db_value"])});')
        w(audit(field, r["db_value"], r["proposed"],
                ' JOIN "ResponsiblePeople" p ON p."Id" = i."ResponsiblePersonId"'
                f' WHERE i."Id" = {line} AND p."Name" = {q(r["proposed"])}'))

    elif field == "supplier":
        w('UPDATE "OrderRequestItems" SET "SupplierId" ='
          f' (SELECT "Id" FROM "Suppliers" WHERE "Name" = {q(r["proposed"])})'
          f' WHERE "Id" = {line} AND "SupplierId" ='
          f' (SELECT "Id" FROM "Suppliers" WHERE "Name" = {q(r["db_value"])});')
        w(audit(field, r["db_value"], r["proposed"],
                ' JOIN "Suppliers" s ON s."Id" = i."SupplierId"'
                f' WHERE i."Id" = {line} AND s."Name" = {q(r["proposed"])}'))
    w("")

w("-- Yoxlama: heç bir sətir itməməli, yaranmamalı və sahibsiz qalmamalıdır.")
w("DO $$")
w("DECLARE was bigint; now_ bigint; orphans bigint;")
w("BEGIN")
w("  SELECT lines INTO was FROM before_state;")
w('  SELECT count(*) INTO now_ FROM "OrderRequestItems";')
w("  IF was <> now_ THEN RAISE EXCEPTION 'sətir sayı dəyişdi: % -> %', was, now_; END IF;")
w('  SELECT count(*) INTO orphans FROM "OrderRequestItems" i'
  ' LEFT JOIN "OrderRequests" r ON r."Id" = i."OrderRequestId" WHERE r."Id" IS NULL;')
w("  IF orphans > 0 THEN RAISE EXCEPTION 'sahibsiz sətir: %', orphans; END IF;")
w("END $$;")
w("")
w("SELECT 'before' AS state, lines, known_amount, monthly, outside FROM before_state")
w("UNION ALL")
w("SELECT 'after', count(*), sum(\"Quantity\" * \"UnitPrice\"),")
w("       count(*) FILTER (WHERE \"OrderLineType\" = 'Monthly'),")
w("       count(*) FILTER (WHERE \"OrderLineType\" = 'OutsideMonthly')")
w('  FROM "OrderRequestItems";')
w("")
w("COMMIT;")

with open(os.path.join(SP, "correction.sql"), "w", encoding="utf-8", newline="\n") as h:
    h.write("\n".join(out) + "\n")

with open(os.path.join(SP, "isolated-rows.csv"), "w", encoding="utf-8-sig", newline="") as h:
    wr = csv.DictWriter(h, fieldnames=list(isolated[0]))
    wr.writeheader()
    wr.writerows(isolated)

print("corrections to apply, by field:")
for f in ("location", "line_type", "quantity", "unit_price", "responsible", "supplier"):
    print(f"   {f:14} {counts[f]}")
print(f"   TOTAL        {sum(counts.values())}  over {len({r['line_id'] for r in apply_rows})} lines")
print(f"\nisolated (reported, not applied): {len(isolated)}")
reasons = {}
for r in isolated:
    reasons[r["reason"]] = reasons.get(r["reason"], 0) + 1
for reason, c in sorted(reasons.items(), key=lambda kv: -kv[1]):
    print(f"   {c:4}  {reason}")
print(f"\nscript lines: {len(out)}")
