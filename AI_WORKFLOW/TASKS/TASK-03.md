# TASK 3/15 — OBJECT CATALOGUE: ONE LIST, ONE COUNT ON EVERY SCREEN (P0)

Priority: P0
Approval: HD-001 RESOLVED — owner approved execution according to this specification.
Specification status: APPROVED, amended (see section 0). Planner-verified 2026-09-24 — READY (see final section).

---

## IMPORTANT SOURCE-OF-TRUTH RULE

TASK-03.md must contain the FULL previously approved Task 3 specification.

Do not reconstruct missing requirements from memory or inference.

If the complete original Task 3 specification is not available in the current context/repository:
STOP and report:
TASK_03_SOURCE_MISSING

Do not create a shortened or approximate TASK-03.md.

### Why this rule exists

A Planner or Coder started later through `claude -p` gets a fresh session. It does
not see the chat history this specification was originally pasted into. Anything
missing from this file is therefore missing altogether, and a session that fills
the gap from memory produces a specification that looks complete and is not.

This file is the source of truth. If it is ever found incomplete, the answer is to
stop and ask the owner to supply the original text again — never to reconstruct it.

### Provenance of the text below

The body under "The approved specification" was copied verbatim from the owner's
approved Task 3 message while it was still in context, with no requirement dropped,
shortened or paraphrased. It carries all of: git preconditions; the owner's final
catalogue decisions; Part A (A1 investigation, A2 backup, A3 idempotent migration
keyed by location CODE, A4 delete/add/rename and alias rules, A5 Sentyabr import
mapping proof); Part B (B1 one universe function through B6 Azerbaijani collation
with the expected 27-object order); out of scope; safety; tests; the MUST NOT
CHANGE invariants; and the final Azerbaijani report format with its eight sections.

Section 0 records the amendments agreed after that approval and overrides the body
only where it says so.

---

# 0. Amendments recorded after the original approval

These three facts were established after the specification below was written.
**Where they conflict with the body of the specification, they win.** Nothing else
in the specification is weakened or rewritten.

## 0.1 Owner approval — HD-001 RESOLVED

The owner explicitly approved execution of Task 3 according to this
specification, including:

- the required database backup;
- the dry-run and reference inspection;
- the approved object catalogue changes;
- import alias protection;
- invariant verification afterwards.

Every STOP condition written below remains mandatory. The approval covers only
the explicitly documented Task 3 changes — anything outside them is a new
decision, not part of this task.

## 0.2 The 94 pricing-classification rows are not part of Task 3

A confirmed audit trail shows 94 rows were changed from `Unresolved` to
`InternalFreeSupply` (`OrderItemPricingDecisions`, 94 records, actor
`Administrator`, 2026-09-24 12:03:26–12:04:23).

Task 3 must:

- leave all 94 rows exactly as they are;
- not revert them;
- not reclassify them;
- not change pricing classifications or pricing counters because of them.

HD-002 stays open for later review but is **NON-BLOCKING for Task 3**.

Consequence for the "MUST NOT CHANGE" list below: the *current* pricing counters
are the baseline to record and preserve, not the figures quoted in the original
text. Record BEFORE and AFTER from the live database and require them to match
each other — do not adjust anything to reach a previously quoted number.

## 0.3 Alias correction — `LocationAliases` is already populated

An earlier investigation claimed `LocationAliases` was empty. **That claim was
wrong.** It was generalised from a query filtered to the three locations queued
for deletion.

Confirmed facts:

- `LocationAliases` already contains **15 aliases**;
- the existing alias mechanism (`LocationAliases` + `ImportCatalogLoader` +
  `NameIndex`) is populated and working, and **must be reused**;
- do **not** implement a new alias mechanism;
- preserve every existing alias;
- add only the aliases the approved rename and import rules below require;
- investigate `Qafur Məmmədov parkı` → `Qafur Məmmədov`, which appears to be a
  missing alias;
- if that mapping, or any other alias mapping, is ambiguous — **STOP** rather
  than guessing.

The known aliases at the time of writing: `H.Ə.M`, `F.M`, `Sabir bağı`, `B.K.M`,
`Xətai`, `Bülbül`, `Parlament`, `Nərimanov`, `Milli Konservatoriya`,
`Hökümət evi`, `Ağır Cinayətlərin`, `Zabitlər`, `Puşkin`, `Təmir Tikinti`,
`Dədəd Qorqud`.

