# Reconciling the database against the order workbook

The company's history was imported once, from a workbook that has been revised since. These three scripts
compare what the database holds against a given workbook, and turn the verifiable differences into a
correction script that can be run twice without doing anything the second time.

They were written for the reconciliation of 2026-10-09 and are kept because the situation recurs: the
workbook is edited by people, and every edit made after an import is a difference nobody will notice until
somebody opens a screen and says "that is the wrong object".

## What matching is based on

The workbook's own **№** column, which the import carried into `ImportRows.OriginalSequenceNumber`. That is
provenance, not row position, so a row that moved in the sheet still matches itself.

**Prove № is stable before trusting it.** Compare the product name of every № in the imported file with the
same № in the new one; if they do not agree on essentially all rows, the numbering has shifted and matching
by № would silently pair the wrong rows. In 2026-10-09 they agreed on 3618 of 3618.

Every workbook value is resolved through the application's own alias tables before being compared, so
«H.Ə.M» and «Heydər Əliyev Mərkəzi» are one fact rather than a difference.

## Which sheet is authoritative

Not an assumption to make. The 2026-10-09 workbook had two sheets disagreeing with each other on 219 rows'
objects; `Aylıq` was authoritative because it carries the `Növ` column the product needs, because the import
already reads only that sheet, and because the owner's own description of a row matched it and not the other.
Check all three before choosing.

## What is corrected, and what is not

Corrected: the facts of an order line — object, classification, quantity, unit price, supplier, responsible
person. These are line-scoped and reversible.

**Not** corrected automatically:

- **Catalogue naming** (product name, model code, specification). Renaming a product moves every line of that
  product, including ones the workbook never touched — and the catalogue is often the more precise of the two.
- **A blank cell where the database holds a value.** A blank is not an instruction to erase. Erasing prices
  on that basis destroys history.

Both are written out for a person to decide on.

## Running it

```bash
export BAXORDERS_RECONCILE_DIR=/path/to/working/dir     # where the CSVs live
export BAXORDERS_WORKBOOK=/path/to/workbook.xlsx
export BAXORDERS_ACTOR_ID=<AspNetUsers.Id>              # who the audit trail names
export BAXORDERS_WORKBOOK_SHA256=<sha256>               # recorded in the generated script

python extract_workbook.py          # -> new-ayliq.csv, new-esas.csv, and how far the sheets disagree
#                                      also needs, exported from the database into the same directory:
#                                      dbfull.csv and ref/*.csv (aliases and canonical names)
python reconcile.py                 # -> reconciliation-rows.csv, reconciliation-summary.json
python generate_correction_sql.py   # -> correction.sql, isolated-rows.csv
```

Then, in this order and not another: back up the production database, **restore that backup into a clone and
check it**, run `correction.sql` against the clone, re-run `reconcile.py` against the clone to prove only the
isolated differences remain, run it twice to prove it is idempotent, and only then run it against production.

The generated script is one transaction, asserts the value every statement replaces, writes an
`OrderRequestEditEvents` row for each change, and refuses to commit if the line count moved or a line was
left without an order.