## 0.4 The database is reached only through a repository tool

**Ad-hoc `psql` is not used for A1, A3 or A5, and is not available.** A shell that can
run arbitrary SQL against the live database is indistinguishable from a shell that can
drop it, and no allow-list can tell the two apart. So the investigation, the migration
and the verification all go through one tool in the repository, with fixed subcommands
that can be read, reviewed and permitted by name.

The Coder implements this tool **as part of Task 3**:

`tools/BaxOrders.CatalogueMigration`

### The five commands

```
dotnet run --project tools/BaxOrders.CatalogueMigration -- --inspect
dotnet run --project tools/BaxOrders.CatalogueMigration -- --dry-run
dotnet run --project tools/BaxOrders.CatalogueMigration -- --backup
dotnet run --project tools/BaxOrders.CatalogueMigration -- --apply
dotnet run --project tools/BaxOrders.CatalogueMigration -- --verify
```

**`--inspect`** — read-only. Enumerates every reference to the affected locations,
lists the existing aliases and the import mappings, and changes nothing. This is how
step A1 is carried out.

**`--dry-run`** — computes and prints the exact catalogue migration plan (delete /
insert / rename / alias), validates every STOP condition, and changes nothing. This is
the plan A3 requires before anything is applied.

**`--backup`** — takes the A2 backup itself, with `pg_dump` in custom format, and prints
the path it wrote. It is the tool's job rather than a shell command because the
connection string is nowhere a shell can reach it: it lives only in user secrets. The
tool reads it the way `tools/BaxOrders.DataTransfer` already does —
`AddUserSecrets("9009c03b-5170-410c-aa43-9cd30c88c6ae")`, the API's own secrets id,
falling back to environment variables. Copy that approach rather than inventing another.

**`--apply`** — executes only the approved Task 3 catalogue changes. Idempotent: a
second run changes nothing. Keyed by location **CODE**, never by id. Refuses to proceed
if any Task 3 STOP condition is violated, **and refuses to run at all unless a backup
from the current day exists**, so the order below cannot be skipped by accident.

**`--verify`** — read-only. Checks the final catalogue, the aliases, the counts, the
invariants and the import mapping. It must also confirm that the **94
pricing-classification rows are unchanged** (HD-002 — see 0.2).

### Order of operations

The backup required by A2 stays mandatory and must be taken **immediately before
`--apply`**, not once at the start of the day. `--apply` refuses to run without one, and
the report names the path `--backup` printed. The sequence is:

```
--inspect  →  --dry-run  →  --backup  →  --apply  →  --verify
```

`--apply` is the only command that writes to the catalogue. If `--dry-run` reports a
STOP condition, the sequence ends there and the owner is asked.

### Project registration

The new project goes into `BaxOrders.slnx` under the existing `/tools/` folder, beside
`tools/BaxOrders.DataTransfer`, so that `dotnet build BaxOrders.slnx` and
`dotnet test BaxOrders.slnx` cover it. A tool that the solution does not know about is
a tool the test suite never compiles.

### What this does not change

Everything else in the specification below stands as approved: the owner's catalogue
decisions, the delete/add/rename rules, alias protection, the import mapping proof, the
one object-universe function, the 27-object result, the Azerbaijani collation, the
tests, the invariants and the report format. This section says only *how* the database
is reached, not *what* is done to it.

---

# The approved specification

You are a senior full-stack developer on the BAX Sifarişlər app
(.NET backend at localhost:5080, PostgreSQL, Vite frontend at localhost:5173).
Tasks 1, 1b, 1c and 2 are done — keep PeriodComparison, PortfolioCohort, money rounding
and the line-pricing rules intact.

Two parts: (A) apply the owner's catalogue decisions to the DATA,
(B) make every screen count objects from the same catalogue.

==================================================================
STEP 0 — GIT
==================================================================
Task 1c is reviewed and accepted. If its changes are uncommitted, run the full suite, then commit:
  "fix(money): round at the source so every sum on screen adds up (Task 1c)"
`git status` must be clean before you start. Leave Task 3 uncommitted for my review.

==================================================================
OWNER'S DECISIONS (final — implement exactly)
==================================================================
Today: 29 objects in the catalogue; the dashboard says "24 / 26", Aylıq hesabat and Obyektlər say 29.

1. DELETE: Maştağa, Ramana, Əmircan — they do not exist in reality and have no orders.
2. ADD: Çadır — a real object, no orders yet.
3. KEEP ACTIVE: Puşkin parkı (last order May 2026, 700.00 ₼).
4. Heydər Əliyev Mərkəzi stays ONE object. The owner's list says "H.Ə.M Təmizlik" and
   "H.Ə.M Yaşıllıq" — these are categories of the same object, NOT two objects.
5. Full display names, typos fixed:
   | Current                        | New                                            |
   | Hökümət evi və ətrafı parklar  | Hökumət evi və ətrafı parklar                  |
   | Space Tv qarşısı               | Space TV qarşısı                               |
   | Qara Qarayev                   | Qara Qarayev parkı                             |
   | Axundov                        | Axundov parkı                                  |
   | EXPO                           | EXPO Center                                    |
   | Təmir-tikinti                  | Təmir-tikinti (ərazidə olan dibçəklərə qulluq) |
   Every other name stays as it is (Novxanı, Bakı Konqres Mərkəzi, Xətai parkı, Milli
   Konservatoriya qarşısı, Ağır Cinayətlərin qarşısı, Qala baza, İDEA, ADNSU, …).
Result: 27 objects; 26 have order history (all except Çadır).

==================================================================
PART A — DATA CHANGES (real data — be careful)
==================================================================
A1. Investigate first, change nothing:
    - Every table that references a location: orders, order lines, import batches/rows,
      location aliases/mappings, user ↔ location assignments, audit logs, materialized or
      derived tables. For Maştağa, Ramana, Əmircan list every referencing row.
    - How the Excel importer maps a block/sheet name to a location (exact name? alias table? code?).
A2. Back up the database (pg_dump, custom format) and report the file path.
A3. Implement the changes as ONE idempotent, versioned data migration keyed by location CODE
    (not id), so it can be applied to other environments later. It prints a dry-run plan
    (delete / insert / rename) before applying.
A4. Rules:
    - Delete the three objects only if nothing references them except harmless rows you name.
      If any order, import row or user assignment references them → STOP and report.
    - Renames must NOT break imports. Every current spelling, plus the owner's list spellings
      ("H.Ə.M Təmizlik", "H.Ə.M Yaşıllıq", "B.K.M", "EXPO Center", "Spacde qarşısı",
      "Novxanı Təmizlik", "Xətai", "Axundov Parkı", "Qara Qarayev parkı", "Milli konservatoriya",
      "Hökumət evi və ətrafı parklar"), must resolve to the same location through the existing
      alias mechanism. If there is no alias mechanism → STOP and propose one before renaming.
      Report any alias that would collide with another object.
    - Çadır gets the next code in the existing LOC-xxxxxx sequence and the alias "Çadır".
    - Refresh materialized/derived tables afterwards.
A5. Prove imports still work: run the import MAPPING for the existing Sentyabr 2026 file in
    dry-run mode (nothing committed) and show every block maps to the same location id as before.

==================================================================
PART B — ONE UNIVERSE FOR EVERY SCREEN
==================================================================
B1. Universe for a selected month = active objects ∪ objects with an order in that month
    (an inactive object with historical orders still appears in the months it ordered).
    One backend function; every screen uses it.
B2. Dashboard (PortfolioCohort, Task 1b): the no-history group is no longer filtered away.
    Label: "Sistemdə hələ sifarişi yoxdur". Headline card:
      "24 / 27 obyekt üzrə sifariş var · 2 obyektdə sifariş qeydə alınmayıb ·
       1 obyektin sistemdə hələ sifarişi yoxdur"
    The exceptions block lists Çadır under its own heading; chips add up to 27.
    The "Bütün obyektlər" table shows 27 rows; Çadır: "—" and "Sistemdə hələ sifarişi yoxdur".
B3. Aylıq hesabat: "Obyekt 27"; Çadır appears as one row (layout polish is Task 8).
B4. Obyektlər page: "Obyekt 27 · Sifarişi olan 26".
B5. Find every other object count or object list (approvals, imports, filters, dropdowns) and
    route it through B1. List them in the report.
B6. Sort object names everywhere with Azerbaijani collation ("az": ə after e, ğ after g, x after h,
    ı before i, q after k, ö after o, ş after s, ü after u, ç after c). Expected full order:
    ADNSU, Ağır Cinayətlərin qarşısı, Axundov parkı, Bakı Konqres Mərkəzi, Bayıl yolu, Bibiheybət,
    Bülbül parkı, Çadır, Dədə Qorqud, EXPO Center, Fəvvarələr meydanı, Heydər Əliyev Mərkəzi,
    Hökumət evi və ətrafı parklar, Xətai parkı, İDEA, Qafur Məmmədov, Qala baza,
    Qara Qarayev parkı, Milli Konservatoriya qarşısı, Muzey Mərkəzi, Nərimanov heykəli, Novxanı,
    Parlament parkı, Puşkin parkı, Space TV qarşısı,
    Təmir-tikinti (ərazidə olan dibçəklərə qulluq), Zabitlər parkı.

==================================================================
OUT OF SCOPE (note only)
==================================================================
Product counts (Yeni 58/113 vs 60/119) → Task 10. Monthly report layout → Task 8.
Chip click-through / table pagination → Task 9. Other terminology → Task 5.

==================================================================
SAFETY
==================================================================
- Only the data changes listed in Part A. No changes to orders, lines, prices, pricing modes, users.
- No approvals / returns / submissions. Ask me to log in if needed; never print passwords.

==================================================================
TESTS
==================================================================
- Universe: active + ordered-in-month; inactive with history; new object without orders.
- Partition adds up to the universe for every basis. Sentyabr 2026:
  Keçən ay 23 / 1 / 2 / 1 = 27 · every other basis 24 / 0 / 2 / 1 = 27.
- Same object count on dashboard, Aylıq hesabat and Obyektlər (one consistency test across endpoints).
- Data migration is idempotent (a second run changes nothing) and keyed by code.
- Collation: the exact order in B6.
- Full suite + both builds green.

==================================================================
MUST NOT CHANGE (record BEFORE and AFTER — must be identical)
==================================================================
Every money amount (month totals, year total, all basis numbers), the order count, the
Qiymət təsnifatı counters, and every object-level number for orders 153 and 154.

==================================================================
FINAL REPORT (in Azerbaijani)
==================================================================
0. Git: 1c commit hash
1. Araşdırma: silinən 3 obyektə istinadlar; import obyekti necə tanıyır
2. Backup faylının yeri
3. Data miqrasiyası: dry-run planı və tətbiq nəticəsi
4. Import sübutu: Sentyabr faylı, blok → obyekt id, əvvəl/sonra
5. Universum funksiyası və ona köçürülən yerlər
6. Əvvəl/sonra cədvəli (məbləğlər, saylar) — hamısı eyni
7. Ekranda yeni mətnlər: panel başlığı, istisnalar, çiplər
8. Sonrakı tapşırıqlar üçün qeydlər

---

# Notes carried forward from the investigation already performed

These are findings, not new instructions. They are recorded so the work is not repeated.

- Step 0 is already satisfied: Task 1c is committed as `a45c5ff` and the working
  tree is clean apart from the untracked `AI_WORKFLOW/` folder and `run-agent.ps1`.
- A2 backup already taken once:
  `C:\Users\HP\BaxOrders-backups\baxorders_dev-task3-20260924-123800.dump`
  (pg_dump custom format). Take a fresh one immediately before applying changes.
- A1 reference check, already performed and to be re-verified at runtime: the three
  objects to delete (`RAMANA` id 1, `MASTAGA` id 2, `EMIRCAN` id 3) have **zero**
  referencing rows — 0 `OrderRequests`, 0 `ImportRows`, 0 `ImportResolutions`,
  0 `LocationAliases`. Only four foreign keys point at `Locations`, all `RESTRICT`:
  `OrderRequests.LocationId`, `ImportRows.MatchedLocationId`,
  `ImportResolutions.LocationId`, `LocationAliases.LocationId`.
- Their codes are `RAMANA` / `MASTAGA` / `EMIRCAN`, not `LOC-xxxxxx`. The migration is
  keyed by code, so this matters.
- Next free code for Çadır: `LOC-000047` (highest existing is `LOC-000046`).
- The importer resolves a block name through `TextNormalizer` against both
  `Locations.NormalizedName` and `LocationAliases.NormalizedAlias`, loaded into one
  `NameIndex`. A key that maps to two different locations returns `Ambiguous` and
  selects nothing — so a colliding alias fails safe, but must still be reported.
- The import batch that produced the live orders is id 50010,
  `Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx`, 3618 matched rows across 26
  locations. Its distinct block names are the proof set for A5.

---

# Planner verification — 2026-09-24

Role: PLANNER. Nothing above this section was removed, shortened or reworded; the
only other edit is the status line at the top. This section adds no requirement and
changes no decision. It records what was checked and two facts from the code the
Coder needs.

## Source completeness

- The approved body is present in full in this file. Checked against its own
  provenance list (section "Provenance of the text below"): Step 0 git; owner's
  decisions 1–5 with the rename table and "Result: 27 objects; 26 have order
  history"; A1–A5; B1–B6 with the 27-name order; out of scope; safety; tests;
  MUST NOT CHANGE; final report 0–8. All present.
- No other copy of the owner's message exists in the repository to diff against.
  The file is therefore treated as the source of truth, as its own rule states.
  `TASK_03_SOURCE_MISSING` does not apply: the text is available, not referenced
  from elsewhere.
- Internal consistency checked: the B6 list has exactly 27 names; its order is
  consistent with the Azerbaijani alphabet as B6 defines it; headline 24 + 2 + 1 = 27;
  test partitions 23+1+2+1 and 24+0+2+1 both = 27.

## Approved decisions and gates

- HD-001 RESOLVED in `PLAN.md` — matches 0.1.
- HD-002 OPEN, non-blocking — matches 0.2. The 94 rows stay untouched.
- No new business ambiguity found. `Qafur Məmmədov parkı` stays as 0.3 says:
  the Coder investigates it and STOPs if the mapping is ambiguous.

## Repository evidence (read-only)

- Git: HEAD `a45c5ff` (Task 1c). Untracked only `AI_WORKFLOW/` and `run-agent.ps1`.
- `LocationAlias`, `TextNormalizer`, `NameIndex`, `ImportCatalogLoader`,
  `PortfolioCohort` all exist where section 0.3 and the notes say.
- `tools/BaxOrders.CatalogueMigration` does **not** exist yet. Only
  `tools/BaxOrders.DataTransfer` exists. Section 0.4 has the Coder build it, so this
  is expected.
- `run-agent.ps1` Coder profile allows
  `dotnet run --project tools/BaxOrders.CatalogueMigration` and, for task 3 only,
  `pg_dump`. `psql` stays denied. That matches 0.4.
- The database was not queried during planning.

## Two code facts the Coder must respect

1. **An alias that equals the location's own name is rejected by the domain.**
   `LocationAlias` (`src/BaxOrders.Domain/Locations/LocationAlias.cs:31`) throws when
   the normalized alias equals the location's `NormalizedName`. `TextNormalizer`
   lower-cases and folds I/İ/ı to `i` but keeps ə, ö, ü, ş, ç, ğ. So:
   - A4's "Çadır gets … the alias 'Çadır'": the alias cannot be stored because it
     equals the name. The name already resolves through `NameIndex`, so the goal of
     the rule is met by the name. Do not bypass the guard. Say so in report section 3.
   - The same applies to any owner-list spelling that normalizes to a *new* name,
     e.g. "EXPO Center", "Qara Qarayev parkı", "Hökumət evi və ətrafı parklar",
     "Axundov Parkı" (= "Axundov parkı" after lower-casing). These resolve through
     the name. Each still has to be shown resolving in the A5 proof.
   - The *old* spellings of the six renamed objects ("Hökümət evi və ətrafı parklar",
     "Space Tv qarşısı", "Qara Qarayev", "Axundov", "EXPO", "Təmir-tikinti") no longer
     match the name after the rename. They must become aliases unless an existing alias
     already covers them.
   - If any required spelling can't be made to resolve for a reason other than
     "it equals the name", STOP as A4 says.
2. **Aliases are unique across all locations, and the importer loads aliases only for
   active locations** (`ImportCatalogLoader.cs:37`). A normalized alias that already
   belongs to another location is a collision. Report it as A4 requires. Do not move
   or overwrite it.
